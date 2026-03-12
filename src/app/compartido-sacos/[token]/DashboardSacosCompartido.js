// app/compartido-sacos/[token]/DashboardSacosCompleto.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line, Legend 
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

// Extender dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

// Configurar zona horaria de El Salvador
const ZONA_HORARIA_SV = "America/El_Salvador";
dayjs.locale("es");

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan variables de entorno de Supabase");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colores para gráficos
const COLORES = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

// ============================================================================
// HOOK PARA CARGAR DATOS DE SACOS
// ============================================================================
function useSacosData(barcoId) {
  const [data, setData] = useState({
    registros: [],
    loading: true,
    error: null,
    lastUpdate: null
  });

  const cargarDatos = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const { data: registros, error } = await supabase
        .from('registros_sacos')
        .select('*')
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('viaje_numero', { ascending: false });

      if (error) throw error;

      // Enriquecer datos
      const registrosEnriquecidos = (registros || []).map(r => ({
        ...r,
        peso_total_calculado_kg: r.peso_saco_kg * r.cantidad_paquetes,
        peso_total_calculado_tm: (r.peso_saco_kg * r.cantidad_paquetes) / 1000,
        diferencia_kg: Math.abs((r.peso_saco_kg * r.cantidad_paquetes) - r.peso_ingenio_kg),
        porcentaje_diferencia: r.peso_ingenio_kg > 0 
          ? Math.abs(((r.peso_saco_kg * r.cantidad_paquetes) - r.peso_ingenio_kg) / r.peso_ingenio_kg * 100)
          : 0,
        fecha_hora: dayjs(`${r.fecha} ${r.hora_inicio}`).toISOString()
      }));

      setData({
        registros: registrosEnriquecidos,
        loading: false,
        error: null,
        lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV)
      });

    } catch (error) {
      console.error("Error cargando datos de sacos:", error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || "Error al cargar datos",
        lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV)
      }));
    }
  };

  useEffect(() => {
    if (barcoId) {
      cargarDatos();
      const interval = setInterval(cargarDatos, 30000);
      return () => clearInterval(interval);
    }
  }, [barcoId]);

  return { ...data, refetch: cargarDatos };
}

// ============================================================================
// UTILIDADES
// ============================================================================
const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000";
  const valor = Number(tm).toFixed(d);
  const partes = valor.split(".");
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return partes.join(".");
};

const fmtNumber = (num, d = 0) => {
  if (num == null || isNaN(num)) return "0";
  return Number(num).toLocaleString('es-SV', { maximumFractionDigits: d });
};

// ============================================================================
// TOOLTIP PERSONALIZADO
// ============================================================================
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="alm-tooltip">
      <p className="alm-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
          {p.name}: <strong>{p.name.includes('TM') ? fmtTM(p.value, 2) : fmtNumber(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// KPI CARD
// ============================================================================
function KpiCard({ label, value, sub, icon, accent, animate }) {
  return (
    <div className="alm-kpi" style={{ "--accent": accent }}>
      <div className="alm-kpi-icon">{icon}</div>
      <div className="alm-kpi-body">
        <p className="alm-kpi-label">{label}</p>
        <p className={`alm-kpi-value ${animate ? "alm-pulse-num" : ""}`}>{value}</p>
        {sub && <p className="alm-kpi-sub">{sub}</p>}
      </div>
      <div className="alm-kpi-bar" />
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function DashboardSacosCompartido({ barco }) {
  const [vista, setVista] = useState("general");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const { registros, loading, error, lastUpdate, refetch } = useSacosData(barco.id);

  // Obtener metas por bodega (estimados)
  const [metasBodega, setMetasBodega] = useState({});

  useEffect(() => {
    // Cargar metas del barco (estimados por bodega)
    const cargarMetas = async () => {
      try {
        console.log("📊 Datos completos del barco:", barco);
        console.log("📊 metas_json:", barco.metas_json);
        
        // Obtener metas de sacos_bodega del metas_json
        const metasGuardadas = barco.metas_json?.sacos_bodega || {};
        
        console.log("🎯 Metas guardadas en sacos_bodega:", metasGuardadas);
        
        setMetasBodega(metasGuardadas);
      } catch (error) {
        console.error("Error cargando metas:", error);
      }
    };
    
    cargarMetas();
  }, [barco]);

  // Agrupar por producto (por ahora solo hay un tipo, pero preparado para futuro)
  const productos = useMemo(() => {
    const pesosSaco = [...new Set(registros.map(r => r.peso_saco_kg))].sort((a, b) => a - b);
    
    return pesosSaco.map(peso => {
      const registrosProducto = registros.filter(r => r.peso_saco_kg === peso);
      const totalSacos = registrosProducto.reduce((sum, r) => sum + r.cantidad_paquetes, 0);
      const totalTM = registrosProducto.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
      
      return {
        id: `sacos-${peso}kg`,
        nombre: `Sacos de ${peso}kg`,
        icono: peso === 25 ? '🟢' : peso === 50 ? '🔵' : '📦',
        color: peso === 25 ? '#10b981' : peso === 50 ? '#3b82f6' : '#f59e0b',
        peso_saco: peso,
        registros: registrosProducto,
        totalSacos,
        totalTM,
        viajes: registrosProducto.length
      };
    });
  }, [registros]);

  // Estadísticas generales
  const statsGenerales = useMemo(() => {
    const totalViajes = registros.length;
    const totalSacos = registros.reduce((sum, r) => sum + r.cantidad_paquetes, 0);
    const totalTM = registros.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
    const totalDanados = registros.reduce((sum, r) => sum + (r.paquetes_danados || 0), 0);
    
    // Viajes por día (últimos 7 días)
    const viajesPorDia = {};
    const ultimos7Dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      ultimos7Dias.push(fecha);
      viajesPorDia[fecha] = 0;
    }
    
    registros.forEach(r => {
      if (viajesPorDia.hasOwnProperty(r.fecha)) {
        viajesPorDia[r.fecha]++;
      }
    });

    const datosTendencia = ultimos7Dias.map(fecha => ({
      fecha: dayjs(fecha).format('DD/MM'),
      viajes: viajesPorDia[fecha] || 0
    }));

    // Top placas
    const placasMap = {};
    registros.forEach(r => {
      if (!placasMap[r.placa_camion]) {
        placasMap[r.placa_camion] = {
          placa: r.placa_camion,
          viajes: 0,
          sacos: 0,
          tm: 0
        };
      }
      placasMap[r.placa_camion].viajes++;
      placasMap[r.placa_camion].sacos += r.cantidad_paquetes;
      placasMap[r.placa_camion].tm += r.peso_total_calculado_tm;
    });

    const topPlacas = Object.values(placasMap)
      .sort((a, b) => b.viajes - a.viajes)
      .slice(0, 5);

    return {
      totalViajes,
      totalSacos,
      totalTM,
      totalDanados,
      promedioSacosPorViaje: totalViajes > 0 ? totalSacos / totalViajes : 0,
      promedioTMPorViaje: totalViajes > 0 ? totalTM / totalViajes : 0,
      datosTendencia,
      topPlacas
    };
  }, [registros]);

  // ============================================================================
  // NUEVAS FUNCIONALIDADES: FLUJO POR HORA Y ACUMULADO POR BODEGA
  // ============================================================================

  // 1. FLUJO POR HORA (TONELADAS/HORA)
  const flujoPorHora = useMemo(() => {
    if (registros.length === 0) return [];

    // Ordenar registros por fecha/hora
    const registrosOrdenados = [...registros]
      .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());

    // Agrupar por hora (redondeando a la hora)
    const flujoPorHoraMap = new Map();

    registrosOrdenados.forEach(reg => {
      const hora = dayjs(reg.fecha_hora).format('YYYY-MM-DD HH:00');
      if (!flujoPorHoraMap.has(hora)) {
        flujoPorHoraMap.set(hora, {
          hora: dayjs(reg.fecha_hora).format('HH:00'),
          fecha: dayjs(reg.fecha_hora).format('DD/MM'),
          horaCompleta: hora,
          toneladas: 0,
          viajes: 0,
          sacos: 0
        });
      }
      const data = flujoPorHoraMap.get(hora);
      data.toneladas += reg.peso_total_calculado_tm;
      data.viajes += 1;
      data.sacos += reg.cantidad_paquetes;
    });

    // Calcular flujo (ya está en toneladas por hora porque agrupamos por hora)
    const resultado = Array.from(flujoPorHoraMap.values())
      .sort((a, b) => a.horaCompleta.localeCompare(b.horaCompleta))
      .slice(-24); // Últimas 24 horas

    return resultado;
  }, [registros]);

  // 2. FLUJO PROMEDIO GENERAL (TM/h)
  const flujoPromedioGeneral = useMemo(() => {
    if (registros.length < 2) return 0;

    const registrosOrdenados = [...registros]
      .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());

    const primerRegistro = registrosOrdenados[0];
    const ultimoRegistro = registrosOrdenados[registrosOrdenados.length - 1];

    const horaInicio = dayjs(primerRegistro.fecha_hora);
    const horaFin = dayjs(ultimoRegistro.fecha_hora);
    const horasTranscurridas = horaFin.diff(horaInicio, 'hour', true);

    if (horasTranscurridas <= 0) return 0;

    const totalTM = registros.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
    return totalTM / horasTranscurridas;
  }, [registros]);

  // 3. FLUJO ÚLTIMA HORA
  const flujoUltimaHora = useMemo(() => {
    if (registros.length === 0) return 0;

    const ahora = dayjs();
    const hace1Hora = ahora.subtract(1, 'hour');

    const registrosUltimaHora = registros.filter(r =>
      dayjs(r.fecha_hora).isAfter(hace1Hora)
    );

    if (registrosUltimaHora.length === 0) return 0;

    const totalTMUltimaHora = registrosUltimaHora.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
    return totalTMUltimaHora;
  }, [registros]);

  // 4. DATOS POR BODEGA CON PORCENTAJES Y METAS
  const datosPorBodegaCompleto = useMemo(() => {
    console.log("📊 Calculando datos por bodega");
    console.log("🎯 Metas disponibles en estado:", metasBodega);
    
    const bodegasMap = {};
    
    // Primero, inicializar todas las bodegas del barco con meta si existe
    if (barco.bodegas_json && barco.bodegas_json.length > 0) {
      console.log("📍 Bodegas del barco:", barco.bodegas_json);
      
      barco.bodegas_json.forEach(bodega => {
        const nombreBodega = bodega.nombre;
        // Buscar la meta para esta bodega
        const metaBodega = metasBodega[nombreBodega] || 0;
        
        console.log(`📍 Bodega ${nombreBodega} - Meta encontrada: ${metaBodega} TM`);
        
        bodegasMap[nombreBodega] = {
          bodega: nombreBodega,
          viajes: 0,
          sacos: 0,
          tm: 0,
          meta: metaBodega,
          flujoHora: 0
        };
      });
    }
    
    // Agregar datos de registros
    registros.forEach(r => {
      // Si la bodega no existe en el mapa (por si hay registros de bodegas no configuradas)
      if (!bodegasMap[r.bodega]) {
        const metaBodega = metasBodega[r.bodega] || 0;
        
        bodegasMap[r.bodega] = {
          bodega: r.bodega,
          viajes: 0,
          sacos: 0,
          tm: 0,
          meta: metaBodega,
          flujoHora: 0
        };
      }
      
      bodegasMap[r.bodega].viajes++;
      bodegasMap[r.bodega].sacos += r.cantidad_paquetes;
      bodegasMap[r.bodega].tm += r.peso_total_calculado_tm;
    });

    // Calcular flujo por hora para cada bodega
    const resultado = Object.values(bodegasMap).map(b => {
      // Filtrar registros de esta bodega
      const registrosBodega = registros.filter(r => r.bodega === b.bodega);
      
      if (registrosBodega.length < 2) {
        b.flujoHora = 0;
      } else {
        const registrosOrdenados = [...registrosBodega]
          .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());
        
        const primero = registrosOrdenados[0];
        const ultimo = registrosOrdenados[registrosOrdenados.length - 1];
        
        const horas = dayjs(ultimo.fecha_hora).diff(dayjs(primero.fecha_hora), 'hour', true);
        if (horas > 0) {
          b.flujoHora = b.tm / horas;
        }
      }
      
      // Calcular porcentaje - usar meta de la bodega
      b.porcentaje = b.meta > 0 ? (b.tm / b.meta * 100) : 0;
      b.faltante = Math.max(0, b.meta - b.tm);
      b.completado = b.meta > 0 && b.tm >= b.meta;
      
      console.log(`📈 Bodega ${b.bodega}: ${b.tm.toFixed(1)} TM / ${b.meta.toFixed(1)} TM = ${b.porcentaje.toFixed(1)}%`);
      
      return b;
    });

    return resultado.sort((a, b) => a.bodega.localeCompare(b.bodega));
  }, [registros, metasBodega, barco.bodegas_json]);

  // 5. TOTALES POR BODEGA PARA GRÁFICO DE BARRAS
  const datosGraficoBodega = useMemo(() => {
    return datosPorBodegaCompleto.map(b => ({
      name: b.bodega.replace('Bodega ', 'B'),
      bodega: b.bodega,
      toneladas: b.tm,
      meta: b.meta,
      porcentaje: b.porcentaje,
      completado: b.completado,
      faltante: b.faltante,
      color: b.completado ? '#10b981' : (b.porcentaje > 75 ? '#f59e0b' : '#3b82f6')
    }));
  }, [datosPorBodegaCompleto]);

  // 6. FLUJO POR HORA POR BODEGA (últimas horas)
  const flujoPorHoraBodega = useMemo(() => {
    if (registros.length === 0) return [];

    const registrosOrdenados = [...registros]
      .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix())
      .slice(-48); // Últimas 48 horas

    // Agrupar por hora y bodega
    const flujoMap = new Map();

    registrosOrdenados.forEach(reg => {
      const hora = dayjs(reg.fecha_hora).format('YYYY-MM-DD HH:00');
      const bodega = reg.bodega;
      const key = `${hora}|${bodega}`;

      if (!flujoMap.has(key)) {
        flujoMap.set(key, {
          hora: dayjs(reg.fecha_hora).format('HH:00'),
          horaCompleta: hora,
          bodega: bodega,
          toneladas: 0
        });
      }
      flujoMap.get(key).toneladas += reg.peso_total_calculado_tm;
    });

    // Transformar para el gráfico
    const horas = [...new Set(Array.from(flujoMap.values()).map(v => v.hora))].sort();
    const bodegas = [...new Set(registros.map(r => r.bodega))];

    const resultado = horas.map(hora => {
      const dataPoint = { hora };
      bodegas.forEach(bodega => {
        const entry = Array.from(flujoMap.values()).find(
          v => v.hora === hora && v.bodega === bodega
        );
        dataPoint[bodega] = entry ? entry.toneladas : 0;
      });
      return dataPoint;
    });

    return resultado.slice(-12); // Últimas 12 horas
  }, [registros]);

  // 7. PROYECCIÓN DE FINALIZACIÓN POR BODEGA
  const proyeccionesBodega = useMemo(() => {
    if (flujoPromedioGeneral === 0) return [];

    return datosPorBodegaCompleto.map(b => {
      if (b.meta === 0 || b.completado) {
        return { ...b, proyeccion: null, fechaEstimada: null };
      }

      const flujoBodega = b.flujoHora > 0 ? b.flujoHora : flujoPromedioGeneral;
      const horasRestantes = b.faltante / flujoBodega;
      const fechaEstimada = dayjs().add(horasRestantes, 'hour');

      return {
        ...b,
        flujoUsado: flujoBodega,
        horasRestantes,
        fechaEstimada: fechaEstimada.format('DD/MM HH:mm'),
        diasRestantes: Math.floor(horasRestantes / 24),
        horasRestantesMod: Math.floor(horasRestantes % 24)
      };
    });
  }, [datosPorBodegaCompleto, flujoPromedioGeneral]);

  // Datos para gráficos
  const datosDistribucion = productos.map(p => ({
    name: p.nombre,
    value: p.totalTM,
    color: p.color
  }));

  const datosEvolucionAcumulada = useMemo(() => {
    const registrosOrdenados = [...registros]
      .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());
    
    let acumulado = 0;
    return registrosOrdenados.slice(-30).map(r => {
      acumulado += r.peso_total_calculado_tm;
      return {
        fecha: dayjs(r.fecha).format('DD/MM'),
        hora: r.hora_fin,
        acumulado: acumulado,
        viaje: r.viaje_numero
      };
    });
  }, [registros]);

  if (loading && !registros.length) {
    return (
      <div className="alm-splash">
        <img src="/logo.png" alt="ALMAPAC" className="alm-splash-logo" />
        <div className="alm-splash-ship">📦</div>
        <p className="alm-splash-text">Cargando datos de sacos...</p>
        <div className="alm-loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alm-splash">
        <img src="/logo.png" alt="ALMAPAC" className="alm-splash-logo" />
        <div className="alm-error-box">
          <div className="text-4xl mb-3">❌</div>
          <p className="alm-error-title">Error al cargar datos</p>
          <p className="alm-error-msg">{error}</p>
          <button onClick={refetch} className="alm-retry-btn">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #f8fafc;
          --surface: #ffffff;
          --border: #e2e8f0;
          --border-strong: #cbd5e1;
          --text: #0f172a;
          --text-2: #475569;
          --text-3: #94a3b8;
          --blue: #3b82f6;
          --green: #10b981;
          --amber: #f59e0b;
          --teal: #14b8a6;
          --navy: #0f172a;
          --radius: 16px;
          --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06);
          --shadow-md: 0 4px 24px rgba(0,0,0,.10);
          font-family: 'Sora', sans-serif;
        }

        body { background: var(--bg); color: var(--text); }

        .alm-root {
          min-height: 100vh;
          background: var(--bg);
          padding: 0;
        }

        /* ── TOPBAR ── */
        .alm-topbar {
          background: var(--navy);
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 68px;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 12px rgba(0,0,0,.18);
        }

        .alm-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .alm-logo {
          height: 32px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) invert(1);
          flex-shrink: 0;
        }

        .alm-divider {
          width: 1px;
          height: 30px;
          background: rgba(255,255,255,.18);
          flex-shrink: 0;
        }

        .alm-ship-id {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .alm-ship-name {
          font-size: 14px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -.3px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alm-ship-code {
          font-size: 10px;
          color: rgba(255,255,255,.5);
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .alm-topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .alm-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(16,185,129,.15);
          border: 1px solid rgba(16,185,129,.3);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #6ee7b7;
          text-transform: uppercase;
          letter-spacing: .5px;
          white-space: nowrap;
        }

        .alm-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse-dot 2s infinite;
          flex-shrink: 0;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .alm-update-container {
          display: none;
        }

        .alm-refresh-btn {
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          color: rgba(255,255,255,.8);
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          font-family: 'Sora', sans-serif;
          display: flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }

        .alm-refresh-btn:hover {
          background: rgba(255,255,255,.15);
          color: #fff;
        }

        @media (min-width: 768px) {
          .alm-topbar { padding: 0 24px; }
          .alm-logo { height: 36px; }
          .alm-ship-name { font-size: 15px; }
          .alm-update-container { display: block; }
          .alm-update-time {
            font-size: 11px;
            color: rgba(255,255,255,.4);
            font-family: 'DM Mono', monospace;
          }
        }

        /* ── BODY ── */
        .alm-body {
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px 24px 48px;
        }

        /* ── KPIs ── */
        .alm-kpis-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .alm-kpi {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
        }

        .alm-kpi::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: var(--accent);
        }

        .alm-kpi-icon {
          font-size: 28px;
          line-height: 1;
          flex-shrink: 0;
        }

        .alm-kpi-body { flex: 1; }

        .alm-kpi-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-3);
          margin-bottom: 4px;
        }

        .alm-kpi-value {
          font-size: 22px;
          font-weight: 900;
          color: var(--text);
          line-height: 1.1;
          font-family: 'DM Mono', monospace;
        }

        .alm-kpi-sub {
          font-size: 11px;
          color: var(--text-3);
          margin-top: 3px;
        }

        .alm-kpi-bar {
          position: absolute;
          top: 0; left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent);
          border-radius: 0 2px 2px 0;
        }

        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .alm-pulse-num { animation: count-up .6s ease; }

        /* ── CHART CARDS ── */
        .alm-charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
          margin-bottom: 20px;
        }

        .alm-chart-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          box-shadow: var(--shadow);
        }

        .alm-chart-wide { grid-column: 1 / -1; }

        .alm-chart-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-2);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .alm-no-data {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-3);
          font-size: 13px;
        }

        /* ── TOOLTIP ── */
        .alm-tooltip {
          background: var(--navy);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px;
          padding: 10px 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,.3);
        }

        .alm-tooltip-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,.6);
          margin-bottom: 4px;
          font-family: 'DM Mono', monospace;
        }

        .alm-tooltip-value {
          font-size: 12px;
          font-family: 'DM Mono', monospace;
          color: rgba(255,255,255,.9);
        }

        /* ── DISEÑO MEJORADO DEL BARCO (VERSIÓN 2.0) ── */
        .alm-ship-layout {
          background: linear-gradient(145deg, #0b1a2e 0%, #0f172a 100%);
          border-radius: 32px;
          padding: 32px;
          margin-bottom: 28px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          border: 1px solid rgba(59, 130, 246, 0.3);
          position: relative;
          overflow: hidden;
        }

        .alm-ship-layout::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, #10b981, #f59e0b, transparent);
          opacity: 0.5;
        }

        .alm-ship-title {
          font-size: 20px;
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
          z-index: 2;
        }

        .alm-ship-title span:first-child {
          background: rgba(255,255,255,0.1);
          padding: 8px 24px;
          border-radius: 40px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .alm-ship-container {
          position: relative;
          width: 100%;
          overflow: visible;
          padding: 20px 0;
        }

        .alm-ship-svg {
          width: 100%;
          height: auto;
          display: block;
          filter: drop-shadow(0 30px 40px rgba(0,0,0,0.7));
        }

        .alm-ship-legend {
          display: flex;
          gap: 32px;
          margin-top: 28px;
          justify-content: center;
          padding: 16px 28px;
          background: rgba(0,0,0,0.4);
          border-radius: 60px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap;
        }

        .alm-legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          letter-spacing: 0.3px;
        }

        .alm-legend-dot {
          width: 14px;
          height: 14px;
          border-radius: 4px;
          display: inline-block;
          flex-shrink: 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        /* ── TABLA ── */
        .alm-table-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          margin-top: 20px;
        }

        .alm-table-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: #f8fafc;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .alm-section-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text);
        }

        .alm-badge {
          margin-left: 10px;
          font-size: 11px;
          font-weight: 600;
          background: #e2e8f0;
          color: var(--text-2);
          padding: 2px 9px;
          border-radius: 999px;
        }

        .alm-table-scroll { overflow-x: auto; }

        .alm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          min-width: 1200px;
        }

        .alm-table thead {
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .alm-table th {
          padding: 11px 16px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .8px;
          color: var(--text-3);
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        .alm-table td {
          padding: 11px 16px;
          color: var(--text-2);
          white-space: nowrap;
        }

        .alm-table tbody tr:hover { background: #f8fafc; }

        .alm-th-num, .alm-td-num { text-align: right; }

        .alm-tr-latest { background: #eff6ff !important; }

        .alm-bold { font-weight: 700; color: var(--text) !important; }
        .alm-green { color: var(--green) !important; }
        .alm-amber { color: var(--amber) !important; }
        .alm-red { color: #ef4444 !important; }
        .alm-mono { font-family: 'DM Mono', monospace; }

        .alm-diferencia-ok { color: #10b981; }
        .alm-diferencia-warn { color: #f59e0b; }
        .alm-diferencia-error { color: #ef4444; }

        /* ── FOOTER ── */
        .alm-footer {
          text-align: center;
          padding: 24px;
          font-size: 11px;
          color: var(--text-3);
          font-family: 'DM Mono', monospace;
          margin-top: 20px;
        }

        /* ── SPLASH ── */
        .alm-splash {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--navy);
          gap: 20px;
        }

        .alm-splash-logo {
          height: 48px;
          filter: brightness(0) invert(1);
        }

        .alm-splash-ship {
          font-size: 64px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        .alm-splash-text {
          color: rgba(255,255,255,.6);
          font-size: 16px;
          font-weight: 600;
        }

        .alm-loader {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── ERROR BOX ── */
        .alm-error-box {
          background: #fff;
          border-radius: 20px;
          padding: 36px;
          text-align: center;
          max-width: 380px;
        }

        .alm-error-title { font-size: 18px; font-weight: 700; color: #dc2626; margin-bottom: 8px; }
        .alm-error-msg { font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
        .alm-retry-btn {
          background: #fee2e2;
          border: none;
          border-radius: 10px;
          color: #dc2626;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        @media (max-width: 768px) {
          .alm-body { padding: 16px 12px 40px; }
          .alm-charts-row { grid-template-columns: 1fr; }
          .alm-chart-wide { grid-column: auto; }
        }
      `}</style>

      <div className="alm-root">
        <header className="alm-topbar">
          <div className="alm-topbar-left">
            <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
            <div className="alm-divider" />
            <div className="alm-ship-id">
              <span className="alm-ship-name">{barco.nombre}</span>
              <span className="alm-ship-code">#{barco.codigo_barco}</span>
            </div>
          </div>

          <div className="alm-topbar-right">
            <div className="alm-status-pill">
              <span className="alm-status-dot" />
              <span className="alm-status-text">SACOS</span>
            </div>

            {lastUpdate && (
              <div className="alm-update-container">
                <span className="alm-update-time">↻ {lastUpdate.format("HH:mm:ss")}</span>
              </div>
            )}

            <button onClick={refetch} className="alm-refresh-btn" title="Actualizar datos">
              <span className="alm-refresh-icon">🔄</span>
              <span className="alm-refresh-text">Actualizar</span>
            </button>
          </div>
        </header>

        <div className="alm-body">
          {/* KPIs Principales */}
          <div className="alm-kpis-row">
            <KpiCard 
              label="Total Viajes" 
              value={statsGenerales.totalViajes} 
              icon="🚛" 
              accent="#10b981"
              animate={true}
            />
            <KpiCard 
              label="Total Sacos" 
              value={fmtNumber(statsGenerales.totalSacos)} 
              icon="📦" 
              accent="#3b82f6"
              animate={true}
            />
            <KpiCard 
              label="Total Toneladas" 
              value={`${fmtTM(statsGenerales.totalTM, 2)} TM`} 
              icon="⚖️" 
              accent="#f59e0b"
              animate={true}
            />
            <KpiCard 
              label="Sacos Dañados" 
              value={fmtNumber(statsGenerales.totalDanados)} 
              icon="⚠️" 
              accent="#ef4444"
              sub={`${statsGenerales.totalDanados > 0 ? ((statsGenerales.totalDanados / statsGenerales.totalSacos) * 100).toFixed(1) : 0}% del total`}
            />
          </div>

          {/* FLUJO POR HORA */}
          <div className="alm-chart-card alm-chart-wide">
            <h4 className="alm-chart-title">
              ⏱️ FLUJO POR HORA (TM/h)
              <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-3)' }}>
                Promedio: {fmtTM(flujoPromedioGeneral, 2)} TM/h | Última hora: {fmtTM(flujoUltimaHora, 2)} TM
              </span>
            </h4>
            {flujoPorHora.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={flujoPorHora}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis yAxisId="left" tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'toneladas') return [fmtTM(value, 2) + ' TM', 'Toneladas'];
                      if (name === 'viajes') return [value + ' viajes', 'Viajes'];
                      return [value, name];
                    }}
                  />
                  <Bar yAxisId="left" dataKey="toneladas" fill="#10b981" name="Toneladas" barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="viajes" stroke="#f59e0b" strokeWidth={2} name="Viajes" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="alm-no-data">Se necesitan al menos 2 horas de datos para mostrar flujo</div>
            )}
          </div>

          {/* ===== DISEÑO MEJORADO DEL BARCO (VERSIÓN 2.0) ===== */}
          <div className="alm-ship-layout">
            <div className="alm-ship-title">
              <span>⚓ DISTRIBUCIÓN DE CARGA POR BODEGA</span>
              <span className="alm-badge" style={{background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '14px'}}>
                Total: {fmtTM(statsGenerales.totalTM, 2)} TM
              </span>
            </div>

            <div className="alm-ship-container">
              <svg
                viewBox="0 0 1400 550"
                xmlns="http://www.w3.org/2000/svg"
                className="alm-ship-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Definiciones para gradientes y efectos */}
                <defs>
                  {/* Gradiente para el casco */}
                  <linearGradient id="hullMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4a5568" />
                    <stop offset="50%" stopColor="#718096" />
                    <stop offset="100%" stopColor="#4a5568" />
                  </linearGradient>
                  
                  {/* Gradiente para el agua */}
                  <linearGradient id="oceanWater" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f3b5e" />
                    <stop offset="50%" stopColor="#0a2a44" />
                    <stop offset="100%" stopColor="#051a2b" />
                  </linearGradient>
                  
                  {/* Gradiente para la cubierta */}
                  <linearGradient id="deckWood" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5a2b" />
                    <stop offset="50%" stopColor="#a67c52" />
                    <stop offset="100%" stopColor="#8b5a2b" />
                  </linearGradient>
                  
                  {/* Patrón de remaches */}
                  <pattern id="rivets" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="2" fill="#cbd5e0" opacity="0.3" />
                  </pattern>
                  
                  {/* Filtro de brillo metálico */}
                  <filter id="metalShine" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                    <feSpecularLighting result="specOut" in="SourceGraphic" specularConstant="0.8" specularExponent="20" lightingColor="#ffffff">
                      <fePointLight x="200" y="100" z="200" />
                    </feSpecularLighting>
                    <feComposite in="specOut" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
                  </filter>
                </defs>

                {/* Agua con ondas */}
                <rect x="0" y="350" width="1400" height="200" fill="url(#oceanWater)" />
                
                {/* Ondas del mar */}
                <path d="M0 380 Q150 360, 300 380 T600 380 T900 380 T1200 380 T1400 380" stroke="#60a5fa" strokeWidth="3" fill="none" opacity="0.3" />
                <path d="M0 420 Q200 400, 400 420 T800 420 T1200 420" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.2" />
                <path d="M0 460 Q250 440, 500 460 T1000 460" stroke="#2563eb" strokeWidth="1" fill="none" opacity="0.2" />

                {/* Sombra del barco en el agua */}
                <ellipse cx="700" cy="390" rx="600" ry="30" fill="#000000" opacity="0.2" filter="url(#metalShine)" />

                {/* Casco principal con forma de barco real */}
                <path 
                  d="M150 350 L200 200 L1200 200 L1250 350 Z" 
                  fill="url(#hullMetal)" 
                  stroke="#94a3b8" 
                  strokeWidth="6"
                  filter="url(#metalShine)"
                />
                
                {/* Línea de flotación */}
                <line x1="170" y1="300" x2="1230" y2="300" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 10" opacity="0.6" />

                {/* Cubierta de madera */}
                <rect x="200" y="180" width="1000" height="30" fill="url(#deckWood)" stroke="#b45309" strokeWidth="2" rx="4" />
                
                {/* Barandas de metal */}
                <line x1="220" y1="150" x2="1180" y2="150" stroke="#cbd5e0" strokeWidth="3" />
                <line x1="220" y1="140" x2="1180" y2="140" stroke="#cbd5e0" strokeWidth="2" />
                
                {/* Postes de la baranda */}
                {[250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150].map(x => (
                  <rect key={x} x={x-2} y="130" width="4" height="30" fill="#94a3b8" rx="2" />
                ))}

                {/* Mástil principal */}
                <rect x="400" y="30" width="12" height="120" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                <circle cx="406" cy="20" r="18" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
                <line x1="406" y1="20" x2="406" y2="150" stroke="#d97706" strokeWidth="1" strokeDasharray="5 3" />
                
                {/* Mástil trasero */}
                <rect x="1000" y="50" width="8" height="100" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                <circle cx="1004" cy="40" r="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />

                {/* Chimenea con humo */}
                <rect x="650" y="40" width="70" height="140" fill="#475569" stroke="#334155" strokeWidth="3" rx="6" />
                <ellipse cx="685" cy="40" rx="35" ry="12" fill="#334155" stroke="#1f2937" strokeWidth="2" />
                
                {/* Humo animado */}
                <circle cx="685" cy="25" r="12" fill="#94a3b8" opacity="0.4">
                  <animate attributeName="r" values="12;15;12" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="705" cy="15" r="8" fill="#cbd5e0" opacity="0.3">
                  <animate attributeName="r" values="8;11;8" dur="2.5s" repeatCount="indefinite" />
                </circle>

                {/* Ventanas del puente de mando */}
                <rect x="500" y="100" width="200" height="60" fill="#1f2937" stroke="#4b5563" strokeWidth="3" rx="8" />
                <circle cx="540" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                <circle cx="600" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                <circle cx="660" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />

                {/* Bodegas - Contenedores de carga */}
                {datosPorBodegaCompleto.map((bodega, index) => {
                  const totalBodegas = datosPorBodegaCompleto.length;
                  const anchoBodega = 700 / totalBodegas;
                  const inicioX = 300 + (index * anchoBodega) + (anchoBodega * 0.1);
                  const ancho = anchoBodega * 0.8;
                  const altoMaximo = 160;
                  const porcentaje = Math.min(100, bodega.porcentaje);
                  const altoRelleno = (altoMaximo * porcentaje) / 100;
                  
                  // Determinar color según progreso
                  let colorBodega = "#3b82f6"; // Azul por defecto
                  let colorBorde = "#2563eb";
                  if (bodega.completado) {
                    colorBodega = "#10b981";
                    colorBorde = "#059669";
                  } else if (porcentaje > 75) {
                    colorBodega = "#f59e0b";
                    colorBorde = "#d97706";
                  }
                  
                  return (
                    <g key={bodega.bodega} filter="url(#metalShine)">
                      {/* Contenedor exterior */}
                      <rect 
                        x={inicioX} 
                        y={190} 
                        width={ancho} 
                        height={altoMaximo} 
                        fill="#1e293b" 
                        stroke={colorBorde} 
                        strokeWidth="4"
                        rx="12"
                      />
                      
                      {/* Relleno de carga con textura */}
                      <rect 
                        x={inicioX + 4} 
                        y={190 + (altoMaximo - altoRelleno)} 
                        width={ancho - 8} 
                        height={altoRelleno - 4} 
                        fill={colorBodega} 
                        opacity="0.9"
                        rx="8"
                      >
                        <animate 
                          attributeName="height" 
                          from="0" 
                          to={altoRelleno - 4} 
                          dur="1s" 
                          fill="freeze" 
                        />
                      </rect>
                      
                      {/* Patrón de líneas en el contenedor */}
                      <rect 
                        x={inicioX} 
                        y={190} 
                        width={ancho} 
                        height={altoMaximo} 
                        fill="url(#rivets)" 
                        opacity="0.5"
                        rx="12"
                      />
                      
                      {/* Número de bodega con fondo */}
                      <rect x={inicioX + ancho/2 - 25} y="165" width="50" height="25" fill="#0f172a" rx="12" stroke={colorBorde} strokeWidth="2" />
                      <text 
                        x={inicioX + ancho/2} 
                        y="183" 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="14" 
                        fontWeight="bold"
                      >
                        {bodega.bodega.replace('Bodega ', 'B')}
                      </text>
                      
                      {/* Toneladas */}
                      <text 
                        x={inicioX + ancho/2} 
                        y={230} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="14" 
                        fontWeight="800"
                        fontFamily="DM Mono, monospace"
                      >
                        {fmtTM(bodega.tm, 1)}
                      </text>
                      <text 
                        x={inicioX + ancho/2} 
                        y={250} 
                        textAnchor="middle" 
                        fill="rgba(255,255,255,0.7)" 
                        fontSize="10" 
                        fontWeight="600"
                      >
                        TM
                      </text>
                      
                      {/* Porcentaje */}
                      <text 
                        x={inicioX + ancho/2} 
                        y={310} 
                        textAnchor="middle" 
                        fill="white" 
                        fontSize="16" 
                        fontWeight="900"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                      >
                        {porcentaje.toFixed(0)}%
                      </text>
                      
                      {/* Barra de progreso inferior */}
                      <rect 
                        x={inicioX + 15} 
                        y={330} 
                        width={ancho - 30} 
                        height="8" 
                        fill="#334155" 
                        rx="4" 
                      />
                      <rect 
                        x={inicioX + 15} 
                        y={330} 
                        width={(ancho - 30) * (porcentaje / 100)} 
                        height="8" 
                        fill={colorBodega} 
                        rx="4" 
                      >
                        <animate 
                          attributeName="width" 
                          from="0" 
                          to={(ancho - 30) * (porcentaje / 100)} 
                          dur="1s" 
                          fill="freeze" 
                        />
                      </rect>
                    </g>
                  );
                })}

                {/* Proa detallada */}
                <g>
                  <path d="M150 350 L130 300 L180 200 L200 200 L150 350" fill="#4a5568" stroke="#718096" strokeWidth="3" />
                  <circle cx="140" cy="285" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                  <line x1="140" y1="277" x2="140" y2="293" stroke="#d97706" strokeWidth="2" />
                  <line x1="132" y1="285" x2="148" y2="285" stroke="#d97706" strokeWidth="2" />
                </g>

                {/* Popa detallada */}
                <g>
                  <path d="M1250 350 L1270 300 L1220 200 L1200 200 L1250 350" fill="#4a5568" stroke="#718096" strokeWidth="3" />
                  <circle cx="1260" cy="285" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                </g>

                {/* Texto de proa y popa con estilo */}
                <text x="140" y="270" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="bold" transform="rotate(-90, 140, 270)"></text>
                <text x="1260" y="270" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="14" fontWeight="bold" transform="rotate(90, 1260, 270)"></text>
                
                {/* Nombre del barco en el casco */}
                <text x="700" y="280" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="24" fontWeight="800" fontFamily="DM Mono, monospace">
                  {barco.nombre.toUpperCase()}
                </text>
              </svg>

              {/* Leyenda mejorada */}
              <div className="alm-ship-legend">
                <span className="alm-legend-item">
                  <span style={{background: '#10b981', boxShadow: '0 0 15px #10b981'}} className="alm-legend-dot" />
                  Completada (100%)
                </span>
                <span className="alm-legend-item">
                  <span style={{background: '#f59e0b', boxShadow: '0 0 15px #f59e0b'}} className="alm-legend-dot" />
                  {'>'} 75%
                </span>
                <span className="alm-legend-item">
                  <span style={{background: '#3b82f6', boxShadow: '0 0 15px #3b82f6'}} className="alm-legend-dot" />
                  En progreso
                </span>
                <span className="alm-legend-item">
                  <span style={{background: '#475569'}} className="alm-legend-dot" />
                  Estructura
                </span>
                <span className="alm-legend-item">
                  <span style={{background: '#fbbf24'}} className="alm-legend-dot" />
                  Meta: {fmtTM(Object.values(metasBodega).reduce((s, m) => s + m, 0), 2)} TM
                </span>
              </div>
            </div>
          </div>

        

          {/* GRÁFICO DE FLUJO POR HORA POR BODEGA */}
          <div className="alm-chart-card alm-chart-wide">
            <h4 className="alm-chart-title">
              📈 FLUJO POR HORA POR BODEGA (TM/h)
              <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-3)' }}>
                Últimas 12 horas
              </span>
            </h4>
            {flujoPorHoraBodega.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flujoPorHoraBodega} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis tickFormatter={(v) => fmtTM(v, 1)} />
                  <Tooltip formatter={(value) => fmtTM(value, 2) + ' TM'} />
                  <Legend />
                  {datosPorBodegaCompleto.map((bodega, index) => (
                    <Bar 
                      key={bodega.bodega} 
                      dataKey={bodega.bodega} 
                      stackId="a" 
                      fill={COLORES[index % COLORES.length]} 
                      name={bodega.bodega}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="alm-no-data">Se necesitan más datos para mostrar flujo por bodega</div>
            )}
          </div>

          {/* Tabla de Registros */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <h3 className="alm-section-title">
                📋 Registros Detallados
                <span className="alm-badge">{registros.length} registros</span>
              </h3>
            </div>
            <div className="alm-table-scroll">
              <table className="alm-table">
                <thead>
                  <tr>
                    <th># Viaje</th>
                    <th>Fecha</th>
                    <th>Bodega</th>
                    <th>Placa</th>
                    <th>Remolque</th>
                    <th className="alm-th-num">Peso Ing. (kg)</th>
                    <th className="alm-th-num">Saco (kg)</th>
                    <th className="alm-th-num">Cantidad</th>
                    <th className="alm-th-num">Dañados</th>
                    <th className="alm-th-num">Peso Calc. (kg)</th>
                    <th className="alm-th-num">Total TM</th>
                    <th>Diferencia</th>
                    <th>H.Inicio</th>
                    <th>H.Fin</th>
                    <th>Dur.</th>
                    <th>Chequero</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 50).map((reg, i) => (
                    <tr key={reg.id} className={i === 0 ? "alm-tr-latest" : ""}>
                      <td className="alm-bold">#{reg.viaje_numero}</td>
                      <td>{dayjs(reg.fecha).format('DD/MM/YY')}</td>
                      <td>{reg.bodega}</td>
                      <td className="alm-mono">{reg.placa_camion}</td>
                      <td className="alm-mono">{reg.placa_remolque || '—'}</td>
                      <td className="alm-td-num">{fmtNumber(reg.peso_ingenio_kg)}</td>
                      <td className="alm-td-num">{reg.peso_saco_kg}</td>
                      <td className="alm-td-num">{fmtNumber(reg.cantidad_paquetes)}</td>
                      <td className="alm-td-num">{reg.paquetes_danados > 0 ? fmtNumber(reg.paquetes_danados) : '—'}</td>
                      <td className="alm-td-num">{fmtNumber(reg.peso_total_calculado_kg)}</td>
                      <td className="alm-td-num alm-bold alm-green">{fmtTM(reg.peso_total_calculado_tm, 2)}</td>
                      <td className={`alm-td-num ${
                        reg.porcentaje_diferencia < 1 ? 'alm-diferencia-ok' :
                        reg.porcentaje_diferencia < 5 ? 'alm-diferencia-warn' : 'alm-diferencia-error'
                      }`}>
                        {reg.porcentaje_diferencia.toFixed(1)}%
                      </td>
                      <td>{reg.hora_inicio}</td>
                      <td>{reg.hora_fin}</td>
                      <td>{reg.duracion}</td>
                      <td>{reg.chequero || '—'}</td>
                      <td className="alm-mono" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {reg.observaciones || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {registros.length > 50 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-3)' }}>
                Mostrando últimos 50 de {registros.length} registros
              </div>
            )}
          </div>

          {/* Resumen por Bodega */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <h3 className="alm-section-title">
                📊 RESUMEN POR BODEGA CON METAS
              </h3>
            </div>
            <div className="alm-table-scroll">
              <table className="alm-table" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th>Bodega</th>
                    <th className="alm-th-num">Viajes</th>
                    <th className="alm-th-num">Sacos</th>
                    <th className="alm-th-num">Actual (TM)</th>
                    <th className="alm-th-num">Meta (TM)</th>
                    <th className="alm-th-num">%</th>
                    <th className="alm-th-num">Faltante (TM)</th>
                    <th className="alm-th-num">Flujo/h (TM/h)</th>
                    <th>Estado</th>
                    <th className="alm-th-num">Proyección</th>
                  </tr>
                </thead>
                <tbody>
                  {datosPorBodegaCompleto.map(b => {
                    const proyeccion = proyeccionesBodega.find(p => p.bodega === b.bodega);
                    
                    return (
                      <tr key={b.bodega}>
                        <td className="alm-bold">{b.bodega}</td>
                        <td className="alm-td-num">{b.viajes}</td>
                        <td className="alm-td-num">{fmtNumber(b.sacos)}</td>
                        <td className="alm-td-num alm-green">{fmtTM(b.tm, 2)}</td>
                        <td className="alm-td-num">{b.meta > 0 ? fmtTM(b.meta, 2) : '—'}</td>
                        <td className="alm-td-num alm-bold" style={{ color: b.completado ? '#10b981' : (b.porcentaje > 75 ? '#f59e0b' : '#3b82f6') }}>
                          {b.meta > 0 ? b.porcentaje.toFixed(1) + '%' : '—'}
                        </td>
                        <td className="alm-td-num" style={{ color: b.faltante > 0 ? '#ef4444' : '#10b981' }}>
                          {b.meta > 0 ? (b.faltante > 0 ? fmtTM(b.faltante, 2) : '✓') : '—'}
                        </td>
                        <td className="alm-td-num">{b.flujoHora > 0 ? fmtTM(b.flujoHora, 2) : '—'}</td>
                        <td>
                          {b.completado ? (
                            <span style={{color: '#10b981', fontWeight: 'bold'}}>COMPLETADA</span>
                          ) : b.meta > 0 ? (
                            <span style={{color: '#f59e0b', fontWeight: 'bold'}}>EN PROGRESO</span>
                          ) : (
                            <span style={{color: '#94a3b8'}}>SIN META</span>
                          )}
                        </td>
                        <td className="alm-td-num alm-amber">
                          {proyeccion?.fechaEstimada ? proyeccion.fechaEstimada : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background: '#f1f5f9', fontWeight: 'bold'}}>
                    <td className="alm-bold">TOTAL</td>
                    <td className="alm-td-num alm-bold">{statsGenerales.totalViajes}</td>
                    <td className="alm-td-num alm-bold">{fmtNumber(statsGenerales.totalSacos)}</td>
                    <td className="alm-td-num alm-bold alm-green">{fmtTM(statsGenerales.totalTM, 2)}</td>
                    <td className="alm-td-num alm-bold">
                      {fmtTM(Object.values(metasBodega).reduce((s, m) => s + m, 0), 2)}
                    </td>
                    <td className="alm-td-num alm-bold">
                      {Object.values(metasBodega).reduce((s, m) => s + m, 0) > 0
                        ? ((statsGenerales.totalTM / Object.values(metasBodega).reduce((s, m) => s + m, 0)) * 100).toFixed(1) + '%'
                        : '—'}
                    </td>
                    <td className="alm-td-num alm-bold" style={{ color: '#ef4444' }}>
                      {Object.values(metasBodega).reduce((s, m) => s + m, 0) > 0
                        ? fmtTM(Math.max(0, Object.values(metasBodega).reduce((s, m) => s + m, 0) - statsGenerales.totalTM), 2)
                        : '—'}
                    </td>
                    <td className="alm-td-num alm-bold">{fmtTM(flujoPromedioGeneral, 2)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            🔄 auto-refresh 30s &nbsp;·&nbsp; {barco.nombre} ({barco.codigo_barco}) &nbsp;·&nbsp; Registro de Sacos
          </div>
        </div>
      </div>
    </>
  );
}