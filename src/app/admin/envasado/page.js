'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin } from '../../lib/auth'
import {
  Package, ArrowLeft, RefreshCw, Calendar, Search,
  BarChart3, Clock, Users, TrendingUp, TrendingDown,
  AlertCircle, Download, Filter, Eye, ChevronLeft, ChevronRight,
  Hash, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

const secToHMS = (sec) => {
  if (!sec && sec !== 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Modal de detalle de un registro
const DetalleModal = ({ registro, onClose }) => {
  if (!registro) return null
  const rows = [
    ['No', `#${registro.numero_registro}`],
    ['Fecha', dayjs(registro.fecha).format('DD/MM/YYYY')],
    ['N° Orden', registro.numero_orden || '—'],
    ['Grupo Envasado', registro.grupo_envasado || '—'],
    ['Placa', registro.placa],
    ['Cliente', registro.cliente || '—'],
    ['Punto de Carga', registro.punto_carga || '—'],
    ['Producto', registro.producto || '—'],
    ['Cantidad Sacos', registro.cantidad_sacos?.toLocaleString() || '—'],
    ['Peso (TM)', registro.peso_toneladas ? Number(registro.peso_toneladas).toFixed(4) : '—'],
    ['Hora Llegada', registro.hora_llegada || '—'],
    ['Hora Inicio', registro.hora_inicio || '—'],
    ['Hora Final', registro.hora_final || '—'],
    ['Tiempo Total', secToHMS(registro.tiempo_total_seg)],
    ['Minutos Total', registro.minutos_total ? Number(registro.minutos_total).toFixed(2) + ' min' : '—'],
    ['Demora Inicio', secToHMS(registro.demora_inicio_seg)],
    ['Demora Durante', secToHMS(registro.demora_durante_seg)],
    ['Total Demoras', secToHMS(registro.total_demoras_seg)],
    ['Tiempo Efectivo', secToHMS(registro.tiempo_efectivo_seg)],
    ['Total Despacho', registro.total_despacho ? Number(registro.total_despacho).toFixed(4) : '—'],
    ['Sacos/Min', registro.sacos_por_minuto ? Number(registro.sacos_por_minuto).toFixed(4) : '—'],
    ['Rend. 3 Personas', registro.rendimiento_tres_personas ? Number(registro.rendimiento_tres_personas).toFixed(4) : '—'],
    ['Rend. Estándar', registro.rendimiento_estandar ? Number(registro.rendimiento_estandar).toFixed(4) : '—'],
    ['Diferencia Rend.', registro.diferencia_rendimiento !== null ? Number(registro.diferencia_rendimiento).toFixed(4) : '—'],
    ['Observaciones', registro.observaciones || '—'],
    ['Registrado por', registro.usuario ? `${registro.usuario.nombre} (@${registro.usuario.username})` : '—'],
    ['Creado', dayjs(registro.created_at).format('DD/MM/YYYY HH:mm:ss')],
  ]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Detalle — Registro #{registro.numero_registro}</h2>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg">
            <span className="text-white text-lg font-bold">×</span>
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-white/5 text-sm">
                <span className="text-slate-400 font-bold">{k}</span>
                <span className={`text-white text-right max-w-xs ${k === 'Diferencia Rend.' && v !== '—' ? (Number(v) >= 0 ? 'text-emerald-400' : 'text-red-400') : ''}`}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuditoriaEnvasadoPage() {
  const router = useRouter()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodoFiltro, setPeriodoFiltro] = useState(dayjs().format('YYYY-MM'))
  const [busqueda, setBusqueda] = useState('')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [detalleReg, setDetalleReg] = useState(null)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || !isAdmin()) { router.push('/admin'); return }
    cargarUsuarios()
    cargarRegistros()
  }, [periodoFiltro])

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, username')
      .eq('rol', 'envasador')
    setUsuarios(data || [])
  }

  const cargarRegistros = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bitacora_envasado')
        .select(`
          *,
          usuario:creado_por(id, nombre, username)
        `)
        .eq('periodo', periodoFiltro)
        .order('numero_registro', { ascending: true })

      if (error) throw error
      setRegistros(data || [])
    } catch (err) {
      toast.error('Error cargando registros')
    } finally {
      setLoading(false)
    }
  }

  const registrosFiltrados = registros.filter(r => {
    const term = busqueda.toLowerCase()
    const matchBusqueda = !busqueda || [r.placa, r.cliente, r.producto, r.numero_orden, r.grupo_envasado]
      .some(v => v?.toLowerCase().includes(term))
    const matchUsuario = !usuarioFiltro || r.creado_por === Number(usuarioFiltro)
    return matchBusqueda && matchUsuario
  })

  // KPIs
  const totalSacos = registrosFiltrados.reduce((s, r) => s + (r.cantidad_sacos || 0), 0)
  const totalTM = registrosFiltrados.reduce((s, r) => s + Number(r.peso_toneladas || 0), 0)
  const totalDemorasSeg = registrosFiltrados.reduce((s, r) => s + (r.total_demoras_seg || 0), 0)
  const totalEfectivoSeg = registrosFiltrados.reduce((s, r) => s + (r.tiempo_efectivo_seg || 0), 0)
  const promedioSacosPorMin = registrosFiltrados.filter(r => r.sacos_por_minuto).length > 0
    ? (registrosFiltrados.reduce((s, r) => s + Number(r.sacos_por_minuto || 0), 0) / registrosFiltrados.filter(r => r.sacos_por_minuto).length).toFixed(4)
    : '—'

  const handleExportar = () => {
    const csv = [
      ['No', 'Fecha', 'N° Orden', 'Grupo', 'Placa', 'Cliente', 'Punto Carga', 'Producto', 'Sacos', 'TM', 'H. Llegada', 'H. Inicio', 'H. Final', 'T. Total (seg)', 'Min Total', 'Dem. Inicio (seg)', 'Dem. Durante (seg)', 'Total Dem (seg)', 'T. Efectivo (seg)', 'Sacos/Min', 'Rend. 3P', 'Rend. Est.', 'Dif. Rend.', 'Registrado por'].join(','),
      ...registrosFiltrados.map(r => [
        r.numero_registro, r.fecha, r.numero_orden || '', r.grupo_envasado || '', r.placa, r.cliente || '',
        r.punto_carga || '', r.producto || '', r.cantidad_sacos || 0, r.peso_toneladas || 0,
        r.hora_llegada || '', r.hora_inicio || '', r.hora_final || '',
        r.tiempo_total_seg || 0, r.minutos_total || 0,
        r.demora_inicio_seg || 0, r.demora_durante_seg || 0, r.total_demoras_seg || 0,
        r.tiempo_efectivo_seg || 0, r.sacos_por_minuto || '',
        r.rendimiento_tres_personas || '', r.rendimiento_estandar || '', r.diferencia_rendimiento || '',
        r.usuario ? `${r.usuario.nombre}` : ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bitacora_envasado_${periodoFiltro}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado ✅')
  }

  // Navegación de periodo
  const periodoAnterior = () => setPeriodoFiltro(dayjs(periodoFiltro + '-01').subtract(1, 'month').format('YYYY-MM'))
  const periodoSiguiente = () => setPeriodoFiltro(dayjs(periodoFiltro + '-01').add(1, 'month').format('YYYY-MM'))

  const mesLabel = dayjs(periodoFiltro + '-01').locale('es').format('MMMM YYYY').toUpperCase()

  return (
    <div className="min-h-screen bg-[#050f1a] p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-400 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all">
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Package className="w-7 h-7" />
                  Auditoría — Bitácora de Envasado
                </h1>
                <p className="text-emerald-300 text-sm mt-0.5">
                  Monitoreo en tiempo real de operaciones registradas por envasadores
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={cargarRegistros} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4" />
                Recargar
              </button>
              <button onClick={handleExportar} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            {[
              { label: 'Registros', val: registrosFiltrados.length, color: 'text-white', icon: Hash },
              { label: 'Total Sacos', val: totalSacos.toLocaleString(), color: 'text-emerald-200', icon: Package },
              { label: 'Total TM', val: totalTM.toFixed(4), color: 'text-teal-200', icon: TrendingUp },
              { label: 'Total Demoras', val: secToHMS(totalDemorasSeg), color: 'text-orange-300', icon: AlertCircle },
              { label: 'Sac/Min Prom.', val: promedioSacosPorMin, color: 'text-purple-200', icon: BarChart3 },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-3.5 h-3.5 text-emerald-300" />
                  <p className="text-emerald-200 text-xs">{item.label}</p>
                </div>
                <p className={`text-xl font-black ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Navegación periodo */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-3 py-2 border border-white/10">
              <button onClick={periodoAnterior} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold text-sm min-w-[130px] text-center">{mesLabel}</span>
              <button onClick={periodoSiguiente} className="text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Input de periodo manual */}
            <input
              type="month"
              value={periodoFiltro}
              onChange={e => setPeriodoFiltro(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Búsqueda */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por placa, cliente, producto..."
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
              />
            </div>

            {/* Filtro por usuario */}
            <select
              value={usuarioFiltro}
              onChange={e => setUsuarioFiltro(e.target.value)}
              className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos los envasadores</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} (@{u.username})</option>
              ))}
            </select>

            {(busqueda || usuarioFiltro) && (
              <button
                onClick={() => { setBusqueda(''); setUsuarioFiltro('') }}
                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
              >
                <Filter className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-[#0a1628] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-5 py-3 border-b border-white/10">
            <h2 className="font-black text-white text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Registros en tiempo real
              <span className="text-slate-400 font-normal ml-1">({registrosFiltrados.length} de {registros.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-16 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-bold">Sin registros para el periodo/filtro seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-800 sticky top-0 z-10">
                  <tr>
                    {[
                      'No', 'Fecha', 'N° Orden', 'Grupo', 'Placa', 'Cliente',
                      'Pto. Carga', 'Producto', 'Sacos', 'TM',
                      'H. Llegada', 'H. Inicio', 'H. Final',
                      'T. Total', 'Min.', 'Dem. Ini.', 'Dem. Dur.', 'Tot. Dem.',
                      'T. Efectivo', 'Total Desp.', 'Sac/Min', 'Rend. 3P',
                      'Rend. Est.', 'Dif. Rend.', 'Registrado por', 'Det.'
                    ].map(h => (
                      <th key={h} className="px-2.5 py-2 text-left font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrosFiltrados.map(r => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-2.5 py-2.5 font-black text-emerald-400">#{r.numero_registro}</td>
                      <td className="px-2.5 py-2.5 text-slate-300 whitespace-nowrap">{dayjs(r.fecha).format('DD/MM/YY')}</td>
                      <td className="px-2.5 py-2.5 text-slate-300">{r.numero_orden || '—'}</td>
                      <td className="px-2.5 py-2.5 text-slate-300">{r.grupo_envasado || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-blue-400 font-bold">{r.placa}</td>
                      <td className="px-2.5 py-2.5 text-slate-300 max-w-[100px] truncate">{r.cliente || '—'}</td>
                      <td className="px-2.5 py-2.5 text-slate-300 max-w-[100px] truncate">{r.punto_carga || '—'}</td>
                      <td className="px-2.5 py-2.5 text-slate-300 max-w-[100px] truncate">{r.producto || '—'}</td>
                      <td className="px-2.5 py-2.5 font-bold text-white">{r.cantidad_sacos?.toLocaleString() || '—'}</td>
                      <td className="px-2.5 py-2.5 font-bold text-white">{r.peso_toneladas ? Number(r.peso_toneladas).toFixed(4) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-400">{r.hora_llegada || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-400">{r.hora_inicio || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-400">{r.hora_final || '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-blue-400">{secToHMS(r.tiempo_total_seg)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-300">{r.minutos_total ? Number(r.minutos_total).toFixed(1) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-orange-400">{secToHMS(r.demora_inicio_seg)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-orange-400">{secToHMS(r.demora_durante_seg)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-red-400 font-bold">{secToHMS(r.total_demoras_seg)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-emerald-400 font-bold">{secToHMS(r.tiempo_efectivo_seg)}</td>
                      <td className="px-2.5 py-2.5 font-mono text-white">{r.total_despacho ? Number(r.total_despacho).toFixed(4) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-white">{r.sacos_por_minuto ? Number(r.sacos_por_minuto).toFixed(4) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-purple-400">{r.rendimiento_tres_personas ? Number(r.rendimiento_tres_personas).toFixed(4) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono text-slate-300">{r.rendimiento_estandar ? Number(r.rendimiento_estandar).toFixed(4) : '—'}</td>
                      <td className="px-2.5 py-2.5 font-mono font-bold">
                        <span className={r.diferencia_rendimiento !== null ? (Number(r.diferencia_rendimiento) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}>
                          {r.diferencia_rendimiento !== null
                            ? (Number(r.diferencia_rendimiento) >= 0 ? '▲ ' : '▼ ') + Math.abs(Number(r.diferencia_rendimiento)).toFixed(4)
                            : '—'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div>
                          <p className="text-white font-bold">{r.usuario?.nombre || '—'}</p>
                          <p className="text-slate-500 text-xs">@{r.usuario?.username || '?'}</p>
                          <p className="text-slate-600 text-xs">{dayjs(r.created_at).format('DD/MM HH:mm')}</p>
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <button
                          onClick={() => setDetalleReg(r)}
                          className="p-1.5 hover:bg-emerald-500/20 rounded-lg"
                          title="Ver detalle completo"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales al final */}
                <tfoot className="bg-slate-800/80 border-t border-emerald-500/30">
                  <tr>
                    <td colSpan={8} className="px-2.5 py-2.5 font-black text-slate-400 text-xs uppercase">TOTALES / PROMEDIOS</td>
                    <td className="px-2.5 py-2.5 font-black text-white">{totalSacos.toLocaleString()}</td>
                    <td className="px-2.5 py-2.5 font-black text-white">{totalTM.toFixed(4)}</td>
                    <td colSpan={3}></td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-blue-400">
                      {secToHMS(registrosFiltrados.reduce((s, r) => s + (r.tiempo_total_seg || 0), 0))}
                    </td>
                    <td></td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-orange-400">
                      {secToHMS(registrosFiltrados.reduce((s, r) => s + (r.demora_inicio_seg || 0), 0))}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-orange-400">
                      {secToHMS(registrosFiltrados.reduce((s, r) => s + (r.demora_durante_seg || 0), 0))}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-red-400">
                      {secToHMS(totalDemorasSeg)}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-emerald-400">
                      {secToHMS(totalEfectivoSeg)}
                    </td>
                    <td colSpan={2}></td>
                    <td className="px-2.5 py-2.5 font-mono font-black text-slate-300">
                      Prom: {promedioSacosPorMin}
                    </td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {detalleReg && (
        <DetalleModal registro={detalleReg} onClose={() => setDetalleReg(null)} />
      )}
    </div>
  )
}