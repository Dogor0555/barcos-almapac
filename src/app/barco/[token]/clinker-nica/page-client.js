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
  ChevronDown, ChevronUp, Search, Filter, Download, Eye
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

const svToUTC = (svDateTime) => {
  if (!svDateTime) return null
  return dayjs.tz(svDateTime, TIMEZONE_EL_SALVADOR).utc().toISOString()
}

const getCurrentSVTimeForInput = () => {
  return dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DDTHH:mm')
}

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
// FORMULARIO DE ATRASOS DE GRÚA
// =====================================================
const FormularioAtrasoGrua = ({ barco, onSave, onCancel, atrasoEditando }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    hora_inicio: '',
    hora_fin: '',
    descripcion: '',
    minutos_calculados: null
  })

  useEffect(() => {
    if (atrasoEditando) {
      setFormData({
        fecha: atrasoEditando.fecha || dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        hora_inicio: atrasoEditando.hora_inicio || '',
        hora_fin: atrasoEditando.hora_fin || '',
        descripcion: atrasoEditando.descripcion || '',
        minutos_calculados: atrasoEditando.minutos
      })
    }
  }, [atrasoEditando])

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

      const datos = {
        barco_id: barco.id,
        fecha: formData.fecha,
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
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="w-5 h-5 text-red-400" />
          {atrasoEditando ? 'Editar Atraso de Grúa' : 'Registrar Atraso de Grúa'}
        </h2>
        {atrasoEditando && onCancel && (
          <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white">Cancelar edición</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
          <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
            <div className="flex gap-2">
              <input type="time" value={formData.hora_inicio} onChange={(e) => handleHoraChange('hora_inicio', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
              <button type="button" onClick={() => handleHoraChange('hora_inicio', dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400" title="Ahora">
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
            <div className="flex gap-2">
              <input type="time" value={formData.hora_fin} onChange={(e) => handleHoraChange('hora_fin', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" />
              <button type="button" onClick={() => handleHoraChange('hora_fin', dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400" title="Ahora">
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

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel || (() => {})} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {atrasoEditando ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

// =====================================================
// FORMULARIO DE BARCASAS (Bitácora de carga)
// =====================================================
const FormularioBarcaza = ({ barco, onSave, onCancel, barcazaEditando }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    nombre_barcaza: '',
    placa: '',
    hora_inicio: '',
    hora_finalizacion: '',
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
        observaciones: barcazaEditando.observaciones || ''
      })
    }
  }, [barcazaEditando])

  const calcularTiempoTotal = (inicio, fin) => {
    if (!inicio || !fin) return null
    const [hI, mI] = inicio.split(':').map(Number)
    const [hF, mF] = fin.split(':').map(Number)
    let minI = hI * 60 + mI
    let minF = hF * 60 + mF
    if (minF < minI) minF += 24 * 60
    const diffMin = minF - minI
    const horas = Math.floor(diffMin / 60)
    const minutos = diffMin % 60
    return `${horas}h ${minutos}m`
  }

  const tiempoCalculado = useMemo(() => {
    return calcularTiempoTotal(formData.hora_inicio, formData.hora_finalizacion)
  }, [formData.hora_inicio, formData.hora_finalizacion])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      const tiempoTotal = calcularTiempoTotal(formData.hora_inicio, formData.hora_finalizacion)

      const datos = {
        barco_id: barco.id,
        fecha: formData.fecha,
        nombre_barcaza: formData.nombre_barcaza,
        placa: formData.placa,
        hora_inicio: formData.hora_inicio,
        hora_finalizacion: formData.hora_finalizacion,
        tiempo_total: tiempoTotal,
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
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Ship className="w-5 h-5 text-blue-400" />
          {barcazaEditando ? 'Editar Barcaza' : 'Registrar Barcaza'}
        </h2>
        {barcazaEditando && onCancel && (
          <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white">Cancelar edición</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
            <div className="flex gap-2">
              <input type="time" value={formData.hora_inicio} onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, hora_inicio: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))} className="px-2.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400" title="Ahora">
                <Play className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Finalización</label>
            <div className="flex gap-2">
              <input type="time" value={formData.hora_finalizacion} onChange={(e) => setFormData({ ...formData, hora_finalizacion: e.target.value })} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, hora_finalizacion: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))} className="px-2.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400" title="Ahora">
                <StopCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {tiempoCalculado && (
          <div className="bg-green-500/10 rounded-xl p-3 text-center">
            <span className="text-green-400 font-bold">
              Tiempo Total Calculado: {tiempoCalculado}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
          <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} rows="2" className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm" placeholder="Notas adicionales..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel || (() => {})} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {barcazaEditando ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
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
  
  // Barcazas
  const [barcazas, setBarcazas] = useState([])
  const [barcazaEditando, setBarcazaEditando] = useState(null)
  const [showBarcazaForm, setShowBarcazaForm] = useState(false)
  
  // Atrasos grúa
  const [atrasosGrua, setAtrasosGrua] = useState([])
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [showAtrasoForm, setShowAtrasoForm] = useState(false)
  
  // Filtros y estado UI
  const [seccionActiva, setSeccionActiva] = useState('barcazas')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [ordenTabla, setOrdenTabla] = useState('reciente')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    cargarDatos()
  }, [token])

  const cargarDatos = async () => {
    try {
      setLoading(true)

      // Cargar barco
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

      // Cargar barcazas
      const { data: barcazasData } = await supabase
        .from('clinker_barcazas')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      setBarcazas(barcazasData || [])

      // Cargar atrasos grúa
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

  // Filtrar barcazas por fecha
  const barcazasFiltradas = useMemo(() => {
    if (!filtroFecha) return barcazas
    return barcazas.filter(b => b.fecha === filtroFecha)
  }, [barcazas, filtroFecha])

  // Filtrar atrasos por fecha
  const atrasosFiltrados = useMemo(() => {
    if (!filtroFecha) return atrasosGrua
    return atrasosGrua.filter(a => a.fecha === filtroFecha)
  }, [atrasosGrua, filtroFecha])

  // Ordenar barcazas
  const barcazasOrdenadas = useMemo(() => {
    const ordenadas = [...barcazasFiltradas]
    if (ordenTabla === 'reciente') {
      return ordenadas.sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`))
    } else {
      return ordenadas.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`))
    }
  }, [barcazasFiltradas, ordenTabla])

  // Ordenar atrasos
  const atrasosOrdenados = useMemo(() => {
    const ordenadas = [...atrasosFiltrados]
    if (ordenTabla === 'reciente') {
      return ordenadas.sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`))
    } else {
      return ordenadas.sort((a, b) => `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`))
    }
  }, [atrasosFiltrados, ordenTabla])

  // Estadísticas de barcazas
  const estadisticasBarcazas = useMemo(() => {
    const totalRegistros = barcazas.length
    const barcazasUnicas = [...new Set(barcazas.map(b => b.nombre_barcaza))]
    
    let totalMinutos = 0
    barcazas.forEach(b => {
      if (b.tiempo_total) {
        const match = b.tiempo_total.match(/(\d+)h\s*(\d+)m/)
        if (match) {
          totalMinutos += parseInt(match[1]) * 60 + parseInt(match[2])
        }
      }
    })

    return {
      totalRegistros,
      barcazasUnicas: barcazasUnicas.length,
      totalHoras: Math.floor(totalMinutos / 60),
      totalMinutos: totalMinutos % 60
    }
  }, [barcazas])

  // Estadísticas de atrasos
  const estadisticasAtrasos = useMemo(() => {
    const totalAtrasos = atrasosGrua.length
    const totalMinutos = atrasosGrua.reduce((sum, a) => sum + (a.minutos || 0), 0)
    const enCurso = atrasosGrua.filter(a => a.hora_inicio && !a.hora_fin).length

    return {
      totalAtrasos,
      totalHoras: Math.floor(totalMinutos / 60),
      totalMinutos: totalMinutos % 60,
      enCurso
    }
  }, [atrasosGrua])

  // Exportar a Excel
  const exportarExcel = async () => {
    setExportando(true)
    try {
      const wb = XLSX.utils.book_new()

      // Datos para Excel
      const resumenData = [
        ['REPORTE CLINKER NICARAGUA'],
        [`Barco: ${barco?.nombre || 'N/A'}`],
        [`Código: ${barco?.codigo_barco || 'N/A'}`],
        [`Fecha de exportación: ${dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm:ss')}`],
        [],
        ['RESUMEN DE BARCASAS'],
        ['Total registros', estadisticasBarcazas.totalRegistros],
        ['Barcazas distintas', estadisticasBarcazas.barcazasUnicas],
        ['Tiempo total de operación', `${estadisticasBarcazas.totalHoras}h ${estadisticasBarcazas.totalMinutos}m`],
        [],
        ['RESUMEN DE ATRASOS DE GRÚA'],
        ['Total atrasos', estadisticasAtrasos.totalAtrasos],
        ['Tiempo total de atrasos', `${estadisticasAtrasos.totalHoras}h ${estadisticasAtrasos.totalMinutos}m`],
        ['Atrasos en curso', estadisticasAtrasos.enCurso],
        [],
        ['DETALLE DE BARCASAS']
      ]

      // Agregar datos de barcazas
      resumenData.push(['Fecha', 'Barcaza', 'Placa', 'Hora Inicio', 'Hora Fin', 'Tiempo Total', 'Observaciones'])
      barcazas.forEach(b => {
        resumenData.push([
          b.fecha,
          b.nombre_barcaza,
          b.placa || '—',
          b.hora_inicio,
          b.hora_finalizacion || '—',
          b.tiempo_total || '—',
          b.observaciones || '—'
        ])
      })

      resumenData.push([], ['DETALLE DE ATRASOS DE GRÚA'])
      resumenData.push(['Fecha', 'Hora Inicio', 'Hora Fin', 'Minutos', 'Descripción'])
      atrasosGrua.forEach(a => {
        resumenData.push([
          a.fecha,
          a.hora_inicio,
          a.hora_fin || 'En curso',
          a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—',
          a.descripcion || '—'
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(resumenData)
      ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }]
      
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

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Anchor className="w-8 h-8" />
                  {barco.nombre} - CLINKER NICARAGUA
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
              <p className="text-orange-200 text-sm mt-1">
                Registro de Barcazas y Atrasos de Grúa · {dayjs().tz(TIMEZONE_EL_SALVADOR).format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportarExcel} disabled={exportando} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                <FileSpreadsheet className="w-4 h-4" />
                {exportando ? 'Exportando...' : 'Descargar Excel'}
              </button>
              <button onClick={cargarDatos} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Barcazas Registradas</p>
              <p className="text-2xl font-black">{estadisticasBarcazas.totalRegistros}</p>
              <p className="text-xs text-orange-200/70">{estadisticasBarcazas.barcazasUnicas} barcazas distintas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Tiempo Total Operación</p>
              <p className="text-2xl font-black">{estadisticasBarcazas.totalHoras}h</p>
              <p className="text-xs text-orange-200/70">{estadisticasBarcazas.totalMinutos} minutos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Atrasos de Grúa</p>
              <p className="text-2xl font-black">{estadisticasAtrasos.totalAtrasos}</p>
              <p className="text-xs text-orange-200/70">{estadisticasAtrasos.enCurso} en curso</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Tiempo Perdido</p>
              <p className="text-2xl font-black">{estadisticasAtrasos.totalHoras}h</p>
              <p className="text-xs text-orange-200/70">{estadisticasAtrasos.totalMinutos} minutos</p>
            </div>
          </div>
        </div>

        {/* Selector de sección */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex">
            <button
              onClick={() => setSeccionActiva('barcazas')}
              className={`flex-1 px-6 py-4 text-center font-bold transition-all ${
                seccionActiva === 'barcazas'
                  ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Ship className="w-5 h-5 inline mr-2" />
              Bitácora de Barcazas
            </button>
            <button
              onClick={() => setSeccionActiva('atrasos')}
              className={`flex-1 px-6 py-4 text-center font-bold transition-all ${
                seccionActiva === 'atrasos'
                  ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Wrench className="w-5 h-5 inline mr-2" />
              Atrasos de Grúa
            </button>
          </div>
        </div>

        {/* SECCIÓN DE BARCASAS */}
        {seccionActiva === 'barcazas' && (
          <>
            {/* Filtros */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
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
                <div className="flex gap-2">
                  <button
                    onClick={() => { setBarcazaEditando(null); setShowBarcazaForm(!showBarcazaForm) }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Barcaza
                  </button>
                  <button
                    onClick={() => setOrdenTabla(ordenTabla === 'reciente' ? 'antiguo' : 'reciente')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    {ordenTabla === 'reciente' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    {ordenTabla === 'reciente' ? 'Más Reciente' : 'Más Antiguo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Formulario de barcazas */}
            {showBarcazaForm && (
              <FormularioBarcaza
                barco={barco}
                onSave={() => {
                  setShowBarcazaForm(false)
                  setBarcazaEditando(null)
                  cargarDatos()
                }}
                onCancel={() => {
                  setShowBarcazaForm(false)
                  setBarcazaEditando(null)
                }}
                barcazaEditando={barcazaEditando}
              />
            )}

            {/* Tabla de barcazas */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Ship className="w-4 h-4 text-blue-400" />
                  Bitácora de Barcazas ({barcazasOrdenadas.length} registros)
                  {filtroFecha && <span className="text-sm font-normal text-slate-400">· Filtrado por: {filtroFecha}</span>}
                </h3>
              </div>

              {barcazasOrdenadas.length === 0 ? (
                <div className="p-12 text-center">
                  <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de barcazas</p>
                  <button onClick={() => setShowBarcazaForm(true)} className="mt-4 text-blue-400 text-sm hover:text-blue-300">
                    + Registrar primera barcaza
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Barcaza</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Placa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Fin</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tiempo Total</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {barcazasOrdenadas.map((b) => (
                        <tr key={b.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-slate-300">{b.fecha}</td>
                          <td className="px-4 py-3 font-bold text-white">{b.nombre_barcaza}</td>
                          <td className="px-4 py-3 font-mono text-blue-400">{b.placa || '—'}</td>
                          <td className="px-4 py-3">{b.hora_inicio}</td>
                          <td className="px-4 py-3">{b.hora_finalizacion || '—'}</td>
                          <td className="px-4 py-3 font-bold text-green-400">{b.tiempo_total || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{b.observaciones || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setBarcazaEditando(b); setShowBarcazaForm(true) }}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                title="Editar"
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
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </>
        )}

        {/* SECCIÓN DE ATRASOS DE GRÚA */}
        {seccionActiva === 'atrasos' && (
          <>
            {/* Filtros */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3 items-center">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
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
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAtrasoEditando(null); setShowAtrasoForm(!showAtrasoForm) }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Atraso
                  </button>
                  <button
                    onClick={() => setOrdenTabla(ordenTabla === 'reciente' ? 'antiguo' : 'reciente')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                  >
                    {ordenTabla === 'reciente' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                    {ordenTabla === 'reciente' ? 'Más Reciente' : 'Más Antiguo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Formulario de atrasos */}
            {showAtrasoForm && (
              <FormularioAtrasoGrua
                barco={barco}
                onSave={() => {
                  setShowAtrasoForm(false)
                  setAtrasoEditando(null)
                  cargarDatos()
                }}
                onCancel={() => {
                  setShowAtrasoForm(false)
                  setAtrasoEditando(null)
                }}
                atrasoEditando={atrasoEditando}
              />
            )}

            {/* Tabla de atrasos */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-400" />
                  Atrasos de Grúa ({atrasosOrdenados.length} registros)
                  {filtroFecha && <span className="text-sm font-normal text-slate-400">· Filtrado por: {filtroFecha}</span>}
                </h3>
              </div>

              {atrasosOrdenados.length === 0 ? (
                <div className="p-12 text-center">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de atrasos</p>
                  <button onClick={() => setShowAtrasoForm(true)} className="mt-4 text-red-400 text-sm hover:text-red-300">
                    + Registrar primer atraso
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Fin</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Minutos</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {atrasosOrdenados.map((a) => (
                        <tr key={a.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-slate-300">{a.fecha}</td>
                          <td className="px-4 py-3">{a.hora_inicio}</td>
                          <td className="px-4 py-3">
                            {a.hora_fin || <span className="text-yellow-400 animate-pulse">● En curso</span>}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-md">
                            {a.descripcion || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setAtrasoEditando(a); setShowAtrasoForm(true) }}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                title="Editar"
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
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
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
          </>
        )}
      </div>
    </div>
  )
}