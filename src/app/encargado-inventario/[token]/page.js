'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isEncargadoInventario, isAdmin, logout } from '../../lib/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import {
  FiRefreshCw, FiX, FiTruck, FiBarChart2, FiHome,
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiClock,
  FiCalendar, FiAnchor, FiArrowDown, FiArrowUp,
  FiChevronDown, FiChevronUp, FiActivity, FiDatabase,
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
          {metaTM > 0 && <div style={{ fontSize: '10px', color: COLOR_TEXTO_SECUNDARIO }}>Meta: {fmtTM(metaTM, 3)} TM</div>}
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
  const [stats, setStats] = useState({ totalTM: 0, totalRegistros: 0 })
  const [registrosDetalle, setRegistrosDetalle] = useState({})
  const [seccionActiva, setSeccionActiva] = useState('resumen')
  const [productoExpandido, setProductoExpandido] = useState(null)

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

    const { data: catalogo } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)

    const catMap = {}
    catalogo?.forEach(p => { catMap[p.codigo] = p })

    // 1. viajes → agrupar por producto_id
    const viajes = await CARGAR_TODOS_LOS_REGISTROS('viajes', { barco_id: barco.id, estado: 'completo' })
    const viajesPorProducto = {}
    viajes.forEach(v => {
      const pid = v.producto_id
      if (!viajesPorProducto[pid]) viajesPorProducto[pid] = { tm: 0, count: 0 }
      viajesPorProducto[pid].tm += Number(v.peso_destino_tm) || 0
      viajesPorProducto[pid].count++
    })

    // 2. lecturas_banda → agrupar por producto_id
    const bandas = await CARGAR_TODOS_LOS_REGISTROS('lecturas_banda', { barco_id: barco.id }, { field: 'fecha_hora', ascending: false })
    const bandaPorProducto = {}
    const bandaCountPorProducto = {}
    bandas.forEach(b => {
      bandaPorProducto[b.producto_id] = Number(b.acumulado_tm) || 0
      bandaCountPorProducto[b.producto_id] = (bandaCountPorProducto[b.producto_id] || 0) + 1
    })

    // 3. exportacion_banda → agrupar por producto_id
    const exportaciones = await CARGAR_TODOS_LOS_REGISTROS('exportacion_banda', { barco_id: barco.id }, { field: 'fecha_hora', ascending: true })
    const exportPorProducto = {}
    exportaciones.forEach(e => {
      exportPorProducto[e.producto_id] = Number(e.acumulado_tm) || 0
    })

    // 4. productos desde catálogo que tengan registros
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

    // 5. Sacos
    const { count: sacosCount } = await supabase
      .from('registros_sacos')
      .select('id', { count: 'exact', head: true })
      .eq('barco_id', barco.id)
    if (sacosCount > 0) codigosConRegistros.add('SACOS')

    // 6. Pet Coke
    const { count: petCount } = await supabase
      .from('petcoke_viajes')
      .select('id', { count: 'exact', head: true })
      .eq('barco_id', barco.id)
    if (petCount > 0) codigosConRegistros.add('PC-001')

    // 7. Yeso
    const { count: yesoCount } = await supabase
      .from('yeso_viajes')
      .select('id', { count: 'exact', head: true })
      .eq('barco_id', barco.id)
    if (yesoCount > 0) codigosConRegistros.add('YE-001')

    // 8. También agregar desde metas_json o productos explícitos
    const explicitos = barco.metas_json?.productos || []
    explicitos.forEach(c => codigosConRegistros.add(c))
    if (barco.metas_json?.limites) Object.keys(barco.metas_json.limites).forEach(c => codigosConRegistros.add(c))

    for (const codigo of codigosConRegistros) {
      const info = PRODUCTOS_CONOCIDOS[codigo] || { nombre: codigo, icono: '📦' }
      const metaTM = barco.metas_json?.limites?.[codigo] || 0
      let tm = 0, registros = 0

      if (codigo === 'SACOS') {
        const sacosData = await CARGAR_TODOS_LOS_REGISTROS('registros_sacos', { barco_id: barco.id })
        tm = sacosData.reduce((sum, v) => {
          const buenos = (v.cantidad_paquetes || 0) - (v.paquetes_danados || 0)
          return sum + (buenos * (v.peso_saco_kg || 50)) / 1000
        }, 0)
        registros = sacosData.length
      } else if (codigo === 'PC-001') {
        const data = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
        tm = data.reduce((sum, v) => sum + (Number(v.peso_neto) || 0), 0)
        registros = data.length
      } else if (codigo === 'YE-001') {
        const data = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
        tm = data.reduce((sum, v) => sum + (Number(v.peso_neto) || 0), 0)
        registros = data.length
      } else {
        const prod = catalogo?.find(c => c.codigo === codigo)
        if (!prod) continue
        const pid = prod.id

        const viajesTM = viajesPorProducto[pid]?.tm || 0
        const viajesCount = viajesPorProducto[pid]?.count || 0
        const bandaTM = bandaPorProducto[pid] || 0
        const bandaCount = bandaCountPorProducto[pid] || 0
        const exportTM = exportPorProducto[pid] || 0

        if (barco.tipo_operacion === 'exportacion') {
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

      resultados.push({
        codigo,
        nombre: info.nombre,
        icono: info.icono,
        descargadoTM: tm,
        metaTM,
        registros
      })
    }

    resultados.sort((a, b) => b.descargadoTM - a.descargadoTM)
    setProductos(resultados)
    setStats({ totalTM, totalRegistros })

    // Guardar registros detallados para cada producto
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

    const sacosDetalle = await CARGAR_TODOS_LOS_REGISTROS('registros_sacos', { barco_id: barco.id })
    if (sacosDetalle.length > 0) {
      detalle['sacos_especial'] = {
        tipo: 'sacos',
        producto: { codigo: 'SACOS', nombre: 'Azúcar en Sacos', icono: '📦' },
        registros: sacosDetalle.sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf())
      }
    }

    const petcokeDetalle = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    if (petcokeDetalle.length > 0) {
      detalle['petcoke_especial'] = {
        tipo: 'petcoke',
        producto: { codigo: 'PC-001', nombre: 'Pet Coke', icono: '🛢️' },
        registros: petcokeDetalle.sort((a, b) => dayjs(b.fecha_entrada).valueOf() - dayjs(a.fecha_entrada).valueOf())
      }
    }

    const yesoDetalle = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    if (yesoDetalle.length > 0) {
      detalle['yeso_especial'] = {
        tipo: 'yeso',
        producto: { codigo: 'YE-001', nombre: 'Yeso', icono: '🪨' },
        registros: yesoDetalle.sort((a, b) => (b.correlativo || 0) - (a.correlativo || 0))
      }
    }

    setRegistrosDetalle(detalle)

    // Calcular corte diario (acumulado al corte de las 00:00 de cada día)
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

    const ultimoPorDia = (arr, campoFecha, campoTM) => {
      const groups = {}
      arr.forEach(item => {
        const d = dayjs(item[campoFecha]).format('YYYY-MM-DD')
        if (!groups[d] || dayjs(item[campoFecha]).isAfter(dayjs(groups[d][campoFecha]))) {
          groups[d] = item
        }
      })
      const acum = 0
      const sorted = Object.values(groups).sort((a, b) => dayjs(a[campoFecha]).valueOf() - dayjs(b[campoFecha]).valueOf())
      let running = 0
      return sorted.map(item => {
        const d = dayjs(item[campoFecha]).format('YYYY-MM-DD')
        running = Number(item[campoTM]) || 0
        return { fecha: d, tm: running }
      })
    }

    const bandasDiario = ultimoPorDia(bandas, 'fecha_hora', 'acumulado_tm')
    bandasDiario.forEach(b => {
      const bandaEnDia = bandas.filter(bd => dayjs(bd.fecha_hora).format('YYYY-MM-DD') === b.fecha)
      bandaEnDia.forEach(bd => {
        const codigo = productosPorId[bd.producto_id] || 'OTRO'
        if (!diario[b.fecha]) diario[b.fecha] = { fecha: b.fecha, productos: {}, total: 0 }
        diario[b.fecha].productos[codigo] = Number(bd.acumulado_tm) || 0
      })
    })

    const exportDiario = ultimoPorDia(exportaciones, 'fecha_hora', 'acumulado_tm')
    exportDiario.forEach(b => {
      const expEnDia = exportaciones.filter(e => dayjs(e.fecha_hora).format('YYYY-MM-DD') === b.fecha)
      expEnDia.forEach(e => {
        const codigo = productosPorId[e.producto_id] || 'OTRO'
        if (!diario[b.fecha]) diario[b.fecha] = { fecha: b.fecha, productos: {}, total: 0 }
        diario[b.fecha].productos[codigo] = Number(e.acumulado_tm) || 0
      })
    })

    // Sacos
    const sacosData = await CARGAR_TODOS_LOS_REGISTROS('registros_sacos', { barco_id: barco.id })
    sacosData.forEach(v => {
      const buenos = (v.cantidad_paquetes || 0) - (v.paquetes_danados || 0)
      const tm = (buenos * (v.peso_saco_kg || 50)) / 1000
      agregarAlDiario(v.fecha, tm, 'SACOS')
    })

    // Pet Coke
    const petData = await CARGAR_TODOS_LOS_REGISTROS('petcoke_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    petData.forEach(v => agregarAlDiario(v.fecha_entrada, Number(v.peso_neto) || 0, 'PC-001'))

    // Yeso
    const yesoData = await CARGAR_TODOS_LOS_REGISTROS('yeso_viajes', { barco_id: barco.id, estado: 'COMPLETADO' })
    yesoData.forEach(v => agregarAlDiario(v.fecha_entrada, Number(v.peso_neto) || 0, 'YE-001'))

    const fechas = Object.keys(diario).sort()
    const acumuladoProductos = {}
    const corteFinal = fechas.map(f => {
      const entry = diario[f]
      const row = { fecha: f, total: 0, productos: {} }
      Object.entries(entry.productos).forEach(([codigo, tm]) => {
        acumuladoProductos[codigo] = (acumuladoProductos[codigo] || 0) + tm
        row.productos[codigo] = { dia: tm, acumulado: acumuladoProductos[codigo] }
      })
      row.total = Object.values(acumuladoProductos).reduce((s, v) => s + v, 0)
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
    <>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`,
            borderRadius: '18px', padding: '20px', color: COLOR_BLANCO
          }}>
            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>Total Descargado / Recibido</div>
            <div style={{ fontSize: '26px', fontWeight: '800' }}>{fmtTM(stats.totalTM, 3)} TM</div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`,
            borderRadius: '18px', padding: '20px', color: COLOR_BLANCO
          }}>
            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>Total Registros</div>
            <div style={{ fontSize: '26px', fontWeight: '800' }}>{stats.totalRegistros.toLocaleString()}</div>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`,
            borderRadius: '18px', padding: '20px', color: COLOR_BLANCO
          }}>
            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>Productos Detectados</div>
            <div style={{ fontSize: '26px', fontWeight: '800' }}>{productos.length}</div>
          </div>
          <div style={{
            background: barco.fecha_llegada
              ? `linear-gradient(135deg, ${COLOR_AZUL_PRINCIPAL}, ${COLOR_AZUL_MARINO})`
              : COLOR_GRIS_FONDO,
            borderRadius: '18px', padding: '20px',
            color: barco.fecha_llegada ? COLOR_BLANCO : COLOR_TEXTO_SECUNDARIO
          }}>
            <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px' }}>Fecha Atraque</div>
            <div style={{ fontSize: '18px', fontWeight: '800' }}>
              {barco.fecha_llegada ? dayjs(barco.fecha_llegada).format('DD/MM/YYYY') : '—'}
            </div>
          </div>
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
          </div>
        </div>

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
              {productos.length} producto(s)
            </span>
          </div>
          {productos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: COLOR_TEXTO_SECUNDARIO }}>
              No se detectaron productos para este barco
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {productos.map((p, idx) => (
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
                    {productos.map(p => (
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
                  {corteDiario.map((row, idx) => {
                    const isLast = idx === corteDiario.length - 1
                    return (
                      <tr key={row.fecha} style={{
                        borderBottom: `1px solid ${COLOR_BORDE}`,
                        background: isLast ? 'rgba(0,0,163,0.03)' : 'transparent'
                      }}>
                        <td style={{ padding: '10px 12px', fontWeight: '600', color: COLOR_TEXTO_PRIMARIO, whiteSpace: 'nowrap' }}>
                          {dayjs(row.fecha).format('DD/MM/YYYY')}
                        </td>
                        {productos.map(p => {
                          const prodData = row.productos[p.codigo]
                          return (
                            <td key={p.codigo} style={{ padding: '10px 12px', textAlign: 'right', color: COLOR_TEXTO_PRIMARIO, whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: '600' }}>{prodData ? fmtTM(prodData.acumulado, 3) : '0.000'}</div>
                              <div style={{ fontSize: '9px', color: COLOR_TEXTO_SECUNDARIO }}>(+{prodData ? fmtTM(prodData.dia, 3) : '0.000'})</div>
                            </td>
                          )
                        })}
                        <td style={{
                          padding: '10px 12px', textAlign: 'right', fontWeight: '800',
                          color: COLOR_AZUL_PRINCIPAL, whiteSpace: 'nowrap',
                          borderLeft: `2px solid ${COLOR_BORDE}`
                        }}>
                          {fmtTM(row.total, 3)} TM
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
                {Object.keys(registrosDetalle).length} tabla(s)
              </span>
            </div>

            {Object.keys(registrosDetalle).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: COLOR_TEXTO_SECUNDARIO, fontSize: '14px' }}>
                No hay registros detallados disponibles
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(registrosDetalle).map(([key, grupo]) => {
                  const isOpen = productoExpandido === key
                  return (
                    <div key={key} style={{
                      border: `1px solid ${COLOR_BORDE}`, borderRadius: '12px', overflow: 'hidden'
                    }}>
                      <button
                        onClick={() => setProductoExpandido(isOpen ? null : key)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 16px', background: COLOR_AZUL_SUAVE, border: 'none',
                          cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: COLOR_AZUL_PRINCIPAL
                        }}
                      >
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
                        {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                      </button>

                      {isOpen && (
                        <div style={{ overflowX: 'auto', padding: '0' }}>
                          {grupo.tipo === 'viajes' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}># Viaje</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Transporte</th>
                                  <th style={thStyle}>Tipo</th>
                                  <th style={thStyle}>Destino</th>
                                  <th style={thStyle}>Fecha</th>
                                  <th style={thStyle}>Hora Entrada</th>
                                  <th style={thStyle}>Hora Salida</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(v => (
                                  <tr key={v.id || v.viaje_numero} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{v.viaje_numero || '—'}</td>
                                    <td style={tdStyle}>{v.placa || '—'}</td>
                                    <td style={tdStyle}>{v.transporte || v.transportista || '—'}</td>
                                    <td style={tdStyle}>{v.tipo || '—'}</td>
                                    <td style={tdStyle}>{v.destino?.nombre || v.destino_nombre || '—'}</td>
                                    <td style={tdStyle}>{v.fecha ? dayjs(v.fecha).format('DD/MM/YY') : (v.fecha_entrada ? dayjs(v.fecha_entrada).format('DD/MM/YY') : '—')}</td>
                                    <td style={tdStyle}>{v.hora_entrada || (v.fecha_hora ? dayjs(v.fecha_hora).format('HH:mm') : '—')}</td>
                                    <td style={tdStyle}>{v.hora_salida || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>
                                      {fmtTM(v.peso_destino_tm || v.peso_neto || v.peso_neto_updp_tm || 0, 3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {grupo.tipo === 'banda' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha / Hora</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Acumulado (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(b => (
                                  <tr key={b.id} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{b.fecha_hora ? dayjs(b.fecha_hora).format('DD/MM/YY HH:mm') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(b.acumulado_tm || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {grupo.tipo === 'exportacion' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha / Hora</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Acumulado (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(e => (
                                  <tr key={e.id} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{e.fecha_hora ? dayjs(e.fecha_hora).format('DD/MM/YY HH:mm') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(e.acumulado_tm || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {grupo.tipo === 'sacos' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Fecha</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Cant. Paquetes</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso / Saco (kg)</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Total (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(s => {
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
                          )}

                          {grupo.tipo === 'petcoke' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Correlativo</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Transporte</th>
                                  <th style={thStyle}>Fecha Entrada</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(p => (
                                  <tr key={p.id || p.correlativo} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{p.correlativo || '—'}</td>
                                    <td style={tdStyle}>{p.placa || '—'}</td>
                                    <td style={tdStyle}>{p.transporte || p.transportista || '—'}</td>
                                    <td style={tdStyle}>{p.fecha_entrada ? dayjs(p.fecha_entrada).format('DD/MM/YY') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(p.peso_neto || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {grupo.tipo === 'yeso' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                              <thead>
                                <tr style={{ borderBottom: `2px solid ${COLOR_BORDE}`, background: COLOR_GRIS_FONDO }}>
                                  <th style={thStyle}>Correlativo</th>
                                  <th style={thStyle}>Placa</th>
                                  <th style={thStyle}>Transporte</th>
                                  <th style={thStyle}>Fecha Entrada</th>
                                  <th style={{ ...thStyle, textAlign: 'right' }}>Peso Neto (TM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.registros.map(y => (
                                  <tr key={y.id || y.correlativo} style={{ borderBottom: `1px solid ${COLOR_BORDE}` }}>
                                    <td style={tdStyle}>{y.correlativo || '—'}</td>
                                    <td style={tdStyle}>{y.placa || '—'}</td>
                                    <td style={tdStyle}>{y.transporte || y.transportista || '—'}</td>
                                    <td style={tdStyle}>{y.fecha_entrada ? dayjs(y.fecha_entrada).format('DD/MM/YY') : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{fmtTM(y.peso_neto || 0, 3)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
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
    </>
  )
}
