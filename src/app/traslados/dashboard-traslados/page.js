'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isAdmin, isChequeroTraslado, logout } from '../lib/auth'
import {
  Plus, LogOut, Truck, Calendar, User, Clock, Hash,
  Package, Edit2, Trash2, Eye, Search, Filter,
  RefreshCw, AlertCircle, X, CheckCircle, Clock3,
  Download, ChevronDown, ChevronUp, Loader, MoreVertical,
  ArrowLeft, BarChart3, TrendingUp, FolderOpen, RotateCw,
  Wrench, Moon, Sun, Smartphone, Activity, Users,
  Play, Pause, StopCircle, Menu, TrendingDown, Gauge
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'
import TrasladoForm from '../components/traslados/TrasladoForm'

// Configuración de zona horaria
const ZONA_HORARIA_SV = "America/El_Salvador"
dayjs.locale("es")
dayjs.tz.setDefault(ZONA_HORARIA_SV)

// Colores para gráficos
const COLORES = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
]

// Componente KPI Card
function KpiCard({ label, value, sub, icon, accent, animate, trend, trendValue }) {
  return (
    <div className="alm-kpi" style={{ "--accent": accent }}>
      <div className="alm-kpi-icon">{icon}</div>
      <div className="alm-kpi-body">
        <p className="alm-kpi-label">{label}</p>
        <p className={`alm-kpi-value ${animate ? "alm-pulse-num" : ""}`}>{value}</p>
        {sub && <p className="alm-kpi-sub">{sub}</p>}
        {trend && (
          <div className="alm-kpi-trend" style={{ color: trend === 'up' ? '#10b981' : '#ef4444' }}>
            {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="alm-kpi-bar" />
    </div>
  )
}

// Componente selector de rango de fechas
function DateRangeSelector({ fechaInicio, fechaFin, onChange, onClose }) {
  const [inicio, setInicio] = useState(fechaInicio ? dayjs(fechaInicio).format('YYYY-MM-DDTHH:mm') : '')
  const [fin, setFin] = useState(fechaFin ? dayjs(fechaFin).format('YYYY-MM-DDTHH:mm') : '')

  const handleAplicar = () => {
    if (inicio && fin) {
      onChange(dayjs(inicio).toDate(), dayjs(fin).toDate())
    }
  }

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
  )
}

// Componente de métricas de tiempo
function MetricasTiempoCard({ tiempoTotalTurnos, tiempoInactividad, tiempoEfectivo, totalUnidades }) {
  const eficiencia = tiempoTotalTurnos > 0 ? ((tiempoEfectivo / tiempoTotalTurnos) * 100).toFixed(1) : 0
  const unidadesPorHora = tiempoEfectivo > 0 ? (totalUnidades / (tiempoEfectivo / 60)).toFixed(1) : 0

  const formatTiempo = (minutos) => {
    if (!minutos && minutos !== 0) return '0h 0m'
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}m`
  }

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
            <Clock3 size={24} color="#10b981" />
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
              MÉTRICAS DE TIEMPO Y RENDIMIENTO
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
              {formatTiempo(tiempoTotalTurnos)} total
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(16,185,129,0.15)',
          padding: '8px 16px',
          borderRadius: 40,
          border: '1px solid rgba(16,185,129,0.3)'
        }}>
          <span style={{ fontSize: 12, color: '#6ee7b7' }}>EFICIENCIA OPERATIVA</span>
          <span style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#10b981',
            marginLeft: 8,
            fontFamily: "'DM Mono', monospace"
          }}>
            {eficiencia}%
          </span>
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
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>TIEMPO TOTAL TURNOS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6', fontFamily: "'DM Mono', monospace" }}>
            {formatTiempo(tiempoTotalTurnos)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Sumatoria de todos los turnos</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>TIEMPO DE INACTIVIDAD</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', fontFamily: "'DM Mono', monospace" }}>
            {formatTiempo(tiempoInactividad)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Atrasos y paros no productivos</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>TIEMPO EFECTIVO</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', fontFamily: "'DM Mono', monospace" }}>
            {formatTiempo(tiempoEfectivo)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Tiempo total - Inactividad</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>UNIDADES POR HORA</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontFamily: "'DM Mono', monospace" }}>
            {unidadesPorHora}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Promedio de descarga</div>
        </div>
      </div>

      {/* Barra de eficiencia visual */}
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          <span>Inactividad ({formatTiempo(tiempoInactividad)})</span>
          <span>Efectivo ({formatTiempo(tiempoEfectivo)})</span>
        </div>
        <div style={{
          height: 32,
          background: '#334155',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{
            width: `${(tiempoInactividad / tiempoTotalTurnos) * 100}%`,
            background: '#ef4444',
            transition: 'width 0.5s ease'
          }} />
          <div style={{
            width: `${(tiempoEfectivo / tiempoTotalTurnos) * 100}%`,
            background: '#10b981',
            transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          Eficiencia operativa: {eficiencia}% de tiempo productivo
        </div>
      </div>
    </div>
  )
}

// Componente de gráfica de tiempos por operativo
function GraficaTiemposOperativos({ datosOperativos }) {
  if (!datosOperativos || datosOperativos.length === 0) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No hay datos suficientes para mostrar la gráfica
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datosOperativos} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip
          formatter={(value, name) => {
            const horas = Math.floor(value / 60)
            const minutos = value % 60
            if (name === 'unidades') return [value, 'Unidades']
            return [`${horas}h ${minutos}m`, name === 'tiempoEfectivo' ? 'Tiempo Efectivo' : 'Tiempo Inactividad']
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="tiempoEfectivo" name="Tiempo Efectivo" fill="#10b981" />
        <Bar yAxisId="left" dataKey="tiempoInactividad" name="Tiempo Inactividad" fill="#ef4444" />
        <Line yAxisId="right" type="monotone" dataKey="unidades" name="Unidades" stroke="#f59e0b" strokeWidth={2} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Componente de gráfica de tendencia de unidades por hora
function GraficaUnidadesPorHora({ datosUnidadesPorHora }) {
  if (!datosUnidadesPorHora || datosUnidadesPorHora.length === 0) {
    return (
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No hay datos suficientes para mostrar la tendencia
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={datosUnidadesPorHora} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip formatter={(value) => [`${value} unidades`, 'Unidades descargadas']} />
        <Area type="monotone" dataKey="unidades" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Unidades por hora" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Componente de atrasos por tipo
function AtrasosPorTipoCard({ atrasosPorTipo }) {
  if (!atrasosPorTipo || atrasosPorTipo.length === 0) {
    return (
      <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        No hay atrasos registrados
      </div>
    )
  }

  const COLORS_ATRASOS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6']

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={atrasosPorTipo}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="minutos"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {atrasosPorTipo.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS_ATRASOS[index % COLORS_ATRASOS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => {
          const horas = Math.floor(value / 60)
          const minutos = value % 60
          return [`${horas}h ${minutos}m`, 'Duración total']
        }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Componente de tabla de atrasos
function TablaAtrasos({ atrasos, tiposParo, formatTiempo }) {
  const getTipoColor = (nombre) => {
    const n = nombre?.toLowerCase() || ''
    if (n.includes('desperfecto') || n.includes('grua')) return '#ef4444'
    if (n.includes('camion')) return '#f59e0b'
    if (n.includes('falla') || n.includes('sistema')) return '#8b5cf6'
    if (n.includes('comida')) return '#10b981'
    if (n.includes('lluvia')) return '#6366f1'
    return '#94a3b8'
  }

  if (atrasos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
        No hay atrasos registrados para el período seleccionado
      </div>
    )
  }

  return (
    <div className="alm-table-scroll">
      <table className="alm-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora Inicio</th>
            <th>Hora Fin</th>
            <th>Tipo</th>
            <th>Operativo</th>
            <th className="alm-th-num">Duración</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {atrasos.map((atraso) => {
            const tipo = tiposParo.find(t => t.id === atraso.tipo_paro_id)
            const color = getTipoColor(tipo?.nombre)
            const duracion = atraso.duracion_minutos || 0
            
            return (
              <tr key={atraso.id}>
                <td className="alm-mono">{dayjs(atraso.fecha).format('DD/MM/YY')}</td>
                <td className="alm-mono">{atraso.hora_inicio?.slice(0, 5)}</td>
                <td className="alm-mono">{atraso.hora_fin?.slice(0, 5) || 'En curso'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <span>{tipo?.nombre || '—'}</span>
                    {tipo?.es_imputable_almapac && (
                      <span style={{ fontSize: 9, background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: 999 }}>A</span>
                    )}
                  </div>
                </td>
                <td className="text-amber-400">{atraso.operativo_nombre || '—'}</td>
                <td className="alm-td-num alm-bold alm-mono">{formatTiempo(duracion)}</td>
                <td style={{ fontSize: 12, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {atraso.observaciones || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

      // Cargar operativos
      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .order('created_at', { ascending: false })

      setOperativos(operativosData || [])

      // Cargar traslados
      let queryTraslados = supabase
        .from('traslados')
        .select('*')
        .order('fecha', { ascending: false })

      if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
        queryTraslados = queryTraslados
          .gte('fecha', dayjs(filtroFecha.inicio).format('YYYY-MM-DD'))
          .lte('fecha', dayjs(filtroFecha.fin).format('YYYY-MM-DD'))
      }

      const { data: trasladosData } = await queryTraslados
      setTraslados(trasladosData || [])

      // Cargar turnos
      let queryTurnos = supabase
        .from('turnos_operativos')
        .select('*')
        .order('fecha', { ascending: false })

      if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
        queryTurnos = queryTurnos
          .gte('fecha', dayjs(filtroFecha.inicio).format('YYYY-MM-DD'))
          .lte('fecha', dayjs(filtroFecha.fin).format('YYYY-MM-DD'))
      }

      const { data: turnosData } = await queryTurnos
      setTurnos(turnosData || [])

      // Cargar tipos de paro
      const { data: tiposData } = await supabase
        .from('tipos_paro')
        .select('*')
        .eq('activo', true)

      setTiposParo(tiposData || [])

      // Cargar atrasos
      let queryAtrasos = supabase
        .from('traslados_atrasos')
        .select('*, operativo:operativo_id(*)')
        .eq('es_general', true)

      if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
        queryAtrasos = queryAtrasos
          .gte('fecha', dayjs(filtroFecha.inicio).format('YYYY-MM-DD'))
          .lte('fecha', dayjs(filtroFecha.fin).format('YYYY-MM-DD'))
      }

      const { data: atrasosData } = await queryAtrasos
      setAtrasos(atrasosData || [])

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

  const formatTiempo = (minutos) => {
    if (!minutos && minutos !== 0) return '0h 0m'
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas}h ${mins}m`
  }

  // Filtrar datos por operativo
  const trasladosFiltrados = filtroOperativo === 'todos' 
    ? traslados 
    : traslados.filter(t => t.operativo_id === parseInt(filtroOperativo))

  const turnosFiltrados = filtroOperativo === 'todos'
    ? turnos
    : turnos.filter(t => t.operativo_id === parseInt(filtroOperativo))

  const atrasosFiltrados = filtroOperativo === 'todos'
    ? atrasos.map(a => ({ ...a, operativo_nombre: a.operativo?.nombre || '—' }))
    : atrasos.filter(a => a.operativo_id === parseInt(filtroOperativo)).map(a => ({ ...a, operativo_nombre: a.operativo?.nombre || '—' }))

  // Calcular métricas de tiempo
  const calcularMetricasTiempo = () => {
    let tiempoTotalTurnos = 0
    let tiempoInactividad = 0

    // Sumar duración de todos los turnos
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

    // Sumar duración de todos los atrasos
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

    return { tiempoTotalTurnos, tiempoInactividad, tiempoEfectivo, totalUnidades }
  }

  const metricas = calcularMetricasTiempo()

  // Datos por operativo para gráfica
  const datosOperativos = useMemo(() => {
    const ops = filtroOperativo === 'todos' ? operativos : operativos.filter(o => o.id === parseInt(filtroOperativo))
    
    return ops.map(op => {
      const turnosOp = turnos.filter(t => t.operativo_id === op.id)
      const trasladosOp = traslados.filter(t => t.operativo_id === op.id)
      const atrasosOp = atrasos.filter(a => a.operativo_id === op.id)
      
      let tiempoTotalTurnos = 0
      turnosOp.forEach(t => {
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
      
      let tiempoInactividad = 0
      atrasosOp.forEach(a => {
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
      const unidades = trasladosOp.length
      
      return {
        id: op.id,
        nombre: op.nombre.length > 20 ? op.nombre.substring(0, 20) + '...' : op.nombre,
        tiempoTotalTurnos,
        tiempoInactividad,
        tiempoEfectivo,
        unidades
      }
    }).filter(op => op.tiempoTotalTurnos > 0 || op.unidades > 0)
  }, [operativos, turnos, traslados, atrasos, filtroOperativo])

  // Datos de unidades por hora
  const datosUnidadesPorHora = useMemo(() => {
    if (trasladosFiltrados.length === 0) return []
    
    const porHora = {}
    trasladosFiltrados.forEach(t => {
      if (t.hora_inicio_carga) {
        const hora = t.hora_inicio_carga.slice(0, 5)
        porHora[hora] = (porHora[hora] || 0) + 1
      }
    })
    
    return Object.entries(porHora)
      .map(([hora, unidades]) => ({ hora, unidades }))
      .sort((a, b) => a.hora.localeCompare(b.hora))
      .slice(-24)
  }, [trasladosFiltrados])

  // Atrasos por tipo
  const atrasosPorTipo = useMemo(() => {
    const porTipo = {}
    atrasosFiltrados.forEach(a => {
      const tipo = tiposParo.find(t => t.id === a.tipo_paro_id)
      const nombreTipo = tipo?.nombre || 'Otros'
      const duracion = a.duracion_minutos || 0
      porTipo[nombreTipo] = (porTipo[nombreTipo] || 0) + duracion
    })
    
    return Object.entries(porTipo)
      .map(([name, minutos]) => ({ name, minutos }))
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 8)
  }, [atrasosFiltrados, tiposParo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
          --text: #0f172a; --text-2: #475569; --text-3: #94a3b8;
          --blue: #3b82f6; --green: #10b981; --amber: #f59e0b; --navy: #0f172a;
          --radius: 16px; --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.06);
          font-family: 'Sora', sans-serif;
        }
        
        .alm-topbar {
          background: var(--navy); padding: 0 16px; display: flex;
          align-items: center; justify-content: space-between; height: 68px;
          position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,.18);
        }
        
        .alm-logo { height: 32px; width: auto; filter: brightness(0) invert(1); }
        .alm-user { font-size: 12px; color: rgba(255,255,255,.7); font-family: 'DM Mono', monospace; }
        .alm-refresh-btn {
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px; color: rgba(255,255,255,.8); padding: 6px 12px;
          font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;
        }
        .alm-refresh-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
        
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 24px; }
        
        .alm-kpis-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px; margin-bottom: 24px;
        }
        
        .alm-kpi {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 18px;
          display: flex; align-items: flex-start; gap: 14px;
          box-shadow: var(--shadow); position: relative; overflow: hidden;
        }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--accent); }
        .alm-kpi-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
        .alm-kpi-body { flex: 1; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); margin-bottom: 4px; }
        .alm-kpi-value { font-size: 22px; font-weight: 900; color: var(--text); line-height: 1.1; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: var(--text-3); margin-top: 3px; }
        .alm-kpi-bar { position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--accent); border-radius: 0 2px 2px 0; }
        .alm-kpi-trend { display: flex; align-items: center; gap: 2px; font-size: 10px; margin-top: 4px; }
        
        .alm-chart-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 20px;
          box-shadow: var(--shadow); margin-bottom: 20px;
        }
        .alm-chart-title {
          font-size: 13px; font-weight: 700; color: var(--text-2);
          margin-bottom: 16px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        
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
        .alm-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 800px; }
        .alm-table thead { background: #f8fafc; }
        .alm-table th { padding: 12px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--text-3); border-bottom: 1px solid var(--border); white-space: nowrap; }
        .alm-table td { padding: 12px 16px; color: var(--text-2); white-space: nowrap; }
        .alm-table tbody tr:hover { background: #f8fafc; }
        .alm-th-num, .alm-td-num { text-align: right; }
        .alm-bold { font-weight: 700; color: var(--text) !important; }
        .alm-mono { font-family: 'DM Mono', monospace; }
        
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: var(--text-3); font-family: 'DM Mono', monospace; margin-top: 20px; }
        
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .alm-pulse-num { animation: count-up .6s ease; }
        
        @media (max-width: 768px) {
          .alm-body { padding: 16px; }
          .alm-kpis-row { grid-template-columns: 1fr 1fr; gap: 10px; }
          .alm-kpi { padding: 12px; }
          .alm-kpi-value { font-size: 18px; }
          .alm-chart-title { font-size: 11px; }
        }
      `}</style>

      <header className="alm-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
          <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,.18)' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>Dashboard de Tiempos y Rendimiento</div>
            <div className="alm-user">{user?.nombre} · {user?.rol}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cargarDatos} className="alm-refresh-btn">
            <RefreshCw size={12} /> Actualizar
          </button>
          {isAdmin() && (
            <button onClick={logout} className="alm-refresh-btn" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <LogOut size={12} /> Salir
            </button>
          )}
        </div>
      </header>

      <div className="alm-body">
        {/* Filtros */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
          padding: '12px 20px', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>📊 Filtrar por:</span>
          
          <select
            value={filtroOperativo}
            onChange={(e) => setFiltroOperativo(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
              fontSize: 13, background: '#f8fafc', cursor: 'pointer'
            }}
          >
            <option value="todos">Todos los operativos</option>
            {operativos.map(op => (
              <option key={op.id} value={op.id}>{op.nombre}</option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: filtroFecha.activo ? '#0f172a' : '#f8fafc',
                color: filtroFecha.activo ? '#fff' : '#64748b',
                fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <Calendar size={14} />
              {filtroFecha.activo ? 'Rango activo' : 'Filtrar fechas'}
            </button>
            {showDatePicker && (
              <DateRangeSelector
                fechaInicio={filtroFecha.inicio}
                fechaFin={filtroFecha.fin}
                onChange={handleRangoFecha}
                onClose={() => setShowDatePicker(false)}
              />
            )}
          </div>

          {filtroOperativo !== 'todos' && (
            <button
              onClick={() => setFiltroOperativo('todos')}
              style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕ Limpiar operativo
            </button>
          )}
          {filtroFecha.activo && (
            <button
              onClick={() => {
                setFiltroFecha({ activo: false, inicio: null, fin: null })
                cargarDatos()
              }}
              style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕ Limpiar fechas
            </button>
          )}
        </div>

        {/* Indicador de filtro activo */}
        {filtroFecha.activo && (
          <div style={{
            marginBottom: 16, padding: '8px 16px', background: '#e0f2fe',
            border: '1px solid #7dd3fc', borderRadius: 8, fontSize: 12, color: '#0369a1',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Calendar size={14} />
            <span>
              Mostrando datos desde <strong>{dayjs(filtroFecha.inicio).format('DD/MM/YYYY HH:mm')}</strong> hasta <strong>{dayjs(filtroFecha.fin).format('DD/MM/YYYY HH:mm')}</strong>
            </span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="alm-kpis-row">
          <KpiCard 
            label="Unidades Cargadas" 
            value={metricas.totalUnidades} 
            icon="🚛" 
            accent="#10b981" 
            animate 
          />
          <KpiCard 
            label="Tiempo Total Turnos" 
            value={formatTiempo(metricas.tiempoTotalTurnos)} 
            icon="⏱️" 
            accent="#3b82f6" 
            animate 
          />
          <KpiCard 
            label="Tiempo de Inactividad" 
            value={formatTiempo(metricas.tiempoInactividad)} 
            icon="⚠️" 
            accent="#ef4444" 
            sub={`${metricas.tiempoTotalTurnos > 0 ? ((metricas.tiempoInactividad / metricas.tiempoTotalTurnos) * 100).toFixed(1) : 0}% del total`}
          />
          <KpiCard 
            label="Tiempo Efectivo" 
            value={formatTiempo(metricas.tiempoEfectivo)} 
            icon="✅" 
            accent="#f59e0b" 
            sub={`${metricas.tiempoTotalTurnos > 0 ? ((metricas.tiempoEfectivo / metricas.tiempoTotalTurnos) * 100).toFixed(1) : 0}% de productividad`}
          />
        </div>

        {/* Métricas de Tiempo */}
        <MetricasTiempoCard
          tiempoTotalTurnos={metricas.tiempoTotalTurnos}
          tiempoInactividad={metricas.tiempoInactividad}
          tiempoEfectivo={metricas.tiempoEfectivo}
          totalUnidades={metricas.totalUnidades}
        />

        {/* Gráficas en grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              📊 TIEMPOS POR OPERATIVO
              <span>{datosOperativos.length} operativos</span>
            </h4>
            <GraficaTiemposOperativos datosOperativos={datosOperativos} />
          </div>

          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              📈 TENDENCIA DE UNIDADES POR HORA
              <span>Últimas 24 horas</span>
            </h4>
            <GraficaUnidadesPorHora datosUnidadesPorHora={datosUnidadesPorHora} />
          </div>
        </div>

        {/* Atrasos - Distribución y lista */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              🥧 DISTRIBUCIÓN DE ATRASOS POR TIPO
              <span>Total: {formatTiempo(atrasosFiltrados.reduce((sum, a) => sum + (a.duracion_minutos || 0), 0))}</span>
            </h4>
            <AtrasosPorTipoCard atrasosPorTipo={atrasosPorTipo} />
          </div>

          <div className="alm-chart-card">
            <h4 className="alm-chart-title">
              ⚡ PROMEDIO DE DESCARGA
              <span>Unidades por hora: {metricas.tiempoEfectivo > 0 ? (metricas.totalUnidades / (metricas.tiempoEfectivo / 60)).toFixed(1) : '0'}</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div style={{
                fontSize: 64,
                fontWeight: 900,
                fontFamily: "'DM Mono', monospace",
                color: '#f59e0b'
              }}>
                {metricas.tiempoEfectivo > 0 ? (metricas.totalUnidades / (metricas.tiempoEfectivo / 60)).toFixed(1) : '0'}
              </div>
              <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
                unidades por hora
              </div>
              <div style={{
                marginTop: 20,
                width: '80%',
                height: 8,
                background: '#e2e8f0',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(100, ((metricas.tiempoEfectivo / 60) > 0 ? (metricas.totalUnidades / (metricas.tiempoEfectivo / 60)) / 20 * 100 : 0))}%`,
                  height: '100%',
                  background: '#f59e0b',
                  borderRadius: 4
                }} />
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 8 }}>
                Meta de referencia: 20 unidades/hora
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de atrasos */}
        <div className="alm-table-card">
          <div className="alm-table-header">
            <h3 className="alm-section-title">
              🔧 REGISTRO DE ATRASOS
              <span className="alm-badge">{atrasosFiltrados.length} registros</span>
            </h3>
          </div>
          <TablaAtrasos 
            atrasos={atrasosFiltrados}
            tiposParo={tiposParo}
            formatTiempo={formatTiempo}
          />
        </div>

        {/* Tabla de turnos */}
        <div className="alm-table-card">
          <div className="alm-table-header">
            <h3 className="alm-section-title">
              👥 TURNOS REGISTRADOS
              <span className="alm-badge">{turnosFiltrados.length} turnos</span>
            </h3>
          </div>
          <div className="alm-table-scroll">
            <table className="alm-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Chequero 1</th>
                  <th>Chequero 2</th>
                  <th>Operador</th>
                  <th>Operativo</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th className="alm-th-num">Duración</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {turnosFiltrados.map((turno) => {
                  let duracion = null
                  if (turno.hora_inicio && turno.hora_fin) {
                    const inicio = dayjs(`2000-01-01 ${turno.hora_inicio}`)
                    const fin = dayjs(`2000-01-01 ${turno.hora_fin}`)
                    let diff = fin.diff(inicio, 'minute')
                    if (diff < 0) diff += 24 * 60
                    duracion = diff
                  } else if (turno.duracion_minutos) {
                    duracion = turno.duracion_minutos
                  }
                  
                  const operativo = operativos.find(o => o.id === turno.operativo_id)
                  
                  return (
                    <tr key={turno.id}>
                      <td className="alm-mono">{dayjs(turno.fecha).format('DD/MM/YY')}</td>
                      <td>{turno.chequero1 || '—'}</td>
                      <td>{turno.chequero2 || '—'}</td>
                      <td className="alm-bold">{turno.operador}</td>
                      <td className="text-amber-400">{operativo?.nombre || '—'}</td>
                      <td className="text-green-400 alm-mono">{turno.hora_inicio?.slice(0, 5)}</td>
                      <td className="text-red-400 alm-mono">{turno.hora_fin?.slice(0, 5) || '—'}</td>
                      <td className="alm-td-num alm-bold alm-mono">{duracion ? formatTiempo(duracion) : '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {turno.observaciones || '—'}
                      </td>
                    </tr>
                  )
                })}
                {turnosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No hay turnos registrados para el período seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="alm-footer">
          🔄 Datos en tiempo real · {filtroOperativo !== 'todos' ? `Operativo: ${operativos.find(o => o.id === parseInt(filtroOperativo))?.nombre}` : 'Todos los operativos'}
          {filtroFecha.activo && ` · Rango: ${dayjs(filtroFecha.inicio).format('DD/MM/YY HH:mm')} - ${dayjs(filtroFecha.fin).format('DD/MM/YY HH:mm')}`}
        </div>
      </div>
    </div>
  )
}