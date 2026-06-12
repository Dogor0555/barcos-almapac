// src/app/compartido/yeso/[token]/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts'
import { FiSearch } from 'react-icons/fi'

import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import * as XLSX from 'xlsx-js-style'

// Importación de iconos de react-icons
import { 
  FiRefreshCw, FiDownload, FiX, FiTruck, FiBarChart2, FiHome, 
  FiMapPin, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiClock,
  FiCalendar, FiUsers, FiAnchor, FiShield, FiArrowDown, FiArrowUp,
  FiChevronDown, FiChevronUp, FiActivity, FiDatabase, FiGift, FiStar,
  FiSearch as FiSearchIcon, FiFilter, FiChevronLeft, FiChevronRight,
  FiGrid, FiList
} from 'react-icons/fi'
import { 
  FaWeightHanging, FaIndustry, FaBuilding, FaTachometerAlt,
  FaTrailer, FaMountain, FaChartPie, FaChartLine, FaDatabase,
  FaClipboardList, FaFileExcel, FaWarehouse, FaShip, FaCubes,
  FaRegGem, FaRegClock, FaMedal, FaCalendarAlt, FaHourglassHalf
} from 'react-icons/fa'
import { GiCoalWagon, GiWeightScale, GiMinerals, GiCargoShip, GiCrane, GiDiamonds } from 'react-icons/gi'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('es')

const ZONA_HORARIA_SV = "America/El_Salvador"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Rangos por tipo de unidad
const RANGOS = {
  VOLQUETA: { min: 14, max: 18 },
  TRAILETA: { min: 22, max: 26 }
}

// 🎨 PALETA DE COLORES
const COLOR_AZUL_PRINCIPAL = "#0000A3"
const COLOR_AZUL_MARINO = "#182A6E"
const COLOR_AZUL_CLARO = "#2A3D7A"
const COLOR_AZUL_SUAVE = "#E8EAF3"
const COLOR_VERDE_GRIS = "#82907F"
const COLOR_BLANCO = "#FFFFFF"
const COLOR_NARANJA = "#FD7304"
const COLOR_ROJO = "#DC2626"
const COLOR_GRIS_FONDO = "#F5F5F5"
const COLOR_TEXTO_PRIMARIO = "#1A1A1A"
const COLOR_TEXTO_SECUNDARIO = "#6B7280"
const COLOR_BORDE = "#E5E5E5"

// Paleta para gráficos
const COLORES_GRAFICOS = [COLOR_AZUL_PRINCIPAL, COLOR_AZUL_MARINO, COLOR_VERDE_GRIS, COLOR_NARANJA, "#3B82F6", "#6B7280"]

// ✅ Función formateadora con 3 decimales
const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000"
  const valor = Number(tm).toFixed(d)
  const partes = valor.split(".")
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return partes.join(".")
}

// 🔥 FUNCIÓN PARA CARGAR TODOS LOS REGISTROS
const CARGAR_TODOS_LOS_REGISTROS = async (tabla, filtro, valor) => {
  let todosLosRegistros = []
  let desde = 0
  const limite = 1000
  let hayMas = true

  while (hayMas) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq(filtro, valor)
      .order('correlativo', { ascending: true })
      .range(desde, desde + limite - 1)

    if (error) {
      console.error('Error cargando página:', error)
      break
    }

    if (data && data.length > 0) {
      todosLosRegistros = [...todosLosRegistros, ...data]
      desde += limite
      hayMas = data.length === limite
    } else {
      hayMas = false
    }
  }

  console.log(`📦 Cargados ${todosLosRegistros.length} registros de ${tabla}`)
  return todosLosRegistros
}

const getEstadoPeso = (pesoNeto, tipoUnidad) => {
  if (!pesoNeto || !tipoUnidad) return null
  const tipo = tipoUnidad.toUpperCase()
  const rango = RANGOS[tipo]
  if (!rango) return null
  
  if (pesoNeto < rango.min) return 'bajo'
  if (pesoNeto > rango.max) return 'sobre'
  return 'ok'
}

const getColorPorEstado = (estado) => {
  if (estado === 'bajo') return COLOR_NARANJA
  if (estado === 'sobre') return COLOR_ROJO
  return COLOR_AZUL_MARINO
}

const estaFueraDeRango = (pesoNeto, tipoUnidad) => {
  if (!pesoNeto || !tipoUnidad) return false
  const tipo = tipoUnidad.toUpperCase()
  const rango = RANGOS[tipo]
  if (!rango) return false
  return pesoNeto < rango.min || pesoNeto > rango.max
}

const normalizarRegistro = (reg, index, registrosAnteriores, destinosMap) => {
  let acumulado = 0
  if (registrosAnteriores) {
    const anteriores = registrosAnteriores.filter(r => r.correlativo < reg.correlativo)
    acumulado = anteriores.reduce((sum, r) => sum + (Number(r.peso_neto) || 0), 0)
    acumulado += (Number(reg.peso_neto) || 0)
  }
  
  const destinoInfo = destinosMap?.get(reg.destino_id) || null
  
  return {
    id: reg.id,
    correlativo: reg.correlativo,
    placa: reg.placa,
    transporte: reg.transporte || 'DESCONOCIDO',
    tipo_unidad: reg.tipo_unidad || 'VOLQUETA',
    fecha: reg.fecha_entrada || dayjs().format('YYYY-MM-DD'),
    hora_entrada: reg.hora_entrada,
    hora_salida: reg.hora_salida,
    tiempo_atencion: reg.tiempo_atencion,
    destino_id: reg.destino_id,
    destino_info: destinoInfo,
    bodega_barco: reg.bodega_barco,
    peso_bruto_updp_tm: Number(reg.peso_bruto) || 0,
    peso_neto_updp_tm: Number(reg.peso_neto) || 0,
    acumulado_updp_tm: acumulado,
    estado: reg.estado || 'COMPLETADO',
    fechaHoraOrden: `${reg.fecha_entrada || ''} ${reg.hora_entrada || ''}`
  }
}

function useYesoData(token, transporteFiltro = null, diaFiltro = null, destinoFiltro = null) {
  const [data, setData] = useState({
    barco: null,
    producto: null,
    registros: [],
    destinos: [],
    loading: true,
    error: null,
    lastUpdate: null
  })

  const cargar = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      const { data: barcoData, error: barcoError } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (barcoError || !barcoData) throw new Error('Barco no encontrado')

      const { data: productoData, error: productoError } = await supabase
        .from('productos')
        .select('*')
        .eq('codigo', 'YE-001')
        .single()

      if (productoError || !productoData) throw new Error('Producto YESO no encontrado')

      const { data: destinosData, error: destinosError } = await supabase
        .from('destinos')
        .select('*')
        .eq('activo', true)

      if (destinosError) throw destinosError
      
      const destinosMap = new Map()
      destinosData?.forEach(d => destinosMap.set(d.id, d))

      const registrosRaw = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', 'barco_id', barcoData.id)

      const completados = (registrosRaw || []).filter(r => r.estado === 'COMPLETADO')
      
      let registrosNormalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados, destinosMap))

      if (transporteFiltro) {
        registrosNormalizados = registrosNormalizados.filter(r => r.transporte === transporteFiltro)
      }

      if (diaFiltro) {
        registrosNormalizados = registrosNormalizados.filter(r => r.fecha === diaFiltro)
      }

      if (destinoFiltro) {
        registrosNormalizados = registrosNormalizados.filter(r => r.destino_id === destinoFiltro)
      }

      setData({
        barco: barcoData,
        producto: productoData,
        registros: registrosNormalizados,
        destinos: destinosData || [],
        loading: false,
        error: null,
        lastUpdate: dayjs().tz(ZONA_HORARIA_SV)
      })
    } catch (error) {
      console.error('Error:', error)
      setData(prev => ({ ...prev, loading: false, error: error.message }))
    }
  }

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 30000)
    return () => clearInterval(interval)
  }, [token, transporteFiltro, diaFiltro, destinoFiltro])

  return { ...data, refetch: cargar }
}

// ============================================
// FUNCIÓN PARA CALCULAR ESTADÍSTICAS
// ============================================
const calcularEstadisticas = (registros) => {
    if (!registros.length) return {
        totalNeto: 0, totalBruto: 0, totalViajes: 0,
        porTransporte: {}, porDia: {}, porDestino: {},
        acumuladoPorCorrelativo: [], unidadesFueraDeRango: [],
        totalPorDestino: {}, pesoPromedio: 0, porcentajeDentroRango: 0,
        bajoPeso: 0, sobrePeso: 0
    };

    const totalNeto = registros.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0);
    const totalBruto = registros.reduce((s, r) => s + (r.peso_bruto_updp_tm || 0), 0);
    const totalViajes = registros.length;
    const pesoPromedio = totalNeto / totalViajes;

    const porTransporte = {};
    registros.forEach(r => {
        const t = r.transporte || 'DESCONOCIDO';
        porTransporte[t] = (porTransporte[t] || 0) + (r.peso_neto_updp_tm || 0);
    });

    const porDia = {};
    registros.forEach(r => { porDia[r.fecha] = (porDia[r.fecha] || 0) + (r.peso_neto_updp_tm || 0); });

    const porDestino = {};
    const totalPorDestino = {};
    registros.forEach(r => {
        const destinoNombre = r.destino_info ? `${r.destino_info.codigo} - ${r.destino_info.nombre}` : 'SIN DESTINO';
        porDestino[destinoNombre] = (porDestino[destinoNombre] || 0) + (r.peso_neto_updp_tm || 0);
        if (r.destino_info) {
            const tipo = r.destino_info.tipo;
            totalPorDestino[tipo] = (totalPorDestino[tipo] || 0) + (r.peso_neto_updp_tm || 0);
        }
    });

    const unidadesFueraDeRango = registros.filter(r => estaFueraDeRango(r.peso_neto_updp_tm, r.tipo_unidad));
    const bajoPeso = registros.filter(r => getEstadoPeso(r.peso_neto_updp_tm, r.tipo_unidad) === 'bajo').length;
    const sobrePeso = registros.filter(r => getEstadoPeso(r.peso_neto_updp_tm, r.tipo_unidad) === 'sobre').length;
    const porcentajeDentroRango = totalViajes > 0 ? ((totalViajes - unidadesFueraDeRango.length) / totalViajes) * 100 : 0;

    const acumuladoPorCorrelativo = [...registros]
        .sort((a, b) => a.correlativo - b.correlativo)
        .map((r, idx, arr) => {
            let acum = 0;
            for (let i = 0; i <= idx; i++) {
                acum += arr[i].peso_neto_updp_tm || 0;
            }
            return {
                correlativo: r.correlativo,
                peso: r.peso_neto_updp_tm,
                acumulado: acum,
                estado: getEstadoPeso(r.peso_neto_updp_tm, r.tipo_unidad),
                tipoUnidad: r.tipo_unidad
            };
        });

    return {
        totalNeto, totalBruto, totalViajes, porTransporte, porDia, porDestino,
        acumuladoPorCorrelativo, unidadesFueraDeRango, totalPorDestino,
        pesoPromedio, porcentajeDentroRango, bajoPeso, sobrePeso
    };
};

// 🔥 COMPONENTES DE FILTROS
const DateRangePicker = ({ startDate, endDate, onStartChange, onEndChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [tempStart, setTempStart] = useState(startDate)
  const [tempEnd, setTempEnd] = useState(endDate)
  const [hoverDate, setHoverDate] = useState(null)

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

  const getDaysInMonth = (date) => {
    const startOfMonth = date.startOf('month')
    const endOfMonth = date.endOf('month')
    const startDay = startOfMonth.day()
    const days = []
    
    for (let i = startDay; i > 0; i--) {
      const prevDate = startOfMonth.subtract(i, 'day')
      days.push({ date: prevDate, isCurrentMonth: false, isSelected: false, isInRange: false, isStart: false, isEnd: false })
    }
    
    for (let i = 0; i < endOfMonth.date(); i++) {
      const currentDate = startOfMonth.add(i, 'day')
      days.push({ date: currentDate, isCurrentMonth: true, isSelected: false, isInRange: false, isStart: false, isEnd: false })
    }
    
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = endOfMonth.add(i, 'day')
      days.push({ date: nextDate, isCurrentMonth: false, isSelected: false, isInRange: false, isStart: false, isEnd: false })
    }
    
    return days
  }

  const updateDayStyles = (days, start, end, hover) => {
    if (!start && !end) return days
    return days.map(day => {
      const dateStr = day.date.format('YYYY-MM-DD')
      const isStart = start === dateStr
      const isEnd = end === dateStr
      let isInRange = false
      if (start && end) isInRange = day.date.isAfter(dayjs(start)) && day.date.isBefore(dayjs(end))
      else if (start && hover && !end) isInRange = day.date.isAfter(dayjs(start)) && day.date.isBefore(dayjs(hover))
      return { ...day, isSelected: isStart || isEnd, isStart, isEnd, isInRange }
    })
  }

  const days = updateDayStyles(getDaysInMonth(currentMonth), tempStart, tempEnd, hoverDate)

  const handleDateClick = (date) => {
    const dateStr = date.format('YYYY-MM-DD')
    if (!tempStart || (tempStart && tempEnd)) { setTempStart(dateStr); setTempEnd(null) }
    else { if (dayjs(dateStr).isBefore(tempStart)) { setTempEnd(tempStart); setTempStart(dateStr) } else { setTempEnd(dateStr) } }
  }

  const handleMouseEnter = (date) => { if (tempStart && !tempEnd) setHoverDate(date.format('YYYY-MM-DD')) }
  const handleApply = () => { if (tempStart && tempEnd) { onStartChange(tempStart); onEndChange(tempEnd) } else if (tempStart && !tempEnd) { onStartChange(tempStart); onEndChange(tempStart) }; setIsOpen(false) }
  const handleClear = () => { setTempStart(null); setTempEnd(null); setHoverDate(null); onStartChange(''); onEndChange(''); if (onClear) onClear(); setIsOpen(false) }
  const formatDisplayDate = (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'Seleccionar'

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ background: COLOR_BLANCO, border: `1px solid ${startDate || endDate ? COLOR_NARANJA : COLOR_BORDE}`, borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <FiCalendar size={14} style={{ color: COLOR_AZUL_PRINCIPAL }} />
          <span>{startDate ? formatDisplayDate(startDate) : 'Desde'}</span>
          <span>—</span>
          <span>{endDate ? formatDisplayDate(endDate) : 'Hasta'}</span>
        </div>
        <FiChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </div>
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999, background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '20px', padding: '20px', width: '320px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))} style={{ background: COLOR_AZUL_SUAVE, border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: COLOR_AZUL_PRINCIPAL }}><FiChevronLeft size={16} /></button>
              <div style={{ fontWeight: '600' }}>{months[currentMonth.month()]} {currentMonth.year()}</div>
              <button onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))} style={{ background: COLOR_AZUL_SUAVE, border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: COLOR_AZUL_PRINCIPAL }}><FiChevronRight size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
              {weekDays.map(day => <div key={day} style={{ textAlign: 'center', fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, fontWeight: '600', padding: '8px 0' }}>{day}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
              {days.map((day, idx) => (
                <div key={idx} onClick={() => handleDateClick(day.date)} onMouseEnter={() => handleMouseEnter(day.date)} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: day.isStart || day.isEnd ? COLOR_NARANJA : day.isInRange ? COLOR_AZUL_SUAVE : 'transparent', color: !day.isCurrentMonth ? COLOR_TEXTO_SECUNDARIO : day.isStart || day.isEnd ? COLOR_BLANCO : COLOR_TEXTO_PRIMARIO, fontWeight: day.isStart || day.isEnd ? '600' : '400' }}>{day.date.date()}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleClear} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', background: '#FEF2F2', border: '1px solid #FECACA', color: COLOR_ROJO, cursor: 'pointer' }}>Limpiar</button>
              <button onClick={handleApply} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', background: COLOR_AZUL_PRINCIPAL, border: 'none', color: COLOR_BLANCO, cursor: 'pointer', fontWeight: '600' }}>Aplicar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const TimeRangePicker = ({ startTime, endTime, onStartChange, onEndChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false)
  const formatTime = (time) => time || '--:--'

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ background: COLOR_BLANCO, border: `1px solid ${startTime || endTime ? COLOR_NARANJA : COLOR_BORDE}`, borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: '200px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <FiClock size={14} style={{ color: COLOR_AZUL_PRINCIPAL }} />
          <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
        </div>
        <FiChevronDown size={14} />
      </div>
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 999, background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '16px', padding: '16px', width: '260px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '6px' }}>Desde</div>
              <input type="time" step="1800" value={startTime || ''} onChange={(e) => onStartChange(e.target.value)} style={{ width: '100%', padding: '8px', border: `1px solid ${COLOR_BORDE}`, borderRadius: '8px', color: COLOR_AZUL_PRINCIPAL }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '6px' }}>Hasta</div>
              <input type="time" step="1800" value={endTime || ''} onChange={(e) => onEndChange(e.target.value)} style={{ width: '100%', padding: '8px', border: `1px solid ${COLOR_BORDE}`, borderRadius: '8px', color: COLOR_NARANJA }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { onStartChange(''); onEndChange(''); onClear?.(); setIsOpen(false) }} style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px', background: '#FEF2F2', border: '1px solid #FECACA', color: COLOR_ROJO, cursor: 'pointer' }}>Limpiar</button>
              <button onClick={() => setIsOpen(false)} style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px', background: COLOR_AZUL_PRINCIPAL, border: 'none', color: COLOR_BLANCO, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function ClientPage({ token }) {
  const [transporteSeleccionado, setTransporteSeleccionado] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null)
  const [todosLosRegistros, setTodosLosRegistros] = useState([])
  const [ordenTabla, setOrdenTabla] = useState('correlativo_desc')
  const [seccionActiva, setSeccionActiva] = useState('resumen')
  
  const [busquedaTabla, setBusquedaTabla] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroHoraInicio, setFiltroHoraInicio] = useState('')
  const [filtroHoraFin, setFiltroHoraFin] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const { barco, producto, registros, destinos, loading, error, lastUpdate, refetch } = useYesoData(
    token, transporteSeleccionado, diaSeleccionado, destinoSeleccionado
  )

  const registrosConFiltrosTabla = useMemo(() => {
    if (!registros.length) return []
    let filtrados = [...registros]
    if (busquedaTabla.trim()) { const busqueda = busquedaTabla.trim().toLowerCase(); filtrados = filtrados.filter(r => r.placa?.toLowerCase().includes(busqueda) || r.correlativo?.toString().includes(busqueda)) }
    if (filtroFechaInicio) filtrados = filtrados.filter(r => r.fecha >= filtroFechaInicio)
    if (filtroFechaFin) filtrados = filtrados.filter(r => r.fecha <= filtroFechaFin)
    if (filtroHoraInicio) filtrados = filtrados.filter(r => r.hora_entrada && r.hora_entrada >= filtroHoraInicio)
    if (filtroHoraFin) filtrados = filtrados.filter(r => r.hora_entrada && r.hora_entrada <= filtroHoraFin)
    return filtrados
  }, [registros, busquedaTabla, filtroFechaInicio, filtroFechaFin, filtroHoraInicio, filtroHoraFin])

  const estadisticas = useMemo(() => calcularEstadisticas(registrosConFiltrosTabla), [registrosConFiltrosTabla]);

  const flujoPorHora = useMemo(() => {
    if (!registrosConFiltrosTabla.length) return []
    const flujoMap = new Map()
    registrosConFiltrosTabla.forEach(reg => {
      let horaKey = '', horaMostrar = ''
      if (reg.hora_entrada) { const horaPart = reg.hora_entrada.split(':')[0]; horaKey = `${reg.fecha} ${horaPart}:00`; horaMostrar = `${horaPart}:00` }
      else if (reg.fecha) { horaKey = reg.fecha; horaMostrar = reg.fecha }
      else return
      if (!flujoMap.has(horaKey)) flujoMap.set(horaKey, { hora: horaMostrar, horaCompleta: horaKey, viajes: 0, totalTM: 0, promedio: 0, viajesFueraRango: 0 })
      const horaData = flujoMap.get(horaKey)
      horaData.viajes++
      horaData.totalTM += reg.peso_neto_updp_tm || 0
      if (estaFueraDeRango(reg.peso_neto_updp_tm, reg.tipo_unidad)) horaData.viajesFueraRango++
    })
    let flujoArray = Array.from(flujoMap.values()).map(item => ({ ...item, promedio: item.viajes > 0 ? item.totalTM / item.viajes : 0 }))
    flujoArray.sort((a, b) => a.horaCompleta.localeCompare(b.horaCompleta))
    let acumulado = 0
    flujoArray = flujoArray.map(item => { acumulado += item.totalTM; return { ...item, acumulado } })
    return flujoArray
  }, [registrosConFiltrosTabla])

  const flujoPromedioPorHora = useMemo(() => {
    if (registrosConFiltrosTabla.length === 0) return 0
    let horaMin = null, horaMax = null
    registrosConFiltrosTabla.forEach(reg => {
      if (reg.hora_entrada) {
        const horaDate = dayjs(`${reg.fecha} ${reg.hora_entrada}`)
        if (horaDate.isValid()) {
          if (!horaMin || horaDate.isBefore(horaMin)) horaMin = horaDate
          if (!horaMax || horaDate.isAfter(horaMax)) horaMax = horaDate
        }
      }
    })
    if (!horaMin || !horaMax) return 0
    const horasTranscurridas = horaMax.diff(horaMin, 'minutes') / 60
    if (horasTranscurridas <= 0) return estadisticas.totalNeto
    return estadisticas.totalNeto / horasTranscurridas
  }, [registrosConFiltrosTabla, estadisticas.totalNeto])

  const meta = barco?.metas_json?.limites?.['YE-001'] || 0
  const faltante = Math.max(0, meta - estadisticas.totalNeto)
  const excedente = Math.max(0, estadisticas.totalNeto - meta)
  const porcentajeMeta = meta > 0 ? (estadisticas.totalNeto / meta) * 100 : 0
  const tieneExcedente = excedente > 0

  const registrosOrdenados = useMemo(() => {
    if (!registrosConFiltrosTabla.length) return []
    const registrosConFecha = registrosConFiltrosTabla.map(reg => ({ ...reg, fechaHoraValue: dayjs(`${reg.fecha} ${reg.hora_entrada || '00:00:00'}`) }))
    switch(ordenTabla) {
      case 'correlativo_asc': return [...registrosConFecha].sort((a, b) => a.correlativo - b.correlativo)
      case 'correlativo_desc': return [...registrosConFecha].sort((a, b) => b.correlativo - a.correlativo)
      case 'fecha_asc': return [...registrosConFecha].sort((a, b) => a.fechaHoraValue.isValid() && b.fechaHoraValue.isValid() ? a.fechaHoraValue.valueOf() - b.fechaHoraValue.valueOf() : a.correlativo - b.correlativo)
      case 'fecha_desc': return [...registrosConFecha].sort((a, b) => b.fechaHoraValue.isValid() && a.fechaHoraValue.isValid() ? b.fechaHoraValue.valueOf() - a.fechaHoraValue.valueOf() : b.correlativo - a.correlativo)
      default: return [...registrosConFecha].sort((a, b) => b.correlativo - a.correlativo)
    }
  }, [registrosConFiltrosTabla, ordenTabla])

  useEffect(() => {
    const cargarTodosRegistros = async () => {
      try {
        const { data: barcoData } = await supabase.from('barcos').select('id').eq('token_compartido', token).single()
        if (barcoData) {
          const { data: destinosData } = await supabase.from('destinos').select('*').eq('activo', true)
          const destinosMap = new Map()
          destinosData?.forEach(d => destinosMap.set(d.id, d))
          const registrosGlobales = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', 'barco_id', barcoData.id)
          if (registrosGlobales) {
            const completados = registrosGlobales.filter(r => r.estado === 'COMPLETADO')
            const normalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados, destinosMap))
            setTodosLosRegistros(normalizados)
          }
        }
      } catch (error) { console.error('Error cargando todos los registros:', error) }
    }
    cargarTodosRegistros()
  }, [token])

  const descargarExcel = () => {
  if (!registros.length) {
    alert('No hay datos para exportar')
    return
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS DE ESTILO
  // ─────────────────────────────────────────────────────────────
  const S = {
    header: (align = 'center') => ({
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FF6600' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center', wrapText: false },
      border: {
        top: { style: 'thin', color: { rgb: 'CC4400' } },
        bottom: { style: 'thin', color: { rgb: 'CC4400' } },
        left: { style: 'thin', color: { rgb: 'CC4400' } },
        right: { style: 'thin', color: { rgb: 'CC4400' } },
      }
    }),
    data: (align = 'left', bold = false) => ({
      font: { bold, color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    total: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFFF00' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '999900' } },
        bottom: { style: 'medium', color: { rgb: '999900' } },
        left: { style: 'thin', color: { rgb: '999900' } },
        right: { style: 'thin', color: { rgb: '999900' } },
      }
    }),
    transportTitle: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 12, name: 'Calibri' },
      fill: { fgColor: { rgb: 'ADD8E6' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '4A90C4' } },
        bottom: { style: 'medium', color: { rgb: '4A90C4' } },
        left: { style: 'medium', color: { rgb: '4A90C4' } },
        right: { style: 'medium', color: { rgb: '4A90C4' } },
      }
    }),
    subtypeTitle: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'BDD7EE' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '4A90C4' } },
        bottom: { style: 'thin', color: { rgb: '4A90C4' } },
        left: { style: 'thin', color: { rgb: '4A90C4' } },
        right: { style: 'thin', color: { rgb: '4A90C4' } },
      }
    }),
    colHeader: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'D9D9D9' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '999999' } },
        bottom: { style: 'thin', color: { rgb: '999999' } },
        left: { style: 'thin', color: { rgb: '999999' } },
        right: { style: 'thin', color: { rgb: '999999' } },
      }
    }),
    empty: () => ({
      fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' }
    }),
    separator: () => ({
      fill: { fgColor: { rgb: 'F2F2F2' }, patternType: 'solid' }
    }),
    bajoPeso: () => ({
      font: { bold: true, color: { rgb: '7D5100' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    sobrePeso: () => ({
      font: { bold: true, color: { rgb: '9C0006' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFCCCC' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    enRango: () => ({
      font: { bold: false, color: { rgb: '276221' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'E2EFDA' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
  }

  const C = (v, style) => ({ v, s: style, t: typeof v === 'number' ? 'n' : 's' })
  const writeRow = (ws, rowIdx, cols, cells) => {
    cells.forEach((cell, c) => {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c })
      ws[addr] = cell
    })
    if (!ws['!ref']) {
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: cols - 1 } })
    } else {
      const cur = XLSX.utils.decode_range(ws['!ref'])
      cur.e.r = Math.max(cur.e.r, rowIdx)
      cur.e.c = Math.max(cur.e.c, cols - 1)
      ws['!ref'] = XLSX.utils.encode_range(cur)
    }
  }

  const wb = XLSX.utils.book_new()

  // ─────────────────────────────────────────────────────────────
  // CALCULAR DATOS PARA RESUMEN_TRANSPORTES
  // ─────────────────────────────────────────────────────────────
  const resumenTransporte = promediosPorTransporte.map(emp => ({
    'TRANSPORTE': emp.nombre,
    'TOTAL VIAJES': emp.totalViajes,
    'TOTAL (TM)': emp.totalNeto.toFixed(3),
    'VIAJES TRAILETA': emp.viajesTraileta,
    'TRAILETA TOTAL (TM)': emp.totalTraileta.toFixed(3),
    'PROMEDIO TRAILETA (TM)': emp.promedioTraileta ? emp.promedioTraileta.toFixed(3) : 'N/A',
    'VIAJES VOLQUETA': emp.viajesVolqueta,
    'VOLQUETA TOTAL (TM)': emp.totalVolqueta.toFixed(3),
    'PROMEDIO VOLQUETA (TM)': emp.promedioVolqueta ? emp.promedioVolqueta.toFixed(3) : 'N/A',
    'FUERA DE RANGO': emp.fueraRango,
    '% OK': ((emp.totalViajes - emp.fueraRango) / emp.totalViajes * 100).toFixed(1) + '%'
  }))

  // ─────────────────────────────────────────────────────────────
  // CALCULAR DATOS PARA RESUMEN_POR_PLACA
  // ─────────────────────────────────────────────────────────────
  const resumenPlacaMap = {}
  registros.forEach(reg => {
    const placa = reg.placa || 'SIN PLACA'
    if (!resumenPlacaMap[placa]) {
      resumenPlacaMap[placa] = {
        PLACA: placa,
        TRANSPORTE: reg.transporte || 'DESCONOCIDO',
        TIPO_UNIDAD: reg.tipo_unidad || 'VOLQUETA',
        VIAJES: 0,
        TOTAL_TM: 0,
        MIN_TM: Infinity,
        MAX_TM: -Infinity,
        FUERA_RANGO: 0
      }
    }
    const item = resumenPlacaMap[placa]
    const peso = reg.peso_neto_updp_tm || 0
    item.VIAJES++
    item.TOTAL_TM += peso
    item.MIN_TM = Math.min(item.MIN_TM, peso)
    item.MAX_TM = Math.max(item.MAX_TM, peso)
    if (estaFueraDeRango(peso, reg.tipo_unidad)) {
      item.FUERA_RANGO++
    }
  })

  const resumenPlaca = Object.values(resumenPlacaMap).map(item => ({
    ...item,
    PROMEDIO_TM: (item.TOTAL_TM / item.VIAJES).toFixed(3),
    MIN_TM: item.MIN_TM === Infinity ? 0 : item.MIN_TM.toFixed(3),
    MAX_TM: item.MAX_TM === -Infinity ? 0 : item.MAX_TM.toFixed(3)
  }))

  // ─────────────────────────────────────────────────────────────
  // HOJA 1: RESUMEN_POR_UNIDAD
  // ─────────────────────────────────────────────────────────────
  const porTransporte = {}
  registros.forEach(reg => {
    const t = reg.transporte || 'DESCONOCIDO'
    const tipo = (reg.tipo_unidad || 'VOLQUETA').toUpperCase()
    const placa = reg.placa || 'SIN PLACA'
    const peso = reg.peso_neto_updp_tm || 0

    if (!porTransporte[t]) porTransporte[t] = { TRAILETA: {}, VOLQUETA: {} }
    const bucket = tipo === 'TRAILETA' ? porTransporte[t].TRAILETA : porTransporte[t].VOLQUETA
    if (!bucket[placa]) bucket[placa] = { viajes: 0, toneladas: 0 }
    bucket[placa].viajes++
    bucket[placa].toneladas += peso
  })

  const COLS_UNIDAD = 3
  const ws1 = { '!ref': 'A1:C1', '!cols': [{ wch: 18 }, { wch: 10 }, { wch: 16 }], '!rows': [] }
  let row = 0

  Object.entries(porTransporte)
    .sort((a, b) => {
      const sumA = Object.values(a[1].TRAILETA).reduce((s, v) => s + v.toneladas, 0) + Object.values(a[1].VOLQUETA).reduce((s, v) => s + v.toneladas, 0)
      const sumB = Object.values(b[1].TRAILETA).reduce((s, v) => s + v.toneladas, 0) + Object.values(b[1].VOLQUETA).reduce((s, v) => s + v.toneladas, 0)
      return sumB - sumA
    })
    .forEach(([transporteName, tipos]) => {
      const trailetas = Object.entries(tipos.TRAILETA).sort((a, b) => b[1].toneladas - a[1].toneladas)
      const volquetas = Object.entries(tipos.VOLQUETA).sort((a, b) => b[1].toneladas - a[1].toneladas)
      const totalTraiVj = trailetas.reduce((s, [, v]) => s + v.viajes, 0)
      const totalTraiTm = trailetas.reduce((s, [, v]) => s + v.toneladas, 0)
      const totalVolvj = volquetas.reduce((s, [, v]) => s + v.viajes, 0)
      const totalVolTm = volquetas.reduce((s, [, v]) => s + v.toneladas, 0)
      const totalVj = totalTraiVj + totalVolvj
      const totalTm = totalTraiTm + totalVolTm

      ws1['!rows'][row] = { hpt: 22 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C(transporteName, S.transportTitle('center')),
        C('', S.transportTitle('center')),
        C('', S.transportTitle('center')),
      ])
      row++

      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TRAILETAS', S.subtypeTitle()),
        C('', S.subtypeTitle()),
        C('', S.subtypeTitle()),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C('UNIDAD', S.colHeader('left')),
        C('VIAJES', S.colHeader('center')),
        C('TONELADAS', S.colHeader('center')),
      ])
      row++

      if (trailetas.length === 0) {
        writeRow(ws1, row, COLS_UNIDAD, [
          C('Sin registros', S.data('center')),
          C('', S.data('center')),
          C('', S.data('center')),
        ])
        row++
      } else {
        trailetas.forEach(([placa, v]) => {
          writeRow(ws1, row, COLS_UNIDAD, [
            C(placa, S.data('left')),
            C(v.viajes, S.data('center')),
            C(v.toneladas.toFixed(3), S.data('right')),
          ])
          row++
        })
      }

      ws1['!rows'][row] = { hpt: 20 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL', S.total('left')),
        C(totalTraiVj, S.total('center')),
        C(totalTraiTm.toFixed(3), S.total('right')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [C('', S.separator()), C('', S.separator()), C('', S.separator())])
      row++

      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('VOLQUETAS', S.subtypeTitle()),
        C('', S.subtypeTitle()),
        C('', S.subtypeTitle()),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C('UNIDAD', S.colHeader('left')),
        C('VIAJES', S.colHeader('center')),
        C('TONELADAS', S.colHeader('center')),
      ])
      row++

      if (volquetas.length === 0) {
        writeRow(ws1, row, COLS_UNIDAD, [
          C('Sin registros', S.data('center')),
          C('', S.data('center')),
          C('', S.data('center')),
        ])
        row++
      } else {
        volquetas.forEach(([placa, v]) => {
          writeRow(ws1, row, COLS_UNIDAD, [
            C(placa, S.data('left')),
            C(v.viajes, S.data('center')),
            C(v.toneladas.toFixed(3), S.data('right')),
          ])
          row++
        })
      }

      ws1['!rows'][row] = { hpt: 20 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL', S.total('left')),
        C(totalVolvj, S.total('center')),
        C(totalVolTm.toFixed(3), S.total('right')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [C('', S.separator()), C('', S.separator()), C('', S.separator())])
      row++

      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL VOLQUETAS Y TRAILETAS', S.transportTitle('center')),
        C('', S.transportTitle('center')),
        C('', S.transportTitle('center')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C('VIAJES', S.colHeader('center')),
        C('TONELADAS (TM)', S.colHeader('center')),
        C('', S.colHeader('center')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C(totalVj, S.data('center')),
        C(totalTm.toFixed(3), S.data('right')),
        C('', S.data('center')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [C('', S.empty()), C('', S.empty()), C('', S.empty())])
      row++
      writeRow(ws1, row, COLS_UNIDAD, [C('', S.empty()), C('', S.empty()), C('', S.empty())])
      row++
    })

  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: COLS_UNIDAD - 1 } })
  XLSX.utils.book_append_sheet(wb, ws1, 'RESUMEN_POR_UNIDAD')

  // ─────────────────────────────────────────────────────────────
  // HOJA 2: RESUMEN_TRANSPORTES
  // ─────────────────────────────────────────────────────────────
  const wsTransporte = XLSX.utils.json_to_sheet(resumenTransporte)
  wsTransporte['!cols'] = [
    { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 10 }
  ]
  const range = XLSX.utils.decode_range(wsTransporte['!ref'])
  for (let C_ = range.s.c; C_ <= range.e.c; ++C_) {
    const ca = XLSX.utils.encode_cell({ r: range.s.r, c: C_ })
    if (wsTransporte[ca]) wsTransporte[ca].s = S.header()
  }
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C_ = range.s.c; C_ <= range.e.c; ++C_) {
      const ca = XLSX.utils.encode_cell({ r: R, c: C_ })
      if (wsTransporte[ca]) wsTransporte[ca].s = S.data('left')
    }
  }
  XLSX.utils.book_append_sheet(wb, wsTransporte, 'RESUMEN_TRANSPORTES')

  // ─────────────────────────────────────────────────────────────
  // HOJA 3: RESUMEN_POR_PLACA
  // ─────────────────────────────────────────────────────────────
  const wsPlaca = XLSX.utils.json_to_sheet(resumenPlaca)
  wsPlaca['!cols'] = [
    { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }
  ]
  const rangePlaca = XLSX.utils.decode_range(wsPlaca['!ref'])
  for (let C_ = rangePlaca.s.c; C_ <= rangePlaca.e.c; ++C_) {
    const ca = XLSX.utils.encode_cell({ r: rangePlaca.s.r, c: C_ })
    if (wsPlaca[ca]) wsPlaca[ca].s = S.header()
  }
  for (let R = rangePlaca.s.r + 1; R <= rangePlaca.e.r; ++R) {
    for (let C_ = rangePlaca.s.c; C_ <= rangePlaca.e.c; ++C_) {
      const ca = XLSX.utils.encode_cell({ r: R, c: C_ })
      if (wsPlaca[ca]) wsPlaca[ca].s = S.data('left')
    }
  }
  XLSX.utils.book_append_sheet(wb, wsPlaca, 'RESUMEN_POR_PLACA')

  // ─────────────────────────────────────────────────────────────
  // HOJA 4: RESUMEN_GENERAL
  // ─────────────────────────────────────────────────────────────
  const filtrosActivos = []
  if (transporteSeleccionado) filtrosActivos.push(`Transporte: ${transporteSeleccionado}`)
  if (diaSeleccionado) filtrosActivos.push(`Dia: ${diaSeleccionado}`)
  if (destinoSeleccionado) {
    const destinoNombre = destinos.find(d => d.id === destinoSeleccionado)?.nombre || destinoSeleccionado
    filtrosActivos.push(`Destino: ${destinoNombre}`)
  }
  const filtroTexto = filtrosActivos.length ? filtrosActivos.join(' · ') : 'Todos los datos'

  const resumenData = [
    { 'METRICA': 'BARCO', 'VALOR': barco?.nombre || 'N/A' },
    { 'METRICA': 'CODIGO BARCO', 'VALOR': barco?.codigo_barco || 'N/A' },
    { 'METRICA': 'TOTAL DESCARGADO (TM)', 'VALOR': fmtTM(estadisticas.totalNeto, 3) },
    { 'METRICA': 'TOTAL VIAJES', 'VALOR': estadisticas.totalViajes },
    { 'METRICA': 'PROMEDIO POR VIAJE (TM)', 'VALOR': fmtTM(estadisticas.pesoPromedio, 3) },
    { 'METRICA': 'VIAJES EN RANGO', 'VALOR': `${estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} (${estadisticas.porcentajeDentroRango.toFixed(1)}%)` },
    { 'METRICA': 'VIAJES BAJO PESO', 'VALOR': estadisticas.bajoPeso },
    { 'METRICA': 'VIAJES SOBREPESO', 'VALOR': estadisticas.sobrePeso },
    { 'METRICA': 'TOTAL POR DESTINO (TM)', 'VALOR': Object.entries(estadisticas.porDestino).map(([k,v]) => `${k}: ${fmtTM(v, 3)}`).join(' · ') || '0' },
    { 'METRICA': 'META MANIFESTADA (TM)', 'VALOR': fmtTM(meta, 3) },
    { 'METRICA': 'FALTANTE (TM)', 'VALOR': fmtTM(faltante, 3) },
    { 'METRICA': 'EXCEDENTE (TM)', 'VALOR': fmtTM(excedente, 3) },
    { 'METRICA': 'PORCENTAJE DE META', 'VALOR': `${porcentajeMeta.toFixed(1)}%` },
    { 'METRICA': 'RITMO DE DESCARGA (TM/h)', 'VALOR': fmtTM(flujoPromedioPorHora, 1) },
    { 'METRICA': 'FILTRO APLICADO', 'VALOR': filtroTexto },
    { 'METRICA': 'FECHA EXPORTACION', 'VALOR': dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD HH:mm:ss') },
  ]
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 45 }]
  const rangeResumen = XLSX.utils.decode_range(wsResumen['!ref'])
  for (let C_ = rangeResumen.s.c; C_ <= rangeResumen.e.c; ++C_) {
    const ca = XLSX.utils.encode_cell({ r: rangeResumen.s.r, c: C_ })
    if (wsResumen[ca]) wsResumen[ca].s = S.header()
  }
  for (let R = rangeResumen.s.r + 1; R <= rangeResumen.e.r; ++R) {
    for (let C_ = rangeResumen.s.c; C_ <= rangeResumen.e.c; ++C_) {
      const ca = XLSX.utils.encode_cell({ r: R, c: C_ })
      if (wsResumen[ca]) wsResumen[ca].s = S.data('left')
    }
  }
  XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_GENERAL')

  // ─────────────────────────────────────────────────────────────
  // HOJA 5: TODOS_LOS_REGISTROS
  // ─────────────────────────────────────────────────────────────
  const wsRegistros = { '!ref': 'A1:P1', '!rows': [], '!cols': [
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ] }
  const COLS_REG = 16
  const HEADERS_REG = [
    'CORRELATIVO', 'PLACA', 'TRANSPORTE', 'TIPO UNIDAD',
    'RANGO MIN', 'RANGO MAX', 'ESTADO', 'FECHA',
    'HORA ENTRADA', 'HORA SALIDA', 'TIEMPO', 'DESTINO',
    'BODEGA', 'PESO BRUTO (TM)', 'PESO NETO (TM)', 'ACUMULADO (TM)'
  ]
  let rRow = 0
  wsRegistros['!rows'][rRow] = { hpt: 22 }
  writeRow(wsRegistros, rRow, COLS_REG, HEADERS_REG.map(h => C(h, S.header('center'))))
  rRow++

  registros.forEach(reg => {
    const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
    const rango = RANGOS[reg.tipo_unidad?.toUpperCase()] || { min: '-', max: '-' }
    const estadoTexto = estado === 'bajo' ? 'BAJO PESO' : estado === 'sobre' ? 'SOBREPESO' : 'EN RANGO'
    const estadoStyle = estado === 'bajo' ? S.bajoPeso() : estado === 'sobre' ? S.sobrePeso() : S.enRango()
    const rowBase = estado === 'bajo' ? S.data('left') : estado === 'sobre' ? {
      ...S.data('left'),
      fill: { fgColor: { rgb: 'FFF0F0' }, patternType: 'solid' }
    } : S.data('left')
    const destinoNombre = reg.destino_info ? `${reg.destino_info.codigo} - ${reg.destino_info.nombre}` : (reg.destino_id || '—')

    writeRow(wsRegistros, rRow, COLS_REG, [
      C(reg.correlativo, { ...rowBase, alignment: { horizontal: 'center' } }),
      C(reg.placa || '', rowBase),
      C(reg.transporte || '—', rowBase),
      C(reg.tipo_unidad || '—', rowBase),
      C(rango.min, rowBase),
      C(rango.max, rowBase),
      C(estadoTexto, estadoStyle),
      C(reg.fecha || '—', rowBase),
      C(reg.hora_entrada || '—', rowBase),
      C(reg.hora_salida || '—', rowBase),
      C(reg.tiempo_atencion || '—', rowBase),
      C(destinoNombre, rowBase),
      C(reg.bodega_barco || '—', rowBase),
      C(parseFloat((reg.peso_bruto_updp_tm || 0).toFixed(3)), { ...rowBase, alignment: { horizontal: 'right' } }),
      C(parseFloat((reg.peso_neto_updp_tm || 0).toFixed(3)), { ...estadoStyle, alignment: { horizontal: 'right' } }),
      C(parseFloat((reg.acumulado_updp_tm || 0).toFixed(3)), { ...rowBase, alignment: { horizontal: 'right' } }),
    ])
    rRow++
  })
  wsRegistros['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rRow - 1, c: COLS_REG - 1 } })
  XLSX.utils.book_append_sheet(wb, wsRegistros, 'TODOS_LOS_REGISTROS')

  // ─────────────────────────────────────────────────────────────
  // HOJAS POR CADA TRANSPORTE
  // ─────────────────────────────────────────────────────────────
  const transportesUnicos = [...new Set(registros.map(reg => reg.transporte || 'DESCONOCIDO'))]

  transportesUnicos.forEach(transporteNombre => {
    const viajes = registros.filter(r => (r.transporte || 'DESCONOCIDO') === transporteNombre)
    const totalTm = viajes.reduce((s, v) => s + (v.peso_neto_updp_tm || 0), 0)

    const COLS_T = 10
    const wsTr = {
      '!ref': 'A1:J1',
      '!rows': [],
      '!cols': [
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }
      ]
    }
    let tRow = 0

    wsTr['!rows'][tRow] = { hpt: 22 }
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `TRANSPORTE: ${transporteNombre}` : '', S.transportTitle(i === 0 ? 'left' : 'center'))
    ))
    tRow++

    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `TOTAL: ${totalTm.toFixed(3)} TM` : '', S.data('left'))
    ))
    tRow++
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `VIAJES: ${viajes.length}` : '', S.data('left'))
    ))
    tRow++

    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map(() => C('', S.separator())))
    tRow++

    const hdrLabels = ['CORRELATIVO', 'PLACA', 'PESO NETO (TM)', 'TIPO UNIDAD', 'ESTADO', 'FECHA', 'HORA ENTRADA', 'HORA SALIDA', 'DESTINO', 'BODEGA']
    wsTr['!rows'][tRow] = { hpt: 20 }
    writeRow(wsTr, tRow, COLS_T, hdrLabels.map(h => C(h, S.header('center'))))
    tRow++

    viajes.forEach(reg => {
      const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
      const estadoTexto = estado === 'bajo' ? 'BAJO PESO' : estado === 'sobre' ? 'SOBREPESO' : 'EN RANGO'
      const estadoStyle = estado === 'bajo' ? S.bajoPeso() : estado === 'sobre' ? S.sobrePeso() : S.enRango()
      const destinoNombre = reg.destino_info ? `${reg.destino_info.codigo} - ${reg.destino_info.nombre}` : (reg.destino_id || '—')
      
      writeRow(wsTr, tRow, COLS_T, [
        C(reg.correlativo, S.data('center')),
        C(reg.placa || '', S.data('center')),
        C(parseFloat((reg.peso_neto_updp_tm || 0).toFixed(3)), { ...estadoStyle, alignment: { horizontal: 'right' } }),
        C(reg.tipo_unidad || '', S.data('center')),
        C(estadoTexto, estadoStyle),
        C(reg.fecha || '', S.data('center')),
        C(reg.hora_entrada || '—', S.data('center')),
        C(reg.hora_salida || '—', S.data('center')),
        C(destinoNombre, S.data('center')),
        C(reg.bodega_barco || '—', S.data('center')),
      ])
      tRow++
    })

    wsTr['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: tRow - 1, c: COLS_T - 1 } })
    const nombreHoja = transporteNombre.replace(/[\\/*?:[\]]/g, '').substring(0, 31)
    XLSX.utils.book_append_sheet(wb, wsTr, nombreHoja)
  })

  // ─────────────────────────────────────────────────────────────
  // GUARDAR ARCHIVO
  // ─────────────────────────────────────────────────────────────
  const nombreArchivo = `Yeso_${barco?.nombre || 'descarga'}_${dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

  const promediosPorTransporte = useMemo(() => {
    const mapa = {}
    todosLosRegistros.forEach(r => {
      const empresa = r.transporte || 'DESCONOCIDO'
      if (!mapa[empresa]) mapa[empresa] = { nombre: empresa, viajes: [], traileta: [], volqueta: [] }
      mapa[empresa].viajes.push(r)
      const tipo = (r.tipo_unidad || '').toUpperCase()
      if (tipo === 'TRAILETA') mapa[empresa].traileta.push(r)
      else if (tipo === 'VOLQUETA') mapa[empresa].volqueta.push(r)
    })
    return Object.values(mapa).map(e => {
      const totalNeto = e.viajes.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalTraileta = e.traileta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalVolqueta = e.volqueta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      return {
        nombre: e.nombre, totalViajes: e.viajes.length, totalNeto,
        viajesTraileta: e.traileta.length, viajesVolqueta: e.volqueta.length,
        totalTraileta, totalVolqueta,
        promedioTraileta: e.traileta.length > 0 ? totalTraileta / e.traileta.length : null,
        promedioVolqueta: e.volqueta.length > 0 ? totalVolqueta / e.volqueta.length : null,
        fueraRango: e.viajes.filter(r => estaFueraDeRango(r.peso_neto_updp_tm, r.tipo_unidad)).length,
      }
    }).sort((a, b) => b.totalNeto - a.totalNeto)
  }, [todosLosRegistros])

  const limpiarFiltrosTabla = () => { setBusquedaTabla(''); setFiltroFechaInicio(''); setFiltroFechaFin(''); setFiltroHoraInicio(''); setFiltroHoraFin('') }
  const handleSeleccionarTransporte = (transporte) => { setTransporteSeleccionado(prev => prev === transporte ? null : transporte); limpiarFiltrosTabla() }
  const handleSeleccionarDia = (dia) => { setDiaSeleccionado(prev => prev === dia ? null : dia); limpiarFiltrosTabla() }
  const handleSeleccionarDestino = (destinoId) => { setDestinoSeleccionado(prev => prev === destinoId ? null : destinoId); limpiarFiltrosTabla() }
  const limpiarTodosLosFiltros = () => { setTransporteSeleccionado(null); setDiaSeleccionado(null); setDestinoSeleccionado(null); limpiarFiltrosTabla() }

  const filtroActivoTexto = [transporteSeleccionado && `Transporte: ${transporteSeleccionado}`, diaSeleccionado && `Día: ${diaSeleccionado}`, destinoSeleccionado && `Destino: ${destinos.find(d => d.id === destinoSeleccionado)?.nombre || destinoSeleccionado}`].filter(Boolean).join(' · ') || 'Mostrando todos los datos'

  if (loading && !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_GRIS_FONDO }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px', animation: 'float 2s ease-in-out infinite' }}>⚓</div>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}>
            <svg viewBox="0 0 100 100" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke={COLOR_AZUL_SUAVE} strokeWidth="6"/>
              <path d="M50 5 L50 95 M5 50 L95 50" stroke={COLOR_AZUL_SUAVE} strokeWidth="2"/>
              <path d="M50 5 A45 45 0 0 1 95 50" fill="none" stroke={COLOR_AZUL_PRINCIPAL} strokeWidth="6" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ color: COLOR_AZUL_PRINCIPAL, fontWeight: '500', fontSize: '14px', letterSpacing: '1px' }}>CARGANDO DATOS DE YESO</p>
        </div>
      </div>
    )
  }

  if (error || !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_GRIS_FONDO, padding: '20px' }}>
        <div style={{ background: COLOR_BLANCO, padding: '48px', borderRadius: '32px', maxWidth: '450px', textAlign: 'center', border: `1px solid ${COLOR_BORDE}` }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>⚠️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', color: COLOR_NARANJA }}>Error de Conexión</h1>
          <p style={{ color: COLOR_TEXTO_SECUNDARIO }}>{error || 'No se pudieron cargar los datos.'}</p>
        </div>
      </div>
    )
  }

  const datosGraficoTransporte = Object.entries(estadisticas.porTransporte).map(([name, value]) => ({ name, value }))
  const datosGraficoDia = Object.entries(estadisticas.porDia).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))
  const datosGraficoDestino = Object.entries(estadisticas.porDestino).map(([name, value]) => ({ name, value }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
          --azul-500: #0000A3;
          --azul-400: #182A6E;
          --azul-100: #E8EAF3;
          --verde-gris: #82907F;
          --naranja: #FD7304;
          --blanco: #FFFFFF;
          --gris-fondo: #F5F5F5;
          --texto-primary: #1A1A1A;
          --texto-secondary: #6B7280;
          --border: #E5E5E5;
        }
        
        body { background: var(--gris-fondo); font-family: 'Inter', sans-serif; }
        
        .alm-topbar {
          background: var(--blanco);
          border-bottom: 3px solid var(--naranja);
          padding: 0 32px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .alm-logo { height: 45px; }
        .alm-ship-name { font-weight: 800; font-size: 18px; color: var(--azul-500); }
        .alm-ship-code { font-size: 11px; color: var(--texto-secondary); }
        
        .alm-glass-btn {
          background: var(--azul-100);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 20px;
          color: var(--azul-500);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        
        .alm-glass-btn:hover { background: var(--azul-500); color: var(--blanco); border-color: var(--azul-500); transform: translateY(-2px); }
        
        .alm-body { max-width: 1440px; margin: 0 auto; padding: 32px; }
        
        /* Botón de alternar sección */
        .section-toggle {
          display: flex;
          background: var(--azul-100);
          border-radius: 40px;
          padding: 4px;
          gap: 4px;
        }
        
        .toggle-btn {
          padding: 8px 20px;
          border-radius: 32px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          color: var(--azul-500);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .toggle-btn.active {
          background: var(--azul-500);
          color: var(--blanco);
          box-shadow: 0 2px 8px rgba(0,0,163,0.2);
        }
        
        .toggle-btn:not(.active):hover {
          background: rgba(0,0,163,0.1);
        }
        
        /* KPI Grid - Compacto */
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        
        /* KPI Card - Horizontal */
        .kpi-card {
          background: linear-gradient(135deg, #0000A3, #182A6E);
          border-radius: 20px;
          padding: 14px 20px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          color: var(--blanco);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,163,0.2); }
        
        .kpi-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 60px 60px;
          border-color: transparent transparent rgba(255,255,255,0.06) transparent;
          pointer-events: none;
        }
        
        .kpi-card::before {
          content: '';
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }
        
        .kpi-icon {
          width: 42px;
          height: 42px;
          background: rgba(255,255,255,0.12);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          position: relative;
          z-index: 1;
          flex-shrink: 0;
        }
        
        .kpi-value {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1;
          white-space: nowrap;
          position: relative;
          z-index: 1;
        }
        
        .kpi-value small {
          font-size: 12px;
          font-weight: 500;
          opacity: 0.8;
        }
        
        .kpi-label {
          font-size: 11px;
          opacity: 0.75;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          white-space: nowrap;
          position: relative;
          z-index: 1;
          margin-left: auto;
        }
        
        /* Grid de 2 columnas para Progress + Prediction */
        .stats-two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 28px;
        }
        
        /* Progress Card */
        .progress-card {
          background: linear-gradient(135deg, #0000A3, #182A6E);
          border-radius: 20px;
          padding: 16px 20px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          color: var(--blanco);
          position: relative;
          overflow: hidden;
        }
        
        .progress-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,163,0.2); }
        
        .progress-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 60px 60px;
          border-color: transparent transparent rgba(255,255,255,0.06) transparent;
          pointer-events: none;
        }
        
        .progress-card::before {
          content: '';
          position: absolute;
          top: -20px;
          right: -20px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }
        
        .progress-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }
        
        .progress-title span {
          font-weight: 600;
          color: var(--blanco);
          font-size: 13px;
        }
        
        .progress-percent {
          background: rgba(255,255,255,0.15);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          color: var(--blanco);
        }
        
        .progress-bar {
          height: 8px;
          background: rgba(255,255,255,0.2);
          border-radius: 100px;
          overflow: hidden;
          margin: 12px 0 10px;
          position: relative;
          z-index: 1;
        }
        
        .progress-fill {
          height: 100%;
          background: rgba(255,255,255,0.9);
          border-radius: 100px;
          transition: width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          position: relative;
          z-index: 1;
        }
        
        .progress-current {
          color: var(--blanco);
          font-weight: 600;
        }
        
        /* Prediction Card */
        .prediction-card {
          background: linear-gradient(135deg, #0000A3, #182A6E);
          border-radius: 20px;
          padding: 16px 20px;
          color: var(--blanco);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .prediction-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,163,0.2);
        }
        
        .prediction-card::before {
          content: '';
          position: absolute;
          top: -30px;
          right: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }
        
        .prediction-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 60px 60px;
          border-color: transparent transparent rgba(255,255,255,0.05) transparent;
          pointer-events: none;
        }
        
        .prediction-title {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.7;
          margin-bottom: 6px;
          position: relative;
          z-index: 1;
        }
        
        .prediction-time {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
          position: relative;
          z-index: 1;
        }
        
        .prediction-date {
          font-size: 11px;
          opacity: 0.7;
          position: relative;
          z-index: 1;
        }
        
        .prediction-stats {
          display: flex;
          gap: 24px;
          margin-top: 8px;
          position: relative;
          z-index: 1;
        }
        
        .prediction-stat-value {
          font-size: 20px;
          font-weight: 800;
        }
        
        .prediction-stat-label {
          font-size: 9px;
          opacity: 0.7;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .alm-section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--texto-secondary);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .alm-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }
        
        .alm-chart-grid { background: var(--blanco); display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px; }
        .alm-chart-card { background: var(--blanco); border-radius: 20px; padding: 24px; transition: all 0.2s ease; }
        .alm-chart-card:hover { border-color: var(--azul-500); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        
        /* Contenedor de gráfico de flujo y tabla en la misma sección */
        .detalle-container {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        
        .flujo-card {
          background: var(--blanco);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.2s ease;
        }
        
        .flujo-card:hover {
          border-color: var(--azul-500);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        
        .alm-table-container { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
        .alm-table { width: 100%; border-collapse: collapse; }
        .alm-table th { padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--texto-secondary); background: var(--gris-fondo); border-bottom: 1px solid var(--border); }
        .alm-table td { padding: 14px 20px; color: var(--texto-primary); font-size: 13px; border-bottom: 1px solid var(--gris-fondo); }
        .alm-table tbody tr:hover { background: var(--azul-100); }
        
        .alm-row-bajo { background: linear-gradient(90deg, rgba(253, 115, 4, 0.06), transparent); border-left: 3px solid var(--naranja); }
        .alm-row-sobre { background: linear-gradient(90deg, rgba(220, 38, 38, 0.06), transparent); border-left: 3px solid #DC2626; }
        
        .alm-badge { background: var(--azul-100); border: 1px solid var(--azul-500); color: var(--azul-500); padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 500; }
        
        .alm-search-input { background: var(--blanco); border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; font-size: 13px; width: 250px; outline: none; }
        .alm-search-input:focus { border-color: var(--azul-500); box-shadow: 0 0 0 3px rgba(0,0,163,0.1); }
        
        /* Tarjeta de empresa transportista */
        .transportista-card {
          background: var(--blanco);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .transportista-card:hover {
          border-color: var(--azul-500);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .transportista-card.selected {
          background: var(--azul-100);
          border-color: var(--azul-500);
        }
        
        /* Animación de entrada */
        .fade-enter {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        @media (max-width: 1024px) { 
          .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .stats-two-columns { grid-template-columns: 1fr; gap: 16px; }
          .alm-chart-grid { grid-template-columns: 1fr; }
          .alm-body { padding: 20px; }
        }
        
        @media (max-width: 640px) { 
          .kpi-grid { grid-template-columns: 1fr; }
          .alm-topbar { padding: 0 16px; height: 70px; }
          .kpi-value { font-size: 22px; }
          .kpi-label { font-size: 10px; }
          .section-toggle { width: 100%; justify-content: center; }
          .toggle-btn { padding: 6px 16px; font-size: 12px; }
        }
      `}</style>

      <div className="alm-yeso-root">
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/logo.png" alt="ALMACENADORA DEL PACÍFICO" className="alm-logo" />
            <div style={{ width: '2px', height: '35px', background: COLOR_NARANJA }} />
            <div>
              <div className="alm-ship-name">{barco.nombre}</div>
              <div className="alm-ship-code">#{barco.codigo_barco} · Yeso YE-001</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={descargarExcel} className="alm-glass-btn"><FaFileExcel size={14} /> Exportar</button>
            {(transporteSeleccionado || diaSeleccionado || destinoSeleccionado || busquedaTabla || filtroFechaInicio || filtroFechaFin) && (
              <button onClick={limpiarTodosLosFiltros} className="alm-glass-btn" style={{ background: COLOR_GRIS_FONDO, color: COLOR_TEXTO_SECUNDARIO }}><FiX size={14} /> Limpiar todo</button>
            )}
            <button onClick={refetch} className="alm-glass-btn"><FiRefreshCw size={14} /> Actualizar</button>
          </div>
        </header>

        <div className="alm-body">
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="alm-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiActivity size={12} /> {filtroActivoTexto}
            </div>
            <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock size={12} /> Última actualización: {lastUpdate?.format('HH:mm:ss') || '--:--:--'}
            </div>
          </div>

          {/* PRIMERA FILA DE KPIs - Horizontal */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><GiWeightScale size={22} /></div>
              <div className="kpi-value">{fmtTM(estadisticas.totalNeto, 3)}<small> TM</small></div>
              <div className="kpi-label">Total Descargado</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiTruck size={22} /></div>
              <div className="kpi-value">{estadisticas.totalViajes.toLocaleString()}</div>
              <div className="kpi-label">Total Viajes</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiBarChart2 size={22} /></div>
              <div className="kpi-value">{fmtTM(estadisticas.pesoPromedio, 3)}<small> TM</small></div>
              <div className="kpi-label">Promedio por Viaje</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FaBuilding size={22} /></div>
              <div className="kpi-value">{promediosPorTransporte.length}</div>
              <div className="kpi-label">Transportistas</div>
            </div>
          </div>

          {/* SEGUNDA FILA DE KPIs */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><FiCheckCircle size={22} /></div>
              <div className="kpi-value">{estadisticas.porcentajeDentroRango.toFixed(1)}<small>%</small></div>
              <div className="kpi-label">En Rango</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiAlertCircle size={22} /></div>
              <div className="kpi-value">{estadisticas.unidadesFueraDeRango.length}</div>
              <div className="kpi-label">Fuera de Rango</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiTrendingUp size={22} /></div>
              <div className="kpi-value">{fmtTM(meta, 3)}<small> TM</small></div>
              <div className="kpi-label">Meta Manifestada</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiClock size={22} /></div>
              <div className="kpi-value">{flujoPromedioPorHora.toFixed(1)}<small> TM/h</small></div>
              <div className="kpi-label">Ritmo de Descarga</div>
            </div>
          </div>

          {/* PROGRESS + PREDICCIÓN EN 2 COLUMNAS */}
          <div className="stats-two-columns">
            {meta > 0 && (
              <div className="progress-card">
                <div className="progress-title">
                  <FiTrendingUp size={16} style={{ color: COLOR_BLANCO }} />
                  <span>Progreso de Descarga vs Meta</span>
                  <div className="progress-percent">{porcentajeMeta.toFixed(1)}% Completado</div>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(porcentajeMeta, 100)}%` }} />
                  {tieneExcedente && (
                    <div style={{ 
                      width: `${Math.min(porcentajeMeta - 100, 100)}%`,
                      height: '8px',
                      background: `linear-gradient(90deg, ${COLOR_ROJO}, ${COLOR_NARANJA})`,
                      borderRadius: '0 100px 100px 0',
                      marginTop: '-8px',
                      marginLeft: '100%'
                    }} />
                  )}
                </div>
                <div className="progress-labels">
                  <span>0 TM</span>
                  <span className="progress-current">{fmtTM(estadisticas.totalNeto, 3)} TM</span>
                  <span>{fmtTM(meta, 3)} TM</span>
                </div>
              </div>
            )}

            {meta > 0 && faltante > 0 && flujoPromedioPorHora > 0 ? (
              <div className="prediction-card">
                <div className="prediction-title">PREDICCIÓN</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div className="prediction-time">
                      {(() => {
                        const horasRestantes = faltante / flujoPromedioPorHora
                        const ahora = dayjs().tz(ZONA_HORARIA_SV)
                        const horaEstimada = ahora.add(horasRestantes, 'hour')
                        return horaEstimada.format('HH:mm [hrs]')
                      })()}
                    </div>
                    <div className="prediction-date">
                      {(() => {
                        const horasRestantes = faltante / flujoPromedioPorHora
                        const ahora = dayjs().tz(ZONA_HORARIA_SV)
                        const horaEstimada = ahora.add(horasRestantes, 'hour')
                        return horaEstimada.format('• DD/MM/YYYY')
                      })()}
                    </div>
                  </div>
                  <div className="prediction-stats">
                    <div>
                      <div className="prediction-stat-value">{faltante.toFixed(3)}<span style={{ fontSize: '11px' }}> TM</span></div>
                      <div className="prediction-stat-label">Faltante</div>
                    </div>
                    <div>
                      <div className="prediction-stat-value">{flujoPromedioPorHora.toFixed(1)}<span style={{ fontSize: '11px' }}> TM/h</span></div>
                      <div className="prediction-stat-label">Ritmo actual</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : meta > 0 && faltante <= 0 ? (
              <div className="prediction-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center', height: '100%' }}>
                  <FiCheckCircle size={24} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700' }}>¡META ALCANZADA!</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>Descarga completada de {fmtTM(meta, 3)} TM</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="progress-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <FiClock size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Esperando datos para predicción</p>
                </div>
              </div>
            )}
          </div>

          {/* EMPRESAS TRANSPORTISTAS - RESTAURADO */}
          {promediosPorTransporte.length > 0 && (
            <>
              <div className="alm-section-title">
                <FaBuilding size={14} /> Empresas Transportistas
                <span className="alm-badge">{promediosPorTransporte.length} activas</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                {promediosPorTransporte.map(empresa => {
                  const isSelected = transporteSeleccionado === empresa.nombre
                  return (
                    <div
                      key={empresa.nombre}
                      onClick={() => handleSeleccionarTransporte(empresa.nombre)}
                      className={`transportista-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, fontSize: '15px' }}>{empresa.nombre}</span>
                        <span style={{ fontSize: '20px', fontWeight: '800', color: COLOR_AZUL_PRINCIPAL }}>{fmtTM(empresa.totalNeto, 3)} TM</span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, flexWrap: 'wrap' }}>
                        <span><FiTruck size={11} style={{ display: 'inline', marginRight: '4px' }} /> {empresa.totalViajes} viajes</span>
                        {empresa.viajesTraileta > 0 && <span><FaTrailer size={11} style={{ display: 'inline', marginRight: '4px' }} /> Traileta: {fmtTM(empresa.promedioTraileta, 3)} TM</span>}
                        {empresa.viajesVolqueta > 0 && <span><GiCoalWagon size={11} style={{ display: 'inline', marginRight: '4px' }} /> Volqueta: {fmtTM(empresa.promedioVolqueta, 3)} TM</span>}
                      </div>
                      {empresa.fueraRango > 0 && (
                        <div style={{ fontSize: '10px', color: COLOR_NARANJA, marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiAlertCircle size={10} /> {empresa.fueraRango} fuera del rango óptimo
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* BOTÓN PARA ALTERNAR ENTRE SECCIONES */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <div className="section-toggle">
              <button 
                className={`toggle-btn ${seccionActiva === 'resumen' ? 'active' : ''}`}
                onClick={() => setSeccionActiva('resumen')}
              >
                <FiGrid size={14} /> Vista General
              </button>
              <button 
                className={`toggle-btn ${seccionActiva === 'detalle' ? 'active' : ''}`}
                onClick={() => setSeccionActiva('detalle')}
              >
                <FiList size={14} /> Detalle de Viajes
              </button>
            </div>
          </div>

          {/* SECCIÓN DE RESUMEN (Gráficos - SIN el Flujo de Descarga) */}
          {seccionActiva === 'resumen' && (
            <div className="fade-enter">
              <div className="alm-chart-grid">
                <div className="alm-chart-card">
                  <div className="alm-section-title"><FaChartPie size={14} /> Distribución por Transporte</div>
                  {datosGraficoTransporte.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={datosGraficoTransporte} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {datosGraficoTransporte.map((_, i) => <Cell key={i} fill={COLORES_GRAFICOS[i % COLORES_GRAFICOS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v) => `${fmtTM(v, 3)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div style={{ textAlign: 'center', padding: '50px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
                </div>

                <div className="alm-chart-card">
                  <div className="alm-section-title"><FaWarehouse size={14} /> Distribución por Destino</div>
                  {datosGraficoDestino.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={datosGraficoDestino} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {datosGraficoDestino.map((_, i) => <Cell key={i} fill={COLORES_GRAFICOS[(i+2) % COLORES_GRAFICOS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v) => `${fmtTM(v, 3)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div style={{ textAlign: 'center', padding: '50px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
                </div>

                <div className="alm-chart-card">
                  <div className="alm-section-title"><FiCalendar size={14} /> Descarga por Día {diaSeleccionado && <span className="alm-badge">Filtro: {diaSeleccionado}</span>}</div>
                  {datosGraficoDia.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={datosGraficoDia}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                        <XAxis dataKey="dia" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${fmtTM(v, 3)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                        <Bar dataKey="total" fill={COLOR_AZUL_PRINCIPAL} radius={[6, 6, 0, 0]} onClick={(data) => handleSeleccionarDia(data.dia)} cursor="pointer">
                          {datosGraficoDia.map((entry, idx) => (
                            <Cell key={idx} fill={diaSeleccionado === entry.dia ? COLOR_NARANJA : COLOR_AZUL_PRINCIPAL} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div style={{ textAlign: 'center', padding: '50px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
                  <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, textAlign: 'center', marginTop: '10px' }}>Haz clic en cualquier barra para filtrar por día</div>
                </div>

                <div className="alm-chart-card">
                  <div className="alm-section-title"><FaChartLine size={14} /> Distribución de Pesos por Viaje</div>
                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '16px', fontSize: '10px', flexWrap: 'wrap' }}>
                    <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_AZUL_MARINO, borderRadius: '2px', marginRight: '6px' }}></span>En Rango</span>
                    <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_NARANJA, borderRadius: '2px', marginRight: '6px' }}></span>Bajo Peso</span>
                    <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_ROJO, borderRadius: '2px', marginRight: '6px' }}></span>Sobrepeso</span>
                  </div>
                  {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={estadisticas.acumuladoPorCorrelativo.slice(-30)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                        <XAxis dataKey="correlativo" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v) => `${fmtTM(v, 3)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                        <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                          {estadisticas.acumuladoPorCorrelativo.slice(-30).map((entry, idx) => (
                            <Cell key={idx} fill={getColorPorEstado(entry.estado)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div style={{ textAlign: 'center', padding: '50px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN DE DETALLE (Flujo de Descarga + Tabla juntos) */}
          {seccionActiva === 'detalle' && (
            <div className="fade-enter">
              <div className="detalle-container">
                {/* Flujo de Descarga por Hora */}
                <div className="flujo-card">
                  <div className="alm-section-title"><FiClock size={14} /> Flujo de Descarga por Hora</div>
                  {flujoPorHora.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <ComposedChart data={flujoPorHora}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                        <XAxis dataKey="hora" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} angle={-45} textAnchor="end" height={55} />
                        <YAxis yAxisId="left" tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} />
                        <Tooltip contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                        <Bar yAxisId="left" dataKey="totalTM" fill={COLOR_AZUL_PRINCIPAL} opacity={0.7} radius={[6, 6, 0, 0]} name="TM por Hora" />
                        <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke={COLOR_NARANJA} strokeWidth={3} dot={false} name="Acumulado Total" />
                        <Area yAxisId="right" type="monotone" dataKey="acumulado" fill="url(#areaGradient)" stroke="none" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '70px', color: COLOR_TEXTO_SECUNDARIO }}>
                      <FiClock size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                      <p>No hay datos horarios disponibles</p>
                    </div>
                  )}
                </div>

                {/* Tabla de Registros */}
                <div className="alm-table-container">
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLOR_BORDE}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaClipboardList size={14} style={{ color: COLOR_AZUL_PRINCIPAL }} />
                        <span style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO }}>Registros de Descarga</span>
                        <span className="alm-badge">{registrosConFiltrosTabla.length} / {registros.length} viajes</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => setOrdenTabla('correlativo_desc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'correlativo_desc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiArrowDown size={11} style={{ display: 'inline', marginRight: '4px' }} /> Correlativo ↓</button>
                        <button onClick={() => setOrdenTabla('correlativo_asc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'correlativo_asc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiArrowUp size={11} style={{ display: 'inline', marginRight: '4px' }} /> Correlativo ↑</button>
                        <button onClick={() => setOrdenTabla('fecha_desc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'fecha_desc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiCalendar size={11} style={{ display: 'inline', marginRight: '4px' }} /> Más Reciente</button>
                        <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="alm-badge" style={{ cursor: 'pointer', background: mostrarFiltros ? COLOR_AZUL_SUAVE : 'transparent' }}><FiFilter size={11} style={{ display: 'inline', marginRight: '4px' }} /> Filtros</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ position: 'relative', maxWidth: '320px' }}>
                        <FiSearchIcon size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLOR_TEXTO_SECUNDARIO }} />
                        <input type="text" placeholder="Buscar por placa o correlativo..." value={busquedaTabla} onChange={(e) => setBusquedaTabla(e.target.value)} className="alm-search-input" style={{ paddingLeft: '36px', width: '100%' }} />
                      </div>
                    </div>

                    {mostrarFiltros && (
                      <div style={{ marginBottom: '16px', padding: '16px', background: COLOR_GRIS_FONDO, borderRadius: '14px', border: `1px solid ${COLOR_BORDE}` }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: COLOR_AZUL_PRINCIPAL, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FaCalendarAlt size={12} /> Filtros Avanzados
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, display: 'block', marginBottom: '6px' }}>Rango de Fechas</label>
                            <DateRangePicker startDate={filtroFechaInicio} endDate={filtroFechaFin} onStartChange={setFiltroFechaInicio} onEndChange={setFiltroFechaFin} onClear={() => { setFiltroFechaInicio(''); setFiltroFechaFin(''); }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, display: 'block', marginBottom: '6px' }}>Rango de Horas</label>
                            <TimeRangePicker startTime={filtroHoraInicio} endTime={filtroHoraFin} onStartChange={setFiltroHoraInicio} onEndChange={setFiltroHoraFin} onClear={() => { setFiltroHoraInicio(''); setFiltroHoraFin(''); }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {(busquedaTabla || filtroFechaInicio || filtroFechaFin || filtroHoraInicio || filtroHoraFin) && (
                      <div style={{ fontSize: '10px', color: COLOR_AZUL_PRINCIPAL, marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <FiFilter size={9} /> <span>Filtros activos:</span>
                        {busquedaTabla && <span className="alm-badge" style={{ fontSize: '9px' }}>{busquedaTabla}</span>}
                        {filtroFechaInicio && filtroFechaFin && <span className="alm-badge" style={{ fontSize: '9px' }}>{dayjs(filtroFechaInicio).format('DD/MM/YYYY')} - {dayjs(filtroFechaFin).format('DD/MM/YYYY')}</span>}
                        <button onClick={limpiarFiltrosTabla} style={{ fontSize: '9px', color: COLOR_ROJO, background: 'transparent', border: 'none', cursor: 'pointer' }}>Limpiar todo</button>
                      </div>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table className="alm-table">
                      <thead style={{ position: 'sticky', top: 0, background: COLOR_GRIS_FONDO, zIndex: 10 }}>
                        <tr>
                          <th>#</th>
                          <th>Placa</th>
                          <th>Transporte</th>
                          <th>Tipo</th>
                          <th>Destino</th>
                          <th>Fecha</th>
                          <th>Hora Entrada</th>
                          <th>Peso Neto</th>
                          <th>Acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosOrdenados.length === 0 ? (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '50px', color: COLOR_TEXTO_SECUNDARIO }}>
                              <FiSearchIcon size={28} style={{ marginBottom: '10px', opacity: 0.5 }} />
                              <p>No se encontraron registros</p>
                            </td>
                          </tr>
                        ) : (
                          registrosOrdenados.map((reg) => {
                            const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
                            let rowClass = ''
                            if (estado === 'bajo') rowClass = 'alm-row-bajo'
                            if (estado === 'sobre') rowClass = 'alm-row-sobre'
                            return (
                              <tr key={reg.id} className={rowClass}>
                                <td style={{ fontWeight: '700' }}>{reg.correlativo}</td>
                                <td>{reg.placa}</td>
                                <td>{reg.transporte || '—'}</td>
                                <td><span style={{ background: reg.tipo_unidad === 'TRAILETA' ? `${COLOR_NARANJA}15` : `${COLOR_AZUL_PRINCIPAL}10`, padding: '4px 10px', borderRadius: '100px', fontSize: '10px' }}>{reg.tipo_unidad || '—'}</span></td>
                                <td>{reg.destino_info && <span style={{ background: COLOR_AZUL_SUAVE, padding: '4px 10px', borderRadius: '100px', fontSize: '10px', cursor: 'pointer' }} onClick={() => handleSeleccionarDestino(reg.destino_id)}>{reg.destino_info.codigo}</span>}</td>
                                <td>{reg.fecha}</td>
                                <td>{reg.hora_entrada || '—'}</td>
                                <td style={{ fontWeight: '700', color: estado === 'bajo' ? COLOR_NARANJA : (estado === 'sobre' ? COLOR_ROJO : COLOR_AZUL_PRINCIPAL) }}>{reg.peso_neto_updp_tm?.toFixed(3)} TM</td>
                                <td style={{ fontFamily: 'monospace', color: COLOR_AZUL_PRINCIPAL }}>{reg.acumulado_updp_tm?.toFixed(3)} TM</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '24px 20px', borderTop: `1px solid ${COLOR_BORDE}`, marginTop: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO }}>
              <span><FiRefreshCw size={10} /> Auto-refresh 30s</span>
              <span><GiCargoShip size={10} /> {barco.nombre}</span>
              <span><GiMinerals size={10} /> Yeso YE-001</span>
              <span><FaDatabase size={10} /> {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 3)} TM</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '9px' }}>
              <span><GiCoalWagon size={9} style={{ color: COLOR_AZUL_PRINCIPAL }} /> VOLQUETA: 14-18 TM</span>
              <span><FaTrailer size={9} style={{ color: COLOR_AZUL_PRINCIPAL }} /> TRAILETA: 22-26 TM</span>
              <span style={{ color: COLOR_ROJO }}><FiAlertCircle size={9} /> Sobrepeso</span>
              <span style={{ color: COLOR_NARANJA }}><FiAlertCircle size={9} /> Bajo peso</span>
              <span style={{ color: COLOR_VERDE_GRIS }}><FiCheckCircle size={9} /> En rango</span>
            </div>
            <div style={{ marginTop: '14px', fontSize: '9px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500' }}>
              ALMACENADORA DEL PACÍFICO · Sistema de Gestión de Descarga de Yeso
            </div>
          </div>
        </div>
      </div>
    </>
  )
}