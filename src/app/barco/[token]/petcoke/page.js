'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { 
  Save, RefreshCw, Truck, Clock, AlertCircle, Target, CheckCircle, 
  Plus, X, PlayCircle, StopCircle, Search, Edit2, Trash2, 
  Home, Building2, Package, Scale, Calendar, Timer, User, 
  FileText, CheckSquare, AlertTriangle, Info, ArrowRight, 
  ArrowLeft, Printer, Download, Filter, Settings, Users,
  Navigation, MapPin, Box, Layers, ClipboardList, Activity,
  TrendingUp, TrendingDown, Zap, Shield, CreditCard, DollarSign,
  BarChart, PieChart, LineChart, Globe, Lock, Unlock, Eye,
  EyeOff, Bell, BellOff, Star, Heart, ThumbsUp, ThumbsDown,
  MessageCircle, Mail, Phone, Map, Flag, Compass, Wind,
  Droplet, Sun, Moon, CloudRain, CloudSnow, CloudLightning,
  ZapOff, Battery, BatteryCharging, Wifi, WifiOff, Bluetooth,
  BluetoothConnected, Monitor, Smartphone, Tablet, Laptop, Cpu,
  HardDrive, Database, Server, Cloud, CloudOff, Network, Share2,
  Folder, File, FileText as FileTextIcon, Image, Video, Music,
  Camera, Mic, MicOff, Volume2, VolumeX, Headphones, Speaker,
  Tv, Radio, Podcast, Book, BookOpen, Newspaper, PenTool,
  Brush, Palette, Scissors, Feather, Award, Medal, Trophy,
  Crown, Diamond, Gem, Sparkles, MagicWand, Wand2, Atom,
  Beaker, Flask, TestTube, Microscope, Telescope, Dna,
  Activity as ActivityIcon, HeartPulse, Brain, Bone, Tooth,
  Stethoscope, Ambulance, Pill, Syringe, Hospital, Building,
  Church, Mosque, Temple, School, University, Library, Museum,
  Theater, Music2, Film, Clapperboard, Camera as CameraIcon,
  Video as VideoIcon, Mic2, Radio as RadioIcon, Podcast as PodcastIcon,
  Tv2, Monitor as MonitorIcon, Smartphone as SmartphoneIcon,
  Tablet as TabletIcon, Laptop as LaptopIcon, Cpu as CpuIcon,
  HardDrive as HardDriveIcon, Database as DatabaseIcon,
  Server as ServerIcon, Cloud as CloudIcon, Network as NetworkIcon,
  Share2 as Share2Icon, Folder as FolderIcon, File as FileIcon,
  Image as ImageIcon, Video as VideoIcon2, Music as MusicIcon,
  Camera as CameraIcon2, Mic as MicIcon, Volume2 as Volume2Icon,
  Headphones as HeadphonesIcon, Speaker as SpeakerIcon, Tv as TvIcon,
  Radio as RadioIcon2, Book as BookIcon, BookOpen as BookOpenIcon,
  Newspaper as NewspaperIcon, PenTool as PenToolIcon, Brush as BrushIcon,
  Palette as PaletteIcon, Scissors as ScissorsIcon, Feather as FeatherIcon,
  Award as AwardIcon, Medal as MedalIcon, Trophy as TrophyIcon,
  Crown as CrownIcon, Diamond as DiamondIcon, Gem as GemIcon,
  Sparkles as SparklesIcon, Atom as AtomIcon, Beaker as BeakerIcon,
  Flask as FlaskIcon, TestTube as TestTubeIcon, Microscope as MicroscopeIcon,
  Telescope as TelescopeIcon, Dna as DnaIcon, Activity as ActivityIcon2
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import Select from 'react-select'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONA_EL_SALVADOR = 'America/El_Salvador'
const PESO_MINIMO = 22
const PESO_MAXIMO = 25

const OPCIONES_TIPO_UNIDAD = [
  { value: 'Traileta', label: 'TRAILETA' },
  { value: 'Volqueta', label: 'VOLQUETA' },
  { value: 'Ambos', label: 'AMBOS' },
]

const OPCIONES_PATIO = [
  { value: 'NORTE', label: 'NORTE' },
  { value: 'SUR', label: 'SUR' },
]

const OPCIONES_BODEGA = [
  { value: 'Bodega 1', label: 'Bodega 1' },
  { value: 'Bodega 2', label: 'Bodega 2' },
  { value: 'Bodega 3', label: 'Bodega 3' },
  { value: 'Bodega 4', label: 'Bodega 4' },
  { value: 'Bodega 5', label: 'Bodega 5' },
]

export default function PetCokePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [producto, setProducto] = useState(null)
  const [viajes, setViajes] = useState([])
  const [meta, setMeta] = useState(0)

  const [unidades, setUnidades] = useState([])
  const [opcionesPlacas, setOpcionesPlacas] = useState([])

  const [modalUnidadAbierto, setModalUnidadAbierto] = useState(false)
  const [nuevaUnidad, setNuevaUnidad] = useState({ placa: '', transporte: '', tipo: '' })

  const paso1Ref = useRef(null)
  const paso2Ref = useRef(null)

  const [entrada, setEntrada] = useState({
    correlativo: 1,
    fecha_entrada: '',
    hora_entrada: '',
    peso_bruto: '',
    placa: '',
    tipo_unidad: '',
    transporte: '',
    patio: '',
    bodega_barco: '',
  })

  const [viajeActivo, setViajeActivo] = useState(null)
  const [salida, setSalida] = useState({
    hora_salida: '',
    peso_neto: '',
  })

  const [tipoUnidadOptions, setTipoUnidadOptions] = useState(OPCIONES_TIPO_UNIDAD)
  const [buscarPlaca, setBuscarPlaca] = useState('')
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false)
  const [viajeEnEdicion, setViajeEnEdicion] = useState(null)

  const getHoraActual = () => dayjs().tz(TIMEZONA_EL_SALVADOR).format('HH:mm:ss')
  const getFechaActual = () => dayjs().tz(TIMEZONA_EL_SALVADOR).format('YYYY-MM-DD')

  const convertirToneladas = (valor) => {
    if (!valor || valor === '') return null
    
    let strValor = String(valor).trim()
    strValor = strValor.replace(',', '.')
    
    if (strValor.includes('.')) {
      const num = parseFloat(strValor)
      return isNaN(num) ? null : num
    }
    
    if (/^\d{5}$/.test(strValor)) {
      const num = parseInt(strValor, 10) / 1000
      return num
    }
    
    if (/^\d{4}$/.test(strValor)) {
      const num = parseInt(strValor, 10) / 1000
      return num
    }
    
    if (/^\d{3}$/.test(strValor)) {
      const num = parseInt(strValor, 10) / 1000
      return num
    }
    
    if (/^\d{1,2}$/.test(strValor)) {
      const num = parseInt(strValor, 10)
      return num
    }
    
    const num = parseFloat(strValor)
    return isNaN(num) ? null : num
  }

  const formatearMientrasEscribe = (valor) => {
    if (!valor) return valor
    
    let limpio = String(valor).replace(/[^\d.]/g, '')
    
    const partes = limpio.split('.')
    if (partes.length > 2) {
      limpio = partes[0] + '.' + partes.slice(1).join('')
    }
    
    if (!limpio.includes('.') && limpio.length >= 5) {
      const numero = parseInt(limpio, 10)
      const toneladas = numero / 1000
      return toneladas.toString()
    }
    
    return limpio
  }

  const normalizarNulo = (val) => {
    if (val === '' || val === undefined || val === null) return null
    return val
  }

  const estaFueraDeRango = (pesoNeto) => {
    if (!pesoNeto) return false
    return Number(pesoNeto) < PESO_MINIMO || Number(pesoNeto) > PESO_MAXIMO
  }

  const calcularTiempoAtencion = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null
    try {
      const entrada = dayjs(`2000-01-01T${horaEntrada}`)
      const salidaH = dayjs(`2000-01-01T${horaSalida}`)
      const diffMinutos = salidaH.diff(entrada, 'minute')
      if (diffMinutos < 0) return null
      const horas = Math.floor(diffMinutos / 60)
      const minutos = diffMinutos % 60
      return `${horas}h ${minutos}m`
    } catch {
      return null
    }
  }

  const tomarHoraEntradaExacta = () => {
    const horaActual = getHoraActual()
    setEntrada(prev => ({ ...prev, hora_entrada: horaActual }))
    toast.success(`Hora de entrada: ${horaActual}`)
  }

  const tomarHoraSalidaExacta = () => {
    const horaActual = getHoraActual()
    setSalida(prev => ({ ...prev, hora_salida: horaActual }))
    toast.success(`Hora de salida: ${horaActual}`)
  }

  const siguienteCorrelativo = useMemo(() => {
    if (viajes.length === 0) return 1
    return Math.max(...viajes.map(v => v.correlativo)) + 1
  }, [viajes])

  useEffect(() => {
    setEntrada(prev => ({ ...prev, correlativo: siguienteCorrelativo }))
  }, [siguienteCorrelativo])

  useEffect(() => {
    setEntrada(prev => ({ ...prev, fecha_entrada: getFechaActual() }))
  }, [])

  const viajesActivos = useMemo(() => {
    return viajes.filter(v => v.estado === 'EN_PROGRESO')
  }, [viajes])

  const viajesCompletados = useMemo(() => {
    return viajes.filter(v => v.estado === 'COMPLETADO')
  }, [viajes])

  const totalDescargado = useMemo(() => {
    return viajesCompletados.reduce((sum, v) => sum + (Number(v.peso_neto) || 0), 0)
  }, [viajesCompletados])

  const acumuladoActual = totalDescargado

  const porcentajeCompletado = meta > 0 ? (totalDescargado / meta) * 100 : 0
  const faltante = Math.max(0, meta - totalDescargado)
  const estaCompleto = faltante <= 0 && meta > 0
  const estaCerca = !estaCompleto && porcentajeCompletado >= 90 && meta > 0

  const viajesActivosFiltrados = useMemo(() => {
    if (!buscarPlaca.trim()) return viajesActivos
    const termino = buscarPlaca.trim().toLowerCase()
    return viajesActivos.filter(v => v.placa.toLowerCase().includes(termino))
  }, [viajesActivos, buscarPlaca])

  const previewAcumuladoSalida = viajeActivo && salida.peso_neto
    ? {
        peso: convertirToneladas(salida.peso_neto) || 0,
        nuevoAcumulado: acumuladoActual + (convertirToneladas(salida.peso_neto) || 0),
      }
    : null

  const tipoUnidadSeleccionado = OPCIONES_TIPO_UNIDAD.find(opt => opt.value === entrada.tipo_unidad)

  const cargarUnidades = async () => {
    try {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('placa', { ascending: true })
      if (error) throw error
      setUnidades(data || [])
      setOpcionesPlacas(
        (data || []).map(u => ({
          value: u.placa,
          label: `${u.placa} - ${u.transporte}`,
          transporte: u.transporte,
          tipoPredeterminado: u.tipo,
        }))
      )
    } catch (err) {
      console.error('Error cargando unidades:', err)
      toast.error('Error al cargar las unidades')
    }
  }

  const cargarDatos = async (mostrarToast = false) => {
    if (!barco && !token) return
    
    try {
      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) {
        if (mostrarToast) toast.error('Barco no encontrado')
        return
      }
      
      if (!barco || barco.id !== barcoData.id) {
        setBarco(barcoData)
      }

      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', 'PC-001')
        .single()

      if (productoError || !productoData) {
        if (mostrarToast) toast.error('Producto PET COKE no encontrado')
        return
      }
      
      if (!producto || producto.id !== productoData.id) {
        setProducto(productoData)
      }

      const metaProducto = barcoData.metas_json?.limites?.['PC-001'] || 0
      setMeta(metaProducto)

      const { data: viajesData, error: viajesError } = await supabase
        .from('petcoke_viajes')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('correlativo', { ascending: true })

      if (viajesError) throw viajesError
      
      setViajes(viajesData || [])
      
    } catch (err) {
      console.error('Error cargando datos:', err)
      if (mostrarToast) toast.error('Error al cargar datos')
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await cargarDatos()
      await cargarUnidades()
      setLoading(false)
    }
    init()
  }, [token])

  const handleAgregarUnidad = async () => {
    if (!nuevaUnidad.placa.trim()) return toast.error('La placa es obligatoria')
    if (!nuevaUnidad.transporte.trim()) return toast.error('El transporte es obligatorio')
    if (!nuevaUnidad.tipo) return toast.error('Debes seleccionar un tipo de unidad')

    try {
      const { data, error } = await supabase
        .from('unidades')
        .insert([{
          placa: nuevaUnidad.placa.toUpperCase(),
          transporte: nuevaUnidad.transporte.toUpperCase(),
          tipo: nuevaUnidad.tipo,
        }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') toast.error('Esta placa ya existe')
        else throw error
        return
      }

      toast.success(`Unidad ${data.placa} agregada correctamente`)
      setModalUnidadAbierto(false)
      setNuevaUnidad({ placa: '', transporte: '', tipo: '' })
      
      setUnidades(prev => [...prev, data])
      setOpcionesPlacas(prev => [...prev, {
        value: data.placa,
        label: `${data.placa} - ${data.transporte}`,
        transporte: data.transporte,
        tipoPredeterminado: data.tipo,
      }])
      
    } catch (err) {
      console.error('Error agregando unidad:', err)
      toast.error('Error al agregar la unidad')
    }
  }

  const handleRegistrarEntrada = async () => {
    if (!barco || !producto) return toast.error('Faltan datos del barco o producto')
    if (!entrada.placa) return toast.error('La placa es obligatoria')
    if (!entrada.tipo_unidad) return toast.error('Debes seleccionar el Tipo Unidad')
    if (!entrada.hora_entrada) return toast.error('La Hora Entrada es obligatoria')
    if (!entrada.patio) return toast.error('El Patio es obligatorio')
    if (!entrada.peso_bruto) return toast.error('El Peso Bruto es obligatorio')

    const tieneViajeActivo = viajes.some(v => v.placa === entrada.placa && v.estado === 'EN_PROGRESO')
    if (tieneViajeActivo) {
      toast.error(`La unidad ${entrada.placa} ya tiene un viaje en curso. Debe registrar SALIDA primero.`)
      return
    }

    const pesoBrutoConvertido = convertirToneladas(entrada.peso_bruto)
    
    if (!pesoBrutoConvertido) {
      toast.error('El Peso Bruto no es válido')
      return
    }

    const nuevoViaje = {
      barco_id: barco.id,
      producto_id: producto.id,
      correlativo: entrada.correlativo,
      fecha_entrada: entrada.fecha_entrada,
      hora_entrada: entrada.hora_entrada,
      peso_bruto: pesoBrutoConvertido,
      placa: entrada.placa,
      tipo_unidad: entrada.tipo_unidad,
      transporte: entrada.transporte,
      patio_entrada: entrada.patio,
      bodega_barco: entrada.bodega_barco || null,
      estado: 'EN_PROGRESO',
    }

    try {
      const { data, error } = await supabase
        .from('petcoke_viajes')
        .insert([nuevoViaje])
        .select()

      if (error) throw error

      toast.success(
        `ENTRADA registrada: Viaje #${entrada.correlativo} - ${entrada.placa} - Peso Bruto: ${pesoBrutoConvertido.toFixed(3)} TM`
      )

      setViajes(prev => [...prev, data[0]])

      setEntrada({
        correlativo: siguienteCorrelativo + 1,
        fecha_entrada: getFechaActual(),
        hora_entrada: '',
        peso_bruto: '',
        placa: '',
        tipo_unidad: '',
        transporte: '',
        patio: '',
        bodega_barco: '',
      })
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)

      setTimeout(() => {
        paso2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)

    } catch (err) {
      console.error('Error registrando entrada:', err)
      toast.error('Error al registrar la entrada: ' + err.message)
    }
  }

  const handleRegistrarSalida = async () => {
    if (!barco || !producto) return toast.error('Faltan datos del barco o producto')
    if (!viajeActivo) return toast.error('No hay un viaje activo seleccionado')
    if (!salida.hora_salida) return toast.error('La Hora Salida es obligatoria')
    if (!salida.peso_neto) return toast.error('El Peso Neto es obligatorio')

    let pesoNeto = convertirToneladas(salida.peso_neto)

    if (!pesoNeto || pesoNeto <= 0)
      return toast.error('El Peso Neto debe ser un número válido mayor a 0')

    if (pesoNeto < PESO_MINIMO || pesoNeto > PESO_MAXIMO) {
      toast.error(
        `Peso fuera de rango permitido (${PESO_MINIMO}-${PESO_MAXIMO} TM). Valor: ${pesoNeto.toFixed(3)} TM`,
        { duration: 5000 }
      )
    }

    const fechaSalida = getFechaActual()
    const tiempoAtencion = calcularTiempoAtencion(viajeActivo.hora_entrada, salida.hora_salida)

    const datosActualizar = {
      fecha_salida: fechaSalida,
      hora_salida: salida.hora_salida,
      peso_neto: pesoNeto,
      tiempo_atencion: tiempoAtencion,
      estado: 'COMPLETADO',
    }

    try {
      const { error } = await supabase
        .from('petcoke_viajes')
        .update(datosActualizar)
        .eq('id', viajeActivo.id)

      if (error) throw error

      toast.success(
        `SALIDA registrada: ${viajeActivo.placa} - ${salida.hora_salida} - Peso Neto: ${pesoNeto.toFixed(3)} TM`
      )

      setViajes(prev => prev.map(v => 
        v.id === viajeActivo.id 
          ? { ...v, ...datosActualizar }
          : v
      ))

      setViajeActivo(null)
      setSalida({ hora_salida: '', peso_neto: '' })
      setBuscarPlaca('')

    } catch (err) {
      console.error('Error registrando salida:', err)
      toast.error('Error al registrar la salida: ' + err.message)
    }
  }

  const handlePesoBrutoChange = (e) => {
    const valorFormateado = formatearMientrasEscribe(e.target.value)
    setEntrada(prev => ({ ...prev, peso_bruto: valorFormateado }))
  }

  const handlePesoNetoChange = (e) => {
    const valorFormateado = formatearMientrasEscribe(e.target.value)
    setSalida(prev => ({ ...prev, peso_neto: valorFormateado }))
  }

  const handlePlacaSelect = (opcionSeleccionada) => {
    if (opcionSeleccionada) {
      const unidad = unidades.find(u => u.placa === opcionSeleccionada.value)
      if (unidad) {
        setEntrada(prev => ({
          ...prev,
          placa: opcionSeleccionada.value,
          transporte: unidad.transporte,
          tipo_unidad: unidad.tipo === 'Ambos' ? '' : unidad.tipo,
        }))
        setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
      }
    } else {
      setEntrada(prev => ({ ...prev, placa: '', transporte: '', tipo_unidad: '' }))
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
    }
  }

  const handleTipoUnidadSelect = (opt) => setEntrada(prev => ({ ...prev, tipo_unidad: opt?.value || '' }))
  const handlePatioSelect = (opt) => setEntrada(prev => ({ ...prev, patio: opt?.value || '' }))
  const handleBodegaSelect = (opt) => setEntrada(prev => ({ ...prev, bodega_barco: opt?.value || '' }))
  
  const handleEntradaChange = (e) => {
    const { name, value } = e.target
    setEntrada(prev => ({ ...prev, [name]: value }))
  }

  const abrirModalEdicion = (viaje) => {
    setViajeEnEdicion({
      id: viaje.id,
      correlativo: viaje.correlativo,
      placa: viaje.placa,
      tipo_unidad: viaje.tipo_unidad || '',
      transporte: viaje.transporte || '',
      fecha_entrada: viaje.fecha_entrada || '',
      hora_entrada: viaje.hora_entrada || '',
      peso_bruto: viaje.peso_bruto !== null && viaje.peso_bruto !== undefined ? String(viaje.peso_bruto) : '',
      fecha_salida: viaje.fecha_salida || '',
      hora_salida: viaje.hora_salida || '',
      patio: viaje.patio_entrada || '',
      bodega_barco: viaje.bodega_barco || '',
      peso_neto: viaje.peso_neto !== null && viaje.peso_neto !== undefined ? String(viaje.peso_neto) : '',
      tiempo_atencion: viaje.tiempo_atencion || '',
      estado: viaje.estado,
    })
    setModalEdicionAbierto(true)
  }

  const tomarHoraEntradaExactaEnEdicion = () => {
    const horaActual = getHoraActual()
    setViajeEnEdicion(prev => ({ ...prev, hora_entrada: horaActual }))
    toast.success(`Hora de entrada: ${horaActual}`)
  }

  const tomarHoraSalidaExactaEnEdicion = () => {
    const horaActual = getHoraActual()
    setViajeEnEdicion(prev => ({ ...prev, hora_salida: horaActual }))
    toast.success(`Hora de salida: ${horaActual}`)
  }

  const handlePesoBrutoEdicionChange = (e) => {
    const valorFormateado = formatearMientrasEscribe(e.target.value)
    setViajeEnEdicion(prev => ({ ...prev, peso_bruto: valorFormateado }))
  }

  const handlePesoNetoEdicionChange = (e) => {
    const valorFormateado = formatearMientrasEscribe(e.target.value)
    setViajeEnEdicion(prev => ({ ...prev, peso_neto: valorFormateado }))
  }

  const guardarEdicion = async () => {
    if (!viajeEnEdicion) return

    const tienePesoNeto = viajeEnEdicion.peso_neto && viajeEnEdicion.peso_neto !== ''
    const tienePesoBruto = viajeEnEdicion.peso_bruto && viajeEnEdicion.peso_bruto !== ''
    const tieneHoraSalida = viajeEnEdicion.hora_salida && viajeEnEdicion.hora_salida !== ''
    const tieneFechaSalida = viajeEnEdicion.fecha_salida && viajeEnEdicion.fecha_salida !== ''

    const pesoNetoConvertido = tienePesoNeto ? convertirToneladas(viajeEnEdicion.peso_neto) : null
    const pesoBrutoConvertido = tienePesoBruto ? convertirToneladas(viajeEnEdicion.peso_bruto) : null

    const datosActualizar = {
      placa: viajeEnEdicion.placa,
      tipo_unidad: viajeEnEdicion.tipo_unidad,
      transporte: viajeEnEdicion.transporte,
      fecha_entrada: viajeEnEdicion.fecha_entrada,
      hora_entrada: viajeEnEdicion.hora_entrada,
      peso_bruto: pesoBrutoConvertido,
      fecha_salida: tieneFechaSalida ? viajeEnEdicion.fecha_salida : null,
      hora_salida: tieneHoraSalida ? viajeEnEdicion.hora_salida : null,
      patio_entrada: normalizarNulo(viajeEnEdicion.patio),
      bodega_barco: normalizarNulo(viajeEnEdicion.bodega_barco),
      peso_neto: pesoNetoConvertido,
      tiempo_atencion: viajeEnEdicion.tiempo_atencion || null,
      estado: tienePesoNeto ? 'COMPLETADO' : 'EN_PROGRESO',
    }

    try {
      const { error } = await supabase
        .from('petcoke_viajes')
        .update(datosActualizar)
        .eq('id', viajeEnEdicion.id)

      if (error) throw error
      toast.success('Viaje actualizado correctamente')
      
      setViajes(prev => prev.map(v => 
        v.id === viajeEnEdicion.id 
          ? { ...v, ...datosActualizar }
          : v
      ))
      
      setModalEdicionAbierto(false)
    } catch (err) {
      console.error('Error guardando edición:', err)
      toast.error('Error al actualizar el viaje')
    }
  }

  const handleEliminar = async (id, correlativo) => {
    if (!confirm(`¿Estás seguro de eliminar el viaje #${correlativo}?`)) return
    try {
      const { error } = await supabase.from('petcoke_viajes').delete().eq('id', id)
      if (error) throw error
      toast.success('Viaje eliminado')
      setViajes(prev => prev.filter(v => v.id !== id))
      setModalEdicionAbierto(false)
    } catch (err) {
      console.error('Error eliminando:', err)
      toast.error('Error al eliminar')
    }
  }

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#0f172a',
      borderColor: state.isFocused ? '#f97316' : 'rgba(255,255,255,0.1)',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 1px #f97316' : 'none',
      '&:hover': { borderColor: '#f97316' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#1e293b',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#334155' : '#1e293b',
      color: state.isSelected ? '#f97316' : '#cbd5e1',
      '&:active': { backgroundColor: '#334155' },
    }),
    input: (base) => ({ ...base, color: '#ffffff' }),
    singleValue: (base) => ({ ...base, color: '#ffffff' }),
    placeholder: (base) => ({ ...base, color: '#64748b' }),
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  if (!barco || !producto) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Error</h1>
          <p className="text-slate-400">
            {!barco ? 'Barco no encontrado' : 'Producto PET COKE no configurado'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <Package className="w-8 h-8" />
                  Pet Coke - {barco.nombre}
                </h1>
                {barco.codigo_barco && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
                    {barco.codigo_barco}
                  </span>
                )}
              </div>
              <p className="text-orange-200 text-sm mt-1">
                Registro de descarga de carbon - {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-orange-500/30 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Total Descargado: {totalDescargado.toFixed(3)} TM
              </div>
              <button
                onClick={() => cargarDatos(true)}
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Viajes Activos */}
        {viajesActivos.length > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/30">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                  VIAJES EN CURSO (PENDIENTES DE SALIDA)
                  <span className="text-xs bg-yellow-500/30 px-2 py-0.5 rounded-full">
                    {viajesActivos.length} viaje{viajesActivos.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="mt-3 space-y-1">
                  {viajesActivos.map((viaje) => (
                    <div key={viaje.id} className="text-sm font-mono text-yellow-300 flex items-center gap-2">
                      <span>#{viaje.correlativo} - {viaje.placa}</span>
                      <span>Entrada: {viaje.hora_entrada}</span>
                      <span className="text-yellow-500/70">Debe registrar SALIDA</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Meta Progress */}
        {meta > 0 && (
          <div className={`rounded-2xl p-6 transition-all ${
            estaCompleto
              ? 'bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500/30'
              : estaCerca
              ? 'bg-gradient-to-r from-yellow-600/20 to-amber-800/20 border border-yellow-500/30 animate-pulse'
              : 'bg-gradient-to-r from-orange-600/20 to-amber-800/20 border border-orange-500/30'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  estaCompleto ? 'bg-green-500/20' : estaCerca ? 'bg-yellow-500/20' : 'bg-orange-500/20'
                }`}>
                  {estaCompleto ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Target className="w-6 h-6 text-orange-400" />}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">CANTIDAD MANIFESTADA</p>
                  <p className="text-2xl font-black text-white">{meta.toFixed(3)} TM</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  {estaCompleto ? 'DESCARGA COMPLETADA' : 'FALTANTE POR DESCARGAR'}
                </p>
                <p className={`text-3xl font-black ${
                  estaCompleto ? 'text-green-400' : estaCerca ? 'text-yellow-400' : 'text-orange-400'
                }`}>
                  {estaCompleto ? '0.000 TM' : `${faltante.toFixed(3)} TM`}
                </p>
                {!estaCompleto && <p className="text-xs text-slate-500 mt-1">{porcentajeCompletado.toFixed(1)}% completado</p>}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progreso de descarga</span>
                <span>{porcentajeCompletado.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  estaCompleto ? 'bg-green-500' : estaCerca ? 'bg-yellow-500' : 'bg-orange-500'
                }`} style={{ width: `${Math.min(100, porcentajeCompletado)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 TM</span>
                <span>{totalDescargado.toFixed(0)} TM</span>
                <span>{meta.toFixed(0)} TM</span>
              </div>
            </div>
          </div>
        )}

        {/* Acumulado */}
        <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-400 uppercase font-bold">ACUMULADO ACTUAL</p>
              <p className="text-3xl font-black text-orange-400">{acumuladoActual.toFixed(3)} TM</p>
              <p className="text-[10px] text-orange-300/70 mt-0.5">Total descargado hasta el momento</p>
            </div>
            {previewAcumuladoSalida && (
              <>
                <div className="text-center">
                  <p className="text-xs text-slate-500">+ Este viaje</p>
                  <p className={`text-xl font-bold ${
                    estaFueraDeRango(previewAcumuladoSalida.peso) ? 'text-red-400' : 'text-green-400'
                  }`}>+{previewAcumuladoSalida.peso.toFixed(3)} TM</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-400 uppercase font-bold">NUEVO ACUMULADO</p>
                  <p className="text-3xl font-black text-blue-400">{previewAcumuladoSalida.nuevoAcumulado.toFixed(3)} TM</p>
                  {meta > 0 && <p className="text-[10px] text-slate-500 mt-1">{((previewAcumuladoSalida.nuevoAcumulado / meta) * 100).toFixed(1)}% de la meta</p>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* PASO 1: ENTRADA - REDISEÑADO */}
        <div ref={paso1Ref} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">PASO 1: Registrar ENTRADA (Peso Bruto)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Viaje (Correlativo)</label>
              <input type="number" value={entrada.correlativo} readOnly className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 font-bold" />
              <p className="text-[10px] text-slate-500 mt-0.5">Se asigna automaticamente</p>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha Entrada</label>
              <input type="date" value={entrada.fecha_entrada} readOnly className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hora Entrada</label>
              <div className="flex gap-2">
                <input type="time" name="hora_entrada" value={entrada.hora_entrada} onChange={handleEntradaChange} step="1" className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                <button type="button" onClick={tomarHoraEntradaExacta} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                  Ahora
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Peso Bruto (TM)</label>
              <input 
                type="text" 
                name="peso_bruto" 
                value={entrada.peso_bruto} 
                onChange={handlePesoBrutoChange} 
                placeholder="Ej: 34.567" 
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" 
              />
              {entrada.peso_bruto && /^\d{5}$/.test(entrada.peso_bruto.replace('.', '')) && (
                <p className="text-[10px] text-green-400 mt-0.5">Convertido: {convertirToneladas(entrada.peso_bruto)?.toFixed(3)} TM</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Placa</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select options={opcionesPlacas} onChange={handlePlacaSelect} value={entrada.placa ? opcionesPlacas.find(opt => opt.value === entrada.placa) || null : null} placeholder="Buscar o seleccionar placa..." isClearable styles={selectStyles} />
                </div>
                <button onClick={() => setModalUnidadAbierto(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Transporte</label>
              <input type="text" value={entrada.transporte} readOnly className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-slate-300" />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo Unidad</label>
              <Select options={tipoUnidadOptions} onChange={handleTipoUnidadSelect} value={tipoUnidadSeleccionado || null} placeholder="Seleccionar tipo" isClearable={false} styles={selectStyles} isDisabled={!entrada.placa} />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Patio</label>
              <Select options={OPCIONES_PATIO} onChange={handlePatioSelect} value={OPCIONES_PATIO.find(opt => opt.value === entrada.patio) || null} placeholder="NORTE o SUR" isClearable={false} styles={selectStyles} />
            </div>
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega Barco (Opcional)</label>
              <Select options={OPCIONES_BODEGA} onChange={handleBodegaSelect} value={OPCIONES_BODEGA.find(opt => opt.value === entrada.bodega_barco) || null} placeholder="Seleccionar bodega" isClearable styles={selectStyles} />
            </div>
            
            <div className="col-span-full">
              <button onClick={handleRegistrarEntrada} disabled={!entrada.placa || !entrada.tipo_unidad || !entrada.hora_entrada || !entrada.patio || !entrada.peso_bruto}
                className={`w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${!entrada.placa || !entrada.tipo_unidad || !entrada.hora_entrada || !entrada.patio || !entrada.peso_bruto ? 'bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                <PlayCircle className="w-4 h-4" /> Registrar ENTRADA #{entrada.correlativo}
              </button>
            </div>
          </div>
        </div>

        {/* PASO 2: SALIDA - REDISEÑADO */}
        <div ref={paso2Ref} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <StopCircle className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">PASO 2: Registrar SALIDA (Peso Neto)</h2>
            {viajeActivo && (
              <span className="text-sm bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full ml-2">
                Completando: {viajeActivo.placa}
              </span>
            )}
          </div>
          
          {!viajeActivo ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-400 mb-2">Buscar viaje activo por placa:</label>
                <div className="relative">
                  <input type="text" value={buscarPlaca} onChange={(e) => setBuscarPlaca(e.target.value)} placeholder="Ej: C-123456" className="w-full bg-slate-800 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-white" />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  {buscarPlaca && (
                    <button onClick={() => setBuscarPlaca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{viajesActivosFiltrados.length} de {viajesActivos.length} viajes encontrados</p>
              </div>
              
              {viajesActivosFiltrados.length === 0 ? (
                <div className="bg-slate-800 rounded-lg p-8 text-center">
                  <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">
                    {viajesActivos.length === 0 ? 'No hay viajes activos. Registra una ENTRADA primero.' : `No se encontró la placa "${buscarPlaca}"`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {viajesActivosFiltrados.map(viaje => (
                    <div key={viaje.id} className="bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg p-4 cursor-pointer transition-all" onClick={() => setViajeActivo(viaje)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">Viaje #{viaje.correlativo} - {viaje.placa}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            Entrada: {viaje.hora_entrada} | Peso Bruto: {viaje.peso_bruto?.toFixed(3)} TM | Patio: {viaje.patio_entrada}
                          </p>
                        </div>
                        <StopCircle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-slate-800 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-slate-400">Completando Viaje #{viajeActivo.correlativo} - {viajeActivo.placa}</p>
                  <button onClick={() => { setViajeActivo(null); setSalida({ hora_salida: '', peso_neto: '' }); }} className="text-xs text-blue-400 hover:text-blue-300">
                    Cambiar viaje
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Fecha Entrada</p>
                    <p className="font-bold text-white">{viajeActivo.fecha_entrada}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Hora Entrada</p>
                    <p className="font-bold text-white">{viajeActivo.hora_entrada}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Peso Bruto</p>
                    <p className="font-bold text-white">{viajeActivo.peso_bruto?.toFixed(3)} TM</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Patio</p>
                    <p className="font-bold text-white">{viajeActivo.patio_entrada}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hora Salida</label>
                  <div className="flex gap-2">
                    <input type="time" value={salida.hora_salida} onChange={(e) => setSalida(prev => ({ ...prev, hora_salida: e.target.value }))} step="1" className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    <button type="button" onClick={tomarHoraSalidaExacta} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                      Ahora
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Peso Neto (TM)</label>
                  <input 
                    type="text" 
                    value={salida.peso_neto} 
                    onChange={handlePesoNetoChange} 
                    placeholder="Ej: 23.456" 
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white" 
                  />
                  {salida.peso_neto && /^\d{5}$/.test(salida.peso_neto.replace('.', '')) && (
                    <p className="text-[10px] text-green-400 mt-0.5">Convertido: {convertirToneladas(salida.peso_neto)?.toFixed(3)} TM</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5">Rango permitido: {PESO_MINIMO} - {PESO_MAXIMO} TM</p>
                </div>
                
                <div className="md:col-span-2">
                  <button onClick={handleRegistrarSalida} disabled={!salida.hora_salida || !salida.peso_neto}
                    className={`w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${!salida.hora_salida || !salida.peso_neto ? 'bg-slate-700 cursor-not-allowed text-slate-400' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                    <StopCircle className="w-4 h-4" /> Registrar SALIDA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de Viajes Completados */}
        {viajesCompletados.length > 0 && (
          <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Viajes completados</p>
                  <p className="text-slate-500 text-xs">{viajesCompletados.length} registros</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Total descargado</p>
                <p className="text-orange-400 font-bold text-lg">{totalDescargado.toFixed(3)} <span className="text-xs">TM</span></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Placa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Transporte</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Patio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Entrada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Salida</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Peso Bruto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Peso Neto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Tiempo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {viajesCompletados.map((viaje, idx) => {
                    const fueraRango = estaFueraDeRango(viaje.peso_neto)
                    return (
                      <tr key={viaje.id} className={`border-b border-white/5 ${fueraRango ? 'bg-red-500/5' : idx % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}`}>
                        <td className="px-4 py-3 text-slate-500 text-sm">{viaje.correlativo}</td>
                        <td className="px-4 py-3 text-orange-400 font-mono font-semibold">{viaje.placa}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{viaje.transporte || '—'}</td>
                        <td className="px-4 py-3">
                          {viaje.tipo_unidad && (
                            <span className={`text-xs px-2 py-0.5 rounded ${viaje.tipo_unidad === 'Traileta' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                              {viaje.tipo_unidad}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {viaje.patio_entrada && (
                            <span className={`text-xs px-2 py-0.5 rounded ${viaje.patio_entrada === 'NORTE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {viaje.patio_entrada}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{viaje.bodega_barco || '—'}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm font-mono">{viaje.fecha_entrada}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm font-mono">{viaje.hora_entrada || '—'}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm font-mono">{viaje.hora_salida || '—'}</td>
                        <td className="px-4 py-3 text-blue-400 text-sm font-mono">{viaje.peso_bruto?.toFixed(3) || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-mono font-bold ${fueraRango ? 'text-red-400' : 'text-green-400'}`}>
                            {viaje.peso_neto?.toFixed(3) || '—'}
                          </span>
                          {fueraRango && <AlertTriangle className="w-3 h-3 text-red-400 inline ml-1" />}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{viaje.tiempo_atencion || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => abrirModalEdicion(viaje)} className="text-blue-400 hover:text-blue-300">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-800/30">
                  <tr className="border-t border-white/10">
                    <td colSpan={9} className="px-4 py-3 text-slate-500 text-sm font-medium">Total · {viajesCompletados.length} viajes</td>
                    <td className="px-4 py-3 text-blue-400/70 text-sm font-mono">
                      {viajesCompletados.reduce((s, v) => s + (Number(v.peso_bruto) || 0), 0).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-green-400 text-sm font-mono font-bold">{totalDescargado.toFixed(3)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
          <div className="flex flex-col gap-2 text-sm text-slate-400">
            <p className="font-bold text-orange-400">PROCESO DE REGISTRO:</p>
            <p>PASO 1: Registra Fecha (auto), Hora (manual o "Ahora"), PESO BRUTO, Placa, Tipo, Patio y Bodega</p>
            <p>PASO 2: Selecciona el viaje activo, registra Hora Salida y PESO NETO</p>
            <p className="text-xs">RANGO PERMITIDO: {PESO_MINIMO} - {PESO_MAXIMO} TM por viaje</p>
          </div>
        </div>

      </div>

      {/* Modal Agregar Unidad */}
      {modalUnidadAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="flex justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Agregar Nueva Unidad</h2>
              <button onClick={() => setModalUnidadAbierto(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" value={nuevaUnidad.placa} onChange={(e) => setNuevaUnidad({...nuevaUnidad, placa: e.target.value.toUpperCase()})} placeholder="Placa" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
              <input type="text" value={nuevaUnidad.transporte} onChange={(e) => setNuevaUnidad({...nuevaUnidad, transporte: e.target.value.toUpperCase()})} placeholder="Transporte" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
              <Select options={OPCIONES_TIPO_UNIDAD} onChange={(opt) => setNuevaUnidad({...nuevaUnidad, tipo: opt?.value || ''})} placeholder="Tipo Unidad" styles={selectStyles} />
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button onClick={handleAgregarUnidad} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg">
                Agregar
              </button>
              <button onClick={() => setModalUnidadAbierto(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edicion */}
      {modalEdicionAbierto && viajeEnEdicion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-orange-600 px-6 py-4 flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <Edit2 className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold text-white">Editar Viaje #{viajeEnEdicion.correlativo}</h2>
              </div>
              <button onClick={() => setModalEdicionAbierto(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-green-400">DATOS DE ENTRADA</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Placa</label>
                    <input type="text" value={viajeEnEdicion.placa} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, placa: e.target.value.toUpperCase() })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo Unidad</label>
                    <select value={viajeEnEdicion.tipo_unidad} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, tipo_unidad: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white">
                      <option value="">Seleccionar</option>
                      <option value="Traileta">Traileta</option>
                      <option value="Volqueta">Volqueta</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Transporte</label>
                    <input type="text" value={viajeEnEdicion.transporte} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, transporte: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha Entrada</label>
                    <input type="date" value={viajeEnEdicion.fecha_entrada} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, fecha_entrada: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hora Entrada</label>
                    <div className="flex gap-2">
                      <input type="time" value={viajeEnEdicion.hora_entrada} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, hora_entrada: e.target.value })} step="1" className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                      <button onClick={tomarHoraEntradaExactaEnEdicion} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">Ahora</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Bruto (TM)</label>
                    <input type="text" value={viajeEnEdicion.peso_bruto} onChange={handlePesoBrutoEdicionChange} placeholder="Ej: 34.567" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Patio</label>
                    <select value={viajeEnEdicion.patio} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, patio: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white">
                      <option value="">Seleccionar</option>
                      <option value="NORTE">NORTE</option>
                      <option value="SUR">SUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bodega Barco</label>
                    <select value={viajeEnEdicion.bodega_barco} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, bodega_barco: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white">
                      <option value="">Seleccionar</option>
                      <option value="Bodega 1">Bodega 1</option>
                      <option value="Bodega 2">Bodega 2</option>
                      <option value="Bodega 3">Bodega 3</option>
                      <option value="Bodega 4">Bodega 4</option>
                      <option value="Bodega 5">Bodega 5</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-red-400">DATOS DE SALIDA</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha Salida</label>
                    <input type="date" value={viajeEnEdicion.fecha_salida} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, fecha_salida: e.target.value })} className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hora Salida</label>
                    <div className="flex gap-2">
                      <input type="time" value={viajeEnEdicion.hora_salida} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, hora_salida: e.target.value })} step="1" className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                      <button onClick={tomarHoraSalidaExactaEnEdicion} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm">Ahora</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Peso Neto (TM)</label>
                    <input type="text" value={viajeEnEdicion.peso_neto} onChange={handlePesoNetoEdicionChange} placeholder="Ej: 23.456" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tiempo Atención</label>
                    <input type="text" value={viajeEnEdicion.tiempo_atencion} onChange={(e) => setViajeEnEdicion({ ...viajeEnEdicion, tiempo_atencion: e.target.value })} placeholder="Ej: 1h 32m" className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 p-6 border-t border-white/10 sticky bottom-0 bg-slate-800">
              <button onClick={() => handleEliminar(viajeEnEdicion.id, viajeEnEdicion.correlativo)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
              <div className="flex gap-3">
                <button onClick={() => setModalEdicionAbierto(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
                  Cancelar
                </button>
                <button onClick={guardarEdicion} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}