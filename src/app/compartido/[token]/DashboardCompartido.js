//src/app/compartido/[token]/DashboardCompartido.js
"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 *  DASHBOARD BARCO PREMIUM — ALMAPAC · v26 · DISEÑO PREMIUM
 *  ⚡ CORREGIDO PARA EXPORTACIÓN: Total global = SUMA de acumulados por bodega
 *  ⚡ CORREGIDO: Ya no usa el último registro como total global
 *  ⚡ CORREGIDO: Flujos calculados correctamente
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, Legend
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

// Extender dayjs con los plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

// Configurar zona horaria de El Salvador (GMT-6)
const ZONA_HORARIA_SV = "America/El_Salvador";
dayjs.locale("es");

// ============================================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan variables de entorno de Supabase");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLORES_FALLBACK = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

// ============================================================================
// HOOK PRINCIPAL - CORREGIDO PARA EXPORTACIÓN
// ============================================================================
function useBarcoData(codigoBarco) {
  const [data, setData] = useState({
    barco: null, 
    productos: [], 
    destinos: [], 
    viajes: [],
    lecturasBanda: [], 
    lecturasExportacion: [],
    loading: true, 
    error: null, 
    lastUpdate: null,
  });

  const cargarTodo = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      console.log("Buscando barco con código:", codigoBarco);

      if (!codigoBarco) {
        throw new Error("No se proporcionó código de barco");
      }

      const { data: barcosEncontrados, error: errorBarco } = await supabase
        .from("barcos")
        .select("*")
        .eq("codigo_barco", codigoBarco);

      if (errorBarco) {
        console.error("Error en consulta de barco:", errorBarco);
        throw new Error(`Error al buscar barco: ${errorBarco.message}`);
      }

      if (!barcosEncontrados || barcosEncontrados.length === 0) {
        throw new Error(`No existe barco con código ${codigoBarco}`);
      }

      const barco = barcosEncontrados[0];
      console.log("Barco encontrado:", barco);

      const { data: destinos, error: errorDestinos } = await supabase
        .from("destinos").select("*").eq("activo", true);
      if (errorDestinos) throw new Error(`Error destinos: ${errorDestinos.message}`);

      const destinosMap = {};
      (destinos || []).forEach((d) => { destinosMap[d.id] = d; });

      const { data: viajes, error: errorViajes } = await supabase
        .from("viajes").select("*").eq("barco_id", barco.id)
        .order("viaje_numero", { ascending: true });
      if (errorViajes) throw new Error(`Error viajes: ${errorViajes.message}`);

      const { data: lecturas, error: errorBanda } = await supabase
        .from("lecturas_banda").select("*").eq("barco_id", barco.id)
        .order("fecha_hora", { ascending: false });
      if (errorBanda) throw new Error(`Error lecturas: ${errorBanda.message}`);

      const { data: exportaciones, error: errorExportacion } = await supabase
        .from("exportacion_banda")
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono)
        `)
        .eq("barco_id", barco.id)
        .order("fecha_hora", { ascending: false });
      
      if (errorExportacion) {
        console.error("Error cargando exportaciones:", errorExportacion);
        throw new Error(`Error exportaciones: ${errorExportacion.message}`);
      }
      
      console.log("Exportaciones encontradas:", exportaciones?.length || 0);

      let productos = [];
      const codigosEnMetas = barco.metas_json?.productos || [];

      if (codigosEnMetas.length > 0) {
        const { data: prods, error: errorProds } = await supabase
          .from("productos").select("*").in("codigo", codigosEnMetas).eq("activo", true).order("id");
        if (errorProds) throw new Error(`Error productos: ${errorProds.message}`);
        productos = prods || [];
      } else {
        const productoIdsSet = new Set();
        (viajes || []).forEach((v) => { if (v.producto_id) productoIdsSet.add(v.producto_id); });
        (lecturas || []).forEach((l) => { if (l.producto_id) productoIdsSet.add(l.producto_id); });
        (exportaciones || []).forEach((e) => { if (e.producto_id) productoIdsSet.add(e.producto_id); });

        if (productoIdsSet.size > 0) {
          const { data: prods, error: errorProds } = await supabase
            .from("productos").select("*").in("id", Array.from(productoIdsSet)).eq("activo", true).order("id");
          if (errorProds) throw new Error(`Error productos: ${errorProds.message}`);
          productos = prods || [];
        } else {
          const { data: prods, error: errorProds } = await supabase
            .from("productos").select("*").eq("activo", true).order("id");
          if (errorProds) throw new Error(`Error productos: ${errorProds.message}`);
          productos = prods || [];
        }
      }

      productos = productos.map((p, i) => ({
        ...p,
        color_accent: p.color_accent || COLORES_FALLBACK[i % COLORES_FALLBACK.length],
        icono: p.icono || "📦",
      }));

      const viajesEnriquecidos = (viajes || []).map((v) => ({
        ...v,
        fecha_hora: v.fecha_hora,
        peso_destino_tm: Number(v.peso_destino_tm) || 0,
        peso_neto_updp_tm: Number(v.peso_neto_updp_tm) || 0,
        peso_bruto_updp_tm: Number(v.peso_bruto_updp_tm) || 0,
        peso_bruto_almapac_tm: Number(v.peso_bruto_almapac_tm) || 0,
        total_acumulado_tm: Number(v.total_acumulado_tm) || 0,
        destino_nombre: destinosMap[v.destino_id]?.nombre || "Desconocido",
        destino_codigo: destinosMap[v.destino_id]?.codigo || "—",
      }));

      const lecturasEnriquecidas = (lecturas || []).map((l, index, array) => {
        let flujo = 0;
        const lecturasOrdenadas = [...array].sort(
          (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
        );
        const indexOrdenado = lecturasOrdenadas.findIndex(lect => lect.id === l.id);

        if (indexOrdenado > 0) {
          const lecturaActual = lecturasOrdenadas[indexOrdenado];
          const lecturaAnterior = lecturasOrdenadas[indexOrdenado - 1];

          const horaActual = dayjs.utc(lecturaActual.fecha_hora);
          const horaAnterior = dayjs.utc(lecturaAnterior.fecha_hora);

          const minutosTranscurridos = horaActual.diff(horaAnterior, 'minute', true);

          if (minutosTranscurridos > 0) {
            const acumuladoActual = lecturaActual.acumulado_tm || 0;
            const acumuladoAnterior = lecturaAnterior.acumulado_tm || 0;
            const diferencia = acumuladoActual - acumuladoAnterior;
            flujo = (diferencia / minutosTranscurridos) * 60;
          }
        }

        return {
          ...l,
          acumulado_tm: Number(l.acumulado_tm) || 0,
          destino_nombre: destinosMap[l.destino_id]?.nombre || "Desconocido",
          flujo_calculado: flujo > 0 ? flujo : 0,
        };
      });

      // =====================================================
      // CORRECCIÓN PARA EXPORTACIÓN: Calcular total global como SUMA de acumulados por bodega
      // =====================================================
      const exportacionesEnriquecidas = (exportaciones || []).map((e, index, array) => {
        let flujo = 0;
        const exportacionesOrdenadas = [...array].sort(
          (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
        );
        const indexOrdenado = exportacionesOrdenadas.findIndex(exp => exp.id === e.id);

        if (indexOrdenado > 0) {
          const expActual = exportacionesOrdenadas[indexOrdenado];
          const expAnterior = exportacionesOrdenadas[indexOrdenado - 1];

          // Solo calcular flujo si es la MISMA bodega
          if (expActual.bodega_id === expAnterior.bodega_id) {
            const horaActual = dayjs.utc(expActual.fecha_hora);
            const horaAnterior = dayjs.utc(expAnterior.fecha_hora);
            const minutosTranscurridos = horaActual.diff(horaAnterior, 'minute', true);

            if (minutosTranscurridos > 0) {
              const acumuladoActual = expActual.acumulado_tm || 0;
              const acumuladoAnterior = expAnterior.acumulado_tm || 0;
              const diferencia = acumuladoActual - acumuladoAnterior;
              if (diferencia > 0) {
                flujo = (diferencia / minutosTranscurridos) * 60;
              }
            }
          }
        }

        return {
          ...e,
          acumulado_tm: Number(e.acumulado_tm) || 0,
          flujo_calculado: flujo > 0 ? flujo : 0,
        };
      });

      console.log("Datos cargados:", {
        barco: barco.codigo_barco,
        tipo: barco.tipo_operacion,
        productos: productos.length,
        viajes: viajes?.length,
        lecturas: lecturas?.length,
        exportaciones: exportaciones?.length
      });

      setData({
        barco, 
        productos, 
        destinos: destinos || [],
        viajes: viajesEnriquecidos, 
        lecturasBanda: lecturasEnriquecidas,
        lecturasExportacion: exportacionesEnriquecidas,
        loading: false, 
        error: null, 
        lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV),
      });
    } catch (error) {
      console.error("Error detallado cargando datos:", error);
      setData((prev) => ({
        ...prev, loading: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV),
      }));
    }
  }, [codigoBarco]);

  useEffect(() => {
    cargarTodo();
    const interval = setInterval(cargarTodo, 30000);
    return () => clearInterval(interval);
  }, [cargarTodo]);

  return { ...data, refetch: cargarTodo };
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

const pct = (v, t) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);

function getMetaProducto(metas_json, producto) {
  if (!metas_json?.limites) return 0;
  return Number(metas_json.limites[producto.codigo]) || 0;
}

// ============================================================================
// FUNCIÓN PARA CALCULAR TOTAL GLOBAL EN EXPORTACIÓN (SUMA DE ACUMULADOS POR BODEGA)
// ============================================================================
function calcularTotalGlobalExportacion(exportaciones, productoId) {
  const exportacionesProducto = exportaciones.filter(e => e.producto_id === productoId);
  if (exportacionesProducto.length === 0) return 0;
  
  // Agrupar por bodega y tomar el último acumulado de cada una
  const ultimoAcumuladoPorBodega = new Map();
  
  exportacionesProducto.forEach(exp => {
    const bodegaId = exp.bodega_id;
    const acumulado = exp.acumulado_tm || 0;
    const existing = ultimoAcumuladoPorBodega.get(bodegaId);
    
    if (!existing || new Date(exp.fecha_hora) > new Date(existing.fecha_hora)) {
      ultimoAcumuladoPorBodega.set(bodegaId, { acumulado, fecha_hora: exp.fecha_hora });
    }
  });
  
  // Sumar todos los acumulados
  let total = 0;
  ultimoAcumuladoPorBodega.forEach(value => {
    total += value.acumulado;
  });
  
  return total;
}

// ============================================================================
// COMPONENTE: Resumen de Paros para Dashboard de Exportación
// ============================================================================
function ResumenParosDashboard({ barcoId }) {
  const [resumenParos, setResumenParos] = useState({
    almapac: { minutos: 0, cantidad: 0, loading: true },
    updp: { minutos: 0, cantidad: 0, loading: true },
    otras: { minutos: 0, cantidad: 0, loading: true },
    total: { minutos: 0, cantidad: 0, loading: true }
  });

  // Configuración de tipos de paro
  const TIPOS_PARO_CONFIG = {
    // PAROS ALMAPAC
    'BANDA 7': { grupo: 'ALMAPAC' },
    'MOVIMIENTO DEL CARRO DE BANDA 7': { grupo: 'ALMAPAC' },
    'ELEVADOR 23': { grupo: 'ALMAPAC' },
    'ELEVADOR 13': { grupo: 'ALMAPAC' },
    'BÁSCULA DE EXPORTACIÓN': { grupo: 'ALMAPAC' },
    'COMPUERTA DE LLENADO': { grupo: 'ALMAPAC' },
    'COMPUERTA DE DESCARGA': { grupo: 'ALMAPAC' },
    'HEL ALTO': { grupo: 'ALMAPAC' },
    'DRAFT MASTER': { grupo: 'ALMAPAC' },
    'COMPRESOR A': { grupo: 'ALMAPAC' },
    'COMPRESOR B': { grupo: 'ALMAPAC' },
    'BANDA 15': { grupo: 'ALMAPAC' },
    'BANDA 19': { grupo: 'ALMAPAC' },
    'BANDA 72': { grupo: 'ALMAPAC' },
    'BANDA 73': { grupo: 'ALMAPAC' },
    'FALLA DE PAYD LOADER': { grupo: 'ALMAPAC' },
    'PLC': { grupo: 'ALMAPAC' },
    'FALTA DE AZÚCAR': { grupo: 'ALMAPAC' },
    'BANDA 21': { grupo: 'ALMAPAC' },
    'BANDA 2': { grupo: 'ALMAPAC' },
    'BANDA 1': { grupo: 'ALMAPAC' },
    'DESATORANDO ELEVADOR 23.': { grupo: 'ALMAPAC' },
    'OTROS': { grupo: 'ALMAPAC' },
    
    // PAROS UPDP (NO IMPUTABLES ALMAPAC)
    'TRANSPORTADOR No:': { grupo: 'UPDP' },
    'REBALSE EN EL BUM': { grupo: 'UPDP' },
    'FALLAS EN UNIDAD DE CARGA': { grupo: 'UPDP' },
    'FALLAS EN EL APILADOR': { grupo: 'UPDP' },
    'MANTENIMINETO DEL APILADOR': { grupo: 'UPDP' },
    'LIMPIEZA DEL APILADOR': { grupo: 'UPDP' },
    'MOVIMIENTO DEL APILADOR': { grupo: 'UPDP' },
    'CAMBIO DE BODEGA EN EL BARCO': { grupo: 'UPDP' },
    'CORTE DE ENERGÍA ELÉCTRICA UPDP': { grupo: 'UPDP' },
    
    // PAROS POR OTRAS CAUSAS
    'VERIFICACIÓN DE CALIDAD DEL AZÚCAR A BORDO': { grupo: 'OTRAS' },
    'VERIFICACIÓN DE CALADO (INICIAL)': { grupo: 'OTRAS' },
    'VERIFICACIÓN DE CALADO (FINAL)': { grupo: 'OTRAS' },
    'MAREA FUERTE': { grupo: 'OTRAS' },
    'MOVIMIENTO DEL BARCO': { grupo: 'OTRAS' },
    'AMENAZA DE LLUVIA': { grupo: 'OTRAS' },
    'PARO POR LLUVIA': { grupo: 'OTRAS' },
    'CORTE DE ENERGÍA ELÉCTRICA': { grupo: 'OTRAS' },
  };

  const formatearTiempo = (minutos) => {
    if (minutos === 0) return '0m';
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0 && mins > 0) return `${horas}h ${mins}m`;
    if (horas > 0) return `${horas}h`;
    return `${mins}m`;
  };

  const cargarResumenParos = useCallback(async () => {
    if (!barcoId) return;

    try {
      // 1. Obtener catálogo de tipos de paro
      const { data: catalogos, error: errorCat } = await supabase
        .from('catalogos_paros')
        .select('*')
        .eq('activo', true);

      if (errorCat) throw errorCat;

      // Crear mapa de tipo_paro_id -> grupo
      const tipoAGrupo = {};
      catalogos.forEach(catalogo => {
        const config = TIPOS_PARO_CONFIG[catalogo.nombre];
        if (config) {
          tipoAGrupo[catalogo.id] = config.grupo;
        } else {
          // Por defecto, ALMAPAC
          tipoAGrupo[catalogo.id] = 'ALMAPAC';
        }
      });

      // 2. Obtener registros de paros del barco
      const { data: paros, error: errorParos } = await supabase
        .from('registro_paros')
        .select('*')
        .eq('barco_id', barcoId);

      if (errorParos) throw errorParos;

      // 3. Calcular resumen por grupo
      const resumen = {
        ALMAPAC: { minutos: 0, cantidad: 0 },
        UPDP: { minutos: 0, cantidad: 0 },
        OTRAS: { minutos: 0, cantidad: 0 }
      };

      paros.forEach(paro => {
        const grupo = tipoAGrupo[paro.tipo_paro_id] || 'ALMAPAC';
        const duracion = paro.duracion_minutos || 0;
        
        if (resumen[grupo]) {
          resumen[grupo].minutos += duracion;
          resumen[grupo].cantidad++;
        } else {
          resumen.ALMAPAC.minutos += duracion;
          resumen.ALMAPAC.cantidad++;
        }
      });

      const totalMinutos = resumen.ALMAPAC.minutos + resumen.UPDP.minutos + resumen.OTRAS.minutos;
      const totalCantidad = resumen.ALMAPAC.cantidad + resumen.UPDP.cantidad + resumen.OTRAS.cantidad;

      setResumenParos({
        almapac: { 
          minutos: resumen.ALMAPAC.minutos, 
          cantidad: resumen.ALMAPAC.cantidad, 
          loading: false 
        },
        updp: { 
          minutos: resumen.UPDP.minutos, 
          cantidad: resumen.UPDP.cantidad, 
          loading: false 
        },
        otras: { 
          minutos: resumen.OTRAS.minutos, 
          cantidad: resumen.OTRAS.cantidad, 
          loading: false 
        },
        total: { 
          minutos: totalMinutos, 
          cantidad: totalCantidad, 
          loading: false 
        }
      });

    } catch (error) {
      console.error('Error cargando resumen de paros:', error);
      setResumenParos({
        almapac: { minutos: 0, cantidad: 0, loading: false },
        updp: { minutos: 0, cantidad: 0, loading: false },
        otras: { minutos: 0, cantidad: 0, loading: false },
        total: { minutos: 0, cantidad: 0, loading: false }
      });
    }
  }, [barcoId]);

  useEffect(() => {
    cargarResumenParos();
  }, [cargarResumenParos]);

  if (resumenParos.almapac.loading) {
    return (
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="alm-loader" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6' }}></div>
          <span style={{ color: '#94a3b8' }}>Cargando resumen de paros...</span>
        </div>
      </div>
    );
  }

  const tieneDatos = resumenParos.total.minutos > 0 || resumenParos.total.cantidad > 0;

  if (!tieneDatos) {
    return null;
  }

  return (
   <div style={{
  background: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb'
  }}>
    <span style={{ fontSize: '24px' }}>⏱️</span>
    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1d4ed8', margin: 0 }}>
      RESUMEN DE TIEMPOS DE PAROS
    </h3>
    <span style={{ 
      marginLeft: 'auto',
      fontSize: '12px',
      color: '#6b7280',
      fontFamily: 'monospace'
    }}>
      {resumenParos.total.cantidad} paro{resumenParos.total.cantidad !== 1 ? 's' : ''} registrados
    </span>
  </div>

  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  }}>
    
    {/* ALMAPAC */}
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      borderLeft: '4px solid #f97316'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>📦</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}>
          IMPUTABLES ALMAPAC
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>
        {formatearTiempo(resumenParos.almapac.minutos)}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
        {resumenParos.almapac.cantidad} paro{resumenParos.almapac.cantidad !== 1 ? 's' : ''}
      </div>
    </div>

    {/* UPDP */}
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      borderLeft: '4px solid #1d4ed8'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}>
          IMPUTABLES UPDP
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>
        {formatearTiempo(resumenParos.updp.minutos)}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
        {resumenParos.updp.cantidad} paro{resumenParos.updp.cantidad !== 1 ? 's' : ''}
      </div>
    </div>

    {/* OTRAS */}
    <div style={{
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '16px',
      borderLeft: '4px solid #fb923c'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '20px' }}>🌊</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1d4ed8', textTransform: 'uppercase' }}>
          OTRAS CAUSAS
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', fontFamily: 'monospace' }}>
        {formatearTiempo(resumenParos.otras.minutos)}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
        {resumenParos.otras.cantidad} paro{resumenParos.otras.cantidad !== 1 ? 's' : ''}
      </div>
    </div>

  </div>

  {/* TOTAL */}
  {resumenParos.total.minutos > 0 && (
    <div style={{
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: '16px',
      fontSize: '12px'
    }}>
      <span style={{ color: '#6b7280' }}>TIEMPO TOTAL EN PAROS:</span>
      <span style={{ fontWeight: '800', color: '#f97316', fontFamily: 'monospace', fontSize: '16px' }}>
        {formatearTiempo(resumenParos.total.minutos)}
      </span>
    </div>
  )}
</div>
  );
}

// ============================================================================
// COMPONENTE: Panel de Tendencias y Predicciones para Exportación - CORREGIDO
// ============================================================================
function PanelPrediccionesExportacion({ producto, lecturas, meta, tipoOperacion, totalGlobal }) {
  const [periodoPrediccion, setPeriodoPrediccion] = useState(6);

  const textoAccion = 'CARGAR';
  const textoFaltante = 'FALTANTE POR CARGAR';

  // CORREGIDO: Ordenar lecturas por fecha (ascendente para cálculos)
  const lecturasOrdenadas = useMemo(() => {
    return [...lecturas].sort(
      (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
    );
  }, [lecturas]);

  // CORREGIDO: El total global se recibe por props (calculado como suma de acumulados por bodega)
  const totalGeneral = totalGlobal;

  // CORREGIDO: Flujo promedio general basado en primera y última lectura de CADA BODEGA
  const flujoPromedioGeneral = useMemo(() => {
    if (lecturasOrdenadas.length < 2) return 0;
    
    // Agrupar por bodega para calcular flujo por bodega
    const lecturasPorBodega = new Map();
    lecturasOrdenadas.forEach(l => {
      if (!lecturasPorBodega.has(l.bodega_id)) {
        lecturasPorBodega.set(l.bodega_id, []);
      }
      lecturasPorBodega.get(l.bodega_id).push(l);
    });
    
    let totalToneladas = 0;
    let totalHoras = 0;
    
    lecturasPorBodega.forEach(lecturasBodega => {
      if (lecturasBodega.length >= 2) {
        const primera = lecturasBodega[0];
        const ultima = lecturasBodega[lecturasBodega.length - 1];
        const acumuladoInicial = primera.acumulado_tm || 0;
        const acumuladoFinal = ultima.acumulado_tm || 0;
        const diferencia = acumuladoFinal - acumuladoInicial;
        
        if (diferencia > 0) {
          const horaInicial = dayjs.utc(primera.fecha_hora);
          const horaFinal = dayjs.utc(ultima.fecha_hora);
          const horas = horaFinal.diff(horaInicial, 'hour', true);
          if (horas > 0) {
            totalToneladas += diferencia;
            totalHoras += horas;
          }
        }
      }
    });
    
    return totalHoras > 0 ? totalToneladas / totalHoras : 0;
  }, [lecturasOrdenadas]);

  // CORREGIDO: Flujo de la última hora
  const flujoUltimaHora = useMemo(() => {
    const ahora = dayjs();
    const hace1Hora = ahora.subtract(1, 'hour');
    
    // Agrupar lecturas de la última hora por bodega
    const lecturasUltimaHora = lecturasOrdenadas.filter(l =>
      dayjs.utc(l.fecha_hora).isAfter(hace1Hora)
    );
    
    if (lecturasUltimaHora.length < 2) {
      // Tomar las dos últimas lecturas de la bodega más reciente
      const bodegaActiva = lecturasOrdenadas.length > 0 ? lecturasOrdenadas[lecturasOrdenadas.length - 1].bodega_id : null;
      if (bodegaActiva) {
        const lecturasBodegaActiva = lecturasOrdenadas.filter(l => l.bodega_id === bodegaActiva);
        if (lecturasBodegaActiva.length >= 2) {
          const ultimasDos = lecturasBodegaActiva.slice(-2);
          const [anterior, actual] = ultimasDos;
          const diferenciaTon = (actual.acumulado_tm || 0) - (anterior.acumulado_tm || 0);
          const diferenciaHoras = dayjs.utc(actual.fecha_hora).diff(dayjs.utc(anterior.fecha_hora), 'hour', true);
          return diferenciaHoras > 0 ? diferenciaTon / diferenciaHoras : 0;
        }
      }
      return 0;
    }
    
    // Agrupar por bodega y tomar la primera y última de cada una en la última hora
    const lecturasPorBodega = new Map();
    lecturasUltimaHora.forEach(l => {
      if (!lecturasPorBodega.has(l.bodega_id)) {
        lecturasPorBodega.set(l.bodega_id, []);
      }
      lecturasPorBodega.get(l.bodega_id).push(l);
    });
    
    let totalDiferencia = 0;
    let totalHoras = 0;
    
    lecturasPorBodega.forEach(lecturasBodega => {
      if (lecturasBodega.length >= 2) {
        const primera = lecturasBodega[0];
        const ultima = lecturasBodega[lecturasBodega.length - 1];
        const diferenciaTon = (ultima.acumulado_tm || 0) - (primera.acumulado_tm || 0);
        if (diferenciaTon > 0) {
          const horas = dayjs.utc(ultima.fecha_hora).diff(dayjs.utc(primera.fecha_hora), 'hour', true);
          if (horas > 0) {
            totalDiferencia += diferenciaTon;
            totalHoras += horas;
          }
        }
      }
    });
    
    return totalHoras > 0 ? totalDiferencia / totalHoras : 0;
  }, [lecturasOrdenadas]);

  const primeraLectura = lecturasOrdenadas.length > 0 ? lecturasOrdenadas[0] : null;
  const ultimaLectura = lecturasOrdenadas.length > 0 ? lecturasOrdenadas[lecturasOrdenadas.length - 1] : null;

  const faltante = Math.max(0, meta - totalGeneral);
  const progreso = pct(totalGeneral, meta);

  const tiempoRestante = useMemo(() => {
    if (flujoUltimaHora <= 0 || faltante <= 0) return null;
    const horas = faltante / flujoUltimaHora;
    const fechaEstimada = dayjs().add(horas, 'hour');
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    const minutos = Math.round((horas - Math.floor(horas)) * 60);

    let tiempoFormateado = '';
    if (dias > 0) tiempoFormateado += `${dias} día${dias > 1 ? 's' : ''} `;
    if (horasRestantes > 0 || dias === 0) tiempoFormateado += `${Math.floor(horasRestantes)} hora${Math.floor(horasRestantes) !== 1 ? 's' : ''} `;
    if (minutos > 0 && dias === 0 && horasRestantes < 1) tiempoFormateado += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;

    return {
      horas,
      fecha: fechaEstimada.format("DD/MM/YYYY HH:mm"),
      tiempoFormateado: tiempoFormateado.trim()
    };
  }, [faltante, flujoUltimaHora]);

  // Calcular horas transcurridas desde la primera lectura hasta ahora
  const horasTranscurridas = useMemo(() => {
    if (!primeraLectura) return 0;
    const horaInicial = dayjs.utc(primeraLectura.fecha_hora);
    const ahora = dayjs();
    return ahora.diff(horaInicial, 'hour', true);
  }, [primeraLectura]);

  // CORREGIDO: Datos para el gráfico - acumulado TOTAL (suma por bodega en cada momento)
  const datosEvolucion = useMemo(() => {
    if (lecturasOrdenadas.length === 0) return [];
    
    // Para cada punto en el tiempo, calcular la suma de acumulados de todas las bodegas
    const puntosPorTiempo = new Map();
    
    lecturasOrdenadas.forEach(l => {
      const timestamp = dayjs.utc(l.fecha_hora).unix();
      const horaStr = dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm");
      
      if (!puntosPorTiempo.has(timestamp)) {
        puntosPorTiempo.set(timestamp, {
          hora: horaStr,
          timestamp,
          acumuladoPorBodega: new Map()
        });
      }
      
      const punto = puntosPorTiempo.get(timestamp);
      punto.acumuladoPorBodega.set(l.bodega_id, l.acumulado_tm || 0);
    });
    
    // Convertir a array y calcular suma por punto
    const resultado = Array.from(puntosPorTiempo.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-20)
      .map(punto => {
        let suma = 0;
        punto.acumuladoPorBodega.forEach(val => { suma += val; });
        return {
          hora: punto.hora,
          acumulado: suma,
          meta: meta
        };
      });
    
    return resultado;
  }, [lecturasOrdenadas, meta]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="alm-tooltip">
        <p className="alm-tooltip-label">{label}</p>
        {payload.map((p, i) => {
          if (p.dataKey === 'acumulado') {
            return (
              <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
                Total General: <strong>{fmtTM(p.value, 2)} T</strong>
              </p>
            );
          } else if (p.dataKey === 'meta') {
            return (
              <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
                Cantidad Manifestada: <strong>{fmtTM(p.value, 2)} T</strong>
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };

  if (!meta || meta === 0) return null;

  return (
    <div className="alm-predicciones-panel">
      <div className="alm-predicciones-header">
        <h4 className="alm-chart-title">📈 Tendencias de Carga - {producto.nombre}</h4>
        <div className="alm-predicciones-controls">
          <select
            value={periodoPrediccion}
            onChange={(e) => setPeriodoPrediccion(Number(e.target.value))}
            className="alm-predicciones-select"
          >
            <option value={3}>3 horas</option>
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas</option>
          </select>
        </div>
      </div>

      <div className="alm-predicciones-grid">
        <div className="alm-pred-metricas">
          {primeraLectura && (
            <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
              <span className="alm-pred-label">📅 PERÍODO DE OPERACIÓN</span>
              <span className="alm-pred-valor">{horasTranscurridas.toFixed(1)} horas</span>
              <span className="alm-pred-sub">
                Desde: {dayjs.utc(primeraLectura.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm")}
              </span>
            </div>
          )}

          <div className="alm-pred-metrica alm-pred-destacada" style={{ background: `${producto.color_accent}20`, borderColor: producto.color_accent }}>
            <span className="alm-pred-label">📊 FLUJO PROMEDIO GENERAL</span>
            <span className="alm-pred-valor-grande">{fmtTM(flujoPromedioGeneral, 2)} T/h</span>
            <span className="alm-pred-sub">
              {fmtTM(totalGeneral, 0)} T totales
            </span>
          </div>

          {flujoUltimaHora > 0 && (
            <div className="alm-pred-metrica" style={{ borderColor: '#10b981' }}>
              <span className="alm-pred-label">⚡ FLUJO ÚLTIMA HORA</span>
              <span className="alm-pred-valor-grande" style={{ color: '#10b981' }}>{fmtTM(flujoUltimaHora, 2)} T/h</span>
              <span className="alm-pred-sub">Basado en registros de la última hora</span>
            </div>
          )}

          <div className="alm-pred-metrica">
            <span className="alm-pred-label">🎯 PROGRESO ACTUAL</span>
            <span className="alm-pred-valor">{progreso.toFixed(1)}%</span>
            <span className="alm-pred-sub">{fmtTM(totalGeneral, 2)} T de {fmtTM(meta, 2)} T</span>
          </div>

          <div className="alm-pred-metrica">
            <span className="alm-pred-label">{textoFaltante}</span>
            <span className="alm-pred-valor">{fmtTM(faltante, 2)} T</span>
          </div>
        </div>

        {datosEvolucion.length > 1 && (
          <div className="alm-pred-grafico">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={datosEvolucion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, meta * 1.1]} tickFormatter={(v) => fmtTM(v, 0)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="acumulado" stroke={producto.color_accent} fill={`${producto.color_accent}30`} strokeWidth={2} name="Total General" />
                <Line type="monotone" dataKey="meta" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Cantidad Manifestada" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="alm-pred-leyenda">
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: producto.color_accent }} />Total General (Suma de bodegas)</span>
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: '#ef4444' }} />Cantidad Manifestada ({fmtTM(meta, 0)} T)</span>
            </div>
          </div>
        )}
      </div>

      <div className="alm-recomendaciones">
        <h5 className="alm-recomendaciones-titulo">📊 Resumen de Flujos</h5>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Flujo Promedio General</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: producto.color_accent }}>{fmtTM(flujoPromedioGeneral, 2)} T/h</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{fmtTM(totalGeneral, 0)} T totales</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Flujo Última Hora</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{fmtTM(flujoUltimaHora, 2)} T/h</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{flujoUltimaHora > 0 ? 'Basado en última hora' : 'Sin datos suficientes'}</div>
          </div>
        </div>
      </div>

      {tiempoRestante && (
        <div className="alm-recomendaciones">
          <h5 className="alm-recomendaciones-titulo">⏱️ Tiempo estimado de finalización</h5>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Completado en aproximadamente</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: producto.color_accent }}>{tiempoRestante.tiempoFormateado}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{tiempoRestante.fecha}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: Panel de Tendencias y Predicciones para Banda (Importación) - ORIGINAL
// ============================================================================
function PanelPrediccionesBanda({ producto, lecturas, viajes, meta, tipoOperacion }) {
  const [periodoPrediccion, setPeriodoPrediccion] = useState(6);

  const textoAccion = tipoOperacion === 'exportacion' ? 'CARGAR' : 'DESCARGAR';
  const textoFaltante = tipoOperacion === 'exportacion' ? 'FALTANTE POR CARGAR' : 'FALTANTE POR DESCARGAR';

  const lecturasOrdenadas = useMemo(() => {
    return [...lecturas].sort(
      (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
    );
  }, [lecturas]);

  const flujoPromedioGeneral = useMemo(() => {
    if (lecturasOrdenadas.length < 2) return 0;
    const primeraLectura = lecturasOrdenadas[0];
    const ultimaLectura = lecturasOrdenadas[lecturasOrdenadas.length - 1];
    const acumuladoInicial = primeraLectura.acumulado_tm || 0;
    const acumuladoFinal = ultimaLectura.acumulado_tm || 0;
    const diferenciaTotal = acumuladoFinal - acumuladoInicial;
    if (diferenciaTotal <= 0) return 0;
    const horaInicial = dayjs.utc(primeraLectura.fecha_hora);
    const horaFinal = dayjs.utc(ultimaLectura.fecha_hora);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return 0;
    return diferenciaTotal / horasTranscurridas;
  }, [lecturasOrdenadas]);

  const flujoReciente = useMemo(() => {
    if (lecturasOrdenadas.length < 2) return flujoPromedioGeneral;
    const ahora = dayjs();
    const hace2Horas = ahora.subtract(2, 'hour');
    const lecturasRecientes = lecturasOrdenadas.filter(l =>
      dayjs.utc(l.fecha_hora).isAfter(hace2Horas)
    );
    if (lecturasRecientes.length < 2) return flujoPromedioGeneral;
    const primeraReciente = lecturasRecientes[0];
    const ultimaReciente = lecturasRecientes[lecturasRecientes.length - 1];
    const acumuladoInicial = primeraReciente.acumulado_tm || 0;
    const acumuladoFinal = ultimaReciente.acumulado_tm || 0;
    const diferenciaTotal = acumuladoFinal - acumuladoInicial;
    if (diferenciaTotal <= 0) return flujoPromedioGeneral;
    const horaInicial = dayjs.utc(primeraReciente.fecha_hora);
    const horaFinal = dayjs.utc(ultimaReciente.fecha_hora);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return flujoPromedioGeneral;
    return diferenciaTotal / horasTranscurridas;
  }, [lecturasOrdenadas, flujoPromedioGeneral]);

  const viajesCompletos = useMemo(() => {
    return viajes.filter(v => v.estado === 'completo');
  }, [viajes]);

  const totalActual = useMemo(() => {
    const ultimaLectura = lecturasOrdenadas.length > 0
      ? lecturasOrdenadas[lecturasOrdenadas.length - 1]
      : null;
    const totalBanda = ultimaLectura?.acumulado_tm || 0;
    const totalCamiones = viajesCompletos.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
    return totalBanda + totalCamiones;
  }, [lecturasOrdenadas, viajesCompletos]);

  const primeraLectura = lecturasOrdenadas.length > 0 ? lecturasOrdenadas[0] : null;
  const ultimaLectura = lecturasOrdenadas.length > 0 ? lecturasOrdenadas[lecturasOrdenadas.length - 1] : null;

  const faltante = Math.max(0, meta - totalActual);
  const progreso = pct(totalActual, meta);

  const tiempoRestante = useMemo(() => {
    if (flujoReciente <= 0 || faltante <= 0) return null;
    const horas = faltante / flujoReciente;
    const fechaEstimada = dayjs().add(horas, 'hour');
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    const minutos = Math.round((horas - Math.floor(horas)) * 60);
    let tiempoFormateado = '';
    if (dias > 0) tiempoFormateado += `${dias} día${dias > 1 ? 's' : ''} `;
    if (horasRestantes > 0 || dias === 0) tiempoFormateado += `${Math.floor(horasRestantes)} hora${Math.floor(horasRestantes) !== 1 ? 's' : ''} `;
    if (minutos > 0 && dias === 0) tiempoFormateado += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    return {
      horas,
      fecha: fechaEstimada.format("DD/MM/YYYY HH:mm"),
      tiempoFormateado: tiempoFormateado.trim()
    };
  }, [faltante, flujoReciente]);

  const horasTranscurridas = useMemo(() => {
    if (!primeraLectura || !ultimaLectura) return 0;
    const horaInicial = dayjs.utc(primeraLectura.fecha_hora);
    const horaFinal = dayjs.utc(ultimaLectura.fecha_hora);
    return horaFinal.diff(horaInicial, 'hour', true);
  }, [primeraLectura, ultimaLectura]);

  const datosEvolucion = useMemo(() => {
    return lecturasOrdenadas.slice(-10).map(l => ({
      hora: dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm"),
      acumulado: l.acumulado_tm,
      meta: meta
    }));
  }, [lecturasOrdenadas, meta]);

  const CustomBandaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const puntoData = payload[0]?.payload;
    const obtenerFlujoDelMomento = () => {
      if (!puntoData || !lecturasOrdenadas.length) return 0;
      const lecturaActual = lecturasOrdenadas.find(l =>
        dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm") === puntoData.hora
      );
      return lecturaActual?.flujo_calculado || 0;
    };
    const flujoEnMomento = obtenerFlujoDelMomento();
    return (
      <div className="alm-tooltip">
        <p className="alm-tooltip-label">{label}</p>
        {payload.map((p, i) => {
          if (p.dataKey === 'acumulado') {
            return (
              <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
                Acumulado Banda: <strong>{fmtTM(p.value, 2)} T</strong>
              </p>
            );
          } else if (p.dataKey === 'meta') {
            return (
              <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
                Cantidad Manifestada: <strong>{fmtTM(p.value, 2)} T</strong>
              </p>
            );
          }
          return null;
        })}
        {flujoEnMomento > 0 && (
          <p className="alm-tooltip-value" style={{ color: '#10b981', marginTop: '8px', borderTop: '1px dashed #94a3b8', paddingTop: '6px' }}>
            ⚡ Flujo en ese momento: <strong>{fmtTM(flujoEnMomento, 2)} T/h</strong>
          </p>
        )}
      </div>
    );
  };

  if (!meta || meta === 0) return null;

  return (
    <div className="alm-predicciones-panel">
      <div className="alm-predicciones-header">
        <h4 className="alm-chart-title">📈 Tendencias Banda - {producto.nombre}</h4>
        <div className="alm-predicciones-controls">
          <select
            value={periodoPrediccion}
            onChange={(e) => setPeriodoPrediccion(Number(e.target.value))}
            className="alm-predicciones-select"
          >
            <option value={3}>3 horas</option>
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas</option>
          </select>
        </div>
      </div>

      <div className="alm-predicciones-grid">
        <div className="alm-pred-metricas">
          {primeraLectura && ultimaLectura && (
            <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
              <span className="alm-pred-label">📅 PERÍODO DE OPERACIÓN</span>
              <span className="alm-pred-valor">{horasTranscurridas.toFixed(1)} horas</span>
              <span className="alm-pred-sub">
                {dayjs.utc(primeraLectura.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm")} → {dayjs.utc(ultimaLectura.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM HH:mm")}
              </span>
            </div>
          )}

          <div className="alm-pred-metrica alm-pred-destacada" style={{ background: `${producto.color_accent}20`, borderColor: producto.color_accent }}>
            <span className="alm-pred-label">📊 FLUJO PROMEDIO GENERAL</span>
            <span className="alm-pred-valor-grande">{fmtTM(flujoPromedioGeneral, 2)} T/h</span>
            <span className="alm-pred-sub">
              ({fmtTM(ultimaLectura?.acumulado_tm || 0, 0)} - {fmtTM(primeraLectura?.acumulado_tm || 0, 0)}) / {horasTranscurridas.toFixed(1)}h
            </span>
          </div>

          <div className="alm-pred-metrica">
            <span className="alm-pred-label">🎯 PROGRESO ACTUAL</span>
            <span className="alm-pred-valor">{progreso.toFixed(1)}%</span>
            <span className="alm-pred-sub">{fmtTM(totalActual, 2)} T de {fmtTM(meta, 2)} T</span>
          </div>

          <div className="alm-pred-metrica">
            <span className="alm-pred-label">{textoFaltante}</span>
            <span className="alm-pred-valor">{fmtTM(faltante, 2)} T</span>
          </div>
        </div>

        {datosEvolucion.length > 1 && (
          <div className="alm-pred-grafico">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={datosEvolucion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} domain={[0, meta * 1.1]} tickFormatter={(v) => fmtTM(v, 0)} />
                <Tooltip content={<CustomBandaTooltip />} />
                <Area type="monotone" dataKey="acumulado" stroke={producto.color_accent} fill={`${producto.color_accent}30`} strokeWidth={2} name="Acumulado Banda" />
                <Line type="monotone" dataKey="meta" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Cantidad Manifestada" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="alm-pred-leyenda">
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: producto.color_accent }} />Acumulado Banda</span>
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: '#ef4444' }} />Cantidad Manifestada ({fmtTM(meta, 0)} T)</span>
            </div>
          </div>
        )}
      </div>

      {tiempoRestante && (
        <div className="alm-recomendaciones">
          <h5 className="alm-recomendaciones-titulo">⏱️ Tiempo estimado de finalización</h5>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Completado en aproximadamente</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: producto.color_accent }}>{tiempoRestante.tiempoFormateado}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{tiempoRestante.fecha}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE: Panel de Tendencias y Predicciones para Viajes - ORIGINAL
// ============================================================================
function PanelPrediccionesViajes({ producto, viajes, meta, tipoOperacion }) {
  const [periodoPrediccion, setPeriodoPrediccion] = useState(6);

  const textoAccion = tipoOperacion === 'exportacion' ? 'CARGAR' : 'DESCARGAR';
  const textoFaltante = tipoOperacion === 'exportacion' ? 'FALTANTE POR CARGAR' : 'FALTANTE POR DESCARGAR';
  const textoUnidad = tipoOperacion === 'exportacion' ? 'T cargadas' : 'T descargadas';

  const viajesCompletos = useMemo(() => {
    return viajes.filter(v => v.estado === 'completo' && v.peso_destino_tm > 0);
  }, [viajes]);

  const viajesOrdenados = useMemo(() => {
    return [...viajesCompletos].sort((a, b) => {
      const fechaA = a.fecha_hora ? dayjs.utc(a.fecha_hora).unix() :
        (a.created_at ? dayjs.utc(a.created_at).unix() : 0);
      const fechaB = b.fecha_hora ? dayjs.utc(b.fecha_hora).unix() :
        (b.created_at ? dayjs.utc(b.created_at).unix() : 0);
      return fechaA - fechaB;
    });
  }, [viajesCompletos]);

  const rendimientoPromedio = useMemo(() => {
    if (viajesCompletos.length === 0) return 0;
    const totalToneladas = viajesCompletos.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
    return totalToneladas / viajesCompletos.length;
  }, [viajesCompletos]);

  const frecuenciaViajes = useMemo(() => {
    if (viajesOrdenados.length < 2) return 0;
    const primerViaje = viajesOrdenados[0];
    const ultimoViaje = viajesOrdenados[viajesOrdenados.length - 1];
    const fechaPrimera = primerViaje.fecha_hora || primerViaje.created_at;
    const fechaUltima = ultimoViaje.fecha_hora || ultimoViaje.created_at;
    if (!fechaPrimera || !fechaUltima) return 0;
    const horaInicial = dayjs.utc(fechaPrimera);
    const horaFinal = dayjs.utc(fechaUltima);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return 0;
    return viajesOrdenados.length / horasTranscurridas;
  }, [viajesOrdenados]);

  const flujoPorHoraViajes = useMemo(() => {
    if (viajesOrdenados.length < 2) return 0;
    const primerViaje = viajesOrdenados[0];
    const ultimoViaje = viajesOrdenados[viajesOrdenados.length - 1];
    const fechaPrimera = primerViaje.fecha_hora || primerViaje.created_at;
    const fechaUltima = ultimoViaje.fecha_hora || ultimoViaje.created_at;
    if (!fechaPrimera || !fechaUltima) return 0;
    const horaInicial = dayjs.utc(fechaPrimera);
    const horaFinal = dayjs.utc(fechaUltima);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return 0;
    const totalToneladas = viajesOrdenados.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
    return totalToneladas / horasTranscurridas;
  }, [viajesOrdenados]);

  const flujoRecientePorHora = useMemo(() => {
    const ahora = dayjs();
    const hace2Horas = ahora.subtract(2, 'hour');
    const viajesRecientes = viajesCompletos.filter(v => {
      const fecha = v.fecha_hora || v.created_at;
      return fecha && dayjs.utc(fecha).isAfter(hace2Horas);
    });
    if (viajesRecientes.length < 2) return flujoPorHoraViajes;
    const primerViaje = viajesRecientes[0];
    const ultimoViaje = viajesRecientes[viajesRecientes.length - 1];
    const fechaPrimera = primerViaje.fecha_hora || primerViaje.created_at;
    const fechaUltima = ultimoViaje.fecha_hora || ultimoViaje.created_at;
    if (!fechaPrimera || !fechaUltima) return flujoPorHoraViajes;
    const horaInicial = dayjs.utc(fechaPrimera);
    const horaFinal = dayjs.utc(fechaUltima);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return flujoPorHoraViajes;
    const totalToneladasRecientes = viajesRecientes.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
    return totalToneladasRecientes / horasTranscurridas;
  }, [viajesCompletos, flujoPorHoraViajes]);

  const viajesRecientesPorHora = useMemo(() => {
    const ahora = dayjs();
    const hace2Horas = ahora.subtract(2, 'hour');
    const viajesRecientes = viajesCompletos.filter(v => {
      const fecha = v.fecha_hora || v.created_at;
      return fecha && dayjs.utc(fecha).isAfter(hace2Horas);
    });
    if (viajesRecientes.length < 2) return frecuenciaViajes;
    const primerViaje = viajesRecientes[0];
    const ultimoViaje = viajesRecientes[viajesRecientes.length - 1];
    const fechaPrimera = primerViaje.fecha_hora || primerViaje.created_at;
    const fechaUltima = ultimoViaje.fecha_hora || ultimoViaje.created_at;
    if (!fechaPrimera || !fechaUltima) return frecuenciaViajes;
    const horaInicial = dayjs.utc(fechaPrimera);
    const horaFinal = dayjs.utc(fechaUltima);
    const horasTranscurridas = horaFinal.diff(horaInicial, 'hour', true);
    if (horasTranscurridas <= 0) return frecuenciaViajes;
    return viajesRecientes.length / horasTranscurridas;
  }, [viajesCompletos, frecuenciaViajes]);

  const rendimientoReciente = useMemo(() => {
    const ultimosViajes = viajesCompletos.slice(-5);
    if (ultimosViajes.length === 0) return rendimientoPromedio;
    const totalToneladas = ultimosViajes.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
    return totalToneladas / ultimosViajes.length;
  }, [viajesCompletos, rendimientoPromedio]);

  const totalViajes = viajesCompletos.length;
  const totalToneladasViajes = viajesCompletos.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);

  const viajesFaltantes = useMemo(() => {
    if (!meta || meta === 0) return 0;
    const toneladasFaltantes = Math.max(0, meta - totalToneladasViajes);
    return rendimientoReciente > 0 ? Math.ceil(toneladasFaltantes / rendimientoReciente) : 0;
  }, [meta, totalToneladasViajes, rendimientoReciente]);

  const tiempoRestanteViajes = useMemo(() => {
    if (viajesFaltantes <= 0 || viajesRecientesPorHora <= 0) return null;
    const horas = viajesFaltantes / viajesRecientesPorHora;
    const fechaEstimada = dayjs().add(horas, 'hour');
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    const minutos = Math.round((horas - Math.floor(horas)) * 60);
    let tiempoFormateado = '';
    if (dias > 0) tiempoFormateado += `${dias} día${dias > 1 ? 's' : ''} `;
    if (horasRestantes > 0 || dias === 0) tiempoFormateado += `${Math.floor(horasRestantes)} hora${Math.floor(horasRestantes) !== 1 ? 's' : ''} `;
    if (minutos > 0 && dias === 0 && horasRestantes < 1) tiempoFormateado += `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    return {
      horas,
      fecha: fechaEstimada.format("DD/MM/YYYY HH:mm"),
      viajesFaltantes,
      tiempoFormateado: tiempoFormateado.trim() || "Menos de 1 minuto"
    };
  }, [viajesFaltantes, viajesRecientesPorHora]);

  const horasTranscurridas = useMemo(() => {
    if (viajesOrdenados.length < 2) return 0;
    const primerViaje = viajesOrdenados[0];
    const ultimoViaje = viajesOrdenados[viajesOrdenados.length - 1];
    const fechaPrimera = primerViaje.fecha_hora || primerViaje.created_at;
    const fechaUltima = ultimoViaje.fecha_hora || ultimoViaje.created_at;
    if (!fechaPrimera || !fechaUltima) return 0;
    const horaInicial = dayjs.utc(fechaPrimera);
    const horaFinal = dayjs.utc(fechaUltima);
    return horaFinal.diff(horaInicial, 'hour', true);
  }, [viajesOrdenados]);

  const datosViajes = useMemo(() => {
    const viajesParaGrafico = viajes.slice(-15);
    return viajesParaGrafico.map((v, i, arr) => {
      const viajesCompletosHastaAhora = viajes
        .slice(0, viajes.indexOf(v) + 1)
        .filter(v2 => v2.estado === 'completo');
      const acumulado = viajesCompletosHastaAhora.reduce((sum, v2) => sum + (v2.peso_destino_tm || 0), 0);
      return {
        numero: `V${v.viaje_numero || (i + 1)}`,
        peso: v.peso_destino_tm || 0,
        acumulado: acumulado,
        hora: v.fecha_hora ? dayjs.utc(v.fecha_hora).format("HH:mm") :
          (v.created_at ? dayjs.utc(v.created_at).format("HH:mm") : '--:--'),
        estado: v.estado
      };
    });
  }, [viajes]);

  if (!meta || meta === 0) {
    return (
      <div className="alm-predicciones-panel">
        <div className="alm-predicciones-header">
          <h4 className="alm-chart-title">🚛 Tendencias Viajes - {producto.nombre}</h4>
        </div>
        <div className="alm-empty" style={{ padding: '30px' }}>
          <span className="alm-empty-icon">📊</span>
          <p>No hay cantidad manifestada definida para este producto</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alm-predicciones-panel">
      <div className="alm-predicciones-header">
        <h4 className="alm-chart-title">🚛 Tendencias Viajes - {producto.nombre}</h4>
        <div className="alm-predicciones-controls">
          <select
            value={periodoPrediccion}
            onChange={(e) => setPeriodoPrediccion(Number(e.target.value))}
            className="alm-predicciones-select"
          >
            <option value={3}>3 horas</option>
            <option value={6}>6 horas</option>
            <option value={12}>12 horas</option>
            <option value={24}>24 horas</option>
          </select>
        </div>
      </div>

      <div className="alm-predicciones-grid">
        <div className="alm-pred-metricas">
          <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
            <span className="alm-pred-label">📊 TOTAL VIAJES COMPLETOS</span>
            <span className="alm-pred-valor-grande">{totalViajes}</span>
            <span className="alm-pred-sub">{fmtTM(totalToneladasViajes, 2)} {textoUnidad}</span>
          </div>

          <div className="alm-pred-metrica alm-pred-destacada" style={{ background: `${producto.color_accent}20`, borderColor: producto.color_accent }}>
            <span className="alm-pred-label">⏱️ FLUJO PROMEDIO POR HORA</span>
            <span className="alm-pred-valor-grande">{fmtTM(flujoPorHoraViajes, 2)} T/h</span>
            <span className="alm-pred-sub">{fmtTM(totalToneladasViajes, 0)} T en {horasTranscurridas.toFixed(1)} horas</span>
          </div>

          <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
            <span className="alm-pred-label">⚖️ RENDIMIENTO PROMEDIO</span>
            <span className="alm-pred-valor">{fmtTM(rendimientoPromedio, 2)} T/viaje</span>
            <span className="alm-pred-sub">{rendimientoReciente > rendimientoPromedio ? '↑ Superior' : '↓ Inferior'} al reciente</span>
          </div>

          {frecuenciaViajes > 0 && (
            <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
              <span className="alm-pred-label">⏱️ FRECUENCIA DE VIAJES</span>
              <span className="alm-pred-valor">{Math.round(frecuenciaViajes)} viajes/h</span>
              <span className="alm-pred-sub">{viajesRecientesPorHora > frecuenciaViajes ? '🔼 Acelerando' : '🔽 Desacelerando'}</span>
            </div>
          )}

          {viajesFaltantes > 0 && (
            <div className="alm-pred-metrica" style={{ borderColor: producto.color_accent }}>
              <span className="alm-pred-label">📦 {textoFaltante}</span>
              <span className="alm-pred-valor">{viajesFaltantes} viajes</span>
              <span className="alm-pred-sub">{fmtTM(meta - totalToneladasViajes, 2)} T por transportar</span>
            </div>
          )}
        </div>

        {datosViajes.length > 0 ? (
          <div className="alm-pred-grafico">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={datosViajes} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="numero" tick={{ fontSize: 9, fill: "#64748b" }} angle={-45} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => fmtTM(v, 0)} label={{ value: 'Peso (TM)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => fmtTM(v, 0)} label={{ value: 'Acumulado (TM)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#64748b' } }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Peso Viaje") return [fmtTM(value, 2) + ' T', name];
                    if (name === "Acumulado") return [fmtTM(value, 2) + ' T', name];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Viaje ${label}`}
                />
                <Bar yAxisId="left" dataKey="peso" fill={producto.color_accent} name="Peso Viaje (Destino)" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="Acumulado (Destino)" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="alm-pred-leyenda">
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: producto.color_accent }} />Peso Destino por Viaje</span>
              <span className="alm-leyenda-item"><span className="alm-leyenda-color" style={{ background: '#ef4444' }} />Acumulado Destino</span>
            </div>
          </div>
        ) : (
          <div className="alm-pred-grafico alm-empty" style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p>No hay suficientes datos para mostrar el gráfico</p>
          </div>
        )}
      </div>

      {viajesOrdenados.length >= 2 && (
        <div className="alm-recomendaciones">
          <h5 className="alm-recomendaciones-titulo">📊 Resumen de Flujo por Hora</h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Flujo Promedio General</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: producto.color_accent }}>{fmtTM(flujoPorHoraViajes, 2)} T/h</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{fmtTM(totalToneladasViajes, 0)} T / {horasTranscurridas.toFixed(1)} h</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Flujo Reciente (2h)</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{fmtTM(flujoRecientePorHora, 2)} T/h</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Basado en últimos viajes completos</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOOLTIP PERSONALIZADO PARA GRÁFICOS
// ============================================================================
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="alm-tooltip">
      <p className="alm-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
          {p.name}: <strong>{fmtTM(p.value, 2)} TM</strong>
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTE: KPI CARD
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
// COMPONENTE: Gauge de progreso circular
// ============================================================================
function GaugeRing({ pct: value, color, size = 96 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, value / 100);

  return (
    <svg width={size} height={size} className="alm-gauge">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontWeight="800">
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}

// ============================================================================
// COMPONENTE: Tarjeta de Producto PREMIUM
// ============================================================================
function TarjetaProducto({ producto, meta, totalCamiones, totalBanda, totalExportacion, activo, onClick }) {
  const total = totalCamiones + totalBanda + totalExportacion;
  const faltante = Math.max(0, meta - total);
  const progreso = pct(total, meta);
  const color = producto.color_accent;

  return (
    <button
      onClick={onClick}
      className={`alm-card-producto ${activo ? "alm-card-activo" : ""}`}
      style={{ "--color": color }}
    >
      <div className="alm-card-top">
        <div className="alm-card-icon-wrap">
          <span className="alm-card-emoji">{producto.icono}</span>
        </div>
        <GaugeRing pct={progreso} color={color} size={80} />
      </div>

      <div className="alm-card-info">
        <span className="alm-card-code">{producto.codigo}</span>
        <h3 className="alm-card-name">{producto.nombre}</h3>
        {meta > 0 && (
          <>
            <p className="alm-card-meta">Cantidad manifestada: {fmtTM(meta)} TM</p>
            <p className="alm-card-faltante" style={{ color: faltante > 0 ? '#ef4444' : '#10b981' }}>
              {faltante > 0 ? `Faltante: ${fmtTM(faltante)} TM` : '✓ Completado'}
            </p>
          </>
        )}
      </div>

      <div className="alm-card-track">
        <div className="alm-card-fill" style={{ width: `${Math.min(100, progreso)}%` }} />
      </div>

      <div className="alm-card-stats">
        {totalBanda > 0 && (
          <div className="alm-stat">
            <span className="alm-stat-dot alm-dot-banda" />
            <div>
              <p className="alm-stat-label">Banda</p>
              <p className="alm-stat-val">{fmtTM(totalBanda, 2)}</p>
            </div>
          </div>
        )}
        {totalCamiones > 0 && (
          <div className="alm-stat">
            <span className="alm-stat-dot alm-dot-cam" />
            <div>
              <p className="alm-stat-label">Camiones</p>
              <p className="alm-stat-val">{fmtTM(totalCamiones, 2)}</p>
            </div>
          </div>
        )}
        {totalExportacion > 0 && (
          <div className="alm-stat">
            <span className="alm-stat-dot" style={{ background: '#f59e0b' }} />
            <div>
              <p className="alm-stat-label">Carga</p>
              <p className="alm-stat-val">{fmtTM(totalExportacion, 2)}</p>
            </div>
          </div>
        )}
        <div className="alm-stat alm-stat-total">
          <div>
            <p className="alm-stat-label">Total TM</p>
            <p className="alm-stat-val alm-stat-bold">{fmtTM(total, 2)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// COMPONENTE: Finalización General - GRANDE, HORIZONTAL, ABARCA TODO
// ============================================================================
function FinalizacionGeneral({ metaGlobal, totalGlobal, viajes, lecturasBanda, lecturasExportacion, tipoOperacion }) {
  if (!metaGlobal || metaGlobal === 0) return null;

  const textoAccion = tipoOperacion === 'exportacion' ? 'CARGA' : 'DESCARGA';
  const faltante = Math.max(0, metaGlobal - totalGlobal);
  if (faltante <= 0) return null;

  let flujoTotal = 0;
  let flujoTexto = '';
  let flujoDetalle = '';

  if (tipoOperacion === 'exportacion') {
    // Para exportación, el flujo se calcula con la función de total global
    if (totalGlobal > 0) {
      // Calcular flujo basado en la primera y última lectura del primer y último registro
      const todasExportaciones = lecturasExportacion;
      if (todasExportaciones.length >= 2) {
        const fechas = todasExportaciones.map(e => dayjs.utc(e.fecha_hora));
        const primeraFecha = fechas.reduce((min, f) => f.isBefore(min) ? f : min);
const ultimaFecha = fechas.reduce((max, f) => f.isAfter(max) ? f : max);
        const horasTranscurridas = ultimaFecha.diff(primeraFecha, 'hour', true);
        
        if (horasTranscurridas > 0 && totalGlobal > 0) {
          flujoTotal = totalGlobal / horasTranscurridas;
          flujoTexto = `📊 Promedio Global`;
          flujoDetalle = `${totalGlobal.toFixed(1)} TM en ${horasTranscurridas.toFixed(1)}h`;
        }
      }
    }
  } else {
    const ahora = dayjs();
    const hace2Horas = ahora.subtract(2, 'hour');
    
    let flujoBanda = 0;
    const lecturasRecientes = lecturasBanda
      .filter(l => l.fecha_hora && dayjs.utc(l.fecha_hora).isAfter(hace2Horas))
      .sort((a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix());

    if (lecturasRecientes.length >= 2) {
      const primera = lecturasRecientes[0];
      const ultima = lecturasRecientes[lecturasRecientes.length - 1];
      const difTon = (ultima.acumulado_tm || 0) - (primera.acumulado_tm || 0);
      const difHoras = dayjs.utc(ultima.fecha_hora).diff(dayjs.utc(primera.fecha_hora), 'hour', true);
      if (difHoras > 0) flujoBanda = difTon / difHoras;
    }

    let flujoViajes = 0;
    const viajesRecientes = viajes
      .filter(v => v.estado === 'completo' && v.fecha_hora && dayjs.utc(v.fecha_hora).isAfter(hace2Horas));

    if (viajesRecientes.length > 0) {
      const totalToneladas = viajesRecientes.reduce((sum, v) => sum + (v.peso_destino_tm || 0), 0);
      flujoViajes = totalToneladas / 2;
    }

    flujoTotal = flujoBanda + flujoViajes;
    flujoTexto = `⚡ Flujo Reciente`;
    flujoDetalle = `Últimas 2 horas`;
  }

  if (flujoTotal <= 0) return null;

  const horas = faltante / flujoTotal;
  const fechaEstimada = dayjs().add(horas, 'hour');

  let tiempoTexto = '';
  let tiempoUnidad = '';
  
  if (horas < 1) {
    tiempoTexto = `${Math.round(horas * 60)}`;
    tiempoUnidad = 'minutos';
  } else if (horas < 24) {
    tiempoTexto = `${horas.toFixed(1)}`;
    tiempoUnidad = 'horas';
  } else {
    tiempoTexto = `${(horas / 24).toFixed(1)}`;
    tiempoUnidad = 'días';
  }

  const porcentajeCompletado = ((totalGlobal / metaGlobal) * 100).toFixed(0);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      gap: '20px',
      width: '100%'
    }}>
      
      {/* PROGRESO CIRCULAR */}
      <div style={{
        flex: 1,
        minWidth: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 12px',
        background: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.15)'
      }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#334155" strokeWidth="6" />
            <circle 
              cx="50" cy="50" r="42" fill="none" 
              stroke="#3b82f6" strokeWidth="6" 
              strokeDasharray={`${2 * Math.PI * 42 * (porcentajeCompletado / 100)} ${2 * Math.PI * 42}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <text x="50" y="57" textAnchor="middle" fill="#60a5fa" fontSize="26" fontWeight="800" fontFamily="monospace">
              {porcentajeCompletado}
            </text>
            <text x="50" y="70" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">%</text>
          </svg>
        </div>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginTop: '12px' }}>Progreso</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{fmtTM(totalGlobal, 1)} / {fmtTM(metaGlobal, 1)} TM</div>
      </div>

      {/* FLUJO */}
      <div style={{
        flex: 1.2,
        minWidth: '200px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'rgba(16, 185, 129, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(16, 185, 129, 0.15)'
      }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          borderRadius: '14px',
          width: '55px',
          height: '55px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '28px' }}>⚡</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6ee7b7', letterSpacing: '1.5px', marginBottom: '6px' }}>
            FLUJO DE {textoAccion}
          </div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#34d399', fontFamily: 'monospace', lineHeight: 1, marginBottom: '6px' }}>
            {flujoTotal.toFixed(2)}
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#6ee7b7', marginLeft: '6px' }}>TM/h</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{flujoTexto}</div>
          <div style={{ fontSize: '10px', color: '#475569' }}>{flujoDetalle}</div>
        </div>
      </div>

      {/* TIEMPO ESTIMADO */}
      <div style={{
        flex: 1.3,
        minWidth: '220px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.15)'
      }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          borderRadius: '14px',
          width: '55px',
          height: '55px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '28px' }}>🎯</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#93c5fd', letterSpacing: '1.5px', marginBottom: '6px' }}>
            TIEMPO ESTIMADO
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontSize: '32px', fontWeight: '900', color: '#60a5fa', fontFamily: 'monospace', lineHeight: 1 }}>
              {tiempoTexto}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#93c5fd' }}>{tiempoUnidad}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            📅 {fechaEstimada.format("DD/MM/YYYY")} ⏰ {fechaEstimada.format("HH:mm")} hs
          </div>
        </div>
      </div>

      {/* FALTANTE */}
      <div style={{
        flex: 0.9,
        minWidth: '150px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'rgba(239, 68, 68, 0.05)',
        borderRadius: '16px',
        border: '1px solid rgba(239, 68, 68, 0.15)'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '14px',
          width: '55px',
          height: '55px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '28px' }}>⚠️</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#fca5a5', letterSpacing: '1.5px', marginBottom: '6px' }}>
            FALTANTE
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#f87171', fontFamily: 'monospace', lineHeight: 1, marginBottom: '6px' }}>
            {faltante.toFixed(1)}
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#fca5a5', marginLeft: '6px' }}>TM</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {((faltante / metaGlobal) * 100).toFixed(0)}% restante
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: Vista General PREMIUM con Gráficos - CORREGIDO PARA EXPORTACIÓN
// ============================================================================
function VistaGeneral({ barco, productos, viajes, lecturasBanda, lecturasExportacion, onSelectProducto }) {
  const tipoOperacion = barco.tipo_operacion || 'importacion';
  const textoAccion = tipoOperacion === 'exportacion' ? 'Cargado' : 'Descargado';
  const textoFaltante = tipoOperacion === 'exportacion' ? 'Faltante por cargar' : 'Faltante por descargar';

  console.log("🔍 VistaGeneral - Datos recibidos:");
  console.log("Productos:", productos.map(p => p.codigo));
  console.log("Viajes:", viajes.length);
  console.log("Lecturas Banda:", lecturasBanda.length);
  console.log("Exportaciones:", lecturasExportacion.length);

  const totales = useMemo(() => {
    return productos.map((producto) => {
      // Viajes completos para este producto
      const viajesProducto = viajes.filter((v) => v.producto_id === producto.id && v.estado === 'completo');
      const totalCamiones = viajesProducto.reduce((s, v) => s + (v.peso_destino_tm || 0), 0);
      
      // Lecturas de banda para este producto - tomar la más reciente
      const lecturasProducto = lecturasBanda
        .filter((l) => l.producto_id === producto.id)
        .sort((a, b) => dayjs.utc(b.fecha_hora).unix() - dayjs.utc(a.fecha_hora).unix());
      const totalBanda = lecturasProducto.length > 0 ? lecturasProducto[0].acumulado_tm || 0 : 0;
      
      // =====================================================
      // CORRECCIÓN PARA EXPORTACIÓN: Calcular total como SUMA de acumulados por bodega
      // =====================================================
      let totalExportacion = 0;
      if (tipoOperacion === 'exportacion') {
        const exportacionesProducto = lecturasExportacion.filter(e => e.producto_id === producto.id);
        // Agrupar por bodega y tomar el último acumulado de cada una
        const ultimoAcumuladoPorBodega = new Map();
        exportacionesProducto.forEach(exp => {
          const bodegaId = exp.bodega_id;
          const acumulado = exp.acumulado_tm || 0;
          const existing = ultimoAcumuladoPorBodega.get(bodegaId);
          if (!existing || new Date(exp.fecha_hora) > new Date(existing.fecha_hora)) {
            ultimoAcumuladoPorBodega.set(bodegaId, acumulado);
          }
        });
        // Sumar todos los acumulados
        ultimoAcumuladoPorBodega.forEach(val => { totalExportacion += val; });
      } else {
        // Para importación, tomar el último registro
        const exportacionesProducto = lecturasExportacion
          .filter((e) => e.producto_id === producto.id)
          .sort((a, b) => dayjs.utc(b.fecha_hora).unix() - dayjs.utc(a.fecha_hora).unix());
        totalExportacion = exportacionesProducto.length > 0 ? exportacionesProducto[0].acumulado_tm || 0 : 0;
      }
      
      const meta = getMetaProducto(barco.metas_json, producto);
      
      console.log(`📊 Producto ${producto.codigo}:`, {
        viajes: viajesProducto.length,
        totalCamiones: totalCamiones.toFixed(3),
        lecturas: lecturasProducto.length,
        totalBanda: totalBanda.toFixed(3),
        exportaciones: lecturasExportacion.filter(e => e.producto_id === producto.id).length,
        totalExportacion: totalExportacion.toFixed(3),
        total: (totalCamiones + totalBanda + totalExportacion).toFixed(3),
        meta: meta.toFixed(3)
      });
      
      return { 
        producto, 
        meta, 
        totalCamiones, 
        totalBanda, 
        totalExportacion,
        total: totalCamiones + totalBanda + totalExportacion 
      };
    });
  }, [productos, viajes, lecturasBanda, lecturasExportacion, barco.metas_json, tipoOperacion]);

  const totalGlobal = totales.reduce((s, t) => s + t.total, 0);
  const metaGlobal = totales.reduce((s, t) => s + t.meta, 0);
  const faltanteGlobal = Math.max(0, metaGlobal - totalGlobal);
  const progresoGlobal = pct(totalGlobal, metaGlobal);

  const barData = totales.map((t) => ({
    name: t.producto.codigo,
    Banda: parseFloat(t.totalBanda.toFixed(2)),
    Camiones: parseFloat(t.totalCamiones.toFixed(2)),
    Exportacion: parseFloat(t.totalExportacion.toFixed(2)),
    fill: t.producto.color_accent,
  }));

  const pieData = totales
    .filter((t) => t.total > 0)
    .map((t) => ({ name: t.producto.nombre, value: parseFloat(t.total.toFixed(2)), color: t.producto.color_accent }));

  // CORREGIDO: Datos para el gráfico de evolución en exportación (suma de acumulados por bodega)
  const areaData = useMemo(() => {
    if (tipoOperacion === 'exportacion') {
      // Para exportación, necesitamos la suma de acumulados por bodega en cada punto
      const todasExportaciones = [...lecturasExportacion].sort(
        (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
      );
      
      // Crear mapa de acumulados por bodega en cada punto
      const puntosPorTiempo = new Map();
      
      todasExportaciones.forEach(exp => {
        const timestamp = dayjs.utc(exp.fecha_hora).unix();
        const horaStr = dayjs.utc(exp.fecha_hora).tz(ZONA_HORARIA_SV).format("HH:mm");
        
        if (!puntosPorTiempo.has(timestamp)) {
          puntosPorTiempo.set(timestamp, {
            hora: horaStr,
            timestamp,
            acumuladoPorBodega: new Map()
          });
        }
        
        const punto = puntosPorTiempo.get(timestamp);
        punto.acumuladoPorBodega.set(exp.bodega_id, exp.acumulado_tm || 0);
      });
      
      // Convertir a array y calcular suma
      const resultado = Array.from(puntosPorTiempo.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-20)
        .map(punto => {
          let suma = 0;
          punto.acumuladoPorBodega.forEach(val => { suma += val; });
          return {
            hora: punto.hora,
            acumulado: parseFloat(suma.toFixed(2))
          };
        });
      
      return resultado;
    } else {
      // Para importación, usar lecturas de banda directamente
      const sorted = [...lecturasBanda]
        .sort((a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix())
        .slice(-20);
      return sorted.map((l, i) => ({
        hora: dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("HH:mm"),
        acumulado: parseFloat(l.acumulado_tm.toFixed(2)),
      }));
    }
  }, [lecturasBanda, lecturasExportacion, tipoOperacion]);

  return (
    <div className="alm-general-grid">

      <div className="alm-kpis-row">
        <KpiCard label={`Total ${textoAccion}`} value={`${fmtTM(totalGlobal, 2)} TM`}
          sub={`${progresoGlobal.toFixed(1)}% de la cantidad manifestada`} icon="⚓" accent="#3b82f6" animate />
        <KpiCard label="Cantidad Manifestada Total" value={`${fmtTM(metaGlobal, 2)} TM`}
          sub={`${productos.length} productos`} icon="🎯" accent="#10b981" />
        <KpiCard label={textoFaltante} value={`${fmtTM(faltanteGlobal, 2)} TM`}
          sub="por procesar" icon="⏳" accent="#ef4444" />
        {tipoOperacion !== 'exportacion' && (
          <KpiCard label="Viajes Completos" value={viajes.filter(v => v.estado === 'completo').length}
            sub="camiones pesados" icon="🚛" accent="#f59e0b" />
        )}
        <KpiCard label="Lecturas" value={tipoOperacion === 'exportacion' ? lecturasExportacion.length : lecturasBanda.length}
          sub="registros totales" icon="📊" accent="#8b5cf6" />
      </div>

      <div className="alm-progress-hero">
        <div className="alm-progress-hero-header">
          <div>
            <h3 className="alm-section-title">Progreso Global de {tipoOperacion === 'exportacion' ? 'Carga' : 'Descarga'}</h3>
            <p className="alm-section-sub">{barco.nombre} · {barco.codigo_barco}</p>
          </div>
          <div className="alm-progress-pct">{progresoGlobal.toFixed(1)}%</div>
        </div>
        <div className="alm-progress-track-hero">
          <div className="alm-progress-fill-hero" style={{ width: `${Math.min(100, progresoGlobal)}%` }} />
        </div>
        <div className="alm-progress-labels">
          <span>0</span>
          <span>{fmtTM(metaGlobal * 0.25)} TM</span>
          <span>{fmtTM(metaGlobal * 0.5)} TM</span>
          <span>{fmtTM(metaGlobal * 0.75)} TM</span>
          <span>{fmtTM(metaGlobal)} TM</span>
        </div>

        {faltanteGlobal > 0 && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#ef4444' }}>
            ⏳ {textoFaltante}: <strong>{fmtTM(faltanteGlobal, 2)} TM</strong>
          </div>
        )}
      </div>

      {metaGlobal > 0 && faltanteGlobal > 0 && (
  <div style={{
    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
    borderRadius: '20px',
    padding: '24px 28px',
    marginBottom: '24px',
    border: '1px solid #3b82f6',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    width: '100%'
  }}>
    {/* Header centrado */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
    }}>
      <div style={{
        background: '#3b82f620',
        borderRadius: '50%',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '28px' }}>⏱️</span>
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', letterSpacing: '1.5px' }}>
          FINALIZACIÓN ESTIMADA
        </div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#60a5fa' }}>
          {((totalGlobal / metaGlobal) * 100).toFixed(1)}% completado
        </div>
      </div>
    </div>
    
    <FinalizacionGeneral
      metaGlobal={metaGlobal}
      totalGlobal={totalGlobal}
      viajes={viajes}
      lecturasBanda={lecturasBanda}
      lecturasExportacion={lecturasExportacion}
      tipoOperacion={tipoOperacion}
    />
  </div>
)}
      
      <div className="alm-charts-row">

        <div className="alm-chart-card">
          <h4 className="alm-chart-title">📦 Toneladas por Producto</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {tipoOperacion === 'exportacion' ? (
                <Bar dataKey="Exportacion" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              ) : (
                <>
                  <Bar dataKey="Banda" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Camiones" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="alm-chart-card">
          <h4 className="alm-chart-title">🥧 Distribución por Producto</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="alm-no-data">Sin datos disponibles</div>
          )}
        </div>

        <div className="alm-chart-card alm-chart-wide">
          <h4 className="alm-chart-title">
            {tipoOperacion === 'exportacion' ? '📈 Evolución de Carga (Suma por Bodega)' : '📈 Evolución Acumulado Banda'} (últimas lecturas)
          </h4>
          {areaData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="bandaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="acumulado" name={tipoOperacion === 'exportacion' ? "Total Cargado" : "Acumulado"}
                  stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#bandaGrad)" dot={{ r: 3, fill: "#3b82f6" }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="alm-no-data">Se necesitan al menos 2 lecturas para mostrar la evolución</div>
          )}
        </div>

      </div>

      <div className="alm-comparativa-section">
        <div className="alm-comparativa-header">
          <h3 className="alm-section-title">
            {tipoOperacion === 'exportacion' ? '📊 Resumen de Carga por Producto' : '⚖️ Comparativa Banda vs Viajes por Producto'}
          </h3>
          <p className="alm-section-sub">
            {tipoOperacion === 'exportacion' 
              ? 'Toneladas cargadas por producto (suma de todas las bodegas)' 
              : 'Distribución porcentual de toneladas por tipo de operación'}
          </p>
        </div>

        <div className="alm-comparativa-grid">
          {totales.map(({ producto, meta, totalCamiones, totalBanda, totalExportacion, total }) => {
            const color = producto.color_accent;

            if (tipoOperacion === 'exportacion' && totalExportacion === 0) return null;
            if (tipoOperacion !== 'exportacion' && producto.tipo_registro === 'banda') return null;

            return (
              <div key={producto.id} className="alm-comparativa-card" style={{ borderColor: color }}>
                <div className="alm-comparativa-card-header">
                  <div className="alm-comparativa-titulo">
                    <span className="alm-card-emoji">{producto.icono}</span>
                    <div>
                      <h4 className="alm-comparativa-nombre">{producto.nombre}</h4>
                      <span className="alm-comparativa-codigo">{producto.codigo}</span>
                    </div>
                  </div>
                  <div className="alm-comparativa-meta">
                    <span className="alm-comparativa-meta-label">Meta:</span>
                    <span className="alm-comparativa-meta-valor">{fmtTM(meta, 2)} TM</span>
                  </div>
                </div>

                <div className="alm-comparativa-bars">
                  {tipoOperacion === 'exportacion' ? (
                    <div className="alm-comparativa-bar-container">
                      <div className="alm-comparativa-bar-label">
                        <div className="alm-comparativa-label-left">
                          <span className="alm-comparativa-dot" style={{ background: color }} />
                          <span>Carga a Barco (Suma de bodegas)</span>
                        </div>
                        <span className="alm-comparativa-valor">{fmtTM(totalExportacion, 2)} TM</span>
                      </div>
                      <div className="alm-comparativa-track">
                        <div
                          className="alm-comparativa-fill"
                          style={{
                            width: `${meta > 0 ? (totalExportacion / meta) * 100 : 0}%`,
                            background: color
                          }}
                        />
                        <span className="alm-comparativa-pct">
                          {meta > 0 ? ((totalExportacion / meta) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="alm-comparativa-bar-container">
                        <div className="alm-comparativa-bar-label">
                          <div className="alm-comparativa-label-left">
                            <span className="alm-comparativa-dot banda-dot" />
                            <span>Banda</span>
                          </div>
                          <span className="alm-comparativa-valor">{fmtTM(totalBanda, 2)} TM</span>
                        </div>
                        <div className="alm-comparativa-track">
                          <div
                            className="alm-comparativa-fill banda-fill"
                            style={{
                              width: `${total > 0 ? (totalBanda / total) * 100 : 0}%`,
                              background: color
                            }}
                          />
                          <span className="alm-comparativa-pct">{total > 0 ? ((totalBanda / total) * 100).toFixed(1) : 0}%</span>
                        </div>
                      </div>

                      <div className="alm-comparativa-bar-container">
                        <div className="alm-comparativa-bar-label">
                          <div className="alm-comparativa-label-left">
                            <span className="alm-comparativa-dot viajes-dot" />
                            <span>Viajes</span>
                          </div>
                          <span className="alm-comparativa-valor">{fmtTM(totalCamiones, 2)} TM</span>
                        </div>
                        <div className="alm-comparativa-track">
                          <div
                            className="alm-comparativa-fill viajes-fill"
                            style={{
                              width: `${total > 0 ? (totalCamiones / total) * 100 : 0}%`,
                              background: '#10b981'
                            }}
                          />
                          <span className="alm-comparativa-pct">{total > 0 ? ((totalCamiones / total) * 100).toFixed(1) : 0}%</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="alm-comparativa-footer">
                  <div className="alm-comparativa-total">
                    <span className="alm-comparativa-total-label">Total:</span>
                    <span className="alm-comparativa-total-valor">{fmtTM(total, 2)} TM</span>
                  </div>
                  {tipoOperacion !== 'exportacion' && (
                    <div className="alm-comparativa-ratio" style={{ color }}>
                      {total > 0 ? ((totalBanda / total) * 100).toFixed(0) : 0}% Banda / {total > 0 ? ((totalCamiones / total) * 100).toFixed(0) : 0}% Viajes
                    </div>
                  )}
                </div>

                {meta > 0 && (
                  <div className="alm-comparativa-progreso">
                    <div className="alm-comparativa-progreso-label">
                      <span>Progreso vs Meta</span>
                      <span>{((total / meta) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="alm-comparativa-progreso-track">
                      <div
                        className="alm-comparativa-progreso-fill"
                        style={{
                          width: `${Math.min(100, (total / meta) * 100)}%`,
                          background: color
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="alm-table-card">
        <div className="alm-table-header">
          <h3 className="alm-section-title">Resumen por Producto</h3>
        </div>
        <div className="alm-table-scroll">
          <table className="alm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="alm-th-num">Cantidad Manifestada (TM)</th>
                {tipoOperacion === 'exportacion' ? (
                  <th className="alm-th-num alm-col-banda">Carga (TM)</th>
                ) : (
                  <>
                    <th className="alm-th-num alm-col-banda">Banda (TM)</th>
                    <th className="alm-th-num alm-col-cam">Camiones (TM)</th>
                  </>
                )}
                <th className="alm-th-num">Total (TM)</th>
                <th className="alm-th-num">Faltante (TM)</th>
                <th className="alm-th-num">Progreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {totales.map(({ producto, meta, totalCamiones, totalBanda, totalExportacion, total }) => {
                const faltante = Math.max(0, meta - total);
                const progreso = pct(total, meta);
                return (
                  <tr key={producto.id}>
                    <td>
                      <div className="alm-prod-cell">
                        <span className="alm-prod-emoji">{producto.icono}</span>
                        <div>
                          <p className="alm-prod-name">{producto.nombre}</p>
                          <p className="alm-prod-code">{producto.codigo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="alm-td-num">{meta > 0 ? fmtTM(meta) : "—"}</td>
                    {tipoOperacion === 'exportacion' ? (
                      <td className="alm-td-num" style={{ color: producto.color_accent }}>{fmtTM(totalExportacion)}</td>
                    ) : (
                      <>
                        <td className="alm-td-num alm-col-banda">{fmtTM(totalBanda)}</td>
                        <td className="alm-td-num" style={{ color: producto.color_accent }}>{fmtTM(totalCamiones)}</td>
                      </>
                    )}
                    <td className="alm-td-num alm-bold">{fmtTM(total)}</td>
                    <td className="alm-td-num" style={{ color: faltante > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                      {meta > 0 ? (faltante > 0 ? fmtTM(faltante) : '✓') : '—'}
                    </td>
                    <td className="alm-td-num">
                      <div className="alm-mini-progress">
                        <div className="alm-mini-track">
                          <div className="alm-mini-fill" style={{ width: `${Math.min(100, progreso)}%`, background: producto.color_accent }} />
                        </div>
                        <span className="alm-mini-pct">{progreso.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => onSelectProducto(producto.id)} className="alm-detail-btn">
                        Ver →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="alm-bold">TOTAL BARCO</td>
                <td className="alm-td-num alm-bold">{metaGlobal > 0 ? fmtTM(metaGlobal) : "—"}</td>
                {tipoOperacion === 'exportacion' ? (
                  <td className="alm-td-num alm-col-banda alm-bold">{fmtTM(totales.reduce((s, t) => s + t.totalExportacion, 0))}</td>
                ) : (
                  <>
                    <td className="alm-td-num alm-col-banda alm-bold">{fmtTM(totales.reduce((s, t) => s + t.totalBanda, 0))}</td>
                    <td className="alm-td-num alm-bold">{fmtTM(totales.reduce((s, t) => s + t.totalCamiones, 0))}</td>
                  </>
                )}
                <td className="alm-td-num alm-bold">{fmtTM(totalGlobal)}</td>
                <td className="alm-td-num alm-bold" style={{ color: faltanteGlobal > 0 ? '#ef4444' : '#10b981' }}>
                  {metaGlobal > 0 ? (faltanteGlobal > 0 ? fmtTM(faltanteGlobal) : '✓') : '—'}
                </td>
                <td className="alm-td-num alm-bold">{progresoGlobal.toFixed(1)}%</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: Tabla de Viajes PREMIUM
// ============================================================================
function TablaViajes({ viajes, producto }) {
  if (!viajes.length) {
    return (
      <div className="alm-empty">
        <span className="alm-empty-icon">🚛</span>
        <p>No hay viajes registrados para <strong>{producto.nombre}</strong></p>
      </div>
    );
  }

  const viajesCompletos = viajes.filter(v => v.estado === 'completo');

  return (
    <div className="alm-space-y">
      <div className="alm-table-card">
        <div className="alm-table-header">
          <h3 className="alm-section-title">
            🚛 Viajes — {producto.nombre}
            <span className="alm-badge">{viajesCompletos.length} completos / {viajes.length} totales</span>
          </h3>
        </div>
        <div className="alm-table-scroll alm-table-max">
          <table className="alm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Viaje #</th>
                <th>Fecha/Hora</th>
                <th>Placa</th>
                <th>Producto</th>
                <th className="alm-th-num">Neto UPDP (TM)</th>
                <th className="alm-th-num">Bruto UPDP (TM)</th>
                <th className="alm-th-num">Bruto Almapac (TM)</th>
                <th className="alm-th-num alm-amber">Destino (TM)</th>
                <th className="alm-th-num">Acumulado (TM)</th>
                <th>Destino</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {viajes.map((v, i) => (
                <tr key={v.id} className={i % 2 === 0 ? "" : "alm-tr-alt"}>
                  <td className="alm-mono" style={{ fontSize: '11px' }}>{v.id}</td>
                  <td className="alm-bold">{v.viaje_numero}</td>
                  <td className="alm-mono" style={{ fontSize: '11px' }}>
                    {v.fecha_hora ?
                      dayjs.utc(v.fecha_hora).tz(ZONA_HORARIA_SV).format("DD/MM/YY HH:mm") :
                      v.created_at ?
                        dayjs.utc(v.created_at).tz(ZONA_HORARIA_SV).format("DD/MM/YY HH:mm") : '—'}
                  </td>
                  <td className="alm-mono">{v.placa || '—'}</td>
                  <td>
                    {v.producto_id === producto.id ? (
                      <span style={{ color: producto.color_accent }}>{producto.codigo}</span>
                    ) : (
                      <span className="alm-muted">—</span>
                    )}
                  </td>
                  <td className="alm-td-num alm-green">{fmtTM(v.peso_neto_updp_tm)}</td>
                  <td className="alm-td-num">{fmtTM(v.peso_bruto_updp_tm)}</td>
                  <td className="alm-td-num">{fmtTM(v.peso_bruto_almapac_tm)}</td>
                  <td className="alm-td-num alm-amber alm-bold">{fmtTM(v.peso_destino_tm)}</td>
                  <td className="alm-td-num alm-teal">{fmtTM(v.total_acumulado_tm)}</td>
                  <td>{v.destino_nombre || '—'}</td>
                  <td>
                    <span className={`alm-status ${v.estado === "completo" ? "alm-status-ok" :
                        v.estado === "incompleto" ? "alm-status-pend" :
                          "alm-status-warn"
                      }`}>
                      {v.estado || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8} className="alm-bold">TOTALES (solo completos)</td>
                <td className="alm-td-num alm-amber alm-bold">
                  {fmtTM(viajesCompletos.reduce((s, v) => s + (v.peso_destino_tm || 0), 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: Tabla de Lecturas de Banda PREMIUM - CORREGIDO
// ============================================================================
function TablaBanda({ lecturas, producto }) {
  if (!lecturas.length) {
    return (
      <div className="alm-empty">
        <span className="alm-empty-icon">📊</span>
        <p>No hay lecturas de banda para <strong>{producto.nombre}</strong></p>
      </div>
    );
  }

  const calcularFlujoGeneral = () => {
    if (lecturas.length < 2) return 0;
    const lecturasOrdenadas = [...lecturas].sort(
      (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
    );
    const primeraLectura = lecturasOrdenadas[0];
    const ultimaLectura = lecturasOrdenadas[lecturasOrdenadas.length - 1];
    const horaPrimera = dayjs.utc(primeraLectura.fecha_hora);
    const horaUltima = dayjs.utc(ultimaLectura.fecha_hora);
    const horasTranscurridas = horaUltima.diff(horaPrimera, 'hour', true);
    if (horasTranscurridas <= 0) return 0;
    const acumuladoActual = ultimaLectura.acumulado_tm;
    return acumuladoActual / horasTranscurridas;
  };

  const areaData = [...lecturas]
    .sort((a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix())
    .slice(-20)
    .map((l) => ({
      hora: dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("HH:mm"),
      acumulado: parseFloat(l.acumulado_tm.toFixed(2)),
    }));

  return (
    <div className="alm-space-y">
      {areaData.length > 1 && (
        <div className="alm-table-card">
          <div className="alm-table-header">
            <h4 className="alm-chart-title">📈 Evolución Acumulado Banda</h4>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={producto.color_accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={producto.color_accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="acumulado" name="Acumulado"
                  stroke={producto.color_accent} strokeWidth={2.5}
                  fill="url(#areaGrad2)" dot={{ r: 3, fill: producto.color_accent }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="alm-table-card">
        <div className="alm-table-header">
          <h3 className="alm-section-title">
            📊 Lecturas de Banda — {producto.nombre}
            <span className="alm-badge">{lecturas.length} lecturas</span>
          </h3>
          {lecturas.length >= 2 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              Flujo promedio: <strong style={{ color: producto.color_accent }}>{fmtTM(calcularFlujoGeneral(), 2)} TM/h</strong>
            </div>
          )}
        </div>
        <div className="alm-table-scroll alm-table-max">
          <table className="alm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha / Hora</th>
                <th className="alm-th-num">Acumulado (TM)</th>
                <th className="alm-th-num">Flujo (TM/h)</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {lecturas.map((l, i) => {
                const fechaHoraSV = dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV);
                return (
                  <tr key={l.id} className={i === 0 ? "alm-tr-latest" : i % 2 === 0 ? "" : "alm-tr-alt"}>
                    <td className="alm-muted">{i + 1}</td>
                    <td>
                      {fechaHoraSV.format("DD/MM/YY HH:mm")}
                      {i === 0 && <span className="alm-badge-blue">ÚLTIMO</span>}
                    </td>
                    <td className="alm-td-num alm-bold" style={{ color: producto.color_accent }}>
                      {fmtTM(l.acumulado_tm)}
                    </td>
                    <td className="alm-td-num" style={{ color: l.flujo_calculado > 0 ? '#10b981' : '#94a3b8' }}>
                      {l.flujo_calculado > 0 ? fmtTM(l.flujo_calculado, 2) : '—'}
                    </td>
                    <td>{l.destino_nombre}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE: Tabla de Exportaciones - CORREGIDA (muestra flujo y acumulado correcto)
// ============================================================================
function TablaExportacion({ lecturas, producto }) {
  if (!lecturas.length) {
    return (
      <div className="alm-empty">
        <span className="alm-empty-icon">📦</span>
        <p>No hay registros de carga para <strong>{producto.nombre}</strong></p>
      </div>
    );
  }

  const BODEGAS = [
    { id: 1, nombre: 'Bodega 1', codigo: 'BDG-01' },
    { id: 2, nombre: 'Bodega 2', codigo: 'BDG-02' },
    { id: 3, nombre: 'Bodega 3', codigo: 'BDG-03' },
    { id: 4, nombre: 'Bodega 4', codigo: 'BDG-04' },
    { id: 5, nombre: 'Bodega 5', codigo: 'BDG-05' },
    { id: 6, nombre: 'Bodega 6', codigo: 'BDG-06' },
    { id: 7, nombre: 'Bodega 7', codigo: 'BDG-07' },
    { id: 8, nombre: 'Bodega 8', codigo: 'BDG-08' },
  ];

  const calcularFlujoGeneral = () => {
    if (lecturas.length < 2) return 0;
    const lecturasOrdenadas = [...lecturas].sort(
      (a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix()
    );
    
    // Agrupar por bodega para calcular flujo por bodega
    const lecturasPorBodega = new Map();
    lecturasOrdenadas.forEach(l => {
      if (!lecturasPorBodega.has(l.bodega_id)) {
        lecturasPorBodega.set(l.bodega_id, []);
      }
      lecturasPorBodega.get(l.bodega_id).push(l);
    });
    
    let totalToneladas = 0;
    let totalHoras = 0;
    
    lecturasPorBodega.forEach(lecturasBodega => {
      if (lecturasBodega.length >= 2) {
        const primera = lecturasBodega[0];
        const ultima = lecturasBodega[lecturasBodega.length - 1];
        const diferencia = ultima.acumulado_tm - primera.acumulado_tm;
        if (diferencia > 0) {
          const horas = dayjs.utc(ultima.fecha_hora).diff(dayjs.utc(primera.fecha_hora), 'hour', true);
          if (horas > 0) {
            totalToneladas += diferencia;
            totalHoras += horas;
          }
        }
      }
    });
    
    return totalHoras > 0 ? totalToneladas / totalHoras : 0;
  };

  // Datos para el gráfico de FLUJO (usando flujo_calculado)
  const lineData = useMemo(() => {
    const lecturasOrdenadas = [...lecturas]
      .sort((a, b) => dayjs.utc(a.fecha_hora).unix() - dayjs.utc(b.fecha_hora).unix())
      .slice(-20);
    
    return lecturasOrdenadas.map((l) => ({
      hora: dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV).format("HH:mm"),
      flujo: l.flujo_calculado || 0
    }));
  }, [lecturas]);

  const CustomFlujoTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="alm-tooltip">
        <p className="alm-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="alm-tooltip-value">
            Flujo: <strong>{fmtTM(p.value, 2)} TM/h</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="alm-space-y">
      {lineData.length > 1 && (
        <div className="alm-table-card">
          <div className="alm-table-header">
            <h4 className="alm-chart-title">📈 Tendencia de Flujo de Carga (TM/h)</h4>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#94a3b8" }} 
                  label={{ value: 'TM/h', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                />
                <Tooltip content={<CustomFlujoTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="flujo" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                  name="Flujo (TM/h)"
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginTop: '8px',
              fontSize: '10px',
              color: '#64748b'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '20px', height: '3px', background: '#ef4444', borderRadius: '3px' }}></span>
                Tendencia de Flujo
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="alm-table-card">
        <div className="alm-table-header">
          <h3 className="alm-section-title">
            📦 Registros de Carga — {producto.nombre}
            <span className="alm-badge">{lecturas.length} registros</span>
          </h3>
          {lecturas.length >= 2 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
              Flujo promedio: <strong style={{ color: producto.color_accent }}>{fmtTM(calcularFlujoGeneral(), 2)} TM/h</strong>
            </div>
          )}
        </div>
        <div className="alm-table-scroll alm-table-max">
          <table className="alm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha / Hora</th>
                <th className="alm-th-num">Acumulado Bodega (TM)</th>
                <th className="alm-th-num">Flujo (TM/h)</th>
                <th>Bodega</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {lecturas.map((l, i) => {
                const bodega = BODEGAS.find(b => b.id === l.bodega_id);
                const fechaHoraSV = dayjs.utc(l.fecha_hora).tz(ZONA_HORARIA_SV);
                
                return (
                  <tr key={l.id} className={i === 0 ? "alm-tr-latest" : i % 2 === 0 ? "" : "alm-tr-alt"}>
                    <td className="alm-muted">{i + 1}</td>
                    <td>
                      {fechaHoraSV.format("DD/MM/YY HH:mm")}
                      {i === 0 && <span className="alm-badge-blue">ÚLTIMO</span>}
                    </td>
                    <td className="alm-td-num alm-bold" style={{ color: producto.color_accent }}>
                      {fmtTM(l.acumulado_tm)}
                    </td>
                    <td className="alm-td-num" style={{ color: l.flujo_calculado > 0 ? '#10b981' : '#94a3b8' }}>
                      {l.flujo_calculado > 0 ? (
                        <span style={{ fontWeight: 600 }}>
                          {fmtTM(l.flujo_calculado, 2)} TM/h
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {bodega ? (
                        <div>
                          <span className="font-medium text-white">{bodega.nombre}</span>
                          <span className="text-xs text-green-400 ml-2">{bodega.codigo}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="text-slate-400">{l.observaciones || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function DashboardCompartido({ codigoBarco }) {
  const [productoSeleccionado, setProductoSeleccionado] = useState("general");
  const { barco, productos, viajes, lecturasBanda, lecturasExportacion, loading, error, lastUpdate, refetch } = useBarcoData(codigoBarco);

  console.log("📊 Dashboard - datos cargados:", {
    barco: barco?.codigo_barco,
    tipo: barco?.tipo_operacion,
    productos: productos.length,
    viajes: viajes.length,
    lecturasBanda: lecturasBanda.length,
    lecturasExportacion: lecturasExportacion.length,
    productoSeleccionado: productoSeleccionado === "general" ? "Vista General" : "Producto específico"
  });

  const viajesFiltrados = useMemo(() => {
    if (productoSeleccionado === "general") return [];
    return viajes.filter((v) => v.producto_id === productoSeleccionado);
  }, [viajes, productoSeleccionado]);

  const lecturasFiltradas = useMemo(() => {
    if (productoSeleccionado === "general") return [];
    return lecturasBanda.filter((l) => l.producto_id === productoSeleccionado);
  }, [lecturasBanda, productoSeleccionado]);

  const exportacionesFiltradas = useMemo(() => {
    if (productoSeleccionado === "general") return [];
    return lecturasExportacion.filter((e) => e.producto_id === productoSeleccionado);
  }, [lecturasExportacion, productoSeleccionado]);

  // CORREGIDO: Calcular total global para cada producto usando SUMA de acumulados por bodega
  const totalGlobalPorProducto = useMemo(() => {
    const mapa = new Map();
    productos.forEach(producto => {
      const exportacionesProducto = lecturasExportacion.filter(e => e.producto_id === producto.id);
      const ultimoAcumuladoPorBodega = new Map();
      exportacionesProducto.forEach(exp => {
        const bodegaId = exp.bodega_id;
        const acumulado = exp.acumulado_tm || 0;
        const existing = ultimoAcumuladoPorBodega.get(bodegaId);
        if (!existing || new Date(exp.fecha_hora) > new Date(existing.fecha_hora)) {
          ultimoAcumuladoPorBodega.set(bodegaId, acumulado);
        }
      });
      let total = 0;
      ultimoAcumuladoPorBodega.forEach(val => { total += val; });
      mapa.set(producto.id, total);
    });
    return mapa;
  }, [productos, lecturasExportacion]);

  const totalesPorProducto = useMemo(() => {
    const mapa = new Map();
    productos.forEach((producto) => {
      const vp = viajes.filter((v) => v.producto_id === producto.id && v.estado === 'completo');
      const lp = lecturasBanda
        .filter((l) => l.producto_id === producto.id)
        .sort((a, b) => dayjs.utc(b.fecha_hora).unix() - dayjs.utc(a.fecha_hora).unix());
      
      const totalCamiones = vp.reduce((s, v) => s + (v.peso_destino_tm || 0), 0);
      const totalBanda = lp.length > 0 ? lp[0]?.acumulado_tm || 0 : 0;
      const totalExportacion = totalGlobalPorProducto.get(producto.id) || 0;
      
      mapa.set(producto.id, { totalCamiones, totalBanda, totalExportacion });
    });
    return mapa;
  }, [productos, viajes, lecturasBanda, totalGlobalPorProducto]);

  if (loading && !barco) {
    return (
      <div className="alm-splash">
        <img src="/logo.png" alt="ALMAPAC" className="alm-splash-logo" />
        <div className="alm-splash-ship">🚢</div>
        <p className="alm-splash-text">Cargando barco {codigoBarco}…</p>
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

  if (!barco) return null;

  const productoActivo = productos.find((p) => p.id === productoSeleccionado);
  const tipoOperacion = barco.tipo_operacion || 'importacion';

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

        /* ── TOPBAR RESPONSIVE ── */
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

        .alm-status-text {
          display: inline;
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

        .alm-refresh-icon {
          font-size: 12px;
        }

        .alm-refresh-text {
          display: inline;
        }

        @media (min-width: 768px) {
          .alm-topbar {
            padding: 0 24px;
          }
          
          .alm-topbar-left {
            gap: 16px;
          }
          
          .alm-logo {
            height: 36px;
          }
          
          .alm-ship-name {
            font-size: 15px;
          }
          
          .alm-ship-code {
            font-size: 11px;
          }
          
          .alm-topbar-right {
            gap: 12px;
          }
          
          .alm-update-container {
            display: block;
          }
          
          .alm-update-time {
            font-size: 11px;
            color: rgba(255,255,255,.4);
            font-family: 'DM Mono', monospace;
            white-space: nowrap;
          }
        }

        @media (min-width: 1024px) {
          .alm-topbar {
            padding: 0 32px;
          }
          
          .alm-topbar-left {
            gap: 20px;
          }
          
          .alm-logo {
            height: 38px;
          }
          
          .alm-topbar-right {
            gap: 14px;
          }
          
          .alm-status-pill {
            padding: 4px 12px;
          }
          
          .alm-refresh-btn {
            padding: 7px 14px;
          }
        }

        @media (max-width: 480px) {
          .alm-status-text {
            display: none;
          }
          
          .alm-status-pill {
            padding: 4px 8px;
          }
          
          .alm-refresh-text {
            display: none;
          }
          
          .alm-refresh-btn {
            padding: 8px;
            font-size: 16px;
          }
          
          .alm-refresh-icon {
            font-size: 16px;
          }
          
          .alm-update-container {
            display: none;
          }
          
          .alm-ship-name {
            font-size: 13px;
          }
          
          .alm-ship-code {
            font-size: 9px;
          }
        }

        @media (max-width: 360px) {
          .alm-divider {
            display: none;
          }
          
          .alm-logo {
            height: 28px;
          }
          
          .alm-ship-name {
            max-width: 120px;
          }
        }

        /* ── BODY ── */
        .alm-body {
          max-width: 1400px;
          margin: 0 auto;
          padding: 28px 24px 48px;
        }

        /* ── NAV TABS ── */
        .alm-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 6px;
          box-shadow: var(--shadow);
          margin-bottom: 24px;
        }
        .alm-nav-btn {
          flex: 1;
          min-width: 120px;
          padding: 10px 16px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s;
          border: none;
          background: transparent;
          color: var(--text-2);
          font-family: 'Sora', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .alm-nav-btn:hover {
          background: var(--bg);
          color: var(--text);
        }
        .alm-nav-btn.active {
          background: var(--navy);
          color: #fff;
          box-shadow: 0 2px 8px rgba(15,23,42,.2);
        }
        .alm-nav-pct {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(255,255,255,.2);
        }

        /* ── TARJETAS DE PRODUCTO ── */
        .alm-cards-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .alm-card-producto {
          flex: 1;
          min-width: 210px;
          max-width: 280px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition: all .25s;
          box-shadow: var(--shadow);
          font-family: 'Sora', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .alm-card-producto::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--color);
          opacity: 0;
          transition: opacity .25s;
        }
        .alm-card-producto:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--color);
        }
        .alm-card-activo {
          border-color: var(--color) !important;
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color) 15%, transparent), var(--shadow-md) !important;
        }
        .alm-card-activo::before { opacity: 1; }
        .alm-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .alm-card-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--color) 12%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .alm-card-emoji { font-size: 26px; }
        .alm-card-code {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-3);
          font-family: 'DM Mono', monospace;
          display: block;
          margin-bottom: 3px;
        }
        .alm-card-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.3;
          margin-bottom: 2px;
        }
        .alm-card-meta {
          font-size: 11px;
          color: var(--text-3);
          margin-bottom: 4px;
        }
        .alm-card-faltante {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .alm-card-track {
          height: 5px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .alm-card-fill {
          height: 100%;
          background: var(--color);
          border-radius: 999px;
          transition: width 1s ease;
        }
        .alm-card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .alm-stat {
          background: #f8fafc;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .alm-stat-total {
          grid-column: 1 / -1;
          background: color-mix(in srgb, var(--color) 8%, transparent);
          border: 1px solid color-mix(in srgb, var(--color) 20%, transparent);
        }
        .alm-stat-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .alm-dot-banda { background: #3b82f6; }
        .alm-dot-cam { background: #10b981; }
        .alm-stat-label {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-3);
          letter-spacing: .8px;
          margin-bottom: 2px;
        }
        .alm-stat-val {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-2);
          font-family: 'DM Mono', monospace;
        }
        .alm-stat-bold { color: var(--text) !important; font-size: 13px !important; }

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

        /* ── PROGRESS HERO ── */
        .alm-progress-hero {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
          box-shadow: var(--shadow);
          margin-bottom: 20px;
        }
        .alm-progress-hero-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .alm-progress-pct {
          font-size: 42px;
          font-weight: 900;
          color: var(--navy);
          font-family: 'DM Mono', monospace;
          line-height: 1;
        }
        .alm-progress-track-hero {
          height: 14px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .alm-progress-fill-hero {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
          border-radius: 999px;
          transition: width 1s ease;
          position: relative;
        }
        .alm-progress-fill-hero::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 6px; height: 100%;
          background: rgba(255,255,255,.5);
          border-radius: 999px;
        }
        .alm-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-3);
          font-family: 'DM Mono', monospace;
        }

        /* ── CHARTS ── */
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
        }

        /* ── GAUGE ── */
        .alm-gauge { display: block; }

        /* ── GENERAL GRID ── */
        .alm-general-grid { display: flex; flex-direction: column; gap: 0; }

        /* ── TABLE ── */
        .alm-table-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        .alm-table-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: #f8fafc;
        }
        .alm-table-scroll { overflow-x: auto; }
        .alm-table-max { max-height: 400px; overflow-y: auto; }
        .alm-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
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
        .alm-table tfoot {
          background: #f8fafc;
          border-top: 2px solid var(--border);
          position: sticky;
          bottom: 0;
        }
        .alm-table tfoot td { color: var(--text); }
        .alm-th-num, .alm-td-num { text-align: right; }
        .alm-col-banda { color: var(--blue); }
        .alm-col-cam { color: var(--amber); }
        .alm-tr-alt { background: #f8fafc; }
        .alm-tr-latest { background: #eff6ff !important; }
        .alm-bold { font-weight: 700; color: var(--text) !important; }
        .alm-green { color: var(--green) !important; }
        .alm-amber { color: var(--amber) !important; }
        .alm-teal { color: var(--teal) !important; }
        .alm-muted { color: var(--text-3); }
        .alm-mono { font-family: 'DM Mono', monospace; }

        /* ── BADGES ── */
        .alm-badge {
          margin-left: 10px;
          font-size: 11px;
          font-weight: 600;
          background: #e2e8f0;
          color: var(--text-2);
          padding: 2px 9px;
          border-radius: 999px;
        }
        .alm-badge-blue {
          margin-left: 8px;
          font-size: 9px;
          font-weight: 700;
          background: #dbeafe;
          color: #1d4ed8;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        /* ── STATUS ── */
        .alm-status {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
          text-transform: capitalize;
          letter-spacing: .3px;
        }
        .alm-status-ok { background: #dcfce7; color: #166534; }
        .alm-status-pend { background: #fef9c3; color: #854d0e; }
        .alm-status-warn { background: #fee2e2; color: #991b1b; }

        /* ── MINI PROGRESS ── */
        .alm-mini-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-end;
        }
        .alm-mini-track {
          width: 60px;
          height: 5px;
          background: #f1f5f9;
          border-radius: 999px;
          overflow: hidden;
        }
        .alm-mini-fill {
          height: 100%;
          border-radius: 999px;
          transition: width .8s ease;
        }
        .alm-mini-pct {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-2);
          font-family: 'DM Mono', monospace;
          min-width: 38px;
          text-align: right;
        }

        /* ── PRODUCT CELLS ── */
        .alm-prod-cell { display: flex; align-items: center; gap: 10px; }
        .alm-prod-emoji { font-size: 22px; }
        .alm-prod-name { font-weight: 700; font-size: 13px; color: var(--text); }
        .alm-prod-code { font-size: 10px; color: var(--text-3); font-family: 'DM Mono', monospace; }

        /* ── DETAIL BTN ── */
        .alm-detail-btn {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-2);
          transition: background .15s;
          font-family: 'Sora', sans-serif;
        }
        .alm-detail-btn:hover { background: #e2e8f0; color: var(--text); }

        /* ── SECTION TITLES ── */
        .alm-section-title {
          font-size: 15px;
          font-weight: 800;
          color: var(--text);
        }
        .alm-section-sub {
          font-size: 12px;
          color: var(--text-3);
          margin-top: 2px;
        }

        /* ── PRODUCTO HEADER ── */
        .alm-prod-header {
          border-radius: var(--radius);
          padding: 20px 24px;
          color: #fff;
          box-shadow: var(--shadow-md);
          margin-bottom: 20px;
        }
        .alm-prod-header h2 {
          font-size: 22px;
          font-weight: 900;
          margin-bottom: 4px;
        }
        .alm-prod-header p {
          font-size: 12px;
          opacity: .75;
        }

        /* ── SPACE Y ── */
        .alm-space-y { display: flex; flex-direction: column; gap: 20px; }

        /* ── EMPTY ── */
        .alm-empty {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 48px 24px;
          text-align: center;
          color: var(--text-3);
          font-size: 14px;
        }
        .alm-empty-icon { font-size: 36px; display: block; margin-bottom: 12px; }

        /* ── FOOTER ── */
        .alm-footer {
          text-align: center;
          padding: 24px;
          font-size: 11px;
          color: var(--text-3);
          font-family: 'DM Mono', monospace;
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
          border-top-color: #3b82f6;
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

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .alm-topbar { padding: 0 16px; }
          .alm-body { padding: 16px 12px 40px; }
          .alm-charts-row { grid-template-columns: 1fr; }
          .alm-chart-wide { grid-column: auto; }
          .alm-progress-pct { font-size: 28px; }
        }

        /* ===== ESTILOS PARA PANELES DE PREDICCIONES ===== */
        .alm-predicciones-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: var(--shadow);
        }
        
        .alm-predicciones-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .alm-predicciones-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          font-size: 12px;
          background: white;
          font-family: 'Sora', sans-serif;
        }
        
        .alm-predicciones-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
        }
        
        @media (max-width: 768px) {
          .alm-predicciones-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .alm-pred-metricas {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .alm-pred-metrica {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          background: #f8fafc;
          position: relative;
        }
        
        .alm-pred-destacada {
          background: linear-gradient(135deg, #f8fafc, white);
          border-width: 2px;
        }
        
        .alm-pred-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #333333;
          display: block;
          margin-bottom: 4px;
        }
        
        .alm-pred-valor {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          font-family: 'DM Mono', monospace;
        }
        
        .alm-pred-valor-grande {
          font-size: 24px;
          font-weight: 900;
          color: var(--text);
          font-family: 'DM Mono', monospace;
          display: block;
          line-height: 1.2;
        }
        
        .alm-pred-sub {
          font-size: 11px;
          color: var(--text-3);
          display: block;
          margin-top: 4px;
        }
        
        .alm-pred-trend {
          position: absolute;
          top: 14px;
          right: 14px;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
        }
        
        .alm-pred-trend.up {
          background: #dcfce7;
          color: #166534;
        }
        
        .alm-pred-trend.down {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .alm-pred-confianza {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .alm-confianza-indicador {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        .conf-alta { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.2); }
        .conf-media { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
        .conf-baja { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.2); }
        
        .alm-confianza-texto {
          font-size: 12px;
          font-weight: 600;
        }
        
        .alm-pred-grafico {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
        }
        
        .alm-pred-leyenda {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 10px;
          color: var(--text-3);
        }
        
        .alm-leyenda-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .alm-leyenda-color {
          width: 12px;
          height: 3px;
          border-radius: 3px;
        }
        
        .alm-recomendaciones {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }
        
        .alm-recomendaciones-titulo {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--text);
        }
        
        .alm-recomendaciones-lista {
          list-style: none;
          padding: 0;
        }
        
        .alm-recomendacion {
          font-size: 12px;
          padding: 8px 12px;
          margin-bottom: 6px;
          border-radius: 8px;
          background: #f8fafc;
          border-left: 3px solid transparent;
        }
        
        .alm-recomendacion.warning {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        
        .alm-recomendacion.success {
          border-left-color: #10b981;
          background: #f0fdf4;
        }
        
        .alm-recomendacion.info {
          border-left-color: #3b82f6;
          background: #eff6ff;
        }

        
.alm-comparativa-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.alm-comparativa-header {
  margin-bottom: 20px;
}

.alm-comparativa-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.alm-comparativa-card {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  transition: all 0.2s ease;
}

.alm-comparativa-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color);
}

.alm-comparativa-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.alm-comparativa-titulo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.alm-comparativa-nombre {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}

.alm-comparativa-codigo {
  font-size: 11px;
  color: var(--text-3);
  font-family: 'DM Mono', monospace;
}

.alm-comparativa-meta {
  text-align: right;
}

.alm-comparativa-meta-label {
  font-size: 10px;
  color: var(--text-3);
  display: block;
}

.alm-comparativa-meta-valor {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  font-family: 'DM Mono', monospace;
}

.alm-comparativa-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.alm-comparativa-bar-container {
  width: 100%;
}

.alm-comparativa-bar-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 11px;
}

.alm-comparativa-label-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alm-comparativa-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.banda-dot {
  background: #3b82f6;
}

.viajes-dot {
  background: #10b981;
}

.alm-comparativa-valor {
  font-weight: 600;
  color: var(--text-2);
  font-family: 'DM Mono', monospace;
}

.alm-comparativa-track {
  height: 20px;
  background: #e2e8f0;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.alm-comparativa-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
}

.banda-fill {
  background: #3b82f6;
}

.viajes-fill {
  background: #10b981;
}

.alm-comparativa-pct {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  z-index: 1;
}

.alm-comparativa-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.alm-comparativa-total {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.alm-comparativa-total-label {
  font-size: 11px;
  color: var(--text-3);
}

.alm-comparativa-total-valor {
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
  font-family: 'DM Mono', monospace;
}

.alm-comparativa-ratio {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  background: white;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.alm-comparativa-progreso {
  margin-top: 12px;
}

.alm-comparativa-progreso-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-3);
  margin-bottom: 4px;
}

.alm-comparativa-progreso-track {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.alm-comparativa-progreso-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

@media (max-width: 768px) {
  .alm-comparativa-grid {
    grid-template-columns: 1fr;
  }
  
  .alm-comparativa-card-header {
    flex-direction: column;
    gap: 8px;
  }
  
  .alm-comparativa-meta {
    text-align: left;
  }
}

.alm-table {
  min-width: 1400px;
}

.alm-table th {
  white-space: nowrap;
  padding: 11px 12px;
}

.alm-table td {
  white-space: nowrap;
  padding: 11px 12px;
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
              <span className="alm-status-text">{barco.estado}</span>
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

          <nav className="alm-nav">
            <button
              onClick={() => setProductoSeleccionado("general")}
              className={`alm-nav-btn ${productoSeleccionado === "general" ? "active" : ""}`}
            >
              🌐 Vista General
            </button>

            {productos.map((producto) => {
              const totales = totalesPorProducto.get(producto.id) || { totalCamiones: 0, totalBanda: 0, totalExportacion: 0 };
              const meta = getMetaProducto(barco.metas_json, producto);
              const progreso = pct(totales.totalCamiones + totales.totalBanda + totales.totalExportacion, meta);
              const activo = productoSeleccionado === producto.id;

              return (
                <button
                  key={producto.id}
                  onClick={() => setProductoSeleccionado(producto.id)}
                  className={`alm-nav-btn ${activo ? "active" : ""}`}
                  style={activo ? { background: producto.color_accent } : {}}
                >
                  <span>{producto.icono}</span>
                  <span className="hidden sm:inline">{producto.nombre}</span>
                  <span className="alm-nav-pct">{meta > 0 ? `${progreso.toFixed(0)}%` : "—"}</span>
                </button>
              );
            })}
          </nav>

          {productos.length > 0 ? (
            <div className="alm-cards-row">
              {productos.map((producto) => {
                const totales = totalesPorProducto.get(producto.id) || { totalCamiones: 0, totalBanda: 0, totalExportacion: 0 };
                const meta = getMetaProducto(barco.metas_json, producto);
                return (
                  <TarjetaProducto
                    key={producto.id}
                    producto={producto}
                    meta={meta}
                    totalCamiones={totales.totalCamiones}
                    totalBanda={totales.totalBanda}
                    totalExportacion={totales.totalExportacion}
                    activo={productoSeleccionado === producto.id}
                    onClick={() => setProductoSeleccionado(producto.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="alm-empty" style={{ marginBottom: 20 }}>
              ⚠️ No se encontraron productos activos asociados a este barco
            </div>
          )}

          {productoSeleccionado === "general" ? (
            <>
              {/* SOLO PARA EXPORTACIÓN: MOSTRAR RESUMEN DE PAROS */}
              {barco.tipo_operacion === 'exportacion' && (
                <ResumenParosDashboard barcoId={barco.id} />
              )}
              <VistaGeneral
                barco={barco}
                productos={productos}
                viajes={viajes}
                lecturasBanda={lecturasBanda}
                lecturasExportacion={lecturasExportacion}
                onSelectProducto={(id) => setProductoSeleccionado(id)}
              />
            </>
          ) : productoActivo ? (
            <div className="alm-space-y">
              <div
                className="alm-prod-header"
                style={{ background: `linear-gradient(135deg, ${productoActivo.color_accent}, ${productoActivo.color_accent}cc)` }}
              >
                <h2>{productoActivo.icono} {productoActivo.nombre}</h2>
                <p>
                  Código: {productoActivo.codigo} · Tipo: {
                    productoActivo.tipo_registro === 'banda' ? '⚡ Solo Banda' : 
                    productoActivo.tipo_registro === 'camiones' ? '🚛 Solo Camiones' : 
                    '📊 Mixto (Banda + Camiones)'
                  } · Operación: {tipoOperacion === 'exportacion' ? 'EXPORTACIÓN (Carga)' : 'IMPORTACIÓN (Descarga)'}
                </p>
              </div>

              {tipoOperacion === 'exportacion' ? (
                <>
                  <PanelPrediccionesExportacion
                    producto={productoActivo}
                    lecturas={exportacionesFiltradas}
                    meta={getMetaProducto(barco.metas_json, productoActivo)}
                    tipoOperacion={tipoOperacion}
                    totalGlobal={totalGlobalPorProducto.get(productoActivo.id) || 0}
                  />
                  
                  <TablaExportacion lecturas={exportacionesFiltradas} producto={productoActivo} />
                </>
              ) : (
                <>
                  <PanelPrediccionesBanda
                    producto={productoActivo}
                    lecturas={lecturasFiltradas}
                    viajes={viajesFiltrados}
                    meta={getMetaProducto(barco.metas_json, productoActivo)}
                    tipoOperacion={tipoOperacion}
                  />

                  {productoActivo.tipo_registro !== 'banda' && (
                    <PanelPrediccionesViajes
                      producto={productoActivo}
                      viajes={viajesFiltrados}
                      meta={getMetaProducto(barco.metas_json, productoActivo)}
                      tipoOperacion={tipoOperacion}
                    />
                  )}

                  {productoActivo.tipo_registro !== 'banda' && (
                    <TablaViajes viajes={viajesFiltrados} producto={productoActivo} />
                  )}

                  <TablaBanda lecturas={lecturasFiltradas} producto={productoActivo} />

                  {productoActivo.tipo_registro === 'banda' && (
                    <div className="alm-info-box" style={{
                      background: '#1e293b',
                      border: '1px solid #3b82f6',
                      borderRadius: '12px',
                      padding: '16px',
                      marginTop: '12px',
                      color: '#94a3b8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>⚡</span>
                        <div>
                          <p style={{ fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                            Producto exclusivo de banda transportadora
                          </p>
                          <p style={{ fontSize: '13px' }}>
                            Este producto se registra únicamente a través de lecturas de banda. 
                            No se utilizan viajes de camiones para su control.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}

          <div className="alm-footer">
            🔄 auto-refresh 30s &nbsp;·&nbsp; {barco.nombre} ({barco.codigo_barco}) &nbsp;·&nbsp; ALMAPAC &nbsp;·&nbsp; {productos.length} productos
          </div>
        </div>
      </div>
    </>
  );
}