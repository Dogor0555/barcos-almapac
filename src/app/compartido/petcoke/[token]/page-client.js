// compartido/petcoke/[token]/page-client.js
"use client";

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, LineChart, Line
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
  FiChevronDown, FiChevronUp
} from 'react-icons/fi'
import { 
  FaWeightHanging, FaIndustry, FaBuilding, FaTachometerAlt,
  FaTrailer, FaMountain, FaChartPie, FaChartLine, FaDatabase,
  FaClipboardList, FaFileExcel
} from 'react-icons/fa'
import { GiCoalWagon, GiWeightScale } from 'react-icons/gi'

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

const COLORES = ["#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5"]
const COLORES_PATIO = { "NORTE": "#3b82f6", "SUR": "#22c55e" }

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
  if (estado === 'bajo') return '#fbbf24'
  if (estado === 'sobre') return '#ef4444'
  return '#4ade80'
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
const normalizarRegistro = (reg, index, registrosAnteriores) => {
  // Calcular acumulado progresivo basado en correlativo o fecha_entrada
  let acumulado = 0
  if (registrosAnteriores) {
    // Buscar registros con correlativo menor
    const anteriores = registrosAnteriores.filter(r => r.correlativo < reg.correlativo)
    acumulado = anteriores.reduce((sum, r) => sum + (Number(r.peso_neto) || 0), 0)
    acumulado += (Number(reg.peso_neto) || 0)
  }
  
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
    patio: reg.patio_entrada || 'SIN PATIO',
    bodega_barco: reg.bodega_barco,
    // Campos normalizados para el dashboard (sufijo _updp_tm)
    peso_bruto_updp_tm: Number(reg.peso_bruto) || 0,
    peso_neto_updp_tm: Number(reg.peso_neto) || 0,
    acumulado_updp_tm: acumulado,
    estado: reg.estado || 'COMPLETADO',
    // Para ordenamiento
    fechaHoraOrden: `${reg.fecha_entrada || ''} ${reg.hora_entrada || ''}`
  }
}

function usePetCokeData(token, transporteFiltro = null, diaFiltro = null) {
  const [data, setData] = useState({
    barco: null,
    producto: null,
    registros: [],
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
        .eq('codigo', 'PC-001')
        .single()

      if (productoError || !productoData) throw new Error('Producto PET COKE no encontrado')

      // 🔥 CONSULTA SIN LÍMITE - TRAE TODOS LOS REGISTROS
      const registrosRaw = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', 'barco_id', barcoData.id)

      // Filtrar solo registros COMPLETADOS
      const completados = (registrosRaw || []).filter(r => r.estado === 'COMPLETADO')
      
      // Normalizar los registros
      let registrosNormalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados))

      // Aplicar filtros
      if (transporteFiltro) {
        registrosNormalizados = registrosNormalizados.filter(r => r.transporte === transporteFiltro)
      }

      if (diaFiltro) {
        registrosNormalizados = registrosNormalizados.filter(r => r.fecha === diaFiltro)
      }

      setData({
        barco: barcoData,
        producto: productoData,
        registros: registrosNormalizados,
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
  }, [token, transporteFiltro, diaFiltro])

  return { ...data, refetch: cargar }
}

// ============================================
// FUNCIÓN PARA CALCULAR ESTADÍSTICAS (AGREGADA)
// ============================================
const calcularEstadisticas = (registros) => {
    if (!registros.length) return {
        totalNeto: 0, totalBruto: 0, totalViajes: 0,
        porTransporte: {}, porDia: {}, porPatio: {},
        acumuladoPorCorrelativo: [], unidadesFueraDeRango: [],
        totalNorte: 0, totalSur: 0, pesoPromedio: 0, porcentajeDentroRango: 0,
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

    const porPatio = {};
    registros.forEach(r => {
        const p = r.patio || 'SIN PATIO';
        porPatio[p] = (porPatio[p] || 0) + (r.peso_neto_updp_tm || 0);
    });

    const totalNorte = registros.filter(r => r.patio === 'NORTE').reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0);
    const totalSur = registros.filter(r => r.patio === 'SUR').reduce((s, r) => s + (r.peso_neto_updp_tm || 0), 0);

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
        totalNeto, totalBruto, totalViajes, porTransporte, porDia, porPatio,
        acumuladoPorCorrelativo, unidadesFueraDeRango, totalNorte, totalSur,
        pesoPromedio, porcentajeDentroRango, bajoPeso, sobrePeso
    };
};

export default function ClientPage({ token }) {
  const [transporteSeleccionado, setTransporteSeleccionado] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [todosLosRegistros, setTodosLosRegistros] = useState([])
  const [ordenTabla, setOrdenTabla] = useState('reciente') // 'reciente' o 'antiguo'

  const { barco, producto, registros, loading, error, lastUpdate, refetch } = usePetCokeData(token, transporteSeleccionado, diaSeleccionado)

  // Calcular estadísticas usando la función agregada
  const estadisticas = useMemo(() => calcularEstadisticas(registros), [registros]);

  // Calcular faltante de descarga y excedente
  const meta = barco?.metas_json?.limites?.['PC-001'] || 0
  const faltante = Math.max(0, meta - estadisticas.totalNeto)
  const excedente = Math.max(0, estadisticas.totalNeto - meta)  // 🔥 EXCEDENTE: lo que sobrepasa la meta
  const porcentajeMeta = meta > 0 ? (estadisticas.totalNeto / meta) * 100 : 0
  const metaCompletada = porcentajeMeta >= 100
  const tieneExcedente = excedente > 0

  // Ordenar registros para la tabla (más reciente al último o viceversa)
  const registrosOrdenados = useMemo(() => {
    if (!registros.length) return []
    
    const registrosConFecha = registros.map(reg => ({
      ...reg,
      fechaHoraValue: dayjs(`${reg.fecha} ${reg.hora_entrada || '00:00:00'}`)
    }))
    
    if (ordenTabla === 'reciente') {
      return [...registrosConFecha].sort((a, b) => {
        if (b.fechaHoraValue.isValid() && a.fechaHoraValue.isValid()) {
          return b.fechaHoraValue.valueOf() - a.fechaHoraValue.valueOf()
        }
        return b.correlativo - a.correlativo
      })
    } else {
      return [...registrosConFecha].sort((a, b) => {
        if (a.fechaHoraValue.isValid() && b.fechaHoraValue.isValid()) {
          return a.fechaHoraValue.valueOf() - b.fechaHoraValue.valueOf()
        }
        return a.correlativo - b.correlativo
      })
    }
  }, [registros, ordenTabla])

  // 🔥 Cargar todos los registros sin límite para estadísticas globales
  useEffect(() => {
    const cargarTodosRegistros = async () => {
      try {
        const { data: barcoData } = await supabase
          .from('barcos')
          .select('id')
          .eq('token_compartido', token)
          .single()

        if (barcoData) {
          // 🔥 Usar la función sin límite
          const registrosGlobales = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', 'barco_id', barcoData.id)

          if (registrosGlobales) {
            const completados = registrosGlobales.filter(r => r.estado === 'COMPLETADO')
            const normalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados))
            setTodosLosRegistros(normalizados)
            console.log(`📊 Dashboard: ${normalizados.length} registros globales cargados`)
          }
        }
      } catch (error) {
        console.error('Error cargando todos los registros:', error)
      }
    }
    cargarTodosRegistros()
  }, [token])

// ============================================================
// 1. PRIMERO: cambia el import en la parte superior del archivo
//    de:  import * as XLSX from 'xlsx'
//    a:   import * as XLSX from 'xlsx-js-style'
//
// 2. Instala el paquete:
//    npm install xlsx-js-style
//
// 3. Reemplaza TODA la función descargarExcel con esto:
// ============================================================

const descargarExcel = () => {
  if (!registros.length) {
    alert('No hay datos para exportar')
    return
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS DE ESTILO
  // ─────────────────────────────────────────────────────────────
  const S = {
    // Encabezado naranja (hojas principales)
    header: (align = 'center') => ({
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FF6600' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center', wrapText: false },
      border: {
        top:    { style: 'thin', color: { rgb: 'CC4400' } },
        bottom: { style: 'thin', color: { rgb: 'CC4400' } },
        left:   { style: 'thin', color: { rgb: 'CC4400' } },
        right:  { style: 'thin', color: { rgb: 'CC4400' } },
      }
    }),
    // Fila de dato normal (blanco)
    data: (align = 'left', bold = false) => ({
      font: { bold, color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    // Fila de TOTAL en amarillo (como en la imagen)
    total: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFFF00' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top:    { style: 'medium', color: { rgb: '999900' } },
        bottom: { style: 'medium', color: { rgb: '999900' } },
        left:   { style: 'thin',   color: { rgb: '999900' } },
        right:  { style: 'thin',   color: { rgb: '999900' } },
      }
    }),
    // Título de transportista (azul claro, como en la imagen)
    transportTitle: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 12, name: 'Calibri' },
      fill: { fgColor: { rgb: 'ADD8E6' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top:    { style: 'medium', color: { rgb: '4A90C4' } },
        bottom: { style: 'medium', color: { rgb: '4A90C4' } },
        left:   { style: 'medium', color: { rgb: '4A90C4' } },
        right:  { style: 'medium', color: { rgb: '4A90C4' } },
      }
    }),
    // Subtítulo TRAILETAS / VOLQUETAS (azul medio)
    subtypeTitle: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'BDD7EE' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: '4A90C4' } },
        bottom: { style: 'thin', color: { rgb: '4A90C4' } },
        left:   { style: 'thin', color: { rgb: '4A90C4' } },
        right:  { style: 'thin', color: { rgb: '4A90C4' } },
      }
    }),
    // Encabezado de columnas dentro de cada sección (gris claro)
    colHeader: (align = 'center') => ({
      font: { bold: true, color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'D9D9D9' }, patternType: 'solid' },
      alignment: { horizontal: align, vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: '999999' } },
        bottom: { style: 'thin', color: { rgb: '999999' } },
        left:   { style: 'thin', color: { rgb: '999999' } },
        right:  { style: 'thin', color: { rgb: '999999' } },
      }
    }),
    // Celda vacía de relleno
    empty: () => ({
      fill: { fgColor: { rgb: 'FFFFFF' }, patternType: 'solid' }
    }),
    // Separador entre secciones (fila en blanco con fondo gris suave)
    separator: () => ({
      fill: { fgColor: { rgb: 'F2F2F2' }, patternType: 'solid' }
    }),
    // Estado BAJO PESO (amarillo suave)
    bajoPeso: () => ({
      font: { bold: true, color: { rgb: '7D5100' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    // Estado SOBREPESO (rojo suave)
    sobrePeso: () => ({
      font: { bold: true, color: { rgb: '9C0006' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'FFCCCC' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
    // Estado EN RANGO (verde suave)
    enRango: () => ({
      font: { bold: false, color: { rgb: '276221' }, sz: 10, name: 'Calibri' },
      fill: { fgColor: { rgb: 'E2EFDA' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
        right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
      }
    }),
  }

  // Helper: crea una celda con valor y estilo
  const C = (v, style) => ({ v, s: style, t: typeof v === 'number' ? 'n' : 's' })

  // Helper: aplica estilos a hoja generada con json_to_sheet (naranja headers)
  const aplicarEstilosExcel = (ws) => {
    if (!ws?.['!ref']) return
    const range = XLSX.utils.decode_range(ws['!ref'])
    for (let C_ = range.s.c; C_ <= range.e.c; ++C_) {
      const ca = XLSX.utils.encode_cell({ r: range.s.r, c: C_ })
      if (ws[ca]) ws[ca].s = S.header()
    }
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C_ = range.s.c; C_ <= range.e.c; ++C_) {
        const ca = XLSX.utils.encode_cell({ r: R, c: C_ })
        if (ws[ca]) ws[ca].s = S.data('left')
      }
    }
    ws['!rows'] = ws['!rows'] || []
    ws['!rows'][range.s.r] = { hpt: 22 }
  }

  // Helper: escribe una fila de celdas en la hoja
  const writeRow = (ws, rowIdx, cols, cells) => {
    cells.forEach((cell, c) => {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c })
      ws[addr] = cell
    })
    // Actualizar !ref
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
  // HOJA 1: RESUMEN_POR_UNIDAD  (la que faltaba — como en la imagen)
  // Estructura por transportista:
  //   [NOMBRE TRANSPORTE]         ← azul claro, span 3 cols
  //   [TRAILETAS]                 ← azul medio, span 3 cols
  //   UNIDAD | VIAJES | TONELADAS ← headers grises
  //   placa  |  n     |  xxx      ← filas blancas
  //   TOTAL  |  n     |  xxx      ← fila amarilla
  //   [fila vacía separadora]
  //   [VOLQUETAS]                 ← azul medio, span 3 cols
  //   UNIDAD | VIAJES | TONELADAS
  //   ...
  //   TOTAL
  //   [fila vacía]
  //   [TOTAL VOLQUETAS Y TRAILETAS] ← azul claro span 3
  //   VIAJES | TONELADAS (TM)       ← headers grises 2 cols
  //   n      | xxx                  ← fila blanca
  //   [2 filas vacías entre transportistas]
  // ─────────────────────────────────────────────────────────────

  // Agrupar registros por transportista → tipo → placa
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

  const COLS_UNIDAD = 3   // UNIDAD | VIAJES | TONELADAS
  const ws1 = { '!ref': 'A1:C1', '!cols': [{ wch: 18 }, { wch: 10 }, { wch: 16 }], '!rows': [] }
  let row = 0

  Object.entries(porTransporte)
    .sort((a, b) => {
      const sumA = Object.values(a[1].TRAILETA).reduce((s, v) => s + v.toneladas, 0)
                 + Object.values(a[1].VOLQUETA).reduce((s, v) => s + v.toneladas, 0)
      const sumB = Object.values(b[1].TRAILETA).reduce((s, v) => s + v.toneladas, 0)
                 + Object.values(b[1].VOLQUETA).reduce((s, v) => s + v.toneladas, 0)
      return sumB - sumA
    })
    .forEach(([transporteName, tipos]) => {

      const trailetas = Object.entries(tipos.TRAILETA).sort((a,b) => b[1].toneladas - a[1].toneladas)
      const volquetas  = Object.entries(tipos.VOLQUETA).sort((a,b) => b[1].toneladas - a[1].toneladas)
      const totalTraiVj = trailetas.reduce((s,[,v]) => s + v.viajes,    0)
      const totalTraiTm = trailetas.reduce((s,[,v]) => s + v.toneladas, 0)
      const totalVolvj  = volquetas.reduce((s,[,v])  => s + v.viajes,    0)
      const totalVolTm  = volquetas.reduce((s,[,v])  => s + v.toneladas, 0)
      const totalVj     = totalTraiVj + totalVolvj
      const totalTm     = totalTraiTm + totalVolTm

      // Fila: NOMBRE TRANSPORTISTA (span 3, azul claro)
      ws1['!rows'][row] = { hpt: 22 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C(transporteName, S.transportTitle('center')),
        C('',             S.transportTitle('center')),
        C('',             S.transportTitle('center')),
      ])
      row++

      // ── SECCIÓN TRAILETAS ──
      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TRAILETAS', S.subtypeTitle()),
        C('',          S.subtypeTitle()),
        C('',          S.subtypeTitle()),
      ])
      row++

      // Headers de columna
      writeRow(ws1, row, COLS_UNIDAD, [
        C('UNIDAD',    S.colHeader('left')),
        C('VIAJES',    S.colHeader('center')),
        C('TONELADAS', S.colHeader('center')),
      ])
      row++

      if (trailetas.length === 0) {
        writeRow(ws1, row, COLS_UNIDAD, [
          C('Sin registros', S.data('center')),
          C('',              S.data('center')),
          C('',              S.data('center')),
        ])
        row++
      } else {
        trailetas.forEach(([placa, v]) => {
          writeRow(ws1, row, COLS_UNIDAD, [
            C(placa,                              S.data('left')),
            C(v.viajes,                           S.data('center')),
            C(Math.round(v.toneladas),            S.data('right')),
          ])
          row++
        })
      }

      // Fila TOTAL trailetas (amarilla)
      ws1['!rows'][row] = { hpt: 20 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL',                   S.total('left')),
        C(totalTraiVj,               S.total('center')),
        C(Math.round(totalTraiTm),   S.total('right')),
      ])
      row++

      // Fila separadora
      writeRow(ws1, row, COLS_UNIDAD, [C('', S.separator()), C('', S.separator()), C('', S.separator())])
      row++

      // ── SECCIÓN VOLQUETAS ──
      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('VOLQUETAS', S.subtypeTitle()),
        C('',          S.subtypeTitle()),
        C('',          S.subtypeTitle()),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C('UNIDAD',    S.colHeader('left')),
        C('VIAJES',    S.colHeader('center')),
        C('TONELADAS', S.colHeader('center')),
      ])
      row++

      if (volquetas.length === 0) {
        writeRow(ws1, row, COLS_UNIDAD, [
          C('Sin registros', S.data('center')),
          C('',              S.data('center')),
          C('',              S.data('center')),
        ])
        row++
      } else {
        volquetas.forEach(([placa, v]) => {
          writeRow(ws1, row, COLS_UNIDAD, [
            C(placa,                   S.data('left')),
            C(v.viajes,                S.data('center')),
            C(Math.round(v.toneladas), S.data('right')),
          ])
          row++
        })
      }

      // Fila TOTAL volquetas (amarilla)
      ws1['!rows'][row] = { hpt: 20 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL',                  S.total('left')),
        C(totalVolvj,               S.total('center')),
        C(Math.round(totalVolTm),   S.total('right')),
      ])
      row++

      // Separador
      writeRow(ws1, row, COLS_UNIDAD, [C('', S.separator()), C('', S.separator()), C('', S.separator())])
      row++

      // ── TOTAL VOLQUETAS Y TRAILETAS ──
      ws1['!rows'][row] = { hpt: 18 }
      writeRow(ws1, row, COLS_UNIDAD, [
        C('TOTAL VOLQUETAS Y TRAILETAS', S.transportTitle('center')),
        C('',                            S.transportTitle('center')),
        C('',                            S.transportTitle('center')),
      ])
      row++

      // Solo 2 columnas: VIAJES | TONELADAS (TM)
      writeRow(ws1, row, COLS_UNIDAD, [
        C('VIAJES',         S.colHeader('center')),
        C('TONELADAS (TM)', S.colHeader('center')),
        C('',               S.colHeader('center')),
      ])
      row++

      writeRow(ws1, row, COLS_UNIDAD, [
        C(totalVj,               S.data('center')),
        C(Math.round(totalTm),   S.data('right')),
        C('',                    S.data('center')),
      ])
      row++

      // 2 filas vacías de separación entre transportistas
      writeRow(ws1, row, COLS_UNIDAD, [C('', S.empty()), C('', S.empty()), C('', S.empty())])
      row++
      writeRow(ws1, row, COLS_UNIDAD, [C('', S.empty()), C('', S.empty()), C('', S.empty())])
      row++
    })

  // Actualizar !ref final
  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: COLS_UNIDAD - 1 } })
  XLSX.utils.book_append_sheet(wb, ws1, 'RESUMEN_POR_UNIDAD')

  // ─────────────────────────────────────────────────────────────
  // HOJA 2: RESUMEN_TRANSPORTES (con colores naranja)
  // ─────────────────────────────────────────────────────────────
  const wsTransporte = XLSX.utils.json_to_sheet(resumenTransporte)
  wsTransporte['!cols'] = [
    { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 16 }
  ]
  aplicarEstilosExcel(wsTransporte)
  XLSX.utils.book_append_sheet(wb, wsTransporte, 'RESUMEN_TRANSPORTES')

  // ─────────────────────────────────────────────────────────────
  // HOJA 3: RESUMEN_POR_PLACA
  // ─────────────────────────────────────────────────────────────
  const wsPlaca = XLSX.utils.json_to_sheet(resumenPlaca)
  wsPlaca['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 25 }, { wch: 18 }, { wch: 22 }]
  aplicarEstilosExcel(wsPlaca)
  XLSX.utils.book_append_sheet(wb, wsPlaca, 'RESUMEN_POR_PLACA')

  // ─────────────────────────────────────────────────────────────
  // HOJA 4: RESUMEN_GENERAL
  // ─────────────────────────────────────────────────────────────
  const filtrosActivos = []
  if (transporteSeleccionado) filtrosActivos.push(`Transporte: ${transporteSeleccionado}`)
  if (diaSeleccionado) filtrosActivos.push(`Dia: ${diaSeleccionado}`)
  const filtroTexto = filtrosActivos.length ? filtrosActivos.join(' · ') : 'Todos los datos'

  const resumenData = [
    { 'METRICA': 'BARCO',                    'VALOR': barco?.nombre || 'N/A' },
    { 'METRICA': 'CODIGO BARCO',             'VALOR': barco?.codigo_barco || 'N/A' },
    { 'METRICA': 'TOTAL DESCARGADO (TM)',    'VALOR': fmtTM(estadisticas.totalNeto, 2) },
    { 'METRICA': 'TOTAL VIAJES',             'VALOR': estadisticas.totalViajes },
    { 'METRICA': 'PROMEDIO POR VIAJE (TM)',  'VALOR': fmtTM(estadisticas.pesoPromedio, 2) },
    { 'METRICA': 'VIAJES EN RANGO',          'VALOR': `${estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} (${estadisticas.porcentajeDentroRango.toFixed(1)}%)` },
    { 'METRICA': 'VIAJES BAJO PESO',         'VALOR': estadisticas.bajoPeso },
    { 'METRICA': 'VIAJES SOBREPESO',         'VALOR': estadisticas.sobrePeso },
    { 'METRICA': 'TOTAL PATIO NORTE (TM)',   'VALOR': fmtTM(estadisticas.totalNorte, 2) },
    { 'METRICA': 'TOTAL PATIO SUR (TM)',     'VALOR': fmtTM(estadisticas.totalSur, 2) },
    { 'METRICA': 'META MANIFESTADA (TM)',    'VALOR': fmtTM(meta, 2) },
    { 'METRICA': 'FALTANTE (TM)',            'VALOR': fmtTM(faltante, 2) },
    { 'METRICA': 'EXCEDENTE (TM)',           'VALOR': fmtTM(excedente, 2) },
    { 'METRICA': 'PORCENTAJE DE META',       'VALOR': `${porcentajeMeta.toFixed(1)}%` },
    { 'METRICA': 'FILTRO APLICADO',          'VALOR': filtroTexto },
    { 'METRICA': 'FECHA EXPORTACION',        'VALOR': dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD HH:mm:ss') },
  ]
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 45 }]
  aplicarEstilosExcel(wsResumen)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_GENERAL')

  // ─────────────────────────────────────────────────────────────
  // HOJA 5: TODOS_LOS_REGISTROS — con colores por estado
  // ─────────────────────────────────────────────────────────────
  const wsRegistros = { '!ref': 'A1:P1', '!rows': [], '!cols': [
    { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
  ]}
  const COLS_REG = 16
  const HEADERS_REG = [
    'CORRELATIVO','PLACA','TRANSPORTE','TIPO UNIDAD',
    'RANGO MIN','RANGO MAX','ESTADO','FECHA',
    'HORA ENTRADA','HORA SALIDA','TIEMPO','PATIO',
    'BODEGA','PESO BRUTO (TM)','PESO NETO (TM)','ACUMULADO (TM)'
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

    writeRow(wsRegistros, rRow, COLS_REG, [
      C(reg.correlativo,                          { ...rowBase, alignment: { horizontal: 'center' } }),
      C(reg.placa || '',                          rowBase),
      C(reg.transporte || '—',                   rowBase),
      C(reg.tipo_unidad || '—',                  rowBase),
      C(rango.min,                                rowBase),
      C(rango.max,                                rowBase),
      C(estadoTexto,                              estadoStyle),
      C(reg.fecha || '—',                         rowBase),
      C(reg.hora_entrada || '—',                  rowBase),
      C(reg.hora_salida || '—',                   rowBase),
      C(reg.tiempo_atencion || '—',               rowBase),
      C(reg.patio || '—',                         rowBase),
      C(reg.bodega_barco || '—',                  rowBase),
      C(parseFloat((reg.peso_bruto_updp_tm || 0).toFixed(2)), { ...rowBase, alignment: { horizontal: 'right' } }),
      C(parseFloat((reg.peso_neto_updp_tm  || 0).toFixed(2)), { ...estadoStyle, alignment: { horizontal: 'right' } }),
      C(parseFloat((reg.acumulado_updp_tm  || 0).toFixed(2)), { ...rowBase, alignment: { horizontal: 'right' } }),
    ])
    rRow++
  })
  wsRegistros['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rRow - 1, c: COLS_REG - 1 } })
  XLSX.utils.book_append_sheet(wb, wsRegistros, 'TODOS_LOS_REGISTROS')

  // ─────────────────────────────────────────────────────────────
  // HOJAS POR CADA TRANSPORTE (con colores)
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

    // Título transportista
    wsTr['!rows'][tRow] = { hpt: 22 }
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `TRANSPORTE: ${transporteNombre}` : '', S.transportTitle(i === 0 ? 'left' : 'center'))
    ))
    tRow++

    // Resumen
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `TOTAL: ${totalTm.toFixed(2)} TM` : '', S.data('left'))
    ))
    tRow++
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map((_, i) =>
      C(i === 0 ? `VIAJES: ${viajes.length}` : '', S.data('left'))
    ))
    tRow++

    // Separador
    writeRow(wsTr, tRow, COLS_T, Array(COLS_T).fill(0).map(() => C('', S.separator())))
    tRow++

    // Headers
    const hdrLabels = ['CORRELATIVO','PLACA','PESO NETO (TM)','TIPO UNIDAD','ESTADO','FECHA','HORA ENTRADA','HORA SALIDA','PATIO','BODEGA']
    wsTr['!rows'][tRow] = { hpt: 20 }
    writeRow(wsTr, tRow, COLS_T, hdrLabels.map(h => C(h, S.header('center'))))
    tRow++

    viajes.forEach(reg => {
      const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
      const estadoTexto = estado === 'bajo' ? 'BAJO PESO' : estado === 'sobre' ? 'SOBREPESO' : 'EN RANGO'
      const estadoStyle = estado === 'bajo' ? S.bajoPeso() : estado === 'sobre' ? S.sobrePeso() : S.enRango()
      writeRow(wsTr, tRow, COLS_T, [
        C(reg.correlativo,                                            S.data('center')),
        C(reg.placa || '',                                            S.data('center')),
        C(parseFloat((reg.peso_neto_updp_tm || 0).toFixed(2)),       { ...estadoStyle, alignment: { horizontal: 'right' } }),
        C(reg.tipo_unidad || '',                                      S.data('center')),
        C(estadoTexto,                                                estadoStyle),
        C(reg.fecha || '',                                            S.data('center')),
        C(reg.hora_entrada || '—',                                    S.data('center')),
        C(reg.hora_salida  || '—',                                    S.data('center')),
        C(reg.patio || '—',                                           S.data('center')),
        C(reg.bodega_barco || '—',                                    S.data('center')),
      ])
      tRow++
    })

    wsTr['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: tRow - 1, c: COLS_T - 1 } })
    const nombreHoja = transporteNombre.replace(/[\\/*?:[\]]/g, '').substring(0, 31)
    XLSX.utils.book_append_sheet(wb, wsTr, nombreHoja)
  })

  // ─────────────────────────────────────────────────────────────
  // GUARDAR
  // ─────────────────────────────────────────────────────────────
  const nombreArchivo = `PetCoke_${barco?.nombre || 'descarga'}_${dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD_HHmm')}.xlsx`
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

  const flujoPorHora = useMemo(() => {
    if (!registros.length) return []

    const flujoMap = new Map()

    registros.forEach(reg => {
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
  }, [registros])

  const estadisticasFlujo = useMemo(() => {
    if (!flujoPorHora.length) return { maxPorHora: 0, promedioPorHora: 0, totalHoras: 0 }
    
    const maxPorHora = Math.max(...flujoPorHora.map(h => h.totalTM))
    const promedioPorHora = flujoPorHora.reduce((sum, h) => sum + h.totalTM, 0) / flujoPorHora.length
    const totalHoras = flujoPorHora.length
    
    return { maxPorHora, promedioPorHora, totalHoras }
  }, [flujoPorHora])

  const handleSeleccionarTransporte = (transporte) => {
    setTransporteSeleccionado(prev => prev === transporte ? null : transporte)
  }

  const handleSeleccionarDia = (dia) => {
    setDiaSeleccionado(prev => prev === dia ? null : dia)
  }

  const limpiarTodosLosFiltros = () => {
    setTransporteSeleccionado(null)
    setDiaSeleccionado(null)
  }

  if (loading && !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🪨</div>
          <p style={{ color: '#94a3b8' }}>Cargando datos de Pet Coke...</p>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#f97316', borderRadius: '50%', margin: '20px auto', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (error || !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' }}>
        <div style={{ background: '#1e293b', padding: '40px', borderRadius: '16px', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#ef4444' }}>Error</h1>
          <p style={{ color: '#94a3b8' }}>{error || 'No se pudieron cargar los datos'}</p>
        </div>
      </div>
    )
  }

  const datosGraficoAcumulado   = estadisticas.acumuladoPorCorrelativo.map(item => ({ correlativo: `#${item.correlativo}`, peso: item.peso, acumulado: item.acumulado, estado: item.estado }))
  const datosGraficoTransporte  = Object.entries(estadisticas.porTransporte).map(([name, value]) => ({ name, value }))
  const datosGraficoDia         = Object.entries(estadisticas.porDia).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, total]) => ({ dia, total }))
  const datosGraficoPatio       = Object.entries(estadisticas.porPatio).map(([name, value]) => ({ name, value }))

  const filtroActivoTexto = [
    transporteSeleccionado && `Transporte: ${transporteSeleccionado}`,
    diaSeleccionado && `Día: ${diaSeleccionado}`
  ].filter(Boolean).join(' · ') || 'Mostrando todos los datos'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #f1f5f9; --text-2: #94a3b8; --orange: #f97316; --orange-dark: #ea580c; }
        body { background: var(--bg); font-family: 'Sora', sans-serif; }
        .alm-petcoke-root { min-height: 100vh; background: var(--bg); }
        .alm-topbar { background: #0f172a; border-bottom: 1px solid var(--border); padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .alm-logo { height: 32px; filter: brightness(0) invert(1); }
        .alm-ship-name { font-weight: 800; color: white; font-size: 14px; }
        .alm-ship-code { font-size: 10px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-refresh-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 12px; color: white; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .alm-refresh-btn:hover { background: rgba(255,255,255,0.15); }
        .alm-excel-btn { background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 6px 12px; color: #4ade80; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .alm-excel-btn:hover { background: rgba(34, 197, 94, 0.25); transform: translateY(-1px); }
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 28px 24px 48px; }
        .orden-boton { background: rgba(255,255,255,0.05); border: 1px solid #334155; border-radius: 20px; padding: 6px 14px; font-size: 12px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .orden-boton:hover { background: rgba(249,115,22,0.15); border-color: #f97316; color: #f97316; }
        .orden-boton-activo { background: rgba(249,115,22,0.2); border-color: #f97316; color: #f97316; }
        .alm-tarjetas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
          margin-top: 20px;
        }

        .tarjeta-transporte {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .tarjeta-transporte:hover {
          transform: translateY(-2px);
          border-color: #f97316;
          box-shadow: 0 4px 12px -2px rgba(249,115,22,0.2);
        }
        .tarjeta-transporte-selected {
          background: linear-gradient(135deg, #f97316, #ea580c);
          border: 1px solid #f97316;
          box-shadow: 0 4px 12px -2px rgba(249,115,22,0.35);
        }

        .tarjeta-header {
          padding: 12px 14px 8px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .tarjeta-nombre {
          font-size: 14px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tarjeta-stats {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 11px;
        }
        .tarjeta-viajes {
          color: #94a3b8;
          font-weight: 600;
        }
        .tarjeta-total {
          color: #f97316;
          font-weight: 700;
          font-family: 'DM Mono', monospace;
        }
        .tarjeta-transporte-selected .tarjeta-total {
          color: white;
        }

        .tarjeta-tipos {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 10px 14px;
        }
        .tipo-item {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
          padding: 8px 10px;
          transition: all 0.2s;
        }
        .tipo-item-empty {
          opacity: 0.4;
        }
        .tipo-header {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 700;
        }
        .tipo-valor {
          font-size: 16px;
          font-weight: 800;
          font-family: 'DM Mono', monospace;
          margin-bottom: 2px;
        }
        .tipo-sub {
          font-size: 9px;
          color: #64748b;
        }
        .tarjeta-transporte-selected .tipo-sub {
          color: rgba(255,255,255,0.6);
        }

        .tarjeta-alerta {
          margin: 0 14px 12px 14px;
          padding: 6px 10px;
          background: rgba(239,68,68,0.15);
          border-radius: 8px;
          font-size: 10px;
          color: #f87171;
          text-align: center;
        }
        .tarjeta-indicador {
          padding: 8px 14px;
          font-size: 9px;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.1);
        }

        .flujo-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 12px;
        }
        .flujo-stat {
          text-align: center;
        }
        .flujo-stat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .flujo-stat-value {
          font-size: 18px;
          font-weight: 800;
          font-family: 'DM Mono', monospace;
          color: #f97316;
        }

        .alm-kpis-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .alm-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--orange); }
        .alm-kpi-icon { font-size: 28px; color: #f97316; }
        .alm-kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px; }
        .alm-kpi-value { font-size: 28px; font-weight: 900; color: white; font-family: 'DM Mono', monospace; }
        .alm-kpi-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
        .alm-alert-card { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; }
        .alm-alert-title { font-size: 13px; font-weight: bold; color: #f87171; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .alm-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .alm-chart-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
        .alm-chart-wide { grid-column: 1 / -1; }
        .alm-chart-title { font-size: 14px; font-weight: 700; color: white; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .alm-table-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 24px; }
        .alm-table-header { padding: 16px 20px; border-bottom: 1px solid var(--border); background: #0f172a; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        .alm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .alm-table th { padding: 12px 16px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid var(--border); }
        .alm-table td { padding: 12px 16px; color: #cbd5e1; border-bottom: 1px solid var(--border); }
        .alm-table tbody tr:hover { background: rgba(249, 115, 22, 0.05); }
        .alm-table .alm-td-num { text-align: right; }
        .alm-table-row-bajo { background: rgba(251, 191, 36, 0.15); }
        .alm-table-row-bajo:hover { background: rgba(251, 191, 36, 0.25); }
        .alm-table-row-sobre { background: rgba(239, 68, 68, 0.15); }
        .alm-table-row-sobre:hover { background: rgba(239, 68, 68, 0.25); }
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-badge { background: rgba(249, 115, 22, 0.2); color: #f97316; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 8px; }
        .alm-badge-warning { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .alm-badge-filter { background: rgba(249, 115, 22, 0.3); color: #f97316; }
        .alm-badge-bajo { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
        .alm-progress-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .alm-progress-track { height: 12px; background: #334155; border-radius: 999px; overflow: hidden; margin: 12px 0; }
        .alm-progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #fb923c); border-radius: 999px; transition: width 1s ease; }
        .alm-progress-fill-warning { background: linear-gradient(90deg, #ef4444, #f97316); }
        .alm-progress-fill-complete { background: linear-gradient(90deg, #22c55e, #4ade80); }
        .alm-clear-filter { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 20px; padding: 6px 12px; font-size: 11px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
        .alm-clear-filter:hover { background: rgba(255,255,255,0.1); color: white; }

        .section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #64748b;
          margin-bottom: 14px; margin-top: 4px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-title::after {
          content: ''; flex: 1; height: 1px; background: #334155;
        }

        .barra-dia {
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .barra-dia:hover {
          opacity: 0.8;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .alm-charts-row { grid-template-columns: 1fr; }
          .alm-body { padding: 16px; }
          .alm-tarjetas-grid { grid-template-columns: 1fr; }
          .flujo-stats { grid-template-columns: 1fr; gap: 8px; }
        }
      `}</style>

      <div className="alm-petcoke-root">
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
            <div style={{ width: '1px', height: '30px', background: '#334155' }} />
            <div>
              <div className="alm-ship-name">{barco.nombre}</div>
              <div className="alm-ship-code">#{barco.codigo_barco} · Pet Coke</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={descargarExcel} className="alm-excel-btn">
              <FaFileExcel size={14} />
              Descargar Excel
            </button>
            {(transporteSeleccionado || diaSeleccionado) && (
              <button onClick={limpiarTodosLosFiltros} className="alm-clear-filter">
                <FiX size={12} />
                Limpiar todos los filtros
              </button>
            )}
            <button onClick={refetch} className="alm-refresh-btn">
              <FiRefreshCw size={14} />
              Actualizar
            </button>
          </div>
        </header>

        <div className="alm-body">
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span className="alm-badge alm-badge-filter">{filtroActivoTexto}</span>
            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FiClock size={12} />
              Última actualización: {lastUpdate?.format('HH:mm:ss') || '...'}
            </div>
          </div>

          {/* 🔥 SECCIÓN DE EXCEDENTE - AGREGADA EN EL HEADER DE KPI */}
          {tieneExcedente && (
            <div style={{ 
              marginBottom: '24px', 
              background: 'linear-gradient(135deg, #ef4444, #dc2626)', 
              borderRadius: '16px', 
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              animation: 'pulse 2s infinite',
              boxShadow: '0 4px 12px -2px rgba(239,68,68,0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiAlertCircle size={28} style={{ color: 'white' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)' }}>EXCEDENTE DE DESCARGA</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', fontFamily: 'monospace' }}>
                    +{fmtTM(excedente, 2)} TM
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>
                La cantidad descargada supera la meta manifestada
                <br />
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                  Meta: {fmtTM(meta, 2)} TM · Descargado: {fmtTM(estadisticas.totalNeto, 2)} TM
                </span>
              </div>
            </div>
          )}

          <div className="alm-kpis-row">
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><GiWeightScale size={28} /></div>
              <div>
                <div className="alm-kpi-label">Total Descargado</div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.totalNeto, 2)} TM</div>
                <div className="alm-kpi-sub">Peso Neto UPDP</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiTruck size={28} /></div>
              <div>
                <div className="alm-kpi-label">Total Viajes</div>
                <div className="alm-kpi-value">{estadisticas.totalViajes}</div>
                <div className="alm-kpi-sub">Unidades procesadas</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiBarChart2 size={28} /></div>
              <div>
                <div className="alm-kpi-label">Promedio por Viaje</div>
                <div className="alm-kpi-value">{fmtTM(estadisticas.pesoPromedio, 2)} TM</div>
                <div className="alm-kpi-sub">VOLQ: 14-18 | TRAIL: 22-25 TM</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiUsers size={28} /></div>
              <div>
                <div className="alm-kpi-label">Transportistas</div>
                <div className="alm-kpi-value">{promediosPorTransporte.length}</div>
                <div className="alm-kpi-sub">Empresas diferentes</div>
              </div>
            </div>
          </div>

          <div className="alm-kpis-row">
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiMapPin size={28} style={{ color: '#60a5fa' }} /></div>
              <div>
                <div className="alm-kpi-label">Patio NORTE</div>
                <div className="alm-kpi-value" style={{ color: '#60a5fa' }}>{fmtTM(estadisticas.totalNorte, 2)} TM</div>
                <div className="alm-kpi-sub">{((estadisticas.totalNorte / estadisticas.totalNeto) * 100 || 0).toFixed(1)}% del total</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiMapPin size={28} style={{ color: '#4ade80' }} /></div>
              <div>
                <div className="alm-kpi-label">Patio SUR</div>
                <div className="alm-kpi-value" style={{ color: '#4ade80' }}>{fmtTM(estadisticas.totalSur, 2)} TM</div>
                <div className="alm-kpi-sub">{((estadisticas.totalSur / estadisticas.totalNeto) * 100 || 0).toFixed(1)}% del total</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiCheckCircle size={28} style={{ color: '#4ade80' }} /></div>
              <div>
                <div className="alm-kpi-label">En Rango</div>
                <div className="alm-kpi-value" style={{ color: '#4ade80' }}>{estadisticas.porcentajeDentroRango.toFixed(1)}%</div>
                <div className="alm-kpi-sub">{estadisticas.totalViajes - estadisticas.unidadesFueraDeRango.length} viajes OK</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiAlertCircle size={28} style={{ color: '#f87171' }} /></div>
              <div>
                <div className="alm-kpi-label">Fuera de Rango</div>
                <div className="alm-kpi-value" style={{ color: '#f87171' }}>{estadisticas.unidadesFueraDeRango.length}</div>
                <div className="alm-kpi-sub">
                  <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><FiArrowDown size={10} />{estadisticas.bajoPeso}</span> · 
                  <span style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><FiArrowUp size={10} />{estadisticas.sobrePeso}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KPI de META, FALTANTE y EXCEDENTE */}
          <div className="alm-kpis-row">
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiTrendingUp size={28} style={{ color: '#f97316' }} /></div>
              <div>
                <div className="alm-kpi-label">META MANIFESTADA</div>
                <div className="alm-kpi-value" style={{ color: '#f97316' }}>{fmtTM(meta, 2)} TM</div>
                <div className="alm-kpi-sub">Cantidad contratada</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiAlertCircle size={28} style={{ color: faltante > 0 && !tieneExcedente ? '#fbbf24' : (tieneExcedente ? '#ef4444' : '#4ade80') }} /></div>
              <div>
                <div className="alm-kpi-label">{tieneExcedente ? 'EXCEDENTE' : 'FALTANTE POR DESCARGAR'}</div>
                <div className="alm-kpi-value" style={{ color: tieneExcedente ? '#ef4444' : (faltante > 0 ? '#fbbf24' : '#4ade80') }}>
                  {tieneExcedente ? `+${fmtTM(excedente, 2)}` : fmtTM(faltante, 2)} TM
                </div>
                <div className="alm-kpi-sub">
                  {tieneExcedente 
                    ? `⚠️ Supera la meta en ${fmtTM(excedente, 2)} TM` 
                    : (metaCompletada 
                      ? '✅ Meta completada exactamente' 
                      : `${((faltante / meta) * 100).toFixed(1)}% restante`)}
                </div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiBarChart2 size={28} style={{ color: '#60a5fa' }} /></div>
              <div>
                <div className="alm-kpi-label">PORCENTAJE DE META</div>
                <div className="alm-kpi-value" style={{ color: tieneExcedente ? '#ef4444' : (metaCompletada ? '#4ade80' : '#60a5fa') }}>
                  {porcentajeMeta.toFixed(1)}%
                </div>
                <div className="alm-kpi-sub">{fmtTM(estadisticas.totalNeto, 2)} TM de {fmtTM(meta, 2)} TM</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><GiWeightScale size={28} style={{ color: tieneExcedente ? '#ef4444' : (metaCompletada ? '#4ade80' : '#f97316') }} /></div>
              <div>
                <div className="alm-kpi-label">ESTADO</div>
                <div className="alm-kpi-value" style={{ fontSize: '20px', color: tieneExcedente ? '#ef4444' : (metaCompletada ? '#4ade80' : '#f97316') }}>
                  {tieneExcedente ? 'EXCEDENTE' : (metaCompletada ? 'META ALCANZADA' : 'EN PROCESO')}
                </div>
                <div className="alm-kpi-sub">
                  {tieneExcedente 
                    ? `🚨 Se superó la meta en ${fmtTM(excedente, 2)} TM` 
                    : (metaCompletada 
                      ? '🎉 Descarga completada exitosamente' 
                      : `Faltan ${fmtTM(faltante, 2)} TM para completar la meta`)}
                </div>
              </div>
            </div>
          </div>

          {tieneExcedente && (
            <div className="alm-alert-card" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="alm-alert-title" style={{ color: '#f87171' }}>
                <FiAlertCircle size={16} />
                ⚠️ EXCEDENTE DE DESCARGA DETECTADO
              </div>
              <div style={{ fontSize: '13px', color: '#fca5a5' }}>
                La cantidad total descargada ({fmtTM(estadisticas.totalNeto, 2)} TM) supera la meta manifestada de {fmtTM(meta, 2)} TM en {fmtTM(excedente, 2)} TM.
                Esto representa un {(porcentajeMeta - 100).toFixed(1)}% por encima de lo contratado.
              </div>
            </div>
          )}

          {estadisticas.unidadesFueraDeRango.length > 0 && (
            <div className="alm-alert-card">
              <div className="alm-alert-title">
                <FiAlertCircle size={16} />
                ALERTA: Unidades fuera del rango permitido
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {estadisticas.unidadesFueraDeRango.slice(0, 10).map((reg, idx) => {
                  const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
                  const rango = RANGOS[reg.tipo_unidad?.toUpperCase()] || { min: 0, max: 0 }
                  return (
                    <span key={idx} style={{ 
                      background: estado === 'bajo' ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)', 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontFamily: 'monospace', 
                      color: estado === 'bajo' ? '#fbbf24' : '#f87171',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {estado === 'bajo' ? <FiArrowDown size={12} /> : <FiArrowUp size={12} />}
                      {reg.placa} ({reg.tipo_unidad}): {reg.peso_neto_updp_tm?.toFixed(2)} TM 
                      {estado === 'bajo' ? ` (min ${rango.min})` : ` (max ${rango.max})`}
                    </span>
                  )
                })}
                {estadisticas.unidadesFueraDeRango.length > 10 && (
                  <span style={{ color: '#64748b', fontSize: '12px', padding: '4px 12px' }}>
                    + {estadisticas.unidadesFueraDeRango.length - 10} más
                  </span>
                )}
              </div>
            </div>
          )}

          {meta > 0 && (
            <div className="alm-progress-hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiTrendingUp size={16} />
                  Progreso de Descarga vs Meta
                </span>
                <span style={{ color: tieneExcedente ? '#ef4444' : (metaCompletada ? '#4ade80' : (porcentajeMeta >= 90 ? '#fbbf24' : '#f97316')), fontWeight: 'bold' }}>
                  {porcentajeMeta.toFixed(1)}%
                </span>
              </div>
              <div className="alm-progress-track">
                <div 
                  className={`alm-progress-fill ${tieneExcedente ? 'alm-progress-fill-warning' : (metaCompletada ? 'alm-progress-fill-complete' : (porcentajeMeta >= 90 ? 'alm-progress-fill-warning' : ''))}`} 
                  style={{ width: `${Math.min(porcentajeMeta, 100)}%` }} 
                />
                {tieneExcedente && (
                  <div 
                    style={{ 
                      position: 'relative',
                      width: `${Math.min(porcentajeMeta - 100, 100)}%`,
                      height: '12px',
                      background: '#ef4444',
                      borderRadius: '0 999px 999px 0',
                      marginTop: '-12px',
                      marginLeft: '100%',
                      transition: 'width 1s ease'
                    }} 
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
                <span>0 TM</span>
                <span>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(meta, 0)} TM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80' }}>
                  ✅ Descargado: {fmtTM(estadisticas.totalNeto, 2)} TM
                </div>
                <div style={{ fontSize: '11px', color: tieneExcedente ? '#ef4444' : (faltante > 0 ? '#fbbf24' : '#4ade80') }}>
                  {tieneExcedente 
                    ? `⚠️ EXCEDENTE: +${fmtTM(excedente, 2)} TM` 
                    : (faltante > 0 
                      ? `📦 Faltante: ${fmtTM(faltante, 2)} TM` 
                      : '🎉 META COMPLETADA EXACTAMENTE')}
                </div>
              </div>
              {tieneExcedente && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(239,68,68,0.15)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ color: '#f87171', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <FiAlertCircle size={14} />
                    ¡ATENCIÓN! Se ha superado la meta en {fmtTM(excedente, 2)} TM ({((porcentajeMeta - 100).toFixed(1))}% adicional)
                  </span>
                </div>
              )}
              {metaCompletada && !tieneExcedente && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ color: '#4ade80', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <FiCheckCircle size={14} />
                    ¡Meta alcanzada exactamente! Se ha completado la cantidad manifestada de {fmtTM(meta, 2)} TM.
                  </span>
                </div>
              )}
            </div>
          )}

          {promediosPorTransporte.length > 0 && (
            <>
              <div className="section-title">
                <FaBuilding size={14} />
                Empresas Transportistas
              </div>
              <div className="alm-tarjetas-grid">
                {promediosPorTransporte.map((empresa) => {
                  const sel = transporteSeleccionado === empresa.nombre
                  return (
                    <div
                      key={empresa.nombre}
                      className={`tarjeta-transporte ${sel ? 'tarjeta-transporte-selected' : ''}`}
                      onClick={() => handleSeleccionarTransporte(empresa.nombre)}
                    >
                      <div className="tarjeta-header">
                        <div className="tarjeta-nombre" title={empresa.nombre}>
                          {empresa.nombre}
                        </div>
                        <div className="tarjeta-stats">
                          <span className="tarjeta-viajes">{empresa.totalViajes} viajes</span>
                          <span className="tarjeta-total">{fmtTM(empresa.totalNeto, 1)} TM</span>
                        </div>
                      </div>

                      <div className="tarjeta-tipos">
                        <div className={`tipo-item ${empresa.viajesTraileta === 0 ? 'tipo-item-empty' : ''}`}>
                          <div className="tipo-header">
                            <FaTrailer size={12} />
                            TRAILETA
                            <span style={{ fontSize: '8px', marginLeft: 'auto', opacity: 0.7 }}>22-25 TM</span>
                          </div>
                          {empresa.viajesTraileta > 0 ? (
                            <>
                              <div className="tipo-valor" style={{ color: sel ? 'white' : '#f97316' }}>
                                {fmtTM(empresa.promedioTraileta, 1)}
                              </div>
                              <div className="tipo-sub">{empresa.viajesTraileta} viajes · {fmtTM(empresa.totalTraileta, 0)} TM</div>
                            </>
                          ) : (
                            <div className="tipo-sub" style={{ color: '#475569', marginTop: '4px' }}>Sin registros</div>
                          )}
                        </div>

                        <div className={`tipo-item ${empresa.viajesVolqueta === 0 ? 'tipo-item-empty' : ''}`}>
                          <div className="tipo-header">
                            <FaMountain size={12} />
                            VOLQUETA
                            <span style={{ fontSize: '8px', marginLeft: 'auto', opacity: 0.7 }}>14-18 TM</span>
                          </div>
                          {empresa.viajesVolqueta > 0 ? (
                            <>
                              <div className="tipo-valor" style={{ color: sel ? 'white' : '#4ade80' }}>
                                {fmtTM(empresa.promedioVolqueta, 1)}
                              </div>
                              <div className="tipo-sub">{empresa.viajesVolqueta} viajes · {fmtTM(empresa.totalVolqueta, 0)} TM</div>
                            </>
                          ) : (
                            <div className="tipo-sub" style={{ color: '#475569', marginTop: '4px' }}>Sin registros</div>
                          )}
                        </div>
                      </div>

                      {empresa.fueraRango > 0 && (
                        <div className="tarjeta-alerta">
                          <FiAlertCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />
                          {empresa.fueraRango} fuera de rango
                        </div>
                      )}

                      <div className="tarjeta-indicador">
                        {sel ? '✓ Filtrando · clic para quitar' : 'clic para filtrar'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="alm-chart-card alm-chart-wide">
            <div className="alm-chart-title">
              <FiClock size={16} />
              Flujo de Descarga por Hora
            </div>
            
            {flujoPorHora.length > 0 ? (
              <>
                <div className="flujo-stats">
                  <div className="flujo-stat">
                    <div className="flujo-stat-label">Pico Máximo por Hora</div>
                    <div className="flujo-stat-value">{fmtTM(estadisticasFlujo.maxPorHora, 1)} TM</div>
                  </div>
                  <div className="flujo-stat">
                    <div className="flujo-stat-label">Promedio por Hora</div>
                    <div className="flujo-stat-value">{fmtTM(estadisticasFlujo.promedioPorHora, 1)} TM</div>
                  </div>
                  <div className="flujo-stat">
                    <div className="flujo-stat-label">Periodos Activos</div>
                    <div className="flujo-stat-value">{estadisticasFlujo.totalHoras} horas</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={flujoPorHora}>
                    <defs>
                      <linearGradient id="flujoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="hora" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval={Math.floor(flujoPorHora.length / 10)}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: '#94a3b8' }} 
                      tickFormatter={(v) => fmtTM(v, 0)}
                      label={{ value: 'Toneladas por Hora', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#94a3b8' }}
                      tickFormatter={(v) => fmtTM(v, 0)}
                      label={{ value: 'Acumulado Total', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'totalTM') return [`${fmtTM(value, 2)} TM`, 'Descarga por Hora']
                        if (name === 'acumulado') return [`${fmtTM(value, 2)} TM`, 'Acumulado Total']
                        if (name === 'viajes') return [`${value} viajes`, 'N° Viajes']
                        if (name === 'promedio') return [`${fmtTM(value, 2)} TM`, 'Promedio por Viaje']
                        return [value, name]
                      }}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#f97316', fontWeight: 'bold' }}
                    />
                    
                    <Bar 
                      yAxisId="left"
                      dataKey="totalTM" 
                      fill="#f97316" 
                      opacity={0.8}
                      radius={[4, 4, 0, 0]}
                      name="Descarga por Hora"
                    />
                    
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="acumulado" 
                      stroke="#4ade80" 
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#4ade80' }}
                      name="Acumulado Total"
                    />
                    
                    <ReferenceLine 
                      yAxisId="left"
                      y={estadisticasFlujo.promedioPorHora} 
                      stroke="#fb923c" 
                      strokeDasharray="5 5"
                      label={{ value: `Promedio: ${fmtTM(estadisticasFlujo.promedioPorHora, 1)} TM/h`, fill: '#fb923c', fontSize: 10 }}
                    />
                    
                    {meta > 0 && (
                      <ReferenceLine 
                        yAxisId="right"
                        y={meta} 
                        stroke="#22c55e" 
                        strokeDasharray="3 3"
                        label={{ value: `Meta: ${fmtTM(meta, 0)} TM`, fill: '#22c55e', fontSize: 10 }}
                      />
                    )}
                    {tieneExcedente && (
                      <ReferenceLine 
                        yAxisId="right"
                        y={estadisticas.totalNeto} 
                        stroke="#ef4444" 
                        strokeDasharray="2 2"
                        label={{ value: `Total: ${fmtTM(estadisticas.totalNeto, 0)} TM`, fill: '#ef4444', fontSize: 10 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '80px 40px' }}>
                <FiClock size={48} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No hay datos de hora disponibles para mostrar el flujo</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>Se requiere información de hora_entrada en los registros</p>
              </div>
            )}
          </div>

          <div className="alm-charts-row">
            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <FaChartPie size={16} />
                Descarga por Transporte
              </div>
              {datosGraficoTransporte.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={datosGraficoTransporte} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoTransporte.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <FiHome size={16} />
                Descarga por Patio
              </div>
              {datosGraficoPatio.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={datosGraficoPatio} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {datosGraficoPatio.map((entry, i) => <Cell key={i} fill={COLORES_PATIO[entry.name] || COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <FiCalendar size={16} />
                Descarga por Día
                {diaSeleccionado && (
                  <span className="alm-badge alm-badge-filter" style={{ marginLeft: '8px' }}>
                    Filtrado: {diaSeleccionado}
                  </span>
                )}
              </div>
              {datosGraficoDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={datosGraficoDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip 
                      formatter={(v) => `${fmtTM(v, 2)} TM`}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar 
                      dataKey="total" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => handleSeleccionarDia(data.dia)}
                      cursor="pointer"
                      className="barra-dia"
                      shape={(props) => {
                        const { x, y, width, height, payload } = props
                        const isSelected = diaSeleccionado === payload.dia
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={isSelected ? '#ea580c' : '#f97316'}
                            stroke={isSelected ? '#fbbf24' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                            rx={4}
                            ry={4}
                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => handleSeleccionarDia(payload.dia)}
                          />
                        )
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
                💡 Haz clic en cualquier barra para filtrar la distribución de pesos por ese día
              </div>
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <FaChartLine size={16} />
                Distribución de Pesos Netos
                {diaSeleccionado && (
                  <span className="alm-badge alm-badge-filter" style={{ marginLeft: '8px' }}>
                    {diaSeleccionado}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '10px', justifyContent: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4ade80', borderRadius: '2px' }}></span> En Rango</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#fbbf24', borderRadius: '2px' }}></span> Bajo Peso <FiArrowDown size={10} /></span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></span> Sobrepeso <FiArrowUp size={10} /></span>
              </div>
              {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={estadisticas.acumuladoPorCorrelativo.map(item => ({ ...item, peso: item.peso }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="correlativo" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip 
                      formatter={(v) => `${fmtTM(v, 2)} TM`}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                      {estadisticas.acumuladoPorCorrelativo.map((entry, idx) => (
                        <Cell key={idx} fill={getColorPorEstado(entry.estado)} />
                      ))}
                    </Bar>
                    <ReferenceLine y={RANGOS.VOLQUETA.min} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: `Volq min ${RANGOS.VOLQUETA.min}`, fill: '#fbbf24', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.VOLQUETA.max} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: `Volq max ${RANGOS.VOLQUETA.max}`, fill: '#fbbf24', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.TRAILETA.min} stroke="#f97316" strokeDasharray="3 3" label={{ value: `Trail min ${RANGOS.TRAILETA.min}`, fill: '#f97316', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.TRAILETA.max} stroke="#f97316" strokeDasharray="3 3" label={{ value: `Trail max ${RANGOS.TRAILETA.max}`, fill: '#f97316', fontSize: 9 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
              {diaSeleccionado && (
                <div style={{ fontSize: '10px', color: '#f97316', textAlign: 'center', marginTop: '8px' }}>
                  <FiSearch size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Mostrando solo viajes del día {diaSeleccionado}
                </div>
              )}
            </div>
          </div>

          {/* TABLA DE VIAJES CON ORDENAMIENTO */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <FaClipboardList size={14} />
                <span style={{ fontWeight: 'bold', color: 'white' }}>Registros de Descarga</span>
                <span className="alm-badge">{registros.length} viajes</span>
                {estadisticas.bajoPeso > 0 && (
                  <span className="alm-badge alm-badge-bajo" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <FiArrowDown size={10} /> {estadisticas.bajoPeso} bajo peso
                  </span>
                )}
                {estadisticas.sobrePeso > 0 && (
                  <span className="alm-badge alm-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <FiArrowUp size={10} /> {estadisticas.sobrePeso} sobrepeso
                  </span>
                )}
                {transporteSeleccionado && (
                  <span className="alm-badge alm-badge-filter">Transporte: {transporteSeleccionado}</span>
                )}
                {diaSeleccionado && (
                  <span className="alm-badge alm-badge-filter">Día: {diaSeleccionado}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`orden-boton ${ordenTabla === 'reciente' ? 'orden-boton-activo' : ''}`}
                  onClick={() => setOrdenTabla('reciente')}
                >
                  <FiArrowDown size={12} />
                  Más Reciente
                </button>
                <button 
                  className={`orden-boton ${ordenTabla === 'antiguo' ? 'orden-boton-activo' : ''}`}
                  onClick={() => setOrdenTabla('antiguo')}
                >
                  <FiArrowUp size={12} />
                  Más Antiguo
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="alm-table">
                <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                  <tr>
                    <th>#</th>
                    <th>Placa</th>
                    <th>Transporte</th>
                    <th>Tipo Unidad</th>
                    <th>Rango</th>
                    <th>Fecha</th>
                    <th>Hora Entrada</th>
                    <th>Hora Salida</th>
                    <th>Tiempo</th>
                    <th>Patio</th>
                    <th>Bodega</th>
                    <th className="alm-td-num">Peso Bruto</th>
                    <th className="alm-td-num">Peso Neto</th>
                    <th className="alm-td-num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosOrdenados.map((reg) => {
                    const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
                    const rango = RANGOS[reg.tipo_unidad?.toUpperCase()] || { min: '-', max: '-' }
                    let rowClass = ''
                    if (estado === 'bajo') rowClass = 'alm-table-row-bajo'
                    if (estado === 'sobre') rowClass = 'alm-table-row-sobre'
                    
                    return (
                      <tr key={reg.id} className={rowClass}>
                        <td style={{ fontWeight: 'bold' }}>{reg.correlativo}</td>
                        <td><span style={{ fontFamily: 'monospace' }}>{reg.placa}</span></td>
                        <td>{reg.transporte || '—'}</td>
                        <td>
                          {reg.tipo_unidad
                            ? <span style={{
                                background: reg.tipo_unidad.toUpperCase() === 'TRAILETA' ? 'rgba(249,115,22,0.15)' : 'rgba(74,222,128,0.15)',
                                color: reg.tipo_unidad.toUpperCase() === 'TRAILETA' ? '#f97316' : '#4ade80',
                                padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}>
                              {reg.tipo_unidad.toUpperCase() === 'TRAILETA' ? <FaTrailer size={10} /> : <FaMountain size={10} />}
                              {reg.tipo_unidad}
                            </span>
                            : '—'}
                        </td>
                        <td style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                          {rango.min}-{rango.max} TM
                        </td>
                        <td>{reg.fecha}</td>
                        <td>{reg.hora_entrada || '—'}</td>
                        <td>{reg.hora_salida || '—'}</td>
                        <td style={{ color: '#4ade80' }}>{reg.tiempo_atencion || '—'}</td>
                        <td>{reg.patio || '—'}</td>
                        <td>{reg.bodega_barco || '—'}</td>
                        <td className="alm-td-num" style={{ color: '#60a5fa' }}>{reg.peso_bruto_updp_tm?.toFixed(3) || '—'}</td>
                        <td className="alm-td-num" style={{ 
                          color: estado === 'bajo' ? '#fbbf24' : (estado === 'sobre' ? '#f87171' : '#4ade80'), 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px'
                        }}>
                          {reg.peso_neto_updp_tm?.toFixed(3)}
                          {estado === 'bajo' && <FiArrowDown size={12} />}
                          {estado === 'sobre' && <FiArrowUp size={12} />}
                         </td>
                        <td className="alm-td-num" style={{ color: '#fbbf24' }}>{reg.acumulado_updp_tm?.toFixed(3) || '—'}</td>
                       </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            <FiRefreshCw size={10} style={{ display: 'inline', marginRight: '4px' }} />
            auto-refresh 30s · {barco.nombre} · ALMAPAC · {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 2)} TM descargadas
            {meta > 0 && ` · Meta: ${fmtTM(meta, 2)} TM · ${tieneExcedente ? `Excedente: +${fmtTM(excedente, 2)} TM` : `Faltante: ${fmtTM(faltante, 2)} TM`}`}
            <br />
            <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiAlertCircle size={10} /> VOLQUETA: 14-18 TM</span> · 
            <span style={{ color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FaTrailer size={10} /> TRAILETA: 22-25 TM</span> · 
            <span style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiArrowUp size={10} /> Rojo = Sobrepeso</span> · 
            <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiArrowDown size={10} /> Amarillo = Bajo peso</span>
          </div>
        </div>
      </div>
    </>
  )
}