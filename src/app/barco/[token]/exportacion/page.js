// app/barco/[token]/exportacion/page.js - VERSIÓN CON GRÁFICA POR BODEGA

'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from './../../../lib/supabase'
import { getCurrentUser } from './../../../lib/auth'
import { 
  Save, RefreshCw, Scale, Ship, Target, CheckCircle, 
  Package, Clock, AlertCircle, Edit2, Trash2, MapPin,
  TrendingUp, LineChart, BookOpen, X, Download, Layers,
  Anchor, Play, StopCircle, Lock, Unlock, Coffee, CloudRain,
  Wrench, Truck, Zap, AlertTriangle, BarChart3, Flag,
  History, Filter, ChevronDown, ChevronRight, Info, Box, FileSpreadsheet,
  Plus, PauseCircle, ClipboardList
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowRightLeft } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import * as XLSX from 'xlsx'

// Extender dayjs con plugins de zona horaria
dayjs.extend(utc)
dayjs.extend(timezone)

// =====================================================
// CONFIGURACIÓN DE HORARIO EL SALVADOR (GMT-6)
// =====================================================
const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

// Para MOSTRAR: Convertir UTC de BD a hora de El Salvador
const formatUTCToSV = (utcDate, format = 'DD/MM/YY HH:mm') => {
  if (!utcDate) return '—'
  return dayjs.utc(utcDate).tz(TIMEZONE_EL_SALVADOR).format(format)
}

// Para GUARDAR: Convertir hora de El Salvador del input a UTC
const svToUTC = (svDateTime) => {
  if (!svDateTime) return null
  return dayjs.tz(svDateTime, TIMEZONE_EL_SALVADOR).utc().toISOString()
}

// Obtener hora actual en El Salvador para inputs
const getCurrentSVTimeForInput = () => {
  return dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DDTHH:mm')
}

// =====================================================
// CONFIGURACIÓN DE BODEGAS DEL BARCO
// =====================================================
const BODEGAS_BARCO = [
  { id: 1, nombre: 'Bodega 1', codigo: 'BDG-01', color: '#3b82f6' },
  { id: 2, nombre: 'Bodega 2', codigo: 'BDG-02', color: '#ef4444' },
  { id: 3, nombre: 'Bodega 3', codigo: 'BDG-03', color: '#10b981' },
  { id: 4, nombre: 'Bodega 4', codigo: 'BDG-04', color: '#f59e0b' },
  { id: 5, nombre: 'Bodega 5', codigo: 'BDG-05', color: '#8b5cf6' },
  { id: 6, nombre: 'Bodega 6', codigo: 'BDG-06', color: '#ec4899' },
  { id: 7, nombre: 'Bodega 7', codigo: 'BDG-07', color: '#06b6d4' },
  { id: 8, nombre: 'Bodega 8', codigo: 'BDG-08', color: '#84cc16' },
]

// =====================================================
// CONFIGURACIÓN DE TIPOS DE PARO
// =====================================================
const getTiposParoConfig = () => ({
  // PAROS ALMAPAC
  'BANDA 7': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', grupo: 'ALMAPAC' },
  'MOVIMIENTO DEL CARRO DE BANDA 7': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', grupo: 'ALMAPAC' },
  'ELEVADOR 23': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'ALMAPAC' },
  'ELEVADOR 13': { icono: <Zap className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'ALMAPAC' },
  'BÁSCULA DE EXPORTACIÓN': { icono: <Scale className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', grupo: 'ALMAPAC' },
  'COMPUERTA DE LLENADO': { icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  'COMPUERTA DE DESCARGA': { icono: <Layers className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  'HEL ALTO': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'ALMAPAC' },
  'DRAFT MASTER': { icono: <BarChart3 className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', grupo: 'ALMAPAC' },
  'COMPRESOR A': { icono: <Zap className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'ALMAPAC' },
  'COMPRESOR B': { icono: <Zap className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'ALMAPAC' },
  'BANDA 15': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 19': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 72': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'BANDA 73': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'ALMAPAC' },
  'FALLA DE PAYD LOADER': { icono: <Truck className="w-4 h-4" />, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', grupo: 'ALMAPAC' },
  'PLC': { icono: <Zap className="w-4 h-4" />, bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', grupo: 'ALMAPAC' },
  'FALTA DE AZÚCAR': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-stone-500/10', text: 'text-stone-400', border: 'border-stone-500/20', grupo: 'ALMAPAC' },
  'BANDA 21': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', grupo: 'ALMAPAC' },
  'BANDA 2': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', grupo: 'ALMAPAC' },
  'BANDA 1': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', grupo: 'ALMAPAC' },
  'DESATORANDO ELEVADOR 23.': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', grupo: 'ALMAPAC' },
  'OTROS': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'ALMAPAC' },
  
  // PAROS UPDP
  'TRANSPORTADOR No:': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', grupo: 'UPDP' },
  'REBALSE EN EL BUM': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'UPDP' },
  'FALLAS EN UNIDAD DE CARGA': { icono: <Truck className="w-4 h-4" />, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', grupo: 'UPDP' },
  'FALLAS EN EL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', grupo: 'UPDP' },
  'MANTENIMINETO DEL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', grupo: 'UPDP' },
  'LIMPIEZA DEL APILADOR': { icono: <Wrench className="w-4 h-4" />, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', grupo: 'UPDP' },
  'MOVIMIENTO DEL APILADOR': { icono: <Truck className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'UPDP' },
  'CAMBIO DE BODEGA EN EL BARCO': { icono: <Layers className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'UPDP' },
  'CORTE DE ENERGÍA ELÉCTRICA UPDP': { icono: <Zap className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'UPDP' },
  
  // PAROS POR OTRAS CAUSAS
  'VERIFICACIÓN DE CALIDAD DEL AZÚCAR A BORDO': { icono: <ClipboardList className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', grupo: 'OTRAS' },
  'VERIFICACIÓN DE CALADO (INICIAL)': { icono: <ClipboardList className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', grupo: 'OTRAS' },
  'VERIFICACIÓN DE CALADO (FINAL)': { icono: <ClipboardList className="w-4 h-4" />, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', grupo: 'OTRAS' },
  'MAREA FUERTE': { icono: <CloudRain className="w-4 h-4" />, bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', grupo: 'OTRAS' },
  'MOVIMIENTO DEL BARCO': { icono: <Ship className="w-4 h-4" />, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', grupo: 'OTRAS' },
  'AMENAZA DE LLUVIA': { icono: <CloudRain className="w-4 h-4" />, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', grupo: 'OTRAS' },
  'PARO POR LLUVIA': { icono: <CloudRain className="w-4 h-4" />, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', grupo: 'OTRAS' },
  'CORTE DE ENERGÍA ELÉCTRICA': { icono: <Zap className="w-4 h-4" />, bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', grupo: 'OTRAS' },
  'OTROS': { icono: <AlertTriangle className="w-4 h-4" />, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', grupo: 'OTRAS' },
})

// =====================================================
// FUNCIÓN PARA EXPORTAR A EXCEL
// =====================================================
const exportToExcel = (barco, exportaciones, productos, registrosParos, catalogosParos) => {
  try {
    toast.loading('Preparando archivo Excel...', { id: 'excel' })

    const wb = XLSX.utils.book_new()
    
    const resumenData = []
    resumenData.push(['INFORME DE EXPORTACIÓN - BARCO', barco.nombre])
    resumenData.push(['Código', barco.codigo_barco || '—'])
    resumenData.push(['Estado', barco.estado])
    resumenData.push(['Fecha del reporte', formatUTCToSV(new Date(), 'DD/MM/YYYY HH:mm')])
    resumenData.push([])
    resumenData.push(['INICIO DE CARGA', barco.operacion_iniciada_at ? formatUTCToSV(barco.operacion_iniciada_at, 'DD/MM/YY HH:mm') : 'PENDIENTE'])
    resumenData.push(['FIN DE CARGA', barco.operacion_finalizada_at ? formatUTCToSV(barco.operacion_finalizada_at, 'DD/MM/YY HH:mm') : 'EN CURSO'])
    resumenData.push([])
    resumenData.push(['RESUMEN POR PRODUCTO'])
    resumenData.push(['Producto', 'Total Cargado (TM)', 'Meta (TM)', '% Cumplimiento', 'Flujo Promedio (TM/h)'])
    
    productos.forEach(producto => {
      const exportacionesProd = exportaciones.filter(e => e.producto_id === producto.id)
      if (exportacionesProd.length === 0) return
      
      const ordenadas = [...exportacionesProd].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
      const totalGeneral = Number(ordenadas[ordenadas.length - 1]?.acumulado_tm) || 0
      const meta = barco.metas_json?.limites?.[producto.codigo] || 0
      const cumplimiento = meta > 0 ? ((totalGeneral / meta) * 100).toFixed(1) : 'N/A'
      
      let flujoPromedio = 0
      if (ordenadas.length >= 2) {
        const primera = ordenadas[0]
        const ultima = ordenadas[ordenadas.length - 1]
        const horas = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
        if (horas > 0) {
          flujoPromedio = (totalGeneral - (Number(ordenadas[0]?.acumulado_tm) || 0)) / horas
        }
      }
      
      resumenData.push([
        `${producto.nombre} (${producto.codigo})`,
        totalGeneral.toFixed(3),
        meta.toFixed(3),
        cumplimiento + (cumplimiento !== 'N/A' ? '%' : ''),
        flujoPromedio.toFixed(3)
      ])
    })
    
    resumenData.push([])
    const totalParos = registrosParos.length
    const totalMinutosParos = registrosParos.reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
    resumenData.push(['RESUMEN DE PAROS'])
    resumenData.push(['Total Paros', totalParos])
    resumenData.push(['Tiempo Total en Paros', `${Math.floor(totalMinutosParos / 60)}h ${totalMinutosParos % 60}m`])
    resumenData.push(['En Curso', registrosParos.filter(r => !r.hora_fin).length])
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
    
    productos.forEach(producto => {
      const exportacionesProd = exportaciones
        .filter(e => e.producto_id === producto.id)
        .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
      
      if (exportacionesProd.length === 0) return
      
      const cargaData = []
      cargaData.push(['REGISTROS DE CARGA -', producto.nombre])
      cargaData.push([])
      cargaData.push(['#', 'Fecha', 'Hora', 'Turno', 'Acumulado (TM)', 'Bodega', 'Flujo (TM/h)', 'Delta (TM)', 'Observaciones'])
      
      exportacionesProd.forEach((exp, index) => {
        const fechaSV = formatUTCToSV(exp.fecha_hora, 'DD/MM/YYYY')
        const horaSV = formatUTCToSV(exp.fecha_hora, 'HH:mm')
        const horaNum = parseInt(horaSV.split(':')[0])
        
        let turno = '—'
        if (horaNum >= 6 && horaNum < 18) {
          turno = '6:00 - 18:00'
        } else {
          turno = '18:00 - 6:00'
        }
        
        const bodega = BODEGAS_BARCO.find(b => b.id === exp.bodega_id)
        
        let flujo = 0
        let delta = 0
        if (index > 0) {
          const anterior = exportacionesProd[index - 1]
          const tiempoHoras = (new Date(exp.fecha_hora) - new Date(anterior.fecha_hora)) / (1000 * 60 * 60)
          delta = Number(exp.acumulado_tm) - Number(anterior.acumulado_tm)
          if (tiempoHoras > 0 && delta > 0) {
            flujo = delta / tiempoHoras
          }
        }
        
        cargaData.push([
          index + 1,
          fechaSV,
          horaSV,
          turno,
          (exp.acumulado_tm || 0).toFixed(3),
          bodega ? `${bodega.nombre} (${bodega.codigo})` : '—',
          flujo > 0 ? flujo.toFixed(3) : '—',
          delta > 0 ? delta.toFixed(3) : '—',
          exp.observaciones || ''
        ])
      })
      
      const wsCarga = XLSX.utils.aoa_to_sheet(cargaData)
      XLSX.utils.book_append_sheet(wb, wsCarga, `Carga ${producto.codigo}`)
    })
    
    if (registrosParos.length > 0) {
      const parosData = []
      parosData.push(['REGISTRO DE PAROS'])
      parosData.push([])
      parosData.push(['Fecha', 'Hora Inicio', 'Hora Fin', 'Turno', 'Tipo', 'Grupo', 'Duración', 'Observaciones'])
      
      registrosParos.forEach(reg => {
        const tipo = catalogosParos.find(t => t.id === reg.tipo_paro_id)
        const config = getTiposParoConfig()[tipo?.nombre || '']
        
        const horaInicioNum = parseInt(reg.hora_inicio?.split(':')[0] || '0')
        let turno = '—'
        if (horaInicioNum >= 6 && horaInicioNum < 18) {
          turno = '6:00 - 18:00'
        } else {
          turno = '18:00 - 6:00'
        }
        
        let duracion = reg.duracion_minutos 
          ? `${Math.floor(reg.duracion_minutos / 60)}h ${reg.duracion_minutos % 60}m`
          : 'En curso'
        
        parosData.push([
          reg.fecha,
          reg.hora_inicio?.slice(0, 5) || '—',
          reg.hora_fin?.slice(0, 5) || '—',
          turno,
          tipo?.nombre || '—',
          config?.grupo || '—',
          duracion,
          reg.observaciones || ''
        ])
      })
      
      const wsParos = XLSX.utils.aoa_to_sheet(parosData)
      XLSX.utils.book_append_sheet(wb, wsParos, 'Paros')
    }
    
    const fileName = `Exportacion_${barco.nombre}_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`
    XLSX.writeFile(wb, fileName)
    
    toast.success('Excel descargado correctamente', { id: 'excel' })
  } catch (error) {
    console.error('Error exportando a Excel:', error)
    toast.error('Error al generar Excel', { id: 'excel' })
  }
}

// =====================================================
// FORMULARIO DE PAROS SIMPLE (SIN CRONÓMETRO)
// =====================================================
const FormularioParoSimple = ({ barco, catalogosParos, onSave, onCancel, paroEditando }) => {
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState(1)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    tipo_paro_id: paroEditando?.tipo_paro_id || '',
    fecha: paroEditando?.fecha || dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    hora_inicio: paroEditando?.hora_inicio?.slice(0, 5) || '',
    hora_fin: paroEditando?.hora_fin?.slice(0, 5) || '',
    observaciones: paroEditando?.observaciones || ''
  })

  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  useEffect(() => {
    if (paroEditando) {
      const tipo = catalogosParos.find(t => t.id === paroEditando.tipo_paro_id)
      setTipoSeleccionado(tipo)
      
      if (tipo) {
        const grupo = TIPOS_PARO_CONFIG[tipo.nombre]?.grupo || 'ALMAPAC'
        setGrupoSeleccionado(grupo)
      }
      setPaso(2)
    }
  }, [paroEditando, catalogosParos, TIPOS_PARO_CONFIG])

  const seleccionarGrupo = (grupo) => {
    setGrupoSeleccionado(grupo)
  }

  const seleccionarTipo = (tipo) => {
    setTipoSeleccionado(tipo)
    setFormData(prev => ({ ...prev, tipo_paro_id: tipo.id }))
    setPaso(2)
  }

  const volverAGrupos = () => {
    setGrupoSeleccionado(null)
  }

  const calcularDuracion = (inicio, fin) => {
    if (!inicio || !fin) return null
    const [hI, mI] = inicio.split(':').map(Number)
    const [hF, mF] = fin.split(':').map(Number)
    let minI = hI * 60 + mI, minF = hF * 60 + mF
    if (minF < minI) minF += 24 * 60
    return minF - minI
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')
      if (!formData.hora_inicio) { toast.error('Ingresa hora de inicio'); return }
      if (!formData.tipo_paro_id) { toast.error('Selecciona un tipo de paro'); return }

      const duracion = formData.hora_fin ? calcularDuracion(formData.hora_inicio, formData.hora_fin) : null
      const datos = {
        barco_id: barco.id, 
        tipo_paro_id: parseInt(formData.tipo_paro_id),
        fecha: formData.fecha, 
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null, 
        duracion_minutos: duracion,
        observaciones: formData.observaciones || null,
        created_by: user.id, 
        updated_by: user.id
      }

      let result
      if (paroEditando) {
        result = await supabase.from('registro_paros').update(datos).eq('id', paroEditando.id)
        if (!result.error) toast.success('Paro actualizado')
      } else {
        result = await supabase.from('registro_paros').insert([datos])
        if (!result.error) toast.success('Paro registrado')
      }
      
      if (result.error) throw result.error
      onSave()
    } catch (error) { 
      console.error('❌ Error:', error)
      toast.error(error.message) 
    } finally { setLoading(false) }
  }

  const tiposPorGrupo = {
    ALMAPAC: [],
    UPDP: [],
    OTRAS: []
  }

  catalogosParos.forEach(tipo => {
    const grupo = TIPOS_PARO_CONFIG[tipo.nombre]?.grupo || 'ALMAPAC'
    if (grupo === 'UPDP') {
      tiposPorGrupo.UPDP.push(tipo)
    } else if (grupo === 'OTRAS') {
      tiposPorGrupo.OTRAS.push(tipo)
    } else {
      tiposPorGrupo.ALMAPAC.push(tipo)
    }
  })

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PauseCircle className="w-5 h-5 text-red-400" />
          {paroEditando ? 'Editar Paro' : 'Registrar Nuevo Paro'}
        </h2>
        {paroEditando && onCancel && (
          <button onClick={onCancel} className="text-sm text-slate-400 hover:text-white">
            Cancelar edición
          </button>
        )}
      </div>

      {paso === 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">SELECCIONA EL TIPO DE PARO</p>
          
          {!grupoSeleccionado ? (
            <div className="space-y-2">
              <button 
                onClick={() => seleccionarGrupo('ALMAPAC')}
                className="w-full p-4 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">📦</span>
                  </div>
                  <span className="font-bold text-white">PAROS ALMAPAC</span>
                  {tiposPorGrupo.ALMAPAC.length > 0 && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                      {tiposPorGrupo.ALMAPAC.length}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </button>

              <button 
                onClick={() => seleccionarGrupo('UPDP')}
                className="w-full p-4 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-lg">⚡</span>
                  </div>
                  <span className="font-bold text-white">PAROS UPDP</span>
                  {tiposPorGrupo.UPDP.length > 0 && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                      {tiposPorGrupo.UPDP.length}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </button>

              <button 
                onClick={() => seleccionarGrupo('OTRAS')}
                className="w-full p-4 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-lg">🌊</span>
                  </div>
                  <span className="font-bold text-white">PAROS POR OTRAS CAUSAS</span>
                  {tiposPorGrupo.OTRAS.length > 0 && (
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                      {tiposPorGrupo.OTRAS.length}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </button>
            </div>
          ) : (
            <div>
              <button 
                onClick={volverAGrupos}
                className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-medium mb-4"
              >
                ← Volver a grupos
              </button>

              <h3 className="text-sm font-bold mb-3 px-1" style={{
                color: grupoSeleccionado === 'ALMAPAC' ? '#60a5fa' : grupoSeleccionado === 'UPDP' ? '#4ade80' : '#c084fc'
              }}>
                {grupoSeleccionado === 'ALMAPAC' ? '📦 PAROS ALMAPAC' : grupoSeleccionado === 'UPDP' ? '⚡ PAROS UPDP' : '🌊 PAROS POR OTRAS CAUSAS'}
              </h3>

              {tiposPorGrupo[grupoSeleccionado].length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                  {tiposPorGrupo[grupoSeleccionado].map(tipo => {
                    const config = TIPOS_PARO_CONFIG[tipo.nombre] || {
                      bg: 'bg-gray-500/10', 
                      icono: <AlertTriangle className="w-4 h-4 text-gray-400" />,
                      text: 'text-gray-400'
                    }
                    return (
                      <button key={tipo.id} onClick={() => seleccionarTipo(tipo)}
                        className="p-3 rounded-xl border border-white/10 bg-slate-900 text-left hover:border-orange-500/40 flex items-center gap-3 transition-all"
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                          <span className={config.text}>{config.icono}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">{tipo.nombre}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No hay tipos de paro en este grupo</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <button type="button" onClick={() => { setPaso(1); setTipoSeleccionado(null); setGrupoSeleccionado(null); }}
            className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-medium">
            ← Volver a tipos
          </button>

          <div className="bg-slate-900 rounded-xl p-3 border border-orange-500/20">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Tipo seleccionado</p>
            <div className="flex items-center gap-2 flex-wrap">
              {tipoSeleccionado && (
                <>
                  {TIPOS_PARO_CONFIG[tipoSeleccionado.nombre] && (
                    <span className={TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].text}>
                      {TIPOS_PARO_CONFIG[tipoSeleccionado.nombre].icono}
                    </span>
                  )}
                  <span className="font-bold text-white text-sm">{tipoSeleccionado.nombre}</span>
                </>
              )}
              {grupoSeleccionado && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-slate-300 ml-auto">
                  {grupoSeleccionado}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Fecha</label>
            <input type="date" value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Inicio</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_inicio}
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" required />
                <button type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hora_inicio: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))}
                  className="px-2.5 py-2.5 rounded-xl flex-shrink-0 bg-green-500/20 hover:bg-green-500/30 text-green-400"
                  title="Ahora">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Hora Fin</label>
              <div className="flex gap-2">
                <input type="time" value={formData.hora_fin}
                  onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-3 text-white text-sm" />
                <button type="button"
                  onClick={() => setFormData(prev => ({ ...prev, hora_fin: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm') }))}
                  className="px-2.5 py-2.5 rounded-xl flex-shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  title="Ahora">
                  <StopCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Observaciones</label>
            <textarea value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows="2"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white resize-none text-sm"
              placeholder="Detalles adicionales (opcional)" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel || (() => { setPaso(1); setTipoSeleccionado(null); setGrupoSeleccionado(null); })}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {paroEditando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// =====================================================
// TARJETA DE PARO COMPACTA (para lista desplegable)
// =====================================================
const ParoCardCompact = ({ paro, catalogosParos, onEditar, onEliminar }) => {
  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  const tipo = catalogosParos.find(t => t.id === paro.tipo_paro_id)
  const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {
    bg: 'bg-slate-800', icono: <AlertTriangle className="w-4 h-4 text-slate-400" />, border: 'border-slate-700', text: 'text-slate-400'
  }
  const grupo = config.grupo || 'ALMAPAC'

  let grupoColor = 'bg-blue-500/20 text-blue-400'
  if (grupo === 'UPDP') grupoColor = 'bg-green-500/20 text-green-400'
  if (grupo === 'OTRAS') grupoColor = 'bg-purple-500/20 text-purple-400'

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5 hover:border-orange-500/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${config.bg}`}>
            <span className={config.text}>{config.icono}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{tipo?.nombre || 'Desconocido'}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>{paro.fecha}</span>
              <span>{paro.hora_inicio?.slice(0, 5)}</span>
              {paro.hora_fin ? (
                <>
                  <span>→</span>
                  <span>{paro.hora_fin?.slice(0, 5)}</span>
                  <span className="text-orange-400 font-medium">
                    {Math.floor((paro.duracion_minutos || 0) / 60)}h {(paro.duracion_minutos || 0) % 60}m
                  </span>
                </>
              ) : (
                <span className="text-blue-400 animate-pulse">● En curso</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-2">
          <button 
            onClick={() => onEditar(paro)}
            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => onEliminar(paro.id)}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {paro.observaciones && (
        <p className="text-xs text-slate-400 mt-2 pl-7 border-l-2 border-slate-600 ml-1">
          {paro.observaciones}
        </p>
      )}
    </div>
  )
}

// =====================================================
// LISTA DE PAROS DESPLEGABLE (ACCORDION)
// =====================================================
const ListaParosDesplegable = ({ registrosParos, catalogosParos, onEditar, onEliminar }) => {
  const [gruposExpandidos, setGruposExpandidos] = useState({
    ALMAPAC: true,
    UPDP: false,
    OTRAS: false
  })

  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  // Agrupar paros por grupo
  const parosPorGrupo = {
    ALMAPAC: [],
    UPDP: [],
    OTRAS: []
  }

  registrosParos.forEach(paro => {
    const tipo = catalogosParos.find(t => t.id === paro.tipo_paro_id)
    const grupo = TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo || 'ALMAPAC'
    
    if (grupo === 'UPDP') {
      parosPorGrupo.UPDP.push(paro)
    } else if (grupo === 'OTRAS') {
      parosPorGrupo.OTRAS.push(paro)
    } else {
      parosPorGrupo.ALMAPAC.push(paro)
    }
  })

  // Calcular estadísticas por grupo
  const getEstadisticasGrupo = (paros) => {
    const totalMinutos = paros.reduce((sum, p) => sum + (p.duracion_minutos || 0), 0)
    const enCurso = paros.filter(p => !p.hora_fin).length
    return { totalMinutos, enCurso }
  }

  const toggleGrupo = (grupo) => {
    setGruposExpandidos(prev => ({ ...prev, [grupo]: !prev[grupo] }))
  }

  const gruposConfig = {
    ALMAPAC: {
      titulo: '📦 PAROS ALMAPAC',
      color: 'from-blue-600 to-blue-800',
      bgHover: 'hover:bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      icono: <Wrench className="w-4 h-4" />
    },
    UPDP: {
      titulo: '⚡ PAROS UPDP',
      color: 'from-green-600 to-green-800',
      bgHover: 'hover:bg-green-500/10',
      borderColor: 'border-green-500/30',
      icono: <Zap className="w-4 h-4" />
    },
    OTRAS: {
      titulo: '🌊 PAROS POR OTRAS CAUSAS',
      color: 'from-purple-600 to-purple-800',
      bgHover: 'hover:bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      icono: <CloudRain className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-3">
      {Object.keys(parosPorGrupo).map(grupo => {
        const paros = parosPorGrupo[grupo]
        if (paros.length === 0) return null
        
        const estadisticas = getEstadisticasGrupo(paros)
        const config = gruposConfig[grupo]
        const expandido = gruposExpandidos[grupo]

        return (
          <div key={grupo} className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => toggleGrupo(grupo)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-all ${config.bgHover}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-gradient-to-r ${config.color}`}>
                  {config.icono}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-white text-sm">{config.titulo}</h3>
                  <div className="flex gap-3 text-[10px] text-slate-400 mt-0.5">
                    <span>{paros.length} paros</span>
                    {estadisticas.totalMinutos > 0 && (
                      <span>⏱️ {Math.floor(estadisticas.totalMinutos / 60)}h {estadisticas.totalMinutos % 60}m</span>
                    )}
                    {estadisticas.enCurso > 0 && (
                      <span className="text-yellow-400">🟡 {estadisticas.enCurso} en curso</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-slate-500">
                {expandido ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </button>

            {expandido && (
              <div className="p-3 border-t border-white/10">
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {paros.map(paro => (
                    <ParoCardCompact
                      key={paro.id}
                      paro={paro}
                      catalogosParos={catalogosParos}
                      onEditar={onEditar}
                      onEliminar={onEliminar}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// =====================================================
// DASHBOARD DE PAROS
// =====================================================
const DashboardParos = ({ barco, registrosParos, catalogosParos, onClose }) => {

  const TIPOS_PARO_CONFIG = getTiposParoConfig()

  const grupos = {
    ALMAPAC: registrosParos.filter(r => {
      const tipo = catalogosParos.find(t => t.id === r.tipo_paro_id)
      const grupo = TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo
      return grupo === 'ALMAPAC' || !grupo
    }),
    UPDP: registrosParos.filter(r => {
      const tipo = catalogosParos.find(t => t.id === r.tipo_paro_id)
      return TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo === 'UPDP'
    }),
    OTRAS: registrosParos.filter(r => {
      const tipo = catalogosParos.find(t => t.id === r.tipo_paro_id)
      return TIPOS_PARO_CONFIG[tipo?.nombre || '']?.grupo === 'OTRAS'
    })
  }

  const totalesGrupo = {}
  Object.keys(grupos).forEach(grupo => {
    totalesGrupo[grupo] = grupos[grupo].reduce((sum, r) => sum + (r.duracion_minutos || 0), 0)
  })

  const totalGeneral = Object.values(totalesGrupo).reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="text-base font-black text-white">Dashboard de Paros</h2>
                <p className="text-purple-200 text-xs">{barco.nombre}</p>
              </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">Total Paros</p>
              <p className="text-xl font-black text-white mt-1">{registrosParos.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">Tiempo Total</p>
              <p className="text-xl font-black text-white mt-1">
                {Math.floor(totalGeneral / 60)}h {totalGeneral % 60}m
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-3">
              <p className="text-white/70 text-[10px] uppercase tracking-wide">En curso</p>
              <p className="text-xl font-black text-white mt-1">
                {registrosParos.filter(r => !r.hora_fin).length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
            <h3 className="font-bold text-white mb-3 text-xs uppercase tracking-wide">Distribución por Grupo</h3>
            <div className="space-y-3">
              {Object.keys(grupos).map(grupo => {
                let color = 'bg-blue-500', textColor = 'text-blue-400'
                if (grupo === 'UPDP') { color = 'bg-green-500'; textColor = 'text-green-400' }
                if (grupo === 'OTRAS') { color = 'bg-purple-500'; textColor = 'text-purple-400' }

                return (
                  <div key={grupo}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">
                        {grupo === 'ALMAPAC' ? 'ALMAPAC' : grupo === 'UPDP' ? 'UPDP' : 'OTRAS CAUSAS'}
                      </span>
                      <span className={`font-bold ${textColor}`}>
                        {Math.floor(totalesGrupo[grupo] / 60)}h {totalesGrupo[grupo] % 60}m
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`}
                        style={{ width: totalGeneral > 0 ? `${(totalesGrupo[grupo] / totalGeneral) * 100}%` : '0%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {Object.keys(grupos).map(grupo => {
            if (grupos[grupo].length === 0) return null

            let headerColor = 'bg-blue-500/10 text-blue-400'
            if (grupo === 'UPDP') headerColor = 'bg-green-500/10 text-green-400'
            if (grupo === 'OTRAS') headerColor = 'bg-purple-500/10 text-purple-400'

            return (
              <div key={grupo} className="bg-slate-900 rounded-xl overflow-hidden border border-white/10">
                <div className={`${headerColor} px-4 py-3 border-b border-white/10 flex items-center gap-2`}>
                  <h3 className="font-bold text-xs">
                    {grupo === 'ALMAPAC' ? 'PAROS ALMAPAC' : grupo === 'UPDP' ? 'PAROS UPDP' : 'PAROS POR OTRAS CAUSAS'}
                  </h3>
                  <span className="text-xs ml-auto">{grupos[grupo].length} paros</span>
                </div>
                <div className="p-4 space-y-3">
                  {grupos[grupo].map(reg => {
                    const tipo = catalogosParos.find(t => t.id === reg.tipo_paro_id)
                    const config = TIPOS_PARO_CONFIG[tipo?.nombre || ''] || {}
                    return (
                      <div key={reg.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={config.text || 'text-slate-400'}>{config.icono}</span>
                            <span className="text-xs text-white">{tipo?.nombre}</span>
                          </div>
                          <span className="text-xs text-orange-400 font-bold">
                            {reg.duracion_minutos ? `${Math.floor(reg.duracion_minutos / 60)}h ${reg.duracion_minutos % 60}m` : 'En curso'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {reg.fecha} {reg.hora_inicio} {reg.hora_fin && `→ ${reg.hora_fin}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {registrosParos.length === 0 && (
            <div className="bg-slate-900 rounded-xl p-10 text-center">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">No hay paros registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function ExportacionPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [productos, setProductos] = useState([])
  const [exportaciones, setExportaciones] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [catalogosParos, setCatalogosParos] = useState([])
  const [registrosParos, setRegistrosParos] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [user, setUser] = useState(null)
  
  const [showParoModal, setShowParoModal] = useState(false)
  const [showParosDashboard, setShowParosDashboard] = useState(false)
  const [paroEditando, setParoEditando] = useState(null)
  
  const [nuevaExportacion, setNuevaExportacion] = useState({
    fecha_hora: '',
    acumulado_tm: '',
    bodega_id: '',
    observaciones: ''
  })

  const [bitacoraActual, setBitacoraActual] = useState({
    fecha_hora: '',
    comentarios: ''
  })

  const [editandoExportacion, setEditandoExportacion] = useState(null)
  const [editandoBitacora, setEditandoBitacora] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    setUser(currentUser)
    cargarDatos()
  }, [token])

  useEffect(() => {
    if (productos.length > 0 && !productoActivo) {
      setProductoActivo(productos[0])
      setNuevaExportacion(prev => ({
        ...prev,
        fecha_hora: getCurrentSVTimeForInput()
      }))
    }
  }, [productos])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*, tiempo_arribo, tiempo_ataque, tiempo_recibido, tiempo_arribo_editado, tiempo_ataque_editado, tiempo_recibido_editado, operacion_iniciada_at, operacion_finalizada_at, operacion_iniciada_por, operacion_finalizada_por, operacion_motivo_finalizacion, operacion_iniciada_editado, operacion_finalizada_editado')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        toast.error('Link inválido')
        return
      }

      setBarco(barcoData)

      const { data: catalogosData } = await supabase
        .from('catalogos_paros')
        .select('*')
        .eq('activo', true)
        .order('orden')
      setCatalogosParos(catalogosData || [])

      const { data: parosData } = await supabase
        .from('registro_paros')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })
      setRegistrosParos(parosData || [])

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

      const { data: exportData } = await supabase
        .from('exportacion_banda')
        .select(`
          *,
          producto:producto_id(id, codigo, nombre, icono)
        `)
        .eq('barco_id', barcoData.id)
        .order('fecha_hora', { ascending: false })

      setExportaciones(exportData || [])

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

  const handleParoRegistrado = async () => {
    await cargarDatos()
  }

  const handleNuevoParo = () => {
    setParoEditando(null)
    setShowParoModal(true)
  }

  const handleEditarParo = (paro) => {
    setParoEditando(paro)
    setShowParoModal(true)
  }

  const handleEliminarParo = async (id) => {
    if (!confirm('¿Eliminar este paro?')) return
    try {
      const { error } = await supabase.from('registro_paros').delete().eq('id', id)
      if (error) throw error
      toast.success('Paro eliminado')
      await cargarDatos()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const handleGuardarParo = async () => {
    setShowParoModal(false)
    setParoEditando(null)
    await cargarDatos()
  }

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

    const ultimoRegistro = ordenadas[ordenadas.length - 1]
    const totalGeneral = Number(ultimoRegistro.acumulado_tm) || 0

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const horasTranscurridas = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
    const flujoPromedio = horasTranscurridas > 0 ? totalGeneral / horasTranscurridas : 0

    return {
      totalTM: totalGeneral,
      lecturas: exportacionesProd.length,
      primeraLectura: primera,
      ultimaLectura: ultima,
      flujoPromedio
    }
  }, [exportaciones, productoActivo])

  const calcularFlujoBandaPorHora = useMemo(() => {
    if (!productoActivo) return 0

    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)

    if (exportacionesProd.length < 2) return 0

    const ordenadas = [...exportacionesProd].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    )

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const diferenciaHoras =
      (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)

    if (diferenciaHoras <= 0) return 0

    const acumuladoInicial = Number(primera.acumulado_tm) || 0
    const acumuladoFinal = Number(ultima.acumulado_tm) || 0

    const deltaAcumulado = acumuladoFinal - acumuladoInicial

    if (deltaAcumulado <= 0) return 0

    return deltaAcumulado / diferenciaHoras
  }, [exportaciones, productoActivo])

  // =====================================================
  // DATOS PARA GRÁFICA POR BODEGA (NUEVO)
  // =====================================================
  const datosGraficoPorBodega = useMemo(() => {
    if (!productoActivo) return []

    const exportacionesProd = exportaciones
      .filter(e => e.producto_id === productoActivo.id)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))

    // Crear un mapa para acumular por bodega a lo largo del tiempo
    const puntosPorHora = new Map() // key: timestamp redondeado a hora, value: objeto con acumulados por bodega
    
    exportacionesProd.forEach(exp => {
      const fecha = new Date(exp.fecha_hora)
      // Redondear a la hora (sin minutos)
      const horaKey = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours(), 0, 0).getTime()
      const horaStr = formatUTCToSV(exp.fecha_hora, 'DD/MM HH:00')
      
      if (!puntosPorHora.has(horaKey)) {
        puntosPorHora.set(horaKey, {
          hora: horaStr,
          timestamp: horaKey,
          // Inicializar acumulados por bodega
          ...BODEGAS_BARCO.reduce((acc, b) => ({ ...acc, [`bodega_${b.id}`]: 0 }), {})
        })
      }
      
      const punto = puntosPorHora.get(horaKey)
      const bodegaId = exp.bodega_id
      const acumuladoActual = Number(exp.acumulado_tm) || 0
      
      // Actualizar el acumulado de esta bodega (tomar el máximo/último de esa hora)
      if (acumuladoActual > punto[`bodega_${bodegaId}`]) {
        punto[`bodega_${bodegaId}`] = acumuladoActual
      }
    })
    
    // Convertir a array y ordenar por timestamp
    return Array.from(puntosPorHora.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [exportaciones, productoActivo])

  // =====================================================
  // LÓGICA CORREGIDA PARA RESUMEN POR BODEGA
  // CADA BODEGA MANTIENE SU ACUMULADO INDEPENDIENTE
  // EL ACUMULADO GLOBAL ES LA SUMA DE LOS ACUMULADOS DE CADA BODEGA
  // =====================================================
  
  // Primero, calcular los acumulados por bodega (independientes)
  const acumuladosPorBodega = useMemo(() => {
    if (!productoActivo) return new Map()
    
    const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
    const ordenadas = [...exportacionesProd].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
    
    // Mapa para almacenar el ÚLTIMO acumulado registrado para cada bodega
    const ultimoAcumuladoPorBodega = new Map()
    
    // Recorrer todas las lecturas en orden cronológico
    ordenadas.forEach(lectura => {
      const bodegaId = lectura.bodega_id
      const acumuladoLeido = Number(lectura.acumulado_tm) || 0
      
      // Simplemente actualizar el último valor registrado para esta bodega
      // Esto permite que cuando se vuelva a una bodega, se retome desde donde quedó
      ultimoAcumuladoPorBodega.set(bodegaId, acumuladoLeido)
    })
    
    return ultimoAcumuladoPorBodega
  }, [exportaciones, productoActivo])
  
  // Calcular el total global como la SUMA de los acumulados de todas las bodegas
  const totalGeneral = useMemo(() => {
    let suma = 0
    acumuladosPorBodega.forEach((valor) => {
      suma += valor
    })
    return suma
  }, [acumuladosPorBodega])
  
  // Construir el resumen por bodega con los acumulados actuales
  const resumenPorBodega = useMemo(() => {
    if (!productoActivo) return []
    
    const resultado = []
    acumuladosPorBodega.forEach((acumulado, bodegaId) => {
      const bodegaInfo = BODEGAS_BARCO.find(b => b.id === bodegaId)
      resultado.push({
        bodega_id: bodegaId,
        nombre: bodegaInfo?.nombre || `Bodega ${bodegaId}`,
        codigo: bodegaInfo?.codigo || `BDG-${bodegaId}`,
        color: bodegaInfo?.color || '#3b82f6',
        acumuladoActual: acumulado, // Este es el acumulado INDEPENDIENTE de la bodega
        // Determinar si es la bodega activa (último registro)
        activa: (() => {
          const exportacionesProd = exportaciones.filter(e => e.producto_id === productoActivo.id)
          if (exportacionesProd.length === 0) return false
          const ordenadas = [...exportacionesProd].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
          const ultimoRegistro = ordenadas[ordenadas.length - 1]
          return ultimoRegistro?.bodega_id === bodegaId
        })(),
        lecturas: exportaciones.filter(e => e.producto_id === productoActivo.id && e.bodega_id === bodegaId).length
      })
    })
    
    return resultado.sort((a, b) => b.acumuladoActual - a.acumuladoActual)
  }, [acumuladosPorBodega, exportaciones, productoActivo])
  
  // Calcular el flujo para cada bodega
  // Flujo = Acumulado Global - Acumulado de la bodega actual (para la bodega activa)
  // Para bodegas inactivas, el flujo es su propio acumulado
  const flujoPorBodega = useMemo(() => {
    return resumenPorBodega.map(bodega => {
      let flujo = 0
      if (bodega.activa) {
        // Para la bodega activa: FLUJO = Acumulado Global - Acumulado de esta bodega
        flujo = Math.max(0, totalGeneral - bodega.acumuladoActual)
      } else {
        // Para bodegas ya terminadas: FLUJO = Acumulado de la bodega (ya terminaron)
        flujo = bodega.acumuladoActual
      }
      
      return {
        ...bodega,
        flujo: flujo
      }
    })
  }, [resumenPorBodega, totalGeneral])

  const faltaPorCargar = useMemo(() => {
    if (!productoActivo || !barco?.metas_json?.limites?.[productoActivo.codigo]) return 0
    
    const limite = barco.metas_json.limites[productoActivo.codigo]
    const cargado = totalGeneral
    
    return Math.max(0, limite - cargado)
  }, [productoActivo, barco, totalGeneral])

  const cambiarProducto = (producto) => {
    setProductoActivo(producto)
    setNuevaExportacion({
      fecha_hora: getCurrentSVTimeForInput(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getCurrentSVTimeForInput(),
      comentarios: ''
    })
    setEditandoExportacion(null)
    setEditandoBitacora(null)
  }

  const handleExportacionChange = (e) => {
    const { name, value } = e.target
    setNuevaExportacion(prev => ({ ...prev, [name]: value }))
  }

  const handleBitacoraChange = (e) => {
    const { name, value } = e.target
    setBitacoraActual(prev => ({ ...prev, [name]: value }))
  }

  const handleGuardarExportacion = async () => {
    try {
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

      const fechaUTC = svToUTC(nuevaExportacion.fecha_hora)

      const datos = {
        barco_id: barco.id,
        fecha_hora: fechaUTC,
        producto_id: productoActivo.id,
        acumulado_tm: parseFloat(nuevaExportacion.acumulado_tm),
        bodega_id: parseInt(nuevaExportacion.bodega_id),
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

      setNuevaExportacion({
        fecha_hora: getCurrentSVTimeForInput(),
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

  const handleGuardarBitacora = async () => {
    try {
      if (!productoActivo) {
        toast.error('Selecciona un producto')
        return
      }

      if (!bitacoraActual.fecha_hora) {
        toast.error('Ingresa fecha y hora')
        return
      }

      const fechaUTC = svToUTC(bitacoraActual.fecha_hora)

      const datos = {
        barco_id: barco.id,
        fecha_hora: fechaUTC,
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
        fecha_hora: getCurrentSVTimeForInput(),
        comentarios: ''
      })

      await cargarDatos()

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
    }
  }

  const handleEditarExportacion = (exp) => {
    setEditandoExportacion(exp)
    setNuevaExportacion({
      fecha_hora: formatUTCToSV(exp.fecha_hora, 'YYYY-MM-DDTHH:mm'),
      acumulado_tm: exp.acumulado_tm,
      bodega_id: exp.bodega_id || '',
      observaciones: exp.observaciones || ''
    })
  }

  const handleEditarBitacora = (reg) => {
    setEditandoBitacora(reg)
    setBitacoraActual({
      fecha_hora: formatUTCToSV(reg.fecha_hora, 'YYYY-MM-DDTHH:mm'),
      comentarios: reg.comentarios || ''
    })
  }

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
          fecha_hora: getCurrentSVTimeForInput(),
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
          fecha_hora: getCurrentSVTimeForInput(),
          comentarios: ''
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al eliminar')
    }
  }

  const cancelarEdicion = () => {
    setEditandoExportacion(null)
    setEditandoBitacora(null)
    setNuevaExportacion({
      fecha_hora: getCurrentSVTimeForInput(),
      acumulado_tm: '',
      bodega_id: '',
      observaciones: ''
    })
    setBitacoraActual({
      fecha_hora: getCurrentSVTimeForInput(),
      comentarios: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">El link no es válido</p>
        </div>
      </div>
    )
  }

  if (barco.tipo_operacion !== 'exportacion') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
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

  // Generar líneas para la gráfica por bodega
  const lineasGrafica = BODEGAS_BARCO.filter(bodega => {
    // Solo mostrar bodegas que tienen datos
    return resumenPorBodega.some(rb => rb.bodega_id === bodega.id) || 
           exportacionesFiltradas.some(e => e.bodega_id === bodega.id)
  }).map(bodega => {
    const bodegaInfo = resumenPorBodega.find(rb => rb.bodega_id === bodega.id)
    return (
      <Line
        key={bodega.id}
        type="monotone"
        dataKey={`bodega_${bodega.id}`}
        name={`${bodega.nombre} (${bodega.codigo}) - ${bodegaInfo?.acumuladoActual?.toFixed(1) || 0} TM`}
        stroke={bodega.color}
        strokeWidth={2}
        dot={{ r: 3, fill: bodega.color }}
        activeDot={{ r: 5 }}
      />
    )
  })

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
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
                    : barco.estado === 'finalizado'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {barco.estado === 'activo' && <Play className="w-3 h-3" />}
                  {barco.estado === 'finalizado' && <Lock className="w-3 h-3" />}
                  {barco.estado === 'planeado' && <Clock className="w-3 h-3" />}
                  {barco.estado.toUpperCase()}
                </span>
              </div>
              <p className="text-blue-200 text-sm mt-1">
                Registro de Carga a Bodega del Barco por Banda · {formatUTCToSV(new Date(), 'DD/MM/YYYY')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportToExcel(barco, exportaciones, productos, registrosParos, catalogosParos)}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Excel
              </button>
              <button
                onClick={() => setShowParosDashboard(true)}
                className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard Paros
              </button>
              <button
                onClick={cargarDatos}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 ${
              barco.operacion_iniciada_at 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-yellow-500/20 border border-yellow-500/30 animate-pulse'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  barco.operacion_iniciada_at ? 'bg-green-500/30' : 'bg-yellow-500/30'
                }`}>
                  <Play className={`w-5 h-5 ${
                    barco.operacion_iniciada_at ? 'text-green-400' : 'text-yellow-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">INICIO DE CARGA</p>
                    {!barco.operacion_iniciada_at && (
                      <span className="text-[10px] bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                        PENDIENTE
                      </span>
                    )}
                  </div>
                  {barco.operacion_iniciada_at ? (
                    <div>
                      <p className="text-lg font-black text-green-400">
                        {formatUTCToSV(barco.operacion_iniciada_at, 'DD/MM/YY HH:mm')}
                      </p>
                      {barco.operacion_iniciada_por && (
                        <p className="text-xs text-green-300">
                          Iniciado por: ID {barco.operacion_iniciada_por}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-400 font-medium">
                      La carga aún no ha iniciado
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${
              barco.operacion_finalizada_at 
                ? 'bg-red-500/20 border border-red-500/30' 
                : barco.operacion_iniciada_at && !barco.operacion_finalizada_at
                ? 'bg-blue-500/20 border border-blue-500/30'
                : 'bg-slate-700/50 border border-white/10'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  barco.operacion_finalizada_at ? 'bg-red-500/30' 
                  : barco.operacion_iniciada_at && !barco.operacion_finalizada_at ? 'bg-blue-500/30'
                  : 'bg-slate-600'
                }`}>
                  <StopCircle className={`w-5 h-5 ${
                    barco.operacion_finalizada_at ? 'text-red-400' 
                    : barco.operacion_iniciada_at && !barco.operacion_finalizada_at ? 'text-blue-400'
                    : 'text-slate-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">FIN DE CARGA</p>
                    {barco.operacion_finalizada_at && (
                      <span className="text-[10px] bg-red-500/30 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        FINALIZADO
                      </span>
                    )}
                    {!barco.operacion_finalizada_at && barco.operacion_iniciada_at && (
                      <span className="text-[10px] bg-blue-500/30 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        EN CURSO
                      </span>
                    )}
                  </div>
                  {barco.operacion_finalizada_at ? (
                    <div>
                      <p className="text-lg font-black text-red-400">
                        {formatUTCToSV(barco.operacion_finalizada_at, 'DD/MM/YY HH:mm')}
                      </p>
                      {barco.operacion_motivo_finalizacion && (
                        <p className="text-xs text-red-300 mt-1">
                          Motivo: {barco.operacion_motivo_finalizacion}
                        </p>
                      )}
                    </div>
                  ) : barco.operacion_iniciada_at ? (
                    <p className="text-blue-400 font-medium">
                      Carga en progreso...
                    </p>
                  ) : (
                    <p className="text-slate-400 font-medium">
                      Esperando inicio de carga
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de productos */}
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

        {/* FORMULARIO DE PAROS SIMPLE - SIN CRONÓMETRO */}
        <FormularioParoSimple 
          barco={barco}
          catalogosParos={catalogosParos}
          onSave={handleParoRegistrado}
          onCancel={() => {}}
          paroEditando={null}
        />

        {/* LISTADO DE PAROS REGISTRADOS - VERSIÓN DESPLEGABLE */}
        {registrosParos.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold text-white">
                  Paros Registrados 
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    ({registrosParos.length} paros · 
                    {registrosParos.reduce((sum, p) => sum + (p.duracion_minutos || 0), 0) > 0 && (
                      ` ${Math.floor(registrosParos.reduce((sum, p) => sum + (p.duracion_minutos || 0), 0) / 60)}h ` +
                      `${registrosParos.reduce((sum, p) => sum + (p.duracion_minutos || 0), 0) % 60}m total`
                    )}
                    {registrosParos.filter(p => !p.hora_fin).length > 0 && (
                      ` · ${registrosParos.filter(p => !p.hora_fin).length} en curso`
                    )}
                  </span>
                </h2>
              </div>
            </div>
            
            <ListaParosDesplegable 
              registrosParos={registrosParos}
              catalogosParos={catalogosParos}
              onEditar={handleEditarParo}
              onEliminar={handleEliminarParo}
            />
          </div>
        )}

        {/* Advertencia de operación finalizada */}
        {barco.estado === 'finalizado' && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <p className="text-orange-400 font-medium">
                ⚠️ Operación finalizada - Puedes agregar datos adicionales si es necesario
              </p>
            </div>
          </div>
        )}

        {/* Estadísticas del producto */}
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
                  {totalGeneral.toFixed(3)} TM
                </p>
                <div className="flex gap-3 text-sm text-slate-400">
                  <span>📊 {estadisticasProducto.lecturas} lecturas</span>
                  <span>🏭 {resumenPorBodega.length} bodegas</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
              {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
                <>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Cantidad a Cargar</p>
                    <p className="text-xl font-bold text-white">
                      {barco.metas_json.limites[productoActivo.codigo].toFixed(3)} TM
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4">
                    <p className="text-xs text-slate-500">Cargado</p>
                    <p className="text-xl font-bold text-blue-400">
                      {totalGeneral.toFixed(3)} TM
                    </p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-xl p-4 border-2 border-orange-500/20">
                    <p className="text-xs text-slate-500">FALTA POR CARGAR</p>
                    <p className="text-2xl font-black text-orange-400">
                      {faltaPorCargar.toFixed(3)} TM
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {((totalGeneral / barco.metas_json.limites[productoActivo.codigo]) * 100).toFixed(1)}% completado
                    </p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-xl p-4 col-span-1">
                    <p className="text-xs text-slate-500">Progreso</p>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block text-green-400">
                            {((totalGeneral / barco.metas_json.limites[productoActivo.codigo]) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-700">
                        <div
                          style={{ width: `${Math.min(100, (totalGeneral / barco.metas_json.limites[productoActivo.codigo]) * 100)}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-green-400"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 col-span-2">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-blue-200" />
                  <div>
                    <p className="text-xs text-blue-200 uppercase font-bold">FLUJO PROMEDIO POR HORA</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {calcularFlujoBandaPorHora.toFixed(3)}
                      </span>
                      <span className="text-sm text-blue-200">TM/h</span>
                    </div>
                    {exportacionesFiltradas.length >= 2 && (
                      <p className="text-[10px] text-blue-300 mt-1">
                        {(() => {
                          const ordenadas = [...exportacionesFiltradas].sort(
                            (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
                          )
                          const primera = ordenadas[0]
                          const ultima = ordenadas[ordenadas.length - 1]
                          const horas = ((new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)).toFixed(1)
                          return `En ${horas} horas`
                        })()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
              <div className="mt-4 bg-slate-900 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-white">Progreso de Carga</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-400">
                      {totalGeneral.toFixed(1)} TM cargadas
                    </span>
                    <span className="text-xs text-orange-400 font-bold">
                      {faltaPorCargar.toFixed(1)} TM por cargar
                    </span>
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, (totalGeneral / barco.metas_json.limites[productoActivo.codigo]) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0 TM</span>
                  <span>{barco.metas_json.limites[productoActivo.codigo].toFixed(1)} TM</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NUEVA GRÁFICA POR BODEGA */}
        {productoActivo && datosGraficoPorBodega.length > 1 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Tendencia de Carga por Bodega - {productoActivo.nombre}
              <span className="text-sm font-normal text-slate-500 ml-2">
                Acumulado por bodega a lo largo del tiempo
              </span>
            </h3>
            
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={datosGraficoPorBodega} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hora" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} label={{ value: 'Toneladas (TM)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#94a3b8' }}
                    formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
                  />
                  {lineasGrafica}
                </ReLineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {resumenPorBodega.map(bodega => {
                const bodegaInfo = BODEGAS_BARCO.find(b => b.id === bodega.bodega_id)
                return (
                  <div key={bodega.bodega_id} className="bg-slate-900 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bodegaInfo?.color }} />
                      <span className="text-xs font-bold text-white">{bodega.nombre}</span>
                    </div>
                    <p className="text-sm font-bold text-blue-400">{bodega.acumuladoActual.toFixed(1)} TM</p>
                    <p className="text-[10px] text-slate-500">{bodega.lecturas} lecturas</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs text-slate-400 mb-2">📊 Interpretación de la gráfica:</p>
              <p className="text-xs text-slate-300">
                Cada línea representa el acumulado de una bodega a lo largo del tiempo. 
                Cuando se cambia de bodega, la línea de la bodega anterior se estabiliza y la nueva bodega comienza a crecer.
                El total global es la suma de todas las bodegas en cualquier momento.
              </p>
            </div>
          </div>
        )}

                {/* SECCIÓN CORREGIDA: RESUMEN POR BODEGA - VERSIÓN FINAL */}
        {productoActivo && resumenPorBodega.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-400" />
              Resumen por Bodega - {productoActivo.nombre}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumenPorBodega.map(bodega => {
                const bodegaInfo = BODEGAS_BARCO.find(b => b.id === bodega.bodega_id)
                
                // Calcular flujo REAL de la bodega activa (últimos registros)
                let flujoActual = 0
                let flujoPromedioHistorial = 0
                
                if (bodega.activa) {
                  // Para la bodega activa: calcular flujo con los últimos 2 registros de ESTA bodega
                  const lecturasBodega = exportacionesFiltradas
                    .filter(e => e.bodega_id === bodega.bodega_id)
                    .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
                  
                  if (lecturasBodega.length >= 2) {
                    const ultima = lecturasBodega[lecturasBodega.length - 1]
                    const anterior = lecturasBodega[lecturasBodega.length - 2]
                    const horas = (new Date(ultima.fecha_hora) - new Date(anterior.fecha_hora)) / (1000 * 60 * 60)
                    const delta = (Number(ultima.acumulado_tm) || 0) - (Number(anterior.acumulado_tm) || 0)
                    if (horas > 0 && delta > 0) {
                      flujoActual = delta / horas
                    }
                  }
                  
                  // Calcular flujo promedio histórico de esta bodega
                  if (lecturasBodega.length >= 2) {
                    const primera = lecturasBodega[0]
                    const ultima = lecturasBodega[lecturasBodega.length - 1]
                    const horasTotal = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
                    if (horasTotal > 0 && bodega.acumuladoActual > 0) {
                      flujoPromedioHistorial = bodega.acumuladoActual / horasTotal
                    }
                  }
                } else {
                  // Para bodegas inactivas: calcular su flujo promedio histórico (mientras estuvieron activas)
                  const lecturasBodega = exportacionesFiltradas
                    .filter(e => e.bodega_id === bodega.bodega_id)
                    .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
                  
                  if (lecturasBodega.length >= 2) {
                    const primera = lecturasBodega[0]
                    const ultima = lecturasBodega[lecturasBodega.length - 1]
                    const horasTotal = (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)
                    if (horasTotal > 0 && bodega.acumuladoActual > 0) {
                      flujoPromedioHistorial = bodega.acumuladoActual / horasTotal
                    }
                  }
                }
                
                return (
                  <div key={bodega.bodega_id} className={`bg-slate-900 rounded-xl p-4 border-2 transition-all ${
                    bodega.activa ? 'border-green-500/50 shadow-lg shadow-green-500/10' : 'border-white/10'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${bodega.activa ? 'bg-green-500/30 animate-pulse' : 'bg-green-500/20'}`}>
                        <Layers className={`w-4 h-4 ${bodega.activa ? 'text-green-300' : 'text-green-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{bodega.nombre}</p>
                        <p className="text-xs text-green-400">{bodega.codigo}</p>
                      </div>
                      {bodega.activa && (
                        <span className="ml-auto text-[10px] bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          ACTIVA
                        </span>
                      )}
                      {!bodega.activa && bodega.acumuladoActual > 0 && (
                        <span className="ml-auto text-[10px] bg-slate-500/30 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                          COMPLETADA
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">📦 Total cargado en bodega:</span>
                        <span className="font-bold text-blue-400">{bodega.acumuladoActual.toFixed(3)} TM</span>
                      </div>
                      
                      {bodega.activa && flujoActual > 0 && (
                        <div className="flex justify-between text-sm bg-blue-500/10 rounded-lg p-2 -mx-1">
                          <span className="text-blue-300">⚡ FLUJO ACTUAL:</span>
                          <span className="font-bold text-blue-400">{flujoActual.toFixed(3)} TM/h</span>
                        </div>
                      )}
                      
                      {flujoPromedioHistorial > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">📊 Flujo promedio histórico:</span>
                          <span className="font-bold text-cyan-400">{flujoPromedioHistorial.toFixed(3)} TM/h</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-white/10">
                        <span>📝 {bodega.lecturas} lecturas</span>
                        {bodega.activa ? (
                          <span className="text-green-500">● En progreso</span>
                        ) : bodega.acumuladoActual > 0 ? (
                          <span className="text-slate-500">✓ Finalizada</span>
                        ) : (
                          <span className="text-slate-600">○ Sin carga</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* VERIFICACIÓN DE CONSISTENCIA */}
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-2">📊 Resumen de carga:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex justify-between text-sm">
                  <span>🎯 Total acumulado global:</span>
                  <span className="font-bold text-blue-400">{totalGeneral.toFixed(3)} TM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>🔢 Suma acumulados por bodega:</span>
                  <span className="font-bold text-green-400">
                    {resumenPorBodega.reduce((sum, b) => sum + b.acumuladoActual, 0).toFixed(3)} TM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>📍 Bodega activa actual:</span>
                  <span className="font-bold text-yellow-400">
                    {resumenPorBodega.find(b => b.activa)?.nombre || 'Ninguna'}
                  </span>
                </div>
              </div>
              
              {/* Leyenda de flujos */}
              <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-slate-500 flex flex-wrap gap-3">
                <span>📖 Leyenda:</span>
                <span>• <span className="text-blue-300">FLUJO ACTUAL</span>: Velocidad de carga en este momento (últimos 2 registros)</span>
                <span>• <span className="text-cyan-400">Flujo promedio histórico</span>: Promedio desde que empezó la bodega</span>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de registro de carga */}
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
              <label className="block text-xs text-slate-400 mb-1">Fecha y Hora (El Salvador)</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="fecha_hora"
                  value={nuevaExportacion.fecha_hora}
                  onChange={handleExportacionChange}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setNuevaExportacion(prev => ({ ...prev, fecha_hora: getCurrentSVTimeForInput() }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Acumulado de la Bodega (TM) *</label>
              <input
                type="number"
                step="0.001"
                name="acumulado_tm"
                value={nuevaExportacion.acumulado_tm}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="Ej: 150.000"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Cantidad TOTAL cargada en ESTA bodega hasta este momento
              </p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega *</label>
              <select
                name="bodega_id"
                value={nuevaExportacion.bodega_id}
                onChange={handleExportacionChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Seleccionar bodega</option>
                {BODEGAS_BARCO.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.codigo})
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
              />
            </div>
            <div className="flex items-end col-span-full gap-2">
              <button
                onClick={handleGuardarExportacion}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
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

      
{exportacionesFiltradas.length > 0 && (
  <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
    <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
      <h3 className="font-bold text-white">
        Historial de Carga - {productoActivo?.nombre} ({exportacionesFiltradas.length} registros)
        <span className="text-sm font-normal text-slate-500 ml-2">
          Flujo promedio: {calcularFlujoBandaPorHora.toFixed(3)} TM/h
        </span>
      </h3>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-800 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha/Hora</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Turno</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acumulado Bodega (TM)</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">FLUJO (TM)</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Bodega</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Observaciones</th>
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {(() => {
            // Ordenar ASCENDENTE para análisis
            const ascendente = [...exportacionesFiltradas].sort(
              (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
            )
            
            // Mapa para almacenar el delta (TM cargados entre lecturas)
            const deltaPorRegistro = new Map()
            
            // Procesar CADA BODEGA por separado
            const bodegasUnicas = [...new Set(ascendente.map(e => e.bodega_id))]
            
            bodegasUnicas.forEach(bodegaId => {
              const registrosBodega = ascendente.filter(e => e.bodega_id === bodegaId)
              
              registrosBodega.forEach((reg, idx) => {
                if (idx === 0) {
                  // PRIMER REGISTRO de esta bodega: FLUJO = acumulado (punto de partida)
                  deltaPorRegistro.set(reg.id, {
                    valor: Number(reg.acumulado_tm) || 0,
                    esPrimero: true,
                    minutos: null
                  })
                } else {
                  // Calcular delta con registro anterior de la MISMA bodega
                  const anterior = registrosBodega[idx - 1]
                  const deltaTM = Number(reg.acumulado_tm) - Number(anterior.acumulado_tm)
                  const minutosDiff = (new Date(reg.fecha_hora) - new Date(anterior.fecha_hora)) / (1000 * 60)
                  
                  deltaPorRegistro.set(reg.id, {
                    valor: deltaTM,
                    esPrimero: false,
                    minutos: minutosDiff
                  })
                }
              })
            })
            
            // Identificar PRIMER REGISTRO de cada bodega (para badge INICIO DE BODEGA)
            const esPrimerRegistroDeBodega = new Map()
            const bodegasVistas = new Set()
            
            ascendente.forEach(exp => {
              if (!bodegasVistas.has(exp.bodega_id)) {
                esPrimerRegistroDeBodega.set(exp.id, true)
                bodegasVistas.add(exp.bodega_id)
              } else {
                esPrimerRegistroDeBodega.set(exp.id, false)
              }
            })
            
            // IDENTIFICAR CAMBIO DE BODEGA
            // El badge "CAMBIO DE BODEGA" va en el registro ANTERIOR (último de la bodega que se termina)
            const hayCambioBodega = new Map() // key: id del registro ANTERIOR
            for (let i = 1; i < ascendente.length; i++) {
              const actual = ascendente[i]
              const anterior = ascendente[i - 1]
              if (actual.bodega_id !== anterior.bodega_id) {
                // El registro ANTERIOR es el último de su bodega → le ponemos CAMBIO DE BODEGA
                hayCambioBodega.set(anterior.id, true)
              }
            }
            
            // Mostrar en orden DESCENDENTE
            const descendente = [...exportacionesFiltradas].sort(
              (a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)
            )
            
            return descendente.map((exp) => {
              const bodega = BODEGAS_BARCO.find(b => b.id === exp.bodega_id)
              const fechaSV = formatUTCToSV(exp.fecha_hora, 'DD/MM/YY')
              const horaSV = formatUTCToSV(exp.fecha_hora, 'HH:mm')
              const horaNum = parseInt(horaSV.split(':')[0])
              
              const turno = (horaNum >= 6 && horaNum < 18) ? '6:00 - 18:00' : '18:00 - 6:00'
              
              const esPrimero = esPrimerRegistroDeBodega.get(exp.id)
              const esCambio = hayCambioBodega.get(exp.id)
              const infoDelta = deltaPorRegistro.get(exp.id)
              
              // Determinar clases y badges
              let rowClasses = "hover:bg-white/5 transition-colors"
              let badges = []
              
              // INICIO DE BODEGA (si es el primer registro de esa bodega)
              if (esPrimero) {
                rowClasses = "bg-blue-500/10 hover:bg-blue-500/20 border-l-4 border-blue-500"
                badges.push({
                  text: "INICIO DE BODEGA",
                  icono: <Layers className="w-3 h-3" />,
                  color: "bg-blue-500/30 text-blue-300"
                })
              }
              
              // CAMBIO DE BODEGA (en el registro ANTERIOR, el último de la bodega que se termina)
              if (esCambio) {
                rowClasses = "bg-orange-500/10 hover:bg-orange-500/20 border-l-4 border-orange-500"
                badges.push({
                  text: "CAMBIO DE BODEGA",
                  icono: <ArrowRightLeft className="w-3 h-3" />,
                  color: "bg-orange-500/30 text-orange-300"
                })
              }
              
              return (
                <tr key={exp.id} className={rowClasses}>
                  <td className="px-4 py-3">
                    <div>{fechaSV}</div>
                    <div className="text-xs text-slate-500">{horaSV}</div>
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {badges.map((badge, i) => (
                          <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.icono}
                            {badge.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      turno === '6:00 - 18:00' 
                        ? 'bg-yellow-500/20 text-yellow-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {turno}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-400">
                    {(exp.acumulado_tm || 0).toFixed(3)} TM
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {infoDelta ? (
                      <span 
                        className={infoDelta.esPrimero ? "text-cyan-400" : "text-green-400"}
                        title={!infoDelta.esPrimero && infoDelta.minutos ? `${infoDelta.valor.toFixed(3)} TM en ${infoDelta.minutos.toFixed(1)} minutos` : "Punto de inicio de bodega"}
                      >
                        {infoDelta.valor.toFixed(3)} TM
                        {!infoDelta.esPrimero && infoDelta.minutos && infoDelta.minutos < 15 && (
                          <span className="ml-1 text-[10px] text-yellow-500" title={`Intervalo corto: ${infoDelta.minutos.toFixed(1)} minutos`}>
                            ⚡
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {bodega ? (
                      <div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: bodega.color }} />
                          <p className="text-white font-medium">{bodega.nombre}</p>
                        </div>
                        <p className="text-xs text-green-400">{bodega.codigo}</p>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={exp.observaciones || ''}>
                    {exp.observaciones || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditarExportacion(exp)} className="p-1 hover:bg-blue-500/20 rounded" title="Editar">
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button onClick={() => handleEliminarExportacion(exp.id)} className="p-1 hover:bg-red-500/20 rounded" title="Eliminar">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          })()}
        </tbody>
        <tfoot className="bg-slate-900 sticky bottom-0">
          <tr className="bg-orange-500/5">
            <td className="px-4 py-3 font-bold text-orange-400" colSpan={2}>TOTAL ACUMULADO GLOBAL</td>
            <td className="px-4 py-3 font-bold text-orange-400" colSpan={2}>
              {totalGeneral.toFixed(3)} TM
            </td>
            <td colSpan="3"></td>
          </tr>
          {barco.metas_json?.limites?.[productoActivo.codigo] > 0 && (
            <tr className="bg-orange-500/5">
              <td className="px-4 py-3 font-bold text-orange-400" colSpan={2}>FALTA POR CARGAR</td>
              <td className="px-4 py-3 font-bold text-orange-400" colSpan={2}>
                {faltaPorCargar.toFixed(3)} TM
              </td>
              <td colSpan="3"></td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  </div>
)}
        
        {/* Bitácora */}
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
              <label className="block text-xs text-slate-400 mb-1">Fecha y Hora (El Salvador)</label>
              <input
                type="datetime-local"
                name="fecha_hora"
                value={bitacoraActual.fecha_hora}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setBitacoraActual(prev => ({ ...prev, fecha_hora: getCurrentSVTimeForInput() }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400"
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Comentarios</label>
              <input
                type="text"
                name="comentarios"
                value={bitacoraActual.comentarios}
                onChange={handleBitacoraChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                placeholder="Comentarios..."
              />
            </div>
            <div className="flex gap-2 col-span-full">
              <button
                onClick={handleGuardarBitacora}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
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
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Turno</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Comentarios</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bitacoraFiltrada.map(reg => {
                    const fechaSV = formatUTCToSV(reg.fecha_hora, 'DD/MM/YY')
                    const horaSV = formatUTCToSV(reg.fecha_hora, 'HH:mm')
                    const horaNum = parseInt(horaSV.split(':')[0])
                    
                    let turno = '—'
                    if (horaNum >= 6 && horaNum < 18) {
                      turno = '6:00 - 18:00'
                    } else {
                      turno = '18:00 - 6:00'
                    }
                    
                    return (
                      <tr key={reg.id} className="hover:bg-white/5">
                        <td className="px-4 py-2">
                          <div>{fechaSV}</div>
                          <div className="text-xs text-slate-500">{horaSV}</div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            turno === '6:00 - 18:00' 
                              ? 'bg-yellow-500/20 text-yellow-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {turno}
                          </span>
                        </td>
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal para editar paro */}
      {showParoModal && barco && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto">
            <FormularioParoSimple
              barco={barco}
              catalogosParos={catalogosParos}
              onSave={handleGuardarParo}
              onCancel={() => {
                setShowParoModal(false)
                setParoEditando(null)
              }}
              paroEditando={paroEditando}
            />
          </div>
        </div>
      )}

      {/* Dashboard de paros */}
      {showParosDashboard && barco && (
        <DashboardParos
          barco={barco}
          registrosParos={registrosParos}
          catalogosParos={catalogosParos}
          onClose={() => setShowParosDashboard(false)}
        />
      )}
    </div>
  )
}