'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin, isChequeroTraslado, logout } from '../../lib/auth'
import {
  LogOut, Truck, Calendar, Clock, Package,
  RefreshCw, AlertCircle, X, BarChart3, TrendingUp,
  Activity, Users, Gauge, Zap, Target, Filter, Box
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Line, Legend,
  PieChart, Pie, Cell, Area, AreaChart
} from 'recharts'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale('es')

const fmt = (min) => {
  if (!min && min !== 0) return '0h 00m'
  const h = Math.floor(min / 60)
  const m = String(min % 60).padStart(2, '0')
  return `${h}h ${m}m`
}

const C = {
  amber: '#B45309', amberMid: '#D97706', amberL: '#FCD34D', amberBg: '#FFFBEB',
  teal: '#0F766E', tealL: '#2DD4BF', tealBg: '#F0FDFA',
  red: '#B91C1C', redL: '#F87171', redBg: '#FEF2F2',
  blue: '#1D4ED8', blueL: '#60A5FA', blueBg: '#EFF6FF',
  slate: '#0F172A', slateM: '#1E293B', slateL: '#334155',
  muted: '#64748B', border: '#E2E8F0', borderL: '#F1F5F9',
  bg: '#F8FAFC', white: '#FFFFFF',
}

const PIE_COLS = [C.amberMid, C.teal, C.red, C.blue, '#7C3AED', '#0891B2', '#065F46', '#92400E']

// =================================================================
// LOGICA DE TIEMPO
//
// Tiempo Total del operativo:
//   hora_inicio del turno MAS ANTIGUO (primer turno)
//   --> NOW() si hay un turno activo ahora
//   --> hora_fin del ultimo turno si ya terminaron todos
//
// Turno activo = el de created_at mas reciente Y la hora actual
//   cae dentro de su rango hora_inicio-hora_fin
// =================================================================

function construirFechaHora(fecha, hora) {
  // fecha: 'YYYY-MM-DD', hora: 'HH:mm:ss'
  if (!fecha || !hora) return null
  return dayjs(`${fecha} ${hora}`)
}

function calcTiempoTotalOperativo(turnosOp) {
  if (!turnosOp || turnosOp.length === 0) return 0

  const ahora = dayjs()

  // Ordenar por fecha + hora_inicio para encontrar el primero cronologico
  const validos = turnosOp.filter(t => t.fecha && t.hora_inicio)
  if (validos.length === 0) {
    return turnosOp.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
  }

  const ordenados = [...validos].sort((a, b) => {
    const fa = dayjs(`${a.fecha} ${a.hora_inicio}`)
    const fb = dayjs(`${b.fecha} ${b.hora_inicio}`)
    return fa.valueOf() - fb.valueOf()
  })

  // Inicio global = hora_inicio del primer turno cronologico
  const inicioGlobal = dayjs(`${ordenados[0].fecha} ${ordenados[0].hora_inicio}`)

  // Turno mas reciente = candidato a activo
  const masReciente = turnosOp.reduce((prev, curr) =>
    dayjs(curr.created_at).isAfter(dayjs(prev.created_at)) ? curr : prev
  , turnosOp[0])

  // Verificar si el turno mas reciente esta corriendo ahora
  let estaActivo = false
  if (masReciente.fecha && masReciente.hora_inicio && masReciente.hora_fin) {
    const ini = dayjs(`${masReciente.fecha} ${masReciente.hora_inicio}`)
    let fin   = dayjs(`${masReciente.fecha} ${masReciente.hora_fin}`)
    // Cruce de medianoche: si fin <= ini, el turno termina al dia siguiente
    if (fin.valueOf() <= ini.valueOf()) fin = fin.add(1, 'day')
    estaActivo = ahora.isAfter(ini) && ahora.isBefore(fin)
  } else if (masReciente.hora_inicio && !masReciente.hora_fin) {
    estaActivo = true
  }

  if (estaActivo) {
    // Tiempo total = desde primer inicio hasta AHORA
    return Math.max(0, ahora.diff(inicioGlobal, 'minute'))
  }

  // Todos terminaron: calcular fin global = hora_fin mas tarde entre todos los turnos
  let finGlobal = null
  ordenados.forEach(t => {
    if (!t.hora_fin) return
    const ini = dayjs(`${t.fecha} ${t.hora_inicio}`)
    let fin   = dayjs(`${t.fecha} ${t.hora_fin}`)
    if (fin.valueOf() <= ini.valueOf()) fin = fin.add(1, 'day')
    if (!finGlobal || fin.isAfter(finGlobal)) finGlobal = fin
  })

  if (!finGlobal) {
    return turnosOp.reduce((s, t) => s + (t.duracion_minutos || 0), 0)
  }

  return Math.max(0, finGlobal.diff(inicioGlobal, 'minute'))
}

function hayTurnoActivo(turnosOp) {
  if (!turnosOp || turnosOp.length === 0) return false
  const ahora = dayjs()
  const masReciente = turnosOp.reduce((prev, curr) =>
    dayjs(curr.created_at).isAfter(dayjs(prev.created_at)) ? curr : prev
  , turnosOp[0])
  if (!masReciente.hora_inicio) return false
  if (!masReciente.hora_fin) return true
  const ini = dayjs(`${masReciente.fecha} ${masReciente.hora_inicio}`)
  let fin   = dayjs(`${masReciente.fecha} ${masReciente.hora_fin}`)
  if (fin.valueOf() <= ini.valueOf()) fin = fin.add(1, 'day')
  return ahora.isAfter(ini) && ahora.isBefore(fin)
}

// =================================================================

const DarkTip = ({ active, payload, label, fmtVal }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.slateM, border: `1px solid ${C.slateL}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      {label && <p style={{ color: C.amberL, fontWeight: 600, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fff', marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtVal ? fmtVal(p.value, p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, accent = C.amberMid, accentBg, delay = 0, live = false }) {
  const bg = accentBg || `${accent}18`
  return (
    <div className="kpi-card" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
      <Icon size={72} style={{ position: 'absolute', right: -8, bottom: -8, color: accent, opacity: 0.05 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={accent} />
        </div>
        {live && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${C.teal}18`, color: C.teal, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.4px' }}>
            <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
            EN VIVO
          </span>
        )}
      </div>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  )
}

function Ring({ pct, color, label, size = 88 }) {
  const r = size / 2 - 9
  const circ = 2 * Math.PI * r
  const dash = Math.min(1, pct / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}25`} strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: 14, fontWeight: 600, fill: color, fontFamily: "'DM Mono', monospace" }}>{pct}%</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function BloqueTiempos({ tiempoTotal, tiempoInactividad, tiempoEfectivo, unidades, hayActivo }) {
  const eff   = tiempoTotal > 0 ? Math.round((tiempoEfectivo / tiempoTotal) * 100) : 0
  const inPct = tiempoTotal > 0 ? Math.round((tiempoInactividad / tiempoTotal) * 100) : 0
  const uph   = tiempoEfectivo > 0 ? +(unidades / (tiempoEfectivo / 60)).toFixed(1) : 0
  const prod  = Math.min(100, Math.round((uph / 25) * 100))

  const items = [
    { label: 'Tiempo Total Operativo', value: fmt(tiempoTotal),      sub: hayActivo ? 'Primer turno → ahora' : 'Primer turno → ultimo fin', color: C.blueL,  icon: Clock },
    { label: 'Inactividad',            value: fmt(tiempoInactividad), sub: `${inPct}% del total`,                                            color: C.redL,   icon: AlertCircle },
    { label: 'Tiempo Efectivo',        value: fmt(tiempoEfectivo),   sub: `${eff}% eficiencia`,                                              color: C.tealL,  icon: Zap },
    { label: 'Unidades / Hora',        value: uph,                   sub: 'Promedio real',                                                    color: C.amberL, icon: Gauge },
  ]

  return (
    <div style={{ background: `linear-gradient(135deg, ${C.slate} 0%, ${C.slateM} 100%)`, borderRadius: 20, padding: 26, marginBottom: 22, boxShadow: '0 16px 36px -8px rgba(15,23,42,0.3)', border: `1px solid ${C.slateL}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: `${C.amberMid}18`, filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: `${C.amberMid}35`, borderRadius: 10, padding: 7 }}><Activity size={17} color={C.amberL} /></div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Metricas de Rendimiento</p>
                {hayActivo && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${C.teal}30`, color: C.tealL, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: C.tealL, display: 'inline-block' }} />
                    EN VIVO
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>
                {hayActivo ? 'Tiempo corriendo en tiempo real' : 'Todos los turnos finalizados'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Ring pct={eff}  color={C.amberL} label="Eficiencia"    />
            <Ring pct={prod} color={C.tealL}  label="Productividad" />
          </div>
        </div>

        <div className="time-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {items.map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <div style={{ background: `${color}25`, borderRadius: 7, padding: 5 }}><Icon size={13} color={color} /></div>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 600, color, fontFamily: "'DM Mono', monospace", lineHeight: 1.2, marginBottom: 2 }}>{value}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
            </div>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.38)', marginBottom: 6, fontWeight: 500 }}>
            <span>Distribucion del tiempo operativo</span>
            <span style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(tiempoTotal)}</span>
          </div>
          <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${eff}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.tealL})`, transition: 'width 1.2s ease' }} />
            <div style={{ width: `${inPct}%`, background: `linear-gradient(90deg, ${C.red}, ${C.redL})`, transition: 'width 1.2s ease 0.15s' }} />
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            {[{ c: C.tealL, l: `Efectivo (${eff}%)` }, { c: C.redL, l: `Inactividad (${inPct}%)` }].map(({ c, l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} /> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, badge, children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, padding: '20px 20px 14px', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: C.amberBg, borderRadius: 9, padding: 6 }}><Icon size={14} color={C.amberMid} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.slate }}>{title}</span>
        </div>
        {badge && <span style={{ background: C.slateM, color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{badge}</span>}
      </div>
      {children}
    </div>
  )
}

function TablaData({ title, icon: Icon, badge, rows = [], cols = [] }) {
  return (
    <div style={{ background: C.white, borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '15px 22px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(90deg, ${C.slateM}, ${C.slate})`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ background: `${C.amberMid}30`, borderRadius: 9, padding: 6 }}><Icon size={14} color={C.amberL} /></div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
        </div>
        {badge && <span style={{ background: `${C.amberMid}28`, color: C.amberL, fontSize: 10, fontWeight: 700, padding: '3px 11px', borderRadius: 20 }}>{badge}</span>}
      </div>
      {rows.length === 0
        ? <div style={{ padding: 48, textAlign: 'center', color: C.muted }}><Box size={34} style={{ margin: '0 auto 10px', opacity: 0.25 }} /><p style={{ fontSize: 13, fontWeight: 600 }}>Sin registros</p></div>
        : <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{cols.map((c, i) => <th key={i} style={{ padding: '10px 18px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.muted, textAlign: c.right ? 'right' : 'left', background: C.bg, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ transition: 'background 0.12s' }} onMouseEnter={e => e.currentTarget.style.background = C.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {cols.map((c, ci) => <td key={ci} style={{ padding: '11px 18px', fontSize: 13, color: C.slateL, textAlign: c.right ? 'right' : 'left', borderBottom: `1px solid ${C.borderL}` }}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  )
}

const Chip = ({ label, color, bg }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />{label}
  </span>
)

export default function DashboardTiemposPage() {
  const router = useRouter()
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [operativos, setOperativos]   = useState([])
  const [traslados, setTraslados]     = useState([])
  const [turnos, setTurnos]           = useState([])
  const [atrasos, setAtrasos]         = useState([])
  const [tiposParo, setTiposParo]     = useState([])
  const [filtroOp, setFiltroOp]       = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState({ activo: false, inicio: null, fin: null })
  const [showDP, setShowDP]           = useState(false)
  const [tab, setTab]                 = useState('resumen')
  const [tick, setTick]               = useState(0)

  // Reloj cada 60s para refrescar calculos de tiempo real
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || (!isAdmin() && !isChequeroTraslado())) { router.push('/'); return }
    setUser(u); cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const { data: ops } = await supabase.from('operativos_traslados').select('*').order('created_at', { ascending: false })
      setOperativos(ops || [])
      let qT  = supabase.from('traslados').select('*').order('fecha', { ascending: false })
      let qTu = supabase.from('turnos_operativos').select('*').order('created_at', { ascending: true })
      let qA  = supabase.from('traslados_atrasos').select('*, operativo:operativo_id(*)').eq('es_general', true)
      if (filtroFecha.activo && filtroFecha.inicio && filtroFecha.fin) {
        const fi = dayjs(filtroFecha.inicio).format('YYYY-MM-DD')
        const ff = dayjs(filtroFecha.fin).format('YYYY-MM-DD')
        qT  = qT.gte('fecha', fi).lte('fecha', ff)
        qTu = qTu.gte('fecha', fi).lte('fecha', ff)
        qA  = qA.gte('fecha', fi).lte('fecha', ff)
      }
      const [tr, tu, tp, at] = await Promise.all([qT, qTu, supabase.from('tipos_paro').select('*').eq('activo', true), qA])
      setTraslados(tr.data || []); setTurnos(tu.data || []); setTiposParo(tp.data || []); setAtrasos(at.data || [])
    } catch (e) { console.error(e); toast.error('Error al cargar datos') }
    finally { setLoading(false) }
  }

  const trasF = filtroOp === 'todos' ? traslados : traslados.filter(t => t.operativo_id === +filtroOp)
  const turF  = filtroOp === 'todos' ? turnos    : turnos.filter(t => t.operativo_id === +filtroOp)
  const atF   = useMemo(() =>
    (filtroOp === 'todos' ? atrasos : atrasos.filter(a => a.operativo_id === +filtroOp))
      .map(a => ({ ...a, operativo_nombre: a.operativo?.nombre || '—' })),
    [atrasos, filtroOp])

  const met = useMemo(() => {
    // Agrupar turnosF por operativo y sumar el tiempo total de cada uno
    const opIds = [...new Set(turF.map(t => t.operativo_id).filter(Boolean))]
    let tT = 0
    if (opIds.length > 0) {
      opIds.forEach(opId => {
        tT += calcTiempoTotalOperativo(turF.filter(t => t.operativo_id === opId))
      })
    } else if (turF.length > 0) {
      // Edge case: turnos sin operativo_id
      tT = calcTiempoTotalOperativo(turF)
    }

    let tI = 0
    atF.forEach(a => {
      if (a.duracion_minutos) tI += a.duracion_minutos
      else if (a.hora_inicio && a.hora_fin) {
        let d = dayjs(`2000-01-01 ${a.hora_fin}`).diff(dayjs(`2000-01-01 ${a.hora_inicio}`), 'minute')
        if (d < 0) d += 1440; tI += d
      }
    })

    const tE = Math.max(0, tT - tI)
    const n  = trasF.length
    const uph = tE > 0 ? +(n / (tE / 60)).toFixed(1) : 0
    const eff = tT > 0 ? +((tE / tT) * 100).toFixed(1) : 0
    const tieneActivo = opIds.length > 0
      ? opIds.some(opId => hayTurnoActivo(turF.filter(t => t.operativo_id === opId)))
      : hayTurnoActivo(turF)

    return { tT, tI, tE, n, uph, eff, tieneActivo }
  // tick hace que se recalcule cada minuto cuando hay turno activo
  }, [turF, atF, trasF, tick])

  const datosOps = useMemo(() => {
    const ops = filtroOp === 'todos' ? operativos : operativos.filter(o => o.id === +filtroOp)
    return ops.map(op => {
      const turnosOp = turnos.filter(t => t.operativo_id === op.id)
      const tT = calcTiempoTotalOperativo(turnosOp)
      let tI = 0
      atrasos.filter(a => a.operativo_id === op.id).forEach(a => { if (a.duracion_minutos) tI += a.duracion_minutos })
      const activo = hayTurnoActivo(turnosOp)
      return {
        id: op.id,
        nombre: op.nombre.length > 15 ? op.nombre.slice(0, 15) + '...' : op.nombre,
        nombreCompleto: op.nombre,
        tiempoEfectivo: Math.max(0, tT - tI),
        tiempoInactividad: tI,
        unidades: traslados.filter(t => t.operativo_id === op.id).length,
        tieneActivo: activo,
      }
    }).filter(o => o.tiempoEfectivo > 0 || o.unidades > 0)
  }, [operativos, turnos, traslados, atrasos, filtroOp, tick])

  const datosHora = useMemo(() => {
    const h = {}
    trasF.forEach(t => { if (t.hora_inicio_carga) { const k = t.hora_inicio_carga.slice(0, 5); h[k] = (h[k] || 0) + 1 } })
    return Object.entries(h).map(([hora, unidades]) => ({ hora, unidades })).sort((a, b) => a.hora.localeCompare(b.hora)).slice(-24)
  }, [trasF])

  const atrasosTipo = useMemo(() => {
    const m = {}
    atF.forEach(a => { const t = tiposParo.find(x => x.id === a.tipo_paro_id); const n = t?.nombre || 'Otros'; m[n] = (m[n] || 0) + (a.duracion_minutos || 0) })
    return Object.entries(m).map(([name, minutos]) => ({ name, minutos })).sort((a, b) => b.minutos - a.minutos).slice(0, 8)
  }, [atF, tiposParo])

  const totalMinAt = atF.reduce((s, a) => s + (a.duracion_minutos || 0), 0)
  const TABS = ['resumen', 'operativos', 'atrasos', 'turnos']

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.slate }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 46, height: 46, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: C.amberL, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin .8s linear infinite' }} />
        <p style={{ fontSize: 12, color: C.amberL, fontFamily: "'DM Mono', monospace" }}>Cargando dashboard...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  const ahoraStr = dayjs().format('HH:mm')

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: ${C.bg}; -webkit-font-smoothing: antialiased; }
        select, input, button, textarea { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
        .kpi-card { background: ${C.white}; border-radius: 16px; padding: 18px 20px 16px; border: 1px solid ${C.border}; position: relative; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow .25s, transform .25s; animation: fadeUp .45s ease both; cursor: default; }
        .kpi-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.1); transform: translateY(-3px); }
        .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.65px; color: ${C.muted}; margin-bottom: 4px; }
        .kpi-value { font-family: 'DM Mono', monospace; font-size: 24px; font-weight: 500; color: ${C.slate}; line-height: 1.2; letter-spacing: -0.3px; }
        .kpi-sub   { font-size: 11px; color: ${C.muted}; margin-top: 4px; font-weight: 500; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes dotPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.3; transform:scale(0.5); } }
        .dot-pulse { animation: dotPulse 1.4s ease-in-out infinite; }
        @media (max-width:1100px) { .kpi-grid{grid-template-columns:repeat(2,1fr)!important} .time-grid{grid-template-columns:repeat(2,1fr)!important} .ch2{grid-template-columns:1fr!important} }
        @media (max-width:640px)  { .kpi-grid{grid-template-columns:1fr!important} .time-grid{grid-template-columns:1fr!important} .main-pad{padding:14px!important} .hdr-title{display:none!important} .tabs-bar{display:none!important} }
      `}</style>

      {/* Header */}
      <header style={{ background: C.slate, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', borderBottom: `1px solid ${C.slateL}` }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${C.amberMid}, ${C.amberL} 45%, transparent)` }} />
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src="/logo.png" alt="ALMAPAC" style={{ height: 32, filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.14)' }} />
            <div className="hdr-title">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Traslados de Azucar</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.36)', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>{user?.nombre} · {user?.rol}</p>
            </div>
          </div>
          <div className="tabs-bar" style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 3 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? C.amberL : 'transparent', color: tab === t ? C.slate : 'rgba(255,255,255,0.48)', border: 'none', padding: '5px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all .18s' }}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cargarDatos} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 13px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={12} /> Actualizar
            </button>
            {isAdmin() && (
              <button onClick={logout} style={{ background: `${C.red}20`, border: `1px solid ${C.red}38`, borderRadius: 10, padding: '6px 13px', color: '#fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={12} /> Salir
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-pad" style={{ maxWidth: 1440, margin: '0 auto', padding: '22px 24px 56px' }}>

        {/* Filtros */}
        <div style={{ background: C.white, borderRadius: 14, padding: '11px 18px', marginBottom: 20, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.7px' }}><Filter size={11} /> Filtros</span>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)} style={{ padding: '6px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, fontSize: 13, fontWeight: 600, color: C.slate, cursor: 'pointer', outline: 'none' }}>
            <option value="todos">Todos los operativos</option>
            {operativos.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowDP(!showDP)} style={{ padding: '6px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${filtroFecha.activo ? C.amberMid : C.border}`, background: filtroFecha.activo ? C.amberBg : C.bg, color: filtroFecha.activo ? C.amber : C.slateL, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={12} />
              {filtroFecha.activo ? `${dayjs(filtroFecha.inicio).format('DD/MM')} — ${dayjs(filtroFecha.fin).format('DD/MM')}` : 'Rango de fechas'}
            </button>
            {showDP && (
              <div style={{ position: 'absolute', top: '110%', left: 0, background: C.white, borderRadius: 14, padding: 18, boxShadow: '0 16px 36px rgba(0,0,0,0.13)', zIndex: 50, minWidth: 248, border: `1px solid ${C.border}` }}>
                {['inicio', 'fin'].map(k => (
                  <div key={k} style={{ marginBottom: k === 'inicio' ? 10 : 14 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{k === 'inicio' ? 'Desde' : 'Hasta'}</label>
                    <input type="datetime-local" value={filtroFecha[k] ? dayjs(filtroFecha[k]).format('YYYY-MM-DDTHH:mm') : ''} onChange={e => setFiltroFecha(p => ({ ...p, [k]: dayjs(e.target.value).toDate() }))} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.slate, outline: 'none' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ l: 'Aplicar', fn: () => { if (filtroFecha.inicio && filtroFecha.fin) { setFiltroFecha(f => ({ ...f, activo: true })); setShowDP(false); cargarDatos() } }, bg: C.amberMid, col: '#fff' }, { l: 'Cancelar', fn: () => setShowDP(false), bg: C.bg, col: C.slateL }].map(b => (
                    <button key={b.l} onClick={b.fn} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: b.bg, color: b.col, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{b.l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(filtroOp !== 'todos' || filtroFecha.activo) && (
            <button onClick={() => { setFiltroOp('todos'); setFiltroFecha({ activo: false, inicio: null, fin: null }); cargarDatos() }} style={{ background: 'none', border: 'none', fontSize: 11, color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <X size={11} /> Limpiar
            </button>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
            {trasF.length} traslados · {turF.length} turnos · {atF.length} atrasos
            {met.tieneActivo && <span style={{ marginLeft: 8, color: C.teal, fontWeight: 700 }}>● EN VIVO {ahoraStr}</span>}
          </div>
        </div>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 15, marginBottom: 20 }}>
              <KpiCard label="Unidades Trasladadas"  value={met.n.toLocaleString()} icon={Truck}       accent={C.teal}     accentBg={C.tealBg}  sub="Sacos / camiones"                                              delay={0} />
              <KpiCard label="Tiempo Total Operativo" value={fmt(met.tT)}           icon={Clock}       accent={C.blue}     accentBg={C.blueBg}  sub={met.tieneActivo ? 'Primer turno a ahora' : 'Primer turno a fin'} delay={55}  live={met.tieneActivo} />
              <KpiCard label="Tiempo Inactividad"    value={fmt(met.tI)}            icon={AlertCircle} accent={C.red}      accentBg={C.redBg}   sub={`${met.tT > 0 ? +((met.tI/met.tT)*100).toFixed(1) : 0}% del total`} delay={110} />
              <KpiCard label="Tiempo Efectivo"       value={fmt(met.tE)}            icon={Zap}         accent={C.amberMid} accentBg={C.amberBg} sub={`${met.eff}% productividad`}                                   delay={165} />
            </div>
            <BloqueTiempos tiempoTotal={met.tT} tiempoInactividad={met.tI} tiempoEfectivo={met.tE} unidades={met.n} hayActivo={met.tieneActivo} />
            <div className="ch2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <ChartCard title="Unidades por Hora" icon={TrendingUp} badge="Tendencia">
                {datosHora.length === 0
                  ? <div style={{ height: 196, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 8 }}><TrendingUp size={34} style={{ opacity: 0.22 }} /><span style={{ fontSize: 12 }}>Sin datos</span></div>
                  : <ResponsiveContainer width="100%" height={196}>
                      <AreaChart data={datosHora} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.amberMid} stopOpacity={0.2} /><stop offset="100%" stopColor={C.amberMid} stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderL} />
                        <XAxis dataKey="hora" tick={{ fill: C.muted, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
                        <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                        <Tooltip content={<DarkTip fmtVal={v => `${v} unidades`} />} />
                        <Area type="monotone" dataKey="unidades" name="Unidades" stroke={C.amberMid} strokeWidth={2} fill="url(#ag)" dot={{ fill: C.amberMid, r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                }
              </ChartCard>
              <ChartCard title="Distribucion de Atrasos" icon={AlertCircle} badge={`Total ${fmt(totalMinAt)}`}>
                {atrasosTipo.length === 0
                  ? <div style={{ height: 196, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 8 }}><AlertCircle size={34} style={{ opacity: 0.22 }} /><span style={{ fontSize: 12 }}>Sin atrasos</span></div>
                  : <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                      <ResponsiveContainer width="48%" height={186}>
                        <PieChart><Pie data={atrasosTipo} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="minutos" paddingAngle={3}>{atrasosTipo.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}</Pie><Tooltip content={<DarkTip fmtVal={v => fmt(v)} />} /></PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {atrasosTipo.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLS[i % PIE_COLS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: C.slateL, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: C.slate, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{fmt(d.minutos)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                }
              </ChartCard>
            </div>
            <ChartCard title="Tiempos por Operativo" icon={BarChart3} badge={`${datosOps.length} operativos`} style={{ marginBottom: 20 }}>
              {datosOps.length === 0
                ? <div style={{ height: 234, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 8 }}><BarChart3 size={42} style={{ opacity: 0.22 }} /><span style={{ fontSize: 13 }}>Sin datos</span></div>
                : <ResponsiveContainer width="100%" height={234}>
                    <ComposedChart data={datosOps} margin={{ top: 6, right: 34, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.borderL} />
                      <XAxis dataKey="nombre" tick={{ fill: C.muted, fontSize: 11 }} />
                      <YAxis yAxisId="l" tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `${Math.floor(v/60)}h`} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fill: C.muted, fontSize: 10 }} />
                      <Tooltip content={<DarkTip fmtVal={(v, n) => n === 'Unidades' ? `${v} unidades` : fmt(v)} />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar yAxisId="l" dataKey="tiempoEfectivo"    name="Tiempo Efectivo" fill={C.teal} radius={[5,5,0,0]} />
                      <Bar yAxisId="l" dataKey="tiempoInactividad" name="Inactividad"     fill={C.redL} radius={[5,5,0,0]} />
                      <Line yAxisId="r" type="monotone" dataKey="unidades" name="Unidades" stroke={C.amberMid} strokeWidth={2.5} dot={{ fill: C.amberMid, r: 4, strokeWidth: 2, stroke: C.white }} />
                    </ComposedChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </>
        )}

        {/* OPERATIVOS */}
        {tab === 'operativos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {datosOps.length === 0
              ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 56, color: C.muted }}><Box size={42} style={{ margin: '0 auto 12px', opacity: 0.22 }} /><p style={{ fontSize: 14, fontWeight: 600 }}>Sin operativos con datos</p></div>
              : datosOps.map(op => {
                  const total = op.tiempoEfectivo + op.tiempoInactividad
                  const eff   = total > 0 ? Math.round((op.tiempoEfectivo / total) * 100) : 0
                  const col   = eff >= 70 ? C.teal : eff >= 40 ? C.amberMid : C.red
                  const colBg = eff >= 70 ? C.tealBg : eff >= 40 ? C.amberBg : C.redBg
                  return (
                    <div key={op.id} style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${op.tieneActivo ? C.teal : C.border}`, boxShadow: op.tieneActivo ? `0 0 0 1px ${C.teal}40, 0 4px 16px rgba(15,118,110,0.1)` : '0 2px 8px rgba(0,0,0,0.04)', transition: 'all .22s', cursor: 'default' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = op.tieneActivo ? `0 0 0 1px ${C.teal}40, 0 4px 16px rgba(15,118,110,0.1)` : '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: C.slate }}>{op.nombreCompleto}</p>
                            {op.tieneActivo && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${C.teal}18`, color: C.teal, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                                <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
                                EN VIVO
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>ID #{op.id}</p>
                        </div>
                        <span style={{ background: colBg, color: col, padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{eff}%</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                        {[{ l: 'Efectivo', v: fmt(op.tiempoEfectivo), c: C.teal }, { l: 'Inactivo', v: fmt(op.tiempoInactividad), c: C.red }, { l: 'Unidades', v: op.unidades, c: C.amberMid }].map(({ l, v, c }) => (
                          <div key={l} style={{ background: `${c}0f`, borderRadius: 10, padding: '9px 10px' }}>
                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: c }}>{l}</p>
                            <p style={{ fontSize: 15, fontWeight: 600, color: C.slate, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{v}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 5, borderRadius: 5, background: C.borderL, overflow: 'hidden' }}>
                        <div style={{ width: `${eff}%`, height: '100%', background: col, borderRadius: 5, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* ATRASOS */}
        {tab === 'atrasos' && (
          <>
            <div className="ch2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <ChartCard title="Atrasos por Tipo de Paro" icon={AlertCircle} badge={fmt(totalMinAt)}>
                {atrasosTipo.length === 0
                  ? <div style={{ height: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.muted, gap: 8 }}><AlertCircle size={36} style={{ opacity: 0.22 }} /><span>Sin atrasos</span></div>
                  : <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={atrasosTipo} layout="vertical" margin={{ left: 0, right: 14, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.borderL} horizontal={false} />
                        <XAxis type="number" tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `${Math.floor(v/60)}h`} />
                        <YAxis type="category" dataKey="name" tick={{ fill: C.slateL, fontSize: 10 }} width={84} />
                        <Tooltip content={<DarkTip fmtVal={v => fmt(v)} />} />
                        <Bar dataKey="minutos" name="Duracion" radius={[0,5,5,0]}>{atrasosTipo.map((_, i) => <Cell key={i} fill={PIE_COLS[i % PIE_COLS.length]} />)}</Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </ChartCard>
              <div style={{ background: C.white, borderRadius: 18, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ background: C.amberBg, borderRadius: 9, padding: 6 }}><Target size={14} color={C.amberMid} /></div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.slate }}>Resumen de Paros</span>
                </div>
                {[{ l: 'Total eventos', v: atF.length, c: C.slate }, { l: 'Tiempo total parado', v: fmt(totalMinAt), c: C.red }, { l: 'Promedio por evento', v: atF.length > 0 ? fmt(Math.round(totalMinAt / atF.length)) : '0h 0m', c: C.amberMid }, { l: 'Tipos distintos', v: atrasosTipo.length, c: C.teal }].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 13px', background: C.bg, borderRadius: 10, marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: c, fontFamily: "'DM Mono', monospace" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <TablaData title="Registro Detallado de Atrasos" icon={AlertCircle} badge={`${atF.length} eventos`} rows={atF}
              cols={[
                { key: 'fecha',            label: 'Fecha',         render: v => <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</span> },
                { key: 'hora_inicio',      label: 'Inicio',        render: v => <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v?.slice(0,5) || '—'}</span> },
                { key: 'hora_fin',         label: 'Fin',           render: v => v ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v.slice(0,5)}</span> : <Chip label="En curso" color={C.amberMid} bg={C.amberBg} /> },
                { key: 'tipo_paro_id',     label: 'Tipo',          render: v => { const t = tiposParo.find(x => x.id === v); return t ? <Chip label={t.nombre} color={C.red} bg={C.redBg} /> : <span style={{ color: C.muted }}>—</span> } },
                { key: 'operativo_nombre', label: 'Operativo' },
                { key: 'duracion_minutos', label: 'Duracion', right: true, render: v => <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: C.red, fontSize: 12 }}>{fmt(v || 0)}</span> },
                { key: 'observaciones',    label: 'Observaciones', render: v => v || <span style={{ color: C.muted, fontSize: 12 }}>—</span> },
              ]}
            />
          </>
        )}

        {/* TURNOS */}
        {tab === 'turnos' && (
          <>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 15, marginBottom: 18 }}>
              <KpiCard label="Total Turnos"           value={turF.length} icon={Users}   accent={C.teal}     accentBg={C.tealBg}  delay={0} />
              <KpiCard label="Tiempo Total Operativo" value={fmt(met.tT)} icon={Clock}   accent={C.amberMid} accentBg={C.amberBg} sub={met.tieneActivo ? 'Primer turno a ahora' : 'Primer turno a fin'} delay={55} live={met.tieneActivo} />
              <KpiCard label="Unidades por Turno"     value={turF.length > 0 ? +(met.n / turF.length).toFixed(1) : 0} icon={Package} accent={C.blue} accentBg={C.blueBg} delay={110} />
            </div>
            <TablaData title="Registro de Turnos Operativos" icon={Clock} badge={`${turF.length} turnos`} rows={turF}
              cols={[
                { key: 'fecha',            label: 'Fecha',        render: v => <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</span> },
                { key: 'chequero1',        label: 'Chequero 1',   render: v => v || <span style={{ color: C.muted }}>—</span> },
                { key: 'chequero2',        label: 'Chequero 2',   render: v => v || <span style={{ color: C.muted }}>—</span> },
                { key: 'operador',         label: 'Operador',     render: v => <strong style={{ color: C.slate, fontWeight: 700 }}>{v}</strong> },
                { key: 'operativo_id',     label: 'Operativo',    render: v => operativos.find(o => o.id === v)?.nombre || '—' },
                { key: 'hora_inicio',      label: 'Inicio',       render: v => <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v?.slice(0,5) || '—'}</span> },
                { key: 'hora_fin',         label: 'Fin',          render: v => v ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v.slice(0,5)}</span> : <Chip label="Activo" color={C.teal} bg={C.tealBg} /> },
                { key: 'duracion_minutos', label: 'Dur. Reg.',    right: true, render: v => v ? <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: C.teal, fontSize: 12 }}>{fmt(v)}</span> : '—' },
                { key: 'observaciones',    label: 'Notas',        render: v => v || <span style={{ color: C.muted, fontSize: 12 }}>—</span> },
              ]}
            />
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 26, fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
          Traslados de Azucar · ALMAPAC ·{' '}
          {filtroOp !== 'todos' ? operativos.find(o => o.id === +filtroOp)?.nombre : 'Todos los operativos'}
          {filtroFecha.activo && ` · ${dayjs(filtroFecha.inicio).format('DD/MM/YY')} - ${dayjs(filtroFecha.fin).format('DD/MM/YY')}`}
          {` · ${ahoraStr}`}
        </p>
      </main>
    </div>
  )
}