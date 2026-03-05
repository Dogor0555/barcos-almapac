// app/registroatrasos/page.js - Módulo de atrasos con filtros por bodega en lista
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
  Package, History, MapPin, Box, Filter,
  Sun, Moon
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// =====================================================
// CONTEXTO DE TEMA (MODO OSCURO/CLARO)
// =====================================================
const useTheme = () => {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  return { theme, toggleTheme }
}

// =====================================================
// HELPER: colores de iconos adaptados al tema
// =====================================================
const getIconColor = (colorKey, theme) => {
  const darkMap = {
    red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400',
    blue: 'text-blue-400', purple: 'text-purple-400', green: 'text-green-400',
    gray: 'text-gray-400', sky: 'text-sky-400', indigo: 'text-indigo-400',
    amber: 'text-amber-400', emerald: 'text-emerald-400', cyan: 'text-cyan-400',
    rose: 'text-rose-400', pink: 'text-pink-400', teal: 'text-teal-400',
    lime: 'text-lime-400', stone: 'text-stone-400', violet: 'text-violet-400',
    fuchsia: 'text-fuchsia-400', slate: 'text-slate-400',
  }
  const lightMap = {
    red: 'text-red-600', orange: 'text-orange-600', yellow: 'text-yellow-600',
    blue: 'text-blue-600', purple: 'text-purple-600', green: 'text-green-600',
    gray: 'text-gray-600', sky: 'text-sky-600', indigo: 'text-indigo-600',
    amber: 'text-amber-600', emerald: 'text-emerald-600', cyan: 'text-cyan-600',
    rose: 'text-rose-600', pink: 'text-pink-600', teal: 'text-teal-600',
    lime: 'text-lime-600', stone: 'text-stone-600', violet: 'text-violet-600',
    fuchsia: 'text-fuchsia-600', slate: 'text-slate-600',
  }
  return theme === 'dark' ? darkMap[colorKey] : lightMap[colorKey]
}

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO
// =====================================================
const getTiposParoConfig = (theme) => ({
  'Desperfecto de grua del buque': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-100', text: theme === 'dark' ? 'text-red-400' : 'text-red-700', border: theme === 'dark' ? 'border-red-500/20' : 'border-red-300' },
  'Colocando almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-100', text: theme === 'dark' ? 'text-orange-400' : 'text-orange-700', border: theme === 'dark' ? 'border-orange-500/20' : 'border-orange-300' },
  'Falta de camiones (Unidades insuficientes por transportistas)': { icono: <Truck className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-100', text: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700', border: theme === 'dark' ? 'border-yellow-500/20' : 'border-yellow-300' },
  'Traslado de UCA a Almapac': { icono: <Truck className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100', text: theme === 'dark' ? 'text-blue-400' : 'text-blue-700', border: theme === 'dark' ? 'border-blue-500/20' : 'border-blue-300' },
  'Falla sistema UPDP': { icono: <Zap className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-100', text: theme === 'dark' ? 'text-purple-400' : 'text-purple-700', border: theme === 'dark' ? 'border-purple-500/20' : 'border-purple-300' },
  'Tiempo de comida': { icono: <Coffee className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-100', text: theme === 'dark' ? 'text-green-400' : 'text-green-700', border: theme === 'dark' ? 'border-green-500/20' : 'border-green-300' },
  'Cierre de bodegas': { icono: <Layers className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-200', text: theme === 'dark' ? 'text-gray-400' : 'text-gray-700', border: theme === 'dark' ? 'border-gray-500/20' : 'border-gray-400' },
  'Amenaza de lluvia': { icono: <CloudRain className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-sky-500/10' : 'bg-sky-100', text: theme === 'dark' ? 'text-sky-400' : 'text-sky-700', border: theme === 'dark' ? 'border-sky-500/20' : 'border-sky-300' },
  'Lluvia': { icono: <CloudRain className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-100', text: theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700', border: theme === 'dark' ? 'border-indigo-500/20' : 'border-indigo-300' },
  'Esperando apertura de bodegas': { icono: <Clock className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-100', text: theme === 'dark' ? 'text-amber-400' : 'text-amber-700', border: theme === 'dark' ? 'border-amber-500/20' : 'border-amber-300' },
  'Apertura de bodegas': { icono: <Layers className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-100', text: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700', border: theme === 'dark' ? 'border-emerald-500/20' : 'border-emerald-300' },
  'Traslado de UCA a Alcasa': { icono: <Truck className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-100', text: theme === 'dark' ? 'text-cyan-400' : 'text-cyan-700', border: theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-300' },
  'Mantenimiento almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-100', text: theme === 'dark' ? 'text-rose-400' : 'text-rose-700', border: theme === 'dark' ? 'border-rose-500/20' : 'border-rose-300' },
  'Sacando equipo abordo': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-100', text: theme === 'dark' ? 'text-pink-400' : 'text-pink-700', border: theme === 'dark' ? 'border-pink-500/20' : 'border-pink-300' },
  'Movimiento de UCA': { icono: <Truck className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-teal-500/10' : 'bg-teal-100', text: theme === 'dark' ? 'text-teal-400' : 'text-teal-700', border: theme === 'dark' ? 'border-teal-500/20' : 'border-teal-300' },
  'Movilizando tolvas': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-lime-500/10' : 'bg-lime-100', text: theme === 'dark' ? 'text-lime-400' : 'text-lime-700', border: theme === 'dark' ? 'border-lime-500/20' : 'border-lime-300' },
  'Falta de Tolveros': { icono: <AlertTriangle className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-stone-500/10' : 'bg-stone-200', text: theme === 'dark' ? 'text-stone-400' : 'text-stone-700', border: theme === 'dark' ? 'border-stone-500/20' : 'border-stone-400' },
  'Quitando Almeja UPDP': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-violet-500/10' : 'bg-violet-100', text: theme === 'dark' ? 'text-violet-400' : 'text-violet-700', border: theme === 'dark' ? 'border-violet-500/20' : 'border-violet-300' },
  'Colocando equipo abordo': { icono: <Wrench className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-fuchsia-500/10' : 'bg-fuchsia-100', text: theme === 'dark' ? 'text-fuchsia-400' : 'text-fuchsia-700', border: theme === 'dark' ? 'border-fuchsia-500/20' : 'border-fuchsia-300' },
  'Acumulado producto': { icono: <BarChart3 className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-slate-500/10' : 'bg-slate-200', text: theme === 'dark' ? 'text-slate-400' : 'text-slate-700', border: theme === 'dark' ? 'border-slate-500/20' : 'border-slate-400' },
  'Falla en sistema UPDP': { icono: <Zap className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-100', text: theme === 'dark' ? 'text-purple-400' : 'text-purple-700', border: theme === 'dark' ? 'border-purple-500/20' : 'border-purple-300' },
  'Falla en el sistema ALMAPAC': { icono: <Zap className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100', text: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700', border: theme === 'dark' ? 'border-yellow-500/30' : 'border-yellow-300' },
  'Esperando señal de Almapac': { icono: <Clock className="w-4 h-4" />, bg: theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-100', text: theme === 'dark' ? 'text-amber-400' : 'text-amber-700', border: theme === 'dark' ? 'border-amber-500/30' : 'border-amber-300' },
})

// =====================================================
// MODAL FILTROS DE LISTA
// =====================================================
const FiltrosListaModal = ({ bodegas, filtros, onClose, onAplicar, theme }) => {
  const [bodegasSeleccionadas, setBodegasSeleccionadas] = useState(filtros.bodegas || [])
  const [mostrarSoloGenerales, setMostrarSoloGenerales] = useState(filtros.soloGenerales || false)

  const toggleBodega = (bodegaId) => {
    setBodegasSeleccionadas(prev =>
      prev.includes(bodegaId)
        ? prev.filter(id => id !== bodegaId)
        : [...prev, bodegaId]
    )
  }

  const handleAplicar = () => {
    onAplicar({ bodegas: bodegasSeleccionadas, soloGenerales: mostrarSoloGenerales })
    onClose()
  }

  const handleLimpiar = () => {
    setBodegasSeleccionadas([])
    setMostrarSoloGenerales(false)
    onAplicar({ bodegas: [], soloGenerales: false })
    onClose()
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Filtrar por Bodega</h2>
                <p className="text-purple-200 text-xs">Selecciona las bodegas a mostrar</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <label className={`flex items-center gap-3 p-3 ${cardBg} rounded-xl border ${borderColor} cursor-pointer hover:border-purple-500/30`}>
            <input
              type="checkbox"
              checked={mostrarSoloGenerales}
              onChange={(e) => {
                setMostrarSoloGenerales(e.target.checked)
                if (e.target.checked) setBodegasSeleccionadas([])
              }}
              className="w-4 h-4 rounded accent-purple-500"
            />
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-sm ${textColor}`}>Solo paros generales (todas las bodegas)</span>
            </div>
          </label>

          {!mostrarSoloGenerales && bodegas.length > 0 && (
            <>
              <div className={`text-xs ${subText} uppercase tracking-wide font-bold px-1`}>
                Bodegas disponibles ({bodegas.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bodegas.map(bodega => (
                  <label key={bodega.id} className={`flex items-center gap-3 p-3 ${cardBg} rounded-xl border ${borderColor} cursor-pointer hover:border-blue-500/30`}>
                    <input
                      type="checkbox"
                      checked={bodegasSeleccionadas.includes(bodega.id)}
                      onChange={() => toggleBodega(bodega.id)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Box className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm ${textColor}`}>{bodega.nombre}</span>
                      <span className={`text-xs ${subText} ml-auto`}>{bodega.codigo}</span>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={`p-5 border-t ${borderColor} flex gap-3`}>
          <button onClick={handleLimpiar} className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
            Limpiar
          </button>
          <button onClick={handleAplicar} className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm">
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL FILTROS AVANZADOS DASHBOARD
// =====================================================
const FiltrosAvanzadosModal = ({ bodegas, filtros, onClose, onAplicar, theme }) => {
  const [bodegasSeleccionadas, setBodegasSeleccionadas] = useState(filtros.bodegas || [])
  const [mostrarSoloGenerales, setMostrarSoloGenerales] = useState(filtros.soloGenerales || false)
  const [fechaDesde, setFechaDesde] = useState(filtros.fechaDesde || '')
  const [fechaHasta, setFechaHasta] = useState(filtros.fechaHasta || '')

  const toggleBodega = (bodegaId) => {
    setBodegasSeleccionadas(prev =>
      prev.includes(bodegaId) ? prev.filter(id => id !== bodegaId) : [...prev, bodegaId]
    )
  }

  const handleAplicar = () => {
    onAplicar({ bodegas: bodegasSeleccionadas, soloGenerales: mostrarSoloGenerales, fechaDesde: fechaDesde || null, fechaHasta: fechaHasta || null })
    onClose()
  }

  const handleLimpiar = () => {
    setBodegasSeleccionadas([]); setMostrarSoloGenerales(false); setFechaDesde(''); setFechaHasta('')
    onAplicar({ bodegas: [], soloGenerales: false, fechaDesde: null, fechaHasta: null })
    onClose()
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const inputBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Filtros Avanzados</h2>
                <p className="text-purple-200 text-xs">Selecciona los criterios</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            <p className={`text-xs font-bold ${subText} uppercase tracking-wide`}>Rango de fechas</p>
            <div className="space-y-2">
              <div>
                <label className={`block text-xs ${subText} mb-1`}>Desde</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
                  className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`} />
              </div>
              <div>
                <label className={`block text-xs ${subText} mb-1`}>Hasta</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
                  className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`} />
              </div>
            </div>
          </div>
          <div className={`border-t ${borderColor} my-2`}></div>
          <label className={`flex items-center gap-3 p-3 ${cardBg} rounded-xl border ${borderColor} cursor-pointer hover:border-purple-500/30`}>
            <input type="checkbox" checked={mostrarSoloGenerales}
              onChange={(e) => { setMostrarSoloGenerales(e.target.checked); if (e.target.checked) setBodegasSeleccionadas([]) }}
              className="w-4 h-4 rounded accent-purple-500" />
            <div className="flex items-center gap-2">
              <Layers className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-sm ${textColor}`}>Solo paros generales (todas las bodegas)</span>
            </div>
          </label>
          {!mostrarSoloGenerales && bodegas.length > 0 && (
            <>
              <div className={`text-xs ${subText} uppercase tracking-wide font-bold px-1`}>
                Bodegas disponibles ({bodegas.length})
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {bodegas.map(bodega => (
                  <label key={bodega.id} className={`flex items-center gap-3 p-3 ${cardBg} rounded-xl border ${borderColor} cursor-pointer hover:border-blue-500/30`}>
                    <input type="checkbox" checked={bodegasSeleccionadas.includes(bodega.id)}
                      onChange={() => toggleBodega(bodega.id)} className="w-4 h-4 rounded accent-blue-500" />
                    <div className="flex items-center gap-2 flex-1">
                      <Box className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-sm ${textColor}`}>{bodega.nombre}</span>
                      <span className={`text-xs ${subText} ml-auto`}>{bodega.codigo}</span>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={`p-5 border-t ${borderColor} flex gap-3`}>
          <button onClick={handleLimpiar} className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
            Limpiar
          </button>
          <button onClick={handleAplicar} className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm">
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL REGISTRAR TIPO DE DESCARGA
// =====================================================
const RegistroDescargaModal = ({ barco, onClose, onSave, tiposDescarga, descargaActual, theme }) => {
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
    e.preventDefault(); setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      if (!formData.tipo_descarga_id) { toast.error('Selecciona un tipo de descarga'); return }
      if (descargaActual && !descargaActual.fecha_hora_fin) {
        const { error: finalizarError } = await supabase.from('registro_descarga')
          .update({ fecha_hora_fin: new Date().toISOString() }).eq('id', descargaActual.id)
        if (finalizarError) throw finalizarError
      }
      const { error } = await supabase.from('registro_descarga').insert([{
        barco_id: barco.id, tipo_descarga_id: parseInt(formData.tipo_descarga_id),
        fecha_hora_inicio: new Date(formData.fecha_hora_inicio).toISOString(),
        observaciones: formData.observaciones || null, created_by: user.id
      }])
      if (error) throw error
      toast.success('Tipo de descarga registrado'); onSave(); onClose()
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const inputBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const labelColor = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
  const clockColor = theme === 'dark' ? 'text-slate-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl"><Package className="w-5 h-5 text-white" /></div>
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
            <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>
              Tipo de Descarga <span className="text-red-400">*</span>
            </label>
            <select name="tipo_descarga_id" value={formData.tipo_descarga_id} onChange={handleChange}
              className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`} required>
              <option value="">Seleccionar tipo</option>
              {tiposDescarga.map(tipo => (
                <option key={tipo.id} value={tipo.id}>{tipo.icono} {tipo.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Fecha y Hora de Inicio</label>
            <div className="relative">
              <input type="datetime-local" name="fecha_hora_inicio" value={formData.fecha_hora_inicio} onChange={handleChange}
                className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`} />
              <button type="button"
                onClick={() => setFormData(prev => ({ ...prev, fecha_hora_inicio: dayjs().format('YYYY-MM-DDTHH:mm') }))}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${clockColor}`}>
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Observaciones</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows="2"
              className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} resize-none text-sm`}
              placeholder="Detalles adicionales..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
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
const HistorialDescargaModal = ({ barco, onClose, theme }) => {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarHistorial() }, [barco])

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('registro_descarga')
        .select(`*, tipo_descarga:tipos_descarga(id, nombre, icono, color), usuario:created_by(id, nombre, username)`)
        .eq('barco_id', barco.id).order('fecha_hora_inicio', { ascending: false })
      if (error) throw error
      setHistorial(data || [])
    } catch (error) { toast.error('Error al cargar historial') } finally { setLoading(false) }
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subText = theme === 'dark' ? 'text-slate-500' : 'text-gray-500'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden`}>
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
              <History className={`w-12 h-12 ${theme === 'dark' ? 'text-slate-700' : 'text-gray-300'} mx-auto mb-3`} />
              <p className={subText}>No hay registros de descarga</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map(reg => (
                <div key={reg.id} className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{reg.tipo_descarga?.icono || '📦'}</span>
                      <div>
                        <p className={`font-bold ${textColor} text-sm`}>{reg.tipo_descarga?.nombre}</p>
                        <p className={`text-xs ${subText} mt-0.5`}>
                          {dayjs(reg.fecha_hora_inicio).format('DD/MM/YY HH:mm')}
                          {reg.fecha_hora_fin && ` → ${dayjs(reg.fecha_hora_fin).format('HH:mm')}`}
                        </p>
                        {reg.observaciones && <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mt-1`}>{reg.observaciones}</p>}
                      </div>
                    </div>
                    {!reg.fecha_hora_fin && (
                      <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0">ACTIVO</span>
                    )}
                  </div>
                  <div className={`mt-2 pt-2 border-t ${borderColor} flex justify-between text-xs ${subText}`}>
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
        <div className={`border-t ${borderColor} p-4 flex-shrink-0`}>
          <button onClick={onClose}
            className={`w-full py-2.5 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} rounded-xl font-bold text-sm`}>
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
const FinalizarDescargaModal = ({ descarga, onClose, onConfirm, theme }) => {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false) }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
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
          <p className={`${textColor} text-sm mb-2`}>¿Finalizar este tipo de descarga?</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-6`}>
            Iniciado: {dayjs(descarga.fecha_hora_inicio).format('DD/MM/YYYY HH:mm')}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
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
const EditarTiemposModal = ({ barco, onClose, onSave, theme }) => {
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
    { key: 'tiempo_arribo', label: 'Arribo', iconEl: <Anchor className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />, color: theme === 'dark' ? 'border-blue-500/20' : 'border-blue-300', accent: `hover:${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}` },
    { key: 'tiempo_ataque', label: 'Ataque', iconEl: <Target className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />, color: theme === 'dark' ? 'border-yellow-500/20' : 'border-yellow-300', accent: `hover:${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}` },
    { key: 'tiempo_recibido', label: 'Recibido', iconEl: <Inbox className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />, color: theme === 'dark' ? 'border-green-500/20' : 'border-green-300', accent: `hover:${theme === 'dark' ? 'text-green-400' : 'text-green-600'}` },
    { key: 'operacion_iniciada_at', label: 'Inicio Operación', iconEl: <Play className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />, color: theme === 'dark' ? 'border-emerald-500/20' : 'border-emerald-300', accent: `hover:${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}` },
    { key: 'operacion_finalizada_at', label: 'Fin Operación', iconEl: <StopCircle className={`w-4 h-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />, color: theme === 'dark' ? 'border-red-500/20' : 'border-red-300', accent: `hover:${theme === 'dark' ? 'text-red-400' : 'text-red-600'}` },
  ]

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at) { toast.error('No se puede tener fin sin inicio'); return }
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
      toast.success('Tiempos actualizados'); onSave(); onClose()
    } catch (error) { toast.error('Error al actualizar tiempos') } finally { setLoading(false) }
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const inputBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const labelColor = theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
  const clockBase = theme === 'dark' ? 'text-slate-500' : 'text-gray-400'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden`}>
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
          {campos.map(({ key, label, iconEl, color, accent }) => (
            <div key={key} className={`${cardBg} rounded-xl p-3.5 border ${color}`}>
              <div className="flex items-center gap-2 mb-2">
                {iconEl}
                <span className={`text-xs font-bold ${labelColor}`}>{label}</span>
              </div>
              <div className="relative">
                <input type="datetime-local" name={key} value={tiempos[key]} onChange={handleChange}
                  className={`w-full ${inputBg} border ${borderColor} rounded-lg px-3 py-2.5 ${textColor} text-sm pr-10`} />
                <button type="button" onClick={() => setHoraActual(key)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 ${clockBase} transition-colors ${accent}`}>
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tiempos.operacion_finalizada_at && !tiempos.operacion_iniciada_at && (
            <p className="text-xs text-red-500">⚠️ No se puede tener fin sin inicio</p>
          )}
        </div>
        <div className={`p-5 border-t ${borderColor} flex gap-3 flex-shrink-0`}>
          <button type="button" onClick={onClose}
            className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
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
const IniciarOperacionModal = ({ barco, onClose, onConfirm, theme }) => {
  const [loading, setLoading] = useState(false)
  const handleConfirm = async () => { setLoading(true); await onConfirm(); setLoading(false) }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
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
          <p className={`${textColor} text-sm mb-2`}>¿Iniciar la operación ahora?</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-6`}>
            Se registrará la hora actual y se habilitará el registro de demoras.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
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
const FinalizarOperacionModal = ({ barco, onClose, onConfirm, theme }) => {
  const [loading, setLoading] = useState(false)
  const [motivo, setMotivo] = useState('')
  const handleConfirm = async () => { setLoading(true); await onConfirm(motivo); setLoading(false) }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const inputBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden`}>
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
          <p className={`${textColor} text-sm mb-2`}>¿Finalizar la operación?</p>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-4`}>No se podrán registrar más demoras.</p>
          <div className="mb-5">
            <label className={`block text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'} mb-1.5`}>Motivo (opcional)</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows="2"
              className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} resize-none text-sm`}
              placeholder="Ej: Operación completada..." />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3 rounded-xl text-sm`}>
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
const AtrasoModal = ({ barco, atraso, tiposParo, bodegasBarco, onClose, onSave, theme }) => {
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

  const TIPOS_PARO_CONFIG = getTiposParoConfig(theme)

  useEffect(() => {
    if (atraso) {
      const tipo = tiposParo.find(t => t.id === atraso.tipo_paro_id)
      setTipoSeleccionado(tipo); setPaso(2)
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
      ...prev, tipo_paro_id: tipo.id,
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
    e.preventDefault(); setLoading(true)
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
        barco_id: barco.id, tipo_paro_id: parseInt(formData.tipo_paro_id),
        fecha: formData.fecha, hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null, duracion_minutos: duracion,
        bodega_id: formData.es_general ? null : (formData.bodega_id ? parseInt(formData.bodega_id) : null),
        bodega_nombre: formData.es_general ? null : (bodegaSeleccionada?.nombre || null),
        bodega_codigo: formData.es_general ? null : (bodegaSeleccionada?.codigo || null),
        es_general: formData.es_general, observaciones: formData.observaciones || null,
        created_by: user.id, updated_by: user.id
      }
      const result = atraso
        ? await supabase.from('registro_atrasos').update(datos).eq('id', atraso.id)
        : await supabase.from('registro_atrasos').insert([datos])
      if (result.error) throw result.error
      toast.success(atraso ? 'Atraso actualizado' : 'Atraso registrado'); onSave()
    } catch (error) { toast.error(error.message) } finally { setLoading(false) }
  }

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const inputBg = theme === 'dark' ? 'bg-slate-900' : 'bg-white'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const labelColor = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
  const chevronColor = theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
  const subTextColor = theme === 'dark' ? 'text-slate-300' : 'text-gray-700'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col overflow-hidden`}>
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
              <p className={`text-xs font-bold ${labelColor} uppercase tracking-wide mb-3`}>Selecciona el tipo de paro</p>
              <div className="grid grid-cols-1 gap-2">
                {tiposParo.map(tipo => {
                  const config = TIPOS_PARO_CONFIG[tipo.nombre] || {
                    bg: theme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-200',
                    icono: <AlertTriangle className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  }
                  return (
                    <button key={tipo.id} onClick={() => seleccionarTipo(tipo)}
                      className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                        tipo.es_imputable_almapac
                          ? `${theme === 'dark' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-400 bg-yellow-50'} hover:border-yellow-500/60`
                          : `${borderColor} ${cardBg} hover:border-orange-500/40`
                      }`}>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                        <span className={config.text}>{config.icono}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${textColor} text-sm leading-tight`}>{tipo.nombre}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {tipo.es_general && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>GENERAL</span>
                          )}
                          {tipo.es_imputable_almapac && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>ALMAPAC</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${chevronColor} flex-shrink-0`} />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button type="button" onClick={() => { setPaso(1); setTipoSeleccionado(null) }}
                className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-medium">
                ← Volver a tipos
              </button>

              <div className={`${cardBg} rounded-xl p-3 border ${theme === 'dark' ? 'border-orange-500/20' : 'border-orange-300'}`}>
                <p className={`text-[10px] ${labelColor} uppercase tracking-wide mb-1`}>Tipo seleccionado</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {tipoSeleccionado && TIPOS_PARO_CONFIG[tipoSeleccionado.nombre] && (
                    <span className={TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].text}>
                      {TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].icono}
                    </span>
                  )}
                  <span className={`font-bold ${textColor} text-sm`}>{tipoSeleccionado?.nombre}</span>
                  {tipoSeleccionado?.es_general && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>GENERAL</span>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Fecha</label>
                <input type="date" value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Hora Inicio</label>
                  <div className="flex gap-2">
                    <input type="time" value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className={`flex-1 ${inputBg} border ${borderColor} rounded-xl px-3 py-3 ${textColor} text-sm min-w-0`} required />
                    <button type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, hora_inicio: dayjs().format('HH:mm') })); setEnCurso(true) }}
                      className={`px-2.5 py-2.5 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-green-100 hover:bg-green-200 text-green-700'}`}
                      title="Ahora">
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Hora Fin</label>
                  <div className="flex gap-2">
                    <input type="time" value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className={`flex-1 ${inputBg} border ${borderColor} rounded-xl px-3 py-3 ${textColor} text-sm min-w-0`} />
                    <button type="button"
                      onClick={() => { setFormData(prev => ({ ...prev, hora_fin: dayjs().format('HH:mm') })); setEnCurso(false) }}
                      className={`px-2.5 py-2.5 rounded-xl flex-shrink-0 ${theme === 'dark' ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-700'}`}
                      title="Ahora">
                      <StopCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {enCurso && (
                <div className={`${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-300 text-blue-700'} border rounded-xl p-3 flex items-center gap-2`}>
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  <p className="text-xs">En curso · {Math.floor(tiempoTranscurrido / 60)}h {tiempoTranscurrido % 60}m</p>
                </div>
              )}

              {!tipoSeleccionado?.es_general && (
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 cursor-pointer p-3 ${cardBg} rounded-xl border ${borderColor} hover:border-white/20`}>
                    <input type="checkbox" checked={formData.es_general}
                      onChange={(e) => setFormData({ ...formData, es_general: e.target.checked, bodega_id: '' })}
                      className="w-4 h-4 rounded accent-orange-500" />
                    <span className={`text-sm ${subTextColor}`}>Aplica a todo el barco</span>
                  </label>
                  {!formData.es_general && (
                    <div>
                      <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Bodega</label>
                      <select value={formData.bodega_id}
                        onChange={(e) => setFormData({ ...formData, bodega_id: e.target.value })}
                        className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} text-sm`}>
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
                <label className={`block text-xs ${labelColor} mb-1.5 font-medium`}>Observaciones</label>
                <textarea value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="2"
                  className={`w-full ${inputBg} border ${borderColor} rounded-xl px-4 py-3 ${textColor} resize-none text-sm`}
                  placeholder="Detalles adicionales (opcional)" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} font-bold py-3.5 rounded-xl text-sm`}>
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
const DashboardAtrasos = ({ barco, registros, tiposParo, onClose, theme }) => {
  const [periodo, setPeriodo] = useState('todo')
  const [filtros, setFiltros] = useState({ bodegas: [], soloGenerales: false, fechaDesde: null, fechaHasta: null })
  const [showFiltrosModal, setShowFiltrosModal] = useState(false)

  const TIPOS_PARO_CONFIG = getTiposParoConfig(theme)

  const fechaInicioOperacion = barco.operacion_iniciada_at
    ? dayjs(barco.operacion_iniciada_at)
    : barco.fecha_llegada ? dayjs(barco.fecha_llegada) : dayjs()

  const registrosFiltrados = registros.filter(r => {
    if (periodo !== 'todo') {
      const fechaReg = dayjs(r.fecha); const hoy = dayjs()
      if (periodo === 'dia' && !fechaReg.isSame(hoy, 'day')) return false
      if (periodo === 'semana' && !fechaReg.isAfter(hoy.subtract(7, 'day'))) return false
      if (periodo === 'mes' && !fechaReg.isAfter(hoy.subtract(30, 'day'))) return false
    }
    if (filtros.fechaDesde && dayjs(r.fecha).isBefore(dayjs(filtros.fechaDesde))) return false
    if (filtros.fechaHasta && dayjs(r.fecha).isAfter(dayjs(filtros.fechaHasta))) return false
    if (filtros.soloGenerales) return r.es_general === true
    if (filtros.bodegas.length > 0) { if (r.es_general) return true; return filtros.bodegas.includes(r.bodega_id) }
    return true
  })

  const totales = tiposParo.map(tipo => {
    const registrosTipo = registrosFiltrados.filter(r => r.tipo_paro_id === tipo.id)
    const totalMinutos = registrosTipo.reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
    return { ...tipo, registros: registrosTipo.length, totalMinutos, horas: Math.floor(totalMinutos / 60), minutos: totalMinutos % 60, config: TIPOS_PARO_CONFIG[tipo.nombre] || {} }
  })

  const noImputables = totales.filter(t => !t.es_imputable_almapac && t.totalMinutos > 0)
  const imputables = totales.filter(t => t.es_imputable_almapac && t.totalMinutos > 0)
  const totalNoImputable = noImputables.reduce((sum, t) => sum + t.totalMinutos, 0)
  const totalImputable = imputables.reduce((sum, t) => sum + t.totalMinutos, 0)
  const totalGeneral = totalNoImputable + totalImputable

  const ahora = dayjs()
  const tiempoOperacionMinutos = ahora.diff(fechaInicioOperacion, 'minute')
  const tiempoNeto = tiempoOperacionMinutos - totalGeneral

  const bodegasDisponibles = barco.bodegas_json || []
  const tieneFiltrosActivos = filtros.bodegas.length > 0 || filtros.soloGenerales || filtros.fechaDesde || filtros.fechaHasta

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className={`${bgColor} border ${borderColor} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden`}>
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
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {[{ value: 'dia', label: 'Hoy' }, { value: 'semana', label: '7 días' }, { value: 'mes', label: '30 días' }, { value: 'todo', label: 'Todo' }].map(p => (
              <button key={p.value} onClick={() => setPeriodo(p.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${periodo === p.value ? 'bg-white text-blue-600' : 'bg-white/10 text-white'}`}>
                {p.label}
              </button>
            ))}
            <button onClick={() => setShowFiltrosModal(true)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all flex items-center gap-1 ${tieneFiltrosActivos ? 'bg-purple-500 text-white' : 'bg-white/10 text-white'}`}>
              <Filter className="w-3 h-3" />
              Filtros
              {tieneFiltrosActivos && (
                <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
                  {filtros.bodegas.length + (filtros.soloGenerales ? 1 : 0) + (filtros.fechaDesde ? 1 : 0) + (filtros.fechaHasta ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
          {tieneFiltrosActivos && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filtros.soloGenerales && <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full">Solo generales</span>}
              {filtros.fechaDesde && <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">Desde: {dayjs(filtros.fechaDesde).format('DD/MM/YY')}</span>}
              {filtros.fechaHasta && <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full">Hasta: {dayjs(filtros.fechaHasta).format('DD/MM/YY')}</span>}
              {filtros.bodegas.length > 0 && <span className="text-[10px] bg-green-500/30 text-green-200 px-2 py-0.5 rounded-full">{filtros.bodegas.length} bodega(s)</span>}
              <button onClick={() => setFiltros({ bodegas: [], soloGenerales: false, fechaDesde: null, fechaHasta: null })}
                className="text-[10px] bg-red-500/30 text-red-200 px-2 py-0.5 rounded-full hover:bg-red-500/50">
                Limpiar
              </button>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Tiempo operación', value: tiempoOperacionMinutos, sub: `Desde ${fechaInicioOperacion.format('DD/MM HH:mm')}`, from: 'from-blue-600', to: 'to-blue-800' },
              { label: 'Tiempo neto', value: tiempoNeto, sub: 'Sin paros', from: 'from-green-600', to: 'to-green-800' },
              { label: 'Total paros', value: totalGeneral, sub: `${registrosFiltrados.length} reg.`, from: 'from-orange-600', to: 'to-red-600' },
            ].map(({ label, value, sub, from, to }) => (
              <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-xl p-3`}>
                <p className="text-white/70 text-[10px] uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-white mt-1">
                  {Math.floor(value / 60)}<span className="text-sm font-bold">h {Math.abs(value % 60)}m</span>
                </p>
                <p className="text-white/60 text-[10px] mt-0.5 truncate">{sub}</p>
              </div>
            ))}
          </div>

          <div className={`${cardBg} rounded-xl p-4 border ${borderColor}`}>
            <h3 className={`font-bold ${textColor} mb-3 flex items-center gap-2 text-xs uppercase tracking-wide`}>
              <Info className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> Distribución
            </h3>
            <div className="space-y-3">
              {[
                { label: 'No imputables', value: totalNoImputable, color: 'bg-red-500', text: theme === 'dark' ? 'text-red-400' : 'text-red-600' },
                { label: 'Imputables ALMAPAC', value: totalImputable, color: 'bg-yellow-500', text: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600' },
              ].map(({ label, value, color, text }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={subText}>{label}</span>
                    <span className={`font-bold ${text}`}>{Math.floor(value / 60)}h {value % 60}m</span>
                  </div>
                  <div className={`h-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: totalGeneral > 0 ? `${(value / totalGeneral) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {[
            { list: noImputables, title: 'No imputables a ALMAPAC', borderC: theme === 'dark' ? 'border-red-500/20' : 'border-red-300', headerBg: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50', icon: <AlertTriangle className={`w-4 h-4 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />, barColor: 'bg-red-500/60', total: totalNoImputable, totalText: theme === 'dark' ? 'text-red-400' : 'text-red-600' },
            { list: imputables, title: 'Imputables a ALMAPAC', borderC: theme === 'dark' ? 'border-yellow-500/20' : 'border-yellow-400', headerBg: theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50', icon: <Zap className={`w-4 h-4 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />, barColor: 'bg-yellow-500/60', total: totalImputable, totalText: theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600' },
          ].map(({ list, title, borderC, headerBg, icon, barColor, total, totalText }) => list.length > 0 && (
            <div key={title} className={`${cardBg} rounded-xl overflow-hidden border ${borderC}`}>
              <div className={`${headerBg} px-4 py-3 border-b ${borderC} flex items-center gap-2`}>
                {icon}
                <h3 className={`font-bold ${textColor} text-xs`}>{title}</h3>
              </div>
              <div className="p-4 space-y-3">
                {list.map(tipo => (
                  <div key={tipo.id}>
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1 rounded flex-shrink-0 ${tipo.config.bg || (theme === 'dark' ? 'bg-gray-500/10' : 'bg-gray-200')}`}>
                          <span className={tipo.config.text || (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
                            {tipo.config.icono || <AlertTriangle className="w-3 h-3" />}
                          </span>
                        </div>
                        <span className={`${textColor} text-xs leading-tight truncate`}>{tipo.nombre}</span>
                      </div>
                      <span className={`font-bold text-xs whitespace-nowrap flex-shrink-0 ${tipo.config.text || totalText}`}>
                        {tipo.horas}h {tipo.minutos}m
                      </span>
                    </div>
                    <div className={`h-1.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                      <div className={`h-full ${barColor} rounded-full`}
                        style={{ width: total > 0 ? `${(tipo.totalMinutos / total) * 100}%` : '0%' }} />
                    </div>
                  </div>
                ))}
                <div className={`pt-2 border-t ${borderColor} flex justify-between font-bold text-sm`}>
                  <span className={textColor}>TOTAL</span>
                  <span className={totalText}>{Math.floor(total / 60)}h {total % 60}m</span>
                </div>
              </div>
            </div>
          ))}

          {registrosFiltrados.length === 0 && (
            <div className={`${cardBg} rounded-xl p-10 text-center`}>
              <Clock className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-700' : 'text-gray-300'} mx-auto mb-3`} />
              <p className={subText}>No hay demoras con los filtros seleccionados</p>
              {tieneFiltrosActivos && (
                <button onClick={() => setFiltros({ bodegas: [], soloGenerales: false, fechaDesde: null, fechaHasta: null })}
                  className={`mt-3 text-xs ${theme === 'dark' ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-500'}`}>
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {showFiltrosModal && (
        <FiltrosAvanzadosModal bodegas={bodegasDisponibles} filtros={filtros}
          onClose={() => setShowFiltrosModal(false)} onAplicar={setFiltros} theme={theme} />
      )}
    </div>
  )
}

// =====================================================
// TARJETA DE REGISTRO
// =====================================================
const RegistroCard = ({ reg, tiposParo, bodegasBarco, onEditar, onEliminar, theme }) => {
  const TIPOS_PARO_CONFIG = getTiposParoConfig(theme)

  const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {
    bg: theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200',
    icono: <AlertTriangle className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`} />,
    border: theme === 'dark' ? 'border-slate-700' : 'border-gray-300',
    text: theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
  }
  const bodegaInfo = !reg.es_general && reg.bodega_id
    ? (reg.bodega_nombre ? { nombre: reg.bodega_nombre, codigo: reg.bodega_codigo } : bodegasBarco.find(b => b.id === reg.bodega_id))
    : null

  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subTextColor = theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
  const timeBg = theme === 'dark' ? 'bg-slate-800/60' : 'bg-gray-100'
  const clockIcon = theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
  const arrowColor = theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
  const obsBg = theme === 'dark' ? 'bg-slate-800/40' : 'bg-gray-100'
  const obsBorder = theme === 'dark' ? 'border-slate-600' : 'border-gray-300'

  return (
    <div className={`${cardBg} rounded-xl border-2 transition-all overflow-hidden ${
      reg.es_general
        ? 'border-purple-500/30 hover:border-purple-500/50'
        : bodegaInfo
          ? 'border-blue-500/30 hover:border-blue-500/50'
          : theme === 'dark' ? 'border-slate-800 hover:border-orange-500/40' : 'border-gray-200 hover:border-orange-400'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2.5 rounded-xl ${config.bg} flex-shrink-0`}>
            <span className={config.text}>{config.icono}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold ${textColor} text-sm leading-snug`}>{tipo?.nombre || 'Desconocido'}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {tipo?.es_imputable_almapac && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>ALMAPAC</span>
              )}
              <span className={`text-[10px] ${subTextColor}`}>{dayjs(reg.fecha).format('DD/MM/YYYY')}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEditar(reg)}
              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' : 'bg-blue-100 hover:bg-blue-200 text-blue-600'}`}
              title="Editar">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onEliminar(reg.id)}
              className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}
              title="Eliminar">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className={`flex items-center gap-2 ${timeBg} rounded-lg px-3 py-2 mb-3`}>
          <Clock className={`w-3.5 h-3.5 ${clockIcon} flex-shrink-0`} />
          <span className={`font-mono text-sm ${textColor}`}>{reg.hora_inicio?.slice(0, 5)}</span>
          {reg.hora_fin ? (
            <>
              <span className={arrowColor}>→</span>
              <span className={`font-mono text-sm ${textColor}`}>{reg.hora_fin?.slice(0, 5)}</span>
              <span className={`ml-auto font-bold text-xs ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                {Math.floor((reg.duracion_minutos || 0) / 60)}h {(reg.duracion_minutos || 0) % 60}m
              </span>
            </>
          ) : (
            <span className={`ml-auto text-xs font-medium animate-pulse ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>En curso</span>
          )}
        </div>

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          reg.es_general
            ? theme === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-300'
            : bodegaInfo
              ? theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-300'
              : theme === 'dark' ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-gray-100 border border-gray-200'
        }`}>
          <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${
            reg.es_general
              ? theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              : bodegaInfo
                ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                : theme === 'dark' ? 'text-slate-600' : 'text-gray-400'
          }`} />
          {reg.es_general ? (
            <div className="flex items-center gap-2">
              <Layers className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-xs font-bold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>TODAS LAS BODEGAS</span>
            </div>
          ) : bodegaInfo ? (
            <div className="flex items-center gap-2 min-w-0">
              <Box className={`w-3.5 h-3.5 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              <span className={`text-xs font-semibold ${textColor} truncate`}>{bodegaInfo.nombre}</span>
              {bodegaInfo.codigo && (
                <span className={`text-xs font-mono flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{bodegaInfo.codigo}</span>
              )}
            </div>
          ) : (
            <span className={`text-xs ${subTextColor}`}>Sin bodega específica</span>
          )}
        </div>

        {reg.observaciones && (
          <p className={`mt-2.5 text-xs ${subTextColor} italic ${obsBg} rounded-lg px-3 py-2 border-l-2 ${obsBorder}`}>
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
  const { theme, toggleTheme } = useTheme()
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
  const [filtrosLista, setFiltrosLista] = useState({ bodegas: [], soloGenerales: false })
  const [showFiltrosListaModal, setShowFiltrosListaModal] = useState(false)
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
      } else if (barcosData?.length === 0) { toast.error('No hay barcos disponibles') }
    } catch (error) { toast.error('Error al cargar datos') } finally { setLoading(false) }
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
    } catch (error) { toast.error('Error al cargar tipos de descarga') }
  }

  const cargarOperacionInfo = async (barcoId) => {
    try {
      const { data } = await supabase.from('barcos')
        .select('tiempo_arribo, tiempo_ataque, tiempo_recibido, tiempo_arribo_editado, tiempo_ataque_editado, tiempo_recibido_editado, operacion_iniciada_at, operacion_finalizada_at, operacion_iniciada_por, operacion_finalizada_por, operacion_motivo_finalizacion, operacion_iniciada_editado, operacion_finalizada_editado, fecha_llegada, estado')
        .eq('id', barcoId).single()
      if (data) setOperacionInfo(data)
    } catch (error) { console.error('Error cargando info de operación:', error) }
  }

  const handleIniciarOperacion = async () => {
    if (!barcoSeleccionado || !user) return
    try {
      const { error } = await supabase.from('barcos').update({
        operacion_iniciada_at: new Date().toISOString(), operacion_iniciada_por: user.id,
        operacion_iniciada_editado: false, estado: 'activo'
      }).eq('id', barcoSeleccionado.id)
      if (error) throw error
      toast.success('Operación iniciada'); setShowIniciarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id); await cargarDatos()
    } catch (error) { toast.error('Error al iniciar la operación') }
  }

  const handleFinalizarOperacion = async (motivo) => {
    if (!barcoSeleccionado || !user) return
    try {
      const { error } = await supabase.from('barcos').update({
        operacion_finalizada_at: new Date().toISOString(), operacion_finalizada_por: user.id,
        operacion_motivo_finalizacion: motivo || null, operacion_finalizada_editado: false, estado: 'finalizado'
      }).eq('id', barcoSeleccionado.id)
      if (error) throw error
      toast.success('Operación finalizada'); setShowFinalizarModal(false)
      await cargarOperacionInfo(barcoSeleccionado.id); await cargarDatos()
    } catch (error) { toast.error('Error al finalizar la operación') }
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
    } catch (error) { toast.error('Error al cargar registros') }
  }

  const handleSeleccionarBarco = async (barco) => {
    setBarcoSeleccionado(barco); cargarBodegas(barco)
    await cargarRegistros(barco.id); await cargarDescargas(barco.id)
    await cargarOperacionInfo(barco.id)
    setFiltrosLista({ bodegas: [], soloGenerales: false }); setShowShipSelector(false)
  }

  const handleNuevoAtraso = () => {
    // CORRECCIÓN: Permitir registrar incluso si la operación no ha iniciado
    // Solo bloqueamos si el barco está finalizado
    if (barcoSeleccionado?.estado === 'finalizado') { 
      toast.error('La operación está finalizada'); 
      return 
    }
    setAtrasoEditando(null); 
    setShowAtrasoModal(true)
  }

  const handleEditarAtraso = (atraso) => {
    if (barcoSeleccionado?.estado === 'finalizado') { 
      toast.error('La operación está finalizada'); 
      return 
    }
    setAtrasoEditando(atraso); 
    setShowAtrasoModal(true)
  }

  const handleEliminarAtraso = async (id) => {
    if (barcoSeleccionado?.estado === 'finalizado') { 
      toast.error('La operación está finalizada'); 
      return 
    }
    if (!confirm('¿Eliminar este registro?')) return
    try {
      const { error } = await supabase.from('registro_atrasos').delete().eq('id', id)
      if (error) throw error
      toast.success('Registro eliminado'); await cargarRegistros(barcoSeleccionado.id)
    } catch (error) { toast.error('Error al eliminar') }
  }

  const handleGuardarAtraso = async () => {
    setShowAtrasoModal(false); await cargarRegistros(barcoSeleccionado.id)
  }

  const handleConfirmarFinalizarDescarga = async () => {
    if (!descargaSeleccionada) return
    try {
      const { error } = await supabase.from('registro_descarga')
        .update({ fecha_hora_fin: new Date().toISOString() }).eq('id', descargaSeleccionada.id)
      if (error) throw error
      toast.success('Descarga finalizada'); setShowFinalizarDescargaModal(false); setDescargaSeleccionada(null)
      await cargarDescargas(barcoSeleccionado.id)
    } catch (error) { toast.error('Error al finalizar descarga') }
  }

  const registrosConFiltroBodega = registros.filter(r => {
    if (filtrosLista.soloGenerales) return r.es_general === true
    if (filtrosLista.bodegas.length > 0) { if (r.es_general) return true; return filtrosLista.bodegas.includes(r.bodega_id) }
    return true
  })
  const registrosFiltrados = registrosConFiltroBodega.filter(r => r.fecha === filtroFecha)
  const barcosFiltrados = barcos.filter(b => b.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  const formatFechaHora = (ts) => ts ? dayjs(ts).format('DD/MM/YY HH:mm') : '—'

  // CORRECCIÓN: Modificar la lógica de puedeRegistrar
  // Ahora se puede registrar incluso si la operación no ha iniciado
  const puedeRegistrar = barcoSeleccionado?.estado !== 'finalizado'

  const estadoOperacion = !barcoSeleccionado ? null
    : barcoSeleccionado.estado === 'finalizado' ? 'finalizado'
    : operacionInfo?.operacion_iniciada_at ? 'en_curso' : 'pendiente'

  const bgColor = theme === 'dark' ? 'bg-[#0f172a]' : 'bg-gray-50'
  const cardBg = theme === 'dark' ? 'bg-slate-900' : 'bg-white'
  const borderColor = theme === 'dark' ? 'border-white/10' : 'border-gray-200'
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900'
  const subText = theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
  const inputBg = theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
  const searchIcon = theme === 'dark' ? 'text-slate-500' : 'text-gray-400'

  const tieneFiltrosBodegaActivos = filtrosLista.bodegas.length > 0 || filtrosLista.soloGenerales

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-3" />
          <p className={subText}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-200`}>
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
                  Control de Demoras
                </h1>
                <p className="text-orange-200 text-xs mt-0.5 truncate">
                  {user?.nombre} · {user?.rol === 'admin' ? 'Admin' : 'Chequero'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
                {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
              </button>
              <div className="flex gap-1 bg-black/20 rounded-xl p-1 flex-shrink-0">
                <button onClick={() => setVista('lista')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${vista === 'lista' ? 'bg-white text-orange-600' : 'text-white hover:bg-white/10'}`}>
                  📋 <span className="hidden sm:inline">Lista</span>
                </button>
                <button onClick={() => barcoSeleccionado ? setVista('dashboard') : toast.error('Selecciona un barco')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${vista === 'dashboard' ? 'bg-white text-orange-600' : 'text-white hover:bg-white/10'}`}>
                  📊 <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SELECTOR DE BARCO ── */}
        <div className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden`}>
          <button onClick={() => setShowShipSelector(!showShipSelector)}
            className={`w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors ${textColor}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg flex-shrink-0 ${theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                <Ship className={`w-4 h-4 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold truncate">
                  {barcoSeleccionado ? barcoSeleccionado.nombre : 'Seleccionar barco'}
                </p>
                {barcoSeleccionado && (
                  <p className={`text-[11px] ${subText}`}>
                    {barcoSeleccionado.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                    {' · '}
                    <span className={barcoSeleccionado.estado === 'activo' ? 'text-green-500' : 'text-red-500'}>
                      {barcoSeleccionado.estado}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 ${searchIcon} flex-shrink-0 transition-transform ${showShipSelector ? 'rotate-180' : ''}`} />
          </button>

          {showShipSelector && (
            <div className={`px-4 pb-4 border-t ${borderColor} pt-3 space-y-3`}>
              <div className="relative">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar barco..."
                  className={`w-full ${inputBg} border ${borderColor} rounded-xl pl-9 pr-4 py-2.5 ${textColor} text-sm`} />
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${searchIcon}`} />
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {barcosFiltrados.length > 0 ? barcosFiltrados.map(b => (
                  <button key={b.id} onClick={() => handleSeleccionarBarco(b)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                      barcoSeleccionado?.id === b.id
                        ? 'border-orange-500/60 bg-orange-500/10'
                        : `${borderColor} ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} hover:border-orange-400`
                    }`}>
                    <div>
                      <p className={`font-semibold ${textColor} text-sm`}>{b.nombre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] ${subText}`}>
                          {b.tipo_operacion === 'exportacion' ? '🚢 Exportación' : '⚓ Importación'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          b.estado === 'activo' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                        }`}>
                          {b.estado}
                        </span>
                      </div>
                    </div>
                    {barcoSeleccionado?.id === b.id && (
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                    )}
                  </button>
                )) : (
                  <p className={`text-center py-6 ${subText} text-sm`}>No se encontraron barcos</p>
                )}
              </div>
            </div>
          )}
        </div>

        {barcoSeleccionado && (
          <>
            {/* ── PANEL ESTADO + TIEMPOS ── */}
            <div className={`rounded-2xl border overflow-hidden ${
              estadoOperacion === 'finalizado'
                ? theme === 'dark' ? 'border-red-500/20 bg-red-500/5' : 'border-red-300 bg-red-50'
                : estadoOperacion === 'en_curso'
                  ? theme === 'dark' ? 'border-green-500/20 bg-green-500/5' : 'border-green-300 bg-green-50'
                  : theme === 'dark' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-yellow-300 bg-yellow-50'
            }`}>
              <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      estadoOperacion === 'finalizado' ? theme === 'dark' ? 'bg-red-500/20' : 'bg-red-100'
                      : estadoOperacion === 'en_curso' ? theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
                      : theme === 'dark' ? 'bg-yellow-500/20' : 'bg-yellow-100'
                    }`}>
                      <Flag className={`w-4 h-4 ${
                        estadoOperacion === 'finalizado' ? theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        : estadoOperacion === 'en_curso' ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        : theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className={`text-[10px] ${subText} uppercase tracking-wide font-bold`}>Estado</p>
                      {estadoOperacion === 'pendiente' && (
                        <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>⏳ Pendiente de inicio</p>
                      )}
                      {estadoOperacion === 'en_curso' && (
                        <div>
                          <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-700'}`}>🟢 En curso</p>
                          <p className={`text-xs ${subText}`}>Inicio: {formatFechaHora(operacionInfo?.operacion_iniciada_at)}</p>
                        </div>
                      )}
                      {estadoOperacion === 'finalizado' && (
                        <div>
                          <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>🔴 Finalizada</p>
                          <p className={`text-xs ${subText}`}>
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

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-[10px] ${subText} uppercase tracking-wide font-bold flex items-center gap-1.5`}>
                    <Clock className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> Tiempos de operación
                  </p>
                  <button onClick={() => setShowEditarTiemposModal(true)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20' : 'text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200'
                    }`}>
                    <Edit className="w-3 h-3" /> Editar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'tiempo_arribo', label: 'Arribo', iconEl: <Anchor className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />, editado: operacionInfo?.tiempo_arribo_editado },
                    { key: 'tiempo_ataque', label: 'Ataque', iconEl: <Target className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />, editado: operacionInfo?.tiempo_ataque_editado },
                    { key: 'tiempo_recibido', label: 'Recibido', iconEl: <Inbox className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />, editado: operacionInfo?.tiempo_recibido_editado },
                  ].map(({ key, label, iconEl, editado }) => (
                    <div key={key} className={`${theme === 'dark' ? 'bg-slate-800/60' : 'bg-white/70'} rounded-xl p-3 border ${borderColor}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {iconEl}
                        <span className={`text-[10px] ${subText} font-bold uppercase`}>{label}</span>
                        {editado && (
                          <span className={`ml-auto text-[8px] px-1 py-0.5 rounded ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>Ed.</span>
                        )}
                      </div>
                      <p className={`text-xs font-bold ${textColor} leading-tight`}>
                        {operacionInfo?.[key] ? dayjs(operacionInfo[key]).format('DD/MM HH:mm') : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── TIPO DE DESCARGA ── */}
            <div className={`${cardBg} rounded-2xl border ${theme === 'dark' ? 'border-blue-500/20' : 'border-blue-300'} overflow-hidden`}>
              <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <Package className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={`font-bold ${textColor} text-sm`}>Tipo de Descarga</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowHistorialDescargaModal(true)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                      theme === 'dark' ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20' : 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                    }`}>
                    <History className="w-3 h-3" /> Historial
                  </button>
                  <button onClick={() => setShowDescargaModal(true)} disabled={!puedeRegistrar}
                    className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all font-bold ${
                      puedeRegistrar
                        ? theme === 'dark' ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        : theme === 'dark' ? 'bg-slate-800 text-slate-600' : 'bg-gray-200 text-gray-400'
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
                        className={`flex items-center justify-between gap-3 rounded-xl p-3 ${
                          theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
                        }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0">{descarga.tipo_descarga?.icono || '📦'}</span>
                          <div className="min-w-0">
                            <p className={`font-bold ${textColor} text-sm truncate`}>{descarga.tipo_descarga?.nombre}</p>
                            <p className={`text-xs ${subText}`}>
                              Desde {dayjs(descarga.fecha_hora_inicio).format('HH:mm')} · {dayjs(descarga.fecha_hora_inicio).format('DD/MM')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setDescargaSeleccionada(descarga); setShowFinalizarDescargaModal(true) }}
                          className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs flex-shrink-0 transition-all ${
                            theme === 'dark' ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'
                          }`}>
                          <StopCircle className="w-3.5 h-3.5" /> Finalizar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-6 border-2 border-dashed rounded-xl ${theme === 'dark' ? 'border-blue-500/20' : 'border-blue-300'}`}>
                    <Package className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-slate-700' : 'text-gray-300'}`} />
                    <p className={`${subText} text-sm mb-3`}>Sin descarga activa</p>
                    {puedeRegistrar && (
                      <button onClick={() => setShowDescargaModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs inline-flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Registrar
                      </button>
                    )}
                  </div>
                )}

                {historialDescargas.length > 0 && (
                  <div className={`mt-3 pt-3 border-t ${borderColor}`}>
                    <p className={`text-[10px] ${subText} uppercase tracking-wide mb-2 font-bold`}>Últimas finalizadas</p>
                    <div className="space-y-1.5">
                      {historialDescargas.slice(0, 2).map(desc => (
                        <div key={desc.id}
                          className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'bg-slate-800/40' : 'bg-gray-100'} px-3 py-2 rounded-lg`}>
                          <div className="flex items-center gap-2">
                            <span>{desc.tipo_descarga?.icono}</span>
                            <span className={subText}>{desc.tipo_descarga?.nombre}</span>
                          </div>
                          <span className={`${subText} text-[10px]`}>
                            {dayjs(desc.fecha_hora_inicio).format('HH:mm')} → {dayjs(desc.fecha_hora_fin).format('HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                    {historialDescargas.length > 2 && (
                      <button onClick={() => setShowHistorialDescargaModal(true)}
                        className={`mt-2 text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
                        Ver todos ({historialDescargas.length}) →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── LISTA / DASHBOARD ── */}
            {vista === 'lista' ? (
              <div className="space-y-3">
                <div className={`${cardBg} border ${borderColor} rounded-2xl p-3`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button onClick={handleNuevoAtraso} disabled={!puedeRegistrar}
                        className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-all ${
                          puedeRegistrar
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : theme === 'dark' ? 'bg-slate-800 text-slate-500' : 'bg-gray-200 text-gray-400'
                        }`}>
                        <Plus className="w-4 h-4" /> Nueva Demora
                      </button>
                      <button onClick={() => cargarRegistros(barcoSeleccionado.id)}
                        className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'}`}
                        title="Actualizar">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowFiltrosListaModal(true)}
                        className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                          tieneFiltrosBodegaActivos
                            ? 'bg-purple-500 text-white'
                            : theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Filtrar por bodega">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bodegas</span>
                        {tieneFiltrosBodegaActivos && (
                          <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">
                            {filtrosLista.bodegas.length + (filtrosLista.soloGenerales ? 1 : 0)}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${searchIcon} flex-shrink-0`} />
                      <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
                        className={`${inputBg} border ${borderColor} rounded-xl px-3 py-2 ${textColor} text-sm`} />
                    </div>
                  </div>

                  {tieneFiltrosBodegaActivos && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filtrosLista.soloGenerales && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                          Solo generales
                          <button onClick={() => setFiltrosLista({ ...filtrosLista, soloGenerales: false })}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {filtrosLista.bodegas.map(bodegaId => {
                        const bodega = bodegasBarco.find(b => b.id === bodegaId)
                        return bodega ? (
                          <span key={bodegaId} className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                            {bodega.nombre}
                            <button onClick={() => setFiltrosLista({ ...filtrosLista, bodegas: filtrosLista.bodegas.filter(id => id !== bodegaId) })}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                      <button onClick={() => setFiltrosLista({ bodegas: [], soloGenerales: false })}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                        Limpiar todo
                      </button>
                    </div>
                  )}

                  {/* CORRECCIÓN: Mensajes más claros sobre el estado */}
                  {estadoOperacion === 'finalizado' && (
                    <p className={`text-xs mt-2 flex items-center gap-1.5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                      <Info className="w-3.5 h-3.5" /> Operación finalizada — modo solo lectura
                    </p>
                  )}
                </div>

                <div className={`${cardBg} border ${borderColor} rounded-2xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
                    <h3 className={`font-bold ${textColor} flex items-center gap-2 text-sm`}>
                      <Clock className={`w-4 h-4 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                      {dayjs(filtroFecha).format('DD [de] MMMM, YYYY')}
                      {tieneFiltrosBodegaActivos && (
                        <span className={`text-xs font-normal ml-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                          (filtrado por bodega)
                        </span>
                      )}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${theme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                      {registrosFiltrados.length} registros
                    </span>
                  </div>
                  <div className="p-4">
                    {registrosFiltrados.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {registrosFiltrados.map(reg => (
                          <RegistroCard key={reg.id} reg={reg} tiposParo={tiposParo}
                            bodegasBarco={bodegasBarco}
                            onEditar={handleEditarAtraso} onEliminar={handleEliminarAtraso}
                            theme={theme} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-14 text-center">
                        <Clock className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-700' : 'text-gray-300'}`} />
                        <p className={`${subText} mb-1`}>
                          {tieneFiltrosBodegaActivos
                            ? 'No hay registros para esta fecha con los filtros seleccionados'
                            : 'Sin registros para esta fecha'}
                        </p>
                        {puedeRegistrar && (
                          <button onClick={handleNuevoAtraso}
                            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Registrar primer demora
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <DashboardAtrasos barco={barcoSeleccionado} registros={registros}
                tiposParo={tiposParo} onClose={() => setVista('lista')} theme={theme} />
            )}
          </>
        )}

        {!barcoSeleccionado && !loading && (
          <div className={`${cardBg} border ${borderColor} rounded-2xl p-12 text-center`}>
            <Ship className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-slate-700' : 'text-gray-300'}`} />
            <h3 className={`text-base font-bold ${textColor} mb-1`}>Sin barco seleccionado</h3>
            <p className={subText}>Selecciona un barco para comenzar</p>
          </div>
        )}
      </div>

      {puedeRegistrar && vista === 'lista' && (
        <button onClick={handleNuevoAtraso}
          className="sm:hidden fixed bottom-6 right-4 z-40 bg-gradient-to-r from-orange-500 to-red-600 text-white w-14 h-14 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-center active:scale-95 transition-transform">
          <Plus className="w-7 h-7" />
        </button>
      )}

      {showAtrasoModal && barcoSeleccionado && (
        <AtrasoModal barco={barcoSeleccionado} atraso={atrasoEditando} tiposParo={tiposParo}
          bodegasBarco={bodegasBarco} onClose={() => setShowAtrasoModal(false)} onSave={handleGuardarAtraso}
          theme={theme} />
      )}
      {showDescargaModal && barcoSeleccionado && (
        <RegistroDescargaModal barco={barcoSeleccionado} tiposDescarga={tiposDescarga}
          descargaActual={descargasActivas[0]}
          onClose={() => setShowDescargaModal(false)}
          onSave={() => cargarDescargas(barcoSeleccionado.id)}
          theme={theme} />
      )}
      {showFinalizarDescargaModal && descargaSeleccionada && (
        <FinalizarDescargaModal descarga={descargaSeleccionada}
          onClose={() => { setShowFinalizarDescargaModal(false); setDescargaSeleccionada(null) }}
          onConfirm={handleConfirmarFinalizarDescarga} theme={theme} />
      )}
      {showHistorialDescargaModal && barcoSeleccionado && (
        <HistorialDescargaModal barco={barcoSeleccionado} onClose={() => setShowHistorialDescargaModal(false)} theme={theme} />
      )}
      {showIniciarModal && barcoSeleccionado && (
        <IniciarOperacionModal barco={barcoSeleccionado} onClose={() => setShowIniciarModal(false)}
          onConfirm={handleIniciarOperacion} theme={theme} />
      )}
      {showFinalizarModal && barcoSeleccionado && (
        <FinalizarOperacionModal barco={barcoSeleccionado} onClose={() => setShowFinalizarModal(false)}
          onConfirm={handleFinalizarOperacion} theme={theme} />
      )}
      {showEditarTiemposModal && barcoSeleccionado && (
        <EditarTiemposModal barco={barcoSeleccionado} onClose={() => setShowEditarTiemposModal(false)}
          onSave={() => cargarOperacionInfo(barcoSeleccionado.id)} theme={theme} />
      )}
      {showFiltrosListaModal && barcoSeleccionado && (
        <FiltrosListaModal bodegas={bodegasBarco} filtros={filtrosLista}
          onClose={() => setShowFiltrosListaModal(false)} onAplicar={setFiltrosLista} theme={theme} />
      )}
    </div>
  )
}