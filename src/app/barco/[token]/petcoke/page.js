// barco/[token]/petcoke/page.js
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Save, RefreshCw, Truck, Clock, AlertCircle, Target, CheckCircle, Plus, X, MapPin, Calculator, AlertTriangle, PlayCircle, StopCircle, Search, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import Select from 'react-select'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONA_EL_SALVADOR = 'America/El_Salvador'

const PESO_MINIMO = 22  // TM
const PESO_MAXIMO = 25  // TM

const OPCIONES_TIPO_UNIDAD = [
  { value: 'Traileta', label: '🚛 TRAILETA' },
  { value: 'Volqueta', label: '🚛 VOLQUETA' },
  { value: 'Ambos', label: '🔄 AMBOS' },
]

const OPCIONES_PATIO = [
  { value: 'NORTE', label: '🏭 NORTE' },
  { value: 'SUR', label: '🏭 SUR' },
]

export default function PetCokePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [barco, setBarco] = useState(null)
  const [producto, setProducto] = useState(null)
  const [registros, setRegistros] = useState([])
  const [meta, setMeta] = useState(0)

  const [unidades, setUnidades] = useState([])
  const [opcionesPlacas, setOpcionesPlacas] = useState([])

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevaUnidad, setNuevaUnidad] = useState({ placa: '', transporte: '', tipo: '' })

  const [registroEntrada, setRegistroEntrada] = useState({
    correlativo: 1,
    placa: '',
    tipo_unidad: '',
    transporte: '',
    patio: '',
    bodega_barco: '',
  })

  const [viajeActivo, setViajeActivo] = useState(null)
  const [completarSalida, setCompletarSalida] = useState({
    peso_bruto_updp_tm: '',
    peso_neto_updp_tm: '',
  })

  const [tipoUnidadOptions, setTipoUnidadOptions] = useState(OPCIONES_TIPO_UNIDAD)
  const [buscarPlaca, setBuscarPlaca] = useState('')
  const [modalEdicionAbierto, setModalEdicionAbierto] = useState(false)
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null)

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getHoraActual = () =>
    dayjs().tz(TIMEZONA_EL_SALVADOR).format('HH:mm:ss')

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
      const salida = dayjs(`2000-01-01T${horaSalida}`)
      const diffMinutos = salida.diff(entrada, 'minute')
      if (diffMinutos < 0) return null
      const horas = Math.floor(diffMinutos / 60)
      const minutos = diffMinutos % 60
      return `${horas}h ${minutos}m`
    } catch {
      return null
    }
  }

  // ─── Derivados ───────────────────────────────────────────────────────────────

  const acumuladoActual = useMemo(() => {
    return registros
      .filter(r => {
        const tienePeso = r.peso_neto_updp_tm !== null && !isNaN(Number(r.peso_neto_updp_tm))
        return tienePeso
      })
      .reduce((sum, r) => sum + (Number(r.peso_neto_updp_tm) || 0), 0)
  }, [registros])

  const siguienteCorrelativo = useMemo(() => {
    if (registros.length === 0) return 1
    return Math.max(...registros.map(r => r.correlativo)) + 1
  }, [registros])

  useEffect(() => {
    setRegistroEntrada(prev => ({ ...prev, correlativo: siguienteCorrelativo }))
  }, [siguienteCorrelativo])

  // ✅ Viajes activos: los que NO tienen peso_neto registrado
  const viajesActivos = useMemo(() => {
  if (!registros.length) return []
  const activos = registros.filter(r => r.peso_neto_updp_tm === null)
  console.log('🔥 viajesActivos calculados:', activos.length)
  return activos
}, [registros])

  const viajesActivosFiltrados = useMemo(() => {
    if (!buscarPlaca.trim()) return viajesActivos
    const termino = buscarPlaca.trim().toLowerCase()
    return viajesActivos.filter(v => v.placa.toLowerCase().includes(termino))
  }, [viajesActivos, buscarPlaca])

  // ✅ Viajes completados: los que TIENEN peso_neto registrado
  const viajesCompletos = useMemo(() => {
    return registros.filter(r => {
      const tienePeso = r.peso_neto_updp_tm !== null && !isNaN(Number(r.peso_neto_updp_tm))
      return tienePeso
    })
  }, [registros])

  const totalNeto = useMemo(() => {
    return viajesCompletos.reduce((sum, r) => sum + (Number(r.peso_neto_updp_tm) || 0), 0)
  }, [viajesCompletos])

  const porcentajeCompletado = meta > 0 ? (totalNeto / meta) * 100 : 0
  const faltante = Math.max(0, meta - totalNeto)
  const estaCompleto = faltante <= 0 && meta > 0
  const estaCerca = !estaCompleto && porcentajeCompletado >= 90 && meta > 0

  const previewAcumuladoSalida =
    viajeActivo && completarSalida.peso_neto_updp_tm
      ? {
          peso: Number(completarSalida.peso_neto_updp_tm),
          nuevoAcumulado: acumuladoActual + Number(completarSalida.peso_neto_updp_tm),
        }
      : null

  const tipoUnidadSeleccionado = OPCIONES_TIPO_UNIDAD.find(
    opt => opt.value === registroEntrada.tipo_unidad
  )

  // ─── Carga de datos ──────────────────────────────────────────────────────────

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

 const cargarDatos = async () => {
  try {
    setLoading(true)

    const { data: barcoData, error: barcoError } = await supabase
      .from('barcos')
      .select('*')
      .eq('token_compartido', token)
      .single()

    if (barcoError || !barcoData) {
      toast.error('Barco no encontrado')
      return
    }
    setBarco(barcoData)

    // 🔥 LOG PARA VERIFICAR EL BARCO ID
    console.log('🔥 BARCO ID ENCONTRADO:', barcoData.id)
    console.log('🔥 TOKEN USADO:', token)

    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .select('*')
      .eq('codigo', 'PC-001')
      .single()

    if (productoError || !productoData) {
      toast.error('Producto PET COKE no encontrado')
      return
    }
    setProducto(productoData)

    const metaProducto = barcoData.metas_json?.limites?.['PC-001'] || 0
    setMeta(metaProducto)

    // 🔥 CONSULTA SIMPLE - SIN NINGUNA TRANSFORMACIÓN
    const { data: registrosData, error: registrosError } = await supabase
      .from('petcoke_registros')
      .select('*')
      .eq('barco_id', barcoData.id)  // ← USAR EL barcoData.id QUE ACABAMOS DE OBTENER
      .order('correlativo', { ascending: true })

    console.log('🔥 REGISTROS ENCONTRADOS:', registrosData?.length)
    console.log('🔥 REGISTROS CON PESO NULL:', registrosData?.filter(r => r.peso_neto_updp_tm === null).length)
    console.log('🔥 PRIMER REGISTRO:', registrosData?.[0])

    // ✅ SIN NINGUNA TRANSFORMACIÓN, usar los datos DIRECTAMENTE
    setRegistros(registrosData || [])
    
  } catch (err) {
    console.error('Error cargando datos:', err)
    toast.error('Error al cargar datos')
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    cargarDatos()
    cargarUnidades()
  }, [token])

  // ─── Recalcular acumulados en DB ─────────────────────────────────────────────

  const recalcularAcumulados = async () => {
    try {
      if (!barco) return
      const { data: registrosData } = await supabase
        .from('petcoke_registros')
        .select('*')
        .eq('barco_id', barco.id)
        .order('correlativo', { ascending: true })

      if (!registrosData) return

      let acumulado = 0
      for (const reg of registrosData) {
        const pesoNeto = normalizarNulo(reg.peso_neto_updp_tm)

        if (pesoNeto !== null) {
          acumulado += Number(pesoNeto) || 0
        }

        if (Math.abs((reg.acumulado_updp_tm || 0) - acumulado) > 0.001) {
          await supabase
            .from('petcoke_registros')
            .update({ acumulado_updp_tm: acumulado })
            .eq('id', reg.id)
        }
      }
      return acumulado
    } catch (err) {
      console.error('Error recalculando acumulados:', err)
    }
  }

  // ─── Agregar unidad ──────────────────────────────────────────────────────────

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
      setModalAbierto(false)
      setNuevaUnidad({ placa: '', transporte: '', tipo: '' })
      await cargarUnidades()
    } catch (err) {
      console.error('Error agregando unidad:', err)
      toast.error('Error al agregar la unidad')
    }
  }

  // ─── PASO 1: Registrar Entrada ───────────────────────────────────────────────

  const handleRegistrarEntrada = async () => {
    if (!barco || !producto) return toast.error('Faltan datos del barco o producto')
    if (!registroEntrada.placa) return toast.error('La placa es obligatoria')
    if (!registroEntrada.tipo_unidad) return toast.error('Debes seleccionar el Tipo Unidad')

    // Verificar si ya tiene un viaje activo (sin peso registrado)
    const tieneViajeActivo = registros.some(
      r => r.placa === registroEntrada.placa && (!r.peso_neto_updp_tm || r.peso_neto_updp_tm === null)
    )
    if (tieneViajeActivo) {
      toast.error(`⚠️ La unidad ${registroEntrada.placa} ya tiene un viaje en curso.`)
      return
    }

    const horaActual = getHoraActual()
    const fechaActual = dayjs().tz(TIMEZONA_EL_SALVADOR).format('YYYY-MM-DD')

    const datosInsertar = {
      barco_id: barco.id,
      producto_id: producto.id,
      correlativo: registroEntrada.correlativo,
      placa: registroEntrada.placa,
      tipo_unidad: registroEntrada.tipo_unidad,
      transporte: registroEntrada.transporte,
      fecha: fechaActual,
      hora_entrada: horaActual,
      hora_salida: null,
      tiempo_atencion: null,
      patio: registroEntrada.patio || null,
      bodega_barco: registroEntrada.bodega_barco || null,
      peso_bruto_updp_tm: null,
      peso_neto_updp_tm: null,
      acumulado_updp_tm: null,
    }

    try {
      const { error } = await supabase.from('petcoke_registros').insert([datosInsertar])
      if (error) throw error

      toast.success(
        `✅ ENTRADA registrada: Viaje #${registroEntrada.correlativo} - ${registroEntrada.placa} - ${horaActual}`
      )

      setRegistroEntrada(prev => ({
        ...prev,
        placa: '',
        tipo_unidad: '',
        transporte: '',
        patio: '',
        bodega_barco: '',
      }))
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)

      await cargarDatos()
    } catch (err) {
      console.error('Error registrando entrada:', err)
      toast.error('Error al registrar la entrada: ' + err.message)
    }
  }

  // ─── PASO 2: Registrar Salida ────────────────────────────────────────────────

  const handleRegistrarSalida = async () => {
    if (!barco || !producto) return toast.error('Faltan datos del barco o producto')
    if (!viajeActivo) return toast.error('No hay un viaje activo seleccionado')
    if (!completarSalida.peso_neto_updp_tm)
      return toast.error('El Peso Neto UPDP es obligatorio')

    const pesoNeto = Number(completarSalida.peso_neto_updp_tm)
    if (isNaN(pesoNeto) || pesoNeto <= 0)
      return toast.error('El Peso Neto debe ser un número válido mayor a 0')

    if (pesoNeto < PESO_MINIMO || pesoNeto > PESO_MAXIMO) {
      toast.error(
        `⚠️ Peso fuera de rango permitido (${PESO_MINIMO}-${PESO_MAXIMO} TM). Valor: ${pesoNeto.toFixed(3)} TM`,
        { duration: 5000 }
      )
    }

    const horaSalida = getHoraActual()
    const tiempoAtencion = calcularTiempoAtencion(viajeActivo.hora_entrada, horaSalida)
    const nuevoAcumulado = acumuladoActual + pesoNeto

    const datosActualizar = {
      hora_salida: horaSalida,
      tiempo_atencion: tiempoAtencion,
      peso_bruto_updp_tm: completarSalida.peso_bruto_updp_tm
        ? Number(completarSalida.peso_bruto_updp_tm)
        : null,
      peso_neto_updp_tm: pesoNeto,
      acumulado_updp_tm: nuevoAcumulado,
    }

    try {
      const { error } = await supabase
        .from('petcoke_registros')
        .update(datosActualizar)
        .eq('id', viajeActivo.id)

      if (error) throw error

      toast.success(
        `✅ SALIDA registrada: ${viajeActivo.placa} - ${horaSalida} - ${pesoNeto.toFixed(3)} TM`
      )

      setViajeActivo(null)
      setCompletarSalida({ peso_bruto_updp_tm: '', peso_neto_updp_tm: '' })
      setBuscarPlaca('')

      await cargarDatos()
      await recalcularAcumulados()
    } catch (err) {
      console.error('Error registrando salida:', err)
      toast.error('Error al registrar la salida: ' + err.message)
    }
  }

  // ─── Selección de placa ──────────────────────────────────────────────────────

  const handlePlacaSelect = (opcionSeleccionada) => {
    if (opcionSeleccionada) {
      const unidad = unidades.find(u => u.placa === opcionSeleccionada.value)
      if (unidad) {
        setRegistroEntrada(prev => ({
          ...prev,
          placa: opcionSeleccionada.value,
          transporte: unidad.transporte,
          tipo_unidad: unidad.tipo === 'Ambos' ? '' : unidad.tipo,
        }))
        setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
      }
    } else {
      setRegistroEntrada(prev => ({ ...prev, placa: '', transporte: '', tipo_unidad: '' }))
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
    }
  }

  const handleTipoUnidadSelect = (opt) =>
    setRegistroEntrada(prev => ({ ...prev, tipo_unidad: opt?.value || '' }))

  const handlePatioSelect = (opt) =>
    setRegistroEntrada(prev => ({ ...prev, patio: opt?.value || '' }))

  const handleRegistroEntradaChange = (e) => {
    const { name, value } = e.target
    setRegistroEntrada(prev => ({ ...prev, [name]: value }))
  }

  const handleCompletarSalidaChange = (e) => {
    const { name, value } = e.target
    setCompletarSalida(prev => ({ ...prev, [name]: value }))
  }

  // ─── Edición ─────────────────────────────────────────────────────────────────

  const abrirModalEdicion = (registro) => {
    setRegistroEnEdicion({ ...registro })
    setModalEdicionAbierto(true)
  }

  const guardarEdicion = async () => {
    if (!registroEnEdicion) return
    try {
      const { error } = await supabase
        .from('petcoke_registros')
        .update({
          placa: registroEnEdicion.placa,
          tipo_unidad: registroEnEdicion.tipo_unidad,
          transporte: registroEnEdicion.transporte,
          fecha: registroEnEdicion.fecha,
          hora_entrada: registroEnEdicion.hora_entrada,
          hora_salida: normalizarNulo(registroEnEdicion.hora_salida),
          patio: normalizarNulo(registroEnEdicion.patio),
          bodega_barco: normalizarNulo(registroEnEdicion.bodega_barco),
          peso_bruto_updp_tm: registroEnEdicion.peso_bruto_updp_tm
            ? Number(registroEnEdicion.peso_bruto_updp_tm)
            : null,
          peso_neto_updp_tm: registroEnEdicion.peso_neto_updp_tm
            ? Number(registroEnEdicion.peso_neto_updp_tm)
            : null,
        })
        .eq('id', registroEnEdicion.id)

      if (error) throw error
      toast.success('Registro actualizado correctamente')
      setModalEdicionAbierto(false)
      await cargarDatos()
      await recalcularAcumulados()
    } catch (err) {
      console.error('Error guardando edición:', err)
      toast.error('Error al actualizar el registro')
    }
  }

  const handleEliminar = async (id, correlativo) => {
    if (!confirm(`¿Estás seguro de eliminar el registro #${correlativo}?`)) return
    try {
      const { error } = await supabase.from('petcoke_registros').delete().eq('id', id)
      if (error) throw error
      toast.success('Registro eliminado')
      setModalEdicionAbierto(false)
      await cargarDatos()
      await recalcularAcumulados()
    } catch (err) {
      console.error('Error eliminando:', err)
      toast.error('Error al eliminar')
    }
  }

  // ─── Estilos react-select ────────────────────────────────────────────────────

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

  // ─── Loading / Error states ──────────────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black flex items-center gap-2">
                  <span className="text-4xl">🪨</span>
                  Pet Coke — {barco.nombre}
                </h1>
                {barco.codigo_barco && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-mono">
                    {barco.codigo_barco}
                  </span>
                )}
              </div>
              <p className="text-orange-200 text-sm mt-1">
                Registro de descarga de carbón · {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="bg-orange-500/30 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Total Descargado: {totalNeto.toFixed(3)} TM
              </div>
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

        {/* Alerta viajes activos */}
        {viajesActivos.length > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/30">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                  ⏳ VIAJES EN CURSO (PENDIENTES DE SALIDA)
                  <span className="text-xs bg-yellow-500/30 px-2 py-0.5 rounded-full">
                    {viajesActivos.length} viaje{viajesActivos.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="mt-3 space-y-1">
                  {viajesActivos.map((viaje) => (
                    <div key={viaje.id} className="text-sm font-mono text-yellow-300 flex items-center gap-2">
                      <span>🚛</span>
                      <span className="font-bold">#{viaje.correlativo} — {viaje.placa}</span>
                      <span>Entrada: {viaje.hora_entrada}</span>
                      <span className="text-yellow-500/70">→ Debe registrar SALIDA</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tarjeta de progreso */}
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
                  {estaCompleto
                    ? <CheckCircle className="w-6 h-6 text-green-400" />
                    : <Target className="w-6 h-6 text-orange-400" />}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    CANTIDAD MANIFESTADA
                  </p>
                  <p className="text-2xl font-black text-white">{meta.toFixed(3)} TM</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  {estaCompleto ? '¡DESCARGA COMPLETADA!' : 'FALTANTE POR DESCARGAR'}
                </p>
                <p className={`text-3xl font-black ${
                  estaCompleto ? 'text-green-400' : estaCerca ? 'text-yellow-400' : 'text-orange-400'
                }`}>
                  {estaCompleto ? '✓ 0.000 TM' : `${faltante.toFixed(3)} TM`}
                </p>
                {!estaCompleto && (
                  <p className="text-xs text-slate-500 mt-1">
                    {porcentajeCompletado.toFixed(1)}% completado
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Progreso de descarga</span>
                <span>{porcentajeCompletado.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    estaCompleto ? 'bg-green-500' : estaCerca ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(100, porcentajeCompletado)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0 TM</span>
                <span>{totalNeto.toFixed(0)} TM</span>
                <span>{meta.toFixed(0)} TM</span>
              </div>
            </div>
          </div>
        )}

        {/* Acumulado actual + preview */}
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
                  }`}>
                    +{previewAcumuladoSalida.peso.toFixed(3)} TM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-400 uppercase font-bold">NUEVO ACUMULADO</p>
                  <p className="text-3xl font-black text-blue-400">
                    {previewAcumuladoSalida.nuevoAcumulado.toFixed(3)} TM
                  </p>
                  {meta > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {((previewAcumuladoSalida.nuevoAcumulado / meta) * 100).toFixed(1)}% de la meta
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── PASO 1: REGISTRAR ENTRADA ── */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-green-400" />
            PASO 1: Registrar ENTRADA
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1"># Viaje (Correlativo)</label>
              <input
                type="number"
                value={registroEntrada.correlativo}
                readOnly
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Se asigna automáticamente</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                Placa <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    options={opcionesPlacas}
                    onChange={handlePlacaSelect}
                    value={registroEntrada.placa
                      ? opcionesPlacas.find(opt => opt.value === registroEntrada.placa) || null
                      : null}
                    placeholder="🔍 Buscar o seleccionar placa..."
                    isClearable
                    styles={selectStyles}
                    classNamePrefix="react-select"
                  />
                </div>
                <button
                  onClick={() => setModalAbierto(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Transporte</label>
              <input
                type="text"
                value={registroEntrada.transporte}
                readOnly
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Tipo Unidad <span className="text-red-400">*</span>
              </label>
              <Select
                options={tipoUnidadOptions}
                onChange={handleTipoUnidadSelect}
                value={tipoUnidadSeleccionado || null}
                placeholder="🚛 Seleccionar tipo"
                isClearable={false}
                styles={selectStyles}
                classNamePrefix="react-select"
                isDisabled={!registroEntrada.placa}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Patio</label>
              <Select
                options={OPCIONES_PATIO}
                onChange={handlePatioSelect}
                value={OPCIONES_PATIO.find(opt => opt.value === registroEntrada.patio) || null}
                placeholder="🏭 NORTE o SUR"
                isClearable
                styles={selectStyles}
                classNamePrefix="react-select"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega Barco</label>
              <input
                type="text"
                name="bodega_barco"
                value={registroEntrada.bodega_barco}
                onChange={handleRegistroEntradaChange}
                placeholder="Ej: Bodega 1"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-end col-span-full">
              <button
                onClick={handleRegistrarEntrada}
                disabled={!registroEntrada.placa || !registroEntrada.tipo_unidad}
                className={`w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  !registroEntrada.placa || !registroEntrada.tipo_unidad
                    ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                Registrar ENTRADA #{registroEntrada.correlativo}
              </button>
            </div>
          </div>
        </div>

        {/* ── PASO 2: REGISTRAR SALIDA ── */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <StopCircle className="w-5 h-5 text-red-400" />
            PASO 2: Registrar SALIDA
            {viajeActivo && (
              <span className="text-sm bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full ml-2">
                Completando: {viajeActivo.placa}
              </span>
            )}
          </h2>

          {!viajeActivo ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Buscar viaje activo por placa:
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
                      onClick={() => setBuscarPlaca('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {viajesActivosFiltrados.length} de {viajesActivos.length} viajes encontrados
                </p>
              </div>

              {viajesActivosFiltrados.length === 0 ? (
                <div className="bg-slate-900 rounded-lg p-8 text-center border border-white/10">
                  <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">
                    {viajesActivos.length === 0
                      ? 'No hay viajes activos. Registra una ENTRADA primero.'
                      : `No se encontró la placa "${buscarPlaca}"`}
                  </p>
                  {buscarPlaca && (
                    <button
                      onClick={() => setBuscarPlaca('')}
                      className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {viajesActivosFiltrados.map(viaje => (
                    <div
                      key={viaje.id}
                      className="bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg p-4 transition-all cursor-pointer"
                      onClick={() => {
                        setViajeActivo(viaje)
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">
                            Viaje #{viaje.correlativo} · {viaje.placa}
                          </p>
                          <div className="grid grid-cols-3 gap-4 text-sm mt-1">
                            <span className="text-slate-400">Fecha: {viaje.fecha}</span>
                            <span className="text-slate-400">Entrada: {viaje.hora_entrada}</span>
                            <span className="text-yellow-400">Pendiente de salida</span>
                          </div>
                        </div>
                        <div className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-all">
                          <StopCircle className="w-5 h-5 text-red-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-slate-900 rounded-lg p-4 mb-6 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-slate-400">
                    Completando Viaje #{viajeActivo.correlativo} · {viajeActivo.placa}
                  </p>
                  <button
                    onClick={() => {
                      setViajeActivo(null)
                      setCompletarSalida({ peso_bruto_updp_tm: '', peso_neto_updp_tm: '' })
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Cambiar viaje
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Fecha</p>
                    <p className="font-bold text-white">{viajeActivo.fecha}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Hora Entrada</p>
                    <p className="font-bold text-white">{viajeActivo.hora_entrada || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tipo Unidad</p>
                    <p className="font-bold text-white">{viajeActivo.tipo_unidad}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Peso Bruto UPDP (TM)</label>
                  <input
                    type="number"
                    step="0.001"
                    name="peso_bruto_updp_tm"
                    value={completarSalida.peso_bruto_updp_tm}
                    onChange={handleCompletarSalidaChange}
                    placeholder="31.500"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Peso Neto UPDP (TM) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="peso_neto_updp_tm"
                    value={completarSalida.peso_neto_updp_tm}
                    onChange={handleCompletarSalidaChange}
                    placeholder="19.345"
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white ${
                      completarSalida.peso_neto_updp_tm &&
                      estaFueraDeRango(Number(completarSalida.peso_neto_updp_tm))
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-white/10'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    💡 Rango permitido: {PESO_MINIMO} - {PESO_MAXIMO} TM
                  </p>
                </div>
                <div className="flex items-end col-span-2">
                  <button
                    onClick={handleRegistrarSalida}
                    disabled={!completarSalida.peso_neto_updp_tm}
                    className={`w-full font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      !completarSalida.peso_neto_updp_tm
                        ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    <StopCircle className="w-4 h-4" />
                    Registrar SALIDA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla de viajes completados */}
        {viajesCompletos.length > 0 && (
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Viajes Completados — Pet Coke
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({viajesCompletos.length} registros)
                </span>
              </h3>
              <div className="bg-orange-500/20 px-3 py-1 rounded-full text-sm text-orange-400 font-bold">
                Total: {totalNeto.toFixed(3)} TM
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    {['#', 'Placa', 'Transporte', 'Tipo', 'Fecha', 'Hora Entrada', 'Hora Salida',
                      'Tiempo', 'Patio', 'Peso Bruto', 'Peso Neto', 'Acumulado', 'Acciones']
                      .map(th => (
                        <th key={th} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">
                          {th}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {viajesCompletos.map((reg) => {
                    const fueraRango = estaFueraDeRango(reg.peso_neto_updp_tm)
                    return (
                      <tr key={reg.id} className={`hover:bg-white/5 ${fueraRango ? 'bg-red-500/10' : ''}`}>
                        <td className="px-4 py-3 font-bold text-white">{reg.correlativo}</td>
                        <td className="px-4 py-3 font-mono text-orange-400">{reg.placa}</td>
                        <td className="px-4 py-3 text-slate-300">{reg.transporte || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            reg.tipo_unidad === 'Traileta' ? 'bg-blue-500/20 text-blue-400'
                            : reg.tipo_unidad === 'Volqueta' ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-400'
                          }`}>
                            {reg.tipo_unidad || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{reg.fecha}</td>
                        <td className="px-4 py-3 text-slate-300">{reg.hora_entrada || '—'}</td>
                        <td className="px-4 py-3 text-slate-300">{reg.hora_salida || '—'}</td>
                        <td className="px-4 py-3 font-mono text-green-400">{reg.tiempo_atencion || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            reg.patio === 'NORTE' ? 'bg-blue-500/20 text-blue-400'
                            : reg.patio === 'SUR' ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-700 text-slate-400'
                          }`}>
                            {reg.patio || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-blue-400">
                          {reg.peso_bruto_updp_tm != null ? Number(reg.peso_bruto_updp_tm).toFixed(3) : '—'}
                        </td>
                        <td className={`px-4 py-3 font-bold ${fueraRango ? 'text-red-400' : 'text-green-400'}`}>
                          {reg.peso_neto_updp_tm != null ? Number(reg.peso_neto_updp_tm).toFixed(3) : '—'}
                          {fueraRango && <span className="ml-1 text-[10px]">⚠️</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-yellow-400">
                          {reg.acumulado_updp_tm != null ? Number(reg.acumulado_updp_tm).toFixed(3) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => abrirModalEdicion(reg)}
                            className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-900">
                  <tr>
                    <td colSpan="10" className="px-4 py-3 font-bold text-white">TOTAL</td>
                    <td className="px-4 py-3 font-bold text-green-400">{totalNeto.toFixed(3)} TM</td>
                    <td className="px-4 py-3 font-bold text-yellow-400">{acumuladoActual.toFixed(3)} TM</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex flex-col gap-2 text-sm text-orange-400">
            <p className="flex items-center gap-2 font-bold text-yellow-400">
              <span className="text-lg">📋</span>
              PROCESO DE REGISTRO:
            </p>
            <p className="flex items-center gap-2 ml-4">
              <span className="text-lg text-green-400">▶️</span>
              <strong>PASO 1 (ENTRADA):</strong> Selecciona la placa, Tipo de unidad y haz clic en "Registrar ENTRADA"
            </p>
            <p className="flex items-center gap-2 ml-4">
              <span className="text-lg text-red-400">⏹️</span>
              <strong>PASO 2 (SALIDA):</strong> Busca la placa en la lista de viajes activos, ingresa los pesos y haz clic en "Registrar SALIDA"
            </p>
            <div className="border-t border-orange-500/20 my-2" />
            <p className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              La tarjeta <strong>"ACUMULADO ACTUAL"</strong> muestra una preview del total al registrar la salida.
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <strong>RANGO PERMITIDO:</strong> {PESO_MINIMO} - {PESO_MAXIMO} TM por viaje
            </p>
          </div>
        </div>

      </div>

      {/* MODAL: Agregar Nueva Unidad */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-400" />
                Agregar Nueva Unidad
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Placa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nuevaUnidad.placa}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, placa: e.target.value.toUpperCase() })}
                  placeholder="Ej: 123456"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Transporte <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nuevaUnidad.transporte}
                  onChange={(e) => setNuevaUnidad({ ...nuevaUnidad, transporte: e.target.value.toUpperCase() })}
                  placeholder="Ej: SANTIMONI, ESCOBAR, JOB..."
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Tipo Unidad <span className="text-red-400">*</span>
                </label>
                <Select
                  options={OPCIONES_TIPO_UNIDAD}
                  onChange={(opt) => setNuevaUnidad({ ...nuevaUnidad, tipo: opt?.value || '' })}
                  value={OPCIONES_TIPO_UNIDAD.find(opt => opt.value === nuevaUnidad.tipo) || null}
                  placeholder="Seleccionar tipo..."
                  styles={selectStyles}
                  classNamePrefix="react-select"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={handleAgregarUnidad}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Unidad
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Registro */}
      {modalEdicionAbierto && registroEnEdicion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Editar Registro #{registroEnEdicion.correlativo}
              </h2>
              <button onClick={() => setModalEdicionAbierto(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Placa</label>
                  <input
                    type="text"
                    value={registroEnEdicion.placa}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, placa: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo Unidad</label>
                  <select
                    value={registroEnEdicion.tipo_unidad || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, tipo_unidad: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Traileta">Traileta</option>
                    <option value="Volqueta">Volqueta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Transporte</label>
                  <input
                    type="text"
                    value={registroEnEdicion.transporte || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, transporte: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={registroEnEdicion.fecha}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, fecha: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hora Entrada</label>
                  <input
                    type="time"
                    value={registroEnEdicion.hora_entrada || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, hora_entrada: e.target.value })}
                    step="1"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hora Salida</label>
                  <input
                    type="time"
                    value={registroEnEdicion.hora_salida || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, hora_salida: e.target.value })}
                    step="1"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Patio</label>
                  <select
                    value={registroEnEdicion.patio || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, patio: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Seleccionar</option>
                    <option value="NORTE">NORTE</option>
                    <option value="SUR">SUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bodega Barco</label>
                  <input
                    type="text"
                    value={registroEnEdicion.bodega_barco || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, bodega_barco: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Peso Bruto UPDP (TM)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={registroEnEdicion.peso_bruto_updp_tm || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, peso_bruto_updp_tm: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Peso Neto UPDP (TM)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={registroEnEdicion.peso_neto_updp_tm || ''}
                    onChange={(e) => setRegistroEnEdicion({ ...registroEnEdicion, peso_neto_updp_tm: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={guardarEdicion}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
              <button
                onClick={() => handleEliminar(registroEnEdicion.id, registroEnEdicion.correlativo)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
              <button
                onClick={() => setModalEdicionAbierto(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}