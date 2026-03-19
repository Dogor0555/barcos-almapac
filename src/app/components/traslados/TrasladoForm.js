'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'
import { 
  X, Truck, User, Hash, Calendar, Clock, Save, FolderOpen,
  Clock3, RotateCw, AlertCircle, Plus, Minus, Play, Pause, StopCircle,
  Building2, PlusCircle, CreditCard, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import OperativoSelector from './OperativoSelector'
import dayjs from 'dayjs'

// Lista de transportes predefinidos
const TRANSPORTES_PREDEFINIDOS = [
  'Suave',
  'Herrera',
  'Vega',
  'Nuñez',
  'A y V',
  'Guardado'
]

// Configuración de marchamos - puedes cambiar estos valores
const MARCHAMOS_CONFIG = {
  cantidadCampos: 5,        // Número de campos de marchamo
  digitosPorCampo: [10, 10, 10, 10, 10] // Dígitos para cada campo (10 cada uno)
}

export default function TrasladoForm({ traslado = null, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [operativoId, setOperativoId] = useState(traslado?.operativo_id || null)
  const [duracionCalculada, setDuracionCalculada] = useState(null)
  const [mostrarCabaleo, setMostrarCabaleo] = useState(traslado?.tiene_cabaleo || false)
  const [transporteSeleccionado, setTransporteSeleccionado] = useState(traslado?.transporte || '')
  const [mostrarOtroTransporte, setMostrarOtroTransporte] = useState(false)
  const [otroTransporte, setOtroTransporte] = useState('')
  
  // Estados para el temporizador de cabaleo
  const [cronometroActivo, setCronometroActivo] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const [intervalId, setIntervalId] = useState(null)
  
  // Estado para los dígitos del marchamo (dinámico según configuración)
  const [marchamos, setMarchamos] = useState({})
  
  const [formData, setFormData] = useState({
    nombre_conductor: traslado?.nombre_conductor || '',
    placa: traslado?.placa || '',
    remolque: traslado?.remolque || '',
    tipo_unidad: traslado?.tipo_unidad || 'plana',
    transporte: traslado?.transporte || '',
    fecha: traslado?.fecha || new Date().toISOString().split('T')[0],
    hora_inicio_carga: traslado?.hora_inicio_carga || '',
    hora_fin_carga: traslado?.hora_fin_carga || '',
    no_marchamo: traslado?.no_marchamo || '',
    tiene_cabaleo: traslado?.tiene_cabaleo || false,
    tiempo_cabaleo_minutos: traslado?.tiempo_cabaleo_minutos || 0,
    observaciones_cabaleo: traslado?.observaciones_cabaleo || ''
  })

  // Inicializar los dígitos del marchamo
  useEffect(() => {
    const initialMarchamos = {}
    for (let i = 1; i <= MARCHAMOS_CONFIG.cantidadCampos; i++) {
      initialMarchamos[`dig${i}`] = ''
    }
    
    if (formData.no_marchamo) {
      // Si el marchamo tiene formato de dígitos separados por |
      if (formData.no_marchamo.includes('|')) {
        const partes = formData.no_marchamo.split('|').filter(p => p.trim() !== '')
        for (let i = 1; i <= MARCHAMOS_CONFIG.cantidadCampos; i++) {
          if (partes[i-1]) {
            initialMarchamos[`dig${i}`] = partes[i-1].trim()
          }
        }
      }
    }
    
    setMarchamos(initialMarchamos)
  }, [])

  // Actualizar el campo no_marchamo cuando cambian los dígitos
  useEffect(() => {
    const marchamoCompleto = Object.values(marchamos).join('|')
    setFormData(prev => ({
      ...prev,
      no_marchamo: marchamoCompleto
    }))
  }, [marchamos])

  // Inicializar el selector de transporte
  useEffect(() => {
    if (formData.transporte) {
      if (TRANSPORTES_PREDEFINIDOS.includes(formData.transporte)) {
        setTransporteSeleccionado(formData.transporte)
        setMostrarOtroTransporte(false)
      } else {
        setTransporteSeleccionado('otro')
        setMostrarOtroTransporte(true)
        setOtroTransporte(formData.transporte)
      }
    }
  }, [])

  // Actualizar el campo transporte cuando cambia la selección
  useEffect(() => {
    if (transporteSeleccionado === 'otro') {
      setFormData(prev => ({ ...prev, transporte: otroTransporte }))
    } else {
      setFormData(prev => ({ ...prev, transporte: transporteSeleccionado }))
    }
  }, [transporteSeleccionado, otroTransporte])

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [intervalId])

  // Calcular duración cuando cambian las horas
  useEffect(() => {
    if (formData.hora_inicio_carga && formData.hora_fin_carga) {
      const inicio = dayjs(`2000-01-01 ${formData.hora_inicio_carga}`)
      const fin = dayjs(`2000-01-01 ${formData.hora_fin_carga}`)
      
      // Si la hora fin es menor, asumimos que pasó al día siguiente
      let diffMinutos = fin.diff(inicio, 'minute')
      if (diffMinutos < 0) {
        diffMinutos += 24 * 60 // Agregar 24 horas
      }
      
      const horas = Math.floor(diffMinutos / 60)
      const minutos = diffMinutos % 60
      setDuracionCalculada({ horas, minutos, total: diffMinutos })
    } else {
      setDuracionCalculada(null)
    }
  }, [formData.hora_inicio_carga, formData.hora_fin_carga])

  // Iniciar cronómetro
  const iniciarCronometro = () => {
    if (cronometroActivo) return
    
    setCronometroActivo(true)
    const id = setInterval(() => {
      setTiempoTranscurrido(prev => {
        const nuevoTiempo = prev + 1
        // Actualizar el tiempo en el formulario cada minuto
        if (nuevoTiempo % 60 === 0) {
          setFormData(prev => ({
            ...prev,
            tiempo_cabaleo_minutos: Math.floor(nuevoTiempo / 60)
          }))
        }
        return nuevoTiempo
      })
    }, 1000)
    setIntervalId(id)
  }

  // Pausar cronómetro
  const pausarCronometro = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
      setCronometroActivo(false)
    }
  }

  // Detener y reiniciar cronómetro
  const detenerCronometro = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
    setCronometroActivo(false)
    
    // Convertir segundos a minutos y actualizar formulario
    const minutosFinal = Math.floor(tiempoTranscurrido / 60)
    setFormData(prev => ({
      ...prev,
      tiempo_cabaleo_minutos: minutosFinal
    }))
    setTiempoTranscurrido(0)
  }

  // Resetear cronómetro
  const resetearCronometro = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
    setCronometroActivo(false)
    setTiempoTranscurrido(0)
    setFormData(prev => ({
      ...prev,
      tiempo_cabaleo_minutos: 0
    }))
  }

  // Formatear tiempo para mostrar
  const formatTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = segundos % 60
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  const tomarHoraActual = (campo) => {
    const ahora = new Date()
    const hora = ahora.getHours().toString().padStart(2, '0')
    const minutos = ahora.getMinutes().toString().padStart(2, '0')
    setFormData({ ...formData, [campo]: `${hora}:${minutos}` })
  }

  // Manejar cambio en los dígitos del marchamo
  const handleMarchamoChange = (digito, value) => {
    // Solo permitir números
    const soloNumeros = value.replace(/[^0-9]/g, '')
    
    // Obtener el índice del campo (1-based)
    const index = parseInt(digito.replace('dig', ''))
    const maxLength = MARCHAMOS_CONFIG.digitosPorCampo[index - 1] || 10
    
    if (soloNumeros.length <= maxLength) {
      setMarchamos(prev => ({
        ...prev,
        [digito]: soloNumeros
      }))

      // Auto-avanzar al siguiente campo si se alcanzó el máximo de caracteres
      if (soloNumeros.length === maxLength && index < MARCHAMOS_CONFIG.cantidadCampos) {
        const nextDigito = `dig${index + 1}`
        setTimeout(() => {
          document.getElementById(`marchamo-${nextDigito}`)?.focus()
        }, 10)
      }
    }
  }

  // Manejar tecla backspace para retroceder
  const handleMarchamoKeyDown = (e, digito) => {
    if (e.key === 'Backspace' && !e.target.value) {
      const index = parseInt(digito.replace('dig', ''))
      if (index > 1) {
        const prevDigito = `dig${index - 1}`
        document.getElementById(`marchamo-${prevDigito}`)?.focus()
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!operativoId) {
      toast.error('Debes seleccionar un operativo')
      return
    }

    // Validar que todos los dígitos del marchamo estén completos
    for (let i = 1; i <= MARCHAMOS_CONFIG.cantidadCampos; i++) {
      const digito = `dig${i}`
      const requiredLength = MARCHAMOS_CONFIG.digitosPorCampo[i-1]
      if (!marchamos[digito] || marchamos[digito].length < requiredLength) {
        toast.error(`El campo ${i} del marchamo debe tener ${requiredLength} dígitos`)
        return
      }
    }

    // Validar transporte
    if (transporteSeleccionado === 'otro' && !otroTransporte.trim()) {
      toast.error('Debes ingresar el nombre del transporte')
      return
    }
    if (!transporteSeleccionado) {
      toast.error('Debes seleccionar un transporte')
      return
    }

    // Asegurar que el tiempo de cabaleo esté actualizado
    if (cronometroActivo) {
      pausarCronometro()
      const minutosFinal = Math.floor(tiempoTranscurrido / 60)
      formData.tiempo_cabaleo_minutos = minutosFinal
    }

    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      // Validaciones
      if (!formData.nombre_conductor.trim()) throw new Error('Conductor requerido')
      if (!formData.placa.trim()) throw new Error('Placa requerida')
      if (!formData.remolque.trim()) throw new Error('Remolque requerido')
      if (!formData.hora_inicio_carga) throw new Error('Hora inicio requerida')
      if (!formData.hora_fin_carga) throw new Error('Hora fin requerida')

      let result

      if (traslado) {
        // Actualizar traslado existente
        result = await supabase
          .from('traslados')
          .update({
            ...formData,
            operativo_id: operativoId,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', traslado.id)
          .select()

        if (result.error) throw result.error
        toast.success('✅ Traslado actualizado')
      } else {
        // Crear nuevo traslado
        result = await supabase
          .from('traslados')
          .insert([{
            ...formData,
            operativo_id: operativoId,
            created_by: user.id
          }])
          .select()

        if (result.error) throw result.error
        toast.success(`✅ Traslado creado: ${result.data[0].correlativo_viaje}`)
      }

      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const duracionTotal = duracionCalculada?.total || 0
  const duracionConCabaleo = duracionTotal + (formData.tiempo_cabaleo_minutos || 0)

  // Generar los campos de marchamo dinámicamente
  const renderMarchamos = () => {
    const campos = []
    for (let i = 1; i <= MARCHAMOS_CONFIG.cantidadCampos; i++) {
      const digito = `dig${i}`
      const maxLength = MARCHAMOS_CONFIG.digitosPorCampo[i-1] || 10
      
      campos.push(
        <div key={i} className="flex-1 text-center">
          <input
            id={`marchamo-${digito}`}
            type="text"
            value={marchamos[digito] || ''}
            onChange={(e) => handleMarchamoChange(digito, e.target.value)}
            onKeyDown={(e) => handleMarchamoKeyDown(e, digito)}
            maxLength={maxLength}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
            placeholder={'0'.repeat(maxLength)}
            required
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            {maxLength} dígitos
          </span>
        </div>
      )
      
      // Agregar separador | entre campos (excepto después del último)
      if (i < MARCHAMOS_CONFIG.cantidadCampos) {
        campos.push(
          <span key={`sep-${i}`} className="text-2xl text-slate-600">|</span>
        )
      }
    }
    return campos
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 sticky top-0 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {traslado ? 'Editar Traslado' : 'Nuevo Traslado'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selector de Operativo */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-amber-500/20">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              Operativo <span className="text-red-400">*</span>
            </h4>
            <OperativoSelector 
              selectedId={operativoId}
              onSelect={setOperativoId}
            />
          </div>

          {/* Datos del traslado */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" />
              Datos del Traslado
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Conductor <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre_conductor}
                  onChange={(e) => setFormData({...formData, nombre_conductor: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Placa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ej: ABC-123"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Remolque <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.remolque}
                  onChange={(e) => setFormData({...formData, remolque: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ej: REM-123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Tipo Unidad <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.tipo_unidad}
                  onChange={(e) => setFormData({...formData, tipo_unidad: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                >
                  <option value="plana">Plana</option>
                  <option value="volteo">Volteo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Selector de Transporte con opción "Otro" */}
              <div className="col-span-2">
                <label className="block text-sm font-bold text-slate-400 mb-1">
                  Transporte <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={transporteSeleccionado}
                    onChange={(e) => {
                      const value = e.target.value
                      setTransporteSeleccionado(value)
                      setMostrarOtroTransporte(value === 'otro')
                      if (value !== 'otro') {
                        setOtroTransporte('')
                      }
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                    required={!mostrarOtroTransporte}
                  >
                    <option value="">Seleccionar transporte</option>
                    {TRANSPORTES_PREDEFINIDOS.map(trans => (
                      <option key={trans} value={trans}>{trans}</option>
                    ))}
                    <option value="otro">➕ Otro (especificar)</option>
                  </select>

                  {mostrarOtroTransporte && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={otroTransporte}
                        onChange={(e) => setOtroTransporte(e.target.value)}
                        placeholder="Nombre del transporte"
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Fecha <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>

            {/* Horas con botones de "Ahora" */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Hora Inicio <span className="text-red-400">*</span></span>
                  <button
                    type="button"
                    onClick={() => tomarHoraActual('hora_inicio_carga')}
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Ahora
                  </button>
                </label>
                <input
                  type="time"
                  value={formData.hora_inicio_carga}
                  onChange={(e) => setFormData({...formData, hora_inicio_carga: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>Hora Fin <span className="text-red-400">*</span></span>
                  <button
                    type="button"
                    onClick={() => tomarHoraActual('hora_fin_carga')}
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Ahora
                  </button>
                </label>
                <input
                  type="time"
                  value={formData.hora_fin_carga}
                  onChange={(e) => setFormData({...formData, hora_fin_carga: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
            </div>

            {/* Mostrar duración calculada */}
            {duracionCalculada && (
              <div className="mt-3 bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">Duración del viaje:</span>
                <span className="font-bold text-green-400">
                  {duracionCalculada.horas}h {duracionCalculada.minutos}m
                </span>
              </div>
            )}

            {/* Campo de Marchamos DINÁMICO - N dígitos por campo */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-400">
                  No. De Marchamos <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Settings className="w-3 h-3" />
                  <span>{MARCHAMOS_CONFIG.cantidadCampos} campos · {MARCHAMOS_CONFIG.digitosPorCampo.join('-')} dígitos</span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-between flex-wrap">
                {renderMarchamos()}
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                Ingresa los dígitos en cada campo (auto-avanza al completar)
              </p>
            </div>
          </div>

          {/* Sección de Cabaleo (reintento de vaciado) */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-bold flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-purple-400" />
                Cabaleo (Reintento de vaciado)
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarCabaleo}
                  onChange={(e) => {
                    setMostrarCabaleo(e.target.checked)
                    setFormData({...formData, tiene_cabaleo: e.target.checked})
                    if (!e.target.checked) {
                      // Si se desactiva, resetear el cronómetro
                      resetearCronometro()
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {mostrarCabaleo && (
              <div className="space-y-4">
                {/* TEMPORIZADOR EN VIVO */}
                <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/30">
                  <label className="block text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
                    <Clock3 className="w-4 h-4" />
                    Temporizador de Cabaleo
                  </label>
                  
                  {/* Display del tiempo */}
                  <div className="text-center mb-4">
                    <div className="text-4xl font-mono font-bold text-purple-400 bg-purple-950/50 rounded-lg py-3 px-4 inline-block mx-auto">
                      {formatTiempo(tiempoTranscurrido)}
                    </div>
                  </div>

                  {/* Controles del temporizador */}
                  <div className="flex gap-2 justify-center">
                    {!cronometroActivo ? (
                      <button
                        type="button"
                        onClick={iniciarCronometro}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all flex-1"
                      >
                        <Play className="w-5 h-5" />
                        Iniciar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pausarCronometro}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all flex-1"
                      >
                        <Pause className="w-5 h-5" />
                        Pausar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={detenerCronometro}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all flex-1"
                    >
                      <StopCircle className="w-5 h-5" />
                      Detener
                    </button>
                  </div>

                  {/* Minutos actuales */}
                  <div className="mt-3 text-center text-sm text-purple-300">
                    Total: {formData.tiempo_cabaleo_minutos} minutos
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-1">
                    Observaciones del cabaleo
                  </label>
                  <textarea
                    value={formData.observaciones_cabaleo}
                    onChange={(e) => setFormData({...formData, observaciones_cabaleo: e.target.value})}
                    rows="2"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Ej: Vació mal la primera vez, se devolvió a rehacer"
                  />
                </div>

                {/* Tiempo total con cabaleo */}
                {duracionCalculada && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-400">Tiempo total con cabaleo:</span>
                      <span className="font-bold text-purple-400 text-lg">
                        {Math.floor(duracionConCabaleo / 60)}h {duracionConCabaleo % 60}m
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                      <span>Viaje: {duracionCalculada.horas}h {duracionCalculada.minutos}m</span>
                      <span>+ Cabaleo: {formData.tiempo_cabaleo_minutos}m</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading || !operativoId}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Guardando...' : traslado ? 'Actualizar Traslado' : 'Crear Traslado'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}