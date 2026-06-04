// src/app/compartido/yeso/[token]/page-client.js
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
  FaClipboardList, FaFileExcel, FaWarehouse
} from 'react-icons/fa'
import { GiCoalWagon, GiWeightScale, GiMinerals } from 'react-icons/gi'

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

const COLORES = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"]
const COLORES_DESTINO = {
  "bodega": "#3b82f6",
  "silo": "#22c55e", 
  "bin": "#f59e0b",
  "modulo": "#8b5cf6"
}

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
const normalizarRegistro = (reg, index, registrosAnteriores, destinosMap) => {
  // Calcular acumulado progresivo basado en correlativo
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

      // Cargar destinos
      const { data: destinosData, error: destinosError } = await supabase
        .from('destinos')
        .select('*')
        .eq('activo', true)

      if (destinosError) throw destinosError
      
      const destinosMap = new Map()
      destinosData?.forEach(d => destinosMap.set(d.id, d))

      // 🔥 CONSULTA SIN LÍMITE - TRAE TODOS LOS REGISTROS
      const registrosRaw = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', 'barco_id', barcoData.id)

      // Filtrar solo registros COMPLETADOS
      const completados = (registrosRaw || []).filter(r => r.estado === 'COMPLETADO')
      
      // Normalizar los registros
      let registrosNormalizados = completados.map((r, idx) => normalizarRegistro(r, idx, completados, destinosMap))

      // Aplicar filtros
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

export default function ClientPage({ token }) {
  const [transporteSeleccionado, setTransporteSeleccionado] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null)
  const [todosLosRegistros, setTodosLosRegistros] = useState([])
  const [ordenTabla, setOrdenTabla] = useState('reciente') // 'reciente' o 'antiguo'

  const { barco, producto, registros, destinos, loading, error, lastUpdate, refetch } = useYesoData(
    token, transporteSeleccionado, diaSeleccionado, destinoSeleccionado
  )

  // Calcular estadísticas usando la función agregada
  const estadisticas = useMemo(() => calcularEstadisticas(registros), [registros]);

  // Calcular faltante de descarga y excedente
  const meta = barco?.metas_json?.limites?.['YE-001'] || 0
  const faltante = Math.max(0, meta - estadisticas.totalNeto)
  const excedente = Math.max(0, estadisticas.totalNeto - meta)
  const porcentajeMeta = meta > 0 ? (estadisticas.totalNeto / meta) * 100 : 0
  const metaCompletada = porcentajeMeta >= 100
  const tieneExcedente = excedente > 0

  // Ordenar registros para la tabla
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
            console.log(`📊 Dashboard Yeso: ${normalizados.length} registros globales cargados`)
          }
        }
      } catch (error) {
        console.error('Error cargando todos los registros:', error)
      }
    }
    cargarTodosRegistros()
  }, [token])

  const descargarExcel = () => {
    if (!registros.length) {
      alert('No hay datos para exportar')
      return
    }

    // Helper para estilo (simplificado - puedes expandir igual que en Pet Coke)
    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen General
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
      ['FECHA EXPORTACION', dayjs().tz(ZONA_HORARIA_SV).format('YYYY-MM-DD HH:mm:ss')],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet([['RESUMEN GENERAL'], ...resumenData.map(r => r)])
    XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN_GENERAL')

    // Hoja 2: Todos los registros
    const registrosData = registros.map(r => ({
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
    XLSX.utils.book_append_sheet(wb, wsRegistros, 'TODOS_LOS_REGISTROS')

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

  const handleSeleccionarTransporte = (transporte) => {
    setTransporteSeleccionado(prev => prev === transporte ? null : transporte)
  }

  const handleSeleccionarDia = (dia) => {
    setDiaSeleccionado(prev => prev === dia ? null : dia)
  }

  const handleSeleccionarDestino = (destinoId) => {
    setDestinoSeleccionado(prev => prev === destinoId ? null : destinoId)
  }

  const limpiarTodosLosFiltros = () => {
    setTransporteSeleccionado(null)
    setDiaSeleccionado(null)
    setDestinoSeleccionado(null)
  }

  const filtroActivoTexto = [
    transporteSeleccionado && `Transporte: ${transporteSeleccionado}`,
    diaSeleccionado && `Día: ${diaSeleccionado}`,
    destinoSeleccionado && `Destino: ${destinos.find(d => d.id === destinoSeleccionado)?.nombre || destinoSeleccionado}`
  ].filter(Boolean).join(' · ') || 'Mostrando todos los datos'

  if (loading && !barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🪨</div>
          <p style={{ color: '#94a3b8' }}>Cargando datos de Yeso...</p>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%', margin: '20px auto', animation: 'spin 1s linear infinite' }} />
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
  const datosGraficoDestino     = Object.entries(estadisticas.porDestino).map(([name, value]) => ({ name, value }))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Sora:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --bg: #0f172a; --surface: #1e293b; --border: #334155; --text: #f1f5f9; --text-2: #94a3b8; --green: #10b981; --green-dark: #059669; }
        body { background: var(--bg); font-family: 'Sora', sans-serif; }
        .alm-yeso-root { min-height: 100vh; background: var(--bg); }
        .alm-topbar { background: #0f172a; border-bottom: 1px solid var(--border); padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .alm-logo { height: 32px; filter: brightness(0) invert(1); }
        .alm-ship-name { font-weight: 800; color: white; font-size: 14px; }
        .alm-ship-code { font-size: 10px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-refresh-btn { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 12px; color: white; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .alm-refresh-btn:hover { background: rgba(255,255,255,0.15); }
        .alm-excel-btn { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 6px 12px; color: #34d399; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .alm-excel-btn:hover { background: rgba(16, 185, 129, 0.25); transform: translateY(-1px); }
        .alm-body { max-width: 1400px; margin: 0 auto; padding: 28px 24px 48px; }
        .orden-boton { background: rgba(255,255,255,0.05); border: 1px solid #334155; border-radius: 20px; padding: 6px 14px; font-size: 12px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
        .orden-boton:hover { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; }
        .orden-boton-activo { background: rgba(16,185,129,0.2); border-color: #10b981; color: #10b981; }
        .alm-kpis-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .alm-kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
        .alm-kpi::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: var(--green); }
        .alm-kpi-icon { font-size: 28px; color: #10b981; }
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
        .alm-table tbody tr:hover { background: rgba(16, 185, 129, 0.05); }
        .alm-table .alm-td-num { text-align: right; }
        .alm-table-row-bajo { background: rgba(251, 191, 36, 0.15); }
        .alm-table-row-bajo:hover { background: rgba(251, 191, 36, 0.25); }
        .alm-table-row-sobre { background: rgba(239, 68, 68, 0.15); }
        .alm-table-row-sobre:hover { background: rgba(239, 68, 68, 0.25); }
        .alm-footer { text-align: center; padding: 24px; font-size: 11px; color: #64748b; font-family: 'DM Mono', monospace; }
        .alm-badge { background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 8px; border-radius: 999px; font-size: 11px; margin-left: 8px; }
        .alm-badge-warning { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .alm-badge-filter { background: rgba(16, 185, 129, 0.3); color: #10b981; }
        .alm-badge-bajo { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
        .alm-progress-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .alm-progress-track { height: 12px; background: #334155; border-radius: 999px; overflow: hidden; margin: 12px 0; }
        .alm-progress-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 999px; transition: width 1s ease; }
        .alm-progress-fill-warning { background: linear-gradient(90deg, #ef4444, #f97316); }
        .alm-progress-fill-complete { background: linear-gradient(90deg, #10b981, #34d399); }
        .alm-clear-filter { background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 20px; padding: 6px 12px; font-size: 11px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
        .alm-clear-filter:hover { background: rgba(255,255,255,0.1); color: white; }
        .section-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; margin-bottom: 14px; margin-top: 4px; display: flex; align-items: center; gap: 8px; }
        .section-title::after { content: ''; flex: 1; height: 1px; background: #334155; }
        .destino-badge { background: rgba(59,130,246,0.15); color: #60a5fa; padding: 2px 8px; border-radius: 999px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; }
        .destino-badge:hover { background: rgba(59,130,246,0.3); transform: scale(1.02); }
        .destino-badge-active { background: #10b981; color: white; }
        .alm-tarjetas-grid-destinos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .tarjeta-destino { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s; }
        .tarjeta-destino:hover { border-color: #10b981; transform: translateY(-2px); }
        .tarjeta-destino-selected { background: linear-gradient(135deg, #10b981, #059669); border-color: #10b981; }
        .barra-dia { cursor: pointer; transition: opacity 0.2s; }
        .barra-dia:hover { opacity: 0.8; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .alm-charts-row { grid-template-columns: 1fr; }
          .alm-body { padding: 16px; }
        }
      `}</style>

      <div className="alm-yeso-root">
        <header className="alm-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="ALMAPAC" className="alm-logo" />
            <div style={{ width: '1px', height: '30px', background: '#334155' }} />
            <div>
              <div className="alm-ship-name">{barco.nombre}</div>
              <div className="alm-ship-code">#{barco.codigo_barco} · Yeso (YE-001)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={descargarExcel} className="alm-excel-btn">
              <FaFileExcel size={14} />
              Descargar Excel
            </button>
            {(transporteSeleccionado || diaSeleccionado || destinoSeleccionado) && (
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

          {/* SECCIÓN DE EXCEDENTE */}
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
              animation: 'pulse 2s infinite'
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
              </div>
            </div>
          )}

          {/* KPIs */}
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
                <div className="alm-kpi-sub">Bajo: {estadisticas.bajoPeso} · Sobre: {estadisticas.sobrePeso}</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FiTrendingUp size={28} style={{ color: '#10b981' }} /></div>
              <div>
                <div className="alm-kpi-label">META MANIFESTADA</div>
                <div className="alm-kpi-value" style={{ color: '#10b981' }}>{fmtTM(meta, 2)} TM</div>
                <div className="alm-kpi-sub">Cantidad contratada</div>
              </div>
            </div>
            <div className="alm-kpi">
              <div className="alm-kpi-icon"><FaWarehouse size={28} style={{ color: '#60a5fa' }} /></div>
              <div>
                <div className="alm-kpi-label">DESTINOS</div>
                <div className="alm-kpi-value" style={{ fontSize: '20px' }}>{Object.keys(estadisticas.porDestino).length}</div>
                <div className="alm-kpi-sub">Bodegas/Silos/Bins</div>
              </div>
            </div>
          </div>

          {/* META PROGRESS */}
          {meta > 0 && (
            <div className="alm-progress-hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiTrendingUp size={16} />
                  Progreso de Descarga vs Meta
                </span>
                <span style={{ color: tieneExcedente ? '#ef4444' : (metaCompletada ? '#4ade80' : '#10b981'), fontWeight: 'bold' }}>
                  {porcentajeMeta.toFixed(1)}%
                </span>
              </div>
              <div className="alm-progress-track">
                <div 
                  className={`alm-progress-fill ${tieneExcedente ? 'alm-progress-fill-warning' : ''}`} 
                  style={{ width: `${Math.min(porcentajeMeta, 100)}%` }} 
                />
                {tieneExcedente && (
                  <div style={{ 
                    position: 'relative',
                    width: `${Math.min(porcentajeMeta - 100, 100)}%`,
                    height: '12px',
                    background: '#ef4444',
                    borderRadius: '0 999px 999px 0',
                    marginTop: '-12px',
                    marginLeft: '100%',
                    transition: 'width 1s ease'
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                <span>0 TM</span>
                <span>{fmtTM(estadisticas.totalNeto, 0)} TM</span>
                <span>{fmtTM(meta, 0)} TM</span>
              </div>
            </div>
          )}

          {/* EMPRESAS TRANSPORTISTAS */}
          {promediosPorTransporte.length > 0 && (
            <>
              <div className="section-title">
                <FaBuilding size={14} />
                Empresas Transportistas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {promediosPorTransporte.map(empresa => {
                  const isSelected = transporteSeleccionado === empresa.nombre
                  return (
                    <div
                      key={empresa.nombre}
                      onClick={() => handleSeleccionarTransporte(empresa.nombre)}
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : '#1e293b',
                        border: `1px solid ${isSelected ? '#10b981' : '#334155'}`,
                        borderRadius: '12px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.01)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: 'white' }}>{empresa.nombre}</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: isSelected ? 'white' : '#10b981' }}>
                          {fmtTM(empresa.totalNeto, 1)} TM
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#94a3b8' }}>
                        <span>{empresa.totalViajes} viajes</span>
                        {empresa.viajesTraileta > 0 && <span>🚛 Traileta: {fmtTM(empresa.promedioTraileta, 1)} TM</span>}
                        {empresa.viajesVolqueta > 0 && <span>⛰️ Volqueta: {fmtTM(empresa.promedioVolqueta, 1)} TM</span>}
                      </div>
                      {empresa.fueraRango > 0 && (
                        <div style={{ fontSize: '10px', color: '#f87171', marginTop: '6px' }}>
                          ⚠️ {empresa.fueraRango} viajes fuera de rango
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* GRÁFICOS */}
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
                <FaWarehouse size={16} />
                Descarga por Destino
              </div>
              {datosGraficoDestino.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={datosGraficoDestino} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => {
                      const shortName = name.length > 20 ? name.substring(0, 18) + '...' : name
                      return `${shortName} ${(percent * 100).toFixed(0)}%`
                    }} labelLine={false}>
                      {datosGraficoDestino.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
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
                {diaSeleccionado && <span className="alm-badge alm-badge-filter">Filtrado: {diaSeleccionado}</span>}
              </div>
              {datosGraficoDia.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={datosGraficoDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                    <Bar 
                      dataKey="total" 
                      fill="#10b981" 
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
                            fill={isSelected ? '#059669' : '#10b981'}
                            stroke={isSelected ? '#fbbf24' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                            rx={4}
                            ry={4}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleSeleccionarDia(payload.dia)}
                          />
                        )
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
                💡 Haz clic en cualquier barra para filtrar por ese día
              </div>
            </div>

            <div className="alm-chart-card">
              <div className="alm-chart-title">
                <FaChartLine size={16} />
                Distribución de Pesos Netos
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '10px', justifyContent: 'center' }}>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4ade80', borderRadius: '2px' }}></span> En Rango</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#fbbf24', borderRadius: '2px' }}></span> Bajo Peso</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }}></span> Sobrepeso</span>
              </div>
              {estadisticas.acumuladoPorCorrelativo.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={estadisticas.acumuladoPorCorrelativo.map(item => ({ ...item, peso: item.peso }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="correlativo" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                    <Tooltip formatter={(v) => `${fmtTM(v, 2)} TM`} />
                    <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                      {estadisticas.acumuladoPorCorrelativo.map((entry, idx) => (
                        <Cell key={idx} fill={getColorPorEstado(entry.estado)} />
                      ))}
                    </Bar>
                    <ReferenceLine y={RANGOS.VOLQUETA.min} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: `Volq min ${RANGOS.VOLQUETA.min}`, fill: '#fbbf24', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.VOLQUETA.max} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: `Volq max ${RANGOS.VOLQUETA.max}`, fill: '#fbbf24', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.TRAILETA.min} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Trail min ${RANGOS.TRAILETA.min}`, fill: '#10b981', fontSize: 9 }} />
                    <ReferenceLine y={RANGOS.TRAILETA.max} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Trail max ${RANGOS.TRAILETA.max}`, fill: '#10b981', fontSize: 9 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Sin datos</div>}
            </div>
          </div>

          {/* FLUJO POR HORA */}
          <div className="alm-chart-card alm-chart-wide">
            <div className="alm-chart-title">
              <FiClock size={16} />
              Flujo de Descarga por Hora
            </div>
            {flujoPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={flujoPorHora}>
                  <defs>
                    <linearGradient id="flujoGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="hora" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => fmtTM(v, 0)} />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'totalTM') return [`${fmtTM(value, 2)} TM`, 'Descarga por Hora']
                    if (name === 'acumulado') return [`${fmtTM(value, 2)} TM`, 'Acumulado Total']
                    return [value, name]
                  }} />
                  <Bar yAxisId="left" dataKey="totalTM" fill="#10b981" opacity={0.8} radius={[4, 4, 0, 0]} name="Descarga por Hora" />
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#fbbf24" strokeWidth={3} dot={{ r: 3, fill: '#fbbf24' }} name="Acumulado Total" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '80px 40px' }}>
                <FiClock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No hay datos de hora disponibles</p>
              </div>
            )}
          </div>

          {/* TABLA DE REGISTROS */}
          <div className="alm-table-card">
            <div className="alm-table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <FaClipboardList size={14} />
                <span style={{ fontWeight: 'bold', color: 'white' }}>Registros de Descarga - Yeso</span>
                <span className="alm-badge">{registros.length} viajes</span>
                {destinoSeleccionado && (
                  <span className="alm-badge alm-badge-filter">
                    Destino: {destinos.find(d => d.id === destinoSeleccionado)?.nombre}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`orden-boton ${ordenTabla === 'reciente' ? 'orden-boton-activo' : ''}`} onClick={() => setOrdenTabla('reciente')}>
                  <FiArrowDown size={12} /> Más Reciente
                </button>
                <button className={`orden-boton ${ordenTabla === 'antiguo' ? 'orden-boton-activo' : ''}`} onClick={() => setOrdenTabla('antiguo')}>
                  <FiArrowUp size={12} /> Más Antiguo
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
                    <th>Tipo</th>
                    <th>Destino</th>
                    <th>Fecha</th>
                    <th>Hora Entrada</th>
                    <th>Hora Salida</th>
                    <th>Tiempo</th>
                    <th className="alm-td-num">Peso Neto</th>
                    <th className="alm-td-num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosOrdenados.map((reg) => {
                    const estado = getEstadoPeso(reg.peso_neto_updp_tm, reg.tipo_unidad)
                    let rowClass = ''
                    if (estado === 'bajo') rowClass = 'alm-table-row-bajo'
                    if (estado === 'sobre') rowClass = 'alm-table-row-sobre'
                    return (
                      <tr key={reg.id} className={rowClass}>
                        <td style={{ fontWeight: 'bold' }}>{reg.correlativo}</td>
                        <td style={{ fontFamily: 'monospace' }}>{reg.placa}</td>
                        <td>{reg.transporte || '—'}</td>
                        <td>{reg.tipo_unidad || '—'}</td>
                        <td>
                          {reg.destino_info && (
                            <span className="destino-badge">
                              {reg.destino_info.codigo} - {reg.destino_info.nombre}
                            </span>
                          )}
                        </td>
                        <td>{reg.fecha}</td>
                        <td>{reg.hora_entrada || '—'}</td>
                        <td>{reg.hora_salida || '—'}</td>
                        <td style={{ color: '#4ade80' }}>{reg.tiempo_atencion || '—'}</td>
                        <td className="alm-td-num" style={{ 
                          color: estado === 'bajo' ? '#fbbf24' : (estado === 'sobre' ? '#f87171' : '#4ade80'),
                          fontWeight: 'bold'
                        }}>
                          {reg.peso_neto_updp_tm?.toFixed(3)}
                        </td>
                        <td className="alm-td-num" style={{ color: '#fbbf24' }}>{reg.acumulado_updp_tm?.toFixed(3)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alm-footer">
            <FiRefreshCw size={10} style={{ display: 'inline', marginRight: '4px' }} />
            auto-refresh 30s · {barco.nombre} · YESO (YE-001) · {estadisticas.totalViajes} viajes · {fmtTM(estadisticas.totalNeto, 2)} TM descargadas
            <br />
            <span style={{ color: '#fbbf24' }}>🟡 VOLQUETA: 14-18 TM</span> · 
            <span style={{ color: '#10b981' }}>🟢 TRAILETA: 22-25 TM</span> · 
            <span style={{ color: '#f87171' }}>🔴 Rojo = Sobrepeso</span> · 
            <span style={{ color: '#fbbf24' }}>🟡 Amarillo = Bajo peso</span>
          </div>
        </div>
      </div>
    </>
  )
}