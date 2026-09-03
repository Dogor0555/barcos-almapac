"use client";

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ComposedChart, Area,
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

import { FiSearch, FiRefreshCw, FiDownload, FiX, FiClock, FiCalendar, FiTruck, FiBarChart2, FiActivity, FiFilter, FiPackage } from 'react-icons/fi'
import { FaBuilding, FaFileExcel, FaTachometerAlt, FaWarehouse, FaChartBar, FaChartLine } from 'react-icons/fa'
import { GiCargoShip, GiWeightScale, GiMinerals } from 'react-icons/gi'
import { GoAlert } from 'react-icons/go'
import { MdAccessTime, MdCheckCircle } from 'react-icons/md'

dayjs.locale('es')

// 🎨 PALETA (igual a clinker_fortaleza)
const COLOR_AZUL_PRINCIPAL = "#0000A3"
const COLOR_AZUL_MARINO = "#182A6E"
const COLOR_AZUL_CLARO = "#2A3D7A"
const COLOR_AZUL_SUAVE = "#E8EAF3"
const COLOR_VERDE_GRIS = "#82907F"
const COLOR_BLANCO = "#FFFFFF"
const COLOR_NARANJA = "#14B8A6"
const COLOR_ROJO = "#DC2626"
const COLOR_GRIS_FONDO = "#F5F5F5"
const COLOR_TEXTO_PRIMARIO = "#1A1A1A"
const COLOR_TEXTO_SECUNDARIO = "#6B7280"
const COLOR_BORDE = "#E5E5E5"

const COLORES_GRAFICOS = [COLOR_AZUL_PRINCIPAL, COLOR_AZUL_MARINO, COLOR_NARANJA, "#3B82F6", "#6B7280", COLOR_VERDE_GRIS]
const COLORES_BODEGA = [COLOR_AZUL_PRINCIPAL, COLOR_NARANJA, COLOR_VERDE_GRIS, "#3B82F6", "#6B7280"]

const fmtNum = (n, d = 0) => {
  if (n == null || isNaN(n)) return "0"
  const parts = Number(n).toFixed(d).split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return d > 0 ? parts.join(".") : parts[0]
}

// =====================================================================
// CÁLCULOS
// =====================================================================

function calcularEstadisticas(registros) {
  if (!registros.length) {
    return {
      totalRegistros: 0,
      totalJumbos: 0,
      totalBuenEstado: 0,
      totalDanados: 0,
      totalPesoKg: 0,
      duracionPromedioMin: 0,
      duracionMinMin: 0,
      duracionMaxMin: 0,
      registrosDanados: 0,
      pctBuenEstado: 0,
      promedioUnidadesPorRegistro: 0,
    }
  }

  const totalRegistros = registros.length
  const totalBuenEstado = registros.reduce((s, r) => s + (r.cantidadBuenEstado || 0), 0)
  const totalDanados = registros.reduce((s, r) => s + (r.cantidadDanado || 0), 0)
  const totalJumbos = totalBuenEstado + totalDanados
  const totalPesoKg = registros.reduce((s, r) => s + (r.pesoNetoKg || 0), 0)

  const duraciones = registros.filter((r) => r.duracionMin > 0).map((r) => r.duracionMin)
  const duracionPromedioMin = duraciones.length ? duraciones.reduce((s, x) => s + x, 0) / duraciones.length : 0
  const duracionMinMin = duraciones.length ? Math.min(...duraciones) : 0
  const duracionMaxMin = duraciones.length ? Math.max(...duraciones) : 0

  const registrosDanados = registros.filter((r) => (r.cantidadDanado || 0) > 0).length
  const pctBuenEstado = totalJumbos > 0 ? (totalBuenEstado / totalJumbos) * 100 : 0
  const promedioUnidadesPorRegistro = totalJumbos / totalRegistros

  return {
    totalRegistros,
    totalJumbos,
    totalBuenEstado,
    totalDanados,
    totalPesoKg,
    duracionPromedioMin,
    duracionMinMin,
    duracionMaxMin,
    registrosDanados,
    pctBuenEstado,
    promedioUnidadesPorRegistro,
  }
}

function unidadesPorHora(registros) {
  // Agrupa por hora del día (independiente de la fecha) → 24 buckets (0-23)
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hora: `${String(h).padStart(2, '0')}:00`,
    horaNum: h,
    registros: 0,
    unidades: 0,
    pesoKg: 0,
  }))

  registros.forEach((r) => {
    if (!r.inicioDate) return
    const h = r.inicioDate.getHours()
    buckets[h].registros++
    buckets[h].unidades += r.cantidadTotal
    buckets[h].pesoKg += r.pesoNetoKg
  })

  return buckets
}

function recepcionPorBodega(registros) {
  const map = new Map()
  registros.forEach((r) => {
    const key = r.bodega || 'SIN BODEGA'
    if (!map.has(key)) {
      map.set(key, { bodega: key, registros: 0, unidades: 0, pesoKg: 0, danados: 0 })
    }
    const item = map.get(key)
    item.registros++
    item.unidades += r.cantidadTotal
    item.pesoKg += r.pesoNetoKg
    item.danados += r.cantidadDanado
  })
  return Array.from(map.values()).sort((a, b) => b.unidades - a.unidades)
}

function tiempoDeDescarga(registros) {
  // Histograma de duraciones en buckets de 5 min + serie por registro (ordenada por inicio)
  const buckets = new Map()
  registros.forEach((r) => {
    if (r.duracionMin <= 0) return
    const bucket = Math.floor(r.duracionMin / 5) * 5
    const key = `${bucket}-${bucket + 5}`
    if (!buckets.has(key)) {
      buckets.set(key, { rango: key, bucketMin: bucket, registros: 0, unidades: 0, pesoKg: 0 })
    }
    const item = buckets.get(key)
    item.registros++
    item.unidades += r.cantidadTotal
    item.pesoKg += r.pesoNetoKg
  })
  return Array.from(buckets.values()).sort((a, b) => a.bucketMin - b.bucketMin)
}

function seriePorRegistro(registros) {
  return registros
    .filter((r) => r.inicioDate && r.duracionMin > 0)
    .sort((a, b) => a.inicioDate - b.inicioDate)
    .map((r) => ({
      titulo: r.titulo,
      duracion: r.duracionMin,
      inicio: dayjs(r.inicioDate).format('DD/MM HH:mm'),
      bodega: r.bodega,
      unidades: r.cantidadTotal,
    }))
}

// =====================================================================
// COMPONENTES UI
// =====================================================================

function KpiCard({ icon, value, label, valueSize = 26, suffix = '' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">
        {value}
        {suffix && <small> {suffix}</small>}
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

function descargarExcel(registros, stats, datosHora, datosBodega, datosTiempo) {
  // Build a small CSV (suficiente para salir del paso)
  const rows = []
  rows.push(['Reporte de Jumbos - GANT NEREA'])
  rows.push(['Generado', dayjs().format('YYYY-MM-DD HH:mm:ss')])
  rows.push([])
  rows.push(['KPIs'])
  rows.push(['Total Registros', stats.totalRegistros])
  rows.push(['Total Jumbos (Buen Estado)', stats.totalBuenEstado])
  rows.push(['Total Jumbos Dañados', stats.totalDanados])
  rows.push(['Total Peso Neto (kg)', stats.totalPesoKg])
  rows.push(['Duración Promedio (min)', stats.duracionPromedioMin.toFixed(1)])
  rows.push(['% Buen Estado', stats.pctBuenEstado.toFixed(1) + '%'])
  rows.push([])
  rows.push(['Unidades por Hora'])
  rows.push(['Hora', 'Registros', 'Unidades', 'Peso (kg)'])
  datosHora.forEach((d) => rows.push([d.hora, d.registros, d.unidades, d.pesoKg]))
  rows.push([])
  rows.push(['Recepción por Bodega'])
  rows.push(['Bodega', 'Registros', 'Unidades', 'Peso (kg)', 'Dañados'])
  datosBodega.forEach((d) => rows.push([d.bodega, d.registros, d.unidades, d.pesoKg, d.danados]))
  rows.push([])
  rows.push(['Tiempo de Descarga (histograma)'])
  rows.push(['Rango (min)', 'Registros', 'Unidades', 'Peso (kg)'])
  datosTiempo.forEach((d) => rows.push([d.rango, d.registros, d.unidades, d.pesoKg]))
  rows.push([])
  rows.push(['Detalle de Registros'])
  rows.push(['Título', 'Fecha', 'Bodega', 'Placa Camión', 'Placa Remolque', 'Hora Inicio', 'Hora Fin', 'Duración (min)', 'Buen Estado', 'Dañados', 'Peso (kg)'])
  registros.forEach((r) => {
    rows.push([
      r.titulo, r.fecha, r.bodega, r.placaCamion, r.placaRemolque,
      r.horaInicio, r.horaFin, r.duracionMin,
      r.cantidadBuenEstado, r.cantidadDanado, r.pesoNetoKg,
    ])
  })

  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte_jumbos_${dayjs().format('YYYY-MM-DD_HHmm')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportesJumbosClient({ registros: registrosIniciales }) {
  const registrosAll = registrosIniciales
  const [filtroBodega, setFiltroBodega] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const bodegas = useMemo(() => {
    return Array.from(new Set(registrosAll.map((r) => r.bodega).filter(Boolean))).sort()
  }, [registrosAll])

  const registros = useMemo(() => {
    return registrosAll.filter((r) => {
      if (filtroBodega && r.bodega !== filtroBodega) return false
      if (filtroFechaInicio && r.fechaDate && r.fechaDate < dayjs(filtroFechaInicio).toDate()) return false
      if (filtroFechaFin && r.fechaDate && r.fechaDate > dayjs(filtroFechaFin).endOf('day').toDate()) return false
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase()
        const blob = `${r.titulo} ${r.placaCamion} ${r.placaRemolque} ${r.bodega} ${r.producto}`.toLowerCase()
        if (!blob.includes(q)) return false
      }
      return true
    })
  }, [registrosAll, filtroBodega, filtroFechaInicio, filtroFechaFin, busqueda])

  const stats = useMemo(() => calcularEstadisticas(registros), [registros])
  const datosHora = useMemo(() => unidadesPorHora(registros), [registros])
  const datosBodega = useMemo(() => recepcionPorBodega(registros), [registros])
  const datosTiempo = useMemo(() => tiempoDeDescarga(registros), [registros])
  const serieTiempo = useMemo(() => seriePorRegistro(registros), [registros])

  const peakHora = useMemo(() => {
    return datosHora.reduce((max, x) => (x.unidades > (max?.unidades || 0) ? x : max), null)
  }, [datosHora])

  const limpiarFiltros = () => {
    setFiltroBodega('')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setBusqueda('')
  }

  const filtroActivo = [filtroBodega, filtroFechaInicio, busqueda].filter(Boolean).length > 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { color-scheme: light; }
        html, body { color: var(--texto-primary); }
        :root {
          --azul-500: #0000A3;
          --azul-400: #182A6E;
          --azul-100: #E8EAF3;
          --verde-gris: #82907F;
          --teal: #14B8A6;
          --blanco: #FFFFFF;
          --gris-fondo: #F5F5F5;
          --texto-primary: #1A1A1A;
          --texto-secondary: #6B7280;
          --border: #E5E5E5;
        }
        body { background: var(--gris-fondo); font-family: 'Inter', sans-serif; }

        .alm-topbar {
          background: var(--blanco);
          border-bottom: 3px solid var(--teal);
          padding: 0 32px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .alm-logo { height: 45px; }
        .alm-ship-name { font-weight: 800; font-size: 18px; color: var(--azul-500); }
        .alm-ship-code { font-size: 11px; color: var(--texto-secondary); }

        .alm-glass-btn {
          background: var(--azul-100);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 20px;
          color: var(--azul-500);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .alm-glass-btn:hover { background: var(--azul-500); color: var(--blanco); border-color: var(--azul-500); transform: translateY(-2px); }
        .alm-glass-btn.danger { background: #FEF2F2; color: ${COLOR_ROJO}; border-color: #FECACA; }
        .alm-glass-btn.danger:hover { background: ${COLOR_ROJO}; color: var(--blanco); }

        .alm-body { max-width: 1440px; margin: 0 auto; padding: 32px; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .kpi-card {
          background: linear-gradient(135deg, #0000A3, #182A6E);
          border-radius: 20px;
          padding: 14px 20px;
          color: var(--blanco);
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,163,0.2); }
        .kpi-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0; height: 0;
          border-style: solid;
          border-width: 0 0 60px 60px;
          border-color: transparent transparent rgba(255,255,255,0.06) transparent;
          pointer-events: none;
        }
        .kpi-icon {
          width: 42px; height: 42px;
          background: rgba(255,255,255,0.12);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kpi-value { font-size: 26px; font-weight: 800; line-height: 1; white-space: nowrap; }
        .kpi-value small { font-size: 12px; font-weight: 500; opacity: 0.8; }
        .kpi-label { font-size: 11px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; white-space: nowrap; margin-left: auto; }

        .alm-section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--texto-secondary);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .alm-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }

        .alm-chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px; }
        .alm-chart-card { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; padding: 24px; }
        .alm-chart-card:hover { border-color: var(--azul-500); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .alm-chart-card.full { grid-column: 1 / -1; }

        .alm-table-container { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-top: 24px; }
        .alm-table { width: 100%; border-collapse: collapse; }
        .alm-table th { padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--texto-secondary); background: var(--gris-fondo); border-bottom: 1px solid var(--border); position: sticky; top: 0; }
        .alm-table td { padding: 12px 16px; color: var(--texto-primary); font-size: 13px; border-bottom: 1px solid var(--gris-fondo); }
        .alm-table tbody tr:hover { background: var(--azul-100); }
        .alm-row-danado { background: linear-gradient(90deg, rgba(220, 38, 38, 0.06), transparent); border-left: 3px solid ${COLOR_ROJO}; }

        .alm-badge { background: var(--azul-100); border: 1px solid var(--azul-500); color: var(--azul-500); padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }

        .alm-filters {
          background: var(--blanco);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr auto;
          gap: 16px;
          align-items: end;
        }
        .alm-input, .alm-select {
          background: var(--blanco);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          width: 100%;
          color: var(--texto-primary);
        }
        .alm-input::placeholder { color: var(--texto-secondary); opacity: 1; }
        .alm-input::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor: pointer; }
        .alm-select option { color: var(--texto-primary); background: var(--blanco); }
        .alm-input:focus, .alm-select:focus { border-color: var(--azul-500); box-shadow: 0 0 0 3px rgba(0,0,163,0.1); }
        .alm-label { font-size: 10px; color: var(--texto-secondary); display: block; margin-bottom: 6px; text-transform: uppercase; font-weight: 600; }
        .alm-filters * { color: var(--texto-primary); }
        .alm-filters .alm-label { color: var(--texto-secondary); }
        .alm-filters .alm-badge { color: var(--azul-500); }

        .alm-table-wrap { overflow-x: auto; max-height: 500px; overflow-y: auto; }

        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .alm-chart-grid { grid-template-columns: 1fr; }
          .alm-filters { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 640px) {
          .kpi-grid { grid-template-columns: 1fr; }
          .alm-topbar { padding: 0 16px; height: 70px; }
          .kpi-value { font-size: 22px; }
          .alm-filters { grid-template-columns: 1fr; }
        }
      `}</style>

      <div>
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/logo.png" alt="ALMACENADORA DEL PACÍFICO" className="alm-logo" />
            <div style={{ width: '2px', height: '35px', background: COLOR_NARANJA }} />
            <div>
              <div className="alm-ship-name">Recepción de Jumbos</div>
              <div className="alm-ship-code">Barco GANT NEREA · {fmtNum(registrosAll.length)} registros (mock temporal)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => descargarExcel(registros, stats, datosHora, datosBodega, datosTiempo)} className="alm-glass-btn">
              <FaFileExcel size={14} /> Exportar
            </button>
            {filtroActivo && (
              <button onClick={limpiarFiltros} className="alm-glass-btn danger">
                <FiX size={14} /> Limpiar filtros
              </button>
            )}
          </div>
        </header>

        <div className="alm-body">
          {/* FILTROS */}
          <div className="alm-filters">
            <div>
              <label className="alm-label">Buscar</label>
              <div style={{ position: 'relative' }}>
                <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLOR_TEXTO_SECUNDARIO }} />
                <input className="alm-input" style={{ paddingLeft: '36px' }} placeholder="Título, placa, bodega..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="alm-label">Bodega</label>
              <select className="alm-select" value={filtroBodega} onChange={(e) => setFiltroBodega(e.target.value)}>
                <option value="">Todas</option>
                {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="alm-label">Fecha desde</label>
              <input type="date" className="alm-input" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="alm-label">Fecha hasta</label>
              <input type="date" className="alm-input" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} />
            </div>
            <div>
              <div className="alm-badge" style={{ marginBottom: 0 }}>
                <FiActivity size={12} /> {fmtNum(registros.length)} / {fmtNum(registrosAll.length)}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="kpi-grid">
            <KpiCard icon={<FiPackage size={22} />} value={fmtNum(stats.totalJumbos)} label="Jumbos Recibidos" />
            <KpiCard icon={<GiWeightScale size={22} />} value={fmtNum(stats.totalPesoKg)} suffix="kg" label="Peso Neto Total" />
            <KpiCard icon={<FiTruck size={22} />} value={fmtNum(stats.totalRegistros)} label="Total Registros" />
            <KpiCard icon={<MdAccessTime size={22} />} value={stats.duracionPromedioMin.toFixed(1)} suffix="min" label="Duración Promedio" />
            <KpiCard icon={<MdCheckCircle size={22} />} value={fmtNum(stats.totalBuenEstado)} label="Buen Estado" />
            <KpiCard icon={<GoAlert size={22} />} value={fmtNum(stats.totalDanados)} label="Dañados" />
            <KpiCard icon={<FaTachometerAlt size={22} />} value={stats.pctBuenEstado.toFixed(1)} suffix="%" label="% Buen Estado" />
            <KpiCard icon={<FaChartBar size={22} />} value={stats.promedioUnidadesPorRegistro.toFixed(1)} label="Promedio / Registro" />
          </div>

          {/* 3 GRÁFICOS PRINCIPALES */}
          <div className="alm-section-title">
            <FaChartBar size={14} /> Indicadores Operativos
          </div>
          <div className="alm-chart-grid">
            {/* 1. Cantidad de unidades por hora */}
            <div className="alm-chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="alm-section-title" style={{ margin: 0 }}>
                  <FiClock size={14} /> Cantidad de unidades por hora
                </div>
                {peakHora && (
                  <div className="alm-badge">
                    Pico: {peakHora.hora} ({fmtNum(peakHora.unidades)} und)
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={datosHora}>
                  <defs>
                    <linearGradient id="horaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                  <XAxis dataKey="hora" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} formatter={(v, n) => n === 'unidades' ? `${fmtNum(v)} und` : n === 'pesoKg' ? `${fmtNum(v)} kg` : v} />
                  <Bar dataKey="unidades" fill="url(#horaGradient)" radius={[6, 6, 0, 0]} name="Unidades">
                    {datosHora.map((entry, idx) => (
                      <Cell key={idx} fill={peakHora && entry.hora === peakHora.hora ? COLOR_NARANJA : COLOR_AZUL_PRINCIPAL} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="pesoKg" stroke={COLOR_NARANJA} strokeWidth={2} dot={false} name="Peso (kg)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Tiempo de descargas */}
            <div className="alm-chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="alm-section-title" style={{ margin: 0 }}>
                  <MdAccessTime size={14} /> Tiempo de descargas
                </div>
                <div className="alm-badge">
                  Min: {stats.duracionMinMin}m · Max: {stats.duracionMaxMin}m
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datosTiempo}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                  <XAxis dataKey="rango" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} />
                  <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} formatter={(v) => fmtNum(v)} />
                  <Bar dataKey="registros" fill={COLOR_AZUL_PRINCIPAL} radius={[6, 6, 0, 0]} name="Cantidad de registros">
                    {datosTiempo.map((entry, idx) => (
                      <Cell key={idx} fill={entry.bucketMin > 30 ? COLOR_ROJO : entry.bucketMin > 15 ? COLOR_NARANJA : COLOR_AZUL_PRINCIPAL} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 10, color: COLOR_TEXTO_SECUNDARIO, textAlign: 'center', marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COLOR_AZUL_PRINCIPAL, borderRadius: 2, marginRight: 6 }}></span>≤15 min</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COLOR_NARANJA, borderRadius: 2, marginRight: 6 }}></span>15-30 min</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COLOR_ROJO, borderRadius: 2, marginRight: 6 }}></span>&gt;30 min</span>
              </div>
            </div>

            {/* 3. Recepción por bodega */}
            <div className="alm-chart-card full">
              <div className="alm-section-title">
                <FaWarehouse size={14} /> Cantidad de recepción por cada bodega
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datosBodega}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                  <XAxis dataKey="bodega" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} formatter={(v, n) => {
                    if (n === 'unidades') return `${fmtNum(v)} und`
                    if (n === 'pesoKg') return `${fmtNum(v)} kg`
                    return fmtNum(v)
                  }} />
                  <Bar yAxisId="left" dataKey="unidades" radius={[6, 6, 0, 0]} name="Unidades">
                    {datosBodega.map((entry, idx) => (
                      <Cell key={idx} fill={COLORES_BODEGA[idx % COLORES_BODEGA.length]} />
                    ))}
                  </Bar>
                  <Bar yAxisId="left" dataKey="registros" fill={COLOR_VERDE_GRIS} radius={[6, 6, 0, 0]} name="Registros" />
                  <Line yAxisId="right" type="monotone" dataKey="pesoKg" stroke={COLOR_NARANJA} strokeWidth={3} dot={{ r: 5, fill: COLOR_NARANJA }} name="Peso (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA DETALLE */}
          <div className="alm-table-container">
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLOR_BORDE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiBarChart2 size={14} style={{ color: COLOR_AZUL_PRINCIPAL }} />
                <span style={{ fontWeight: 700, color: COLOR_TEXTO_PRIMARIO }}>Detalle de Registros</span>
                <span className="alm-badge">{fmtNum(registros.length)} registros</span>
              </div>
              {peakHora && (
                <div style={{ fontSize: 11, color: COLOR_TEXTO_SECUNDARIO }}>
                  ⏱ Hora pico de descarga: <strong style={{ color: COLOR_NARANJA }}>{peakHora.hora}</strong>
                </div>
              )}
            </div>
            <div className="alm-table-wrap">
              <table className="alm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Bodega</th>
                    <th>Placa Camión</th>
                    <th>Placa Remolque</th>
                    <th>Hora Inicio</th>
                    <th>Hora Fin</th>
                    <th>Duración</th>
                    <th>Buen Estado</th>
                    <th>Dañados</th>
                    <th>Peso (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.length === 0 ? (
                    <tr><td colSpan="11" style={{ textAlign: 'center', padding: 50, color: COLOR_TEXTO_SECUNDARIO }}>Sin resultados con los filtros aplicados</td></tr>
                  ) : (
                    registros
                      .sort((a, b) => (a.inicioDate?.getTime() || 0) - (b.inicioDate?.getTime() || 0))
                      .slice(0, 200)
                      .map((r) => (
                        <tr key={r.titulo} className={r.cantidadDanado > 0 ? 'alm-row-danado' : ''}>
                          <td style={{ fontWeight: 700 }}>{r.titulo}</td>
                          <td>{r.fecha}</td>
                          <td>{r.bodega}</td>
                          <td>{r.placaCamion}</td>
                          <td>{r.placaRemolque}</td>
                          <td>{r.horaInicio}</td>
                          <td>{r.horaFin}</td>
                          <td style={{ fontWeight: 600, color: r.duracionMin > 30 ? COLOR_ROJO : r.duracionMin > 15 ? COLOR_NARANJA : COLOR_AZUL_PRINCIPAL }}>{r.duracionMin}m</td>
                          <td style={{ fontWeight: 600, color: COLOR_AZUL_PRINCIPAL }}>{r.cantidadBuenEstado}</td>
                          <td style={{ fontWeight: 700, color: r.cantidadDanado > 0 ? COLOR_ROJO : COLOR_TEXTO_SECUNDARIO }}>{r.cantidadDanado}</td>
                          <td style={{ fontWeight: 700 }}>{fmtNum(r.pesoNetoKg)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            {registros.length > 200 && (
              <div style={{ padding: 12, textAlign: 'center', fontSize: 11, color: COLOR_TEXTO_SECUNDARIO, borderTop: `1px solid ${COLOR_BORDE}` }}>
                Mostrando primeras 200 filas. Exportá a Excel para ver todos los {fmtNum(registros.length)} registros.
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div style={{ textAlign: 'center', padding: '24px 20px', marginTop: 28, fontSize: 10, color: COLOR_TEXTO_SECUNDARIO, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span><GiCargoShip size={10} /> Barco: GANT NEREA</span>
              <span><GiMinerals size={10} /> Producto: Cemento portland</span>
              <span><FaBuilding size={10} /> {datosBodega.length} bodegas activas</span>
              <span><FiPackage size={10} /> {fmtNum(stats.totalJumbos)} jumbos</span>
              <span><MdAccessTime size={10} /> {stats.duracionPromedioMin.toFixed(1)} min promedio</span>
            </div>
            <div style={{ color: COLOR_AZUL_PRINCIPAL, fontWeight: 600 }}>
              ALMACENADORA DEL PACÍFICO · Reporte temporal de Recepción de Jumbos (datos mock)
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
