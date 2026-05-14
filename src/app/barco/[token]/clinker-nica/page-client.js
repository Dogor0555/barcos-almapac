// app/barco/[token]/clinker-nica/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from './../../../lib/supabase'
import { getCurrentUser } from './../../../lib/auth'
import {
  Save, RefreshCw, Ship, Anchor, Clock, AlertCircle, CheckCircle,
  Edit2, Trash2, Plus, X, Play, StopCircle, FileSpreadsheet,
  Calendar, Truck, Wrench, Zap, BarChart3, TrendingUp, Layers,
  ChevronDown, ChevronUp, Search, Filter, Download, Eye, User,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import * as XLSX from 'xlsx'

// Configuración de zona horaria
dayjs.extend(utc)
dayjs.extend(timezone)
const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

const formatUTCToSV = (utcDate, format = 'DD/MM/YY HH:mm') => {
  if (!utcDate) return '—'
  return dayjs.utc(utcDate).tz(TIMEZONE_EL_SALVADOR).format(format)
}

const getCurrentSVTimeForInput = () => {
  return dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DDTHH:mm')
}

// Lista predefinida de grúas
const GRUAS_PREDEFINIDAS = [
  'GRÚA 1',
  'GRÚA 2',
  'GRÚA 3',
  'GRÚA MÓVIL',
  'GRÚA PÓRTICO',
  'GRÚA TORRE',
  'OTRA'
]

// =====================================================
// MODAL DE CONFIRMACIÓN
// =====================================================
const ModalConfirmacion = ({ isOpen, onClose, onConfirm, titulo, mensaje, loading }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/20 max-w-md w-full">
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-t-2xl p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/20 p-2 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{titulo}</h3>
              <p className="text-sm text-slate-400">Confirma la operación</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-slate-300">{mensaje}</p>
        </div>
        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL BARCASA
// =====================================================
const ModalBarcaza = ({ isOpen, onClose, onSave, barco, barcazaEditando }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    nombre_barcaza: '',
    placa: '',
    hora_inicio: '',
    hora_finalizacion: '',
    atraso_minutos: '',
    observaciones: ''
  })

  useEffect(() => {
    if (barcazaEditando) {
      setFormData({
        fecha: barcazaEditando.fecha || dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        nombre_barcaza: barcazaEditando.nombre_barcaza || '',
        placa: barcazaEditando.placa || '',
        hora_inicio: barcazaEditando.hora_inicio || '',
        hora_finalizacion: barcazaEditando.hora_finalizacion || '',
        atraso_minutos: barcazaEditando.atraso_minutos || '',
        observaciones: barcazaEditando.observaciones || ''
      })
    } else {
      setFormData({
        fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        nombre_barcaza: '',
        placa: '',
        hora_inicio: '',
        hora_finalizacion: '',
        atraso_minutos: '',
        observaciones: ''
      })
    }
  }, [barcazaEditando, isOpen])

  const calcularTiempoTotal = (inicio, fin, atrasoMinutos) => {
    if (!inicio || !fin) return null
    const [hI, mI] = inicio.split(':').map(Number)
    const [hF, mF] = fin.split(':').map(Number)
    let minI = hI * 60 + mI
    let minF = hF * 60 + mF
    if (minF < minI) minF += 24 * 60
    let diffMin = minF - minI
    
    const atraso = parseInt(atrasoMinutos) || 0
    diffMin = Math.max(0, diffMin - atraso)
    
    const horas = Math.floor(diffMin / 60)
    const minutos = diffMin % 60
    return `${horas}h ${minutos}m`
  }

  const tiempoCalculado = useMemo(() => {
    return calcularTiempoTotal(formData.hora_inicio, formData.hora_finalizacion, formData.atraso_minutos)
  }, [formData.hora_inicio, formData.hora_finalizacion, formData.atraso_minutos])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      const tiempoTotal = calcularTiempoTotal(formData.hora_inicio, formData.hora_finalizacion, formData.atraso_minutos)

      const datos = {
        barco_id: barco.id,
        fecha: formData.fecha,
        nombre_barcaza: formData.nombre_barcaza,
        placa: formData.placa,
        hora_inicio: formData.hora_inicio,
        hora_finalizacion: formData.hora_finalizacion,
        tiempo_total: tiempoTotal,
        atraso_minutos: formData.atraso_minutos ? parseInt(formData.atraso_minutos) : null,
        observaciones: formData.observaciones || null,
        created_by: user.id,
        updated_by: user.id
      }

      let result
      if (barcazaEditando) {
        result = await supabase.from('clinker_barcazas').update(datos).eq('id', barcazaEditando.id)
        if (!result.error) toast.success('Registro actualizado')
      } else {
        result = await supabase.from('clinker_barcazas').insert([datos])
        if (!result.error) toast.success('Barcaza registrada')
      }

      if (result.error) throw result.error
      onSave()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-2xl p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ship className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">{barcazaEditando ? 'Editar Barcaza' : 'Nueva Barcaza'}</h3>
                <p className="text-sm text-blue-200">Complete los detalles de la operación</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
            <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de la Barcaza *</label>
              <input type="text" value={formData.nombre_barcaza} onChange={(e) => setFormData({ ...formData, nombre_barcaza: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Ej: Barcaza 1" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Placa</label>
              <input type="text" value={formData.placa} onChange={(e) => setFormData({ ...formData, placa: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" placeholder="Ej: ABC-123" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_inicio} onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, hora_inicio: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))} className="px-2.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Finalización</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_finalizacion} onChange={(e) => setFormData({ ...formData, hora_finalizacion: e.target.value })} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, hora_finalizacion: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))} className="px-2.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400">
                  <StopCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Atraso (minutos)</label>
              <input type="number" min="0" step="1" value={formData.atraso_minutos} onChange={(e) => setFormData({ ...formData, atraso_minutos: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" placeholder="Minutos de atraso" />
            </div>
          </div>

          {tiempoCalculado && (
            <div className="bg-green-500/10 rounded-xl p-3 text-center">
              <span className="text-green-400 font-bold">Tiempo Efectivo Calculado: {tiempoCalculado}</span>
              {formData.atraso_minutos && parseInt(formData.atraso_minutos) > 0 && (
                <span className="text-yellow-400 text-xs ml-2">(Se restaron {formData.atraso_minutos} min)</span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
            <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} rows="3" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm" placeholder="Notas adicionales..." />
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0f172a] py-4 -mb-6">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {barcazaEditando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// MODAL ATRASO GRÚA
// =====================================================
const ModalAtrasoGrua = ({ isOpen, onClose, onSave, barco, atrasoEditando }) => {
  const [loading, setLoading] = useState(false)
  const [modoPersonalizado, setModoPersonalizado] = useState(false)
  const [formData, setFormData] = useState({
    fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    grua_nombre: '',
    hora_inicio: '',
    hora_fin: '',
    descripcion: '',
    minutos_calculados: null
  })

  useEffect(() => {
    if (atrasoEditando) {
      setFormData({
        fecha: atrasoEditando.fecha || dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        grua_nombre: atrasoEditando.grua_nombre || '',
        hora_inicio: atrasoEditando.hora_inicio || '',
        hora_fin: atrasoEditando.hora_fin || '',
        descripcion: atrasoEditando.descripcion || '',
        minutos_calculados: atrasoEditando.minutos
      })
      if (atrasoEditando.grua_nombre && !GRUAS_PREDEFINIDAS.includes(atrasoEditando.grua_nombre)) {
        setModoPersonalizado(true)
      }
    } else {
      setFormData({
        fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        grua_nombre: '',
        hora_inicio: '',
        hora_fin: '',
        descripcion: '',
        minutos_calculados: null
      })
      setModoPersonalizado(false)
    }
  }, [atrasoEditando, isOpen])

  const calcularMinutos = (horaInicio, horaFin) => {
    if (!horaInicio || !horaFin) return null
    const [hI, mI] = horaInicio.split(':').map(Number)
    const [hF, mF] = horaFin.split(':').map(Number)
    let minI = hI * 60 + mI
    let minF = hF * 60 + mF
    if (minF < minI) minF += 24 * 60
    return minF - minI
  }

  const handleHoraChange = (campo, value) => {
    const nuevosDatos = { ...formData, [campo]: value }
    if (nuevosDatos.hora_inicio && nuevosDatos.hora_fin) {
      nuevosDatos.minutos_calculados = calcularMinutos(nuevosDatos.hora_inicio, nuevosDatos.hora_fin)
    } else {
      nuevosDatos.minutos_calculados = null
    }
    setFormData(nuevosDatos)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      if (!formData.grua_nombre.trim()) {
        toast.error('Debes seleccionar o ingresar el nombre de la grúa')
        setLoading(false)
        return
      }

      const datos = {
        barco_id: barco.id,
        fecha: formData.fecha,
        grua_nombre: formData.grua_nombre.trim(),
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null,
        minutos: formData.minutos_calculados,
        descripcion: formData.descripcion || null,
        created_by: user.id,
        updated_by: user.id
      }

      let result
      if (atrasoEditando) {
        result = await supabase.from('clinker_atrasos_grua').update(datos).eq('id', atrasoEditando.id)
        if (!result.error) toast.success('Atraso actualizado')
      } else {
        result = await supabase.from('clinker_atrasos_grua').insert([datos])
        if (!result.error) toast.success('Atraso registrado')
      }

      if (result.error) throw result.error
      onSave()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-t-2xl p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">{atrasoEditando ? 'Editar Atraso' : 'Nuevo Atraso de Grúa'}</h3>
                <p className="text-sm text-red-200">Registre el tiempo perdido por grúa</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
            <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de la Grúa *</label>
            
            {!modoPersonalizado ? (
              <div className="space-y-2">
                <select
                  value={formData.grua_nombre}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'OTRA') {
                      setModoPersonalizado(true)
                      setFormData({ ...formData, grua_nombre: '' })
                    } else {
                      setFormData({ ...formData, grua_nombre: value })
                    }
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                >
                  <option value="">Seleccionar grúa...</option>
                  {GRUAS_PREDEFINIDAS.filter(g => g !== 'OTRA').map(grua => (
                    <option key={grua} value={grua}>{grua}</option>
                  ))}
                  <option value="OTRA">✏️ Otra (ingresar manualmente)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.grua_nombre}
                    onChange={(e) => setFormData({ ...formData, grua_nombre: e.target.value })}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                    placeholder="Ej: GRÚA PÓRTICO 2"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModoPersonalizado(false)
                      setFormData({ ...formData, grua_nombre: '' })
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_inicio} onChange={(e) => handleHoraChange('hora_inicio', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                <button type="button" onClick={() => handleHoraChange('hora_inicio', dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_fin} onChange={(e) => handleHoraChange('hora_fin', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" />
                <button type="button" onClick={() => handleHoraChange('hora_fin', dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400">
                  <StopCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {formData.minutos_calculados !== null && formData.minutos_calculados > 0 && (
            <div className="bg-blue-500/10 rounded-xl p-3 text-center">
              <span className="text-blue-400 font-bold">
                Duración calculada: {Math.floor(formData.minutos_calculados / 60)}h {formData.minutos_calculados % 60}m
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Descripción de la Actividad / Demora</label>
            <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows="3" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm" placeholder="Describa la actividad o motivo del atraso..." required />
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0f172a] py-4 -mb-6">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {atrasoEditando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function ClinkerNicaPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [user, setUser] = useState(null)
  const [usuarios, setUsuarios] = useState({})
  
  // Barcazas
  const [barcazas, setBarcazas] = useState([])
  const [barcazaEditando, setBarcazaEditando] = useState(null)
  const [showBarcazaModal, setShowBarcazaModal] = useState(false)
  
  // Atrasos grúa
  const [atrasosGrua, setAtrasosGrua] = useState([])
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [showAtrasoModal, setShowAtrasoModal] = useState(false)
  
  // Filtros y estado UI
  const [seccionActiva, setSeccionActiva] = useState('barcazas')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [ordenTabla, setOrdenTabla] = useState('reciente')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    cargarUsuarios()
    cargarDatos()
  }, [token])

  const cargarUsuarios = async () => {
    try {
      const { data } = await supabase.from('usuarios').select('id, nombre, username')
      const mapa = {}
      data?.forEach(u => { mapa[u.id] = u })
      setUsuarios(mapa)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

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

      const { data: barcazasData } = await supabase
        .from('clinker_barcazas')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      setBarcazas(barcazasData || [])

      const { data: atrasosData } = await supabase
        .from('clinker_atrasos_grua')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      setAtrasosGrua(atrasosData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const barcazasFiltradas = useMemo(() => {
    if (!filtroFecha) return barcazas
    return barcazas.filter(b => b.fecha === filtroFecha)
  }, [barcazas, filtroFecha])

  const atrasosFiltrados = useMemo(() => {
    if (!filtroFecha) return atrasosGrua
    return atrasosGrua.filter(a => a.fecha === filtroFecha)
  }, [atrasosGrua, filtroFecha])

  const barcazasOrdenadas = useMemo(() => {
    const ordenadas = [...barcazasFiltradas]
    if (ordenTabla === 'reciente') {
      return ordenadas.sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`))
    } else {
      return ordenadas.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`))
    }
  }, [barcazasFiltradas, ordenTabla])

  const atrasosOrdenados = useMemo(() => {
    const ordenadas = [...atrasosFiltrados]
    if (ordenTabla === 'reciente') {
      return ordenadas.sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`))
    } else {
      return ordenadas.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`))
    }
  }, [atrasosFiltrados, ordenTabla])

  const estadisticasBarcazas = useMemo(() => {
    const totalRegistros = barcazas.length
    const barcazasUnicas = [...new Set(barcazas.map(b => b.nombre_barcaza))]
    
    let totalMinutosOperacion = 0
    let totalMinutosAtraso = 0
    
    barcazas.forEach(b => {
      if (b.tiempo_total) {
        const match = b.tiempo_total.match(/(\d+)h\s*(\d+)m/)
        if (match) {
          totalMinutosOperacion += parseInt(match[1]) * 60 + parseInt(match[2])
        }
      }
      if (b.atraso_minutos) {
        totalMinutosAtraso += b.atraso_minutos
      }
    })

    return {
      totalRegistros,
      barcazasUnicas: barcazasUnicas.length,
      totalHorasOperacion: Math.floor(totalMinutosOperacion / 60),
      totalMinutosOperacion: totalMinutosOperacion % 60,
      totalHorasAtraso: Math.floor(totalMinutosAtraso / 60),
      totalMinutosAtraso: totalMinutosAtraso % 60
    }
  }, [barcazas])

  const estadisticasAtrasos = useMemo(() => {
    const totalAtrasos = atrasosGrua.length
    const totalMinutos = atrasosGrua.reduce((sum, a) => sum + (a.minutos || 0), 0)
    const enCurso = atrasosGrua.filter(a => a.hora_inicio && !a.hora_fin).length
    const gruasUnicas = [...new Set(atrasosGrua.map(a => a.grua_nombre).filter(Boolean))]

    return {
      totalAtrasos,
      totalHoras: Math.floor(totalMinutos / 60),
      totalMinutos: totalMinutos % 60,
      enCurso,
      gruasUnicas: gruasUnicas.length
    }
  }, [atrasosGrua])

  const exportarExcel = async () => {
    setExportando(true)
    try {
      const wb = XLSX.utils.book_new()

      const resumenData = [
        ['REPORTE CLINKER NICARAGUA'],
        [`Barco: ${barco?.nombre || 'N/A'}`],
        [`Código: ${barco?.codigo_barco || 'N/A'}`],
        [`Fecha de exportación: ${dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm:ss')}`],
        [],
        ['RESUMEN DE BARCASAS'],
        ['Total registros', estadisticasBarcazas.totalRegistros],
        ['Barcazas distintas', estadisticasBarcazas.barcazasUnicas],
        ['Tiempo efectivo de operación', `${estadisticasBarcazas.totalHorasOperacion}h ${estadisticasBarcazas.totalMinutosOperacion}m`],
        ['Tiempo perdido por atrasos (barcazas)', `${estadisticasBarcazas.totalHorasAtraso}h ${estadisticasBarcazas.totalMinutosAtraso}m`],
        [],
        ['RESUMEN DE ATRASOS DE GRÚA'],
        ['Total atrasos', estadisticasAtrasos.totalAtrasos],
        ['Tiempo total de atrasos', `${estadisticasAtrasos.totalHoras}h ${estadisticasAtrasos.totalMinutos}m`],
        ['Atrasos en curso', estadisticasAtrasos.enCurso],
        ['Grúas involucradas', estadisticasAtrasos.gruasUnicas],
        [],
        ['DETALLE DE BARCASAS']
      ]

      resumenData.push(['Fecha', 'Barcaza', 'Placa', 'Hora Inicio', 'Hora Fin', 'Tiempo Efectivo', 'Atraso (min)', 'Observaciones', 'Registrado por'])
      barcazas.forEach(b => {
        const usuario = usuarios[b.created_by]
        resumenData.push([
          b.fecha,
          b.nombre_barcaza,
          b.placa || '—',
          b.hora_inicio,
          b.hora_finalizacion || '—',
          b.tiempo_total || '—',
          b.atraso_minutos || '—',
          b.observaciones || '—',
          usuario?.nombre || usuario?.username || `ID: ${b.created_by}`
        ])
      })

      resumenData.push([], ['DETALLE DE ATRASOS DE GRÚA'])
      resumenData.push(['Fecha', 'Grúa', 'Hora Inicio', 'Hora Fin', 'Minutos', 'Descripción', 'Registrado por'])
      atrasosGrua.forEach(a => {
        const usuario = usuarios[a.created_by]
        resumenData.push([
          a.fecha,
          a.grua_nombre || '—',
          a.hora_inicio,
          a.hora_fin || 'En curso',
          a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—',
          a.descripcion || '—',
          usuario?.nombre || usuario?.username || `ID: ${a.created_by}`
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(resumenData)
      ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 20 }]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Clinker_Nicaragua')
      
      const fileName = `Clinker_Nicaragua_${barco?.nombre || 'reporte'}_${dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD_HHmm')}.xlsx`
      XLSX.writeFile(wb, fileName)
      
      toast.success('Excel exportado correctamente')
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  const limpiarFiltros = () => {
    setFiltroFecha('')
  }

  const fechasDisponibles = useMemo(() => {
    const fechas = new Set()
    barcazas.forEach(b => fechas.add(b.fecha))
    atrasosGrua.forEach(a => fechas.add(a.fecha))
    return Array.from(fechas).sort().reverse()
  }, [barcazas, atrasosGrua])

  if (loading && !barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Barco no encontrado</h1>
          <p className="text-slate-400">El enlace no es válido o el barco ha sido eliminado</p>
        </div>
      </div>
    )
  }

  // Componente para vista móvil (cards)
  const BarcazaCard = ({ b }) => {
    const usuario = usuarios[b.created_by]
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-white text-lg">{b.nombre_barcaza}</h4>
            <p className="text-xs text-blue-400 font-mono">{b.placa || 'Sin placa'}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setBarcazaEditando(b); setShowBarcazaModal(true) }}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (confirm('¿Eliminar este registro?')) {
                  await supabase.from('clinker_barcazas').delete().eq('id', b.id)
                  toast.success('Registro eliminado')
                  cargarDatos()
                }
              }}
              className="p-2 rounded-lg bg-red-500/20 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">📅 Fecha:</span>
            <span className="text-white">{b.fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">⏰ Inicio:</span>
            <span className="text-white">{b.hora_inicio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🏁 Fin:</span>
            <span className="text-white">{b.hora_finalizacion || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">⚡ Tiempo efectivo:</span>
            <span className="text-green-400 font-bold">{b.tiempo_total || '—'}</span>
          </div>
          {b.atraso_minutos && (
            <div className="flex justify-between">
              <span className="text-slate-400">⚠️ Atraso:</span>
              <span className="text-yellow-400">{Math.floor(b.atraso_minutos / 60)}h {b.atraso_minutos % 60}m</span>
            </div>
          )}
          {b.observaciones && (
            <div className="flex justify-between">
              <span className="text-slate-400">📝 Obs:</span>
              <span className="text-slate-300 text-xs">{b.observaciones}</span>
            </div>
          )}
          <div className="flex justify-between text-xs pt-2 border-t border-white/10">
            <span className="text-slate-500">👤 {usuario?.nombre || usuario?.username || `ID: ${b.created_by}`}</span>
          </div>
        </div>
      </div>
    )
  }

  const AtrasoCard = ({ a }) => {
    const usuario = usuarios[a.created_by]
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-white">
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">{a.grua_nombre || '—'}</span>
            </h4>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAtrasoEditando(a); setShowAtrasoModal(true) }}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (confirm('¿Eliminar este atraso?')) {
                  await supabase.from('clinker_atrasos_grua').delete().eq('id', a.id)
                  toast.success('Atraso eliminado')
                  cargarDatos()
                }
              }}
              className="p-2 rounded-lg bg-red-500/20 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">📅 Fecha:</span>
            <span className="text-white">{a.fecha}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">⏰ Inicio:</span>
            <span className="text-white">{a.hora_inicio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🏁 Fin:</span>
            <span className="text-white">{a.hora_fin || <span className="text-yellow-400 animate-pulse">● En curso</span>}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">⏱️ Duración:</span>
            <span className="text-orange-400 font-bold">{a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—'}</span>
          </div>
          {a.descripcion && (
            <div className="flex justify-between">
              <span className="text-slate-400">📝 Desc:</span>
              <span className="text-slate-300 text-xs">{a.descripcion}</span>
            </div>
          )}
          <div className="flex justify-between text-xs pt-2 border-t border-white/10">
            <span className="text-slate-500">👤 {usuario?.nombre || usuario?.username || `ID: ${a.created_by}`}</span>
          </div>
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
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                  <Anchor className="w-6 h-6 md:w-8 md:h-8" />
                  {barco.nombre} - CLINKER
                </h1>
                {barco.codigo_barco && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
                    {barco.codigo_barco}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {barco.estado?.toUpperCase()}
                </span>
              </div>
              <p className="text-orange-200 text-xs md:text-sm mt-1">
                Registro de Barcazas y Atrasos de Grúa · {dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarExcel} disabled={exportando} className="bg-green-500 hover:bg-green-600 px-3 md:px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button onClick={cargarDatos} className="bg-white/10 hover:bg-white/20 px-3 md:px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Barcazas</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasBarcazas.totalRegistros}</p>
              <p className="text-xs text-orange-200/70 hidden md:block">{estadisticasBarcazas.barcazasUnicas} distintas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Tiempo Efectivo</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasBarcazas.totalHorasOperacion}h</p>
              <p className="text-xs text-orange-200/70 hidden md:block">{estadisticasBarcazas.totalMinutosOperacion} min</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Atrasos</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasAtrasos.totalAtrasos + estadisticasBarcazas.totalRegistros}</p>
              <p className="text-xs text-orange-200/70 hidden md:block">{estadisticasAtrasos.enCurso} en curso</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Tiempo Perdido</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasBarcazas.totalHorasAtraso + estadisticasAtrasos.totalHoras}h</p>
              <p className="text-xs text-orange-200/70 hidden md:block">Total</p>
            </div>
          </div>
        </div>

        {/* Selector de sección */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setSeccionActiva('barcazas')}
              className={`flex-1 px-4 md:px-6 py-4 text-center font-bold transition-all text-sm md:text-base ${
                seccionActiva === 'barcazas'
                  ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Ship className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              Barcazas
            </button>
            <button
              onClick={() => setSeccionActiva('atrasos')}
              className={`flex-1 px-4 md:px-6 py-4 text-center font-bold transition-all text-sm md:text-base ${
                seccionActiva === 'atrasos'
                  ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Wrench className="w-4 h-4 md:w-5 md:h-5 inline mr-1 md:mr-2" />
              Atrasos
            </button>
          </div>
        </div>

        {/* SECCIÓN DE BARCASAS */}
        {seccionActiva === 'barcazas' && (
          <>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 items-center w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="flex-1 sm:flex-initial bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Todas las fechas</option>
                    {fechasDisponibles.map(fecha => (
                      <option key={fecha} value={fecha}>{fecha}</option>
                    ))}
                  </select>
                  {filtroFecha && (
                    <button onClick={limpiarFiltros} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <X className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setBarcazaEditando(null); setShowBarcazaModal(true) }}
                    className="flex-1 sm:flex-initial bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Barcaza
                  </button>
                  <button
                    onClick={() => setOrdenTabla(ordenTabla === 'reciente' ? 'antiguo' : 'reciente')}
                    className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {ordenTabla === 'reciente' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    <span className="hidden sm:inline">{ordenTabla === 'reciente' ? 'Más Reciente' : 'Más Antiguo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA ESCRITORIO - TABLA */}
            <div className="hidden md:block bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Ship className="w-4 h-4 text-blue-400" />
                  Bitácora de Barcazas ({barcazasOrdenadas.length} registros)
                </h3>
              </div>

              {barcazasOrdenadas.length === 0 ? (
                <div className="p-12 text-center">
                  <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de barcazas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Barcaza</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Placa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fin</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tiempo</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Atraso</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Registrado por</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {barcazasOrdenadas.map((b) => {
                        const usuario = usuarios[b.created_by]
                        return (
                          <tr key={b.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-slate-300 text-sm">{b.fecha}</td>
                            <td className="px-4 py-3 font-bold text-white text-sm">{b.nombre_barcaza}</td>
                            <td className="px-4 py-3 font-mono text-blue-400 text-sm">{b.placa || '—'}</td>
                            <td className="px-4 py-3 text-sm">{b.hora_inicio}</td>
                            <td className="px-4 py-3 text-sm">{b.hora_finalizacion || '—'}</td>
                            <td className="px-4 py-3 font-bold text-green-400 text-sm">{b.tiempo_total || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              {b.atraso_minutos ? `${Math.floor(b.atraso_minutos / 60)}h ${b.atraso_minutos % 60}m` : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {usuario?.nombre || usuario?.username || `ID: ${b.created_by}`}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setBarcazaEditando(b); setShowBarcazaModal(true) }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('¿Eliminar este registro?')) {
                                      await supabase.from('clinker_barcazas').delete().eq('id', b.id)
                                      toast.success('Registro eliminado')
                                      cargarDatos()
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* VISTA MÓVIL - CARDS */}
            <div className="md:hidden">
              {barcazasOrdenadas.length === 0 ? (
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-12 text-center">
                  <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de barcazas</p>
                </div>
              ) : (
                barcazasOrdenadas.map(b => <BarcazaCard key={b.id} b={b} />)
              )}
            </div>
          </>
        )}

        {/* SECCIÓN DE ATRASOS DE GRÚA */}
        {seccionActiva === 'atrasos' && (
          <>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 items-center w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="flex-1 sm:flex-initial bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Todas las fechas</option>
                    {fechasDisponibles.map(fecha => (
                      <option key={fecha} value={fecha}>{fecha}</option>
                    ))}
                  </select>
                  {filtroFecha && (
                    <button onClick={limpiarFiltros} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                      <X className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setAtrasoEditando(null); setShowAtrasoModal(true) }}
                    className="flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Atraso
                  </button>
                  <button
                    onClick={() => setOrdenTabla(ordenTabla === 'reciente' ? 'antiguo' : 'reciente')}
                    className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {ordenTabla === 'reciente' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    <span className="hidden sm:inline">{ordenTabla === 'reciente' ? 'Más Reciente' : 'Más Antiguo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA ESCRITORIO - TABLA */}
            <div className="hidden md:block bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-400" />
                  Atrasos de Grúa ({atrasosOrdenados.length} registros)
                </h3>
              </div>

              {atrasosOrdenados.length === 0 ? (
                <div className="p-12 text-center">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de atrasos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Grúa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fin</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Duración</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Registrado por</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {atrasosOrdenados.map((a) => {
                        const usuario = usuarios[a.created_by]
                        return (
                          <tr key={a.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-slate-300 text-sm">{a.fecha}</td>
                            <td className="px-4 py-3">
                              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-mono">
                                {a.grua_nombre || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{a.hora_inicio}</td>
                            <td className="px-4 py-3 text-sm">
                              {a.hora_fin || <span className="text-yellow-400 animate-pulse text-xs">● En curso</span>}
                            </td>
                            <td className="px-4 py-3 font-bold text-sm">
                              {a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {usuario?.nombre || usuario?.username || `ID: ${a.created_by}`}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setAtrasoEditando(a); setShowAtrasoModal(true) }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('¿Eliminar este atraso?')) {
                                      await supabase.from('clinker_atrasos_grua').delete().eq('id', a.id)
                                      toast.success('Atraso eliminado')
                                      cargarDatos()
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* VISTA MÓVIL - CARDS */}
            <div className="md:hidden">
              {atrasosOrdenados.length === 0 ? (
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-12 text-center">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de atrasos</p>
                </div>
              ) : (
                atrasosOrdenados.map(a => <AtrasoCard key={a.id} a={a} />)
              )}
            </div>
          </>
        )}
      </div>

      {/* MODALES */}
      <ModalBarcaza
        isOpen={showBarcazaModal}
        onClose={() => {
          setShowBarcazaModal(false)
          setBarcazaEditando(null)
        }}
        onSave={cargarDatos}
        barco={barco}
        barcazaEditando={barcazaEditando}
      />

      <ModalAtrasoGrua
        isOpen={showAtrasoModal}
        onClose={() => {
          setShowAtrasoModal(false)
          setAtrasoEditando(null)
        }}
        onSave={cargarDatos}
        barco={barco}
        atrasoEditando={atrasoEditando}
      />
    </div>
  )
}