'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getCurrentUser, isAdmin } from '../../../lib/auth'
import { 
  Package, Ship, ArrowLeft, Plus, Clock, 
  Truck, Weight, AlertCircle, CheckCircle, X,
  Edit2, Trash2, RefreshCw, BarChart3,
  Sun, Moon, Search, Grid, Layers, ChevronRight,
  Timer, TrendingUp, Award, Zap, Star, Hash, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import * as XLSX from 'xlsx'
dayjs.locale('es')

const useTheme = () => {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])
  const toggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  return { theme, toggleTheme: toggle }
}

// ─── FUNCIONES PARA EXPORTAR A EXCEL ─────────────────────────────────────
const formatearDuracionToMinutos = (duracion) => {
  if (!duracion || duracion === '—') return 0
  const [h, m] = duracion.split(':').map(Number)
  return (h * 60) + (m || 0)
}

const exportarAExcel = (barco, registros, stats, statsPorBodega, filtroFecha) => {
  try {
    // Crear un nuevo libro de trabajo
    const wb = XLSX.utils.book_new()
    
    // ===================================================
    // HOJA 1: RESUMEN GENERAL
    // ===================================================
    const resumenData = [
      ['🚢 INFORME DE REGISTRO DE SACOS'],
      [barco?.nombre || 'Barco sin nombre'],
      [`Fecha de generación: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`],
      [],
      ['📊 ESTADÍSTICAS GENERALES'],
      ['Métrica', 'Valor'],
      ['Total Viajes', stats.totalViajes],
      ['Total Sacos', stats.totalSacos],
      ['Total Toneladas (TM)', stats.totalTM.toFixed(3)],
      ['Promedio por Viaje (TM)', stats.promedioViaje.toFixed(3)],
      [],
      ['📦 RESUMEN POR BODEGA'],
      ['Bodega', 'Viajes', 'Sacos', 'Dañados', '% Dañados', 'Toneladas (TM)', 'Eficiencia']
    ]
    
    // Agregar datos por bodega
    statsPorBodega.forEach(b => {
      const porcentajeDanados = b.totalSacos > 0 
        ? ((b.totalDanados / b.totalSacos) * 100).toFixed(1) + '%'
        : '0%'
      const eficiencia = b.totalSacos > 0
        ? Math.round(((b.totalSacos - b.totalDanados) / b.totalSacos) * 100) + '%'
        : '100%'
      
      resumenData.push([
        b.bodega,
        b.viajes,
        b.totalSacos.toLocaleString(),
        b.totalDanados,
        porcentajeDanados,
        b.totalTM.toFixed(3),
        eficiencia
      ])
    })
    
    // Crear hoja de resumen
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    
    // Aplicar estilos a la hoja de resumen
    wsResumen['!cols'] = [
      { wch: 25 }, // Bodega
      { wch: 10 }, // Viajes
      { wch: 15 }, // Sacos
      { wch: 10 }, // Dañados
      { wch: 12 }, // % Dañados
      { wch: 18 }, // Toneladas
      { wch: 12 }  // Eficiencia
    ]
    
    // ===================================================
    // HOJA 2: TODOS LOS VIAJES (DETALLADO)
    // ===================================================
    const viajesData = [
      ['🚢 REGISTRO DETALLADO DE VIAJES'],
      [barco?.nombre || 'Barco sin nombre'],
      [`Fecha de generación: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`],
      [filtroFecha ? `Filtrado por fecha: ${dayjs(filtroFecha).format('DD/MM/YYYY')}` : 'Mostrando todos los registros'],
      [],
      ['# Viaje', 'Fecha', 'Bodega', 'Placa Camión', 'Placa Remolque', 'Nota Remisión', 
       'Hora Inicio', 'Hora Fin', 'Duración', 'Peso Ing. (kg)', 'Peso Saco (kg)', 
       'Cant. Sacos', 'Sacos Dañados', 'Peso Calc. (kg)', 'Toneladas (TM)', 
       'Diferencia %', 'Observaciones']
    ]
    
    // Agregar datos de viajes
    registros.forEach(reg => {
      const pesoCalculado = (reg.peso_saco_kg || 0) * (reg.cantidad_paquetes || 0)
      const diferencia = reg.peso_ingenio_kg && pesoCalculado
        ? ((Math.abs(pesoCalculado - reg.peso_ingenio_kg) / reg.peso_ingenio_kg) * 100).toFixed(2) + '%'
        : 'N/A'
      
      viajesData.push([
        reg.viaje_numero || '',
        reg.fecha ? dayjs(reg.fecha).format('DD/MM/YYYY') : '',
        reg.bodega || '',
        reg.placa_camion || '',
        reg.placa_remolque || '',
        reg.nota_remision || '',
        reg.hora_inicio || '',
        reg.hora_fin || '',
        reg.duracion || '—',
        reg.peso_ingenio_kg || '',
        reg.peso_saco_kg || '',
        reg.cantidad_paquetes || 0,
        reg.paquetes_danados || 0,
        pesoCalculado,
        reg.peso_total_calculado_tm?.toFixed(3) || (pesoCalculado / 1000).toFixed(3),
        diferencia,
        reg.observaciones || ''
      ])
    })
    
    // Crear hoja de viajes
    const wsViajes = XLSX.utils.aoa_to_sheet(viajesData)
    
    // Ajustar ancho de columnas para viajes
    wsViajes['!cols'] = [
      { wch: 8 },  // # Viaje
      { wch: 12 }, // Fecha
      { wch: 15 }, // Bodega
      { wch: 15 }, // Placa Camión
      { wch: 15 }, // Placa Remolque
      { wch: 15 }, // Nota Remisión
      { wch: 10 }, // Hora Inicio
      { wch: 10 }, // Hora Fin
      { wch: 10 }, // Duración
      { wch: 15 }, // Peso Ing.
      { wch: 15 }, // Peso Saco
      { wch: 12 }, // Cant. Sacos
      { wch: 12 }, // Sacos Dañados
      { wch: 15 }, // Peso Calc.
      { wch: 15 }, // Toneladas
      { wch: 12 }, // Diferencia %
      { wch: 30 }  // Observaciones
    ]
    
    // ===================================================
    // HOJA 3: ANÁLISIS DE RENDIMIENTO
    // ===================================================
    const rendimientoData = [
      ['📈 ANÁLISIS DE RENDIMIENTO POR BODEGA'],
      [barco?.nombre || 'Barco sin nombre'],
      [`Fecha de generación: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}`],
      [],
      ['Bodega', 'Viajes', 'Total Sacos', 'Total TM', 'Sacos/Viaje', 'TM/Viaje', 'Duración Promedio', 'Eficiencia']
    ]
    
    // Calcular duración promedio por bodega
    statsPorBodega.forEach(b => {
      const registrosBodega = registros.filter(r => r.bodega === b.bodega && r.duracion && r.duracion !== '—')
      let duracionPromedio = '—'
      
      if (registrosBodega.length > 0) {
        const totalMinutos = registrosBodega.reduce((sum, r) => {
          const [h, m] = r.duracion.split(':').map(Number)
          return sum + (h * 60 + (m || 0))
        }, 0)
        const promedioMin = totalMinutos / registrosBodega.length
        const h = Math.floor(promedioMin / 60)
        const m = Math.round(promedioMin % 60)
        duracionPromedio = m > 0 ? `${h}h ${m}m` : `${h}h`
      }
      
      const sacosPorViaje = b.viajes > 0 ? Math.round(b.totalSacos / b.viajes) : 0
      const tmPorViaje = b.viajes > 0 ? (b.totalTM / b.viajes).toFixed(2) : 0
      const eficiencia = b.totalSacos > 0
        ? Math.round(((b.totalSacos - b.totalDanados) / b.totalSacos) * 100) + '%'
        : '100%'
      
      rendimientoData.push([
        b.bodega,
        b.viajes,
        b.totalSacos.toLocaleString(),
        b.totalTM.toFixed(3),
        sacosPorViaje,
        tmPorViaje,
        duracionPromedio,
        eficiencia
      ])
    })
    
    // Agregar totales
    const totalSacosPorViaje = stats.totalViajes > 0 ? Math.round(stats.totalSacos / stats.totalViajes) : 0
    rendimientoData.push(
      [],
      ['TOTALES GENERALES', stats.totalViajes, stats.totalSacos.toLocaleString(), stats.totalTM.toFixed(3), totalSacosPorViaje, stats.promedioViaje.toFixed(2), '—', '—']
    )
    
    const wsRendimiento = XLSX.utils.aoa_to_sheet(rendimientoData)
    wsRendimiento['!cols'] = [
      { wch: 20 }, // Bodega
      { wch: 10 }, // Viajes
      { wch: 15 }, // Total Sacos
      { wch: 15 }, // Total TM
      { wch: 15 }, // Sacos/Viaje
      { wch: 15 }, // TM/Viaje
      { wch: 20 }, // Duración Promedio
      { wch: 12 }  // Eficiencia
    ]
    
    // ===================================================
    // HOJA 4: VIAJES POR HORA (ANÁLISIS TEMPORAL)
    // ===================================================
    // Agrupar viajes por hora de finalización
    const viajesPorHora = {}
    registros.forEach(reg => {
      if (reg.hora_flujo !== undefined && reg.hora_flujo !== null) {
        const hora = reg.hora_flujo
        viajesPorHora[hora] = (viajesPorHora[hora] || 0) + 1
      }
    })
    
    const horaData = [
      ['⏰ DISTRIBUCIÓN DE VIAJES POR HORA'],
      [barco?.nombre || 'Barco sin nombre'],
      [],
      ['Hora', 'Cantidad de Viajes']
    ]
    
    // Ordenar por hora
    Object.keys(viajesPorHora)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(hora => {
        horaData.push([`${hora}:00 - ${hora}:59`, viajesPorHora[hora]])
      })
    
    if (Object.keys(viajesPorHora).length === 0) {
      horaData.push(['No hay datos de hora disponibles', ''])
    }
    
    const wsHora = XLSX.utils.aoa_to_sheet(horaData)
    wsHora['!cols'] = [{ wch: 25 }, { wch: 20 }]
    
    // ===================================================
    // AGREGAR HOJAS AL LIBRO
    // ===================================================
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General')
    XLSX.utils.book_append_sheet(wb, wsViajes, 'Todos los Viajes')
    XLSX.utils.book_append_sheet(wb, wsRendimiento, 'Rendimiento')
    XLSX.utils.book_append_sheet(wb, wsHora, 'Viajes por Hora')
    
    // ===================================================
    // GENERAR ARCHIVO
    // ===================================================
    const nombreArchivo = `Registro_Sacos_${barco?.nombre?.replace(/\s+/g, '_') || 'Barco'}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    
    toast.success(`✅ Excel exportado correctamente: ${nombreArchivo}`)
    
  } catch (error) {
    console.error('Error exportando a Excel:', error)
    toast.error('❌ Error al exportar a Excel')
  }
}

// ─── InputField ─────────
const InputField = ({ label, lblClass, children, className = '' }) => (
  <div className={className}>
    <label className={`block text-xs ${lblClass} mb-1`}>{label}</label>
    {children}
  </div>
)

// ─── MODAL CON MANEJO DE CONCURRENCIA ─────────────────────────────────────
const RegistroSacosModal = ({ barco, bodegas, registro, onClose, onSuccess, theme }) => {
  const [loading, setLoading] = useState(false)
  const [proximoViaje, setProximoViaje] = useState(null)
  const [verificandoViaje, setVerificandoViaje] = useState(false)
  const [calculosExpandido, setCalculosExpandido] = useState(false)

  const dk = theme === 'dark'
  const bgM      = dk ? 'bg-[#0f172a]'      : 'bg-white'
  const bdM      = dk ? 'border-white/10'    : 'border-gray-200'
  const inBg     = dk ? 'bg-slate-900'       : 'bg-white'
  const txtM     = dk ? 'text-white'         : 'text-gray-900'
  const lblM     = dk ? 'text-slate-400'     : 'text-gray-600'
  const sectionBg = dk ? 'bg-slate-900/50'  : 'bg-gray-50'

  const inputClass = `w-full ${inBg} border ${bdM} rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 ${txtM} text-sm outline-none focus:ring-2 focus:ring-green-500/40`

  const [formData, setFormData] = useState({
    bodega: '',
    fecha: '',
    nota_remision: '',
    placa_camion: '',
    placa_remolque: '',
    peso_ingenio_kg: '',
    peso_saco_kg: 50,
    cantidad_paquetes: '',
    paquetes_danados: '0',
    hora_inicio: '',
    hora_fin: '',
    observaciones: ''
  })

  // Cargar datos iniciales y calcular próximo viaje
  useEffect(() => {
    if (registro) {
      // Si es edición, cargamos los datos existentes
      setFormData({
        bodega: registro.bodega || '',
        fecha: registro.fecha || '',
        nota_remision: registro.nota_remision || '',
        placa_camion: registro.placa_camion || '',
        placa_remolque: registro.placa_remolque || '',
        peso_ingenio_kg: registro.peso_ingenio_kg || '',
        peso_saco_kg: registro.peso_saco_kg || 50,
        cantidad_paquetes: registro.cantidad_paquetes || '',
        paquetes_danados: registro.paquetes_danados || '0',
        hora_inicio: registro.hora_inicio || '',
        hora_fin: registro.hora_fin || '',
        observaciones: registro.observaciones || ''
      })
    } else {
      // Si es nuevo, establecer valores por defecto SIN FECHA PRE-SELECCIONADA
      setFormData({
        bodega: bodegas.length > 0 ? bodegas[0].nombre : '',
        fecha: '', // 👈 IMPORTANTE: Vacío para que el usuario seleccione
        nota_remision: '',
        placa_camion: '',
        placa_remolque: '',
        peso_ingenio_kg: '',
        peso_saco_kg: 50,
        cantidad_paquetes: '',
        paquetes_danados: '0',
        hora_inicio: '', // 👈 También vacío
        hora_fin: '',
        observaciones: ''
      })
      calcularProximoViaje()
    }
  }, [registro, barco, bodegas])

  // Función para calcular el próximo número de viaje disponible
  const calcularProximoViaje = async () => {
    try {
      setVerificandoViaje(true)
      
      // Obtener todos los números de viaje existentes para este barco
      const { data, error } = await supabase
        .from('registros_sacos')
        .select('viaje_numero')
        .eq('barco_id', barco.id)
        .order('viaje_numero', { ascending: true })
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        // No hay viajes, el primero es el #1
        setProximoViaje(1)
        return
      }
      
      // Extraer los números de viaje existentes
      const numerosExistentes = data.map(r => r.viaje_numero)
      
      // Buscar el primer número faltante en la secuencia
      let numeroSugerido = 1
      for (let i = 0; i < numerosExistentes.length; i++) {
        if (numerosExistentes[i] > numeroSugerido) {
          // Encontramos un hueco
          break
        }
        numeroSugerido = numerosExistentes[i] + 1
      }
      
      setProximoViaje(numeroSugerido)
    } catch (error) {
      console.error('Error calculando próximo viaje:', error)
      // Si hay error, usamos el método simple de último + 1
      try {
        const { data } = await supabase
          .from('registros_sacos')
          .select('viaje_numero')
          .eq('barco_id', barco.id)
          .order('viaje_numero', { ascending: false })
          .limit(1)
        
        setProximoViaje(data && data.length > 0 ? data[0].viaje_numero + 1 : 1)
      } catch {
        setProximoViaje(1)
      }
    } finally {
      setVerificandoViaje(false)
    }
  }

  // Función para verificar si un número de viaje específico está disponible
  const verificarViajeDisponible = async (numeroViaje) => {
    try {
      const { data, error } = await supabase
        .from('registros_sacos')
        .select('id')
        .eq('barco_id', barco.id)
        .eq('viaje_numero', numeroViaje)
      
      if (error) throw error
      
      return !data || data.length === 0 // Está disponible si no hay resultados
    } catch (error) {
      console.error('Error verificando viaje:', error)
      return false
    }
  }

  // Función para validar coherencia entre fecha y horas
  const validarCoherenciaFechas = () => {
    if (!formData.fecha || !formData.hora_inicio || !formData.hora_fin) return null
    
    const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
    const fin = dayjs(`2000-01-01 ${formData.hora_fin}`)
    const fechaRegistro = dayjs(formData.fecha)
    
    const cruzaMedianoche = fin.isBefore(inicio)
    
    if (cruzaMedianoche) {
      return {
        tipo: 'info',
        mensaje: `🌙 Viaje nocturno: Inicia el ${fechaRegistro.format('DD/MM/YYYY')} a las ${formData.hora_inicio} y termina al día siguiente`
      }
    }
    
    return null
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value
    }))
  }

  const calcularDuracion = () => {
    if (!formData.hora_inicio || !formData.hora_fin) return '—'
    const inicio = dayjs(`2000-01-01 ${formData.hora_inicio}`)
    const fin    = dayjs(`2000-01-01 ${formData.hora_fin}`)
    const dur    = fin.isBefore(inicio) ? fin.add(24,'hour').diff(inicio,'minute') : fin.diff(inicio,'minute')
    const h = Math.floor(dur/60), m = dur%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`
  }

  const pesoCalc   = () => formData.peso_saco_kg && formData.cantidad_paquetes ? formData.peso_saco_kg * formData.cantidad_paquetes : 0
  const pesoTM     = () => (pesoCalc()/1000).toFixed(3)
  const verificarPeso = () => {
    if (!formData.peso_ingenio_kg || !formData.cantidad_paquetes) return null
    const pct = Math.abs(pesoCalc() - formData.peso_ingenio_kg) / formData.peso_ingenio_kg * 100
    return pct < 1 ? 'ok' : pct < 5 ? 'advertencia' : 'error'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      
      // Validaciones básicas
      if (!formData.fecha) { 
        toast.error('Debes seleccionar la fecha de inicio del viaje'); 
        setLoading(false); 
        return 
      }
      if (!formData.hora_inicio) { 
        toast.error('Hora de inicio obligatoria'); 
        setLoading(false); 
        return 
      }
      if (!formData.hora_fin) { 
        toast.error('Hora de fin obligatoria'); 
        setLoading(false); 
        return 
      }
      if (!formData.placa_camion?.trim()) { 
        toast.error('Placa obligatoria'); 
        setLoading(false); 
        return 
      }
      if (!formData.cantidad_paquetes || formData.cantidad_paquetes <= 0) { 
        toast.error('Cantidad inválida');  
        setLoading(false); 
        return 
      }
      if (!formData.peso_saco_kg || formData.peso_saco_kg <= 0) { 
        toast.error('Peso del saco inválido'); 
        setLoading(false); 
        return 
      }

      // Validar coherencia de fechas (solo advertencia, no bloquea)
      const coherencia = validarCoherenciaFechas()
      if (coherencia) {
        toast.success(coherencia.mensaje, { duration: 5000 })
      }

      // Determinar el número de viaje a usar
      let numeroViajeAGuardar
      
      if (registro) {
        // Es edición, mantener el mismo número
        numeroViajeAGuardar = registro.viaje_numero
      } else {
        // Es nuevo, verificar que el próximo viaje aún esté disponible
        const disponible = await verificarViajeDisponible(proximoViaje)
        
        if (!disponible) {
          // El viaje ya fue tomado por alguien más, recalcular
          toast.error(`⚠️ El Viaje #${proximoViaje} ya fue registrado por otro usuario`)
          await calcularProximoViaje()
          setLoading(false)
          return
        }
        
        numeroViajeAGuardar = proximoViaje
      }

      // Preparar datos para guardar (SIN las columnas generadas)
      const datos = {
        barco_id: barco.id,
        viaje_numero: numeroViajeAGuardar,
        bodega: formData.bodega,
        fecha: formData.fecha, // 👈 Se guarda la fecha que el usuario seleccionó (día de inicio)
        nota_remision: formData.nota_remision || null,
        placa_camion: formData.placa_camion?.toUpperCase() || '',
        placa_remolque: formData.placa_remolque?.toUpperCase() || null,
        peso_ingenio_kg: parseFloat(formData.peso_ingenio_kg) || null,
        peso_saco_kg: parseFloat(formData.peso_saco_kg),
        cantidad_paquetes: parseInt(formData.cantidad_paquetes) || 0,
        paquetes_danados: parseInt(formData.paquetes_danados) || 0,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        observaciones: formData.observaciones || null,
        duracion: calcularDuracion(),
        hora_flujo: formData.hora_fin ? parseInt(formData.hora_fin.split(':')[0]) : null,
        created_by: user.id
      }

      // Intentar guardar
      let error
      if (registro) {
        ({ error } = await supabase.from('registros_sacos').update(datos).eq('id', registro.id))
      } else {
        ({ error } = await supabase.from('registros_sacos').insert([datos]))
      }
      
      if (error) {
        // Verificar si es error de duplicado
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          toast.error(`❌ El Viaje #${numeroViajeAGuardar} ya fue registrado`)
          await calcularProximoViaje() // Recalcular próximo disponible
        } else {
          throw error
        }
        setLoading(false)
        return
      }

      // Éxito
      toast.success(registro ? 'Registro actualizado' : `✅ Viaje #${numeroViajeAGuardar} registrado`)
      
      const v = verificarPeso()
      if (v === 'advertencia') toast.warning('⚠️ Peso difiere del ingenio')
      else if (v === 'error')  toast.error('❌ Peso NO coincide con el ingenio')
      
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const verif = verificarPeso()
  const coherencia = validarCoherenciaFechas()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgM} border ${bdM} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[93vh] sm:max-h-[90vh] overflow-y-auto`}>

        {/* Modal header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-4 sticky top-0 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl z-10">
          <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">
              {registro ? 'Editar Registro' : 'Nuevo Registro'}
            </span>
            <span className="sm:hidden">
              {registro ? 'Editar' : 'Nuevo'}
            </span>
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Indicador de número de viaje - SOLO PARA NUEVOS REGISTROS */}
          {!registro && (
            <div className={`${sectionBg} rounded-xl p-4 border ${bdM} bg-gradient-to-r from-blue-500/10 to-purple-500/10`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-xs ${lblM}`}>Viaje a registrar</p>
                    {verificandoViaje ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className={`text-sm ${txtM}`}>Verificando...</span>
                      </div>
                    ) : (
                      <>
                        <p className={`text-2xl font-black text-blue-500`}>
                          #{proximoViaje || '...'}
                        </p>
                        <p className={`text-[10px] ${lblM}`}>
                          Siguiente número disponible
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcularProximoViaje}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Verificar nuevamente"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                </button>
              </div>
            </div>
          )}

          {/* 📅 FECHA - AHORA ES OBLIGATORIA Y SIN VALOR POR DEFECTO */}
          <div className={`${sectionBg} rounded-xl p-4 border ${bdM} ${!formData.fecha ? 'border-yellow-500/50 ring-1 ring-yellow-500/50' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-yellow-500" />
              </div>
              <h4 className={`font-bold ${txtM} text-sm sm:text-base`}>
                Fecha del Viaje <span className="text-red-400">*</span>
              </h4>
            </div>
            
            <p className={`text-xs ${lblM} mb-2`}>
              📌 Selecciona la fecha en que INICIÓ el viaje (si cruza medianoche, es el día de inicio)
            </p>
            
            <input 
              type="date" 
              name="fecha"
              value={formData.fecha} 
              onChange={handleChange} 
              className={`${inputClass} ${!formData.fecha ? 'border-yellow-500' : ''}`}
              required 
            />
            
            {!formData.fecha && (
              <p className="text-yellow-500 text-xs mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Debes seleccionar la fecha de inicio del viaje
              </p>
            )}
          </div>

          {/* Bodega */}
          <InputField label="Bodega" lblClass={lblM}>
            <select 
              name="bodega"
              value={formData.bodega} 
              onChange={handleChange} 
              className={inputClass} 
              required
            >
              {bodegas.map(b => <option key={b.id} value={b.nombre}>{b.nombre} ({b.codigo})</option>)}
            </select>
          </InputField>

          {/* Nota remisión */}
          <InputField label="Nota de Remisión" lblClass={lblM}>
            <input 
              type="text" 
              name="nota_remision"
              value={formData.nota_remision} 
              onChange={handleChange} 
              className={inputClass} 
              placeholder="N° de nota" 
            />
          </InputField>

          {/* Vehículo */}
          <div className={`${sectionBg} rounded-xl p-3 sm:p-5 border ${bdM}`}>
            <h4 className={`font-bold ${txtM} mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base`}>
              <Truck className="w-4 h-4 text-green-500" />
              Vehículo
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <InputField label="Placa Camión *" lblClass={lblM}>
                <input 
                  type="text" 
                  name="placa_camion"
                  value={formData.placa_camion}
                  onChange={handleChange}
                  className={`${inputClass} uppercase`} 
                  placeholder="C-00000" 
                  required 
                />
              </InputField>
              <InputField label="Placa Remolque" lblClass={lblM}>
                <input 
                  type="text" 
                  name="placa_remolque"
                  value={formData.placa_remolque}
                  onChange={handleChange}
                  className={`${inputClass} uppercase`} 
                  placeholder="RE-00000" 
                />
              </InputField>
            </div>
          </div>

          {/* Pesos y Sacos */}
          <div className={`${sectionBg} rounded-xl p-3 sm:p-5 border ${bdM}`}>
            <h4 className={`font-bold ${txtM} mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base`}>
              <Weight className="w-4 h-4 text-green-500" />
              Pesos y Sacos
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <InputField label="Peso Ingenio (kg) *" lblClass={lblM}>
                <input 
                  type="number" 
                  step="0.01" 
                  name="peso_ingenio_kg"
                  value={formData.peso_ingenio_kg}
                  onChange={handleChange}
                  className={inputClass} 
                  placeholder="28940" 
                  required 
                />
              </InputField>
              <InputField label="Peso Saco (kg) *" lblClass={lblM}>
                <input 
                  type="number" 
                  step="0.01" 
                  name="peso_saco_kg"
                  value={formData.peso_saco_kg}
                  onChange={handleChange}
                  className={inputClass} 
                  placeholder="50" 
                  required 
                />
              </InputField>
              <InputField label="Cantidad Sacos *" lblClass={lblM}>
                <input 
                  type="number" 
                  name="cantidad_paquetes"
                  value={formData.cantidad_paquetes}
                  onChange={handleChange}
                  className={inputClass} 
                  placeholder="1152" 
                  required 
                />
              </InputField>
              <InputField label="Sacos Dañados" lblClass={lblM}>
                <input 
                  type="number" 
                  name="paquetes_danados"
                  value={formData.paquetes_danados}
                  onChange={handleChange}
                  className={inputClass} 
                  placeholder="0" 
                />
              </InputField>
            </div>

            {/* Cálculos colapsables */}
            {formData.cantidad_paquetes && formData.peso_saco_kg && (
              <div className="mt-3">
                <button type="button" onClick={() => setCalculosExpandido(!calculosExpandido)}
                  className={`text-xs ${lblM} hover:${txtM} flex items-center gap-1 transition-colors`}>
                  {calculosExpandido ? '▼' : '▶'} Ver cálculos
                </button>
                {calculosExpandido && (
                  <div className={`mt-2 ${dk ? 'bg-slate-800' : 'bg-gray-100'} rounded-lg p-3 sm:p-4`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className={`text-xs ${lblM}`}>Peso calculado</p>
                        <p className={`text-base sm:text-lg font-bold ${txtM}`}>{pesoCalc().toLocaleString()} kg</p>
                      </div>
                      <div>
                        <p className={`text-xs ${lblM}`}>Toneladas</p>
                        <p className="text-base sm:text-lg font-bold text-green-500">{pesoTM()} TM</p>
                      </div>
                    </div>
                    {verif && (
                      <div className={`mt-2 p-2.5 rounded-lg border text-sm font-bold flex items-center gap-2 ${
                        verif === 'ok'          ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                        verif === 'advertencia' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                                  'bg-red-500/20 border-red-500/30 text-red-400'
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {verif === 'ok'          && '✅ Peso coincide'}
                        {verif === 'advertencia' && '⚠️ Pequeña diferencia'}
                        {verif === 'error'        && '❌ Peso NO coincide'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <InputField label="Hora Inicio *" lblClass={lblM}>
              <input 
                type="time" 
                name="hora_inicio"
                value={formData.hora_inicio} 
                onChange={handleChange} 
                className={inputClass} 
                required 
              />
            </InputField>
            <InputField label="Hora Fin *" lblClass={lblM}>
              <input 
                type="time" 
                name="hora_fin"
                value={formData.hora_fin} 
                onChange={handleChange} 
                className={inputClass} 
                required 
              />
            </InputField>
            <InputField label="Duración" lblClass={lblM}>
              <div className={`${inBg} border ${bdM} rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 ${txtM} text-sm`}>
                {calcularDuracion()}
              </div>
            </InputField>
          </div>

          {/* Mensaje de coherencia de fechas */}
          {coherencia && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400 flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{coherencia.mensaje}</span>
            </div>
          )}

          {/* Observaciones */}
          <InputField label="Observaciones" lblClass={lblM}>
            <textarea 
              name="observaciones"
              value={formData.observaciones} 
              onChange={handleChange}
              rows="2" 
              className={inputClass} 
              placeholder="Observaciones del viaje..." 
            />
          </InputField>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={loading || (!registro && verificandoViaje)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {registro ? 'Actualizar' : 'Registrar Viaje'}
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className={`flex-1 ${dk ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${txtM} font-bold py-3 px-4 rounded-xl text-sm sm:text-base transition-colors`}
            >
              Cancelar
            </button>
          </div>

          {/* Mensaje de advertencia para nuevos registros */}
          {!registro && (
            <p className={`text-[10px] text-center ${lblM} mt-2`}>
              ⚡ La fecha debe ser el día de INICIO del viaje (si cruza medianoche, es el día que empezó)
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ─── COMPONENTE DE TARJETA DE BODEGA UNIFICADA ────────────────────────────
const TarjetaBodegaUnificada = ({ 
  bodega, 
  duracionPromedio, 
  viajesConDuracion,
  esGeneral = false,
  text, 
  sub, 
  card, 
  border, 
  dk,
  onClick,
  seleccionada
}) => {
  
  // Formatear duración promedio
  const formatearDuracion = (minutos) => {
    if (!minutos || minutos === 0) return '—'
    if (minutos < 60) return `${Math.round(minutos)} min`
    const h = Math.floor(minutos / 60)
    const m = Math.round(minutos % 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  if (esGeneral) {
    return (
      <div className={`${card} border ${border} rounded-xl p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ring-2 ring-green-500 shadow-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${text}`}>
                Promedio General
                <Star className="w-4 h-4 text-yellow-500 inline ml-2" />
              </h3>
              <p className={`text-xs ${sub}`}>{bodega.viajes} viaje{bodega.viajes !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded-full font-medium">
            General
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className={`text-xs ${sub}`}>Sacos</p>
            <p className={`font-bold text-lg ${text}`}>{bodega.totalSacos.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className={`text-xs ${sub}`}>TM</p>
            <p className="font-bold text-lg text-green-500">{bodega.totalTM.toFixed(1)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className={`text-xs ${sub}`}>Viajes</p>
            <p className={`font-bold text-lg ${text}`}>{bodega.viajes}</p>
          </div>
        </div>

        {/* Duración promedio destacada */}
        {viajesConDuracion > 0 && (
          <div className="mb-3 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-400" />
                <span className={`text-sm ${sub}`}>Duración promedio:</span>
              </div>
              <span className={`text-xl font-black text-blue-400`}>
                {formatearDuracion(duracionPromedio)}
              </span>
            </div>
            <p className={`text-[10px] ${sub} mt-1 text-right`}>por viaje</p>
          </div>
        )}
      </div>
    )
  }

  // Card para bodegas específicas
  const porcentajeDanados = bodega.totalSacos > 0 
    ? ((bodega.totalDanados / bodega.totalSacos) * 100).toFixed(1)
    : 0

  return (
    <div 
      onClick={onClick}
      className={`${card} border ${border} rounded-xl p-4 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
        seleccionada ? 'ring-2 ring-green-500 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${text}`}>{bodega.bodega}</h3>
            <p className={`text-xs ${sub}`}>{bodega.viajes} viaje{bodega.viajes !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full font-medium ${
          porcentajeDanados < 1 ? 'bg-green-500/20 text-green-500' :
          porcentajeDanados < 3 ? 'bg-yellow-500/20 text-yellow-500' :
          'bg-red-500/20 text-red-500'
        }`}>
          {porcentajeDanados}% dañados
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className={`text-xs ${sub}`}>Sacos</p>
          <p className={`font-bold text-lg ${text}`}>{bodega.totalSacos.toLocaleString()}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className={`text-xs ${sub}`}>Dañados</p>
          <p className={`font-bold text-lg ${bodega.totalDanados > 0 ? 'text-red-400' : text}`}>
            {bodega.totalDanados}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className={`text-xs ${sub}`}>TM</p>
          <p className="font-bold text-lg text-green-500">{bodega.totalTM.toFixed(1)}</p>
        </div>
      </div>

      {/* Duración promedio integrada */}
      {viajesConDuracion > 0 && (
        <div className="mb-3 p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3 text-blue-400" />
              <span className={`text-xs ${sub}`}>Promedio:</span>
            </div>
            <span className={`font-bold text-blue-400`}>
              {formatearDuracion(duracionPromedio)}
            </span>
          </div>
        </div>
      )}

      {/* Indicador de expansión */}
      <div className="mt-2 flex justify-center">
        <ChevronRight className={`w-5 h-5 ${sub} transition-transform duration-300 ${
          seleccionada ? 'rotate-90' : ''
        }`} />
      </div>
    </div>
  )
}

// ─── COMPONENTE DE TABLA DE VIAJES POR BODEGA ────────────────────────────
const TablaViajesBodega = ({ bodega, registros, onEdit, onDelete, theme, sub, text, dk, onClose }) => {
  return (
    <div className={`${dk ? 'bg-slate-800/50' : 'bg-gray-50'} rounded-xl border ${dk ? 'border-white/10' : 'border-gray-200'} overflow-hidden animate-slideDown`}>
      <div className={`px-4 py-3 ${dk ? 'bg-gradient-to-r from-slate-800 to-slate-700' : 'bg-gradient-to-r from-gray-100 to-gray-50'} border-b ${dk ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-green-500" />
          <h3 className={`font-bold ${text}`}>
            Viajes - {bodega}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${dk ? 'bg-slate-700' : 'bg-gray-200'} ${sub}`}>
            {registros.length}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={dk ? 'bg-slate-700/50' : 'bg-gray-200/50'}>
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Fecha</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Placa</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Sacos</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Dañados</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">TM</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Duración</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400"></th>
            </tr>
          </thead>
          <tbody className={`divide-y ${dk ? 'divide-white/5' : 'divide-gray-200'}`}>
            {registros
              .sort((a, b) => a.viaje_numero - b.viaje_numero)
              .map(reg => {
                const pctDif = reg.peso_ingenio_kg && reg.cantidad_paquetes
                  ? Math.abs((reg.peso_saco_kg * reg.cantidad_paquetes) - reg.peso_ingenio_kg) / reg.peso_ingenio_kg * 100
                  : null
                
                return (
                  <tr key={reg.id} className={`${dk ? 'hover:bg-white/5' : 'hover:bg-gray-100'} transition-colors`}>
                    <td className="px-3 py-2 font-medium">#{reg.viaje_numero}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{dayjs(reg.fecha).format('DD/MM/YY')}</td>
                    <td className="px-3 py-2 font-mono text-blue-400 text-xs">{reg.placa_camion}</td>
                    <td className="px-3 py-2 font-medium">{reg.cantidad_paquetes}</td>
                    <td className="px-3 py-2">
                      {reg.paquetes_danados > 0 ? 
                        <span className="text-red-400">{reg.paquetes_danados}</span> : 
                        <span className="text-slate-500">-</span>
                      }
                    </td>
                    <td className="px-3 py-2 font-medium text-green-400 text-xs">
                      {reg.peso_total_calculado_tm?.toFixed(2)}
                      {pctDif && pctDif > 5 && <AlertCircle className="w-3 h-3 text-red-400 inline ml-1" />}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{reg.duracion}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(reg)}
                          className="p-1 hover:bg-blue-500/20 rounded transition-colors">
                          <Edit2 className="w-3 h-3 text-blue-400" />
                        </button>
                        <button onClick={() => onDelete(reg.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
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
  )
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function RegistroSacosPage() {
  const router   = useRouter()
  const params   = useParams()
  const token    = params.token
  const { theme, toggleTheme } = useTheme()
  const dk       = theme === 'dark'

  const [user, setUser]               = useState(null)
  const [barco, setBarco]             = useState(null)
  const [registros, setRegistros]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [registroEditando, setRegistroEditando] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState('') // Vacío para mostrar todos
  const [searchPlaca, setSearchPlaca] = useState('')
  const [stats, setStats]             = useState({ totalViajes:0, totalSacos:0, totalTM:0, promedioViaje:0 })
  const [statsPorBodega, setStatsPorBodega] = useState([])
  const [bodegaSeleccionada, setBodegaSeleccionada] = useState(null)

  const bg      = dk ? 'bg-[#0f172a]'   : 'bg-gray-50'
  const card    = dk ? 'bg-slate-900'   : 'bg-white'
  const border  = dk ? 'border-white/10': 'border-gray-200'
  const text    = dk ? 'text-white'     : 'text-gray-900'
  const sub     = dk ? 'text-slate-400' : 'text-gray-600'
  const inputBg = dk ? 'bg-slate-800'   : 'bg-gray-100'

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }
    if (!isAdmin()) { toast.error('Acceso no autorizado'); router.push('/'); return }
    setUser(currentUser)
    cargarBarco()
  }, [token])

  const cargarBarco = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('barcos').select('*').eq('token_compartido', token).single()
      if (error) throw error
      if (!data) { toast.error('Barco no encontrado'); router.push('/chequero'); return }
      setBarco(data)
      await cargarRegistros(data.id)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar el barco')
      router.push('/chequero')
    }
  }

  const cargarRegistros = async (barcoId) => {
    try {
      const { data, error } = await supabase.from('registros_sacos').select('*')
        .eq('barco_id', barcoId).order('viaje_numero', { ascending: true })
      if (error) throw error
      
      const registrosOrdenados = data || []
      setRegistros(registrosOrdenados)
      
      // Calcular estadísticas generales
      const tv = registrosOrdenados?.length || 0
      const ts = registrosOrdenados?.reduce((s, r) => s + r.cantidad_paquetes, 0) || 0
      const tt = registrosOrdenados?.reduce((s, r) => s + (r.peso_total_calculado_tm || 0), 0) || 0
      setStats({ 
        totalViajes: tv, 
        totalSacos: ts, 
        totalTM: tt, 
        promedioViaje: tv > 0 ? tt / tv : 0 
      })

      // Calcular estadísticas por bodega
      const bodegasMap = new Map()
      registrosOrdenados.forEach(reg => {
        if (!bodegasMap.has(reg.bodega)) {
          bodegasMap.set(reg.bodega, {
            bodega: reg.bodega,
            totalSacos: 0,
            totalDanados: 0,
            totalTM: 0,
            viajes: 0,
            registros: []
          })
        }
        const bodegaStat = bodegasMap.get(reg.bodega)
        bodegaStat.totalSacos += reg.cantidad_paquetes || 0
        bodegaStat.totalDanados += reg.paquetes_danados || 0
        bodegaStat.totalTM += reg.peso_total_calculado_tm || 0
        bodegaStat.viajes += 1
        bodegaStat.registros.push(reg)
      })

      const statsArray = Array.from(bodegasMap.values())
      
      // Calcular eficiencia para cada bodega
      statsArray.forEach(b => {
        b.eficiencia = b.totalSacos > 0 
          ? Math.round(((b.totalSacos - b.totalDanados) / b.totalSacos) * 100)
          : 0
      })

      setStatsPorBodega(statsArray)

    } catch (err) {
      console.error(err)
      toast.error('Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      const { error } = await supabase.from('registros_sacos').delete().eq('id', id)
      if (error) throw error
      toast.success('Registro eliminado')
      await cargarRegistros(barco.id)
      
      if (bodegaSeleccionada) {
        const bodegaActualizada = statsPorBodega.find(b => b.bodega === bodegaSeleccionada)
        if (!bodegaActualizada || bodegaActualizada.viajes === 0) {
          setBodegaSeleccionada(null)
        }
      }
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar')
    }
  }

  // Calcular duración promedio general EN MINUTOS
  const calcularDuracionPromedio = () => {
    const registrosConDuracion = registros.filter(r => r.duracion && r.duracion !== '—')
    if (registrosConDuracion.length === 0) return 0
    
    const totalMinutos = registrosConDuracion.reduce((sum, r) => {
      const [h, m] = r.duracion.split(':').map(Number)
      return sum + (h * 60 + m)
    }, 0)
    
    return totalMinutos / registrosConDuracion.length
  }

  // Calcular duración promedio por bodega EN MINUTOS
  const calcularDuracionPorBodega = (bodega) => {
    const registrosBodega = registros.filter(r => r.bodega === bodega && r.duracion && r.duracion !== '—')
    if (registrosBodega.length === 0) return 0
    
    const totalMinutos = registrosBodega.reduce((sum, r) => {
      const [h, m] = r.duracion.split(':').map(Number)
      return sum + (h * 60 + m)
    }, 0)
    
    return totalMinutos / registrosBodega.length
  }

  // Crear objeto para la tarjeta general
  const statsGenerales = {
    bodega: 'General',
    totalSacos: stats.totalSacos,
    totalTM: stats.totalTM,
    viajes: stats.totalViajes,
    eficiencia: stats.totalSacos > 0 
      ? Math.round(((stats.totalSacos - registros.reduce((s, r) => s + r.paquetes_danados, 0)) / stats.totalSacos) * 100)
      : 0
  }

  const duracionPromedioGeneral = calcularDuracionPromedio()
  const registrosConDuracion = registros.filter(r => r.duracion && r.duracion !== '—').length

  const registrosFiltrados = registros.filter(r => {
    if (filtroFecha && r.fecha !== filtroFecha) return false
    if (searchPlaca && !r.placa_camion.toLowerCase().includes(searchPlaca.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4" />
        <p className={sub}>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>

      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-5">

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/chequero')}
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 p-2 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-base sm:text-2xl font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                  Registro de Sacos
                </h1>
                <p className="text-green-200 text-xs sm:text-sm">
                  {barco?.nombre}
                  {barco?.codigo_barco && <span className="hidden sm:inline"> · {barco.codigo_barco}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* NUEVO BOTÓN DE EXPORTAR EXCEL */}
              <button
                onClick={() => exportarAExcel(barco, registros, stats, statsPorBodega, filtroFecha)}
                className="bg-green-500 hover:bg-green-600 p-2 rounded-xl transition-colors relative group"
                title="Exportar a Excel"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20M15.6 12.1L13.7 14L15.6 15.9L14.2 17.3L12.3 15.4L10.4 17.3L9 15.9L10.9 14L9 12.1L10.4 10.7L12.3 12.6L14.2 10.7L15.6 12.1Z" />
                </svg>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Exportar a Excel
                </span>
              </button>
              
              <button onClick={toggleTheme}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                {dk ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
              </button>
              <button onClick={() => cargarRegistros(barco.id)} title="Actualizar"
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Total Viajes', value: stats.totalViajes },
              { label: 'Total Sacos',  value: stats.totalSacos.toLocaleString() },
              { label: 'Total TM',     value: stats.totalTM.toFixed(3) },
              { label: 'Prom. / Viaje',value: `${stats.promedioViaje.toFixed(3)} TM` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-3 sm:py-4">
                <p className="text-green-200 text-[10px] sm:text-xs">{label}</p>
                <p className="text-white font-bold text-lg sm:text-2xl leading-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-10">

        {/* Cards de Resumen Unificadas - General + Bodegas */}
        <div className="space-y-3">
          <h2 className={`font-bold ${text} flex items-center gap-2 text-base sm:text-lg`}>
            <Layers className="w-5 h-5 text-green-500" />
            Resumen de Operaciones
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Tarjeta General - Siempre visible */}
            <TarjetaBodegaUnificada
              bodega={statsGenerales}
              duracionPromedio={duracionPromedioGeneral}
              viajesConDuracion={registrosConDuracion}
              esGeneral={true}
              text={text}
              sub={sub}
              card={card}
              border={border}
              dk={dk}
            />

            {/* Tarjetas de bodegas */}
            {statsPorBodega.map((bodega, index) => {
              const duracionPromedio = calcularDuracionPorBodega(bodega.bodega)
              const viajesConDuracion = bodega.registros.filter(r => r.duracion && r.duracion !== '—').length

              return (
                <TarjetaBodegaUnificada
                  key={index}
                  bodega={bodega}
                  duracionPromedio={duracionPromedio}
                  viajesConDuracion={viajesConDuracion}
                  esGeneral={false}
                  text={text}
                  sub={sub}
                  card={card}
                  border={border}
                  dk={dk}
                  onClick={() => setBodegaSeleccionada(
                    bodegaSeleccionada === bodega.bodega ? null : bodega.bodega
                  )}
                  seleccionada={bodegaSeleccionada === bodega.bodega}
                />
              )
            })}
          </div>
        </div>

        {/* Tabla de viajes de la bodega seleccionada */}
        {bodegaSeleccionada && (
          <TablaViajesBodega
            bodega={bodegaSeleccionada}
            registros={statsPorBodega.find(b => b.bodega === bodegaSeleccionada)?.registros || []}
            onEdit={(reg) => { setRegistroEditando(reg); setShowModal(true) }}
            onDelete={handleEliminar}
            theme={theme}
            sub={sub}
            text={text}
            dk={dk}
            onClose={() => setBodegaSeleccionada(null)}
          />
        )}

        {/* Acciones + Filtros */}
        <div className={`${card} border ${border} rounded-2xl p-3 sm:p-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => { setRegistroEditando(null); setShowModal(true) }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 sm:w-auto w-full text-sm sm:text-base shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </button>

            <div className="flex gap-2">
              {/* BOTÓN DE EXPORTAR ADICIONAL (OPCIONAL) */}
              <button
                onClick={() => exportarAExcel(barco, registros, stats, statsPorBodega, filtroFecha)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-105 text-sm sm:text-base shadow-lg"
                title="Exportar todos los datos a Excel"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2M18 20H6V4H13V9H18V20M15.6 12.1L13.7 14L15.6 15.9L14.2 17.3L12.3 15.4L10.4 17.3L9 15.9L10.9 14L9 12.1L10.4 10.7L12.3 12.6L14.2 10.7L15.6 12.1Z" />
                </svg>
                <span className="hidden sm:inline">Exportar Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
              
              <input 
                type="date" 
                value={filtroFecha} 
                onChange={e => setFiltroFecha(e.target.value)}
                className={`${inputBg} border ${border} rounded-xl px-3 py-2 ${text} text-sm outline-none focus:ring-2 focus:ring-green-500/40 flex-1 sm:flex-none`} 
                placeholder="Todas las fechas"
              />
              <div className="relative flex-1 sm:flex-none sm:w-44">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
                <input 
                  type="text" 
                  value={searchPlaca} 
                  onChange={e => setSearchPlaca(e.target.value)}
                  placeholder="Buscar placa..."
                  className={`w-full ${inputBg} border ${border} rounded-xl pl-9 pr-3 py-2 ${text} text-sm outline-none focus:ring-2 focus:ring-green-500/40`} 
                />
              </div>
            </div>
          </div>
          {!filtroFecha && (
            <p className={`text-xs ${sub} mt-2 text-center sm:text-left`}>
              📅 Mostrando todos los registros sin filtro de fecha
            </p>
          )}
        </div>

        {/* Tabla general con scroll */}
        <div className={`${card} border ${border} rounded-2xl overflow-hidden`}>
          <div className="max-h-[600px] overflow-y-auto">
            <div className="hidden sm:block">
              <table className="w-full">
                <thead className={`${dk ? 'bg-slate-800' : 'bg-gray-100'} sticky top-0 z-10`}>
                  <tr>
                    {['# Viaje','Bodega','Fecha','Placa','Peso Ing.','Sacos','Dañados','Total TM','Duración',''].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-bold ${sub} uppercase tracking-wide`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${dk ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="10" className={`px-4 py-12 text-center ${sub}`}>
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No hay registros para mostrar</p>
                      </td>
                    </tr>
                  ) : registrosFiltrados.map(reg => {
                    const pctDif = reg.peso_ingenio_kg && reg.cantidad_paquetes
                      ? Math.abs((reg.peso_saco_kg * reg.cantidad_paquetes) - reg.peso_ingenio_kg) / reg.peso_ingenio_kg * 100
                      : null
                    return (
                      <tr key={reg.id} className={`${dk ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className={`px-4 py-3 font-bold ${text}`}>#{reg.viaje_numero}</td>
                        <td className={`px-4 py-3 ${dk ? 'text-slate-300' : 'text-gray-700'}`}>{reg.bodega}</td>
                        <td className={`px-4 py-3 text-sm ${sub}`}>{dayjs(reg.fecha).format('DD/MM/YY')}</td>
                        <td className="px-4 py-3 font-mono text-blue-400 text-sm">{reg.placa_camion}</td>
                        <td className={`px-4 py-3 text-sm ${sub}`}>{reg.peso_ingenio_kg?.toLocaleString()} kg</td>
                        <td className={`px-4 py-3 font-bold ${text}`}>{reg.cantidad_paquetes}</td>
                        <td className="px-4 py-3 text-sm">
                          {reg.paquetes_danados > 0 ? <span className="text-red-400">{reg.paquetes_danados}</span> : <span className={sub}>—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-green-400">
                          {reg.peso_total_calculado_tm?.toFixed(3)}
                          {pctDif && pctDif > 5 && <AlertCircle className="w-3 h-3 text-red-400 inline ml-1" />}
                        </td>
                        <td className={`px-4 py-3 text-xs ${sub}`}>{reg.duracion}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => { setRegistroEditando(reg); setShowModal(true) }}
                              className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button onClick={() => handleEliminar(reg.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista móvil con scroll */}
            <div className="sm:hidden max-h-[500px] overflow-y-auto">
              {registrosFiltrados.length === 0 ? (
                <div className={`text-center py-12 ${sub}`}>
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No hay registros para mostrar</p>
                </div>
              ) : (
                <div className={`divide-y ${dk ? 'divide-white/5' : 'divide-gray-100'}`}>
                  {registrosFiltrados.map(reg => {
                    const pctDif = reg.peso_ingenio_kg && reg.cantidad_paquetes
                      ? Math.abs((reg.peso_saco_kg * reg.cantidad_paquetes) - reg.peso_ingenio_kg) / reg.peso_ingenio_kg * 100
                      : null
                    return (
                      <div key={reg.id} className={`p-4 ${dk ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-black ${text}`}>#{reg.viaje_numero}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${dk ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                              {reg.bodega}
                            </span>
                            <span className={`text-xs ${sub}`}>{dayjs(reg.fecha).format('DD/MM')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setRegistroEditando(reg); setShowModal(true) }}
                              className="p-1.5 hover:bg-blue-500/20 rounded-lg transition-colors">
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                            <button onClick={() => handleEliminar(reg.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <p className={`text-[10px] ${sub}`}>Placa</p>
                            <p className="text-xs font-mono text-blue-400 font-bold">{reg.placa_camion}</p>
                          </div>
                          <div>
                            <p className={`text-[10px] ${sub}`}>Ingenio</p>
                            <p className={`text-xs font-medium ${text}`}>{(reg.peso_ingenio_kg/1000).toFixed(1)}t</p>
                          </div>
                          <div>
                            <p className={`text-[10px] ${sub}`}>Sacos</p>
                            <p className={`text-xs font-bold ${text}`}>
                              {reg.cantidad_paquetes}
                              {reg.paquetes_danados > 0 && <span className="text-red-400 ml-1">(-{reg.paquetes_danados})</span>}
                            </p>
                          </div>
                          <div>
                            <p className={`text-[10px] ${sub}`}>Total TM</p>
                            <p className="text-xs font-bold text-green-400 flex items-center gap-0.5">
                              {reg.peso_total_calculado_tm?.toFixed(3)}
                              {pctDif && pctDif > 5 && <AlertCircle className="w-3 h-3 text-red-400" />}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className={`w-3 h-3 ${sub}`} />
                          <span className={`text-[11px] ${sub}`}>{reg.hora_inicio} – {reg.hora_fin}</span>
                          {reg.duracion && reg.duracion !== '—' && (
                            <span className={`text-[11px] ${dk ? 'text-slate-500' : 'text-gray-400'}`}>({reg.duracion})</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Indicador de scroll y cantidad de registros */}
          <div className={`px-4 py-2 border-t ${border} flex items-center justify-between text-xs ${sub}`}>
            <span>Mostrando {registrosFiltrados.length} de {registros.length} registros</span>
            {registrosFiltrados.length > 10 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7m14-6l-7 7-7-7" />
                </svg>
                Desplázate para ver más
              </span>
            )}
          </div>
        </div>

        {/* Resumen del día (si hay filtro de fecha) o total general */}
        <div className={`${card} border ${border} rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${dk ? 'from-slate-900 to-slate-800' : 'from-white to-gray-50'}`}>
          <h3 className={`font-bold ${text} mb-3 flex items-center gap-2 text-sm sm:text-base`}>
            <BarChart3 className="w-4 h-4 text-green-500" />
            {filtroFecha ? `Resumen del ${dayjs(filtroFecha).format('DD/MM/YYYY')}` : 'Resumen General'}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: filtroFecha ? 'Viajes hoy' : 'Total viajes',    
                value: registrosFiltrados.length,                                                                    
                color: text 
              },
              { label: filtroFecha ? 'Sacos hoy' : 'Total sacos',     
                value: registrosFiltrados.reduce((s,r) => s + r.cantidad_paquetes, 0).toLocaleString(),               
                color: text 
              },
              { label: filtroFecha ? 'Toneladas hoy' : 'Total TM', 
                value: `${registrosFiltrados.reduce((s,r) => s + (r.peso_total_calculado_tm||0), 0).toFixed(3)} TM`,  
                color: 'text-green-500' 
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-white/5">
                <p className={`text-xs ${sub}`}>{label}</p>
                <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && barco && (
        <RegistroSacosModal
          barco={barco}
          bodegas={barco.bodegas_json || []}
          registro={registroEditando}
          onClose={() => { setShowModal(false); setRegistroEditando(null) }}
          onSuccess={() => { setShowModal(false); setRegistroEditando(null); cargarRegistros(barco.id) }}
          theme={theme}
        />
      )}

      {/* Estilos para animaciones */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        /* Estilos personalizados para la scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: ${dk ? '#1e293b' : '#f1f1f1'};
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${dk ? '#475569' : '#cbd5e1'};
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${dk ? '#64748b' : '#94a3b8'};
        }
      `}</style>
    </div>
  )
}