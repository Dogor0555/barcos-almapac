'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { getCurrentUser, isAdmin } from '../../../lib/auth'
import { 
  Package, Ship, ArrowLeft, Plus, Clock, 
  Truck, Weight, AlertCircle, CheckCircle, X,
  Edit2, Trash2, RefreshCw, BarChart3,
  Sun, Moon, Search, Grid, Layers, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
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

// ─── InputField ─────────
const InputField = ({ label, lblClass, children, className = '' }) => (
  <div className={className}>
    <label className={`block text-xs ${lblClass} mb-1`}>{label}</label>
    {children}
  </div>
)

// ─── MODAL ──────────────────────────────────────────────────────────────────
const RegistroSacosModal = ({ barco, bodegas, registro, onClose, onSuccess, theme }) => {
  const [loading, setLoading] = useState(false)
  const [viajeNumero, setViajeNumero] = useState(1)
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

  useEffect(() => {
    if (registro) {
      setFormData({
        bodega: registro.bodega || '',
        fecha: registro.fecha || dayjs().format('YYYY-MM-DD'),
        nota_remision: registro.nota_remision || '',
        placa_camion: registro.placa_camion || '',
        placa_remolque: registro.placa_remolque || '',
        peso_ingenio_kg: registro.peso_ingenio_kg || '',
        peso_saco_kg: registro.peso_saco_kg || 50,
        cantidad_paquetes: registro.cantidad_paquetes || '',
        paquetes_danados: registro.paquetes_danados || '0',
        hora_inicio: registro.hora_inicio || dayjs().format('HH:mm'),
        hora_fin: registro.hora_fin || '',
        observaciones: registro.observaciones || ''
      })
    } else {
      setFormData({
        bodega: bodegas.length > 0 ? bodegas[0].nombre : '',
        fecha: dayjs().format('YYYY-MM-DD'),
        nota_remision: '',
        placa_camion: '',
        placa_remolque: '',
        peso_ingenio_kg: '',
        peso_saco_kg: 50,
        cantidad_paquetes: '',
        paquetes_danados: '0',
        hora_inicio: dayjs().format('HH:mm'),
        hora_fin: '',
        observaciones: ''
      })
      cargarUltimoViaje()
    }
  }, [registro, barco, bodegas])

  const cargarUltimoViaje = async () => {
    try {
      const { data } = await supabase
        .from('registros_sacos').select('viaje_numero')
        .eq('barco_id', barco.id)
        .order('viaje_numero', { ascending: false }).limit(1)
      if (data && data.length > 0) setViajeNumero(data[0].viaje_numero + 1)
    } catch (e) { console.error(e) }
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
      if (!formData.placa_camion?.trim())                               { toast.error('Placa obligatoria'); setLoading(false); return }
      if (!formData.cantidad_paquetes || formData.cantidad_paquetes <= 0) { toast.error('Cantidad inválida');  setLoading(false); return }
      if (!formData.peso_saco_kg || formData.peso_saco_kg <= 0)          { toast.error('Peso del saco inválido'); setLoading(false); return }

      const pesoTotalCalculado = (parseFloat(formData.peso_saco_kg) * parseInt(formData.cantidad_paquetes)) / 1000
      const pesoTotalCalculadoKg = parseFloat(formData.peso_saco_kg) * parseInt(formData.cantidad_paquetes)

      const datos = {
        barco_id: barco.id,
        viaje_numero: registro?.viaje_numero || viajeNumero,
        bodega: formData.bodega,
        fecha: formData.fecha,
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
        peso_total_calculado_tm: pesoTotalCalculado,
        peso_total_calculado_kg: pesoTotalCalculadoKg,
        created_by: user.id
      }

      let error
      if (registro) {
        ({ error } = await supabase.from('registros_sacos').update(datos).eq('id', registro.id))
      } else {
        ({ error } = await supabase.from('registros_sacos').insert([datos]))
      }
      if (error) throw error

      toast.success(registro ? 'Registro actualizado' : `Viaje #${viajeNumero} registrado`)
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className={`${bgM} border ${bdM} rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[93vh] sm:max-h-[90vh] overflow-y-auto`}>

        {/* Modal header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 sm:px-6 py-4 sticky top-0 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl z-10">
          <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">{registro ? 'Editar Registro' : `Nuevo Registro · Viaje #${viajeNumero}`}</span>
            <span className="sm:hidden">{registro ? 'Editar' : `Viaje #${viajeNumero}`}</span>
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">

          {/* Bodega + Fecha */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <InputField label="Fecha" lblClass={lblM}>
              <input 
                type="date" 
                name="fecha"
                value={formData.fecha} 
                onChange={handleChange} 
                className={inputClass} 
                required 
              />
            </InputField>
          </div>

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
            <button type="submit" disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base">
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {registro ? 'Actualizar' : 'Registrar Viaje'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}
              className={`flex-1 ${dk ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-200 hover:bg-gray-300'} ${txtM} font-bold py-3 px-4 rounded-xl text-sm sm:text-base transition-colors`}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── COMPONENTE DE TABLA DE VIAJES POR BODEGA ────────────────────────────
const TablaViajesBodega = ({ bodega, registros, onEdit, onDelete, theme, sub, text, dk, onClose }) => {
  return (
    <div className={`${dk ? 'bg-slate-800/50' : 'bg-gray-50'} rounded-xl border ${dk ? 'border-white/10' : 'border-gray-200'} overflow-hidden`}>
      <div className={`px-4 py-3 ${dk ? 'bg-slate-800' : 'bg-gray-100'} border-b ${dk ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-green-500" />
          <h3 className={`font-semibold ${text}`}>
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
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Hora</th>
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
                    <td className="px-3 py-2 text-xs text-slate-400">{reg.hora_inicio}</td>
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
  const [filtroFecha, setFiltroFecha] = useState(dayjs().format('YYYY-MM-DD'))
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
      
      // Si la bodega seleccionada ya no tiene registros, cerrarla
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
              <div key={label} className="bg-white/10 rounded-xl px-3 py-3 sm:py-4">
                <p className="text-green-200 text-[10px] sm:text-xs">{label}</p>
                <p className="text-white font-bold text-lg sm:text-2xl leading-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-10">

        {/* Cards de Resumen por Bodega */}
        {statsPorBodega.length > 0 && (
          <div className="space-y-3">
            <h2 className={`font-bold ${text} flex items-center gap-2 text-base sm:text-lg`}>
              <Layers className="w-5 h-5 text-green-500" />
              Resumen por Bodega
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statsPorBodega.map((bodega, index) => {
                const porcentajeDanados = bodega.totalSacos > 0 
                  ? ((bodega.totalDanados / bodega.totalSacos) * 100).toFixed(1)
                  : 0

                return (
                  <div key={index} 
                    onClick={() => setBodegaSeleccionada(
                      bodegaSeleccionada === bodega.bodega ? null : bodega.bodega
                    )}
                    className={`${card} border ${border} rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      bodegaSeleccionada === bodega.bodega ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <h3 className={`font-bold ${text}`}>{bodega.bodega}</h3>
                          <p className={`text-xs ${sub}`}>{bodega.viajes} viaje{bodega.viajes !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${sub} transition-transform ${
                        bodegaSeleccionada === bodega.bodega ? 'rotate-90' : ''
                      }`} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className={`text-xs ${sub}`}>Sacos</p>
                        <p className={`font-bold ${text}`}>{bodega.totalSacos.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs ${sub}`}>Dañados</p>
                        <p className={`font-bold ${
                          bodega.totalDanados > 0 ? 'text-red-400' : text
                        }`}>{bodega.totalDanados}</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs ${sub}`}>TM</p>
                        <p className="font-bold text-green-500">{bodega.totalTM.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Barra de progreso simple */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className={sub}>Buenos: {((bodega.totalSacos - bodega.totalDanados) / bodega.totalSacos * 100).toFixed(0)}%</span>
                        <span className={sub}>Dañados: {porcentajeDanados}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ 
                            width: bodega.totalSacos > 0 
                              ? `${((bodega.totalSacos - bodega.totalDanados) / bodega.totalSacos) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors sm:w-auto w-full text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Nuevo Registro
            </button>

            <div className="flex gap-2">
              <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
                className={`${inputBg} border ${border} rounded-xl px-3 py-2 ${text} text-sm outline-none focus:ring-2 focus:ring-green-500/40 flex-1 sm:flex-none`} />
              <div className="relative flex-1 sm:flex-none sm:w-44">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
                <input type="text" value={searchPlaca} onChange={e => setSearchPlaca(e.target.value)}
                  placeholder="Buscar placa..."
                  className={`w-full ${inputBg} border ${border} rounded-xl pl-9 pr-3 py-2 ${text} text-sm outline-none focus:ring-2 focus:ring-green-500/40`} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla general */}
        <div className={`${card} border ${border} rounded-2xl overflow-hidden`}>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className={dk ? 'bg-slate-800' : 'bg-gray-100'}>
                <tr>
                  {['# Viaje','Bodega','Fecha','Placa','Peso Ing.','Sacos','Dañados','Total TM','Horario',''].map(h => (
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
                      <td className={`px-4 py-3 text-xs ${sub}`}>{reg.hora_inicio} – {reg.hora_fin}</td>
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

          {/* Vista móvil */}
          <div className="sm:hidden">
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

        {/* Resumen del día */}
        <div className={`${card} border ${border} rounded-2xl p-4 sm:p-5`}>
          <h3 className={`font-bold ${text} mb-3 flex items-center gap-2 text-sm sm:text-base`}>
            <BarChart3 className="w-4 h-4 text-green-500" />
            Resumen del {dayjs(filtroFecha).format('DD/MM/YYYY')}
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: 'Viajes hoy',    value: registrosFiltrados.length,                                                                    color: text },
              { label: 'Sacos hoy',     value: registrosFiltrados.reduce((s,r) => s + r.cantidad_paquetes, 0).toLocaleString(),               color: text },
              { label: 'Toneladas hoy', value: `${registrosFiltrados.reduce((s,r) => s + (r.peso_total_calculado_tm||0), 0).toFixed(3)} TM`,  color: 'text-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
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
    </div>
  )
}