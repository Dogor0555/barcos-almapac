'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin, isChequeroTraslado, logout } from '../../lib/auth'
import {
  ArrowLeft, Clock3, Plus, Search, Filter, RefreshCw,
  Calendar, Truck, AlertCircle, Download, Loader, X,
  Trash2, Edit2, CheckCircle, FolderOpen, Wrench
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

// Modal para registrar/editar atraso general
const AtrasoGeneralForm = ({ atraso = null, operativos, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fecha: atraso?.fecha || new Date().toISOString().split('T')[0],
    hora: atraso?.hora || '',
    tipo_atraso: atraso?.tipo_atraso || '',
    duracion_minutos: atraso?.duracion_minutos || 30,
    observaciones: atraso?.observaciones || '',
    operativo_id: atraso?.operativo_id || '',
    area: atraso?.area || '',
    es_general: true
  })

  const tiposAtraso = [
    'Falla mecánica - Grúa',
    'Falla mecánica - Banda',
    'Falla mecánica - Montacargas',
    'Falla eléctrica',
    'Falla hidráulica',
    'Falta de unidades',
    'Falta de personal',
    'Mantenimiento programado',
    'Problemas con balanza',
    'Problemas con sistema',
    'Espera de materiales',
    'Otro'
  ]

  const areas = [
    'Bodega 1',
    'Bodega 2',
    'Bodega 3',
    'Bodega 4',
    'Bodega 5',
    'Bodega 6',
    'Área de pesaje',
    'Área de descarga',
    'Mantenimiento',
    'General'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      if (!formData.operativo_id) {
        throw new Error('Debes seleccionar un operativo')
      }

      let result

      if (atraso) {
        // Actualizar
        result = await supabase
          .from('traslados_atrasos')
          .update({
            ...formData,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', atraso.id)

        if (result.error) throw result.error
        toast.success('✅ Atraso actualizado')
      } else {
        // Crear nuevo
        result = await supabase
          .from('traslados_atrasos')
          .insert([{
            ...formData,
            created_by: user.id
          }])

        if (result.error) throw result.error
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
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 sticky top-0 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {atraso ? 'Editar Atraso General' : 'Nuevo Atraso General'}
          </h3>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">Hora</label>
              <input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({...formData, hora: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Tipo de Atraso</label>
            <select
              value={formData.tipo_atraso}
              onChange={(e) => setFormData({...formData, tipo_atraso: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Seleccionar tipo</option>
              {tiposAtraso.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Área / Equipo</label>
            <select
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
            >
              <option value="">Seleccionar área (opcional)</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Duración (minutos)</label>
            <input
              type="number"
              min="1"
              step="5"
              value={formData.duracion_minutos}
              onChange={(e) => setFormData({...formData, duracion_minutos: parseInt(e.target.value)})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">Observaciones</label>
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
              {loading ? 'Guardando...' : atraso ? 'Actualizar' : 'Registrar Atraso'}
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

export default function AtrasosGeneralesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [atrasos, setAtrasos] = useState([])
  const [operativos, setOperativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  
  // Filtros
  const [filtroOperativo, setFiltroOperativo] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    totalMinutos: 0,
    porTipo: {},
    porArea: {}
  })

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
      
      // Cargar atrasos generales
      const { data: atrasosData } = await supabase
        .from('traslados_atrasos')
        .select('*')
        .eq('es_general', true)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      setAtrasos(atrasosData || [])

      // Cargar operativos
      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })

      setOperativos(operativosData || [])

      // Calcular estadísticas
      calcularEstadisticas(atrasosData || [])
      
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const calcularEstadisticas = (datos) => {
    const total = datos.length
    const totalMinutos = datos.reduce((sum, a) => sum + a.duracion_minutos, 0)

    const porTipo = {}
    const porArea = {}

    datos.forEach(a => {
      // Por tipo
      if (!porTipo[a.tipo_atraso]) {
        porTipo[a.tipo_atraso] = { count: 0, minutos: 0 }
      }
      porTipo[a.tipo_atraso].count++
      porTipo[a.tipo_atraso].minutos += a.duracion_minutos

      // Por área
      if (a.area) {
        if (!porArea[a.area]) {
          porArea[a.area] = { count: 0, minutos: 0 }
        }
        porArea[a.area].count++
        porArea[a.area].minutos += a.duracion_minutos
      }
    })

    setStats({ total, totalMinutos, porTipo, porArea })
  }

  const handleEliminar = async (id) => {
    if (!isAdmin()) {
      toast.error('Solo administradores pueden eliminar')
      return
    }
    if (!confirm('¿Eliminar este registro de atraso?')) return

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

  const handleExportar = () => {
    const datosExportar = {
      metadata: {
        fecha_exportacion: new Date().toISOString(),
        exportado_por: user?.nombre,
        total_registros: atrasosFiltrados.length
      },
      estadisticas: stats,
      datos: atrasosFiltrados
    }

    const blob = new Blob([JSON.stringify(datosExportar, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `atrasos-generales-${dayjs().format('YYYYMMDD-HHmm')}.json`
    link.click()
    toast.success('✅ Datos exportados')
  }

  const tiposUnicos = [...new Set(atrasos.map(a => a.tipo_atraso))].sort()

  const atrasosFiltrados = atrasos.filter(a => {
    if (filtroOperativo !== 'todos' && a.operativo_id !== parseInt(filtroOperativo)) return false
    if (filtroTipo !== 'todos' && a.tipo_atraso !== filtroTipo) return false
    if (filtroFechaInicio && a.fecha < filtroFechaInicio) return false
    if (filtroFechaFin && a.fecha > filtroFechaFin) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return a.tipo_atraso?.toLowerCase().includes(term) ||
             a.area?.toLowerCase().includes(term) ||
             a.observaciones?.toLowerCase().includes(term)
    }
    return true
  })

  const formatHora = (hora) => hora?.substring(0, 5) || '—'
  const formatFecha = (fecha) => fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <Loader className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/traslados"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Wrench className="w-8 h-8" />
                  Atrasos Generales
                </h1>
                <p className="text-red-200 text-sm mt-1">
                  {user?.nombre} · Problemas mecánicos, falta de unidades, etc.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportar}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                onClick={() => {
                  setAtrasoEditando(null)
                  setShowForm(true)
                }}
                className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Atraso
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
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-red-200 text-xs">Total Atrasos</p>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-red-200 text-xs">Minutos Totales</p>
              <p className="text-2xl font-black text-white">{stats.totalMinutos}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-red-200 text-xs">Horas Totales</p>
              <p className="text-2xl font-black text-white">
                {Math.floor(stats.totalMinutos / 60)}h {stats.totalMinutos % 60}m
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1e293b] rounded-xl p-4 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filtroOperativo}
              onChange={(e) => setFiltroOperativo(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="todos">Todos los operativos</option>
              {operativos.map(op => (
                <option key={op.id} value={op.id}>{op.nombre}</option>
              ))}
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="todos">Todos los tipos</option>
              {tiposUnicos.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>

            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              placeholder="Fecha desde"
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
            />

            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              placeholder="Fecha hasta"
              className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por tipo, área u observaciones..."
                className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white"
              />
            </div>
            
            {(filtroOperativo !== 'todos' || filtroTipo !== 'todos' || filtroFechaInicio || filtroFechaFin || searchTerm) && (
              <button
                onClick={() => {
                  setFiltroOperativo('todos')
                  setFiltroTipo('todos')
                  setFiltroFechaInicio('')
                  setFiltroFechaFin('')
                  setSearchTerm('')
                }}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Tabla de atrasos generales */}
        <div className="bg-[#1e293b] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-800 px-6 py-4 border-b border-white/10">
            <h2 className="font-black text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-400" />
              Listado de Atrasos Generales
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({atrasosFiltrados.length} registros)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Operativo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Área/Equipo</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Duración</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {atrasosFiltrados.map((a) => {
                  const operativo = operativos.find(o => o.id === a.operativo_id)
                  return (
                    <tr key={a.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 text-slate-300 font-mono">
                        {formatFecha(a.fecha)}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono">
                        {formatHora(a.hora)}
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
                        {a.area ? (
                          <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-xs">
                            {a.area}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-white">
                          {Math.floor(a.duracion_minutos / 60)}h {a.duracion_minutos % 60}m
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          ({a.duracion_minutos} min)
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-300 truncate">
                          {a.observaciones || '—'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isAdmin() && (
                            <>
                              <button
                                onClick={() => {
                                  setAtrasoEditando(a)
                                  setShowForm(true)
                                }}
                                className="p-2 hover:bg-blue-500/20 rounded-lg"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleEliminar(a.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
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

        {/* Estadísticas por tipo */}
        {Object.keys(stats.porTipo).length > 0 && (
          <div className="bg-[#1e293b] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Estadísticas por Tipo de Atraso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.porTipo).map(([tipo, data]) => (
                <div key={tipo} className="bg-slate-800 rounded-lg p-4">
                  <p className="font-bold text-white mb-2">{tipo}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cantidad:</span>
                      <span className="text-white font-bold">{data.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Minutos:</span>
                      <span className="text-red-400 font-bold">{data.minutos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Horas:</span>
                      <span className="text-orange-400 font-bold">
                        {Math.floor(data.minutos / 60)}h {data.minutos % 60}m
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <AtrasoGeneralForm
          atraso={atrasoEditando}
          operativos={operativos}
          onClose={() => {
            setShowForm(false)
            setAtrasoEditando(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setAtrasoEditando(null)
            cargarDatos()
          }}
        />
      )}
    </div>
  )
}