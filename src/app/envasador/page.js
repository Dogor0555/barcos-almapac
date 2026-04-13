'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, logout } from '../lib/auth'
import {
  Package, LogOut, Plus, Save, X, Clock, CheckCircle,
  AlertCircle, ChevronDown, Loader2, Calendar, Truck,
  BarChart3, RefreshCw, Eye, Edit2, Trash2, Hash, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/es'

dayjs.extend(duration)
dayjs.locale('es')

// ─── Lista de clientes (ÚNICA - sin repetidos) ───
const CLIENTES_UNICOS = [
  "AGROINDUSTRIAS BUENAVISTA, S.A. DE C.V.",
  "AVICOLA DEL SUR, S.A. DE C.V.",
  "AVICULTORES Y PORCINOCULTORES, S. A. DE C. V.",
  "BORIS EDGARDO MELGAR JOYA",
  "COOPERATIVA GANADERA DE SONSONATE DE R.L. DE C.V.",
  "IMPORTADORES AGROPECUARIOS, S.A. DE C.V.",
  "JOSE MIGUEL PILOÑA ARAUJO",
  "MONICA MARIA A. GROSS DE RUFFATI",
  "OSCAR ALBERTO FLORES MENJIVAR",
  "VICTOR MANUEL MIRA HERRERA",
  "WILIAN YOBANY REYES SOTO"
].sort() // Ordenados alfabéticamente

// ─── Helpers ────────────────────────────────────────────────
const timeToSec = (t) => {
  if (!t) return 0
  const [h, m, s] = t.split(':').map(Number)
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
}

const secToHMS = (sec) => {
  if (!sec && sec !== 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const secToMin = (sec) => sec ? (sec / 60).toFixed(2) : '0.00'

// ─── Modal de registro / edición ────────────────────────────
const RegistroModal = ({ registro, periodoActual, nextNumero, onClose, onSave, usuarioActual }) => {
  const esEdicion = !!registro

  const [form, setForm] = useState({
    fecha: registro?.fecha || dayjs().format('YYYY-MM-DD'),
    numero_orden: registro?.numero_orden || '',
    grupo_envasado: registro?.grupo_envasado || '',
    placa: registro?.placa || '',
    cliente: registro?.cliente || '',
    punto_carga: registro?.punto_carga || '',
    producto: registro?.producto || '',
    cantidad_sacos: registro?.cantidad_sacos || '',
    peso_toneladas: registro?.peso_toneladas || '',
    hora_llegada: registro?.hora_llegada || '',
    hora_inicio: registro?.hora_inicio || '',
    hora_final: registro?.hora_final || '',
    demora_inicio_seg: registro?.demora_inicio_seg || 0,
    demora_durante_seg: registro?.demora_durante_seg || 0,
    rendimiento_estandar: registro?.rendimiento_estandar || '',
    observaciones: registro?.observaciones || '',
  })

  const [demoraInicioInput, setDemoraInicioInput] = useState(secToHMS(registro?.demora_inicio_seg || 0))
  const [demoraduranteInput, setDemoraduranteInput] = useState(secToHMS(registro?.demora_durante_seg || 0))
  const [loading, setLoading] = useState(false)

  // Calcular automáticos
  const tiempoTotalSeg = (() => {
    if (!form.hora_inicio || !form.hora_final) return 0
    const ini = timeToSec(form.hora_inicio)
    const fin = timeToSec(form.hora_final)
    return fin >= ini ? fin - ini : 0
  })()

  const demoraInicioSeg = timeToSec(demoraInicioInput === '—' ? '00:00:00' : demoraInicioInput)
  const demoraduranteSeg = timeToSec(demoraduranteInput === '—' ? '00:00:00' : demoraduranteInput)
  const totalDemorasSeg = demoraInicioSeg + demoraduranteSeg
  const tiempoEfectivoSeg = Math.max(0, tiempoTotalSeg - totalDemorasSeg)
  const tiempoEfectivoMin = tiempoEfectivoSeg / 60
  const sacosPorMinuto = (tiempoEfectivoMin > 0 && form.cantidad_sacos)
    ? (Number(form.cantidad_sacos) / tiempoEfectivoMin).toFixed(4)
    : '—'
  const rendimiento3 = tiempoEfectivoMin > 0
    ? (tiempoEfectivoMin * 3).toFixed(4)
    : '—'
  const difRendimiento = (rendimiento3 !== '—' && form.rendimiento_estandar)
    ? (Number(rendimiento3) - Number(form.rendimiento_estandar)).toFixed(4)
    : '—'

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.fecha) return toast.error('La fecha es requerida')
    if (!form.placa) return toast.error('La placa es requerida')
    if (!usuarioActual) return toast.error('No se ha identificado el usuario')

    setLoading(true)
    try {
      const payload = {
        periodo: periodoActual,
        fecha: form.fecha,
        numero_orden: form.numero_orden || null,
        grupo_envasado: form.grupo_envasado || null,
        placa: form.placa,
        cliente: form.cliente || null,
        punto_carga: form.punto_carga || null,
        producto: form.producto || null,
        cantidad_sacos: form.cantidad_sacos ? Number(form.cantidad_sacos) : null,
        peso_toneladas: form.peso_toneladas ? Number(form.peso_toneladas) : null,
        hora_llegada: form.hora_llegada || null,
        hora_inicio: form.hora_inicio || null,
        hora_final: form.hora_final || null,
        tiempo_total_seg: tiempoTotalSeg || null,
        minutos_total: tiempoTotalSeg ? Number(secToMin(tiempoTotalSeg)) : null,
        demora_inicio_seg: demoraInicioSeg || null,
        demora_durante_seg: demoraduranteSeg || null,
        total_demoras_seg: totalDemorasSeg || null,
        tiempo_efectivo_seg: tiempoEfectivoSeg || null,
        total_despacho: form.peso_toneladas ? Number(form.peso_toneladas) : null,
        sacos_por_minuto: sacosPorMinuto !== '—' ? Number(sacosPorMinuto) : null,
        rendimiento_tres_personas: rendimiento3 !== '—' ? Number(rendimiento3) : null,
        rendimiento_estandar: form.rendimiento_estandar ? Number(form.rendimiento_estandar) : null,
        diferencia_rendimiento: difRendimiento !== '—' ? Number(difRendimiento) : null,
        observaciones: form.observaciones || null,
        creado_por: usuarioActual.id,
        creado_por_nombre: usuarioActual.nombre,
      }

      if (esEdicion) {
        const { error } = await supabase
          .from('bitacora_envasado')
          .update(payload)
          .eq('id', registro.id)
        if (error) throw error
        toast.success('Registro actualizado ✅')
      } else {
        payload.numero_registro = nextNumero
        const { error } = await supabase
          .from('bitacora_envasado')
          .insert([payload])
        if (error) throw error
        toast.success(`Registro #${nextNumero} guardado por ${usuarioActual.nombre} ✅`)
      }

      onSave()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, children, span2 }) => (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )

  const inputCls = "w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
  const selectCls = "w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl my-4">
        {/* Header con información del usuario que registra */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 rounded-t-2xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  {esEdicion ? `Editar Registro #${registro.numero_registro}` : `Nuevo Registro #${nextNumero}`}
                </h2>
                <p className="text-emerald-200 text-xs">Periodo: {periodoActual}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Badge del usuario que registra */}
          <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 w-fit">
            <UserCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-xs text-white/90">Registrando como:</span>
            <span className="text-xs font-bold text-white">{usuarioActual?.nombre} ({usuarioActual?.username})</span>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Sección 1: Datos generales */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Hash className="w-3 h-3" /> Datos de la Orden
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Fecha">
                <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inputCls} />
              </Field>
              <Field label="N° Orden">
                <input type="text" value={form.numero_orden} onChange={e => set('numero_orden', e.target.value)} placeholder="ej: ORD-001" className={inputCls} />
              </Field>
              <Field label="Grupo de Envasado">
                <input type="text" value={form.grupo_envasado} onChange={e => set('grupo_envasado', e.target.value)} placeholder="ej: Grupo A" className={inputCls} />
              </Field>
              <Field label="Placa *">
                <input type="text" value={form.placa} onChange={e => set('placa', e.target.value.toUpperCase())} placeholder="ej: P123ABC" className={inputCls} />
              </Field>
              
              {/* Campo Cliente con SELECT bonito */}
              <Field label="Cliente *" span2>
                <div className="relative">
                  <select
                    value={form.cliente}
                    onChange={e => set('cliente', e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Seleccione un cliente...</option>
                    {CLIENTES_UNICOS.map(cliente => (
                      <option key={cliente} value={cliente}>
                        {cliente}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </Field>
              
              <Field label="Punto de Carga" span2>
                <input type="text" value={form.punto_carga} onChange={e => set('punto_carga', e.target.value)} placeholder="Bodega / Muelle..." className={inputCls} />
              </Field>
              <Field label="Producto" span2>
                <input type="text" value={form.producto} onChange={e => set('producto', e.target.value)} placeholder="ej: Azúcar refino 50kg" className={inputCls} />
              </Field>
              <Field label="Cantidad de Sacos">
                <input type="number" min="0" value={form.cantidad_sacos} onChange={e => set('cantidad_sacos', e.target.value)} placeholder="0" className={inputCls} />
              </Field>
              <Field label="Peso (Toneladas)">
                <input type="number" min="0" step="0.0001" value={form.peso_toneladas} onChange={e => set('peso_toneladas', e.target.value)} placeholder="0.0000" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Sección 2: Tiempos */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Registro de Tiempos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Hora Llegada">
                <input type="time" step="1" value={form.hora_llegada} onChange={e => set('hora_llegada', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hora Inicio Carga">
                <input type="time" step="1" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Hora Final Carga">
                <input type="time" step="1" value={form.hora_final} onChange={e => set('hora_final', e.target.value)} className={inputCls} />
              </Field>
            </div>

            {/* Calculados automáticamente - Responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {[
                { label: 'Tiempo Total', val: secToHMS(tiempoTotalSeg), color: 'text-blue-400' },
                { label: 'Minutos Total', val: secToMin(tiempoTotalSeg) + ' min', color: 'text-blue-400' },
                { label: 'Total Demoras', val: secToHMS(totalDemorasSeg), color: 'text-orange-400' },
                { label: 'Tiempo Efectivo', val: secToHMS(tiempoEfectivoSeg), color: 'text-emerald-400' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-lg p-2 sm:p-3 border border-white/5">
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-black font-mono ${item.color}`}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sección 3: Demoras */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" /> Demoras
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Demora al Inicio (hh:mm:ss)">
                <input
                  type="text"
                  value={demoraInicioInput}
                  onChange={e => setDemoraInicioInput(e.target.value)}
                  onBlur={e => {
                    const val = e.target.value
                    if (/^\d{1,2}:\d{2}:\d{2}$/.test(val)) setDemoraInicioInput(val)
                    else setDemoraInicioInput('00:00:00')
                  }}
                  placeholder="00:00:00"
                  className={inputCls + ' font-mono text-sm'}
                />
              </Field>
              <Field label="Demora Durante (hh:mm:ss)">
                <input
                  type="text"
                  value={demoraduranteInput}
                  onChange={e => setDemoraduranteInput(e.target.value)}
                  onBlur={e => {
                    const val = e.target.value
                    if (/^\d{1,2}:\d{2}:\d{2}$/.test(val)) setDemoraduranteInput(val)
                    else setDemoraduranteInput('00:00:00')
                  }}
                  placeholder="00:00:00"
                  className={inputCls + ' font-mono text-sm'}
                />
              </Field>
            </div>
          </div>

          {/* Sección 4: Rendimiento */}
          <div>
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BarChart3 className="w-3 h-3" /> Rendimiento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Rendimiento Estándar">
                <input type="number" min="0" step="0.01" value={form.rendimiento_estandar} onChange={e => set('rendimiento_estandar', e.target.value)} placeholder="0.00" className={inputCls} />
              </Field>
              {[
                { label: 'Sacos / Min', val: sacosPorMinuto },
                { label: 'Rend. 3 Personas', val: rendimiento3 },
                { label: 'Diferencia Rend.', val: difRendimiento, color: difRendimiento !== '—' && Number(difRendimiento) >= 0 ? 'text-emerald-400' : 'text-red-400' },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/60 rounded-lg p-2 sm:p-3 border border-white/5">
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-xs sm:text-sm font-black font-mono ${item.color || 'text-blue-400'}`}>{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              className={inputCls + ' resize-none text-sm'}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex flex-col sm:flex-row gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {esEdicion ? 'Actualizar' : 'Guardar Registro'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────
export default function EnvasadorPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [registroEditando, setRegistroEditando] = useState(null)
  const [nextNumero, setNextNumero] = useState(1)

  const periodoActual = dayjs().format('YYYY-MM')

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || (u.rol !== 'envasador' && u.rol !== 'admin')) {
      router.push('/')
      return
    }
    setUser(u)
    cargarRegistros()
  }, [])

  const cargarRegistros = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bitacora_envasado')
        .select(`
          *,
          usuario:creado_por(nombre, username)
        `)
        .eq('periodo', periodoActual)
        .order('numero_registro', { ascending: true })

      if (error) throw error
      setRegistros(data || [])

      const { data: next } = await supabase
        .rpc('get_next_numero_envasado', { p_periodo: periodoActual })
      setNextNumero(next || 1)
    } catch (err) {
      console.error(err)
      toast.error('Error cargando registros')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id, num) => {
    if (!confirm(`¿Eliminar registro #${num}?`)) return
    const { error } = await supabase.from('bitacora_envasado').delete().eq('id', id)
    if (error) return toast.error('Error al eliminar')
    toast.success('Registro eliminado')
    cargarRegistros()
  }

  const mesLabel = dayjs().locale('es').format('MMMM YYYY').toUpperCase()

  return (
    <div className="min-h-screen bg-[#050f1a] p-3 sm:p-4 md:p-6">
      <div className="max-w-full lg:max-w-7xl mx-auto space-y-4 sm:space-y-5">

        {/* Header Responsive */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 sm:p-2.5 rounded-xl">
                <Package className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Bitácora de Envasado</h1>
                <p className="text-emerald-200 text-xs sm:text-sm">
                  Bienvenido, <span className="font-bold">{user?.nombre}</span> · {mesLabel}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setRegistroEditando(null); setShowModal(true) }}
                className="bg-white hover:bg-emerald-50 text-emerald-700 px-3 sm:px-4 py-2 rounded-xl font-black flex items-center gap-2 text-xs sm:text-sm shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Registro
              </button>
              <button onClick={cargarRegistros} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-xs sm:text-sm">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-xs sm:text-sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Stats Cards Responsive */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-5">
            {[
              { label: 'Registros', val: registros.length, color: 'text-white' },
              { label: 'Sacos', val: registros.reduce((s, r) => s + (r.cantidad_sacos || 0), 0).toLocaleString(), color: 'text-emerald-200' },
              { label: 'Toneladas', val: registros.reduce((s, r) => s + (Number(r.peso_toneladas) || 0), 0).toFixed(2) + ' TM', color: 'text-teal-200' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-white/20">
                <p className="text-emerald-200 text-[10px] sm:text-xs">{item.label}</p>
                <p className={`text-sm sm:text-xl font-black ${item.color} truncate`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="bg-[#0a1628] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-4 sm:px-5 py-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Registros — {mesLabel}
              <span className="text-slate-400 font-normal ml-1">({registros.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : registros.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">Sin registros este mes</p>
              <p className="text-slate-600 text-sm mt-1">Presiona "Nuevo Registro" para comenzar</p>
            </div>
          ) : (
            <>
              {/* Desktop Table - hidden on mobile */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800">
                    <tr>
                      {['No', 'Fecha', 'N° Orden', 'Grupo', 'Placa', 'Cliente', 'Producto', 'Sacos', 'TM', 'H. Llegada', 'H. Inicio', 'H. Final', 'T. Total', 'T. Efectivo', 'Sacos/Min', 'Demora Ini.', 'Demora Dur.', 'Total Dem.', 'Rend. 3P', 'Rend. Est.', 'Dif. Rend.', 'Acciones'].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {registros.map(r => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-2 py-2 font-black text-emerald-400">#{r.numero_registro}</td>
                        <td className="px-2 py-2 text-slate-300 whitespace-nowrap">{dayjs(r.fecha).format('DD/MM/YY')}</td>
                        <td className="px-2 py-2 text-slate-300">{r.numero_orden || '—'}</td>
                        <td className="px-2 py-2 text-slate-300">{r.grupo_envasado || '—'}</td>
                        <td className="px-2 py-2 font-mono text-blue-400 font-bold">{r.placa}</td>
                        <td className="px-2 py-2 text-slate-300 max-w-[150px] truncate" title={r.cliente}>{r.cliente || '—'}</td>
                        <td className="px-2 py-2 text-slate-300 max-w-[100px] truncate">{r.producto || '—'}</td>
                        <td className="px-2 py-2 font-bold text-white">{r.cantidad_sacos?.toLocaleString() || '—'}</td>
                        <td className="px-2 py-2 text-white">{r.peso_toneladas ? Number(r.peso_toneladas).toFixed(2) : '—'}</td>
                        <td className="px-2 py-2 font-mono text-slate-300">{r.hora_llegada || '—'}</td>
                        <td className="px-2 py-2 font-mono text-slate-300">{r.hora_inicio || '—'}</td>
                        <td className="px-2 py-2 font-mono text-slate-300">{r.hora_final || '—'}</td>
                        <td className="px-2 py-2 font-mono text-blue-400">{secToHMS(r.tiempo_total_seg)}</td>
                        <td className="px-2 py-2 font-mono text-emerald-400 font-bold">{secToHMS(r.tiempo_efectivo_seg)}</td>
                        <td className="px-2 py-2 text-white">{r.sacos_por_minuto ? Number(r.sacos_por_minuto).toFixed(2) : '—'}</td>
                        <td className="px-2 py-2 font-mono text-orange-400">{secToHMS(r.demora_inicio_seg)}</td>
                        <td className="px-2 py-2 font-mono text-orange-400">{secToHMS(r.demora_durante_seg)}</td>
                        <td className="px-2 py-2 font-mono text-red-400 font-bold">{secToHMS(r.total_demoras_seg)}</td>
                        <td className="px-2 py-2 text-purple-400">{r.rendimiento_tres_personas ? Number(r.rendimiento_tres_personas).toFixed(2) : '—'}</td>
                        <td className="px-2 py-2 text-slate-300">{r.rendimiento_estandar ? Number(r.rendimiento_estandar).toFixed(2) : '—'}</td>
                        <td className="px-2 py-2 font-bold">
                          <span className={r.diferencia_rendimiento !== null ? (Number(r.diferencia_rendimiento) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}>
                            {r.diferencia_rendimiento !== null ? Number(r.diferencia_rendimiento).toFixed(2) : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setRegistroEditando(r); setShowModal(true) }} className="p-1.5 hover:bg-blue-500/20 rounded-lg">
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button onClick={() => handleEliminar(r.id, r.numero_registro)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-800/70">
                    <tr>
                      <td colSpan={7} className="px-2 py-2 font-black text-slate-400 text-[10px] uppercase">TOTALES</td>
                      <td className="px-2 py-2 font-black text-white">{registros.reduce((s, r) => s + (r.cantidad_sacos || 0), 0).toLocaleString()}</td>
                      <td className="px-2 py-2 font-black text-white">{registros.reduce((s, r) => s + Number(r.peso_toneladas || 0), 0).toFixed(2)}</td>
                      <td colSpan={13}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="lg:hidden space-y-3 p-3">
                {registros.map(r => (
                  <div key={r.id} className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-emerald-400 font-black text-lg">#{r.numero_registro}</span>
                        <p className="text-slate-400 text-xs">{dayjs(r.fecha).format('DD/MM/YYYY')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setRegistroEditando(r); setShowModal(true) }} className="p-2 bg-blue-500/20 rounded-lg">
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleEliminar(r.id, r.numero_registro)} className="p-2 bg-red-500/20 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">Placa</p>
                        <p className="text-blue-400 font-mono font-bold">{r.placa}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">Cliente</p>
                        <p className="text-white text-xs truncate">{r.cliente || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">Sacos</p>
                        <p className="text-white font-bold">{r.cantidad_sacos?.toLocaleString() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">Toneladas</p>
                        <p className="text-white">{r.peso_toneladas ? Number(r.peso_toneladas).toFixed(2) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">T. Efectivo</p>
                        <p className="text-emerald-400 font-mono text-xs">{secToHMS(r.tiempo_efectivo_seg)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase">Sacos/Min</p>
                        <p className="text-white">{r.sacos_por_minuto ? Number(r.sacos_por_minuto).toFixed(2) : '—'}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-slate-500 text-[10px] uppercase">Registrado por</p>
                      <p className="text-slate-300 text-xs flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {r.usuario?.nombre || r.creado_por_nombre || 'Usuario'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <RegistroModal
          registro={registroEditando}
          periodoActual={periodoActual}
          nextNumero={nextNumero}
          usuarioActual={user}
          onClose={() => { setShowModal(false); setRegistroEditando(null) }}
          onSave={() => { setShowModal(false); setRegistroEditando(null); cargarRegistros() }}
        />
      )}
    </div>
  )
}