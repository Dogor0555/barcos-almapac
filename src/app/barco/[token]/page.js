// barco/[token]/page.js - Página principal para registro de viajes, lecturas de banda y bitácora de flujos por producto
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from './../../lib/supabase'
import {
  formatTM, formatHora, formatFechaHora, formatFecha,
  validateHora24h, detectarFormatoAmPm
} from './../../lib/utils'
import {
  Save, Plus, RefreshCw, Truck, Target, CheckCircle,
  Package, Table, Scale, Activity, BookOpen,
  Clock, AlertCircle, Play, CheckSquare, XCircle,
  ArrowRight, ArrowLeft, MapPin, Edit2, Trash2, Warehouse,
  TrendingUp, BarChart3, LineChart, Calendar, Eye,
  Pencil, Search, X, Lock, Unlock, Anchor, StopCircle, Inbox,
  Download, ArrowUpDown, AlertTriangle, TrendingDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { verificarNumeroViaje, getSiguienteNumeroViaje } from '../../utils/viajeConflict'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import * as XLSX from 'xlsx'

// Extender dayjs con plugins de zona horaria
dayjs.extend(utc)
dayjs.extend(timezone)

export default function BarcoPesadorPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [productos, setProductos] = useState([])
  const [destinos, setDestinos] = useState([])
  const [viajes, setViajes] = useState([])
  const [viajesIncompletos, setViajesIncompletos] = useState([])
  const [lecturasBanda, setLecturasBanda] = useState([])
  const [bitacora, setBitacora] = useState([])
  const [productoActivo, setProductoActivo] = useState(null)
  const [tipoRegistro, setTipoRegistro] = useState('viajes')
  const [modoRegistro, setModoRegistro] = useState('nuevo')
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null)
  const [editandoViaje, setEditandoViaje] = useState(null)
  const [editandoLectura, setEditandoLectura] = useState(null)
  const [editandoBitacora, setEditandoBitacora] = useState(null)
  const [vistaGraficos, setVistaGraficos] = useState(false)
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false)
  const [viajeEnEdicion, setViajeEnEdicion] = useState(null)

  const [conflicto, setConflicto] = useState(null)
  const [validando, setValidando] = useState(false)

  // Estado para el buscador de la tabla de viajes completos
  const [searchTerm, setSearchTerm] = useState('')

  // Estado para el buscador de placas
  const [buscarPlaca, setBuscarPlaca] = useState('')

  // Estado para orden de la tabla de viajes
  const [ordenViajes, setOrdenViajes] = useState('asc')

  // Estado para el acumulado en tiempo real (INCLUYE TODOS LOS VIAJES - INCOMPLETOS Y COMPLETOS)
  const [acumuladoPreview, setAcumuladoPreview] = useState(0)

  // Refs para navegación con Enter
  const inputRefs = useRef({})
  const viajesSectionRef = useRef(null)
  const modalRef = useRef(null)

  const [nuevoViaje, setNuevoViaje] = useState({
    viaje_numero: 1,
    fecha: new Date().toISOString().split('T')[0],
    hora_salida_updp: '',
    hora_entrada_almapac: '',
    placa: 'C-',
    peso_neto_updp_tm: '',
    peso_bruto_almapac_tm: '',
    peso_bruto_updp_tm: '',
    producto_id: '',
    destino_id: '',
    observaciones: ''
  })

  const [completarViaje, setCompletarViaje] = useState({
    destino_id: '',
    peso_destino_tm: '',
    hora_salida_almapac: '',
    hora_entrada_almapac: '',
    peso_bruto_almapac_tm: '',
    observaciones_destino: ''
  })

  const [lecturaActual, setLecturaActual] = useState({
    fecha_hora: '',
    acumulado_tm: '',
    destino_id: ''
  })

  const [bitacoraActual, setBitacoraActual] = useState({
    fecha_hora: '',
    comentarios: ''
  })

  // =====================================================
  // FUNCIONES PARA PRESERVAR POSICIÓN DE SCROLL
  // =====================================================

  // Guarda la posición actual del scroll
  const guardarPosicionScroll = () => {
    return {
      x: window.scrollX,
      y: window.scrollY
    }
  }

  // Restaura una posición de scroll guardada
  const restaurarPosicionScroll = (posicion) => {
    if (posicion) {
      window.scrollTo({
        top: posicion.y,
        left: posicion.x,
        behavior: 'auto'
      })
    }
  }

  // =====================================================
  // CONFIGURACIÓN DE HORARIO EL SALVADOR (GMT-6)
  // =====================================================
  const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

  // Para GUARDAR: Convertir hora de El Salvador del input a UTC
  const svToUTC = (svDateTime) => {
    if (!svDateTime) return null
    return dayjs.tz(svDateTime, TIMEZONE_EL_SALVADOR).utc().toISOString()
  }

  // Para MOSTRAR: Convertir UTC de BD a hora de El Salvador
  const formatUTCToSV = (utcDate, format = 'DD/MM/YY HH:mm:ss') => {
    if (!utcDate) return '—'
    return dayjs.utc(utcDate).tz(TIMEZONE_EL_SALVADOR).format(format)
  }

  // Obtener hora actual en El Salvador para inputs
  const getCurrentSVTimeForInput = () => {
    return dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DDTHH:mm:ss')
  }

  // Función mejorada para obtener hora actual en formato 24h HH:MM:SS
  const getHoraActual24h = () => {
    const ahora = new Date()
    const horas = ahora.getHours().toString().padStart(2, '0')
    const minutos = ahora.getMinutes().toString().padStart(2, '0')
    const segundos = ahora.getSeconds().toString().padStart(2, '0')
    return `${horas}:${minutos}:${segundos}`
  }

  // ✅ FUNCIÓN PARA AUTO-FORMATEAR NÚMEROS - Solo formatea cuando tiene 5+ dígitos
  const autoFormatearNumero = (valor, campo = '') => {
    if (!valor) return valor

    const strValor = String(valor).trim()

    // Si ya tiene punto decimal, devolver como está
    if (strValor.includes('.')) return strValor

    // Limpiar caracteres no numéricos
    const soloNumeros = strValor.replace(/[^0-9]/g, '')

    // Si no hay números, devolver vacío
    if (soloNumeros === '') return ''

    const numero = parseFloat(soloNumeros)

    // Solo convertir si tiene 5 o más dígitos (mínimo 10,000 kg)
    if (!isNaN(numero) && soloNumeros.length >= 5) {
      const convertido = numero / 1000
      toast.success(`💰 ${campo || 'Peso'}: ${numero.toLocaleString()} kg → ${convertido.toFixed(3)} TM`, {
        duration: 2000,
        id: `convert-${campo}-${Date.now()}`
      })
      return convertido.toString()
    }

    // Si tiene menos de 5 dígitos, devolver el valor original
    return strValor
  }

  // ✅ FUNCIÓN PARA MANEJAR ENTER COMO TAB
  const handleKeyDownEnter = (e, nextFieldId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextFieldId && inputRefs.current[nextFieldId]) {
        inputRefs.current[nextFieldId].focus()
      }
    }
  }

  // ✅ FUNCIÓN PARA CALCULAR ACUMULADO TOTAL (INCLUYE INCOMPLETOS Y COMPLETOS)
  const calcularAcumuladoTotalUPDP = (productoId) => {
    if (!productoId) return 0
    
    const todosLosViajes = viajes.filter(v => 
      v.producto_id === productoId && 
      v.peso_neto_updp_tm !== null &&
      v.peso_neto_updp_tm !== '' &&
      Number(v.peso_neto_updp_tm) > 0
    )
    
    const total = todosLosViajes.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
    return total
  }

  // ✅ FUNCIÓN PARA ACTUALIZAR PREVIEW DEL ACUMULADO EN TIEMPO REAL
  const actualizarAcumuladoPreview = (pesoNetoIngresado) => {
    if (!productoActivo) return
    
    const acumuladoActual = calcularAcumuladoTotalUPDP(productoActivo.id)
    
    let pesoNeto = 0
    if (pesoNetoIngresado && pesoNetoIngresado !== '') {
      pesoNeto = parseFloat(pesoNetoIngresado)
      if (isNaN(pesoNeto)) pesoNeto = 0
    }
    
    const nuevoAcumulado = acumuladoActual + pesoNeto
    setAcumuladoPreview(nuevoAcumulado)
    return nuevoAcumulado
  }

  // ✅ FUNCIÓN PARA ACTUALIZAR ACUMULADO EN BD
  const actualizarAcumuladoEnBD = async (productoId) => {
    try {
      const todosLosViajes = viajes
        .filter(v => v.producto_id === productoId && v.peso_neto_updp_tm !== null)
        .sort((a, b) => a.viaje_numero - b.viaje_numero)

      let acumuladoCorrido = 0

      for (const viaje of todosLosViajes) {
        acumuladoCorrido += Number(viaje.peso_neto_updp_tm) || 0

        if (Math.abs((viaje.total_acumulado_tm || 0) - acumuladoCorrido) > 0.001) {
          await supabase
            .from('viajes')
            .update({ total_acumulado_tm: acumuladoCorrido })
            .eq('id', viaje.id)
        }
      }

      console.log(`✅ Acumulado UPDP actualizado para producto ${productoId}: ${acumuladoCorrido.toFixed(3)} TM`)
      return acumuladoCorrido
    } catch (error) {
      console.error('Error actualizando acumulado UPDP:', error)
      return 0
    }
  }

  // Función para limpiar el buscador
  const limpiarBuscador = () => {
    setBuscarPlaca('')
  }

  // Función para obtener el siguiente número de viaje para un producto específico
  const getSiguienteNumeroViaje = (productoId) => {
    if (!viajes.length || !productoId) return 1

    const viajesProducto = viajes.filter(v => v.producto_id === productoId)

    if (viajesProducto.length === 0) return 1

    const maxViaje = Math.max(...viajesProducto.map(v => v.viaje_numero))
    return maxViaje + 1
  }

  // Función para formatear fecha local
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Función para formatear placa con C- automático
  const formatPlaca = (value) => {
    if (value.startsWith('C-')) {
      return 'C-' + value.slice(2).replace(/[^0-9]/g, '')
    }
    return 'C-' + value.replace(/[^0-9]/g, '')
  }

  const handlePlacaChange = (e) => {
    const value = e.target.value
    if (value === 'C-') {
      setNuevoViaje(prev => ({ ...prev, placa: 'C-' }))
    } else {
      const formatted = formatPlaca(value)
      setNuevoViaje(prev => ({ ...prev, placa: formatted }))
    }
  }

  // ✅ FUNCIÓN PARA ABRIR MODAL DE EDICIÓN COMPLETA
  const abrirModalEdicionCompleta = (viaje) => {
    setViajeEnEdicion({
      ...viaje,
      fecha: viaje.fecha?.split('T')[0] || getLocalDateString(),
      hora_salida_updp: viaje.hora_salida_updp || '',
      hora_entrada_almapac: viaje.hora_entrada_almapac || '',
      hora_salida_almapac: viaje.hora_salida_almapac || '',
      peso_neto_updp_tm: viaje.peso_neto_updp_tm || '',
      peso_bruto_updp_tm: viaje.peso_bruto_updp_tm || '',
      peso_bruto_almapac_tm: viaje.peso_bruto_almapac_tm || '',
      peso_destino_tm: viaje.peso_destino_tm || '',
      destino_id: viaje.destino_id || '',
      observaciones: viaje.observaciones || '',
      observaciones_destino: viaje.observaciones_destino || ''
    })
    setModalEdicionAbierto(true)
  }

  // ✅ FUNCIÓN PARA CERRAR MODAL
  const cerrarModalEdicion = () => {
    setModalEdicionAbierto(false)
    setViajeEnEdicion(null)
  }

  // ✅ FUNCIÓN PARA GUARDAR EDICIÓN COMPLETA DESDE MODAL
  const guardarEdicionCompleta = async () => {
    if (!viajeEnEdicion) return

    const posicionActual = guardarPosicionScroll()

    try {
      // Validar campos obligatorios
      if (!viajeEnEdicion.placa || viajeEnEdicion.placa === 'C-') {
        toast.error('La placa es obligatoria')
        return
      }

      if (!viajeEnEdicion.peso_neto_updp_tm) {
        toast.error('El Peso Neto UPDP es obligatorio')
        return
      }

      if (!viajeEnEdicion.peso_bruto_updp_tm) {
        toast.error('El Peso Bruto UPDP es obligatorio')
        return
      }

      // Procesar horas
      let horaSalidaUPDP = null
      let horaEntradaAlmapac = null
      let horaSalidaAlmapac = null

      if (viajeEnEdicion.hora_salida_updp) {
        horaSalidaUPDP = validateHora24h(viajeEnEdicion.hora_salida_updp)
      }

      if (viajeEnEdicion.hora_entrada_almapac) {
        horaEntradaAlmapac = validateHora24h(viajeEnEdicion.hora_entrada_almapac)
      }

      if (viajeEnEdicion.hora_salida_almapac) {
        horaSalidaAlmapac = validateHora24h(viajeEnEdicion.hora_salida_almapac)
      }

      // Calcular el nuevo acumulado
      const otrosViajes = viajes.filter(v => 
        v.producto_id === viajeEnEdicion.producto_id && 
        v.id !== viajeEnEdicion.id &&
        v.peso_neto_updp_tm !== null
      )
      const acumuladoOtros = otrosViajes.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
      const nuevoAcumulado = acumuladoOtros + (Number(viajeEnEdicion.peso_neto_updp_tm) || 0)

      const datosActualizar = {
        viaje_numero: Number(viajeEnEdicion.viaje_numero),
        fecha: viajeEnEdicion.fecha,
        hora_salida_updp: horaSalidaUPDP,
        hora_entrada_almapac: horaEntradaAlmapac,
        hora_salida_almapac: horaSalidaAlmapac,
        placa: viajeEnEdicion.placa,
        peso_neto_updp_tm: Number(viajeEnEdicion.peso_neto_updp_tm) || null,
        peso_bruto_updp_tm: Number(viajeEnEdicion.peso_bruto_updp_tm) || null,
        peso_bruto_almapac_tm: Number(viajeEnEdicion.peso_bruto_almapac_tm) || null,
        peso_destino_tm: Number(viajeEnEdicion.peso_destino_tm) || null,
        destino_id: viajeEnEdicion.destino_id ? Number(viajeEnEdicion.destino_id) : null,
        total_acumulado_tm: nuevoAcumulado,
        observaciones: viajeEnEdicion.observaciones || null,
        observaciones_destino: viajeEnEdicion.observaciones_destino || null,
        estado: viajeEnEdicion.estado
      }

      const { error } = await supabase
        .from('viajes')
        .update(datosActualizar)
        .eq('id', viajeEnEdicion.id)

      if (error) {
        console.error('Error:', error)
        toast.error(`Error: ${error.message}`)
        return
      }

      toast.success('✅ Viaje actualizado correctamente')
      cerrarModalEdicion()
      await cargarDatos()

      if (productoActivo) {
        await actualizarAcumuladoEnBD(productoActivo.id)
        actualizarAcumuladoPreview('')
      }

      restaurarPosicionScroll(posicionActual)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al actualizar el viaje')
      restaurarPosicionScroll(posicionActual)
    }
  }

  // ✅ FUNCIÓN PARA EDITAR VIAJE DESDE PENDIENTES
  const handleEditarViajeDesdePaso2 = (viaje) => {
    abrirModalEdicionCompleta(viaje)
  }

  // ✅ FUNCIÓN PARA SELECCIONAR VIAJE PARA COMPLETAR
  const seleccionarViajeParaCompletar = (viaje) => {
    setViajeSeleccionado(viaje)
    setModoRegistro('completar')

    setCompletarViaje({
      destino_id: viaje.destino_id || '',
      peso_destino_tm: viaje.peso_destino_tm || '',
      hora_salida_almapac: viaje.hora_salida_almapac || '',
      hora_entrada_almapac: viaje.hora_entrada_almapac || '',
      peso_bruto_almapac_tm: viaje.peso_bruto_almapac_tm || '',
      observaciones_destino: viaje.observaciones_destino || ''
    })

    toast.success(`📝 Preparando para completar viaje #${viaje.viaje_numero}`)
  }

  const handleValidarNumeroViaje = async (numero) => {
    if (!numero || !barco?.id || !productoActivo?.id) return
    setValidando(true)
    try {
      const resultado = await verificarNumeroViaje(barco.id, productoActivo.id, Number(numero))
      if (!resultado.libre) {
        setConflicto(resultado)
        toast.error(`⚠️ El viaje #${numero} ya está registrado por otro usuario`, {
          duration: 5000,
          id: 'viaje-conflicto'
        })
      } else {
        setConflicto(null)
      }
    } catch (err) {
      console.error('Error validando viaje:', err)
    } finally {
      setValidando(false)
    }
  }

  const handleAceptarSugerido = () => {
    setNuevoViaje(prev => ({ ...prev, viaje_numero: conflicto.sugerido }))
    setConflicto(null)
    toast.success(`✅ Se asignó el viaje #${conflicto.sugerido}`)
  }

  // ✅ HANDLER MEJORADO
  const handleNuevoViajeChange = (e) => {
    const { name, value } = e.target

    if (name === 'peso_neto_updp_tm' || name === 'peso_bruto_almapac_tm' || name === 'peso_bruto_updp_tm') {
      let nombreCampo = ''
      if (name === 'peso_neto_updp_tm') nombreCampo = 'Peso Neto UPDP'
      if (name === 'peso_bruto_almapac_tm') nombreCampo = 'Peso Bruto Almapac'
      if (name === 'peso_bruto_updp_tm') nombreCampo = 'Peso Bruto UPDP'
      const valorFormateado = autoFormatearNumero(value, nombreCampo)
      setNuevoViaje(prev => ({ ...prev, [name]: valorFormateado }))
      
      if (name === 'peso_neto_updp_tm') {
        actualizarAcumuladoPreview(valorFormateado)
      }
    } else {
      setNuevoViaje(prev => ({ ...prev, [name]: value }))
    }
  }

  // ✅ HANDLER PARA COMPLETAR VIAJE
  const handleCompletarViajeChange = (e) => {
    const { name, value } = e.target

    if (name === 'peso_destino_tm' || name === 'peso_bruto_almapac_tm') {
      let nombreCampo = ''
      if (name === 'peso_destino_tm') nombreCampo = 'Peso Destino'
      if (name === 'peso_bruto_almapac_tm') nombreCampo = 'Peso Bruto Almapac'
      const valorFormateado = autoFormatearNumero(value, nombreCampo)
      setCompletarViaje(prev => ({ ...prev, [name]: valorFormateado }))
    } else {
      if (name === 'hora_salida_almapac' || name === 'hora_entrada_almapac') {
        if (detectarFormatoAmPm(value)) {
          toast.error('Usa formato 24h (ej: 14:30:45)')
          const corregida = validateHora24h(value)
          setCompletarViaje(prev => ({ ...prev, [name]: corregida }))
          return
        }
      }
      setCompletarViaje(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleLecturaChange = (e) => {
    const { name, value } = e.target
    setLecturaActual(prev => ({ ...prev, [name]: value }))
  }

  const handleBitacoraChange = (e) => {
    const { name, value } = e.target
    setBitacoraActual(prev => ({ ...prev, [name]: value }))
  }

  // ✅ EDITAR VIAJE DESDE TABLA DE COMPLETOS
  const handleEditarViaje = (viaje) => {
    abrirModalEdicionCompleta(viaje)
  }

  const handleEditarLectura = (lectura) => {
    setEditandoLectura(lectura)
    setLecturaActual({
      fecha_hora: formatUTCToSV(lectura.fecha_hora, 'YYYY-MM-DDTHH:mm:ss'),
      acumulado_tm: lectura.acumulado_tm || '',
      destino_id: lectura.destino_id || ''
    })
  }

  const handleEditarBitacora = (registro) => {
    setEditandoBitacora(registro)
    setBitacoraActual({
      fecha_hora: registro.fecha_hora?.slice(0, 19) || '',
      comentarios: registro.comentarios || ''
    })
  }

  const handleEliminarViaje = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este viaje? Esta acción no se puede deshacer.')) {
      return
    }

    const posicionActual = guardarPosicionScroll()

    try {
      const { error } = await supabase
        .from('viajes')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Viaje eliminado correctamente')
      await cargarDatos()

      if (productoActivo) {
        await actualizarAcumuladoEnBD(productoActivo.id)
        actualizarAcumuladoPreview('')
      }

      if (editandoViaje?.id === id) {
        setEditandoViaje(null)
        setModoRegistro('nuevo')
      }

      restaurarPosicionScroll(posicionActual)
    } catch (error) {
      console.error('Error eliminando viaje:', error)
      toast.error('Error al eliminar el viaje')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const handleEliminarLectura = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta lectura?')) return

    const posicionActual = guardarPosicionScroll()

    try {
      const { error } = await supabase
        .from('lecturas_banda')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Lectura eliminada correctamente')
      await cargarDatos()
      setEditandoLectura(null)
      restaurarPosicionScroll(posicionActual)
    } catch (error) {
      console.error('Error eliminando lectura:', error)
      toast.error('Error al eliminar la lectura')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const handleEliminarBitacora = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    const posicionActual = guardarPosicionScroll()

    try {
      const { error } = await supabase
        .from('bitacora_flujos')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Registro eliminado correctamente')
      await cargarDatos()
      setEditandoBitacora(null)
      restaurarPosicionScroll(posicionActual)
    } catch (error) {
      console.error('Error eliminando registro:', error)
      toast.error('Error al eliminar el registro')
      restaurarPosicionScroll(posicionActual)
    }
  }

  // ✅ FUNCIÓN PARA VALIDAR PESOS OBLIGATORIOS
  const validarPesosObligatorios = () => {
    const pesoNeto = nuevoViaje.peso_neto_updp_tm
    const pesoBruto = nuevoViaje.peso_bruto_updp_tm
    
    if (!pesoNeto || pesoNeto === '') {
      toast.error('❌ El Peso Neto UPDP es obligatorio en el Paso 1')
      return false
    }
    
    if (!pesoBruto || pesoBruto === '') {
      toast.error('❌ El Peso Bruto UPDP es obligatorio en el Paso 1')
      return false
    }
    
    const pesoNetoNum = Number(pesoNeto)
    const pesoBrutoNum = Number(pesoBruto)
    
    if (isNaN(pesoNetoNum) || pesoNetoNum <= 0) {
      toast.error('❌ El Peso Neto UPDP debe ser un número mayor a 0')
      return false
    }
    
    if (isNaN(pesoBrutoNum) || pesoBrutoNum <= 0) {
      toast.error('❌ El Peso Bruto UPDP debe ser un número mayor a 0')
      return false
    }
    
    if (pesoNetoNum > pesoBrutoNum) {
      toast.error('⚠️ El Peso Neto no puede ser mayor al Peso Bruto')
    }
    
    return true
  }

  const handleGuardarIncompleto = async () => {
    const posicionActual = guardarPosicionScroll()

    try {
      if (barco.estado === 'finalizado') {
        toast.error('La operación está finalizada.')
        return
      }

      if (!validarPesosObligatorios()) {
        return
      }

      if (!nuevoViaje.placa || nuevoViaje.placa === 'C-') {
        toast.error('La placa es obligatoria')
        return
      }

      if (!nuevoViaje.producto_id) {
        toast.error('Debes seleccionar un producto')
        return
      }

      if (!barco || !barco.id) {
        toast.error('Error: No hay información del barco')
        return
      }

      let horaSalidaUPDP = null
      let horaEntradaAlmapac = null

      if (nuevoViaje.hora_salida_updp) {
        if (detectarFormatoAmPm(nuevoViaje.hora_salida_updp)) {
          toast.error('Formato AM/PM detectado en Hora Salida UPDP. Convirtiendo a 24h.')
        }
        horaSalidaUPDP = validateHora24h(nuevoViaje.hora_salida_updp)
      }

      if (nuevoViaje.hora_entrada_almapac) {
        if (detectarFormatoAmPm(nuevoViaje.hora_entrada_almapac)) {
          toast.error('Formato AM/PM detectado en Hora Entrada Almapac. Convirtiendo a 24h.')
        }
        horaEntradaAlmapac = validateHora24h(nuevoViaje.hora_entrada_almapac)
      }

      const acumuladoActual = calcularAcumuladoTotalUPDP(nuevoViaje.producto_id)
      const nuevoPesoNeto = Number(nuevoViaje.peso_neto_updp_tm) || 0
      const nuevoAcumulado = acumuladoActual + nuevoPesoNeto

      const datosInsertar = {
        barco_id: barco.id,
        viaje_numero: Number(nuevoViaje.viaje_numero),
        fecha: nuevoViaje.fecha,
        hora_salida_updp: horaSalidaUPDP,
        hora_entrada_almapac: horaEntradaAlmapac,
        placa: nuevoViaje.placa,
        peso_neto_updp_tm: nuevoPesoNeto,
        peso_bruto_almapac_tm: Number(nuevoViaje.peso_bruto_almapac_tm) || null,
        peso_bruto_updp_tm: Number(nuevoViaje.peso_bruto_updp_tm) || null,
        producto_id: Number(nuevoViaje.producto_id),
        destino_id: nuevoViaje.destino_id ? Number(nuevoViaje.destino_id) : null,
        estado: 'incompleto',
        total_acumulado_tm: nuevoAcumulado,
        observaciones: nuevoViaje.observaciones || null
      }

      let result

      if (editandoViaje) {
        const otrosViajes = viajes.filter(v => 
          v.producto_id === nuevoViaje.producto_id && 
          v.id !== editandoViaje.id &&
          v.peso_neto_updp_tm !== null
        )
        const acumuladoOtros = otrosViajes.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
        const nuevoAcumuladoEditado = acumuladoOtros + nuevoPesoNeto
        
        datosInsertar.total_acumulado_tm = nuevoAcumuladoEditado
        
        result = await supabase
          .from('viajes')
          .update(datosInsertar)
          .eq('id', editandoViaje.id)
          .select()

        if (!result.error) {
          toast.success('Viaje actualizado correctamente')
          setEditandoViaje(null)
          setModoRegistro('nuevo')

          const siguienteNumero = getSiguienteNumeroViaje(nuevoViaje.producto_id)
          setNuevoViaje(prev => ({
            ...prev,
            viaje_numero: siguienteNumero,
            fecha: getLocalDateString(),
            hora_salida_updp: '',
            hora_entrada_almapac: '',
            placa: 'C-',
            peso_neto_updp_tm: '',
            peso_bruto_almapac_tm: '',
            peso_bruto_updp_tm: '',
            destino_id: '',
            observaciones: ''
          }))
          actualizarAcumuladoPreview('')
        }
      } else {
        result = await supabase
          .from('viajes')
          .insert([datosInsertar])
          .select()

        if (result.error) {
          if (result.error.code === '23505' && result.error.message.includes('viajes_barco_id_producto_id_viaje_numero')) {
            const siguienteLibre = await getSiguienteNumeroViaje(nuevoViaje.producto_id)

            setConflicto({
              ocupado: nuevoViaje.viaje_numero,
              sugerido: siguienteLibre
            })

            toast.error(`⚠️ El viaje #${nuevoViaje.viaje_numero} fue tomado por otro usuario justo ahora. Intenta con el #${siguienteLibre}`, {
              duration: 6000,
              id: 'viaje-conflicto-insert'
            })
            return
          }

          console.error('Error:', result.error)
          toast.error(`Error: ${result.error.message}`)
          return
        }

        if (!result.error) {
          toast.success(`✅ Viaje #${nuevoViaje.viaje_numero} registrado - Nuevo acumulado: ${nuevoAcumulado.toFixed(3)} TM`)
          
          toast.success(`📊 Acumulado UPDP actualizado: ${nuevoAcumulado.toFixed(3)} TM`, {
            duration: 4000,
            icon: '📊'
          })

          const siguienteNumero = getSiguienteNumeroViaje(nuevoViaje.producto_id)

          setNuevoViaje({
            viaje_numero: siguienteNumero,
            fecha: getLocalDateString(),
            hora_salida_updp: '',
            hora_entrada_almapac: '',
            placa: 'C-',
            peso_neto_updp_tm: '',
            peso_bruto_almapac_tm: '',
            peso_bruto_updp_tm: '',
            producto_id: nuevoViaje.producto_id,
            destino_id: '',
            observaciones: ''
          })
          actualizarAcumuladoPreview('')
        }
      }

      if (result.error) {
        console.error('Error:', result.error)
        toast.error(`Error: ${result.error.message}`)
        return
      }

      await cargarDatos()

      if (productoActivo) {
        await actualizarAcumuladoEnBD(productoActivo.id)
      }

      setConflicto(null)
      
      setTimeout(() => {
        if (viajesSectionRef.current) {
          viajesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)

      restaurarPosicionScroll(posicionActual)

    } catch (error) {
      console.error('Error inesperado:', error)
      toast.error('Error inesperado al guardar')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const handleCompletarViaje = async () => {
    const posicionActual = guardarPosicionScroll()

    try {
      if (barco.estado === 'finalizado') {
        toast.error('La operación está finalizada.')
        return
      }

      if (!viajeSeleccionado) {
        toast.error('Selecciona un viaje para completar')
        return
      }

      if (!completarViaje.destino_id) {
        toast.error('Selecciona un destino')
        return
      }

      if (!completarViaje.peso_destino_tm) {
        toast.error('Ingresa el peso en destino')
        return
      }

      if (!completarViaje.hora_salida_almapac) {
        toast.error('Ingresa la hora de salida de Almapac')
        return
      }

      let horaSalidaAlmapac = null
      let horaEntradaAlmapac = null

      if (completarViaje.hora_salida_almapac) {
        if (detectarFormatoAmPm(completarViaje.hora_salida_almapac)) {
          toast.error('Formato AM/PM detectado en Hora Salida Almapac. Convirtiendo a 24h.')
        }
        horaSalidaAlmapac = validateHora24h(completarViaje.hora_salida_almapac)
      }

      if (completarViaje.hora_entrada_almapac) {
        if (detectarFormatoAmPm(completarViaje.hora_entrada_almapac)) {
          toast.error('Formato AM/PM detectado en Hora Entrada Almapac. Convirtiendo a 24h.')
        }
        horaEntradaAlmapac = validateHora24h(completarViaje.hora_entrada_almapac)
      }

      const datosActualizar = {
        destino_id: Number(completarViaje.destino_id),
        peso_destino_tm: Number(completarViaje.peso_destino_tm),
        hora_salida_almapac: horaSalidaAlmapac,
        estado: 'completo',
        observaciones_destino: completarViaje.observaciones_destino || null,
        completado_at: new Date().toISOString()
      }

      if (horaEntradaAlmapac) {
        datosActualizar.hora_entrada_almapac = horaEntradaAlmapac
      }

      if (completarViaje.peso_bruto_almapac_tm) {
        datosActualizar.peso_bruto_almapac_tm = Number(completarViaje.peso_bruto_almapac_tm)
      }

      const { error } = await supabase
        .from('viajes')
        .update(datosActualizar)
        .eq('id', viajeSeleccionado.id)

      if (error) {
        console.error('Error:', error)
        toast.error(`Error: ${error.message}`)
        return
      }

      toast.success('Viaje completado exitosamente')

      setModoRegistro('nuevo')
      setViajeSeleccionado(null)
      setCompletarViaje({
        destino_id: '',
        peso_destino_tm: '',
        hora_salida_almapac: '',
        hora_entrada_almapac: '',
        peso_bruto_almapac_tm: '',
        observaciones_destino: ''
      })

      await cargarDatos()

      if (productoActivo) {
        await actualizarAcumuladoEnBD(productoActivo.id)
        actualizarAcumuladoPreview('')
      }

      restaurarPosicionScroll(posicionActual)

    } catch (error) {
      console.error('Error inesperado:', error)
      toast.error('Error inesperado al completar')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const handleGuardarLectura = async () => {
    const posicionActual = guardarPosicionScroll()

    try {
      if (barco.estado === 'finalizado') {
        toast.error('La operación está finalizada.')
        return
      }

      if (!lecturaActual.acumulado_tm) {
        toast.error('El acumulado es obligatorio')
        return
      }
      if (!productoActivo) {
        toast.error('No hay producto seleccionado')
        return
      }
      if (!lecturaActual.destino_id) {
        toast.error('Selecciona un destino')
        return
      }
      if (!lecturaActual.fecha_hora) {
        toast.error('La fecha y hora son obligatorias')
        return
      }

      const acumuladoTM = Number(lecturaActual.acumulado_tm)

      const fechaUTC = svToUTC(lecturaActual.fecha_hora)

      const datosInsertar = {
        barco_id: barco.id,
        fecha_hora: fechaUTC,
        producto_id: productoActivo.id,
        acumulado_tm: acumuladoTM,
        acumulado_kg: acumuladoTM * 1000,
        destino_id: Number(lecturaActual.destino_id)
      }

      let result

      if (editandoLectura) {
        result = await supabase
          .from('lecturas_banda')
          .update(datosInsertar)
          .eq('id', editandoLectura.id)

        if (!result.error) {
          toast.success('Lectura actualizada correctamente')
          setEditandoLectura(null)
        }
      } else {
        result = await supabase
          .from('lecturas_banda')
          .insert([datosInsertar])

        if (!result.error) {
          toast.success('Lectura de banda guardada')
        }
      }

      if (result.error) {
        console.error('Error:', result.error)
        toast.error(`Error: ${result.error.message}`)
        return
      }

      setLecturaActual({
        fecha_hora: getCurrentSVTimeForInput(),
        acumulado_tm: '',
        destino_id: ''
      })

      await cargarDatos()

      restaurarPosicionScroll(posicionActual)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const handleGuardarBitacora = async () => {
    const posicionActual = guardarPosicionScroll()

    try {
      if (barco.estado === 'finalizado') {
        toast.error('La operación está finalizada.')
        return
      }

      if (!productoActivo) {
        toast.error('No hay producto seleccionado')
        return
      }
      if (!bitacoraActual.fecha_hora) {
        toast.error('La fecha y hora son obligatorias')
        return
      }

      const datosInsertar = {
        barco_id: barco.id,
        fecha_hora: bitacoraActual.fecha_hora,
        producto_id: productoActivo.id,
        comentarios: bitacoraActual.comentarios || null
      }

      let result

      if (editandoBitacora) {
        result = await supabase
          .from('bitacora_flujos')
          .update(datosInsertar)
          .eq('id', editandoBitacora.id)

        if (!result.error) {
          toast.success('Registro actualizado correctamente')
          setEditandoBitacora(null)
        }
      } else {
        result = await supabase
          .from('bitacora_flujos')
          .insert([datosInsertar])

        if (!result.error) {
          toast.success('Entrada de bitácora guardada')
        }
      }

      if (result.error) {
        console.error('Error:', result.error)
        toast.error(`Error: ${result.error.message}`)
        return
      }

      setBitacoraActual({
        fecha_hora: '',
        comentarios: ''
      })

      await cargarDatos()

      restaurarPosicionScroll(posicionActual)

    } catch (error) {
      console.error('Error:', error)
      toast.error('Error inesperado')
      restaurarPosicionScroll(posicionActual)
    }
  }

  const exportarTodoAExcel = () => {
    try {
      const wb = XLSX.utils.book_new()

      const resumenData = []

      resumenData.push(['RESUMEN DE OPERACIONES'])
      resumenData.push(['Barco:', barco.nombre])
      resumenData.push(['Código:', barco.codigo_barco || 'N/A'])
      resumenData.push(['Fecha de exportación:', new Date().toLocaleString('es-ES')])
      resumenData.push(['Estado:', barco.estado?.toUpperCase()])
      resumenData.push([])

      resumenData.push(['TIEMPOS DE OPERACIÓN'])
      resumenData.push(['Arribo:', barco.tiempo_arribo ? new Date(barco.tiempo_arribo).toLocaleString('es-ES') : 'N/A'])
      resumenData.push(['Ataque:', barco.tiempo_ataque ? new Date(barco.tiempo_ataque).toLocaleString('es-ES') : 'N/A'])
      resumenData.push(['Recibido:', barco.tiempo_recibido ? new Date(barco.tiempo_recibido).toLocaleString('es-ES') : 'N/A'])
      resumenData.push(['Inicio descarga:', barco.operacion_iniciada_at ? new Date(barco.operacion_iniciada_at).toLocaleString('es-ES') : 'N/A'])
      resumenData.push(['Fin descarga:', barco.operacion_finalizada_at ? new Date(barco.operacion_finalizada_at).toLocaleString('es-ES') : 'N/A'])
      resumenData.push([])

      resumenData.push(['RESUMEN POR PRODUCTO'])
      resumenData.push(['Producto', 'Tipo', 'Meta (TM)', 'Total (TM)', 'Viajes Completos', 'Viajes Pendientes', 'Lecturas Banda', 'Registros Bitácora', '% Completado'])

      Object.values(resumenProductos).forEach(prod => {
        resumenData.push([
          `${prod.nombre} (${prod.codigo})`,
          prod.tipo?.toUpperCase() || 'MIXTO',
          prod.metaTM?.toFixed(3) || '0.000',
          prod.totalTM?.toFixed(3) || '0.000',
          prod.viajes || 0,
          prod.incompletos || 0,
          prod.lecturas || 0,
          prod.bitacora || 0,
          prod.porcentaje?.toFixed(1) + '%' || '0%'
        ])
      })

      resumenData.push([])

      if (productoActivo && resumenPorDestino.length > 0) {
        resumenData.push([`RESUMEN POR DESTINO - ${productoActivo.nombre}`])
        resumenData.push(['Destino', 'Límite (TM)', 'Total Viajes (TM)', 'Total Banda (TM)', 'Total (TM)', '% Límite'])

        resumenPorDestino.forEach(dest => {
          resumenData.push([
            dest.nombre,
            dest.limite_tm?.toFixed(3) || '0.000',
            dest.viajes_tm?.toFixed(3) || '0.000',
            dest.banda_tm?.toFixed(3) || '0.000',
            dest.total_tm?.toFixed(3) || '0.000',
            dest.porcentaje?.toFixed(1) + '%' || '0%'
          ])
        })

        resumenData.push([])
      }

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General')

      const viajesData = []
      viajesData.push(['VIAJES COMPLETOS'])
      viajesData.push(['Barco:', barco.nombre])
      viajesData.push([])
      viajesData.push([
        '# Viaje',
        'Fecha',
        'Producto',
        'Placa',
        'Hora Salida UPDP',
        'Hora Entrada Almapac',
        'Hora Salida Almapac',
        'Peso Neto UPDP (TM)',
        'Peso Bruto UPDP (TM)',
        'Peso Bruto Almapac (TM)',
        'Destino',
        'Peso Destino (TM)',
        'Acumulado UPDP (TM)',
        'Observaciones',
        'Observaciones Destino'
      ])

      viajes
        .filter(v => v.estado === 'completo')
        .sort((a, b) => a.viaje_numero - b.viaje_numero)
        .forEach(v => {
          viajesData.push([
            v.viaje_numero,
            formatFecha(v.fecha),
            v.producto?.nombre || 'N/A',
            v.placa,
            formatHora(v.hora_salida_updp),
            formatHora(v.hora_entrada_almapac),
            formatHora(v.hora_salida_almapac) || '—',
            v.peso_neto_updp_tm?.toFixed(3) || '0.000',
            v.peso_bruto_updp_tm?.toFixed(3) || '0.000',
            v.peso_bruto_almapac_tm?.toFixed(3) || '0.000',
            v.destino?.nombre || '—',
            v.peso_destino_tm?.toFixed(3) || '0.000',
            v.total_acumulado_tm?.toFixed(3) || '0.000',
            v.observaciones || '',
            v.observaciones_destino || ''
          ])
        })

      const wsViajes = XLSX.utils.aoa_to_sheet(viajesData)
      XLSX.utils.book_append_sheet(wb, wsViajes, 'Viajes Completos')

      const incompletosData = []
      incompletosData.push(['VIAJES INCOMPLETOS / PENDIENTES'])
      incompletosData.push(['Barco:', barco.nombre])
      incompletosData.push([])
      incompletosData.push([
        '# Viaje',
        'Fecha',
        'Producto',
        'Placa',
        'Hora Salida UPDP',
        'Hora Entrada Almapac',
        'Peso Neto UPDP (TM)',
        'Peso Bruto UPDP (TM)',
        'Peso Bruto Almapac (TM)',
        'Destino (pre-asignado)',
        'Acumulado UPDP (TM)',
        'Observaciones'
      ])

      viajes
        .filter(v => v.estado === 'incompleto')
        .sort((a, b) => a.viaje_numero - b.viaje_numero)
        .forEach(v => {
          incompletosData.push([
            v.viaje_numero,
            formatFecha(v.fecha),
            v.producto?.nombre || 'N/A',
            v.placa,
            formatHora(v.hora_salida_updp),
            formatHora(v.hora_entrada_almapac),
            v.peso_neto_updp_tm?.toFixed(3) || '0.000',
            v.peso_bruto_updp_tm?.toFixed(3) || '0.000',
            v.peso_bruto_almapac_tm?.toFixed(3) || '0.000',
            v.destino?.nombre || '—',
            v.total_acumulado_tm?.toFixed(3) || '0.000',
            v.observaciones || ''
          ])
        })

      const wsIncompletos = XLSX.utils.aoa_to_sheet(incompletosData)
      XLSX.utils.book_append_sheet(wb, wsIncompletos, 'Viajes Pendientes')

      const bandaData = []
      bandaData.push(['LECTURAS DE BANDA'])
      bandaData.push(['Barco:', barco.nombre])
      bandaData.push([])
      bandaData.push([
        'Fecha/Hora (El Salvador)',
        'Producto',
        'Acumulado (TM)',
        'Acumulado (KG)',
        'Destino'
      ])

      lecturasBanda
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
        .forEach(l => {
          bandaData.push([
            formatUTCToSV(l.fecha_hora, 'DD/MM/YYYY HH:mm:ss'),
            l.producto?.nombre || 'N/A',
            l.acumulado_tm?.toFixed(3) || '0.000',
            l.acumulado_kg || 0,
            l.destino?.nombre || '—'
          ])
        })

      const wsBanda = XLSX.utils.aoa_to_sheet(bandaData)
      XLSX.utils.book_append_sheet(wb, wsBanda, 'Lecturas Banda')

      const bitacoraData = []
      bitacoraData.push(['BITÁCORA DE OPERACIONES'])
      bitacoraData.push(['Barco:', barco.nombre])
      bitacoraData.push([])
      bitacoraData.push([
        'Fecha/Hora',
        'Producto',
        'Comentarios'
      ])

      bitacora
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
        .forEach(b => {
          bitacoraData.push([
            formatFechaHora(b.fecha_hora),
            b.producto?.nombre || 'N/A',
            b.comentarios || ''
          ])
        })

      const wsBitacora = XLSX.utils.aoa_to_sheet(bitacoraData)
      XLSX.utils.book_append_sheet(wb, wsBitacora, 'Bitácora')

      const fechaStr = new Date().toISOString().split('T')[0]
      const nombreArchivo = `${barco.nombre.replace(/\s+/g, '_')}_${fechaStr}_completo.xlsx`

      XLSX.writeFile(wb, nombreArchivo)

      toast.success('✅ Archivo Excel generado correctamente')
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      toast.error('Error al generar el archivo Excel')
    }
  }

  const cambiarProducto = (producto) => {
    setProductoActivo(producto)

    const siguienteNumero = getSiguienteNumeroViaje(producto.id)

    setNuevoViaje(prev => ({
      ...prev,
      producto_id: producto.id,
      viaje_numero: siguienteNumero,
      fecha: getLocalDateString()
    }))
    setModoRegistro('nuevo')
    setViajeSeleccionado(null)
    setEditandoViaje(null)
    setEditandoLectura(null)
    setEditandoBitacora(null)
    setVistaGraficos(false)
    setBuscarPlaca('')
    setAcumuladoPreview(0)

    if (producto.tipo_registro === 'banda') {
      setTipoRegistro('banda')
    } else if (producto.tipo_registro === 'viajes') {
      setTipoRegistro('viajes')
    } else {
      setTipoRegistro('viajes')
    }
  }

  const cancelarEdicion = () => {
    setEditandoViaje(null)
    setEditandoLectura(null)
    setEditandoBitacora(null)
    setModoRegistro('nuevo')

    if (productoActivo) {
      const siguienteNumero = getSiguienteNumeroViaje(productoActivo.id)
      setNuevoViaje(prev => ({
        ...prev,
        viaje_numero: siguienteNumero,
        fecha: getLocalDateString(),
        hora_salida_updp: '',
        hora_entrada_almapac: '',
        placa: 'C-',
        peso_neto_updp_tm: '',
        peso_bruto_almapac_tm: '',
        peso_bruto_updp_tm: '',
        destino_id: '',
        observaciones: ''
      }))
      actualizarAcumuladoPreview('')
    }

    setCompletarViaje({
      destino_id: '',
      peso_destino_tm: '',
      hora_salida_almapac: '',
      hora_entrada_almapac: '',
      peso_bruto_almapac_tm: '',
      observaciones_destino: ''
    })
    setLecturaActual({
      fecha_hora: getCurrentSVTimeForInput(),
      acumulado_tm: '',
      destino_id: ''
    })
    setBitacoraActual({
      fecha_hora: '',
      comentarios: ''
    })
  }

  // Datos para gráfica de flujo acumulado por hora
  const datosGraficoFlujo = useMemo(() => {
    if (!productoActivo || !barco) return []

    const viajesProd = viajes.filter(v =>
      v.producto_id === productoActivo.id &&
      v.estado === 'completo' &&
      v.peso_destino_tm > 0 &&
      v.hora_salida_almapac
    )

    const lecturasProd = lecturasBanda.filter(l =>
      l.producto_id === productoActivo.id
    )

    const eventos = []

    viajesProd.forEach(v => {
      const fechaHoraStr = `${v.fecha}T${v.hora_salida_almapac}`
      const timestamp = new Date(fechaHoraStr).getTime()
      if (!isNaN(timestamp)) {
        eventos.push({
          timestamp,
          tipo: 'viaje',
          peso: Number(v.peso_destino_tm) || 0,
          fecha: v.fecha,
          hora: v.hora_salida_almapac
        })
      }
    })

    lecturasProd.forEach(l => {
      const timestamp = new Date(l.fecha_hora).getTime()
      if (!isNaN(timestamp)) {
        eventos.push({
          timestamp,
          tipo: 'banda',
          peso: Number(l.acumulado_tm) || 0,
          fecha: l.fecha_hora.split('T')[0],
          hora: l.fecha_hora.split('T')[1]?.substring(0, 5) || '00:00'
        })
      }
    })

    eventos.sort((a, b) => a.timestamp - b.timestamp)

    const acumuladoPorHora = []
    let acumuladoViajes = 0
    let ultimoValorBanda = 0

    eventos.forEach(evento => {
      const horaKey = `${evento.fecha} ${evento.hora.substring(0, 5)}`

      if (evento.tipo === 'viaje') {
        acumuladoViajes += evento.peso
      } else {
        ultimoValorBanda = evento.peso
      }

      const total = productoActivo.tipo_registro === 'banda' ? ultimoValorBanda :
        productoActivo.tipo_registro === 'viajes' ? acumuladoViajes :
          acumuladoViajes + ultimoValorBanda

      acumuladoPorHora.push({
        hora: horaKey,
        timestamp: evento.timestamp,
        viajes: Number(acumuladoViajes.toFixed(3)),
        banda: Number(ultimoValorBanda.toFixed(3)),
        total: Number(total.toFixed(3))
      })
    })

    return acumuladoPorHora
  }, [viajes, lecturasBanda, productoActivo, barco])

  // Flujo por hora de BANDA total
  const calcularFlujoBandaTotalPorHora = useMemo(() => {
    if (!productoActivo) return 0

    const lecturasProd = lecturasBanda.filter(l => l.producto_id === productoActivo.id)

    if (lecturasProd.length < 2) return 0

    const ordenadas = [...lecturasProd].sort(
      (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
    )

    const primera = ordenadas[0]
    const ultima = ordenadas[ordenadas.length - 1]

    const diferenciaHoras =
      (new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)

    if (diferenciaHoras <= 0) return 0

    const deltaAcumulado =
      (Number(ultima.acumulado_tm) || 0) - (Number(primera.acumulado_tm) || 0)

    if (deltaAcumulado <= 0) return 0

    return deltaAcumulado / diferenciaHoras
  }, [lecturasBanda, productoActivo])

  // Calcular resumen por producto
  const resumenProductos = useMemo(() => {
    if (!productos.length) return {}

    const resumen = {}

    productos.forEach(prod => {
      const metaTM = barco?.metas_json?.limites?.[prod.codigo] || 0

      const viajesCompletos = viajes.filter(v => v.producto_id === prod.id && v.estado === 'completo')
      const totalViajesTM = viajesCompletos.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0)

      const todosLosViajesUPDP = viajes.filter(v => v.producto_id === prod.id && v.peso_neto_updp_tm !== null)
      const acumuladoUPDP = todosLosViajesUPDP.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
      
      const acumuladoAlmapac = viajesCompletos.reduce((sum, v) => sum + (Number(v.peso_bruto_almapac_tm) || 0), 0)
      const acumuladoSistema = viajesCompletos.reduce((sum, v) => sum + (Number(v.peso_bruto_updp_tm) || 0), 0)

      const incompletosProd = viajes.filter(v => v.producto_id === prod.id && v.estado === 'incompleto')

      const lecturasProd = lecturasBanda.filter(l => l.producto_id === prod.id)

      const ultimaLecturaPorDestino = {}
      lecturasProd.forEach(l => {
        const dId = l.destino_id
        if (!dId) return
        if (
          !ultimaLecturaPorDestino[dId] ||
          new Date(l.fecha_hora) > new Date(ultimaLecturaPorDestino[dId].fecha_hora)
        ) {
          ultimaLecturaPorDestino[dId] = l
        }
      })
      const totalBandaTM = Object.values(ultimaLecturaPorDestino)
        .reduce((sum, l) => sum + (Number(l.acumulado_tm) || 0), 0)

      const ultimaLectura = lecturasProd.length > 0
        ? [...lecturasProd].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))[0]
        : null

      const bitacoraProd = bitacora.filter(b => b.producto_id === prod.id)
      const ultimaBitacora = bitacoraProd.length > 0
        ? [...bitacoraProd].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))[0]
        : null

      const totalTM = prod.tipo_registro === 'banda' ? totalBandaTM :
        prod.tipo_registro === 'viajes' ? totalViajesTM :
          totalViajesTM + totalBandaTM

      resumen[prod.id] = {
        id: prod.id,
        codigo: prod.codigo,
        nombre: prod.nombre,
        icono: prod.icono,
        tipo: prod.tipo_registro,
        metaTM: metaTM,
        viajesTM: totalViajesTM,
        bandaTM: totalBandaTM,
        totalTM,
        acumuladoUPDP: acumuladoUPDP,
        acumuladoAlmapac: acumuladoAlmapac,
        acumuladoSistema: acumuladoSistema,
        viajes: viajesCompletos.length,
        incompletos: incompletosProd.length,
        lecturas: lecturasProd.length,
        bitacora: bitacoraProd.length,
        ultimaLectura: ultimaLectura,
        ultimoViaje: viajesCompletos.length > 0 ? viajesCompletos[0] : null,
        ultimaBitacora: ultimaBitacora
      }
    })

    Object.keys(resumen).forEach(key => {
      const prod = resumen[key]
      prod.porcentaje = prod.metaTM > 0 ? (prod.totalTM / prod.metaTM) * 100 : 0
      prod.faltanteTM = Math.max(0, prod.metaTM - prod.totalTM)
      prod.completado = prod.totalTM >= prod.metaTM && prod.metaTM > 0
      prod.excedenteTM = Math.max(0, prod.totalTM - prod.metaTM)
    })

    return resumen
  }, [productos, viajes, lecturasBanda, bitacora, barco])

  // Calcular acumulado actual del producto activo
  const acumuladoActualProducto = useMemo(() => {
    if (!productoActivo) return 0
    
    const todosLosViajes = viajes.filter(v => 
      v.producto_id === productoActivo.id && 
      v.peso_neto_updp_tm !== null
    )
    
    return todosLosViajes.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
  }, [viajes, productoActivo])

  // Viajes completos filtrados por búsqueda
  const viajesFiltrados = useMemo(() => {
    if (!productoActivo) return []

    const completos = viajes.filter(v =>
      v.producto_id === productoActivo.id && v.estado === 'completo'
    )

    let filtrados = completos
    if (searchTerm.trim()) {
      const termino = searchTerm.trim().toLowerCase()
      filtrados = completos.filter(viaje =>
        viaje.placa.toLowerCase().includes(termino)
      )
    }

    const ordenados = [...filtrados].sort((a, b) => {
      if (ordenViajes === 'asc') {
        return a.viaje_numero - b.viaje_numero
      } else {
        return b.viaje_numero - a.viaje_numero
      }
    })
    
    return ordenados
  }, [viajes, productoActivo, searchTerm, ordenViajes])

  // Detectar saltos de correlativo
  const saltosCorrelativo = useMemo(() => {
    if (!viajesFiltrados.length || ordenViajes !== 'asc') return []
    
    const saltos = []
    for (let i = 0; i < viajesFiltrados.length - 1; i++) {
      const actual = viajesFiltrados[i].viaje_numero
      const siguiente = viajesFiltrados[i + 1].viaje_numero
      if (siguiente - actual > 1) {
        saltos.push({
          desde: actual,
          hasta: siguiente,
          faltantes: siguiente - actual - 1
        })
      }
    }
    return saltos
  }, [viajesFiltrados, ordenViajes])

  // =====================================================
  // 🔥 NUEVA VERSIÓN: Resumen por destino con límites por producto
  // =====================================================
  const resumenPorDestino = useMemo(() => {
    if (!productoActivo || !destinos.length) return []

    // Obtener límites por producto-destino (nueva estructura)
    const limitesProductoDestino = barco?.metas_json?.limites_por_producto_destino || {}
    // Obtener límites para el producto activo
    const limitesProductoActivo = limitesProductoDestino[productoActivo.codigo] || {}
    
    // FALLBACK: Si no hay límites en la nueva estructura, usar la antigua (compatibilidad)
    const limitesDestinoAntiguo = barco?.metas_json?.limites_destino || {}

    const mapa = {}

    viajes
      .filter(v => v.producto_id === productoActivo.id && v.estado === 'completo' && v.destino_id)
      .forEach(v => {
        const key = v.destino_id
        if (!mapa[key]) {
          mapa[key] = {
            destino_id: key,
            nombre: v.destino?.nombre || `Destino ${key}`,
            // Priorizar el límite específico del producto, fallback al antiguo
            limite_tm: limitesProductoActivo[key] || limitesDestinoAntiguo[key] || 0,
            viajes_count: 0,
            viajes_tm: 0,
            banda_count: 0,
            banda_tm: 0,
            total_tm: 0,
            detalle_viajes: [],
            detalle_banda: []
          }
        }
        mapa[key].viajes_count += 1
        mapa[key].viajes_tm += Number(v.peso_destino_tm) || 0
        mapa[key].detalle_viajes.push(v)
      })

    lecturasBanda
      .filter(l => l.producto_id === productoActivo.id && l.destino_id)
      .forEach(l => {
        const key = l.destino_id
        if (!mapa[key]) {
          mapa[key] = {
            destino_id: key,
            nombre: l.destino?.nombre || `Destino ${key}`,
            // Priorizar el límite específico del producto, fallback al antiguo
            limite_tm: limitesProductoActivo[key] || limitesDestinoAntiguo[key] || 0,
            viajes_count: 0,
            viajes_tm: 0,
            banda_count: 0,
            banda_tm: 0,
            total_tm: 0,
            detalle_viajes: [],
            detalle_banda: []
          }
        }
        mapa[key].banda_count += 1
        mapa[key].detalle_banda.push(l)
      })

    Object.values(mapa).forEach(d => {
      if (d.detalle_banda.length > 0) {
        const ultima = d.detalle_banda.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))[0]
        d.banda_tm = Number(ultima.acumulado_tm) || 0
      }
      d.total_tm = d.viajes_tm + d.banda_tm

      d.porcentaje = d.limite_tm > 0 ? (d.total_tm / d.limite_tm) * 100 : 0
      d.faltante_tm = Math.max(0, d.limite_tm - d.total_tm)
      d.excedente_tm = Math.max(0, d.total_tm - d.limite_tm)
      d.completado = d.limite_tm > 0 && d.total_tm >= d.limite_tm
      d.cerca_limite = d.limite_tm > 0 && d.porcentaje >= 90 && d.porcentaje < 100
    })

    return Object.values(mapa).sort((a, b) => b.total_tm - a.total_tm)
  }, [productoActivo, viajes, lecturasBanda, destinos, barco])

  // ALERTAS AUTOMÁTICAS
  useEffect(() => {
    if (resumenPorDestino.length > 0 && barco?.estado === 'activo') {
      resumenPorDestino.forEach(dest => {
        if (dest.limite_tm > 0 && dest.cerca_limite) {
          const toastId = `limite-${dest.destino_id}-${productoActivo?.id}`
          if (!window[toastId]) {
            window[toastId] = true
            toast(
              `⚠️ ${productoActivo?.nombre} - ${dest.nombre} está al ${dest.porcentaje.toFixed(1)}% de su límite (${dest.limite_tm.toFixed(3)} TM)`,
              {
                id: toastId,
                duration: 8000,
                icon: '⚠️',
                style: {
                  background: '#fbbf24',
                  color: '#000',
                },
              }
            )
          }
        } else if (dest.limite_tm > 0 && dest.completado) {
          const toastId = `completo-${dest.destino_id}-${productoActivo?.id}`
          if (!window[toastId]) {
            window[toastId] = true
            toast.success(
              `✅ ${productoActivo?.nombre} - ${dest.nombre} ha alcanzado su límite de ${dest.limite_tm.toFixed(3)} TM`,
              {
                id: toastId,
                duration: 8000,
              }
            )
          }
        }
      })
    }
  }, [resumenPorDestino, barco?.estado, productoActivo])

  // Actualizar preview
  useEffect(() => {
    if (productoActivo) {
      actualizarAcumuladoPreview('')
    }
  }, [productoActivo, viajes])

  const productoSeleccionado = useMemo(() => {
    if (!productoActivo) return null
    return resumenProductos[productoActivo.id]
  }, [productoActivo, resumenProductos])

  const viajesCompletos = useMemo(() => {
    if (!productoActivo) return []
    return viajes
      .filter(v => v.producto_id === productoActivo.id && v.estado === 'completo')
      .sort((a, b) => b.viaje_numero - a.viaje_numero)
  }, [viajes, productoActivo])

  const viajesIncompletosProducto = useMemo(() => {
    if (!productoActivo) return []
    return viajes
      .filter(v => v.producto_id === productoActivo.id && v.estado === 'incompleto')
      .sort((a, b) => b.viaje_numero - a.viaje_numero)
  }, [viajes, productoActivo])

  const viajesIncompletosFiltrados = useMemo(() => {
    if (!viajesIncompletosProducto.length) return []

    if (!buscarPlaca.trim()) return viajesIncompletosProducto

    const terminoBusqueda = buscarPlaca.trim().toLowerCase()
    return viajesIncompletosProducto.filter(viaje =>
      viaje.placa.toLowerCase().includes(terminoBusqueda)
    )
  }, [viajesIncompletosProducto, buscarPlaca])

  const lecturasFiltradas = useMemo(() => {
    if (!productoActivo) return []
    return lecturasBanda
      .filter(l => l.producto_id === productoActivo.id)
      .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
  }, [lecturasBanda, productoActivo])

  const bitacoraFiltrada = useMemo(() => {
    if (!productoActivo) return []
    return bitacora
      .filter(b => b.producto_id === productoActivo.id)
      .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
  }, [bitacora, productoActivo])

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

      const { data: destinosData } = await supabase
        .from('destinos')
        .select('*')
        .eq('activo', true)

      setDestinos(destinosData || [])

      const { data: viajesData } = await supabase
        .from('viajes')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono),
          destino:destino_id(codigo, nombre)
        `)
        .eq('barco_id', barcoData.id)
        .order('viaje_numero', { ascending: true })

      setViajes(viajesData || [])

      const incompletos = viajesData?.filter(v => v.estado === 'incompleto') || []
      setViajesIncompletos(incompletos)

      const { data: bandaData } = await supabase
        .from('lecturas_banda')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono),
          destino:destino_id(codigo, nombre)
        `)
        .eq('barco_id', barcoData.id)
        .order('fecha_hora', { ascending: false })

      setLecturasBanda(bandaData || [])

      const { data: bitacoraData } = await supabase
        .from('bitacora_flujos')
        .select(`
          *,
          producto:producto_id(codigo, nombre, icono)
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

  useEffect(() => {
    cargarDatos()
  }, [token])

  useEffect(() => {
    if (productos.length > 0 && !productoActivo) {
      setProductoActivo(productos[0])

      const siguienteNumero = getSiguienteNumeroViaje(productos[0].id)

      setNuevoViaje(prev => ({
        ...prev,
        producto_id: productos[0].id,
        viaje_numero: siguienteNumero,
        fecha: getLocalDateString()
      }))

      if (productos[0].tipo_registro === 'banda') {
        setTipoRegistro('banda')
      }
    }
  }, [productos])

  useEffect(() => {
    if (productoActivo && modoRegistro === 'nuevo' && !editandoViaje) {
      const siguienteNumero = getSiguienteNumeroViaje(productoActivo.id)
      setNuevoViaje(prev => ({
        ...prev,
        producto_id: productoActivo.id,
        viaje_numero: siguienteNumero,
        fecha: getLocalDateString()
      }))
    }
  }, [productoActivo, viajes, modoRegistro])

  // Cerrar modal al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        cerrarModalEdicion()
      }
    }
    if (modalEdicionAbierto) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [modalEdicionAbierto])

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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Truck className="w-8 h-8" />
                  {barco.nombre}
                </h1>
                {barco.codigo_barco && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
                    {barco.codigo_barco}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${barco.estado === 'activo'
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
                Registro de Operaciones · {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              {viajesIncompletos.length > 0 && barco.estado === 'activo' && (
                <div className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {viajesIncompletos.length} pendientes
                </div>
              )}

              <button
                onClick={exportarTodoAExcel}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
                title="Exportar todos los registros a Excel"
              >
                <Download className="w-4 h-4" />
                Exportar Todo a Excel
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

          {/* Indicadores de inicio/fin de descarga */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`rounded-xl p-4 ${barco.operacion_iniciada_at
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-yellow-500/20 border border-yellow-500/30'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${barco.operacion_iniciada_at
                    ? 'bg-green-500/30'
                    : 'bg-yellow-500/30'
                  }`}>
                  <Play className={`w-5 h-5 ${barco.operacion_iniciada_at
                      ? 'text-green-400'
                      : 'text-yellow-400'
                    }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">INICIO DE DESCARGA</p>
                    {!barco.operacion_iniciada_at && (
                      <span className="text-[10px] bg-yellow-500/30 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                        PENDIENTE
                      </span>
                    )}
                  </div>
                  {barco.operacion_iniciada_at ? (
                    <div>
                      <p className="text-lg font-black text-green-400">
                        {new Date(barco.operacion_iniciada_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                      {barco.operacion_iniciada_por && (
                        <p className="text-xs text-green-300">
                          Iniciado por: ID {barco.operacion_iniciada_por}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-400 font-medium">
                      La descarga aún no ha iniciado
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={`rounded-xl p-4 ${barco.operacion_finalizada_at
                ? 'bg-red-500/20 border border-red-500/30'
                : barco.operacion_iniciada_at && !barco.operacion_finalizada_at
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-slate-700/50 border border-white/10'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${barco.operacion_finalizada_at
                    ? 'bg-red-500/30'
                    : barco.operacion_iniciada_at && !barco.operacion_finalizada_at
                      ? 'bg-blue-500/30'
                      : 'bg-slate-600'
                  }`}>
                  <StopCircle className={`w-5 h-5 ${barco.operacion_finalizada_at
                      ? 'text-red-400'
                      : barco.operacion_iniciada_at && !barco.operacion_finalizada_at
                        ? 'text-blue-400'
                        : 'text-slate-400'
                    }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">FIN DE DESCARGA</p>
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
                        {new Date(barco.operacion_finalizada_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                      {barco.operacion_motivo_finalizacion && (
                        <p className="text-xs text-red-300 mt-1">
                          Motivo: {barco.operacion_motivo_finalizacion}
                        </p>
                      )}
                    </div>
                  ) : barco.operacion_iniciada_at ? (
                    <p className="text-blue-400 font-medium">
                      Descarga en progreso...
                    </p>
                  ) : (
                    <p className="text-slate-400 font-medium">
                      Esperando inicio de descarga
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tiempos de Arribo/Ataque/Recibido */}
          {(barco.tiempo_arribo || barco.tiempo_ataque || barco.tiempo_recibido) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {barco.tiempo_arribo && (
                <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Anchor className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">ARRIBO</span>
                    {barco.tiempo_arribo_editado && (
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {new Date(barco.tiempo_arribo).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {barco.tiempo_ataque && (
                <div className="bg-yellow-500/10 rounded-xl p-3 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">ATAQUE</span>
                    {barco.tiempo_ataque_editado && (
                      <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {new Date(barco.tiempo_ataque).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {barco.tiempo_recibido && (
                <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Inbox className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400">RECIBIDO</span>
                    {barco.tiempo_recibido_editado && (
                      <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full ml-auto">Editado</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {new Date(barco.tiempo_recibido).toLocaleString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {barco.estado === 'finalizado' && barco.operacion_motivo_finalizacion && (
            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">
                  <span className="font-bold">Motivo de finalización:</span> {barco.operacion_motivo_finalizacion}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* PESTAÑAS DE PRODUCTOS */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex overflow-x-auto">
            {productos.map(prod => {
              const resumen = resumenProductos[prod.id]
              const activo = productoActivo?.id === prod.id

              let colorClass = 'blue'
              if (prod.codigo === 'MA-001') colorClass = 'amber'
              else if (prod.codigo === 'HS-001') colorClass = 'green'
              else if (prod.codigo === 'DDGS') colorClass = 'orange'

              return (
                <button
                  key={prod.id}
                  onClick={() => cambiarProducto(prod)}
                  className={`flex-1 min-w-[200px] px-6 py-4 border-b-2 transition-all ${activo
                      ? `border-${colorClass}-500 bg-${colorClass}-500/10`
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
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${prod.tipo_registro === 'mixto' ? 'bg-purple-500/20 text-purple-400' :
                            prod.tipo_registro === 'banda' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-green-500/20 text-green-400'
                          }`}>
                          {prod.tipo_registro}
                        </span>
                      </div>
                      {resumen && resumen.incompletos > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                            {resumen.incompletos} pendientes
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* TARJETA DE RESUMEN DEL PRODUCTO ACTIVO */}
        {productoActivo && productoSeleccionado && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="text-5xl">{productoActivo.icono}</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">{productoActivo.nombre}</h2>
                  <p className="text-slate-400 flex items-center gap-2">
                    {productoActivo.codigo}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${productoActivo.tipo_registro === 'mixto' ? 'bg-purple-500/20 text-purple-400' :
                        productoActivo.tipo_registro === 'banda' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-green-500/20 text-green-400'
                      }`}>
                      {productoActivo.tipo_registro}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Barco: {barco.nombre} · {barco.codigo_barco}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">
                  {productoSeleccionado.totalTM.toFixed(3)} TM
                </p>
                <div className="flex gap-3 text-sm text-slate-400">
                  {productoActivo.tipo_registro !== 'banda' && (
                    <span>🚛 {productoSeleccionado.viajes} viajes completos</span>
                  )}
                  {productoActivo.tipo_registro !== 'viajes' && (
                    <span>📊 {productoSeleccionado.lecturas} lecturas</span>
                  )}
                  <span>📝 {productoSeleccionado.bitacora} registros</span>
                  {productoSeleccionado.incompletos > 0 && (
                    <span className="text-yellow-400">⏳ {productoSeleccionado.incompletos} pendientes</span>
                  )}
                </div>
              </div>
            </div>

            {productoSeleccionado.metaTM > 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Cantidad Manifestada</p>
                  <p className="text-xl font-bold text-white">
                    {productoSeleccionado.metaTM.toFixed(3)} TM
                  </p>
                </div>
                <div className="bg-slate-900 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Progreso</p>
                  <p className="text-xl font-bold text-blue-400">
                    {productoSeleccionado.porcentaje.toFixed(1)}%
                  </p>
                </div>

                <div className={`bg-slate-900 rounded-xl p-4 ${productoSeleccionado.faltanteTM > 0
                    ? 'border-l-4 border-amber-500'
                    : 'border-l-4 border-green-500'
                  }`}>
                  <p className="text-xs text-slate-500">
                    {productoSeleccionado.faltanteTM > 0 ? 'Faltante' : 'Excedente'}
                  </p>
                  <p className={`text-xl font-bold ${productoSeleccionado.faltanteTM > 0
                      ? 'text-amber-400'
                      : 'text-green-400'
                    }`}>
                    {productoSeleccionado.faltanteTM > 0
                      ? productoSeleccionado.faltanteTM.toFixed(3)
                      : '+' + productoSeleccionado.excedenteTM.toFixed(3)} TM
                  </p>
                </div>

                <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-xl p-4 col-span-2">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-yellow-200" />
                    <div>
                      <p className="text-xs text-yellow-200 uppercase font-bold">ACUMULADO UPDP</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">
                          {productoSeleccionado.acumuladoUPDP.toFixed(3)}
                        </span>
                        <span className="text-sm text-yellow-200">TM</span>
                      </div>
                      <p className="text-[10px] text-yellow-300 mt-1">
                        Incluye {productoSeleccionado.incompletos} viaje(s) pendiente(s)
                      </p>
                    </div>
                  </div>
                </div>

                {productoActivo.tipo_registro === 'banda' && (
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 col-span-2">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-blue-200" />
                      <div>
                        <p className="text-xs text-blue-200 uppercase font-bold">FLUJO PROMEDIO POR HORA</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">
                            {calcularFlujoBandaTotalPorHora.toFixed(3)}
                          </span>
                          <span className="text-sm text-blue-200">TM/h</span>
                        </div>
                        {lecturasFiltradas.length >= 2 && (
                          <p className="text-[10px] text-blue-300 mt-1">
                            {(() => {
                              const ordenadas = [...lecturasFiltradas].sort(
                                (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
                              )
                              const primera = ordenadas[0]
                              const ultima = ordenadas[ordenadas.length - 1]
                              const delta = (Number(ultima.acumulado_tm) - Number(primera.acumulado_tm)).toFixed(3)
                              const horas = ((new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)).toFixed(1)
                              return `${delta} TM en ${horas} h`
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 👇 NUEVO: Mostrar límites configurados para este producto 
            {(() => {
              const limitesProductoDestino = barco?.metas_json?.limites_por_producto_destino || {}
              const limitesProductoActivo = limitesProductoDestino[productoActivo?.codigo] || {}
              const limitesActivos = Object.entries(limitesProductoActivo).filter(([_, limite]) => limite > 0)
              
              if (limitesActivos.length > 0) {
                return (
                  <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-xs text-amber-400 font-bold mb-2">📊 Límites configurados para {productoActivo.nombre}:</p>
                    <div className="flex flex-wrap gap-3">
                      {limitesActivos.map(([destinoId, limite]) => {
                        const destino = destinos.find(d => d.id === parseInt(destinoId))
                        return (
                          <div key={destinoId} className="bg-slate-800 rounded-lg px-3 py-1">
                            <span className="text-xs text-slate-400">{destino?.nombre || `Destino ${destinoId}`}:</span>
                            <span className="text-sm font-bold text-amber-400 ml-2">{Number(limite).toFixed(3)} TM</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return null
            })()} */}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setVistaGraficos(!vistaGraficos)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${vistaGraficos
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                  }`}
              >
                <LineChart className="w-4 h-4" />
                {vistaGraficos ? 'Ver Datos' : 'Ver Gráfica de Tendencia'}
              </button>
            </div>
          </div>
        )}

        {/* GRÁFICA DE FLUJO ACUMULADO */}
        {vistaGraficos && productoActivo && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-indigo-400" />
              Tendencia de Flujo Acumulado - {productoActivo.nombre}
              <span className="text-sm font-normal text-slate-500 ml-2">
                {barco.nombre}
              </span>
            </h3>

            {datosGraficoFlujo.length > 0 ? (
              <>
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReLineChart data={datosGraficoFlujo} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="hora"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        label={{ value: 'TM', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Legend />
                      {productoActivo.tipo_registro !== 'banda' && (
                        <Line
                          type="monotone"
                          dataKey="viajes"
                          stroke="#22c55e"
                          name="Viajes (TM)"
                          dot={false}
                          strokeWidth={2}
                        />
                      )}
                      {productoActivo.tipo_registro !== 'viajes' && (
                        <Line
                          type="monotone"
                          dataKey="banda"
                          stroke="#3b82f6"
                          name="Banda (TM)"
                          dot={false}
                          strokeWidth={2}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#a855f7"
                        name="Total Acumulado (TM)"
                        dot={false}
                        strokeWidth={3}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Último registro</p>
                    <p className="text-lg font-bold text-white">
                      {datosGraficoFlujo[datosGraficoFlujo.length - 1]?.hora}
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Total acumulado</p>
                    <p className="text-lg font-bold text-purple-400">
                      {datosGraficoFlujo[datosGraficoFlujo.length - 1]?.total.toFixed(3)} TM
                    </p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Puntos en gráfica</p>
                    <p className="text-lg font-bold text-white">{datosGraficoFlujo.length}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-900 rounded-xl p-12 text-center">
                <LineChart className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No hay datos suficientes para mostrar la gráfica</p>
                <p className="text-sm text-slate-600 mt-2">
                  Se necesitan viajes completados o lecturas de banda para generar la tendencia
                </p>
              </div>
            )}
          </div>
        )}

        {/* RESUMEN POR DESTINO CON LÍMITES (AHORA CON LÍMITES POR PRODUCTO) */}
        {productoActivo && resumenPorDestino.length > 0 && !vistaGraficos && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-teal-400" />
                Almacenado por Destino
                <span className="text-slate-500 font-normal text-sm ml-1">
                  — {productoActivo.nombre}
                </span>
                <span className="text-xs text-slate-600 ml-2">
                  Barco: {barco.nombre}
                </span>
              </h3>
              <span className="text-slate-400 text-sm">
                Total: <span className="text-white font-bold">
                  {resumenPorDestino.reduce((s, d) => s + d.total_tm, 0).toFixed(3)} TM
                </span>
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {resumenPorDestino.map((dest) => {
                const totalGeneral = resumenPorDestino.reduce((s, d) => s + d.total_tm, 0)
                const pct = totalGeneral > 0 ? (dest.total_tm / totalGeneral) * 100 : 0

                let limiteColor = 'teal'
                let limiteMensaje = ''
                if (dest.limite_tm > 0) {
                  if (dest.completado) {
                    limiteColor = 'green'
                    limiteMensaje = `✓ COMPLETADO`
                  } else if (dest.cerca_limite) {
                    limiteColor = 'amber'
                    limiteMensaje = `⚠️ Faltan ${dest.faltante_tm.toFixed(3)} TM`
                  } else {
                    limiteColor = 'blue'
                    limiteMensaje = `${dest.porcentaje.toFixed(1)}% de ${dest.limite_tm.toFixed(3)} TM`
                  }
                }

                return (
                  <div
                    key={dest.destino_id}
                    className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${dest.limite_tm > 0 && dest.completado
                        ? 'border-green-500/30 ring-1 ring-green-500/20'
                        : dest.limite_tm > 0 && dest.cerca_limite
                          ? 'border-amber-500/30 ring-1 ring-amber-500/20 animate-pulse'
                          : 'border-white/5'
                      }`}
                  >
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${dest.limite_tm > 0 && dest.completado
                        ? 'border-green-500/20 bg-green-500/5'
                        : dest.limite_tm > 0 && dest.cerca_limite
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-white/5'
                      }`}>
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${dest.limite_tm > 0 && dest.completado
                            ? 'text-green-400'
                            : dest.limite_tm > 0 && dest.cerca_limite
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`} />
                        <span className="font-bold text-white">{dest.nombre}</span>
                        {dest.limite_tm > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dest.completado
                              ? 'bg-green-500/20 text-green-400'
                              : dest.cerca_limite
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {dest.completado ? 'COMPLETO' : `${dest.porcentaje.toFixed(0)}%`}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="px-4 pt-3">
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${dest.limite_tm > 0 && dest.completado
                              ? 'bg-green-500'
                              : dest.limite_tm > 0 && dest.cerca_limite
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className={`text-2xl font-black ${dest.limite_tm > 0 && dest.completado
                              ? 'text-green-400'
                              : dest.limite_tm > 0 && dest.cerca_limite
                                ? 'text-amber-400'
                                : 'text-teal-400'
                            }`}>
                            {dest.total_tm.toFixed(3)} TM
                          </p>
                          {dest.limite_tm > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              Límite: {dest.limite_tm.toFixed(3)} TM
                            </p>
                          )}
                        </div>

                        {limiteMensaje && (
                          <div className={`text-right ${dest.completado
                              ? 'text-green-400'
                              : dest.cerca_limite
                                ? 'text-amber-400'
                                : 'text-blue-400'
                            }`}>
                            <p className="text-xs font-bold">{limiteMensaje}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {dest.limite_tm > 0 && (
                      <div className="px-4 pb-2">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Progreso vs límite</span>
                          <span className={dest.completado ? 'text-green-400' : dest.cerca_limite ? 'text-amber-400' : 'text-blue-400'}>
                            {dest.porcentaje.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${dest.completado
                                ? 'bg-green-500'
                                : dest.cerca_limite
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            style={{ width: `${Math.min(dest.porcentaje, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                      {dest.viajes_count > 0 && (
                        <div className="bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Truck className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Viajes</span>
                          </div>
                          <p className="text-lg font-bold text-green-400">
                            {dest.viajes_tm.toFixed(3)}
                            <span className="text-xs font-normal text-slate-500 ml-1">TM</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {dest.viajes_count} viaje{dest.viajes_count !== 1 ? 's' : ''}
                          </p>
                          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                            {dest.detalle_viajes
                              .sort((a, b) => a.viaje_numero - b.viaje_numero)
                              .map(v => (
                                <div
                                  key={v.id}
                                  className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded"
                                >
                                  <span>
                                    Viaje #{v.viaje_numero} · {v.placa}
                                    {v.fecha && <span className="text-slate-600 ml-1">({formatFecha(v.fecha)})</span>}
                                  </span>
                                  <span className="text-green-400 font-bold">
                                    {Number(v.peso_destino_tm).toFixed(3)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {dest.banda_count > 0 && (
                        <div className="bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <Scale className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Banda</span>
                          </div>
                          <p className="text-lg font-bold text-blue-400">
                            {dest.banda_tm.toFixed(3)}
                            <span className="text-xs font-normal text-slate-500 ml-1">TM</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Última de {dest.banda_count} lectura{dest.banda_count !== 1 ? 's' : ''}
                          </p>
                          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                            {dest.detalle_banda
                              .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
                              .map(l => (
                                <div
                                  key={l.id}
                                  className="flex justify-between items-center text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded"
                                >
                                  <span>{formatFechaHora(l.fecha_hora)}</span>
                                  <span className="text-blue-400 font-bold">
                                    {Number(l.acumulado_tm).toFixed(3)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-white/10 bg-slate-900 px-6 py-3 flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total viajes</p>
                <p className="text-lg font-black text-green-400">
                  {resumenPorDestino.reduce((s, d) => s + d.viajes_tm, 0).toFixed(3)} TM
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total banda</p>
                <p className="text-lg font-black text-blue-400">
                  {resumenPorDestino.reduce((s, d) => s + d.banda_tm, 0).toFixed(3)} TM
                </p>
              </div>
              <div className="ml-auto">
                <p className="text-[10px] text-slate-500 uppercase font-bold">TOTAL ALMACENADO</p>
                <p className="text-2xl font-black text-teal-400">
                  {resumenPorDestino.reduce((s, d) => s + d.total_tm, 0).toFixed(3)} TM
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SELECTOR DE TIPO DE REGISTRO */}
        {!vistaGraficos && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
            <div className="flex gap-2">
              {productoActivo?.tipo_registro !== 'banda' && (
                <button
                  onClick={() => setTipoRegistro('viajes')}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${tipoRegistro === 'viajes'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  <Truck className="w-4 h-4" />
                  Viajes
                </button>
              )}
              {productoActivo?.tipo_registro !== 'viajes' && (
                <button
                  onClick={() => setTipoRegistro('banda')}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${tipoRegistro === 'banda'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  <Scale className="w-4 h-4" />
                  Banda
                </button>
              )}
              <button
                onClick={() => setTipoRegistro('bitacora')}
                className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${tipoRegistro === 'bitacora'
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
              >
                <BookOpen className="w-4 h-4" />
                Bitácora
              </button>
            </div>

          </div>
        )}

        {/* SECCIÓN DE VIAJES */}
        {!vistaGraficos && tipoRegistro === 'viajes' && (
          <>
            <div ref={viajesSectionRef} className="bg-[#0f172a] border border-white/10 rounded-2xl p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setModoRegistro('nuevo')
                    setViajeSeleccionado(null)
                    setEditandoViaje(null)
                    if (productoActivo) {
                      const siguienteNumero = getSiguienteNumeroViaje(productoActivo.id)
                      setNuevoViaje(prev => ({
                        ...prev,
                        viaje_numero: siguienteNumero,
                        fecha: getLocalDateString()
                      }))
                      actualizarAcumuladoPreview('')
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${modoRegistro === 'nuevo' || modoRegistro === 'editar'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  {editandoViaje ? 'Editando Viaje' : 'Paso 1: Registrar Viaje'}
                </button>
                <button
                  onClick={() => setModoRegistro('completar')}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${modoRegistro === 'completar'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  disabled={viajesIncompletosProducto.length === 0}
                >
                  <MapPin className="w-4 h-4" />
                  Paso 2: Asignar Destino
                  {viajesIncompletosProducto.length > 0 && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {viajesIncompletosProducto.length}
                    </span>
                  )}
                </button>
              </div>
              {(modoRegistro === 'editar' || editandoViaje) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={cancelarEdicion}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Cancelar edición
                  </button>
                </div>
              )}
            </div>

            {(modoRegistro === 'nuevo' || modoRegistro === 'editar' || editandoViaje) && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                    {editandoViaje ? '✏️' : '1'}
                  </span>
                  {editandoViaje ? `Editando Viaje #${editandoViaje.viaje_numero} - ${productoActivo?.nombre}` : `Registrar Viaje #${nuevoViaje.viaje_numero} - ${productoActivo?.nombre}`}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    Barco: {barco.nombre}
                  </span>
                </h2>

                {/* PREVIEW DEL ACUMULADO EN TIEMPO REAL */}
                <div className="mb-6 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-400 uppercase font-bold">ACUMULADO ACTUAL UPDP</p>
                      <p className="text-2xl font-black text-yellow-400">
                        {acumuladoActualProducto.toFixed(3)} TM
                      </p>
                      <p className="text-[10px] text-yellow-300/70 mt-0.5">
                        Incluye {viajesIncompletosProducto.length} viaje(s) pendiente(s)
                      </p>
                    </div>
                    {nuevoViaje.peso_neto_updp_tm && Number(nuevoViaje.peso_neto_updp_tm) > 0 && (
                      <>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">+ Este viaje</p>
                          <p className="text-xl font-bold text-green-400">
                            +{Number(nuevoViaje.peso_neto_updp_tm).toFixed(3)} TM
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-400 uppercase font-bold">NUEVO ACUMULADO</p>
                          <p className="text-3xl font-black text-blue-400">
                            {acumuladoPreview.toFixed(3)} TM
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {((acumuladoPreview / (productoSeleccionado?.metaTM || 1)) * 100).toFixed(1)}% de la meta
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {!nuevoViaje.peso_neto_updp_tm && (
                    <p className="text-xs text-slate-500 mt-2">
                      💡 Ingresa el Peso Neto UPDP para ver cómo quedará el acumulado
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1"># Viaje</label>
                    <input
                      ref={(el) => inputRefs.current['viaje_numero'] = el}
                      type="number"
                      name="viaje_numero"
                      value={nuevoViaje.viaje_numero}
                      onChange={handleNuevoViajeChange}
                      onBlur={(e) => !editandoViaje && handleValidarNumeroViaje(e.target.value)}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'fecha')}
                      className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white ${conflicto ? 'border-red-500 bg-red-500/10' : 'border-white/10'
                        }`}
                    />
                    {validando && (
                      <p className="text-xs text-slate-400 mt-1">⏳ Verificando disponibilidad...</p>
                    )}
                    {conflicto && (
                      <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-red-400">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Viaje <strong>#{nuevoViaje.viaje_numero}</strong> ya ocupado.
                            Siguiente libre: <strong>#{conflicto.sugerido}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAceptarSugerido}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                        >
                          Usar #{conflicto.sugerido}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Fecha <span className="text-red-400">*</span>
                    </label>
                    <input
                      ref={(el) => inputRefs.current['fecha'] = el}
                      type="date"
                      name="fecha"
                      value={nuevoViaje.fecha}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'hora_salida_updp')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Placa <span className="text-red-400">*</span>
                    </label>
                    <input
                      ref={(el) => inputRefs.current['placa'] = el}
                      type="text"
                      name="placa"
                      value={nuevoViaje.placa}
                      onChange={handlePlacaChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'peso_neto_updp_tm')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="C-909389"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Hora Salida UPDP
                    </label>
                    <div className="relative">
                      <input
                        ref={(el) => inputRefs.current['hora_salida_updp'] = el}
                        type="time"
                        name="hora_salida_updp"
                        value={nuevoViaje.hora_salida_updp}
                        onChange={(e) => {
                          const value = e.target.value
                          if (detectarFormatoAmPm(value)) {
                            toast.error('Usa formato 24h (ej: 14:30:45 en lugar de 2:30:45 PM)')
                            const corregida = validateHora24h(value)
                            setNuevoViaje(prev => ({ ...prev, hora_salida_updp: corregida }))
                          } else {
                            handleNuevoViajeChange(e)
                          }
                        }}
                        onKeyDown={(e) => handleKeyDownEnter(e, 'hora_entrada_almapac')}
                        step="1"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNuevoViaje(prev => ({ ...prev, hora_salida_updp: getHoraActual24h() }))
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Usar hora actual"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Peso Bruto UPDP (TM) <span className="text-red-400">*</span>
                    </label>
                    <input
                      ref={(el) => inputRefs.current['peso_bruto_updp_tm'] = el}
                      type="number"
                      step="0.001"
                      name="peso_bruto_updp_tm"
                      value={nuevoViaje.peso_bruto_updp_tm}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'destino_id')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="31.500 (o 31500)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Peso Neto UPDP (TM) <span className="text-red-400">*</span>
                    </label>
                    <input
                      ref={(el) => inputRefs.current['peso_neto_updp_tm'] = el}
                      type="number"
                      step="0.001"
                      name="peso_neto_updp_tm"
                      value={nuevoViaje.peso_neto_updp_tm}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'peso_bruto_almapac_tm')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="19.345 (o 19345)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Hora Entrada Almapac
                    </label>
                    <div className="relative">
                      <input
                        ref={(el) => inputRefs.current['hora_entrada_almapac'] = el}
                        type="time"
                        name="hora_entrada_almapac"
                        value={nuevoViaje.hora_entrada_almapac}
                        onChange={(e) => {
                          const value = e.target.value
                          if (detectarFormatoAmPm(value)) {
                            toast.error('Usa formato 24h (ej: 14:30:45 en lugar de 2:30:45 PM)')
                            const corregida = validateHora24h(value)
                            setNuevoViaje(prev => ({ ...prev, hora_entrada_almapac: corregida }))
                          } else {
                            handleNuevoViajeChange(e)
                          }
                        }}
                        onKeyDown={(e) => handleKeyDownEnter(e, 'placa')}
                        step="1"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setNuevoViaje(prev => ({ ...prev, hora_entrada_almapac: getHoraActual24h() }))
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Usar hora actual"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Peso Bruto Almapac (TM)
                    </label>
                    <input
                      ref={(el) => inputRefs.current['peso_bruto_almapac_tm'] = el}
                      type="number"
                      step="0.001"
                      name="peso_bruto_almapac_tm"
                      value={nuevoViaje.peso_bruto_almapac_tm}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'peso_bruto_updp_tm')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="30.865 (o 30865)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Destino (opcional en paso 1)
                    </label>
                    <select
                      ref={(el) => inputRefs.current['destino_id'] = el}
                      name="destino_id"
                      value={nuevoViaje.destino_id}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => handleKeyDownEnter(e, 'observaciones')}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Seleccionar destino (opcional)</option>
                      {destinos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Puedes seleccionarlo ahora o en paso 2
                    </p>
                  </div>

                  <div className="col-span-4">
                    <label className="block text-xs text-slate-400 mb-1">
                      Observaciones
                    </label>
                    <input
                      ref={(el) => inputRefs.current['observaciones'] = el}
                      type="text"
                      name="observaciones"
                      value={nuevoViaje.observaciones}
                      onChange={handleNuevoViajeChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleGuardarIncompleto()
                        }
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="Notas del viaje (presiona Enter para guardar)"
                    />
                  </div>
                  <div className="flex items-end col-span-4 gap-2">
                    <button
                      onClick={handleGuardarIncompleto}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {editandoViaje ? 'Actualizar Viaje' : 'Registrar Viaje'}
                    </button>
                    {editandoViaje && (
                      <button
                        onClick={() => handleEliminarViaje(editandoViaje.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {modoRegistro === 'completar' && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Asignar Destino - {productoActivo?.nombre}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    Barco: {barco.nombre}
                  </span>
                </h2>

                {!viajeSeleccionado ? (
                  <div className="mb-6">
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-400 mb-2">
                        Buscar por placa:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={buscarPlaca}
                          onChange={(e) => setBuscarPlaca(e.target.value)}
                          placeholder="Ej: C-123456"
                          className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-white"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        {buscarPlaca && (
                          <button
                            onClick={limpiarBuscador}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {viajesIncompletosFiltrados.length} de {viajesIncompletosProducto.length} viajes encontrados
                      </p>
                    </div>

                    <label className="block text-sm font-bold text-slate-400 mb-3">
                      Selecciona el viaje para asignar destino:
                    </label>

                    {viajesIncompletosFiltrados.length === 0 ? (
                      <div className="bg-slate-900 rounded-lg p-8 text-center border border-white/10">
                        <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400">No se encontraron viajes con la placa "{buscarPlaca}"</p>
                        <button
                          onClick={limpiarBuscador}
                          className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-2 max-h-60 overflow-y-auto">
                        {viajesIncompletosFiltrados.map(viaje => (
                          <div
                            key={viaje.id}
                            className="bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg p-4 transition-all group"
                          >
                            <div className="flex justify-between items-center">
                              <button
                                onClick={() => seleccionarViajeParaCompletar(viaje)}
                                className="flex-1 text-left"
                              >
                                <div>
                                  <p className="font-bold text-white">Viaje #{viaje.viaje_numero} · {viaje.placa}</p>
                                  <div className="grid grid-cols-5 gap-4 text-sm mt-1">
                                    <span className="text-slate-400">Fecha: {formatFecha(viaje.fecha)}</span>
                                    <span className="text-slate-400">Salida: {formatHora(viaje.hora_salida_updp)}</span>
                                    <span className="text-slate-400">Entrada: {formatHora(viaje.hora_entrada_almapac)}</span>
                                    <span className="text-green-400">Neto: {viaje.peso_neto_updp_tm?.toFixed(3)} TM</span>
                                    <span className="text-yellow-400">Acum: {viaje.total_acumulado_tm?.toFixed(3)} TM</span>
                                  </div>
                                </div>
                              </button>

                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => seleccionarViajeParaCompletar(viaje)}
                                  className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-all"
                                  title="Completar este viaje"
                                >
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                </button>
                                <button
                                  onClick={() => handleEditarViajeDesdePaso2(viaje)}
                                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-all"
                                  title="Editar viaje completo"
                                >
                                  <Pencil className="w-5 h-5 text-blue-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-white/10">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm text-slate-400">Completando Viaje #{viajeSeleccionado.viaje_numero} · {viajeSeleccionado.placa} - {productoActivo?.nombre}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditarViajeDesdePaso2(viajeSeleccionado)}
                            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
                            title="Editar viaje completo"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar Viaje
                          </button>
                          <button
                            onClick={() => setViajeSeleccionado(null)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Cambiar viaje
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Fecha</p>
                          <p className="font-bold text-white">{formatFecha(viajeSeleccionado.fecha)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Placa</p>
                          <p className="font-bold text-white">{viajeSeleccionado.placa}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hora Salida</p>
                          <p className="font-bold text-white">{formatHora(viajeSeleccionado.hora_salida_updp)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hora Entrada</p>
                          <p className="font-bold text-white">{formatHora(viajeSeleccionado.hora_entrada_almapac) || '—'}</p>
                        </div>
                        {viajeSeleccionado.destino_id && (
                          <div>
                            <p className="text-slate-500">Destino precargado</p>
                            <p className="font-bold text-teal-400">
                              {destinos.find(d => d.id === viajeSeleccionado.destino_id)?.nombre || '—'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-white/10">
                        <div>
                          <p className="text-slate-500">Peso Neto UPDP</p>
                          <p className="font-bold text-green-400">{viajeSeleccionado.peso_neto_updp_tm?.toFixed(3) || '—'} TM</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Peso Bruto Almapac</p>
                          <p className="font-bold text-amber-400">{viajeSeleccionado.peso_bruto_almapac_tm?.toFixed(3) || '—'} TM</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Acumulado UPDP</p>
                          <p className="font-bold text-yellow-400">{viajeSeleccionado.total_acumulado_tm?.toFixed(3) || '—'} TM</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Destino <span className="text-red-400">*</span>
                        </label>
                        <select
                          name="destino_id"
                          value={completarViaje.destino_id}
                          onChange={handleCompletarViajeChange}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                          required
                        >
                          <option value="">Seleccionar</option>
                          {destinos.map(d => (
                            <option key={d.id} value={d.id}>{d.nombre}</option>
                          ))}
                        </select>
                        {viajeSeleccionado.destino_id && !completarViaje.destino_id && (
                          <p className="text-[10px] text-teal-400 mt-1">
                            Puedes cambiarlo si es necesario
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Hora Salida Almapac <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            name="hora_salida_almapac"
                            value={completarViaje.hora_salida_almapac}
                            onChange={(e) => {
                              const value = e.target.value
                              if (detectarFormatoAmPm(value)) {
                                toast.error('Usa formato 24h (ej: 14:30:45)')
                                const corregida = validateHora24h(value)
                                setCompletarViaje(prev => ({ ...prev, hora_salida_almapac: corregida }))
                              } else {
                                handleCompletarViajeChange(e)
                              }
                            }}
                            step="1"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark] cursor-pointer"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCompletarViaje(prev => ({ ...prev, hora_salida_almapac: getHoraActual24h() }))
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400 transition-colors"
                            title="Usar hora actual"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Peso en Destino (TM) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="peso_destino_tm"
                          value={completarViaje.peso_destino_tm}
                          onChange={handleCompletarViajeChange}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                          placeholder="19.815 (o 19815)"
                        />
                        <p className="text-[9px] text-slate-500 mt-0.5">💡 Escribe 19815 → 19.815 TM</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Hora Entrada Almapac
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            name="hora_entrada_almapac"
                            value={completarViaje.hora_entrada_almapac}
                            onChange={(e) => {
                              const value = e.target.value
                              if (detectarFormatoAmPm(value)) {
                                toast.error('Usa formato 24h (ej: 14:30:45)')
                                const corregida = validateHora24h(value)
                                setCompletarViaje(prev => ({ ...prev, hora_entrada_almapac: corregida }))
                              } else {
                                handleCompletarViajeChange(e)
                              }
                            }}
                            step="1"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark] cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCompletarViaje(prev => ({ ...prev, hora_entrada_almapac: getHoraActual24h() }))
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-400 transition-colors"
                            title="Usar hora actual"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">Opcional - si no se ingresó en paso 1</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
                          Peso Bruto Almapac (TM)
                        </label>
                        <input
                          type="text"
                          name="peso_bruto_almapac_tm"
                          value={completarViaje.peso_bruto_almapac_tm}
                          onChange={handleCompletarViajeChange}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                          placeholder="30.865 (o 30865)"
                        />
                        <p className="text-[9px] text-slate-500 mt-0.5">Opcional - si no se ingresó en paso 1</p>
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs text-slate-400 mb-1">
                          Observaciones Destino
                        </label>
                        <input
                          type="text"
                          name="observaciones_destino"
                          value={completarViaje.observaciones_destino}
                          onChange={handleCompletarViajeChange}
                          className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                          placeholder="Notas del destino"
                        />
                      </div>
                      <div className="flex items-end col-span-4">
                        <button
                          onClick={handleCompletarViaje}
                          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Completar Viaje
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {viajesCompletos.length > 0 && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Viajes Completos - {productoActivo?.nombre} ({viajesFiltrados.length})
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        Barco: {barco.nombre}
                      </span>
                    </h3>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setOrdenViajes(ordenViajes === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm text-slate-300 transition-all"
                        title={ordenViajes === 'asc' ? 'Orden ascendente (menor a mayor)' : 'Orden descendente (mayor a menor)'}
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {ordenViajes === 'asc' ? 'Menor a Mayor' : 'Mayor a Menor'}
                        </span>
                      </button>

                      <div className="relative w-64">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar por placa..."
                          className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ALERTA DE SALTOS DE CORRELATIVO */}
                {saltosCorrelativo.length > 0 && ordenViajes === 'asc' && (
                  <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 m-4 rounded-r-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="font-bold text-amber-400">⚠️ Saltos de correlativo detectados</p>
                        <p className="text-sm text-slate-400">
                          {saltosCorrelativo.map((salto, idx) => (
                            <span key={idx}>
                              Faltan {salto.faltantes} viaje(s) entre #{salto.desde} y #{salto.hasta}
                              {idx < saltosCorrelativo.length - 1 ? ' • ' : ''}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <div className="max-h-[500px] overflow-y-auto relative">
                    <table className="w-full">
                      <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">#</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Salida UPDP</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Entrada Almapac</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Salida Almapac</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Placa</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Neto UPDP (TM)</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Bruto UPDP (TM)</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Bruto Almapac (TM)</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Destino</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Peso Neto ALMAPAC (TM)</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Acumulado UPDP</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {viajesFiltrados.map((viaje, index, array) => {
                          let acumuladoCorrido = 0
                          if (ordenViajes === 'asc') {
                            acumuladoCorrido = array
                              .slice(0, index + 1)
                              .reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
                          } else {
                            const viajesAsc = [...viajesFiltrados].sort((a, b) => a.viaje_numero - b.viaje_numero)
                            const idxAsc = viajesAsc.findIndex(v => v.id === viaje.id)
                            acumuladoCorrido = viajesAsc
                              .slice(0, idxAsc + 1)
                              .reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
                          }

                          const haySaltoDespues = ordenViajes === 'asc' && index < array.length - 1 && 
                            array[index + 1].viaje_numero - viaje.viaje_numero > 1

                          return (
                            <tr key={viaje.id} className={`hover:bg-white/5 transition-colors ${haySaltoDespues ? 'border-b-2 border-amber-500/50' : ''}`}>
                              <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{viaje.viaje_numero}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{formatFecha(viaje.fecha)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{formatHora(viaje.hora_salida_updp)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{formatHora(viaje.hora_entrada_almapac)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{formatHora(viaje.hora_salida_almapac) || '—'}</td>
                              <td className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">{viaje.placa}</td>
                              <td className="px-4 py-3 font-bold text-green-400 whitespace-nowrap">{viaje.peso_neto_updp_tm?.toFixed(3)}</td>
                              <td className="px-4 py-3 text-blue-400 whitespace-nowrap">{viaje.peso_bruto_updp_tm?.toFixed(3)}</td>
                              <td className="px-4 py-3 text-amber-400 whitespace-nowrap">{viaje.peso_bruto_almapac_tm?.toFixed(3)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{viaje.destino?.nombre || '—'}</td>
                              <td className="px-4 py-3 font-bold text-purple-400 whitespace-nowrap">{viaje.peso_destino_tm?.toFixed(3) || '—'}</td>
                              <td className="px-4 py-3 font-bold text-yellow-400 whitespace-nowrap">{acumuladoCorrido.toFixed(3)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditarViaje(viaje)}
                                    className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                                    title="Editar viaje completo"
                                  >
                                    <Edit2 className="w-4 h-4 text-blue-400" />
                                  </button>
                                  <button
                                    onClick={() => handleEliminarViaje(viaje.id)}
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
                      <tfoot className="bg-slate-900 border-t border-white-10 sticky bottom-0">
                        <tr>
                          <td colSpan="6" className="px-4 py-3 font-bold text-white whitespace-nowrap">TOTALES</td>
                          <td className="px-4 py-3 font-bold text-green-400 whitespace-nowrap">
                            {viajesFiltrados.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0).toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-bold text-blue-400 whitespace-nowrap">
                            {viajesFiltrados.reduce((sum, v) => sum + (Number(v.peso_bruto_updp_tm) || 0), 0).toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-400 whitespace-nowrap">
                            {viajesFiltrados.reduce((sum, v) => sum + (Number(v.peso_bruto_almapac_tm) || 0), 0).toFixed(3)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"></td>
                          <td className="px-4 py-3 font-bold text-purple-400 whitespace-nowrap">
                            {viajesFiltrados.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0).toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-bold text-yellow-400 whitespace-nowrap">
                            {viajesFiltrados.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0).toFixed(3)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {searchTerm && (
                  <div className="bg-slate-800 px-6 py-2 border-t border-white/10 text-sm text-slate-400">
                    Mostrando {viajesFiltrados.length} de {viajesCompletos.length} viajes
                    {viajesFiltrados.length === 0 && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-2 text-blue-400 hover:text-blue-300"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* SECCIÓN DE BANDA */}
        {!vistaGraficos && tipoRegistro === 'banda' && (
          <>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-400" />
                  {editandoLectura ? 'Editar Lectura de Banda' : 'Nueva Lectura de Banda'} - {productoActivo?.nombre}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    Barco: {barco.nombre}
                  </span>
                </h2>

                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl px-6 py-3">
                  <p className="text-xs text-blue-200 uppercase font-bold">FLUJO PROMEDIO POR HORA</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">
                      {calcularFlujoBandaTotalPorHora.toFixed(3)}
                    </span>
                    <span className="text-sm text-blue-200">TM/h</span>
                  </div>
                  <p className="text-[10px] text-blue-300 mt-1">
                    Basado en {lecturasFiltradas.length} lecturas
                  </p>
                  {lecturasFiltradas.length >= 2 && (
                    <p className="text-[9px] text-blue-300/70 mt-0.5">
                      {(() => {
                        const ordenadas = [...lecturasFiltradas].sort(
                          (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
                        )
                        const primera = ordenadas[0]
                        const ultima = ordenadas[ordenadas.length - 1]
                        const delta = (Number(ultima.acumulado_tm) - Number(primera.acumulado_tm)).toFixed(3)
                        const horas = ((new Date(ultima.fecha_hora) - new Date(primera.fecha_hora)) / (1000 * 60 * 60)).toFixed(1)
                        return `Δ ${delta} TM en ${horas} h`
                      })()}
                    </p>
                  )}
                </div>
              </div>

              {editandoLectura && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={cancelarEdicion}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Cancelar edición
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Fecha y Hora<span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      name="fecha_hora"
                      value={lecturaActual.fecha_hora}
                      onChange={(e) => setLecturaActual(prev => ({
                        ...prev,
                        fecha_hora: e.target.value
                      }))}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10"
                      step="1"
                    />
                    <button
                      type="button"
                      onClick={() => setLecturaActual(prev => ({
                        ...prev,
                        fecha_hora: getCurrentSVTimeForInput()
                      }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                      title="Usar fecha y hora actual de El Salvador"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Hora local de El Salvador (GMT-6)
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Acumulado (TM) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="acumulado_tm"
                    value={lecturaActual.acumulado_tm}
                    onChange={(e) => {
                      const valorFormateado = autoFormatearNumero(e.target.value, 'Acumulado Banda')
                      setLecturaActual(prev => ({ ...prev, acumulado_tm: valorFormateado }))
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="15.000 (o 15000)"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">💡 Escribe 15000 → 15.000 TM</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Destino <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="destino_id"
                    value={lecturaActual.destino_id}
                    onChange={handleLecturaChange}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {destinos.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end col-span-3 gap-2">
                  <button
                    onClick={handleGuardarLectura}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {editandoLectura ? 'Actualizar Lectura' : 'Guardar Lectura'}
                  </button>
                  {editandoLectura && (
                    <button
                      onClick={() => handleEliminarLectura(editandoLectura.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {lecturasFiltradas.length > 0 && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                  <h3 className="font-bold text-white">
                    Historial de Bandas - {productoActivo?.nombre} ({lecturasFiltradas.length})
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      Barco: {barco.nombre}
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-auto">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase border-b border-white/10 whitespace-nowrap">FECHA/HORA</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase border-b border-white/10 w-px whitespace-nowrap">ACUMULADO (TM)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase border-b border-white/10 w-px whitespace-nowrap">FLUJO (TM/H)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase border-b border-white/10">DESTINO</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase border-b border-white/10 w-px whitespace-nowrap">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {lecturasFiltradas.map((lectura) => {
                        const lecturasMismoDestino = lecturasFiltradas
                          .filter(l => l.destino_id === lectura.destino_id)
                          .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))

                        const indiceEnDestino = lecturasMismoDestino.findIndex(l => l.id === lectura.id)
                        const lecturaAnteriorMismoDestino = indiceEnDestino > 0 ? lecturasMismoDestino[indiceEnDestino - 1] : null

                        let flujo = 0
                        let delta = 0

                        if (lecturaAnteriorMismoDestino) {
                          const tiempoMs = new Date(lectura.fecha_hora) - new Date(lecturaAnteriorMismoDestino.fecha_hora)
                          const tiempoHoras = tiempoMs / (1000 * 60 * 60)
                          delta = Number(lectura.acumulado_tm) - Number(lecturaAnteriorMismoDestino.acumulado_tm)
                          if (tiempoHoras > 0 && delta > 0) {
                            flujo = delta / tiempoHoras
                          }
                        }

                        return (
                          <tr key={lectura.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                              {formatUTCToSV(lectura.fecha_hora)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-400 text-center">
                              {lectura.acumulado_tm?.toFixed(3)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {flujo > 0 ? (
                                <span className="font-bold text-green-400">{flujo.toFixed(3)}</span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                             </td>
                            <td className="px-4 py-3 text-slate-300">{lectura.destino?.nombre}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditarLectura(lectura)}
                                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() => handleEliminarLectura(lectura.id)}
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
                        <td className="px-4 py-3 font-bold text-white border-t border-white/10">FLUJO PROMEDIO TOTAL</td>
                        <td className="px-4 py-3 border-t border-white/10"></td>
                        <td className="px-4 py-3 font-bold text-green-400 border-t border-white/10 text-center">{calcularFlujoBandaTotalPorHora.toFixed(3)} TM/h</td>
                        <td colSpan="2" className="px-4 py-3 text-slate-400 border-t border-white/10 whitespace-nowrap">{lecturasFiltradas.length} lecturas · {productoActivo?.nombre}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* SECCIÓN DE BITÁCORA */}
        {!vistaGraficos && tipoRegistro === 'bitacora' && (
          <>
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                {editandoBitacora ? 'Editar Entrada de Bitácora' : 'Nueva Entrada de Bitácora'} - {productoActivo?.nombre}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  Barco: {barco.nombre}
                </span>
              </h2>

              {editandoBitacora && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={cancelarEdicion}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Cancelar edición
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Fecha y Hora <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={bitacoraActual.fecha_hora ? bitacoraActual.fecha_hora.split('T')[0] : ''}
                      onChange={(e) => {
                        const fecha = e.target.value
                        const horaActual = bitacoraActual.fecha_hora?.split('T')[1] || '00:00:00'
                        setBitacoraActual(prev => ({
                          ...prev,
                          fecha_hora: `${fecha}T${horaActual}`
                        }))
                      }}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                    />
                    <div className="relative">
                      <input
                        type="time"
                        value={bitacoraActual.fecha_hora ? bitacoraActual.fecha_hora.split('T')[1] : ''}
                        onChange={(e) => {
                          const hora = e.target.value
                          const fechaActual = bitacoraActual.fecha_hora?.split('T')[0] || getLocalDateString()
                          setBitacoraActual(prev => ({
                            ...prev,
                            fecha_hora: `${fechaActual}T${hora}`
                          }))
                        }}
                        step="1"
                        className="w-32 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const ahora = new Date()
                          const fecha = getLocalDateString(ahora)
                          const hora = getHoraActual24h()
                          setBitacoraActual(prev => ({
                            ...prev,
                            fecha_hora: `${fecha}T${hora}`
                          }))
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400"
                        title="Usar fecha y hora actual"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-span-full">
                  <label className="block text-xs text-slate-400 mb-1">
                    Comentarios
                  </label>
                  <textarea
                    name="comentarios"
                    value={bitacoraActual.comentarios}
                    onChange={handleBitacoraChange}
                    rows="3"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
                    placeholder="Observaciones..."
                  />
                </div>
                <div className="flex items-end col-span-full gap-2">
                  <button
                    onClick={handleGuardarBitacora}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {editandoBitacora ? 'Actualizar Registro' : 'Guardar en Bitácora'}
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
            </div>

            {bitacoraFiltrada.length > 0 && (
              <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
                  <h3 className="font-bold text-white">
                    Bitácora - {productoActivo?.nombre} ({bitacoraFiltrada.length} registros)
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      Barco: {barco.nombre}
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha/Hora</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Comentarios</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {bitacoraFiltrada.map((registro) => (
                        <tr key={registro.id} className="hover:bg-white/5">
                          <td className="px-4 py-3">{formatFechaHora(registro.fecha_hora)}</td>
                          <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{registro.comentarios || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditarBitacora(registro)}
                                className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleEliminarBitacora(registro.id)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                title="Eliminar"
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
          </>
        )}
      </div>

      {/* MODAL DE EDICIÓN COMPLETA DE VIAJE */}
      {modalEdicionAbierto && viajeEnEdicion && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            ref={modalRef}
            className="bg-[#0f172a] border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header del Modal */}
            <div className="sticky top-0 bg-[#0f172a] border-b border-white/10 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-400" />
                  Editar Viaje #{viajeEnEdicion.viaje_numero}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {viajeEnEdicion.producto?.nombre || productoActivo?.nombre} · Placa: {viajeEnEdicion.placa}
                  {viajeEnEdicion.estado === 'completo' && (
                    <span className="ml-2 text-green-400">✓ Completado</span>
                  )}
                  {viajeEnEdicion.estado === 'incompleto' && (
                    <span className="ml-2 text-yellow-400">⏳ Pendiente</span>
                  )}
                </p>
              </div>
              <button
                onClick={cerrarModalEdicion}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Sección: Información del Viaje */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  DATOS DEL VIAJE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1"># Viaje</label>
                    <input
                      type="number"
                      value={viajeEnEdicion.viaje_numero}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, viaje_numero: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={viajeEnEdicion.fecha}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, fecha: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Placa</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.placa}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, placa: formatPlaca(e.target.value) })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="C-909389"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Destino</label>
                    <select
                      value={viajeEnEdicion.destino_id || ''}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, destino_id: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Seleccionar destino</option>
                      {destinos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Tiempos */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  TIEMPOS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hora Salida UPDP</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={viajeEnEdicion.hora_salida_updp}
                        onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, hora_salida_updp: e.target.value })}
                        step="1"
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => setViajeEnEdicion({ ...viajeEnEdicion, hora_salida_updp: getHoraActual24h() })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hora Entrada Almapac</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={viajeEnEdicion.hora_entrada_almapac}
                        onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, hora_entrada_almapac: e.target.value })}
                        step="1"
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => setViajeEnEdicion({ ...viajeEnEdicion, hora_entrada_almapac: getHoraActual24h() })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hora Salida Almapac</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={viajeEnEdicion.hora_salida_almapac}
                        onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, hora_salida_almapac: e.target.value })}
                        step="1"
                        className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark]"
                      />
                      <button
                        type="button"
                        onClick={() => setViajeEnEdicion({ ...viajeEnEdicion, hora_salida_almapac: getHoraActual24h() })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Pesos */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  PESOS (TM)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Neto UPDP *</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.peso_neto_updp_tm}
                      onChange={(e) => {
                        const valor = autoFormatearNumero(e.target.value, 'Peso Neto UPDP')
                        setViajeEnEdicion({ ...viajeEnEdicion, peso_neto_updp_tm: valor })
                      }}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="19.345"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Bruto UPDP *</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.peso_bruto_updp_tm}
                      onChange={(e) => {
                        const valor = autoFormatearNumero(e.target.value, 'Peso Bruto UPDP')
                        setViajeEnEdicion({ ...viajeEnEdicion, peso_bruto_updp_tm: valor })
                      }}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="31.500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Bruto Almapac</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.peso_bruto_almapac_tm}
                      onChange={(e) => {
                        const valor = autoFormatearNumero(e.target.value, 'Peso Bruto Almapac')
                        setViajeEnEdicion({ ...viajeEnEdicion, peso_bruto_almapac_tm: valor })
                      }}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="30.865"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Destino</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.peso_destino_tm}
                      onChange={(e) => {
                        const valor = autoFormatearNumero(e.target.value, 'Peso Destino')
                        setViajeEnEdicion({ ...viajeEnEdicion, peso_destino_tm: valor })
                      }}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="19.815"
                    />
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-[10px] text-yellow-400 uppercase">Acumulado UPDP</p>
                      <p className="text-xl font-bold text-yellow-400">{viajeEnEdicion.total_acumulado_tm?.toFixed(3) || '0.000'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección: Observaciones */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
                <h3 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  OBSERVACIONES
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Observaciones UPDP</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.observaciones || ''}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, observaciones: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="Notas del viaje"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Observaciones Destino</label>
                    <input
                      type="text"
                      value={viajeEnEdicion.observaciones_destino || ''}
                      onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, observaciones_destino: e.target.value })}
                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="Notas del destino"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-[#0f172a] border-t border-white/10 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={cerrarModalEdicion}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicionCompleta}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}