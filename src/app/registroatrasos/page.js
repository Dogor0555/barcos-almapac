// app/registroatrasos/page.js - Módulo de atrasos con tarjetas mejoradas
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isAdmin, isChequero } from '../lib/auth'
import { 
  Clock, AlertCircle, Ship, Calendar, User, Save, X, 
  Plus, Trash2, Edit2, RefreshCw, Search, 
  BarChart3, Download, Eye, Layers,
  Coffee, CloudRain, Wrench, Truck, Zap, AlertTriangle,
  ArrowLeft, Play, Pause, StopCircle, CheckCircle,
  Filter, ChevronDown, ChevronUp, Info, ChevronRight,
  Flag, Power, PowerOff, Anchor, Target, Inbox, Edit,
  Package, History, MapPin, Grid, Box
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO CON COLORES E ICONOS
// =====================================================
const TIPOS_PARO_CONFIG = {
  'Desperfecto de grua del buque': { color: 'red', icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'Colocando almeja UPDP': { color: 'orange', icono: <Wrench className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'Falta de camiones (Unidades insuficientes por transportistas)': { color: 'yellow', icono: <Truck className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  'Traslado de UCA a Almapac': { color: 'blue', icono: <Truck className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'Falla sistema UPDP': { color: 'purple', icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Tiempo de comida': { color: 'green', icono: <Coffee className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  'Cierre de bodegas': { color: 'gray', icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  'Amenaza de lluvia': { color: 'sky', icono: <CloudRain className="w-4 h-4" />, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'Lluvia': { color: 'indigo', icono: <CloudRain className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'Esperando apertura de bodegas': { color: 'amber', icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'Apertura de bodegas': { color: 'emerald', icono: <Layers className="w-4 h-4" />, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'Traslado de UCA a Alcasa': { color: 'cyan', icono: <Truck className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'Mantenimiento almeja UPDP': { color: 'rose', icono: <Wrench className="w-4 h-4" />, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  'Sacando equipo abordo': { color: 'pink', icono: <Wrench className="w-4 h-4" />, bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'Movimiento de UCA': { color: 'teal', icono: <Truck className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  'Movilizando tolvas': { color: 'lime', icono: <Wrench className="w-4 h-4" />, bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/20' },
  'Falta de Tolveros': { color: 'stone', icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20' },
  'Quitando Almeja UPDP': { color: 'violet', icono: <Wrench className="w-4 h-4" />, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  'Colocando equipo abordo': { color: 'fuchsia', icono: <Wrench className="w-4 h-4" />, bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  'Acumulado producto': { color: 'slate', icono: <BarChart3 className="w-4 h-4" />, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  'Falla en sistema UPDP': { color: 'purple', icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'Falla en el sistema ALMAPAC': { color: 'yellow', icono: <Zap className="w-4 h-4" />, bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', imputable: true },
  'Esperando señal de Almapac': { color: 'amber', icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', imputable: true },
}

// =====================================================
// MODAL PARA REGISTRAR TIPO DE DESCARGA
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

      if (!formData.tipo_descarga_id) {
        toast.error('Selecciona un tipo de descarga')
        return
      }

      // Si hay una descarga activa, la finalizamos primero
      if (descargaActual && !descargaActual.fecha_hora_fin) {
        const { error: finalizarError } = await supabase
          .from('registro_descarga')
          .update({
            fecha_hora_fin: new Date().toISOString()
          })
          .eq('id', descargaActual.id)

        if (finalizarError) throw finalizarError
      }

      // Creamos la nueva descarga
      const { error } = await supabase
        .from('registro_descarga')
        .insert([{
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
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Registrar Tipo de Descarga</h2>
              <p className="text-blue-200 text-sm">{barco.nombre}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Descarga */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Tipo de Descarga <span className="text-red-400">*</span>
            </label>
            <select
              name="tipo_descarga_id"
              value={formData.tipo_descarga_id}
              onChange={handleChange}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
              required
            >
              <option value="">Seleccionar tipo</option>
              {tiposDescarga.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.icono} {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y Hora de Inicio */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Fecha y Hora de Inicio
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                name="fecha_hora_inicio"
                value={formData.fecha_hora_inicio}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ 
                  ...prev, 
                  fecha_hora_inicio: dayjs().format('YYYY-MM-DDTHH:mm') 
                }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-base"
              placeholder="Detalles adicionales..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Registrar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA VER HISTORIAL DE DESCARGAS
// =====================================================
const HistorialDescargaModal = ({ barco, onClose }) => {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarHistorial()
  }, [barco])

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('registro_descarga')
        .select(`
          *,
          tipo_descarga:tipos_descarga(id, nombre, icono, color),
          usuario:created_by(id, nombre, username)
        `)
        .eq('barco_id', barco.id)
        .order('fecha_hora_inicio', { ascending: false })

      if (error) throw error
      setHistorial(data || [])
    } catch (error) {
      console.error('Error cargando historial:', error)
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <History className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Historial de Tipos de Descarga</h2>
              <p className="text-purple-200 text-sm">{barco.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          ) : historial.length === 0 ? (
            <div className="bg-slate-900 rounded-xl p-12 text-center">
              <History className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sin registros</h3>
              <p className="text-slate-400">No hay tipos de descarga registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map(reg => (
                <div
                  key={reg.id}
                  className="bg-slate-900 rounded-xl p-4 border border-white/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${reg.tipo_descarga?.color || 'blue'}-500/20`}>
                        <span className="text-2xl">{reg.tipo_descarga?.icono || '📦'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-white">{reg.tipo_descarga?.nombre}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-slate-500">
                            Inicio: {dayjs(reg.fecha_hora_inicio).format('DD/MM/YYYY HH:mm')}
                          </span>
                          {reg.fecha_hora_fin && (
                            <>
                              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                              <span className="text-slate-500">
                                Fin: {dayjs(reg.fecha_hora_fin).format('DD/MM/YYYY HH:mm')}
                              </span>
                            </>
                          )}
                        </div>
                        {reg.observaciones && (
                          <p className="text-xs text-slate-400 mt-2">{reg.observaciones}</p>
                        )}
                      </div>
                    </div>
                    {!reg.fecha_hora_fin && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs text-slate-500">
                    <span>Registrado por: {reg.usuario?.nombre || 'Sistema'}</span>
                    {reg.fecha_hora_fin && reg.fecha_hora_inicio && (
                      <span>
                        Duración: {dayjs(reg.fecha_hora_fin).diff(dayjs(reg.fecha_hora_inicio), 'hour')}h{' '}
                        {dayjs(reg.fecha_hora_fin).diff(dayjs(reg.fecha_hora_inicio), 'minute') % 60}m
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA FINALIZAR TIPO DE DESCARGA
// =====================================================
const FinalizarDescargaModal = ({ descarga, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <StopCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Finalizar Descarga</h2>
              <p className="text-yellow-200 text-sm">{descarga.tipo_descarga?.nombre}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-white mb-4">
            ¿Estás seguro de que deseas <span className="font-bold text-yellow-400">FINALIZAR</span> este tipo de descarga?
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Iniciado: {dayjs(descarga.fecha_hora_inicio).format('DD/MM/YYYY HH:mm')}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <StopCircle className="w-5 h-5" />
              )}
              Finalizar Ahora
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA EDITAR TIEMPOS DE OPERACIÓN
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

  const setHoraActual = (campo) => {
    const ahora = dayjs().format('YYYY-MM-DDTHH:mm')
    setTiempos(prev => ({ ...prev, [campo]: ahora }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updates = {}
      
      if (tiempos.tiempo_arribo) {
        updates.tiempo_arribo = new Date(tiempos.tiempo_arribo).toISOString()
        updates.tiempo_arribo_editado = true
      }
      if (tiempos.tiempo_ataque) {
        updates.tiempo_ataque = new Date(tiempos.tiempo_ataque).toISOString()
        updates.tiempo_ataque_editado = true
      }
      if (tiempos.tiempo_recibido) {
        updates.tiempo_recibido = new Date(tiempos.tiempo_recibido).toISOString()
        updates.tiempo_recibido_editado = true
      }
      
      if (tiempos.operacion_iniciada_at) {
        updates.operacion_iniciada_at = new Date(tiempos.operacion_iniciada_at).toISOString()
        updates.operacion_iniciada_editado = true
      }
      if (tiempos.operacion_finalizada_at) {
        updates.operacion_finalizada_at = new Date(tiempos.operacion_finalizada_at).toISOString()
        updates.operacion_finalizada_editado = true
      }

      if (tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at) {
        toast.error('No se puede finalizar sin haber iniciado')
        setLoading(false)
        return
      }

      if (tiempos.operacion_finalizada_at) {
        updates.estado = 'finalizado'
      } else if (tiempos.operacion_iniciada_at) {
        updates.estado = 'activo'
      }

      const { error } = await supabase
        .from('barcos')
        .update(updates)
        .eq('id', barco.id)

      if (error) throw error

      toast.success('Tiempos actualizados correctamente')
      onSave()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar tiempos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Editar Tiempos de Operación</h2>
              <p className="text-blue-200 text-sm">{barco.nombre}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-white/10 pb-2">Tiempos de Operación</h3>
            
            <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Anchor className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-bold text-white">Arribo</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="tiempo_arribo"
                      value={tiempos.tiempo_arribo}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setHoraActual('tiempo_arribo')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Target className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="font-bold text-white">Ataque</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="tiempo_ataque"
                      value={tiempos.tiempo_ataque}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setHoraActual('tiempo_ataque')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-400"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Inbox className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-bold text-white">Recibido</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="tiempo_recibido"
                      value={tiempos.tiempo_recibido}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setHoraActual('tiempo_recibido')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-lg font-bold text-white">Inicio / Fin de Operación</h3>
            
            <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Play className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-bold text-white">Inicio de Operación</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="operacion_iniciada_at"
                      value={tiempos.operacion_iniciada_at}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setHoraActual('operacion_iniciada_at')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-red-500/20 p-2 rounded-lg">
                  <StopCircle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-bold text-white">Fin de Operación</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="operacion_finalizada_at"
                      value={tiempos.operacion_finalizada_at}
                      onChange={handleChange}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setHoraActual('operacion_finalizada_at')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at && (
                <p className="text-xs text-red-400 mt-2">
                  ⚠️ No se puede tener fin sin inicio
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-6 sticky bottom-0 bg-[#0f172a] pb-2">
            <button
              type="submit"
              disabled={loading || (tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Guardar Cambios
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA INICIAR OPERACIÓN
// =====================================================
const IniciarOperacionModal = ({ barco, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Iniciar Operación</h2>
              <p className="text-green-200 text-sm">{barco.nombre}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-white mb-6">
            ¿Estás seguro de que deseas <span className="font-bold text-green-400">INICIAR</span> la operación?
          </p>
          <p className="text-sm text-slate-400 mb-6">
            Al iniciar, se registrará la hora actual como comienzo de la operación y se habilitará el registro de atrasos.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              Iniciar Ahora
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA FINALIZAR OPERACIÓN
// =====================================================
const FinalizarOperacionModal = ({ barco, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)
  const [motivo, setMotivo] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(motivo)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <StopCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Finalizar Operación</h2>
              <p className="text-red-200 text-sm">{barco.nombre}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-white mb-4">
            ¿Estás seguro de que deseas <span className="font-bold text-red-400">FINALIZAR</span> la operación?
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Al finalizar, se registrará la hora actual como fin de la operación. No se podrán registrar más atrasos.
          </p>

          <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-2">Motivo de finalización (opcional)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
              placeholder="Ej: Operación completada, cambio de turno, etc."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <StopCircle className="w-5 h-5" />
              )}
              Finalizar Ahora
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA REGISTRAR/EDITAR ATRASO
// =====================================================
const AtrasoModal = ({ barco, atraso, tiposParo, bodegasBarco, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    tipo_paro_id: atraso?.tipo_paro_id || '',
    fecha: atraso?.fecha || dayjs().format('YYYY-MM-DD'),
    hora_inicio: atraso?.hora_inicio?.slice(0, 5) || '',
    hora_fin: atraso?.hora_fin?.slice(0, 5) || '',
    bodega_id: atraso?.bodega_id || '',
    es_general: atraso?.es_general || false,
    observaciones: atraso?.observaciones || ''
  })
  const [enCurso, setEnCurso] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)

  useEffect(() => {
    if (atraso) {
      const tipo = tiposParo.find(t => t.id === atraso.tipo_paro_id)
      setTipoSeleccionado(tipo)
      setPaso(2)
    }
  }, [atraso, tiposParo])

  useEffect(() => {
    let interval
    if (enCurso) {
      interval = setInterval(() => setTiempoTranscurrido(prev => prev + 1), 60000)
    }
    return () => clearInterval(interval)
  }, [enCurso])

  const iniciarAhora = () => {
    setFormData(prev => ({ ...prev, hora_inicio: dayjs().format('HH:mm') }))
    setEnCurso(true)
  }

  const finalizarAhora = () => {
    setFormData(prev => ({ ...prev, hora_fin: dayjs().format('HH:mm') }))
    setEnCurso(false)
  }

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
    let minI = hI * 60 + mI
    let minF = hF * 60 + mF
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
      let result = atraso
        ? await supabase.from('registro_atrasos').update(datos).eq('id', atraso.id)
        : await supabase.from('registro_atrasos').insert([datos])
      if (result.error) throw result.error
      toast.success(atraso ? 'Atraso actualizado' : 'Atraso registrado')
      onSave()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {atraso ? 'Editar Atraso' : 'Nuevo Atraso'}
                </h2>
                <p className="text-orange-200 text-xs sm:text-sm">{barco.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all active:scale-95">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <div className={`flex-1 h-1.5 rounded-full ${paso >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${paso >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          <div className="flex justify-between text-[11px] text-white/70 mt-1">
            <span>1. Tipo de paro</span>
            <span>2. Datos</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {paso === 1 ? (
            <div className="space-y-3">
              <p className="text-white font-bold text-sm">¿Qué tipo de paro deseas registrar?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tiposParo.map(tipo => {
                  const config = TIPOS_PARO_CONFIG[tipo.nombre] || { bg: 'bg-gray-500/10', icono: <AlertTriangle className="w-4 h-4 text-gray-400" /> }
                  return (
                    <button
                      key={tipo.id}
                      onClick={() => seleccionarTipo(tipo)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                        tipo.es_imputable_almapac
                          ? 'border-yellow-500/40 bg-yellow-500/5 active:border-yellow-500'
                          : 'border-white/10 bg-slate-900 active:border-orange-500/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                          {config.icono}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm leading-tight">{tipo.nombre}</p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {tipo.es_general && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">GENERAL</span>
                            )}
                            {tipo.es_imputable_almapac && (
                              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">ALMAPAC</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <button type="button" onClick={() => { setPaso(1); setTipoSeleccionado(null) }}
                className="text-sm text-orange-400 active:text-orange-300 flex items-center gap-1">
                ← Volver a tipos
              </button>

              <div className="bg-slate-900 rounded-xl p-3.5 border border-orange-500/20">
                <p className="text-[11px] text-slate-500 mb-1 uppercase tracking-wide">Tipo seleccionado</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {tipoSeleccionado && TIPOS_PARO_CONFIG[tipoSeleccionado.nombre]?.icono}
                  <span className="font-bold text-white text-sm">{tipoSeleccionado?.nombre}</span>
                  {tipoSeleccionado?.es_general && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">GENERAL</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base min-w-0"
                      required
                    />
                    <button
                      type="button"
                      onClick={iniciarAhora}
                      className="px-3 py-3 bg-green-500/20 active:bg-green-500/40 text-green-400 rounded-xl flex items-center gap-1.5 text-sm font-bold flex-shrink-0"
                    >
                      <Play className="w-4 h-4" />
                      <span className="hidden sm:inline">Ahora</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base min-w-0"
                    />
                    <button
                      type="button"
                      onClick={finalizarAhora}
                      className="px-3 py-3 bg-red-500/20 active:bg-red-500/40 text-red-400 rounded-xl flex items-center gap-1.5 text-sm font-bold flex-shrink-0"
                    >
                      <StopCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Ahora</span>
                    </button>
                  </div>
                </div>
              </div>

              {enCurso && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                  <div className="animate-pulse w-2.5 h-2.5 bg-blue-400 rounded-full flex-shrink-0" />
                  <p className="text-blue-400 text-sm">
                    En curso · {Math.floor(tiempoTranscurrido / 60)}h {tiempoTranscurrido % 60}m
                  </p>
                </div>
              )}

              {!tipoSeleccionado?.es_general && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-xl border border-white/10 active:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.es_general}
                      onChange={(e) => setFormData({ ...formData, es_general: e.target.checked, bodega_id: '' })}
                      className="w-5 h-5 rounded border-white/10 bg-slate-800 text-orange-500 accent-orange-500"
                    />
                    <span className="text-sm text-slate-300">Aplica a todo el barco</span>
                  </label>

                  {!formData.es_general && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-medium">Bodega</label>
                      <select
                        value={formData.bodega_id}
                        onChange={(e) => setFormData({ ...formData, bodega_id: e.target.value })}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-base"
                      >
                        <option value="">Seleccionar bodega</option>
                        {bodegasBarco.map(b => (
                          <option key={b.id} value={b.id}>{b.nombre} ({b.codigo})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="2"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-base"
                  placeholder="Detalles adicionales (opcional)"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 active:from-orange-600 active:to-red-700 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle className="w-5 h-5" />
                  }
                  {atraso ? 'Actualizar' : 'Guardar Registro'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="sm:flex-1 bg-slate-800 active:bg-slate-700 text-white font-bold py-4 px-4 rounded-xl transition-all text-base"
                >
                  Cancelar
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
    const fechaReg = dayjs(r.fecha)
    const hoy = dayjs()
    if (periodo === 'dia') return fechaReg.isSame(hoy, 'day')
    if (periodo === 'semana') return fechaReg.isAfter(hoy.subtract(7, 'day'))
    if (periodo === 'mes') return fechaReg.isAfter(hoy.subtract(30, 'day'))
    return true
  })

  const totales = tiposParo.map(tipo => {
    const registrosTipo = registrosFiltrados.filter(r => r.tipo_paro_id === tipo.id)
    const totalMinutos = registrosTipo.reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
    return {
      ...tipo,
      registros: registrosTipo.length,
      totalMinutos,
      horas: Math.floor(totalMinutos / 60),
      minutos: totalMinutos % 60,
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
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-white">Dashboard · {barco.nombre}</h2>
                <p className="text-blue-200 text-xs">Análisis de paros</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 active:bg-white/30 p-2.5 rounded-xl">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
            {[
              { value: 'dia', label: 'Hoy' },
              { value: 'semana', label: '7 días' },
              { value: 'mes', label: '30 días' },
              { value: 'todo', label: 'Todo' }
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  periodo === p.value ? 'bg-white text-blue-600' : 'bg-white/10 active:bg-white/20 text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4">
              <p className="text-blue-200 text-[10px] uppercase tracking-wide">Tiempo total</p>
              <p className="text-2xl font-black text-white mt-1">
                {Math.floor(totalMinutosOperacion / 60)}h
                <span className="text-base font-bold"> {totalMinutosOperacion % 60}m</span>
              </p>
              <p className="text-blue-300 text-[10px] mt-0.5">Desde llegada</p>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-4">
              <p className="text-green-200 text-[10px] uppercase tracking-wide">Tiempo neto</p>
              <p className="text-2xl font-black text-white mt-1">
                {Math.floor(tiempoNeto / 60)}h
                <span className="text-base font-bold"> {tiempoNeto % 60}m</span>
              </p>
              <p className="text-green-300 text-[10px] mt-0.5">Sin paros</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-4">
              <p className="text-orange-200 text-[10px] uppercase tracking-wide">Total paros</p>
              <p className="text-2xl font-black text-white mt-1">
                {Math.floor(totalGeneral / 60)}h
                <span className="text-base font-bold"> {totalGeneral % 60}m</span>
              </p>
              <p className="text-orange-300 text-[10px] mt-0.5">{registrosFiltrados.length} registros</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-400" />
              Distribución de paros
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">No imputables a ALMAPAC</span>
                  <span className="text-red-400 font-bold">{Math.floor(totalNoImputable / 60)}h {totalNoImputable % 60}m</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: totalGeneral > 0 ? `${(totalNoImputable / totalGeneral) * 100}%` : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Imputables a ALMAPAC</span>
                  <span className="text-yellow-400 font-bold">{Math.floor(totalImputable / 60)}h {totalImputable % 60}m</span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: totalGeneral > 0 ? `${(totalImputable / totalGeneral) * 100}%` : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {noImputables.length > 0 && (
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-red-500/20">
              <div className="bg-red-500/20 px-4 py-3 border-b border-red-500/20">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  No imputables a ALMAPAC
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {noImputables.map(tipo => {
                  const config = tipo.config
                  const porcentaje = totalNoImputable > 0 ? (tipo.totalMinutos / totalNoImputable) * 100 : 0
                  return (
                    <div key={tipo.id}>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1 rounded flex-shrink-0 ${config.bg || 'bg-gray-500/10'}`}>
                            {config.icono || <AlertTriangle className="w-3 h-3" />}
                          </div>
                          <span className="text-white text-xs leading-tight">{tipo.nombre}</span>
                        </div>
                        <span className={`font-bold text-xs whitespace-nowrap flex-shrink-0 ${config.text || 'text-red-400'}`}>
                          {tipo.horas}h {tipo.minutos}m
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${porcentaje}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
                  <span className="text-white">TOTAL</span>
                  <span className="text-red-400">{Math.floor(totalNoImputable / 60)}h {totalNoImputable % 60}m</span>
                </div>
              </div>
            </div>
          )}

          {imputables.length > 0 && (
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-yellow-500/20">
              <div className="bg-yellow-500/20 px-4 py-3 border-b border-yellow-500/20">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Imputables a ALMAPAC
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {imputables.map(tipo => {
                  const config = tipo.config
                  const porcentaje = totalImputable > 0 ? (tipo.totalMinutos / totalImputable) * 100 : 0
                  return (
                    <div key={tipo.id}>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1 rounded flex-shrink-0 ${config.bg || 'bg-yellow-500/10'}`}>
                            {config.icono || <Zap className="w-3 h-3" />}
                          </div>
                          <span className="text-white text-xs leading-tight">{tipo.nombre}</span>
                        </div>
                        <span className={`font-bold text-xs whitespace-nowrap flex-shrink-0 ${config.text || 'text-yellow-400'}`}>
                          {tipo.horas}h {tipo.minutos}m
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500/60 rounded-full" style={{ width: `${porcentaje}%` }} />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
                  <span className="text-white">TOTAL</span>
                  <span className="text-yellow-400">{Math.floor(totalImputable / 60)}h {totalImputable % 60}m</span>
                </div>
              </div>
            </div>
          )}

          {registrosFiltrados.length === 0 && (
            <div className="bg-slate-900 rounded-xl p-10 text-center">
              <Clock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Sin registros</h3>
              <p className="text-slate-400 text-sm">No hay atrasos en este período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// TARJETA DE REGISTRO — VERSIÓN MEJORADA CON BODEGA DESTACADA
// =====================================================
const RegistroCard = ({ reg, tiposParo, bodegasBarco, onEditar, onEliminar }) => {
  const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || { 
    bg: 'bg-slate-800', 
    icono: <AlertTriangle className="w-5 h-5 text-slate-400" />,
    border: 'border-slate-700'
  }
  
  // Buscar la información de la bodega
  const bodegaInfo = !reg.es_general && reg.bodega_id 
    ? (reg.bodega_nombre 
        ? { nombre: reg.bodega_nombre, codigo: reg.bodega_codigo }
        : bodegasBarco.find(b => b.id === reg.bodega_id))
    : null

  // Determinar color de borde según si es general o tiene bodega
  const borderColor = reg.es_general 
    ? 'border-purple-500/30' 
    : bodegaInfo 
      ? 'border-blue-500/30' 
      : 'border-slate-700'

  return (
    <div className={`bg-slate-900 rounded-xl p-4 border-2 ${borderColor} hover:border-orange-500/50 transition-all shadow-lg`}>
      {/* Cabecera con tipo de paro e icono */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-3 rounded-xl ${config.bg} flex-shrink-0`}>
            <div className="text-2xl">{config.icono}</div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-base leading-tight">{tipo?.nombre || 'Desconocido'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">ID: {reg.id}</span>
              {tipo?.es_imputable_almapac && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                  ALMAPAC
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Acciones */}
        <div className="flex gap-1">
          <button
            onClick={() => onEditar(reg)}
            className="p-2 bg-blue-500/10 hover:bg-blue-500/30 rounded-lg transition-all"
            title="Editar registro"
          >
            <Edit2 className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => onEliminar(reg.id)}
            className="p-2 bg-red-500/10 hover:bg-red-500/30 rounded-lg transition-all"
            title="Eliminar registro"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Información de horario y duración */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Horario</p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-sm text-white">
              {reg.hora_inicio?.slice(0,5)}
            </span>
            {reg.hora_fin && (
              <>
                <span className="text-slate-600">→</span>
                <span className="font-mono text-sm text-white">
                  {reg.hora_fin?.slice(0,5)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-2">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Duración</p>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-orange-400" />
            {reg.duracion_minutos ? (
              <span className="font-bold text-orange-400">
                {Math.floor(reg.duracion_minutos/60)}h {reg.duracion_minutos%60}m
              </span>
            ) : (
              <span className="text-slate-500">En curso</span>
            )}
          </div>
        </div>
      </div>

      {/* UBICACIÓN - DESTACADA CON COLOR */}
      <div className={`mb-3 p-3 rounded-xl ${
        reg.es_general 
          ? 'bg-purple-500/10 border border-purple-500/20' 
          : bodegaInfo 
            ? 'bg-blue-500/10 border border-blue-500/20' 
            : 'bg-slate-800/50 border border-slate-700'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className={`w-4 h-4 ${
            reg.es_general ? 'text-purple-400' : bodegaInfo ? 'text-blue-400' : 'text-slate-500'
          }`} />
          <span className={`text-xs font-bold uppercase ${
            reg.es_general ? 'text-purple-400' : bodegaInfo ? 'text-blue-400' : 'text-slate-500'
          }`}>
            UBICACIÓN
          </span>
        </div>
        
        {reg.es_general ? (
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <span className="font-bold text-white">TODAS LAS BODEGAS</span>
          </div>
        ) : bodegaInfo ? (
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <Box className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-white text-base">{bodegaInfo.nombre}</p>
              {bodegaInfo.codigo && (
                <p className="text-xs text-blue-400 font-mono">{bodegaInfo.codigo}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Sin bodega específica</p>
        )}
      </div>

      {/* Observaciones si existen */}
      {reg.observaciones && (
        <div className="bg-slate-800/50 rounded-lg p-2 border-l-4 border-slate-600">
          <p className="text-xs text-slate-400 italic">"{reg.observaciones}"</p>
        </div>
      )}

      {/* Fecha del registro */}
      <div className="mt-2 text-right">
        <span className="text-[10px] text-slate-600">
          {dayjs(reg.fecha).format('DD/MM/YYYY')}
        </span>
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
  
  // Estados para control de operación
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
        .from('barcos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (barcosError) {
        console.error('Error cargando barcos:', barcosError)
        toast.error('Error al cargar barcos')
      }
      
      console.log('Barcos cargados:', barcosData)
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
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const cargarDescargas = async (barcoId) => {
    try {
      const { data: activas, error: activasError } = await supabase
        .from('registro_descarga')
        .select(`
          *,
          tipo_descarga:tipos_descarga(*)
        `)
        .eq('barco_id', barcoId)
        .is('fecha_hora_fin', null)
        .order('fecha_hora_inicio', { ascending: false })

      if (activasError) throw activasError
      setDescargasActivas(activas || [])

      const { data: historial, error: historialError } = await supabase
        .from('registro_descarga')
        .select(`
          *,
          tipo_descarga:tipos_descarga(*),
          usuario:created_by(id, nombre, username)
        `)
        .eq('barco_id', barcoId)
        .not('fecha_hora_fin', 'is', null)
        .order('fecha_hora_inicio', { ascending: false })
        .limit(10)

      if (historialError) throw historialError
      setHistorialDescargas(historial || [])

    } catch (error) {
      console.error('Error cargando descargas:', error)
      toast.error('Error al cargar tipos de descarga')
    }
  }

  const cargarOperacionInfo = async (barcoId) => {
    try {
      const { data, error } = await supabase
        .from('barcos')
        .select('tiempo_arribo, tiempo_ataque, tiempo_recibido, tiempo_arribo_editado, tiempo_ataque_editado, tiempo_recibido_editado, operacion_iniciada_at, operacion_finalizada_at, operacion_iniciada_por, operacion_finalizada_por, operacion_motivo_finalizacion, operacion_iniciada_editado, operacion_finalizada_editado')
        .eq('id', barcoId)
        .single()
      
      if (error) {
        console.error('Error cargando info de operación:', error)
        return
      }
      
      if (data) {
        console.log('Info de operación cargada:', data)
        setOperacionInfo(data)
      }
    } catch (error) {
      console.error('Error cargando info de operación:', error)
    }
  }

  const handleIniciarOperacion = async () => {
    if (!barcoSeleccionado || !user) return

    try {
      const { error } = await supabase
        .from('barcos')
        .update({
          operacion_iniciada_at: new Date().toISOString(),
          operacion_iniciada_por: user.id,
          operacion_iniciada_editado: false,
          estado: 'activo'
        })
        .eq('id', barcoSeleccionado.id)

      if (error) throw error

      toast.success('Operación iniciada correctamente')
      setShowIniciarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id)
      await cargarDatos()
    } catch (error) {
      console.error('Error iniciando operación:', error)
      toast.error('Error al iniciar la operación')
    }
  }

  const handleFinalizarOperacion = async (motivo) => {
    if (!barcoSeleccionado || !user) return

    try {
      const { error } = await supabase
        .from('barcos')
        .update({
          operacion_finalizada_at: new Date().toISOString(),
          operacion_finalizada_por: user.id,
          operacion_motivo_finalizacion: motivo || null,
          operacion_finalizada_editado: false,
          estado: 'finalizado'
        })
        .eq('id', barcoSeleccionado.id)

      if (error) throw error

      toast.success('Operación finalizada correctamente')
      setShowFinalizarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id)
      await cargarDatos()
    } catch (error) {
      console.error('Error finalizando operación:', error)
      toast.error('Error al finalizar la operación')
    }
  }

  const handleGuardarTiempos = async () => {
    await cargarOperacionInfo(barcoSeleccionado.id)
    toast.success('Tiempos actualizados')
  }

  const handleRegistrarDescarga = async () => {
    await cargarDescargas(barcoSeleccionado.id)
  }

  const handleFinalizarDescarga = async (descarga) => {
    setDescargaSeleccionada(descarga)
    setShowFinalizarDescargaModal(true)
  }

  const handleConfirmarFinalizarDescarga = async () => {
    if (!descargaSeleccionada) return

    try {
      const { error } = await supabase
        .from('registro_descarga')
        .update({
          fecha_hora_fin: new Date().toISOString()
        })
        .eq('id', descargaSeleccionada.id)

      if (error) throw error

      toast.success('Descarga finalizada')
      setShowFinalizarDescargaModal(false)
      setDescargaSeleccionada(null)
      await cargarDescargas(barcoSeleccionado.id)
    } catch (error) {
      console.error('Error finalizando descarga:', error)
      toast.error('Error al finalizar descarga')
    }
  }

  const cargarBodegas = (barco) => setBodegasBarco(barco.bodegas_json || [])

  const cargarRegistros = async (barcoId) => {
    try {
      const { data } = await supabase
        .from('registro_atrasos')
        .select(`
          *,
          tipo_paro:tipos_paro(*)
        `)
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      
      setRegistros(data || [])
    } catch (error) {
      console.error('Error:', error)
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
    if (barcoSeleccionado?.estado === 'finalizado') {
      toast.error('No se pueden registrar atrasos. La operación está finalizada.')
      return
    }
    setAtrasoEditando(null); 
    setShowAtrasoModal(true) 
  }
  
  const handleEditarAtraso = (atraso) => { 
    if (barcoSeleccionado?.estado === 'finalizado') {
      toast.error('No se pueden editar atrasos. La operación está finalizada.')
      return
    }
    setAtrasoEditando(atraso); 
    setShowAtrasoModal(true) 
  }

  const handleEliminarAtraso = async (id) => {
    if (barcoSeleccionado?.estado === 'finalizado') {
      toast.error('No se pueden eliminar atrasos. La operación está finalizada.')
      return
    }
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
    toast.success('Registros actualizados')
  }

  const barcosFiltrados = barcos.filter(b => b.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  const registrosFiltrados = registros.filter(r => r.fecha === filtroFecha)

  const formatFechaHora = (timestamp) => {
    if (!timestamp) return '—'
    return dayjs(timestamp).format('DD/MM/YYYY HH:mm')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4">

        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isAdmin() && (
                <button onClick={() => router.push('/admin')}
                  className="bg-white/10 active:bg-white/30 p-2 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
              )}
              <div>
                <h1 className="text-xl sm:text-3xl font-black flex items-center gap-2">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                  Control de Atrasos
                </h1>
                <p className="text-orange-200 text-xs sm:text-sm mt-0.5">
                  {user?.nombre} · {user?.rol === 'admin' ? 'Admin' : 'Chequero'}
                </p>
              </div>
            </div>

            <div className="flex gap-1 bg-white/10 rounded-xl p-1 flex-shrink-0">
              <button
                onClick={() => setVista('lista')}
                className={`px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                  vista === 'lista' ? 'bg-white text-orange-600' : 'text-white active:bg-white/10'
                }`}
              >
                📋 <span className="hidden sm:inline">Registros</span>
              </button>
              <button
                onClick={() => barcoSeleccionado ? setVista('dashboard') : toast.error('Selecciona un barco')}
                className={`px-3 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                  vista === 'dashboard' ? 'bg-white text-orange-600' : 'text-white active:bg-white/10'
                }`}
              >
                📊 <span className="hidden sm:inline">Dashboard</span>
              </button>
            </div>
          </div>
        </div>

        {barcoSeleccionado && (
          <div className="space-y-3">
            <div className={`rounded-2xl p-4 border ${
              barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && !operacionInfo?.operacion_finalizada_at
                ? 'bg-green-500/10 border-green-500/30'
                : barcoSeleccionado.estado === 'finalizado'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-slate-800/50 border-white/10'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at
                      ? 'bg-yellow-500/20'
                      : barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && !operacionInfo?.operacion_finalizada_at
                      ? 'bg-green-500/20'
                      : barcoSeleccionado.estado === 'finalizado'
                      ? 'bg-red-500/20'
                      : 'bg-slate-700'
                  }`}>
                    <Flag className={`w-5 h-5 ${
                      barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at
                        ? 'text-yellow-400'
                        : barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && !operacionInfo?.operacion_finalizada_at
                        ? 'text-green-400'
                        : barcoSeleccionado.estado === 'finalizado'
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Estado de Operación</h3>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at && (
                        <span className="text-yellow-400 text-xs font-medium">⏳ Pendiente de inicio</span>
                      )}
                      {barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && !operacionInfo?.operacion_finalizada_at && (
                        <>
                          <span className="text-green-400 text-xs font-medium">🟢 Operación en curso</span>
                          <span className="text-xs text-slate-400">Iniciada: {formatFechaHora(operacionInfo.operacion_iniciada_at)}</span>
                          {operacionInfo?.operacion_iniciada_editado && (
                            <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Editado</span>
                          )}
                        </>
                      )}
                      {barcoSeleccionado.estado === 'finalizado' && (
                        <>
                          <span className="text-red-400 text-xs font-medium">🔴 Operación finalizada</span>
                          <span className="text-xs text-slate-400">
                            Inicio: {formatFechaHora(operacionInfo?.operacion_iniciada_at)} · 
                            Fin: {formatFechaHora(operacionInfo?.operacion_finalizada_at)}
                          </span>
                          {operacionInfo?.operacion_finalizada_editado && (
                            <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">Editado</span>
                          )}
                          {operacionInfo?.operacion_motivo_finalizacion && (
                            <span className="text-xs text-slate-500 italic">Motivo: {operacionInfo.operacion_motivo_finalizacion}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at && (
                    <button
                      onClick={() => setShowIniciarModal(true)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm transition-all"
                    >
                      <Play className="w-4 h-4" />
                      Iniciar Operación
                    </button>
                  )}
                  
                  {barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && !operacionInfo?.operacion_finalizada_at && (
                    <button
                      onClick={() => setShowFinalizarModal(true)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm transition-all"
                    >
                      <StopCircle className="w-4 h-4" />
                      Finalizar Operación
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Tiempos de Operación
                </h3>
                <button
                  onClick={() => setShowEditarTiemposModal(true)}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 text-xs transition-all"
                >
                  <Edit className="w-3 h-3" />
                  Editar Todos
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Anchor className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-400">ARRIBO</span>
                    {operacionInfo?.tiempo_arribo_editado && (
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {operacionInfo?.tiempo_arribo 
                      ? formatFechaHora(operacionInfo.tiempo_arribo)
                      : '—'}
                  </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-slate-400">ATAQUE</span>
                    {operacionInfo?.tiempo_ataque_editado && (
                      <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {operacionInfo?.tiempo_ataque 
                      ? formatFechaHora(operacionInfo.tiempo_ataque)
                      : '—'}
                  </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Inbox className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-slate-400">RECIBIDO</span>
                    {operacionInfo?.tiempo_recibido_editado && (
                      <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {operacionInfo?.tiempo_recibido 
                      ? formatFechaHora(operacionInfo.tiempo_recibido)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-blue-400" />
                  Tipos de Descarga
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistorialDescargaModal(true)}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 text-xs transition-all"
                  >
                    <History className="w-3 h-3" />
                    Historial
                  </button>
                  <button
                    onClick={() => setShowDescargaModal(true)}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 text-xs transition-all"
                    disabled={barcoSeleccionado.estado === 'finalizado' || !operacionInfo?.operacion_iniciada_at}
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo
                  </button>
                </div>
              </div>

              {descargasActivas.length > 0 ? (
                <div className="space-y-2">
                  {descargasActivas.map(descarga => (
                    <div
                      key={descarga.id}
                      className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl p-4 border border-blue-500/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-${descarga.tipo_descarga?.color || 'blue'}-500/30`}>
                          <span className="text-3xl">{descarga.tipo_descarga?.icono || '📦'}</span>
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg">{descarga.tipo_descarga?.nombre}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 font-mono">
                                {dayjs(descarga.fecha_hora_inicio).format('HH:mm')}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {dayjs(descarga.fecha_hora_inicio).format('DD/MM/YYYY')}
                            </span>
                          </div>
                          {descarga.observaciones && (
                            <p className="text-xs text-slate-400 mt-2">{descarga.observaciones}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleFinalizarDescarga(descarga)}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                      >
                        <StopCircle className="w-4 h-4" />
                        Finalizar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800 rounded-xl p-8 text-center border-2 border-dashed border-blue-500/30">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-2">No hay tipo de descarga activo</p>
                  <p className="text-xs text-slate-500 mb-4">Registra el tipo de descarga que se está utilizando en este momento</p>
                  <button
                    onClick={() => setShowDescargaModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2"
                    disabled={barcoSeleccionado.estado === 'finalizado' || !operacionInfo?.operacion_iniciada_at}
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Tipo de Descarga
                  </button>
                </div>
              )}

              {historialDescargas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <History className="w-3 h-3" />
                    Últimas descargas finalizadas:
                  </p>
                  <div className="space-y-2">
                    {historialDescargas.slice(0, 3).map(desc => (
                      <div key={desc.id} className="flex items-center justify-between text-xs bg-slate-800/50 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{desc.tipo_descarga?.icono}</span>
                          <span className="text-slate-300">{desc.tipo_descarga?.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-green-400">
                            {dayjs(desc.fecha_hora_inicio).format('HH:mm')}
                          </span>
                          <span className="text-slate-600">→</span>
                          <span className="text-red-400">
                            {dayjs(desc.fecha_hora_fin).format('HH:mm')}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            ({dayjs(desc.fecha_hora_fin).diff(dayjs(desc.fecha_hora_inicio), 'hour')}h{' '}
                            {dayjs(desc.fecha_hora_fin).diff(dayjs(desc.fecha_hora_inicio), 'minute') % 60}m)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {historialDescargas.length > 3 && (
                    <button
                      onClick={() => setShowHistorialDescargaModal(true)}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Ver todos ({historialDescargas.length} registros) →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowShipSelector(!showShipSelector)}
            className="w-full flex items-center justify-between p-4 active:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div className="text-left">
                <span className="text-sm font-bold text-white">
                  {barcoSeleccionado ? barcoSeleccionado.nombre : 'Seleccionar barco'}
                </span>
                {barcoSeleccionado && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {barcoSeleccionado.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'} · 
                    <span className={`ml-1 ${
                      barcoSeleccionado.estado === 'activo' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {barcoSeleccionado.estado}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${showShipSelector ? 'rotate-180' : ''}`} />
          </button>

          {showShipSelector && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar barco..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-base"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              </div>

              <p className="text-xs text-slate-500">
                {barcosFiltrados.length} de {barcos.length} barcos
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {barcosFiltrados.length > 0 ? (
                  barcosFiltrados.map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleSeleccionarBarco(b)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left ${
                        barcoSeleccionado?.id === b.id
                          ? 'border-orange-500/60 bg-orange-500/10'
                          : 'border-white/10 bg-slate-900 active:border-white/20'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-white text-sm">{b.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-500">
                            {b.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                          </p>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                            b.estado === 'activo' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {b.estado}
                          </span>
                        </div>
                      </div>
                      {barcoSeleccionado?.id === b.id && (
                        <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No se encontraron barcos
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {barcoSeleccionado ? (
          vista === 'lista' ? (
            <>
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-3 sm:p-4">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={handleNuevoAtraso}
                      disabled={barcoSeleccionado.estado === 'finalizado' || !operacionInfo?.operacion_iniciada_at}
                      className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm ${
                        barcoSeleccionado.estado === 'finalizado' || !operacionInfo?.operacion_iniciada_at
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Atraso
                    </button>
                    <button
                      onClick={() => cargarRegistros(barcoSeleccionado.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="date"
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value)}
                      className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
                
                {barcoSeleccionado.estado === 'finalizado' && (
                  <p className="text-xs text-red-400 mt-2">Operación finalizada. No se pueden registrar atrasos.</p>
                )}
                {barcoSeleccionado.estado === 'activo' && !operacionInfo?.operacion_iniciada_at && (
                  <p className="text-xs text-yellow-400 mt-2">Debes iniciar la operación antes de registrar atrasos.</p>
                )}
              </div>

              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Registros del {dayjs(filtroFecha).format('DD/MM/YYYY')}
                  </h3>
                  <span className="text-xs text-slate-400">{registrosFiltrados.length} registros</span>
                </div>

                <div className="p-4">
                  {registrosFiltrados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {registrosFiltrados.map(reg => (
                        <RegistroCard
                          key={reg.id}
                          reg={reg}
                          tiposParo={tiposParo}
                          bodegasBarco={bodegasBarco}
                          onEditar={handleEditarAtraso}
                          onEliminar={handleEliminarAtraso}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <Clock className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                      <p className="text-slate-400 text-lg mb-2">No hay registros para esta fecha</p>
                      {barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && (
                        <button 
                          onClick={handleNuevoAtraso}
                          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Registrar primer atraso
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <DashboardAtrasos
              barco={barcoSeleccionado}
              registros={registros}
              tiposParo={tiposParo}
              onClose={() => setVista('lista')}
            />
          )
        ) : (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-12 text-center">
            <Ship className="w-14 h-14 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Sin barco seleccionado</h3>
            <p className="text-slate-400 text-sm">Selecciona un barco para comenzar</p>
          </div>
        )}
      </div>

      {barcoSeleccionado && vista === 'lista' && barcoSeleccionado.estado === 'activo' && operacionInfo?.operacion_iniciada_at && (
        <button
          onClick={handleNuevoAtraso}
          className="sm:hidden fixed bottom-6 right-4 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white w-14 h-14 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {showAtrasoModal && barcoSeleccionado && (
        <AtrasoModal
          barco={barcoSeleccionado}
          atraso={atrasoEditando}
          tiposParo={tiposParo}
          bodegasBarco={bodegasBarco}
          onClose={() => setShowAtrasoModal(false)}
          onSave={handleGuardarAtraso}
        />
      )}

      {showDescargaModal && barcoSeleccionado && (
        <RegistroDescargaModal
          barco={barcoSeleccionado}
          tiposDescarga={tiposDescarga}
          descargaActual={descargasActivas[0]}
          onClose={() => setShowDescargaModal(false)}
          onSave={handleRegistrarDescarga}
        />
      )}

      {showFinalizarDescargaModal && descargaSeleccionada && (
        <FinalizarDescargaModal
          descarga={descargaSeleccionada}
          onClose={() => {
            setShowFinalizarDescargaModal(false)
            setDescargaSeleccionada(null)
          }}
          onConfirm={handleConfirmarFinalizarDescarga}
        />
      )}

      {showHistorialDescargaModal && barcoSeleccionado && (
        <HistorialDescargaModal
          barco={barcoSeleccionado}
          onClose={() => setShowHistorialDescargaModal(false)}
        />
      )}

      {showIniciarModal && barcoSeleccionado && (
        <IniciarOperacionModal
          barco={barcoSeleccionado}
          onClose={() => setShowIniciarModal(false)}
          onConfirm={handleIniciarOperacion}
        />
      )}

      {showFinalizarModal && barcoSeleccionado && (
        <FinalizarOperacionModal
          barco={barcoSeleccionado}
          onClose={() => setShowFinalizarModal(false)}
          onConfirm={handleFinalizarOperacion}
        />
      )}

      {showEditarTiemposModal && barcoSeleccionado && (
        <EditarTiemposModal
          barco={barcoSeleccionado}
          onClose={() => setShowEditarTiemposModal(false)}
          onSave={handleGuardarTiempos}
        />
      )}
    </div>
  )
}