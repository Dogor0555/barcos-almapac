// admin/page.js - Panel de administración completo con soporte para importación/exportación
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isAdmin, logout } from '../lib/auth'
import { 
  Plus, LogOut, Ship, Users, Package, Trash2, Copy, 
  ExternalLink, Truck, Download, Database, Edit2, Grid, 
  Scale, Activity, Clock, AlertCircle, X, BookOpen, 
  MessageSquare, Calendar, QrCode, CheckCircle, Import, 
  Upload as Export,  // 👈 Esto renombra Upload a Export
  Anchor, BarChart3, TrendingUp, Filter, Search,
  Eye, RefreshCw, FileText, Settings, UserCog, Shield,
  Play, Pause, Power, MoreVertical, Edit2 as Edit, UserPlus
} from 'lucide-react'
import toast from 'react-hot-toast'
import BarcoForm from '../components/adminC/BarcoForm'
import ProductoForm from '../components/adminC/productoForm'
import GenerarDashboardModal from './GenerarDashboardModal'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// =====================================================
// MODAL PARA VER EXPORTACIONES POR PRODUCTO
// =====================================================
const ExportacionesProductoModal = ({ barco, onClose }) => {
  const [exportaciones, setExportaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [barcosDestino, setBarcosDestino] = useState({})

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
        await cargarExportaciones(barco.id, productosData[0].id)
      }

      // Cargar barcos destino
      const barcosDestinoIds = barco.metas_json?.barcos_destino || []
      if (barcosDestinoIds.length > 0) {
        const { data: barcosData } = await supabase
          .from('barcos')
          .select('id, nombre, codigo_barco')
          .in('id', barcosDestinoIds)

        const mapa = {}
        barcosData?.forEach(b => { mapa[b.id] = b })
        setBarcosDestino(mapa)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    }
  }

  const cargarExportaciones = async (barcoId, productoId) => {
    try {
      const { data, error } = await supabase
        .from('exportacion_banda')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono),
          destino_barco:destino_barco_id(id, nombre, codigo_barco)
        `)
        .eq('barco_id', barcoId)
        .eq('producto_id', productoId)
        .order('fecha_hora', { ascending: false })

      if (error) throw error
      setExportaciones(data || [])
    } catch (error) {
      console.error('Error cargando exportaciones:', error)
      toast.error('Error al cargar exportaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleProductoChange = async (productoId) => {
    setProductoSeleccionado(productoId)
    setLoading(true)
    await cargarExportaciones(barco.id, productoId)
  }

  const productoActual = productos.find(p => p.id === productoSeleccionado)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <Export className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Exportaciones - {barco.nombre}
              </h2>
              <p className="text-blue-200 text-sm">
                Registros de exportación por banda
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
              <Export className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No hay productos configurados</h3>
              <p className="text-slate-400">Este barco no tiene productos asociados para exportación</p>
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
                          ? 'bg-blue-500 text-white'
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Total Registros</p>
                    <p className="text-3xl font-black text-blue-400">{exportaciones.length}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Total Exportado</p>
                    <p className="text-3xl font-black text-green-400">
                      {exportaciones[0]?.acumulado_tm?.toFixed(3) || '0.000'} TM
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Primer Registro</p>
                    <p className="text-sm font-bold text-white">
                      {exportaciones.length > 0 ? dayjs(exportaciones[exportaciones.length - 1].fecha_hora).format('DD/MM/YYYY HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Último Registro</p>
                    <p className="text-sm font-bold text-white">
                      {exportaciones.length > 0 ? dayjs(exportaciones[0].fecha_hora).format('DD/MM/YYYY HH:mm') : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de exportaciones */}
              <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white">
                      Registros de Exportación - {productoActual?.nombre}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {exportaciones.length} registro{exportaciones.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {loading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </div>
                ) : exportaciones.length === 0 ? (
                  <div className="p-12 text-center">
                    <Export className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">No hay registros de exportación para este producto</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Fecha y Hora</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Acumulado (TM)</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Barco Destino</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Registrado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {exportaciones.map((exp) => (
                          <tr key={exp.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-300">
                                  {dayjs(exp.fecha_hora).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-400">
                              {exp.acumulado_tm?.toFixed(3)} TM
                            </td>
                            <td className="px-4 py-3">
                              {exp.destino_barco ? (
                                <div>
                                  <p className="text-white">{exp.destino_barco.nombre}</p>
                                  {exp.destino_barco.codigo_barco && (
                                    <p className="text-xs text-blue-400">{exp.destino_barco.codigo_barco}</p>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                              {exp.observaciones || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-400 text-sm">
                                {exp.created_by ? `ID: ${exp.created_by}` : 'Sistema'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-800">
                        <tr>
                          <td className="px-4 py-3 font-bold text-white">TOTAL</td>
                          <td className="px-4 py-3 font-bold text-blue-400">
                            {exportaciones[0]?.acumulado_tm?.toFixed(3) || '0.000'} TM
                          </td>
                          <td colSpan="3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Resumen por barco destino */}
              {exportaciones.length > 0 && (
                <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-blue-400" />
                    Resumen por Barco Destino
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(
                      exportaciones.reduce((acc, exp) => {
                        const id = exp.destino_barco_id
                        if (!id) return acc
                        if (!acc[id]) {
                          acc[id] = {
                            nombre: exp.destino_barco?.nombre || 'Desconocido',
                            codigo: exp.destino_barco?.codigo_barco,
                            total: 0,
                            lecturas: 0
                          }
                        }
                        acc[id].total = exp.acumulado_tm
                        acc[id].lecturas++
                        return acc
                      }, {})
                    ).map(([id, data]) => (
                      <div key={id} className="bg-slate-800 rounded-lg p-3">
                        <p className="font-bold text-white">{data.nombre}</p>
                        {data.codigo && <p className="text-xs text-blue-400">{data.codigo}</p>}
                        <div className="flex justify-between mt-2 text-sm">
                          <span className="text-slate-400">Total:</span>
                          <span className="font-bold text-green-400">{data.total.toFixed(3)} TM</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Lecturas:</span>
                          <span className="text-white">{data.lecturas}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nota informativa */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <Export className="w-4 h-4 flex-shrink-0" />
                  Los registros de exportación se crean cuando el barco envía producto a otros barcos (solo por banda).
                  Cada lectura muestra el acumulado total exportado hasta ese momento.
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

// =====================================================
// MODAL PARA VER DETALLE DE BARCO
// =====================================================
const DetalleBarcoModal = ({ barco, onClose }) => {
  const [stats, setStats] = useState({
    viajes: 0,
    exportaciones: 0,
    productos: [],
    totalImportado: 0,
    totalExportado: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (barco) {
      cargarEstadisticas()
    }
  }, [barco])

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)

      // Cargar viajes
      const { data: viajes } = await supabase
        .from('viajes')
        .select('*')
        .eq('barco_id', barco.id)

      // Cargar exportaciones
      const { data: exportaciones } = await supabase
        .from('exportacion_banda')
        .select('*')
        .eq('barco_id', barco.id)

      // Cargar productos del barco
      const productosBarco = barco.metas_json?.productos || []
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .in('codigo', productosBarco)

      const viajesCompletos = viajes?.filter(v => v.estado === 'completo') || []
      const totalImportado = viajesCompletos.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0)
      
      const totalExportado = exportaciones?.length > 0 
        ? exportaciones[exportaciones.length - 1]?.acumulado_tm || 0 
        : 0

      setStats({
        viajes: viajes?.length || 0,
        viajesCompletos: viajesCompletos.length,
        exportaciones: exportaciones?.length || 0,
        productos: productosData || [],
        totalImportado,
        totalExportado,
        ultimaExportacion: exportaciones?.length > 0 ? exportaciones[0] : null
      })

    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <Ship className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{barco.nombre}</h2>
              <p className="text-blue-200 text-sm">
                {barco.codigo_barco && `Código: ${barco.codigo_barco} · `}
                {barco.tipo_operacion === 'exportacion' ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
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
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información general */}
              <div className="bg-slate-900 rounded-xl p-4">
                <h3 className="font-bold text-white mb-3">Información General</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Fecha de atraque</p>
                    <p className="font-bold text-white">
                      {barco.fecha_llegada ? dayjs(barco.fecha_llegada).format('DD/MM/YYYY') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Estado</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                      barco.estado === 'finalizado' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {barco.estado}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tipo de operación</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      barco.tipo_operacion === 'exportacion' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {barco.tipo_operacion === 'exportacion' ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Token compartido</p>
                    <code className="text-xs bg-slate-800 px-2 py-1 rounded">
                      {barco.token_compartido}
                    </code>
                  </div>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
                  <p className="text-xs text-slate-500">Total Importado</p>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.totalImportado.toFixed(3)} TM
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.viajesCompletos} viajes completos de {stats.viajes} totales
                  </p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-xs text-slate-500">Total Exportado</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {stats.totalExportado.toFixed(3)} TM
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.exportaciones} lecturas de banda
                  </p>
                </div>
              </div>

              {/* Productos */}
              <div className="bg-slate-900 rounded-xl p-4">
                <h3 className="font-bold text-white mb-3">Productos</h3>
                <div className="space-y-2">
                  {stats.productos.map(prod => {
                    const meta = barco.metas_json?.limites?.[prod.codigo] || 0
                    return (
                      <div key={prod.id} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-2xl">{prod.icono}</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-bold text-white">{prod.nombre}</p>
                              <p className="text-xs text-slate-400">{prod.codigo}</p>
                            </div>
                            {meta > 0 && (
                              <p className="text-sm font-bold text-blue-400">{meta.toFixed(3)} TM</p>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Tipo: {prod.tipo_registro === 'mixto' ? 'Mixto' : 
                                   prod.tipo_registro === 'banda' ? 'Banda' : 'Viajes'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Barcos destino (solo exportación) */}
              {barco.tipo_operacion === 'exportacion' && barco.metas_json?.barcos_destino?.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-blue-400" />
                    Barcos Destino
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {barco.metas_json.barcos_destino.map(id => (
                      <span key={id} className="bg-slate-800 px-3 py-1 rounded-full text-sm text-blue-400">
                        ID: {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadatos */}
              <div className="bg-slate-900 rounded-xl p-4 text-xs text-slate-500">
                <p>Creado: {dayjs(barco.created_at).format('DD/MM/YYYY HH:mm')}</p>
                <p>Última actualización: {dayjs(barco.updated_at || barco.created_at).format('DD/MM/YYYY HH:mm')}</p>
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

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [usuarios, setUsuarios] = useState([]) // Todos los usuarios para estadísticas
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBarcoForm, setShowBarcoForm] = useState(false)
  const [showProductoForm, setShowProductoForm] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [exportando, setExportando] = useState(null)
  const [vista, setVista] = useState('barcos') // 'barcos', 'productos', 'estadisticas'
  const [filtroTipo, setFiltroTipo] = useState('todos') // 'todos', 'importacion', 'exportacion'
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estado para los modales
  const [barcoSeleccionado, setBarcoSeleccionado] = useState(null)
  const [showViajesPaso1Modal, setShowViajesPaso1Modal] = useState(false)
  const [showBitacoraModal, setShowBitacoraModal] = useState(false)
  const [showExportacionesModal, setShowExportacionesModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
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
          pesador:pesador_id(id, nombre, username, rol),
          viajes:viajes(count),
          exportaciones:exportacion_banda(count)
        `)
        .order('created_at', { ascending: false })

      // Cargar todos los usuarios para estadísticas
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nombre, username, rol, activo')
        .order('nombre')

      // Cargar productos
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .order('codigo', { ascending: true })

      setBarcos(barcosData || [])
      setUsuarios(usuariosData || [])
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

  const handleVerRegistroViajes = (token, tipo) => {
    if (tipo === 'exportacion') {
      window.open(`/barco/${token}/exportacion`, '_blank')
    } else {
      window.open(`/barco/${token}`, '_blank')
    }
  }

  const handleCopiarLink = (token, tipo) => {
    const ruta = tipo === 'exportacion' ? `/barco/${token}/exportacion` : `/barco/${token}`
    const link = `${window.location.origin}${ruta}`
    navigator.clipboard.writeText(link)
    toast.success(`Link de ${tipo === 'exportacion' ? 'exportación' : 'registro'} copiado`, { icon: '📋' })
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

  const handleCambiarEstado = async (barcoId, estadoActual) => {
    const nuevoEstado = estadoActual === 'activo' ? 'finalizado' : 'activo'
    const accion = nuevoEstado === 'activo' ? 'reanudar' : 'finalizar'
    
    if (!confirm(`¿Estás seguro de ${accion} la operación?`)) return

    try {
      const { error } = await supabase
        .from('barcos')
        .update({ estado: nuevoEstado })
        .eq('id', barcoId)

      if (error) throw error

      toast.success(`Operación ${nuevoEstado === 'activo' ? 'reanudada' : 'finalizada'}`)
      cargarDatos()
    } catch (error) {
      console.error('Error cambiando estado:', error)
      toast.error('Error al cambiar estado')
    }
  }

  // Funciones para abrir modales
  const handleVerViajesPaso1 = (barco) => {
    if (barco.tipo_operacion === 'exportacion') {
      toast.error('Esta operación no aplica para barcos de exportación')
      return
    }
    setBarcoSeleccionado(barco)
    setShowViajesPaso1Modal(true)
  }

  const handleVerBitacora = (barco) => {
    setBarcoSeleccionado(barco)
    setShowBitacoraModal(true)
  }

  const handleVerExportaciones = (barco) => {
    if (barco.tipo_operacion !== 'exportacion') {
      toast.error('Este barco no tiene registros de exportación')
      return
    }
    setBarcoSeleccionado(barco)
    setShowExportacionesModal(true)
  }

  const handleVerDetalle = (barco) => {
    setBarcoSeleccionado(barco)
    setShowDetalleModal(true)
  }

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
        const { error } = await supabase
          .from('productos')
          .update(productoData)
          .eq('id', productoEditando.id)

        if (error) throw error
        toast.success('Producto actualizado')
      } else {
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

      // Cargar datos según el tipo de operación
      let viajes = []
      let lecturasBanda = []
      let exportaciones = []
      let bitacora = []

      if (barco.tipo_operacion !== 'exportacion') {
        const { data: viajesData } = await supabase
          .from('viajes')
          .select(`
            *,
            producto:producto_id(id, codigo, nombre, icono, tipo_registro),
            destino:destino_id(id, codigo, nombre)
          `)
          .eq('barco_id', barco.id)
          .order('viaje_numero', { ascending: true })
        viajes = viajesData || []

        const { data: bandaData } = await supabase
          .from('lecturas_banda')
          .select('*')
          .eq('barco_id', barco.id)
          .order('fecha_hora', { ascending: true })
        lecturasBanda = bandaData || []
      }

      if (barco.tipo_operacion === 'exportacion') {
        const { data: exportData } = await supabase
          .from('exportacion_banda')
          .select(`
            *,
            producto:producto_id(id, codigo, nombre, icono),
            destino_barco:destino_barco_id(id, nombre, codigo_barco)
          `)
          .eq('barco_id', barco.id)
          .order('fecha_hora', { ascending: true })
        exportaciones = exportData || []
      }

      const { data: bitacoraData } = await supabase
        .from('bitacora_flujos')
        .select('*')
        .eq('barco_id', barco.id)
        .order('fecha_hora', { ascending: true })
      bitacora = bitacoraData || []

      const totalKG = viajes?.reduce((sum, v) => sum + (Number(v.peso_neto_updp_kg) || 0), 0) || 0
      const totalTM = totalKG / 1000
      const totalExportado = exportaciones?.length > 0 ? exportaciones[exportaciones.length - 1]?.acumulado_tm || 0 : 0
      
      const resumenProductos = {}
      productos.forEach(prod => {
        const viajesProd = viajes?.filter(v => v.producto_id === prod.id) || []
        const exportProd = exportaciones?.filter(e => e.producto_id === prod.id) || []
        const totalProdKG = viajesProd.reduce((sum, v) => sum + (Number(v.peso_neto_updp_kg) || 0), 0)
        const metaTM = barco.metas_json?.limites?.[prod.codigo] || 0
        
        resumenProductos[prod.codigo] = {
          producto: prod.nombre,
          tipo: prod.tipo_registro,
          metaTM: metaTM,
          descargadoTM: totalProdKG / 1000,
          exportadoTM: exportProd.length > 0 ? exportProd[exportProd.length - 1]?.acumulado_tm || 0 : 0,
          viajes: viajesProd.length,
          exportaciones: exportProd.length,
          completado: metaTM > 0 ? (totalProdKG / 1000) >= metaTM : false
        }
      })

      const exportData = {
        metadata: {
          fecha_exportacion: new Date().toISOString(),
          exportado_por: user?.nombre,
          version: '2.0.0',
          app: 'Barcos Almapac'
        },
        barco: {
          id: barco.id,
          nombre: barco.nombre,
          codigo_barco: barco.codigo_barco,
          tipo_operacion: barco.tipo_operacion,
          fecha_llegada: barco.fecha_llegada,
          fecha_salida: barco.fecha_salida,
          estado: barco.estado,
          token_compartido: barco.token_compartido,
          metas: barco.metas_json || {},
          creado: barco.created_at,
          pesador_asignado: barco.pesador ? {
            id: barco.pesador.id,
            nombre: barco.pesador.nombre,
            username: barco.pesador.username,
            rol: barco.pesador.rol
          } : null
        },
        catalogo_productos: productos,
        estadisticas: {
          total_viajes: viajes?.length || 0,
          total_kilogramos: totalKG,
          total_toneladas: totalTM,
          total_exportado: totalExportado,
          resumen_productos: resumenProductos,
          viajes_por_dia: viajes?.reduce((acc, v) => {
            const fecha = dayjs(v.created_at).format('YYYY-MM-DD')
            acc[fecha] = (acc[fecha] || 0) + 1
            return acc
          }, {}),
          exportaciones_por_dia: exportaciones?.reduce((acc, e) => {
            const fecha = dayjs(e.fecha_hora).format('YYYY-MM-DD')
            acc[fecha] = (acc[fecha] || 0) + 1
            return acc
          }, {})
        },
        datos: {
          viajes: viajes || [],
          lecturas_banda: lecturasBanda || [],
          exportaciones: exportaciones || [],
          bitacora: bitacora || []
        }
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const tipo = barco.tipo_operacion === 'exportacion' ? 'EXPORTACION' : 'IMPORTACION'
      const nombreArchivo = `${tipo}_${barco.nombre.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.json`
      
      link.href = url
      link.download = nombreArchivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`✅ Datos de ${barco.nombre} exportados correctamente`, { id: 'export' })
      
      if (barco.tipo_operacion === 'exportacion') {
        toast.success(`📊 ${exportaciones?.length || 0} exportaciones · ${totalExportado.toFixed(3)} TM totales`, { duration: 4000 })
      } else {
        toast.success(`📊 ${viajes?.length || 0} viajes · ${totalTM.toFixed(3)} TM totales`, { duration: 4000 })
      }

    } catch (error) {
      console.error('Error exportando barco:', error)
      toast.error('Error al exportar los datos', { id: 'export' })
    } finally {
      setExportando(null)
    }
  }

  // Filtrar barcos
  const barcosFiltrados = barcos.filter(barco => {
    // Filtro por tipo
    if (filtroTipo !== 'todos' && barco.tipo_operacion !== filtroTipo) return false
    
    // Búsqueda por nombre
    if (searchTerm && !barco.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6 lg:p-8">
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
                Bienvenido, <span className="font-bold">{user?.nombre}</span> · 
                Último acceso: {dayjs().format('DD/MM/YYYY HH:mm')}
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
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                title="Recargar datos"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden md:inline">Recargar</span>
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

          {/* Selector de vista */}
          <div className="flex flex-wrap gap-2 mt-6 border-t border-white/20 pt-4">
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
            <Link
              href="/admin/usuarios"
              className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Users className="w-4 h-4" />
              Usuarios
            </Link>
            <button
              onClick={() => setVista('estadisticas')}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                vista === 'estadisticas' 
                  ? 'bg-white text-blue-800' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Estadísticas
            </button>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
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
                  <p className="text-xs text-blue-300">
                    {barcos.filter(b => b.tipo_operacion === 'importacion' && b.estado === 'activo').length} Importación · 
                    {barcos.filter(b => b.tipo_operacion === 'exportacion' && b.estado === 'activo').length} Exportación
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
                  <p className="text-blue-200 text-xs">Usuarios</p>
                  <p className="text-2xl font-black text-white">{usuarios.length}</p>
                  <p className="text-xs text-blue-300">
                    {usuarios.filter(u => u.rol === 'admin').length} Admin · 
                    {usuarios.filter(u => u.rol === 'pesador').length} Pesador · 
                    {usuarios.filter(u => u.rol === 'electricista').length} Electricista
                  </p>
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
                  <p className="text-xs text-blue-300">
                    {productos.filter(p => p.tipo_registro === 'mixto').length} Mixto · 
                    {productos.filter(p => p.tipo_registro === 'banda').length} Banda · 
                    {productos.filter(p => p.tipo_registro === 'viajes').length} Viajes
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/30 p-3 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Total Barcos</p>
                  <p className="text-2xl font-black text-white">{barcos.length}</p>
                  <p className="text-xs text-blue-300">
                    {barcos.filter(b => b.tipo_operacion === 'importacion').length} Importación · 
                    {barcos.filter(b => b.tipo_operacion === 'exportacion').length} Exportación
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VISTA DE ESTADÍSTICAS */}
        {vista === 'estadisticas' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Estadísticas Generales
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tarjeta de importación */}
              <div className="bg-slate-900 rounded-xl p-5 border border-green-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Import className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-bold text-white">Importación</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barcos activos:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'importacion' && b.estado === 'activo').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barcos finalizados:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'importacion' && b.estado === 'finalizado').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'importacion').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de exportación */}
              <div className="bg-slate-900 rounded-xl p-5 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Export className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white">Exportación</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barcos activos:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'exportacion' && b.estado === 'activo').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Barcos finalizados:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'exportacion' && b.estado === 'finalizado').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-white">
                      {barcos.filter(b => b.tipo_operacion === 'exportacion').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tarjeta de usuarios */}
              <div className="bg-slate-900 rounded-xl p-5 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white">Usuarios</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Administradores:</span>
                    <span className="font-bold text-white">
                      {usuarios.filter(u => u.rol === 'admin').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pesadores:</span>
                    <span className="font-bold text-white">
                      {usuarios.filter(u => u.rol === 'pesador').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Electricistas:</span>
                    <span className="font-bold text-white">
                      {usuarios.filter(u => u.rol === 'electricista').length}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-slate-400">Total activos:</span>
                    <span className="font-bold text-white">
                      {usuarios.filter(u => u.activo).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/admin/usuarios"
                className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <UserCog className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Gestionar Usuarios</p>
                    <p className="text-xs opacity-90">Crear, editar o desactivar usuarios</p>
                  </div>
                </div>
                <span>→</span>
              </Link>

              <button
                onClick={() => {
                  setVista('productos')
                  setShowProductoForm(true)
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Nuevo Producto</p>
                    <p className="text-xs opacity-90">Agregar producto al catálogo</p>
                  </div>
                </div>
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* VISTA DE BARCOS */}
        {vista === 'barcos' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="font-black text-white flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-400" />
                  Barcos Registrados
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({barcosFiltrados.length} de {barcos.length})
                  </span>
                </h2>
                
                <div className="flex flex-wrap gap-2">
                  {/* Filtro por tipo */}
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="importacion">Solo importación</option>
                    <option value="exportacion">Solo exportación</option>
                  </select>

                  {/* Buscador */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar barco..."
                      className="bg-slate-800 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Barco</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Asignado a</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Registros</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {barcosFiltrados.map((barco) => {
                    const viajesCount = barco.viajes?.[0]?.count || 0
                    const exportacionesCount = barco.exportaciones?.[0]?.count || 0
                    
                    return (
                      <tr key={barco.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-white">{barco.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>ID: {barco.id}</span>
                              <span>•</span>
                              <span>{barco.fecha_llegada ? dayjs(barco.fecha_llegada).format('DD/MM/YYYY') : '—'}</span>
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
                          {barco.tipo_operacion === 'exportacion' ? (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                              <Export className="w-3 h-3" />
                              EXPORTACIÓN
                            </span>
                          ) : (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                              <Import className="w-3 h-3" />
                              IMPORTACIÓN
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                            barco.estado === 'finalizado' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {barco.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {barco.pesador ? (
                            <div>
                              <p className="text-white">{barco.pesador.nombre}</p>
                              <p className="text-xs text-slate-500">@{barco.pesador.username} · {barco.pesador.rol}</p>
                            </div>
                          ) : (
                            <span className="text-slate-500">No asignado</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {barco.tipo_operacion !== 'exportacion' && (
                              <span className="block text-xs">
                                <span className="text-blue-400 font-bold">{viajesCount}</span>
                                <span className="text-slate-500"> viajes</span>
                              </span>
                            )}
                            {barco.tipo_operacion === 'exportacion' && (
                              <span className="block text-xs">
                                <span className="text-blue-400 font-bold">{exportacionesCount}</span>
                                <span className="text-slate-500"> exportaciones</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-900 px-2 py-1 rounded border border-white/10 font-mono">
                              {barco.token_compartido?.substring(0, 8)}...
                            </code>
                            <button
                              onClick={() => handleCopiarLink(barco.token_compartido, barco.tipo_operacion)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Copiar link de registro"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {/* Botón Ver Detalle */}
                            <button
                              onClick={() => handleVerDetalle(barco)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors group"
                              title="Ver detalles del barco"
                            >
                              <Eye className="w-4 h-4 text-slate-400 group-hover:text-white" />
                            </button>
                            
                            {/* Botón Generar Dashboard */}
                            <button
                              onClick={() => handleGenerarDashboard(barco)}
                              className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors group"
                              title="Generar Dashboard Público"
                            >
                              <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
                            </button>
                            
                            {/* Botón Registrar según tipo */}
                            {barco.tipo_operacion === 'exportacion' ? (
                              <button
                                onClick={() => handleVerRegistroViajes(barco.token_compartido, 'exportacion')}
                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors group"
                                title="Ir a Registrar Exportación"
                              >
                                <Export className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerRegistroViajes(barco.token_compartido, 'importacion')}
                                className="p-2 hover:bg-green-500/20 rounded-lg transition-colors group"
                                title="Ir a Registrar Viajes"
                              >
                                <Truck className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                              </button>
                            )}
                            
                            {/* Botón Ver viajes paso 1 (solo importación) */}
                            {barco.tipo_operacion !== 'exportacion' && (
                              <button
                                onClick={() => handleVerViajesPaso1(barco)}
                                className="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors group"
                                title="Ver viajes pendientes"
                              >
                                <Clock className="w-4 h-4 text-yellow-400 group-hover:text-yellow-300" />
                              </button>
                            )}
                            
                            {/* Botón Ver exportaciones (solo exportación) */}
                            {barco.tipo_operacion === 'exportacion' && (
                              <button
                                onClick={() => handleVerExportaciones(barco)}
                                className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors group"
                                title="Ver registros de exportación"
                              >
                                <BarChart3 className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                              </button>
                            )}
                            
                            {/* Botón Ver bitácora */}
                            <button
                              onClick={() => handleVerBitacora(barco)}
                              className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors group"
                              title="Ver bitácora"
                            >
                              <BookOpen className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                            </button>
                            
                            {/* Botón Cambiar estado */}
                            <button
                              onClick={() => handleCambiarEstado(barco.id, barco.estado)}
                              className={`p-2 rounded-lg transition-colors group ${
                                barco.estado === 'activo' 
                                  ? 'hover:bg-red-500/20' 
                                  : 'hover:bg-green-500/20'
                              }`}
                              title={barco.estado === 'activo' ? 'Finalizar operación' : 'Reanudar operación'}
                            >
                              {barco.estado === 'activo' ? (
                                <Power className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                              ) : (
                                <Play className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                              )}
                            </button>
                            
                            {/* Botón Exportar datos */}
                            <button
                              onClick={() => handleExportarBarco(barco)}
                              disabled={exportando === barco.id}
                              className={`p-2 rounded-lg transition-colors group relative ${
                                exportando === barco.id 
                                  ? 'bg-amber-500/20 cursor-wait' 
                                  : 'hover:bg-amber-500/20'
                              }`}
                              title="Exportar todos los datos"
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
            
            {barcosFiltrados.length === 0 && (
              <div className="p-12 text-center">
                <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No se encontraron barcos</p>
                {(filtroTipo !== 'todos' || searchTerm) && (
                  <button
                    onClick={() => {
                      setFiltroTipo('todos')
                      setSearchTerm('')
                    }}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
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
                          {prod.tipo_registro === 'banda' && <><Scale className="w-3 h-3" /> Banda</>}
                          {prod.tipo_registro === 'viajes' && <><Truck className="w-3 h-3" /> Viajes</>}
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
                <p className="text-slate-500 text-xs">Se registra por viajes y también tiene lecturas de banda</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Scale className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Banda</p>
                <p className="text-slate-500 text-xs">Solo lecturas de banda, se acumula el peso continuamente</p>
                <p className="text-xs text-blue-400 mt-1">Usado para EXPORTACIÓN</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Viajes</p>
                <p className="text-slate-500 text-xs">Solo registro por viajes de camión</p>
                <p className="text-xs text-green-400 mt-1">Usado para IMPORTACIÓN</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showBarcoForm && (
        <BarcoForm
          pesadores={usuarios.filter(u => u.rol === 'pesador' || u.rol === 'electricista')}
          productos={productos}
          onClose={() => setShowBarcoForm(false)}
          onSuccess={() => {
            setShowBarcoForm(false)
            cargarDatos()
          }}
        />
      )}

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

      {showBitacoraModal && barcoSeleccionado && (
        <BitacoraProductoModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowBitacoraModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}

      {showExportacionesModal && barcoSeleccionado && (
        <ExportacionesProductoModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowExportacionesModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}

      {showDetalleModal && barcoSeleccionado && (
        <DetalleBarcoModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowDetalleModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}

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