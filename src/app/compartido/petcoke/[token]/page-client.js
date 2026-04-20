// compartido/petcoke/[token]/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('es')

const ZONA_HORARIA_SV = "America/El_Salvador"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const COLORES = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"]

const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000"
  const valor = Number(tm).toFixed(d)
  const partes = valor.split(".")
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return partes.join(".")
}

function usePetCokeData(token) {
  const [data, setData] = useState({
    barco: null,
    producto: null,
    registros: [],
    loading: true,
    error: null,
    lastUpdate: null
  })

  const cargar = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      // Buscar barco por token
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        throw new Error('Barco no encontrado')
      }

      // Buscar producto PC-001
      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', 'PC-001')
        .single()

      if (productoError || !productoData) {
        throw new Error('Producto PET COKE no encontrado')
      }

      // Buscar registros
      const { data: registrosData, error: registrosError } = await supabase
        .from('petcoke_registros')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('correlativo', { ascending: true })

      if (registrosError) throw registrosError

      setData({
        barco: barcoData,
        producto: productoData,
        registros: registrosData || [],
        loading: false,
        error: null,
        lastUpdate: dayjs().tz(ZONA_HORARIA_SV)
      })
    } catch (error) {
      console.error('Error:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [token])

  return { ...data, refetch: cargar }
}

export default function ClientPage({ token }) {
  const { barco, producto, registros, loading, error, lastUpdate, refetch } = usePetCokeData(token)

  const estadisticas = useMemo(() => {
    if (!registros.length) return {
      totalNeto: 0,
      totalBruto: 0,
      totalViajes: 0,
      porTransporte: {},
      porDia: {},
      porPatio: {},
      acumuladoPorCorrelativo: []
    }

    const totalNeto = registros.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
    const totalBruto = registros.reduce((s, r) => s + (r.peso_bruto_updp_tm || 0), 0)
    const totalViajes = registros.length

    const porTransporte = {}
    registros.forEach(r => {
      const t = r.transporte || 'DESCONOCIDO'
      porTransporte[t] = (porTransporte[t] || 0) + (r.peso_neto_updp_tm || 0)
    })

    const porDia = {}
    registros.forEach(r => {
      const dia = r.fecha
      porDia[dia] = (porDia[dia] || 0) + (r.peso_neto_updp_tm || 0)
    })

    const porPatio = {}
    registros.forEach(r => {
      const p = r.patio || 'SIN PATIO'
      porPatio[p] = (porPatio[p] || 0) + (r.peso_neto_updp_tm || 0)
    })

    // Acumulado progresivo
    let acumulado = 0
    const acumuladoPorCorrelativo = registros.map(r => {
      acumulado += r.peso_neto_updp_tm || 0
      return {
        correlativo: r.correlativo,
        peso: r.peso_neto_updp_tm,
        acumulado: acumulado
      }
    })

    return { totalNeto, totalBruto, totalViajes, porTransporte, porDia, porPatio, acumuladoPorCorrelativo }
  }, [registros])

  if (loading && !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🪨</div>
          <p style={{ color: '#94a3b8' }}>Cargando datos de Pet Coke...</p>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f97316', borderRadius: '50%', margin: '20px auto', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (error || !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#ef4444' }}>Error</h1>
          <p style={{ color: '#94a3b8' }}>{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    )
  }

  const datosGraficoAcumulado = estadisticas.acumuladoPorCorrelativo.map(item => ({
    correlativo: `#${item.correlativo}`,
    peso: item.peso,
    acumulado: item.acumulado
  }))

  const datosGraficoTransporte = Object.entries(estadisticas.porTransporte).map(([name, value]) => ({ name, value }))
  const datosGraficoDia = Object.entries(estadisticas.porDia).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #f1f5f9; --text-2: #94a3b8; --orange: #f97316; --orange-dark: #ea580c; }
        body { background: var(--bg); font-family: 'Sora', sans-serif; }
        .alm-petcoke-root { min-height: 100vh; background: var(--bg); }
        .alm-topbar { background: #0f172a; border-bottom: 1px solid var(--border); padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .alm-logo { height: 32px; filter: brightness(0) invert(1); }
        .alm-ship-name { font-weight: 800; color: white; font-size: 14px; }
        .alm-ship-code { font-size: 10px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-refresh-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 12px; color: white; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .alm-refresh-btn:hover { background: rgba(255,255,255,0.15); }
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 28px 24px 48px; }
        .alm-kpis-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .alm-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--orange); }
        .alm-kpi-icon { font-size: 28px; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
        .alm-kpi-value { font-size: 28px; font-weight: 900; color: white; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
        .alm-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .alm-chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .alm-chart-wide { grid-column: 1 / -1; }
        .alm-chart-title { font-size: 14px; font-weight: 700; color: white; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .alm-table-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 24px; }
        .alm-table-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: #0f172a; }
        .alm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .alm-table th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid var(--border); }
        .alm-table td { padding: 12px 16px; color: #cbd5e1; border-bottom: 1px solid var(--border); }
        .alm-table tbody tr:hover { background: rgba(249, 115, 22, 0.05); }
        .alm-table .alm-td-num { text-align: right; }
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-badge { background: rgba(249, 115, 22, 0.2); color: #f97316; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 8px; }
        .alm-progress-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .alm-progress-track { height: 12px; background: #334155; border-radius: 999px; overflow: hidden; margin: 12px 0; }
        .alm-progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #fb923c); border-radius: 999px; transition: width 1s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) { .alm-charts-row { grid-template-columns: 1fr; } .alm-body { padding: 16px; } }
      `}</style>

      <div className="alm-petcoke-root">
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
            <div style={{ width: '1px', height: '30px', background: '#334155' }} />
            <div>
              <div className="alm-ship-name">{barco.nombre}</div>
              <div className="alm-ship-code">#{barco.codigo_barco} · Pet Coke</div>
            </div>
          </div>
          <button onClick={refetch} className="alm-refresh-btn">
            <span>🔄</span> Actualizar
          </button>
        </header>

        <div className="alm-body">
          {/* KPIs */}
          <div className="alm-kpis-row">
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🪨</div>
              <div>
                <div className="alm-kpi-label">Total Descargado</div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.totalNeto, 2)} TM</div>
                <div className="alm-kpi-sub">Peso Neto UPDP</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🚛</div>
              <div>
                <div className="alm-kpi-label">Total Viajes</div>
                <div className="alm-kpi-value">{estadisticas.totalViajes}</div>
                <div className="alm-kpi-sub">Unidades procesadas</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">⚖️</div>
              <div>
                <div className="alm-kpi-label">Promedio por Viaje</div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.totalNeto / (estadisticas.totalViajes || 1), 2)} TM</div>
                <div className="alm-kpi-sub">Peso promedio</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🏭</div>
              <div>
                <div className="alm-kpi-label">Transportistas</div>
                <div className="alm-kpi-value">{Object.keys(estadisticas.porTransporte).length}</div>
                <div className="alm-kpi-sub">Empresas diferentes</div>
              </div>
            </div>
          </div>

          {/* Progreso (si hay meta configurada) */}
          {barco.metas_json?.limites?.['PC-001'] > 0 && (
            <div className="alm-progress-hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'white' }}>Progreso de Descarga</span>
                <span style={{ color: '#f97316', fontWeight: 'bold' }}>
                  {((estadisticas.totalNeto / barco.metas_json.limites['PC-001']) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="alm-progress-track">
                <div className="alm-progress-fill" style={{ width: `${Math.min(100, (estadisticas.totalNeto / barco.metas_json.limites['PC-001']) * 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>0 TM</span>
                <span>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(barco.metas_json.limites['PC-001'], 0)} TM</span>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="alm-charts-row">
            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <span>📊</span> Descarga por Transporte
              </div>
              {datosGraficoTransporte.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={datosGraficoTransporte} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoTransporte.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <span>📈</span> Descarga por Día
              </div>
              {datosGraficoDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={datosGraficoDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                    <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card alm-chart-wide">
              <div className="alm-chart-title">
                <span>📈</span> Evolución Acumulada de Descarga
              </div>
              {datosGraficoAcumulado.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={datosGraficoAcumulado}>
                    <defs>
                      <linearGradient id="acumuladoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="correlativo" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                    <Area type="monotone" dataKey="acumulado" stroke="#f97316" strokeWidth={2} fill="url(#acumuladoGrad)" name="Acumulado Total" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Se necesitan al menos 2 registros</div>}
            </div>
          </div>

          {/* Tabla de registros */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span>
                <span style={{ fontWeight: 'bold', color: 'white' }}>Registros de Descarga</span>
                <span className="alm-badge">{registros.length} viajes</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="alm-table">
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                  <tr>
                    <th>#</th>
                    <th>Placa</th>
                    <th>Transporte</th>
                    <th>Fecha</th>
                    <th>Hora Entrada</th>
                    <th>Hora Salida</th>
                    <th>Tiempo</th>
                    <th>Patio</th>
                    <th>Bodega</th>
                    <th className="alm-td-num">Peso Bruto</th>
                    <th className="alm-td-num">Peso Neto</th>
                    <th className="alm-td-num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((reg) => (
                    <tr key={reg.id}>
                      <td>{reg.correlativo}</td>
                      <td><span style={{ fontFamily: 'monospace', color: '#f97316' }}>{reg.placa}</span></td>
                      <td>{reg.transporte || '—'}</td>
                      <td>{reg.fecha}</td>
                      <td>{reg.hora_entrada || '—'}</td>
                      <td>{reg.hora_salida || '—'}</td>
                      <td style={{ color: '#4ade80' }}>{reg.tiempo_atencion || '—'}</td>
                      <td>{reg.patio || '—'}</td>
                      <td>{reg.bodega_barco || '—'}</td>
                      <td className="alm-td-num" style={{ color: '#60a5fa' }}>{reg.peso_bruto_updp_tm?.toFixed(3) || '—'}</td>
                      <td className="alm-td-num" style={{ color: '#4ade80', fontWeight: 'bold' }}>{reg.peso_neto_updp_tm?.toFixed(3)}</td>
                      <td className="alm-td-num" style={{ color: '#fbbf24' }}>{reg.acumulado_updp_tm?.toFixed(3) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            🔄 auto-refresh 30s · {barco.nombre} · ALMAPAC · {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 2)} TM descargadas
          </div>
        </div>
      </div>
    </>
  )
}