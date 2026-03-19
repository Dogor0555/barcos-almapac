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
  Wrench
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Link from 'next/link'
import TrasladoForm from '../components/traslados/TrasladoForm'

// Componente para el modal de detalle de traslado
const DetalleTrasladoModal = ({ traslado, onClose }) => {
  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6">
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
                <p className="text-slate-500 text-xs">Fecha</p>
                <p className="font-bold text-white">{formatFecha(traslado.fecha)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500 text-xs">Inicio</p>
                  <p className="font-bold text-green-400">{formatHora(traslado.hora_inicio_carga)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Fin</p>
                  <p className="font-bold text-red-400">{formatHora(traslado.hora_fin_carga)}</p>
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-xs">No. Marchamo</p>
                <p className="font-bold text-white font-mono">{traslado.no_marchamo}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Estado</p>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  traslado.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                  traslado.estado === 'completado' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {traslado.estado}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente para registrar atrasos GENERALES del operativo
const AtrasoGeneralForm = ({ operativos, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    tipo_atraso: '',
    observaciones: '',
    operativo_id: ''
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

      const { error } = await supabase
        .from('traslados_atrasos')
        .insert([{
          es_general: true,
          operativo_id: formData.operativo_id,
          fecha: formData.fecha,
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          tipo_atraso: formData.tipo_atraso,
          duracion_minutos: duracion_minutos,
          observaciones: formData.observaciones,
          created_by: user.id
        }])

      if (error) throw error

      toast.success('✅ Atraso general registrado')
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
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-white" />
            <h3 className="text-lg font-black text-white">Registrar Atraso General</h3>
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
              {loading ? 'Guardando...' : 'Registrar Atraso General'}
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
  const [trasladoSeleccionado, setTrasladoSeleccionado] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroOperativo, setFiltroOperativo] = useState('todos')
  const [filtroAtrasoOperativo, setFiltroAtrasoOperativo] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [exportando, setExportando] = useState(null)

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

      // Cargar atrasos generales (NO asociados a ningún viaje)
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

  // Filtros para traslados
  const trasladosFiltrados = traslados.filter(t => {
    if (filtroEstado !== 'todos' && t.estado !== filtroEstado) return false
    if (filtroOperativo !== 'todos' && t.operativo_id !== parseInt(filtroOperativo)) return false
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
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {isAdmin() && (
                <Link href="/admin" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              )}
              <div>
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Truck className="w-8 h-8" />
                  Gestión de Traslados de Azúcar
                </h1>
                <p className="text-amber-200 text-sm mt-1">
                  {user?.nombre} · Rol: <span className="capitalize">{user?.rol}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard-traslados"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={() => setShowForm(true)}
                className="bg-white hover:bg-amber-50 text-amber-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Traslado
              </button>
              <button
                onClick={() => setShowAtrasoGeneralForm(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                Atraso General
              </button>
              <button
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={logout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-amber-200 text-xs">Total Traslados</p>
              <p className="text-2xl font-black text-white">{traslados.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-amber-200 text-xs">Activos</p>
              <p className="text-2xl font-black text-white">
                {traslados.filter(t => t.estado === 'activo').length}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-amber-200 text-xs">Completados</p>
              <p className="text-2xl font-black text-white">
                {traslados.filter(t => t.estado === 'completado').length}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-amber-200 text-xs">Atrasos Grales</p>
              <p className="text-2xl font-black text-white">{atrasosGenerales.length}</p>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE TRASLADOS */}
        <div className="bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
            <h2 className="font-black text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              Listado de Traslados
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({trasladosFiltrados.length} de {traslados.length})
              </span>
            </h2>
          </div>

          {/* Filtros de traslados */}
          <div className="p-4 border-b border-white/10">
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white min-w-[150px]"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="completado">Completados</option>
                <option value="cancelado">Cancelados</option>
              </select>

              <select
                value={filtroOperativo}
                onChange={(e) => setFiltroOperativo(e.target.value)}
                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white min-w-[200px]"
              >
                <option value="todos">Todos los operativos</option>
                {operativos.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.nombre}
                  </option>
                ))}
              </select>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por correlativo, conductor, remolque..."
                  className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Tabla de traslados */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Correlativo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Operativo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Conductor</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Remolque</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Transporte</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Marchamo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trasladosFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-mono text-amber-400 font-bold">{t.correlativo_viaje}</td>
                    <td className="px-6 py-4">
                      <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit">
                        <FolderOpen className="w-3 h-3" />
                        {getOperativoNombre(t.operativo_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{t.nombre_conductor}</td>
                    <td className="px-6 py-4 font-mono text-blue-400">{t.remolque}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                        t.tipo_unidad === 'plana' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {t.tipo_unidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{t.transporte}</td>
                    <td className="px-6 py-4 text-slate-300">{formatFecha(t.fecha)}</td>
                    <td className="px-6 py-4">
                      <span className="text-green-400">{formatHora(t.hora_inicio_carga)}</span>
                      <span className="text-slate-600 mx-1">→</span>
                      <span className="text-red-400">{formatHora(t.hora_fin_carga)}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-400 text-xs">{t.no_marchamo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        t.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                        t.estado === 'completado' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
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
                          className="p-2 hover:bg-blue-500/20 rounded-lg"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                        </button>
                        {t.estado === 'activo' && (
                          <button
                            onClick={() => handleCambiarEstado(t.id, t.estado)}
                            className="p-2 hover:bg-green-500/20 rounded-lg"
                            title="Completar"
                          >
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </button>
                        )}
                        <button
                          onClick={() => handleExportar(t)}
                          disabled={exportando === t.id}
                          className="p-2 hover:bg-indigo-500/20 rounded-lg"
                        >
                          {exportando === t.id ? (
                            <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-indigo-400" />
                          )}
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => handleEliminarTraslado(t.id, t.correlativo_viaje)}
                            className="p-2 hover:bg-red-500/20 rounded-lg"
                          >
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

          {trasladosFiltrados.length === 0 && (
            <div className="p-12 text-center">
              <Truck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No se encontraron traslados</p>
            </div>
          )}
        </div>

        {/* SECCIÓN DE ATRASOS GENERALES */}
        <div className="bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
            <h2 className="font-black text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-400" />
              Atrasos Generales del Operativo
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({atrasosFiltrados.length} de {atrasosGenerales.length})
              </span>
            </h2>
          </div>

          {/* Filtro de atrasos por operativo */}
          <div className="p-4 border-b border-white/10">
            <select
              value={filtroAtrasoOperativo}
              onChange={(e) => setFiltroAtrasoOperativo(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white min-w-[200px]"
            >
              <option value="todos">Todos los operativos</option>
              {operativos.map(op => (
                <option key={op.id} value={op.id}>
                  {op.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Operativo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo de Atraso</th>
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
                      <td className="px-6 py-4 text-slate-300 font-mono">
                        {formatFecha(a.fecha)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400">{formatHora(a.hora_inicio)}</span>
                        <span className="text-slate-600 mx-1">→</span>
                        <span className="text-red-400">{formatHora(a.hora_fin)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full text-xs">
                          {operativo?.nombre || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                          {a.tipo_atraso}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">
                          {Math.floor(diffMinutos / 60)}h {diffMinutos % 60}m
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-300 truncate">
                          {a.observaciones || '—'}
                        </p>
                      </td>
                      {isAdmin() && (
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleEliminarAtrasoGeneral(a.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg"
                            title="Eliminar"
                          >
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

          {atrasosFiltrados.length === 0 && (
            <div className="p-12 text-center">
              <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No hay atrasos generales registrados</p>
            </div>
          )}
        </div>
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

      {showAtrasoGeneralForm && (
        <AtrasoGeneralForm
          operativos={operativos}
          onClose={() => setShowAtrasoGeneralForm(false)}
          onSuccess={() => {
            setShowAtrasoGeneralForm(false)
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
        />
      )}
    </div>
  )
}