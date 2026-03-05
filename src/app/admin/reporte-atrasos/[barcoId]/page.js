// app/admin/reporte-atrasos/[barcoId]/page.js - Versión con PDF directo
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getCurrentUser, isAdmin, isChequero } from '../../../lib/auth'
import {
  Clock, Ship, Calendar, Download, Printer, ArrowLeft,
  BarChart3, AlertTriangle, Coffee, CloudRain, Wrench,
  Truck, Zap, Layers, Flag, Anchor, Target, Inbox,
  Play, StopCircle, CheckCircle, X, Edit2, Save,
  FileText, PieChart, TrendingUp, Filter, RefreshCw,
  Sun, Moon, Download as ExportIcon, Plus, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

dayjs.locale('es')

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO
// =====================================================
const TIPOS_PARO_CONFIG = {
  'Desperfecto de grua del buque': { icono: '🔧', bg: '#fee2e2', text: '#b91c1c', categoria: 'no_imputable' },
  'Colocando almeja UPDP': { icono: '🔧', bg: '#ffedd5', text: '#9a3412', categoria: 'no_imputable' },
  'Falta de camiones (Unidades insuficientes por transportistas)': { icono: '🚛', bg: '#fef9c3', text: '#854d0e', categoria: 'no_imputable' },
  'Traslado de UCA a Almapac': { icono: '🚛', bg: '#dbeafe', text: '#1e40af', categoria: 'no_imputable' },
  'Falla sistema UPDP': { icono: '⚡', bg: '#f3e8ff', text: '#6b21a8', categoria: 'no_imputable' },
  'Tiempo de comida': { icono: '☕', bg: '#dcfce7', text: '#166534', categoria: 'no_imputable' },
  'Cierre de bodegas': { icono: '📦', bg: '#f3f4f6', text: '#374151', categoria: 'no_imputable' },
  'Amenaza de lluvia': { icono: '☁️', bg: '#e0f2fe', text: '#075985', categoria: 'no_imputable' },
  'Lluvia': { icono: '🌧️', bg: '#cffafe', text: '#164e63', categoria: 'no_imputable' },
  'Esperando apertura de bodegas': { icono: '⏳', bg: '#fef3c7', text: '#92400e', categoria: 'no_imputable' },
  'Apertura de bodegas': { icono: '📦', bg: '#d1fae5', text: '#065f46', categoria: 'no_imputable' },
  'Traslado de UCA a Alcasa': { icono: '🚛', bg: '#cffafe', text: '#164e63', categoria: 'no_imputable' },
  'Mantenimiento almeja UPDP': { icono: '🔧', bg: '#ffe4e6', text: '#9f1239', categoria: 'no_imputable' },
  'Sacando equipo abordo': { icono: '🔧', bg: '#fce7f3', text: '#831843', categoria: 'no_imputable' },
  'Movimiento de UCA': { icono: '🚛', bg: '#ccfbf1', text: '#115e59', categoria: 'no_imputable' },
  'Movilizando tolvas': { icono: '🔧', bg: '#ecfccb', text: '#365314', categoria: 'no_imputable' },
  'Falta de Tolveros': { icono: '⚠️', bg: '#f5f5f4', text: '#44403c', categoria: 'no_imputable' },
  'Quitando Almeja UPDP': { icono: '🔧', bg: '#ede9fe', text: '#5b21b6', categoria: 'no_imputable' },
  'Colocando equipo abordo': { icono: '🔧', bg: '#fae8ff', text: '#86198f', categoria: 'no_imputable' },
  'Acumulado producto': { icono: '📊', bg: '#f1f5f9', text: '#334155', categoria: 'no_imputable' },
  'Falla en sistema UPDP': { icono: '⚡', bg: '#f3e8ff', text: '#6b21a8', categoria: 'no_imputable' },
  'Falla en el sistema ALMAPAC': { icono: '⚡', bg: '#fef9c3', text: '#854d0e', categoria: 'imputable' },
  'Esperando señal de Almapac': { icono: '⏳', bg: '#fef3c7', text: '#92400e', categoria: 'imputable' },
}

// =====================================================
// CONFIGURACIÓN DE ALMACENADORAS DISPONIBLES
// =====================================================
const ALMACENADORAS_DISPONIBLES = [
  { id: 'ALMAPAC', nombre: 'ALMAPAC', color: '#3b82f6', default: true },
  { id: 'ALCASA', nombre: 'ALCASA', color: '#10b981', default: false },
  { id: 'GRADECA', nombre: 'GRADECA', color: '#8b5cf6', default: false },
  { id: 'SERVYGRAM', nombre: 'SERVYGRAM', color: '#f97316', default: false },
  { id: 'OTRA1', nombre: 'Otra 1', color: '#ef4444', default: false },
  { id: 'OTRA2', nombre: 'Otra 2', color: '#6366f1', default: false }
]

// =====================================================
// MODAL PARA EDITAR MANIFIESTO
// =====================================================
const EditarManifiestoModal = ({ barco, manifiesto, onClose, onSave }) => {
  const [almacenadorasSeleccionadas, setAlmacenadorasSeleccionadas] = useState(
    manifiesto?.almacenadoras || [{ id: 'ALMAPAC', nombre: 'ALMAPAC', cantidad: 0 }]
  )
  const [fechas, setFechas] = useState({
    inicio: manifiesto?.fecha_inicio || dayjs().format('YYYY-MM-DDTHH:mm'),
    fin: manifiesto?.fecha_fin || dayjs().format('YYYY-MM-DDTHH:mm')
  })

  const agregarAlmacenadora = () => {
    const disponibles = ALMACENADORAS_DISPONIBLES.filter(
      a => !almacenadorasSeleccionadas.some(s => s.id === a.id)
    )
    if (disponibles.length === 0) {
      toast.error('No hay más almacenadoras disponibles')
      return
    }
    const nueva = disponibles[0]
    setAlmacenadorasSeleccionadas([
      ...almacenadorasSeleccionadas,
      { id: nueva.id, nombre: nueva.nombre, cantidad: 0 }
    ])
  }

  const eliminarAlmacenadora = (id) => {
    if (id === 'ALMAPAC') {
      toast.error('No puedes eliminar ALMAPAC')
      return
    }
    setAlmacenadorasSeleccionadas(almacenadorasSeleccionadas.filter(a => a.id !== id))
  }

  const actualizarCantidad = (id, valor) => {
    setAlmacenadorasSeleccionadas(almacenadorasSeleccionadas.map(a =>
      a.id === id ? { ...a, cantidad: Number(valor) } : a
    ))
  }

  const handleSubmit = async () => {
    try {
      const total = almacenadorasSeleccionadas.reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0)
      
      const manifiestoData = {
        almacenadoras: almacenadorasSeleccionadas,
        fecha_inicio: fechas.inicio,
        fecha_fin: fechas.fin,
        total: total
      }

      const { error } = await supabase
        .from('barcos')
        .update({
          manifiesto_json: manifiestoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', barco.id)

      if (error) throw error
      
      toast.success('Cantidades manifestadas actualizadas')
      onSave(manifiestoData)
      onClose()
    } catch (error) {
      console.error('Error guardando manifiesto:', error)
      toast.error('Error al guardar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Cantidad Manifestada</h2>
                <p className="text-blue-200 text-xs">Selecciona almacenadoras y edita tonelajes</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-3">
            {almacenadorasSeleccionadas.map((almacenadora) => (
              <div key={almacenadora.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-2 h-10 rounded-full" style={{ backgroundColor: almacenadora.id === 'ALMAPAC' ? '#3b82f6' : '#9ca3af' }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-700">{almacenadora.nombre}</label>
                    {almacenadora.id !== 'ALMAPAC' && (
                      <button
                        onClick={() => eliminarAlmacenadora(almacenadora.id)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    value={almacenadora.cantidad}
                    onChange={(e) => actualizarCantidad(almacenadora.id, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1"
                    step="0.001"
                    placeholder="0.000 TM"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={agregarAlmacenadora}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-400 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Almacenadora
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 mb-2">Total: <span className="font-bold text-blue-600">
              {almacenadorasSeleccionadas.reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0).toFixed(3)} TM
            </span></p>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-800">Fechas de Operación</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inicio</label>
              <input
                type="datetime-local"
                value={fechas.inicio}
                onChange={(e) => setFechas({ ...fechas, inicio: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fin</label>
              <input
                type="datetime-local"
                value={fechas.fin}
                onChange={(e) => setFechas({ ...fechas, fin: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL DE REPORTE
// =====================================================
export default function ReporteAtrasosPage() {
  const router = useRouter()
  const params = useParams()
  const barcoId = params.barcoId
  
  const [user, setUser] = useState(null)
  const [barco, setBarco] = useState(null)
  const [registros, setRegistros] = useState([])
  const [tiposParo, setTiposParo] = useState([])
  const [manifiesto, setManifiesto] = useState(null)
  const [viajes, setViajes] = useState([])
  const [registrosDescarga, setRegistrosDescarga] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [showEditarManifiesto, setShowEditarManifiesto] = useState(false)
  const [editandoTiempos, setEditandoTiempos] = useState(false)
  
  const reporteRef = useRef(null)

  // Tiempos de operación editables
  const [tiempos, setTiempos] = useState({
    inicio: null,
    fin: null
  })

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || (!isAdmin() && !isChequero())) {
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarDatos()
  }, [barcoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      // Cargar barco
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('id', barcoId)
        .single()

      if (barcoError) throw barcoError
      setBarco(barcoData)

      // Cargar manifiesto guardado o crear uno por defecto solo con ALMAPAC
      if (barcoData.manifiesto_json) {
        setManifiesto(barcoData.manifiesto_json)
      } else {
        // Por defecto solo ALMAPAC con valor 0
        setManifiesto({
          almacenadoras: [{ id: 'ALMAPAC', nombre: 'ALMAPAC', cantidad: 0 }],
          fecha_inicio: barcoData.operacion_iniciada_at || barcoData.fecha_llegada,
          fecha_fin: barcoData.operacion_finalizada_at || barcoData.fecha_salida,
          total: 0
        })
      }

      // Cargar tipos de paro
      const { data: tiposData } = await supabase
        .from('tipos_paro')
        .select('*')
        .eq('activo', true)
        .order('orden')
      setTiposParo(tiposData || [])

      // Cargar registros de atrasos
      const { data: registrosData } = await supabase
        .from('registro_atrasos')
        .select(`
          *,
          tipo_paro:tipos_paro(*)
        `)
        .eq('barco_id', barcoId)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
      setRegistros(registrosData || [])

      // Cargar registros de descarga
      const { data: descargaData } = await supabase
        .from('registro_descarga')
        .select(`
          *,
          tipo_descarga:tipos_descarga(*)
        `)
        .eq('barco_id', barcoId)
        .order('fecha_hora_inicio', { ascending: true })
      setRegistrosDescarga(descargaData || [])

      // Cargar viajes para calcular rendimiento
      const { data: viajesData } = await supabase
        .from('viajes')
        .select('*')
        .eq('barco_id', barcoId)
        .eq('estado', 'completo')
      setViajes(viajesData || [])

      // Configurar tiempos de operación
      setTiempos({
        inicio: barcoData.operacion_iniciada_at || barcoData.fecha_llegada,
        fin: barcoData.operacion_finalizada_at || barcoData.fecha_salida
      })

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const calcularMetricas = () => {
    if (!registros.length || !tiposParo.length) return null

    // Agrupar por tipo de paro
    const parosPorTipo = {}
    registros.forEach(reg => {
      const tipo = tiposParo.find(t => t.id === reg.tipo_paro_id)
      if (!tipo) return

      if (!parosPorTipo[tipo.nombre]) {
        parosPorTipo[tipo.nombre] = {
          tipo,
          minutos: 0,
          registros: 0,
          imputable: tipo.es_imputable_almapac || false
        }
      }
      parosPorTipo[tipo.nombre].minutos += reg.duracion_minutos || 0
      parosPorTipo[tipo.nombre].registros++
    })

    // Separar por imputabilidad
    const imputables = []
    const noImputables = []
    
    Object.values(parosPorTipo).forEach(item => {
      if (item.minutos > 0) {
        if (item.imputable) {
          imputables.push(item)
        } else {
          noImputables.push(item)
        }
      }
    })

    // Ordenar por duración descendente
    imputables.sort((a, b) => b.minutos - a.minutos)
    noImputables.sort((a, b) => b.minutos - a.minutos)

    const totalImputable = imputables.reduce((sum, item) => sum + item.minutos, 0)
    const totalNoImputable = noImputables.reduce((sum, item) => sum + item.minutos, 0)
    const totalMinutos = totalImputable + totalNoImputable

    // Calcular total del manifiesto (solo ALMAPAC)
    let totalManifiesto = 0
    if (manifiesto?.almacenadoras) {
      const almapac = manifiesto.almacenadoras.find(a => a.id === 'ALMAPAC')
      totalManifiesto = almapac ? Number(almapac.cantidad) || 0 : 0
    }

    // Calcular tiempo neto de desembarque
    const tiempoOperacionMinutos = calcularTiempoOperacion()
    const tiempoNeto = Math.max(0, tiempoOperacionMinutos - totalMinutos)

    // Calcular rendimientos
    const tmPorHora = tiempoNeto > 0 ? totalManifiesto / (tiempoNeto / 60) : 0
    const tmPorDia = tmPorHora * 24

    // Rendimiento por almacenadora
    const rendimientoAlmapac = calcularRendimientoAlmapac()
    
    // Rendimiento por almacenadora durante su descarga específica
    const rendimientoAlmapacUCA = calcularRendimientoAlmapacUCA()
    
    // Promedio general del barco
    const promedioBarco = totalManifiesto > 0 && tiempoOperacionMinutos > 0 
      ? totalManifiesto / (tiempoOperacionMinutos / 60) 
      : 0

    // Tiempo total de desembarque para ALMAPAC
    const tiempoAlmapacMinutos = tiempoOperacionMinutos

    return {
      imputables,
      noImputables,
      totalImputable,
      totalNoImputable,
      totalMinutos,
      totalManifiesto,
      tiempoOperacionMinutos,
      tiempoNeto,
      tmPorHora,
      tmPorDia,
      rendimientoAlmapac,
      rendimientoAlmapacUCA,
      promedioBarco,
      desgloseManifiesto: manifiesto,
      tiempoAlmapacMinutos
    }
  }

  const calcularTiempoOperacion = () => {
    if (!tiempos.inicio || !tiempos.fin) return 0
    
    const inicio = dayjs(tiempos.inicio)
    const fin = dayjs(tiempos.fin)
    return fin.diff(inicio, 'minute')
  }

  const calcularRendimientoAlmapac = () => {
    if (!manifiesto) return 0
    
    const almapac = manifiesto.almacenadoras?.find(a => a.id === 'ALMAPAC')
    const cantidadAlmapac = almapac ? Number(almapac.cantidad) || 0 : 0
    if (cantidadAlmapac === 0) return 0

    const parosDuranteAlmapac = registros.filter(r => {
      if (r.bodega_nombre === 'ALMAPAC') return true
      const tipo = tiposParo.find(t => t.id === r.tipo_paro_id)
      return tipo?.nombre.includes('ALMAPAC')
    })

    const minutosParoAlmapac = parosDuranteAlmapac.reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
    
    const tiempoAlmapacMinutos = calcularTiempoOperacion()
    const tiempoNetoAlmapac = Math.max(0, tiempoAlmapacMinutos - minutosParoAlmapac)
    
    return tiempoNetoAlmapac > 0 ? cantidadAlmapac / (tiempoNetoAlmapac / 60) : 0
  }

  const calcularRendimientoAlmapacUCA = () => {
    if (!manifiesto) return 0
    const almapac = manifiesto.almacenadoras?.find(a => a.id === 'ALMAPAC')
    const cantidadAlmapac = almapac ? Number(almapac.cantidad) || 0 : 0
    const tiempoOperacion = calcularTiempoOperacion()
    return tiempoOperacion > 0 ? cantidadAlmapac / (tiempoOperacion / 60) : 0
  }

  const formatearTiempo = (minutos) => {
    if (!minutos || minutos === 0) return '0 Hrs. 0 Min.'
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return `${horas} Hrs. ${mins} Min.`
  }

  const formatearFechaHoraCompleta = (fecha) => {
    if (!fecha) return { fecha: '', hora: '0', minuto: '0' }
    const d = dayjs(fecha)
    return {
      fecha: d.format('D/M/YYYY'),
      hora: d.format('HH'),
      minuto: d.format('mm')
    }
  }

  const determinarFormaDescarga = () => {
    const formas = {
      gruaTierra: false,
      unidadCarga: false,
      almeja: false,
      cuadrilla: false
    }

    registrosDescarga.forEach(reg => {
      const tipo = reg.tipo_descarga?.nombre?.toLowerCase() || ''
      if (tipo.includes('grua')) formas.gruaTierra = true
      if (tipo.includes('trompo') || tipo.includes('uca')) formas.unidadCarga = true
      if (tipo.includes('almeja')) formas.almeja = true
      if (tipo.includes('cuadrilla')) formas.cuadrilla = true
    })

    return formas
  }

  const handleExportarPDF = async () => {
    setExportando(true)
    try {
      toast.loading('Generando PDF...', { id: 'pdf' })
      
      const metricas = calcularMetricas()
      if (!metricas) {
        toast.error('No hay datos para exportar', { id: 'pdf' })
        return
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPos = 20
      const margin = 20
      const pageWidth = doc.internal.pageSize.getWidth()

      // Título
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor('#1e3a8a')
      doc.text(`Informe sobre desembarque ${barco.tipo_operacion === 'exportacion' ? 'de carga' : 'de cereales'}`, margin, yPos)
      
      yPos += 8
      doc.setFontSize(14)
      doc.setTextColor('#000000')
      doc.text(`MV. ${barco.nombre}`, margin, yPos)
      
      yPos += 6
      doc.setFontSize(10)
      doc.setTextColor('#666666')
      doc.text(`Código: ${barco.codigo_barco || 'N/A'} · Ed. 00`, margin, yPos)
      
      yPos += 10
      
      // Fecha y hora del reporte
      doc.setFontSize(8)
      doc.setTextColor('#999999')
      doc.text(`Generado: ${dayjs().format('DD/MM/YYYY HH:mm')}`, pageWidth - margin - 30, 20)
      
      // Cantidad total
      doc.setFillColor('#f3f4f6')
      doc.rect(margin, yPos - 3, pageWidth - 40, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor('#2563eb')
      const totalManifiesto = manifiesto?.almacenadoras?.find(a => a.id === 'ALMAPAC')?.cantidad || 0
      doc.text(`Cantidad total a descargar: ${Number(totalManifiesto).toLocaleString('es', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TM`, margin + 5, yPos + 3)
      
      yPos += 15
      
      // Fechas
      const fechaInicioObj = formatearFechaHoraCompleta(tiempos.inicio)
      const fechaFinObj = formatearFechaHoraCompleta(tiempos.fin)
      const duracionTotalMinutos = calcularTiempoOperacion()
      const duracionTotal = formatearTiempo(duracionTotalMinutos)
      
      doc.setFillColor('#ffffff')
      doc.rect(margin, yPos - 5, (pageWidth - 50) / 2, 18, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor('#000000')
      doc.text('Fecha y Hora de Inicio:', margin, yPos)
      doc.setFontSize(12)
      doc.text(`${fechaInicioObj.fecha} ${fechaInicioObj.hora}:${fechaInicioObj.minuto}`, margin, yPos + 6)
      
      doc.setFontSize(9)
      doc.text('Fin de desembarque:', margin + (pageWidth - 50) / 2 + 5, yPos)
      doc.setFontSize(12)
      doc.text(`${fechaFinObj.fecha} ${fechaFinObj.hora}:${fechaFinObj.minuto}`, margin + (pageWidth - 50) / 2 + 5, yPos + 6)
      
      yPos += 20
      
      doc.setFillColor('#f3f4f6')
      doc.rect(margin, yPos - 3, pageWidth - 40, 10, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor('#2563eb')
      doc.text(`Tiempo de desembarque: ${duracionTotal} (${duracionTotalMinutos.toFixed(2)} hrs)`, margin + 5, yPos + 3)
      
      yPos += 15
      
      // Cantidad manifestada
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor('#000000')
      doc.text('Cantidad manifestada por almacenadora', margin, yPos)
      
      yPos += 5
      
      // Tabla de almacenadoras
      const almacenadorasData = manifiesto?.almacenadoras?.map(a => [
        a.nombre,
        `${Number(a.cantidad).toFixed(3)} TM`
      ]) || []
      
      almacenadorasData.push([
        'TOTAL',
        `${(manifiesto?.almacenadoras?.reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0) || 0).toFixed(3)} TM`
      ])
      
      const tablaAlmacenadoras = autoTable(doc, {
        startY: yPos,
        head: [['Almacenadora', 'Cantidad (TM)']],
        body: almacenadorasData,
        theme: 'striped',
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin }
      })
      
      yPos = (doc.lastAutoTable?.finalY || yPos + 20) + 10
      
      // Paros no imputables
      if (metricas.noImputables.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor('#b91c1c')
        doc.text('Paros no imputables a ALMAPAC', margin, yPos)
        
        yPos += 5
        
        const parosNoImputablesData = metricas.noImputables.map(item => {
          const horas = Math.floor(item.minutos / 60)
          const mins = item.minutos % 60
          return [
            item.tipo.nombre,
            `${horas} Hrs. ${mins} Min.`,
            `${(item.minutos / 60).toFixed(2)}`
          ]
        })
        
        parosNoImputablesData.push([
          'TOTAL',
          formatearTiempo(metricas.totalNoImputable),
          (metricas.totalNoImputable / 60).toFixed(2)
        ])
        
        autoTable(doc, {
          startY: yPos,
          head: [['Descripción', 'Duración', 'Horas']],
          body: parosNoImputablesData,
          theme: 'striped',
          headStyles: { fillColor: [254, 226, 226], textColor: [185, 28, 28], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        })
        
        yPos = (doc.lastAutoTable?.finalY || yPos + 20) + 10
      }
      
      // Paros imputables
      if (metricas.imputables.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor('#854d0e')
        doc.text('Paros imputables a ALMAPAC', margin, yPos)
        
        yPos += 5
        
        const parosImputablesData = metricas.imputables.map(item => {
          const horas = Math.floor(item.minutos / 60)
          const mins = item.minutos % 60
          return [
            item.tipo.nombre,
            `${horas} Hrs. ${mins} Min.`,
            `${(item.minutos / 60).toFixed(2)}`
          ]
        })
        
        parosImputablesData.push([
          'TOTAL',
          formatearTiempo(metricas.totalImputable),
          (metricas.totalImputable / 60).toFixed(2)
        ])
        
        autoTable(doc, {
          startY: yPos,
          head: [['Descripción', 'Duración', 'Horas']],
          body: parosImputablesData,
          theme: 'striped',
          headStyles: { fillColor: [254, 249, 195], textColor: [133, 77, 14], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        })
        
        yPos = (doc.lastAutoTable?.finalY || yPos + 20) + 10
      }
      
      // Tiempos
      doc.setFillColor('#eff6ff')
      doc.rect(margin, yPos - 3, pageWidth - 40, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor('#1e40af')
      doc.text(`Tiempo total de desembarque para ALMAPAC: ${formatearTiempo(metricas.tiempoAlmapacMinutos || duracionTotalMinutos)}`, margin + 5, yPos + 3)
      
      yPos += 12
      
      doc.setFillColor('#f0fdf4')
      doc.rect(margin, yPos - 3, pageWidth - 40, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor('#166534')
      doc.text(`Tiempo neto del desembarque: ${formatearTiempo(metricas.tiempoNeto)}`, margin + 5, yPos + 3)
      
      yPos += 15
      
      // Rendimientos si hay datos
      if (metricas.totalManifiesto > 0) {
        doc.setFillColor('#f3e8ff')
        doc.rect(margin, yPos - 3, (pageWidth - 50) / 2, 15, 'F')
        doc.setFontSize(8)
        doc.setTextColor('#6b21a8')
        doc.text('Flujo descarga efectivo ALMAPAC', margin + 5, yPos)
        doc.setFontSize(11)
        doc.text(`${metricas.rendimientoAlmapac?.toFixed(3) || '0.000'} TM/HR`, margin + 5, yPos + 6)
        doc.setFontSize(7)
        doc.text(`${((metricas.rendimientoAlmapac || 0) * 24).toFixed(3)} TM/DÍA`, margin + 5, yPos + 10)
        
        doc.setFillColor('#e0e7ff')
        doc.rect(margin + (pageWidth - 50) / 2 + 5, yPos - 3, (pageWidth - 50) / 2, 15, 'F')
        doc.setFontSize(8)
        doc.setTextColor('#3730a3')
        doc.text('Flujo ALMAPAC (UCA + Cuadrilla)', margin + (pageWidth - 50) / 2 + 10, yPos)
        doc.setFontSize(11)
        doc.text(`${metricas.rendimientoAlmapacUCA?.toFixed(3) || '0.000'} TM/HR`, margin + (pageWidth - 50) / 2 + 10, yPos + 6)
        doc.setFontSize(7)
        doc.text(`${((metricas.rendimientoAlmapacUCA || 0) * 24).toFixed(3)} TM/DÍA`, margin + (pageWidth - 50) / 2 + 10, yPos + 10)
        
        yPos += 22
        
        doc.setFillColor('#fffbeb')
        doc.rect(margin, yPos - 3, pageWidth - 40, 15, 'F')
        doc.setFontSize(8)
        doc.setTextColor('#92400e')
        doc.text('Promedio de flujo de descarga del barco', margin + 5, yPos)
        doc.setFontSize(12)
        doc.text(`${metricas.promedioBarco?.toFixed(3) || '0.000'} TM/HR`, margin + 5, yPos + 6)
        doc.setFontSize(8)
        doc.text(`${((metricas.promedioBarco || 0) * 24).toFixed(3)} TM/DÍA`, margin + 5, yPos + 10)
        
        yPos += 20
      }
      
      // Forma de descarga
      const formas = determinarFormaDescarga()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor('#000000')
      doc.text('FORMA DE DESCARGA/CARGA', margin, yPos)
      
      yPos += 5
      
      const formasData = [
        ['GRÚA DE TIERRA', formas.gruaTierra ? 'SI' : 'NO'],
        ['UNIDAD DE CARGA-TROMPO', formas.unidadCarga ? 'SI' : 'NO'],
        ['ALMEJA', formas.almeja ? 'SI' : 'NO'],
        ['CUADRILLA', formas.cuadrilla ? 'SI' : 'NO']
      ]
      
      autoTable(doc, {
        startY: yPos,
        body: formasData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: margin }
      })
      
      yPos = (doc.lastAutoTable?.finalY || yPos + 20) + 10
      
      // Observaciones
      const observaciones = registros.filter(r => r.observaciones)
      if (observaciones.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor('#000000')
        doc.text('Observaciones', margin, yPos)
        
        yPos += 5
        
        observaciones.forEach((obs) => {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.text(`• ${obs.observaciones}`, margin, yPos)
          yPos += 4
        })
        
        yPos += 5
      }
      
      // Footer
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor('#999999')
      doc.text(
        `Informe generado el ${dayjs().format('DD/MM/YYYY HH:mm')} · ALMAPAC Control de Operaciones`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      )
      
      // Guardar PDF
      doc.save(`Reporte_Atrasos_${barco.nombre.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.pdf`)
      
      toast.success('PDF generado correctamente', { id: 'pdf' })
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar PDF', { id: 'pdf' })
    } finally {
      setExportando(false)
    }
  }

  const handleExportarCSV = () => {
    if (!barco || !registros.length) return

    try {
      const metricas = calcularMetricas()
      if (!metricas) return

      let csv = 'REPORTE DE ATRASOS - ' + barco.nombre + '\n'
      csv += 'Fecha de generación,' + dayjs().format('DD/MM/YYYY HH:mm') + '\n\n'
      
      csv += 'CANTIDAD MANIFESTADA POR ALMACENADORA\n'
      csv += 'Almacenadora,Cantidad (TM)\n'
      manifiesto?.almacenadoras?.forEach(a => {
        csv += `${a.nombre},${Number(a.cantidad).toFixed(3)}\n`
      })
      
      csv += '\nPAROS NO IMPUTABLES A ALMAPAC\n'
      csv += 'Tipo,Duración (min),Horas\n'
      metricas.noImputables.forEach(item => {
        csv += `${item.tipo.nombre},${item.minutos},${(item.minutos/60).toFixed(2)}\n`
      })
      
      csv += '\nPAROS IMPUTABLES A ALMAPAC\n'
      csv += 'Tipo,Duración (min),Horas\n'
      metricas.imputables.forEach(item => {
        csv += `${item.tipo.nombre},${item.minutos},${(item.minutos/60).toFixed(2)}\n`
      })

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Reporte_Atrasos_${barco.nombre.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmm')}.csv`
      link.click()
      
      toast.success('Reporte exportado como CSV')
    } catch (error) {
      console.error('Error exportando:', error)
      toast.error('Error al exportar')
    }
  }

  const handleGuardarTiempos = async () => {
    try {
      const updates = {}
      
      if (tiempos.inicio) {
        updates.operacion_iniciada_at = tiempos.inicio
      }
      if (tiempos.fin) {
        updates.operacion_finalizada_at = tiempos.fin
      }

      const { error } = await supabase
        .from('barcos')
        .update(updates)
        .eq('id', barcoId)

      if (error) throw error

      toast.success('Tiempos actualizados')
      setEditandoTiempos(false)
      cargarDatos()
    } catch (error) {
      console.error('Error guardando tiempos:', error)
      toast.error('Error al guardar')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-3" />
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Barco no encontrado</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold"
          >
            Volver al Admin
          </button>
        </div>
      </div>
    )
  }

  const metricas = calcularMetricas()
  const fechaInicio = tiempos.inicio ? dayjs(tiempos.inicio) : dayjs()
  const fechaFin = tiempos.fin ? dayjs(tiempos.fin) : dayjs()

  const duracionTotalMinutos = calcularTiempoOperacion()
  const duracionTotal = formatearTiempo(duracionTotalMinutos)

  const fechaInicioObj = formatearFechaHoraCompleta(tiempos.inicio)
  const fechaFinObj = formatearFechaHoraCompleta(tiempos.fin)
  
  const formasDescarga = determinarFormaDescarga()
  const totalManifiesto = manifiesto?.almacenadoras?.find(a => a.id === 'ALMAPAC')?.cantidad || 0

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header con acciones */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin')}
            className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditarManifiesto(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Editar Manifiesto
            </button>
            <button
              onClick={handleExportarCSV}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={handleExportarPDF}
              disabled={exportando}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {exportando ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              PDF
            </button>
          </div>
        </div>

        {/* Modo edición de tiempos */}
        {editandoTiempos && (
          <div className="mb-4 bg-white border border-blue-200 rounded-xl p-4">
            <h3 className="text-gray-800 font-bold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Editar Tiempos de Operación
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Inicio de operación</label>
                <input
                  type="datetime-local"
                  value={tiempos.inicio ? dayjs(tiempos.inicio).format('YYYY-MM-DDTHH:mm') : ''}
                  onChange={(e) => {
                    const nuevaFecha = e.target.value
                    setTiempos(prev => ({
                      ...prev,
                      inicio: nuevaFecha ? new Date(nuevaFecha).toISOString() : null
                    }))
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fin de operación</label>
                <input
                  type="datetime-local"
                  value={tiempos.fin ? dayjs(tiempos.fin).format('YYYY-MM-DDTHH:mm') : ''}
                  onChange={(e) => {
                    const nuevaFecha = e.target.value
                    setTiempos(prev => ({
                      ...prev,
                      fin: nuevaFecha ? new Date(nuevaFecha).toISOString() : null
                    }))
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditandoTiempos(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarTiempos}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* REPORTE PRINCIPAL - VISTA PREVIA */}
        <div 
          ref={reporteRef}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
          style={{ fontFamily: 'Arial, sans-serif' }}
        >
          {/* Header del reporte */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2">
                  <Ship className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    Informe sobre desembarque {barco.tipo_operacion === 'exportacion' ? 'de carga' : 'de cereales'}
                  </h1>
                  <p className="text-2xl font-black">MV. {barco.nombre}</p>
                  <p className="text-sm text-blue-200 mt-1">Código: {barco.codigo_barco || 'N/A'} · Ed. 00</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Fecha: {dayjs().format('DD/MM/YYYY')}</p>
                <p className="text-sm opacity-90">Hora: {dayjs().format('HH:mm')}</p>
                <div className="mt-2 bg-white/20 px-4 py-2 rounded-lg">
                  <p className="text-xs">Coordinador de operaciones</p>
                  <p className="font-bold text-sm">Cod.- 11.07</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Cantidad total a descargar */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-bold">Cantidad total a descargar</p>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-black text-blue-600">
                  {Number(totalManifiesto).toLocaleString('es', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TM
                </span>
                <span className="text-sm text-gray-500">72</span>
              </div>
            </div>

            {/* FECHAS Y TIEMPOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Fecha y Hora de Inicio del desembarque</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-gray-800">{fechaInicioObj.fecha}</span>
                    <span className="text-xl text-gray-600">{fechaInicioObj.hora}</span>
                    <span className="text-sm text-gray-500">Hrs.</span>
                    <span className="text-xl text-gray-600">{fechaInicioObj.minuto}</span>
                    <span className="text-sm text-gray-500">Min.</span>
                  </div>
                  <button
                    onClick={() => setEditandoTiempos(true)}
                    className="text-blue-500 hover:text-blue-600 text-xs"
                  >
                    Editar
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Fin de desembarque</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black text-gray-800">{fechaFinObj.fecha}</span>
                  <span className="text-xl text-gray-600">{fechaFinObj.hora}</span>
                  <span className="text-sm text-gray-500">Hrs.</span>
                  <span className="text-xl text-gray-600">{fechaFinObj.minuto}</span>
                  <span className="text-sm text-gray-500">Min.</span>
                </div>
              </div>

              <div className="md:col-span-2 border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Tiempo de desembarque</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-black text-blue-600">{duracionTotal}</span>
                  <span className="text-lg text-gray-600">({duracionTotalMinutos.toFixed(3)} hrs)</span>
                </div>
              </div>
            </div>

            {/* CANTIDAD MANIFESTADA POR ALMACENADORA */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <h3 className="font-bold text-gray-700">Cantidad manifestada por almacenadora</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Almacenadora</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Cantidad (TM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {manifiesto?.almacenadoras?.map((almacenadora) => (
                    <tr key={almacenadora.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{almacenadora.nombre}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {Number(almacenadora.cantidad).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-800">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                      {manifiesto?.almacenadoras?.reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0).toFixed(3) || '0.000'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Fechas por almacenadora */}
            {manifiesto?.almacenadoras?.map(almacenadora => (
              <div key={almacenadora.id} className="border border-gray-200 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">{almacenadora.nombre}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Fecha y Hora de Inicio para {almacenadora.nombre}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-gray-800">
                        {manifiesto?.fecha_inicio ? dayjs(manifiesto.fecha_inicio).format('D/M/YYYY') : '—'}
                      </span>
                      <span className="text-lg text-gray-600">
                        {manifiesto?.fecha_inicio ? dayjs(manifiesto.fecha_inicio).format('HH') : '0'}
                      </span>
                      <span className="text-xs text-gray-500">Hrs.</span>
                      <span className="text-lg text-gray-600">
                        {manifiesto?.fecha_inicio ? dayjs(manifiesto.fecha_inicio).format('mm') : '0'}
                      </span>
                      <span className="text-xs text-gray-500">Min.</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fecha y Hora de Finalización para {almacenadora.nombre}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-gray-800">
                        {manifiesto?.fecha_fin ? dayjs(manifiesto.fecha_fin).format('D/M/YYYY') : '—'}
                      </span>
                      <span className="text-lg text-gray-600">
                        {manifiesto?.fecha_fin ? dayjs(manifiesto.fecha_fin).format('HH') : '0'}
                      </span>
                      <span className="text-xs text-gray-500">Hrs.</span>
                      <span className="text-lg text-gray-600">
                        {manifiesto?.fecha_fin ? dayjs(manifiesto.fecha_fin).format('mm') : '0'}
                      </span>
                      <span className="text-xs text-gray-500">Min.</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* PAROS NO IMPUTABLES A ALMAPAC */}
            {metricas?.noImputables?.length > 0 && (
              <div className="border border-red-200 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                  <h3 className="font-bold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Paros no imputables a ALMAPAC
                  </h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Duración</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metricas.noImputables.map((item, idx) => {
                      const horas = Math.floor(item.minutos / 60)
                      const mins = item.minutos % 60
                      const horasDecimal = horas + (mins / 60)
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-800">{item.tipo.nombre}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {horas} Hrs. {mins} Min.
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {horasDecimal.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-red-700">TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">
                        {formatearTiempo(metricas.totalNoImputable)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">
                        {(metricas.totalNoImputable / 60).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* PAROS IMPUTABLES A ALMAPAC */}
            {metricas?.imputables?.length > 0 && (
              <div className="border border-yellow-200 rounded-xl overflow-hidden">
                <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                  <h3 className="font-bold text-yellow-700 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Paros imputables a ALMAPAC
                  </h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Descripción</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Duración</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {metricas.imputables.map((item, idx) => {
                      const horas = Math.floor(item.minutos / 60)
                      const mins = item.minutos % 60
                      const horasDecimal = horas + (mins / 60)
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-800">{item.tipo.nombre}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {horas} Hrs. {mins} Min.
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {horasDecimal.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-yellow-50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-yellow-700">TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-700">
                        {formatearTiempo(metricas.totalImputable)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-700">
                        {(metricas.totalImputable / 60).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Tiempo total de desembarque para ALMAPAC */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 uppercase font-bold">Tiempo total de desembarque para ALMAPAC</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-700">
                  {metricas?.tiempoAlmapacMinutos ? formatearTiempo(metricas.tiempoAlmapacMinutos) : duracionTotal}
                </span>
                <span className="text-sm text-blue-600">
                  {(metricas?.tiempoAlmapacMinutos || duracionTotalMinutos).toFixed(2)} hrs
                </span>
              </div>
            </div>

            {/* Tiempo neto del desembarque */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 uppercase font-bold">Tiempo neto del desembarque</p>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-green-700">
                  {metricas?.tiempoNeto ? formatearTiempo(metricas.tiempoNeto) : '0 Hrs. 0 Min.'}
                </span>
                <span className="text-sm text-green-600">
                  {(metricas?.tiempoNeto || 0).toFixed(2)} hrs
                </span>
              </div>
            </div>

            {/* Rendimientos */}
            {metricas?.totalManifiesto > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs text-purple-600 uppercase font-bold">Flujo descarga efectivo ALMAPAC</p>
                  <p className="text-2xl font-black text-purple-700">
                    {metricas?.rendimientoAlmapac?.toFixed(3) || '0.000'} TM/HR
                  </p>
                  <p className="text-sm text-purple-600">
                    {((metricas?.rendimientoAlmapac || 0) * 24).toFixed(3)} TM/DÍA
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <p className="text-xs text-indigo-600 uppercase font-bold">Flujo descarga ALMAPAC (UCA + Cuadrilla)</p>
                  <p className="text-2xl font-black text-indigo-700">
                    {metricas?.rendimientoAlmapacUCA?.toFixed(3) || '0.000'} TM/HR
                  </p>
                  <p className="text-sm text-indigo-600">
                    {((metricas?.rendimientoAlmapacUCA || 0) * 24).toFixed(3)} TM/DÍA
                  </p>
                </div>

                <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-600 uppercase font-bold">Promedio de flujo de descarga del barco</p>
                  <p className="text-3xl font-black text-amber-700">
                    {metricas?.promedioBarco?.toFixed(3) || '0.000'} TM/HR
                  </p>
                  <p className="text-sm text-amber-600">
                    {((metricas?.promedioBarco || 0) * 24).toFixed(3)} TM/DÍA
                  </p>
                </div>
              </div>
            )}

            {/* FORMA DE DESCARGA/CARGA */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-700 mb-3">FORMA DE DESCARGA/CARGA</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">GRÚA DE TIERRA</span>
                  <span className={formasDescarga.gruaTierra ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {formasDescarga.gruaTierra ? 'SI' : 'NO'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">UNIDAD DE CARGA-TROMPO</span>
                  <span className={formasDescarga.unidadCarga ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {formasDescarga.unidadCarga ? 'SI' : 'NO'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">ALMEJA</span>
                  <span className={formasDescarga.almeja ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {formasDescarga.almeja ? 'SI' : 'NO'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">CUADRILLA</span>
                  <span className={formasDescarga.cuadrilla ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {formasDescarga.cuadrilla ? 'SI' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {registros.some(r => r.observaciones) && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <h3 className="font-bold text-gray-700 mb-2">Observaciones</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {registros.filter(r => r.observaciones).map((r, idx) => (
                    <li key={idx}>• {r.observaciones}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 text-xs text-gray-500 flex justify-between">
            <span>Informe generado el {dayjs().format('DD/MM/YYYY HH:mm')}</span>
            <span>ALMAPAC · Control de Operaciones</span>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showEditarManifiesto && (
        <EditarManifiestoModal
          barco={barco}
          manifiesto={manifiesto}
          onClose={() => setShowEditarManifiesto(false)}
          onSave={(nuevoManifiesto) => {
            setManifiesto(nuevoManifiesto)
            setShowEditarManifiesto(false)
          }}
        />
      )}
    </div>
  )
}