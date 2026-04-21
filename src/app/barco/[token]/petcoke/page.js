// barco/[token]/petcoke/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Save, RefreshCw, Truck, Clock, AlertCircle, Target, CheckCircle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import Select from 'react-select'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE_EL_SALVADOR = 'America/El_Salvador'

// Opciones para Tipo Unidad
const OPCIONES_TIPO_UNIDAD = [
  { value: 'Traileta', label: '🚛 TRAILETA' },
  { value: 'Volqueta', label: '🚛 VOLQUETA' },
  { value: 'Ambos', label: '🔄 AMBOS' },
]

// Opciones para Patio
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
  
  // Estado para las unidades (placas)
  const [unidades, setUnidades] = useState([])
  const [opcionesPlacas, setOpcionesPlacas] = useState([])
  
  // Estado para el modal de agregar placa
  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevaUnidad, setNuevaUnidad] = useState({
    placa: '',
    transporte: '',
    tipo: ''
  })
  
  const [nuevoRegistro, setNuevoRegistro] = useState({
    correlativo: 1,
    placa: '',
    tipo_unidad: '',
    transporte: '',
    fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
    hora_entrada: '',
    hora_salida: '',
    patio: '',
    bodega_barco: '',
    peso_bruto_updp_tm: '',
    peso_neto_updp_tm: '',
    acumulado_updp_tm: '',
  })
  const [editando, setEditando] = useState(null)
  const [tipoUnidadOptions, setTipoUnidadOptions] = useState(OPCIONES_TIPO_UNIDAD)

  // Cargar unidades desde Supabase
  const cargarUnidades = async () => {
    try {
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .order('placa', { ascending: true })

      if (error) throw error
      setUnidades(data || [])
      
      // Crear opciones para react-select
      const opciones = (data || []).map(unidad => ({
        value: unidad.placa,
        label: `${unidad.placa} - ${unidad.transporte}`,
        transporte: unidad.transporte,
        tipoPredeterminado: unidad.tipo
      }))
      setOpcionesPlacas(opciones)
    } catch (error) {
      console.error('Error cargando unidades:', error)
      toast.error('Error al cargar las unidades')
    }
  }

  // Agregar nueva unidad
  const handleAgregarUnidad = async () => {
    if (!nuevaUnidad.placa.trim()) {
      toast.error('La placa es obligatoria')
      return
    }
    if (!nuevaUnidad.transporte.trim()) {
      toast.error('El transporte es obligatorio')
      return
    }
    if (!nuevaUnidad.tipo) {
      toast.error('Debes seleccionar un tipo de unidad')
      return
    }

    try {
      const { data, error } = await supabase
        .from('unidades')
        .insert([{
          placa: nuevaUnidad.placa.toUpperCase(),
          transporte: nuevaUnidad.transporte.toUpperCase(),
          tipo: nuevaUnidad.tipo
        }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta placa ya existe')
        } else {
          throw error
        }
        return
      }

      toast.success(`Unidad ${data.placa} agregada correctamente`)
      setModalAbierto(false)
      setNuevaUnidad({ placa: '', transporte: '', tipo: '' })
      await cargarUnidades() // Recargar la lista
    } catch (error) {
      console.error('Error agregando unidad:', error)
      toast.error('Error al agregar la unidad')
    }
  }

  // Cargar datos del barco y producto PET COKE
  useEffect(() => {
    cargarDatos()
    cargarUnidades()
  }, [token])

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

      const { data: registrosData, error: registrosError } = await supabase
        .from('petcoke_registros')
        .select('*')
        .eq('barco_id', barcoData.id)
        .order('correlativo', { ascending: true })

      if (registrosError) throw registrosError

      let acumulado = 0
      const registrosConAcumulado = (registrosData || []).map(reg => {
        acumulado += Number(reg.peso_neto_updp_tm) || 0
        return { ...reg, acumulado_updp_tm: acumulado }
      })

      setRegistros(registrosConAcumulado)

      const maxCorrelativo = registrosConAcumulado.length > 0
        ? Math.max(...registrosConAcumulado.map(r => r.correlativo))
        : 0
      setNuevoRegistro(prev => ({ ...prev, correlativo: maxCorrelativo + 1 }))

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Recalcular acumulados
  const recalcularAcumulados = async (barcoId, productoId) => {
    try {
      const { data: registrosData, error } = await supabase
        .from('petcoke_registros')
        .select('*')
        .eq('barco_id', barcoId)
        .eq('producto_id', productoId)
        .order('correlativo', { ascending: true })

      if (error) throw error

      let acumulado = 0
      for (const reg of registrosData) {
        acumulado += Number(reg.peso_neto_updp_tm) || 0
        const nuevoAcumulado = acumulado
        
        if (Math.abs((reg.acumulado_updp_tm || 0) - nuevoAcumulado) > 0.001) {
          await supabase
            .from('petcoke_registros')
            .update({ acumulado_updp_tm: nuevoAcumulado })
            .eq('id', reg.id)
        }
      }
      
      return acumulado
    } catch (error) {
      console.error('Error recalculando acumulados:', error)
      return 0
    }
  }

  // Manejar selección de placa
  const handlePlacaSelect = (opcionSeleccionada) => {
    if (opcionSeleccionada) {
      const unidad = unidades.find(u => u.placa === opcionSeleccionada.value)
      
      if (unidad.tipo === 'Ambos') {
        setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
        setNuevoRegistro(prev => ({
          ...prev,
          placa: opcionSeleccionada.value,
          transporte: unidad.transporte,
          tipo_unidad: '',
        }))
      } else {
        setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
        setNuevoRegistro(prev => ({
          ...prev,
          placa: opcionSeleccionada.value,
          transporte: unidad.transporte,
          tipo_unidad: unidad.tipo,
        }))
      }
    } else {
      setNuevoRegistro(prev => ({
        ...prev,
        placa: '',
        transporte: '',
        tipo_unidad: '',
      }))
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
    }
  }

  const handleTipoUnidadSelect = (opcionSeleccionada) => {
    setNuevoRegistro(prev => ({
      ...prev,
      tipo_unidad: opcionSeleccionada?.value || '',
    }))
  }

  const handlePatioSelect = (opcionSeleccionada) => {
    setNuevoRegistro(prev => ({
      ...prev,
      patio: opcionSeleccionada?.value || '',
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    setNuevoRegistro(prev => {
      const nuevosValores = { ...prev, [name]: value }
      
      if (name === 'peso_neto_updp_tm') {
        const ultimoAcumulado = registros.length > 0 
          ? registros[registros.length - 1].acumulado_updp_tm || 0 
          : 0
        const nuevoPeso = parseFloat(value) || 0
        const acumuladoPreview = ultimoAcumulado + nuevoPeso
        
        nuevosValores.acumulado_updp_tm = acumuladoPreview.toString()
      }
      
      return nuevosValores
    })
  }

  const calcularTiempoAtencion = (horaEntrada, horaSalida) => {
    if (!horaEntrada || !horaSalida) return null
    const entrada = dayjs(`2000-01-01T${horaEntrada}`)
    const salida = dayjs(`2000-01-01T${horaSalida}`)
    const diffMinutos = salida.diff(entrada, 'minute')
    if (diffMinutos < 0) return null
    const horas = Math.floor(diffMinutos / 60)
    const minutos = diffMinutos % 60
    return `${horas}h ${minutos}m`
  }

  const handleGuardar = async () => {
    if (!barco || !producto) {
      toast.error('Faltan datos del barco o producto')
      return
    }

    if (!nuevoRegistro.placa) {
      toast.error('La placa es obligatoria')
      return
    }

    if (!nuevoRegistro.tipo_unidad) {
      toast.error('Debes seleccionar el Tipo Unidad (Traileta o Volqueta)')
      return
    }

    if (!nuevoRegistro.peso_neto_updp_tm) {
      toast.error('El Peso Neto UPDP es obligatorio')
      return
    }

    const tiempoAtencion = calcularTiempoAtencion(
      nuevoRegistro.hora_entrada,
      nuevoRegistro.hora_salida
    )

    let acumuladoCalculado
    if (editando) {
      acumuladoCalculado = null
    } else {
      const ultimoAcumulado = registros.length > 0 
        ? registros[registros.length - 1].acumulado_updp_tm || 0 
        : 0
      acumuladoCalculado = ultimoAcumulado + (Number(nuevoRegistro.peso_neto_updp_tm) || 0)
    }

    const datosInsertar = {
      barco_id: barco.id,
      producto_id: producto.id,
      correlativo: editando ? nuevoRegistro.correlativo : (registros.length + 1),
      placa: nuevoRegistro.placa,
      tipo_unidad: nuevoRegistro.tipo_unidad,
      transporte: nuevoRegistro.transporte,
      fecha: nuevoRegistro.fecha,
      hora_entrada: nuevoRegistro.hora_entrada || null,
      hora_salida: nuevoRegistro.hora_salida || null,
      tiempo_atencion: tiempoAtencion,
      patio: nuevoRegistro.patio || null,
      bodega_barco: nuevoRegistro.bodega_barco || null,
      peso_bruto_updp_tm: Number(nuevoRegistro.peso_bruto_updp_tm) || null,
      peso_neto_updp_tm: Number(nuevoRegistro.peso_neto_updp_tm),
      acumulado_updp_tm: acumuladoCalculado,
    }

    try {
      let result
      if (editando) {
        result = await supabase
          .from('petcoke_registros')
          .update(datosInsertar)
          .eq('id', editando.id)
        if (!result.error) {
          toast.success('Registro actualizado correctamente')
          setEditando(null)
          await recalcularAcumulados(barco.id, producto.id)
        }
      } else {
        result = await supabase
          .from('petcoke_registros')
          .insert([datosInsertar])
        if (!result.error) {
          toast.success('Registro guardado correctamente')
        }
      }

      if (result.error) throw result.error

      await cargarDatos()

      setNuevoRegistro({
        correlativo: registros.length + 2,
        placa: '',
        tipo_unidad: '',
        transporte: '',
        fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
        hora_entrada: '',
        hora_salida: '',
        patio: '',
        bodega_barco: '',
        peso_bruto_updp_tm: '',
        peso_neto_updp_tm: '',
        acumulado_updp_tm: '',
      })
      setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)

    } catch (error) {
      console.error('Error guardando:', error)
      toast.error('Error al guardar el registro')
    }
  }

  const handleEditar = (registro) => {
    setEditando(registro)
    setNuevoRegistro({
      correlativo: registro.correlativo,
      placa: registro.placa,
      tipo_unidad: registro.tipo_unidad || '',
      transporte: registro.transporte || '',
      fecha: registro.fecha,
      hora_entrada: registro.hora_entrada || '',
      hora_salida: registro.hora_salida || '',
      patio: registro.patio || '',
      bodega_barco: registro.bodega_barco || '',
      peso_bruto_updp_tm: registro.peso_bruto_updp_tm?.toString() || '',
      peso_neto_updp_tm: registro.peso_neto_updp_tm?.toString() || '',
      acumulado_updp_tm: registro.acumulado_updp_tm?.toString() || '',
    })
  }

  const handleEliminar = async (id, correlativo) => {
    if (!confirm(`¿Estás seguro de eliminar el registro #${correlativo}?`)) return

    try {
      const { error } = await supabase
        .from('petcoke_registros')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Registro eliminado')
      
      await recalcularAcumulados(barco.id, producto.id)
      await cargarDatos()
      
      if (editando?.id === id) {
        setEditando(null)
        setNuevoRegistro({
          correlativo: registros.filter(r => r.id !== id).length + 1,
          placa: '',
          tipo_unidad: '',
          transporte: '',
          fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
          hora_entrada: '',
          hora_salida: '',
          patio: '',
          bodega_barco: '',
          peso_bruto_updp_tm: '',
          peso_neto_updp_tm: '',
          acumulado_updp_tm: '',
        })
      }
    } catch (error) {
      console.error('Error eliminando:', error)
      toast.error('Error al eliminar')
    }
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNuevoRegistro({
      correlativo: registros.length + 1,
      placa: '',
      tipo_unidad: '',
      transporte: '',
      fecha: dayjs().tz(TIMEZONE_EL_SALVADOR).format('YYYY-MM-DD'),
      hora_entrada: '',
      hora_salida: '',
      patio: '',
      bodega_barco: '',
      peso_bruto_updp_tm: '',
      peso_neto_updp_tm: '',
      acumulado_updp_tm: '',
    })
    setTipoUnidadOptions(OPCIONES_TIPO_UNIDAD)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
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

  const totalNeto = registros.reduce((sum, r) => sum + (r.peso_neto_updp_tm || 0), 0)
  const ultimoAcumulado = registros.length > 0 ? registros[registros.length - 1].acumulado_updp_tm || 0 : 0
  const faltante = Math.max(0, meta - totalNeto)
  const porcentajeCompletado = meta > 0 ? (totalNeto / meta) * 100 : 0
  const estaCompleto = faltante <= 0 && meta > 0
  const estaCerca = !estaCompleto && porcentajeCompletado >= 90 && meta > 0

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#0f172a',
      borderColor: state.isFocused ? '#f97316' : 'rgba(255,255,255,0.1)',
      borderRadius: '0.5rem',
      padding: '0px',
      boxShadow: state.isFocused ? '0 0 0 1px #f97316' : 'none',
      '&:hover': {
        borderColor: '#f97316',
      },
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
      '&:active': {
        backgroundColor: '#334155',
      },
    }),
    input: (base) => ({
      ...base,
      color: '#ffffff',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#ffffff',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#64748b',
    }),
  }

  const tipoUnidadSeleccionado = OPCIONES_TIPO_UNIDAD.find(opt => opt.value === nuevoRegistro.tipo_unidad)

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
                  Pet Coke - {barco.nombre}
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
                  {estaCompleto ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <Target className="w-6 h-6 text-orange-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    CANTIDAD MANIFESTADA
                  </p>
                  <p className="text-2xl font-black text-white">
                    {meta.toFixed(3)} TM
                  </p>
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

            {estaCerca && !estaCompleto && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <p className="text-xs text-yellow-400">
                  ⚠️ ¡Cerca de completar la descarga! Faltan {faltante.toFixed(3)} TM para terminar.
                </p>
              </div>
            )}

            {estaCompleto && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-xs text-green-400">
                  ✅ ¡Descarga completada! Se ha alcanzado la cantidad manifestada de {meta.toFixed(3)} TM.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Preview del acumulado actual */}
        <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-400 uppercase font-bold">ACUMULADO ACTUAL</p>
              <p className="text-3xl font-black text-orange-400">
                {ultimoAcumulado.toFixed(3)} TM
              </p>
              <p className="text-[10px] text-orange-300/70 mt-0.5">
                Total descargado hasta el momento
              </p>
            </div>
            {nuevoRegistro.peso_neto_updp_tm && Number(nuevoRegistro.peso_neto_updp_tm) > 0 && (
              <>
                <div className="text-center">
                  <p className="text-xs text-slate-500">+ Este viaje</p>
                  <p className="text-xl font-bold text-green-400">
                    +{Number(nuevoRegistro.peso_neto_updp_tm).toFixed(3)} TM
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-400 uppercase font-bold">NUEVO ACUMULADO</p>
                  <p className="text-3xl font-black text-blue-400">
                    {(ultimoAcumulado + (Number(nuevoRegistro.peso_neto_updp_tm) || 0)).toFixed(3)} TM
                  </p>
                  {meta > 0 && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {(((ultimoAcumulado + (Number(nuevoRegistro.peso_neto_updp_tm) || 0)) / meta) * 100).toFixed(1)}% de la meta
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Formulario de registro */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-orange-400" />
            {editando ? `Editando Registro #${editando.correlativo}` : 'Nuevo Registro'}
            {editando && (
              <button
                onClick={cancelarEdicion}
                className="text-xs text-orange-400 hover:text-orange-300 ml-2"
              >
                Cancelar edición
              </button>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Correlativo */}
            <div>
              <label className="block text-xs text-slate-400 mb-1"># Correlativo</label>
              <input
                type="number"
                name="correlativo"
                value={nuevoRegistro.correlativo}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
                readOnly
              />
            </div>

            {/* Placa con botón para agregar */}
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                Placa <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    options={opcionesPlacas}
                    onChange={handlePlacaSelect}
                    value={nuevoRegistro.placa ? opcionesPlacas.find(opt => opt.value === nuevoRegistro.placa) : null}
                    placeholder="🔍 Buscar o seleccionar placa..."
                    isClearable
                    styles={selectStyles}
                    className="w-full"
                    classNamePrefix="react-select"
                  />
                </div>
                <button
                  onClick={() => setModalAbierto(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                  title="Agregar nueva placa"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
            </div>

            {/* Transporte */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Transporte</label>
              <input
                type="text"
                value={nuevoRegistro.transporte}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-slate-300"
                readOnly
              />
            </div>

            {/* Tipo Unidad */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Tipo Unidad <span className="text-red-400">*</span>
              </label>
              <Select
                options={tipoUnidadOptions}
                onChange={handleTipoUnidadSelect}
                value={tipoUnidadSeleccionado}
                placeholder="🚛 Seleccionar tipo"
                isClearable={false}
                styles={selectStyles}
                className="w-full"
                classNamePrefix="react-select"
                isDisabled={!nuevoRegistro.placa}
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={nuevoRegistro.fecha}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white [color-scheme:dark]"
              />
            </div>

            {/* Hora Entrada */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hora Entrada</label>
              <div className="relative">
                <input
                  type="time"
                  name="hora_entrada"
                  value={nuevoRegistro.hora_entrada}
                  onChange={handleChange}
                  step="1"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark]"
                />
                <button
                  type="button"
                  onClick={() => setNuevoRegistro(prev => ({ ...prev, hora_entrada: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm:ss') }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-400"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hora Salida */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Hora Salida</label>
              <div className="relative">
                <input
                  type="time"
                  name="hora_salida"
                  value={nuevoRegistro.hora_salida}
                  onChange={handleChange}
                  step="1"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white pr-10 [color-scheme:dark]"
                />
                <button
                  type="button"
                  onClick={() => setNuevoRegistro(prev => ({ ...prev, hora_salida: dayjs().tz(TIMEZONE_EL_SALVADOR).format('HH:mm:ss') }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-400"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Patio */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Patio</label>
              <Select
                options={OPCIONES_PATIO}
                onChange={handlePatioSelect}
                value={OPCIONES_PATIO.find(opt => opt.value === nuevoRegistro.patio) || null}
                placeholder="🏭 NORTE o SUR"
                isClearable
                styles={selectStyles}
                className="w-full"
                classNamePrefix="react-select"
              />
            </div>

            {/* Bodega Barco */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Bodega Barco</label>
              <input
                type="text"
                name="bodega_barco"
                value={nuevoRegistro.bodega_barco}
                onChange={handleChange}
                placeholder="Ej: Bodega 1"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>

            {/* Peso Bruto */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Peso Bruto UPDP (TM)</label>
              <input
                type="number"
                step="0.001"
                name="peso_bruto_updp_tm"
                value={nuevoRegistro.peso_bruto_updp_tm}
                onChange={handleChange}
                placeholder="31.500"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>

            {/* Peso Neto */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Peso Neto UPDP (TM) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                name="peso_neto_updp_tm"
                value={nuevoRegistro.peso_neto_updp_tm}
                onChange={handleChange}
                placeholder="19.345"
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                💡 Al ingresar el peso, se calculará el acumulado automáticamente
              </p>
            </div>

            {/* Acumulado */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Acumulado UPDP (TM)</label>
              <input
                type="number"
                step="0.001"
                name="acumulado_updp_tm"
                value={nuevoRegistro.acumulado_updp_tm}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-yellow-400 font-bold"
                readOnly
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                📊 Se calcula automáticamente
              </p>
            </div>

            {/* Botones */}
            <div className="flex items-end col-span-full gap-2">
              <button
                onClick={handleGuardar}
                disabled={estaCompleto && !editando}
                className={`flex-1 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  estaCompleto && !editando
                    ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                {editando ? 'Actualizar Registro' : 'Guardar Registro'}
              </button>
              {editando && (
                <button
                  onClick={() => handleEliminar(editando.id, editando.correlativo)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de registros */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-400" />
              Registros de Descarga - Pet Coke
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({registros.length} registros)
              </span>
            </h3>
            <div className="bg-orange-500/20 px-3 py-1 rounded-full text-sm">
              Total: {totalNeto.toFixed(3)} TM
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Transporte</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Entrada</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Salida</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tiempo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Patio</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Bodega</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Peso Bruto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Peso Neto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acumulado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {registros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-white">{reg.correlativo}</td>
                    <td className="px-4 py-3 font-mono text-orange-400">{reg.placa}</td>
                    <td className="px-4 py-3">{reg.transporte || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        reg.tipo_unidad === 'Traileta' ? 'bg-blue-500/20 text-blue-400' : 
                        reg.tipo_unidad === 'Volqueta' ? 'bg-green-500/20 text-green-400' : 
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {reg.tipo_unidad || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{reg.fecha}</td>
                    <td className="px-4 py-3">{reg.hora_entrada || '—'}</td>
                    <td className="px-4 py-3">{reg.hora_salida || '—'}</td>
                    <td className="px-4 py-3 font-mono text-green-400">{reg.tiempo_atencion || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        reg.patio === 'NORTE' ? 'bg-blue-500/20 text-blue-400' : 
                        reg.patio === 'SUR' ? 'bg-green-500/20 text-green-400' : 
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {reg.patio || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{reg.bodega_barco || '—'}</td>
                    <td className="px-4 py-3 text-blue-400">{reg.peso_bruto_updp_tm?.toFixed(3) || '—'}</td>
                    <td className="px-4 py-3 font-bold text-green-400">{reg.peso_neto_updp_tm?.toFixed(3)}</td>
                    <td className="px-4 py-3 font-bold text-yellow-400">{reg.acumulado_updp_tm?.toFixed(3)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditar(reg)}
                          className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleEliminar(reg.id, reg.correlativo)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900">
                <tr>
                  <td colSpan="11" className="px-4 py-3 font-bold text-white">TOTAL</td>
                  <td className="px-4 py-3 font-bold text-green-400">{totalNeto.toFixed(3)} TM</td>
                  <td className="px-4 py-3 font-bold text-yellow-400">{ultimoAcumulado.toFixed(3)} TM</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex flex-col gap-2 text-sm text-orange-400">
            <p className="flex items-center gap-2">
              <span className="text-lg">🔍</span>
              Selecciona la placa → Transporte y Tipo de unidad se autocompletan
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">➕</span>
              Si una placa no existe, haz clic en <strong>"Agregar"</strong> para registrarla
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              El <strong>Acumulado UPDP</strong> se calcula automáticamente
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              La <strong>barra de progreso</strong> muestra cuánto falta para completar la descarga
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">🏭</span>
              Selecciona el patio: <strong>NORTE</strong> o <strong>SUR</strong>
            </p>
          </div>
        </div>

      </div>

      {/* MODAL PARA AGREGAR NUEVA UNIDAD */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-400" />
                Agregar Nueva Unidad
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
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
                  value={OPCIONES_TIPO_UNIDAD.find(opt => opt.value === nuevaUnidad.tipo)}
                  placeholder="Seleccionar tipo..."
                  styles={selectStyles}
                  className="w-full"
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
    </div>
  )
}