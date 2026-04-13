//app/chequero/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isChequero, logout } from '../lib/auth'
import { 
  Ship, Clock, LogOut, Search, 
  Calendar, ChevronRight, Sun, Moon,
  RefreshCw
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
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }
  return { theme, toggleTheme: toggle }
}

export default function ChequeroDashboard() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const dk = theme === 'dark'

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }
    if (!isChequero()) { toast.error('Acceso no autorizado'); router.push('/'); return }
    setUser(currentUser)
    cargarBarcos()
  }, [router])

  const cargarBarcos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('barcos').select('*').eq('estado', 'activo')
        .order('created_at', { ascending: false })
      if (error) throw error

      const barcosConStats = await Promise.all((data || []).map(async (barco) => {
        const hoy = dayjs().format('YYYY-MM-DD')
        const { count: atrasosHoy } = await supabase
          .from('registro_atrasos').select('*', { count: 'exact', head: true })
          .eq('barco_id', barco.id).eq('fecha', hoy)
        return { ...barco, atrasos_hoy: atrasosHoy || 0 }
      }))
      setBarcos(barcosConStats)
    } catch (error) {
      console.error('Error cargando barcos:', error)
      toast.error('Error al cargar barcos')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => { logout(); router.push('/') }

  const barcosFiltrados = barcos.filter(barco => {
    if (filtroEstado !== 'todos' && barco.tipo_operacion !== filtroEstado) return false
    if (searchTerm && !barco.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const bg       = dk ? 'bg-[#0a0f1e]'       : 'bg-slate-50'
  const card     = dk ? 'bg-slate-900/80'     : 'bg-white'
  const border   = dk ? 'border-white/[0.08]' : 'border-slate-200'
  const text     = dk ? 'text-white'          : 'text-slate-900'
  const sub      = dk ? 'text-slate-400'      : 'text-slate-500'
  const inputBg  = dk ? 'bg-slate-800/80 border-white/[0.08]' : 'bg-slate-100 border-slate-200'

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>

      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-5">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 p-2 sm:p-3 rounded-xl">
                <Ship className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-black text-white leading-tight">
                  Panel de Chequero
                </h1>
                <p className="text-blue-200 text-xs sm:text-sm">
                  Bienvenido, <span className="font-bold">{user?.nombre}</span>
                  <span className="hidden sm:inline"> · {dayjs().format('dddd, DD/MM/YYYY')}</span>
                  <span className="sm:hidden"> · {dayjs().format('ddd DD/MM')}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={cargarBarcos} title="Actualizar"
                className="bg-white/10 hover:bg-white/20 active:bg-white/25 p-2 rounded-xl transition-colors">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <button onClick={toggleTheme}
                className="bg-white/10 hover:bg-white/20 active:bg-white/25 p-2 rounded-xl transition-colors">
                {dk ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
              </button>
              <button onClick={handleLogout}
                className="bg-red-500/25 hover:bg-red-500/35 text-white px-3 sm:px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Salir</span>
              </button>
            </div>
          </div>

          {/* Stats — 3 cols mobile, 4 cols sm+ */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: Ship,     label: 'Barcos activos', value: barcos.length,                                   color: 'text-blue-200'   },
              { icon: Clock,    label: 'Atrasos hoy',    value: barcos.reduce((s, b) => s + b.atrasos_hoy, 0),   color: 'text-orange-300' },
              { icon: Calendar, label: 'Tu turno',       value: dayjs().format('ddd D/M'),                       color: 'text-purple-300' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white/10 rounded-xl px-3 py-3 sm:py-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${color}`} />
                <div>
                  <p className="text-white font-bold text-lg sm:text-2xl leading-none">{value}</p>
                  <p className="text-blue-200/80 text-[10px] sm:text-xs leading-tight mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── BODY ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6 pb-12">

        {/* ── BARCOS ── */}
        <div className={`${card} border ${border} rounded-2xl overflow-hidden`}>

          {/* Section header */}
          <div className={`px-4 sm:px-6 py-4 border-b ${border} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <h2 className={`font-bold ${text} flex items-center gap-2 text-sm sm:text-base`}>
              <Clock className="w-5 h-5 text-orange-500" />
              Barcos para Registrar Atrasos
              <span className={`text-xs font-normal ${sub} ml-1`}>({barcosFiltrados.length} activos)</span>
            </h2>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none sm:w-56">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${sub}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar barco..."
                  className={`w-full ${inputBg} border rounded-xl pl-9 pr-3 py-2 ${text} text-sm outline-none focus:ring-2 focus:ring-blue-500/40`}
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className={`${inputBg} border rounded-xl px-3 py-2 ${text} text-sm outline-none shrink-0`}
              >
                <option value="todos">Todos</option>
                <option value="importacion">Importación</option>
                <option value="exportacion">Exportación</option>
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-14">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-3" />
                <p className={`${sub} text-sm`}>Cargando barcos...</p>
              </div>
            ) : barcosFiltrados.length === 0 ? (
              <div className="text-center py-14">
                <Ship className={`w-14 h-14 mx-auto mb-3 ${dk ? 'text-slate-700' : 'text-slate-300'}`} />
                <p className={`font-bold ${text} mb-1`}>No hay barcos activos</p>
                <p className={`text-sm ${sub}`}>Espera a que se asigne un barco para comenzar</p>
              </div>
            ) : (
              /* 1 col mobile · 2 col md · 3 col lg */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {barcosFiltrados.map(barco => {
                  const isExport = barco.tipo_operacion === 'exportacion'
                  const opColor  = isExport ? 'blue' : 'green'

                  return (
                    <Link
                      key={barco.id}
                      href={`/registroatrasos?barco=${barco.id}`}
                      className={`${card} border ${border} rounded-xl transition-all group
                        hover:shadow-lg active:scale-[0.98] hover:border-orange-500/50
                        block
                      `}
                    >
                      {/* ── Mobile row ── */}
                      <div className="sm:hidden flex items-center gap-3 p-3">
                        <div className={`p-2 rounded-xl shrink-0 ${dk ? `bg-${opColor}-500/20` : `bg-${opColor}-100`}`}>
                          <Ship className={`w-5 h-5 ${dk ? `text-${opColor}-400` : `text-${opColor}-600`}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black ${text} text-sm truncate`}>{barco.nombre}</p>
                          {barco.codigo_barco && (
                            <p className={`text-xs font-mono ${sub}`}>{barco.codigo_barco}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs flex items-center gap-1 ${barco.atrasos_hoy > 0 ? 'text-orange-500' : sub}`}>
                              <Clock className="w-3 h-3" />{barco.atrasos_hoy}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isExport
                              ? dk ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                              : dk ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          }`}>
                            {isExport ? 'EXP' : 'IMP'}
                          </span>
                          <ChevronRight className={`w-4 h-4 ${sub}`} />
                        </div>
                      </div>

                      {/* ── Desktop card ── */}
                      <div className="hidden sm:block p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg ${dk ? `bg-${opColor}-500/20` : `bg-${opColor}-100`}`}>
                            <Ship className={`w-5 h-5 ${dk ? `text-${opColor}-400` : `text-${opColor}-600`}`} />
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            isExport
                              ? dk ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                              : dk ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                          }`}>
                            {isExport ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
                          </span>
                        </div>

                        <h3 className={`font-bold ${text} text-lg mb-0.5 group-hover:text-orange-500 transition-colors`}>
                          {barco.nombre}
                        </h3>
                        {barco.codigo_barco && (
                          <p className={`text-xs font-mono ${sub} mb-3`}>{barco.codigo_barco}</p>
                        )}

                        <div className={`pt-3 border-t ${border}`}>
                          <div>
                            <p className={`text-xs ${sub}`}>Atrasos hoy</p>
                            <p className={`text-sm font-bold ${barco.atrasos_hoy > 0 ? 'text-orange-500' : sub}`}>
                              {barco.atrasos_hoy}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <ChevronRight className={`w-5 h-5 ${sub} group-hover:text-orange-500 transition-colors`} />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}