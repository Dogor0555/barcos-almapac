'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { getCurrentUser, isAdmin } from '@/app/lib/auth'
import toast from 'react-hot-toast'
import {
  Truck, ArrowLeft, Plus, Search, Edit2, Trash2, X, Save,
  Filter, CheckSquare, Square, Check, ChevronDown, Ship,
  LogOut, RefreshCw, Settings, Car
} from 'lucide-react'

export default function AdminUnidadesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTransporte, setFiltroTransporte] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [unidadEditando, setUnidadEditando] = useState(null)
  const [formData, setFormData] = useState({ placa: '', transporte: '', tipo: '' })
  const [seleccionadas, setSeleccionadas] = useState([])
  const [modalEdicionMasiva, setModalEdicionMasiva] = useState(false)
  const [edicionMasivaData, setEdicionMasivaData] = useState({ transporte: '', tipo: '' })
  const [transportes, setTransportes] = useState([])
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarUnidades()
  }, [router])

  const cargarUnidades = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('transporte', { ascending: true })
        .order('placa', { ascending: true })

      if (error) throw error
      setUnidades(data || [])

      const transportesUnicos = [...new Set((data || []).map(u => u.transporte).filter(Boolean))]
      setTransportes(transportesUnicos.sort())
    } catch (err) {
      console.error('Error cargando unidades:', err)
      toast.error('Error al cargar las unidades')
    } finally {
      setLoading(false)
    }
  }

  const unidadesFiltradas = unidades.filter(u => {
    const coincideBusqueda = !busqueda || 
      u.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.transporte?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideTransporte = !filtroTransporte || u.transporte === filtroTransporte
    const coincideTipo = !filtroTipo || u.tipo === filtroTipo
    return coincideBusqueda && coincideTransporte && coincideTipo
  })

  const toggleSeleccion = (placa) => {
    setSeleccionadas(prev => 
      prev.includes(placa) 
        ? prev.filter(p => p !== placa)
        : [...prev, placa]
    )
  }

  const toggleSeleccionarTodas = () => {
    if (seleccionadas.length === unidadesFiltradas.length) {
      setSeleccionadas([])
    } else {
      setSeleccionadas(unidadesFiltradas.map(u => u.placa))
    }
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!formData.placa.trim()) { toast.error('La placa es obligatoria'); return }
    if (!formData.transporte.trim()) { toast.error('El transporte es obligatorio'); return }
    if (!formData.tipo.trim()) { toast.error('El tipo es obligatorio'); return }

    try {
      const { error } = await supabase
        .from('unidades')
        .insert([{
          placa: formData.placa.toUpperCase().trim(),
          transporte: formData.transporte.trim(),
          tipo: formData.tipo
        }])

      if (error) throw error
      toast.success('Unidad creada correctamente')
      setModalCrear(false)
      setFormData({ placa: '', transporte: '', tipo: '' })
      await cargarUnidades()
    } catch (err) {
      console.error('Error creando unidad:', err)
      toast.error(err.message || 'Error al crear la unidad')
    }
  }

  const handleEditar = async (e) => {
    e.preventDefault()
    if (!formData.placa.trim()) { toast.error('La placa es obligatoria'); return }
    if (!formData.transporte.trim()) { toast.error('El transporte es obligatorio'); return }
    if (!formData.tipo.trim()) { toast.error('El tipo es obligatorio'); return }

    try {
      const { error } = await supabase
        .from('unidades')
        .update({
          transporte: formData.transporte.trim(),
          tipo: formData.tipo
        })
        .eq('placa', unidadEditando.placa)

      if (error) throw error
      toast.success('Unidad actualizada correctamente')
      setModalEditar(false)
      setUnidadEditando(null)
      setFormData({ placa: '', transporte: '', tipo: '' })
      await cargarUnidades()
    } catch (err) {
      console.error('Error editando unidad:', err)
      toast.error(err.message || 'Error al actualizar la unidad')
    }
  }

  const handleEliminar = async (placa) => {
    if (!confirm(`¿Estás seguro de eliminar la unidad ${placa}?`)) return

    try {
      setEliminando(placa)
      const { error } = await supabase
        .from('unidades')
        .delete()
        .eq('placa', placa)

      if (error) throw error
      toast.success(`Unidad ${placa} eliminada`)
      await cargarUnidades()
    } catch (err) {
      console.error('Error eliminando unidad:', err)
      toast.error('Error al eliminar la unidad')
    } finally {
      setEliminando(null)
    }
  }

  const handleEdicionMasiva = async (e) => {
    e.preventDefault()
    if (seleccionadas.length === 0) { toast.error('Selecciona al menos una unidad'); return }

    const actualizar = {}
    if (edicionMasivaData.transporte.trim()) {
      actualizar.transporte = edicionMasivaData.transporte.trim()
    }
    if (edicionMasivaData.tipo) {
      actualizar.tipo = edicionMasivaData.tipo
    }

    if (Object.keys(actualizar).length === 0) {
      toast.error('Selecciona al menos un campo para actualizar')
      return
    }

    try {
      const { error } = await supabase
        .from('unidades')
        .update(actualizar)
        .in('placa', seleccionadas)

      if (error) throw error
      toast.success(`${seleccionadas.length} unidades actualizadas`)
      setModalEdicionMasiva(false)
      setSeleccionadas([])
      setEdicionMasivaData({ transporte: '', tipo: '' })
      await cargarUnidades()
    } catch (err) {
      console.error('Error en edición masiva:', err)
      toast.error('Error al actualizar las unidades')
    }
  }

  const handleLogout = () => {
    Cookies.remove('session')
    sessionStorage.removeItem('user')
    router.push('/')
  }

  const abrirEditar = (unidad) => {
    setUnidadEditando(unidad)
    setFormData({
      placa: unidad.placa,
      transporte: unidad.transporte,
      tipo: unidad.tipo
    })
    setModalEditar(true)
  }

  const abrirCrear = () => {
    setFormData({ placa: '', transporte: '', tipo: '' })
    setModalCrear(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-bold">Cargando unidades...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Unidades</h1>
                <p className="text-cyan-200 text-sm">Administración de flota vehicular</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={cargarUnidades}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
              title="Recargar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/20 p-2 rounded-lg">
                <Car className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Total Unidades</p>
                <p className="text-2xl font-black text-white">{unidades.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Transportes</p>
                <p className="text-2xl font-black text-white">{transportes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <CheckSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Seleccionadas</p>
                <p className="text-2xl font-black text-white">{seleccionadas.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Filter className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Filtradas</p>
                <p className="text-2xl font-black text-white">{unidadesFiltradas.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de acciones */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={abrirCrear}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nueva Unidad
            </button>

            {seleccionadas.length > 0 && (
              <button
                onClick={() => setModalEdicionMasiva(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <Settings className="w-4 h-4" />
                Editar {seleccionadas.length} seleccionadas
              </button>
            )}

            <div className="flex-1" />

            {/* Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa o transporte..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm w-64"
              />
            </div>

            {/* Filtro transporte */}
            <div className="relative">
              <select
                value={filtroTransporte}
                onChange={(e) => setFiltroTransporte(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white text-sm appearance-none pr-8 min-w-[160px]"
              >
                <option value="">Todos los transportes</option>
                {transportes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Filtro tipo */}
            <div className="relative">
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white text-sm appearance-none pr-8 min-w-[140px]"
              >
                <option value="">Todos los tipos</option>
                <option value="Volqueta">Volqueta</option>
                <option value="Traileta">Traileta</option>
                <option value="Ambos">Ambos</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleSeleccionarTodas}
                      className="flex items-center gap-2 text-slate-300 hover:text-white"
                    >
                      {seleccionadas.length === unidadesFiltradas.length && unidadesFiltradas.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Placa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Transporte
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unidadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold">No se encontraron unidades</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {busqueda || filtroTransporte || filtroTipo
                          ? 'Intenta con otros filtros'
                          : 'Comienza agregando una nueva unidad'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  unidadesFiltradas.map((unidad) => (
                    <tr
                      key={unidad.placa}
                      className={`hover:bg-white/5 transition-colors ${
                        seleccionadas.includes(unidad.placa) ? 'bg-cyan-500/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSeleccion(unidad.placa)}
                          className="flex items-center"
                        >
                          {seleccionadas.includes(unidad.placa) ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-white bg-slate-800 px-2 py-1 rounded">
                          {unidad.placa}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-200">{unidad.transporte}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          unidad.tipo === 'Volqueta' ? 'bg-blue-500/20 text-blue-400' :
                          unidad.tipo === 'Traileta' ? 'bg-green-500/20 text-green-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {unidad.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(unidad)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-all text-blue-400 hover:text-blue-300"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(unidad.placa)}
                            disabled={eliminando === unidad.placa}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-all text-red-400 hover:text-red-300 disabled:opacity-50"
                            title="Eliminar"
                          >
                            {eliminando === unidad.placa ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nueva Unidad
              </h3>
              <button onClick={() => setModalCrear(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Placa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white font-mono uppercase"
                  placeholder="ABC-1234"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Transporte <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transporte}
                  onChange={(e) => setFormData({...formData, transporte: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Nombre del transporte"
                  list="transportes-list"
                  required
                />
                <datalist id="transportes-list">
                  {transportes.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Tipo <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Volqueta', 'Traileta', 'Ambos'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFormData({...formData, tipo})}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.tipo === tipo
                          ? tipo === 'Volqueta' ? 'bg-blue-500/20 border-blue-500' :
                            tipo === 'Traileta' ? 'bg-green-500/20 border-green-500' :
                            'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-900 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-sm font-bold">{tipo}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Crear Unidad
                </button>
                <button
                  type="button"
                  onClick={() => setModalCrear(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && unidadEditando && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Editar Unidad
              </h3>
              <button onClick={() => { setModalEditar(false); setUnidadEditando(null) }} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Placa
                </label>
                <input
                  type="text"
                  value={formData.placa}
                  disabled
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white font-mono opacity-60 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 mt-1">La placa no se puede modificar</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Transporte <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.transporte}
                  onChange={(e) => setFormData({...formData, transporte: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  list="transportes-list-edit"
                  required
                />
                <datalist id="transportes-list-edit">
                  {transportes.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Tipo <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Volqueta', 'Traileta', 'Ambos'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFormData({...formData, tipo})}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.tipo === tipo
                          ? tipo === 'Volqueta' ? 'bg-blue-500/20 border-blue-500' :
                            tipo === 'Traileta' ? 'bg-green-500/20 border-green-500' :
                            'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-900 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-sm font-bold">{tipo}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => { setModalEditar(false); setUnidadEditando(null) }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edición Masiva */}
      {modalEdicionMasiva && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Edición Masiva ({seleccionadas.length} unidades)
              </h3>
              <button onClick={() => setModalEdicionMasiva(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdicionMasiva} className="p-6 space-y-4">
              <p className="text-slate-400 text-sm">
                Se actualizarán solo los campos que modifiques. Los campos vacíos no se modificarán.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Nuevo Transporte (dejar vacío para no cambiar)
                </label>
                <input
                  type="text"
                  value={edicionMasivaData.transporte}
                  onChange={(e) => setEdicionMasivaData({...edicionMasivaData, transporte: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Nombre del transporte"
                  list="transportes-list-masiva"
                />
                <datalist id="transportes-list-masiva">
                  {transportes.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">
                  Nuevo Tipo (dejar vacío para no cambiar)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEdicionMasivaData({...edicionMasivaData, tipo: ''})}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      edicionMasivaData.tipo === ''
                        ? 'bg-slate-500/20 border-slate-500'
                        : 'bg-slate-900 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <span className="text-sm font-bold">No cambiar</span>
                  </button>
                  {['Volqueta', 'Traileta', 'Ambos'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setEdicionMasivaData({...edicionMasivaData, tipo})}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        edicionMasivaData.tipo === tipo
                          ? tipo === 'Volqueta' ? 'bg-blue-500/20 border-blue-500' :
                            tipo === 'Traileta' ? 'bg-green-500/20 border-green-500' :
                            'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-900 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-sm font-bold">{tipo}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                <p className="text-xs text-slate-400 mb-2">Unidades seleccionadas:</p>
                <div className="flex flex-wrap gap-1">
                  {seleccionadas.map(p => (
                    <span key={p} className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded font-mono">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Aplicar Cambios
                </button>
                <button
                  type="button"
                  onClick={() => setModalEdicionMasiva(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
