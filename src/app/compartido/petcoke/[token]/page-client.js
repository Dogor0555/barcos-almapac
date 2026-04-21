// compartido/petcoke/[token]/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, LineChart, Line
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

const PESO_MINIMO = 22
const PESO_MAXIMO = 25

const COLORES = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"]
const COLORES_PATIO = { "NORTE": "#3b82f6", "SUR": "#22c55e" }

const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000"
  const valor = Number(tm).toFixed(d)
  const partes = valor.split(".")
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return partes.join(".")
}

const estaFueraDeRango = (pesoNeto) => {
  if (!pesoNeto) return false
  return pesoNeto < PESO_MINIMO || pesoNeto > PESO_MAXIMO
}

function usePetCokeData(token, transporteFiltro = null) {
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

      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) throw new Error('Barco no encontrado')

      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', 'PC-001')
        .single()

      if (productoError || !productoData) throw new Error('Producto PET COKE no encontrado')

      let query = supabase
        .from('petcoke_registros')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('correlativo', { ascending: true })

      if (transporteFiltro) {
        query = query.eq('transporte', transporteFiltro)
      }

      const { data: registrosData, error: registrosError } = await query
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
      setData(prev => ({ ...prev, loading: false, error: error.message }))
    }
  }

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [token, transporteFiltro])

  return { ...data, refetch: cargar }
}

export default function ClientPage({ token }) {
  const [transporteSeleccionado, setTransporteSeleccionado] = useState(null)
  const [todosLosRegistros, setTodosLosRegistros] = useState([])

  const { barco, producto, registros, loading, error, lastUpdate, refetch } = usePetCokeData(token, transporteSeleccionado)

  // Cargar TODOS los registros (sin filtro) para las tarjetas
  useEffect(() => {
    const cargarTodosRegistros = async () => {
      try {
        const { data: barcoData } = await supabase
          .from('barcos')
          .select('id')
          .eq('token_compartido', token)
          .single()

        if (barcoData) {
          const { data: registrosGlobales } = await supabase
            .from('petcoke_registros')
            .select('*')
            .eq('barco_id', barcoData.id)

          if (registrosGlobales) setTodosLosRegistros(registrosGlobales)
        }
      } catch (error) {
        console.error('Error cargando todos los registros:', error)
      }
    }
    cargarTodosRegistros()
  }, [token])

  const promediosPorTransporte = useMemo(() => {
    const mapa = {}

    todosLosRegistros.forEach(r => {
      const empresa = r.transporte || 'DESCONOCIDO'
      if (!mapa[empresa]) {
        mapa[empresa] = { nombre: empresa, viajes: [], traileta: [], volqueta: [] }
      }
      mapa[empresa].viajes.push(r)

      const tipo = (r.tipo_unidad || '').toUpperCase()
      if (tipo === 'TRAILETA') mapa[empresa].traileta.push(r)
      else if (tipo === 'VOLQUETA') mapa[empresa].volqueta.push(r)
    })

    return Object.values(mapa).map(e => {
      const totalNeto      = e.viajes.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalTraileta  = e.traileta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalVolqueta  = e.volqueta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)

      return {
        nombre:           e.nombre,
        totalViajes:      e.viajes.length,
        totalNeto,
        viajesTraileta:   e.traileta.length,
        viajesVolqueta:   e.volqueta.length,
        totalTraileta,
        totalVolqueta,
        promedioTraileta: e.traileta.length > 0 ? totalTraileta / e.traileta.length : null,
        promedioVolqueta: e.volqueta.length > 0 ? totalVolqueta / e.volqueta.length : null,
        fueraRango:       e.viajes.filter(r => estaFueraDeRango(r.peso_neto_updp_tm)).length,
      }
    }).sort((a, b) => b.totalNeto - a.totalNeto)
  }, [todosLosRegistros])

  // NUEVO: Calcular flujo por hora
  const flujoPorHora = useMemo(() => {
    if (!registros.length) return []

    // Agrupar por hora (usando hora_entrada si existe, o fecha/hora combinada)
    const flujoMap = new Map()

    registros.forEach(reg => {
      let horaKey = ''
      let horaMostrar = ''
      
      if (reg.hora_entrada) {
        // Extraer hora de entrada (formato HH:MM:SS)
        const horaPart = reg.hora_entrada.split(':')[0]
        horaKey = `${reg.fecha} ${horaPart}:00`
        horaMostrar = `${horaPart}:00`
      } else if (reg.fecha) {
        // Si no hay hora, usar fecha sola
        horaKey = reg.fecha
        horaMostrar = reg.fecha
      } else {
        return
      }

      if (!flujoMap.has(horaKey)) {
        flujoMap.set(horaKey, {
          hora: horaMostrar,
          horaCompleta: horaKey,
          viajes: 0,
          totalTM: 0,
          promedio: 0,
          viajesFueraRango: 0
        })
      }

      const horaData = flujoMap.get(horaKey)
      horaData.viajes++
      horaData.totalTM += reg.peso_neto_updp_tm || 0
      if (estaFueraDeRango(reg.peso_neto_updp_tm)) {
        horaData.viajesFueraRango++
      }
    })

    // Convertir a array y calcular promedios
    let flujoArray = Array.from(flujoMap.values()).map(item => ({
      ...item,
      promedio: item.viajes > 0 ? item.totalTM / item.viajes : 0
    }))

    // Ordenar por hora/fecha
    flujoArray.sort((a, b) => a.horaCompleta.localeCompare(b.horaCompleta))

    // Calcular flujo acumulado
    let acumulado = 0
    flujoArray = flujoArray.map(item => {
      acumulado += item.totalTM
      return { ...item, acumulado }
    })

    return flujoArray
  }, [registros])

  // Calcular estadísticas de flujo
  const estadisticasFlujo = useMemo(() => {
    if (!flujoPorHora.length) return { maxPorHora: 0, promedioPorHora: 0, totalHoras: 0 }
    
    const maxPorHora = Math.max(...flujoPorHora.map(h => h.totalTM))
    const promedioPorHora = flujoPorHora.reduce((sum, h) => sum + h.totalTM, 0) / flujoPorHora.length
    const totalHoras = flujoPorHora.length
    
    return { maxPorHora, promedioPorHora, totalHoras }
  }, [flujoPorHora])

  const estadisticas = useMemo(() => {
    if (!registros.length) return {
      totalNeto: 0, totalBruto: 0, totalViajes: 0,
      porTransporte: {}, porDia: {}, porPatio: {},
      acumuladoPorCorrelativo: [], unidadesFueraDeRango: [],
      totalNorte: 0, totalSur: 0, pesoPromedio: 0, porcentajeDentroRango: 0
    }

    const totalNeto  = registros.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
    const totalBruto = registros.reduce((s, r) => s + (r.peso_bruto_updp_tm || 0), 0)
    const totalViajes = registros.length
    const pesoPromedio = totalNeto / totalViajes

    const porTransporte = {}
    registros.forEach(r => {
      const t = r.transporte || 'DESCONOCIDO'
      porTransporte[t] = (porTransporte[t] || 0) + (r.peso_neto_updp_tm || 0)
    })

    const porDia = {}
    registros.forEach(r => { porDia[r.fecha] = (porDia[r.fecha] || 0) + (r.peso_neto_updp_tm || 0) })

    const porPatio = {}
    registros.forEach(r => {
      const p = r.patio || 'SIN PATIO'
      porPatio[p] = (porPatio[p] || 0) + (r.peso_neto_updp_tm || 0)
    })

    const totalNorte = registros.filter(r => r.patio === 'NORTE').reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
    const totalSur   = registros.filter(r => r.patio === 'SUR').reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)

    const unidadesFueraDeRango = registros.filter(r => estaFueraDeRango(r.peso_neto_updp_tm))
    const porcentajeDentroRango = ((totalViajes - unidadesFueraDeRango.length) / totalViajes) * 100

    let acumulado = 0
    const acumuladoPorCorrelativo = registros.map(r => {
      acumulado += r.peso_neto_updp_tm || 0
      return {
        correlativo: r.correlativo,
        peso: r.peso_neto_updp_tm,
        acumulado,
        fueraRango: estaFueraDeRango(r.peso_neto_updp_tm)
      }
    })

    return {
      totalNeto, totalBruto, totalViajes, porTransporte, porDia, porPatio,
      acumuladoPorCorrelativo, unidadesFueraDeRango, totalNorte, totalSur,
      pesoPromedio, porcentajeDentroRango
    }
  }, [registros])

  const handleSeleccionarTransporte = (transporte) => {
    setTransporteSeleccionado(prev => prev === transporte ? null : transporte)
  }

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

  const datosGraficoAcumulado   = estadisticas.acumuladoPorCorrelativo.map(item => ({ correlativo: `#${item.correlativo}`, peso: item.peso, acumulado: item.acumulado }))
  const datosGraficoTransporte  = Object.entries(estadisticas.porTransporte).map(([name, value]) => ({ name, value }))
  const datosGraficoDia         = Object.entries(estadisticas.porDia).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))
  const datosGraficoPatio       = Object.entries(estadisticas.porPatio).map(([name, value]) => ({ name, value }))

  const meta = barco.metas_json?.limites?.['PC-001'] || 0
  const porcentajeMeta = meta > 0 ? (estadisticas.totalNeto / meta) * 100 : 0

  const filtroActivoTexto = transporteSeleccionado
    ? `Filtrando: ${transporteSeleccionado}`
    : 'Mostrando todos los transportes'

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

        /* Grid de tarjetas mejorado - más compacto */
        .alm-tarjetas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
          margin-top: 20px;
        }

        /* Tarjeta compacta */
        .tarjeta-transporte {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .tarjeta-transporte:hover {
          transform: translateY(-2px);
          border-color: #f97316;
          box-shadow: 0 4px 12px -2px rgba(249,115,22,0.2);
        }
        .tarjeta-transporte-selected {
          background: linear-gradient(135deg, #f97316, #ea580c);
          border: 1px solid #f97316;
          box-shadow: 0 4px 12px -2px rgba(249,115,22,0.35);
        }

        /* Header compacto */
        .tarjeta-header {
          padding: 12px 14px 8px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .tarjeta-nombre {
          font-size: 14px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tarjeta-stats {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 11px;
        }
        .tarjeta-viajes {
          color: #94a3b8;
          font-weight: 600;
        }
        .tarjeta-total {
          color: #f97316;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
        }
        .tarjeta-transporte-selected .tarjeta-total {
          color: white;
        }

        /* Grid de tipos de unidad - 2 columnas */
        .tarjeta-tipos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 10px 14px;
        }
        .tipo-item {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          padding: 8px 10px;
          transition: all 0.2s;
        }
        .tipo-item-empty {
          opacity: 0.4;
        }
        .tipo-header {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 700;
        }
        .tipo-valor {
          font-size: 16px;
          font-weight: 800;
          font-family: 'DM Mono', monospace;
          margin-bottom: 2px;
        }
        .tipo-sub {
          font-size: 9px;
          color: #64748b;
        }
        .tarjeta-transporte-selected .tipo-sub {
          color: rgba(255,255,255,0.6);
        }

        /* Alerta compacta */
        .tarjeta-alerta {
          margin: 0 14px 12px 14px;
          padding: 6px 10px;
          background: rgba(239,68,68,0.15);
          border-radius: 8px;
          font-size: 10px;
          color: #f87171;
          text-align: center;
        }
        .tarjeta-indicador {
          padding: 8px 14px;
          font-size: 9px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.1);
        }

        /* Estadísticas de flujo */
        .flujo-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 12px;
        }
        .flujo-stat {
          text-align: center;
        }
        .flujo-stat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .flujo-stat-value {
          font-size: 18px;
          font-weight: 800;
          font-family: 'DM Mono', monospace;
          color: #f97316;
        }

        .alm-kpis-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .alm-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--orange); }
        .alm-kpi-icon { font-size: 28px; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
        .alm-kpi-value { font-size: 28px; font-weight: 900; color: white; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
        .alm-alert-card { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; }
        .alm-alert-title { font-size: 13px; font-weight: bold; color: #f87171; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
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
        .alm-table-row-warning { background: rgba(239, 68, 68, 0.1); }
        .alm-table-row-warning:hover { background: rgba(239, 68, 68, 0.2); }
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-badge { background: rgba(249, 115, 22, 0.2); color: #f97316; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 8px; }
        .alm-badge-warning { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .alm-badge-filter { background: rgba(249, 115, 22, 0.3); color: #f97316; }
        .alm-progress-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .alm-progress-track { height: 12px; background: #334155; border-radius: 999px; overflow: hidden; margin: 12px 0; }
        .alm-progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #fb923c); border-radius: 999px; transition: width 1s ease; }
        .alm-progress-fill-warning { background: linear-gradient(90deg, #ef4444, #f97316); }
        .alm-clear-filter { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 20px; padding: 6px 12px; font-size: 11px; cursor: pointer; color: #94a3b8; }
        .alm-clear-filter:hover { background: rgba(255,255,255,0.1); color: white; }

        .section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #64748b;
          margin-bottom: 14px; margin-top: 4px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-title::after {
          content: ''; flex: 1; height: 1px; background: #334155;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .alm-charts-row { grid-template-columns: 1fr; }
          .alm-body { padding: 16px; }
          .alm-tarjetas-grid { grid-template-columns: 1fr; }
          .flujo-stats { grid-template-columns: 1fr; gap: 8px; }
        }
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {transporteSeleccionado && (
              <button onClick={() => setTransporteSeleccionado(null)} className="alm-clear-filter">
                ✕ Limpiar filtro
              </button>
            )}
            <button onClick={refetch} className="alm-refresh-btn">
              <span>🔄</span> Actualizar
            </button>
          </div>
        </header>

        <div className="alm-body">
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="alm-badge alm-badge-filter">{filtroActivoTexto}</span>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Última actualización: {lastUpdate?.format('HH:mm:ss') || '...'}
            </div>
          </div>

          {/* KPIs principales */}
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
                <div className="alm-kpi-value">{fmtTM(estadisticas.pesoPromedio, 2)} TM</div>
                <div className="alm-kpi-sub">Rango ideal: {PESO_MINIMO}–{PESO_MAXIMO} TM</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🏭</div>
              <div>
                <div className="alm-kpi-label">Transportistas</div>
                <div className="alm-kpi-value">{promediosPorTransporte.length}</div>
                <div className="alm-kpi-sub">Empresas diferentes</div>
              </div>
            </div>
          </div>

          {/* KPIs patios */}
          <div className="alm-kpis-row">
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🔵</div>
              <div>
                <div className="alm-kpi-label">Patio NORTE</div>
                <div className="alm-kpi-value" style={{ color: '#60a5fa' }}>{fmtTM(estadisticas.totalNorte, 2)} TM</div>
                <div className="alm-kpi-sub">{((estadisticas.totalNorte / estadisticas.totalNeto) * 100 || 0).toFixed(1)}% del total</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">🟢</div>
              <div>
                <div className="alm-kpi-label">Patio SUR</div>
                <div className="alm-kpi-value" style={{ color: '#4ade80' }}>{fmtTM(estadisticas.totalSur, 2)} TM</div>
                <div className="alm-kpi-sub">{((estadisticas.totalSur / estadisticas.totalNeto) * 100 || 0).toFixed(1)}% del total</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">✅</div>
              <div>
                <div className="alm-kpi-label">Viajes en Rango</div>
                <div className="alm-kpi-value" style={{ color: '#4ade80' }}>{estadisticas.porcentajeDentroRango.toFixed(1)}%</div>
                <div className="alm-kpi-sub">{estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} de {estadisticas.totalViajes} viajes</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon">⚠️</div>
              <div>
                <div className="alm-kpi-label">Fuera de Rango</div>
                <div className="alm-kpi-value" style={{ color: '#f87171' }}>{estadisticas.unidadesFueraDeRango.length}</div>
                <div className="alm-kpi-sub">Peso &lt;{PESO_MINIMO} o &gt;{PESO_MAXIMO} TM</div>
              </div>
            </div>
          </div>

          {/* Alerta fuera de rango */}
          {estadisticas.unidadesFueraDeRango.length > 0 && (
            <div className="alm-alert-card">
              <div className="alm-alert-title">
                <span>⚠️</span> ALERTA: Unidades fuera del rango permitido ({PESO_MINIMO}–{PESO_MAXIMO} TM)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {estadisticas.unidadesFueraDeRango.slice(0, 10).map((reg, idx) => (
                  <span key={idx} style={{ background: 'rgba(239,68,68,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontFamily: 'monospace', color: '#f87171' }}>
                    {reg.placa}: {reg.peso_neto_updp_tm?.toFixed(2)} TM {reg.peso_neto_updp_tm < PESO_MINIMO ? '⬇️' : '⬆️'}
                  </span>
                ))}
                {estadisticas.unidadesFueraDeRango.length > 10 && (
                  <span style={{ color: '#64748b', fontSize: '12px', padding: '4px 12px' }}>
                    + {estadisticas.unidadesFueraDeRango.length - 10} más
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Progreso de meta */}
          {meta > 0 && (
            <div className="alm-progress-hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'white' }}>Progreso de Descarga</span>
                <span style={{ color: porcentajeMeta >= 100 ? '#4ade80' : porcentajeMeta >= 90 ? '#fbbf24' : '#f97316', fontWeight: 'bold' }}>
                  {porcentajeMeta.toFixed(1)}%
                </span>
              </div>
              <div className="alm-progress-track">
                <div className={`alm-progress-fill ${porcentajeMeta >= 100 ? 'alm-progress-fill-warning' : ''}`} style={{ width: `${Math.min(100, porcentajeMeta)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>0 TM</span>
                <span>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(meta, 0)} TM</span>
              </div>
              {porcentajeMeta >= 100 && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ color: '#4ade80', fontSize: '12px' }}>✅ ¡Meta alcanzada! Se ha completado la cantidad manifestada.</span>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              TARJETAS COMPACTAS POR EMPRESA TRANSPORTISTA
              ============================================================ */}
          {promediosPorTransporte.length > 0 && (
            <>
              <div className="section-title">🏢 Empresas Transportistas</div>
              <div className="alm-tarjetas-grid">
                {promediosPorTransporte.map((empresa) => {
                  const sel = transporteSeleccionado === empresa.nombre
                  return (
                    <div
                      key={empresa.nombre}
                      className={`tarjeta-transporte ${sel ? 'tarjeta-transporte-selected' : ''}`}
                      onClick={() => handleSeleccionarTransporte(empresa.nombre)}
                    >
                      <div className="tarjeta-header">
                        <div className="tarjeta-nombre" title={empresa.nombre}>
                          {empresa.nombre}
                        </div>
                        <div className="tarjeta-stats">
                          <span className="tarjeta-viajes">{empresa.totalViajes} viajes</span>
                          <span className="tarjeta-total">{fmtTM(empresa.totalNeto, 1)} TM</span>
                        </div>
                      </div>

                      <div className="tarjeta-tipos">
                        <div className={`tipo-item ${empresa.viajesTraileta === 0 ? 'tipo-item-empty' : ''}`}>
                          <div className="tipo-header">
                            <span>🚛</span> TRAILETA
                          </div>
                          {empresa.viajesTraileta > 0 ? (
                            <>
                              <div className="tipo-valor" style={{ color: sel ? 'white' : '#f97316' }}>
                                {fmtTM(empresa.promedioTraileta, 1)}
                              </div>
                              <div className="tipo-sub">{empresa.viajesTraileta} viajes · {fmtTM(empresa.totalTraileta, 0)} TM</div>
                            </>
                          ) : (
                            <div className="tipo-sub" style={{ color: '#475569', marginTop: '4px' }}>Sin registros</div>
                          )}
                        </div>

                        <div className={`tipo-item ${empresa.viajesVolqueta === 0 ? 'tipo-item-empty' : ''}`}>
                          <div className="tipo-header">
                            <span>⛰️</span> VOLQUETA
                          </div>
                          {empresa.viajesVolqueta > 0 ? (
                            <>
                              <div className="tipo-valor" style={{ color: sel ? 'white' : '#4ade80' }}>
                                {fmtTM(empresa.promedioVolqueta, 1)}
                              </div>
                              <div className="tipo-sub">{empresa.viajesVolqueta} viajes · {fmtTM(empresa.totalVolqueta, 0)} TM</div>
                            </>
                          ) : (
                            <div className="tipo-sub" style={{ color: '#475569', marginTop: '4px' }}>Sin registros</div>
                          )}
                        </div>
                      </div>

                      {empresa.fueraRango > 0 && (
                        <div className="tarjeta-alerta">
                          ⚠️ {empresa.fueraRango} fuera de rango ({PESO_MINIMO}-{PESO_MAXIMO} TM)
                        </div>
                      )}

                      <div className="tarjeta-indicador">
                        {sel ? '✓ Filtrando · clic para quitar' : 'clic para filtrar'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ============================================================
              NUEVO GRÁFICO DE FLUJO POR HORA
              ============================================================ */}
          <div className="alm-chart-card alm-chart-wide">
            <div className="alm-chart-title">
              <span>⏱️</span> Flujo de Descarga por Hora
            </div>
            
            {/* Estadísticas rápidas del flujo */}
            {flujoPorHora.length > 0 && (
              <div className="flujo-stats">
                <div className="flujo-stat">
                  <div className="flujo-stat-label">🚛 Pico Máximo por Hora</div>
                  <div className="flujo-stat-value">{fmtTM(estadisticasFlujo.maxPorHora, 1)} TM</div>
                </div>
                <div className="flujo-stat">
                  <div className="flujo-stat-label">📊 Promedio por Hora</div>
                  <div className="flujo-stat-value">{fmtTM(estadisticasFlujo.promedioPorHora, 1)} TM</div>
                </div>
                <div className="flujo-stat">
                  <div className="flujo-stat-label">⏰ Periodos Activos</div>
                  <div className="flujo-stat-value">{estadisticasFlujo.totalHoras} horas</div>
                </div>
              </div>
            )}

            {flujoPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={flujoPorHora}>
                  <defs>
                    <linearGradient id="flujoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="hora" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={Math.floor(flujoPorHora.length / 10)} // Mostrar ~10 etiquetas
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#94a3b8' }} 
                    tickFormatter={(v) => fmtTM(v, 0)}
                    label={{ value: 'Toneladas por Hora', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(v) => fmtTM(v, 0)}
                    label={{ value: 'Acumulado Total', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'totalTM') return [`${fmtTM(value, 2)} TM`, 'Descarga por Hora']
                      if (name === 'acumulado') return [`${fmtTM(value, 2)} TM`, 'Acumulado Total']
                      if (name === 'viajes') return [`${value} viajes`, 'N° Viajes']
                      if (name === 'promedio') return [`${fmtTM(value, 2)} TM`, 'Promedio por Viaje']
                      return [value, name]
                    }}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  />
                  
                  {/* Barras de toneladas por hora */}
                  <Bar 
                    yAxisId="left"
                    dataKey="totalTM" 
                    fill="#f97316" 
                    opacity={0.8}
                    radius={[4, 4, 0, 0]}
                    name="Descarga por Hora"
                  />
                  
                  {/* Línea de acumulado */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="acumulado" 
                    stroke="#4ade80" 
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#4ade80' }}
                    name="Acumulado Total"
                  />
                  
                  {/* Línea de referencia para el promedio */}
                  <ReferenceLine 
                    yAxisId="left"
                    y={estadisticasFlujo.promedioPorHora} 
                    stroke="#fb923c" 
                    strokeDasharray="5 5"
                    label={{ value: `Promedio: ${fmtTM(estadisticasFlujo.promedioPorHora, 1)} TM/h`, fill: '#fb923c', fontSize: 10 }}
                  />
                  
                  {/* Línea de meta si existe */}
                  {meta > 0 && (
                    <ReferenceLine 
                      yAxisId="right"
                      y={meta} 
                      stroke="#22c55e" 
                      strokeDasharray="3 3"
                      label={{ value: `Meta: ${fmtTM(meta, 0)} TM`, fill: '#22c55e', fontSize: 10 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '80px 40px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⏰</span>
                <p>No hay datos de hora disponibles para mostrar el flujo</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>Se requiere información de hora_entrada en los registros</p>
              </div>
            )}
          </div>

          {/* Gráficos adicionales */}
          <div className="alm-charts-row">
            <div className="alm-chart-card">
              <div className="alm-chart-title"><span>📊</span> Descarga por Transporte</div>
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
              <div className="alm-chart-title"><span>🏭</span> Descarga por Patio</div>
              {datosGraficoPatio.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={datosGraficoPatio} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoPatio.map((entry, i) => <Cell key={i} fill={COLORES_PATIO[entry.name] || COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title"><span>📈</span> Descarga por Día</div>
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

            <div className="alm-chart-card">
              <div className="alm-chart-title"><span>📊</span> Distribución de Pesos Netos</div>
              {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={estadisticas.acumuladoPorCorrelativo.map(item => ({ ...item, peso: item.peso }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="correlativo" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} domain={[PESO_MINIMO - 5, PESO_MAXIMO + 5]} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                    <Bar dataKey="peso" fill="#f97316" radius={[4, 4, 0, 0]}>
                      {estadisticas.acumuladoPorCorrelativo.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fueraRango ? '#ef4444' : '#f97316'} />
                      ))}
                    </Bar>
                    <ReferenceLine y={PESO_MINIMO} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Mín ${PESO_MINIMO}`, fill: '#22c55e', fontSize: 10 }} />
                    <ReferenceLine y={PESO_MAXIMO} stroke="#22c55e" strokeDasharray="3 3" label={{ value: `Máx ${PESO_MAXIMO}`, fill: '#22c55e', fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>
          </div>

          {/* Tabla de registros */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>📋</span>
                <span style={{ fontWeight: 'bold', color: 'white' }}>Registros de Descarga</span>
                <span className="alm-badge">{registros.length} viajes</span>
                {estadisticas.unidadesFueraDeRango.length > 0 && (
                  <span className="alm-badge alm-badge-warning">⚠️ {estadisticas.unidadesFueraDeRango.length} fuera de rango</span>
                )}
                {transporteSeleccionado && (
                  <span className="alm-badge alm-badge-filter">Filtrado: {transporteSeleccionado}</span>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="alm-table">
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                  <tr>
                    <th>#</th>
                    <th>Placa</th>
                    <th>Transporte</th>
                    <th>Tipo Unidad</th>
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
                  {registros.map((reg) => {
                    const fueraRango = estaFueraDeRango(reg.peso_neto_updp_tm)
                    return (
                      <tr key={reg.id} className={fueraRango ? 'alm-table-row-warning' : ''}>
                        <td style={{ fontWeight: 'bold' }}>{reg.correlativo}</td>
                        <td><span style={{ fontFamily: 'monospace', color: fueraRango ? '#f87171' : '#f97316' }}>{reg.placa}</span></td>
                        <td>{reg.transporte || '—'}</td>
                        <td>
                          {reg.tipo_unidad
                            ? <span style={{
                                background: reg.tipo_unidad.toUpperCase() === 'TRAILETA' ? 'rgba(249,115,22,0.15)' : 'rgba(74,222,128,0.15)',
                                color: reg.tipo_unidad.toUpperCase() === 'TRAILETA' ? '#f97316' : '#4ade80',
                                padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700
                              }}>{reg.tipo_unidad}</span>
                            : '—'}
                        </td>
                        <td>{reg.fecha}</td>
                        <td>{reg.hora_entrada || '—'}</td>
                        <td>{reg.hora_salida || '—'}</td>
                        <td style={{ color: '#4ade80' }}>{reg.tiempo_atencion || '—'}</td>
                        <td>{reg.patio || '—'}</td>
                        <td>{reg.bodega_barco || '—'}</td>
                        <td className="alm-td-num" style={{ color: '#60a5fa' }}>{reg.peso_bruto_updp_tm?.toFixed(3) || '—'}</td>
                        <td className="alm-td-num" style={{ color: fueraRango ? '#f87171' : '#4ade80', fontWeight: 'bold' }}>
                          {reg.peso_neto_updp_tm?.toFixed(3)}
                          {fueraRango && <span style={{ marginLeft: '4px' }}>⚠️</span>}
                        </td>
                        <td className="alm-td-num" style={{ color: '#fbbf24' }}>{reg.acumulado_updp_tm?.toFixed(3) || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            🔄 auto-refresh 30s · {barco.nombre} · ALMAPAC · {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 2)} TM descargadas
            <br />
            <span style={{ color: '#f87171' }}>⚠️ Rango permitido: {PESO_MINIMO}–{PESO_MAXIMO} TM por viaje</span>
          </div>
        </div>
      </div>
    </>
  )
}