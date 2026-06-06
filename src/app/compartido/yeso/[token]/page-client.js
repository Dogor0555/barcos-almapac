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
  FiSearch as FiSearchIcon, FiFilter, FiChevronLeft, FiChevronRight
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
    if (!registrosConFiltrosTabla.length) { alert('No hay datos para exportar'); return }
    const wb = XLSX.utils.book_new()
    const resumenData = [
      ['BARCO', barco?.nombre || 'N/A'], ['CÓDIGO BARCO', barco?.codigo_barco || 'N/A'], ['PRODUCTO', 'YESO (YE-001)'],
      ['TOTAL DESCARGADO (TM)', fmtTM(estadisticas.totalNeto, 2)], ['TOTAL VIAJES', estadisticas.totalViajes],
      ['PROMEDIO POR VIAJE (TM)', fmtTM(estadisticas.pesoPromedio, 2)], ['VIAJES EN RANGO', `${estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} (${estadisticas.porcentajeDentroRango.toFixed(1)}%)`],
      ['VIAJES BAJO PESO', estadisticas.bajoPeso], ['VIAJES SOBREPESO', estadisticas.sobrePeso], ['META MANIFESTADA (TM)', fmtTM(meta, 2)],
      ['FALTANTE (TM)', fmtTM(faltante, 2)], ['EXCEDENTE (TM)', fmtTM(excedente, 2)], ['PORCENTAJE DE META', `${porcentajeMeta.toFixed(1)}%`],
      ['FLUJO PROMEDIO (TM/h)', fmtTM(flujoPromedioPorHora, 1)], ['FECHA EXPORTACION', dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD HH:mm:ss')],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet([['RESUMEN GENERAL'], ...resumenData.map(r => r)])
    XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_GENERAL')
    const registrosData = registrosConFiltrosTabla.map(r => ({
      'CORRELATIVO': r.correlativo, 'PLACA': r.placa, 'TRANSPORTE': r.transporte, 'TIPO UNIDAD': r.tipo_unidad,
      'DESTINO': r.destino_info ? `${r.destino_info.codigo} - ${r.destino_info.nombre}` : '—', 'PESO NETO (TM)': r.peso_neto_updp_tm?.toFixed(3),
      'FECHA': r.fecha, 'HORA ENTRADA': r.hora_entrada, 'HORA SALIDA': r.hora_salida, 'TIEMPO': r.tiempo_atencion, 'ACUMULADO (TM)': r.acumulado_updp_tm?.toFixed(3)
    }))
    const wsRegistros = XLSX.utils.json_to_sheet(registrosData)
    XLSX.utils.book_append_sheet(wb, wsRegistros, 'REGISTROS_FILTRADOS')
    XLSX.writeFile(wb, `Yeso_${barco?.nombre || 'descarga'}_${dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD_HHmm')}.xlsx`)
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
        
        /* KPI Grid - Más compacto */
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        
        /* KPI Card - Más delgado, contenido en una sola línea */
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
        
        /* Patrón de triángulos */
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
        
        /* Círculo de glow */
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
        
        .kpi-content {
          flex: 1;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          position: relative;
          z-index: 1;
        }
        
        .kpi-value {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1;
          white-space: nowrap;
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
        }
        
        /* Prediction Card */
        .prediction-card {
          background: linear-gradient(135deg, #0000A3, #182A6E);
          border-radius: 24px;
          padding: 28px 32px;
          margin-bottom: 32px;
          color: var(--blanco);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        
        .prediction-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%);
          pointer-events: none;
        }
        
        /* Triángulo decorativo también para la predicción */
        .prediction-card::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 100px 100px;
          border-color: transparent transparent rgba(255,255,255,0.04) transparent;
          pointer-events: none;
        }
        
        .prediction-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          opacity: 0.7;
          margin-bottom: 8px;
        }
        
        .prediction-time {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        
        .prediction-date {
          font-size: 13px;
          opacity: 0.7;
        }
        
        .prediction-stats {
          display: flex;
          gap: 40px;
        }
        
        .prediction-stat-value {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        
        .prediction-stat-label {
          font-size: 11px;
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
        
        .alm-chart-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px; }
        .alm-chart-card { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; padding: 24px; transition: all 0.2s ease; }
        .alm-chart-card:hover { border-color: var(--azul-500); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .alm-chart-wide { grid-column: 1 / -1; }
        
        .alm-table-container { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; margin-bottom: 32px; }
        .alm-table { width: 100%; border-collapse: collapse; }
        .alm-table th { padding: 16px 20px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--texto-secondary); background: var(--gris-fondo); border-bottom: 1px solid var(--border); }
        .alm-table td { padding: 14px 20px; color: var(--texto-primary); font-size: 13px; border-bottom: 1px solid var(--gris-fondo); }
        .alm-table tbody tr:hover { background: var(--azul-100); }
        
        .alm-row-bajo { background: linear-gradient(90deg, rgba(253, 115, 4, 0.06), transparent); border-left: 3px solid var(--naranja); }
        .alm-row-sobre { background: linear-gradient(90deg, rgba(220, 38, 38, 0.06), transparent); border-left: 3px solid #DC2626; }
        
        .alm-badge { background: var(--azul-100); border: 1px solid var(--azul-500); color: var(--azul-500); padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 500; }
        
        .alm-progress-container { background: var(--blanco); border: 1px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 32px; }
        .alm-progress-bar { height: 10px; background: var(--gris-fondo); border-radius: 100px; overflow: hidden; margin: 16px 0; }
        .alm-progress-fill { height: 100%; background: linear-gradient(90deg, var(--azul-500), var(--azul-400)); border-radius: 100px; transition: width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1); }
        
        .alm-search-input { background: var(--blanco); border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; font-size: 13px; width: 250px; outline: none; }
        .alm-search-input:focus { border-color: var(--azul-500); box-shadow: 0 0 0 3px rgba(0,0,163,0.1); }
        
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; } .alm-chart-grid { grid-template-columns: 1fr; } .alm-body { padding: 20px; } }
        @media (max-width: 640px) { .kpi-grid { grid-template-columns: 1fr; } .alm-topbar { padding: 0 16px; height: 70px; } .kpi-value { font-size: 28px; } .prediction-stats { flex-direction: column; gap: 20px; } }
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
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="alm-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiActivity size={12} /> {filtroActivoTexto}
            </div>
            <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock size={12} /> Última actualización: {lastUpdate?.format('HH:mm:ss') || '--:--:--'}
            </div>
          </div>

          {/* PRIMERA FILA DE KPIs - TODOS con el mismo fondo y patrón de triángulos */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><GiWeightScale size={26} /></div>
              <div className="kpi-value">{fmtTM(estadisticas.totalNeto, 1)} <span style={{ fontSize: '14px', fontWeight: '500' }}>TM</span></div>
              <div className="kpi-label">Total Descargado</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiTruck size={26} /></div>
              <div className="kpi-value">{estadisticas.totalViajes.toLocaleString()}</div>
              <div className="kpi-label">Total Viajes</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiBarChart2 size={26} /></div>
              <div className="kpi-value">{fmtTM(estadisticas.pesoPromedio, 1)} <span style={{ fontSize: '14px', fontWeight: '500' }}>TM</span></div>
              <div className="kpi-label">Promedio por Viaje</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FaBuilding size={26} /></div>
              <div className="kpi-value">{promediosPorTransporte.length}</div>
              <div className="kpi-label">Transportistas</div>
            </div>
          </div>

          {/* SEGUNDA FILA DE KPIs - Mismo estilo unificado */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon"><FiCheckCircle size={26} /></div>
              <div className="kpi-value">{estadisticas.porcentajeDentroRango.toFixed(1)}%</div>
              <div className="kpi-label">En Rango</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiAlertCircle size={26} /></div>
              <div className="kpi-value">{estadisticas.unidadesFueraDeRango.length}</div>
              <div className="kpi-label">Fuera de Rango</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiTrendingUp size={26} /></div>
              <div className="kpi-value">{fmtTM(meta, 1)} <span style={{ fontSize: '14px', fontWeight: '500' }}>TM</span></div>
              <div className="kpi-label">Meta Manifestada</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon"><FiClock size={26} /></div>
              <div className="kpi-value">{flujoPromedioPorHora.toFixed(1)} <span style={{ fontSize: '14px', fontWeight: '500' }}>TM/h</span></div>
              <div className="kpi-label">Ritmo de Descarga</div>
            </div>
          </div>

          {/* Progress Bar Meta */}
          {meta > 0 && (
            <div className="alm-progress-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FiTrendingUp size={18} style={{ color: COLOR_AZUL_PRINCIPAL }} />
                  <span style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO }}>Progreso de Descarga vs Meta</span>
                </div>
                <div style={{ background: COLOR_AZUL_SUAVE, padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: '700', color: COLOR_AZUL_PRINCIPAL }}>
                  {porcentajeMeta.toFixed(1)}% Completado
                </div>
              </div>
              <div className="alm-progress-bar">
                <div className="alm-progress-fill" style={{ width: `${Math.min(porcentajeMeta, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: COLOR_TEXTO_SECUNDARIO }}>
                <span>0 TM</span>
                <span style={{ color: COLOR_AZUL_PRINCIPAL, fontWeight: '600' }}>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(meta, 0)} TM</span>
              </div>
            </div>
          )}

          {/* TARJETA DE PREDICCIÓN */}
          {meta > 0 && faltante > 0 && flujoPromedioPorHora > 0 && (
            <div className="prediction-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                  <div className="prediction-title">PREDICCIÓN</div>
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
                    <div className="prediction-stat-value">{faltante.toFixed(1)} <span style={{ fontSize: '16px' }}>TM</span></div>
                    <div className="prediction-stat-label">Faltante</div>
                  </div>
                  <div>
                    <div className="prediction-stat-value">{flujoPromedioPorHora.toFixed(1)} <span style={{ fontSize: '16px' }}>TM/h</span></div>
                    <div className="prediction-stat-label">Ritmo actual</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {meta > 0 && faltante <= 0 && (
            <div className="prediction-card" style={{ background: 'linear-gradient(135deg, #82907F, #6B7A68)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
                <FiCheckCircle size={32} />
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '700' }}>¡META ALCANZADA!</div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>Descarga completada de {fmtTM(meta, 0)} TM de Yeso</div>
                </div>
              </div>
            </div>
          )}

          {/* El resto del código continúa igual... */}
          {/* Transportistas, Gráficos, Tabla, Footer */}

          {/* Transportistas */}
          {promediosPorTransporte.length > 0 && (
            <>
              <div className="alm-section-title"><FaBuilding size={14} /> Empresas Transportistas <span className="alm-badge">{promediosPorTransporte.length} activas</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {promediosPorTransporte.map(empresa => {
                  const isSelected = transporteSeleccionado === empresa.nombre
                  return (
                    <div key={empresa.nombre} onClick={() => handleSeleccionarTransporte(empresa.nombre)} style={{
                      background: isSelected ? COLOR_AZUL_SUAVE : COLOR_BLANCO,
                      border: `1px solid ${isSelected ? COLOR_AZUL_PRINCIPAL : COLOR_BORDE}`,
                      borderRadius: '16px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, fontSize: '16px' }}>{empresa.nombre}</span>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: COLOR_AZUL_PRINCIPAL }}>{fmtTM(empresa.totalNeto, 1)} TM</span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: COLOR_TEXTO_SECUNDARIO, flexWrap: 'wrap' }}>
                        <span><FiTruck size={12} style={{ display: 'inline', marginRight: '4px' }} /> {empresa.totalViajes} viajes</span>
                        {empresa.viajesTraileta > 0 && <span><FaTrailer size={12} style={{ display: 'inline', marginRight: '4px' }} /> Traileta: {fmtTM(empresa.promedioTraileta, 1)} TM</span>}
                        {empresa.viajesVolqueta > 0 && <span><GiCoalWagon size={12} style={{ display: 'inline', marginRight: '4px' }} /> Volqueta: {fmtTM(empresa.promedioVolqueta, 1)} TM</span>}
                      </div>
                      {empresa.fueraRango > 0 && (
                        <div style={{ fontSize: '11px', color: COLOR_NARANJA, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiAlertCircle size={11} /> {empresa.fueraRango} fuera del rango óptimo
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Gráficos */}
          <div className="alm-chart-grid">
            <div className="alm-chart-card">
              <div className="alm-section-title"><FaChartPie size={14} /> Distribución por Transporte</div>
              {datosGraficoTransporte.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={datosGraficoTransporte} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoTransporte.map((_, i) => <Cell key={i} fill={COLORES_GRAFICOS[i % COLORES_GRAFICOS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title"><FaWarehouse size={14} /> Distribución por Destino</div>
              {datosGraficoDestino.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={datosGraficoDestino} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoDestino.map((_, i) => <Cell key={i} fill={COLORES_GRAFICOS[(i+2) % COLORES_GRAFICOS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title"><FiCalendar size={14} /> Descarga por Día {diaSeleccionado && <span className="alm-badge">Filtro: {diaSeleccionado}</span>}</div>
              {datosGraficoDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={datosGraficoDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                    <Bar dataKey="total" fill={COLOR_AZUL_PRINCIPAL} radius={[6, 6, 0, 0]} onClick={(data) => handleSeleccionarDia(data.dia)} cursor="pointer">
                      {datosGraficoDia.map((entry, idx) => (
                        <Cell key={idx} fill={diaSeleccionado === entry.dia ? COLOR_NARANJA : COLOR_AZUL_PRINCIPAL} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
              <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, textAlign: 'center', marginTop: '12px' }}>Haz clic en cualquier barra para filtrar por día</div>
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title"><FaChartLine size={14} /> Distribución de Pesos por Viaje</div>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '20px', fontSize: '11px', flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_AZUL_MARINO, borderRadius: '2px', marginRight: '6px' }}></span>En Rango</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_NARANJA, borderRadius: '2px', marginRight: '6px' }}></span>Bajo Peso</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: COLOR_ROJO, borderRadius: '2px', marginRight: '6px' }}></span>Sobrepeso</span>
              </div>
              {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={estadisticas.acumuladoPorCorrelativo.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                    <XAxis dataKey="correlativo" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                    <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                      {estadisticas.acumuladoPorCorrelativo.slice(-30).map((entry, idx) => (
                        <Cell key={idx} fill={getColorPorEstado(entry.estado)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: COLOR_TEXTO_SECUNDARIO }}>Sin datos</div>}
            </div>
          </div>

          {/* Flujo por Hora */}
          <div className="alm-chart-card alm-chart-wide">
            <div className="alm-section-title"><FiClock size={14} /> Flujo de Descarga por Hora</div>
            {flujoPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={flujoPorHora}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLOR_AZUL_PRINCIPAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDE} vertical={false} />
                  <XAxis dataKey="hora" tick={{ fill: COLOR_TEXTO_SECUNDARIO, fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: COLOR_TEXTO_SECUNDARIO }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <Tooltip contentStyle={{ background: COLOR_BLANCO, border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px' }} />
                  <Bar yAxisId="left" dataKey="totalTM" fill={COLOR_AZUL_PRINCIPAL} opacity={0.7} radius={[6, 6, 0, 0]} name="TM por Hora" />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke={COLOR_NARANJA} strokeWidth={3} dot={false} name="Acumulado Total" />
                  <Area yAxisId="right" type="monotone" dataKey="acumulado" fill="url(#areaGradient)" stroke="none" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px', color: COLOR_TEXTO_SECUNDARIO }}>
                <FiClock size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <p>No hay datos horarios disponibles</p>
              </div>
            )}
          </div>

          {/* Tabla de Registros */}
          <div className="alm-table-container">
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLOR_BORDE}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaClipboardList size={14} style={{ color: COLOR_AZUL_PRINCIPAL }} />
                  <span style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO }}>Registros de Descarga</span>
                  <span className="alm-badge">{registrosConFiltrosTabla.length} / {registros.length} viajes</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setOrdenTabla('correlativo_desc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'correlativo_desc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiArrowDown size={12} style={{ display: 'inline', marginRight: '4px' }} /> Correlativo ↓</button>
                  <button onClick={() => setOrdenTabla('correlativo_asc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'correlativo_asc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiArrowUp size={12} style={{ display: 'inline', marginRight: '4px' }} /> Correlativo ↑</button>
                  <button onClick={() => setOrdenTabla('fecha_desc')} className="alm-badge" style={{ cursor: 'pointer', background: ordenTabla === 'fecha_desc' ? COLOR_AZUL_SUAVE : 'transparent' }}><FiCalendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Más Reciente</button>
                  <button onClick={() => setMostrarFiltros(!mostrarFiltros)} className="alm-badge" style={{ cursor: 'pointer', background: mostrarFiltros ? COLOR_AZUL_SUAVE : 'transparent' }}><FiFilter size={12} style={{ display: 'inline', marginRight: '4px' }} /> Filtros</button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ position: 'relative', maxWidth: '350px' }}>
                  <FiSearchIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: COLOR_TEXTO_SECUNDARIO }} />
                  <input type="text" placeholder="Buscar por placa o correlativo..." value={busquedaTabla} onChange={(e) => setBusquedaTabla(e.target.value)} className="alm-search-input" style={{ paddingLeft: '38px', width: '100%' }} />
                </div>
              </div>

              {mostrarFiltros && (
                <div style={{ marginBottom: '20px', padding: '20px', background: COLOR_GRIS_FONDO, borderRadius: '16px', border: `1px solid ${COLOR_BORDE}` }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: COLOR_AZUL_PRINCIPAL, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCalendarAlt size={14} /> Filtros Avanzados
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, display: 'block', marginBottom: '8px' }}>Rango de Fechas</label>
                      <DateRangePicker startDate={filtroFechaInicio} endDate={filtroFechaFin} onStartChange={setFiltroFechaInicio} onEndChange={setFiltroFechaFin} onClear={() => { setFiltroFechaInicio(''); setFiltroFechaFin(''); }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, display: 'block', marginBottom: '8px' }}>Rango de Horas</label>
                      <TimeRangePicker startTime={filtroHoraInicio} endTime={filtroHoraFin} onStartChange={setFiltroHoraInicio} onEndChange={setFiltroHoraFin} onClear={() => { setFiltroHoraInicio(''); setFiltroHoraFin(''); }} />
                    </div>
                  </div>
                </div>
              )}

              {(busquedaTabla || filtroFechaInicio || filtroFechaFin || filtroHoraInicio || filtroHoraFin) && (
                <div style={{ fontSize: '11px', color: COLOR_AZUL_PRINCIPAL, marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <FiFilter size={10} /> <span>Filtros activos:</span>
                  {busquedaTabla && <span className="alm-badge" style={{ fontSize: '10px' }}>{busquedaTabla}</span>}
                  {filtroFechaInicio && filtroFechaFin && <span className="alm-badge" style={{ fontSize: '10px' }}>{dayjs(filtroFechaInicio).format('DD/MM/YYYY')} - {dayjs(filtroFechaFin).format('DD/MM/YYYY')}</span>}
                  <button onClick={limpiarFiltrosTabla} style={{ fontSize: '10px', color: COLOR_ROJO, background: 'transparent', border: 'none', cursor: 'pointer' }}>Limpiar todo</button>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="alm-table">
                <thead style={{ position: 'sticky', top: 0, background: COLOR_GRIS_FONDO, zIndex: 10 }}>
                  <tr><th>#</th><th>Placa</th><th>Transporte</th><th>Tipo</th><th>Destino</th><th>Fecha</th><th>Hora Entrada</th><th>Peso Neto</th><th>Acumulado</th></tr>
                </thead>
                <tbody>
                  {registrosOrdenados.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '60px', color: COLOR_TEXTO_SECUNDARIO }}><FiSearchIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} /><p>No se encontraron registros</p></td></tr>
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
                          <td><span style={{ background: reg.tipo_unidad === 'TRAILETA' ? `${COLOR_NARANJA}15` : `${COLOR_AZUL_PRINCIPAL}10`, padding: '4px 10px', borderRadius: '100px', fontSize: '11px' }}>{reg.tipo_unidad || '—'}</span></td>
                          <td>{reg.destino_info && <span style={{ background: COLOR_AZUL_SUAVE, padding: '4px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleSeleccionarDestino(reg.destino_id)}>{reg.destino_info.codigo}</span>}</td>
                          <td>{reg.fecha}</td>
                          <td>{reg.hora_entrada || '—'}</td>
                          <td style={{ fontWeight: '700', color: estado === 'bajo' ? COLOR_NARANJA : (estado === 'sobre' ? COLOR_ROJO : COLOR_AZUL_PRINCIPAL) }}>{reg.peso_neto_updp_tm?.toFixed(2)} TM</td>
                          <td style={{ fontFamily: 'monospace', color: COLOR_AZUL_PRINCIPAL }}>{reg.acumulado_updp_tm?.toFixed(2)} TM</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '28px 20px', borderTop: `1px solid ${COLOR_BORDE}`, marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO }}>
              <span><FiRefreshCw size={11} /> Auto-refresh 30s</span>
              <span><GiCargoShip size={11} /> {barco.nombre}</span>
              <span><GiMinerals size={11} /> Yeso YE-001</span>
              <span><FaDatabase size={11} /> {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 1)} TM</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '10px' }}>
              <span><GiCoalWagon size={10} style={{ color: COLOR_AZUL_PRINCIPAL }} /> VOLQUETA: 14-18 TM</span>
              <span><FaTrailer size={10} style={{ color: COLOR_AZUL_PRINCIPAL }} /> TRAILETA: 22-26 TM</span>
              <span style={{ color: COLOR_ROJO }}><FiAlertCircle size={10} /> Sobrepeso</span>
              <span style={{ color: COLOR_NARANJA }}><FiAlertCircle size={10} /> Bajo peso</span>
              <span style={{ color: COLOR_VERDE_GRIS }}><FiCheckCircle size={10} /> En rango</span>
            </div>
            <div style={{ marginTop: '16px', fontSize: '10px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500' }}>
              ALMACENADORA DEL PACÍFICO · Sistema de Gestión de Descarga de Yeso
            </div>
          </div>
        </div>
      </div>
    </>
  )
}