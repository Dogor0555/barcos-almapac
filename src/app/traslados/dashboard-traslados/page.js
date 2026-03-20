'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin, isChequeroTraslado, logout } from '../../lib/auth'
import {
  Plus, LogOut, Truck, Calendar, User, Clock, Hash,
  Package, Edit2, Trash2, Eye, Search, Filter,
  RefreshCw, AlertCircle, X, CheckCircle, Clock3,
  Download, ChevronDown, ChevronUp, Loader, MoreVertical,
  ArrowLeft, BarChart3, TrendingUp, FolderOpen, RotateCw,
  Wrench, Moon, Sun, Smartphone, Activity, Users,
  Play, Pause, StopCircle, Menu, TrendingDown, Gauge,
  Zap, Target, Award, Flame, Shield, Activity as ActivityIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, PieChart, Pie, Cell, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

// Extender dayjs con plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale("es")

// Colores premium
const COLORES_PREMIUM = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  dark: '#0f172a',
  light: '#f8fafc',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  gradientWarm: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  gradientCool: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
}

// Componente de estadística premium
function StatCard({ title, value, icon, color, trend, trendValue, subtitle, delay }) {
  return (
    <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-card-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="stat-card-content">
        <p className="stat-card-title">{title}</p>
        <p className="stat-card-value">{value}</p>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        {trend && (
          <div className="stat-card-trend">
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="stat-card-glow" style={{ background: color }} />
    </div>
  )
}

// Componente de métrica de tiempo premium
function TimeMetricsCard({ tiempoTotal, tiempoInactividad, tiempoEfectivo, unidades }) {
  const eficiencia = tiempoTotal > 0 ? ((tiempoEfectivo / tiempoTotal) * 100).toFixed(1) : 0
  const unidadesPorHora = tiempoEfectivo > 0 ? (unidades / (tiempoEfectivo / 60)).toFixed(1) : 0
  const productividadScore = Math.min(100, Math.round((unidadesPorHora / 25) * 100))

  const formatTiempo = (min) => {
    if (!min && min !== 0) return '0h 0m'
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m}m`
  }

  const getEfficiencyColor = () => {
    const eff = parseFloat(eficiencia)
    if (eff >= 80) return '#10b981'
    if (eff >= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="time-metrics-card">
      <div className="time-metrics-header">
        <div className="time-metrics-title">
          <ActivityIcon size={24} />
          <span>Métricas de Rendimiento</span>
        </div>
        
      </div>

      <div className="time-metrics-grid">
        <div className="time-metric-item">
          <div className="time-metric-icon" style={{ background: '#3b82f6' }}>
            <Clock size={20} />
          </div>
          <div className="time-metric-info">
            <span className="time-metric-label">Tiempo Total Turnos</span>
            <strong className="time-metric-value">{formatTiempo(tiempoTotal)}</strong>
            <span className="time-metric-sub">Sumatoria de turnos</span>
          </div>
        </div>

        <div className="time-metric-item">
          <div className="time-metric-icon" style={{ background: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div className="time-metric-info">
            <span className="time-metric-label">Tiempo Inactividad</span>
            <strong className="time-metric-value">{formatTiempo(tiempoInactividad)}</strong>
            <span className="time-metric-sub">Atrasos y paros</span>
          </div>
        </div>

        <div className="time-metric-item">
          <div className="time-metric-icon" style={{ background: '#10b981' }}>
            <Zap size={20} />
          </div>
          <div className="time-metric-info">
            <span className="time-metric-label">Tiempo Efectivo</span>
            <strong className="time-metric-value">{formatTiempo(tiempoEfectivo)}</strong>
            <span className="time-metric-sub">Tiempo productivo</span>
          </div>
        </div>

        <div className="time-metric-item">
          <div className="time-metric-icon" style={{ background: '#f59e0b' }}>
            <Gauge size={20} />
          </div>
          <div className="time-metric-info">
            <span className="time-metric-label">Unidades por Hora</span>
            <strong className="time-metric-value">{unidadesPorHora}</strong>
            <span className="time-metric-sub">Promedio descarga</span>
          </div>
        </div>
      </div>

      <div className="efficiency-bar-container">
        <div className="efficiency-bar-label">
          <span>Productividad</span>
          <span>{productividadScore}%</span>
        </div>
        <div className="efficiency-bar-track">
          <div className="efficiency-bar-fill" style={{ width: `${productividadScore}%`, background: COLORES_PREMIUM.gradientCool }} />
        </div>
        <div className="efficiency-metrics">
          <div className="efficiency-metric">
            <Flame size={12} />
            <span>{unidades} unidades</span>
          </div>
          <div className="efficiency-metric">
            <Clock size={12} />
            <span>{Math.floor(tiempoEfectivo / 60)}h efectivas</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de gráfica premium
function PremiumBarChart({ data, title, icon }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <BarChart3 size={48} />
        <p>No hay datos suficientes</p>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          {icon}
          <span>{title}</span>
        </div>
        <div className="chart-badge">{data.length} operativos</div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="nombre" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }}
            formatter={(value, name) => {
              const horas = Math.floor(value / 60)
              const minutos = value % 60
              if (name === 'unidades') return [`${value} unidades`, 'Unidades']
              return [`${horas}h ${minutos}m`, name === 'tiempoEfectivo' ? 'Tiempo Efectivo' : 'Tiempo Inactividad']
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
          <Bar yAxisId="left" dataKey="tiempoEfectivo" name="Tiempo Efectivo" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar yAxisId="left" dataKey="tiempoInactividad" name="Tiempo Inactividad" fill="#ef4444" radius={[8, 8, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="unidades" name="Unidades" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente de gráfica de tendencia premium
function TrendChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <TrendingUp size={48} />
        <p>No hay datos de tendencia</p>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <TrendingUp size={18} />
          <span>{title}</span>
        </div>
        <div className="chart-badge">Últimas 24 horas</div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }}
            formatter={(value) => [`${value} unidades`, 'Descargadas']}
          />
          <Area type="monotone" dataKey="unidades" stroke="#6366f1" strokeWidth={3} fill="url(#areaGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente de radar chart para rendimiento
function PerformanceRadar({ eficiencia, unidadesPorHora, tiempoEfectivo, tiempoInactividad }) {
  const data = [
    { subject: 'Eficiencia', value: Math.min(100, eficiencia), fullMark: 100 },
    { subject: 'Unidades/h', value: Math.min(100, (unidadesPorHora / 25) * 100), fullMark: 100 },
    { subject: 'Tiempo Efectivo', value: Math.min(100, (tiempoEfectivo / 480) * 100), fullMark: 100 },
    { subject: 'Productividad', value: Math.min(100, (unidadesPorHora / 20) * 100), fullMark: 100 },
  ]

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <Target size={18} />
          <span>Rendimiento por Métrica</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
          <Radar name="Rendimiento" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }}
            formatter={(value) => [`${value.toFixed(1)}%`, 'Puntaje']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente de atrasos por tipo premium
function AtrasosPieChart({ data, totalMinutos }) {
  const formatTiempo = (min) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m}m`
  }

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6']

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <AlertCircle size={48} />
        <p>No hay atrasos registrados</p>
      </div>
    )
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          <AlertCircle size={18} />
          <span>Distribución de Atrasos</span>
        </div>
        <div className="chart-badge">Total: {formatTiempo(totalMinutos)}</div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="minutos"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#fff' }}
            formatter={(value) => {
              const h = Math.floor(value / 60)
              const m = value % 60
              return [`${h}h ${m}m`, 'Duración']
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Componente de tabla premium
function PremiumTable({ title, data, columns, badge }) {
  if (!data || data.length === 0) {
    return (
      <div className="table-card">
        <div className="table-header">
          <div className="table-title">{title}</div>
          {badge && <div className="table-badge">{badge}</div>}
        </div>
        <div className="table-empty">
          <Package size={32} />
          <p>No hay datos disponibles</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-card">
      <div className="table-header">
        <div className="table-title">{title}</div>
        {badge && <div className="table-badge">{badge}</div>}
      </div>
      <div className="table-scroll">
        <table className="premium-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente principal
export default function DashboardTiemposPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [operativos, setOperativos] = useState([])
  const [traslados, setTraslados] = useState([])
  const [turnos, setTurnos] = useState([])
  const [atrasos, setAtrasos] = useState([])
  const [tiposParo, setTiposParo] = useState([])
  const [filtroOperativo, setFiltroOperativo] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState({ activo: false, inicio: null, fin: null })
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || (!isAdmin() && !isChequeroTraslado())) {
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .order('created_at', { ascending: false })
      setOperativos(operativosData || [])

      let queryTraslados = supabase.from('traslados').select('*').order('fecha', { ascending: false })
      let queryTurnos = supabase.from('turnos_operativos').select('*').order('fecha', { ascending: false })
      let queryAtrasos = supabase.from('traslados_atrasos').select('*, operativo:operativo_id(*)').eq('es_general', true)

      if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
        const fechaInicio = dayjs(filtroFecha.inicio).format('YYYY-MM-DD')
        const fechaFin = dayjs(filtroFecha.fin).format('YYYY-MM-DD')
        queryTraslados = queryTraslados.gte('fecha', fechaInicio).lte('fecha', fechaFin)
        queryTurnos = queryTurnos.gte('fecha', fechaInicio).lte('fecha', fechaFin)
        queryAtrasos = queryAtrasos.gte('fecha', fechaInicio).lte('fecha', fechaFin)
      }

      const [trasladosRes, turnosRes, tiposRes, atrasosRes] = await Promise.all([
        queryTraslados,
        queryTurnos,
        supabase.from('tipos_paro').select('*').eq('activo', true),
        queryAtrasos
      ])

      setTraslados(trasladosRes.data || [])
      setTurnos(turnosRes.data || [])
      setTiposParo(tiposRes.data || [])
      setAtrasos(atrasosRes.data || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleRangoFecha = (inicio, fin) => {
    setFiltroFecha({ activo: true, inicio, fin })
    setShowDatePicker(false)
    cargarDatos()
  }

  const formatTiempo = (min) => {
    if (!min && min !== 0) return '0h 0m'
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m}m`
  }

  const trasladosFiltrados = filtroOperativo === 'todos' 
    ? traslados 
    : traslados.filter(t => t.operativo_id === parseInt(filtroOperativo))

  const turnosFiltrados = filtroOperativo === 'todos'
    ? turnos
    : turnos.filter(t => t.operativo_id === parseInt(filtroOperativo))

  const atrasosFiltrados = filtroOperativo === 'todos'
    ? atrasos.map(a => ({ ...a, operativo_nombre: a.operativo?.nombre || '—' }))
    : atrasos.filter(a => a.operativo_id === parseInt(filtroOperativo)).map(a => ({ ...a, operativo_nombre: a.operativo?.nombre || '—' }))

  // Calcular métricas
  const metricas = useMemo(() => {
    let tiempoTotalTurnos = 0
    let tiempoInactividad = 0

    turnosFiltrados.forEach(t => {
      if (t.hora_inicio && t.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoTotalTurnos += diff
      } else if (t.duracion_minutos) {
        tiempoTotalTurnos += t.duracion_minutos
      }
    })

    atrasosFiltrados.forEach(a => {
      if (a.duracion_minutos) {
        tiempoInactividad += a.duracion_minutos
      } else if (a.hora_inicio && a.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoInactividad += diff
      }
    })

    const tiempoEfectivo = Math.max(0, tiempoTotalTurnos - tiempoInactividad)
    const totalUnidades = trasladosFiltrados.length
    const unidadesPorHora = tiempoEfectivo > 0 ? (totalUnidades / (tiempoEfectivo / 60)).toFixed(1) : 0
    const eficiencia = tiempoTotalTurnos > 0 ? ((tiempoEfectivo / tiempoTotalTurnos) * 100).toFixed(1) : 0

    return { tiempoTotalTurnos, tiempoInactividad, tiempoEfectivo, totalUnidades, unidadesPorHora, eficiencia }
  }, [turnosFiltrados, atrasosFiltrados, trasladosFiltrados])

  // Datos para gráficas
  const datosOperativos = useMemo(() => {
    const ops = filtroOperativo === 'todos' ? operativos : operativos.filter(o => o.id === parseInt(filtroOperativo))
    return ops.map(op => {
      const turnosOp = turnos.filter(t => t.operativo_id === op.id)
      const trasladosOp = traslados.filter(t => t.operativo_id === op.id)
      const atrasosOp = atrasos.filter(a => a.operativo_id === op.id)

      let tiempoTotal = 0
      turnosOp.forEach(t => {
        if (t.hora_inicio && t.hora_fin) {
          const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
          const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
          let diff = fin.diff(inicio, 'minute')
          if (diff < 0) diff += 24 * 60
          tiempoTotal += diff
        } else if (t.duracion_minutos) {
          tiempoTotal += t.duracion_minutos
        }
      })

      let tiempoInact = 0
      atrasosOp.forEach(a => {
        if (a.duracion_minutos) tiempoInact += a.duracion_minutos
        else if (a.hora_inicio && a.hora_fin) {
          const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
          const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
          let diff = fin.diff(inicio, 'minute')
          if (diff < 0) diff += 24 * 60
          tiempoInact += diff
        }
      })

      return {
        id: op.id,
        nombre: op.nombre.length > 20 ? op.nombre.substring(0, 20) + '...' : op.nombre,
        tiempoTotalTurnos: tiempoTotal,
        tiempoInactividad: tiempoInact,
        tiempoEfectivo: Math.max(0, tiempoTotal - tiempoInact),
        unidades: trasladosOp.length
      }
    }).filter(op => op.tiempoTotalTurnos > 0 || op.unidades > 0)
  }, [operativos, turnos, traslados, atrasos, filtroOperativo])

  const datosUnidadesPorHora = useMemo(() => {
    if (trasladosFiltrados.length === 0) return []
    const porHora = {}
    trasladosFiltrados.forEach(t => {
      if (t.hora_inicio_carga) {
        const hora = t.hora_inicio_carga.slice(0, 5)
        porHora[hora] = (porHora[hora] || 0) + 1
      }
    })
    return Object.entries(porHora).map(([hora, unidades]) => ({ hora, unidades })).sort((a, b) => a.hora.localeCompare(b.hora)).slice(-24)
  }, [trasladosFiltrados])

  const atrasosPorTipo = useMemo(() => {
    const porTipo = {}
    atrasosFiltrados.forEach(a => {
      const tipo = tiposParo.find(t => t.id === a.tipo_paro_id)
      const nombreTipo = tipo?.nombre || 'Otros'
      const duracion = a.duracion_minutos || 0
      porTipo[nombreTipo] = (porTipo[nombreTipo] || 0) + duracion
    })
    return Object.entries(porTipo).map(([name, minutos]) => ({ name, minutos })).sort((a, b) => b.minutos - a.minutos).slice(0, 8)
  }, [atrasosFiltrados, tiposParo])

  const totalMinutosAtrasos = atrasosFiltrados.reduce((sum, a) => sum + (a.duracion_minutos || 0), 0)

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="loading-ring"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', sans-serif;
          background: #f1f5f9;
        }
        
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        
        /* Header */
        .dashboard-header {
          background: #0f172a;
          padding: 0 32px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        
        .header-logo {
          height: 40px;
          filter: brightness(0) invert(1);
        }
        
        .header-divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.2);
        }
        
        .header-title h1 {
          font-size: 18px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }
        
        .header-title p {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          font-family: monospace;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .header-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          padding: 8px 16px;
          border-radius: 12px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        
        .header-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }
        
        /* Main Content */
        .dashboard-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px;
        }
        
        /* Stat Cards */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .stat-card {
          background: white;
          border-radius: 24px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s;
          animation: fadeInUp 0.5s ease forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        
        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .stat-card-content {
          flex: 1;
        }
        
        .stat-card-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }
        
        .stat-card-value {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          font-family: monospace;
        }
        
        .stat-card-subtitle {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 4px;
        }
        
        .stat-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          margin-top: 6px;
          color: #10b981;
        }
        
        .stat-card-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          opacity: 0.6;
        }
        
        /* Time Metrics Card */
        .time-metrics-card {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 28px;
          padding: 28px;
          margin-bottom: 32px;
          color: white;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
        }
        
        .time-metrics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .time-metrics-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
        }
        
        .time-metrics-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 40px;
          font-size: 13px;
          font-weight: 600;
        }
        
        .time-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }
        
        .time-metric-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255,255,255,0.08);
          padding: 16px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        
        .time-metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .time-metric-info {
          flex: 1;
        }
        
        .time-metric-label {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          display: block;
          margin-bottom: 4px;
        }
        
        .time-metric-value {
          font-size: 20px;
          font-weight: 800;
          font-family: monospace;
          display: block;
          margin-bottom: 2px;
        }
        
        .time-metric-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.5);
        }
        
        .efficiency-bar-container {
          margin-top: 8px;
        }
        
        .efficiency-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 8px;
          color: rgba(255,255,255,0.7);
        }
        
        .efficiency-bar-track {
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .efficiency-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 1s ease;
        }
        
        .efficiency-metrics {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          gap: 16px;
        }
        
        .efficiency-metric {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255,255,255,0.6);
        }
        
        /* Charts Grid */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .chart-card {
          background: white;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s;
        }
        
        .chart-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .chart-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .chart-badge {
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        
        .chart-empty {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #94a3b8;
        }
        
        /* Table Card */
        .table-card {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }
        
        .table-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .table-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .table-badge {
          background: #f1f5f9;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
        }
        
        .table-scroll {
          overflow-x: auto;
        }
        
        .premium-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .premium-table th {
          text-align: left;
          padding: 14px 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .premium-table td {
          padding: 14px 20px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .premium-table tr:hover td {
          background: #f8fafc;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-left {
          text-align: left;
        }
        
        .table-empty {
          padding: 60px;
          text-align: center;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        /* Filter Bar */
        .filter-bar {
          background: white;
          border-radius: 20px;
          padding: 16px 24px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .filter-select {
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }
        
        .filter-select:hover {
          border-color: #6366f1;
        }
        
        .filter-date-btn {
          padding: 8px 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .filter-date-btn.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }
        
        .filter-clear {
          background: none;
          border: none;
          font-size: 12px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .filter-clear:hover {
          color: #ef4444;
        }
        
        /* Date Range Picker */
        .date-picker-container {
          position: relative;
        }
        
        .date-picker-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.2);
          z-index: 50;
          min-width: 280px;
        }
        
        /* Loading */
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        }
        
        .loading-spinner {
          text-align: center;
          color: white;
        }
        
        .loading-ring {
          width: 60px;
          height: 60px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .time-metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .dashboard-main {
            padding: 20px;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .time-metrics-grid {
            grid-template-columns: 1fr;
          }
          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>

      <header className="dashboard-header">
        <div className="header-left">
          <img src="/logo.png" alt="ALMAPAC" className="header-logo" />
          <div className="header-divider" />
          <div className="header-title">
            <h1>Dashboard de Tiempos y Rendimiento</h1>
            <p>{user?.nombre} · {user?.rol}</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={cargarDatos} className="header-btn">
            <RefreshCw size={14} /> Actualizar
          </button>
          {isAdmin() && (
            <button onClick={logout} className="header-btn" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <LogOut size={14} /> Salir
            </button>
          )}
        </div>
      </header>

      <main className="dashboard-main">
        {/* Filtros */}
        <div className="filter-bar">
          <span className="filter-label">
            <Filter size={14} /> Filtrar por:
          </span>
          <select
            value={filtroOperativo}
            onChange={(e) => setFiltroOperativo(e.target.value)}
            className="filter-select"
          >
            <option value="todos">Todos los operativos</option>
            {operativos.map(op => (
              <option key={op.id} value={op.id}>{op.nombre}</option>
            ))}
          </select>

          <div className="date-picker-container">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`filter-date-btn ${filtroFecha.activo ? 'active' : ''}`}
            >
              <Calendar size={14} />
              {filtroFecha.activo ? 'Rango activo' : 'Filtrar fechas'}
            </button>
            {showDatePicker && (
              <div className="date-picker-dropdown">
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Desde</label>
                  <input
                    type="datetime-local"
                    value={filtroFecha.inicio ? dayjs(filtroFecha.inicio).format('YYYY-MM-DDTHH:mm') : ''}
                    onChange={(e) => setFiltroFecha({ ...filtroFecha, inicio: dayjs(e.target.value).toDate() })}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Hasta</label>
                  <input
                    type="datetime-local"
                    value={filtroFecha.fin ? dayjs(filtroFecha.fin).format('YYYY-MM-DDTHH:mm') : ''}
                    onChange={(e) => setFiltroFecha({ ...filtroFecha, fin: dayjs(e.target.value).toDate() })}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => {
                      if (filtroFecha.inicio && filtroFecha.fin) {
                        handleRangoFecha(filtroFecha.inicio, filtroFecha.fin)
                      }
                    }}
                    style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Aplicar
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px', borderRadius: 8, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {filtroOperativo !== 'todos' && (
            <button onClick={() => setFiltroOperativo('todos')} className="filter-clear">
              <X size={12} /> Limpiar operativo
            </button>
          )}
          {filtroFecha.activo && (
            <button onClick={() => { setFiltroFecha({ activo: false, inicio: null, fin: null }); cargarDatos(); }} className="filter-clear">
              <X size={12} /> Limpiar fechas
            </button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="stats-grid">
          <StatCard 
            title="Unidades Cargadas" 
            value={metricas.totalUnidades} 
            icon={<Truck size={28} />} 
            color={COLORES_PREMIUM.gradientCool}
            delay={0}
          />
          <StatCard 
            title="Tiempo Total Turnos" 
            value={formatTiempo(metricas.tiempoTotalTurnos)} 
            icon={<Clock size={28} />} 
            color={COLORES_PREMIUM.gradient}
            delay={100}
          />
          <StatCard 
            title="Tiempo de Inactividad" 
            value={formatTiempo(metricas.tiempoInactividad)} 
            icon={<AlertCircle size={28} />} 
            color={COLORES_PREMIUM.gradientWarm}
            subtitle={`${metricas.tiempoTotalTurnos > 0 ? ((metricas.tiempoInactividad / metricas.tiempoTotalTurnos) * 100).toFixed(1) : 0}% del total`}
            delay={200}
          />
          <StatCard 
            title="Tiempo Efectivo" 
            value={formatTiempo(metricas.tiempoEfectivo)} 
            icon={<Zap size={28} />} 
            color={COLORES_PREMIUM.gradientCool}
            subtitle={`${metricas.eficiencia}% de productividad`}
            delay={300}
          />
        </div>

        {/* Time Metrics Card */}
        <TimeMetricsCard
          tiempoTotal={metricas.tiempoTotalTurnos}
          tiempoInactividad={metricas.tiempoInactividad}
          tiempoEfectivo={metricas.tiempoEfectivo}
          unidades={metricas.totalUnidades}
        />

        {/* Charts Grid */}
        <div className="charts-grid">
          <PremiumBarChart 
            data={datosOperativos} 
            title="Tiempos por Operativo" 
            icon={<BarChart3 size={18} />} 
          />
          <TrendChart 
            data={datosUnidadesPorHora} 
            title="Tendencia de Unidades por Hora" 
          />
        </div>

        <div className="charts-grid">
          <AtrasosPieChart 
            data={atrasosPorTipo} 
            totalMinutos={totalMinutosAtrasos} 
          />
          <PerformanceRadar 
            eficiencia={parseFloat(metricas.eficiencia)}
            unidadesPorHora={parseFloat(metricas.unidadesPorHora)}
            tiempoEfectivo={metricas.tiempoEfectivo}
            tiempoInactividad={metricas.tiempoInactividad}
          />
        </div>

        {/* Atrasos Table */}
        <PremiumTable
          title="Registro de Atrasos"
          badge={`${atrasosFiltrados.length} registros`}
          data={atrasosFiltrados}
          columns={[
            { key: 'fecha', label: 'Fecha', render: (v) => dayjs(v).format('DD/MM/YY') },
            { key: 'hora_inicio', label: 'Inicio', render: (v) => v?.slice(0, 5) || '—' },
            { key: 'hora_fin', label: 'Fin', render: (v) => v?.slice(0, 5) || 'En curso' },
            { 
              key: 'tipo_paro_id', 
              label: 'Tipo', 
              render: (v, row) => {
                const tipo = tiposParo.find(t => t.id === v)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
                    <span>{tipo?.nombre || '—'}</span>
                  </div>
                )
              }
            },
            { key: 'operativo_nombre', label: 'Operativo' },
            { key: 'duracion_minutos', label: 'Duración', align: 'right', render: (v) => formatTiempo(v || 0) },
            { key: 'observaciones', label: 'Observaciones', render: (v) => v || '—' }
          ]}
        />

        {/* Turnos Table */}
        <PremiumTable
          title="Turnos Registrados"
          badge={`${turnosFiltrados.length} turnos`}
          data={turnosFiltrados}
          columns={[
            { key: 'fecha', label: 'Fecha', render: (v) => dayjs(v).format('DD/MM/YY') },
            { key: 'chequero1', label: 'Chequero 1', render: (v) => v || '—' },
            { key: 'chequero2', label: 'Chequero 2', render: (v) => v || '—' },
            { key: 'operador', label: 'Operador', render: (v) => <strong>{v}</strong> },
            { 
              key: 'operativo_id', 
              label: 'Operativo', 
              render: (v) => operativos.find(o => o.id === v)?.nombre || '—' 
            },
            { key: 'hora_inicio', label: 'Inicio', render: (v) => v?.slice(0, 5) || '—' },
            { key: 'hora_fin', label: 'Fin', render: (v) => v?.slice(0, 5) || '—' },
            { 
              key: 'duracion', 
              label: 'Duración', 
              align: 'right',
              render: (_, row) => {
                let dur = null
                if (row.hora_inicio && row.hora_fin) {
                  const inicio = dayjs(`2000-01-01 ${row.hora_inicio}`)
                  const fin = dayjs(`2000-01-01 ${row.hora_fin}`)
                  let diff = fin.diff(inicio, 'minute')
                  if (diff < 0) diff += 24 * 60
                  dur = diff
                } else if (row.duracion_minutos) {
                  dur = row.duracion_minutos
                }
                return dur ? formatTiempo(dur) : '—'
              }
            },
            { key: 'observaciones', label: 'Observaciones', render: (v) => v || '—' }
          ]}
        />

        <div style={{ textAlign: 'center', padding: '24px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
          🔄 Datos en tiempo real · {filtroOperativo !== 'todos' ? `Operativo: ${operativos.find(o => o.id === parseInt(filtroOperativo))?.nombre}` : 'Todos los operativos'}
          {filtroFecha.activo && ` · Rango: ${dayjs(filtroFecha.inicio).format('DD/MM/YY HH:mm')} - ${dayjs(filtroFecha.fin).format('DD/MM/YY HH:mm')}`}
        </div>
      </main>
    </div>
  )
}