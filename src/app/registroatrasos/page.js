// app/registroatrasos/page.js - Módulo de atrasos responsive mejorado
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isAdmin, isChequero } from '../lib/auth'
import { 
  Clock, Ship, Calendar, Save, X, 
  Plus, Trash2, Edit2, RefreshCw, Search, 
  BarChart3, Layers,
  Coffee, CloudRain, Wrench, Truck, Zap, AlertTriangle,
  ArrowLeft, Play, StopCircle, CheckCircle,
  ChevronDown, ChevronRight, Info,
  Flag, Anchor, Target, Inbox, Edit,
  Package, History, MapPin, Box
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO
// =====================================================
const TIPOS_PARO_CONFIG = {
  'Desperfecto de grua del buque': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'Colocando almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'Falta de camiones (Unidades insuficientes por transportistas)': { icono: <Truck className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  'Traslado de UCA a Almapac': { icono: <Truck className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Falla sistema UPDP': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Tiempo de comida': { icono: <Coffee className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  'Cierre de bodegas': { icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  'Amenaza de lluvia': { icono: <CloudRain className="w-4 h-4" />, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Lluvia': { icono: <CloudRain className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'Esperando apertura de bodegas': { icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Apertura de bodegas': { icono: <Layers className="w-4 h-4" />, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Traslado de UCA a Alcasa': { icono: <Truck className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Mantenimiento almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  'Sacando equipo abordo': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Movimiento de UCA': { icono: <Truck className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  'Movilizando tolvas': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' },
  'Falta de Tolveros': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20' },
  'Quitando Almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  'Colocando equipo abordo': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  'Acumulado producto': { icono: <BarChart3 className="w-4 h-4" />, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  'Falla en sistema UPDP': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Falla en el sistema ALMAPAC': { icono: <Zap className="w-4 h-4" />, bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'Esperando señal de Almapac': { icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
}

// =====================================================
// MODAL REGISTRAR TIPO DE DESCARGA
// =====================================================
const RegistroDescargaModal = ({ barco, onClose, onSave, tiposDescarga, descargaActual }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tipo_descarga_id: descargaActual?.tipo_descarga_id || '',
    fecha_hora_inicio: descargaActual?.fecha_hora_inicio
      ? dayjs(descargaActual.fecha_hora_inicio).format('YYYY-MM-DDTHH:mm')
      : dayjs().format('YYYY-MM-DDTHH:mm'),
    observaciones: descargaActual?.observaciones || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      if (!formData.tipo_descarga_id) { toast.error('Selecciona un tipo de descarga'); return }

      if (descargaActual && !descargaActual.fecha_hora_fin) {
        const { error: finalizarError } = await supabase
          .from('registro_descarga')
          .update({ fecha_hora_fin: new Date().toISOString() })
          .eq('id', descargaActual.id)
        if (finalizarError) throw finalizarError
      }

      const { error } = await supabase.from('registro_descarga').insert([{
        barco_id: barco.id,
        tipo_descarga_id: parseInt(formData.tipo_descarga_id),
        fecha_hora_inicio: new Date(formData.fecha_hora_inicio).toISOString(),
        observaciones: formData.observaciones || null,
        created_by: user.id
      }])
      if (error) throw error

      toast.success('Tipo de descarga registrado')
      onSave()
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Registrar Tipo de Descarga</h2>
                <p className="text-blue-200 text-xs">{barco.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Tipo de Descarga <span className="text-red-400">*</span>
            </label>
            <select name="tipo_descarga_id" value={formData.tipo_descarga_id} onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required>
              <option value="">Seleccionar tipo</option>
              {tiposDescarga.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.icono} {tipo.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha y Hora de Inicio</label>
            <div className="relative">
              <input type="datetime-local" name="fecha_hora_inicio" value={formData.fecha_hora_inicio} onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <button type="button"
                onClick={() => setFormData(prev => ({ ...prev, fecha_hora_inicio: dayjs().format('YYYY-MM-DDTHH:mm') }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400">
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm"
              placeholder="Detalles adicionales..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// MODAL HISTORIAL DE DESCARGAS
// =====================================================
const HistorialDescargaModal = ({ barco, onClose }) => {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarHistorial() }, [barco])

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('registro_descarga')
        .select(`*, tipo_descarga:tipos_descarga(id, nombre, icono, color), usuario:created_by(id, nombre, username)`)
        .eq('barco_id', barco.id)
        .order('fecha_hora_inicio', { ascending: false })
      if (error) throw error
      setHistorial(data || [])
    } catch (error) {
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl"><History className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Historial de Descargas</h2>
              <p className="text-purple-200 text-xs">{barco.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No hay registros de descarga</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map(reg => (
                <div key={reg.id} className="bg-slate-900 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reg.tipo_descarga?.icono || '📦'}</span>
                      <div>
                        <p className="font-bold text-white text-sm">{reg.tipo_descarga?.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {dayjs(reg.fecha_hora_inicio).format('DD/MM/YY HH:mm')}
                          {reg.fecha_hora_fin && ` → ${dayjs(reg.fecha_hora_fin).format('HH:mm')}`}
                        </p>
                        {reg.observaciones && <p className="text-xs text-slate-400 mt-1">{reg.observaciones}</p>}
                      </div>
                    </div>
                    {!reg.fecha_hora_fin && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">ACTIVO</span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs text-slate-500">
                    <span>{reg.usuario?.nombre || 'Sistema'}</span>
                    {reg.fecha_hora_fin && (
                      <span>
                        {dayjs(reg.fecha_hora_fin).diff(dayjs(reg.fecha_hora_inicio), 'hour')}h{' '}
                        {dayjs(reg.fecha_hora_fin).diff(dayjs(reg.fecha_hora_inicio), 'minute') % 60}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <button onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL FINALIZAR DESCARGA
// =====================================================
const FinalizarDescargaModal = ({ descarga, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false) }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl"><StopCircle className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Finalizar Descarga</h2>
              <p className="text-yellow-200 text-xs">{descarga.tipo_descarga?.nombre}</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-white text-sm mb-2">¿Finalizar este tipo de descarga?</p>
          <p className="text-xs text-slate-400 mb-6">
            Iniciado: {dayjs(descarga.fecha_hora_inicio).format('DD/MM/YYYY HH:mm')}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <StopCircle className="w-4 h-4" />}
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL EDITAR TIEMPOS DE OPERACIÓN
// =====================================================
const EditarTiemposModal = ({ barco, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [tiempos, setTiempos] = useState({
    tiempo_arribo: barco.tiempo_arribo ? dayjs(barco.tiempo_arribo).format('YYYY-MM-DDTHH:mm') : '',
    tiempo_ataque: barco.tiempo_ataque ? dayjs(barco.tiempo_ataque).format('YYYY-MM-DDTHH:mm') : '',
    tiempo_recibido: barco.tiempo_recibido ? dayjs(barco.tiempo_recibido).format('YYYY-MM-DDTHH:mm') : '',
    operacion_iniciada_at: barco.operacion_iniciada_at ? dayjs(barco.operacion_iniciada_at).format('YYYY-MM-DDTHH:mm') : '',
    operacion_finalizada_at: barco.operacion_finalizada_at ? dayjs(barco.operacion_finalizada_at).format('YYYY-MM-DDTHH:mm') : ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setTiempos(prev => ({ ...prev, [name]: value }))
  }

  const setHoraActual = (campo) => setTiempos(prev => ({ ...prev, [campo]: dayjs().format('YYYY-MM-DDTHH:mm') }))

  const campos = [
    { key: 'tiempo_arribo', label: 'Arribo', icon: <Anchor className="w-4 h-4 text-blue-400" />, color: 'border-blue-500/20', accent: 'hover:text-blue-400' },
    { key: 'tiempo_ataque', label: 'Ataque', icon: <Target className="w-4 h-4 text-yellow-400" />, color: 'border-yellow-500/20', accent: 'hover:text-yellow-400' },
    { key: 'tiempo_recibido', label: 'Recibido', icon: <Inbox className="w-4 h-4 text-green-400" />, color: 'border-green-500/20', accent: 'hover:text-green-400' },
    { key: 'operacion_iniciada_at', label: 'Inicio Operación', icon: <Play className="w-4 h-4 text-emerald-400" />, color: 'border-emerald-500/20', accent: 'hover:text-emerald-400' },
    { key: 'operacion_finalizada_at', label: 'Fin Operación', icon: <StopCircle className="w-4 h-4 text-red-400" />, color: 'border-red-500/20', accent: 'hover:text-red-400' },
  ]

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at) {
      toast.error('No se puede tener fin sin inicio'); return
    }
    setLoading(true)
    try {
      const updates = {}
      if (tiempos.tiempo_arribo) { updates.tiempo_arribo = new Date(tiempos.tiempo_arribo).toISOString(); updates.tiempo_arribo_editado = true }
      if (tiempos.tiempo_ataque) { updates.tiempo_ataque = new Date(tiempos.tiempo_ataque).toISOString(); updates.tiempo_ataque_editado = true }
      if (tiempos.tiempo_recibido) { updates.tiempo_recibido = new Date(tiempos.tiempo_recibido).toISOString(); updates.tiempo_recibido_editado = true }
      if (tiempos.operacion_iniciada_at) { updates.operacion_iniciada_at = new Date(tiempos.operacion_iniciada_at).toISOString(); updates.operacion_iniciada_editado = true }
      if (tiempos.operacion_finalizada_at) { updates.operacion_finalizada_at = new Date(tiempos.operacion_finalizada_at).toISOString(); updates.operacion_finalizada_editado = true }
      if (tiempos.operacion_finalizada_at) updates.estado = 'finalizado'
      else if (tiempos.operacion_iniciada_at) updates.estado = 'activo'

      const { error } = await supabase.from('barcos').update(updates).eq('id', barco.id)
      if (error) throw error
      toast.success('Tiempos actualizados')
      onSave(); onClose()
    } catch (error) {
      toast.error('Error al actualizar tiempos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl"><Clock className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Editar Tiempos</h2>
              <p className="text-blue-200 text-xs">{barco.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {campos.map(({ key, label, icon, color, accent }) => (
            <div key={key} className={`bg-slate-900 rounded-xl p-3.5 border ${color}`}>
              <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs font-bold text-slate-300">{label}</span>
              </div>
              <div className="relative">
                <input type="datetime-local" name={key} value={tiempos[key]} onChange={handleChange}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm pr-10" />
                <button type="button" onClick={() => setHoraActual(key)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 ${accent} transition-colors`}>
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at && (
            <p className="text-xs text-red-400">⚠️ No se puede tener fin sin inicio</p>
          )}
        </div>
        <div className="p-5 border-t border-white/10 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm">
            Cancelar
          </button>
          <button onClick={handleSubmit}
            disabled={loading || (tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at)}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL INICIAR OPERACIÓN
// =====================================================
const IniciarOperacionModal = ({ barco, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false) }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl"><Play className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Iniciar Operación</h2>
              <p className="text-green-200 text-xs">{barco.nombre}</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-white text-sm mb-2">¿Iniciar la operación ahora?</p>
          <p className="text-xs text-slate-400 mb-6">
            Se registrará la hora actual y se habilitará el registro de atrasos.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
              Iniciar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL FINALIZAR OPERACIÓN
// =====================================================
const FinalizarOperacionModal = ({ barco, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)
  const [motivo, setMotivo] = useState('')
  const handleConfirm = async () => { setLoading(true); await onConfirm(motivo); setLoading(false) }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl"><StopCircle className="w-5 h-5 text-white" /></div>
            <div>
              <h2 className="text-lg font-black text-white">Finalizar Operación</h2>
              <p className="text-red-200 text-xs">{barco.nombre}</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <p className="text-white text-sm mb-2">¿Finalizar la operación?</p>
          <p className="text-xs text-slate-400 mb-4">No se podrán registrar más atrasos.</p>
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-1.5">Motivo (opcional)</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm"
              placeholder="Ej: Operación completada..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-sm">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <StopCircle className="w-4 h-4" />}
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL REGISTRAR / EDITAR ATRASO
// =====================================================
const AtrasoModal = ({ barco, atraso, tiposParo, bodegasBarco, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [enCurso, setEnCurso] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [formData, setFormData] = useState({
    tipo_paro_id: atraso?.tipo_paro_id || '',
    fecha: atraso?.fecha || dayjs().format('YYYY-MM-DD'),
    hora_inicio: atraso?.hora_inicio?.slice(0, 5) || '',
    hora_fin: atraso?.hora_fin?.slice(0, 5) || '',
    bodega_id: atraso?.bodega_id || '',
    es_general: atraso?.es_general || false,
    observaciones: atraso?.observaciones || ''
  })

  useEffect(() => {
    if (atraso) {
      const tipo = tiposParo.find(t => t.id === atraso.tipo_paro_id)
      setTipoSeleccionado(tipo)
      setPaso(2)
    }
  }, [atraso, tiposParo])

  useEffect(() => {
    let interval
    if (enCurso) interval = setInterval(() => setTiempoTranscurrido(prev => prev + 1), 60000)
    return () => clearInterval(interval)
  }, [enCurso])

  const seleccionarTipo = (tipo) => {
    setTipoSeleccionado(tipo)
    setFormData(prev => ({
      ...prev,
      tipo_paro_id: tipo.id,
      es_general: tipo.es_general ? true : prev.es_general,
      bodega_id: tipo.es_general ? '' : prev.bodega_id
    }))
    setPaso(2)
  }

  const calcularDuracion = (inicio, fin) => {
    if (!inicio || !fin) return null
    const [hI, mI] = inicio.split(':').map(Number)
    const [hF, mF] = fin.split(':').map(Number)
    let minI = hI * 60 + mI, minF = hF * 60 + mF
    if (minF < minI) minF += 24 * 60
    return minF - minI
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      if (!formData.hora_inicio) { toast.error('Ingresa hora de inicio'); return }
      if (!formData.es_general && !formData.bodega_id && !tipoSeleccionado?.es_general) {
        toast.error('Selecciona una bodega o marca como general'); return
      }
      const bodegaSeleccionada = bodegasBarco.find(b => b.id === parseInt(formData.bodega_id))
      const duracion = formData.hora_fin ? calcularDuracion(formData.hora_inicio, formData.hora_fin) : null
      const datos = {
        barco_id: barco.id,
        tipo_paro_id: parseInt(formData.tipo_paro_id),
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null,
        duracion_minutos: duracion,
        bodega_id: formData.es_general ? null : (formData.bodega_id ? parseInt(formData.bodega_id) : null),
        bodega_nombre: formData.es_general ? null : (bodegaSeleccionada?.nombre || null),
        bodega_codigo: formData.es_general ? null : (bodegaSeleccionada?.codigo || null),
        es_general: formData.es_general,
        observaciones: formData.observaciones || null,
        created_by: user.id,
        updated_by: user.id
      }
      const result = atraso
        ? await supabase.from('registro_atrasos').update(datos).eq('id', atraso.id)
        : await supabase.from('registro_atrasos').insert([datos])
      if (result.error) throw result.error
      toast.success(atraso ? 'Atraso actualizado' : 'Atraso registrado')
      onSave()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-black text-white">{atraso ? 'Editar Atraso' : 'Nuevo Atraso'}</h2>
                <p className="text-orange-200 text-xs">{barco.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <div className={`flex-1 h-1 rounded-full ${paso >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-1 rounded-full ${paso >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          <div className="flex justify-between text-[10px] text-white/60 mt-1">
            <span>1. Tipo de paro</span>
            <span>2. Detalles</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {paso === 1 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                Selecciona el tipo de paro
              </p>
              <div className="grid grid-cols-1 gap-2">
                {tiposParo.map(tipo => {
                  const config = TIPOS_PARO_CONFIG[tipo.nombre] || { bg: 'bg-gray-500/10', icono: <AlertTriangle className="w-4 h-4 text-gray-400" /> }
                  return (
                    <button key={tipo.id} onClick={() => seleccionarTipo(tipo)}
                      className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                        tipo.es_imputable_almapac
                          ? 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/60'
                          : 'border-white/10 bg-slate-900 hover:border-orange-500/40'
                      }`}>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>{config.icono}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm leading-tight">{tipo.nombre}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {tipo.es_general && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">GENERAL</span>
                          )}
                          {tipo.es_imputable_almapac && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">ALMAPAC</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button type="button" onClick={() => { setPaso(1); setTipoSeleccionado(null) }}
                className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                ← Volver a tipos
              </button>

              {/* Tipo seleccionado */}
              <div className="bg-slate-900 rounded-xl p-3 border border-orange-500/20">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Tipo seleccionado</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {tipoSeleccionado && TIPOS_PARO_CONFIG[tipoSeleccionado.nombre]?.icono}
                  <span className="font-bold text-white text-sm">{tipoSeleccionado?.nombre}</span>
                  {tipoSeleccionado?.es_general && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">GENERAL</span>
                  )}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
                <input type="date" value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
              </div>

              {/* Horario */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
                  <div className="flex gap-2">
                    <input type="time" value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm min-w-0" required />
                    <button type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, hora_inicio: dayjs().format('HH:mm') })); setEnCurso(true) }}
                      className="px-2.5 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl flex-shrink-0"
                      title="Ahora">
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
                  <div className="flex gap-2">
                    <input type="time" value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm min-w-0" />
                    <button type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, hora_fin: dayjs().format('HH:mm') })); setEnCurso(false) }}
                      className="px-2.5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl flex-shrink-0"
                      title="Ahora">
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {enCurso && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                  <p className="text-blue-400 text-xs">
                    En curso · {Math.floor(tiempoTranscurrido / 60)}h {tiempoTranscurrido % 60}m
                  </p>
                </div>
              )}

              {/* Bodega */}
              {!tipoSeleccionado?.es_general && (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-xl border border-white/10 hover:border-white/20">
                    <input type="checkbox" checked={formData.es_general}
                      onChange={(e) => setFormData({ ...formData, es_general: e.target.checked, bodega_id: '' })}
                      className="w-4 h-4 rounded accent-orange-500" />
                    <span className="text-sm text-slate-300">Aplica a todo el barco</span>
                  </label>
                  {!formData.es_general && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Bodega</label>
                      <select value={formData.bodega_id}
                        onChange={(e) => setFormData({ ...formData, bodega_id: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                        <option value="">Seleccionar bodega</option>
                        {bodegasBarco.map(b => (
                          <option key={b.id} value={b.id}>{b.nombre} ({b.codigo})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
                <textarea value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="2"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm"
                  placeholder="Detalles adicionales (opcional)" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle className="w-4 h-4" />
                  }
                  {atraso ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// DASHBOARD DE ATRASOS
// =====================================================
const DashboardAtrasos = ({ barco, registros, tiposParo, onClose }) => {
  const [periodo, setPeriodo] = useState('todo')

  const registrosFiltrados = registros.filter(r => {
    if (periodo === 'todo') return true
    const fechaReg = dayjs(r.fecha), hoy = dayjs()
    if (periodo === 'dia') return fechaReg.isSame(hoy, 'day')
    if (periodo === 'semana') return fechaReg.isAfter(hoy.subtract(7, 'day'))
    if (periodo === 'mes') return fechaReg.isAfter(hoy.subtract(30, 'day'))
    return true
  })

  const totales = tiposParo.map(tipo => {
    const registrosTipo = registrosFiltrados.filter(r => r.tipo_paro_id === tipo.id)
    const totalMinutos = registrosTipo.reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
    return {
      ...tipo, registros: registrosTipo.length, totalMinutos,
      horas: Math.floor(totalMinutos / 60), minutos: totalMinutos % 60,
      config: TIPOS_PARO_CONFIG[tipo.nombre] || {}
    }
  })

  const noImputables = totales.filter(t => !t.es_imputable_almapac && t.totalMinutos > 0)
  const imputables = totales.filter(t => t.es_imputable_almapac && t.totalMinutos > 0)
  const totalNoImputable = noImputables.reduce((sum, t) => sum + t.totalMinutos, 0)
  const totalImputable = imputables.reduce((sum, t) => sum + t.totalMinutos, 0)
  const totalGeneral = totalNoImputable + totalImputable
  const fechaLlegada = barco.fecha_llegada ? dayjs(barco.fecha_llegada) : dayjs()
  const totalMinutosOperacion = dayjs().diff(fechaLlegada, 'minute')
  const tiempoNeto = totalMinutosOperacion - totalGeneral

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><BarChart3 className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-black text-white">Dashboard · {barco.nombre}</h2>
                <p className="text-blue-200 text-xs">Análisis de paros</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[{ value: 'dia', label: 'Hoy' }, { value: 'semana', label: '7 días' }, { value: 'mes', label: '30 días' }, { value: 'todo', label: 'Todo' }].map(p => (
              <button key={p.value} onClick={() => setPeriodo(p.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                  periodo === p.value ? 'bg-white text-blue-600' : 'bg-white/10 text-white'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tiempo total', value: totalMinutosOperacion, sub: 'Desde llegada', from: 'from-blue-600', to: 'to-blue-800' },
              { label: 'Tiempo neto', value: tiempoNeto, sub: 'Sin paros', from: 'from-green-600', to: 'to-green-800' },
              { label: 'Total paros', value: totalGeneral, sub: `${registrosFiltrados.length} reg.`, from: 'from-orange-600', to: 'to-red-600' },
            ].map(({ label, value, sub, from, to }) => (
              <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-xl p-3`}>
                <p className="text-white/60 text-[10px] uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-white mt-1">
                  {Math.floor(value / 60)}<span className="text-sm font-bold">h {value % 60}m</span>
                </p>
                <p className="text-white/50 text-[10px] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Distribución */}
          <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
              <Info className="w-3.5 h-3.5 text-blue-400" /> Distribución
            </h3>
            <div className="space-y-3">
              {[
                { label: 'No imputables', value: totalNoImputable, color: 'bg-red-500', text: 'text-red-400' },
                { label: 'Imputables ALMAPAC', value: totalImputable, color: 'bg-yellow-500', text: 'text-yellow-400' },
              ].map(({ label, value, color, text }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-bold ${text}`}>{Math.floor(value / 60)}h {value % 60}m</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: totalGeneral > 0 ? `${(value / totalGeneral) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle por tipo */}
          {[
            { list: noImputables, title: 'No imputables a ALMAPAC', borderColor: 'border-red-500/20', headerBg: 'bg-red-500/10', icon: <AlertTriangle className="w-4 h-4 text-red-400" />, barColor: 'bg-red-500/60', total: totalNoImputable, totalText: 'text-red-400' },
            { list: imputables, title: 'Imputables a ALMAPAC', borderColor: 'border-yellow-500/20', headerBg: 'bg-yellow-500/10', icon: <Zap className="w-4 h-4 text-yellow-400" />, barColor: 'bg-yellow-500/60', total: totalImputable, totalText: 'text-yellow-400' },
          ].map(({ list, title, borderColor, headerBg, icon, barColor, total, totalText }) => list.length > 0 && (
            <div key={title} className={`bg-slate-900 rounded-xl overflow-hidden border ${borderColor}`}>
              <div className={`${headerBg} px-4 py-3 border-b ${borderColor} flex items-center gap-2`}>
                {icon}
                <h3 className="font-bold text-white text-xs">{title}</h3>
              </div>
              <div className="p-4 space-y-3">
                {list.map(tipo => (
                  <div key={tipo.id}>
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1 rounded flex-shrink-0 ${tipo.config.bg || 'bg-gray-500/10'}`}>
                          {tipo.config.icono || <AlertTriangle className="w-3 h-3" />}
                        </div>
                        <span className="text-white text-xs leading-tight truncate">{tipo.nombre}</span>
                      </div>
                      <span className={`font-bold text-xs whitespace-nowrap flex-shrink-0 ${tipo.config.text || totalText}`}>
                        {tipo.horas}h {tipo.minutos}m
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`}
                        style={{ width: total > 0 ? `${(tipo.totalMinutos / total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
                  <span className="text-white">TOTAL</span>
                  <span className={totalText}>{Math.floor(total / 60)}h {total % 60}m</span>
                </div>
              </div>
            </div>
          ))}

          {registrosFiltrados.length === 0 && (
            <div className="bg-slate-900 rounded-xl p-10 text-center">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No hay atrasos en este período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// TARJETA DE REGISTRO — RESPONSIVE MEJORADA
// =====================================================
const RegistroCard = ({ reg, tiposParo, bodegasBarco, onEditar, onEliminar }) => {
  const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {
    bg: 'bg-slate-800', icono: <AlertTriangle className="w-4 h-4 text-slate-400" />,
    border: 'border-slate-700', text: 'text-slate-400'
  }
  const bodegaInfo = !reg.es_general && reg.bodega_id
    ? (reg.bodega_nombre
        ? { nombre: reg.bodega_nombre, codigo: reg.bodega_codigo }
        : bodegasBarco.find(b => b.id === reg.bodega_id))
    : null

  return (
    <div className={`bg-slate-900 rounded-xl border-2 transition-all overflow-hidden ${
      reg.es_general ? 'border-purple-500/30 hover:border-purple-500/50'
      : bodegaInfo ? 'border-blue-500/30 hover:border-blue-500/50'
      : 'border-slate-800 hover:border-orange-500/40'
    }`}>
      <div className="p-4">
        {/* Cabecera: tipo + acciones */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${config.bg} flex-shrink-0`}>
            {config.icono}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-snug">{tipo?.nombre || 'Desconocido'}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {tipo?.es_imputable_almapac && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">ALMAPAC</span>
              )}
              <span className="text-[10px] text-slate-600">{dayjs(reg.fecha).format('DD/MM/YYYY')}</span>
            </div>
          </div>
          {/* Botones de acción */}
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEditar(reg)}
              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-all" title="Editar">
              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
            </button>
            <button onClick={() => onEliminar(reg.id)}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-all" title="Eliminar">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Horario y duración en una sola fila */}
        <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="font-mono text-sm text-white">{reg.hora_inicio?.slice(0, 5)}</span>
          {reg.hora_fin ? (
            <>
              <span className="text-slate-600 text-xs">→</span>
              <span className="font-mono text-sm text-white">{reg.hora_fin?.slice(0, 5)}</span>
              <span className="ml-auto font-bold text-xs text-orange-400">
                {Math.floor((reg.duracion_minutos || 0) / 60)}h {(reg.duracion_minutos || 0) % 60}m
              </span>
            </>
          ) : (
            <span className="ml-auto text-xs text-blue-400 animate-pulse font-medium">En curso</span>
          )}
        </div>

        {/* Ubicación */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          reg.es_general ? 'bg-purple-500/10 border border-purple-500/20'
          : bodegaInfo ? 'bg-blue-500/10 border border-blue-500/20'
          : 'bg-slate-800/40 border border-slate-700/50'
        }`}>
          <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${
            reg.es_general ? 'text-purple-400' : bodegaInfo ? 'text-blue-400' : 'text-slate-600'
          }`} />
          {reg.es_general ? (
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-purple-300">TODAS LAS BODEGAS</span>
            </div>
          ) : bodegaInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <Box className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-white truncate">{bodegaInfo.nombre}</span>
              {bodegaInfo.codigo && (
                <span className="text-xs text-blue-400 font-mono flex-shrink-0">{bodegaInfo.codigo}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500">Sin bodega específica</span>
          )}
        </div>

        {/* Observaciones */}
        {reg.observaciones && (
          <p className="mt-2.5 text-xs text-slate-400 italic bg-slate-800/40 rounded-lg px-3 py-2 border-l-2 border-slate-600">
            {reg.observaciones}
          </p>
        )}
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function RegistroAtrasosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [barcoSeleccionado, setBarcoSeleccionado] = useState(null)
  const [tiposParo, setTiposParo] = useState([])
  const [tiposDescarga, setTiposDescarga] = useState([])
  const [registros, setRegistros] = useState([])
  const [descargasActivas, setDescargasActivas] = useState([])
  const [historialDescargas, setHistorialDescargas] = useState([])
  const [bodegasBarco, setBodegasBarco] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAtrasoModal, setShowAtrasoModal] = useState(false)
  const [showDescargaModal, setShowDescargaModal] = useState(false)
  const [showFinalizarDescargaModal, setShowFinalizarDescargaModal] = useState(false)
  const [showHistorialDescargaModal, setShowHistorialDescargaModal] = useState(false)
  const [descargaSeleccionada, setDescargaSeleccionada] = useState(null)
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState(dayjs().format('YYYY-MM-DD'))
  const [searchTerm, setSearchTerm] = useState('')
  const [vista, setVista] = useState('lista')
  const [showShipSelector, setShowShipSelector] = useState(true)
  const [showIniciarModal, setShowIniciarModal] = useState(false)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [showEditarTiemposModal, setShowEditarTiemposModal] = useState(false)
  const [operacionInfo, setOperacionInfo] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }
    if (!isAdmin() && !isChequero()) { toast.error('Sin permisos'); router.push('/'); return }
    setUser(currentUser)
    cargarDatos()
  }, [router])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const { data: tiposData } = await supabase.from('tipos_paro').select('*').eq('activo', true).order('orden')
      setTiposParo(tiposData || [])
      const { data: tiposDescargaData } = await supabase.from('tipos_descarga').select('*').eq('activo', true).order('orden')
      setTiposDescarga(tiposDescargaData || [])
      const { data: barcosData, error: barcosError } = await supabase
        .from('barcos').select('*').order('created_at', { ascending: false })
      if (barcosError) { toast.error('Error al cargar barcos'); return }
      setBarcos(barcosData || [])
      if (barcosData?.length > 0 && !barcoSeleccionado) {
        setBarcoSeleccionado(barcosData[0])
        cargarBodegas(barcosData[0])
        await cargarRegistros(barcosData[0].id)
        await cargarDescargas(barcosData[0].id)
        await cargarOperacionInfo(barcosData[0].id)
        setShowShipSelector(false)
      } else if (barcosData?.length === 0) {
        toast.error('No hay barcos disponibles')
      }
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const cargarDescargas = async (barcoId) => {
    try {
      const { data: activas } = await supabase.from('registro_descarga')
        .select(`*, tipo_descarga:tipos_descarga(*)`)
        .eq('barco_id', barcoId).is('fecha_hora_fin', null)
        .order('fecha_hora_inicio', { ascending: false })
      setDescargasActivas(activas || [])
      const { data: historial } = await supabase.from('registro_descarga')
        .select(`*, tipo_descarga:tipos_descarga(*), usuario:created_by(id, nombre, username)`)
        .eq('barco_id', barcoId).not('fecha_hora_fin', 'is', null)
        .order('fecha_hora_inicio', { ascending: false }).limit(10)
      setHistorialDescargas(historial || [])
    } catch (error) {
      toast.error('Error al cargar tipos de descarga')
    }
  }

  const cargarOperacionInfo = async (barcoId) => {
    try {
      const { data } = await supabase.from('barcos')
        .select('tiempo_arribo, tiempo_ataque, tiempo_recibido, tiempo_arribo_editado, tiempo_ataque_editado, tiempo_recibido_editado, operacion_iniciada_at, operacion_finalizada_at, operacion_iniciada_por, operacion_finalizada_por, operacion_motivo_finalizacion, operacion_iniciada_editado, operacion_finalizada_editado')
        .eq('id', barcoId).single()
      if (data) setOperacionInfo(data)
    } catch (error) {
      console.error('Error cargando info de operación:', error)
    }
  }

  const handleIniciarOperacion = async () => {
    if (!barcoSeleccionado || !user) return
    try {
      const { error } = await supabase.from('barcos').update({
        operacion_iniciada_at: new Date().toISOString(),
        operacion_iniciada_por: user.id,
        operacion_iniciada_editado: false,
        estado: 'activo'
      }).eq('id', barcoSeleccionado.id)
      if (error) throw error
      toast.success('Operación iniciada')
      setShowIniciarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id)
      await cargarDatos()
    } catch (error) {
      toast.error('Error al iniciar la operación')
    }
  }

  const handleFinalizarOperacion = async (motivo) => {
    if (!barcoSeleccionado || !user) return
    try {
      const { error } = await supabase.from('barcos').update({
        operacion_finalizada_at: new Date().toISOString(),
        operacion_finalizada_por: user.id,
        operacion_motivo_finalizacion: motivo || null,
        operacion_finalizada_editado: false,
        estado: 'finalizado'
      }).eq('id', barcoSeleccionado.id)
      if (error) throw error
      toast.success('Operación finalizada')
      setShowFinalizarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id)
      await cargarDatos()
    } catch (error) {
      toast.error('Error al finalizar la operación')
    }
  }

  const cargarBodegas = (barco) => setBodegasBarco(barco.bodegas_json || [])

  const cargarRegistros = async (barcoId) => {
    try {
      const { data } = await supabase.from('registro_atrasos')
        .select(`*, tipo_paro:tipos_paro(*)`)
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      setRegistros(data || [])
    } catch (error) {
      toast.error('Error al cargar registros')
    }
  }

  const handleSeleccionarBarco = async (barco) => {
    setBarcoSeleccionado(barco)
    cargarBodegas(barco)
    await cargarRegistros(barco.id)
    await cargarDescargas(barco.id)
    await cargarOperacionInfo(barco.id)
    setShowShipSelector(false)
  }

  const handleNuevoAtraso = () => {
    if (barcoSeleccionado?.estado === 'finalizado') { toast.error('La operación está finalizada'); return }
    if (!operacionInfo?.operacion_iniciada_at) { toast.error('Inicia la operación primero'); return }
    setAtrasoEditando(null)
    setShowAtrasoModal(true)
  }

  const handleEditarAtraso = (atraso) => {
    if (barcoSeleccionado?.estado === 'finalizado') { toast.error('La operación está finalizada'); return }
    setAtrasoEditando(atraso)
    setShowAtrasoModal(true)
  }

  const handleEliminarAtraso = async (id) => {
    if (barcoSeleccionado?.estado === 'finalizado') { toast.error('La operación está finalizada'); return }
    if (!confirm('¿Eliminar este registro?')) return
    try {
      const { error } = await supabase.from('registro_atrasos').delete().eq('id', id)
      if (error) throw error
      toast.success('Registro eliminado')
      await cargarRegistros(barcoSeleccionado.id)
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleGuardarAtraso = async () => {
    setShowAtrasoModal(false)
    await cargarRegistros(barcoSeleccionado.id)
  }

  const handleConfirmarFinalizarDescarga = async () => {
    if (!descargaSeleccionada) return
    try {
      const { error } = await supabase.from('registro_descarga')
        .update({ fecha_hora_fin: new Date().toISOString() })
        .eq('id', descargaSeleccionada.id)
      if (error) throw error
      toast.success('Descarga finalizada')
      setShowFinalizarDescargaModal(false)
      setDescargaSeleccionada(null)
      await cargarDescargas(barcoSeleccionado.id)
    } catch (error) {
      toast.error('Error al finalizar descarga')
    }
  }

  const barcosFiltrados = barcos.filter(b => b.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  const registrosFiltrados = registros.filter(r => r.fecha === filtroFecha)
  const formatFechaHora = (ts) => ts ? dayjs(ts).format('DD/MM/YY HH:mm') : '—'

  const puedeRegistrar = barcoSeleccionado?.estado === 'activo'
    && !!operacionInfo?.operacion_iniciada_at
    && !operacionInfo?.operacion_finalizada_at

  const estadoOperacion = !barcoSeleccionado ? null
    : barcoSeleccionado.estado === 'finalizado' ? 'finalizado'
    : operacionInfo?.operacion_iniciada_at ? 'en_curso'
    : 'pendiente'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-3">

        {/* ── HEADER ── */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isAdmin() && (
                <button onClick={() => router.push('/admin')}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-lg flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black flex items-center gap-2">
                  <Clock className="w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0" />
                  Control de Atrasos
                </h1>
                <p className="text-orange-200 text-xs mt-0.5 truncate">
                  {user?.nombre} · {user?.rol === 'admin' ? 'Admin' : 'Chequero'}
                </p>
              </div>
            </div>
            {/* Tabs de vista */}
            <div className="flex gap-1 bg-black/20 rounded-xl p-1 flex-shrink-0">
              <button onClick={() => setVista('lista')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  vista === 'lista' ? 'bg-white text-orange-600' : 'text-white hover:bg-white/10'
                }`}>
                📋 <span className="hidden sm:inline">Lista</span>
              </button>
              <button onClick={() => barcoSeleccionado ? setVista('dashboard') : toast.error('Selecciona un barco')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  vista === 'dashboard' ? 'bg-white text-orange-600' : 'text-white hover:bg-white/10'
                }`}>
                📊 <span className="hidden sm:inline">Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── SELECTOR DE BARCO ── */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
          <button onClick={() => setShowShipSelector(!showShipSelector)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-orange-500/20 p-2 rounded-lg flex-shrink-0">
                <Ship className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate">
                  {barcoSeleccionado ? barcoSeleccionado.nombre : 'Seleccionar barco'}
                </p>
                {barcoSeleccionado && (
                  <p className="text-[11px] text-slate-500">
                    {barcoSeleccionado.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                    {' · '}
                    <span className={barcoSeleccionado.estado === 'activo' ? 'text-green-400' : 'text-red-400'}>
                      {barcoSeleccionado.estado}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${showShipSelector ? 'rotate-180' : ''}`} />
          </button>

          {showShipSelector && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar barco..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {barcosFiltrados.length > 0 ? barcosFiltrados.map(b => (
                  <button key={b.id} onClick={() => handleSeleccionarBarco(b)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      barcoSeleccionado?.id === b.id
                        ? 'border-orange-500/60 bg-orange-500/10'
                        : 'border-white/10 bg-slate-800 hover:border-white/20'
                    }`}>
                    <div>
                      <p className="font-semibold text-white text-sm">{b.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500">
                          {b.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          b.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {b.estado}
                        </span>
                      </div>
                    </div>
                    {barcoSeleccionado?.id === b.id && (
                      <CheckCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    )}
                  </button>
                )) : (
                  <p className="text-center py-6 text-slate-500 text-sm">No se encontraron barcos</p>
                )}
              </div>
            </div>
          )}
        </div>

        {barcoSeleccionado && (
          <>
            {/* ── PANEL ESTADO + TIEMPOS ── */}
            <div className={`rounded-2xl border overflow-hidden ${
              estadoOperacion === 'finalizado' ? 'border-red-500/20 bg-red-500/5'
              : estadoOperacion === 'en_curso' ? 'border-green-500/20 bg-green-500/5'
              : 'border-yellow-500/20 bg-yellow-500/5'
            }`}>
              {/* Fila de estado */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      estadoOperacion === 'finalizado' ? 'bg-red-500/20'
                      : estadoOperacion === 'en_curso' ? 'bg-green-500/20'
                      : 'bg-yellow-500/20'
                    }`}>
                      <Flag className={`w-4 h-4 ${
                        estadoOperacion === 'finalizado' ? 'text-red-400'
                        : estadoOperacion === 'en_curso' ? 'text-green-400'
                        : 'text-yellow-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Estado</p>
                      {estadoOperacion === 'pendiente' && (
                        <p className="text-yellow-400 text-sm font-semibold">⏳ Pendiente de inicio</p>
                      )}
                      {estadoOperacion === 'en_curso' && (
                        <div>
                          <p className="text-green-400 text-sm font-semibold">🟢 En curso</p>
                          <p className="text-xs text-slate-500">Inicio: {formatFechaHora(operacionInfo?.operacion_iniciada_at)}</p>
                        </div>
                      )}
                      {estadoOperacion === 'finalizado' && (
                        <div>
                          <p className="text-red-400 text-sm font-semibold">🔴 Finalizada</p>
                          <p className="text-xs text-slate-500">
                            {formatFechaHora(operacionInfo?.operacion_iniciada_at)} → {formatFechaHora(operacionInfo?.operacion_finalizada_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {estadoOperacion === 'pendiente' && (
                    <button onClick={() => setShowIniciarModal(true)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
                      <Play className="w-4 h-4" /> Iniciar
                    </button>
                  )}
                  {estadoOperacion === 'en_curso' && (
                    <button onClick={() => setShowFinalizarModal(true)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all">
                      <StopCircle className="w-4 h-4" /> Finalizar
                    </button>
                  )}
                </div>
              </div>

              {/* Tiempos */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Tiempos de operación
                  </p>
                  <button onClick={() => setShowEditarTiemposModal(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                    <Edit className="w-3 h-3" /> Editar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'tiempo_arribo', label: 'Arribo', icon: <Anchor className="w-3.5 h-3.5 text-blue-400" />, editado: operacionInfo?.tiempo_arribo_editado },
                    { key: 'tiempo_ataque', label: 'Ataque', icon: <Target className="w-3.5 h-3.5 text-yellow-400" />, editado: operacionInfo?.tiempo_ataque_editado },
                    { key: 'tiempo_recibido', label: 'Recibido', icon: <Inbox className="w-3.5 h-3.5 text-green-400" />, editado: operacionInfo?.tiempo_recibido_editado },
                  ].map(({ key, label, icon, editado }) => (
                    <div key={key} className="bg-slate-800/60 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {icon}
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
                        {editado && (
                          <span className="ml-auto text-[8px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">Ed.</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white leading-tight">
                        {operacionInfo?.[key] ? dayjs(operacionInfo[key]).format('DD/MM HH:mm') : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── TIPO DE DESCARGA ── */}
            <div className="bg-slate-900 rounded-2xl border border-blue-500/20 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg">
                    <Package className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="font-bold text-white text-sm">Tipo de Descarga</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowHistorialDescargaModal(true)}
                    className="text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                    <History className="w-3 h-3" /> Historial
                  </button>
                  <button onClick={() => setShowDescargaModal(true)} disabled={!puedeRegistrar}
                    className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all font-bold ${
                      puedeRegistrar
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}>
                    <Plus className="w-3 h-3" /> Nuevo
                  </button>
                </div>
              </div>

              <div className="p-4">
                {descargasActivas.length > 0 ? (
                  <div className="space-y-2">
                    {descargasActivas.map(descarga => (
                      <div key={descarga.id}
                        className="flex items-center justify-between gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0">{descarga.tipo_descarga?.icono || '📦'}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{descarga.tipo_descarga?.nombre}</p>
                            <p className="text-xs text-slate-500">
                              Desde {dayjs(descarga.fecha_hora_inicio).format('HH:mm')} · {dayjs(descarga.fecha_hora_inicio).format('DD/MM')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setDescargaSeleccionada(descarga); setShowFinalizarDescargaModal(true) }}
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs flex-shrink-0 transition-all">
                          <StopCircle className="w-3.5 h-3.5" /> Finalizar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-blue-500/20 rounded-xl">
                    <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm mb-3">Sin descarga activa</p>
                    {puedeRegistrar && (
                      <button onClick={() => setShowDescargaModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs inline-flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Registrar
                      </button>
                    )}
                  </div>
                )}

                {historialDescargas.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2 font-bold">Últimas finalizadas</p>
                    <div className="space-y-1.5">
                      {historialDescargas.slice(0, 2).map(desc => (
                        <div key={desc.id}
                          className="flex items-center justify-between text-xs bg-slate-800/40 px-3 py-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span>{desc.tipo_descarga?.icono}</span>
                            <span className="text-slate-400 truncate max-w-[120px]">{desc.tipo_descarga?.nombre}</span>
                          </div>
                          <span className="text-slate-600 text-[10px]">
                            {dayjs(desc.fecha_hora_inicio).format('HH:mm')} → {dayjs(desc.fecha_hora_fin).format('HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                    {historialDescargas.length > 2 && (
                      <button onClick={() => setShowHistorialDescargaModal(true)}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300">
                        Ver todos ({historialDescargas.length}) →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── LISTA DE REGISTROS / DASHBOARD ── */}
            {vista === 'lista' ? (
              <div className="space-y-3">
                {/* Toolbar */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button onClick={handleNuevoAtraso} disabled={!puedeRegistrar}
                        className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all ${
                          puedeRegistrar
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}>
                        <Plus className="w-4 h-4" />
                        Nuevo Atraso
                      </button>
                      <button onClick={() => cargarRegistros(barcoSeleccionado.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-2.5 rounded-xl transition-all"
                        title="Actualizar">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                    </div>
                  </div>
                  {estadoOperacion === 'pendiente' && (
                    <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Inicia la operación para registrar atrasos
                    </p>
                  )}
                  {estadoOperacion === 'finalizado' && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Operación finalizada — solo lectura
                    </p>
                  )}
                </div>

                {/* Grid de registros */}
                <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-400" />
                      {dayjs(filtroFecha).format('DD [de] MMMM, YYYY')}
                    </h3>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-bold">
                      {registrosFiltrados.length} registros
                    </span>
                  </div>
                  <div className="p-4">
                    {registrosFiltrados.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {registrosFiltrados.map(reg => (
                          <RegistroCard key={reg.id} reg={reg} tiposParo={tiposParo}
                            bodegasBarco={bodegasBarco}
                            onEditar={handleEditarAtraso} onEliminar={handleEliminarAtraso} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-14 text-center">
                        <Clock className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-400 mb-1">Sin registros para esta fecha</p>
                        {puedeRegistrar && (
                          <button onClick={handleNuevoAtraso}
                            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Registrar primer atraso
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <DashboardAtrasos barco={barcoSeleccionado} registros={registros}
                tiposParo={tiposParo} onClose={() => setVista('lista')} />
            )}
          </>
        )}

        {/* Sin barco */}
        {!barcoSeleccionado && !loading && (
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-12 text-center">
            <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Sin barco seleccionado</h3>
            <p className="text-slate-400 text-sm">Selecciona un barco para comenzar</p>
          </div>
        )}
      </div>

      {/* FAB mobile */}
      {puedeRegistrar && vista === 'lista' && (
        <button onClick={handleNuevoAtraso}
          className="sm:hidden fixed bottom-6 right-4 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white w-14 h-14 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-center active:scale-95 transition-transform">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* MODALES */}
      {showAtrasoModal && barcoSeleccionado && (
        <AtrasoModal barco={barcoSeleccionado} atraso={atrasoEditando} tiposParo={tiposParo}
          bodegasBarco={bodegasBarco} onClose={() => setShowAtrasoModal(false)} onSave={handleGuardarAtraso} />
      )}
      {showDescargaModal && barcoSeleccionado && (
        <RegistroDescargaModal barco={barcoSeleccionado} tiposDescarga={tiposDescarga}
          descargaActual={descargasActivas[0]}
          onClose={() => setShowDescargaModal(false)}
          onSave={() => cargarDescargas(barcoSeleccionado.id)} />
      )}
      {showFinalizarDescargaModal && descargaSeleccionada && (
        <FinalizarDescargaModal descarga={descargaSeleccionada}
          onClose={() => { setShowFinalizarDescargaModal(false); setDescargaSeleccionada(null) }}
          onConfirm={handleConfirmarFinalizarDescarga} />
      )}
      {showHistorialDescargaModal && barcoSeleccionado && (
        <HistorialDescargaModal barco={barcoSeleccionado} onClose={() => setShowHistorialDescargaModal(false)} />
      )}
      {showIniciarModal && barcoSeleccionado && (
        <IniciarOperacionModal barco={barcoSeleccionado} onClose={() => setShowIniciarModal(false)}
          onConfirm={handleIniciarOperacion} />
      )}
      {showFinalizarModal && barcoSeleccionado && (
        <FinalizarOperacionModal barco={barcoSeleccionado} onClose={() => setShowFinalizarModal(false)}
          onConfirm={handleFinalizarOperacion} />
      )}
      {showEditarTiemposModal && barcoSeleccionado && (
        <EditarTiemposModal barco={barcoSeleccionado} onClose={() => setShowEditarTiemposModal(false)}
          onSave={() => cargarOperacionInfo(barcoSeleccionado.id)} />
      )}
    </div>
  )
}