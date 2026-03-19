'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'
import { 
  X, Truck, User, Hash, Calendar, Clock, Save, FolderOpen,
  Clock3, RotateCw, AlertCircle, Plus, Minus, Play, Pause, StopCircle,
  Building2, PlusCircle, CreditCard
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
  
  // Estado para los 5 dígitos del marchamo (primero de 4, los demás de 2)
  const [marchamos, setMarchamos] = useState({
    dig1: '',
    dig2: '',
    dig3: '',
    dig4: '',
    dig5: ''
  })
  
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

  // Inicializar los dígitos del marchamo si existe un valor
  useEffect(() => {
    if (formData.no_marchamo) {
      // Si el marchamo tiene formato de dígitos separados por |
      if (formData.no_marchamo.includes('|')) {
        const partes = formData.no_marchamo.split('|').filter(p => p.trim() !== '')
        if (partes.length === 5) {
          setMarchamos({
            dig1: partes[0].trim(),
            dig2: partes[1].trim(),
            dig3: partes[2].trim(),
            dig4: partes[3].trim(),
            dig5: partes[4].trim()
          })
        }
      }
    }
  }, [])

  // Actualizar el campo no_marchamo cuando cambian los dígitos
  useEffect(() => {
    const marchamoCompleto = `${marchamos.dig1}|${marchamos.dig2}|${marchamos.dig3}|${marchamos.dig4}|${marchamos.dig5}`
    setFormData(prev => ({
      ...prev,
      no_marchamo: marchamoCompleto
    }))
  }, [marchamos])

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
    
    // El primer dígito acepta máximo 4 caracteres, los demás 2
    const maxLength = digito === 'dig1' ? 4 : 2
    
    if (soloNumeros.length <= maxLength) {
      setMarchamos(prev => ({
        ...prev,
        [digito]: soloNumeros
      }))

      // Auto-avanzar al siguiente campo si se alcanzó el máximo de caracteres
      if (soloNumeros.length === maxLength) {
        const nextDigito = {
          dig1: 'dig2',
          dig2: 'dig3',
          dig3: 'dig4',
          dig4: 'dig5'
        }[digito]
        
        if (nextDigito) {
          setTimeout(() => {
            document.getElementById(`marchamo-${nextDigito}`)?.focus()
          }, 10)
        }
      }
    }
  }

  // Manejar tecla backspace para retroceder
  const handleMarchamoKeyDown = (e, digito) => {
    if (e.key === 'Backspace' && !e.target.value) {
      const prevDigito = {
        dig2: 'dig1',
        dig3: 'dig2',
        dig4: 'dig3',
        dig5: 'dig4'
      }[digito]
      
      if (prevDigito) {
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
    if (!marchamos.dig1 || marchamos.dig1.length < 4) {
      toast.error('El primer campo del marchamo debe tener 4 dígitos')
      return
    }
    if (!marchamos.dig2 || marchamos.dig2.length < 2) {
      toast.error('El segundo campo del marchamo debe tener 2 dígitos')
      return
    }
    if (!marchamos.dig3 || marchamos.dig3.length < 2) {
      toast.error('El tercer campo del marchamo debe tener 2 dígitos')
      return
    }
    if (!marchamos.dig4 || marchamos.dig4.length < 2) {
      toast.error('El cuarto campo del marchamo debe tener 2 dígitos')
      return
    }
    if (!marchamos.dig5 || marchamos.dig5.length < 2) {
      toast.error('El quinto campo del marchamo debe tener 2 dígitos')
      return
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

            {/* Campo de Marchamos en formato de 5 dígitos (primero de 4, resto de 2) */}
            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-400 mb-3">
                No. De Marchamos <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2 justify-between">
                <div className="flex-[2] text-center">
                  <input
                    id="marchamo-dig1"
                    type="text"
                    value={marchamos.dig1}
                    onChange={(e) => handleMarchamoChange('dig1', e.target.value)}
                    onKeyDown={(e) => handleMarchamoKeyDown(e, 'dig1')}
                    maxLength="4"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="9018"
                    required
                  />
                </div>
                <span className="text-2xl text-slate-600">|</span>
                <div className="flex-1 text-center">
                  <input
                    id="marchamo-dig2"
                    type="text"
                    value={marchamos.dig2}
                    onChange={(e) => handleMarchamoChange('dig2', e.target.value)}
                    onKeyDown={(e) => handleMarchamoKeyDown(e, 'dig2')}
                    maxLength="2"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="89"
                    required
                  />
                </div>
                <span className="text-2xl text-slate-600">|</span>
                <div className="flex-1 text-center">
                  <input
                    id="marchamo-dig3"
                    type="text"
                    value={marchamos.dig3}
                    onChange={(e) => handleMarchamoChange('dig3', e.target.value)}
                    onKeyDown={(e) => handleMarchamoKeyDown(e, 'dig3')}
                    maxLength="2"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="90"
                    required
                  />
                </div>
                <span className="text-2xl text-slate-600">|</span>
                <div className="flex-1 text-center">
                  <input
                    id="marchamo-dig4"
                    type="text"
                    value={marchamos.dig4}
                    onChange={(e) => handleMarchamoChange('dig4', e.target.value)}
                    onKeyDown={(e) => handleMarchamoKeyDown(e, 'dig4')}
                    maxLength="2"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="91"
                    required
                  />
                </div>
                <span className="text-2xl text-slate-600">|</span>
                <div className="flex-1 text-center">
                  <input
                    id="marchamo-dig5"
                    type="text"
                    value={marchamos.dig5}
                    onChange={(e) => handleMarchamoChange('dig5', e.target.value)}
                    onKeyDown={(e) => handleMarchamoKeyDown(e, 'dig5')}
                    maxLength="2"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-3 text-white text-center text-xl font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="92"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Primer campo: 4 dígitos · Campos siguientes: 2 dígitos cada uno (auto-avanza)
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