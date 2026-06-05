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

const COLORES = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#059669", "#047857"]

const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000"
  const valor = Number(tm).toFixed(d)
  const partes = valor.split(".")
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return partes.join(".")
}

// 🔥 FUNCIÓN PARA CARGAR TODOS LOS REGISTROS SIN LÍMITE DE 1000
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

// Función para obtener el estado del peso según tipo de unidad
const getEstadoPeso = (pesoNeto, tipoUnidad) => {
  if (!pesoNeto || !tipoUnidad) return null
  const tipo = tipoUnidad.toUpperCase()
  const rango = RANGOS[tipo]
  if (!rango) return null
  
  if (pesoNeto < rango.min) return 'bajo'
  if (pesoNeto > rango.max) return 'sobre'
  return 'ok'
}

// Función para obtener el color según estado
const getColorPorEstado = (estado) => {
  if (estado === 'bajo') return '#f59e0b'
  if (estado === 'sobre') return '#ef4444'
  return '#10b981'
}

// Función para verificar si está fuera de rango
const estaFueraDeRango = (pesoNeto, tipoUnidad) => {
  if (!pesoNeto || !tipoUnidad) return false
  const tipo = tipoUnidad.toUpperCase()
  const rango = RANGOS[tipo]
  if (!rango) return false
  return pesoNeto < rango.min || pesoNeto > rango.max
}

// NORMALIZADOR: Transforma los datos del registro al formato que espera el dashboard
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

// 🔥 COMPONENTE: Selector de Rango de Fechas con CALENDARIO VISUAL
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
    
    // Días del mes anterior
    for (let i = startDay; i > 0; i--) {
      const prevDate = startOfMonth.subtract(i, 'day')
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isSelected: false,
        isInRange: false,
        isStart: false,
        isEnd: false
      })
    }
    
    // Días del mes actual
    for (let i = 0; i < endOfMonth.date(); i++) {
      const currentDate = startOfMonth.add(i, 'day')
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isSelected: false,
        isInRange: false,
        isStart: false,
        isEnd: false
      })
    }
    
    // Días del mes siguiente (para completar 6 filas = 42 días)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      const nextDate = endOfMonth.add(i, 'day')
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isSelected: false,
        isInRange: false,
        isStart: false,
        isEnd: false
      })
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
      
      if (start && end) {
        isInRange = day.date.isAfter(dayjs(start)) && day.date.isBefore(dayjs(end))
      } else if (start && hover && !end) {
        isInRange = day.date.isAfter(dayjs(start)) && day.date.isBefore(dayjs(hover))
      }
      
      return {
        ...day,
        isSelected: isStart || isEnd,
        isStart,
        isEnd,
        isInRange
      }
    })
  }

  const days = updateDayStyles(getDaysInMonth(currentMonth), tempStart, tempEnd, hoverDate)

  const handleDateClick = (date) => {
    const dateStr = date.format('YYYY-MM-DD')
    
    if (!tempStart || (tempStart && tempEnd)) {
      // Iniciar nueva selección
      setTempStart(dateStr)
      setTempEnd(null)
    } else {
      // Completar rango
      if (dayjs(dateStr).isBefore(tempStart)) {
        setTempEnd(tempStart)
        setTempStart(dateStr)
      } else {
        setTempEnd(dateStr)
      }
    }
  }

  const handleMouseEnter = (date) => {
    if (tempStart && !tempEnd) {
      setHoverDate(date.format('YYYY-MM-DD'))
    }
  }

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onStartChange(tempStart)
      onEndChange(tempEnd)
    } else if (tempStart && !tempEnd) {
      onStartChange(tempStart)
      onEndChange(tempStart)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setTempStart(null)
    setTempEnd(null)
    setHoverDate(null)
    onStartChange('')
    onEndChange('')
    if (onClear) onClear()
    setIsOpen(false)
  }

  const formatDisplayDate = (date) => {
    if (!date) return 'Seleccionar'
    return dayjs(date).format('DD/MM/YYYY')
  }

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'))

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: `1px solid ${startDate || endDate ? '#10b981' : 'var(--border-glow)'}`,
          borderRadius: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          minWidth: '300px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'white' }}>
          <FiCalendar size={14} style={{ color: '#10b981' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: startDate ? 'white' : '#64748b' }}>
              {startDate ? formatDisplayDate(startDate) : 'Fecha Desde'}
            </span>
            <span style={{ color: '#475569' }}>—</span>
            <span style={{ color: endDate ? 'white' : '#64748b' }}>
              {endDate ? formatDisplayDate(endDate) : 'Fecha Hasta'}
            </span>
          </div>
        </div>
        <FiChevronDown size={14} style={{ color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
              background: 'transparent'
            }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 999,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '20px',
            padding: '20px',
            width: '340px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            {/* Cabecera del calendario */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button
                onClick={prevMonth}
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiChevronLeft size={16} />
              </button>
              <div style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>
                {months[currentMonth.month()]} {currentMonth.year()}
              </div>
              <button
                onClick={nextMonth}
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FiChevronRight size={16} />
              </button>
            </div>

            {/* Días de la semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '12px' }}>
              {weekDays.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', fontWeight: '600', padding: '8px 0' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
              {days.map((day, idx) => {
                return (
                  <div
                    key={idx}
                    onClick={() => handleDateClick(day.date)}
                    onMouseEnter={() => handleMouseEnter(day.date)}
                    style={{
                      textAlign: 'center',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      position: 'relative',
                      background: day.isStart || day.isEnd 
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : day.isInRange 
                          ? 'rgba(16, 185, 129, 0.25)'
                          : 'transparent',
                      color: !day.isCurrentMonth 
                        ? '#475569' 
                        : day.isStart || day.isEnd 
                          ? 'white'
                          : '#e2e8f0',
                      fontWeight: day.isStart || day.isEnd ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                  >
                    {day.date.date()}
                    {day.isStart && !day.isEnd && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '4px',
                        height: '4px',
                        background: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                    {day.isEnd && !day.isStart && (
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '4px',
                        height: '4px',
                        background: 'white',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Rango seleccionado */}
            {(tempStart || tempEnd) && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '10px', 
                background: 'rgba(16,185,129,0.08)', 
                borderRadius: '12px',
                fontSize: '11px',
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                <span style={{ color: '#10b981', fontWeight: '500' }}>
                  {tempStart ? formatDisplayDate(tempStart) : '—'}
                </span>
                {' → '}
                <span style={{ color: '#10b981', fontWeight: '500' }}>
                  {tempEnd ? formatDisplayDate(tempEnd) : tempStart ? 'Selecciona fecha final' : '—'}
                </span>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
              <button
                onClick={handleClear}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                Limpiar
              </button>
              <button
                onClick={handleApply}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


// 🔥 COMPONENTE: TimePicker - SUTIL Y OPERATIVO
const TimeRangePicker = ({ startTime, endTime, onStartChange, onEndChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false)

  const formatTime = (time) => {
    if (!time) return '--:--'
    return time
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: `1px solid ${startTime || endTime ? '#10b981' : '#334155'}`,
          borderRadius: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          minWidth: '220px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'white' }}>
          <FiClock size={14} style={{ color: '#10b981' }} />
          <span>
            {startTime || endTime ? (
              <>
                <span>{formatTime(startTime)}</span>
                <span style={{ margin: '0 4px', color: '#475569' }}>-</span>
                <span>{formatTime(endTime)}</span>
              </>
            ) : (
              'Horario'
            )}
          </span>
        </div>
        <FiChevronDown size={14} style={{ color: '#64748b' }} />
      </div>
      
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 999,
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '16px',
            width: '280px',
            marginTop: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>🟢 Desde</div>
                <input
                  type="time"
                  step="1800"
                  value={startTime || ''}
                  onChange={(e) => onStartChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#4ade80',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>🔴 Hasta</div>
                <input
                  type="time"
                  step="1800"
                  value={endTime || ''}
                  onChange={(e) => onEndChange(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#fbbf24',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  onStartChange('')
                  onEndChange('')
                  onClear?.()
                  setIsOpen(false)
                }}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  background: '#10b981',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
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
  
  // 🔥 NUEVOS ESTADOS PARA FILTROS DE TABLA
  const [busquedaTabla, setBusquedaTabla] = useState('')
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('')
  const [filtroFechaFin, setFiltroFechaFin] = useState('')
  const [filtroHoraInicio, setFiltroHoraInicio] = useState('')
  const [filtroHoraFin, setFiltroHoraFin] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const { barco, producto, registros, destinos, loading, error, lastUpdate, refetch } = useYesoData(
    token, transporteSeleccionado, diaSeleccionado, destinoSeleccionado
  )

  // 🔥 APLICAR FILTROS DE TABLA A LOS REGISTROS PARA LOS KPIs
  const registrosConFiltrosTabla = useMemo(() => {
    if (!registros.length) return []
    
    let filtrados = [...registros]
    
    // Búsqueda por placa o correlativo
    if (busquedaTabla.trim()) {
      const busqueda = busquedaTabla.trim().toLowerCase()
      filtrados = filtrados.filter(r => 
        r.placa?.toLowerCase().includes(busqueda) ||
        r.correlativo?.toString().includes(busqueda)
      )
    }
    
    // Filtro por fecha inicio
    if (filtroFechaInicio) {
      filtrados = filtrados.filter(r => r.fecha >= filtroFechaInicio)
    }
    
    // Filtro por fecha fin
    if (filtroFechaFin) {
      filtrados = filtrados.filter(r => r.fecha <= filtroFechaFin)
    }
    
    // Filtro por hora inicio
    if (filtroHoraInicio) {
      filtrados = filtrados.filter(r => {
        if (!r.hora_entrada) return false
        return r.hora_entrada >= filtroHoraInicio
      })
    }
    
    // Filtro por hora fin
    if (filtroHoraFin) {
      filtrados = filtrados.filter(r => {
        if (!r.hora_entrada) return false
        return r.hora_entrada <= filtroHoraFin
      })
    }
    
    return filtrados
  }, [registros, busquedaTabla, filtroFechaInicio, filtroFechaFin, filtroHoraInicio, filtroHoraFin])

  // 🔥 ESTADÍSTICAS CON LOS FILTROS DE TABLA APLICADOS
  const estadisticas = useMemo(() => calcularEstadisticas(registrosConFiltrosTabla), [registrosConFiltrosTabla]);

  // 🔥 FLUJO POR HORA CON FILTROS DE TABLA APLICADOS
  const flujoPorHora = useMemo(() => {
    if (!registrosConFiltrosTabla.length) return []

    const flujoMap = new Map()

    registrosConFiltrosTabla.forEach(reg => {
      let horaKey = ''
      let horaMostrar = ''
      
      if (reg.hora_entrada) {
        const horaPart = reg.hora_entrada.split(':')[0]
        horaKey = `${reg.fecha} ${horaPart}:00`
        horaMostrar = `${horaPart}:00`
      } else if (reg.fecha) {
        horaKey = reg.fecha
        horaMostrar = reg.fecha
      } else {
        return
      }

      if (!flujoMap.has(horaKey)) {
        flujoMap.set(horaKey, {
          hora: horaMostrar,
          horaCompleta: horaKey,
          viajes: 0,
          totalTM: 0,
          promedio: 0,
          viajesFueraRango: 0
        })
      }

      const horaData = flujoMap.get(horaKey)
      horaData.viajes++
      horaData.totalTM += reg.peso_neto_updp_tm || 0
      if (estaFueraDeRango(reg.peso_neto_updp_tm, reg.tipo_unidad)) {
        horaData.viajesFueraRango++
      }
    })

    let flujoArray = Array.from(flujoMap.values()).map(item => ({
      ...item,
      promedio: item.viajes > 0 ? item.totalTM / item.viajes : 0
    }))

    flujoArray.sort((a, b) => a.horaCompleta.localeCompare(b.horaCompleta))

    let acumulado = 0
    flujoArray = flujoArray.map(item => {
      acumulado += item.totalTM
      return { ...item, acumulado }
    })

    return flujoArray
  }, [registrosConFiltrosTabla])

  // 🔥 FLUJO PROMEDIO POR HORA CORREGIDO (TM totales / horas totales)
  const flujoPromedioPorHora = useMemo(() => {
    if (registrosConFiltrosTabla.length === 0) return 0
    
    let horaMin = null
    let horaMax = null
    
    registrosConFiltrosTabla.forEach(reg => {
      if (reg.hora_entrada) {
        const horaStr = `${reg.fecha} ${reg.hora_entrada}`
        const horaDate = dayjs(horaStr)
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

  // 🔥 ORDENAMIENTO DE LA TABLA
  const registrosOrdenados = useMemo(() => {
    if (!registrosConFiltrosTabla.length) return []
    
    const registrosConFecha = registrosConFiltrosTabla.map(reg => ({
      ...reg,
      fechaHoraValue: dayjs(`${reg.fecha} ${reg.hora_entrada || '00:00:00'}`)
    }))
    
    switch(ordenTabla) {
      case 'correlativo_asc':
        return [...registrosConFecha].sort((a, b) => a.correlativo - b.correlativo)
      case 'correlativo_desc':
        return [...registrosConFecha].sort((a, b) => b.correlativo - a.correlativo)
      case 'fecha_asc':
        return [...registrosConFecha].sort((a, b) => {
          if (a.fechaHoraValue.isValid() && b.fechaHoraValue.isValid()) {
            return a.fechaHoraValue.valueOf() - b.fechaHoraValue.valueOf()
          }
          return a.correlativo - b.correlativo
        })
      case 'fecha_desc':
        return [...registrosConFecha].sort((a, b) => {
          if (b.fechaHoraValue.isValid() && a.fechaHoraValue.isValid()) {
            return b.fechaHoraValue.valueOf() - a.fechaHoraValue.valueOf()
          }
          return b.correlativo - a.correlativo
        })
      default:
        return [...registrosConFecha].sort((a, b) => b.correlativo - a.correlativo)
    }
  }, [registrosConFiltrosTabla, ordenTabla])

  useEffect(() => {
    const cargarTodosRegistros = async () => {
      try {
        const { data: barcoData } = await supabase
          .from('barcos')
          .select('id')
          .eq('token_compartido', token)
          .single()

        if (barcoData) {
          const { data: destinosData } = await supabase
            .from('destinos')
            .select('*')
            .eq('activo', true)
          
          const destinosMap = new Map()
          destinosData?.forEach(d => destinosMap.set(d.id, d))
          
          const registrosGlobales = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', 'barco_id', barcoData.id)

          if (registrosGlobales) {
            const completados = registrosGlobales.filter(r => r.estado === 'COMPLETADO')
            const normalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados, destinosMap))
            setTodosLosRegistros(normalizados)
          }
        }
      } catch (error) {
        console.error('Error cargando todos los registros:', error)
      }
    }
    cargarTodosRegistros()
  }, [token])

  const descargarExcel = () => {
    if (!registrosConFiltrosTabla.length) {
      alert('No hay datos para exportar')
      return
    }

    const wb = XLSX.utils.book_new()

    const resumenData = [
      ['BARCO', barco?.nombre || 'N/A'],
      ['CÓDIGO BARCO', barco?.codigo_barco || 'N/A'],
      ['PRODUCTO', 'YESO (YE-001)'],
      ['TOTAL DESCARGADO (TM)', fmtTM(estadisticas.totalNeto, 2)],
      ['TOTAL VIAJES', estadisticas.totalViajes],
      ['PROMEDIO POR VIAJE (TM)', fmtTM(estadisticas.pesoPromedio, 2)],
      ['VIAJES EN RANGO', `${estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} (${estadisticas.porcentajeDentroRango.toFixed(1)}%)`],
      ['VIAJES BAJO PESO', estadisticas.bajoPeso],
      ['VIAJES SOBREPESO', estadisticas.sobrePeso],
      ['META MANIFESTADA (TM)', fmtTM(meta, 2)],
      ['FALTANTE (TM)', fmtTM(faltante, 2)],
      ['EXCEDENTE (TM)', fmtTM(excedente, 2)],
      ['PORCENTAJE DE META', `${porcentajeMeta.toFixed(1)}%`],
      ['FLUJO PROMEDIO (TM/h)', fmtTM(flujoPromedioPorHora, 1)],
      ['FECHA EXPORTACION', dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD HH:mm:ss')],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet([['RESUMEN GENERAL'], ...resumenData.map(r => r)])
    XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_GENERAL')

    const registrosData = registrosConFiltrosTabla.map(r => ({
      'CORRELATIVO': r.correlativo,
      'PLACA': r.placa,
      'TRANSPORTE': r.transporte,
      'TIPO UNIDAD': r.tipo_unidad,
      'DESTINO': r.destino_info ? `${r.destino_info.codigo} - ${r.destino_info.nombre}` : '—',
      'PESO NETO (TM)': r.peso_neto_updp_tm?.toFixed(3),
      'FECHA': r.fecha,
      'HORA ENTRADA': r.hora_entrada,
      'HORA SALIDA': r.hora_salida,
      'TIEMPO': r.tiempo_atencion,
      'ACUMULADO (TM)': r.acumulado_updp_tm?.toFixed(3)
    }))
    const wsRegistros = XLSX.utils.json_to_sheet(registrosData)
    XLSX.utils.book_append_sheet(wb, wsRegistros, 'REGISTROS_FILTRADOS')

    const nombreArchivo = `Yeso_${barco?.nombre || 'descarga'}_${dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD_HHmm')}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }

  const promediosPorTransporte = useMemo(() => {
    const mapa = {}

    todosLosRegistros.forEach(r => {
      const empresa = r.transporte || 'DESCONOCIDO'
      if (!mapa[empresa]) {
        mapa[empresa] = { nombre: empresa, viajes: [], traileta: [], volqueta: [] }
      }
      mapa[empresa].viajes.push(r)

      const tipo = (r.tipo_unidad || '').toUpperCase()
      if (tipo === 'TRAILETA') mapa[empresa].traileta.push(r)
      else if (tipo === 'VOLQUETA') mapa[empresa].volqueta.push(r)
    })

    return Object.values(mapa).map(e => {
      const totalNeto      = e.viajes.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalTraileta  = e.traileta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)
      const totalVolqueta  = e.volqueta.reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0)

      return {
        nombre:           e.nombre,
        totalViajes:      e.viajes.length,
        totalNeto,
        viajesTraileta:   e.traileta.length,
        viajesVolqueta:   e.volqueta.length,
        totalTraileta,
        totalVolqueta,
        promedioTraileta: e.traileta.length > 0 ? totalTraileta / e.traileta.length : null,
        promedioVolqueta: e.volqueta.length > 0 ? totalVolqueta / e.volqueta.length : null,
        fueraRango:       e.viajes.filter(r => estaFueraDeRango(r.peso_neto_updp_tm, r.tipo_unidad)).length,
      }
    }).sort((a, b) => b.totalNeto - a.totalNeto)
  }, [todosLosRegistros])

  const limpiarFiltrosTabla = () => {
    setBusquedaTabla('')
    setFiltroFechaInicio('')
    setFiltroFechaFin('')
    setFiltroHoraInicio('')
    setFiltroHoraFin('')
  }

  const handleSeleccionarTransporte = (transporte) => {
    setTransporteSeleccionado(prev => prev === transporte ? null : transporte)
    limpiarFiltrosTabla()
  }

  const handleSeleccionarDia = (dia) => {
    setDiaSeleccionado(prev => prev === dia ? null : dia)
    limpiarFiltrosTabla()
  }

  const handleSeleccionarDestino = (destinoId) => {
    setDestinoSeleccionado(prev => prev === destinoId ? null : destinoId)
    limpiarFiltrosTabla()
  }

  const limpiarTodosLosFiltros = () => {
    setTransporteSeleccionado(null)
    setDiaSeleccionado(null)
    setDestinoSeleccionado(null)
    limpiarFiltrosTabla()
  }

  const filtroActivoTexto = [
    transporteSeleccionado && `Transporte: ${transporteSeleccionado}`,
    diaSeleccionado && `Día: ${diaSeleccionado}`,
    destinoSeleccionado && `Destino: ${destinos.find(d => d.id === destinoSeleccionado)?.nombre || destinoSeleccionado}`
  ].filter(Boolean).join(' · ') || 'Mostrando todos los datos'

  if (loading && !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px', animation: 'float 2s ease-in-out infinite' }}>⚓</div>
          <div style={{ width: '60px', height: '60px', margin: '0 auto 20px' }}>
            <svg viewBox="0 0 100 100" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="6"/>
              <path d="M50 5 L50 95 M5 50 L95 50" stroke="rgba(16,185,129,0.2)" strokeWidth="2"/>
              <path d="M50 5 A45 45 0 0 1 95 50" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ color: '#a5b4fc', fontWeight: '500', fontSize: '14px', letterSpacing: '1px' }}>CARGANDO DATOS DE YESO</p>
          <p style={{ color: '#475569', fontSize: '12px', marginTop: '8px' }}>Por favor espere...</p>
        </div>
      </div>
    )
  }

  if (error || !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)', padding: '20px' }}>
        <div style={{ background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(20px)', padding: '48px', borderRadius: '32px', maxWidth: '450px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>⚠️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '12px', background: 'linear-gradient(135deg, #f87171, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Error de Conexión</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>{error || 'No se pudieron cargar los datos. Verifique su conexión.'}</p>
        </div>
      </div>
    )
  }

  const datosGraficoTransporte  = Object.entries(estadisticas.porTransporte).map(([name, value]) => ({ name, value }))
  const datosGraficoDia         = Object.entries(estadisticas.porDia).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))
  const datosGraficoDestino     = Object.entries(estadisticas.porDestino).map(([name, value]) => ({ name, value }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
          --bg-primary: #0a0f1e;
          --bg-secondary: #0f172a;
          --bg-card: rgba(30, 41, 59, 0.7);
          --bg-card-solid: #1e293b;
          --border-glow: rgba(16, 185, 129, 0.15);
          --border-glow-hover: rgba(16, 185, 129, 0.4);
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --accent-green: #10b981;
          --accent-green-light: #34d399;
          --accent-cyan: #06b6d4;
          --accent-purple: #8b5cf6;
          --accent-orange: #f59e0b;
          --accent-red: #ef4444;
        }
        
        body {
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, #1a1a3e 100%);
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
        }
        
        .alm-yeso-root {
          min-height: 100vh;
          position: relative;
        }
        
        .alm-yeso-root::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 30%, rgba(16,185,129,0.03) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }
        
        .alm-topbar {
          background: rgba(10, 15, 30, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-glow);
          padding: 0 32px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .alm-logo {
          height: 40px;
          filter: brightness(0) invert(1);
        }
        
        .alm-ship-name {
          font-weight: 800;
          font-size: 18px;
          background: linear-gradient(135deg, #fff, var(--accent-green-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .alm-ship-code {
          font-size: 11px;
          color: #64748b;
          font-family: 'Inter', monospace;
          letter-spacing: 0.5px;
        }
        
        .alm-glass-btn {
          background: rgba(16,185,129,0.1);
          border: 1px solid var(--border-glow);
          border-radius: 12px;
          padding: 8px 20px;
          color: var(--accent-green-light);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        
        .alm-glass-btn:hover {
          background: rgba(16,185,129,0.2);
          border-color: var(--accent-green);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16,185,129,0.2);
        }
        
        .alm-body {
          max-width: 1440px;
          margin: 0 auto;
          padding: 32px;
          position: relative;
          z-index: 1;
        }
        
        .alm-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .alm-kpi-card {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glow);
          border-radius: 24px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .alm-kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent, rgba(16,185,129,0.05));
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .alm-kpi-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-glow-hover);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.3);
        }
        
        .alm-kpi-card:hover::before {
          opacity: 1;
        }
        
        .alm-kpi-icon-wrapper {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08));
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .alm-kpi-value {
          font-size: 32px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          line-height: 1.2;
        }
        
        .alm-kpi-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        
        .alm-section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .alm-section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--border-glow), transparent);
        }
        
        .alm-chart-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .alm-chart-card {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glow);
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s ease;
        }
        
        .alm-chart-card:hover {
          border-color: var(--border-glow-hover);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .alm-chart-wide {
          grid-column: 1 / -1;
        }
        
        .alm-table-container {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glow);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 32px;
        }
        
        .alm-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .alm-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          background: rgba(10, 15, 30, 0.5);
          border-bottom: 1px solid var(--border-glow);
        }
        
        .alm-table td {
          padding: 14px 20px;
          color: var(--text-primary);
          font-size: 13px;
          border-bottom: 1px solid rgba(51, 65, 85, 0.3);
        }
        
        .alm-table tbody tr {
          transition: all 0.2s;
        }
        
        .alm-table tbody tr:hover {
          background: rgba(16, 185, 129, 0.05);
        }
        
        .alm-row-bajo {
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.08), transparent);
          border-left: 3px solid var(--accent-orange);
        }
        
        .alm-row-sobre {
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.08), transparent);
          border-left: 3px solid var(--accent-red);
        }
        
        .alm-badge {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--accent-green-light);
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
        }
        
        .alm-progress-container {
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-glow);
          border-radius: 24px;
          padding: 28px;
          margin-bottom: 32px;
        }
        
        .alm-progress-bar {
          height: 12px;
          background: #1e293b;
          border-radius: 100px;
          overflow: hidden;
          margin: 16px 0;
        }
        
        .alm-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-green), var(--accent-green-light));
          border-radius: 100px;
          transition: width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        
        .alm-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmer 2s infinite;
        }
        
        .alm-search-input {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border-glow);
          border-radius: 12px;
          padding: 10px 16px;
          color: white;
          font-size: 13px;
          width: 250px;
          outline: none;
          transition: all 0.2s;
        }
        
        .alm-search-input:focus {
          border-color: var(--accent-green);
          box-shadow: 0 0 0 2px rgba(16,185,129,0.2);
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .alm-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
          .alm-chart-grid { grid-template-columns: 1fr; }
          .alm-body { padding: 20px; }
        }
        
        @media (max-width: 640px) {
          .alm-kpi-grid { grid-template-columns: 1fr; }
          .alm-topbar { padding: 0 16px; height: 70px; }
          .alm-kpi-value { font-size: 24px; }
          .alm-search-input { width: 100%; }
        }
      `}</style>

      <div className="alm-yeso-root">
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
            <div style={{ width: '1px', height: '40px', background: 'linear-gradient(180deg, transparent, #10b981, transparent)' }} />
            <div>
              <div className="alm-ship-name">{barco.nombre}</div>
              <div className="alm-ship-code">#{barco.codigo_barco} · Yeso YE-001</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={descargarExcel} className="alm-glass-btn">
              <FaFileExcel size={14} />
              Exportar
            </button>
            {(transporteSeleccionado || diaSeleccionado || destinoSeleccionado || busquedaTabla || filtroFechaInicio || filtroFechaFin) && (
              <button onClick={limpiarTodosLosFiltros} className="alm-glass-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                <FiX size={14} />
                Limpiar todo
              </button>
            )}
            <button onClick={refetch} className="alm-glass-btn">
              <FiRefreshCw size={14} />
              Actualizar
            </button>
          </div>
        </header>

        <div className="alm-body">
          {/* Filtro activo */}
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="alm-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiActivity size={12} />
              {filtroActivoTexto}
              {(busquedaTabla || filtroFechaInicio || filtroFechaFin || filtroHoraInicio || filtroHoraFin) && (
                <span style={{ color: '#06b6d4', marginLeft: '8px' }}>
                  · + filtros de tabla
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock size={12} />
              Última actualización: {lastUpdate?.format('HH:mm:ss') || '--:--:--'}
            </div>
          </div>

          {/* KPIs - Primer grupo */}
          <div className="alm-kpi-grid">
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <GiWeightScale size={28} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.totalNeto, 1)} <span style={{ fontSize: '16px' }}>TM</span></div>
                <div className="alm-kpi-label">Total Descargado</div>
              </div>
            </div>
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FiTruck size={28} style={{ color: '#34d399' }} />
              </div>
              <div>
                <div className="alm-kpi-value">{estadisticas.totalViajes.toLocaleString()}</div>
                <div className="alm-kpi-label">Total Viajes</div>
              </div>
            </div>
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FiBarChart2 size={28} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.pesoPromedio, 1)} <span style={{ fontSize: '16px' }}>TM</span></div>
                <div className="alm-kpi-label">Promedio por Viaje</div>
              </div>
            </div>
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FaBuilding size={28} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div className="alm-kpi-value">{promediosPorTransporte.length}</div>
                <div className="alm-kpi-label">Transportistas</div>
              </div>
            </div>
          </div>

          {/* KPIs - Segundo grupo */}
          <div className="alm-kpi-grid">
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FiCheckCircle size={28} style={{ color: '#4ade80' }} />
              </div>
              <div>
                <div className="alm-kpi-value" style={{ color: '#4ade80' }}>{estadisticas.porcentajeDentroRango.toFixed(1)}%</div>
                <div className="alm-kpi-label">En Rango</div>
              </div>
            </div>
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FiAlertCircle size={28} style={{ color: '#f87171' }} />
              </div>
              <div>
                <div className="alm-kpi-value" style={{ color: '#f87171' }}>{estadisticas.unidadesFueraDeRango.length}</div>
                <div className="alm-kpi-label">Fuera de Rango</div>
              </div>
            </div>
            <div className="alm-kpi-card">
              <div className="alm-kpi-icon-wrapper">
                <FiTrendingUp size={28} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="alm-kpi-value">{fmtTM(meta, 1)} <span style={{ fontSize: '16px' }}>TM</span></div>
                <div className="alm-kpi-label">Meta Manifestada</div>
              </div>
            </div>
            <div className="alm-kpi-card" style={{ 
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(16,185,129,0.08))',
              border: '1px solid rgba(6,182,212,0.4)'
            }}>
              <div className="alm-kpi-icon-wrapper" style={{ background: 'rgba(6,182,212,0.2)' }}>
                <FiClock size={28} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <div className="alm-kpi-value">
                  {flujoPromedioPorHora.toFixed(1)} 
                  <span style={{ fontSize: '16px' }}> TM/h</span>
                </div>
                <div className="alm-kpi-label">Ritmo de Descarga</div>
              </div>
            </div>
          </div>

          {/* Progress Bar Meta */}
          {meta > 0 && (
            <div className="alm-progress-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FiTrendingUp size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: '700', color: 'white' }}>Progreso de Descarga vs Meta</span>
                </div>
                <div style={{ 
                  background: tieneExcedente ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)', 
                  padding: '6px 14px', 
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: tieneExcedente ? '#f87171' : '#4ade80'
                }}>
                  {porcentajeMeta.toFixed(1)}% Completado
                </div>
              </div>
              <div className="alm-progress-bar">
                <div className="alm-progress-fill" style={{ width: `${Math.min(porcentajeMeta, 100)}%` }} />
                {tieneExcedente && (
                  <div style={{ 
                    width: `${Math.min(porcentajeMeta - 100, 100)}%`,
                    height: '12px',
                    background: 'linear-gradient(90deg, #ef4444, #f97316)',
                    borderRadius: '0 100px 100px 0',
                    marginTop: '-12px',
                    marginLeft: '100%',
                    transition: 'width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1)'
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>0 TM</span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(meta, 0)} TM</span>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* 🔥 NUEVA TARJETA: PREDICCIÓN DE HORA DE FINALIZACIÓN */}
          {/* ============================================ */}
          {meta > 0 && faltante > 0 && flujoPromedioPorHora > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(16, 185, 129, 0.08))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '24px',
              padding: '20px 28px',
              marginBottom: '32px',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(16, 185, 129, 0.2))',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiClock size={24} style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a78bfa', marginBottom: '4px' }}>
                      PREDICCIÓN APROXIMADA
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>
                      Finalización estimada: {' '}
                      <span style={{ 
                        background: 'linear-gradient(135deg, #a78bfa, #34d399)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: '800'
                      }}>
                        {(() => {
                          const horasRestantes = faltante / flujoPromedioPorHora
                          const ahora = dayjs().tz(ZONA_HORARIA_SV)
                          const horaEstimada = ahora.add(horasRestantes, 'hour')
                          return horaEstimada.format('HH:mm [hrs] · DD/MM/YYYY')
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#fbbf24' }}>
                      {faltante.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '400' }}>TM</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Faltante por descargar</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(139, 92, 246, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#4ade80' }}>
                      {flujoPromedioPorHora.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '400' }}>TM/h</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Ritmo actual de descarga</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(139, 92, 246, 0.3)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa' }}>
                      {(faltante / flujoPromedioPorHora).toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '400' }}>hrs</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Tiempo restante estimado</div>
                  </div>
                </div>
              </div>
              
             
            </div>
          )}

          {/* Si ya se alcanzó la meta, mostrar mensaje de éxito */}
          {meta > 0 && faltante <= 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.08))',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '24px',
              padding: '20px 28px',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <FiCheckCircle size={28} style={{ color: '#4ade80' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#4ade80' }}>¡META ALCANZADA!</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Se ha completado la descarga de {fmtTM(meta, 0)} TM de Yeso
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transportistas */}
          {promediosPorTransporte.length > 0 && (
            <>
              <div className="alm-section-title">
                <FaBuilding size={14} />
                Empresas Transportistas
                <span className="alm-badge">{promediosPorTransporte.length} activas</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {promediosPorTransporte.map(empresa => {
                  const isSelected = transporteSeleccionado === empresa.nombre
                  return (
                    <div
                      key={empresa.nombre}
                      onClick={() => handleSeleccionarTransporte(empresa.nombre)}
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))' : 'var(--bg-card)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${isSelected ? '#10b981' : 'var(--border-glow)'}`,
                        borderRadius: '20px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'scale(1.02)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '700', color: 'white', fontSize: '16px' }}>{empresa.nombre}</span>
                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                          {fmtTM(empresa.totalNeto, 1)} TM
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span><FiTruck size={12} style={{ display: 'inline', marginRight: '4px' }} /> {empresa.totalViajes} viajes</span>
                        {empresa.viajesTraileta > 0 && <span><FaTrailer size={12} style={{ display: 'inline', marginRight: '4px' }} /> Traileta: {fmtTM(empresa.promedioTraileta, 1)} TM</span>}
                        {empresa.viajesVolqueta > 0 && <span><GiCoalWagon size={12} style={{ display: 'inline', marginRight: '4px' }} /> Volqueta: {fmtTM(empresa.promedioVolqueta, 1)} TM</span>}
                      </div>
                      {empresa.fueraRango > 0 && (
                        <div style={{ fontSize: '11px', color: '#f87171', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiAlertCircle size={11} /> {empresa.fueraRango} viajes fuera del rango óptimo
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
              <div className="alm-section-title" style={{ marginBottom: '20px' }}>
                <FaChartPie size={14} />
                Distribución por Transporte
              </div>
              {datosGraficoTransporte.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={datosGraficoTransporte} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoTransporte.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Sin datos disponibles</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title" style={{ marginBottom: '20px' }}>
                <FaWarehouse size={14} />
                Distribución por Destino
              </div>
              {datosGraficoDestino.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={datosGraficoDestino} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => {
                      const short = name.length > 18 ? name.substring(0, 15) + '..' : name.split(' ')[0]
                      return `${short} ${(percent * 100).toFixed(0)}%`
                    }} labelLine={false}>
                      {datosGraficoDestino.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Sin datos disponibles</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title" style={{ marginBottom: '20px' }}>
                <FiCalendar size={14} />
                Descarga por Día
                {diaSeleccionado && <span className="alm-badge">Filtro: {diaSeleccionado}</span>}
              </div>
              {datosGraficoDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={datosGraficoDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                    <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} onClick={(data) => handleSeleccionarDia(data.dia)} cursor="pointer">
                      {datosGraficoDia.map((entry, idx) => (
                        <Cell key={idx} fill={diaSeleccionado === entry.dia ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Sin datos disponibles</div>}
              <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', marginTop: '12px' }}>
                <FiCalendar size={10} style={{ display: 'inline', marginRight: '4px' }} /> Haz clic en cualquier barra para filtrar por día
              </div>
            </div>

            <div className="alm-chart-card">
              <div className="alm-section-title" style={{ marginBottom: '20px' }}>
                <FaChartLine size={14} />
                Distribución de Pesos por Viaje
              </div>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '20px', fontSize: '11px', flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', marginRight: '6px' }}></span>En Rango</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px', marginRight: '6px' }}></span>Bajo Peso</span>
                <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px', marginRight: '6px' }}></span>Sobrepeso</span>
              </div>
              {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={estadisticas.acumuladoPorCorrelativo.slice(-30)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="correlativo" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                    <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                      {estadisticas.acumuladoPorCorrelativo.slice(-30).map((entry, idx) => (
                        <Cell key={idx} fill={getColorPorEstado(entry.estado)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Sin datos disponibles</div>}
            </div>
          </div>

          {/* Flujo por Hora */}
          <div className="alm-chart-card alm-chart-wide">
            <div className="alm-section-title" style={{ marginBottom: '20px' }}>
              <FiClock size={14} />
              Flujo de Descarga por Hora
            </div>
            {flujoPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <ComposedChart data={flujoPorHora}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} />
                  <Bar yAxisId="left" dataKey="totalTM" fill="#10b981" opacity={0.8} radius={[6, 6, 0, 0]} name="TM por Hora" />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#f59e0b" strokeWidth={3} dot={false} name="Acumulado Total" />
                  <Area yAxisId="right" type="monotone" dataKey="acumulado" fill="url(#areaGradient)" stroke="none" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
                <FiClock size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <p>No hay datos horarios disponibles</p>
              </div>
            )}
          </div>

          {/* TABLA DE REGISTROS CON FILTROS */}
          <div className="alm-table-container">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-glow)' }}>
              {/* Fila superior: Título y ordenamiento */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FaClipboardList size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: '700', color: 'white' }}>Registros de Descarga</span>
                  <span className="alm-badge">{registrosConFiltrosTabla.length} / {registros.length} viajes</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setOrdenTabla('correlativo_desc')} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', background: ordenTabla === 'correlativo_desc' ? 'rgba(16,185,129,0.2)' : 'transparent', border: `1px solid ${ordenTabla === 'correlativo_desc' ? '#10b981' : '#334155'}`, color: ordenTabla === 'correlativo_desc' ? '#10b981' : '#94a3b8' }}>
                    <FiArrowDown size={12} style={{ display: 'inline', marginRight: '6px' }} /> Correlativo ↓
                  </button>
                  <button onClick={() => setOrdenTabla('correlativo_asc')} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', background: ordenTabla === 'correlativo_asc' ? 'rgba(16,185,129,0.2)' : 'transparent', border: `1px solid ${ordenTabla === 'correlativo_asc' ? '#10b981' : '#334155'}`, color: ordenTabla === 'correlativo_asc' ? '#10b981' : '#94a3b8' }}>
                    <FiArrowUp size={12} style={{ display: 'inline', marginRight: '6px' }} /> Correlativo ↑
                  </button>
                  <button onClick={() => setOrdenTabla('fecha_desc')} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', background: ordenTabla === 'fecha_desc' ? 'rgba(16,185,129,0.2)' : 'transparent', border: `1px solid ${ordenTabla === 'fecha_desc' ? '#10b981' : '#334155'}`, color: ordenTabla === 'fecha_desc' ? '#10b981' : '#94a3b8' }}>
                    <FiCalendar size={12} style={{ display: 'inline', marginRight: '6px' }} /> Más Reciente
                  </button>
                  <button onClick={() => setOrdenTabla('fecha_asc')} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', background: ordenTabla === 'fecha_asc' ? 'rgba(16,185,129,0.2)' : 'transparent', border: `1px solid ${ordenTabla === 'fecha_asc' ? '#10b981' : '#334155'}`, color: ordenTabla === 'fecha_asc' ? '#10b981' : '#94a3b8' }}>
                    <FiCalendar size={12} style={{ display: 'inline', marginRight: '6px' }} /> Más Antiguo
                  </button>
                  <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', background: mostrarFiltros ? 'rgba(6,182,212,0.2)' : 'transparent', border: `1px solid ${mostrarFiltros ? '#06b6d4' : '#334155'}`, color: mostrarFiltros ? '#06b6d4' : '#94a3b8' }}>
                    <FiFilter size={12} style={{ display: 'inline', marginRight: '6px' }} /> Filtros
                  </button>
                </div>
              </div>

              {/* BARRA DE BÚSQUEDA */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ position: 'relative', maxWidth: '350px' }}>
                  <FiSearchIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Buscar por placa o correlativo..."
                    value={busquedaTabla}
                    onChange={(e) => setBusquedaTabla(e.target.value)}
                    className="alm-search-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                  />
                </div>
              </div>

              {/* FILTROS AVANZADOS - Con calendario visual */}
              {mostrarFiltros && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '20px', 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  borderRadius: '16px',
                  border: '1px solid var(--border-glow)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#06b6d4', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCalendarAlt size={14} /> Filtros Avanzados
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {/* Selector de Rango de Fechas con CALENDARIO VISUAL */}
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Rango de Fechas</label>
                      <DateRangePicker
                        startDate={filtroFechaInicio}
                        endDate={filtroFechaFin}
                        onStartChange={setFiltroFechaInicio}
                        onEndChange={setFiltroFechaFin}
                        onClear={() => {
                          setFiltroFechaInicio('')
                          setFiltroFechaFin('')
                        }}
                      />
                    </div>
                    
                    {/* Selector de Rango de Horas */}
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px' }}>Rango de Horas</label>
                      <TimeRangePicker
                        startTime={filtroHoraInicio}
                        endTime={filtroHoraFin}
                        onStartChange={setFiltroHoraInicio}
                        onEndChange={setFiltroHoraFin}
                        onClear={() => {
                          setFiltroHoraInicio('')
                          setFiltroHoraFin('')
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de filtros activos */}
              {(busquedaTabla || filtroFechaInicio || filtroFechaFin || filtroHoraInicio || filtroHoraFin) && (
                <div style={{ fontSize: '11px', color: '#06b6d4', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <FiFilter size={10} />
                  <span>Filtros activos:</span>
                  {busquedaTabla && <span className="alm-badge" style={{ fontSize: '10px' }}><FiSearchIcon size={10} style={{ display: 'inline', marginRight: '4px' }} /> {busquedaTabla}</span>}
                  {filtroFechaInicio && filtroFechaFin && (
                    <span className="alm-badge" style={{ fontSize: '10px' }}>
                      <FaCalendarAlt size={10} style={{ display: 'inline', marginRight: '4px' }} /> 
                      {dayjs(filtroFechaInicio).format('DD/MM/YYYY')} - {dayjs(filtroFechaFin).format('DD/MM/YYYY')}
                    </span>
                  )}
                  {(filtroHoraInicio || filtroHoraFin) && (
                    <span className="alm-badge" style={{ fontSize: '10px' }}>
                      <FiClock size={10} style={{ display: 'inline', marginRight: '4px' }} /> 
                      {filtroHoraInicio || '00:00'} - {filtroHoraFin || '23:59'}
                    </span>
                  )}
                  <button onClick={limpiarFiltrosTabla} style={{ fontSize: '10px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '8px' }}>
                    Limpiar todo
                  </button>
                </div>
              )}
            </div>

            {/* TABLA */}
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="alm-table">
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
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
                      <td colSpan="9" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <FiSearchIcon size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>No se encontraron registros con los filtros aplicados</p>
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
                          <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{reg.correlativo}</td>
                          <td style={{ fontFamily: 'monospace' }}>{reg.placa}</td>
                          <td>{reg.transporte || '—'}</td>
                          <td><span style={{ background: reg.tipo_unidad === 'TRAILETA' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px' }}>{reg.tipo_unidad || '—'}</span></td>
                          <td>
                            {reg.destino_info && (
                              <span style={{ background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleSeleccionarDestino(reg.destino_id)}>
                                {reg.destino_info.codigo}
                              </span>
                            )}
                          </td>
                          <td>{reg.fecha}</td>
                          <td>{reg.hora_entrada || '—'}</td>
                          <td style={{ fontWeight: '700', color: estado === 'bajo' ? '#f59e0b' : (estado === 'sobre' ? '#f87171' : '#4ade80') }}>
                            {reg.peso_neto_updp_tm?.toFixed(2)} TM
                          </td>
                          <td style={{ fontFamily: 'monospace', color: '#fbbf24' }}>{reg.acumulado_updp_tm?.toFixed(2)} TM</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '28px 20px', borderTop: '1px solid rgba(51,65,85,0.3)', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiRefreshCw size={11} /> Auto-refresh 30s</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><GiCargoShip size={11} /> {barco.nombre}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><GiMinerals size={11} /> Yeso YE-001</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaDatabase size={11} /> {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 1)} TM</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '10px' }}>
              <span><GiCoalWagon size={10} style={{ display: 'inline', marginRight: '4px' }} /> VOLQUETA: 14-18 TM</span>
              <span><FaTrailer size={10} style={{ display: 'inline', marginRight: '4px' }} /> TRAILETA: 22-26 TM</span>
              <span style={{ color: '#f87171' }}><FiAlertCircle size={10} style={{ display: 'inline', marginRight: '4px' }} /> Sobrepeso</span>
              <span style={{ color: '#f59e0b' }}><FiAlertCircle size={10} style={{ display: 'inline', marginRight: '4px' }} /> Bajo peso</span>
              <span style={{ color: '#4ade80' }}><FiCheckCircle size={10} style={{ display: 'inline', marginRight: '4px' }} /> En rango</span>
            </div>
            <div style={{ marginTop: '16px', fontSize: '10px', color: '#334155' }}>
              ALMAPAC · Sistema de Gestión de Descarga de Yeso
            </div>
          </div>
        </div>
      </div>
    </>
  )
}