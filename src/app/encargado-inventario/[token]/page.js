'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isEncargadoInventario, isAdmin, logout } from '../../lib/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import * as XLSX from 'xlsx-js-style'
import {
  FiRefreshCw, FiX, FiTruck, FiBarChart2, FiHome,
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiClock,
  FiCalendar, FiAnchor, FiArrowDown, FiArrowUp,
  FiActivity, FiDatabase,
  FiSearch, FiFilter, FiGrid, FiList, FiLogOut, FiEye,
  FiArrowLeft
} from 'react-icons/fi'
import {
  FaWeightHanging, FaIndustry, FaBuilding, FaTachometerAlt,
  FaTrailer, FaMountain, FaChartPie, FaChartLine, FaDatabase as FaDatabaseIcon,
  FaClipboardList, FaFileExcel, FaWarehouse, FaShip, FaCubes,
  FaRegGem, FaRegClock, FaMedal, FaCalendarAlt, FaHourglassHalf
} from 'react-icons/fa'
import { GiCoalWagon, GiWeightScale, GiMinerals, GiCargoShip, GiCrane, GiDiamonds } from 'react-icons/gi'
import toast from 'react-hot-toast'

dayjs.locale('es')

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

const thStyle = { padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E5E5' }
const tdStyle = { padding: '8px 14px', color: '#1A1A1A', fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E5E5' }

const CARGAR_TODOS_LOS_REGISTROS = async (tabla, filtros = {}, orderBy = null) => {
  let todosLosRegistros = []
  let desde = 0
  const limite = 1000
  let hayMas = true

  while (hayMas) {
    let query = supabase.from(tabla).select('*')
    Object.entries(filtros).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else if (typeof value === 'object') {
        if (value.operator) {
          query = query.filter(key, value.operator, value.value)
        }
      } else {
        query = query.eq(key, value)
      }
    })
    if (orderBy) {
      query = query.order(orderBy.field, { ascending: orderBy.ascending !== false })
    }
    query = query.range(desde, desde + limite - 1)
    const { data, error } = await query
    if (error) break
    if (data && data.length > 0) {
      todosLosRegistros = [...todosLosRegistros, ...data]
      desde += limite
      hayMas = data.length === limite
    } else {
      hayMas = false
    }
  }
  return todosLosRegistros
}

const fmtTM = (tm, d = 3) => {
  if (tm == null || isNaN(tm)) return "0.000"
  const valor = Number(tm).toFixed(d)
  const partes = valor.split(".")
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return partes.join(".")
}

const PRODUCTOS_CONOCIDOS = {
  'AZ-001': { nombre: 'Azúcar', icono: '🍚' },
  'AZ-002': { nombre: 'Azúcar Refino', icono: '🍚' },
  'PC-001': { nombre: 'Pet Coke', icono: '🛢️' },
  'YE-001': { nombre: 'Yeso', icono: '🪨' },
  'CL-001': { nombre: 'Clinker', icono: '🪨' },
  'CL-002': { nombre: 'Clinker Nicaragua', icono: '🪨' },
  'SACOS': { nombre: 'Azúcar en Sacos', icono: '📦' },
}

const ProductBadge = ({ codigo, nombre, icono, totalTM, metaTM, registros }) => {
  const pct = metaTM > 0 ? Math.min((totalTM / metaTM) * 100, 100) : 0
  const faltante = metaTM > 0 ? Math.max(metaTM - totalTM, 0) : 0
  return (
    <div style={{
      background: COLOR_BLANCO,
      border: `1px solid ${COLOR_BORDE}`,
      borderRadius: '14px',
      padding: '16px',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <div style={{
          background: COLOR_AZUL_SUAVE, borderRadius: '10px',
          width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', flexShrink: 0
        }}>
          {icono || '📦'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, fontSize: '15px' }}>{nombre}</div>
          <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO }}>{codigo}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '800', color: COLOR_AZUL_PRINCIPAL, fontSize: '18px' }}>{fmtTM(totalTM, 3)} TM</div>
          {metaTM > 0 && <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO }}>Manifestado: {fmtTM(metaTM, 3)} TM</div>}
          {faltante > 0 && <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '600' }}>Faltante: {fmtTM(faltante, 3)} TM</div>}
        </div>
      </div>
      {registros > 0 && (
        <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '8px' }}>
          {registros} registro(s)
        </div>
      )}
      {metaTM > 0 && (
        <div>
          <div style={{ height: '8px', background: COLOR_GRIS_FONDO, borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 100 ? '#22C55E' : COLOR_AZUL_PRINCIPAL,
              borderRadius: '100px',
              transition: 'width 0.6s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, marginTop: '4px' }}>
            <span>0%</span>
            <span style={{ fontWeight: '600', color: pct >= 100 ? '#22C55E' : COLOR_AZUL_PRINCIPAL }}>{pct.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BarcoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token

  const [user, setUser] = useState(null)
  const [barco, setBarco] = useState(null)
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [corteDiario, setCorteDiario] = useState([])
  const [stats, setStats] = useState({ totalTM: 0, totalRegistros: 0, totalMeta: 0 })
  const [registrosDetalle, setRegistrosDetalle] = useState({})
  const [seccionActiva, setSeccionActiva] = useState('resumen')
  const [productoActivo, setProductoActivo] = useState(null)
  const [paginasDetalle, setPaginasDetalle] = useState({})
  const [paginaCorte, setPaginaCorte] = useState(1)
  const registrosPorPagina = 10
  const cortesPorPagina = 15

  const setPaginaDetalle = (key, pagina) => {
    setPaginasDetalle(prev => ({ ...prev, [key]: pagina }))
  }

  const exportarDetalleAExcel = useCallback(() => {
    try {
      toast.loading('Generando Excel...', { id: 'excel-detalle' })
      const wb = XLSX.utils.book_new()

      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
        fill: { fgColor: { rgb: '0000A3' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000080' } },
          bottom: { style: 'thin', color: { rgb: '000080' } },
          left: { style: 'thin', color: { rgb: '000080' } },
          right: { style: 'thin', color: { rgb: '000080' } },
        }
      }
      const dataStyle = {
        font: { color: { rgb: '000000' }, sz: 10, name: 'Calibri' },
        alignment: { vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'DDDDDD' } },
          bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
          left: { style: 'thin', color: { rgb: 'DDDDDD' } },
          right: { style: 'thin', color: { rgb: 'DDDDDD' } },
        }
      }

      Object.entries(registrosDetalle).forEach(([key, grupo]) => {
        const rows = []
        const tipo = grupo.tipo
        const nombre = grupo.producto?.nombre || key

        if (tipo === 'viajes') {
          rows.push(['# Viaje', 'Placa', 'Destino', 'Fecha', 'Salida UPDP', 'Entrada Almapac', 'Salida Almapac', 'Peso Neto (TM)'])
          grupo.registros.forEach(v => {
            rows.push([
              v.viaje_numero || '—',
              v.placa || '—',
              v.destino?.nombre || v.destino_nombre || '—',
              v.fecha ? dayjs(v.fecha).format('DD/MM/YY') : (v.fecha_entrada ? dayjs(v.fecha_entrada).format('DD/MM/YY') : '—'),
              v.hora_salida_updp || '—',
              v.hora_entrada_almapac || '—',
              v.hora_salida_almapac || '—',
              Number(v.peso_destino_tm || v.peso_neto || v.peso_neto_updp_tm || 0)
            ])
          })
        } else if (tipo === 'petcoke') {
          rows.push(['Correlativo', 'Placa', 'Transporte', 'Fecha Entrada', 'Hora Entrada', 'Hora Salida', 'Peso Neto (TM)'])
          grupo.registros.forEach(p => {
            rows.push([
              p.correlativo || '—',
              p.placa || '—',
              p.transporte || p.transportista || '—',
              p.fecha_entrada ? dayjs(p.fecha_entrada).format('DD/MM/YY') : '—',
              p.hora_entrada || '—',
              p.hora_salida || '—',
              Number(p.peso_neto || 0)
            ])
          })
        } else if (tipo === 'yeso') {
          rows.push(['Correlativo', 'Placa', 'Transporte', 'Fecha Entrada', 'Hora Entrada', 'Hora Salida', 'Peso Neto (TM)'])
          grupo.registros.forEach(y => {
            rows.push([
              y.correlativo || '—',
              y.placa || '—',
              y.transporte || y.transportista || '—',
              y.fecha_entrada ? dayjs(y.fecha_entrada).format('DD/MM/YY') : '—',
              y.hora_entrada || '—',
              y.hora_salida || '—',
              Number(y.peso_neto || 0)
            ])
          })
        } else if (tipo === 'banda') {
          rows.push(['Fecha / Hora', 'Acumulado (TM)'])
          grupo.registros.forEach(b => {
            rows.push([
              b.fecha_hora ? dayjs(b.fecha_hora).format('DD/MM/YY HH:mm') : '—',
              Number(b.acumulado_tm || 0)
            ])
          })
        } else if (tipo === 'exportacion') {
          rows.push(['Fecha / Hora', 'Acumulado (TM)'])
          grupo.registros.forEach(e => {
            rows.push([
              e.fecha_hora ? dayjs(e.fecha_hora).format('DD/MM/YY HH:mm') : '—',
              Number(e.acumulado_tm || 0)
            ])
          })
        } else if (tipo === 'sacos') {
          rows.push(['Fecha', 'Cantidad Paquetes', 'Paquetes Dañados', 'Buenos', 'Peso Saco (kg)', 'Total (TM)'])
          grupo.registros.forEach(s => {
            const buenos = (s.cantidad_paquetes || 0) - (s.paquetes_danados || 0)
            rows.push([
              s.fecha ? dayjs(s.fecha).format('DD/MM/YY') : '—',
              s.cantidad_paquetes || 0,
              s.paquetes_danados || 0,
              buenos,
              s.peso_saco_kg || 50,
              Number((buenos * (s.peso_saco_kg || 50)) / 1000)
            ])
          })
        }

        if (rows.length > 1) {
          const ws = XLSX.utils.aoa_to_sheet(rows)
          ws['!cols'] = rows[0].map(() => ({ wch: 18 }))

          const range = XLSX.utils.decode_range(ws['!ref'])
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r: 0, c })
            if (!ws[addr]) ws[addr] = { t: 's', v: '' }
            ws[addr].s = headerStyle
          }
          for (let r = 1; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
              const addr = XLSX.utils.encode_cell({ r, c })
              if (!ws[addr]) ws[addr] = { t: 's', v: '' }
              if (!ws[addr].s) ws[addr].s = dataStyle
            }
          }

          XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31))
        }
      })

      if (wb.SheetNames.length === 0) {
        toast.error('No hay datos para exportar', { id: 'excel-detalle' })
        return
      }

      const nombreBarco = barco?.nombre?.replace(/[^a-zA-Z0-9]/g, '_') || 'barco'
      XLSX.writeFile(wb, `Detalle_${nombreBarco}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
      toast.success('Excel descargado correctamente', { id: 'excel-detalle' })
    } catch (err) {
      console.error(err)
      toast.error('Error al exportar a Excel', { id: 'excel-detalle' })
    }
  }, [registrosDetalle, barco])

  const productosDisponibles = useMemo(() => {
    const set = new Set()
    Object.entries(registrosDetalle).forEach(([key, grupo]) => {
      const codigo = grupo.producto?.codigo || key.replace(/^(viajes_|banda_|export_)/, '')
      set.add(codigo)
    })
    return [...set].sort()
  }, [registrosDetalle])

  const registrosFiltrados = useMemo(() => {
    if (!productoActivo) return registrosDetalle
    const filtrados = {}
    Object.entries(registrosDetalle).forEach(([key, grupo]) => {
      const codigo = grupo.producto?.codigo || key.replace(/^(viajes_|banda_|export_)/, '')
      if (codigo === productoActivo) {
        if (productoActivo === 'SACOS' && grupo.tipo !== 'sacos') return
        filtrados[key] = grupo
      }
    })
    return filtrados
  }, [registrosDetalle, productoActivo])

  const resumenPorDestino = useMemo(() => {
    const fuente = productoActivo ? registrosFiltrados : registrosDetalle
    const limitesProductoDestino = barco?.metas_json?.limites_por_producto_destino || {}
    const limitesProductoActivo = productoActivo ? (limitesProductoDestino[productoActivo] || {}) : {}

    const mapa = {}

    Object.values(fuente).forEach(grupo => {
      if (grupo.tipo !== 'viajes') return
      grupo.registros.forEach(v => {
        if (!v.destino_id && !v.destino) return
        const key = v.destino_id || v.destino?.id || 'sin-destino'
        if (!mapa[key]) {
          mapa[key] = {
            destino_id: key,
            nombre: v.destino?.nombre || v.destino_nombre || 'Sin destino',
            limite_tm: Number(limitesProductoActivo[key]) || 0,
            viajes_count: 0,
            viajes_tm: 0,
            banda_count: 0,
            banda_tm: 0,
            total_tm: 0,
            detalle_viajes: [],
            detalle_banda: []
          }
        }
        mapa[key].viajes_count++
        mapa[key].viajes_tm += Number(v.peso_destino_tm || v.peso_neto || v.peso_neto_updp_tm || 0)
        mapa[key].detalle_viajes.push(v)
      })
    })

    Object.values(fuente).forEach(grupo => {
      if (grupo.tipo !== 'banda') return
      grupo.registros.forEach(l => {
        if (!l.destino_id) return
        const key = l.destino_id
        if (!mapa[key]) {
          mapa[key] = {
            destino_id: key,
            nombre: `Destino ${key}`,
            limite_tm: Number(limitesProductoActivo[key]) || 0,
            viajes_count: 0,
            viajes_tm: 0,
            banda_count: 0,
            banda_tm: 0,
            total_tm: 0,
            detalle_viajes: [],
            detalle_banda: []
          }
        }
        mapa[key].banda_count++
        mapa[key].detalle_banda.push(l)
      })
    })

    Object.values(mapa).forEach(d => {
      if (d.detalle_banda.length > 0) {
        const ultima = [...d.detalle_banda].sort((a, b) => dayjs(b.fecha_hora).valueOf() - dayjs(a.fecha_hora).valueOf())[0]
        d.banda_tm = Number(ultima.acumulado_tm) || 0
      }
      d.total_tm = d.viajes_tm + d.banda_tm
      d.porcentaje = d.limite_tm > 0 ? (d.total_tm / d.limite_tm) * 100 : 0
      d.faltante_tm = Math.max(0, d.limite_tm - d.total_tm)
      d.excedente_tm = Math.max(0, d.total_tm - d.limite_tm)
      d.completado = d.limite_tm > 0 && d.total_tm >= d.limite_tm
      d.cerca_limite = d.limite_tm > 0 && d.porcentaje >= 90 && d.porcentaje < 100
    })

    return Object.values(mapa).sort((a, b) => b.total_tm - a.total_tm)
  }, [registrosDetalle, productoActivo, barco])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }
    if (!isEncargadoInventario() && !isAdmin()) {
      toast.error('No tienes permisos')
      router.push('/')
      return
    }
    setUser(currentUser)
  }, [router])

  useEffect(() => {
    if (token && user) cargarBarco()
  }, [token, user])

  const cargarBarco = async () => {
    try {
      setLoading(true)
      const { data: barcoData, error } = await supabase
        .from('barcos')
        .select('*')
        .eq('token_compartido', token)
        .single()

      if (error || !barcoData) throw new Error('Barco no encontrado')
      setBarco(barcoData)
      await detectarProductos(barcoData)
    } catch (err) {
      toast.error('Error al cargar datos del barco')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const detectarProductos = async (barco) => {
    const resultados = []
    let totalTM = 0
    let totalRegistros = 0
    let totalMeta = 0

    const { data: catalogo } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)

    const catMap = {}
    catalogo?.forEach(p => { catMap[p.codigo] = p })

    // ─── Identificar tipo de barco ─────────────────────────────
    const tipoOp = barco.tipo_operacion
    const metasProductos = barco.metas_json?.productos || []
    const metasLimites = barco.metas_json?.limites || {}
    const limitesPorProductoDestino = barco.metas_json?.limites_por_producto_destino || {}

    const metaTMPorCodigo = (codigo) => {
      if (metasLimites[codigo]) return Number(metasLimites[codigo])
      const destinos = limitesPorProductoDestino[codigo]
      if (destinos) return Object.values(destinos).reduce((s, v) => s + Number(v), 0)
      return 0
    }

    const esExportacion = tipoOp === 'exportacion'
    const esSacos = metasProductos.includes('SACOS') || !!metasLimites['SACOS'] || !!limitesPorProductoDestino['SACOS']
    const esPetCoke = metasProductos.includes('PC-001') || !!metasLimites['PC-001'] || !!limitesPorProductoDestino['PC-001']
    const esYeso = metasProductos.includes('YE-001') || !!metasLimites['YE-001'] || !!limitesPorProductoDestino['YE-001']

    // ─── Cargar datos según tipo ───────────────────────────────
    let viajes = [], bandas = [], exportaciones = []
    let viajesPorProducto = {}, bandaPorProducto = {}, bandaCountPorProducto = {}, exportPorProducto = {}

    if (esExportacion) {
      exportaciones = await CARGAR_TODOS_LOS_REGISTROS('exportacion_banda', { barco_id: barco.id }, { field: 'fecha_hora', ascending: true })
      exportaciones.forEach(e => {
        exportPorProducto[e.producto_id] = Number(e.acumulado_tm) || 0
      })
      viajes = await CARGAR_TODOS_LOS_REGISTROS('viajes', { barco_id: barco.id, estado: 'completo' })
    } else {
      viajes = await CARGAR_TODOS_LOS_REGISTROS('viajes', { barco_id: barco.id, estado: 'completo' })
      bandas = await CARGAR_TODOS_LOS_REGISTROS('lecturas_banda', { barco_id: barco.id }, { field: 'fecha_hora', ascending: false })
      exportaciones = await CARGAR_TODOS_LOS_REGISTROS('exportacion_banda', { barco_id: barco.id }, { field: 'fecha_hora', ascending: true })
    }

    viajes.forEach(v => {
      const pid = v.producto_id
      if (!viajesPorProducto[pid]) viajesPorProducto[pid] = { tm: 0, count: 0 }
      viajesPorProducto[pid].tm += Number(v.peso_destino_tm) || 0
      viajesPorProducto[pid].count++
    })

    bandas.forEach(b => {
      bandaPorProducto[b.producto_id] = Number(b.acumulado_tm) || 0
      bandaCountPorProducto[b.producto_id] = (bandaCountPorProducto[b.producto_id] || 0) + 1
    })

    exportaciones.forEach(e => {
      exportPorProducto[e.producto_id] = Number(e.acumulado_tm) || 0
    })

    let sacosData = [], petcokeData = [], yesoData = []

    if (esSacos) {
      sacosData = await CARGAR_TODOS_LOS_REGISTROS('registros_sacos', { barco_id: barco.id })
    }
    if (esPetCoke) {
      petcokeData = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    }
    if (esYeso) {
      yesoData = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    }

    // ─── Detectar productos ────────────────────────────────────
    const codigosConRegistros = new Set()

    for (const pid of Object.keys(viajesPorProducto)) {
      const prod = catalogo?.find(c => c.id === Number(pid))
      if (prod) codigosConRegistros.add(prod.codigo)
    }
    for (const pid of Object.keys(bandaPorProducto)) {
      const prod = catalogo?.find(c => c.id === Number(pid))
      if (prod) codigosConRegistros.add(prod.codigo)
    }
    for (const pid of Object.keys(exportPorProducto)) {
      const prod = catalogo?.find(c => c.id === Number(pid))
      if (prod) codigosConRegistros.add(prod.codigo)
    }

    if (sacosData.length > 0 || esSacos) codigosConRegistros.add('SACOS')
    if (petcokeData.length > 0 || esPetCoke) codigosConRegistros.add('PC-001')
    if (yesoData.length > 0 || esYeso) codigosConRegistros.add('YE-001')

    metasProductos.forEach(c => codigosConRegistros.add(c))
    Object.keys(metasLimites).forEach(c => codigosConRegistros.add(c))

    // ─── Calcular TM por producto ──────────────────────────────
    for (const codigo of codigosConRegistros) {
      const info = PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo, icono: '📦' }
      const metaTM = metaTMPorCodigo(codigo)
      let tm = 0, registros = 0

      if (codigo === 'SACOS') {
        tm = sacosData.reduce((sum, v) => {
          const buenos = (v.cantidad_paquetes || 0) - (v.paquetes_danados || 0)
          return sum + (buenos * (v.peso_saco_kg || 50)) / 1000
        }, 0)
        registros = sacosData.length
      } else if (codigo === 'PC-001') {
        tm = petcokeData.reduce((sum, v) => sum + (Number(v.peso_neto) || 0), 0)
        registros = petcokeData.length
      } else if (codigo === 'YE-001') {
        tm = yesoData.reduce((sum, v) => sum + (Number(v.peso_neto) || 0), 0)
        registros = yesoData.length
      } else {
        const prod = catalogo?.find(c => c.codigo === codigo)
        if (!prod) continue
        const pid = prod.id

        const viajesTM = viajesPorProducto[pid]?.tm || 0
        const viajesCount = viajesPorProducto[pid]?.count || 0
        const bandaTM = bandaPorProducto[pid] || 0
        const bandaCount = bandaCountPorProducto[pid] || 0
        const exportTM = exportPorProducto[pid] || 0

        if (esExportacion) {
          tm = exportTM
          registros = exportaciones.filter(e => e.producto_id === pid).length
        } else if (prod.tipo_registro === 'banda') {
          tm = bandaTM
          registros = bandaCount
        } else {
          tm = viajesTM + bandaTM
          registros = viajesCount + bandaCount
        }
      }

      totalTM += tm
      totalRegistros += registros
      totalMeta += metaTM

      resultados.push({
        codigo,
        nombre: info.nombre,
        icono: info.icono,
        descargadoTM: tm,
        metaTM,
        registros
      })
    }

    const acumuladoUPDP = viajes.reduce((sum, v) => sum + (Number(v.peso_neto_updp_tm) || 0), 0)
    const acumuladoAlmapac = viajes.reduce((sum, v) => sum + (Number(v.peso_destino_tm) || 0), 0)

    resultados.sort((a, b) => b.descargadoTM - a.descargadoTM)
    setProductos(resultados)
    setStats({ totalTM, totalRegistros, totalMeta, acumuladoUPDP, acumuladoAlmapac })

    // ─── Construir detalle de registros ────────────────────────
    const detalle = {}

    if (viajes.length > 0) {
      const viajesConProducto = await Promise.all(viajes.map(async (v) => {
        const prod = catalogo?.find(c => c.id === v.producto_id)
        const { data: destinoData } = await supabase
          .from('destinos')
          .select('codigo, nombre')
          .eq('id', v.destino_id)
          .single()
        return { ...v, producto: prod, destino: destinoData }
      }))

      const agrupados = {}
      viajesConProducto.forEach(v => {
        const key = v.producto?.codigo || 'OTRO'
        if (!agrupados[key]) agrupados[key] = []
        agrupados[key].push(v)
      })
      Object.entries(agrupados).forEach(([codigo, registros]) => {
        detalle[`viajes_${codigo}`] = {
          tipo: 'viajes',
          producto: catalogo?.find(c => c.codigo === codigo) || PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo },
          registros: registros.sort((a, b) => (b.viaje_numero || 0) - (a.viaje_numero || 0))
        }
      })
    }

    if (bandas.length > 0) {
      const agrupados = {}
      bandas.forEach(b => {
        const prod = catalogo?.find(c => c.id === b.producto_id)
        const key = prod?.codigo || 'OTRO'
        if (!agrupados[key]) agrupados[key] = []
        agrupados[key].push(b)
      })
      Object.entries(agrupados).forEach(([codigo, registros]) => {
        detalle[`banda_${codigo}`] = {
          tipo: 'banda',
          producto: catalogo?.find(c => c.codigo === codigo) || PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo },
          registros: registros.sort((a, b) => dayjs(b.fecha_hora).valueOf() - dayjs(a.fecha_hora).valueOf())
        }
      })
    }

    if (exportaciones.length > 0) {
      const agrupados = {}
      exportaciones.forEach(e => {
        const prod = catalogo?.find(c => c.id === e.producto_id)
        const key = prod?.codigo || 'OTRO'
        if (!agrupados[key]) agrupados[key] = []
        agrupados[key].push(e)
      })
      Object.entries(agrupados).forEach(([codigo, registros]) => {
        detalle[`export_${codigo}`] = {
          tipo: 'exportacion',
          producto: catalogo?.find(c => c.codigo === codigo) || PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo },
          registros: registros.sort((a, b) => dayjs(b.fecha_hora).valueOf() - dayjs(a.fecha_hora).valueOf())
        }
      })
    }

    if (sacosData.length > 0) {
      detalle['sacos_especial'] = {
        tipo: 'sacos',
        producto: { codigo: 'SACOS', nombre: 'Azúcar en Sacos', icono: '📦' },
        registros: sacosData.sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf())
      }
    }

    if (petcokeData.length > 0) {
      detalle['petcoke_especial'] = {
        tipo: 'petcoke',
        producto: { codigo: 'PC-001', nombre: 'Pet Coke', icono: '🛢️' },
        registros: petcokeData.sort((a, b) => dayjs(b.fecha_entrada).valueOf() - dayjs(a.fecha_entrada).valueOf())
      }
    }

    if (yesoData.length > 0) {
      detalle['yeso_especial'] = {
        tipo: 'yeso',
        producto: { codigo: 'YE-001', nombre: 'Yeso', icono: '🪨' },
        registros: yesoData.sort((a, b) => (b.correlativo || 0) - (a.correlativo || 0))
      }
    }

    setRegistrosDetalle(detalle)

    // ─── Corte diario ──────────────────────────────────────────
    const diario = {}

    const agregarAlDiario = (fecha, tm, codigo) => {
      if (!fecha) return
      const key = dayjs(fecha).format('YYYY-MM-DD')
      if (!diario[key]) diario[key] = { fecha: key, productos: {}, total: 0 }
      diario[key].productos[codigo] = (diario[key].productos[codigo] || 0) + tm
      diario[key].total += tm
    }

    const productosPorId = {}
    catalogo?.forEach(p => { productosPorId[p.id] = p.codigo })

    viajes.forEach(v => {
      const codigo = productosPorId[v.producto_id] || 'OTRO'
      agregarAlDiario(v.fecha, Number(v.peso_destino_tm) || 0, codigo)
    })

    const ultimoPorDiaYProducto = (arr, campoFecha, campoTM) => {
      const groups = {}
      arr.forEach(item => {
        const d = dayjs(item[campoFecha]).format('YYYY-MM-DD')
        const codigo = productosPorId[item.producto_id] || 'OTRO'
        const key = `${d}_${codigo}`
        if (!groups[key] || dayjs(item[campoFecha]).isAfter(dayjs(groups[key].fecha_hora))) {
          groups[key] = { fecha: d, codigo, tm: Number(item[campoTM]) || 0, fecha_hora: item[campoFecha] }
        }
      })
      return Object.values(groups)
    }

    const primeroPorDiaYProducto = (arr, campoFecha, campoTM) => {
      const groups = {}
      arr.forEach(item => {
        const d = dayjs(item[campoFecha]).format('YYYY-MM-DD')
        const codigo = productosPorId[item.producto_id] || 'OTRO'
        const key = `${d}_${codigo}`
        if (!groups[key] || dayjs(item[campoFecha]).isBefore(dayjs(groups[key].fecha_hora))) {
          groups[key] = { fecha: d, codigo, tm: Number(item[campoTM]) || 0, fecha_hora: item[campoFecha] }
        }
      })
      return Object.values(groups)
    }

    const bandasUltimos = ultimoPorDiaYProducto(bandas, 'fecha_hora', 'acumulado_tm')
    const exportUltimos = ultimoPorDiaYProducto(exportaciones, 'fecha_hora', 'acumulado_tm')
    const bandasPrimeros = primeroPorDiaYProducto(bandas, 'fecha_hora', 'acumulado_tm')
    const exportPrimeros = primeroPorDiaYProducto(exportaciones, 'fecha_hora', 'acumulado_tm')

    const valoresFinDia = {}
    ;[...bandasUltimos, ...exportUltimos].forEach(item => {
      if (!valoresFinDia[item.fecha]) valoresFinDia[item.fecha] = {}
      valoresFinDia[item.fecha][item.codigo] = { tm: item.tm, fecha_hora: item.fecha_hora }
    })

    const valoresInicioDia = {}
    ;[...bandasPrimeros, ...exportPrimeros].forEach(item => {
      if (!valoresInicioDia[item.fecha]) valoresInicioDia[item.fecha] = {}
      const existing = valoresInicioDia[item.fecha][item.codigo]
      if (!existing || dayjs(item.fecha_hora).isBefore(dayjs(existing.fecha_hora))) {
        const hora = dayjs(item.fecha_hora).format('HH:mm')
        valoresInicioDia[item.fecha][item.codigo] = {
          tm: item.tm,
          esMedianoche: hora === '00:00'
        }
      }
    })

    const diasBandaExp = Object.keys(valoresFinDia).sort()
    diasBandaExp.forEach(dia => {
      if (!diario[dia]) diario[dia] = { fecha: dia, productos: {}, total: 0 }
      Object.entries(valoresFinDia[dia]).forEach(([codigo, data]) => {
        diario[dia].productos[codigo] = data.tm
      })
      diario[dia].total = Object.values(valoresFinDia[dia]).reduce((s, v) => s + v.tm, 0)
      diario[dia].ultimaHora = Object.values(valoresFinDia[dia]).reduce((latest, v) => {
        return !latest || dayjs(v.fecha_hora).isAfter(dayjs(latest)) ? v.fecha_hora : latest
      }, null)
    })

    sacosData.forEach(v => {
      const buenos = (v.cantidad_paquetes || 0) - (v.paquetes_danados || 0)
      const tm = (buenos * (v.peso_saco_kg || 50)) / 1000
      agregarAlDiario(v.fecha, tm, 'SACOS')
    })

    petcokeData.forEach(v => agregarAlDiario(v.fecha_entrada, Number(v.peso_neto) || 0, 'PC-001'))

    yesoData.forEach(v => agregarAlDiario(v.fecha_entrada, Number(v.peso_neto) || 0, 'YE-001'))

    const fechas = Object.keys(diario).sort()
    const ultimoValorAnterior = {}
    const corteFinal = fechas.map(f => {
      const entry = diario[f]
      const row = { fecha: f, total: 0, productos: {}, ultimaHora: entry.ultimaHora }
      Object.entries(entry.productos).forEach(([codigo, tm]) => {
        const inicioInfo = valoresInicioDia[f]?.[codigo]
        const corte = inicioInfo?.esMedianoche ? inicioInfo.tm : (ultimoValorAnterior[codigo] || 0)
        const dia = tm - corte
        ultimoValorAnterior[codigo] = tm
        row.productos[codigo] = { corte, dia, acumulado: tm }
      })
      row.total = Object.values(entry.productos).reduce((s, tm) => s + tm, 0)
      return row
    })

    setCorteDiario(corteFinal)
  }

  const handleLogout = () => logout()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_GRIS_FONDO }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚓</div>
          <div style={{ width: '48px', height: '48px', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 100 100" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E8EAF3" strokeWidth="6"/>
              <path d="M50 5 A45 45 0 0 1 95 50" fill="none" stroke="#0000A3" strokeWidth="6" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ color: COLOR_AZUL_PRINCIPAL, fontWeight: '500' }}>CARGANDO DATOS DEL BARCO</p>
        </div>
      </div>
    )
  }

  if (!barco) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLOR_GRIS_FONDO }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ color: COLOR_TEXTO_SECUNDARIO }}>Barco no encontrado</p>
          <Link href="/encargado-inventario" style={{ color: COLOR_AZUL_PRINCIPAL, marginTop: '12px', display: 'inline-block' }}>Volver al panel</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #F5F5F5; font-family: 'Inter', sans-serif; color: #1A1A1A; }
        .alm-topbar {
          background: #FFFFFF;
          border-bottom: 3px solid #FD7304;
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
        .alm-logo { height: 40px; }
        .alm-glass-btn {
          background: #E8EAF3;
          border: 1px solid #E5E5E5;
          border-radius: 12px;
          padding: 8px 20px;
          color: #0000A3;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .alm-glass-btn:hover { background: #0000A3; color: #FFFFFF; border-color: #0000A3; transform: translateY(-2px); }
        .alm-body { max-width: 1200px; margin: 0 auto; padding: 32px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .alm-topbar { padding: 0 16px; height: 70px; flex-wrap: wrap; }
          .alm-body { padding: 16px; }
        }
      `}</style>

      <header className="alm-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src="/logo.png" alt="ALMACENADORA DEL PACÍFICO" className="alm-logo" />
          <div style={{ width: '2px', height: '35px', background: COLOR_NARANJA }} />
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: COLOR_AZUL_PRINCIPAL }}>{barco.nombre}</div>
            <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO }}>
              {barco.codigo_barco && `${barco.codigo_barco} · `}
              {barco.tipo_operacion === 'exportacion' ? 'EXPORTACIÓN' : 'IMPORTACIÓN'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/encargado-inventario" className="alm-glass-btn" style={{ textDecoration: 'none' }}>
            <FiArrowLeft size={14} /> Volver
          </Link>
          <button onClick={handleLogout} className="alm-glass-btn" style={{ color: COLOR_ROJO }}>
            <FiLogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="alm-body">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px', marginBottom: '28px'
        }}>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_NARANJA}, #d46200)`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiActivity size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acumulado UPDP</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{fmtTM(stats.acumuladoUPDP, 3)} TM</div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_NARANJA}, #d46200)`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FaWarehouse size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acumulado Almapac</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{fmtTM(stats.acumuladoAlmapac, 3)} TM</div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiGrid size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registros</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{stats.totalRegistros.toLocaleString()}</div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FaCubes size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Productos</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{productos.length}</div>
          </div>
          <div style={{
            background: barco.fecha_llegada
              ? `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`
              : COLOR_GRIS_FONDO,
            borderRadius: '16px', padding: '18px 20px',
            color: barco.fecha_llegada ? COLOR_BLANCO : COLOR_TEXTO_SECUNDARIO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiCalendar size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha Atraque</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>
              {barco.fecha_llegada ? dayjs(barco.fecha_llegada).format('DD/MM/YYYY') : '—'}
            </div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_NARANJA}, #d46200)`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiTrendingUp size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Manifestado</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>{fmtTM(stats.totalMeta, 3)} TM</div>
          </div>
          {stats.totalMeta > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_NARANJA}, #d46200)`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiAlertCircle size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Faltante UPDP</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {stats.acumuladoUPDP >= stats.totalMeta ? (
                <span>Completado</span>
              ) : (
                <span>{fmtTM(stats.totalMeta - stats.acumuladoUPDP, 3)} TM</span>
              )}
            </div>
          </div>
          )}
          {stats.totalMeta > 0 && (
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_NARANJA}, #d46200)`,
            borderRadius: '16px', padding: '18px 20px', color: COLOR_BLANCO,
            display: 'flex', flexDirection: 'column', gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
              <FiAlertCircle size={12} />
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Faltante Almapac</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              {stats.acumuladoAlmapac >= stats.totalMeta ? (
                <span>Completado</span>
              ) : (
                <span>{fmtTM(stats.totalMeta - stats.acumuladoAlmapac, 3)} TM</span>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Toggle: Resumen / Registros Detallados */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{
            display: 'flex', background: COLOR_AZUL_SUAVE, borderRadius: '40px', padding: '4px', gap: '4px'
          }}>
            <button
              onClick={() => setSeccionActiva('resumen')}
              style={{
                padding: '8px 20px', borderRadius: '32px', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                background: seccionActiva === 'resumen' ? COLOR_AZUL_PRINCIPAL : 'transparent',
                color: seccionActiva === 'resumen' ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <FiGrid size={14} /> Resumen
            </button>
            <button
              onClick={() => setSeccionActiva('detalle')}
              style={{
                padding: '8px 20px', borderRadius: '32px', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                background: seccionActiva === 'detalle' ? COLOR_AZUL_PRINCIPAL : 'transparent',
                color: seccionActiva === 'detalle' ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <FiList size={14} /> Registros Detallados
            </button>
            <button
              onClick={exportarDetalleAExcel}
              style={{
                padding: '8px 20px', borderRadius: '32px', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                background: '#22C55E', color: COLOR_BLANCO,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <FaFileExcel size={14} /> Exportar Excel
            </button>
          </div>
        </div>

        {productosDisponibles.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setProductoActivo(null)}
              style={{
                padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                background: !productoActivo ? COLOR_AZUL_PRINCIPAL : COLOR_AZUL_SUAVE,
                color: !productoActivo ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL
              }}
            >Todos</button>
            {productosDisponibles.map(cod => {
              const info = PRODUCTOS_CONOCIDOS[cod] || { nombre: cod, icono: '📦' }
              const activo = productoActivo === cod
              return (
                <button
                  key={cod}
                  onClick={() => setProductoActivo(cod)}
                  style={{
                    padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '600',
                    cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                    background: activo ? COLOR_AZUL_PRINCIPAL : COLOR_AZUL_SUAVE,
                    color: activo ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL
                  }}
                >{info.icono} {info.nombre}</button>
              )
            })}
          </div>
        )}

        {seccionActiva === 'resumen' && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '13px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase',
            color: COLOR_TEXTO_SECUNDARIO, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <FaDatabaseIcon size={13} /> Productos Detectados
            <span style={{
              background: COLOR_AZUL_SUAVE, padding: '2px 12px', borderRadius: '100px',
              fontSize: '11px', color: COLOR_AZUL_PRINCIPAL, letterSpacing: 0
            }}>
              {productoActivo ? `1 de ${productos.length}` : `${productos.length} producto(s)`}
            </span>
          </div>
          {productos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: COLOR_TEXTO_SECUNDARIO }}>
              No se detectaron productos para este barco
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {(productoActivo ? productos.filter(p => p.codigo === productoActivo) : productos).map((p, idx) => (
                <ProductBadge
                  key={idx}
                  codigo={p.codigo}
                  nombre={p.nombre}
                  icono={p.icono}
                  totalTM={p.descargadoTM}
                  metaTM={p.metaTM}
                  registros={p.registros}
                />
              ))}
            </div>
          )}
        </div>
        )}

        {seccionActiva === 'resumen' && resumenPorDestino.length > 0 && (
          <div style={{
            background: COLOR_BLANCO, borderRadius: '16px', padding: '20px',
            border: `1px solid ${COLOR_BORDE}`, marginTop: '20px'
          }}>
            <div style={{
              fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
            }}>
              <FiHome size={13} /> Almacenado por Destino
              <span style={{
                background: COLOR_AZUL_SUAVE, padding: '2px 12px', borderRadius: '100px',
                fontSize: '11px', color: COLOR_AZUL_PRINCIPAL, letterSpacing: 0, fontWeight: '500'
              }}>
                {resumenPorDestino.length} destino(s)
              </span>
              <span style={{ fontSize: '12px', color: COLOR_TEXTO_SECUNDARIO, marginLeft: 'auto' }}>
                Total: <span style={{ fontWeight: '700', color: COLOR_AZUL_PRINCIPAL }}>
                  {resumenPorDestino.length > 0 ? resumenPorDestino.reduce((s, d) => s + d.total_tm, 0).toFixed(3) : '0.000'} TM
                </span>
              </span>
            </div>

            {resumenPorDestino.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR_TEXTO_SECUNDARIO, fontSize: '14px' }}>
                No hay viajes completos o lecturas de banda con destino asignado
              </div>
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {resumenPorDestino.map((dest, idx) => {
                const totalGeneral = resumenPorDestino.reduce((s, d) => s + d.total_tm, 0)
                const pct = totalGeneral > 0 ? (dest.total_tm / totalGeneral) * 100 : 0

                let borderCol = COLOR_BORDE, bgHeader = COLOR_AZUL_SUAVE, colorBadge = COLOR_AZUL_PRINCIPAL, bgBadge = COLOR_BLANCO
                let badgeText = `${dest.porcentaje.toFixed(0)}%`
                if (dest.limite_tm > 0) {
                  if (dest.completado) { borderCol = '#22C55E'; bgHeader = 'rgba(34,197,94,0.08)'; colorBadge = '#22C55E'; bgBadge = 'rgba(34,197,94,0.12)'; badgeText = 'COMPLETO' }
                  else if (dest.cerca_limite) { borderCol = '#F59E0B'; bgHeader = 'rgba(245,158,11,0.08)'; colorBadge = '#F59E0B'; bgBadge = 'rgba(245,158,11,0.12)'; badgeText = `${dest.porcentaje.toFixed(0)}%` }
                }

                return (
                <div key={dest.destino_id} style={{
                  background: COLOR_BLANCO, borderRadius: '14px', overflow: 'hidden',
                  border: `1px solid ${borderCol}`, transition: 'all 0.2s ease'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: bgHeader,
                    borderBottom: `1px solid ${borderCol}`
                  }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: COLOR_TEXTO_PRIMARIO }}>
                      {dest.nombre}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {dest.limite_tm > 0 && (
                        <span style={{
                          fontSize: '10px', fontWeight: '600', padding: '2px 10px', borderRadius: '100px',
                          background: bgBadge, color: colorBadge
                        }}>{badgeText}</span>
                      )}
                      <span style={{
                        fontSize: '10px', fontWeight: '500', padding: '2px 10px', borderRadius: '100px',
                        background: COLOR_GRIS_FONDO, color: COLOR_TEXTO_SECUNDARIO
                      }}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ height: '6px', background: COLOR_GRIS_FONDO, borderRadius: '100px', overflow: 'hidden', marginBottom: '12px' }}>
                      <div style={{
                        height: '100%', borderRadius: '100px', transition: 'all 0.3s ease',
                        width: `${Math.min(pct, 100)}%`,
                        background: dest.limite_tm > 0 && dest.completado ? '#22C55E' : dest.limite_tm > 0 && dest.cerca_limite ? '#F59E0B' : COLOR_AZUL_PRINCIPAL
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: COLOR_TEXTO_PRIMARIO }}>
                          {fmtTM(dest.total_tm, 3)} <span style={{ fontSize: '11px', fontWeight: '500', color: COLOR_TEXTO_SECUNDARIO }}>TM</span>
                        </div>
                        {dest.limite_tm > 0 && (
                          <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, marginTop: '2px' }}>
                            Manifestado: {fmtTM(dest.limite_tm, 3)} TM
                          </div>
                        )}
                      </div>
                      {dest.limite_tm > 0 && (
                        <div style={{ textAlign: 'right', fontSize: '11px' }}>
                          {dest.completado ? (
                            <span style={{ color: '#22C55E', fontWeight: '600' }}>COMPLETADO</span>
                          ) : (
                            <span style={{ color: dest.cerca_limite ? '#F59E0B' : COLOR_AZUL_PRINCIPAL, fontWeight: '600' }}>
                              {dest.porcentaje.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {dest.limite_tm > 0 && dest.faltante_tm > 0 && (
                      <div style={{ marginTop: '6px', padding: '6px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', color: '#ef4444' }}>
                        Faltante: {fmtTM(dest.faltante_tm, 3)} TM
                      </div>
                    )}
                  </div>

                  {dest.limite_tm > 0 && (
                    <div style={{ padding: '0 16px 8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '3px' }}>
                        <span>Progreso vs manifestado</span>
                        <span style={{ fontWeight: '600', color: dest.completado ? '#22C55E' : dest.cerca_limite ? '#F59E0B' : COLOR_AZUL_PRINCIPAL }}>
                          {dest.porcentaje.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ height: '5px', background: COLOR_GRIS_FONDO, borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '100px', transition: 'all 0.3s ease',
                          width: `${Math.min(dest.porcentaje, 100)}%`,
                          background: dest.completado ? '#22C55E' : dest.cerca_limite ? '#F59E0B' : COLOR_AZUL_PRINCIPAL
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '8px 16px 12px', display: 'grid', gridTemplateColumns: dest.viajes_count > 0 && dest.banda_count > 0 ? '1fr 1fr' : '1fr', gap: '8px' }}>
                    {dest.viajes_count > 0 && (
                      <div style={{ background: COLOR_GRIS_FONDO, borderRadius: '10px', padding: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: COLOR_TEXTO_SECUNDARIO, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Viajes
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#22C55E' }}>
                          {fmtTM(dest.viajes_tm, 3)} <span style={{ fontSize: '10px', fontWeight: '500', color: COLOR_TEXTO_SECUNDARIO }}>TM</span>
                        </div>
                        <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '4px' }}>
                          {dest.viajes_count} viaje(s)
                        </div>
                        <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {dest.detalle_viajes.sort((a, b) => (a.viaje_numero || 0) - (b.viaje_numero || 0)).map(v => (
                            <div key={v.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, background: COLOR_BLANCO,
                              padding: '3px 8px', borderRadius: '6px'
                            }}>
                              <span>Viaje #{v.viaje_numero} · {v.placa}{v.fecha ? ' (' + dayjs(v.fecha).format('DD-MM') + ')' : ''}</span>
                              <span style={{ fontWeight: '600', color: '#22C55E' }}>{fmtTM(Number(v.peso_destino_tm), 3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {dest.banda_count > 0 && (
                      <div style={{ background: COLOR_GRIS_FONDO, borderRadius: '10px', padding: '10px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: COLOR_TEXTO_SECUNDARIO, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Banda
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: COLOR_AZUL_PRINCIPAL }}>
                          {fmtTM(dest.banda_tm, 3)} <span style={{ fontSize: '10px', fontWeight: '500', color: COLOR_TEXTO_SECUNDARIO }}>TM</span>
                        </div>
                        <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '4px' }}>
                          Ultima de {dest.banda_count} lectura(s)
                        </div>
                        <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {dest.detalle_banda.sort((a, b) => dayjs(b.fecha_hora).valueOf() - dayjs(a.fecha_hora).valueOf()).slice(0, 5).map(l => (
                            <div key={l.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, background: COLOR_BLANCO,
                              padding: '3px 8px', borderRadius: '6px'
                            }}>
                              <span>{l.fecha_hora ? dayjs(l.fecha_hora).format('DD-MM HH:mm') : '—'}</span>
                              <span style={{ fontWeight: '600', color: COLOR_AZUL_PRINCIPAL }}>{fmtTM(Number(l.acumulado_tm), 3)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
            )}

            </div>
          )}

        {seccionActiva === 'resumen' && corteDiario.length > 0 && (
          <div style={{
            background: COLOR_BLANCO, borderRadius: '16px', padding: '20px',
            border: `1px solid ${COLOR_BORDE}`, marginTop: '20px'
          }}>
            <div style={{
              fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
            }}>
              <FiCalendar size={13} /> Corte Diario — Acumulado al Corte de las 00:00
              <span style={{
                background: COLOR_AZUL_SUAVE, padding: '2px 12px', borderRadius: '100px',
                fontSize: '11px', color: COLOR_AZUL_PRINCIPAL, letterSpacing: 0, fontWeight: '500'
              }}>
                {corteDiario.length} día(s)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}` }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: COLOR_TEXTO_SECUNDARIO, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Fecha</th>
                    {(productoActivo ? productos.filter(p => p.codigo === productoActivo) : productos).map(p => (
                      <th key={p.codigo} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: COLOR_TEXTO_SECUNDARIO, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        {p.icono} {p.nombre.split(' ')[0]}
                      </th>
                    ))}
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: COLOR_AZUL_PRINCIPAL, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderLeft: `2px solid ${COLOR_BORDE}` }}>
                      Total Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalPagCorte = Math.max(1, Math.ceil(corteDiario.length / cortesPorPagina))
                    const pagCorteSegura = Math.min(paginaCorte, totalPagCorte)
                    const inicioCorte = (pagCorteSegura - 1) * cortesPorPagina
                    const cortesPagina = corteDiario.slice(inicioCorte, inicioCorte + cortesPorPagina)
                    return cortesPagina.map((row, idx) => {
                      const idxGlobal = inicioCorte + idx
                      const isLast = idxGlobal === corteDiario.length - 1
                      return (
                        <tr key={row.fecha} style={{
                          borderBottom: `1px solid ${COLOR_BORDE}`,
                          background: isLast ? 'rgba(0,0,163,0.03)' : 'transparent'
                        }}>
                          <td style={{ padding: '10px 12px', fontWeight: '600', color: COLOR_TEXTO_PRIMARIO, whiteSpace: 'nowrap' }}>
                            {dayjs(row.fecha).format('DD/MM/YYYY')}
                          </td>
                          {(productoActivo ? productos.filter(p => p.codigo === productoActivo) : productos).map(p => {
                            const prodData = row.productos[p.codigo]
                            return (
                              <td key={p.codigo} style={{ padding: '10px 12px', textAlign: 'right', color: COLOR_TEXTO_PRIMARIO, whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: '600' }}>{prodData ? fmtTM(prodData.corte, 3) : '0.000'}</div>
                                <div style={{ fontSize: '9px', color: COLOR_TEXTO_SECUNDARIO }}>(+{prodData ? fmtTM(prodData.dia, 3) : '0.000'})</div>
                              </td>
                            )
                          })}
                          <td style={{
                            padding: '10px 12px', textAlign: 'right', fontWeight: '800',
                            color: COLOR_AZUL_PRINCIPAL, whiteSpace: 'nowrap',
                            borderLeft: `2px solid ${COLOR_BORDE}`
                          }}>
                            <div>{fmtTM(row.total, 3)} TM</div>
                            {isLast && row.ultimaHora && <div style={{ fontSize: '9px', fontWeight: '500', color: '#92400E' }}>🕐 {dayjs(row.ultimaHora).format('HH:mm DD/MM')}</div>}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const totalPagCorte = Math.max(1, Math.ceil(corteDiario.length / cortesPorPagina))
              if (totalPagCorte <= 1) return null
              const pagCorteSegura = Math.min(paginaCorte, totalPagCorte)
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: '12px', marginTop: '12px', borderTop: `1px solid ${COLOR_BORDE}`,
                  fontSize: '11px'
                }}>
                  <span style={{ color: COLOR_TEXTO_SECUNDARIO }}>
                    Página {pagCorteSegura} de {totalPagCorte}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setPaginaCorte(p => Math.max(1, p - 1))}
                      disabled={pagCorteSegura <= 1}
                      style={{
                        padding: '4px 12px', borderRadius: '6px', border: `1px solid ${COLOR_BORDE}`,
                        background: COLOR_BLANCO, color: COLOR_TEXTO_PRIMARIO, fontSize: '11px',
                        cursor: pagCorteSegura > 1 ? 'pointer' : 'not-allowed', opacity: pagCorteSegura > 1 ? 1 : 0.4,
                        fontWeight: '500'
                      }}
                    >Anterior</button>
                    <button
                      onClick={() => setPaginaCorte(p => Math.min(totalPagCorte, p + 1))}
                      disabled={pagCorteSegura >= totalPagCorte}
                      style={{
                        padding: '4px 12px', borderRadius: '6px', border: `1px solid ${COLOR_BORDE}`,
                        background: COLOR_BLANCO, color: COLOR_TEXTO_PRIMARIO, fontSize: '11px',
                        cursor: pagCorteSegura < totalPagCorte ? 'pointer' : 'not-allowed',
                        opacity: pagCorteSegura < totalPagCorte ? 1 : 0.4, fontWeight: '500'
                      }}
                    >Siguiente</button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {seccionActiva === 'detalle' && (
          <div style={{
            background: COLOR_BLANCO, borderRadius: '16px', padding: '20px',
            border: `1px solid ${COLOR_BORDE}`, marginTop: '20px'
          }}>
            <div style={{
              fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
            }}>
              <FiDatabase size={13} /> Registros Detallados
              <span style={{
                background: COLOR_AZUL_SUAVE, padding: '2px 12px', borderRadius: '100px',
                fontSize: '11px', color: COLOR_AZUL_PRINCIPAL, letterSpacing: 0, fontWeight: '500'
              }}>
                {Object.keys(registrosFiltrados).length} tabla(s)
              </span>
            </div>

            {Object.keys(registrosFiltrados).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR_TEXTO_SECUNDARIO, fontSize: '14px' }}>
                No hay registros detallados disponibles
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(registrosFiltrados).map(([key, grupo]) => {
                  const pagina = paginasDetalle[key] || 1
                  const totalPaginas = Math.max(1, Math.ceil(grupo.registros.length / registrosPorPagina))
                  const paginaSegura = Math.min(pagina, totalPaginas)
                  const inicio = (paginaSegura - 1) * registrosPorPagina
                  const registrosPagina = grupo.registros.slice(inicio, inicio + registrosPorPagina)
                  return (
                    <div key={key} style={{
                      border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px', overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', background: COLOR_AZUL_SUAVE,
                        fontSize: '13px', fontWeight: '600', color: COLOR_AZUL_PRINCIPAL
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {grupo.producto?.icono || '📦'} {grupo.producto?.nombre || key}
                          <span style={{
                            background: COLOR_BLANCO, padding: '1px 10px', borderRadius: '100px',
                            fontSize: '10px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500'
                          }}>
                            {grupo.registros.length} registro(s)
                          </span>
                          <span style={{
                            background: COLOR_BLANCO, padding: '1px 10px', borderRadius: '100px',
                            fontSize: '10px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500'
                          }}>
                            {grupo.tipo === 'viajes' ? 'Viajes' : grupo.tipo === 'banda' ? 'Banda' : grupo.tipo === 'exportacion' ? 'Exportación' : grupo.tipo === 'sacos' ? 'Sacos' : grupo.tipo}
                          </span>
                        </span>
                      </div>

                      <div style={{ overflowX: 'auto', padding: '0' }}>
                        {grupo.tipo === 'viajes' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}># Viaje</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Destino</th>
                                  <th style={thStyle}>Fecha</th>
                                  <th style={thStyle}>Salida UPDP</th>
                                  <th style={thStyle}>Entrada Almapac</th>
                                  <th style={thStyle}>Salida Almapac</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(v => (
                                  <tr key={v.id || v.viaje_numero} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{v.viaje_numero || '—'}</td>
                                    <td style={tdStyle}>{v.placa || '—'}</td>
                                    <td style={tdStyle}>{v.destino?.nombre || v.destino_nombre || '—'}</td>
                                    <td style={tdStyle}>{v.fecha ? dayjs(v.fecha).format('DD/MM/YY') : (v.fecha_entrada ? dayjs(v.fecha_entrada).format('DD/MM/YY') : '—')}</td>
                                    <td style={tdStyle}>{v.hora_salida_updp || '—'}</td>
                                    <td style={tdStyle}>{v.hora_entrada_almapac || '—'}</td>
                                    <td style={tdStyle}>{v.hora_salida_almapac || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>
                                      {fmtTM(v.peso_destino_tm || v.peso_neto || v.peso_neto_updp_tm || 0, 3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {grupo.tipo === 'banda' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha / Hora</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Acumulado (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(b => (
                                  <tr key={b.id} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{b.fecha_hora ? dayjs(b.fecha_hora).format('DD/MM/YY HH:mm') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(b.acumulado_tm || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {grupo.tipo === 'exportacion' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha / Hora</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Acumulado (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(e => (
                                  <tr key={e.id} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{e.fecha_hora ? dayjs(e.fecha_hora).format('DD/MM/YY HH:mm') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(e.acumulado_tm || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {grupo.tipo === 'sacos' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Cant. Sacos</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso / Saco (kg)</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Total (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(s => {
                                  const totalKg = (Number(s.cantidad_paquetes) || 0) * (Number(s.peso_saco_kg) || 0)
                                  return (
                                    <tr key={s.id} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                      <td style={tdStyle}>{s.fecha ? dayjs(s.fecha).format('DD/MM/YY') : '—'}</td>
                                      <td style={{ ...tdStyle, textAlign: 'right' }}>{(s.cantidad_paquetes || 0).toLocaleString()}</td>
                                      <td style={{ ...tdStyle, textAlign: 'right' }}>{s.peso_saco_kg || '—'}</td>
                                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(totalKg / 1000, 3)}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {grupo.tipo === 'petcoke' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Correlativo</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Transporte</th>
                                  <th style={thStyle}>Fecha Entrada</th>
                                  <th style={thStyle}>Hora Entrada</th>
                                  <th style={thStyle}>Hora Salida</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(p => (
                                  <tr key={p.id || p.correlativo} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{p.correlativo || '—'}</td>
                                    <td style={tdStyle}>{p.placa || '—'}</td>
                                    <td style={tdStyle}>{p.transporte || p.transportista || '—'}</td>
                                    <td style={tdStyle}>{p.fecha_entrada ? dayjs(p.fecha_entrada).format('DD/MM/YY') : '—'}</td>
                                    <td style={tdStyle}>{p.hora_entrada || '—'}</td>
                                    <td style={tdStyle}>{p.hora_salida || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(p.peso_neto || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {grupo.tipo === 'yeso' && (
                          <div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Correlativo</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Transporte</th>
                                  <th style={thStyle}>Fecha Entrada</th>
                                  <th style={thStyle}>Hora Entrada</th>
                                  <th style={thStyle}>Hora Salida</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {registrosPagina.map(y => (
                                  <tr key={y.id || y.correlativo} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{y.correlativo || '—'}</td>
                                    <td style={tdStyle}>{y.placa || '—'}</td>
                                    <td style={tdStyle}>{y.transporte || y.transportista || '—'}</td>
                                    <td style={tdStyle}>{y.fecha_entrada ? dayjs(y.fecha_entrada).format('DD/MM/YY') : '—'}</td>
                                    <td style={tdStyle}>{y.hora_entrada || '—'}</td>
                                    <td style={tdStyle}>{y.hora_salida || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(y.peso_neto || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {totalPaginas > 1 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 16px', borderTop: `1px solid ${COLOR_BORDE}`,
                          background: COLOR_GRIS_FONDO, fontSize: '11px'
                        }}>
                          <span style={{ color: COLOR_TEXTO_SECUNDARIO }}>
                            Página {paginaSegura} de {totalPaginas}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => setPaginaDetalle(key, paginaSegura - 1)}
                              disabled={paginaSegura <= 1}
                              style={{
                                padding: '4px 12px', borderRadius: '6px', border: `1px solid ${COLOR_BORDE}`,
                                background: COLOR_BLANCO, color: COLOR_TEXTO_PRIMARIO, fontSize: '11px',
                                cursor: paginaSegura > 1 ? 'pointer' : 'not-allowed', opacity: paginaSegura > 1 ? 1 : 0.4,
                                fontWeight: '500'
                              }}
                            >Anterior</button>
                            <button
                              onClick={() => setPaginaDetalle(key, paginaSegura + 1)}
                              disabled={paginaSegura >= totalPaginas}
                              style={{
                                padding: '4px 12px', borderRadius: '6px', border: `1px solid ${COLOR_BORDE}`,
                                background: COLOR_BLANCO, color: COLOR_TEXTO_PRIMARIO, fontSize: '11px',
                                cursor: paginaSegura < totalPaginas ? 'pointer' : 'not-allowed',
                                opacity: paginaSegura < totalPaginas ? 1 : 0.4, fontWeight: '500'
                              }}
                            >Siguiente</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {barco.metas_json?.limites && Object.keys(barco.metas_json.limites).length > 0 && (
          <div style={{
            background: COLOR_BLANCO, borderRadius: '16px', padding: '20px',
            border: `1px solid ${COLOR_BORDE}`, marginTop: '20px'
          }}>
            <div style={{
              fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
            }}>
              <FiActivity size={13} /> Metas Manifestadas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {Object.entries(barco.metas_json.limites).map(([codigo, meta]) => {
                const info = PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo, icono: '📦' }
                const prod = productos.find(p => p.codigo === codigo)
                const actual = prod?.descargadoTM || 0
                const pct = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
                return (
                  <div key={codigo} style={{ background: COLOR_GRIS_FONDO, borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', fontSize: '12px' }}>{info.icono} {info.nombre}</span>
                      <span style={{ fontWeight: '700', color: COLOR_AZUL_PRINCIPAL, fontSize: '13px' }}>{fmtTM(meta, 3)} TM</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO, marginBottom: '4px' }}>
                      <span>Actual: {fmtTM(actual, 3)} TM</span>
                      <span style={{ fontWeight: '600', color: pct >= 100 ? '#22C55E' : COLOR_AZUL_PRINCIPAL }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '4px', background: COLOR_BORDE, borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: pct >= 100 ? '#22C55E' : COLOR_AZUL_PRINCIPAL,
                        borderRadius: '100px', transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '24px 20px', borderTop: `1px solid ${COLOR_BORDE}`, marginTop: '28px' }}>
          <div style={{ marginTop: '10px', fontSize: '9px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500' }}>
            ALMACENADORA DEL PACÍFICO · Panel de Inventario · {barco.nombre}
          </div>
        </div>
      </div>
    </div>
  )
}
