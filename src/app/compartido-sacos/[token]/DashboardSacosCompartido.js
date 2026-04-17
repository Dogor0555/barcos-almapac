// app/compartido-sacos/[token]/DashboardSacosCompleto.js
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend
} from "recharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { RefreshCw, Calendar, Clock, TrendingUp, Filter, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

const ZONA_HORARIA_SV = "America/El_Salvador";
dayjs.locale("es");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Faltan variables de entorno de Supabase");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const COLORES = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

// ============================================================================
// HELPER: color por tipo de paro
// ============================================================================
function getTipoColor(nombre = '') {
  const n = nombre.toLowerCase();
  if (n.includes('desperfecto') || n.includes('grua'))  return '#ef4444';
  if (n.includes('almeja') || n.includes('updp'))        return '#f97316';
  if (n.includes('camion'))                              return '#f59e0b';
  if (n.includes('traslado'))                            return '#3b82f6';
  if (n.includes('falla') || n.includes('sistema'))      return '#8b5cf6';
  if (n.includes('comida'))                              return '#10b981';
  if (n.includes('cierre') || n.includes('bodega'))      return '#6b7280';
  if (n.includes('lluvia'))                              return '#6366f1';
  return '#94a3b8';
}

// ============================================================================
// HELPER: Fusionar intervalos para evitar doble conteo
// ============================================================================
function mergeIntervalos(intervalos) {
  if (!intervalos.length) return 0;
  intervalos.sort((a, b) => a[0] - b[0]);
  const merged = [];
  let current = intervalos[0];
  for (let i = 1; i < intervalos.length; i++) {
    const next = intervalos[i];
    if (next[0] <= current[1]) {
      current[1] = Math.max(current[1], next[1]);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged.reduce((sum, [ini, fin]) => sum + (fin - ini), 0);
}

function calcularMinutosReales(registros) {
  if (!registros || registros.length === 0) return 0;
  const porFecha = {};
  registros.forEach(reg => {
    if (!reg.hora_inicio || !reg.duracion_minutos) return;
    const fecha = reg.fecha;
    if (!porFecha[fecha]) porFecha[fecha] = [];
    const [hh, mm] = reg.hora_inicio.split(':').map(Number);
    const inicio = hh * 60 + mm;
    const fin = inicio + (reg.duracion_minutos || 0);
    porFecha[fecha].push([inicio, fin]);
  });
  return Object.values(porFecha).reduce((total, intervalos) => {
    return total + mergeIntervalos(intervalos);
  }, 0);
}

function calcularMinutosRealesPorImputabilidad(registros, tiposParo) {
  if (!registros || registros.length === 0) {
    return { imputables: 0, noImputables: 0 };
  }
  const porFechaImp = {};
  const porFechaNoImp = {};
  registros.forEach(reg => {
    if (!reg.hora_inicio || !reg.duracion_minutos) return;
    const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id);
    const fecha = reg.fecha;
    const [hh, mm] = reg.hora_inicio.split(':').map(Number);
    const inicio = hh * 60 + mm;
    const fin = inicio + (reg.duracion_minutos || 0);
    const intervalo = [inicio, fin];
    if (tipo?.es_imputable_almapac) {
      if (!porFechaImp[fecha]) porFechaImp[fecha] = [];
      porFechaImp[fecha].push(intervalo);
    } else {
      if (!porFechaNoImp[fecha]) porFechaNoImp[fecha] = [];
      porFechaNoImp[fecha].push(intervalo);
    }
  });
  const sumar = (porFecha) => {
    return Object.values(porFecha).reduce((total, intervalos) => {
      return total + mergeIntervalos(intervalos);
    }, 0);
  };
  return {
    imputables: sumar(porFechaImp),
    noImputables: sumar(porFechaNoImp)
  };
}

// ============================================================================
// COMPONENTE SELECTOR DE RANGO DE FECHAS
// ============================================================================
function DateRangeSelector({ fechaInicio, fechaFin, onChange, onClose }) {
  const [inicio, setInicio] = useState(fechaInicio ? dayjs(fechaInicio).format('YYYY-MM-DDTHH:mm') : '');
  const [fin, setFin] = useState(fechaFin ? dayjs(fechaFin).format('YYYY-MM-DDTHH:mm') : '');

  const handleAplicar = () => {
    if (inicio && fin) {
      onChange(dayjs(inicio).toDate(), dayjs(fin).toDate());
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
      zIndex: 50,
      minWidth: 280
    }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
          Desde
        </label>
        <input
          type="datetime-local"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "'DM Mono', monospace"
          }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
          Hasta
        </label>
        <input
          type="datetime-local"
          value={fin}
          onChange={(e) => setFin(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "'DM Mono', monospace"
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleAplicar}
          style={{
            flex: 1,
            background: '#0f172a',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Aplicar
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE VIAJE EXPANDIDO - MUESTRA TODOS LOS DETALLES DEL VIAJE
// ============================================================================
function ViajeDetalleExpandido({ viaje, onClose }) {
  const [expandido, setExpandido] = useState(true);
  
  const formatFechaHora = (fecha, hora) => {
    if (!fecha) return '—';
    if (hora) return dayjs(`${fecha} ${hora}`).format('DD/MM/YYYY HH:mm');
    return dayjs(fecha).format('DD/MM/YYYY');
  };

  const diferenciaPorcentaje = ((viaje.diferencia_kg || 0) / (viaje.peso_ingenio_kg || 1) * 100).toFixed(2);
  const esDiferenciaAlta = viaje.diferencia_kg > 50;

  return (
    <div style={{
      marginTop: 12,
      marginBottom: 12,
      background: '#f8fafc',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setExpandido(!expandido)}
        style={{
          padding: '12px 16px',
          background: '#f1f5f9',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: expandido ? '1px solid #e2e8f0' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Detalles del Viaje #{viaje.viaje_numero || viaje.id}
          </span>
          <span style={{
            fontSize: 11,
            background: '#e2e8f0',
            padding: '2px 8px',
            borderRadius: 999,
            color: '#475569'
          }}>
            {formatFechaHora(viaje.fecha, viaje.hora_inicio)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {expandido ? '▼' : '▶'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: '#94a3b8'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {expandido && (
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 20
          }}>
            <div style={{
              background: 'white',
              borderRadius: 10,
              padding: 12,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                🚛 VEHÍCULO
              </div>
              <div><strong>Placa:</strong> {viaje.placa_camion || '—'}</div>
              <div><strong>Remolque:</strong> {viaje.placa_remolque || '—'}</div>
              <div><strong>Conductor:</strong> {viaje.conductor || '—'}</div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 10,
              padding: 12,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                📦 CARGA
              </div>
              <div><strong>Bodega:</strong> {viaje.bodega || '—'}</div>
              <div><strong>Sacos:</strong> {viaje.cantidad_paquetes || 0} uds</div>
              <div><strong>Sacos dañados:</strong> {viaje.paquetes_danados || 0} uds</div>
              <div><strong>Sacos buenos:</strong> {(viaje.cantidad_paquetes || 0) - (viaje.paquetes_danados || 0)} uds</div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 10,
              padding: 12,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                ⚖️ PESOS
              </div>
              <div><strong>Peso/saco:</strong> {viaje.peso_saco_kg || 0} kg</div>
              <div><strong>Peso ingenio:</strong> {((viaje.peso_ingenio_kg || 0) / 1000).toFixed(2)} TM</div>
              <div><strong>Peso calculado:</strong> {((viaje.peso_saco_kg || 0) * ((viaje.cantidad_paquetes || 0) - (viaje.paquetes_danados || 0)) / 1000).toFixed(2)} TM</div>
              <div><strong>Diferencia:</strong> 
                <span style={{ color: esDiferenciaAlta ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                  {viaje.diferencia_kg?.toFixed(2) || 0} kg ({diferenciaPorcentaje}%)
                </span>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 10,
              padding: 12,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' }}>
                ⏰ TIEMPOS
              </div>
              <div><strong>Inicio:</strong> {viaje.hora_inicio || '—'}</div>
              <div><strong>Fin:</strong> {viaje.hora_fin || '—'}</div>
              <div><strong>Fecha:</strong> {dayjs(viaje.fecha).format('DD/MM/YYYY')}</div>
            </div>
          </div>

          {viaje.observaciones && (
            <div style={{
              background: '#fef3c7',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#92400e'
            }}>
              <strong>📝 Observaciones:</strong> {viaje.observaciones}
            </div>
          )}

          {viaje.ticket_url && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <a
                href={viaje.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: '#3b82f6',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                🎫 Ver ticket →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE DE ATRASOS MEJORADO CON FILTRO POR TIPO
// ============================================================================
function AtrasosBarco({ barcoId }) {
  const [atrasos, setAtrasos] = useState([]);
  const [tiposParo, setTiposParo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(true);
  const [filtroBodega, setFiltroBodega] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rangoPersonalizado, setRangoPersonalizado] = useState({
    activo: false,
    fechaInicio: null,
    fechaFin: null
  });
  const [stats, setStats] = useState({
    totalMinutos: 0, imputables: 0, noImputables: 0, porBodega: {}, porTipo: {}
  });
  const [periodoActivo, setPeriodoActivo] = useState('semana');

  useEffect(() => {
    if (barcoId) cargarDatos();
  }, [barcoId, periodoActivo, rangoPersonalizado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const { data: tipos } = await supabase.from('tipos_paro').select('*').eq('activo', true);
      setTiposParo(tipos || []);

      let query = supabase
        .from('registro_atrasos')
        .select('*, tipo_paro:tipos_paro(*)')
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (rangoPersonalizado.activo && rangoPersonalizado.fechaInicio && rangoPersonalizado.fechaFin) {
        query = query
          .gte('fecha_hora_completa', dayjs(rangoPersonalizado.fechaInicio).format('YYYY-MM-DD HH:mm:ss'))
          .lte('fecha_hora_completa', dayjs(rangoPersonalizado.fechaFin).format('YYYY-MM-DD HH:mm:ss'));
      } else {
        const fechaLimite = obtenerFechaLimite();
        if (fechaLimite) query = query.gte('fecha', fechaLimite);
      }

      const { data } = await query;
      setAtrasos(data || []);
      calcularEstadisticas(data || [], tipos || []);
    } catch (error) {
      console.error('Error cargando atrasos:', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerFechaLimite = () => {
    switch (periodoActivo) {
      case 'hoy':    return dayjs().format('YYYY-MM-DD');
      case 'semana': return dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      case 'mes':    return dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      case 'todo':   return null;
      default:       return dayjs().subtract(7, 'day').format('YYYY-MM-DD');
    }
  };

  const handleRangoPersonalizado = (inicio, fin) => {
    setRangoPersonalizado({ activo: true, fechaInicio: inicio, fechaFin: fin });
    setPeriodoActivo('personalizado');
    setShowDatePicker(false);
  };

  const calcularEstadisticas = (registros, tipos) => {
    const totalMinutos = calcularMinutosReales(registros);
    const { imputables, noImputables } = calcularMinutosRealesPorImputabilidad(registros, tipos);
    const porBodega = {}, porTipo = {};
    registros.forEach(reg => {
      const min = reg.duracion_minutos || 0;
      const bk  = reg.bodega_nombre || 'General';
      if (!porBodega[bk]) porBodega[bk] = { minutos: 0, count: 0 };
      porBodega[bk].minutos += min;
      porBodega[bk].count  += 1;
      const tipo = tipos.find(t => t.id === reg.tipo_paro_id);
      if (tipo) {
        if (!porTipo[tipo.nombre]) porTipo[tipo.nombre] = {
          minutos: 0, count: 0, imputable: tipo.es_imputable_almapac
        };
        porTipo[tipo.nombre].minutos += min;
        porTipo[tipo.nombre].count  += 1;
      }
    });
    setStats({ totalMinutos, imputables, noImputables, porBodega, porTipo });
  };

  const formatTiempo = (min) => {
    if (!min && min !== 0) return '0h 0m';
    const horas = Math.floor(min / 60);
    const minutos = min % 60;
    return `${horas}h ${minutos}m`;
  };

  const atrasosFiltrados = useMemo(() => {
    let filtrados = atrasos;
    
    if (filtroBodega === 'generales') {
      filtrados = atrasos.filter(a => a.es_general);
    } else if (filtroBodega !== 'todas') {
      filtrados = atrasos.filter(a => a.bodega_nombre === filtroBodega);
    }
    
    if (filtroTipo !== 'todos') {
      if (filtroTipo === 'imputables') {
        const tiposImputables = tiposParo.filter(t => t.es_imputable_almapac).map(t => t.id);
        filtrados = filtrados.filter(a => tiposImputables.includes(a.tipo_paro_id));
      } else if (filtroTipo === 'no-imputables') {
        const tiposNoImputables = tiposParo.filter(t => !t.es_imputable_almapac).map(t => t.id);
        filtrados = filtrados.filter(a => tiposNoImputables.includes(a.tipo_paro_id));
      } else {
        filtrados = filtrados.filter(a => a.tipo_paro_id === parseInt(filtroTipo));
      }
    }
    
    return filtrados;
  }, [atrasos, filtroBodega, filtroTipo, tiposParo]);

  const statsFiltrados = useMemo(() => {
    if (filtroBodega === 'todas' && filtroTipo === 'todos') return stats;
    
    const totalMinutos = calcularMinutosReales(atrasosFiltrados);
    const { imputables, noImputables } = calcularMinutosRealesPorImputabilidad(atrasosFiltrados, tiposParo);
    
    return { ...stats, totalMinutos, imputables, noImputables };
  }, [atrasosFiltrados, filtroBodega, filtroTipo, tiposParo, stats]);

  const bodegasUnicas = useMemo(() => {
    const s = new Set();
    atrasos.forEach(a => { if (a.bodega_nombre) s.add(a.bodega_nombre); });
    return ['todas', 'generales', ...Array.from(s).sort()];
  }, [atrasos]);

  const tiposOpciones = useMemo(() => {
    const opciones = [
      { value: 'todos', label: '📋 Todos los tipos' },
      { value: 'imputables', label: '🔴 Solo imputables ALMAPAC' },
      { value: 'no-imputables', label: '🟡 Solo no imputables' }
    ];
    
    const tiposOrdenados = [...tiposParo]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(t => ({
        value: t.id.toString(),
        label: t.nombre,
        color: getTipoColor(t.nombre)
      }));
    
    return [...opciones, ...tiposOrdenados];
  }, [tiposParo]);

  const s = statsFiltrados;
  const pctImputable = s.totalMinutos > 0 ? (s.imputables / s.totalMinutos * 100).toFixed(1) : '0.0';
  const pctNoImputable = s.totalMinutos > 0 ? (s.noImputables / s.totalMinutos * 100).toFixed(1) : '0.0';

  
}

// ============================================================================
// HELPER: parsear metas_json de forma segura
// ============================================================================
function parsearMetasJson(metasJson) {
  try {
    if (!metasJson) return {};
    let obj = typeof metasJson === "string" ? JSON.parse(metasJson) : metasJson;
    if (typeof obj === "string") obj = JSON.parse(obj);
    const sacosBodega = obj?.sacos_bodega;
    if (!sacosBodega) return {};
    return sacosBodega;
  } catch (e) {
    console.error("💥 Error parseando metas_json:", e, "| Valor recibido:", metasJson);
    return {};
  }
}

// ============================================================================
// HOOK para datos de sacos - CORREGIDO: resta los dañados del acumulado
// ============================================================================
function useSacosData(barcoId) {
  const [data, setData] = useState({ registros: [], loading: true, error: null, lastUpdate: null });

  const cargarDatos = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const { data: registros, error } = await supabase
        .from('registros_sacos')
        .select('*')
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;

      const registrosEnriquecidos = (registros || []).map(r => ({
        ...r,
        cantidad_paquetes_buenos: Math.max(0, r.cantidad_paquetes - (r.paquetes_danados || 0)),
        peso_total_calculado_kg: r.peso_saco_kg * Math.max(0, r.cantidad_paquetes - (r.paquetes_danados || 0)),
        peso_total_calculado_tm: (r.peso_saco_kg * Math.max(0, r.cantidad_paquetes - (r.paquetes_danados || 0))) / 1000,
        diferencia_kg: Math.abs((r.peso_saco_kg * Math.max(0, r.cantidad_paquetes - (r.paquetes_danados || 0))) - r.peso_ingenio_kg),
        porcentaje_diferencia: r.peso_ingenio_kg > 0 ? Math.abs(((r.peso_saco_kg * Math.max(0, r.cantidad_paquetes - (r.paquetes_danados || 0))) - r.peso_ingenio_kg) / r.peso_ingenio_kg * 100) : 0,
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
// UTILIDADES de formato
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
// TOOLTIP personalizado
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
// KPI Card
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
// BARRA DE PROGRESO PROFESIONAL MEJORADA con estimación de finalización
// ============================================================================
function ProgressBarFormal({ porcentaje, actual, meta, faltante, flujoPromedio = 0, bodegaSeleccionada = 'todas' }) {
  const pct = Math.min(100, Math.max(0, porcentaje));
  
  const getColorByProgress = (pct) => {
    if (pct >= 100) return '#10b981';
    if (pct >= 80) return '#f59e0b';
    if (pct >= 50) return '#3b82f6';
    if (pct >= 25) return '#8b5cf6';
    return '#64748b';
  };

  const color = getColorByProgress(pct);
  
  const calcularEstimacion = () => {
    if (pct >= 100 || faltante <= 0 || flujoPromedio <= 0) return null;
    
    const horasRestantes = faltante / flujoPromedio;
    const fechaEstimada = dayjs().add(horasRestantes, 'hour');
    
    const diffHoras = horasRestantes;
    const diffDias = Math.floor(diffHoras / 24);
    const diffHorasRest = Math.floor(diffHoras % 24);
    const diffMinutos = Math.floor((diffHoras - Math.floor(diffHoras)) * 60);
    
    let tiempoTexto = '';
    if (diffDias > 0) {
      tiempoTexto = `${diffDias}d ${diffHorasRest}h`;
    } else if (diffHorasRest > 0) {
      tiempoTexto = `${diffHorasRest}h ${diffMinutos}m`;
    } else {
      tiempoTexto = `${diffMinutos}m`;
    }
    
    return {
      fecha: fechaEstimada.format('DD/MM/YYYY HH:mm'),
      tiempoRestante: tiempoTexto,
      horas: horasRestantes
    };
  };

  const estimacion = calcularEstimacion();

  const milestones = [
    { value: 0, label: 'Inicio' },
    { value: 25, label: '¼' },
    { value: 50, label: '½' },
    { value: 75, label: '¾' },
    { value: 100, label: 'Meta' }
  ];

  const getStatusText = () => {
    if (pct >= 100) return '¡COMPLETADO!';
    if (bodegaSeleccionada !== 'todas') {
      return `Bodega ${bodegaSeleccionada} · En operación`;
    }
    return 'Operación en curso';
  };

  return (
    <div style={{ width: '100%', fontFamily: "'Sora', sans-serif" }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: color,
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 20,
            fontWeight: 800,
            boxShadow: `0 4px 12px ${color}40`
          }}>
            {pct >= 100 ? '✓' : '%'}
          </div>
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.5px',
              marginBottom: 2
            }}>
              ESTADO DE OPERACIÓN
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {getStatusText()}
            </div>
          </div>
        </div>

        <div style={{
          background: '#f8fafc',
          padding: '8px 20px',
          borderRadius: 40,
          border: '1px solid #e2e8f0'
        }}>
          <span style={{
            fontSize: 28,
            fontWeight: 900,
            color: color,
            fontFamily: "'DM Mono', monospace",
            lineHeight: 1
          }}>
            {pct.toFixed(1)}%
          </span>
          <span style={{
            fontSize: 12,
            color: '#94a3b8',
            marginLeft: 8,
            fontWeight: 600
          }}>
            completado
          </span>
        </div>
      </div>

      <div style={{
        position: 'relative',
        marginBottom: 24
      }}>
        <div style={{
          height: 32,
          background: '#e9eef3',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid #d1d9e6',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          {milestones.filter(m => m.value > 0 && m.value < 100).map(m => (
            <div
              key={m.value}
              style={{
                position: 'absolute',
                top: 0,
                left: `${m.value}%`,
                width: 2,
                height: '100%',
                background: 'rgba(255,255,255,0.5)',
                zIndex: 5,
                boxShadow: '0 0 4px rgba(0,0,0,0.1)'
              }}
            />
          ))}

          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}dd, ${color})`,
            transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative',
            borderRadius: '20px',
            boxShadow: `0 0 20px ${color}80`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: pct > 15 ? 12 : 0
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite',
              borderRadius: 'inherit'
            }} />
            
            {pct > 15 && (
              <span style={{
                position: 'relative',
                zIndex: 10,
                fontSize: 13,
                fontWeight: 800,
                color: 'white',
                fontFamily: "'DM Mono', monospace",
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                mixBlendMode: 'overlay'
              }}>
                {pct.toFixed(1)}%
              </span>
            )}
          </div>

          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            background: 'white',
            border: `3px solid ${color}`,
            borderRadius: '50%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 20,
            transition: 'left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          padding: '0 4px'
        }}>
          {milestones.map(m => (
            <div
              key={m.value}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: m.value === 0 ? 'auto' : m.value === 100 ? 'auto' : undefined,
                position: 'relative'
              }}
            >
              <div style={{
                width: 3,
                height: 8,
                background: pct >= m.value ? color : '#cbd5e1',
                borderRadius: 2,
                marginBottom: 4,
                transition: 'background 0.3s'
              }} />
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: pct >= m.value ? color : '#94a3b8',
                fontFamily: "'DM Mono', monospace",
                transition: 'color 0.3s'
              }}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginTop: 24,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 24,
        border: '1px solid #e2e8f0'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}>
            <span style={{ fontSize: 14 }}>🎯</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#64748b'
            }}>
              Manifestado
            </span>
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#0f172a',
            fontFamily: "'DM Mono', monospace"
          }}>
            {fmtTM(meta, 2)} TM
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#64748b'
            }}>
              Embarcado
            </span>
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: color,
            fontFamily: "'DM Mono', monospace"
          }}>
            {fmtTM(actual, 2)} TM
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}>
            <span style={{ fontSize: 14 }}>⏳</span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#64748b'
            }}>
              Pendiente
            </span>
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            color: faltante > 0 ? '#ef4444' : '#10b981',
            fontFamily: "'DM Mono', monospace"
          }}>
            {faltante > 0 ? `${fmtTM(faltante, 2)} TM` : '✓ COMPLETADO'}
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6
          }}>
            <Clock size={14} color="#8b5cf6" />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#64748b'
            }}>
              Finalización estimada
            </span>
          </div>
          {estimacion ? (
            <>
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#8b5cf6',
                fontFamily: "'DM Mono', monospace",
                lineHeight: 1.2
              }}>
                {estimacion.fecha}
              </div>
              <div style={{
                fontSize: 11,
                color: '#94a3b8',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <TrendingUp size={10} />
                <span>En {estimacion.tiempoRestante} · {fmtTM(flujoPromedio, 2)} TM/h</span>
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: faltante <= 0 ? '#10b981' : '#94a3b8',
                fontFamily: "'DM Mono', monospace"
              }}>
                {faltante <= 0 ? 'Completado' : flujoPromedio <= 0 ? 'Sin datos' : '—'}
              </div>
              {faltante > 0 && flujoPromedio <= 0 && (
                <div style={{
                  fontSize: 10,
                  color: '#94a3b8',
                  marginTop: 2
                }}>
                  Necesitas al menos 2 registros
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {bodegaSeleccionada !== 'todas' && (
        <div style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#ede9fe',
          borderRadius: 20,
          fontSize: 11,
          color: '#6d28d9',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <TrendingUp size={12} />
          <span>
            Estimación basada en flujo de <strong>Bodega {bodegaSeleccionada}</strong>: {fmtTM(flujoPromedio, 2)} TM/h
          </span>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// FLUJO GENERAL GLOBAL - Componente corregido
// ============================================================================
function FlujoGlobalCard({ flujoPromedioGeneral, flujoUltimaHora, registrosFiltrados, datosPorBodegaCompleto }) {
  const flujoGlobalBasadoEnBodegas = useMemo(() => {
    if (datosPorBodegaCompleto.length === 0) return 0;
    
    const sumaFlujoUltimaHora = datosPorBodegaCompleto.reduce((sum, b) => sum + (b.flujoUltimaHora || 0), 0);
    
    return sumaFlujoUltimaHora > 0 ? sumaFlujoUltimaHora : flujoPromedioGeneral;
  }, [datosPorBodegaCompleto, flujoPromedioGeneral]);

  const flujoUltimasHoras = useMemo(() => {
    if (registrosFiltrados.length === 0) return [];
    
    const ordenados = [...registrosFiltrados].sort(
      (a, b) => dayjs(b.fecha_hora).unix() - dayjs(a.fecha_hora).unix()
    );
    
    const ahora = dayjs();
    const ultimas3Horas = [];
    
    for (let i = 0; i < 3; i++) {
      const horaInicio = ahora.subtract(i + 1, 'hour');
      const horaFin = ahora.subtract(i, 'hour');
      
      const registrosHora = ordenados.filter(r => {
        const fechaHora = dayjs(r.fecha_hora);
        return fechaHora.isAfter(horaInicio) && fechaHora.isBefore(horaFin);
      });
      
      const totalTM = registrosHora.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
      
      ultimas3Horas.push({
        hora: horaInicio.format('HH:00'),
        tm: totalTM
      });
    }
    
    return ultimas3Horas.reverse();
  }, [registrosFiltrados]);

  const tendencia = useMemo(() => {
    if (flujoUltimasHoras.length < 2) return null;
    
    const ultimo = flujoUltimasHoras[flujoUltimasHoras.length - 1].tm;
    const anterior = flujoUltimasHoras[flujoUltimasHoras.length - 2].tm;
    
    if (anterior === 0) return { direccion: 'stable', porcentaje: 0 };
    
    const cambio = ((ultimo - anterior) / anterior) * 100;
    
    return {
      direccion: cambio > 5 ? 'up' : cambio < -5 ? 'down' : 'stable',
      porcentaje: Math.abs(cambio).toFixed(1)
    };
  }, [flujoUltimasHoras]);

  const topBodegasFlujo = useMemo(() => {
    return [...datosPorBodegaCompleto]
      .filter(b => b.flujoUltimaHora > 0)
      .sort((a, b) => b.flujoUltimaHora - a.flujoUltimaHora)
      .slice(0, 3);
  }, [datosPorBodegaCompleto]);

  return (
    <div style={{
      background: 'linear-gradient(145deg, #0b1a2e 0%, #0f172a 100%)',
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      border: '1px solid rgba(59,130,246,0.3)',
      color: 'white'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'rgba(16,185,129,0.2)',
            width: 48,
            height: 48,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(16,185,129,0.3)'
          }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 4
            }}>
              FLUJO GLOBAL DE DESCARGA
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'white',
              fontFamily: "'DM Mono', monospace",
              display: 'flex',
              alignItems: 'baseline',
              gap: 8
            }}>
              {fmtTM(flujoGlobalBasadoEnBodegas, 2)} TM/h
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Sora', sans-serif"
              }}>
                (basado en última hora por bodega)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>FLUJO PROMEDIO</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6', fontFamily: "'DM Mono', monospace" }}>
            {fmtTM(flujoPromedioGeneral, 2)} TM/h
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Desde inicio</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>BODEGAS ACTIVAS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6', fontFamily: "'DM Mono', monospace" }}>
            {datosPorBodegaCompleto.filter(b => b.flujoUltimaHora > 0).length}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Con flujo en última hora</div>
        </div>
      </div>

      {(() => {
        const hace3Horas = dayjs().subtract(3, 'hour');
        
        const bodegasActivas = datosPorBodegaCompleto
          .filter(b => {
            const registrosRecientes = registrosFiltrados.filter(r => 
              r.bodega === b.bodega && 
              dayjs(r.fecha_hora).isAfter(hace3Horas)
            );
            return registrosRecientes.length > 0;
          })
          .slice(0, 3);
        
        if (bodegasActivas.length === 0) return null;
        
        return (
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 16,
            padding: 16
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
                animation: 'pulse-dot 2s infinite'
              }} />
              BODEGAS ACTIVAS (ÚLTIMAS 3 HORAS)
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {bodegasActivas.map((b, i) => {
                const registrosRecientes = registrosFiltrados.filter(r => 
                  r.bodega === b.bodega && 
                  dayjs(r.fecha_hora).isAfter(hace3Horas)
                );
                const tmUltimas3Horas = registrosRecientes.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
                const flujoPromedio3h = tmUltimas3Horas / 3;
                
                return (
                  <div key={b.bodega} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      background: i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : '#8b5cf6',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'white'
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{b.bodega}</div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                          Última hora: <strong style={{ color: '#10b981', fontSize: 13 }}>
                            {fmtTM(b.flujoUltimaHora, 2)} TM/h
                          </strong>
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                          Promedio 3h: <strong style={{ color: '#3b82f6', fontSize: 13 }}>
                            {fmtTM(flujoPromedio3h, 2)} TM/h
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {flujoUltimasHoras.length > 1 && (
        <div style={{
          marginTop: 20,
          height: 60,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4
        }}>
          {flujoUltimasHoras.map((h, i) => {
            if (h.tm === 0) return null;
            
            const max = Math.max(...flujoUltimasHoras.map(h => h.tm));
            const height = max > 0 ? (h.tm / max) * 60 : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: Math.max(4, height),
                  background: i === flujoUltimasHoras.length - 1 ? '#10b981' : '#3b82f6',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s',
                  opacity: h.tm > 0 ? 1 : 0.3
                }} />
                <div style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4
                }}>
                  {h.hora}
                  {h.tm > 0 && (
                    <span style={{ color: '#10b981', marginLeft: 2 }}>
                      {fmtTM(h.tm, 1)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function DashboardSacosCompartido({ barco }) {
  const { registros, loading, error, lastUpdate, refetch } = useSacosData(barco.id);

  // FILTROS NUEVOS
  const [filtroBodegaGlobal, setFiltroBodegaGlobal] = useState('todas');
  const [filtroPlaca, setFiltroPlaca] = useState('');
  const [filtroRemolque, setFiltroRemolque] = useState('');
  const [filtroFecha, setFiltroFecha] = useState({ activo: false, inicio: null, fin: null });
  const [showDatePickerSacos, setShowDatePickerSacos] = useState(false);
  
  // BUSCADOR GLOBAL para la tabla de viajes
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  
  // Estado para el detalle expandido de cada viaje
  const [viajeExpandidoId, setViajeExpandidoId] = useState(null);
  
  // Estado para mostrar/ocultar panel de filtros
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // ========== PAGINACIÓN ==========
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(20);

  // Obtener valores únicos para filtros
  const placasUnicas = useMemo(() => {
    const s = new Set(registros.map(r => r.placa_camion).filter(Boolean));
    return Array.from(s).sort();
  }, [registros]);

  const remolquesUnicos = useMemo(() => {
    const s = new Set(registros.map(r => r.placa_remolque).filter(Boolean));
    return Array.from(s).sort();
  }, [registros]);

  const bodegasDisponibles = useMemo(() => {
    const s = new Set(registros.map(r => r.bodega).filter(Boolean));
    return ['todas', ...Array.from(s).sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || '0');
      const nb = parseInt(b.match(/\d+/)?.[0] || '0');
      return na - nb;
    })];
  }, [registros]);

  // Aplicar todos los filtros a los registros (incluyendo el buscador global)
  const registrosFiltrados = useMemo(() => {
    let filtrados = registros;
    
    // Filtro por bodega
    if (filtroBodegaGlobal !== 'todas') {
      filtrados = filtrados.filter(r => r.bodega === filtroBodegaGlobal);
    }
    
    // Filtro por placa
    if (filtroPlaca) {
      filtrados = filtrados.filter(r => r.placa_camion === filtroPlaca);
    }
    
    // Filtro por remolque
    if (filtroRemolque) {
      filtrados = filtrados.filter(r => r.placa_remolque === filtroRemolque);
    }
    
    // Filtro por rango de fechas
    if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
      filtrados = filtrados.filter(r => {
        const fechaHora = dayjs(r.fecha_hora);
        return fechaHora.isAfter(filtroFecha.inicio) && fechaHora.isBefore(filtroFecha.fin);
      });
    }
    
    // BUSCADOR GLOBAL - busca por # viaje, placa, remolque o bodega
    if (busquedaGlobal.trim() !== '') {
      const termino = busquedaGlobal.toLowerCase().trim();
      filtrados = filtrados.filter(r => {
        return (
          (r.viaje_numero && r.viaje_numero.toString().toLowerCase().includes(termino)) ||
          (r.placa_camion && r.placa_camion.toLowerCase().includes(termino)) ||
          (r.placa_remolque && r.placa_remolque.toLowerCase().includes(termino)) ||
          (r.bodega && r.bodega.toLowerCase().includes(termino))
        );
      });
    }
    
    return filtrados;
  }, [registros, filtroBodegaGlobal, filtroPlaca, filtroRemolque, filtroFecha, busquedaGlobal]);

  // ========== PAGINACIÓN: Calcular total de páginas y registros paginados ==========
  const totalPaginas = useMemo(() => {
    return Math.ceil(registrosFiltrados.length / registrosPorPagina);
  }, [registrosFiltrados, registrosPorPagina]);

  const registrosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    return registrosFiltrados.slice(inicio, fin);
  }, [registrosFiltrados, paginaActual, registrosPorPagina]);

  // Resetear a página 1 cuando cambian los filtros o el buscador
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroBodegaGlobal, filtroPlaca, filtroRemolque, filtroFecha, busquedaGlobal]);

  // Función para cambiar de página
  const irPagina = (nuevaPagina) => {
    setPaginaActual(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
  };

  // Función para cambiar registros por página
  const cambiarRegistrosPorPagina = (cantidad) => {
    setRegistrosPorPagina(cantidad);
    setPaginaActual(1);
  };

  // Limpiar todos los filtros (incluyendo buscador global)
  const limpiarFiltros = () => {
    setFiltroBodegaGlobal('todas');
    setFiltroPlaca('');
    setFiltroRemolque('');
    setFiltroFecha({ activo: false, inicio: null, fin: null });
    setBusquedaGlobal('');
  };

  // Verificar si hay filtros activos (incluyendo buscador)
  const hayFiltrosActivos = useMemo(() => {
    return filtroBodegaGlobal !== 'todas' || filtroPlaca || filtroRemolque || filtroFecha.activo || busquedaGlobal.trim() !== '';
  }, [filtroBodegaGlobal, filtroPlaca, filtroRemolque, filtroFecha.activo, busquedaGlobal]);

  const metasBodega = useMemo(() => {
    return parsearMetasJson(barco.metas_json);
  }, [barco.metas_json]);

  const statsGenerales = useMemo(() => {
    const totalViajes  = registrosFiltrados.length;
    const totalSacos   = registrosFiltrados.reduce((sum, r) => sum + (r.cantidad_paquetes_buenos || 0), 0);
    const totalTM      = registrosFiltrados.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
    const totalDanados = registrosFiltrados.reduce((sum, r) => sum + (r.paquetes_danados || 0), 0);
    
    const placasMap = {};
    registrosFiltrados.forEach(r => {
      if (!placasMap[r.placa_camion]) {
        placasMap[r.placa_camion] = { 
          placa: r.placa_camion, 
          remolque: r.placa_remolque,
          viajes: 0, 
          sacos: 0, 
          tm: 0,
          danados: 0
        };
      }
      placasMap[r.placa_camion].viajes++;
      placasMap[r.placa_camion].sacos += (r.cantidad_paquetes_buenos || 0);
      placasMap[r.placa_camion].tm    += r.peso_total_calculado_tm;
      placasMap[r.placa_camion].danados += (r.paquetes_danados || 0);
    });
    
    const remolquesMap = {};
    registrosFiltrados.forEach(r => {
      if (r.placa_remolque) {
        if (!remolquesMap[r.placa_remolque]) {
          remolquesMap[r.placa_remolque] = { 
            remolque: r.placa_remolque, 
            viajes: 0, 
            sacos: 0, 
            tm: 0
          };
        }
        remolquesMap[r.placa_remolque].viajes++;
        remolquesMap[r.placa_remolque].sacos += (r.cantidad_paquetes_buenos || 0);
        remolquesMap[r.placa_remolque].tm    += r.peso_total_calculado_tm;
      }
    });
    
    return {
      totalViajes,
      totalSacos,
      totalTM,
      totalDanados,
      topPlacas: Object.values(placasMap).sort((a, b) => b.viajes - a.viajes).slice(0, 5),
      topRemolques: Object.values(remolquesMap).sort((a, b) => b.viajes - a.viajes).slice(0, 5),
      totalPlacas: Object.keys(placasMap).length,
      totalRemolques: Object.keys(remolquesMap).length
    };
  }, [registrosFiltrados]);

  const flujoPorHora = useMemo(() => {
    if (registrosFiltrados.length === 0) return [];

    const ordenados = [...registrosFiltrados].sort(
      (a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix()
    );

    const mapPorHora = new Map();

    ordenados.forEach(reg => {
      const horaExacta = dayjs(reg.fecha_hora).startOf('hour');
      const key = horaExacta.format('YYYY-MM-DD HH:00');

      if (!mapPorHora.has(key)) {
        mapPorHora.set(key, {
          hora: horaExacta.format('DD/MM HH:00'),
          horaCorta: horaExacta.format('HH:00'),
          horaCompleta: key,
          timestamp: horaExacta.valueOf(),
          toneladas: 0,
          viajes: 0,
          sacos: 0
        });
      }

      const data = mapPorHora.get(key);
      data.toneladas += reg.peso_total_calculado_tm;
      data.viajes += 1;
      data.sacos += (reg.cantidad_paquetes_buenos || 0);
    });

    const resultado = Array.from(mapPorHora.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    return resultado.length > 24 ? resultado.slice(-24) : resultado;
  }, [registrosFiltrados]);

  const flujoPromedioGeneral = useMemo(() => {
    if (registrosFiltrados.length < 2) return 0;
    const ordenados = [...registrosFiltrados].sort(
      (a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix()
    );
    const horas = dayjs(ordenados[ordenados.length - 1].fecha_hora)
      .diff(dayjs(ordenados[0].fecha_hora), 'hour', true);
    if (horas <= 0) return 0;
    return registrosFiltrados.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0) / horas;
  }, [registrosFiltrados]);

  const flujoUltimaHora = useMemo(() => {
    if (registrosFiltrados.length === 0) return 0;
    const hace1Hora = dayjs().subtract(1, 'hour');
    return registrosFiltrados
      .filter(r => dayjs(r.fecha_hora).isAfter(hace1Hora))
      .reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
  }, [registrosFiltrados]);

  const totalMetas = useMemo(() => {
    if (filtroBodegaGlobal !== 'todas') {
      return Number(metasBodega[filtroBodegaGlobal]) || 0;
    }
    return Object.values(metasBodega).reduce((sum, meta) => sum + (Number(meta) || 0), 0);
  }, [metasBodega, filtroBodegaGlobal]);

  const progresoGeneral = useMemo(() => {
    if (totalMetas === 0) return 0;
    return Math.min(100, (statsGenerales.totalTM / totalMetas) * 100);
  }, [statsGenerales.totalTM, totalMetas]);

  const datosPorBodegaCompleto = useMemo(() => {
    const bodegasMap = {};

    if (barco.bodegas_json) {
      const arr = typeof barco.bodegas_json === "string"
        ? JSON.parse(barco.bodegas_json)
        : barco.bodegas_json;
      if (Array.isArray(arr)) {
        arr.forEach(b => {
          if (filtroBodegaGlobal === 'todas' || filtroBodegaGlobal === b.nombre) {
            bodegasMap[b.nombre] = {
              bodega: b.nombre, viajes: 0, sacos: 0, tm: 0,
              meta: Number(metasBodega[b.nombre]) || 0, flujoHora: 0
            };
          }
        });
      }
    }

    registrosFiltrados.forEach(r => {
      if (!bodegasMap[r.bodega]) {
        bodegasMap[r.bodega] = {
          bodega: r.bodega, viajes: 0, sacos: 0, tm: 0,
          meta: Number(metasBodega[r.bodega]) || 0, flujoHora: 0
        };
      }
      bodegasMap[r.bodega].viajes++;
      bodegasMap[r.bodega].sacos += (r.cantidad_paquetes_buenos || 0);
      bodegasMap[r.bodega].tm    += r.peso_total_calculado_tm;
    });

    return Object.values(bodegasMap)
      .sort((a, b) => {
        const numA = parseInt(a.bodega.match(/\d+/)?.[0] || "0");
        const numB = parseInt(b.bodega.match(/\d+/)?.[0] || "0");
        return numB - numA;
      })
      .map(b => {
        const rbs = registrosFiltrados.filter(r => r.bodega === b.bodega);
        if (rbs.length >= 2) {
          const ordenados = [...rbs].sort(
            (a, c) => dayjs(a.fecha_hora).unix() - dayjs(c.fecha_hora).unix()
          );
          const horas = dayjs(ordenados[ordenados.length - 1].fecha_hora)
            .diff(dayjs(ordenados[0].fecha_hora), 'hour', true);
          if (horas > 0) b.flujoHora = b.tm / horas;
        }

        if (rbs.length > 0) {
          const ultimoRegistro = [...rbs].sort(
            (a, c) => dayjs(c.fecha_hora).unix() - dayjs(a.fecha_hora).unix()
          )[0];
          const ultimaBucket = dayjs(ultimoRegistro.fecha_hora).startOf('hour');
          const tmEnUltimaBucket = rbs
            .filter(r => dayjs(r.fecha_hora).startOf('hour').isSame(ultimaBucket))
            .reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
          b.flujoUltimaHora = tmEnUltimaBucket;
          b.ultimaBucketLabel = ultimaBucket.format('HH:00');
        } else {
          b.flujoUltimaHora = 0;
          b.ultimaBucketLabel = null;
        }

        if (b.meta > 0) {
          b.porcentaje = Math.min(100, (b.tm / b.meta) * 100);
          b.faltante   = Math.max(0, b.meta - b.tm);
          b.completado = b.tm >= b.meta;
        } else {
          b.porcentaje = 0; b.faltante = 0; b.completado = false;
        }
        return b;
      });
  }, [registrosFiltrados, metasBodega, barco.bodegas_json, filtroBodegaGlobal]);

  const flujoPorHoraBodega = useMemo(() => {
    if (registrosFiltrados.length === 0) return [];

    const ordenados = [...registrosFiltrados]
      .sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix())
      .slice(-48);

    const map = new Map();

    ordenados.forEach(reg => {
      const horaExacta = dayjs(reg.fecha_hora).startOf('hour');
      const horaCompleta = horaExacta.format('YYYY-MM-DD HH:00');
      const key = `${horaCompleta}|${reg.bodega}`;

      if (!map.has(key)) {
        map.set(key, {
          hora: horaExacta.format('DD/MM HH:00'),
          horaCompleta,
          timestamp: horaExacta.valueOf(),
          bodega: reg.bodega,
          toneladas: 0
        });
      }
      map.get(key).toneladas += reg.peso_total_calculado_tm;
    });

    const horasUnicas = [...new Set(Array.from(map.values()).map(v => v.horaCompleta))]
      .sort()
      .slice(-12);

    const bodegas = [...new Set(registrosFiltrados.map(r => r.bodega))];

    return horasUnicas.map(horaCompleta => {
      const entry = Array.from(map.values()).find(v => v.horaCompleta === horaCompleta);
      const dp = {
        hora: entry ? entry.hora : horaCompleta,
        horaCompleta
      };
      bodegas.forEach(bod => {
        const found = Array.from(map.values()).find(
          v => v.horaCompleta === horaCompleta && v.bodega === bod
        );
        dp[bod] = found ? found.toneladas : 0;
      });
      return dp;
    });
  }, [registrosFiltrados]);

  const proyeccionesBodega = useMemo(() => {
    if (flujoPromedioGeneral === 0) return [];
    return datosPorBodegaCompleto.map(b => {
      if (b.meta === 0 || b.completado) return { ...b, fechaEstimada: null };
      const flujo = b.flujoHora > 0 ? b.flujoHora : flujoPromedioGeneral;
      const horas = b.faltante / flujo;
      return {
        ...b,
        horasRestantes: horas,
        fechaEstimada: dayjs().add(horas, 'hour').format('DD/MM HH:mm')
      };
    });
  }, [datosPorBodegaCompleto, flujoPromedioGeneral]);

  const handleRangoFechaSacos = (inicio, fin) => {
    setFiltroFecha({ activo: true, inicio, fin });
    setShowDatePickerSacos(false);
  };

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
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
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
          --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0; --border-strong: #cbd5e1;
          --text: #0f172a; --text-2: #475569; --text-3: #94a3b8;
          --blue: #3b82f6; --green: #10b981; --amber: #f59e0b; --teal: #14b8a6; --navy: #0f172a;
          --radius: 16px;
          --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06);
          font-family: 'Sora', sans-serif;
        }
        
        body { background: var(--bg); color: var(--text); }
        .alm-root { min-height: 100vh; background: var(--bg); padding: 0; }
        
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
        
        .alm-topbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .alm-logo { height: 32px; width: auto; object-fit: contain; filter: brightness(0) invert(1); flex-shrink: 0; }
        .alm-divider { width: 1px; height: 30px; background: rgba(255,255,255,.18); flex-shrink: 0; }
        .alm-ship-id { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .alm-ship-name { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: -.3px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .alm-ship-code { font-size: 10px; color: rgba(255,255,255,.5); font-family: 'DM Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .alm-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        
        .alm-status-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.3);
          border-radius: 999px; padding: 4px 10px;
          font-size: 11px; font-weight: 700; color: #6ee7b7;
          text-transform: uppercase; letter-spacing: .5px; white-space: nowrap;
        }
        
        .alm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse-dot 2s infinite; flex-shrink: 0; }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        
        .alm-update-container { display: none; }
        
        .alm-refresh-btn {
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px; color: rgba(255,255,255,.8);
          padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
          transition: all .2s; font-family: 'Sora', sans-serif;
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .alm-refresh-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
        
        @media (min-width: 768px) {
          .alm-topbar { padding: 0 24px; }
          .alm-logo { height: 36px; }
          .alm-ship-name { font-size: 15px; }
          .alm-update-container { display: block; }
          .alm-update-time { font-size: 11px; color: rgba(255,255,255,.4); font-family: 'DM Mono', monospace; }
        }
        
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 28px 24px 48px; }
        
        .alm-kpis-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px; margin-bottom: 20px;
        }
        
        .alm-kpi {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 20px;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: var(--shadow); position: relative; overflow: hidden;
        }
        .alm-kpi::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: var(--accent);
        }
        .alm-kpi-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
        .alm-kpi-body { flex: 1; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); margin-bottom: 4px; }
        .alm-kpi-value { font-size: 22px; font-weight: 900; color: var(--text); line-height: 1.1; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: var(--text-3); margin-top: 3px; }
        .alm-kpi-bar { position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent); border-radius: 0 2px 2px 0; }
        
        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alm-pulse-num { animation: count-up .6s ease; }
        
        .alm-progress-container {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 24px;
          margin-bottom: 20px; box-shadow: var(--shadow);
        }
        .alm-progress-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
        }
        .alm-progress-title {
          font-size: 13px; font-weight: 700; color: var(--text-2);
          display: flex; align-items: center; gap: 8px;
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        
        .alm-chart-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 20px;
          box-shadow: var(--shadow); margin-bottom: 20px;
        }
        .alm-chart-title {
          font-size: 13px; font-weight: 700; color: var(--text-2);
          margin-bottom: 14px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 6px;
        }
        .alm-no-data { height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-3); font-size: 13px; }
        
        .alm-tooltip {
          background: var(--navy); border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px; padding: 10px 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,.3);
        }
        .alm-tooltip-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.6); margin-bottom: 4px; font-family: 'DM Mono', monospace; }
        .alm-tooltip-value { font-size: 12px; font-family: 'DM Mono', monospace; color: rgba(255,255,255,.9); }
        
        .alm-ship-layout {
          background: linear-gradient(145deg, #0b1a2e 0%, #0f172a 100%);
          border-radius: 24px; padding: 24px 16px; margin-bottom: 28px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          border: 1px solid rgba(59,130,246,0.3);
          position: relative; overflow: hidden;
        }
        .alm-ship-layout::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, #10b981, #f59e0b, transparent);
          opacity: 0.5;
        }
        .alm-ship-title {
          font-size: 16px; font-weight: 800; color: white;
          margin-bottom: 16px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
          padding: 0 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative; z-index: 2;
        }
        .alm-ship-title span:first-child {
          background: rgba(255,255,255,0.1); padding: 6px 18px; border-radius: 40px;
          backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
        }
        .alm-ship-container {
          position: relative; width: 100%; overflow-x: auto; overflow-y: hidden;
          padding: 8px 0; -webkit-overflow-scrolling: touch;
          scrollbar-width: thin; scrollbar-color: #10b981 #1e293b;
        }
        .alm-ship-container::-webkit-scrollbar { height: 6px; }
        .alm-ship-container::-webkit-scrollbar-track { background: #1e293b; border-radius: 10px; }
        .alm-ship-container::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        .alm-ship-svg { min-width: 900px; width: 100%; height: auto; display: block; }
        
        .alm-ship-legend {
          display: flex; gap: 12px; margin-top: 16px; justify-content: center;
          padding: 12px 16px; background: rgba(0,0,0,0.4); border-radius: 60px;
          backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap;
        }
        .alm-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600; }
        .alm-legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
        
        .alm-table-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); box-shadow: var(--shadow);
          overflow: hidden; margin-top: 20px;
        }
        .alm-table-header {
          padding: 16px 20px; border-bottom: 1px solid var(--border);
          background: #f8fafc; display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 12px;
        }
        .alm-section-title { font-size: 15px; font-weight: 800; color: var(--text); }
        .alm-badge { margin-left: 10px; font-size: 11px; font-weight: 600; background: #e2e8f0; color: var(--text-2); padding: 2px 9px; border-radius: 999px; }
        
        .alm-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .alm-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1000px; }
        .alm-table thead { background: #f8fafc; position: sticky; top: 0; z-index: 2; }
        .alm-table th {
          padding: 11px 16px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .8px; color: var(--text-3);
          border-bottom: 1px solid var(--border); white-space: nowrap;
        }
        .alm-table td { padding: 11px 16px; color: var(--text-2); white-space: nowrap; }
        .alm-table tbody tr:hover { background: #f8fafc; }
        .alm-th-num, .alm-td-num { text-align: right; }
        .alm-tr-latest { background: #eff6ff !important; }
        .alm-bold { font-weight: 700; color: var(--text) !important; }
        .alm-green { color: var(--green) !important; }
        .alm-amber { color: var(--amber) !important; }
        .alm-red { color: #ef4444 !important; }
        .alm-mono { font-family: 'DM Mono', monospace; }
        
        .alm-footer {
          text-align: center; padding: 24px; font-size: 11px;
          color: var(--text-3); font-family: 'DM Mono', monospace; margin-top: 20px;
        }
        
        .alm-splash {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: var(--navy); gap: 20px;
        }
        .alm-splash-logo { height: 48px; filter: brightness(0) invert(1); }
        .alm-splash-ship { font-size: 64px; animation: float 3s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .alm-splash-text { color: rgba(255,255,255,.6); font-size: 16px; font-weight: 600; }
        .alm-loader {
          width: 40px; height: 40px;
          border: 3px solid rgba(255,255,255,.1); border-top-color: #10b981;
          border-radius: 50%; animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .alm-error-box { background: #fff; border-radius: 20px; padding: 36px; text-align: center; max-width: 380px; }
        .alm-error-title { font-size: 18px; font-weight: 700; color: #dc2626; margin-bottom: 8px; }
        .alm-error-msg { font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
        .alm-retry-btn {
          background: #fee2e2; border: none; border-radius: 10px;
          color: #dc2626; padding: 10px 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Sora', sans-serif;
        }
        
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        @media (max-width: 768px) {
          .alm-body { padding: 16px 12px 40px; }
          .alm-kpis-row { grid-template-columns: 1fr 1fr; gap: 10px; }
          .alm-kpi { padding: 14px 12px; gap: 10px; }
          .alm-kpi-icon { font-size: 22px; }
          .alm-kpi-value { font-size: 18px; }
          .alm-ship-layout { padding: 16px 8px; border-radius: 16px; margin-left: -4px; margin-right: -4px; }
          .alm-ship-title { font-size: 13px; flex-direction: column; align-items: flex-start; gap: 6px; }
          .alm-ship-title span:first-child { padding: 5px 14px; font-size: 12px; width: 100%; text-align: center; }
          .alm-ship-svg { min-width: 850px; }
          .alm-ship-legend { gap: 8px; padding: 10px 12px; border-radius: 20px; flex-wrap: wrap; justify-content: flex-start; }
          .alm-legend-item { font-size: 10px; gap: 4px; }
          .alm-legend-dot { width: 8px; height: 8px; }
        }
        @media (max-width: 480px) {
          .alm-kpis-row { grid-template-columns: 1fr 1fr; }
          .alm-kpi-label { font-size: 9px; }
          .alm-kpi-value { font-size: 16px; }
          .alm-ship-svg { min-width: 900px; }
          .alm-ship-legend { flex-direction: row; align-items: flex-start; border-radius: 12px; gap: 6px; }
          .alm-legend-item { font-size: 9px; }
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
              <span>SACOS</span>
            </div>
            {lastUpdate && (
              <div className="alm-update-container">
                <span className="alm-update-time">↻ {lastUpdate.format("HH:mm:ss")}</span>
              </div>
            )}
            <button onClick={refetch} className="alm-refresh-btn">
              <RefreshCw size={12} /><span>Actualizar</span>
            </button>
          </div>
        </header>

        <div className="alm-body">

          {/* PANEL DE FILTROS AVANZADOS */}
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            marginBottom: 20,
            overflow: 'hidden'
          }}>
            <div
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
              style={{
                padding: '14px 20px',
                background: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: mostrarFiltrosAvanzados ? '1px solid #e2e8f0' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Filter size={16} color="#64748b" />
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  FILTROS Y BÚSQUEDA
                </span>
                {hayFiltrosActivos && (
                  <span style={{
                    background: '#3b82f6',
                    color: 'white',
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 600
                  }}>
                    Activos
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hayFiltrosActivos && (
                  <button
                    onClick={(e) => { e.stopPropagation(); limpiarFiltros(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    ✕ Limpiar todo
                  </button>
                )}
                <span style={{ fontSize: 16, color: '#64748b' }}>
                  {mostrarFiltrosAvanzados ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {mostrarFiltrosAvanzados && (
              <div style={{ padding: '20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16
                }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      📦 BODEGA
                    </label>
                    <select
                      value={filtroBodegaGlobal}
                      onChange={(e) => setFiltroBodegaGlobal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "'Sora', sans-serif",
                        background: '#fff'
                      }}
                    >
                      {bodegasDisponibles.map(b => (
                        <option key={b} value={b}>
                          {b === 'todas' ? '📋 Todas las bodegas' : b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      🚛 PLACA CAMIÓN
                    </label>
                    <select
                      value={filtroPlaca}
                      onChange={(e) => setFiltroPlaca(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "'Sora', sans-serif",
                        background: '#fff'
                      }}
                    >
                      <option value="">🔍 Todas las placas</option>
                      {placasUnicas.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      🔗 REMOLQUE
                    </label>
                    <select
                      value={filtroRemolque}
                      onChange={(e) => setFiltroRemolque(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "'Sora', sans-serif",
                        background: '#fff'
                      }}
                    >
                      <option value="">🔍 Todos los remolques</option>
                      {remolquesUnicos.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      📅 RANGO DE FECHAS
                    </label>
                    <button
                      onClick={() => setShowDatePickerSacos(!showDatePickerSacos)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: "'Sora', sans-serif"
                      }}
                    >
                      <Calendar size={14} />
                      {filtroFecha.activo 
                        ? `${dayjs(filtroFecha.inicio).format('DD/MM HH:mm')} - ${dayjs(filtroFecha.fin).format('DD/MM HH:mm')}`
                        : 'Seleccionar rango'}
                    </button>
                    {showDatePickerSacos && (
                      <DateRangeSelector
                        fechaInicio={filtroFecha.inicio}
                        fechaFin={filtroFecha.fin}
                        onChange={handleRangoFechaSacos}
                        onClose={() => setShowDatePickerSacos(false)}
                      />
                    )}
                  </div>
                </div>

                {/* BUSCADOR GLOBAL dentro del panel de filtros */}
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    🔍 BUSCADOR GLOBAL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Buscar por #viaje, placa, remolque o bodega..."
                      value={busquedaGlobal}
                      onChange={(e) => setBusquedaGlobal(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "'Sora', sans-serif",
                        background: '#fff'
                      }}
                    />
                    {busquedaGlobal && (
                      <button
                        onClick={() => setBusquedaGlobal('')}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          fontSize: 14
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    Busca coincidencias en número de viaje, placa de camión, placa de remolque o bodega
                  </p>
                </div>

                {hayFiltrosActivos && (
                  <div style={{
                    marginTop: 16,
                    padding: '10px 14px',
                    background: '#eff6ff',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap'
                  }}>
                    <span>🔍 Filtros aplicados:</span>
                    {filtroBodegaGlobal !== 'todas' && (
                      <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                        Bodega: {filtroBodegaGlobal}
                      </span>
                    )}
                    {filtroPlaca && (
                      <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                        Placa: {filtroPlaca}
                      </span>
                    )}
                    {filtroRemolque && (
                      <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                        Remolque: {filtroRemolque}
                      </span>
                    )}
                    {filtroFecha.activo && (
                      <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                        {dayjs(filtroFecha.inicio).format('DD/MM HH:mm')} - {dayjs(filtroFecha.fin).format('DD/MM HH:mm')}
                      </span>
                    )}
                    {busquedaGlobal && (
                      <span style={{ background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>
                        Buscar: "{busquedaGlobal}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: '#f1f5f9',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                📊 Resultados:
              </span>
              <span style={{
                background: '#0f172a',
                color: 'white',
                padding: '2px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600
              }}>
                {registrosFiltrados.length} viajes
              </span>
              {filtroPlaca && (
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  🚛 {filtroPlaca}
                </span>
              )}
              {filtroRemolque && (
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  🔗 {filtroRemolque}
                </span>
              )}
              {busquedaGlobal && (
                <span style={{ fontSize: 12, color: '#3b82f6' }}>
                  🔍 "{busquedaGlobal}"
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              {statsGenerales.totalTM.toFixed(2)} TM · {statsGenerales.totalSacos} sacos
            </div>
          </div>

          <div className="alm-kpis-row">
            <KpiCard label="Total Viajes"    value={statsGenerales.totalViajes}                icon="🚛" accent="#10b981" animate />
            <KpiCard label="Total Sacos"     value={fmtNumber(statsGenerales.totalSacos)}      icon="📦" accent="#3b82f6" animate />
            <KpiCard label="Total Toneladas" value={`${fmtTM(statsGenerales.totalTM, 2)} TM`} icon="⚖️" accent="#f59e0b" animate />
            <KpiCard label="Sacos Dañados"   value={fmtNumber(statsGenerales.totalDanados)}    icon="⚠️" accent="#ef4444"
              sub={`${statsGenerales.totalDanados > 0 ? ((statsGenerales.totalDanados / (statsGenerales.totalSacos + statsGenerales.totalDanados)) * 100).toFixed(1) : 0}% del total`} />
          </div>

          <FlujoGlobalCard 
            flujoPromedioGeneral={flujoPromedioGeneral}
            flujoUltimaHora={flujoUltimaHora}
            registrosFiltrados={registrosFiltrados}
            datosPorBodegaCompleto={datosPorBodegaCompleto}
          />

          <div className="alm-progress-container">
            <div className="alm-progress-header">
              <div className="alm-progress-title">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                Progreso general de la operación
                {filtroBodegaGlobal !== 'todas' && (
                  <span style={{
                    background: '#3b82f6',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: 10,
                    marginLeft: 8
                  }}>
                    Bodega {filtroBodegaGlobal}
                  </span>
                )}
              </div>
            </div>
            <ProgressBarFormal
              porcentaje={progresoGeneral}
              actual={statsGenerales.totalTM}
              meta={totalMetas}
              faltante={Math.max(0, totalMetas - statsGenerales.totalTM)}
              flujoPromedio={filtroBodegaGlobal !== 'todas' 
                ? datosPorBodegaCompleto.find(b => b.bodega === filtroBodegaGlobal)?.flujoHora || flujoPromedioGeneral
                : flujoPromedioGeneral
              }
              bodegaSeleccionada={filtroBodegaGlobal}
            />
          </div>

          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              ⏱️ FLUJO POR HORA (TM/h)
              <span>Promedio: {fmtTM(flujoPromedioGeneral, 2)} TM/h | Última hora: {fmtTM(flujoUltimaHora, 2)} TM | {flujoPorHora.length} horas mostradas</span>
            </h4>
            {flujoPorHora.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={flujoPorHora}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const parts = v.split(' ');
                      return parts.length === 2 ? parts[1] : v;
                    }}
                  />
                  <YAxis yAxisId="left"  tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'toneladas') return [fmtTM(value, 2) + ' TM', 'Toneladas'];
                      if (name === 'viajes') return [value + ' viajes', 'Viajes'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `🕐 ${label}`}
                  />
                  <Bar  yAxisId="left"  dataKey="toneladas" fill="#10b981" name="Toneladas" barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="viajes" stroke="#f59e0b" strokeWidth={2} name="Viajes" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="alm-no-data">
                {flujoPorHora.length === 1
                  ? "Solo hay datos de una hora, se necesitan al menos 2 horas para mostrar flujo"
                  : "No hay datos suficientes para mostrar el flujo por hora"}
              </div>
            )}
          </div>

          <div className="alm-ship-layout">
            <div className="alm-ship-title">
              <span>⚓ DISTRIBUCIÓN DE CARGA POR BODEGA</span>
              <span>Total: {fmtTM(statsGenerales.totalTM, 2)} TM / {fmtTM(totalMetas, 2)} TM</span>
            </div>
            <div className="alm-ship-container">
              <svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" className="alm-ship-svg" preserveAspectRatio="xMidYMid meet">
                <g transform="scale(0.714)">
                  <defs>
                    <linearGradient id="hullMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#4a5568" /><stop offset="50%" stopColor="#718096" /><stop offset="100%" stopColor="#4a5568" />
                    </linearGradient>
                    <linearGradient id="oceanWater" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0f3b5e" /><stop offset="50%" stopColor="#0a2a44" /><stop offset="100%" stopColor="#051a2b" />
                    </linearGradient>
                    <linearGradient id="deckWood" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5a2b" /><stop offset="50%" stopColor="#a67c52" /><stop offset="100%" stopColor="#8b5a2b" />
                    </linearGradient>
                    <pattern id="rivets" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="2" fill="#cbd5e0" opacity="0.3" />
                    </pattern>
                  </defs>

                  <rect x="0" y="390" width="1400" height="200" fill="url(#oceanWater)" />
                  <path d="M0 410 Q150 390, 300 410 T600 410 T900 410 T1200 410 T1400 410" stroke="#60a5fa" strokeWidth="3" fill="none" opacity="0.3" />
                  <path d="M0 450 Q200 430, 400 450 T800 450 T1200 450" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.2" />

                  <path d="M150 390 L200 220 L1200 220 L1250 390 Z" fill="url(#hullMetal)" stroke="#94a3b8" strokeWidth="6" />
                  <line x1="170" y1="340" x2="1230" y2="340" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 10" opacity="0.6" />
                  <rect x="200" y="200" width="1000" height="30" fill="url(#deckWood)" stroke="#b45309" strokeWidth="2" rx="4" />

                  <line x1="220" y1="170" x2="1180" y2="170" stroke="#cbd5e0" strokeWidth="3" />
                  <line x1="220" y1="160" x2="1180" y2="160" stroke="#cbd5e0" strokeWidth="2" />
                  {[250,350,450,550,650,750,850,950,1050,1150].map(x => (
                    <rect key={x} x={x-2} y="150" width="4" height="30" fill="#94a3b8" rx="2" />
                  ))}

                  <rect x="400" y="40" width="12" height="120" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                  <circle cx="406" cy="30" r="18" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
                  <rect x="1000" y="60" width="8" height="100" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                  <circle cx="1004" cy="50" r="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />

                  <rect x="650" y="60" width="70" height="140" fill="#475569" stroke="#334155" strokeWidth="3" rx="6" />
                  <ellipse cx="685" cy="60" rx="35" ry="12" fill="#334155" stroke="#1f2937" strokeWidth="2" />
                  <circle cx="685" cy="44" r="12" fill="#94a3b8" opacity="0.4">
                    <animate attributeName="r" values="12;15;12" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite" />
                  </circle>

                  <rect x="500" y="120" width="200" height="60" fill="#1f2937" stroke="#4b5563" strokeWidth="3" rx="8" />
                  <circle cx="540" cy="150" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                  <circle cx="600" cy="150" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                  <circle cx="660" cy="150" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />

                  <path d="M150 390 L130 330 L180 220 L200 220 L150 390" fill="#4a5568" stroke="#718096" strokeWidth="3" />
                  <circle cx="140" cy="315" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                  <path d="M1250 390 L1270 330 L1220 220 L1200 220 L1250 390" fill="#4a5568" stroke="#718096" strokeWidth="3" />

                  {datosPorBodegaCompleto.map((bodega, index) => {
                    const total = datosPorBodegaCompleto.length;
                    const aw = 700 / total;
                    const ix = 300 + (index * aw) + (aw * 0.1);
                    const w  = aw * 0.8;
                    const am = 170;
                    const pct = Math.min(100, bodega.porcentaje || 0);
                    const ar  = (am * pct) / 100;
                    let cb = "#3b82f6", cbr = "#2563eb";
                    if (bodega.completado)    { cb = "#10b981"; cbr = "#059669"; }
                    else if (pct > 75)        { cb = "#f59e0b"; cbr = "#d97706"; }

                    const flujoUltHora = bodega.flujoUltimaHora || 0;
                    const bucketLabel = bodega.ultimaBucketLabel ? `Ultimo flujo: ${bodega.ultimaBucketLabel}` : '';
                    const flujoLabel = flujoUltHora > 0
                      ? `${Number(flujoUltHora).toFixed(1)} TM`
                      : '—';
                    const flujoColor = flujoUltHora > 0 ? '#34d399' : 'rgba(255,255,255,0.4)';

                    return (
                      <g key={bodega.bodega}>
                        <rect x={ix} y={210} width={w} height={am} fill="#1e293b" stroke={cbr} strokeWidth="4" rx="12" />
                        <rect x={ix+4} y={210+(am-ar)} width={w-8} height={Math.max(0,ar-4)} fill={cb} opacity="0.9" rx="8">
                          <animate attributeName="height" from="0" to={Math.max(0,ar-4)} dur="1s" fill="freeze" />
                        </rect>
                        <rect x={ix} y={210} width={w} height={am} fill="url(#rivets)" opacity="0.5" rx="12" />

                        <rect x={ix+w/2-25} y="185" width="50" height="25" fill="#0f172a" rx="12" stroke={cbr} strokeWidth="2" />
                        <text x={ix+w/2} y="203" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                          {bodega.bodega.replace('Bodega ','B')}
                        </text>

                        <text x={ix+w/2} y={255} textAnchor="middle" fill="white" fontSize="15" fontWeight="800" fontFamily="DM Mono, monospace">
                          {fmtTM(bodega.tm,1)}
                        </text>
                        <text x={ix+w/2} y={272} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="600">TM</text>

                        <text x={ix+w/2} y={305} textAnchor="middle" fill="white" fontSize="18" fontWeight="900">{pct.toFixed(0)}%</text>

                        <rect x={ix+10} y={320} width={w-20} height="8" fill="#334155" rx="4" />
                        <rect x={ix+10} y={320} width={(w-20)*(pct/100)} height="8" fill={cb} rx="4">
                          <animate attributeName="width" from="0" to={(w-20)*(pct/100)} dur="1s" fill="freeze" />
                        </rect>

                        <rect x={ix+4} y={334} width={w-8} height={32} fill="rgba(0,0,0,0.35)" rx="6" />
                        <text x={ix+w/2} y={345} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7.5" fontWeight="700" letterSpacing="0.5">
                          {bucketLabel || 'ÚLT. BUCKET'}
                        </text>
                        <text x={ix+w/2} y={360} textAnchor="middle" fill={flujoColor} fontSize="12" fontWeight="900" fontFamily="DM Mono, monospace">
                          {flujoLabel} TM/h
                        </text>
                      </g>
                    );
                  })}

                  <text x="150"  y="420" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="18" fontWeight="600" fontFamily="DM Mono, monospace">⚓ PROA</text>
                  <text x="1250" y="420" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="18" fontWeight="600" fontFamily="DM Mono, monospace">POPA ⚓</text>
                  <text x="700"  y="310" textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize="28" fontWeight="800" fontFamily="DM Mono, monospace">
                    {barco.nombre.toUpperCase()}
                  </text>
                </g>
              </svg>
            </div>
            <div className="alm-ship-legend">
              <span className="alm-legend-item"><span style={{ background: '#10b981' }} className="alm-legend-dot" />Completada (100%)</span>
              <span className="alm-legend-item"><span style={{ background: '#f59e0b' }} className="alm-legend-dot" />&gt; 75%</span>
              <span className="alm-legend-item"><span style={{ background: '#3b82f6' }} className="alm-legend-dot" />En progreso</span>
              <span className="alm-legend-item"><span style={{ background: '#34d399' }} className="alm-legend-dot" />TM últ. bucket/h</span>
              <span className="alm-legend-item"><span style={{ background: '#fbbf24' }} className="alm-legend-dot" />Manifestado: {fmtTM(totalMetas, 2)} TM</span>
            </div>
          </div>

          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              📈 FLUJO POR HORA POR BODEGA (TM/h)
              <span>Últimas {Math.min(12, flujoPorHoraBodega.length)} horas</span>
            </h4>
            {flujoPorHoraBodega.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flujoPorHoraBodega} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hora"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const parts = v.split(' ');
                      return parts.length === 2 ? parts[1] : v;
                    }}
                  />
                  <YAxis tickFormatter={(v) => fmtTM(v, 1)} />
                  <Tooltip
                    formatter={(value) => fmtTM(value, 2) + ' TM'}
                    labelFormatter={(label) => `🕐 ${label}`}
                  />
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
              <div className="alm-no-data">
                {flujoPorHoraBodega.length === 1
                  ? "Solo hay datos de una hora, se necesitan al menos 2 horas para mostrar flujo por bodega"
                  : "No hay datos suficientes para mostrar flujo por bodega"}
              </div>
            )}
          </div>

          <AtrasosBarco barcoId={barco.id} />

          {/* TABLA DE VIAJES CON DETALLE EXPANDIBLE Y PAGINACIÓN */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <h3 className="alm-section-title">
                🚛 LISTADO DE VIAJES
                <span className="alm-badge">{registrosFiltrados.length} registros</span>
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {viajeExpandidoId && (
                  <button
                    onClick={() => setViajeExpandidoId(null)}
                    style={{
                      fontSize: 11,
                      background: '#f1f5f9',
                      border: 'none',
                      padding: '4px 12px',
                      borderRadius: 999,
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    Cerrar todos
                  </button>
                )}
              </div>
            </div>
            <div className="alm-table-scroll">
              <table className="alm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha/Hora</th>
                    <th>Placa</th>
                    <th>Remolque</th>
                    <th>Bodega</th>
                    <th className="alm-th-num">Sacos</th>
                    <th className="alm-th-num">TM</th>
                    <th className="alm-th-num">Dañados</th>
                    <th>Diferencia</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosPaginados.length > 0 ? registrosPaginados.map((viaje, idx) => {
                    const diferenciaPorcentaje = ((viaje.diferencia_kg || 0) / (viaje.peso_ingenio_kg || 1) * 100).toFixed(1);
                    const esDiferenciaAlta = viaje.diferencia_kg > 50;
                    const estaExpandido = viajeExpandidoId === viaje.id;
                    
                    return (
                      <React.Fragment key={viaje.id}>
                        <tr className={idx < 5 ? 'alm-tr-latest' : ''}>
                          <td style={{ fontSize: 11, color: '#94a3b8' }}>{viaje.viaje_numero || idx + 1}</td>
                          <td className="alm-mono" style={{ fontSize: 12 }}>
                            {dayjs(viaje.fecha_hora).format('DD/MM HH:mm')}
                          </td>
                          <td style={{ fontWeight: 600 }}>{viaje.placa_camion || '—'}</td>
                          <td>{viaje.placa_remolque || '—'}</td>
                          <td>{viaje.bodega || '—'}</td>
                          <td className="alm-td-num">{viaje.cantidad_paquetes || 0}</td>
                          <td className="alm-td-num alm-green">{fmtTM(viaje.peso_total_calculado_tm, 2)}</td>
                          <td className="alm-td-num" style={{ color: (viaje.paquetes_danados || 0) > 0 ? '#ef4444' : '#94a3b8' }}>
                            {viaje.paquetes_danados || 0}
                          </td>
                          <td className="alm-td-num">
                            <span style={{ 
                              color: esDiferenciaAlta ? '#ef4444' : '#10b981',
                              fontSize: 11,
                              fontWeight: esDiferenciaAlta ? 700 : 400
                            }}>
                              {viaje.diferencia_kg?.toFixed(0) || 0} kg ({diferenciaPorcentaje}%)
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => setViajeExpandidoId(estaExpandido ? null : viaje.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 12,
                                color: '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {estaExpandido ? <EyeOff size={14} /> : <Eye size={14} />}
                              {estaExpandido ? 'Ocultar' : 'Ver'}
                            </button>
                          </td>
                        </tr>
                        {estaExpandido && (
                          <tr>
                            <td colSpan={10} style={{ padding: 0 }}>
                              <ViajeDetalleExpandido 
                                viaje={viaje} 
                                onClose={() => setViajeExpandidoId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }) : (
                    <tr>
                      <td colSpan={10} style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No hay viajes registrados con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td colSpan={5} className="alm-bold">TOTALES</td>
                    <td className="alm-td-num alm-bold">{fmtNumber(statsGenerales.totalSacos)}</td>
                    <td className="alm-td-num alm-bold alm-green">{fmtTM(statsGenerales.totalTM, 2)}</td>
                    <td className="alm-td-num alm-bold">{fmtNumber(statsGenerales.totalDanados)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {registrosFiltrados.length > 0 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Mostrando {(paginaActual - 1) * registrosPorPagina + 1} - {Math.min(paginaActual * registrosPorPagina, registrosFiltrados.length)} de {registrosFiltrados.length}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Ver:</span>
                    <select
                      value={registrosPorPagina}
                      onChange={(e) => cambiarRegistrosPorPagina(Number(e.target.value))}
                      style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => irPagina(1)}
                    disabled={paginaActual === 1}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                      opacity: paginaActual === 1 ? 0.5 : 1,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <ChevronLeft size={14} /> Primera
                  </button>
                  <button
                    onClick={() => irPagina(paginaActual - 1)}
                    disabled={paginaActual === 1}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      cursor: paginaActual === 1 ? 'not-allowed' : 'pointer',
                      opacity: paginaActual === 1 ? 0.5 : 1,
                      fontSize: 12
                    }}
                  >
                    ←
                  </button>
                  
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: '#0f172a',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600
                  }}>
                    {paginaActual} / {totalPaginas}
                  </span>
                  
                  <button
                    onClick={() => irPagina(paginaActual + 1)}
                    disabled={paginaActual === totalPaginas}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                      opacity: paginaActual === totalPaginas ? 0.5 : 1,
                      fontSize: 12
                    }}
                  >
                    →
                  </button>
                  <button
                    onClick={() => irPagina(totalPaginas)}
                    disabled={paginaActual === totalPaginas}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer',
                      opacity: paginaActual === totalPaginas ? 0.5 : 1,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Última <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="alm-table-card">
            <div className="alm-table-header">
              <h3 className="alm-section-title">📊 RESUMEN POR BODEGA CON CANTIDADES MANIFESTADAS</h3>
              {filtroFecha.activo && (
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Mono', monospace" }}>
                  {dayjs(filtroFecha.inicio).format('DD/MM/YY HH:mm')} - {dayjs(filtroFecha.fin).format('DD/MM/YY HH:mm')}
                </span>
              )}
            </div>
            <div className="alm-table-scroll">
              <table className="alm-table">
                <thead>
                  <tr>
                    <th>Bodega</th>
                    <th className="alm-th-num">Viajes</th>
                    <th className="alm-th-num">Sacos</th>
                    <th className="alm-th-num">Actual (TM)</th>
                    <th className="alm-th-num">Manifestado (TM)</th>
                    <th className="alm-th-num">%</th>
                    <th className="alm-th-num">Faltante (TM)</th>
                    <th className="alm-th-num">Flujo/h</th>
                    <th className="alm-th-num">Últ. hora</th>
                    <th>Estado</th>
                    <th className="alm-th-num">Proyección</th>
                  </tr>
                </thead>
                <tbody>
                  {datosPorBodegaCompleto.map(b => {
                    const proy = proyeccionesBodega.find(p => p.bodega === b.bodega);
                    return (
                      <tr key={b.bodega}>
                        <td className="alm-bold">{b.bodega}</td>
                        <td className="alm-td-num">{b.viajes}</td>
                        <td className="alm-td-num">{fmtNumber(b.sacos)}</td>
                        <td className="alm-td-num alm-green">{fmtTM(b.tm, 2)}</td>
                        <td className="alm-td-num">{fmtTM(b.meta, 2)}</td>
                        <td className="alm-td-num alm-bold" style={{
                          color: b.completado ? '#10b981' : (b.porcentaje > 75 ? '#f59e0b' : '#3b82f6')
                        }}>
                          {b.porcentaje.toFixed(1)}%
                        </td>
                        <td className="alm-td-num" style={{ color: b.faltante > 0 ? '#ef4444' : '#10b981' }}>
                          {b.faltante > 0 ? fmtTM(b.faltante, 2) : '✓'}
                        </td>
                        <td className="alm-td-num">{b.flujoHora > 0 ? fmtTM(b.flujoHora, 2) : '—'}</td>
                        <td className="alm-td-num" style={{ color: '#10b981', fontWeight: 700 }}>
                          {b.flujoUltimaHora > 0 ? `${fmtTM(b.flujoUltimaHora, 2)} TM` : '—'}
                        </td>
                        <td>
                          {b.completado ? (
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>COMPLETADA</span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>EN PROGRESO</span>
                          )}
                        </td>
                        <td className="alm-td-num alm-amber">{proy?.fechaEstimada ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <td className="alm-bold">TOTAL</td>
                    <td className="alm-td-num alm-bold">{statsGenerales.totalViajes}</td>
                    <td className="alm-td-num alm-bold">{fmtNumber(statsGenerales.totalSacos)}</td>
                    <td className="alm-td-num alm-bold alm-green">{fmtTM(statsGenerales.totalTM, 2)}</td>
                    <td className="alm-td-num alm-bold">{fmtTM(totalMetas, 2)}</td>
                    <td className="alm-td-num alm-bold">{progresoGeneral.toFixed(1)}%</td>
                    <td className="alm-td-num alm-bold" style={{ color: '#ef4444' }}>
                      {fmtTM(Math.max(0, totalMetas - statsGenerales.totalTM), 2)}
                    </td>
                    <td className="alm-td-num alm-bold">{fmtTM(flujoPromedioGeneral, 2)}</td>
                    <td className="alm-td-num alm-bold" style={{ color: '#10b981' }}>
                      {fmtTM(flujoUltimaHora, 2)} TM
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            🔄 auto-refresh 30s &nbsp;·&nbsp; {barco.nombre} ({barco.codigo_barco}) &nbsp;·&nbsp; Registro de Sacos (Sacos Buenos = Total - Dañados)
            {filtroFecha.activo && (
              <> &nbsp;·&nbsp; Rango: {dayjs(filtroFecha.inicio).format('DD/MM/YY HH:mm')} - {dayjs(filtroFecha.fin).format('DD/MM/YY HH:mm')}</>
            )}
            {filtroPlaca && <> &nbsp;·&nbsp; Placa: {filtroPlaca}</>}
            {filtroRemolque && <> &nbsp;·&nbsp; Remolque: {filtroRemolque}</>}
            {busquedaGlobal && <> &nbsp;·&nbsp; Buscando: "{busquedaGlobal}"</>}
          </div>
        </div>
      </div>
    </>
  );
}