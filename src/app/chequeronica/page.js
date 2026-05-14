// app/chequeronica/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout, isChequeroNica } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Anchor, LogOut, Clock, AlertCircle, RefreshCw, Ship, Wrench, BarChart3, CheckCircle, X, Edit2, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)
const TIMEZONE_NICARAGUA = 'America/Managua'

// Modal para registrar/editar atraso de grúa
const ModalAtrasoGrua = ({ isOpen, onClose, onSave, barco, atrasoEditando }) => {
  const [loading, setLoading] = useState(false)
  const [modoPersonalizado, setModoPersonalizado] = useState(false)
  const [formData, setFormData] = useState({
    fecha: dayjs().tz(TIMEZONE_NICARAGUA).format('YYYY-MM-DD'),
    grua_nombre: '',
    hora_inicio: '',
    hora_fin: '',
    descripcion: '',
    minutos_calculados: null
  })

  useEffect(() => {
    if (atrasoEditando) {
      setFormData({
        fecha: atrasoEditando.fecha || dayjs().tz(TIMEZONE_NICARAGUA).format('YYYY-MM-DD'),
        grua_nombre: atrasoEditando.grua_nombre || '',
        hora_inicio: atrasoEditando.hora_inicio || '',
        hora_fin: atrasoEditando.hora_fin || '',
        descripcion: atrasoEditando.descripcion || '',
        minutos_calculados: atrasoEditando.minutos
      })
      const gruasPredefinidas = ['GRÚA 1', 'GRÚA 2', 'GRÚA 3', 'GRÚA MÓVIL', 'GRÚA PÓRTICO', 'GRÚA TORRE']
      if (atrasoEditando.grua_nombre && !gruasPredefinidas.includes(atrasoEditando.grua_nombre)) {
        setModoPersonalizado(true)
      }
    } else {
      setFormData({
        fecha: dayjs().tz(TIMEZONE_NICARAGUA).format('YYYY-MM-DD'),
        grua_nombre: '',
        hora_inicio: '',
        hora_fin: '',
        descripcion: '',
        minutos_calculados: null
      })
      setModoPersonalizado(false)
    }
  }, [atrasoEditando, isOpen])

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

      if (!formData.grua_nombre.trim()) {
        toast.error('Debes seleccionar o ingresar el nombre de la grúa')
        setLoading(false)
        return
      }

      const datos = {
        barco_id: barco.id,
        fecha: formData.fecha,
        grua_nombre: formData.grua_nombre.trim(),
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
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const GRUAS_PREDEFINIDAS = ['GRÚA 1', 'GRÚA 2', 'GRÚA 3', 'GRÚA MÓVIL', 'GRÚA PÓRTICO', 'GRÚA TORRE', 'OTRA']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f172a] rounded-2xl shadow-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-t-2xl p-5 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="w-6 h-6 text-white" />
              <div>
                <h3 className="text-xl font-bold text-white">{atrasoEditando ? 'Editar Atraso' : 'Nuevo Atraso de Grúa'}</h3>
                <p className="text-sm text-orange-200">Registre el tiempo perdido por grúa</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
            <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de la Grúa *</label>
            
            {!modoPersonalizado ? (
              <div className="space-y-2">
                <select
                  value={formData.grua_nombre}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'OTRA') {
                      setModoPersonalizado(true)
                      setFormData({ ...formData, grua_nombre: '' })
                    } else {
                      setFormData({ ...formData, grua_nombre: value })
                    }
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                >
                  <option value="">Seleccionar grúa...</option>
                  {GRUAS_PREDEFINIDAS.filter(g => g !== 'OTRA').map(grua => (
                    <option key={grua} value={grua}>{grua}</option>
                  ))}
                  <option value="OTRA">✏️ Otra (ingresar manualmente)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.grua_nombre}
                    onChange={(e) => setFormData({ ...formData, grua_nombre: e.target.value })}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                    placeholder="Ej: GRÚA PÓRTICO 2"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setModoPersonalizado(false)
                      setFormData({ ...formData, grua_nombre: '' })
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_inicio} onChange={(e) => handleHoraChange('hora_inicio', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                <button type="button" onClick={() => handleHoraChange('hora_inicio', dayjs().tz(TIMEZONE_NICARAGUA).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400">
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_fin} onChange={(e) => handleHoraChange('hora_fin', e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" />
                <button type="button" onClick={() => handleHoraChange('hora_fin', dayjs().tz(TIMEZONE_NICARAGUA).format('HH:mm'))} className="px-2.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400">
                  <Clock className="w-4 h-4" />
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

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0f172a] py-4 -mb-6">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {atrasoEditando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente principal
export default function ChequeroNicaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState({})
  
  // Atrasos grúa
  const [atrasosGrua, setAtrasosGrua] = useState([])
  const [atrasoEditando, setAtrasoEditando] = useState(null)
  const [showAtrasoModal, setShowAtrasoModal] = useState(false)
  const [barcoSeleccionado, setBarcoSeleccionado] = useState(null)

  // Filtros y estado UI
  const [filtroFecha, setFiltroFecha] = useState('')
  const [ordenTabla, setOrdenTabla] = useState('reciente')
  const [seccionActiva, setSeccionActiva] = useState('atrasos')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.replace('/')
      return
    }
    if (!isChequeroNica()) {
      toast.error('No tienes permisos para acceder a esta sección')
      router.replace('/')
      return
    }
    setUser(currentUser)
    cargarUsuarios()
    cargarBarcos()
  }, [router])

  const cargarUsuarios = async () => {
    try {
      const { data } = await supabase.from('usuarios').select('id, nombre, username')
      const mapa = {}
      data?.forEach(u => { mapa[u.id] = u })
      setUsuarios(mapa)
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const cargarBarcos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('barcos')
        .select('id, nombre, codigo_barco, estado, token_compartido, tipo_operacion')
        .eq('tipo_operacion', 'importacion')
        .in('estado', ['activo', 'planeado'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setBarcos(data || [])
      
      // Cargar atrasos del primer barco si existe
      if (data && data.length > 0) {
        await cargarAtrasos(data[0].id)
        setBarcoSeleccionado(data[0])
      }
    } catch (error) {
      console.error('Error cargando barcos:', error)
      toast.error('Error al cargar los barcos')
    } finally {
      setLoading(false)
    }
  }

  const cargarAtrasos = async (barcoId) => {
    try {
      const { data, error } = await supabase
        .from('clinker_atrasos_grua')
        .select('*')
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      if (error) throw error
      setAtrasosGrua(data || [])
    } catch (error) {
      console.error('Error cargando atrasos:', error)
      toast.error('Error al cargar atrasos')
    }
  }

  const handleSeleccionarBarco = async (barco) => {
    setBarcoSeleccionado(barco)
    await cargarAtrasos(barco.id)
    toast.success(`Barco seleccionado: ${barco.nombre}`)
  }

  const handleLogout = () => {
    logout()
  }

  const atrasosFiltrados = atrasosGrua.filter(a => !filtroFecha || a.fecha === filtroFecha)

  const atrasosOrdenados = [...atrasosFiltrados].sort((a, b) => {
    if (ordenTabla === 'reciente') {
      return `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`)
    } else {
      return `${a.fecha} ${a.hora_inicio}`.localeCompare(`${b.fecha} ${b.hora_inicio}`)
    }
  })

  const fechasDisponibles = [...new Set(atrasosGrua.map(a => a.fecha))].sort().reverse()

  const limpiarFiltros = () => setFiltroFecha('')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    )
  }

  // Componente para vista móvil
  const AtrasoCard = ({ a }) => {
    const usuario = usuarios[a.created_by]
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10 mb-3">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-white">
              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs">{a.grua_nombre || '—'}</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">{a.fecha}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAtrasoEditando(a); setShowAtrasoModal(true) }}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                if (confirm('¿Eliminar este atraso?')) {
                  await supabase.from('clinker_atrasos_grua').delete().eq('id', a.id)
                  toast.success('Atraso eliminado')
                  if (barcoSeleccionado) await cargarAtrasos(barcoSeleccionado.id)
                }
              }}
              className="p-2 rounded-lg bg-red-500/20 text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">⏰ Inicio:</span>
            <span className="text-white">{a.hora_inicio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🏁 Fin:</span>
            <span className="text-white">{a.hora_fin || <span className="text-yellow-400 animate-pulse">● En curso</span>}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">⏱️ Duración:</span>
            <span className="text-orange-400 font-bold">{a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—'}</span>
          </div>
          {a.descripcion && (
            <div className="flex justify-between">
              <span className="text-slate-400">📝 Desc:</span>
              <span className="text-slate-300 text-xs">{a.descripcion}</span>
            </div>
          )}
          <div className="flex justify-between text-xs pt-2 border-t border-white/10">
            <span className="text-slate-500">👤 {usuario?.nombre || usuario?.username || `ID: ${a.created_by}`}</span>
          </div>
        </div>
      </div>
    )
  }

  // Estadísticas
  const estadisticasAtrasos = {
    totalAtrasos: atrasosGrua.length,
    totalMinutos: atrasosGrua.reduce((sum, a) => sum + (a.minutos || 0), 0),
    enCurso: atrasosGrua.filter(a => a.hora_inicio && !a.hora_fin).length,
    gruasUnicas: [...new Set(atrasosGrua.map(a => a.grua_nombre).filter(Boolean))].length
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Anchor className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white">Chequero Clinker Nicaragua</h1>
                <p className="text-orange-200 text-sm mt-0.5">
                  Bienvenido, <span className="font-bold">{user?.nombre}</span> · Registro de atrasos de grúa
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Barcos Activos</p>
              <p className="text-xl md:text-2xl font-black">{barcos.length}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Total Atrasos</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasAtrasos.totalAtrasos}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">Tiempo Perdido</p>
              <p className="text-xl md:text-2xl font-black">{Math.floor(estadisticasAtrasos.totalMinutos / 60)}h</p>
              <p className="text-xs text-orange-200/70">{estadisticasAtrasos.totalMinutos % 60} min</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-orange-200 text-xs">En Curso</p>
              <p className="text-xl md:text-2xl font-black">{estadisticasAtrasos.enCurso}</p>
            </div>
          </div>
        </div>

        {/* Selector de Barco */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 border-b border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Ship className="w-4 h-4 text-orange-400" />
              Seleccionar Barco
            </h2>
          </div>
          <div className="p-4">
            {barcos.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay barcos activos en este momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {barcos.map((barco) => (
                  <button
                    key={barco.id}
                    onClick={() => handleSeleccionarBarco(barco)}
                    className={`p-4 rounded-xl text-left transition-all border ${
                      barcoSeleccionado?.id === barco.id
                        ? 'bg-orange-500/20 border-orange-500/50'
                        : 'bg-slate-800/50 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Ship className={`w-5 h-5 ${barcoSeleccionado?.id === barco.id ? 'text-orange-400' : 'text-slate-400'}`} />
                      <div>
                        <p className="font-bold text-white">{barco.nombre}</p>
                        {barco.codigo_barco && (
                          <p className="text-xs text-slate-500 font-mono">{barco.codigo_barco}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {barco.estado}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sección de Atrasos (solo visible cuando hay barco seleccionado) */}
        {barcoSeleccionado && (
          <>
            {/* Header de atrasos con botón nuevo */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-3 items-center w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-red-400" />
                    <span className="text-white font-bold">Atrasos - {barcoSeleccionado.nombre}</span>
                  </div>
                  {fechasDisponibles.length > 0 && (
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
                  )}
                  {filtroFecha && (
                    <button onClick={limpiarFiltros} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                      <X className="w-3 h-3" /> Limpiar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setAtrasoEditando(null); setShowAtrasoModal(true) }}
                    className="flex-1 sm:flex-initial bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Atraso
                  </button>
                  <button
                    onClick={() => setOrdenTabla(ordenTabla === 'reciente' ? 'antiguo' : 'reciente')}
                    className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">{ordenTabla === 'reciente' ? 'Más Reciente' : 'Más Antiguo'}</span>
                  </button>
                  <button onClick={() => cargarAtrasos(barcoSeleccionado.id)} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* VISTA ESCRITORIO - TABLA */}
            <div className="hidden md:block bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-400" />
                  Atrasos de Grúa ({atrasosOrdenados.length} registros)
                </h3>
              </div>

              {atrasosOrdenados.length === 0 ? (
                <div className="p-12 text-center">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de atrasos para este barco</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Grúa</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Inicio</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fin</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Duración</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Registrado por</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {atrasosOrdenados.map((a) => {
                        const usuario = usuarios[a.created_by]
                        return (
                          <tr key={a.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-slate-300 text-sm">{a.fecha}</td>
                            <td className="px-4 py-3">
                              <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-mono">
                                {a.grua_nombre || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{a.hora_inicio}</td>
                            <td className="px-4 py-3 text-sm">
                              {a.hora_fin || <span className="text-yellow-400 animate-pulse text-xs">● En curso</span>}
                            </td>
                            <td className="px-4 py-3 font-bold text-sm">
                              {a.minutos ? `${Math.floor(a.minutos / 60)}h ${a.minutos % 60}m` : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                              {a.descripcion || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {usuario?.nombre || usuario?.username || `ID: ${a.created_by}`}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setAtrasoEditando(a); setShowAtrasoModal(true) }}
                                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm('¿Eliminar este atraso?')) {
                                      await supabase.from('clinker_atrasos_grua').delete().eq('id', a.id)
                                      toast.success('Atraso eliminado')
                                      await cargarAtrasos(barcoSeleccionado.id)
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* VISTA MÓVIL - CARDS */}
            <div className="md:hidden">
              {atrasosOrdenados.length === 0 ? (
                <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-12 text-center">
                  <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">No hay registros de atrasos</p>
                </div>
              ) : (
                atrasosOrdenados.map(a => <AtrasoCard key={a.id} a={a} />)
              )}
            </div>
          </>
        )}

        {/* Mensaje cuando no hay barco seleccionado */}
        {barcoSeleccionado === null && barcos.length > 0 && (
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-12 text-center">
            <Ship className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-400">Selecciona un barco</p>
            <p className="text-slate-500 text-sm mt-2">Haz clic en uno de los barcos arriba para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal Atraso Grúa */}
      <ModalAtrasoGrua
        isOpen={showAtrasoModal}
        onClose={() => {
          setShowAtrasoModal(false)
          setAtrasoEditando(null)
        }}
        onSave={() => {
          if (barcoSeleccionado) cargarAtrasos(barcoSeleccionado.id)
        }}
        barco={barcoSeleccionado}
        atrasoEditando={atrasoEditando}
      />
    </div>
  )
}