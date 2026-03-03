// barco/[token]/exportacion/page.js - Página para registro de exportación (carga a bodega del barco)
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from './../../../lib/supabase'
import { getCurrentUser } from './../../../lib/auth'
import { 
  formatTM, formatHora, formatFechaHora, formatFecha
} from './../../../lib/utils'
import { 
  Save, RefreshCw, Scale, Ship, Target, CheckCircle, 
  Package, Clock, AlertCircle, Edit2, Trash2, MapPin,
  TrendingUp, LineChart, BookOpen, X, Download, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'

// =====================================================
// CONFIGURACIÓN DE BODEGAS DEL BARCO
// =====================================================
const BODEGAS_BARCO = [
  { id: 1, nombre: 'Bodega 1', codigo: 'BDG-01', capacidad: 5000 },
  { id: 2, nombre: 'Bodega 2', codigo: 'BDG-02', capacidad: 5000 },
  { id: 3, nombre: 'Bodega 3', codigo: 'BDG-03', capacidad: 5000 },
  { id: 4, nombre: 'Bodega 4', codigo: 'BDG-04', capacidad: 5000 },
  { id: 5, nombre: 'Bodega 5', codigo: 'BDG-05', capacidad: 5000 },
  { id: 6, nombre: 'Bodega 6', codigo: 'BDG-06', capacidad: 5000 },
  { id: 7, nombre: 'Bodega 7', codigo: 'BDG-07', capacidad: 5000 },
  { id: 8, nombre: 'Bodega 8', codigo: 'BDG-08', capacidad: 5000 },
]

export default function ExportacionPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [productos, setProductos] = useState([])
  const [exportaciones, setExportaciones] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [user, setUser] = useState(null)
  
  // Estado para nueva exportación
  const [nuevaExportacion, setNuevaExportacion] = useState({
    fecha_hora: '',
    acumulado_tm: '',
    bodega_id: '', // Cambiado de destino_barco_id a bodega_id
    observaciones: ''
  })

  // Estado para bitácora
  const [bitacoraActual, setBitacoraActual] = useState({
    fecha_hora: '',
    comentarios: ''
  })

  // Estado para edición
  const [editandoExportacion, setEditandoExportacion] = useState(null)
  const [editandoBitacora, setEditandoBitacora] = useState(null)

  // Función para obtener hora actual
  const getHoraActual = () => {
    const ahora = new Date()
    const year = ahora.getFullYear()
    const month = String(ahora.getMonth() + 1).padStart(2, '0')
    const day = String(ahora.getDate()).padStart(2, '0')
    const hours = String(ahora.getHours()).padStart(2, '0')
    const minutes = String(ahora.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Cargar datos
  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    cargarDatos()
  }, [token])

  // Inicializar producto activo cuando se carguen productos
  useEffect(() => {
    if (productos.length > 0 && !productoActivo) {
      setProductoActivo(productos[0])
      setNuevaExportacion(prev => ({
        ...prev,
        fecha_hora: getHoraActual()
      }))
    }
  }, [productos])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Buscar barco por token
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        toast.error('Link inválido')
        return
      }

      setBarco(barcoData)

      // Productos del barco
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

      // Cargar exportaciones (ahora con bodega_id)
      const { data: exportData } = await supabase
        .from('exportacion_banda')
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono)
        `)
        .eq('barco_id', barcoData.id)
        .order('fecha_hora', { ascending: false })

      setExportaciones(exportData || [])

      // Cargar bitácora de exportación
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

  // Calcular estadísticas por producto
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

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]
    const totalTM = ultima.acumulado_tm

    // Calcular flujo promedio (TM/h)
    const horasTranscurridas = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
    const flujoPromedio = horasTranscurridas > 0 ? totalTM / horasTranscurridas : 0

    return {
      totalTM,
      lecturas: exportacionesProd.length,
      primeraLectura: primera,
      ultimaLectura: ultima,
      flujoPromedio
    }
  }, [exportaciones, productoActivo])

  // Datos para gráfica de tendencia
  const datosGrafico = useMemo(() => {
    if (!productoActivo) return []

    const exportacionesProd = exportaciones
      .filter(e => e.producto_id === productoActivo.id)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))

    return exportacionesProd.map(e => {
      const bodega = BODEGAS_BARCO.find(b => b.id === e.bodega_id)
      return {
        hora: dayjs(e.fecha_hora).format('DD/MM HH:mm'),
        acumulado: e.acumulado_tm,
        bodega: bodega?.nombre || '—'
      }
    })
  }, [exportaciones, productoActivo])

  // Resumen por bodega
  const resumenPorBodega = useMemo(() => {
    if (!productoActivo) return []

    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
    
    const mapa = {}
    
    exportacionesProd.forEach(e => {
      const key = e.bodega_id
      if (!key) return
      
      if (!mapa[key]) {
        mapa[key] = {
          bodega_id: key,
          nombre: BODEGAS_BARCO.find(b => b.id === key)?.nombre || `Bodega ${key}`,
          codigo: BODEGAS_BARCO.find(b => b.id === key)?.codigo || `BDG-${key}`,
          capacidad: BODEGAS_BARCO.find(b => b.id === key)?.capacidad || 0,
          totalTM: 0,
          lecturas: 0,
          ultimaLectura: null
        }
      }
      mapa[key].totalTM = e.acumulado_tm // Tomar el acumulado más reciente
      mapa[key].lecturas++
      
      if (!mapa[key].ultimaLectura || new Date(e.fecha_hora) > new Date(mapa[key].ultimaLectura.fecha_hora)) {
        mapa[key].ultimaLectura = e
      }
    })

    return Object.values(mapa).sort((a, b) => b.totalTM - a.totalTM)
  }, [exportaciones, productoActivo])

  // Cambiar producto activo
  const cambiarProducto = (producto) => {
    setProductoActivo(producto)
    setNuevaExportacion({
      fecha_hora: getHoraActual(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getHoraActual(),
      comentarios: ''
    })
    setEditandoExportacion(null)
    setEditandoBitacora(null)
  }

  // Manejar cambios en formularios
  const handleExportacionChange = (e) => {
    const { name, value } = e.target
    setNuevaExportacion(prev => ({ ...prev, [name]: value }))
  }

  const handleBitacoraChange = (e) => {
    const { name, value } = e.target
    setBitacoraActual(prev => ({ ...prev, [name]: value }))
  }

  // Guardar exportación
  const handleGuardarExportacion = async () => {
    try {
      if (barco.estado === 'finalizado') {
        toast.error('Operación finalizada')
        return
      }

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

      const datos = {
        barco_id: barco.id,
        fecha_hora: nuevaExportacion.fecha_hora,
        producto_id: productoActivo.id,
        acumulado_tm: parseFloat(nuevaExportacion.acumulado_tm),
        bodega_id: parseInt(nuevaExportacion.bodega_id), // Cambiado
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

      // Resetear formulario
      setNuevaExportacion({
        fecha_hora: getHoraActual(),
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

  // Guardar bitácora
  const handleGuardarBitacora = async () => {
    try {
      if (barco.estado === 'finalizado') {
        toast.error('Operación finalizada')
        return
      }

      if (!productoActivo) {
        toast.error('Selecciona un producto')
        return
      }

      if (!bitacoraActual.fecha_hora) {
        toast.error('Ingresa fecha y hora')
        return
      }

      const datos = {
        barco_id: barco.id,
        fecha_hora: bitacoraActual.fecha_hora,
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
        fecha_hora: getHoraActual(),
        comentarios: ''
      })

      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  // Editar exportación
  const handleEditarExportacion = (exp) => {
    setEditandoExportacion(exp)
    setNuevaExportacion({
      fecha_hora: exp.fecha_hora.slice(0, 16),
      acumulado_tm: exp.acumulado_tm,
      bodega_id: exp.bodega_id || '',
      observaciones: exp.observaciones || ''
    })
  }

  // Editar bitácora
  const handleEditarBitacora = (reg) => {
    setEditandoBitacora(reg)
    setBitacoraActual({
      fecha_hora: reg.fecha_hora.slice(0, 16),
      comentarios: reg.comentarios || ''
    })
  }

  // Eliminar exportación
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
          fecha_hora: getHoraActual(),
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

  // Eliminar bitácora
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
          fecha_hora: getHoraActual(),
          comentarios: ''
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  // Cancelar edición
  const cancelarEdicion = () => {
    setEditandoExportacion(null)
    setEditandoBitacora(null)
    setNuevaExportacion({
      fecha_hora: getHoraActual(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getHoraActual(),
      comentarios: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">El link no es válido</p>
        </div>
      </div>
    )
  }

  // Verificar que sea un barco de exportación
  if (barco.tipo_operacion !== 'exportacion') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
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
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {barco.estado.toUpperCase()}
                </span>
              </div>
              <p className="text-blue-200 text-sm mt-1">
                Registro de Carga a Bodega del Barco por Banda · {new Date().toLocaleDateString()}
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
        </div>

        {/* Alerta de operación finalizada */}
        {barco.estado === 'finalizado' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 font-medium">
                Operación finalizada. No se pueden registrar nuevos datos.
              </p>
            </div>
          </div>
        )}

        {/* Pestañas de productos */}
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

        {/* Tarjeta de resumen del producto activo */}
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
                  {estadisticasProducto.flujoPromedio > 0 && (
                    <span className="text-blue-400">
                      ⚡ {estadisticasProducto.flujoPromedio.toFixed(2)} TM/h
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Meta si existe */}
            {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Progreso</p>
                  <p className="text-xl font-bold text-green-400">
                    {((estadisticasProducto.totalTM / barco.metas_json.limites[productoActivo.codigo]) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4">
                  <p className="text-xs text-blue-200">Flujo Promedio</p>
                  <p className="text-2xl font-black text-white">
                    {estadisticasProducto.flujoPromedio.toFixed(2)} TM/h
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gráfica de tendencia */}
        {productoActivo && datosGrafico.length > 1 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Tendencia de Carga - {productoActivo.nombre}
            </h3>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={datosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    name="Acumulado (TM)" 
                    dot={{ r: 4, fill: '#3b82f6' }}
                    strokeWidth={2}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Resumen por bodega */}
        {productoActivo && resumenPorBodega.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-400" />
              Carga por Bodega del Barco
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenPorBodega.map(bodega => {
                const porcentaje = bodega.capacidad > 0 ? (bodega.totalTM / bodega.capacidad) * 100 : 0
                
                return (
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
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Capacidad:</span>
                          <span className="font-bold text-white">{bodega.capacidad.toFixed(0)} TM</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Cargado:</span>
                          <span className="font-bold text-green-400">{bodega.totalTM.toFixed(3)} TM</span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Ocupación</span>
                          <span className="text-white">{porcentaje.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-white/10">
                        <span>Lecturas: {bodega.lecturas}</span>
                        {bodega.ultimaLectura && (
                          <span>Última: {dayjs(bodega.ultimaLectura.fecha_hora).format('HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulario de exportación */}
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
              <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="fecha_hora"
                  value={nuevaExportacion.fecha_hora}
                  onChange={handleExportacionChange}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                  disabled={barco.estado === 'finalizado'}
                />
                <button
                  type="button"
                  onClick={() => setNuevaExportacion(prev => ({ ...prev, fecha_hora: getHoraActual() }))}
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
                disabled={barco.estado === 'finalizado'}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega *</label>
              <select
                name="bodega_id"
                value={nuevaExportacion.bodega_id}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                disabled={barco.estado === 'finalizado'}
              >
                <option value="">Seleccionar bodega</option>
                {BODEGAS_BARCO.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.codigo}) - Cap. {b.capacidad} TM
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
                disabled={barco.estado === 'finalizado'}
              />
            </div>
            <div className="flex items-end col-span-full gap-2">
              <button
                onClick={handleGuardarExportacion}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                disabled={barco.estado === 'finalizado'}
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

        {/* Tabla de exportaciones */}
        {exportacionesFiltradas.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
              <h3 className="font-bold text-white">
                Historial de Carga - {productoActivo?.nombre} ({exportacionesFiltradas.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acumulado (TM)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {exportacionesFiltradas.map(exp => {
                    const bodega = BODEGAS_BARCO.find(b => b.id === exp.bodega_id)
                    
                    return (
                      <tr key={exp.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">{formatFechaHora(exp.fecha_hora)}</td>
                        <td className="px-4 py-3 font-bold text-blue-400">{exp.acumulado_tm?.toFixed(3)}</td>
                        <td className="px-4 py-3">
                          {bodega ? (
                            <div>
                              <p className="text-white">{bodega.nombre}</p>
                              <p className="text-xs text-green-400">{bodega.codigo}</p>
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
                    <td className="px-4 py-3 font-bold text-white">TOTAL</td>
                    <td className="px-4 py-3 font-bold text-blue-400">
                      {exportacionesFiltradas[exportacionesFiltradas.length - 1]?.acumulado_tm?.toFixed(3) || '0.000'}
                    </td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Sección de Bitácora */}
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
              <input
                type="datetime-local"
                name="fecha_hora"
                value={bitacoraActual.fecha_hora}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                disabled={barco.estado === 'finalizado'}
              />
              <button
                type="button"
                onClick={() => setBitacoraActual(prev => ({ ...prev, fecha_hora: getHoraActual() }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
            <div>
              <input
                type="text"
                name="comentarios"
                value={bitacoraActual.comentarios}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="Comentarios..."
                disabled={barco.estado === 'finalizado'}
              />
            </div>
            <div className="flex gap-2 col-span-full">
              <button
                onClick={handleGuardarBitacora}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                disabled={barco.estado === 'finalizado'}
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
                      <td className="px-4 py-2">{formatFechaHora(reg.fecha_hora)}</td>
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
    </div>
  )
}