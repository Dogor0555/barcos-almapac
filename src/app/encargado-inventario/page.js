'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getCurrentUser, isEncargadoInventario, isAdmin, logout } from '../lib/auth'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import {
  FiRefreshCw, FiActivity, FiSearch, FiLogOut, FiEye
} from 'react-icons/fi'
import { FaShip } from 'react-icons/fa'
import toast from 'react-hot-toast'

dayjs.locale('es')

const COLOR_AZUL_PRINCIPAL = "#0000A3"
const COLOR_AZUL_MARINO = "#182A6E"
const COLOR_AZUL_SUAVE = "#E8EAF3"
const COLOR_BLANCO = "#FFFFFF"
const COLOR_NARANJA = "#FD7304"
const COLOR_ROJO = "#DC2626"
const COLOR_GRIS_FONDO = "#F5F5F5"
const COLOR_TEXTO_PRIMARIO = "#1A1A1A"
const COLOR_TEXTO_SECUNDARIO = "#6B7280"
const COLOR_BORDE = "#E5E5E5"

export default function EncargadoInventarioPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      router.push('/')
      return
    }
    if (!isEncargadoInventario() && !isAdmin()) {
      toast.error('No tienes permisos para acceder a esta sección')
      router.push('/')
      return
    }
    setUser(currentUser)
    cargarBarcos()
  }, [router])

  const cargarBarcos = async () => {
    try {
      setLoading(true)
      const { data: barcosData, error } = await supabase
        .from('barcos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const barcosConResumen = await Promise.all((barcosData || []).map(async (barco) => {
        const { count: viajesCount } = await supabase
          .from('viajes')
          .select('*', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        const { count: exportCount } = await supabase
          .from('exportacion_banda')
          .select('*', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        const { count: sacosCount } = await supabase
          .from('registros_sacos')
          .select('id', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        const { count: petcokeCount } = await supabase
          .from('petcoke_viajes')
          .select('id', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        const { count: yesoCount } = await supabase
          .from('yeso_viajes')
          .select('id', { count: 'exact', head: true })
          .eq('barco_id', barco.id)

        return {
          ...barco,
          viajesCount: viajesCount || 0,
          exportCount: exportCount || 0,
          sacosCount: sacosCount || 0,
          petcokeCount: petcokeCount || 0,
          yesoCount: yesoCount || 0,
          registrosCount: (viajesCount || 0) + (exportCount || 0) + (sacosCount || 0) + (petcokeCount || 0) + (yesoCount || 0)
        }
      }))

      setBarcos(barcosConResumen)
    } catch (error) {
      console.error('Error cargando barcos:', error)
      toast.error('Error al cargar los barcos')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => logout()

  const barcosFiltrados = barcos.filter(barco => {
    if (filtroTipo !== 'todos' && barco.tipo_operacion !== filtroTipo) return false
    if (searchTerm && !barco.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(barco.codigo_barco || '').toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const getProductosChips = (barco) => {
    const chips = []
    const codigos = new Set()

    if (barco.sacosCount > 0) codigos.add({ codigo: 'SACOS', nombre: 'Azúcar en Sacos', icono: '📦' })
    if (barco.petcokeCount > 0) codigos.add({ codigo: 'PC-001', nombre: 'Pet Coke', icono: '🛢️' })
    if (barco.yesoCount > 0) codigos.add({ codigo: 'YE-001', nombre: 'Yeso', icono: '🪨' })
    if (barco.viajesCount > 0) codigos.add({ codigo: 'VIAJES', nombre: 'Importación (Viajes)', icono: '🚛' })
    if (barco.exportCount > 0) codigos.add({ codigo: 'EXPORT', nombre: 'Exportación (Banda)', icono: '📤' })

    const productosBarco = barco.metas_json?.productos || []
    const nombres = {
      'AZ-001': { nombre: 'Azúcar', icono: '🍚' },
      'AZ-002': { nombre: 'Azúcar Refino', icono: '🍚' },
      'PC-001': { nombre: 'Pet Coke', icono: '🛢️' },
      'YE-001': { nombre: 'Yeso', icono: '🪨' },
      'CL-001': { nombre: 'Clinker', icono: '🪨' },
      'CL-002': { nombre: 'Clinker Nicaragua', icono: '🪨' },
      'SACOS': { nombre: 'Azúcar en Sacos', icono: '📦' },
    }
    productosBarco.forEach(c => {
      if (nombres[c]) codigos.add({ codigo: c, ...nombres[c] })
    })

    if (barco.metas_json?.limites) {
      Object.keys(barco.metas_json.limites).forEach(c => {
        if (nombres[c]) codigos.add({ codigo: c, ...nombres[c] })
      })
    }

    return [...codigos]
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
        .alm-body { max-width: 1440px; margin: 0 auto; padding: 32px; }
        .alm-search-input {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 12px;
          padding: 10px 16px 10px 40px;
          font-size: 13px;
          width: 100%;
          max-width: 400px;
          outline: none;
        }
        .alm-search-input:focus { border-color: #0000A3; box-shadow: 0 0 0 3px rgba(0,0,163,0.1); }
        .alm-badge {
          background: #E8EAF3;
          border: 1px solid #0000A3;
          color: #0000A3;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
        }
        .barco-card {
          background: #FFFFFF;
          border: 1px solid #E5E5E5;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .barco-card:hover {
          border-color: #0000A3;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,163,0.1);
        }
        .barco-card-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .barco-card-body {
          border-top: 1px solid #E5E5E5;
          padding: 16px 20px;
        }
        .producto-chip {
          background: #E8EAF3;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 11px;
          color: #0000A3;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .alm-section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #6B7280;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .alm-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, #E5E5E5, transparent); }
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
            <div style={{ fontWeight: '800', fontSize: '18px', color: COLOR_AZUL_PRINCIPAL }}>Panel de Inventario</div>
            <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO }}>
              {user?.nombre} · {barcos.length} barcos
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={cargarBarcos} className="alm-glass-btn">
            <FiRefreshCw size={14} /> Actualizar
          </button>
          <button onClick={handleLogout} className="alm-glass-btn" style={{ color: COLOR_ROJO }}>
            <FiLogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="alm-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <FiSearch size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: COLOR_TEXTO_SECUNDARIO }} />
            <input
              type="text"
              placeholder="Buscar barco por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="alm-search-input"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`alm-badge ${filtroTipo === 'todos' ? 'active-filter' : ''}`}
              style={{
                cursor: 'pointer',
                background: filtroTipo === 'todos' ? COLOR_AZUL_PRINCIPAL : COLOR_AZUL_SUAVE,
                color: filtroTipo === 'todos' ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL,
                border: 'none'
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('importacion')}
              className={`alm-badge ${filtroTipo === 'importacion' ? 'active-filter' : ''}`}
              style={{
                cursor: 'pointer',
                background: filtroTipo === 'importacion' ? COLOR_AZUL_PRINCIPAL : COLOR_AZUL_SUAVE,
                color: filtroTipo === 'importacion' ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL,
                border: 'none'
              }}
            >
              Importación
            </button>
            <button
              onClick={() => setFiltroTipo('exportacion')}
              className={`alm-badge ${filtroTipo === 'exportacion' ? 'active-filter' : ''}`}
              style={{
                cursor: 'pointer',
                background: filtroTipo === 'exportacion' ? COLOR_AZUL_PRINCIPAL : COLOR_AZUL_SUAVE,
                color: filtroTipo === 'exportacion' ? COLOR_BLANCO : COLOR_AZUL_PRINCIPAL,
                border: 'none'
              }}
            >
              Exportación
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px', animation: 'float 2s ease-in-out infinite' }}>⚓</div>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 100 100" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="#E8EAF3" strokeWidth="6"/>
                <path d="M50 5 A45 45 0 0 1 95 50" fill="none" stroke="#0000A3" strokeWidth="6" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ color: COLOR_AZUL_PRINCIPAL, fontWeight: '500', fontSize: '13px' }}>CARGANDO INVENTARIO DE BARCOS</p>
          </div>
        ) : barcosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <FaShip size={48} color={COLOR_BORDE} style={{ marginBottom: '16px' }} />
            <p style={{ color: COLOR_TEXTO_SECUNDARIO }}>
              {searchTerm || filtroTipo !== 'todos' ? 'No se encontraron barcos con los filtros aplicados' : 'No hay barcos registrados'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {barcosFiltrados.map(barco => {
              const chips = getProductosChips(barco)

              return (
                <Link
                  key={barco.id}
                  href={`/encargado-inventario/${barco.token_compartido}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="barco-card">
                    <div className="barco-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          background: COLOR_AZUL_SUAVE, borderRadius: '12px',
                          padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <FaShip size={22} color={COLOR_AZUL_PRINCIPAL} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: COLOR_TEXTO_PRIMARIO, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {barco.nombre}
                            <span style={{
                              display: 'inline-block', padding: '2px 10px', borderRadius: '100px', fontSize: '10px',
                              background: barco.estado === 'activo' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: barco.estado === 'activo' ? '#16A34A' : '#DC2626',
                              fontWeight: '600'
                            }}>
                              {barco.estado}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO, display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {barco.codigo_barco && <span>Código: {barco.codigo_barco}</span>}
                            <span style={{
                              padding: '1px 8px', borderRadius: '100px', fontSize: '10px',
                              background: barco.tipo_operacion === 'importacion' ? 'rgba(0,0,163,0.1)' : 'rgba(253,115,4,0.1)',
                              color: barco.tipo_operacion === 'importacion' ? COLOR_AZUL_PRINCIPAL : COLOR_NARANJA
                            }}>
                              {barco.tipo_operacion === 'importacion' ? 'IMPORTACIÓN' : 'EXPORTACIÓN'}
                            </span>
                            {barco.fecha_llegada && <span>Atraque: {dayjs(barco.fecha_llegada).format('DD/MM/YYYY')}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: COLOR_TEXTO_SECUNDARIO }}>Registros</div>
                          <div style={{ fontWeight: '800', color: COLOR_AZUL_PRINCIPAL, fontSize: '18px' }}>{barco.registrosCount}</div>
                        </div>
                        <div style={{
                          background: COLOR_AZUL_PRINCIPAL, borderRadius: '10px',
                          padding: '10px 16px', color: COLOR_BLANCO,
                          display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600',
                          fontSize: '12px'
                        }}>
                          <FiEye size={14} /> Ver Detalle
                        </div>
                      </div>
                    </div>
                    {chips.length > 0 && (
                      <div className="barco-card-body" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {chips.map((p, idx) => (
                          <span key={idx} className="producto-chip">
                            {p.icono} {p.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '24px 20px', borderTop: `1px solid ${COLOR_BORDE}`, marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '9px', color: COLOR_TEXTO_SECUNDARIO }}>
            <span><FaShip size={9} /> {barcos.length} barcos registrados</span>
            <span><FiActivity size={9} /> Total registros: {barcos.reduce((s, b) => s + b.registrosCount, 0).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: '10px', fontSize: '9px', color: COLOR_AZUL_PRINCIPAL, fontWeight: '500' }}>
            ALMACENADORA DEL PACÍFICO · Sistema de Gestión de Inventario de Barcos
          </div>
        </div>
        </div>
    </>
  )
}
