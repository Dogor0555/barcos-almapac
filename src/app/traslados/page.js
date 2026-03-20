'use client'

import { useState, useEffect } from 'react'
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
  Play, Pause, StopCircle, Menu
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Link from 'next/link'
import TrasladoForm from '../components/traslados/TrasladoForm'

// Componente para registrar turnos - AHORA CON 2 CHEQUEROS Y OPERADOR
const TurnoForm = ({ operativos, onClose, onSuccess, turno = null }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    operativo_id: turno?.operativo_id || '',
    chequero1: turno?.chequero1 || '',
    chequero2: turno?.chequero2 || '',
    operador: turno?.operador || '',
    hora_inicio: turno?.hora_inicio || '',
    hora_fin: turno?.hora_fin || '',
    fecha: turno?.fecha || new Date().toISOString().split('T')[0],
    observaciones: turno?.observaciones || ''
  })

  // Cronómetro para el turno
  const [cronometroActivo, setCronometroActivo] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [intervalId, setIntervalId] = useState(null)

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [intervalId])

  const iniciarCronometro = () => {
    if (cronometroActivo) return
    setCronometroActivo(true)
    const id = setInterval(() => {
      setTiempoTranscurrido(prev => prev + 1)
    }, 1000)
    setIntervalId(id)
  }

  const pausarCronometro = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
      setCronometroActivo(false)
    }
  }

  const detenerCronometro = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
    setCronometroActivo(false)
    
    // Convertir segundos a horas:minutos
    const horas = Math.floor(tiempoTranscurrido / 3600)
    const minutos = Math.floor((tiempoTranscurrido % 3600) / 60)
    const horaFin = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
    
    setFormData(prev => ({
      ...prev,
      hora_fin: horaFin
    }))
    setTiempoTranscurrido(0)
  }

  const formatTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = segundos % 60
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  const tomarHoraActual = (campo) => {
    const ahora = new Date()
    const hora = ahora.getHours().toString().padStart(2, '0')
    const minutos = ahora.getMinutes().toString().padStart(2, '0')
    setFormData({ ...formData, [campo]: `${hora}:${minutos}` })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      if (!formData.operativo_id) {
        throw new Error('Debes seleccionar un operativo')
      }

      if (!formData.chequero1.trim()) {
        throw new Error('Debes ingresar el nombre del Chequero 1')
      }

      if (!formData.chequero2.trim()) {
        throw new Error('Debes ingresar el nombre del Chequero 2')
      }

      if (!formData.operador.trim()) {
        throw new Error('Debes ingresar el nombre del Operador')
      }

      if (!formData.hora_inicio) {
        throw new Error('Debes ingresar hora de inicio')
      }

      // Calcular duración en minutos si hay hora fin
      let duracion_minutos = null
      if (formData.hora_inicio && formData.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        duracion_minutos = diff
      }

      if (turno) {
        // Actualizar
        const { error } = await supabase
          .from('turnos_operativos')
          .update({
            ...formData,
            duracion_minutos,
            updated_at: new Date().toISOString()
          })
          .eq('id', turno.id)

        if (error) throw error
        toast.success('✅ Turno actualizado')
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('turnos_operativos')
          .insert([{
            ...formData,
            duracion_minutos,
            created_by: user.id
          }])

        if (error) throw error
        toast.success('✅ Turno registrado')
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-white truncate">
              {turno ? 'Editar Turno' : 'Registrar Turno'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Operativo <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.operativo_id}
              onChange={(e) => setFormData({...formData, operativo_id: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-white text-sm"
              required
            >
              <option value="">Seleccionar operativo</option>
              {operativos.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
                Cheq. 1 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.chequero1}
                onChange={(e) => setFormData({...formData, chequero1: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
                Cheq. 2 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.chequero2}
                onChange={(e) => setFormData({...formData, chequero2: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Nombre"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Operador <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.operador}
              onChange={(e) => setFormData({...formData, operador: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              placeholder="Nombre del operador"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Fecha <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Inicio <span className="text-red-400">*</span></span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_inicio')}
                  className="text-[10px] sm:text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Fin</span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_fin')}
                  className="text-[10px] sm:text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          {formData.hora_inicio && formData.hora_fin && (
            <div className="bg-slate-800 rounded-lg p-2 sm:p-3 text-center">
              <span className="text-xs sm:text-sm text-slate-400">Duración:</span>
              <span className="ml-2 font-bold text-green-400 text-sm sm:text-base">
                {(() => {
                  const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
                  const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
                  let diff = fin.diff(inicio, 'minute')
                  if (diff < 0) diff += 24 * 60
                  return `${Math.floor(diff / 60)}h ${diff % 60}m`
                })()}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              placeholder="Notas sobre el turno..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 bg-slate-800 text-white font-bold py-2 sm:py-2.5 rounded-lg text-sm sm:text-base order-1 sm:order-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-2 sm:py-2.5 rounded-lg disabled:opacity-50 text-sm sm:text-base order-2 sm:order-none"
            >
              {loading ? 'Guardando...' : turno ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente para el modal de detalle de traslado
const DetalleTrasladoModal = ({ traslado, onClose, onEdit }) => {
  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  // Calcular duración del viaje
  const calcularDuracion = () => {
    if (!traslado.hora_inicio_carga || !traslado.hora_fin_carga) return null
    const inicio = dayjs(`2000-01-01 ${traslado.hora_inicio_carga}`)
    const fin = dayjs(`2000-01-01 ${traslado.hora_fin_carga}`)
    let diffMinutos = fin.diff(inicio, 'minute')
    if (diffMinutos < 0) diffMinutos += 24 * 60
    return diffMinutos
  }

  const duracionViaje = calcularDuracion()
  const duracionCabaleo = traslado.tiempo_cabaleo_minutos || 0
  const tiempoTotal = (duracionViaje || 0) + duracionCabaleo

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/20 p-2 rounded-xl flex-shrink-0">
              <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-black text-white truncate">Detalle de Traslado</h3>
              <p className="text-amber-200 text-xs sm:text-sm font-mono truncate">{traslado.correlativo_viaje}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-3 sm:space-y-4">
          <div className="bg-slate-900 rounded-xl p-4 sm:p-5 border border-white/5">
            <h4 className="text-white font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Truck className="w-4 h-4 text-blue-400" />
              Datos del Traslado
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Conductor</p>
                <p className="font-bold text-white break-words">{traslado.nombre_conductor}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Placa</p>
                <p className="font-bold text-white font-mono break-words">{traslado.placa || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Remolque</p>
                <p className="font-bold text-white font-mono break-words">{traslado.remolque}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Tipo Unidad</p>
                <p className={`font-bold capitalize ${traslado.tipo_unidad === 'plana' ? 'text-blue-400' : 'text-purple-400'}`}>
                  {traslado.tipo_unidad}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Transporte</p>
                <p className="font-bold text-white break-words">{traslado.transporte}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] sm:text-xs">Fecha</p>
                <p className="font-bold text-white">{formatFecha(traslado.fecha)}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-slate-500 text-[10px] sm:text-xs">Horas</p>
                <p className="font-bold">
                  <span className="text-green-400">{formatHora(traslado.hora_inicio_carga)}</span>
                  <span className="text-slate-600 mx-1 sm:mx-2">→</span>
                  <span className="text-red-400">{formatHora(traslado.hora_fin_carga)}</span>
                </p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <p className="text-slate-500 text-[10px] sm:text-xs">No. Marchamo</p>
                <p className="font-bold text-white font-mono text-xs sm:text-sm break-all">{traslado.no_marchamo}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-slate-900 rounded-xl p-3 sm:p-4 border border-blue-500/20">
              <p className="text-[10px] sm:text-xs text-slate-400">Tiempo Viaje</p>
              <p className="text-base sm:text-xl font-bold text-blue-400">
                {duracionViaje ? `${Math.floor(duracionViaje / 60)}h ${duracionViaje % 60}m` : '—'}
              </p>
            </div>
            {duracionCabaleo > 0 && (
              <div className="bg-slate-900 rounded-xl p-3 sm:p-4 border border-purple-500/20">
                <p className="text-[10px] sm:text-xs text-slate-400">Cabaleo</p>
                <p className="text-base sm:text-xl font-bold text-purple-400">
                  {Math.floor(duracionCabaleo / 60)}h {duracionCabaleo % 60}m
                </p>
              </div>
            )}
            <div className="bg-slate-900 rounded-xl p-3 sm:p-4 border border-green-500/20">
              <p className="text-[10px] sm:text-xs text-slate-400">Tiempo Total</p>
              <p className="text-base sm:text-xl font-bold text-green-400">
                {Math.floor(tiempoTotal / 60)}h {tiempoTotal % 60}m
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            {/* Botón Editar - AHORA VISIBLE PARA TODOS LOS USUARIOS */}
            <button
              onClick={() => {
                onClose()
                onEdit(traslado)
              }}
              className="w-full sm:flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 sm:py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={onClose}
              className="w-full sm:flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 sm:py-3 rounded-xl text-sm sm:text-base"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para registrar atrasos GENERALES del operativo
const AtrasoGeneralForm = ({ operativos, onClose, onSuccess, atraso = null }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: atraso?.fecha || new Date().toISOString().split('T')[0],
    hora_inicio: atraso?.hora_inicio || '',
    hora_fin: atraso?.hora_fin || '',
    tipo_atraso: atraso?.tipo_atraso || '',
    observaciones: atraso?.observaciones || '',
    operativo_id: atraso?.operativo_id || ''
  })

  const tiposAtraso = [
    'Revisión de equipo frontal',
    'Tiempo de comida para el personal',
    'Limpieza de bodegas',
    'Falta de Unidades',
    'Carga de combustible',
    'Retraso llegada a ingenio',
    'Esperando indicaciones de ingenio',
    'Falla en sistema de báscula',
    'Ajuste de peso en unidad',
    'Calibración de llantas de equipo frontal',
    'Ubicación equipo frontal',
    'Lluvia',
    'Falla de equipo frontal'
  ]

  // Calcular duración para mostrar
  const [duracion, setDuracion] = useState(null)
  
  useEffect(() => {
    if (formData.hora_inicio && formData.hora_fin) {
      const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
      const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
      let diffMinutos = fin.diff(inicio, 'minute')
      if (diffMinutos < 0) diffMinutos += 24 * 60
      
      setDuracion({
        minutos: diffMinutos,
        texto: `${Math.floor(diffMinutos / 60)}h ${diffMinutos % 60}m`
      })
    } else {
      setDuracion(null)
    }
  }, [formData.hora_inicio, formData.hora_fin])

  const tomarHoraActual = (campo) => {
    const ahora = new Date()
    const hora = ahora.getHours().toString().padStart(2, '0')
    const minutos = ahora.getMinutes().toString().padStart(2, '0')
    setFormData({ ...formData, [campo]: `${hora}:${minutos}` })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      if (!formData.operativo_id) {
        throw new Error('Debes seleccionar un operativo')
      }

      // Calcular duración en minutos
      const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
      const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
      let duracion_minutos = fin.diff(inicio, 'minute')
      if (duracion_minutos < 0) duracion_minutos += 24 * 60

      if (atraso) {
        // Actualizar
        const { error } = await supabase
          .from('traslados_atrasos')
          .update({
            ...formData,
            duracion_minutos,
            updated_at: new Date().toISOString()
          })
          .eq('id', atraso.id)

        if (error) throw error
        toast.success('✅ Atraso actualizado')
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('traslados_atrasos')
          .insert([{
            es_general: true,
            ...formData,
            duracion_minutos,
            created_by: user.id
          }])

        if (error) throw error
        toast.success('✅ Atraso general registrado')
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-white flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-black text-white truncate">
              {atraso ? 'Editar Atraso' : 'Registrar Atraso'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Operativo <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.operativo_id}
              onChange={(e) => setFormData({...formData, operativo_id: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              required
            >
              <option value="">Seleccionar</option>
              {operativos.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Fecha <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Inicio <span className="text-red-400">*</span></span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_inicio')}
                  className="text-[10px] sm:text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Fin <span className="text-red-400">*</span></span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_fin')}
                  className="text-[10px] sm:text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                required
              />
            </div>
          </div>

          {duracion && (
            <div className="bg-slate-800 rounded-lg p-2 sm:p-3 text-center">
              <span className="text-xs sm:text-sm text-slate-400">Duración:</span>
              <span className="ml-2 font-bold text-green-400 text-sm sm:text-base">{duracion.texto}</span>
            </div>
          )}

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Tipo <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.tipo_atraso}
              onChange={(e) => setFormData({...formData, tipo_atraso: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              required
            >
              <option value="">Seleccionar</option>
              {tiposAtraso.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 sm:px-4 py-2 text-white text-sm"
              placeholder="Detalles..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 bg-slate-800 text-white font-bold py-2 sm:py-2.5 rounded-lg text-sm sm:text-base order-1 sm:order-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold py-2 sm:py-2.5 rounded-lg disabled:opacity-50 text-sm sm:text-base order-2 sm:order-none"
            >
              {loading ? 'Guardando...' : atraso ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente principal
export default function TrasladosPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [traslados, setTraslados] = useState([])
  const [operativos, setOperativos] = useState([])
  const [atrasosGenerales, setAtrasosGenerales] = useState([])
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showTurnoForm, setShowTurnoForm] = useState(false)
  const [showAtrasoGeneralForm, setShowAtrasoGeneralForm] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null)
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [turnoEditando, setTurnoEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroOperativo, setFiltroOperativo] = useState('todos')
  const [filtroAtrasoOperativo, setFiltroAtrasoOperativo] = useState('todos')
  const [filtroTurnoOperativo, setFiltroTurnoOperativo] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportando, setExportando] = useState(null)
  const [vista, setVista] = useState('traslados') // 'traslados', 'atrasos', 'turnos'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
      
      // Cargar traslados
      const { data: trasladosData, error } = await supabase
        .from('traslados')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_inicio_carga', { ascending: false })

      if (error) throw error
      setTraslados(trasladosData || [])

      // Cargar operativos
      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .order('created_at', { ascending: false })

      setOperativos(operativosData || [])

      // Cargar atrasos generales
      const { data: atrasosData } = await supabase
        .from('traslados_atrasos')
        .select('*')
        .eq('es_general', true)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      setAtrasosGenerales(atrasosData || [])

      // Cargar turnos
      const { data: turnosData } = await supabase
        .from('turnos_operativos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      setTurnos(turnosData || [])
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarTraslado = async (id, correlativo) => {
    if (!isAdmin()) {
      toast.error('Solo administradores pueden eliminar')
      return
    }
    if (!confirm(`¿Eliminar traslado "${correlativo}"?`)) return

    try {
      const { error } = await supabase
        .from('traslados')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Traslado eliminado')
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleEliminarAtrasoGeneral = async (id) => {
    if (!isAdmin()) {
      toast.error('Solo administradores pueden eliminar')
      return
    }
    if (!confirm('¿Eliminar este atraso general?')) return

    try {
      const { error } = await supabase
        .from('traslados_atrasos')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Atraso eliminado')
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleEliminarTurno = async (id) => {
    if (!isAdmin()) {
      toast.error('Solo administradores pueden eliminar')
      return
    }
    if (!confirm('¿Eliminar este turno?')) return

    try {
      const { error } = await supabase
        .from('turnos_operativos')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Turno eliminado')
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleCambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'completado' : 'activo'
    if (!confirm(`¿${nuevoEstado === 'activo' ? 'Reabrir' : 'Completar'} el traslado?`)) return

    try {
      const { error } = await supabase
        .from('traslados')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error
      toast.success(`Traslado ${nuevoEstado === 'activo' ? 'reabierto' : 'completado'}`)
      cargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cambiar estado')
    }
  }

  const handleExportar = async (traslado) => {
    try {
      setExportando(traslado.id)
      
      const operativo = operativos.find(o => o.id === traslado.operativo_id)

      const exportData = {
        metadata: {
          fecha_exportacion: new Date().toISOString(),
          exportado_por: user?.nombre,
          tipo: 'traslado'
        },
        traslado: {
          ...traslado,
          operativo_nombre: operativo?.nombre
        }
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `TRASLADO_${traslado.correlativo_viaje}_${dayjs().format('YYYYMMDD_HHmm')}.json`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('✅ Datos exportados')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al exportar')
    } finally {
      setExportando(null)
    }
  }

  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  // Calcular estadísticas
  const calcularEstadisticas = () => {
    let tiempoTotalTurnos = 0
    let tiempoInactividad = 0
    let totalUnidades = traslados.length

    // Sumar duración de todos los turnos
    turnos.forEach(t => {
      if (t.hora_inicio && t.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoTotalTurnos += diff
      }
    })

    // Sumar duración de todos los atrasos
    atrasosGenerales.forEach(a => {
      if (a.hora_inicio && a.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoInactividad += diff
      }
    })

    return {
      tiempoTotal: tiempoTotalTurnos,
      tiempoInactividad,
      tiempoEfectivo: tiempoTotalTurnos - tiempoInactividad,
      totalUnidades
    }
  }

  const stats = calcularEstadisticas()

  // Filtros para traslados
  const trasladosFiltrados = traslados.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroOperativo !== 'todos' && t.operativo_id !== parseInt(filtroOperativo)) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return t.correlativo_viaje?.toLowerCase().includes(term) ||
             t.nombre_conductor?.toLowerCase().includes(term) ||
             t.placa?.toLowerCase().includes(term) ||
             t.remolque?.toLowerCase().includes(term) ||
             t.transporte?.toLowerCase().includes(term)
    }
    return true
  })

  // Filtros para atrasos generales
  const atrasosFiltrados = atrasosGenerales.filter(a => {
    if (filtroAtrasoOperativo !== 'todos' && a.operativo_id !== parseInt(filtroAtrasoOperativo)) return false
    return true
  })

  // Filtros para turnos
  const turnosFiltrados = turnos.filter(t => {
    if (filtroTurnoOperativo !== 'todos' && t.operativo_id !== parseInt(filtroTurnoOperativo)) return false
    return true
  })

  const getOperativoNombre = (operativoId) => {
    const op = operativos.find(o => o.id === operativoId)
    return op ? op.nombre : '—'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader className="w-12 h-12 text-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-3 sm:p-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin() && (
                <Link href="/admin" className="bg-white/10 hover:bg-white/20 p-1.5 sm:p-2 rounded-lg">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              )}
              <div>
                <h1 className="text-base sm:text-xl font-black">Gestión de Traslados</h1>
                <p className="text-[10px] sm:text-sm text-amber-200 truncate max-w-[150px] sm:max-w-none">{user?.nombre} · {user?.rol}</p>
              </div>
            </div>
            
            {/* Botón menú móvil */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Menú desktop */}
            <div className="hidden sm:flex flex-wrap gap-2">
              <button onClick={() => setShowTurnoForm(true)} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> Turno
              </button>
              <button onClick={() => setShowForm(true)} className="bg-white text-amber-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> Traslado
              </button>
              <button onClick={() => setShowAtrasoGeneralForm(true)} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Atraso
              </button>
              <select value={vista} onChange={(e) => setVista(e.target.value)} className="bg-white/10 text-white px-3 py-2 rounded-lg text-sm font-bold border border-white/20">
                <option value="traslados">📦 Traslados</option>
                <option value="atrasos">🔧 Atrasos</option>
                <option value="turnos">👥 Turnos</option>
              </select>
              <button onClick={cargarDatos} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Menú móvil desplegable */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-3 space-y-2 border-t border-white/10 pt-3">
              <div className="flex flex-col gap-2">
                <button onClick={() => { setShowTurnoForm(true); setMobileMenuOpen(false); }} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 w-full">
                  <Users className="w-4 h-4" /> Registrar Turno
                </button>
                <button onClick={() => { setShowForm(true); setMobileMenuOpen(false); }} className="bg-white text-amber-600 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 w-full">
                  <Plus className="w-4 h-4" /> Nuevo Traslado
                </button>
                <button onClick={() => { setShowAtrasoGeneralForm(true); setMobileMenuOpen(false); }} className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 w-full">
                  <Wrench className="w-4 h-4" /> Registrar Atraso
                </button>
                <select value={vista} onChange={(e) => setVista(e.target.value)} className="bg-white/10 text-white px-3 py-2 rounded-lg text-sm font-bold border border-white/20 w-full">
                  <option value="traslados">📦 Ver Traslados</option>
                  <option value="atrasos">🔧 Ver Atrasos</option>
                  <option value="turnos">👥 Ver Turnos</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={cargarDatos} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg flex-1 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg flex-1 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats - Responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">T. Turnos</div>
              <div className="text-sm sm:text-lg font-bold">{Math.floor(stats.tiempoTotal / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Inactividad</div>
              <div className="text-sm sm:text-lg font-bold text-red-300">{Math.floor(stats.tiempoInactividad / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Efectivo</div>
              <div className="text-sm sm:text-lg font-bold text-green-300">{Math.floor(stats.tiempoEfectivo / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Unidades</div>
              <div className="text-sm sm:text-lg font-bold">{stats.totalUnidades}</div>
            </div>
          </div>
        </div>

        {/* Filtros - Responsive */}
        <div className="bg-[#1e293b] rounded-xl p-3 sm:p-4 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-2">
            {vista === 'traslados' && (
              <>
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white">
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="completado">Completados</option>
                </select>
                <select value={filtroOperativo} onChange={(e) => setFiltroOperativo(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white">
                  <option value="todos">Todos los operativos</option>
                  {operativos.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
                </select>
              </>
            )}
            {vista === 'atrasos' && (
              <select value={filtroAtrasoOperativo} onChange={(e) => setFiltroAtrasoOperativo(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white">
                <option value="todos">Todos los operativos</option>
                {operativos.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
              </select>
            )}
            {vista === 'turnos' && (
              <select value={filtroTurnoOperativo} onChange={(e) => setFiltroTurnoOperativo(e.target.value)} className="w-full sm:w-auto bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs sm:text-sm text-white">
                <option value="todos">Todos los operativos</option>
                {operativos.map(op => <option key={op.id} value={op.id}>{op.nombre}</option>)}
              </select>
            )}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Buscar..." 
                className="w-full bg-slate-800 border border-white/10 rounded-lg pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-xs sm:text-sm text-white" 
              />
            </div>
          </div>
        </div>

        {/* Vista de Traslados - Tarjetas para móvil, tabla para desktop */}
        {vista === 'traslados' && (
          <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
              <h2 className="font-bold text-white text-sm sm:text-base">Traslados ({trasladosFiltrados.length})</h2>
            </div>
            
            {/* Vista móvil: tarjetas */}
            <div className="sm:hidden divide-y divide-white/5">
              {trasladosFiltrados.map((t) => (
                <div key={t.id} className="p-3 hover:bg-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-slate-500">Correlativo</span>
                      <p className="font-mono text-amber-400 font-bold text-sm">{t.correlativo_viaje}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      t.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{t.estado}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-slate-500">Conductor</span>
                      <p className="font-bold text-white truncate">{t.nombre_conductor}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Operativo</span>
                      <p className="text-amber-400 truncate">{getOperativoNombre(t.operativo_id)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Placa/Remolque</span>
                      <p className="font-mono text-blue-400">{t.placa || '—'} / {t.remolque}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Transporte</span>
                      <p className="text-white truncate">{t.transporte}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Horas</span>
                      <p>
                        <span className="text-green-400">{formatHora(t.hora_inicio_carga)}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-red-400">{formatHora(t.hora_fin_carga)}</span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Marchamo</span>
                      <p className="font-mono text-amber-400 text-xs break-all">{t.no_marchamo}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                    <button onClick={() => { setTrasladoSeleccionado(t); setShowDetalleModal(true); }} className="p-1.5 hover:bg-blue-500/20 rounded" title="Ver">
                      <Eye className="w-4 h-4 text-blue-400" />
                    </button>
                    {t.estado === 'activo' && (
                      <button onClick={() => handleCambiarEstado(t.id, t.estado)} className="p-1.5 hover:bg-green-500/20 rounded" title="Completar">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                   
                    {/* Botón Editar - AHORA VISIBLE PARA TODOS LOS USUARIOS */}
                    <button onClick={() => { setTrasladoSeleccionado(t); setShowEditForm(true); }} className="p-1.5 hover:bg-blue-500/20 rounded" title="Editar">
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </button>
                    {/* Botón Eliminar - Solo Admin */}
                    {isAdmin() && (
                      <button onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)} className="p-1.5 hover:bg-red-500/20 rounded" title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Correlativo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Operativo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Conductor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Placa</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Remolque</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Transporte</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Horas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Marchamo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trasladosFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5">
                      <td className="px-4 py-2 font-mono text-amber-400">{t.correlativo_viaje}</td>
                      <td className="px-4 py-2 text-amber-400">{getOperativoNombre(t.operativo_id)}</td>
                      <td className="px-4 py-2 text-white">{t.nombre_conductor}</td>
                      <td className="px-4 py-2 font-mono text-blue-400">{t.placa || '—'}</td>
                      <td className="px-4 py-2 font-mono text-blue-400">{t.remolque}</td>
                      <td className="px-4 py-2 text-white">{t.transporte}</td>
                      <td className="px-4 py-2 text-slate-300">{formatFecha(t.fecha)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-green-400">{formatHora(t.hora_inicio_carga)}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-red-400">{formatHora(t.hora_fin_carga)}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-amber-400 max-w-[150px] truncate" title={t.no_marchamo}>{t.no_marchamo}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          t.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>{t.estado}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setTrasladoSeleccionado(t); setShowDetalleModal(true); }} className="p-1 hover:bg-blue-500/20 rounded" title="Ver">
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>
                          {t.estado === 'activo' && (
                            <button onClick={() => handleCambiarEstado(t.id, t.estado)} className="p-1 hover:bg-green-500/20 rounded" title="Completar">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            </button>
                          )}
                         
                          {/* Botón Editar - AHORA VISIBLE PARA TODOS LOS USUARIOS */}
                          <button onClick={() => { setTrasladoSeleccionado(t); setShowEditForm(true); }} className="p-1 hover:bg-blue-500/20 rounded" title="Editar">
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          {/* Botón Eliminar - Solo Admin */}
                          {isAdmin() && (
                            <button onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)} className="p-1 hover:bg-red-500/20 rounded" title="Eliminar">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista de Atrasos - Tarjetas para móvil, tabla para desktop */}
        {vista === 'atrasos' && (
          <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
              <h2 className="font-bold text-white text-sm sm:text-base">Atrasos Generales ({atrasosFiltrados.length})</h2>
            </div>
            
            {/* Vista móvil: tarjetas */}
            <div className="sm:hidden divide-y divide-white/5">
              {atrasosFiltrados.map((a) => {
                const operativo = operativos.find(o => o.id === a.operativo_id)
                const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
                const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
                let diffMinutos = fin.diff(inicio, 'minute')
                if (diffMinutos < 0) diffMinutos += 24 * 60
                
                return (
                  <div key={a.id} className="p-3 hover:bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-slate-500">Fecha</span>
                        <p className="font-mono text-slate-300 font-bold text-sm">{formatFecha(a.fecha)}</p>
                      </div>
                      <span className="text-xs text-red-400">{Math.floor(diffMinutos / 60)}h {diffMinutos % 60}m</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="col-span-2">
                        <span className="text-slate-500">Operativo</span>
                        <p className="text-amber-400 font-bold">{operativo?.nombre || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Tipo</span>
                        <p className="text-red-400">{a.tipo_atraso}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Horas</span>
                        <p>
                          <span className="text-green-400">{formatHora(a.hora_inicio)}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-red-400">{formatHora(a.hora_fin)}</span>
                        </p>
                      </div>
                      {a.observaciones && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Obs.</span>
                          <p className="text-slate-400 text-xs">{a.observaciones}</p>
                        </div>
                      )}
                    </div>
                    
                    {isAdmin() && (
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                        <button onClick={() => { setAtrasoEditando(a); setShowAtrasoGeneralForm(true); }} className="p-1.5 hover:bg-blue-500/20 rounded" title="Editar">
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleEliminarAtrasoGeneral(a.id)} className="p-1.5 hover:bg-red-500/20 rounded" title="Eliminar">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Horas</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Operativo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Duración</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Observaciones</th>
                    {isAdmin() && <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {atrasosFiltrados.map((a) => {
                    const operativo = operativos.find(o => o.id === a.operativo_id)
                    const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
                    const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
                    let diffMinutos = fin.diff(inicio, 'minute')
                    if (diffMinutos < 0) diffMinutos += 24 * 60
                    
                    return (
                      <tr key={a.id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-mono text-slate-300">{formatFecha(a.fecha)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="text-green-400">{formatHora(a.hora_inicio)}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-red-400">{formatHora(a.hora_fin)}</span>
                        </td>
                        <td className="px-4 py-2 text-amber-400">{operativo?.nombre || '—'}</td>
                        <td className="px-4 py-2 text-red-400">{a.tipo_atraso}</td>
                        <td className="px-4 py-2 font-bold text-white">{Math.floor(diffMinutos / 60)}h {diffMinutos % 60}m</td>
                        <td className="px-4 py-2 text-slate-400 max-w-xs truncate" title={a.observaciones}>{a.observaciones || '—'}</td>
                        {isAdmin() && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setAtrasoEditando(a); setShowAtrasoGeneralForm(true); }} className="p-1 hover:bg-blue-500/20 rounded" title="Editar">
                                <Edit2 className="w-4 h-4 text-blue-400" />
                              </button>
                              <button onClick={() => handleEliminarAtrasoGeneral(a.id)} className="p-1 hover:bg-red-500/20 rounded" title="Eliminar">
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vista de Turnos - Tarjetas para móvil, tabla para desktop */}
        {vista === 'turnos' && (
          <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
              <h2 className="font-bold text-white text-sm sm:text-base">Turnos ({turnosFiltrados.length})</h2>
            </div>
            
            {/* Vista móvil: tarjetas */}
            <div className="sm:hidden divide-y divide-white/5">
              {turnosFiltrados.map((t) => {
                const operativo = operativos.find(o => o.id === t.operativo_id)
                let duracion = null
                if (t.hora_inicio && t.hora_fin) {
                  const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
                  const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
                  let diff = fin.diff(inicio, 'minute')
                  if (diff < 0) diff += 24 * 60
                  duracion = diff
                }
                
                return (
                  <div key={t.id} className="p-3 hover:bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-slate-500">Fecha</span>
                        <p className="font-mono text-slate-300 font-bold text-sm">{formatFecha(t.fecha)}</p>
                      </div>
                      {duracion && (
                        <span className="text-xs text-green-400">{Math.floor(duracion / 60)}h {duracion % 60}m</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-slate-500">Cheq. 1</span>
                        <p className="text-white">{t.chequero1 || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Cheq. 2</span>
                        <p className="text-white">{t.chequero2 || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Operador</span>
                        <p className="text-white font-bold">{t.operador}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Operativo</span>
                        <p className="text-amber-400">{operativo?.nombre || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Horas</span>
                        <p>
                          <span className="text-green-400">{formatHora(t.hora_inicio)}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-red-400">{formatHora(t.hora_fin) || '—'}</span>
                        </p>
                      </div>
                      {t.observaciones && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Obs.</span>
                          <p className="text-slate-400 text-xs">{t.observaciones}</p>
                        </div>
                      )}
                    </div>
                    
                    {isAdmin() && (
                      <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                        <button onClick={() => handleEliminarTurno(t.id)} className="p-1.5 hover:bg-red-500/20 rounded" title="Eliminar">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Vista desktop: tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Chequero 1</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Chequero 2</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Operador</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Operativo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Inicio</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Fin</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Duración</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Observaciones</th>
                    {isAdmin() && <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {turnosFiltrados.map((t) => {
                    const operativo = operativos.find(o => o.id === t.operativo_id)
                    let duracion = null
                    if (t.hora_inicio && t.hora_fin) {
                      const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
                      const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
                      let diff = fin.diff(inicio, 'minute')
                      if (diff < 0) diff += 24 * 60
                      duracion = diff
                    }
                    
                    return (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-mono text-slate-300">{formatFecha(t.fecha)}</td>
                        <td className="px-4 py-2 text-white">{t.chequero1 || '—'}</td>
                        <td className="px-4 py-2 text-white">{t.chequero2 || '—'}</td>
                        <td className="px-4 py-2 text-white">{t.operador}</td>
                        <td className="px-4 py-2 text-amber-400">{operativo?.nombre || '—'}</td>
                        <td className="px-4 py-2 text-green-400">{formatHora(t.hora_inicio)}</td>
                        <td className="px-4 py-2 text-red-400">{formatHora(t.hora_fin) || '—'}</td>
                        <td className="px-4 py-2 font-bold text-white">{duracion ? `${Math.floor(duracion / 60)}h ${duracion % 60}m` : '—'}</td>
                        <td className="px-4 py-2 text-slate-400 max-w-xs truncate" title={t.observaciones}>{t.observaciones || '—'}</td>
                        {isAdmin() && (
                          <td className="px-4 py-2">
                            <button onClick={() => handleEliminarTurno(t.id)} className="p-1 hover:bg-red-500/20 rounded" title="Eliminar">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mensaje si no hay datos */}
        {vista === 'traslados' && trasladosFiltrados.length === 0 && (
          <div className="bg-[#1e293b] rounded-xl p-6 sm:p-8 text-center text-slate-400">
            <Truck className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-slate-600" />
            <p className="text-xs sm:text-sm">No hay traslados</p>
          </div>
        )}
        {vista === 'atrasos' && atrasosFiltrados.length === 0 && (
          <div className="bg-[#1e293b] rounded-xl p-6 sm:p-8 text-center text-slate-400">
            <Wrench className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-slate-600" />
            <p className="text-xs sm:text-sm">No hay atrasos</p>
          </div>
        )}
        {vista === 'turnos' && turnosFiltrados.length === 0 && (
          <div className="bg-[#1e293b] rounded-xl p-6 sm:p-8 text-center text-slate-400">
            <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-slate-600" />
            <p className="text-xs sm:text-sm">No hay turnos</p>
          </div>
        )}
      </div>

      {/* Modales */}
      {showForm && <TrasladoForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); cargarDatos(); }} />}
      {showEditForm && trasladoSeleccionado && (
        <TrasladoForm
          traslado={trasladoSeleccionado}
          onClose={() => { setShowEditForm(false); setTrasladoSeleccionado(null); }}
          onSuccess={() => { setShowEditForm(false); setTrasladoSeleccionado(null); cargarDatos(); }}
        />
      )}
      {showTurnoForm && (
        <TurnoForm
          operativos={operativos}
          turno={turnoEditando}
          onClose={() => { setShowTurnoForm(false); setTurnoEditando(null); }}
          onSuccess={() => { setShowTurnoForm(false); setTurnoEditando(null); cargarDatos(); }}
        />
      )}
      {showAtrasoGeneralForm && (
        <AtrasoGeneralForm
          operativos={operativos}
          atraso={atrasoEditando}
          onClose={() => { setShowAtrasoGeneralForm(false); setAtrasoEditando(null); }}
          onSuccess={() => { setShowAtrasoGeneralForm(false); setAtrasoEditando(null); cargarDatos(); }}
        />
      )}
      {showDetalleModal && trasladoSeleccionado && (
        <DetalleTrasladoModal
          traslado={trasladoSeleccionado}
          onClose={() => { setShowDetalleModal(false); setTrasladoSeleccionado(null); }}
          onEdit={(t) => { setTrasladoSeleccionado(t); setShowEditForm(true); }}
        />
      )}
    </div>
  )
}