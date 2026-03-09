// app/barco/[token]/exportacion/page.js - Página para registro de exportación (carga a bodega del barco)
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from './../../../lib/supabase'
import { getCurrentUser } from './../../../lib/auth'
import { 
  Save, RefreshCw, Scale, Ship, Target, CheckCircle, 
  Package, Clock, AlertCircle, Edit2, Trash2, MapPin,
  TrendingUp, LineChart, BookOpen, X, Download, Layers,
  Anchor, Play, StopCircle, Lock, Unlock, Coffee, CloudRain,
  Wrench, Truck, Zap, AlertTriangle, BarChart3, Flag,
  History, Filter, ChevronDown, ChevronRight, Info, Box
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extender dayjs con plugins de zona horaria
dayjs.extend(utc)
dayjs.extend(timezone)

// =====================================================
// CONFIGURACIÓN DE HORARIO EL SALVADOR (GMT-6) - VERSIÓN FINAL CORREGIDA
// =====================================================
const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

// Para MOSTRAR: Convertir UTC de BD a hora de El Salvador
const formatUTCToSV = (utcDate, format = 'DD/MM/YY HH:mm') => {
  if (!utcDate) return '—'
  return dayjs.utc(utcDate).tz(TIMEZONE_EL_SALVADOR).format(format)
}

// Para GUARDAR: Convertir hora de El Salvador del input a UTC
const svToUTC = (svDateTime) => {
  if (!svDateTime) return null
  return dayjs.tz(svDateTime, TIMEZONE_EL_SALVADOR).utc().toISOString()
}

// Obtener hora actual en El Salvador para inputs
const getCurrentSVTimeForInput = () => {
  return dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DDTHH:mm')
}

// =====================================================
// CONFIGURACIÓN DE BODEGAS DEL BARCO (SIN CAPACIDAD)
// =====================================================
const BODEGAS_BARCO = [
  { id: 1, nombre: 'Bodega 1', codigo: 'BDG-01' },
  { id: 2, nombre: 'Bodega 2', codigo: 'BDG-02' },
  { id: 3, nombre: 'Bodega 3', codigo: 'BDG-03' },
  { id: 4, nombre: 'Bodega 4', codigo: 'BDG-04' },
  { id: 5, nombre: 'Bodega 5', codigo: 'BDG-05' },
  { id: 6, nombre: 'Bodega 6', codigo: 'BDG-06' },
  { id: 7, nombre: 'Bodega 7', codigo: 'BDG-07' },
  { id: 8, nombre: 'Bodega 8', codigo: 'BDG-08' },
]

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO (VERSIÓN COMPLETA)
// =====================================================
const getTiposParoConfig = () => ({
  // PAROS ALMAPAC
  'BANDA 7': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', grupo: 'ALMAPAC' },
  'MOVIMIENTO DEL CARRO DE BANDA 7': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', grupo: 'ALMAPAC' },
  'ELEVADOR 23': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'ALMAPAC' },
  'ELEVADOR 13': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'ALMAPAC' },
  'BÁSCULA DE EXPORTACIÓN': { icono: <Scale className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', grupo: 'ALMAPAC' },
  'COMPUERTA DE LLENADO': { icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  'COMPUERTA DE DESCARGA': { icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  'HEL ALTO': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'ALMAPAC' },
  'DRAFT MASTER': { icono: <BarChart3 className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', grupo: 'ALMAPAC' },
  'COMPRESOR A': { icono: <Zap className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'ALMAPAC' },
  'COMPRESOR B': { icono: <Zap className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'ALMAPAC' },
  'BANDA 15': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 19': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 72': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 73': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'FALLA DE PAYD LOADER': { icono: <Truck className="w-4 h-4" />, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', grupo: 'ALMAPAC' },
  'PLC': { icono: <Zap className="w-4 h-4" />, bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', grupo: 'ALMAPAC' },
  'FALTA DE AZÚCAR': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20', grupo: 'ALMAPAC' },
  'BANDA 21': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', grupo: 'ALMAPAC' },
  'BANDA 2': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', grupo: 'ALMAPAC' },
  'BANDA 1': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', grupo: 'ALMAPAC' },
  'DESATORANDO ELEVADOR 23.': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', grupo: 'ALMAPAC' },
  'OTROS': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  
  // PAROS UPDP
  'TRANSPORTADOR No:': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', grupo: 'UPDP' },
  'REBALSE EN EL BUM': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'UPDP' },
  'FALLAS EN UNIDAD DE CARGA': { icono: <Truck className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', grupo: 'UPDP' },
  'FALLAS EN EL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', grupo: 'UPDP' },
  'MANTENIMIENTO DEL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'UPDP' },
  'LIMPIEZA DEL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', grupo: 'UPDP' },
  'MOVIMIENTO DEL APILADOR': { icono: <Truck className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'UPDP' },
  'CAMBIO DE BODEGA EN EL BARCO': { icono: <Layers className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'UPDP' },
})

// =====================================================
// MODAL REGISTRAR / EDITAR ATRASO (DEMORA)
// =====================================================
const AtrasoModal = ({ barco, atraso, tiposParo, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [enCurso, setEnCurso] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    tipo_paro_id: atraso?.tipo_paro_id || '',
    fecha: atraso?.fecha || dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    hora_inicio: atraso?.hora_inicio?.slice(0, 5) || '',
    hora_fin: atraso?.hora_fin?.slice(0, 5) || '',
    observaciones: atraso?.observaciones || ''
  })

  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  useEffect(() => {
    if (atraso) {
      const tipo = tiposParo.find(t => t.id === atraso.tipo_paro_id)
      setTipoSeleccionado(tipo)
      
      if (tipo) {
        const grupo = TIPOS_PARO_CONFIG[tipo.nombre]?.grupo || 'ALMAPAC'
        setGrupoSeleccionado(grupo)
      }
      setPaso(2)
    }
  }, [atraso, tiposParo, TIPOS_PARO_CONFIG])

  useEffect(() => {
    let interval
    if (enCurso) interval = setInterval(() => setTiempoTranscurrido(prev => prev + 1), 60000)
    return () => clearInterval(interval)
  }, [enCurso])

  const seleccionarGrupo = (grupo) => {
    setGrupoSeleccionado(grupo)
  }

  const seleccionarTipo = (tipo) => {
    setTipoSeleccionado(tipo)
    setFormData(prev => ({ ...prev, tipo_paro_id: tipo.id }))
    setPaso(2)
  }

  const volverAGrupos = () => {
    setGrupoSeleccionado(null)
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
    e.preventDefault(); setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      if (!formData.hora_inicio) { toast.error('Ingresa hora de inicio'); return }
      if (!formData.tipo_paro_id) { toast.error('Selecciona un tipo de paro'); return }

      const duracion = formData.hora_fin ? calcularDuracion(formData.hora_inicio, formData.hora_fin) : null
      const datos = {
        barco_id: barco.id, 
        tipo_paro_id: parseInt(formData.tipo_paro_id),
        fecha: formData.fecha, 
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null, 
        duracion_minutos: duracion,
        observaciones: formData.observaciones || null,
        created_by: user.id, 
        updated_by: user.id
      }

      const result = atraso
        ? await supabase.from('registro_atrasos').update(datos).eq('id', atraso.id)
        : await supabase.from('registro_atrasos').insert([datos])
      
      if (result.error) throw result.error
      toast.success(atraso ? 'Demora actualizada' : 'Demora registrada'); onSave()
    } catch (error) { 
      console.error('❌ Error:', error)
      toast.error(error.message) 
    } finally { setLoading(false) }
  }

  const tiposPorGrupo = {
    ALMAPAC: [],
    UPDP: []
  }

  tiposParo.forEach(tipo => {
    const grupo = TIPOS_PARO_CONFIG[tipo.nombre]?.grupo || 'ALMAPAC'
    if (grupo === 'UPDP') {
      tiposPorGrupo.UPDP.push(tipo)
    } else {
      tiposPorGrupo.ALMAPAC.push(tipo)
    }
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-black text-white">{atraso ? 'Editar Demora' : 'Nueva Demora'}</h2>
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">SELECCIONA EL TIPO DE PARO</p>
              
              {!grupoSeleccionado ? (
                <div className="space-y-2">
                  <button 
                    onClick={() => seleccionarGrupo('ALMAPAC')}
                    className="w-full p-4 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400 text-lg">📦</span>
                      </div>
                      <span className="font-bold text-white">PAROS ALMAPAC</span>
                      {tiposPorGrupo.ALMAPAC.length > 0 && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                          {tiposPorGrupo.ALMAPAC.length}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
                  </button>

                  <button 
                    onClick={() => seleccionarGrupo('UPDP')}
                    className="w-full p-4 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 text-lg">⚡</span>
                      </div>
                      <span className="font-bold text-white">PAROS UPDP</span>
                      {tiposPorGrupo.UPDP.length > 0 && (
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                          {tiposPorGrupo.UPDP.length}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
                  </button>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={volverAGrupos}
                    className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-medium mb-4"
                  >
                    ← Volver a grupos
                  </button>

                  <h3 className="text-sm font-bold mb-3 px-1" style={{
                    color: grupoSeleccionado === 'ALMAPAC' ? '#60a5fa' : '#4ade80'
                  }}>
                    {grupoSeleccionado === 'ALMAPAC' ? '📦 PAROS ALMAPAC' : '⚡ PAROS UPDP'}
                  </h3>

                  {tiposPorGrupo[grupoSeleccionado].length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                      {tiposPorGrupo[grupoSeleccionado].map(tipo => {
                        const config = TIPOS_PARO_CONFIG[tipo.nombre] || {
                          bg: 'bg-gray-500/10', 
                          icono: <AlertTriangle className="w-4 h-4 text-gray-400" />,
                          text: 'text-gray-400'
                        }
                        return (
                          <button key={tipo.id} onClick={() => seleccionarTipo(tipo)}
                            className="p-3 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center gap-3 transition-all"
                          >
                            <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                              <span className={config.text}>{config.icono}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-white text-sm">{tipo.nombre}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No hay tipos de paro en este grupo</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button type="button" onClick={() => { setPaso(1); setTipoSeleccionado(null); setGrupoSeleccionado(null); }}
                className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-medium">
                ← Volver a tipos
              </button>

              <div className="bg-slate-900 rounded-xl p-3 border border-orange-500/20">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tipo seleccionado</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {tipoSeleccionado && (
                    <>
                      {TIPOS_PARO_CONFIG[tipoSeleccionado.nombre] && (
                        <span className={TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].text}>
                          {TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].icono}
                        </span>
                      )}
                      <span className="font-bold text-white text-sm">{tipoSeleccionado.nombre}</span>
                    </>
                  )}
                  {grupoSeleccionado && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-slate-300 ml-auto">
                      {grupoSeleccionado}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
                <input type="date" value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
                  <div className="flex gap-2">
                    <input type="time" value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                    <button type="button"
                      onClick={() => { 
                        setFormData(prev => ({ 
                          ...prev, 
                          hora_inicio: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') 
                        })); 
                        setEnCurso(true) 
                      }}
                      className="px-2.5 py-2.5 rounded-xl flex-shrink-0 bg-green-500/20 hover:bg-green-500/30 text-green-400"
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
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" />
                    <button type="button"
                      onClick={() => { 
                        setFormData(prev => ({ 
                          ...prev, 
                          hora_fin: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') 
                        })); 
                        setEnCurso(false) 
                      }}
                      className="px-2.5 py-2.5 rounded-xl flex-shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                      title="Ahora">
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {enCurso && (
                <div className="bg-blue-500/10 border-blue-500/20 text-blue-400 border rounded-xl p-3 flex items-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  <p className="text-xs">En curso · {Math.floor(tiempoTranscurrido / 60)}h {tiempoTranscurrido % 60}m</p>
                </div>
              )}

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
// TARJETA DE DEMORA
// =====================================================
const DemoraCard = ({ reg, tiposParo, onEditar, onEliminar }) => {
  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {
    bg: 'bg-slate-800', icono: <AlertTriangle className="w-4 h-4 text-slate-400" />, border: 'border-slate-700', text: 'text-slate-400'
  }
  const grupo = config.grupo || 'ALMAPAC'

  let grupoColor = 'bg-blue-500/20 text-blue-400'
  if (grupo === 'UPDP') grupoColor = 'bg-green-500/20 text-green-400'

  return (
    <div className="bg-slate-900 rounded-xl border-2 border-white/10 hover:border-orange-500/40 transition-all overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${config.bg} flex-shrink-0`}>
            <span className={config.text}>{config.icono}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-snug">{tipo?.nombre || 'Desconocido'}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${grupoColor}`}>{grupo}</span>
              <span className="text-[10px] text-slate-400">{reg.fecha}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEditar(reg)}
              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
              title="Editar">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEliminar(reg.id)}
              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
              title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-2 mb-3">
          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="font-mono text-sm text-white">{reg.hora_inicio?.slice(0, 5)}</span>
          {reg.hora_fin ? (
            <>
              <span className="text-slate-600">→</span>
              <span className="font-mono text-sm text-white">{reg.hora_fin?.slice(0, 5)}</span>
              <span className="ml-auto font-bold text-xs text-orange-400">
                {Math.floor((reg.duracion_minutos || 0) / 60)}h {(reg.duracion_minutos || 0) % 60}m
              </span>
            </>
          ) : (
            <span className="ml-auto text-xs font-medium animate-pulse text-blue-400">En curso</span>
          )}
        </div>

        {reg.observaciones && (
          <p className="text-xs text-slate-400 italic bg-slate-800/40 rounded-lg px-3 py-2 border-l-2 border-slate-600">
            {reg.observaciones}
          </p>
        )}
      </div>
    </div>
  )
}

// =====================================================
// DASHBOARD DE DEMORAS
// =====================================================
const DashboardDemoras = ({ barco, registros, tiposParo, onClose }) => {
  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  const grupos = {
    ALMAPAC: registros.filter(r => {
      const tipo = tiposParo.find(t => t.id === r.tipo_paro_id)
      const grupo = TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo
      return grupo === 'ALMAPAC' || !grupo
    }),
    UPDP: registros.filter(r => {
      const tipo = tiposParo.find(t => t.id === r.tipo_paro_id)
      return TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo === 'UPDP'
    })
  }

  const totalesGrupo = {}
  Object.keys(grupos).forEach(grupo => {
    totalesGrupo[grupo] = grupos[grupo].reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
  })

  const totalGeneral = Object.values(totalesGrupo).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-black text-white">Dashboard de Demoras</h2>
                <p className="text-purple-200 text-xs">{barco.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">Total Demoras</p>
              <p className="text-xl font-black text-white mt-1">{registros.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">Tiempo Total</p>
              <p className="text-xl font-black text-white mt-1">
                {Math.floor(totalGeneral / 60)}h {totalGeneral % 60}m
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">En curso</p>
              <p className="text-xl font-black text-white mt-1">
                {registros.filter(r => !r.hora_fin).length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
            <h3 className="font-bold text-white mb-3 text-xs uppercase tracking-wide">Distribución por Grupo</h3>
            <div className="space-y-3">
              {Object.keys(grupos).map(grupo => {
                let color = 'bg-blue-500', textColor = 'text-blue-400'
                if (grupo === 'UPDP') { color = 'bg-green-500'; textColor = 'text-green-400' }

                return (
                  <div key={grupo}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{grupo}</span>
                      <span className={`font-bold ${textColor}`}>
                        {Math.floor(totalesGrupo[grupo] / 60)}h {totalesGrupo[grupo] % 60}m
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: totalGeneral > 0 ? `${(totalesGrupo[grupo] / totalGeneral) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {Object.keys(grupos).map(grupo => {
            if (grupos[grupo].length === 0) return null

            let headerColor = 'bg-blue-500/10 text-blue-400'
            if (grupo === 'UPDP') headerColor = 'bg-green-500/10 text-green-400'

            return (
              <div key={grupo} className="bg-slate-900 rounded-xl overflow-hidden border border-white/10">
                <div className={`${headerColor} px-4 py-3 border-b border-white/10 flex items-center gap-2`}>
                  <h3 className="font-bold text-xs">{grupo}</h3>
                  <span className="text-xs ml-auto">{grupos[grupo].length} demoras</span>
                </div>
                <div className="p-4 space-y-3">
                  {grupos[grupo].map(reg => {
                    const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
                    const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {}
                    return (
                      <div key={reg.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={config.text || 'text-slate-400'}>{config.icono}</span>
                            <span className="text-xs text-white">{tipo?.nombre}</span>
                          </div>
                          <span className="text-xs text-orange-400 font-bold">
                            {reg.duracion_minutos ? `${Math.floor(reg.duracion_minutos / 60)}h ${reg.duracion_minutos % 60}m` : 'En curso'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {reg.fecha} {reg.hora_inicio} {reg.hora_fin && `→ ${reg.hora_fin}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {registros.length === 0 && (
            <div className="bg-slate-900 rounded-xl p-10 text-center">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No hay demoras registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function ExportacionPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [productos, setProductos] = useState([])
  const [exportaciones, setExportaciones] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [tiposParo, setTiposParo] = useState([])
  const [registrosDemoras, setRegistrosDemoras] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [user, setUser] = useState(null)
  
  const [showDemoraModal, setShowDemoraModal] = useState(false)
  const [showDemorasDashboard, setShowDemorasDashboard] = useState(false)
  const [demoraEditando, setDemoraEditando] = useState(null)
  
  const [nuevaExportacion, setNuevaExportacion] = useState({
    fecha_hora: '',
    acumulado_tm: '',
    bodega_id: '',
    observaciones: ''
  })

  const [bitacoraActual, setBitacoraActual] = useState({
    fecha_hora: '',
    comentarios: ''
  })

  const [editandoExportacion, setEditandoExportacion] = useState(null)
  const [editandoBitacora, setEditandoBitacora] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    cargarDatos()
  }, [token])

  useEffect(() => {
    if (productos.length > 0 && !productoActivo) {
      setProductoActivo(productos[0])
      setNuevaExportacion(prev => ({
        ...prev,
        fecha_hora: getCurrentSVTimeForInput()
      }))
    }
  }, [productos])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*, tiempo_arribo, tiempo_ataque, tiempo_recibido, tiempo_arribo_editado, tiempo_ataque_editado, tiempo_recibido_editado, operacion_iniciada_at, operacion_finalizada_at, operacion_iniciada_por, operacion_finalizada_por, operacion_motivo_finalizacion, operacion_iniciada_editado, operacion_finalizada_editado')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        toast.error('Link inválido')
        return
      }

      setBarco(barcoData)

      const { data: tiposParoData } = await supabase
        .from('tipos_paro')
        .select('*')
        .eq('activo', true)
        .order('orden')
      setTiposParo(tiposParoData || [])

      const { data: demorasData } = await supabase
        .from('registro_atrasos')
        .select(`*, tipo_paro:tipos_paro(*)`)
        .eq('barco_id', barcoData.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      setRegistrosDemoras(demorasData || [])

      const productosBarco = barcoData.metas_json?.productos || []
      
      if (productosBarco.length === 0) {
        toast.error('Este barco no tiene productos configurados')
        setProductos([])
      } else {
        const { data: productosData } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', true)
          .in('codigo', productosBarco)

        setProductos(productosData || [])
      }

      const { data: exportData } = await supabase
        .from('exportacion_banda')
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono)
        `)
        .eq('barco_id', barcoData.id)
        .order('fecha_hora', { ascending: false })

      setExportaciones(exportData || [])

      const { data: bitacoraData } = await supabase
        .from('bitacora_exportacion')
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono)
        `)
        .eq('barco_id', barcoData.id)
        .order('fecha_hora', { ascending: false })

      setBitacora(bitacoraData || [])

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleNuevaDemora = () => {
    // ELIMINADA la validación de estado finalizado
    // if (barco.estado === 'finalizado') {
    //   toast.error('Operación finalizada')
    //   return
    // }
    setDemoraEditando(null)
    setShowDemoraModal(true)
  }

  const handleEditarDemora = (demora) => {
    // ELIMINADA la validación de estado finalizado
    // if (barco.estado === 'finalizado') {
    //   toast.error('Operación finalizada')
    //   return
    // }
    setDemoraEditando(demora)
    setShowDemoraModal(true)
  }

  const handleEliminarDemora = async (id) => {
    // ELIMINADA la validación de estado finalizado
    // if (barco.estado === 'finalizado') {
    //   toast.error('Operación finalizada')
    //   return
    // }
    if (!confirm('¿Eliminar esta demora?')) return
    try {
      const { error } = await supabase.from('registro_atrasos').delete().eq('id', id)
      if (error) throw error
      toast.success('Demora eliminada')
      await cargarDatos()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleGuardarDemora = async () => {
    setShowDemoraModal(false)
    await cargarDatos()
  }

  const estadisticasProducto = useMemo(() => {
    if (!productoActivo) return null

    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
    
    if (exportacionesProd.length === 0) {
      return {
        totalTM: 0,
        lecturas: 0,
        primeraLectura: null,
        ultimaLectura: null,
        flujoPromedio: 0
      }
    }

    const ordenadas = [...exportacionesProd].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    )

    const ultimoRegistro = ordenadas[ordenadas.length - 1]
    const totalGeneral = Number(ultimoRegistro.acumulado_tm) || 0

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const horasTranscurridas = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
    const flujoPromedio = horasTranscurridas > 0 ? totalGeneral / horasTranscurridas : 0

    return {
      totalTM: totalGeneral,
      lecturas: exportacionesProd.length,
      primeraLectura: primera,
      ultimaLectura: ultima,
      flujoPromedio
    }
  }, [exportaciones, productoActivo])

  const calcularFlujoBandaPorHora = useMemo(() => {
    if (!productoActivo) return 0

    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)

    if (exportacionesProd.length < 2) return 0

    const ordenadas = [...exportacionesProd].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    )

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const diferenciaHoras =
      (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)

    if (diferenciaHoras <= 0) return 0

    const acumuladoInicial = Number(primera.acumulado_tm) || 0
    const acumuladoFinal = Number(ultima.acumulado_tm) || 0

    const deltaAcumulado = acumuladoFinal - acumuladoInicial

    if (deltaAcumulado <= 0) return 0

    return deltaAcumulado / diferenciaHoras
  }, [exportaciones, productoActivo])

  const datosGraficoFlujo = useMemo(() => {
    if (!productoActivo) return []

    const exportacionesProd = exportaciones
      .filter(e => e.producto_id === productoActivo.id)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))

    const puntos = []
    
    exportacionesProd.forEach(exp => {
      const bodega = BODEGAS_BARCO.find(b => b.id === exp.bodega_id)
      puntos.push({
        hora: formatUTCToSV(exp.fecha_hora, 'DD/MM HH:mm'),
        acumulado: Number(exp.acumulado_tm) || 0,
        bodega: bodega?.nombre || '—',
        timestamp: new Date(exp.fecha_hora).getTime()
      })
    })

    return puntos
  }, [exportaciones, productoActivo])

  const resumenPorBodega = useMemo(() => {
  if (!productoActivo) return []

  const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
  
  // Ordenar todas las exportaciones por fecha
  const todasOrdenadas = [...exportacionesProd].sort(
    (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
  )
  
  if (todasOrdenadas.length === 0) return []
  
  const resultado = []
  const bodegasMap = new Map()
  
  // Variable para rastrear el período actual
  let bodegaActual = null
  let inicioPeriodo = null
  let acumuladoInicio = 0
  let lecturasPeriodo = []
  
  // Recorrer todas las lecturas en orden
  todasOrdenadas.forEach((exp, index) => {
    const bodegaId = exp.bodega_id
    
    if (bodegaId !== bodegaActual) {
      // Si hay una bodega anterior, guardar su período
      if (bodegaActual !== null && inicioPeriodo !== null) {
        const expAnterior = todasOrdenadas[index - 1]
        if (expAnterior) {
          const totalPeriodo = Number(expAnterior.acumulado_tm) - acumuladoInicio
          
          if (!bodegasMap.has(bodegaActual)) {
            bodegasMap.set(bodegaActual, {
              bodega_id: bodegaActual,
              lecturas: [],
              totalCargado: 0,
              fechaInicio: inicioPeriodo,
              fechaFin: expAnterior.fecha_hora
            })
          }
          
          const bodegaData = bodegasMap.get(bodegaActual)
          bodegaData.lecturas.push(...lecturasPeriodo)
          bodegaData.totalCargado += totalPeriodo
        }
      }
      
      // Iniciar nuevo período
      bodegaActual = bodegaId
      inicioPeriodo = exp.fecha_hora
      acumuladoInicio = Number(exp.acumulado_tm)
      lecturasPeriodo = [exp]
    } else {
      // Misma bodega, agregar lectura al período actual
      lecturasPeriodo.push(exp)
    }
  })
  
  // Procesar el último período
  if (bodegaActual !== null && inicioPeriodo !== null && lecturasPeriodo.length > 0) {
    const ultimaExp = lecturasPeriodo[lecturasPeriodo.length - 1]
    const totalPeriodo = Number(ultimaExp.acumulado_tm) - acumuladoInicio
    
    if (!bodegasMap.has(bodegaActual)) {
      bodegasMap.set(bodegaActual, {
        bodega_id: bodegaActual,
        lecturas: [],
        totalCargado: 0,
        fechaInicio: inicioPeriodo,
        fechaFin: ultimaExp.fecha_hora
      })
    }
    
    const bodegaData = bodegasMap.get(bodegaActual)
    bodegaData.lecturas.push(...lecturasPeriodo)
    bodegaData.totalCargado += totalPeriodo
  }
  
  // Convertir Map a array
  bodegasMap.forEach((data, bodegaId) => {
    resultado.push({
      bodega_id: parseInt(bodegaId),
      nombre: BODEGAS_BARCO.find(b => b.id === parseInt(bodegaId))?.nombre || `Bodega ${bodegaId}`,
      codigo: BODEGAS_BARCO.find(b => b.id === parseInt(bodegaId))?.codigo || `BDG-${bodegaId}`,
      totalCargado: data.totalCargado,
      lecturas: data.lecturas.length,
      primeraLectura: data.lecturas[0],
      ultimaLectura: data.lecturas[data.lecturas.length - 1],
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin
    })
  })
  
  return resultado.sort((a, b) => b.totalCargado - a.totalCargado)
}, [exportaciones, productoActivo])

  const totalGeneral = useMemo(() => {
    if (!productoActivo) return 0
    
    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
    
    if (exportacionesProd.length === 0) return 0
    
    const ordenadas = [...exportacionesProd].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    )
    
    const ultimoRegistro = ordenadas[ordenadas.length - 1]
    return Number(ultimoRegistro.acumulado_tm) || 0
  }, [exportaciones, productoActivo])

  // NUEVO: Calcular cuánto falta por cargar
  const faltaPorCargar = useMemo(() => {
    if (!productoActivo || !barco?.metas_json?.limites?.[productoActivo.codigo]) return 0
    
    const limite = barco.metas_json.limites[productoActivo.codigo]
    const cargado = totalGeneral
    
    return Math.max(0, limite - cargado)
  }, [productoActivo, barco, totalGeneral])

  const cambiarProducto = (producto) => {
    setProductoActivo(producto)
    setNuevaExportacion({
      fecha_hora: getCurrentSVTimeForInput(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getCurrentSVTimeForInput(),
      comentarios: ''
    })
    setEditandoExportacion(null)
    setEditandoBitacora(null)
  }

  const handleExportacionChange = (e) => {
    const { name, value } = e.target
    setNuevaExportacion(prev => ({ ...prev, [name]: value }))
  }

  const handleBitacoraChange = (e) => {
    const { name, value } = e.target
    setBitacoraActual(prev => ({ ...prev, [name]: value }))
  }

  const handleGuardarExportacion = async () => {
    try {
      // ELIMINADA la validación de estado finalizado
      // if (barco.estado === 'finalizado') {
      //   toast.error('Operación finalizada')
      //   return
      // }

      if (!productoActivo) {
        toast.error('Selecciona un producto')
        return
      }

      if (!nuevaExportacion.acumulado_tm) {
        toast.error('Ingresa el acumulado')
        return
      }

      if (!nuevaExportacion.bodega_id) {
        toast.error('Selecciona una bodega')
        return
      }

      if (!nuevaExportacion.fecha_hora) {
        toast.error('Ingresa fecha y hora')
        return
      }

      // Convertir hora de El Salvador a UTC antes de guardar
      const fechaUTC = svToUTC(nuevaExportacion.fecha_hora)

      const datos = {
        barco_id: barco.id,
        fecha_hora: fechaUTC,
        producto_id: productoActivo.id,
        acumulado_tm: parseFloat(nuevaExportacion.acumulado_tm),
        bodega_id: parseInt(nuevaExportacion.bodega_id),
        observaciones: nuevaExportacion.observaciones || null,
        created_by: user?.id || null
      }

      let result

      if (editandoExportacion) {
        result = await supabase
          .from('exportacion_banda')
          .update(datos)
          .eq('id', editandoExportacion.id)

        if (!result.error) {
          toast.success('Exportación actualizada')
          setEditandoExportacion(null)
        }
      } else {
        result = await supabase
          .from('exportacion_banda')
          .insert([datos])

        if (!result.error) {
          toast.success('Exportación registrada')
        }
      }

      if (result.error) {
        console.error('Error:', result.error)
        toast.error(`Error: ${result.error.message}`)
        return
      }

      setNuevaExportacion({
        fecha_hora: getCurrentSVTimeForInput(),
        acumulado_tm: '',
        bodega_id: '',
        observaciones: ''
      })

      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  const handleGuardarBitacora = async () => {
    try {
      // ELIMINADA la validación de estado finalizado
      // if (barco.estado === 'finalizado') {
      //   toast.error('Operación finalizada')
      //   return
      // }

      if (!productoActivo) {
        toast.error('Selecciona un producto')
        return
      }

      if (!bitacoraActual.fecha_hora) {
        toast.error('Ingresa fecha y hora')
        return
      }

      // Convertir hora de El Salvador a UTC antes de guardar
      const fechaUTC = svToUTC(bitacoraActual.fecha_hora)

      const datos = {
        barco_id: barco.id,
        fecha_hora: fechaUTC,
        producto_id: productoActivo.id,
        comentarios: bitacoraActual.comentarios || null,
        created_by: user?.id || null
      }

      let result

      if (editandoBitacora) {
        result = await supabase
          .from('bitacora_exportacion')
          .update(datos)
          .eq('id', editandoBitacora.id)

        if (!result.error) {
          toast.success('Bitácora actualizada')
          setEditandoBitacora(null)
        }
      } else {
        result = await supabase
          .from('bitacora_exportacion')
          .insert([datos])

        if (!result.error) {
          toast.success('Registro guardado en bitácora')
        }
      }

      if (result.error) {
        console.error('Error:', result.error)
        toast.error(`Error: ${result.error.message}`)
        return
      }

      setBitacoraActual({
        fecha_hora: getCurrentSVTimeForInput(),
        comentarios: ''
      })

      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  const handleEditarExportacion = (exp) => {
    setEditandoExportacion(exp)
    // Para editar, convertimos UTC de vuelta a El Salvador
    setNuevaExportacion({
      fecha_hora: formatUTCToSV(exp.fecha_hora, 'YYYY-MM-DDTHH:mm'),
      acumulado_tm: exp.acumulado_tm,
      bodega_id: exp.bodega_id || '',
      observaciones: exp.observaciones || ''
    })
  }

  const handleEditarBitacora = (reg) => {
    setEditandoBitacora(reg)
    setBitacoraActual({
      fecha_hora: formatUTCToSV(reg.fecha_hora, 'YYYY-MM-DDTHH:mm'),
      comentarios: reg.comentarios || ''
    })
  }

  const handleEliminarExportacion = async (id) => {
    if (!confirm('¿Eliminar este registro de exportación?')) return

    try {
      const { error } = await supabase
        .from('exportacion_banda')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Registro eliminado')
      await cargarDatos()
      
      if (editandoExportacion?.id === id) {
        setEditandoExportacion(null)
        setNuevaExportacion({
          fecha_hora: getCurrentSVTimeForInput(),
          acumulado_tm: '',
          bodega_id: '',
          observaciones: ''
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleEliminarBitacora = async (id) => {
    if (!confirm('¿Eliminar este registro de bitácora?')) return

    try {
      const { error } = await supabase
        .from('bitacora_exportacion')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Registro eliminado')
      await cargarDatos()
      
      if (editandoBitacora?.id === id) {
        setEditandoBitacora(null)
        setBitacoraActual({
          fecha_hora: getCurrentSVTimeForInput(),
          comentarios: ''
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const cancelarEdicion = () => {
    setEditandoExportacion(null)
    setEditandoBitacora(null)
    setNuevaExportacion({
      fecha_hora: getCurrentSVTimeForInput(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getCurrentSVTimeForInput(),
      comentarios: ''
    })
  }

  // SOLO PARA MOSTRAR - Ya no bloqueamos el registro, solo mostramos una advertencia
  const puedeRegistrar = true // Siempre true ahora

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">El link no es válido</p>
        </div>
      </div>
    )
  }

  if (barco.tipo_operacion !== 'exportacion') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-8 text-center max-w-md">
          <Ship className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Operación Incorrecta</h1>
          <p className="text-slate-400 mb-4">Este barco está configurado como IMPORTACIÓN</p>
          <p className="text-xs text-yellow-500">Usa la ruta de importación para registrar viajes</p>
        </div>
      </div>
    )
  }

  const exportacionesFiltradas = exportaciones.filter(e => e.producto_id === productoActivo?.id)
  const bitacoraFiltrada = bitacora.filter(b => b.producto_id === productoActivo?.id)

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Ship className="w-8 h-8" />
                  {barco.nombre} - EXPORTACIÓN
                </h1>
                {barco.codigo_barco && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
                    {barco.codigo_barco}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  barco.estado === 'activo' 
                    ? 'bg-green-500/20 text-green-400' 
                    : barco.estado === 'finalizado'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {barco.estado === 'activo' && <Play className="w-3 h-3" />}
                  {barco.estado === 'finalizado' && <Lock className="w-3 h-3" />}
                  {barco.estado === 'planeado' && <Clock className="w-3 h-3" />}
                  {barco.estado.toUpperCase()}
                </span>
              </div>
              <p className="text-blue-200 text-sm mt-1">
                Registro de Carga a Bodega del Barco por Banda · {formatUTCToSV(new Date(), 'DD/MM/YYYY')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 ${
              barco.operacion_iniciada_at 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-yellow-500/20 border border-yellow-500/30 animate-pulse'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  barco.operacion_iniciada_at ? 'bg-green-500/30' : 'bg-yellow-500/30'
                }`}>
                  <Play className={`w-5 h-5 ${
                    barco.operacion_iniciada_at ? 'text-green-400' : 'text-yellow-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">INICIO DE CARGA</p>
                    {!barco.operacion_iniciada_at && (
                      <span className="text-[10px] bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                        PENDIENTE
                      </span>
                    )}
                  </div>
                  {barco.operacion_iniciada_at ? (
                    <div>
                      <p className="text-lg font-black text-green-400">
                        {formatUTCToSV(barco.operacion_iniciada_at, 'DD/MM/YY HH:mm')}
                      </p>
                      {barco.operacion_iniciada_por && (
                        <p className="text-xs text-green-300">
                          Iniciado por: ID {barco.operacion_iniciada_por}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-400 font-medium">
                      La carga aún no ha iniciado
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              barco.operacion_finalizada_at 
                ? 'bg-red-500/20 border border-red-500/30' 
                : barco.operacion_iniciada_at && !barco.operacion_finalizada_at
                ? 'bg-blue-500/20 border border-blue-500/30'
                : 'bg-slate-700/50 border border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  barco.operacion_finalizada_at ? 'bg-red-500/30' 
                  : barco.operacion_iniciada_at && !barco.operacion_finalizada_at ? 'bg-blue-500/30'
                  : 'bg-slate-600'
                }`}>
                  <StopCircle className={`w-5 h-5 ${
                    barco.operacion_finalizada_at ? 'text-red-400' 
                    : barco.operacion_iniciada_at && !barco.operacion_finalizada_at ? 'text-blue-400'
                    : 'text-slate-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">FIN DE CARGA</p>
                    {barco.operacion_finalizada_at && (
                      <span className="text-[10px] bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        FINALIZADO
                      </span>
                    )}
                    {!barco.operacion_finalizada_at && barco.operacion_iniciada_at && (
                      <span className="text-[10px] bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        EN CURSO
                      </span>
                    )}
                  </div>
                  {barco.operacion_finalizada_at ? (
                    <div>
                      <p className="text-lg font-black text-red-400">
                        {formatUTCToSV(barco.operacion_finalizada_at, 'DD/MM/YY HH:mm')}
                      </p>
                      {barco.operacion_motivo_finalizacion && (
                        <p className="text-xs text-red-300 mt-1">
                          Motivo: {barco.operacion_motivo_finalizacion}
                        </p>
                      )}
                    </div>
                  ) : barco.operacion_iniciada_at ? (
                    <p className="text-blue-400 font-medium">
                      Carga en progreso...
                    </p>
                  ) : (
                    <p className="text-slate-400 font-medium">
                      Esperando inicio de carga
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CAMBIADO: Ahora es solo una advertencia, no bloquea */}
        {barco.estado === 'finalizado' && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <p className="text-orange-400 font-medium">
                ⚠️ Operación finalizada - Puedes agregar datos adicionales si es necesario
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleNuevaDemora}
            className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all bg-orange-500 hover:bg-orange-600 text-white`}
          >
            <Clock className="w-4 h-4" />
            Registrar Demora
          </button>
          <button
            onClick={() => setShowDemorasDashboard(true)}
            className="px-4 py-3 rounded-xl font-bold flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Ver Dashboard de Demoras
            {registrosDemoras.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {registrosDemoras.length}
              </span>
            )}
          </button>
        </div>

        {registrosDemoras.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Demoras Recientes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {registrosDemoras.slice(0, 3).map(reg => (
                <DemoraCard
                  key={reg.id}
                  reg={reg}
                  tiposParo={tiposParo}
                  onEditar={handleEditarDemora}
                  onEliminar={handleEliminarDemora}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex overflow-x-auto">
            {productos.map(prod => {
              const activo = productoActivo?.id === prod.id
              
              return (
                <button
                  key={prod.id}
                  onClick={() => cambiarProducto(prod)}
                  className={`flex-1 min-w-[200px] px-6 py-4 border-b-2 transition-all ${
                    activo 
                      ? `border-blue-500 bg-blue-500/10` 
                      : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{prod.icono}</span>
                    <div className="text-left">
                      <p className={`font-bold ${activo ? 'text-white' : 'text-slate-400'}`}>
                        {prod.nombre}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">{prod.codigo}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {productoActivo && estadisticasProducto && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{productoActivo.icono}</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">{productoActivo.nombre}</h2>
                  <p className="text-slate-400 flex items-center gap-2">
                    {productoActivo.codigo} · Carga a Bodega del Barco
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">
                  {estadisticasProducto.totalTM.toFixed(3)} TM
                </p>
                <div className="flex gap-3 text-sm text-slate-400">
                  <span>📊 {estadisticasProducto.lecturas} lecturas</span>
                  <span>🏭 {resumenPorBodega.length} bodegas</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
              {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
                <>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Cantidad a Cargar</p>
                    <p className="text-xl font-bold text-white">
                      {barco.metas_json.limites[productoActivo.codigo].toFixed(3)} TM
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Cargado</p>
                    <p className="text-xl font-bold text-blue-400">
                      {estadisticasProducto.totalTM.toFixed(3)} TM
                    </p>
                  </div>
                  
                  {/* NUEVO: CUÁNTO FALTA POR CARGAR */}
                  <div className="bg-slate-900 rounded-xl p-4 border-2 border-orange-500/20">
                    <p className="text-xs text-slate-500">FALTA POR CARGAR</p>
                    <p className="text-2xl font-black text-orange-400">
                      {faltaPorCargar.toFixed(3)} TM
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {((estadisticasProducto.totalTM / barco.metas_json.limites[productoActivo.codigo]) * 100).toFixed(1)}% completado
                    </p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-xl p-4 col-span-1">
                    <p className="text-xs text-slate-500">Progreso</p>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-green-400">
                            {((estadisticasProducto.totalTM / barco.metas_json.limites[productoActivo.codigo]) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-700">
                        <div
                          style={{ width: `${Math.min(100, (estadisticasProducto.totalTM / barco.metas_json.limites[productoActivo.codigo]) * 100)}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-green-400"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 col-span-2">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-200" />
                  <div>
                    <p className="text-xs text-blue-200 uppercase font-bold">FLUJO PROMEDIO POR HORA</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {calcularFlujoBandaPorHora.toFixed(3)}
                      </span>
                      <span className="text-sm text-blue-200">TM/h</span>
                    </div>
                    {exportacionesFiltradas.length >= 2 && (
                      <p className="text-[10px] text-blue-300 mt-1">
                        {(() => {
                          const ordenadas = [...exportacionesFiltradas].sort(
                            (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
                          )
                          const primera = ordenadas[0]
                          const ultima = ordenadas[ordenadas.length - 1]
                          const horas = ((new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)).toFixed(1)
                          return `En ${horas} horas`
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* NUEVO: BARRA DE PROGRESO GRANDE si hay límite */}
            {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
              <div className="mt-4 bg-slate-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-white">Progreso de Carga</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400">
                      {estadisticasProducto.totalTM.toFixed(1)} TM cargadas
                    </span>
                    <span className="text-xs text-orange-400 font-bold">
                      {faltaPorCargar.toFixed(1)} TM por cargar
                    </span>
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (estadisticasProducto.totalTM / barco.metas_json.limites[productoActivo.codigo]) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0 TM</span>
                  <span>{barco.metas_json.limites[productoActivo.codigo].toFixed(1)} TM</span>
                </div>
              </div>
            )}
          </div>
        )}

        {productoActivo && datosGraficoFlujo.length > 1 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Tendencia de Carga - {productoActivo.nombre}
              <span className="text-sm font-normal text-slate-500 ml-2">
                Flujo promedio: {calcularFlujoBandaPorHora.toFixed(3)} TM/h
              </span>
            </h3>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={datosGraficoFlujo} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hora" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="acumulado" 
                    stroke="#3b82f6" 
                    name="Acumulado Total (TM)" 
                    dot={{ r: 4, fill: '#3b82f6' }}
                    strokeWidth={2}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500">Primera lectura</p>
                <p className="text-sm font-bold text-white">
                  {datosGraficoFlujo[0]?.hora}
                </p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500">Última lectura</p>
                <p className="text-sm font-bold text-white">
                  {datosGraficoFlujo[datosGraficoFlujo.length - 1]?.hora}
                </p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500">Total acumulado</p>
                <p className="text-lg font-bold text-blue-400">
                  {datosGraficoFlujo[datosGraficoFlujo.length - 1]?.acumulado.toFixed(3)} TM
                </p>
              </div>
            </div>

            {/* NUEVO: Mostrar falta por cargar en el gráfico si hay límite */}
            {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
              <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <span className="text-sm text-slate-300">Meta:</span>
                    <span className="font-bold text-white">
                      {barco.metas_json.limites[productoActivo.codigo].toFixed(3)} TM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">Falta:</span>
                    <span className="font-bold text-orange-400">
                      {faltaPorCargar.toFixed(3)} TM
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {productoActivo && resumenPorBodega.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-400" />
              Carga por Bodega del Barco
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenPorBodega.map(bodega => (
                <div key={bodega.bodega_id} className="bg-slate-900 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <Layers className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{bodega.nombre}</p>
                      <p className="text-xs text-green-400">{bodega.codigo}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total cargado:</span>
                      <span className="font-bold text-green-400">{bodega.totalCargado.toFixed(3)} TM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Lecturas:</span>
                      <span className="font-bold text-white">{bodega.lecturas}</span>
                    </div>
                    {bodega.ultimaLectura && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Última lectura:</span>
                        <span className="font-bold text-white">
                          {formatUTCToSV(bodega.ultimaLectura.fecha_hora, 'DD/MM HH:mm')}
                        </span>
                      </div>
                    )}
                    {bodega.lecturas > 1 && (
                      <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-white/10">
                        <p>Inicio: {formatUTCToSV(bodega.fechaInicio, 'DD/MM HH:mm')}</p>
                        <p>Fin: {formatUTCToSV(bodega.fechaFin, 'DD/MM HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            
          </div>
        )}

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-400" />
              {editandoExportacion ? 'Editar Registro de Carga' : 'Nuevo Registro de Carga'} - {productoActivo?.nombre}
            </h2>
            {editandoExportacion && (
              <button
                onClick={cancelarEdicion}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha y Hora (El Salvador)</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="fecha_hora"
                  value={nuevaExportacion.fecha_hora}
                  onChange={handleExportacionChange}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setNuevaExportacion(prev => ({ ...prev, fecha_hora: getCurrentSVTimeForInput() }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Acumulado (TM) *</label>
              <input
                type="number"
                step="0.001"
                name="acumulado_tm"
                value={nuevaExportacion.acumulado_tm}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="150.000"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega *</label>
              <select
                name="bodega_id"
                value={nuevaExportacion.bodega_id}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Seleccionar bodega</option>
                {BODEGAS_BARCO.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
              <input
                type="text"
                name="observaciones"
                value={nuevaExportacion.observaciones}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="Notas..."
              />
            </div>
            <div className="flex items-end col-span-full gap-2">
              <button
                onClick={handleGuardarExportacion}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                {editandoExportacion ? 'Actualizar Registro' : 'Guardar Carga'}
              </button>
              {editandoExportacion && (
                <button
                  onClick={() => handleEliminarExportacion(editandoExportacion.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {exportacionesFiltradas.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
              <h3 className="font-bold text-white">
                Historial de Carga - {productoActivo?.nombre} ({exportacionesFiltradas.length})
                <span className="text-sm font-normal text-slate-500 ml-2">
                  Flujo promedio: {calcularFlujoBandaPorHora.toFixed(3)} TM/h
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acumulado (TM)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Flujo (TM/h)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {exportacionesFiltradas.map((exp, index, array) => {
                    const bodega = BODEGAS_BARCO.find(b => b.id === exp.bodega_id)
                    
                    // Ordenar todas las lecturas por fecha para encontrar la anterior
                    const todasOrdenadas = [...exportacionesFiltradas].sort(
                      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
                    )
                    
                    const indiceGlobal = todasOrdenadas.findIndex(e => e.id === exp.id)
                    const lecturaAnterior = indiceGlobal > 0 ? todasOrdenadas[indiceGlobal - 1] : null
                    
                    let flujo = 0
                    let delta = 0
                    let tiempoHoras = 0
                    
                    if (lecturaAnterior) {
                      const tiempoMs = new Date(exp.fecha_hora) - new Date(lecturaAnterior.fecha_hora)
                      tiempoHoras = tiempoMs / (1000 * 60 * 60)
                      delta = Number(exp.acumulado_tm) - Number(lecturaAnterior.acumulado_tm)
                      
                      if (tiempoHoras > 0 && delta > 0) {
                        flujo = delta / tiempoHoras
                      }
                    }
                    
                    const cambioBodega = lecturaAnterior && lecturaAnterior.bodega_id !== exp.bodega_id
                    
                    // Mostrar la fecha convertida a El Salvador
                    const fechaSV = formatUTCToSV(exp.fecha_hora, 'DD/MM/YY HH:mm')
                    
                    return (
                      <tr key={exp.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">{fechaSV}</td>
                        <td className="px-4 py-3 font-bold text-blue-400">{exp.acumulado_tm?.toFixed(3)}</td>
                        <td className="px-4 py-3">
                          {flujo > 0 ? (
                            <div>
                              <span className="font-bold text-green-400">{flujo.toFixed(3)}</span>
                              {cambioBodega && (
                                <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                                  Cambio bodega
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 ml-1 block">
                                (+{delta.toFixed(3)} en {tiempoHoras.toFixed(1)}h)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {bodega ? (
                            <div>
                              <p className="text-white">{bodega.nombre}</p>
                              <p className="text-xs text-green-400">{bodega.codigo}</p>
                              {cambioBodega && lecturaAnterior && (
                                <p className="text-[10px] text-yellow-500 mt-1">
                                  ← {BODEGAS_BARCO.find(b => b.id === lecturaAnterior.bodega_id)?.nombre || '—'}
                                </p>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{exp.observaciones || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditarExportacion(exp)}
                              className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleEliminarExportacion(exp.id)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-900">
                  <tr>
                    <td className="px-4 py-3 font-bold text-white">TOTAL GENERAL (Último acumulado)</td>
                    <td className="px-4 py-3 font-bold text-blue-400">
                      {totalGeneral.toFixed(3)} TM
                    </td>
                    <td className="px-4 py-3 font-bold text-green-400">
                      {calcularFlujoBandaPorHora.toFixed(3)} TM/h
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                  {/* NUEVO: Fila con lo que falta por cargar */}
                  {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
                    <tr className="bg-orange-500/5">
                      <td className="px-4 py-3 font-bold text-orange-400">FALTA POR CARGAR</td>
                      <td className="px-4 py-3 font-bold text-orange-400">
                        {faltaPorCargar.toFixed(3)} TM
                      </td>
                      <td colSpan="4"></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Bitácora de Carga - {productoActivo?.nombre}
            </h2>
            {editandoBitacora && (
              <button
                onClick={cancelarEdicion}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Cancelar edición
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1">Fecha y Hora (El Salvador)</label>
              <input
                type="datetime-local"
                name="fecha_hora"
                value={bitacoraActual.fecha_hora}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setBitacoraActual(prev => ({ ...prev, fecha_hora: getCurrentSVTimeForInput() }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Comentarios</label>
              <input
                type="text"
                name="comentarios"
                value={bitacoraActual.comentarios}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="Comentarios..."
              />
            </div>
            <div className="flex gap-2 col-span-full">
              <button
                onClick={handleGuardarBitacora}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                {editandoBitacora ? 'Actualizar Bitácora' : 'Guardar en Bitácora'}
              </button>
              {editandoBitacora && (
                <button
                  onClick={() => handleEliminarBitacora(editandoBitacora.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>

          {bitacoraFiltrada.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Fecha/Hora</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Comentarios</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bitacoraFiltrada.map(reg => (
                    <tr key={reg.id} className="hover:bg-white/5">
                      <td className="px-4 py-2">{formatUTCToSV(reg.fecha_hora)}</td>
                      <td className="px-4 py-2 text-slate-400">{reg.comentarios || '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarBitacora(reg)}
                            className="p-1 hover:bg-blue-500/20 rounded"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleEliminarBitacora(reg.id)}
                            className="p-1 hover:bg-red-500/20 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDemoraModal && barco && (
        <AtrasoModal
          barco={barco}
          atraso={demoraEditando}
          tiposParo={tiposParo}
          onClose={() => setShowDemoraModal(false)}
          onSave={handleGuardarDemora}
        />
      )}

      {showDemorasDashboard && barco && (
        <DashboardDemoras
          barco={barco}
          registros={registrosDemoras}
          tiposParo={tiposParo}
          onClose={() => setShowDemorasDashboard(false)}
        />
      )}
    </div>
  )
}