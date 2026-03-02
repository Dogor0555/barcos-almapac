'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isAdmin, logout } from '../lib/auth'
import { 
  Plus, LogOut, Ship, Users, Package, Trash2, Eye, 
  Copy, ExternalLink, Truck, Download, FileJson, Database,
  Edit2, Grid, Scale, Activity, Clock, AlertCircle, X,
  BookOpen, MessageSquare, Calendar, QrCode, CheckCircle  
} from 'lucide-react'
import toast from 'react-hot-toast'
import BarcoForm from '../components/adminC/BarcoForm'
import ProductoForm from '../components/adminC/productoForm.js'
import GenerarDashboardModal from '../admin/GenerarDashboardModal'
import Link from 'next/link'
import dayjs from 'dayjs'

// Componente Modal para mostrar viajes en paso 1
const ViajesPaso1Modal = ({ barco, onClose, onSuccess }) => {
  const [viajesPaso1, setViajesPaso1] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumenPorProducto, setResumenPorProducto] = useState({})

  useEffect(() => {
    if (barco) {
      cargarViajesPaso1()
    }
  }, [barco])

  const cargarViajesPaso1 = async () => {
    try {
      setLoading(true)
      
      // Cargar viajes en estado 'incompleto' para este barco
      const { data: viajes, error } = await supabase
        .from('viajes')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono),
          destino:destino_id(codigo, nombre)
        `)
        .eq('barco_id', barco.id)
        .eq('estado', 'incompleto')
        .order('created_at', { ascending: false })

      if (error) throw error

      setViajesPaso1(viajes || [])

      // Calcular resumen por producto
      const resumen = {}
      viajes?.forEach(viaje => {
        const prodId = viaje.producto_id
        if (!resumen[prodId]) {
          resumen[prodId] = {
            producto: viaje.producto,
            cantidad: 0,
            tonelajeTotal: 0,
            viajes: []
          }
        }
        resumen[prodId].cantidad++
        resumen[prodId].tonelajeTotal += Number(viaje.peso_neto_updp_tm) || 0
        resumen[prodId].viajes.push(viaje)
      })

      setResumenPorProducto(resumen)
    } catch (error) {
      console.error('Error cargando viajes paso 1:', error)
      toast.error('Error al cargar viajes pendientes')
    } finally {
      setLoading(false)
    }
  }

  const handleCompletarViaje = (viajeId) => {
    // Abrir la página del barco en el token correspondiente
    window.open(`/barco/${barco.token_compartido}`, '_blank')
    toast.success('Abriendo registro para completar viaje')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/20 p-3 rounded-xl">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Viajes en Paso 1 - {barco.nombre}
              </h2>
              <p className="text-blue-200 text-sm">
                Viajes registrados que aún no tienen destino asignado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : viajesPaso1.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center">
              <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡No hay viajes pendientes!</h3>
              <p className="text-slate-400">Todos los viajes de {barco.nombre} han sido completados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen rápido */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-xl p-4 border border-yellow-500/20">
                  <p className="text-xs text-slate-400">Total Viajes Pendientes</p>
                  <p className="text-3xl font-black text-yellow-400">{viajesPaso1.length}</p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 col-span-3">
                  <p className="text-xs text-slate-400 mb-2">Resumen por Producto</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.values(resumenPorProducto).map((item, idx) => (
                      <div key={idx} className="bg-slate-800 px-3 py-2 rounded-lg flex items-center gap-2">
                        <span className="text-xl">{item.producto?.icono || '📦'}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{item.producto?.nombre}</p>
                          <p className="text-xs text-yellow-400">{item.cantidad} viajes · {item.tonelajeTotal.toFixed(3)} TM</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de viajes por producto */}
              {Object.entries(resumenPorProducto).map(([productoId, item]) => (
                <div key={productoId} className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.producto?.icono || '📦'}</span>
                      <div>
                        <h3 className="font-bold text-white">{item.producto?.nombre}</h3>
                        <p className="text-xs text-slate-400">{item.producto?.codigo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Viajes</p>
                        <p className="text-xl font-bold text-yellow-400">{item.cantidad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Tonelaje</p>
                        <p className="text-xl font-bold text-blue-400">{item.tonelajeTotal.toFixed(3)} TM</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase"># Viaje</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Placa</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Salida UPDP</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Entrada Almapac</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Peso Neto (TM)</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {item.viajes.map(viaje => (
                          <tr key={viaje.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 font-bold text-white">#{viaje.viaje_numero}</td>
                            <td className="px-4 py-3 text-slate-300">{dayjs(viaje.fecha).format('DD/MM/YYYY')}</td>
                            <td className="px-4 py-3 font-mono text-blue-400">{viaje.placa}</td>
                            <td className="px-4 py-3">{viaje.hora_salida_updp || '—'}</td>
                            <td className="px-4 py-3">{viaje.hora_entrada_almapac || '—'}</td>
                            <td className="px-4 py-3 font-bold text-green-400">{viaje.peso_neto_updp_tm?.toFixed(3) || '—'}</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleCompletarViaje(viaje.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                              >
                                <Truck className="w-3 h-3" />
                                Completar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Instrucciones */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Para completar un viaje, haz clic en "Completar" y se abrirá la página de registro del barco. 
                  Allí podrás asignar el destino, hora de salida y peso final.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente Modal para mostrar bitácora por producto
const BitacoraProductoModal = ({ barco, onClose }) => {
  const [bitacora, setBitacora] = useState([])
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)

  useEffect(() => {
    if (barco) {
      cargarDatos()
    }
  }, [barco])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar productos del barco
      const productosBarco = barco.metas_json?.productos || []
      
      if (productosBarco.length === 0) {
        setProductos([])
        return
      }

      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .in('codigo', productosBarco)

      setProductos(productosData || [])
      
      if (productosData?.length > 0) {
        setProductoSeleccionado(productosData[0].id)
        await cargarBitacora(barco.id, productosData[0].id)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    }
  }

  const cargarBitacora = async (barcoId, productoId) => {
    try {
      const { data, error } = await supabase
        .from('bitacora_flujos')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono)
        `)
        .eq('barco_id', barcoId)
        .eq('producto_id', productoId)
        .order('fecha_hora', { ascending: false })

      if (error) throw error
      setBitacora(data || [])
    } catch (error) {
      console.error('Error cargando bitácora:', error)
      toast.error('Error al cargar bitácora')
    } finally {
      setLoading(false)
    }
  }

  const handleProductoChange = async (productoId) => {
    setProductoSeleccionado(productoId)
    setLoading(true)
    await cargarBitacora(barco.id, productoId)
  }

  const productoActual = productos.find(p => p.id === productoSeleccionado)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-xl">
              <BookOpen className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Bitácora de Operaciones - {barco.nombre}
              </h2>
              <p className="text-purple-200 text-sm">
                Registros de eventos y observaciones por producto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {productos.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No hay productos configurados</h3>
              <p className="text-slate-400">Este barco no tiene productos asociados para mostrar bitácora</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selector de producto */}
              <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
                <label className="block text-sm font-bold text-slate-400 mb-3">
                  Seleccionar Producto:
                </label>
                <div className="flex flex-wrap gap-3">
                  {productos.map(prod => (
                    <button
                      key={prod.id}
                      onClick={() => handleProductoChange(prod.id)}
                      className={`px-4 py-3 rounded-xl flex items-center gap-3 transition-all flex-1 min-w-[200px] ${
                        productoSeleccionado === prod.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{prod.icono}</span>
                      <div className="text-left">
                        <p className="font-bold">{prod.nombre}</p>
                        <p className="text-xs opacity-80">{prod.codigo}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Estadísticas rápidas */}
              {productoActual && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-slate-400">Total Registros</p>
                    <p className="text-3xl font-black text-purple-400">{bitacora.length}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-slate-400">Primer Registro</p>
                    <p className="text-sm font-bold text-white">
                      {bitacora.length > 0 ? dayjs(bitacora[bitacora.length - 1].fecha_hora).format('DD/MM/YYYY HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-xs text-slate-400">Último Registro</p>
                    <p className="text-sm font-bold text-white">
                      {bitacora.length > 0 ? dayjs(bitacora[0].fecha_hora).format('DD/MM/YYYY HH:mm') : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de bitácora */}
              <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-white">
                      Registros de Bitácora - {productoActual?.nombre}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {bitacora.length} registro{bitacora.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {loading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto"></div>
                  </div>
                ) : bitacora.length === 0 ? (
                  <div className="p-12 text-center">
                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">No hay registros en la bitácora para este producto</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Fecha y Hora</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Comentarios</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Registrado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bitacora.map((registro) => (
                          <tr key={registro.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-300">
                                  {dayjs(registro.fecha_hora).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-white max-w-xl whitespace-pre-wrap">
                                {registro.comentarios || '—'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-400 text-sm">
                                {registro.usuario_id ? 'Usuario ' + registro.usuario_id : 'Sistema'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Nota informativa */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <p className="text-sm text-purple-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  La bitácora registra eventos importantes, observaciones y novedades durante la operación de descarga.
                  Los registros se muestran del más reciente al más antiguo.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [pesadores, setPesadores] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBarcoForm, setShowBarcoForm] = useState(false)
  const [showProductoForm, setShowProductoForm] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [exportando, setExportando] = useState(null)
  const [vista, setVista] = useState('barcos') // 'barcos' o 'productos'
  
  // Estado para los modales
  const [barcoSeleccionado, setBarcoSeleccionado] = useState(null)
  const [showViajesPaso1Modal, setShowViajesPaso1Modal] = useState(false)
  const [showBitacoraModal, setShowBitacoraModal] = useState(false)
  const [showGenerarDashboardModal, setShowGenerarDashboardModal] = useState(false)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarDatos()
  }, [router])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar barcos
      const { data: barcosData } = await supabase
        .from('barcos')
        .select(`
          *,
          pesador:pesador_id(id, nombre, username),
          viajes:viajes(count)
        `)
        .order('created_at', { ascending: false })

      // Cargar pesadores
      const { data: pesadoresData } = await supabase
        .from('usuarios')
        .select('id, nombre, username')
        .eq('rol', 'pesador')
        .eq('activo', true)

      // Cargar productos
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .order('codigo', { ascending: true })

      setBarcos(barcosData || [])
      setPesadores(pesadoresData || [])
      setProductos(productosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  // =====================================================
  // FUNCIONES PARA BARCOS
  // =====================================================
  const handleVerDashboard = (barcoId) => {
    window.open(`/dashboard/${barcoId}`, '_blank')
  }

  const handleVerRegistroViajes = (token) => {
    window.open(`/barco/${token}`, '_blank')
  }

  const handleCopiarLink = (token) => {
    const link = `${window.location.origin}/barco/${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link de registro copiado', { icon: '📋' })
  }

  const handleEliminarBarco = async (barcoId, barcoNombre) => {
    if (!confirm(`¿Estás seguro de eliminar el barco "${barcoNombre}"? Esta acción no se puede deshacer.`)) return

    try {
      const { error } = await supabase
        .from('barcos')
        .delete()
        .eq('id', barcoId)

      if (error) throw error

      toast.success(`Barco "${barcoNombre}" eliminado`)
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando barco:', error)
      toast.error('Error al eliminar barco')
    }
  }

  // Función para abrir el modal de viajes paso 1
  const handleVerViajesPaso1 = (barco) => {
    setBarcoSeleccionado(barco)
    setShowViajesPaso1Modal(true)
  }

  // Función para abrir el modal de bitácora
  const handleVerBitacora = (barco) => {
    setBarcoSeleccionado(barco)
    setShowBitacoraModal(true)
  }

  // Función para abrir el modal de generar dashboard (AHORA USA CODIGO_BARCO)
  const handleGenerarDashboard = (barco) => {
    if (!barco.codigo_barco) {
      toast.error('Este barco no tiene código de buque asignado')
      return
    }
    setBarcoSeleccionado(barco)
    setShowGenerarDashboardModal(true)
  }

  // =====================================================
  // FUNCIONES PARA PRODUCTOS
  // =====================================================
  const handleGuardarProducto = async (productoData) => {
    try {
      if (productoEditando) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('productos')
          .update(productoData)
          .eq('id', productoEditando.id)

        if (error) throw error
        toast.success('Producto actualizado')
      } else {
        // Crear nuevo producto
        const { error } = await supabase
          .from('productos')
          .insert(productoData)

        if (error) throw error
        toast.success('Producto creado')
      }

      setShowProductoForm(false)
      setProductoEditando(null)
      cargarDatos()
    } catch (error) {
      console.error('Error guardando producto:', error)
      toast.error('Error al guardar producto')
    }
  }

  const handleEliminarProducto = async (productoId, productoNombre) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${productoNombre}"?`)) return

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', productoId)

      if (error) throw error

      toast.success('Producto eliminado')
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando producto:', error)
      toast.error('Error al eliminar producto')
    }
  }

  // =====================================================
  // EXPORTACIÓN DE BARCO
  // =====================================================
  const handleExportarBarco = async (barco) => {
    try {
      setExportando(barco.id)
      toast.loading(`Exportando datos de ${barco.nombre}...`, { id: 'export' })

      const { data: viajes, error: errorViajes } = await supabase
        .from('viajes')
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono, tipo_registro),
          destino:destino_id(id, codigo, nombre)
        `)
        .eq('barco_id', barco.id)
        .order('viaje_numero', { ascending: true })

      if (errorViajes) throw errorViajes

      const { data: lecturasBanda, error: errorBanda } = await supabase
        .from('lecturas_banda')
        .select('*')
        .eq('barco_id', barco.id)
        .order('fecha_hora', { ascending: true })

      const { data: bitacora, error: errorBitacora } = await supabase
        .from('bitacora_flujos')
        .select('*')
        .eq('barco_id', barco.id)
        .order('fecha_hora', { ascending: true })

      const totalKG = viajes?.reduce((sum, v) => sum + (Number(v.peso_neto_updp_kg) || 0), 0) || 0
      const totalTM = totalKG / 1000
      
      const resumenProductos = {}
      productos.forEach(prod => {
        const viajesProd = viajes?.filter(v => v.producto_id === prod.id) || []
        const totalProdKG = viajesProd.reduce((sum, v) => sum + (Number(v.peso_neto_updp_kg) || 0), 0)
        const metaTM = barco.metas_json?.[prod.codigo] || 0
        
        resumenProductos[prod.codigo] = {
          producto: prod.nombre,
          tipo: prod.tipo_registro,
          metaTM: metaTM,
          descargadoTM: totalProdKG / 1000,
          viajes: viajesProd.length,
          completado: metaTM > 0 ? (totalProdKG / 1000) >= metaTM : false
        }
      })

      const exportData = {
        metadata: {
          fecha_exportacion: new Date().toISOString(),
          exportado_por: user?.nombre,
          version: '1.0.0',
          app: 'Barcos Almapac'
        },
        barco: {
          id: barco.id,
          nombre: barco.nombre,
          fecha_llegada: barco.fecha_llegada,
          fecha_salida: barco.fecha_salida,
          estado: barco.estado,
          token_compartido: barco.token_compartido,
          codigo_barco: barco.codigo_barco,
          metas: barco.metas_json || {},
          creado: barco.created_at,
          pesador_asignado: barco.pesador ? {
            id: barco.pesador.id,
            nombre: barco.pesador.nombre,
            username: barco.pesador.username
          } : null
        },
        catalogo_productos: productos,
        estadisticas: {
          total_viajes: viajes?.length || 0,
          total_kilogramos: totalKG,
          total_toneladas: totalTM,
          resumen_productos: resumenProductos,
          viajes_por_dia: viajes?.reduce((acc, v) => {
            const fecha = dayjs(v.created_at).format('YYYY-MM-DD')
            acc[fecha] = (acc[fecha] || 0) + 1
            return acc
          }, {})
        },
        datos: {
          viajes: viajes || [],
          lecturas_banda: lecturasBanda || [],
          bitacora: bitacora || []
        }
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const nombreArchivo = `${barco.nombre.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.json`
      
      link.href = url
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`✅ Datos de ${barco.nombre} exportados correctamente`, { id: 'export' })
      toast.success(`📊 ${viajes?.length || 0} viajes · ${totalTM.toFixed(3)} TM totales`, { duration: 4000 })

    } catch (error) {
      console.error('Error exportando barco:', error)
      toast.error('Error al exportar los datos', { id: 'export' })
    } finally {
      setExportando(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-2">
                <Ship className="w-8 h-8" />
                Panel de Administración
              </h1>
              <p className="text-blue-200 text-sm mt-1">
                Bienvenido, <span className="font-bold">{user?.nombre}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setVista('barcos')
                  setShowBarcoForm(true)
                }}
                className="bg-white hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Nuevo Barco
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>

          {/* Selector de vista */}
          <div className="flex gap-2 mt-6 border-t border-white/20 pt-4">
            <button
              onClick={() => setVista('barcos')}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                vista === 'barcos' 
                  ? 'bg-white text-blue-800' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Ship className="w-4 h-4" />
              Barcos
            </button>
            <button
              onClick={() => setVista('productos')}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                vista === 'productos' 
                  ? 'bg-white text-blue-800' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              Productos
            </button>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/30 p-3 rounded-lg">
                  <Ship className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Barcos Activos</p>
                  <p className="text-2xl font-black text-white">
                    {barcos.filter(b => b.estado === 'activo').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/30 p-3 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Pesadores</p>
                  <p className="text-2xl font-black text-white">{pesadores.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/30 p-3 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Productos</p>
                  <p className="text-2xl font-black text-white">{productos.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VISTA DE BARCOS */}
        {vista === 'barcos' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-black text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-400" />
                Barcos Registrados
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({barcos.length} total)
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Database className="w-3 h-3" />
                <span>Click en ⏳ para ver viajes pendientes · 📖 para bitácora</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Barco</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Pesador</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Viajes</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Pendientes Paso 1</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Bitácora</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {barcos.map((barco) => {
                    return (
                      <tr key={barco.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-white">{barco.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>ID: {barco.id}</span>
                              <span>•</span>
                              <span>{dayjs(barco.fecha_llegada).format('DD/MM/YYYY')}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {barco.codigo_barco ? (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-mono">
                              {barco.codigo_barco}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                            barco.estado === 'finalizado' ? 'bg-slate-500/20 text-slate-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {barco.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {barco.pesador ? (
                            <div>
                              <p className="text-white">{barco.pesador.nombre}</p>
                              <p className="text-xs text-slate-500">@{barco.pesador.username}</p>
                            </div>
                          ) : (
                            <span className="text-slate-500">No asignado</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-blue-400">{barco.viajes?.[0]?.count || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          {/* Botón para ver viajes en paso 1 */}
                          <button
                            onClick={() => handleVerViajesPaso1(barco)}
                            className="bg-yellow-500/20 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all group"
                            title="Ver viajes que solo han pasado el paso 1"
                          >
                            <Clock className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm font-bold">Pendientes</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {/* Botón para ver bitácora */}
                          <button
                            onClick={() => handleVerBitacora(barco)}
                            className="bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all group"
                            title="Ver bitácora de operaciones por producto"
                          >
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-400 text-sm font-bold">Bitácora</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-900 px-2 py-1 rounded border border-white/10 font-mono">
                              {barco.token_compartido?.substring(0, 8)}...
                            </code>
                            <button
                              onClick={() => handleCopiarLink(barco.token_compartido)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Copiar link de registro"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                           
                            
                            {/* Botón Generar Dashboard Público (NUEVO - USA CODIGO_BARCO) */}
                            <button
                              onClick={() => handleGenerarDashboard(barco)}
                              className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors group"
                              title="Generar Dashboard Público para Cliente"
                            >
                              <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                            </button>
                            
                            {/* Botón Registrar Viajes */}
                            <button
                              onClick={() => handleVerRegistroViajes(barco.token_compartido)}
                              className="p-2 hover:bg-green-500/20 rounded-lg transition-colors group"
                              title="Ir a Registrar Viajes"
                            >
                              <Truck className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                            </button>
                          
                            
                            {/* Botón Exportar */}
                            <button
                              onClick={() => handleExportarBarco(barco)}
                              disabled={exportando === barco.id}
                              className={`p-2 rounded-lg transition-colors group relative ${
                                exportando === barco.id 
                                  ? 'bg-amber-500/20 cursor-wait' 
                                  : 'hover:bg-amber-500/20'
                              }`}
                              title="Exportar todos los datos del barco"
                            >
                              {exportando === barco.id ? (
                                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
                              )}
                            </button>
                            
                            {/* Botón Eliminar */}
                            <button
                              onClick={() => handleEliminarBarco(barco.id, barco.nombre)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                              title="Eliminar Barco"
                            >
                              <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA DE PRODUCTOS */}
        {vista === 'productos' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Catálogo de Productos
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({productos.length} total)
                </span>
              </h2>
              <button
                onClick={() => {
                  setProductoEditando(null)
                  setShowProductoForm(true)
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Icono</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo de Registro</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Colores</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productos.map((prod) => (
                    <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-3xl">{prod.icono}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="bg-slate-900 px-2 py-1 rounded text-sm font-mono text-blue-400">
                          {prod.codigo}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{prod.nombre}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                          prod.tipo_registro === 'mixto' ? 'bg-purple-500/20 text-purple-400' :
                          prod.tipo_registro === 'banda' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {prod.tipo_registro === 'mixto' && <><Activity className="w-3 h-3" /> Mixto</>}
                          {prod.tipo_registro === 'banda' && <><Scale className="w-3 h-3" /> Banda (Acumulado)</>}
                          {prod.tipo_registro === 'viajes' && <><Truck className="w-3 h-3" /> Solo Viajes</>}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: prod.color_accent }} />
                          <span className="text-xs text-slate-400">{prod.color_from} → {prod.color_to}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          prod.activo ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {prod.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setProductoEditando(prod)
                              setShowProductoForm(true)
                            }}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Editar Producto"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleEliminarProducto(prod.id, prod.nombre)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Eliminar Producto"
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
          </div>
        )}

        {/* Leyenda de tipos de producto */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 text-xs">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Grid className="w-4 h-4 text-blue-400" />
            Tipos de Registro de Productos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Mixto</p>
                <p className="text-slate-500 text-xs">Se registra por viajes y también tiene lecturas de banda acumuladas</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Scale className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Banda (Acumulado)</p>
                <p className="text-slate-500 text-xs">Solo lecturas de banda, se acumula el peso continuamente</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Solo Viajes</p>
                <p className="text-slate-500 text-xs">Solo registro por viajes de camión</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nuevo/Editar Barco */}
      {showBarcoForm && (
        <BarcoForm
          pesadores={pesadores}
          productos={productos}
          onClose={() => setShowBarcoForm(false)}
          onSuccess={() => {
            setShowBarcoForm(false)
            cargarDatos()
          }}
        />
      )}

      {/* Modal Nuevo/Editar Producto */}
      {showProductoForm && (
        <ProductoForm
          producto={productoEditando}
          onClose={() => {
            setShowProductoForm(false)
            setProductoEditando(null)
          }}
          onSave={handleGuardarProducto}
        />
      )}

      {/* Modal de Viajes Paso 1 */}
      {showViajesPaso1Modal && barcoSeleccionado && (
        <ViajesPaso1Modal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowViajesPaso1Modal(false)
            setBarcoSeleccionado(null)
          }}
          onSuccess={() => {
            cargarDatos()
          }}
        />
      )}

      {/* Modal de Bitácora por Producto */}
      {showBitacoraModal && barcoSeleccionado && (
        <BitacoraProductoModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowBitacoraModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}

      {/* Modal Generar Dashboard (NUEVO) */}
      {showGenerarDashboardModal && barcoSeleccionado && (
        <GenerarDashboardModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowGenerarDashboardModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}