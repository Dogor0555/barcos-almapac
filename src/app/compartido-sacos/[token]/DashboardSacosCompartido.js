// app/compartido-sacos/[token]/DashboardSacosCompleto.js
"use client";

import { useEffect, useState, useMemo } from "react";
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
import { RefreshCw } from 'lucide-react';

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
// HELPER CRÍTICO: calcular minutos reales sin doble conteo
//
// Si en el mismo día tenemos:
//   Bodega 1: 06:30 → 08:50 (140 min)
//   Bodega 5: 06:30 → 08:50 (140 min)
// El tiempo REAL de paro es solo 140 min, no 280.
//
// Algoritmo: fusionar todos los intervalos del día en una línea de tiempo
// unificada (merge of overlapping intervals) y sumar solo los minutos cubiertos.
// ============================================================================
function mergeIntervalos(intervalos) {
  if (!intervalos.length) return 0;
  intervalos.sort((a, b) => a[0] - b[0]);
  let merged = [[...intervalos[0]]];
  for (let i = 1; i < intervalos.length; i++) {
    const ultimo = merged[merged.length - 1];
    const actual = intervalos[i];
    if (actual[0] <= ultimo[1]) {
      ultimo[1] = Math.max(ultimo[1], actual[1]);
    } else {
      merged.push([...actual]);
    }
  }
  return merged.reduce((sum, [ini, fin]) => sum + (fin - ini), 0);
}

function calcularMinutosReales(registros) {
  const porFecha = {};
  registros.forEach(reg => {
    if (!reg.hora_inicio || !reg.duracion_minutos) return;
    const fecha = reg.fecha;
    if (!porFecha[fecha]) porFecha[fecha] = [];
    const [hh, mm] = reg.hora_inicio.split(':').map(Number);
    const inicio = hh * 60 + mm;
    const fin    = inicio + (reg.duracion_minutos || 0);
    porFecha[fecha].push([inicio, fin]);
  });
  return Object.values(porFecha).reduce((total, ivs) => total + mergeIntervalos(ivs), 0);
}

function calcularMinutosRealesPorImputabilidad(registros, tiposParo) {
  const porFechaImp   = {};
  const porFechaNoImp = {};
  registros.forEach(reg => {
    if (!reg.hora_inicio || !reg.duracion_minutos) return;
    const tipo  = tiposParo.find(t => t.id === reg.tipo_paro_id);
    const fecha = reg.fecha;
    const [hh, mm] = reg.hora_inicio.split(':').map(Number);
    const inicio = hh * 60 + mm;
    const fin    = inicio + (reg.duracion_minutos || 0);
    const iv     = [inicio, fin];
    if (tipo?.es_imputable_almapac) {
      if (!porFechaImp[fecha])   porFechaImp[fecha]   = [];
      porFechaImp[fecha].push(iv);
    } else {
      if (!porFechaNoImp[fecha]) porFechaNoImp[fecha] = [];
      porFechaNoImp[fecha].push(iv);
    }
  });
  const sumar = (pf) => Object.values(pf).reduce((t, ivs) => t + mergeIntervalos(ivs), 0);
  return { imputables: sumar(porFechaImp), noImputables: sumar(porFechaNoImp) };
}

// ============================================================================
// COMPONENTE DE ATRASOS
// ============================================================================
function AtrasosBarco({ barcoId }) {
  const [atrasos, setAtrasos] = useState([]);
  const [tiposParo, setTiposParo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('semana');
  const [expandido, setExpandido] = useState(true);
  const [filtroBodega, setFiltroBodega] = useState('todas');
  const [stats, setStats] = useState({
    totalMinutos: 0, imputables: 0, noImputables: 0, porBodega: {}, porTipo: {}
  });

  useEffect(() => { if (barcoId) cargarDatos(); }, [barcoId, periodo]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const { data: tipos } = await supabase.from('tipos_paro').select('*').eq('activo', true);
      setTiposParo(tipos || []);

      const fechaLimite = obtenerFechaLimite();
      let query = supabase
        .from('registro_atrasos')
        .select('*, tipo_paro:tipos_paro(*)')
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });
      if (fechaLimite) query = query.gte('fecha', fechaLimite);

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
    switch (periodo) {
      case 'hoy':    return dayjs().format('YYYY-MM-DD');
      case 'semana': return dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      case 'mes':    return dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      default:       return null;
    }
  };

  const calcularEstadisticas = (registros, tipos) => {
    // Tiempo total real: merge de intervalos por día (sin doble conteo entre bodegas)
    const totalMinutos = calcularMinutosReales(registros);
    const { imputables, noImputables } = calcularMinutosRealesPorImputabilidad(registros, tipos);

    // Por bodega y por tipo: sumamos individual (info de cada bodega/tipo por separado)
    const porBodega = {}, porTipo = {};
    registros.forEach(reg => {
      const min = reg.duracion_minutos || 0;
      const bk  = reg.bodega_nombre || 'General';
      if (!porBodega[bk]) porBodega[bk] = { minutos: 0, count: 0 };
      porBodega[bk].minutos += min;
      porBodega[bk].count  += 1;
      const tipo = tipos.find(t => t.id === reg.tipo_paro_id);
      if (tipo) {
        if (!porTipo[tipo.nombre]) porTipo[tipo.nombre] = { minutos: 0, count: 0, imputable: tipo.es_imputable_almapac };
        porTipo[tipo.nombre].minutos += min;
        porTipo[tipo.nombre].count  += 1;
      }
    });
    setStats({ totalMinutos, imputables, noImputables, porBodega, porTipo });
  };

  const formatTiempo = (min) => {
    if (!min) return '0h 0m';
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const atrasosFiltrados = useMemo(() => {
    if (filtroBodega === 'todas')     return atrasos;
    if (filtroBodega === 'generales') return atrasos.filter(a => a.es_general);
    return atrasos.filter(a => a.bodega_nombre === filtroBodega);
  }, [atrasos, filtroBodega]);

  // Al filtrar por bodega recalculamos el total real también
  const statsFiltrados = useMemo(() => {
    if (filtroBodega === 'todas') return stats;
    const totalMinutos = calcularMinutosReales(atrasosFiltrados);
    const { imputables, noImputables } = calcularMinutosRealesPorImputabilidad(atrasosFiltrados, tiposParo);
    return { ...stats, totalMinutos, imputables, noImputables };
  }, [atrasosFiltrados, filtroBodega, tiposParo, stats]);

  const bodegasUnicas = useMemo(() => {
    const s = new Set();
    atrasos.forEach(a => { if (a.bodega_nombre) s.add(a.bodega_nombre); });
    return ['todas', 'generales', ...Array.from(s).sort()];
  }, [atrasos]);

  if (loading && !atrasos.length) {
    return (
      <div className="alm-table-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #f97316', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', marginRight: 8, verticalAlign: 'middle' }} />
        Cargando atrasos...
      </div>
    );
  }

  const s = statsFiltrados;
  const pctImputable   = s.totalMinutos > 0 ? (s.imputables   / s.totalMinutos * 100).toFixed(1) : '0.0';
  const pctNoImputable = s.totalMinutos > 0 ? (s.noImputables / s.totalMinutos * 100).toFixed(1) : '0.0';

  return (
    <div className="alm-table-card" style={{ marginBottom: 20 }}>

      {/* ── Cabecera colapsable ── */}
      <div
        className="alm-table-header"
        onClick={() => setExpandido(!expandido)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <h3 className="alm-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏱️</span>
          ATRASOS Y DEMORAS
          <span className="alm-badge">{atrasos.length} registros</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
            Tiempo real: <strong style={{ color: 'var(--text)' }}>{formatTiempo(s.totalMinutos)}</strong>
          </span>
          {s.imputables > 0 && (
            <>
              <span style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>ALMAPAC: </span>
                <strong style={{ color: '#d97706', fontFamily: "'DM Mono', monospace" }}>{formatTiempo(s.imputables)}</strong>
              </span>
              <span style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>Otros: </span>
                <strong style={{ color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>{formatTiempo(s.noImputables)}</strong>
              </span>
            </>
          )}
          <span style={{ fontSize: 20, color: 'var(--text-3)', lineHeight: 1 }}>{expandido ? '∧' : '∨'}</span>
        </div>
      </div>

      {expandido && (
        <div style={{ padding: '20px 20px 24px' }}>

          {/* Nota explicativa */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>ℹ️</span>
            <span>El <strong>tiempo real</strong> de paro no duplica atrasos simultáneos en distintas bodegas — se cuentan una sola vez por solapamiento.</span>
          </div>

          {/* ── Filtros ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 2 }}>
              {[
                { key: 'hoy',    label: 'Hoy'     },
                { key: 'semana', label: '7 días'  },
                { key: 'mes',    label: '30 días' },
                { key: 'todo',   label: 'Todo'    },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={e => { e.stopPropagation(); setPeriodo(p.key); }}
                  style={{
                    padding: '5px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, fontFamily: "'Sora', sans-serif", transition: 'all .15s',
                    background: periodo === p.key ? '#0f172a' : 'transparent',
                    color:      periodo === p.key ? '#fff'    : '#64748b',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              value={filtroBodega}
              onClick={e => e.stopPropagation()}
              onChange={e => setFiltroBodega(e.target.value)}
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#0f172a', cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}
            >
              {bodegasUnicas.map(b => (
                <option key={b} value={b}>
                  {b === 'todas' ? '📋 Todas las bodegas' : b === 'generales' ? '⚡ Solo generales' : `📦 ${b}`}
                </option>
              ))}
            </select>

            <button
              onClick={e => { e.stopPropagation(); cargarDatos(); }}
              style={{ marginLeft: 'auto', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#475569', fontFamily: "'Sora', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={13} /> Actualizar
            </button>
          </div>

          {/* ── KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Tiempo real de paro', value: formatTiempo(s.totalMinutos),    sub: `${atrasosFiltrados.length} registros`,  accent: '#0f172a' },
              { label: 'Imputables ALMAPAC',  value: formatTiempo(s.imputables),      sub: `${pctImputable}% del total`,            accent: '#d97706' },
              { label: 'Otros atrasos',       value: formatTiempo(s.noImputables),    sub: `${pctNoImputable}% del total`,          accent: '#dc2626' },
              { label: 'Bodegas afectadas',   value: Object.keys(s.porBodega).length, sub: 'incluyendo generales',                  accent: '#2563eb' },
            ].map(k => (
              <div key={k.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: k.accent, borderRadius: '2px 0 0 2px' }} />
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 6 }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: k.accent, fontFamily: "'DM Mono', monospace", lineHeight: 1.1 }}>{k.value}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Distribución por tipo ── */}
          {Object.keys(s.porTipo).length > 0 && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 Distribución por tipo de atraso
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>
                * Tiempo individual por tipo. El total general descuenta solapamientos entre bodegas.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(s.porTipo)
                  .sort((a, b) => b[1].minutos - a[1].minutos)
                  .map(([nombre, data]) => {
                    const totalBruto = Object.values(s.porTipo).reduce((acc, v) => acc + v.minutos, 0);
                    const pct   = totalBruto > 0 ? (data.minutos / totalBruto * 100) : 0;
                    const color = getTipoColor(nombre);
                    return (
                      <div key={nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: '#334155' }}>{nombre}</span>
                            {data.imputable && (
                              <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>ALMAPAC</span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: '#0f172a', fontWeight: 700 }}>
                            {formatTiempo(data.minutos)}
                            <span style={{ color: '#94a3b8', fontWeight: 400 }}> ({data.count} reg)</span>
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Tabla de registros ── */}
          <div className="alm-table-scroll">
            <table className="alm-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Bodega</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th className="alm-th-num">Duración</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {atrasosFiltrados.length > 0 ? atrasosFiltrados.map((atraso, idx) => {
                  const tipo  = tiposParo.find(t => t.id === atraso.tipo_paro_id);
                  const color = getTipoColor(tipo?.nombre);
                  return (
                    <tr key={atraso.id} className={idx < 5 ? 'alm-tr-latest' : ''}>
                      <td className="alm-mono" style={{ fontSize: 13 }}>{dayjs(atraso.fecha).format('DD/MM/YY')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ fontSize: 13, color: '#334155' }}>{tipo?.nombre ?? '—'}</span>
                          {tipo?.es_imputable_almapac && (
                            <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>A</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {atraso.es_general
                          ? <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>TODAS</span>
                          : <span style={{ color: '#475569' }}>{atraso.bodega_nombre || '—'}</span>
                        }
                      </td>
                      <td className="alm-mono" style={{ fontSize: 13 }}>{atraso.hora_inicio?.slice(0, 5)}</td>
                      <td className="alm-mono" style={{ fontSize: 13 }}>
                        {atraso.hora_fin
                          ? atraso.hora_fin.slice(0, 5)
                          : <span style={{ color: '#f97316', fontWeight: 700 }}>En curso</span>
                        }
                      </td>
                      <td className="alm-td-num alm-bold alm-mono">{formatTiempo(atraso.duracion_minutos)}</td>
                      <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {atraso.observaciones || '—'}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No hay registros de atrasos para este período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pie de resumen ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16, padding: '14px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#f59e0b', marginRight: 6, verticalAlign: 'middle' }} />
                <span style={{ color: '#64748b' }}>Imputable ALMAPAC: </span>
                <strong style={{ color: '#d97706', fontFamily: "'DM Mono', monospace" }}>{formatTiempo(s.imputables)}</strong>
              </span>
              <span style={{ fontSize: 13 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#ef4444', marginRight: 6, verticalAlign: 'middle' }} />
                <span style={{ color: '#64748b' }}>No imputable: </span>
                <strong style={{ color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>{formatTiempo(s.noImputables)}</strong>
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Tiempo real · sin doble conteo de solapamientos</span>
          </div>

        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER: parsear metas_json de forma segura
// ============================================================================
function parsearMetasJson(metasJson) {
  try {
    if (!metasJson) return {};
    let obj = typeof metasJson === "string" ? JSON.parse(metasJson) : metasJson;
    if (typeof obj === "string") obj = JSON.parse(obj);
    console.log("✅ metas_json parseado:", obj);
    const sacosBodega = obj?.sacos_bodega;
    if (!sacosBodega) { console.warn("❌ No existe sacos_bodega en:", obj); return {}; }
    return sacosBodega;
  } catch (e) {
    console.error("💥 Error parseando metas_json:", e, "| Valor recibido:", metasJson);
    return {};
  }
}

// ============================================================================
// HOOK
// ============================================================================
function useSacosData(barcoId) {
  const [data, setData] = useState({ registros: [], loading: true, error: null, lastUpdate: null });

  const cargarDatos = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      const { data: registros, error } = await supabase
        .from('registros_sacos').select('*').eq('barco_id', barcoId)
        .order('fecha', { ascending: false }).order('viaje_numero', { ascending: false });
      if (error) throw error;
      const registrosEnriquecidos = (registros || []).map(r => ({
        ...r,
        peso_total_calculado_kg: r.peso_saco_kg * r.cantidad_paquetes,
        peso_total_calculado_tm: (r.peso_saco_kg * r.cantidad_paquetes) / 1000,
        diferencia_kg: Math.abs((r.peso_saco_kg * r.cantidad_paquetes) - r.peso_ingenio_kg),
        porcentaje_diferencia: r.peso_ingenio_kg > 0 ? Math.abs(((r.peso_saco_kg * r.cantidad_paquetes) - r.peso_ingenio_kg) / r.peso_ingenio_kg * 100) : 0,
        fecha_hora: dayjs(`${r.fecha} ${r.hora_inicio}`).toISOString()
      }));
      setData({ registros: registrosEnriquecidos, loading: false, error: null, lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV) });
    } catch (error) {
      console.error("Error cargando datos de sacos:", error);
      setData(prev => ({ ...prev, loading: false, error: error.message || "Error al cargar datos", lastUpdate: dayjs().utc().tz(ZONA_HORARIA_SV) }));
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
// TOOLTIP / KPI CARD
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
  const { registros, loading, error, lastUpdate, refetch } = useSacosData(barco.id);

  const metasBodega = useMemo(() => {
    const metas = parsearMetasJson(barco.metas_json);
    console.log("🎯 Metas de bodega:", metas);
    return metas;
  }, [barco.metas_json]);

  const statsGenerales = useMemo(() => {
    const totalViajes  = registros.length;
    const totalSacos   = registros.reduce((sum, r) => sum + r.cantidad_paquetes, 0);
    const totalTM      = registros.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
    const totalDanados = registros.reduce((sum, r) => sum + (r.paquetes_danados || 0), 0);
    const placasMap = {};
    registros.forEach(r => {
      if (!placasMap[r.placa_camion]) placasMap[r.placa_camion] = { placa: r.placa_camion, viajes: 0, sacos: 0, tm: 0 };
      placasMap[r.placa_camion].viajes++;
      placasMap[r.placa_camion].sacos += r.cantidad_paquetes;
      placasMap[r.placa_camion].tm    += r.peso_total_calculado_tm;
    });
    return { totalViajes, totalSacos, totalTM, totalDanados,
      topPlacas: Object.values(placasMap).sort((a, b) => b.viajes - a.viajes).slice(0, 5)
    };
  }, [registros]);

  const flujoPorHora = useMemo(() => {
    if (registros.length === 0) return [];
    const ord = [...registros].sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());
    const map = new Map();
    ord.forEach(reg => {
      const hora = dayjs(reg.fecha_hora).format('YYYY-MM-DD HH:00');
      if (!map.has(hora)) map.set(hora, { hora: dayjs(reg.fecha_hora).format('HH:00'), horaCompleta: hora, toneladas: 0, viajes: 0, sacos: 0 });
      const d = map.get(hora);
      d.toneladas += reg.peso_total_calculado_tm;
      d.viajes    += 1;
      d.sacos     += reg.cantidad_paquetes;
    });
    return Array.from(map.values()).sort((a, b) => a.horaCompleta.localeCompare(b.horaCompleta)).slice(-24);
  }, [registros]);

  const flujoPromedioGeneral = useMemo(() => {
    if (registros.length < 2) return 0;
    const ord = [...registros].sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix());
    const horas = dayjs(ord[ord.length - 1].fecha_hora).diff(dayjs(ord[0].fecha_hora), 'hour', true);
    if (horas <= 0) return 0;
    return registros.reduce((sum, r) => sum + r.peso_total_calculado_tm, 0) / horas;
  }, [registros]);

  const flujoUltimaHora = useMemo(() => {
    if (registros.length === 0) return 0;
    const hace1Hora = dayjs().subtract(1, 'hour');
    return registros.filter(r => dayjs(r.fecha_hora).isAfter(hace1Hora)).reduce((sum, r) => sum + r.peso_total_calculado_tm, 0);
  }, [registros]);

  const totalMetas = useMemo(() => {
    const total = Object.values(metasBodega).reduce((sum, meta) => sum + (Number(meta) || 0), 0);
    console.log("📊 Total metas:", total);
    return total;
  }, [metasBodega]);

  const progresoGeneral = useMemo(() => {
    if (totalMetas === 0) return 0;
    return Math.min(100, (statsGenerales.totalTM / totalMetas) * 100);
  }, [statsGenerales.totalTM, totalMetas]);

  const datosPorBodegaCompleto = useMemo(() => {
    const bodegasMap = {};
    if (barco.bodegas_json) {
      const arr = typeof barco.bodegas_json === "string" ? JSON.parse(barco.bodegas_json) : barco.bodegas_json;
      if (Array.isArray(arr)) {
        arr.forEach(b => {
          bodegasMap[b.nombre] = { bodega: b.nombre, viajes: 0, sacos: 0, tm: 0, meta: Number(metasBodega[b.nombre]) || 0, flujoHora: 0 };
        });
      }
    }
    registros.forEach(r => {
      if (!bodegasMap[r.bodega]) bodegasMap[r.bodega] = { bodega: r.bodega, viajes: 0, sacos: 0, tm: 0, meta: Number(metasBodega[r.bodega]) || 0, flujoHora: 0 };
      bodegasMap[r.bodega].viajes++;
      bodegasMap[r.bodega].sacos += r.cantidad_paquetes;
      bodegasMap[r.bodega].tm    += r.peso_total_calculado_tm;
    });
    return Object.values(bodegasMap)
      .sort((a, b) => parseInt(b.bodega.match(/\d+/)?.[0] || "0") - parseInt(a.bodega.match(/\d+/)?.[0] || "0"))
      .map(b => {
        const rbs = registros.filter(r => r.bodega === b.bodega);
        if (rbs.length >= 2) {
          const ord   = [...rbs].sort((a, c) => dayjs(a.fecha_hora).unix() - dayjs(c.fecha_hora).unix());
          const horas = dayjs(ord[ord.length - 1].fecha_hora).diff(dayjs(ord[0].fecha_hora), 'hour', true);
          if (horas > 0) b.flujoHora = b.tm / horas;
        }
        if (b.meta > 0) {
          b.porcentaje = Math.min(100, (b.tm / b.meta) * 100);
          b.faltante   = Math.max(0, b.meta - b.tm);
          b.completado = b.tm >= b.meta;
        } else { b.porcentaje = 0; b.faltante = 0; b.completado = false; }
        return b;
      });
  }, [registros, metasBodega, barco.bodegas_json]);

  const flujoPorHoraBodega = useMemo(() => {
    if (registros.length === 0) return [];
    const ord = [...registros].sort((a, b) => dayjs(a.fecha_hora).unix() - dayjs(b.fecha_hora).unix()).slice(-48);
    const map = new Map();
    ord.forEach(reg => {
      const key = `${dayjs(reg.fecha_hora).format('YYYY-MM-DD HH:00')}|${reg.bodega}`;
      if (!map.has(key)) map.set(key, { hora: dayjs(reg.fecha_hora).format('HH:00'), bodega: reg.bodega, toneladas: 0 });
      map.get(key).toneladas += reg.peso_total_calculado_tm;
    });
    const horas   = [...new Set(Array.from(map.values()).map(v => v.hora))].sort();
    const bodegas = [...new Set(registros.map(r => r.bodega))];
    return horas.map(hora => {
      const dp = { hora };
      bodegas.forEach(bod => { const e = Array.from(map.values()).find(v => v.hora === hora && v.bodega === bod); dp[bod] = e ? e.toneladas : 0; });
      return dp;
    }).slice(-12);
  }, [registros]);

  const proyeccionesBodega = useMemo(() => {
    if (flujoPromedioGeneral === 0) return [];
    return datosPorBodegaCompleto.map(b => {
      if (b.meta === 0 || b.completado) return { ...b, fechaEstimada: null };
      const flujo = b.flujoHora > 0 ? b.flujoHora : flujoPromedioGeneral;
      const horas = b.faltante / flujo;
      return { ...b, horasRestantes: horas, fechaEstimada: dayjs().add(horas, 'hour').format('DD/MM HH:mm') };
    });
  }, [datosPorBodegaCompleto, flujoPromedioGeneral]);

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
        .alm-topbar { background: var(--navy); padding: 0 16px; display: flex; align-items: center; justify-content: space-between; height: 68px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,.18); }
        .alm-topbar-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .alm-logo { height: 32px; width: auto; object-fit: contain; filter: brightness(0) invert(1); flex-shrink: 0; }
        .alm-divider { width: 1px; height: 30px; background: rgba(255,255,255,.18); flex-shrink: 0; }
        .alm-ship-id { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .alm-ship-name { font-size: 14px; font-weight: 800; color: #fff; letter-spacing: -.3px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .alm-ship-code { font-size: 10px; color: rgba(255,255,255,.5); font-family: 'DM Mono', monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .alm-topbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .alm-status-pill { display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.3); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #6ee7b7; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
        .alm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; animation: pulse-dot 2s infinite; flex-shrink: 0; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } }
        .alm-update-container { display: none; }
        .alm-refresh-btn { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; color: rgba(255,255,255,.8); padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: 'Sora', sans-serif; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
        .alm-refresh-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
        @media (min-width: 768px) {
          .alm-topbar { padding: 0 24px; } .alm-logo { height: 36px; } .alm-ship-name { font-size: 15px; }
          .alm-update-container { display: block; }
          .alm-update-time { font-size: 11px; color: rgba(255,255,255,.4); font-family: 'DM Mono', monospace; }
        }
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 28px 24px 48px; }
        .alm-kpis-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .alm-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; align-items: flex-start; gap: 14px; box-shadow: var(--shadow); position: relative; overflow: hidden; }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--accent); }
        .alm-kpi-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
        .alm-kpi-body { flex: 1; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); margin-bottom: 4px; }
        .alm-kpi-value { font-size: 22px; font-weight: 900; color: var(--text); line-height: 1.1; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: var(--text-3); margin-top: 3px; }
        .alm-kpi-bar { position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent); border-radius: 0 2px 2px 0; }
        @keyframes count-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .alm-pulse-num { animation: count-up .6s ease; }
        .alm-progress-container { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow); }
        .alm-progress-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .alm-progress-title { font-size: 14px; font-weight: 700; color: var(--text-2); display: flex; align-items: center; gap: 8px; }
        .alm-progress-stats { display: flex; gap: 20px; font-size: 13px; flex-wrap: wrap; }
        .alm-progress-stat { display: flex; align-items: center; gap: 6px; }
        .alm-progress-stat-label { color: var(--text-3); font-size: 12px; }
        .alm-progress-stat-value { font-weight: 700; color: var(--text); font-family: 'DM Mono', monospace; font-size: 13px; }
        .alm-progress-bar-container { width: 100%; height: 28px; background: #1e293b; border-radius: 14px; overflow: hidden; position: relative; }
        .alm-progress-bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 14px; transition: width 1s cubic-bezier(.4,0,.2,1); display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; color: white; font-size: 12px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.4); min-width: 0; position: relative; }
        .alm-progress-bar-fill::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%); border-radius: inherit; pointer-events: none; }
        .alm-progress-pct-outside { margin-top: 6px; text-align: right; font-size: 12px; font-weight: 700; color: var(--text-2); font-family: 'DM Mono', monospace; }
        .alm-progress-markers { display: flex; justify-content: space-between; margin-top: 8px; color: var(--text-3); font-size: 11px; padding: 0 4px; }
        .alm-chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); margin-bottom: 20px; }
        .alm-chart-title { font-size: 13px; font-weight: 700; color: var(--text-2); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
        .alm-no-data { height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-3); font-size: 13px; }
        .alm-tooltip { background: var(--navy); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 10px 14px; box-shadow: 0 4px 16px rgba(0,0,0,.3); }
        .alm-tooltip-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.6); margin-bottom: 4px; font-family: 'DM Mono', monospace; }
        .alm-tooltip-value { font-size: 12px; font-family: 'DM Mono', monospace; color: rgba(255,255,255,.9); }
        .alm-ship-layout { background: linear-gradient(145deg, #0b1a2e 0%, #0f172a 100%); border-radius: 24px; padding: 24px 16px; margin-bottom: 28px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(59,130,246,0.3); position: relative; overflow: hidden; }
        .alm-ship-layout::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #3b82f6, #10b981, #f59e0b, transparent); opacity: 0.5; }
        .alm-ship-title { font-size: 16px; font-weight: 800; color: white; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 0 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 2; }
        .alm-ship-title span:first-child { background: rgba(255,255,255,0.1); padding: 6px 18px; border-radius: 40px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
        .alm-ship-container { position: relative; width: 100%; overflow-x: auto; overflow-y: hidden; padding: 8px 0; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #10b981 #1e293b; }
        .alm-ship-container::-webkit-scrollbar { height: 6px; }
        .alm-ship-container::-webkit-scrollbar-track { background: #1e293b; border-radius: 10px; }
        .alm-ship-container::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        .alm-ship-svg { min-width: 900px; width: 100%; height: auto; display: block; }
        .alm-ship-legend { display: flex; gap: 12px; margin-top: 16px; justify-content: center; padding: 12px 16px; background: rgba(0,0,0,0.4); border-radius: 60px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap; }
        .alm-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 600; }
        .alm-legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }
        .alm-table-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; margin-top: 20px; }
        .alm-table-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: #f8fafc; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .alm-section-title { font-size: 15px; font-weight: 800; color: var(--text); }
        .alm-badge { margin-left: 10px; font-size: 11px; font-weight: 600; background: #e2e8f0; color: var(--text-2); padding: 2px 9px; border-radius: 999px; }
        .alm-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .alm-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1000px; }
        .alm-table thead { background: #f8fafc; position: sticky; top: 0; z-index: 2; }
        .alm-table th { padding: 11px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--text-3); border-bottom: 1px solid var(--border); white-space: nowrap; }
        .alm-table td { padding: 11px 16px; color: var(--text-2); white-space: nowrap; }
        .alm-table tbody tr:hover { background: #f8fafc; }
        .alm-th-num, .alm-td-num { text-align: right; }
        .alm-tr-latest { background: #eff6ff !important; }
        .alm-bold { font-weight: 700; color: var(--text) !important; }
        .alm-green { color: var(--green) !important; }
        .alm-amber { color: var(--amber) !important; }
        .alm-red { color: #ef4444 !important; }
        .alm-mono { font-family: 'DM Mono', monospace; }
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: var(--text-3); font-family: 'DM Mono', monospace; margin-top: 20px; }
        .alm-splash { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--navy); gap: 20px; }
        .alm-splash-logo { height: 48px; filter: brightness(0) invert(1); }
        .alm-splash-ship { font-size: 64px; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .alm-splash-text { color: rgba(255,255,255,.6); font-size: 16px; font-weight: 600; }
        .alm-loader { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,.1); border-top-color: #10b981; border-radius: 50%; animation: spin .8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .alm-error-box { background: #fff; border-radius: 20px; padding: 36px; text-align: center; max-width: 380px; }
        .alm-error-title { font-size: 18px; font-weight: 700; color: #dc2626; margin-bottom: 8px; }
        .alm-error-msg { font-size: 13px; color: var(--text-2); margin-bottom: 20px; }
        .alm-retry-btn { background: #fee2e2; border: none; border-radius: 10px; color: #dc2626; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Sora', sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        @media (max-width: 768px) {
          .alm-body { padding: 16px 12px 40px; }
          .alm-kpis-row { grid-template-columns: 1fr 1fr; gap: 10px; }
          .alm-kpi { padding: 14px 12px; gap: 10px; }
          .alm-kpi-icon { font-size: 22px; } .alm-kpi-value { font-size: 18px; }
          .alm-ship-layout { padding: 16px 8px; border-radius: 16px; margin-left: -4px; margin-right: -4px; }
          .alm-ship-title { font-size: 13px; flex-direction: column; align-items: flex-start; gap: 6px; }
          .alm-ship-title span:first-child { padding: 5px 14px; font-size: 12px; width: 100%; text-align: center; }
          .alm-ship-svg { min-width: 850px; }
          .alm-ship-legend { gap: 8px; padding: 10px 12px; border-radius: 20px; flex-wrap: wrap; justify-content: flex-start; }
          .alm-legend-item { font-size: 10px; gap: 4px; } .alm-legend-dot { width: 8px; height: 8px; }
          .alm-progress-stats { flex-direction: column; gap: 6px; }
        }
        @media (max-width: 480px) {
          .alm-kpis-row { grid-template-columns: 1fr 1fr; }
          .alm-kpi-label { font-size: 9px; } .alm-kpi-value { font-size: 16px; }
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

          {/* KPIs */}
          <div className="alm-kpis-row">
            <KpiCard label="Total Viajes"    value={statsGenerales.totalViajes}                icon="🚛" accent="#10b981" animate />
            <KpiCard label="Total Sacos"     value={fmtNumber(statsGenerales.totalSacos)}      icon="📦" accent="#3b82f6" animate />
            <KpiCard label="Total Toneladas" value={`${fmtTM(statsGenerales.totalTM, 2)} TM`} icon="⚖️" accent="#f59e0b" animate />
            <KpiCard label="Sacos Dañados"   value={fmtNumber(statsGenerales.totalDanados)}    icon="⚠️" accent="#ef4444"
              sub={`${statsGenerales.totalDanados > 0 ? ((statsGenerales.totalDanados / statsGenerales.totalSacos) * 100).toFixed(1) : 0}% del total`} />
          </div>

          {/* PROGRESO GENERAL */}
          <div className="alm-progress-container">
            <div className="alm-progress-header">
              <div className="alm-progress-title">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                Progreso general de la operación
              </div>
              <div className="alm-progress-stats">
                <div className="alm-progress-stat"><span className="alm-progress-stat-label">Meta:</span><span className="alm-progress-stat-value">{fmtTM(totalMetas, 2)} TM</span></div>
                <div className="alm-progress-stat"><span className="alm-progress-stat-label">Actual:</span><span className="alm-progress-stat-value alm-green">{fmtTM(statsGenerales.totalTM, 2)} TM</span></div>
                <div className="alm-progress-stat"><span className="alm-progress-stat-label">Faltante:</span><span className="alm-progress-stat-value alm-red">{fmtTM(Math.max(0, totalMetas - statsGenerales.totalTM), 2)} TM</span></div>
              </div>
            </div>
            <div className="alm-progress-bar-container">
              <div className="alm-progress-bar-fill" style={{ width: `${progresoGeneral}%` }}>
                {progresoGeneral >= 8 && `${progresoGeneral.toFixed(1)}%`}
              </div>
            </div>
            {progresoGeneral < 8 && <div className="alm-progress-pct-outside">{progresoGeneral.toFixed(1)}% completado</div>}
            <div className="alm-progress-markers"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
          </div>

          {/* FLUJO POR HORA */}
          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              ⏱️ FLUJO POR HORA (TM/h)
              <span>Promedio: {fmtTM(flujoPromedioGeneral, 2)} TM/h | Última hora: {fmtTM(flujoUltimaHora, 2)} TM</span>
            </h4>
            {flujoPorHora.length > 1 ? (
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={flujoPorHora}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis yAxisId="left"  tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => fmtNumber(v, 0)} />
                  <Tooltip formatter={(value, name) => name === 'toneladas' ? [fmtTM(value, 2) + ' TM', 'Toneladas'] : name === 'viajes' ? [value + ' viajes', 'Viajes'] : [value, name]} />
                  <Bar  yAxisId="left"  dataKey="toneladas" fill="#10b981" name="Toneladas" barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="viajes" stroke="#f59e0b" strokeWidth={2} name="Viajes" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <div className="alm-no-data">Se necesitan al menos 2 horas de datos para mostrar flujo</div>}
          </div>

          {/* BARCO SVG */}
          <div className="alm-ship-layout">
            <div className="alm-ship-title">
              <span>⚓ DISTRIBUCIÓN DE CARGA POR BODEGA</span>
              <span>Total: {fmtTM(statsGenerales.totalTM, 2)} TM / {fmtTM(totalMetas, 2)} TM</span>
            </div>
            <div className="alm-ship-container">
              <svg viewBox="0 0 1000 440" xmlns="http://www.w3.org/2000/svg" className="alm-ship-svg" preserveAspectRatio="xMidYMid meet">
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
                  <rect x="0" y="350" width="1400" height="200" fill="url(#oceanWater)" />
                  <path d="M0 380 Q150 360, 300 380 T600 380 T900 380 T1200 380 T1400 380" stroke="#60a5fa" strokeWidth="3" fill="none" opacity="0.3" />
                  <path d="M0 420 Q200 400, 400 420 T800 420 T1200 420" stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.2" />
                  <path d="M150 350 L200 200 L1200 200 L1250 350 Z" fill="url(#hullMetal)" stroke="#94a3b8" strokeWidth="6" />
                  <line x1="170" y1="300" x2="1230" y2="300" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 10" opacity="0.6" />
                  <rect x="200" y="180" width="1000" height="30" fill="url(#deckWood)" stroke="#b45309" strokeWidth="2" rx="4" />
                  <line x1="220" y1="150" x2="1180" y2="150" stroke="#cbd5e0" strokeWidth="3" />
                  <line x1="220" y1="140" x2="1180" y2="140" stroke="#cbd5e0" strokeWidth="2" />
                  {[250,350,450,550,650,750,850,950,1050,1150].map(x => (<rect key={x} x={x-2} y="130" width="4" height="30" fill="#94a3b8" rx="2" />))}
                  <rect x="400" y="30" width="12" height="120" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                  <circle cx="406" cy="20" r="18" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
                  <rect x="1000" y="50" width="8" height="100" fill="#8b5a2b" stroke="#5f3e1f" strokeWidth="2" />
                  <circle cx="1004" cy="40" r="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                  <rect x="650" y="40" width="70" height="140" fill="#475569" stroke="#334155" strokeWidth="3" rx="6" />
                  <ellipse cx="685" cy="40" rx="35" ry="12" fill="#334155" stroke="#1f2937" strokeWidth="2" />
                  <circle cx="685" cy="25" r="12" fill="#94a3b8" opacity="0.4"><animate attributeName="r" values="12;15;12" dur="3s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite" /></circle>
                  <circle cx="705" cy="15" r="8" fill="#cbd5e0" opacity="0.3"><animate attributeName="r" values="8;11;8" dur="2.5s" repeatCount="indefinite" /></circle>
                  <rect x="500" y="100" width="200" height="60" fill="#1f2937" stroke="#4b5563" strokeWidth="3" rx="8" />
                  <circle cx="540" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                  <circle cx="600" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                  <circle cx="660" cy="130" r="10" fill="#60a5fa" stroke="#93c5fd" strokeWidth="2" />
                  <path d="M150 350 L130 300 L180 200 L200 200 L150 350" fill="#4a5568" stroke="#718096" strokeWidth="3" />
                  <circle cx="140" cy="285" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                  <line x1="140" y1="277" x2="140" y2="293" stroke="#d97706" strokeWidth="2" />
                  <line x1="132" y1="285" x2="148" y2="285" stroke="#d97706" strokeWidth="2" />
                  <path d="M1250 350 L1270 300 L1220 200 L1200 200 L1250 350" fill="#4a5568" stroke="#718096" strokeWidth="3" />
                  <circle cx="1260" cy="285" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                  {datosPorBodegaCompleto.map((bodega, index) => {
                    const total = datosPorBodegaCompleto.length;
                    const aw = 700 / total;
                    const ix = 300 + (index * aw) + (aw * 0.1);
                    const w  = aw * 0.8;
                    const am = 160;
                    const pct = Math.min(100, bodega.porcentaje || 0);
                    const ar  = (am * pct) / 100;
                    let cb = "#3b82f6", cbr = "#2563eb";
                    if (bodega.completado)    { cb = "#10b981"; cbr = "#059669"; }
                    else if (pct > 75)        { cb = "#f59e0b"; cbr = "#d97706"; }
                    return (
                      <g key={bodega.bodega}>
                        <rect x={ix} y={190} width={w} height={am} fill="#1e293b" stroke={cbr} strokeWidth="4" rx="12" />
                        <rect x={ix+4} y={190+(am-ar)} width={w-8} height={Math.max(0,ar-4)} fill={cb} opacity="0.9" rx="8">
                          <animate attributeName="height" from="0" to={Math.max(0,ar-4)} dur="1s" fill="freeze" />
                        </rect>
                        <rect x={ix} y={190} width={w} height={am} fill="url(#rivets)" opacity="0.5" rx="12" />
                        <rect x={ix+w/2-25} y="165" width="50" height="25" fill="#0f172a" rx="12" stroke={cbr} strokeWidth="2" />
                        <text x={ix+w/2} y="183" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{bodega.bodega.replace('Bodega ','B')}</text>
                        <text x={ix+w/2} y={230} textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily="DM Mono, monospace">{fmtTM(bodega.tm,1)}</text>
                        <text x={ix+w/2} y={250} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="600">TM</text>
                        <text x={ix+w/2} y={310} textAnchor="middle" fill="white" fontSize="16" fontWeight="900">{pct.toFixed(0)}%</text>
                        <rect x={ix+15} y={330} width={w-30} height="8" fill="#334155" rx="4" />
                        <rect x={ix+15} y={330} width={(w-30)*(pct/100)} height="8" fill={cb} rx="4">
                          <animate attributeName="width" from="0" to={(w-30)*(pct/100)} dur="1s" fill="freeze" />
                        </rect>
                      </g>
                    );
                  })}
                  <text x="150"  y="380" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="18" fontWeight="600" fontFamily="DM Mono, monospace">⚓ PROA</text>
                  <text x="1250" y="380" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="18" fontWeight="600" fontFamily="DM Mono, monospace">POPA ⚓</text>
                  <text x="700"  y="280" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="28" fontWeight="800" fontFamily="DM Mono, monospace">{barco.nombre.toUpperCase()}</text>
                </g>
              </svg>
            </div>
            <div className="alm-ship-legend">
              <span className="alm-legend-item"><span style={{ background: '#10b981' }} className="alm-legend-dot" />Completada (100%)</span>
              <span className="alm-legend-item"><span style={{ background: '#f59e0b' }} className="alm-legend-dot" />&gt; 75%</span>
              <span className="alm-legend-item"><span style={{ background: '#3b82f6' }} className="alm-legend-dot" />En progreso</span>
              <span className="alm-legend-item"><span style={{ background: '#fbbf24' }} className="alm-legend-dot" />Cantidad Manifestada: {fmtTM(totalMetas, 2)} TM</span>
            </div>
          </div>

          {/* FLUJO POR HORA POR BODEGA */}
          <div className="alm-chart-card">
            <h4 className="alm-chart-title">📈 FLUJO POR HORA POR BODEGA (TM/h)<span>Últimas 12 horas</span></h4>
            {flujoPorHoraBodega.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={flujoPorHoraBodega} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" /><YAxis tickFormatter={(v) => fmtTM(v, 1)} />
                  <Tooltip formatter={(value) => fmtTM(value, 2) + ' TM'} /><Legend />
                  {datosPorBodegaCompleto.map((bodega, index) => (
                    <Bar key={bodega.bodega} dataKey={bodega.bodega} stackId="a" fill={COLORES[index % COLORES.length]} name={bodega.bodega} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="alm-no-data">Se necesitan más datos para mostrar flujo por bodega</div>}
          </div>

          {/* ATRASOS */}
          <AtrasosBarco barcoId={barco.id} />

          {/* TABLA RESUMEN POR BODEGA */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <h3 className="alm-section-title">📊 RESUMEN POR BODEGA CON CANTIDADES MANIFESTADAS</h3>
            </div>
            <div className="alm-table-scroll">
              <table className="alm-table">
                <thead>
                  <tr>
                    <th>Bodega</th><th className="alm-th-num">Viajes</th><th className="alm-th-num">Sacos</th>
                    <th className="alm-th-num">Actual (TM)</th><th className="alm-th-num">Cantidad Manifestada (TM)</th>
                    <th className="alm-th-num">%</th><th className="alm-th-num">Faltante (TM)</th>
                    <th className="alm-th-num">Flujo/h</th><th>Estado</th><th className="alm-th-num">Proyección</th>
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
                        <td className="alm-td-num alm-bold" style={{ color: b.completado ? '#10b981' : (b.porcentaje > 75 ? '#f59e0b' : '#3b82f6') }}>{b.porcentaje.toFixed(1)}%</td>
                        <td className="alm-td-num" style={{ color: b.faltante > 0 ? '#ef4444' : '#10b981' }}>{b.faltante > 0 ? fmtTM(b.faltante, 2) : '✓'}</td>
                        <td className="alm-td-num">{b.flujoHora > 0 ? fmtTM(b.flujoHora, 2) : '—'}</td>
                        <td>{b.completado ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>COMPLETADA</span> : <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>EN PROGRESO</span>}</td>
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
                    <td className="alm-td-num alm-bold" style={{ color: '#ef4444' }}>{fmtTM(Math.max(0, totalMetas - statsGenerales.totalTM), 2)}</td>
                    <td className="alm-td-num alm-bold">{fmtTM(flujoPromedioGeneral, 2)}</td>
                    <td></td><td></td>
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