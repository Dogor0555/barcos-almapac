// admin/page.js - Panel de administración completo con NUEVO REPORTE GENERAL DE BARCOS
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
  Upload as ExportIcon,
  Anchor, BarChart3, TrendingUp, Filter, Search,
  Eye, RefreshCw, FileText, Settings, UserCog, Shield,
  Play, Pause, Power, MoreVertical, Edit2 as Edit, UserPlus,
  User, FolderOpen, RotateCw, Gauge, FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'
import BarcoForm from '../components/adminC/BarcoForm'
import EditarBarcoModal from '../components/adminC/EditarBarcoModal'
import ProductoForm from '../components/adminC/productoForm'
import GenerarDashboardModal from './GenerarDashboardModal'
import GenerarDashboardSacosModal from './GenerarDashboardSacosModal'
import EditarMiPerfilModal from '../components/adminC/EditarMiPerfilModal'
import OperativoForm from '../components/adminC/OperativoForm'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import * as XLSX from 'xlsx'

import AccionesBarcoMenu from '../components/adminC/AccionesBarcoMenu'

dayjs.locale('es')

// =====================================================
// MODAL PARA REPORTE GENERAL DE BARCOS
// =====================================================
const ReporteGeneralBarcosModal = ({ onClose }) => {
  const [fechaInicio, setFechaInicio] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [fechaFin, setFechaFin] = useState(dayjs().format('YYYY-MM-DD'))
  const [tipoOperacion, setTipoOperacion] = useState('todos')
  const [loading, setLoading] = useState(false)
  const [barcos, setBarcos] = useState([])
  const [productosCatalogo, setProductosCatalogo] = useState([])

  useEffect(() => {
    cargarCatalogos()
  }, [])

  const cargarCatalogos = async () => {
    try {
      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
      setProductosCatalogo(productosData || [])
    } catch (error) {
      console.error('Error cargando catálogos:', error)
    }
  }

  const cargarDatosBarcos = async () => {
    setLoading(true)
    try {
      let query = supabase.from('barcos').select('*')
      
      if (tipoOperacion !== 'todos') {
        query = query.eq('tipo_operacion', tipoOperacion)
      }

      const { data: barcosData, error } = await query.order('created_at', { ascending: false })
      if (error) throw error

      const barcosConDatos = await Promise.all((barcosData || []).map(async (barco) => {
        const fechaLlegada = barco.fecha_llegada ? dayjs(barco.fecha_llegada) : null
        const estaEnRango = !fechaLlegada || (fechaLlegada.isAfter(dayjs(fechaInicio).subtract(1, 'day')) && fechaLlegada.isBefore(dayjs(fechaFin).add(1, 'day')))
        
        if (!estaEnRango) {
          return { ...barco, dentroRango: false, resumen: null }
        }

        const productosBarco = barco.metas_json?.productos || []
        const productosInfo = productosCatalogo.filter(p => productosBarco.includes(p.codigo))

        let resumenProductos = []

        if (barco.tipo_operacion !== 'exportacion') {
          for (const prod of productosInfo) {
            const { data: viajesData } = await supabase
              .from('viajes')
              .select('peso_destino_tm, peso_neto_updp_tm, estado')
              .eq('barco_id', barco.id)
              .eq('producto_id', prod.id)
              .eq('estado', 'completo')
              .gte('fecha', fechaInicio)
              .lte('fecha', fechaFin)

            const totalViajesTM = viajesData?.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0) || 0

            let totalBandaTM = 0
            if (prod.tipo_registro === 'banda' || prod.tipo_registro === 'mixto') {
              const { data: bandaData } = await supabase
                .from('lecturas_banda')
                .select('acumulado_tm')
                .eq('barco_id', barco.id)
                .eq('producto_id', prod.id)
                .order('fecha_hora', { ascending: false })
                .limit(1)
              
              if (bandaData && bandaData.length > 0) {
                totalBandaTM = Number(bandaData[0].acumulado_tm) || 0
              }
            }

            const metaTM = barco.metas_json?.limites?.[prod.codigo] || 0
            const totalTM = totalViajesTM + totalBandaTM

            resumenProductos.push({
              nombre: prod.nombre,
              codigo: prod.codigo,
              icono: prod.icono,
              tipo: 'IMPORTACIÓN',
              metodo: prod.tipo_registro === 'banda' ? 'Banda' : (prod.tipo_registro === 'viajes' ? 'Viajes' : 'Mixto'),
              descargadoTM: totalTM,
              metaTM: metaTM,
              viajesCount: viajesData?.length || 0,
              completado: metaTM > 0 ? totalTM >= metaTM : false
            })
          }
        } else {
          for (const prod of productosInfo) {
            const { data: exportData } = await supabase
              .from('exportacion_banda')
              .select('acumulado_tm, fecha_hora')
              .eq('barco_id', barco.id)
              .eq('producto_id', prod.id)
              .gte('fecha_hora', `${fechaInicio}T00:00:00`)
              .lte('fecha_hora', `${fechaFin}T23:59:59`)
              .order('fecha_hora', { ascending: true })

            let totalRecibidoTM = 0
            if (exportData && exportData.length > 0) {
              totalRecibidoTM = Number(exportData[exportData.length - 1].acumulado_tm) || 0
            }

            const metaTM = barco.metas_json?.limites?.[prod.codigo] || 0

            resumenProductos.push({
              nombre: prod.nombre,
              codigo: prod.codigo,
              icono: prod.icono,
              tipo: 'EXPORTACIÓN',
              metodo: 'Recepción por Banda',
              descargadoTM: totalRecibidoTM,
              metaTM: metaTM,
              lecturasCount: exportData?.length || 0,
              completado: metaTM > 0 ? totalRecibidoTM >= metaTM : false
            })
          }
        }

        return {
          ...barco,
          dentroRango: true,
          resumen: {
            productos: resumenProductos,
            totalTM: resumenProductos.reduce((sum, p) => sum + p.descargadoTM, 0)
          }
        }
      }))

      setBarcos(barcosConDatos)
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const exportarAExcel = () => {
    try {
      const barcosFiltrados = barcos.filter(b => b.dentroRango)
      
      if (barcosFiltrados.length === 0) {
        toast.error('No hay barcos en el rango seleccionado')
        return
      }

      const wb = XLSX.utils.book_new()
      
      const resumenData = [
        ['REPORTE GENERAL DE BARCOS'],
        [`Período: ${dayjs(fechaInicio).format('DD/MM/YYYY')} - ${dayjs(fechaFin).format('DD/MM/YYYY')}`],
        [`Fecha de generación: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`],
        [`Tipo de operación: ${tipoOperacion === 'todos' ? 'Todos' : (tipoOperacion === 'importacion' ? 'Importación' : 'Exportación')}`],
        [],
        ['RESUMEN GENERAL'],
        ['Barco', 'Tipo', 'Fecha Llegada', 'Estado', 'Total Descargado/Recibido (TM)', 'Productos', 'Detalle']
      ]

      barcosFiltrados.forEach(barco => {
        const detalleProductos = barco.resumen.productos.map(p => 
          `${p.nombre}: ${p.descargadoTM.toFixed(3)} TM${p.metaTM > 0 ? ` (Meta: ${p.metaTM.toFixed(3)} TM)` : ''}`
        ).join(' | ')
        
        resumenData.push([
          barco.nombre,
          barco.tipo_operacion === 'importacion' ? 'IMPORTACIÓN' : 'EXPORTACIÓN',
          barco.fecha_llegada ? dayjs(barco.fecha_llegada).format('DD/MM/YYYY') : '—',
          barco.estado,
          barco.resumen.totalTM.toFixed(3),
          barco.resumen.productos.map(p => p.nombre).join(', '),
          detalleProductos
        ])
      })

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General')

      const detalleData = [
        ['DETALLE POR BARCO Y PRODUCTO'],
        [`Período: ${dayjs(fechaInicio).format('DD/MM/YYYY')} - ${dayjs(fechaFin).format('DD/MM/YYYY')}`],
        [],
        ['Barco', 'Tipo', 'Producto', 'Código', 'Operación', 'Método', 'Cantidad (TM)', 'Meta (TM)', '% Cumplimiento', 'Estado']
      ]

      barcosFiltrados.forEach(barco => {
        barco.resumen.productos.forEach(prod => {
          const porcentaje = prod.metaTM > 0 ? (prod.descargadoTM / prod.metaTM) * 100 : 0
          detalleData.push([
            barco.nombre,
            barco.tipo_operacion === 'importacion' ? 'IMPORTACIÓN' : 'EXPORTACIÓN',
            prod.nombre,
            prod.codigo,
            prod.tipo,
            prod.metodo,
            prod.descargadoTM.toFixed(3),
            prod.metaTM.toFixed(3),
            porcentaje.toFixed(1) + '%',
            prod.completado ? 'COMPLETADO' : (prod.descargadoTM > 0 ? 'EN PROCESO' : 'PENDIENTE')
          ])
        })
      })

      const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)
      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle por Producto')

      wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 60 }]
      wsDetalle['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }]

      const nombreArchivo = `Reporte_Barcos_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)
      
      toast.success(`✅ Reporte exportado: ${nombreArchivo}`)
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar el reporte')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Reporte General de Barcos</h2>
              <p className="text-blue-200 text-xs">Genera un reporte completo de todos los barcos en el período seleccionado</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha Final</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo de Operación</label>
              <select
                value={tipoOperacion}
                onChange={(e) => setTipoOperacion(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="todos">Todos</option>
                <option value="importacion">Solo Importación</option>
                <option value="exportacion">Solo Exportación</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <button
              onClick={cargarDatosBarcos}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Cargando...' : 'Consultar Barcos'}
            </button>
            <button
              onClick={exportarAExcel}
              disabled={loading || !barcos.some(b => b.dentroRango)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar a Excel
            </button>
          </div>

          {barcos.length > 0 && !loading && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white">Resultados ({barcos.filter(b => b.dentroRango).length} barcos en rango)</h3>
                <span className="text-xs text-slate-400">Click en barco para ver detalle</span>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {barcos.filter(b => b.dentroRango).map(barco => (
                  <div key={barco.id} className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <Ship className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="font-bold text-white">{barco.nombre}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-slate-400">{barco.codigo_barco || 'Sin código'}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              barco.tipo_operacion === 'importacion' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {barco.tipo_operacion === 'importacion' ? 'IMPORTACIÓN' : 'EXPORTACIÓN'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              barco.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                              barco.estado === 'finalizado' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {barco.estado}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-blue-400">{barco.resumen.totalTM.toFixed(3)} TM</p>
                        <p className="text-[10px] text-slate-500">{barco.resumen.productos.length} producto(s)</p>
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {barco.resumen.productos.map((prod, idx) => (
                          <div key={idx} className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{prod.icono}</span>
                              <div>
                                <p className="font-bold text-white">{prod.nombre}</p>
                                <p className="text-xs text-slate-500">{prod.codigo}</p>
                              </div>
                              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                prod.tipo === 'IMPORTACIÓN' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {prod.tipo}
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">
                                {prod.tipo === 'IMPORTACIÓN' ? 'Descargado:' : 'Recibido:'}
                              </span>
                              <span className="font-bold text-blue-400">{prod.descargadoTM.toFixed(3)} TM</span>
                            </div>
                            
                            {prod.metaTM > 0 && (
                              <>
                                <div className="flex justify-between text-xs mt-1">
                                  <span className="text-slate-400">Meta:</span>
                                  <span className="text-slate-300">{prod.metaTM.toFixed(3)} TM</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${prod.completado ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(100, (prod.descargadoTM / prod.metaTM) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                  <span>0%</span>
                                  <span>{prod.completado ? '✓ COMPLETADO' : `${((prod.descargadoTM / prod.metaTM) * 100).toFixed(1)}%`}</span>
                                  <span>100%</span>
                                </div>
                              </>
                            )}
                            
                            <div className="flex justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-white/10">
                              <span>Método: {prod.metodo}</span>
                              {prod.viajesCount !== undefined && <span>{prod.viajesCount} viaje(s)</span>}
                              {prod.lecturasCount !== undefined && <span>{prod.lecturasCount} lectura(s)</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && barcos.filter(b => b.dentroRango).length === 0 && barcos.length > 0 && (
            <div className="text-center py-12">
              <Ship className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No hay barcos en el rango de fechas seleccionado</p>
            </div>
          )}

          {!loading && barcos.length === 0 && (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">Haz click en "Consultar Barcos" para generar el reporte</p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MODAL PARA VER EXPORTACIONES POR PRODUCTO (RECIBIDAS)
// =====================================================
const ExportacionesProductoModal = ({ barco, onClose }) => {
  const [exportaciones, setExportaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [barcosOrigen, setBarcosOrigen] = useState({})

  useEffect(() => {
    if (barco) {
      cargarDatos()
    }
  }, [barco])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
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
          barco_origen:destino_barco_id(id, nombre, codigo_barco)
        `)
        .eq('barco_id', barcoId)
        .eq('producto_id', productoId)
        .order('fecha_hora', { ascending: false })

      if (error) throw error
      setExportaciones(data || [])
      
      const barcosOrigenIds = [...new Set((data || []).map(e => e.destino_barco_id).filter(Boolean))]
      if (barcosOrigenIds.length > 0) {
        const { data: barcosData } = await supabase
          .from('barcos')
          .select('id, nombre, codigo_barco')
          .in('id', barcosOrigenIds)

        const mapa = {}
        barcosData?.forEach(b => { mapa[b.id] = b })
        setBarcosOrigen(mapa)
      }
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <ExportIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                Exportaciones Recibidas - {barco.nombre}
              </h2>
              <p className="text-blue-200 text-sm">
                Registros de producto recibido por banda desde otros barcos
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {productos.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center">
              <ExportIcon className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No hay productos configurados</h3>
              <p className="text-slate-400">Este barco no tiene productos asociados para exportación</p>
            </div>
          ) : (
            <div className="space-y-6">
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

              {productoActual && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Total Registros</p>
                    <p className="text-3xl font-black text-blue-400">{exportaciones.length}</p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-xs text-slate-400">Total Recibido</p>
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

              <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-white">
                      Producto Recibido - {productoActual?.nombre}
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
                    <ExportIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">No hay registros de exportación para este producto</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Fecha y Hora</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Acumulado (TM)</th>
                          <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Barco Origen</th>
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
                              {exp.barco_origen ? (
                                <div>
                                  <p className="text-white">{exp.barco_origen.nombre}</p>
                                  {exp.barco_origen.codigo_barco && (
                                    <p className="text-xs text-blue-400">{exp.barco_origen.codigo_barco}</p>
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
                          <td colSpan="3"> </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {exportaciones.length > 0 && (
                <div className="bg-slate-900 border border-white/10 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-blue-400" />
                    Resumen por Barco Origen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(
                      exportaciones.reduce((acc, exp) => {
                        const id = exp.destino_barco_id
                        if (!id) return acc
                        if (!acc[id]) {
                          acc[id] = {
                            nombre: exp.barco_origen?.nombre || 'Desconocido',
                            codigo: exp.barco_origen?.codigo_barco,
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
                          <span className="text-slate-400">Total recibido:</span>
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

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <ExportIcon className="w-4 h-4 flex-shrink-0" />
                  Este barco RECIBE producto por banda desde otros barcos (origen). 
                  Cada lectura muestra el acumulado total recibido hasta ese momento.
                </p>
              </div>
            </div>
          )}
        </div>

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
    totalRecibido: 0
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

    let viajes = []
    if (barco.tipo_operacion !== 'exportacion') {
      const { data: viajesData } = await supabase
        .from('viajes')
        .select('*')
        .eq('barco_id', barco.id)
      viajes = viajesData || []
    }

    const { data: exportaciones } = await supabase
      .from('exportacion_banda')
      .select('*')
      .eq('barco_id', barco.id)

    const productosBarco = barco.metas_json?.productos || []
    const { data: productosData } = await supabase
      .from('productos')
      .select('*')
      .in('codigo', productosBarco)

    let bandasPorProducto = {}
    if (barco.tipo_operacion !== 'exportacion' && productosData?.length > 0) {
      for (const prod of productosData) {
        const { data: bandaData } = await supabase
          .from('lecturas_banda')
          .select('acumulado_tm')
          .eq('barco_id', barco.id)
          .eq('producto_id', prod.id)
          .order('fecha_hora', { ascending: false })
          .limit(1)
        bandasPorProducto[prod.id] = bandaData?.[0]?.acumulado_tm || 0
      }
    }

    const viajesCompletos = viajes?.filter(v => v.estado === 'completo') || []

    const resumenProductos = (productosData || []).map(prod => {
      const viajesProd = viajesCompletos.filter(v => v.producto_id === prod.id)
      const tmViajes = viajesProd.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0)
      const tmBanda = bandasPorProducto[prod.id] || 0
      const tmTotal = tmViajes + tmBanda

      return {
        ...prod,
        tmViajes,
        tmBanda,
        tmTotal,
        cantViajes: viajesProd.length
      }
    })

    const totalImportado = resumenProductos.reduce((sum, p) => sum + p.tmTotal, 0)
    const totalImportadoViajes = resumenProductos.reduce((sum, p) => sum + p.tmViajes, 0)
    const totalBanda = resumenProductos.reduce((sum, p) => sum + p.tmBanda, 0)

    const totalRecibido = exportaciones?.length > 0
      ? exportaciones[exportaciones.length - 1]?.acumulado_tm || 0
      : 0

    setStats({
      viajes: viajes?.length || 0,
      viajesCompletos: viajesCompletos.length,
      exportaciones: exportaciones?.length || 0,
      productos: productosData || [],
      resumenProductos,
      totalImportado,
      totalImportadoViajes,
      totalBanda,
      totalRecibido,
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl">
              <Ship className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{barco.nombre}</h2>
              <p className="text-blue-200 text-sm">
                {barco.codigo_barco && `Código: ${barco.codigo_barco} · `}
                {barco.tipo_operacion === 'exportacion' ? 'EXPORTACIÓN ' : 'IMPORTACIÓN'}
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
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

<div className="space-y-3">
  {barco.tipo_operacion !== 'exportacion' && (
    <>
      <div className="bg-slate-900 rounded-xl p-4 border border-green-500/20">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-slate-500">Total Importado (todos los productos)</p>
            <p className="text-2xl font-bold text-green-400">
              {stats.totalImportado?.toFixed(3) || '0.000'} TM
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{stats.viajesCompletos} viajes completos</p>
            <p>de {stats.viajes} totales</p>
          </div>
        </div>
        <div className="flex gap-4 pt-2 border-t border-white/10">
          <div>
            <p className="text-xs text-slate-500">Suma viajes</p>
            <p className="text-sm font-bold text-blue-400">
              {stats.totalImportadoViajes?.toFixed(3) || '0.000'} TM
            </p>
          </div>
          <div className="border-l border-white/10 pl-4">
            <p className="text-xs text-slate-500">Suma banda</p>
            <p className="text-sm font-bold text-purple-400">
              {stats.totalBanda?.toFixed(3) || '0.000'} TM
            </p>
          </div>
        </div>
      </div>

      {stats.resumenProductos?.map(prod => (
        <div key={prod.id} className="bg-slate-900 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{prod.icono}</span>
            <div className="flex-1">
              <p className="font-bold text-white">{prod.nombre}</p>
              <p className="text-xs text-slate-500">{prod.codigo} · {prod.tipo_registro}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-black text-green-400">{prod.tmTotal.toFixed(3)} TM</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            {(prod.tipo_registro === 'viajes' || prod.tipo_registro === 'mixto') && (
              <div className="bg-slate-800 rounded-lg p-2">
                <p className="text-xs text-slate-500">Por viajes</p>
                <p className="text-sm font-bold text-blue-400">{prod.tmViajes.toFixed(3)} TM</p>
                <p className="text-xs text-slate-600">{prod.cantViajes} viajes</p>
              </div>
            )}
            {(prod.tipo_registro === 'banda' || prod.tipo_registro === 'mixto') && (
              <div className="bg-slate-800 rounded-lg p-2">
                <p className="text-xs text-slate-500">Por banda</p>
                <p className="text-sm font-bold text-purple-400">{prod.tmBanda.toFixed(3)} TM</p>
                <p className="text-xs text-slate-600">acumulado</p>
              </div>
            )}
          </div>

          {(() => {
            const meta = barco.metas_json?.limites?.[prod.codigo] || 0
            if (meta <= 0) return null
            const pct = Math.min((prod.tmTotal / meta) * 100, 100)
            return (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Progreso vs meta</span>
                  <span className={pct >= 100 ? 'text-green-400 font-bold' : 'text-slate-400'}>
                    {pct.toFixed(1)}% de {meta.toFixed(3)} TM
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-400' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })()}
        </div>
      ))}
    </>
  )}

  {barco.tipo_operacion === 'exportacion' && (
    <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20">
      <p className="text-xs text-slate-500">Total Recibido</p>
      <p className="text-2xl font-bold text-blue-400">
        {stats.totalRecibido?.toFixed(3) || '0.000'} TM
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {stats.exportaciones} lecturas de banda recibidas
      </p>
    </div>
  )}
</div>

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

              {barco.tipo_operacion === 'exportacion' && barco.metas_json?.barcos_origen?.length > 0 && (
                <div className="bg-slate-900 rounded-xl p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Ship className="w-4 h-4 text-blue-400" />
                    Barcos Origen (desde donde recibe)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {barco.metas_json.barcos_origen.map(id => (
                      <span key={id} className="bg-slate-800 px-3 py-1 rounded-full text-sm text-blue-400">
                        ID: {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 rounded-xl p-4 text-xs text-slate-500">
                <p>Creado: {dayjs(barco.created_at).format('DD/MM/YYYY HH:mm')}</p>
                <p>Última actualización: {dayjs(barco.updated_at || barco.created_at).format('DD/MM/YYYY HH:mm')}</p>
              </div>
            </div>
          )}
        </div>

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
// MODAL PARA VER VIAJES EN PASO 1 (IMPORTACIÓN)
// =====================================================
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
    window.open(`/barco/${barco.token_compartido}`, '_blank')
    toast.success('Abriendo registro para completar viaje')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
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
            </div>
          )}
        </div>

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
// MODAL PARA VER BITÁCORA POR PRODUCTO
// =====================================================
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

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {productos.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No hay productos configurados</h3>
              <p className="text-slate-400">Este barco no tiene productos asociados para mostrar bitácora</p>
            </div>
          ) : (
            <div className="space-y-6">
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
            </div>
          )}
        </div>

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
  const [usuarios, setUsuarios] = useState([])
  const [productos, setProductos] = useState([])
  const [operativos, setOperativos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBarcoForm, setShowBarcoForm] = useState(false)
  const [showEditarBarcoModal, setShowEditarBarcoModal] = useState(false)
  const [barcoEditando, setBarcoEditando] = useState(null)
  const [showProductoForm, setShowProductoForm] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [showOperativoForm, setShowOperativoForm] = useState(false)
  const [exportando, setExportando] = useState(null)
  const [vista, setVista] = useState('barcos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditarMiPerfil, setShowEditarMiPerfil] = useState(false)
  
  const [barcoSeleccionado, setBarcoSeleccionado] = useState(null)
  const [showViajesPaso1Modal, setShowViajesPaso1Modal] = useState(false)
  const [showBitacoraModal, setShowBitacoraModal] = useState(false)
  const [showExportacionesModal, setShowExportacionesModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [showGenerarDashboardModal, setShowGenerarDashboardModal] = useState(false)
  const [showGenerarDashboardSacosModal, setShowGenerarDashboardSacosModal] = useState(false)
  
  const [showReporteGeneralModal, setShowReporteGeneralModal] = useState(false)

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
      
      const { data: barcosData, error: barcosError } = await supabase
        .from('barcos')
        .select('*')
        .order('created_at', { ascending: false })

      if (barcosError) throw barcosError

      const barcosConPesador = await Promise.all((barcosData || []).map(async (barco) => {
        if (barco.pesador_id) {
          const { data: pesador } = await supabase
            .from('usuarios')
            .select('id, nombre, username, rol')
            .eq('id', barco.pesador_id)
            .single()
          return { ...barco, pesador }
        }
        return { ...barco, pesador: null }
      }))

      const barcosConConteos = await Promise.all(barcosConPesador.map(async (barco) => {
        const { count: viajesCount } = await supabase
          .from('viajes')
          .select('*', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        const { count: exportacionesCount } = await supabase
          .from('exportacion_banda')
          .select('*', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        return {
          ...barco,
          viajes: [{ count: viajesCount || 0 }],
          exportaciones: [{ count: exportacionesCount || 0 }]
        }
      }))

      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nombre, username, rol, activo')
        .order('nombre')

      const { data: productosData } = await supabase
        .from('productos')
        .select('*')
        .order('codigo', { ascending: true })

      const { data: operativosData } = await supabase
        .from('operativos_traslados')
        .select('*')
        .order('created_at', { ascending: false })

      setBarcos(barcosConConteos || [])
      setUsuarios(usuariosData || [])
      setProductos(productosData || [])
      setOperativos(operativosData || [])
      
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
    toast.success(`Link de ${tipo === 'exportacion' ? 'registro de recepción' : 'registro'} copiado`, { icon: '📋' })
  }

  const handleEditarBarco = (barco) => {
    setBarcoEditando(barco)
    setShowEditarBarcoModal(true)
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
      toast.error('Este barco no tiene registros de exportación recibida')
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

  const handleGenerarDashboardSacos = (barco) => {
    if (!barco.codigo_barco) {
      toast.error('Este barco no tiene código de buque asignado')
      return
    }
    setBarcoSeleccionado(barco)
    setShowGenerarDashboardSacosModal(true)
  }
  
  const handleAbrirReporteGeneral = () => {
    setShowReporteGeneralModal(true)
  }

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

  const handleGuardarOperativo = async (operativoData) => {
    try {
      const user = getCurrentUser()
      
      const { error } = await supabase
        .from('operativos_traslados')
        .insert([{
          ...operativoData,
          created_by: user.id,
          estado: 'activo'
        }])

      if (error) throw error

      toast.success('✅ Operativo creado correctamente')
      setShowOperativoForm(false)
      cargarDatos()
    } catch (error) {
      console.error('Error guardando operativo:', error)
      toast.error('Error al crear operativo')
    }
  }

  const handleEliminarOperativo = async (operativoId, operativoNombre) => {
    if (!confirm(`¿Estás seguro de eliminar el operativo "${operativoNombre}"?`)) return

    try {
      const { error } = await supabase
        .from('operativos_traslados')
        .update({ estado: 'cancelado' })
        .eq('id', operativoId)

      if (error) throw error

      toast.success('Operativo cancelado')
      cargarDatos()
    } catch (error) {
      console.error('Error eliminando operativo:', error)
      toast.error('Error al cancelar operativo')
    }
  }

 const handleExportarBarco = async (barco) => {
  try {
    setExportando(barco.id)
    toast.loading(`Exportando datos de ${barco.nombre}...`, { id: 'export' })

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
          barco_origen:destino_barco_id(id, nombre, codigo_barco)
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
    const totalViajeTM = totalKG / 1000
    const ultimaBanda = lecturasBanda?.length > 0
      ? lecturasBanda[lecturasBanda.length - 1]?.acumulado_tm || 0
      : 0
    const totalTM = totalViajeTM + ultimaBanda
    const totalRecibido = exportaciones?.length > 0
      ? exportaciones[exportaciones.length - 1]?.acumulado_tm || 0
      : 0

    const resumenProductos = {}
    productos.forEach(prod => {
      const viajesProd = viajes?.filter(v => v.producto_id === prod.id) || []
      const exportProd = exportaciones?.filter(e => e.producto_id === prod.id) || []
      const totalProdKG = viajesProd.reduce((sum, v) => sum + (Number(v.peso_neto_updp_kg) || 0), 0)
      const bandaProd = lecturasBanda?.filter(l => l.producto_id === prod.id) || []
      const ultimaBandaProd = bandaProd.length > 0
        ? bandaProd[bandaProd.length - 1]?.acumulado_tm || 0
        : 0
      const metaTM = barco.metas_json?.limites?.[prod.codigo] || 0
      const totalProdTM = (totalProdKG / 1000) + ultimaBandaProd

      resumenProductos[prod.codigo] = {
        producto: prod.nombre,
        tipo: prod.tipo_registro,
        metaTM,
        descargadoTM: totalProdKG / 1000,
        bandaTM: ultimaBandaProd,
        totalTM: totalProdTM,
        recibidoTM: exportProd.length > 0
          ? exportProd[exportProd.length - 1]?.acumulado_tm || 0
          : 0,
        viajes: viajesProd.length,
        exportaciones: exportProd.length,
        completado: metaTM > 0 ? totalProdTM >= metaTM : false
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
        total_kilogramos_viajes: totalKG,
        total_tm_viajes: totalViajeTM,
        total_tm_banda: ultimaBanda,
        total_toneladas: totalTM,
        total_recibido: totalRecibido,
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
        exportaciones_recibidas: exportaciones || [],
        bitacora: bitacora || []
      }
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const tipo = barco.tipo_operacion === 'exportacion' ? 'RECEPCION' : 'IMPORTACION'
    const nombreArchivo = `${tipo}_${barco.nombre.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.json`

    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`✅ Datos de ${barco.nombre} exportados correctamente`, { id: 'export' })

    if (barco.tipo_operacion === 'exportacion') {
      toast.success(`📊 ${exportaciones?.length || 0} registros de recepción · ${totalRecibido.toFixed(3)} TM totales`, { duration: 4000 })
    } else {
      toast.success(`📊 ${viajes?.length || 0} viajes · ${totalViajeTM.toFixed(3)} TM viajes + ${ultimaBanda.toFixed(3)} TM banda = ${totalTM.toFixed(3)} TM totales`, { duration: 4000 })
    }

  } catch (error) {
    console.error('Error exportando barco:', error)
    toast.error('Error al exportar los datos', { id: 'export' })
  } finally {
    setExportando(null)
  }
}

  const barcosFiltrados = barcos.filter(barco => {
    if (filtroTipo !== 'todos' && barco.tipo_operacion !== filtroTipo) return false
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
            <div className="flex gap-3 flex-wrap">
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

              <Link
                href="/registroatrasos"
                className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Clock className="w-4 h-4" />
                Registro de Atrasos
              </Link>

              <Link
                href="/traslados"
                className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Truck className="w-4 h-4" />
                Traslados Azúcar
              </Link>

               <Link
                href="/admin/envasado"
                className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Truck className="w-4 h-4" />
                Envasados
              </Link>

              <button
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                title="Recargar datos"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden md:inline">Recargar</span>
              </button>

              <button
                onClick={() => setShowEditarMiPerfil(true)}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
                title="Editar mi perfil"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Mi Perfil</span>
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
            <button
              onClick={() => setVista('operativos')}
              className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                vista === 'operativos' 
                  ? 'bg-white text-amber-800' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Operativos Traslados
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
          <div className="grid grid-cols-5 gap-4 mt-6">
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
                  <p className="text-blue-200 text-xs">Usuarios</p>
                  <p className="text-2xl font-black text-white">{usuarios.length}</p>
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
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/30 p-3 rounded-lg">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Operativos</p>
                  <p className="text-2xl font-black text-white">{operativos.length}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleAbrirReporteGeneral}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500/30 p-3 rounded-lg group-hover:bg-green-500/40 transition-all">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-blue-200 text-xs">Reporte General</p>
                  <p className="text-md font-black text-white">📊 Barcos</p>
                </div>
              </div>
            </button>
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
              <div className="bg-slate-900 rounded-xl p-5 border border-green-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Import className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="font-bold text-white">Importación (reciben)</h3>
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

              <div className="bg-slate-900 rounded-xl p-5 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <ExportIcon className="w-5 h-5 text-blue-400" />
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

              <div className="bg-slate-900 rounded-xl p-5 border border-amber-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-amber-500/20 p-2 rounded-lg">
                    <Truck className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="font-bold text-white">Traslados</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Operativos activos:</span>
                    <span className="font-bold text-white">
                      {operativos.filter(o => o.estado === 'activo').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total operativos:</span>
                    <span className="font-bold text-white">{operativos.length}</span>
                  </div>
                </div>
              </div>

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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <button
                onClick={() => {
                  setVista('operativos')
                  setShowOperativoForm(true)
                }}
                className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 text-white hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-6 h-6" />
                  <div>
                    <p className="font-bold">Nuevo Operativo</p>
                    <p className="text-xs opacity-90">Crear operativo para traslados</p>
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
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos los tipos</option>
                    <option value="importacion">Solo importación</option>
                    <option value="exportacion">Solo exportación</option>
                  </select>

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
                              <ExportIcon className="w-3 h-3" />
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
                                <span className="text-slate-500"> recepciones</span>
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
                          <AccionesBarcoMenu
                            barco={barco}
                            exportando={exportando}
                            onVerDetalle={handleVerDetalle}
                            onEditarBarco={handleEditarBarco}
                            onGenerarDashboard={handleGenerarDashboard}
                            onGenerarDashboardSacos={handleGenerarDashboardSacos}
                            onVerRegistroViajes={handleVerRegistroViajes}
                            onCopiarLink={handleCopiarLink}
                            onVerViajesPaso1={handleVerViajesPaso1}
                            onVerExportaciones={handleVerExportaciones}
                            onVerBitacora={handleVerBitacora}
                            onCambiarEstado={handleCambiarEstado}
                            onExportarBarco={handleExportarBarco}
                            onEliminarBarco={handleEliminarBarco}
                          />
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

        {/* VISTA DE OPERATIVOS - CON BOTÓN IR AL DASHBOARD */}
        {vista === 'operativos' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-black text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-400" />
                Operativos de Traslados
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({operativos.length} total)
                </span>
              </h2>
              <button
                onClick={() => setShowOperativoForm(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Operativo
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha Inicio</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha Fin</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Creado</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {operativos.map((op) => (
                    <tr key={op.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{op.nombre}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {op.descripcion || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {dayjs(op.fecha_inicio).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-6 py-4">
                        {op.fecha_fin ? dayjs(op.fecha_fin).format('DD/MM/YYYY') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          op.estado === 'activo' ? 'bg-green-500/20 text-green-400' :
                          op.estado === 'finalizado' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {op.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {dayjs(op.created_at).format('DD/MM/YYYY')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/traslados?operativo=${op.id}`}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Ver traslados"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </Link>
                          <Link
                            href={`/traslados/dashboard-traslados?operativo=${op.id}`}
                            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                            title="Ir al Dashboard de Tiempos"
                          >
                            <Gauge className="w-4 h-4 text-purple-400" />
                          </Link>
                          <button
                            onClick={() => handleEliminarOperativo(op.id, op.nombre)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Cancelar Operativo"
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

            {operativos.length === 0 && (
              <div className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No hay operativos creados</p>
                <button
                  onClick={() => setShowOperativoForm(true)}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear primer operativo
                </button>
              </div>
            )}
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
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <Truck className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Viajes</p>
                <p className="text-slate-500 text-xs">Solo registro por viajes de camión</p>
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

      {showEditarBarcoModal && barcoEditando && (
        <EditarBarcoModal
          barco={barcoEditando}
          pesadores={usuarios.filter(u => u.rol === 'pesador' || u.rol === 'electricista')}
          productos={productos}
          onClose={() => {
            setShowEditarBarcoModal(false)
            setBarcoEditando(null)
          }}
          onSuccess={() => {
            setShowEditarBarcoModal(false)
            setBarcoEditando(null)
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

      {showOperativoForm && (
        <OperativoForm
          onClose={() => setShowOperativoForm(false)}
          onSave={handleGuardarOperativo}
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

      {showGenerarDashboardSacosModal && barcoSeleccionado && (
        <GenerarDashboardSacosModal
          barco={barcoSeleccionado}
          onClose={() => {
            setShowGenerarDashboardSacosModal(false)
            setBarcoSeleccionado(null)
          }}
        />
      )}

      {showEditarMiPerfil && (
        <EditarMiPerfilModal
          onClose={() => setShowEditarMiPerfil(false)}
          onSuccess={(updatedUser) => {
            setUser(updatedUser)
          }}
        />
      )}

      {showReporteGeneralModal && (
        <ReporteGeneralBarcosModal
          onClose={() => setShowReporteGeneralModal(false)}
        />
      )}
    </div>
  )
}