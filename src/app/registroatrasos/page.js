// app/registroatrasos/page.js - Módulo de atrasos intuitivo (Mobile Optimized)
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
  Filter, ChevronDown, ChevronUp, Info, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO CON COLORES E ICONOS
// =====================================================
const TIPOS_PARO_CONFIG = {
  'Desperfecto de grua del buque': { color: 'red', icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400' },
  'Colocando almeja UPDP': { color: 'orange', icono: <Wrench className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400' },
  'Falta de camiones (Unidades insuficientes por transportistas)': { color: 'yellow', icono: <Truck className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  'Traslado de UCA a Almapac': { color: 'blue', icono: <Truck className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'Falla sistema UPDP': { color: 'purple', icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400' },
  'Tiempo de comida': { color: 'green', icono: <Coffee className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400' },
  'Cierre de bodegas': { color: 'gray', icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400' },
  'Amenaza de lluvia': { color: 'sky', icono: <CloudRain className="w-4 h-4" />, bg: 'bg-sky-500/10', text: 'text-sky-400' },
  'Lluvia': { color: 'indigo', icono: <CloudRain className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  'Esperando apertura de bodegas': { color: 'amber', icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'Apertura de bodegas': { color: 'emerald', icono: <Layers className="w-4 h-4" />, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'Traslado de UCA a Alcasa': { color: 'cyan', icono: <Truck className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  'Mantenimiento almeja UPDP': { color: 'rose', icono: <Wrench className="w-4 h-4" />, bg: 'bg-rose-500/10', text: 'text-rose-400' },
  'Sacando equipo abordo': { color: 'pink', icono: <Wrench className="w-4 h-4" />, bg: 'bg-pink-500/10', text: 'text-pink-400' },
  'Movimiento de UCA': { color: 'teal', icono: <Truck className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400' },
  'Movilizando tolvas': { color: 'lime', icono: <Wrench className="w-4 h-4" />, bg: 'bg-lime-500/10', text: 'text-lime-400' },
  'Falta de Tolveros': { color: 'stone', icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-stone-500/10', text: 'text-stone-400' },
  'Quitando Almeja UPDP': { color: 'violet', icono: <Wrench className="w-4 h-4" />, bg: 'bg-violet-500/10', text: 'text-violet-400' },
  'Colocando equipo abordo': { color: 'fuchsia', icono: <Wrench className="w-4 h-4" />, bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400' },
  'Acumulado producto': { color: 'slate', icono: <BarChart3 className="w-4 h-4" />, bg: 'bg-slate-500/10', text: 'text-slate-400' },
  'Falla en sistema UPDP': { color: 'purple', icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400' },
  'Falla en el sistema ALMAPAC': { color: 'yellow', icono: <Zap className="w-4 h-4" />, bg: 'bg-yellow-500/20', text: 'text-yellow-400', imputable: true },
  'Esperando señal de Almapac': { color: 'amber', icono: <Clock className="w-4 h-4" />, bg: 'bg-amber-500/20', text: 'text-amber-400', imputable: true },
}

// =====================================================
// MODAL PARA REGISTRAR/EDITAR ATRASO — MOBILE FIRST
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
    // Full-screen on mobile, centered modal on desktop
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
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

          {/* Progress bar */}
          <div className="flex gap-2 mt-3">
            <div className={`flex-1 h-1.5 rounded-full ${paso >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-1.5 rounded-full ${paso >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          <div className="flex justify-between text-[11px] text-white/70 mt-1">
            <span>1. Tipo de paro</span>
            <span>2. Datos</span>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          {paso === 1 ? (
            <div className="space-y-3">
              <p className="text-white font-bold text-sm">¿Qué tipo de paro deseas registrar?</p>
              {/* Single-column on mobile, 2 cols on md */}
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

              {/* Tipo seleccionado */}
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

              {/* Fecha */}
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

              {/* Horas — stacked on mobile */}
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

              {/* En curso indicator */}
              {enCurso && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                  <div className="animate-pulse w-2.5 h-2.5 bg-blue-400 rounded-full flex-shrink-0" />
                  <p className="text-blue-400 text-sm">
                    En curso · {Math.floor(tiempoTranscurrido / 60)}h {tiempoTranscurrido % 60}m
                  </p>
                </div>
              )}

              {/* Bodega */}
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

              {/* Observaciones */}
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

              {/* Botones — full width, stacked friendly */}
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
// DASHBOARD DE ATRASOS — MOBILE FIRST
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
        
        {/* Header */}
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

          {/* Filtros — scrollable on very small screens */}
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

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">

          {/* Stats — 2 cols on mobile (3 on sm) */}
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

          {/* Distribución */}
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

          {/* No imputables */}
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

          {/* Imputables */}
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
// TARJETA DE REGISTRO — reemplaza filas de tabla en móvil
// =====================================================
const RegistroCard = ({ reg, tiposParo, onEditar, onEliminar }) => {
  const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {}
  
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${config.bg || 'bg-slate-800'}`}>
            {config.icono || <AlertTriangle className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm leading-tight">{tipo?.nombre || 'Desconocido'}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Horario */}
              <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">
                {reg.hora_inicio?.slice(0,5)}
                {reg.hora_fin ? ` → ${reg.hora_fin?.slice(0,5)}` : ' →  ?'}
              </span>
              {/* Duración */}
              {reg.duracion_minutos && (
                <span className="text-xs font-bold text-orange-400">
                  {Math.floor(reg.duracion_minutos/60)}h {reg.duracion_minutos%60}m
                </span>
              )}
              {/* Ubicación */}
              {reg.es_general ? (
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full font-bold">GENERAL</span>
              ) : reg.bodega_nombre ? (
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">{reg.bodega_nombre}</span>
              ) : null}
              {/* Imputable badge */}
              {tipo?.es_imputable_almapac && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">ALMAPAC</span>
              )}
            </div>
            {reg.observaciones && (
              <p className="text-xs text-slate-500 mt-1.5 truncate">{reg.observaciones}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => onEditar(reg)}
            className="p-2.5 bg-blue-500/10 active:bg-blue-500/30 rounded-lg"
          >
            <Edit2 className="w-4 h-4 text-blue-400" />
          </button>
          <button
            onClick={() => onEliminar(reg.id)}
            className="p-2.5 bg-red-500/10 active:bg-red-500/30 rounded-lg"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
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
  const [registros, setRegistros] = useState([])
  const [bodegasBarco, setBodegasBarco] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAtrasoModal, setShowAtrasoModal] = useState(false)
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState(dayjs().format('YYYY-MM-DD'))
  const [searchTerm, setSearchTerm] = useState('')
  const [vista, setVista] = useState('lista')
  // Mobile: collapsible ship selector
  const [showShipSelector, setShowShipSelector] = useState(true)

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
      const { data: barcosData } = await supabase.from('barcos').select('*').eq('estado', 'activo').order('created_at', { ascending: false })
      setBarcos(barcosData || [])
      if (barcosData?.length > 0 && !barcoSeleccionado) {
        setBarcoSeleccionado(barcosData[0])
        cargarBodegas(barcosData[0])
        await cargarRegistros(barcosData[0].id)
        setShowShipSelector(false) // Auto-hide on load
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const cargarBodegas = (barco) => setBodegasBarco(barco.bodegas_json || [])

  const cargarRegistros = async (barcoId) => {
    try {
      const { data } = await supabase
        .from('registro_atrasos')
        .select('*, tipo_paro:tipos_paro(*)')
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
    setShowShipSelector(false) // Collapse after selection on mobile
  }

  const handleNuevoAtraso = () => { setAtrasoEditando(null); setShowAtrasoModal(true) }
  const handleEditarAtraso = (atraso) => { setAtrasoEditando(atraso); setShowAtrasoModal(true) }

  const handleEliminarAtraso = async (id) => {
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

  const barcosFiltrados = barcos.filter(b => b.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  const registrosFiltrados = registros.filter(r => r.fecha === filtroFecha)

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
      {/* Safe area top padding handled by p-4 */}
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 space-y-3 sm:space-y-4">

        {/* ── Header ── */}
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

            {/* Vista toggle */}
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

        {/* ── Selector de barco (collapsible on mobile) ── */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          {/* Toggle header — always visible */}
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
                    {barcoSeleccionado.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${showShipSelector ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable content */}
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

              {/* Barcos as touch-friendly cards */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {barcosFiltrados.map(b => (
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
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {b.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                      </p>
                    </div>
                    {barcoSeleccionado?.id === b.id && (
                      <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {barcoSeleccionado ? (
          vista === 'lista' ? (
            <>
              {/* Barra de acciones */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-3 sm:p-4">
                {/* Mobile layout: acciones en top, fecha abajo */}
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={handleNuevoAtraso}
                      className="bg-orange-500 active:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Atraso
                    </button>
                    <button
                      onClick={() => cargarRegistros(barcoSeleccionado.id)}
                      className="bg-slate-800 active:bg-slate-700 text-white p-2.5 rounded-xl"
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
              </div>

              {/* Lista de registros */}
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-orange-400" />
                    {dayjs(filtroFecha).format('DD/MM/YYYY')}
                  </h3>
                  <span className="text-xs text-slate-400">{registrosFiltrados.length} registros</span>
                </div>

                {/* Mobile: cards. Desktop: table */}
                <div className="p-3 sm:p-0">
                  {/* Cards — visible on mobile/tablet */}
                  <div className="sm:hidden space-y-2">
                    {registrosFiltrados.map(reg => (
                      <RegistroCard
                        key={reg.id}
                        reg={reg}
                        tiposParo={tiposParo}
                        onEditar={handleEditarAtraso}
                        onEliminar={handleEliminarAtraso}
                      />
                    ))}
                    {registrosFiltrados.length === 0 && (
                      <div className="py-10 text-center">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-400 text-sm">Sin registros para esta fecha</p>
                        <button onClick={handleNuevoAtraso}
                          className="mt-3 text-orange-400 text-sm font-bold active:text-orange-300">
                          + Registrar primer atraso
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table — hidden on mobile */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Horario</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Duración</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo de Paro</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Ubicación</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {registrosFiltrados.map(reg => {
                          const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
                          const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {}
                          return (
                            <tr key={reg.id} className="hover:bg-white/5">
                              <td className="px-4 py-3 font-mono text-white text-sm">
                                {reg.hora_inicio?.slice(0,5)}
                                {reg.hora_fin && <span className="text-slate-500"> → {reg.hora_fin?.slice(0,5)}</span>}
                              </td>
                              <td className="px-4 py-3 font-bold text-orange-400 text-sm">
                                {reg.duracion_minutos ? `${Math.floor(reg.duracion_minutos/60)}h ${reg.duracion_minutos%60}m` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1 rounded ${config.bg || 'bg-slate-800'}`}>{config.icono || <AlertTriangle className="w-4 h-4" />}</div>
                                  <span className="text-white text-sm">{tipo?.nombre}</span>
                                  {tipo?.es_imputable_almapac && (
                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">ALMAPAC</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {reg.es_general
                                  ? <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full text-xs font-bold">GENERAL</span>
                                  : reg.bodega_nombre ? <span className="text-white text-sm">{reg.bodega_nombre}</span> : '—'
                                }
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">{reg.observaciones || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button onClick={() => handleEditarAtraso(reg)} className="p-1.5 hover:bg-blue-500/20 rounded-lg">
                                    <Edit2 className="w-4 h-4 text-blue-400" />
                                  </button>
                                  <button onClick={() => handleEliminarAtraso(reg.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {registrosFiltrados.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-4 py-12 text-center text-slate-400">
                              <Clock className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                              <p>No hay registros para esta fecha</p>
                              <button onClick={handleNuevoAtraso} className="mt-3 text-orange-400 hover:text-orange-300 text-sm font-bold">
                                + Registrar primer atraso
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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

      {/* FAB — acceso rápido en móvil cuando hay barco seleccionado */}
      {barcoSeleccionado && vista === 'lista' && (
        <button
          onClick={handleNuevoAtraso}
          className="sm:hidden fixed bottom-6 right-4 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white w-14 h-14 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Modal */}
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
    </div>
  )
}