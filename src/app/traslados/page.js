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
  Play, Pause, StopCircle, Menu, ChevronLeft, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Link from 'next/link'
import TrasladoForm from '../components/traslados/TrasladoForm'

// Componente para registrar turnos
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

      let duracion_minutos = null
      if (formData.hora_inicio && formData.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        duracion_minutos = diff
      }

      if (turno) {
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
    'Falla de equipo frontal',
    'Corte de energía electrica'
  ]

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

      if (!formData.hora_inicio || !formData.hora_fin) {
        throw new Error('Debes ingresar hora de inicio y fin')
      }

      const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
      const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
      let duracion_minutos = fin.diff(inicio, 'minute')
      if (duracion_minutos < 0) duracion_minutos += 24 * 60

      const datosAtraso = {
        es_general: true,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        tipo_atraso: formData.tipo_atraso,
        observaciones: formData.observaciones,
        operativo_id: parseInt(formData.operativo_id),
        duracion_minutos,
        created_by: user.id
      }

      if (atraso) {
        const { error } = await supabase
          .from('traslados_atrasos')
          .update({
            ...datosAtraso,
            updated_at: new Date().toISOString()
          })
          .eq('id', atraso.id)

        if (error) throw error
        toast.success('✅ Atraso actualizado')
      } else {
        const { error } = await supabase
          .from('traslados_atrasos')
          .insert([datosAtraso])

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

// Componente de paginación
const Paginacion = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange, totalRegistros }) => {
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-white/10">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 order-2 sm:order-1">
        <span>Mostrar</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-white"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>registros</span>
        <span className="hidden sm:inline ml-2">
          | Total: <span className="text-amber-400 font-bold">{totalRegistros}</span> registros
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <ChevronLeft className="w-4 h-4 -ml-3" />
        </button>
        
        <button          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex gap-1">
          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 px-2 sm:px-3 rounded-lg font-bold text-sm transition-all ${
                currentPage === page
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-2 rounded-lg bg-slate-900 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
          <ChevronRight className="w-4 h-4 -ml-3" />
        </button>
      </div>

      <div className="text-xs text-slate-400 order-3">
        Página {currentPage} de {totalPages}
      </div>
    </div>
  )
}

// Componente de estadísticas por operativo
const EstadisticasPorOperativo = ({ operativos, turnos, atrasosGenerales, traslados }) => {
  const [operativoSeleccionado, setOperativoSeleccionado] = useState('todos')
  
  const calcularStats = () => {
    const statsMap = new Map()
    
    operativos.forEach(op => {
      statsMap.set(op.id, {
        operativo_id: op.id,
        nombre: op.nombre,
        tiempoTotalTurnos: 0,
        tiempoInactividad: 0,
        totalUnidades: 0,
        unidadesCompletadas: 0,
        unidadesActivas: 0
      })
    })
    
    turnos.forEach(t => {
      if (t.hora_inicio && t.hora_fin && statsMap.has(t.operativo_id)) {
        const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        const stats = statsMap.get(t.operativo_id)
        stats.tiempoTotalTurnos += diff
      }
    })
    
    atrasosGenerales.forEach(a => {
      let duracion = a.duracion_minutos || 0
      if (!duracion && a.hora_inicio && a.hora_fin && statsMap.has(a.operativo_id)) {
        const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        duracion = diff
      }
      if (statsMap.has(a.operativo_id)) {
        const stats = statsMap.get(a.operativo_id)
        stats.tiempoInactividad += duracion
      }
    })
    
    traslados.forEach(t => {
      if (statsMap.has(t.operativo_id)) {
        const stats = statsMap.get(t.operativo_id)
        stats.totalUnidades++
        if (t.estado === 'completado') stats.unidadesCompletadas++
        else if (t.estado === 'activo') stats.unidadesActivas++
      }
    })
    
    return Array.from(statsMap.values()).sort((a, b) => b.totalUnidades - a.totalUnidades)
  }
  
  const estadisticas = calcularStats()
  const statsFiltradas = operativoSeleccionado === 'todos' 
    ? estadisticas 
    : estadisticas.filter(op => op.operativo_id === parseInt(operativoSeleccionado))
  
  if (estadisticas.length === 0) return null
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white/80 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Estadísticas por Operativo
        </h3>
        <select
          value={operativoSeleccionado}
          onChange={(e) => setOperativoSeleccionado(e.target.value)}
          className="text-xs bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white"
        >
          <option value="todos">Todos los operativos</option>
          {operativos.map(op => (
            <option key={op.id} value={op.id}>{op.nombre}</option>
          ))}
        </select>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {statsFiltradas.map((op) => {
          const tiempoEfectivo = op.tiempoTotalTurnos - op.tiempoInactividad
          const eficiencia = op.tiempoTotalTurnos > 0 
            ? ((tiempoEfectivo / op.tiempoTotalTurnos) * 100).toFixed(1)
            : 0
          
          return (
            <div key={op.operativo_id} className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-3 border border-white/10 hover:border-amber-500/50 transition-all">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-amber-400 text-sm truncate">{op.nombre}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  eficiencia >= 80 ? 'bg-green-500/20 text-green-400' :
                  eficiencia >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {eficiencia}% eficiencia
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-slate-400 text-[10px]">Turnos</div>
                  <div className="font-bold text-white">{Math.floor(op.tiempoTotalTurnos / 60)}h</div>
                  <div className="text-[9px] text-slate-500">{op.tiempoTotalTurnos % 60}m</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-slate-400 text-[10px]">Inactividad</div>
                  <div className="font-bold text-red-400">{Math.floor(op.tiempoInactividad / 60)}h</div>
                  <div className="text-[9px] text-slate-500">{op.tiempoInactividad % 60}m</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-slate-400 text-[10px]">Efectivo</div>
                  <div className="font-bold text-green-400">{Math.floor(tiempoEfectivo / 60)}h</div>
                  <div className="text-[9px] text-slate-500">{tiempoEfectivo % 60}m</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-2">
                  <div className="text-slate-400 text-[10px]">Unidades</div>
                  <div className="font-bold text-blue-400">{op.totalUnidades}</div>
                  <div className="text-[9px] text-slate-500">
                    ✓{op.unidadesCompletadas} | 🔄{op.unidadesActivas}
                  </div>
                </div>
              </div>
              
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    eficiencia >= 80 ? 'bg-green-500' :
                    eficiencia >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${eficiencia}%` }}
                />
              </div>
            </div>
          )
        })}
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
  const [vista, setVista] = useState('traslados')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || (!isAdmin() && !isChequeroTraslado())) {
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarPagina(1)
  }, [])

  // Función para cargar SOLO los registros de la página actual
  const cargarPagina = async (pagina = currentPage, items = itemsPerPage) => {
    try {
      setLoading(true)
      
      const from = (pagina - 1) * items
      const to = from + items - 1
      
      // Obtener TOTAL de registros (para calcular páginas)
      const { count, error: countError } = await supabase
        .from('traslados')
        .select('*', { count: 'exact', head: true })
      
      if (countError) throw countError
      setTotalRegistros(count || 0)
      setTotalPages(Math.ceil((count || 0) / items))
      
      // Obtener SOLO los registros de la página actual
      const { data: trasladosData, error } = await supabase
        .from('traslados')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_inicio_carga', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      setTraslados(trasladosData || [])
      
      // Cargar operativos, atrasos y turnos (son menos datos)
      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .order('created_at', { ascending: false })
      
      setOperativos(operativosData || [])
      
      const { data: atrasosData } = await supabase
        .from('traslados_atrasos')
        .select('*')
        .eq('es_general', true)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      
      setAtrasosGenerales(atrasosData || [])
      
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

  // Función para cambiar de página
  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPages) return
    setCurrentPage(nuevaPagina)
    cargarPagina(nuevaPagina, itemsPerPage)
  }

  // Función para cambiar items por página
  const cambiarItemsPorPagina = (nuevosItems) => {
    setItemsPerPage(nuevosItems)
    setCurrentPage(1)
    cargarPagina(1, nuevosItems)
  }

  // Recargar datos manteniendo la página actual
  const recargarDatos = () => {
    cargarPagina(currentPage, itemsPerPage)
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
      recargarDatos()
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
      recargarDatos()
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
      recargarDatos()
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
      recargarDatos()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cambiar estado')
    }
  }

  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  const calcularEstadisticas = () => {
    let tiempoTotalTurnos = 0
    let tiempoInactividad = 0

    turnos.forEach(t => {
      if (t.hora_inicio && t.hora_fin) {
        const inicio = dayjs(`2000-01-01 ${t.hora_inicio}`)
        const fin = dayjs(`2000-01-01 ${t.hora_fin}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoTotalTurnos += diff
      }
    })

    atrasosGenerales.forEach(a => {
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

    return {
      tiempoTotal: tiempoTotalTurnos,
      tiempoInactividad,
      tiempoEfectivo: tiempoTotalTurnos - tiempoInactividad
    }
  }

  const statsGenerales = calcularEstadisticas()

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

  const atrasosFiltrados = atrasosGenerales.filter(a => {
    if (filtroAtrasoOperativo !== 'todos' && a.operativo_id !== parseInt(filtroAtrasoOperativo)) return false
    return true
  })

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
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

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
              <button onClick={recargarDatos} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

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
                  <button onClick={recargarDatos} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg flex-1 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/30 p-2 rounded-lg flex-1 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas generales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">T. Turnos</div>
              <div className="text-sm sm:text-lg font-bold">{Math.floor(statsGenerales.tiempoTotal / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Inactividad</div>
              <div className="text-sm sm:text-lg font-bold text-red-300">{Math.floor(statsGenerales.tiempoInactividad / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Efectivo</div>
              <div className="text-sm sm:text-lg font-bold text-green-300">{Math.floor(statsGenerales.tiempoEfectivo / 60)}h</div>
            </div>
            <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
              <div className="text-[10px] sm:text-xs text-amber-200">Unidades</div>
              <div className="text-sm sm:text-lg font-bold">{totalRegistros}</div>
            </div>
          </div>
        </div>

        {/* Estadísticas por Operativo */}
        <EstadisticasPorOperativo 
          operativos={operativos}
          turnos={turnos}
          atrasosGenerales={atrasosGenerales}
          traslados={traslados}
        />

        {/* Filtros */}
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

        {/* Vista de Traslados con Paginación */}
        {vista === 'traslados' && (
          <>
            <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
              <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
                <h2 className="font-bold text-white text-sm sm:text-base">Traslados ({totalRegistros} total)</h2>
              </div>
              
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
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                      <button onClick={() => { setTrasladoSeleccionado(t); setShowDetalleModal(true); }} className="p-1.5 hover:bg-blue-500/20 rounded">
                        <Eye className="w-4 h-4 text-blue-400" />
                      </button>
                      {t.estado === 'activo' && (
                        <button onClick={() => handleCambiarEstado(t.id, t.estado)} className="p-1.5 hover:bg-green-500/20 rounded">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </button>
                      )}
                      <button onClick={() => { setTrasladoSeleccionado(t); setShowEditForm(true); }} className="p-1.5 hover:bg-blue-500/20 rounded">
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      {isAdmin() && (
                        <button onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)} className="p-1.5 hover:bg-red-500/20 rounded">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

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
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            t.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>{t.estado}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setTrasladoSeleccionado(t); setShowDetalleModal(true); }} className="p-1 hover:bg-blue-500/20 rounded">
                              <Eye className="w-4 h-4 text-blue-400" />
                            </button>
                            {t.estado === 'activo' && (
                              <button onClick={() => handleCambiarEstado(t.id, t.estado)} className="p-1 hover:bg-green-500/20 rounded">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              </button>
                            )}
                            <button onClick={() => { setTrasladoSeleccionado(t); setShowEditForm(true); }} className="p-1 hover:bg-blue-500/20 rounded">
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            {isAdmin() && (
                              <button onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)} className="p-1 hover:bg-red-500/20 rounded">
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
            
            <Paginacion 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={cambiarPagina}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={cambiarItemsPorPagina}
              totalRegistros={totalRegistros}
            />
          </>
        )}

        {/* Vista de Atrasos */}
        {vista === 'atrasos' && (
          <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
              <h2 className="font-bold text-white text-sm sm:text-base">Atrasos Generales ({atrasosFiltrados.length})</h2>
            </div>
            
            <div className="sm:hidden divide-y divide-white/5">
              {atrasosFiltrados.map((a) => {
                const operativo = operativos.find(o => o.id === a.operativo_id)
                const duracion = a.duracion_minutos || (() => {
                  if (a.hora_inicio && a.hora_fin) {
                    const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
                    const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
                    let diff = fin.diff(inicio, 'minute')
                    if (diff < 0) diff += 24 * 60
                    return diff
                  }
                  return 0
                })()
                
                return (
                  <div key={a.id} className="p-3 hover:bg-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-slate-500">Fecha</span>
                        <p className="font-mono text-slate-300 font-bold text-sm">{formatFecha(a.fecha)}</p>
                      </div>
                      <span className="text-xs text-red-400">{Math.floor(duracion / 60)}h {duracion % 60}m</span>
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
                        <button onClick={() => { setAtrasoEditando(a); setShowAtrasoGeneralForm(true); }} className="p-1.5 hover:bg-blue-500/20 rounded">
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleEliminarAtrasoGeneral(a.id)} className="p-1.5 hover:bg-red-500/20 rounded">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

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
                    const duracion = a.duracion_minutos || (() => {
                      if (a.hora_inicio && a.hora_fin) {
                        const inicio = dayjs(`2000-01-01 ${a.hora_inicio}`)
                        const fin = dayjs(`2000-01-01 ${a.hora_fin}`)
                        let diff = fin.diff(inicio, 'minute')
                        if (diff < 0) diff += 24 * 60
                        return diff
                      }
                      return 0
                    })()
                    
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
                        <td className="px-4 py-2 font-bold text-white">{Math.floor(duracion / 60)}h {duracion % 60}m</td>
                        <td className="px-4 py-2 text-slate-400 max-w-xs truncate" title={a.observaciones}>{a.observaciones || '—'}</td>
                        {isAdmin() && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setAtrasoEditando(a); setShowAtrasoGeneralForm(true); }} className="p-1 hover:bg-blue-500/20 rounded">
                                <Edit2 className="w-4 h-4 text-blue-400" />
                              </button>
                              <button onClick={() => handleEliminarAtrasoGeneral(a.id)} className="p-1 hover:bg-red-500/20 rounded">
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

        {/* Vista de Turnos */}
        {vista === 'turnos' && (
          <div className="bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
              <h2 className="font-bold text-white text-sm sm:text-base">Turnos ({turnosFiltrados.length})</h2>
            </div>
            
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
                        <button onClick={() => handleEliminarTurno(t.id)} className="p-1.5 hover:bg-red-500/20 rounded">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

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
                            <button onClick={() => handleEliminarTurno(t.id)} className="p-1 hover:bg-red-500/20 rounded">
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

        {/* Mensajes sin datos */}
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
      {showForm && <TrasladoForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); recargarDatos(); }} />}
      {showEditForm && trasladoSeleccionado && (
        <TrasladoForm
          traslado={trasladoSeleccionado}
          onClose={() => { setShowEditForm(false); setTrasladoSeleccionado(null); }}
          onSuccess={() => { setShowEditForm(false); setTrasladoSeleccionado(null); recargarDatos(); }}
        />
      )}
      {showTurnoForm && (
        <TurnoForm
          operativos={operativos}
          turno={turnoEditando}
          onClose={() => { setShowTurnoForm(false); setTurnoEditando(null); }}
          onSuccess={() => { setShowTurnoForm(false); setTurnoEditando(null); recargarDatos(); }}
        />
      )}
      {showAtrasoGeneralForm && (
        <AtrasoGeneralForm
          operativos={operativos}
          atraso={atrasoEditando}
          onClose={() => { setShowAtrasoGeneralForm(false); setAtrasoEditando(null); }}
          onSuccess={() => { setShowAtrasoGeneralForm(false); setAtrasoEditando(null); recargarDatos(); }}
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