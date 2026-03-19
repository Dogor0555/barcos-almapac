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
  Wrench, Moon, Sun, Smartphone, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Link from 'next/link'
import TrasladoForm from '../components/traslados/TrasladoForm'

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Detalle de Traslado</h3>
              <p className="text-amber-200 text-sm font-mono">{traslado.correlativo_viaje}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">
          {/* Datos del traslado */}
          <div className="bg-slate-900 rounded-xl p-5 border border-white/5">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              Datos del Traslado
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Conductor</p>
                <p className="font-bold text-white">{traslado.nombre_conductor}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Remolque</p>
                <p className="font-bold text-white font-mono">{traslado.remolque}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Tipo Unidad</p>
                <p className={`font-bold capitalize ${traslado.tipo_unidad === 'plana' ? 'text-blue-400' : 'text-purple-400'}`}>
                  {traslado.tipo_unidad}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Transporte</p>
                <p className="font-bold text-white">{traslado.transporte}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Turno</p>
                <p className="font-bold text-white">{traslado.turno || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Fecha</p>
                <p className="font-bold text-white">{formatFecha(traslado.fecha)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs">Horas</p>
                <p className="font-bold">
                  <span className="text-green-400">{formatHora(traslado.hora_inicio_carga)}</span>
                  <span className="text-slate-600 mx-2">→</span>
                  <span className="text-red-400">{formatHora(traslado.hora_fin_carga)}</span>
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs">No. Marchamo</p>
                <p className="font-bold text-white font-mono">{traslado.no_marchamo}</p>
              </div>
            </div>
          </div>

          {/* Tiempos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
              <p className="text-xs text-slate-400">Tiempo Viaje</p>
              <p className="text-xl font-bold text-blue-400">
                {duracionViaje ? `${Math.floor(duracionViaje / 60)}h ${duracionViaje % 60}m` : '—'}
              </p>
            </div>
            {duracionCabaleo > 0 && (
              <div className="bg-slate-900 rounded-xl p-4 border border-purple-500/20">
                <p className="text-xs text-slate-400">Cabaleo</p>
                <p className="text-xl font-bold text-purple-400">
                  {Math.floor(duracionCabaleo / 60)}h {duracionCabaleo % 60}m
                </p>
              </div>
            )}
            <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
              <p className="text-xs text-slate-400">Tiempo Total</p>
              <p className="text-xl font-bold text-green-400">
                {Math.floor(tiempoTotal / 60)}h {tiempoTotal % 60}m
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-4">
            {isAdmin() && (
              <button
                onClick={() => {
                  onClose()
                  onEdit(traslado)
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl"
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
    operativo_id: atraso?.operativo_id || '',
    turno: atraso?.turno || 'diurno'
  })

  const tiposAtraso = [
    'Falla mecánica general',
    'Falta de unidades',
    'Problema eléctrico',
    'Mantenimiento programado',
    'Problema con balanza',
    'Falla en sistema',
    'Espera de materiales',
    'Personal insuficiente',
    'Otro'
  ]

  const turnos = [
    { value: 'diurno', label: 'Diurno (6:00 - 18:00)', icon: '☀️' },
    { value: 'nocturno', label: 'Nocturno (18:00 - 6:00)', icon: '🌙' }
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 sticky top-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-white" />
            <h3 className="text-lg font-black text-white">
              {atraso ? 'Editar Atraso' : 'Registrar Atraso General'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Operativo <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.operativo_id}
              onChange={(e) => setFormData({...formData, operativo_id: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Seleccionar operativo</option>
              {operativos.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Turno <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {turnos.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFormData({...formData, turno: t.value})}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.turno === t.value
                      ? t.value === 'diurno' 
                        ? 'border-yellow-500 bg-yellow-500/20' 
                        : 'border-indigo-500 bg-indigo-500/20'
                      : 'border-white/10 bg-slate-800'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`text-xs font-bold ${
                    formData.turno === t.value
                      ? t.value === 'diurno' ? 'text-yellow-400' : 'text-indigo-400'
                      : 'text-slate-400'
                  }`}>
                    {t.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Fecha <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Hora Inicio <span className="text-red-400">*</span></span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_inicio')}
                  className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                <span>Hora Fin <span className="text-red-400">*</span></span>
                <button
                  type="button"
                  onClick={() => tomarHoraActual('hora_fin')}
                  className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded"
                >
                  Ahora
                </button>
              </label>
              <input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({...formData, hora_fin: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
          </div>

          {duracion && (
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <span className="text-sm text-slate-400">Duración:</span>
              <span className="ml-2 font-bold text-green-400">{duracion.texto}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Tipo de Atraso <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.tipo_atraso}
              onChange={(e) => setFormData({...formData, tipo_atraso: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Seleccionar</option>
              {tiposAtraso.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              rows="3"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Detalles del atraso..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Guardando...' : atraso ? 'Actualizar' : 'Registrar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente para tarjeta de traslado en móvil
const TrasladoCard = ({ traslado, operativoNombre, onVerDetalle, onCompletar, onExportar, onEditar, onEliminar, isAdmin, exportando }) => {
  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM') : '—'

  // Calcular duración
  const calcularDuracion = () => {
    if (!traslado.hora_inicio_carga || !traslado.hora_fin_carga) return null
    const inicio = dayjs(`2000-01-01 ${traslado.hora_inicio_carga}`)
    const fin = dayjs(`2000-01-01 ${traslado.hora_fin_carga}`)
    let diffMinutos = fin.diff(inicio, 'minute')
    if (diffMinutos < 0) diffMinutos += 24 * 60
    return diffMinutos
  }

  const duracion = calcularDuracion()

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-white/10 hover:border-amber-500/50 transition-all">
      {/* Header con correlativo y estado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-amber-400 font-bold text-sm">{traslado.correlativo_viaje}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
          traslado.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
          traslado.estado === 'completado' ? 'bg-blue-500/20 text-blue-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {traslado.estado}
        </span>
      </div>

      {/* Información principal */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-3 h-3 text-slate-500" />
          <span className="text-white">{traslado.nombre_conductor}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Hash className="w-3 h-3 text-slate-500" />
          <span className="text-blue-400 font-mono">{traslado.remolque}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-3 h-3 text-slate-500" />
          <span className="text-slate-300">{formatFecha(traslado.fecha)}</span>
          <span className="text-green-400 ml-auto">{formatHora(traslado.hora_inicio_carga)}</span>
          <span className="text-slate-600">→</span>
          <span className="text-red-400">{formatHora(traslado.hora_fin_carga)}</span>
        </div>
        {duracion && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-green-400">{Math.floor(duracion / 60)}h {duracion % 60}m</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <FolderOpen className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400">{operativoNombre}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Package className="w-3 h-3 text-purple-400" />
          <span className="text-purple-400">{traslado.transporte}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Marchamo:</span>
          <span className="text-amber-400 font-mono">{traslado.no_marchamo}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onVerDetalle(traslado)}
            className="p-2 hover:bg-blue-500/20 rounded-lg"
            title="Ver Detalle"
          >
            <Eye className="w-4 h-4 text-blue-400" />
          </button>
          {traslado.estado === 'activo' && (
            <button
              onClick={() => onCompletar(traslado.id, traslado.estado)}
              className="p-2 hover:bg-green-500/20 rounded-lg"
              title="Completar"
            >
              <CheckCircle className="w-4 h-4 text-green-400" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onExportar(traslado)}
            disabled={exportando === traslado.id}
            className="p-2 hover:bg-indigo-500/20 rounded-lg"
          >
            {exportando === traslado.id ? (
              <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-indigo-400" />
            )}
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => onEditar(traslado)}
                className="p-2 hover:bg-blue-500/20 rounded-lg"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
              </button>
              <button
                onClick={() => onEliminar(traslado.id, traslado.correlativo_viaje)}
                className="p-2 hover:bg-red-500/20 rounded-lg"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente para tarjeta de atraso en móvil
const AtrasoCard = ({ atraso, operativoNombre, onEliminar, isAdmin }) => {
  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  const inicio = dayjs(`2000-01-01 ${atraso.hora_inicio}`)
  const fin = dayjs(`2000-01-01 ${atraso.hora_fin}`)
  let diffMinutos = fin.diff(inicio, 'minute')
  if (diffMinutos < 0) diffMinutos += 24 * 60

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-red-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-red-400" />
          <span className="text-red-400 font-bold text-sm">{atraso.tipo_atraso}</span>
        </div>
        <span className="text-xs text-slate-400">{formatFecha(atraso.fecha)}</span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-3 h-3 text-slate-500" />
          <span className="text-green-400">{formatHora(atraso.hora_inicio)}</span>
          <span className="text-slate-600">→</span>
          <span className="text-red-400">{formatHora(atraso.hora_fin)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-3 h-3 text-slate-500" />
          <span className="text-green-400 font-bold">{Math.floor(diffMinutos / 60)}h {diffMinutos % 60}m</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <FolderOpen className="w-3 h-3 text-amber-400" />
          <span className="text-amber-400">{operativoNombre}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {atraso.turno === 'diurno' ? (
            <Sun className="w-3 h-3 text-yellow-400" />
          ) : (
            <Moon className="w-3 h-3 text-indigo-400" />
          )}
          <span className={atraso.turno === 'diurno' ? 'text-yellow-400' : 'text-indigo-400'}>
            {atraso.turno === 'diurno' ? 'Diurno' : 'Nocturno'}
          </span>
        </div>
        {atraso.observaciones && (
          <p className="text-xs text-slate-400 mt-2">{atraso.observaciones}</p>
        )}
      </div>

      {isAdmin && (
        <div className="flex justify-end pt-3 border-t border-white/10">
          <button
            onClick={() => onEliminar(atraso.id)}
            className="p-2 hover:bg-red-500/20 rounded-lg"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAtrasoGeneralForm, setShowAtrasoGeneralForm] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null)
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroOperativo, setFiltroOperativo] = useState('todos')
  const [filtroAtrasoOperativo, setFiltroAtrasoOperativo] = useState('todos')
  const [filtroTurno, setFiltroTurno] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportando, setExportando] = useState(null)
  const [vista, setVista] = useState('traslados') // 'traslados' o 'atrasos'

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
    let tiempoTotal = 0
    let tiempoInactividad = 0
    let totalUnidades = 0

    traslados.forEach(t => {
      if (t.hora_inicio_carga && t.hora_fin_carga) {
        const inicio = dayjs(`2000-01-01 ${t.hora_inicio_carga}`)
        const fin = dayjs(`2000-01-01 ${t.hora_fin_carga}`)
        let diff = fin.diff(inicio, 'minute')
        if (diff < 0) diff += 24 * 60
        tiempoTotal += diff
      }
      totalUnidades++
    })

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
      tiempoTotal,
      tiempoInactividad,
      tiempoEfectivo: tiempoTotal - tiempoInactividad,
      totalUnidades
    }
  }

  const stats = calcularEstadisticas()

  // Filtros para traslados
  const trasladosFiltrados = traslados.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroOperativo !== 'todos' && t.operativo_id !== parseInt(filtroOperativo)) return false
    if (filtroTurno !== 'todos' && t.turno !== filtroTurno) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return t.correlativo_viaje?.toLowerCase().includes(term) ||
             t.nombre_conductor?.toLowerCase().includes(term) ||
             t.remolque?.toLowerCase().includes(term) ||
             t.transporte?.toLowerCase().includes(term)
    }
    return true
  })

  // Filtros para atrasos generales
  const atrasosFiltrados = atrasosGenerales.filter(a => {
    if (filtroAtrasoOperativo !== 'todos' && a.operativo_id !== parseInt(filtroAtrasoOperativo)) return false
    if (filtroTurno !== 'todos' && a.turno !== filtroTurno) return false
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
    <div className="min-h-screen bg-[#0f172a] p-3 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-4 md:p-6 text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isAdmin() && (
                <Link href="/admin" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              )}
              <div>
                <h1 className="text-xl md:text-3xl font-black flex items-center gap-2">
                  <Truck className="w-6 h-6 md:w-8 md:h-8" />
                  <span className="hidden sm:inline">Gestión de Traslados</span>
                  <span className="sm:hidden">Traslados</span>
                </h1>
                <p className="text-amber-200 text-xs md:text-sm mt-1">
                  {user?.nombre} · {user?.rol === 'chequerotraslado' ? 'Chequero' : 'Admin'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="bg-white hover:bg-amber-50 text-amber-600 px-3 md:px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo</span>
              </button>
              <button
                onClick={() => setShowAtrasoGeneralForm(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 md:px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Atraso</span>
              </button>
              <button
                onClick={() => setVista(vista === 'traslados' ? 'atrasos' : 'traslados')}
                className={`px-3 md:px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${
                  vista === 'atrasos' 
                    ? 'bg-red-500 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Clock3 className="w-4 h-4" />
                <span className="hidden sm:inline">{vista === 'traslados' ? 'Atrasos' : 'Traslados'}</span>
              </button>
              <button
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 p-2 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats en tarjetas para móvil */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mt-4">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-amber-200 text-[10px] md:text-xs">T. Total</p>
              <p className="text-lg md:text-2xl font-black">
                {Math.floor(stats.tiempoTotal / 60)}h
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-amber-200 text-[10px] md:text-xs">Inactividad</p>
              <p className="text-lg md:text-2xl font-black text-red-300">
                {Math.floor(stats.tiempoInactividad / 60)}h
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-amber-200 text-[10px] md:text-xs">Efectivo</p>
              <p className="text-lg md:text-2xl font-black text-green-300">
                {Math.floor(stats.tiempoEfectivo / 60)}h
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-amber-200 text-[10px] md:text-xs">Unidades</p>
              <p className="text-lg md:text-2xl font-black">{stats.totalUnidades}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-white/10">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <select
                value={vista === 'traslados' ? filtroEstado : filtroAtrasoOperativo}
                onChange={(e) => vista === 'traslados' 
                  ? setFiltroEstado(e.target.value)
                  : setFiltroAtrasoOperativo(e.target.value)
                }
                className="flex-1 min-w-[120px] bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                {vista === 'traslados' ? (
                  <>
                    <option value="todos">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="completado">Completados</option>
                  </>
                ) : (
                  <>
                    <option value="todos">Todos los ops</option>
                    {operativos.map(op => (
                      <option key={op.id} value={op.id}>{op.nombre}</option>
                    ))}
                  </>
                )}
              </select>

              <select
                value={filtroTurno}
                onChange={(e) => setFiltroTurno(e.target.value)}
                className="flex-1 min-w-[100px] bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="todos">Turnos</option>
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={vista === 'traslados' ? "Buscar conductor, remolque..." : "Buscar atraso..."}
                className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Vista de Traslados */}
        {vista === 'traslados' && (
          <div className="space-y-4">
            {/* Vista desktop - tabla */}
            <div className="hidden md:block bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
                <h2 className="font-black text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-400" />
                  Listado de Traslados
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({trasladosFiltrados.length})
                  </span>
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Correlativo</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Operativo</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Conductor</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Remolque</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Turno</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Horas</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trasladosFiltrados.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 font-mono text-amber-400 font-bold text-sm">{t.correlativo_viaje}</td>
                        <td className="px-6 py-4 text-xs text-amber-400">{getOperativoNombre(t.operativo_id)}</td>
                        <td className="px-6 py-4 text-white text-sm">{t.nombre_conductor}</td>
                        <td className="px-6 py-4 font-mono text-blue-400 text-sm">{t.remolque}</td>
                        <td className="px-6 py-4">
                          {t.turno === 'diurno' ? (
                            <Sun className="w-4 h-4 text-yellow-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-indigo-400" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{formatFecha(t.fecha)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="text-green-400">{formatHora(t.hora_inicio_carga)}</span>
                          <span className="text-slate-600 mx-1">→</span>
                          <span className="text-red-400">{formatHora(t.hora_fin_carga)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            t.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {t.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setTrasladoSeleccionado(t)
                                setShowDetalleModal(true)
                              }}
                              className="p-1 hover:bg-blue-500/20 rounded"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </button>
                            {t.estado === 'activo' && (
                              <button
                                onClick={() => handleCambiarEstado(t.id, t.estado)}
                                className="p-1 hover:bg-green-500/20 rounded"
                              >
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              </button>
                            )}
                            <button
                              onClick={() => handleExportar(t)}
                              disabled={exportando === t.id}
                              className="p-1 hover:bg-indigo-500/20 rounded"
                            >
                              {exportando === t.id ? (
                                <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-indigo-400" />
                              )}
                            </button>
                            {isAdmin() && (
                              <>
                                <button
                                  onClick={() => {
                                    setTrasladoSeleccionado(t)
                                    setShowEditForm(true)
                                  }}
                                  className="p-1 hover:bg-blue-500/20 rounded"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)}
                                  className="p-1 hover:bg-red-500/20 rounded"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vista móvil - tarjetas */}
            <div className="md:hidden space-y-3">
              {trasladosFiltrados.map((t) => (
                <TrasladoCard
                  key={t.id}
                  traslado={t}
                  operativoNombre={getOperativoNombre(t.operativo_id)}
                  onVerDetalle={(t) => {
                    setTrasladoSeleccionado(t)
                    setShowDetalleModal(true)
                  }}
                  onCompletar={handleCambiarEstado}
                  onExportar={handleExportar}
                  onEditar={(t) => {
                    setTrasladoSeleccionado(t)
                    setShowEditForm(true)
                  }}
                  onEliminar={handleEliminarTraslado}
                  isAdmin={isAdmin()}
                  exportando={exportando}
                />
              ))}
            </div>

            {trasladosFiltrados.length === 0 && (
              <div className="bg-[#1e293b] rounded-2xl p-8 text-center">
                <Truck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No hay traslados</p>
              </div>
            )}
          </div>
        )}

        {/* Vista de Atrasos Generales */}
        {vista === 'atrasos' && (
          <div className="space-y-4">
            {/* Vista desktop - tabla */}
            <div className="hidden md:block bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
                <h2 className="font-black text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-red-400" />
                  Atrasos Generales
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({atrasosFiltrados.length})
                  </span>
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Horas</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Operativo</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Turno</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Duración</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                      {isAdmin() && <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>}
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
                          <td className="px-6 py-4 text-slate-300 font-mono text-sm">{formatFecha(a.fecha)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="text-green-400">{formatHora(a.hora_inicio)}</span>
                            <span className="text-slate-600 mx-1">→</span>
                            <span className="text-red-400">{formatHora(a.hora_fin)}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-amber-400">{operativo?.nombre || '—'}</td>
                          <td className="px-6 py-4 text-xs text-red-400">{a.tipo_atraso}</td>
                          <td className="px-6 py-4">
                            {a.turno === 'diurno' ? (
                              <Sun className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <Moon className="w-4 h-4 text-indigo-400" />
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-white">
                            {Math.floor(diffMinutos / 60)}h {diffMinutos % 60}m
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                            {a.observaciones || '—'}
                          </td>
                          {isAdmin() && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setAtrasoEditando(a)
                                    setShowAtrasoGeneralForm(true)
                                  }}
                                  className="p-1 hover:bg-blue-500/20 rounded"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() => handleEliminarAtrasoGeneral(a.id)}
                                  className="p-1 hover:bg-red-500/20 rounded"
                                >
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

            {/* Vista móvil - tarjetas */}
            <div className="md:hidden space-y-3">
              {atrasosFiltrados.map((a) => (
                <AtrasoCard
                  key={a.id}
                  atraso={a}
                  operativoNombre={getOperativoNombre(a.operativo_id)}
                  onEliminar={handleEliminarAtrasoGeneral}
                  isAdmin={isAdmin()}
                />
              ))}
            </div>

            {atrasosFiltrados.length === 0 && (
              <div className="bg-[#1e293b] rounded-2xl p-8 text-center">
                <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No hay atrasos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {showForm && (
        <TrasladoForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            cargarDatos()
          }}
        />
      )}

      {showEditForm && trasladoSeleccionado && (
        <TrasladoForm
          traslado={trasladoSeleccionado}
          onClose={() => {
            setShowEditForm(false)
            setTrasladoSeleccionado(null)
          }}
          onSuccess={() => {
            setShowEditForm(false)
            setTrasladoSeleccionado(null)
            cargarDatos()
          }}
        />
      )}

      {showAtrasoGeneralForm && (
        <AtrasoGeneralForm
          operativos={operativos}
          atraso={atrasoEditando}
          onClose={() => {
            setShowAtrasoGeneralForm(false)
            setAtrasoEditando(null)
          }}
          onSuccess={() => {
            setShowAtrasoGeneralForm(false)
            setAtrasoEditando(null)
            cargarDatos()
          }}
        />
      )}

      {showDetalleModal && trasladoSeleccionado && (
        <DetalleTrasladoModal
          traslado={trasladoSeleccionado}
          onClose={() => {
            setShowDetalleModal(false)
            setTrasladoSeleccionado(null)
          }}
          onEdit={(t) => {
            setTrasladoSeleccionado(t)
            setShowEditForm(true)
          }}
        />
      )}
    </div>
  )
}