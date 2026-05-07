// compartido/clinker_nica/[token]/page.js
// compartido/clinker_nica/[token]/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Ship, Anchor, Clock, AlertCircle, Wrench, FileSpreadsheet,
  Calendar, BarChart3, TrendingUp, PieChart as PieChartIcon,
  RefreshCw, Download, Filter, X, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, Zap, Activity, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts'
import * as XLSX from 'xlsx'

dayjs.extend(utc)
dayjs.extend(timezone)
const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

const formatUTCToSV = (utcDate, format = 'DD/MM/YY HH:mm') => {
  if (!utcDate) return '—'
  return dayjs.utc(utcDate).tz(TIMEZONE_EL_SALVADOR).format(format)
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

// Función para cargar todos los registros sin límite
const cargarTodosLosRegistros = async (tabla, filtro, valor) => {
  let todos = []
  let desde = 0
  const limite = 1000
  let hayMas = true

  while (hayMas) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq(filtro, valor)
      .order('fecha', { ascending: false })
      .range(desde, desde + limite - 1)

    if (error) break

    if (data && data.length > 0) {
      todos = [...todos, ...data]
      desde += limite
      hayMas = data.length === limite
    } else {
      hayMas = false
    }
  }
  return todos
}

export default function ClinkerDashboard({ token }) {
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [barcazas, setBarcazas] = useState([])
  const [atrasosGrua, setAtrasosGrua] = useState([])
  const [filtroFecha, setFiltroFecha] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [token])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        toast.error('Barco no encontrado')
        setLoading(false)
        return
      }

      setBarco(barcoData)

      const barcazasData = await cargarTodosLosRegistros('clinker_barcazas', 'barco_id', barcoData.id)
      const atrasosData = await cargarTodosLosRegistros('clinker_atrasos_grua', 'barco_id', barcoData.id)

      setBarcazas(barcazasData)
      setAtrasosGrua(atrasosData)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar datos
  const barcazasFiltradas = useMemo(() => {
    if (!filtroFecha) return barcazas
    return barcazas.filter(b => b.fecha === filtroFecha)
  }, [barcazas, filtroFecha])

  const atrasosFiltrados = useMemo(() => {
    if (!filtroFecha) return atrasosGrua
    return atrasosGrua.filter(a => a.fecha === filtroFecha)
  }, [atrasosGrua, filtroFecha])

  // Estadísticas
  const estadisticas = useMemo(() => {
    // Barcazas
    const totalBarcazas = barcazas.length
    const barcazasUnicas = [...new Set(barcazas.map(b => b.nombre_barcaza))]
    let minutosOperacion = 0
    barcazas.forEach(b => {
      if (b.tiempo_total) {
        const match = b.tiempo_total.match(/(\d+)h\s*(\d+)m/)
        if (match) {
          minutosOperacion += parseInt(match[1]) * 60 + parseInt(match[2])
        }
      }
    })

    // Atrasos
    const totalAtrasos = atrasosGrua.length
    const minutosAtraso = atrasosGrua.reduce((sum, a) => sum + (a.minutos || 0), 0)
    const eficiencia = minutosOperacion + minutosAtraso > 0 
      ? ((minutosOperacion / (minutosOperacion + minutosAtraso)) * 100).toFixed(1)
      : 100

    // Datos por día
    const operacionPorDia = {}
    barcazas.forEach(b => {
      if (!operacionPorDia[b.fecha]) operacionPorDia[b.fecha] = { fecha: b.fecha, minutosOperacion: 0, minutosAtraso: 0, viajes: 0 }
      operacionPorDia[b.fecha].viajes++
      const match = b.tiempo_total?.match(/(\d+)h\s*(\d+)m/)
      if (match) {
        operacionPorDia[b.fecha].minutosOperacion += parseInt(match[1]) * 60 + parseInt(match[2])
      }
    })
    atrasosGrua.forEach(a => {
      if (!operacionPorDia[a.fecha]) operacionPorDia[a.fecha] = { fecha: a.fecha, minutosOperacion: 0, minutosAtraso: 0, viajes: 0 }
      operacionPorDia[a.fecha].minutosAtraso += a.minutos || 0
    })

    const datosPorDia = Object.values(operacionPorDia)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map(d => ({
        ...d,
        eficienciaDia: d.minutosOperacion + d.minutosAtraso > 0 
          ? ((d.minutosOperacion / (d.minutosOperacion + d.minutosAtraso)) * 100).toFixed(1)
          : 100
      }))

    // Datos por barcaza
    const operacionPorBarcaza = {}
    barcazas.forEach(b => {
      if (!operacionPorBarcaza[b.nombre_barcaza]) {
        operacionPorBarcaza[b.nombre_barcaza] = { nombre: b.nombre_barcaza, viajes: 0, minutosOperacion: 0 }
      }
      operacionPorBarcaza[b.nombre_barcaza].viajes++
      const match = b.tiempo_total?.match(/(\d+)h\s*(\d+)m/)
      if (match) {
        operacionPorBarcaza[b.nombre_barcaza].minutosOperacion += parseInt(match[1]) * 60 + parseInt(match[2])
      }
    })

    // Top causas de atraso
    const causasAtraso = {}
    atrasosGrua.forEach(a => {
      if (a.descripcion) {
        const causa = a.descripcion.substring(0, 50)
        causasAtraso[causa] = (causasAtraso[causa] || 0) + (a.minutos || 0)
      }
    })
    const topCausas = Object.entries(causasAtraso)
      .map(([descripcion, minutos]) => ({ descripcion, minutos }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 5)

    return {
      totalBarcazas,
      barcazasUnicas: barcazasUnicas.length,
      horasOperacion: Math.floor(minutosOperacion / 60),
      minutosOperacion: minutosOperacion % 60,
      totalAtrasos,
      horasAtraso: Math.floor(minutosAtraso / 60),
      minutosAtraso: minutosAtraso % 60,
      eficiencia,
      datosPorDia,
      operacionPorBarcaza: Object.values(operacionPorBarcaza),
      topCausas
    }
  }, [barcazas, atrasosGrua])

  // Datos para gráfica de evolución de atrasos
  const evolucionAtrasos = useMemo(() => {
    const porDia = {}
    atrasosGrua.forEach(a => {
      if (!porDia[a.fecha]) porDia[a.fecha] = { fecha: a.fecha, minutosAtraso: 0 }
      porDia[a.fecha].minutosAtraso += a.minutos || 0
    })
    return Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [atrasosGrua])

  // Fechas disponibles para filtro
  const fechasDisponibles = useMemo(() => {
    const fechas = new Set()
    barcazas.forEach(b => fechas.add(b.fecha))
    atrasosGrua.forEach(a => fechas.add(a.fecha))
    return Array.from(fechas).sort().reverse()
  }, [barcazas, atrasosGrua])

  const exportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      const fechaActual = dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD_HHmm')

      // Resumen
      const resumenData = [
        ['DASHBOARD CLINKER NICARAGUA'],
        [`Barco: ${barco?.nombre || 'N/A'}`],
        [`Código: ${barco?.codigo_barco || 'N/A'}`],
        [`Fecha: ${dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm:ss')}`],
        [],
        ['RESUMEN OPERATIVO'],
        ['Total Barcazas Registradas', estadisticas.totalBarcazas],
        ['Barcazas Distintas', estadisticas.barcazasUnicas],
        ['Tiempo Total de Operación', `${estadisticas.horasOperacion}h ${estadisticas.minutosOperacion}m`],
        ['Total Atrasos de Grúa', estadisticas.totalAtrasos],
        ['Tiempo Total en Atrasos', `${estadisticas.horasAtraso}h ${estadisticas.minutosAtraso}m`],
        ['Eficiencia Operativa', `${estadisticas.eficiencia}%`],
        [],
        ['DATOS POR DÍA'],
        ['Fecha', 'Viajes', 'Minutos Operación', 'Minutos Atraso', 'Eficiencia']
      ]
      estadisticas.datosPorDia.forEach(d => {
        resumenData.push([d.fecha, d.viajes, d.minutosOperacion, d.minutosAtraso, `${d.eficienciaDia}%`])
      })
      resumenData.push([], ['BARCASAS DETALLE'])
      resumenData.push(['Fecha', 'Barcaza', 'Placa', 'Hora Inicio', 'Hora Fin', 'Tiempo Total', 'Observaciones'])
      barcazas.forEach(b => {
        resumenData.push([b.fecha, b.nombre_barcaza, b.placa || '—', b.hora_inicio, b.hora_finalizacion || '—', b.tiempo_total || '—', b.observaciones || '—'])
      })
      resumenData.push([], ['ATRASOS DE GRÚA DETALLE'])
      resumenData.push(['Fecha', 'Hora Inicio', 'Hora Fin', 'Minutos', 'Descripción'])
      atrasosGrua.forEach(a => {
        resumenData.push([a.fecha, a.hora_inicio, a.hora_fin || 'En curso', a.minutos || '—', a.descripcion || '—'])
      })

      const ws = XLSX.utils.aoa_to_sheet(resumenData)
      ws['!cols'] = [{ wch: 20 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(wb, ws, 'Dashboard')
      
      XLSX.writeFile(wb, `Clinker_Dashboard_${barco?.nombre}_${fechaActual}.xlsx`)
      toast.success('Excel descargado')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al exportar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white">Barco no encontrado</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Anchor className="w-8 h-8" />
                  Dashboard - {barco.nombre}
                </h1>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">{barco.codigo_barco}</span>
              </div>
              <p className="text-orange-200 text-sm mt-1">Clinker Nicaragua · Monitoreo de Operaciones</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarExcel} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Exportar
              </button>
              <button onClick={cargarDatos} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Actualizar
              </button>
            </div>
          </div>

          {/* Filtro de fecha */}
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4" />
            <select
              value={filtroFecha || ''}
              onChange={(e) => setFiltroFecha(e.target.value || null)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white"
            >
              <option value="">Todas las fechas</option>
              {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {filtroFecha && (
              <button onClick={() => setFiltroFecha(null)} className="text-xs text-orange-200 flex items-center gap-1">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Ship className="w-6 h-6 text-blue-400" />
              <span className="text-slate-400 text-xs uppercase font-bold">Barcazas</span>
            </div>
            <p className="text-3xl font-black text-white">{estadisticas.totalBarcazas}</p>
            <p className="text-xs text-slate-500">{estadisticas.barcazasUnicas} barcazas distintas</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-green-400" />
              <span className="text-slate-400 text-xs uppercase font-bold">Tiempo Operación</span>
            </div>
            <p className="text-3xl font-black text-white">{estadisticas.horasOperacion}h</p>
            <p className="text-xs text-slate-500">{estadisticas.minutosOperacion} minutos</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-6 h-6 text-red-400" />
              <span className="text-slate-400 text-xs uppercase font-bold">Atrasos Grúa</span>
            </div>
            <p className="text-3xl font-black text-white">{estadisticas.totalAtrasos}</p>
            <p className="text-xs text-slate-500">{estadisticas.horasAtraso}h {estadisticas.minutosAtraso}m perdidos</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-yellow-400" />
              <span className="text-slate-400 text-xs uppercase font-bold">Eficiencia</span>
            </div>
            <p className="text-3xl font-black text-yellow-400">{estadisticas.eficiencia}%</p>
            <p className="text-xs text-slate-500">Tiempo operativo / Tiempo total</p>
          </div>
        </div>

        {/* Gráfica de Evolución de Atrasos */}
        {evolucionAtrasos.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-red-400" />
              Evolución de Atrasos por Día
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={evolucionAtrasos}>
                <defs>
                  <linearGradient id="atrasoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fecha" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} label={{ value: 'Minutos', angle: -90, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} formatter={(v) => [`${v} minutos`, 'Atraso']} />
                <Area type="monotone" dataKey="minutosAtraso" stroke="#ef4444" fill="url(#atrasoGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operación por Día */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Operación por Día
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estadisticas.datosPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="fecha" tick={{ fill: '#94a3b8' }} angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} label={{ value: 'Minutos', angle: -90, fill: '#94a3b8' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} label={{ value: 'Eficiencia %', angle: 90, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                <Bar yAxisId="left" dataKey="minutosOperacion" name="Minutos Operación" fill="#3b82f6" />
                <Bar yAxisId="left" dataKey="minutosAtraso" name="Minutos Atraso" fill="#ef4444" />
                <Line yAxisId="right" type="monotone" dataKey="eficienciaDia" name="Eficiencia %" stroke="#22c55e" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Operación por Barcaza */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-400" />
              Operación por Barcaza
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estadisticas.operacionPorBarcaza} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: '#94a3b8' }} label={{ value: 'Minutos', fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="nombre" tick={{ fill: '#94a3b8' }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} formatter={(v) => [`${Math.floor(v / 60)}h ${v % 60}m`, 'Tiempo Operación']} />
                <Bar dataKey="minutosOperacion" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
              {estadisticas.operacionPorBarcaza.map(b => (
                <div key={b.nombre} className="flex justify-between">
                  <span>{b.nombre}</span>
                  <span className="text-white">{b.viajes} viajes</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Causas de Atraso */}
        {estadisticas.topCausas.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Principales Causas de Atraso
            </h3>
            <div className="space-y-3">
              {estadisticas.topCausas.map((causa, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 truncate max-w-md">{causa.descripcion}</span>
                    <span className="text-red-400 font-bold">{Math.floor(causa.minutos / 60)}h {causa.minutos % 60}m</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      style={{ width: `${Math.min(100, (causa.minutos / estadisticas.topCausas[0].minutos) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla Resumen de Barcazas */}
        {barcazasFiltradas.length > 0 && (
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-white/10">
            <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
              <h3 className="font-bold text-white">Últimas Barcazas Registradas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-slate-400">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs text-slate-400">Barcaza</th>
                    <th className="px-4 py-2 text-left text-xs text-slate-400">Placa</th>
                    <th className="px-4 py-2 text-left text-xs text-slate-400">Tiempo</th>
                    <th className="px-4 py-2 text-left text-xs text-slate-400">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {barcazasFiltradas.slice(0, 10).map((b, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="px-4 py-2 text-slate-300">{b.fecha}</td>
                      <td className="px-4 py-2 font-medium text-white">{b.nombre_barcaza}</td>
                      <td className="px-4 py-2 font-mono text-blue-400">{b.placa || '—'}</td>
                      <td className="px-4 py-2 text-green-400">{b.tiempo_total || '—'}</td>
                      <td className="px-4 py-2 text-slate-400 max-w-xs truncate">{b.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-4">
          Clinker Nicaragua · Datos en tiempo real · Última actualización: {dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm:ss')}
        </div>
      </div>
    </div>
  )
}