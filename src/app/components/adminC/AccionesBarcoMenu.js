// components/adminC/AccionesBarcoMenu.jsx
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  MoreVertical, Eye, Package, Edit2, ExternalLink, FileText,
  Truck, Clock, BarChart3, BookOpen, Power, Play,
  Download, Trash2, Copy, Upload as Export, ChevronRight, Flame,
  Anchor, Layers
} from 'lucide-react'

export default function AccionesBarcoMenu({
  barco,
  exportando,
  onVerDetalle,
  onEditarBarco,
  onGenerarDashboard,
  onGenerarDashboardSacos,
  onVerRegistroViajes,
  onCopiarLink,
  onVerViajesPaso1,
  onVerExportaciones,
  onVerBitacora,
  onCambiarEstado,
  onExportarBarco,
  onEliminarBarco,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const close = () => setOpen(false)

  // Verificar si el barco tiene Pet Coke configurado
  const tienePetCoke = barco.metas_json?.productos?.includes('PC-001')
  // Verificar si el barco tiene Yeso configurado
  const tieneYeso = barco.metas_json?.productos?.includes('YE-001')
  
  // Verificar si el barco tiene Clinker Fortaleza configurado
  const tieneClinkerFortaleza = barco.metas_json?.productos?.includes('CLF-001')
  // Verificar si el barco tiene Clinker Nicaragua configurado
  const tieneClinkerNica = barco.metas_json?.productos?.includes('CLINKER_NICA') || 
                           barco.metas_json?.productos?.includes('CLINKER-NICA') ||
                           barco.metas_json?.productos?.includes('CLINKER_NICARAGUA') ||
                           barco.nombre?.toLowerCase().includes('clinker')

  const grupos = [
    {
      titulo: 'Información',
      items: [
        {
          icon: Eye,
          label: 'Ver detalles',
          color: 'text-slate-300',
          hoverBg: 'hover:bg-slate-700',
          onClick: () => { onVerDetalle(barco); close() },
        },
        {
          icon: ExternalLink,
          label: 'Dashboard público',
          color: 'text-indigo-400',
          hoverBg: 'hover:bg-indigo-500/20',
          onClick: () => { onGenerarDashboard(barco); close() },
        },
        {
          icon: Package,
          label: 'Dashboard de Sacos',
          color: 'text-green-400',
          hoverBg: 'hover:bg-green-500/20',
          onClick: () => { onGenerarDashboardSacos(barco); close() },
        },
        // Dashboard de Pet Coke (si el producto está asociado)
        ...(tienePetCoke ? [{
          icon: Flame,
          label: 'Dashboard Pet Coke',
          color: 'text-orange-400',
          hoverBg: 'hover:bg-orange-500/20',
          isLink: true,
          href: `/compartido/petcoke/${barco.token_compartido}`,
        }] : []),
        // Dashboard de Yeso (si el producto está asociado)
        ...(tieneYeso ? [{
          icon: Layers,
          label: 'Dashboard Yeso',
          color: 'text-emerald-400',
          hoverBg: 'hover:bg-emerald-500/20',
          isLink: true,
          href: `/compartido/yeso/${barco.token_compartido}`,
        }] : []),
        // Dashboard de Clinker Fortaleza (si el producto está asociado)
        ...(tieneClinkerFortaleza ? [{
          icon: Anchor,
          label: 'Dashboard Clinker Fortaleza',
          color: 'text-teal-400',
          hoverBg: 'hover:bg-teal-500/20',
          isLink: true,
          href: `/compartido/clinker_fortaleza/${barco.token_compartido}`,
        }] : []),
        // Dashboard de Clinker Nicaragua (si el producto está asociado)
        ...(tieneClinkerNica ? [{
          icon: Anchor,
          label: 'Dashboard Clinker Nica',
          color: 'text-orange-400',
          hoverBg: 'hover:bg-orange-500/20',
          isLink: true,
          href: `/compartido/clinker_nica/${barco.token_compartido}`,
        }] : []),
      ],
    },
    {
      titulo: 'Registro',
      items: [
        // Registro de Pet Coke (si el producto está asociado)
        ...(tienePetCoke ? [{
          icon: Flame,
          label: 'Registrar Pet Coke',
          color: 'text-orange-400',
          hoverBg: 'hover:bg-orange-500/20',
          isLink: true,
          href: `/barco/${barco.token_compartido}/petcoke`,
        }] : []),
        // Registro de Yeso (si el producto está asociado)
        ...(tieneYeso ? [{
          icon: Layers,
          label: 'Registrar Yeso',
          color: 'text-emerald-400',
          hoverBg: 'hover:bg-emerald-500/20',
          isLink: true,
          href: `/barco/${barco.token_compartido}/yeso`,
        }] : []),
        // Registro de Clinker Fortaleza (si el producto está asociado)
        ...(tieneClinkerFortaleza ? [{
          icon: Anchor,
          label: 'Clinker Fortaleza',
          color: 'text-teal-400',
          hoverBg: 'hover:bg-teal-500/20',
          isLink: true,
          href: `/barco/${barco.token_compartido}/clinker_fortaleza`,
        }] : []),
        // Registro de Clinker Nicaragua (si el producto está asociado)
        ...(tieneClinkerNica ? [{
          icon: Anchor,
          label: 'Clinker Nicaragua',
          color: 'text-orange-400',
          hoverBg: 'hover:bg-orange-500/20',
          isLink: true,
          href: `/barco/${barco.token_compartido}/clinker-nica`,
        }] : []),
        barco.tipo_operacion === 'exportacion'
          ? {
              icon: Export,
              label: 'Ir a registrar recepción',
              color: 'text-blue-400',
              hoverBg: 'hover:bg-blue-500/20',
              onClick: () => { onVerRegistroViajes(barco.token_compartido, 'exportacion'); close() },
            }
          : {
              icon: Truck,
              label: 'Ir a registrar viajes',
              color: 'text-green-400',
              hoverBg: 'hover:bg-green-500/20',
              onClick: () => { onVerRegistroViajes(barco.token_compartido, 'importacion'); close() },
            },
        {
          icon: Package,
          label: 'Registrar Sacos',
          color: 'text-green-400',
          hoverBg: 'hover:bg-green-500/20',
          isLink: true,
          href: `/barco/${barco.token_compartido}/sacos`,
        },
        {
          icon: Copy,
          label: 'Copiar link de registro',
          color: 'text-sky-400',
          hoverBg: 'hover:bg-sky-500/20',
          onClick: () => { onCopiarLink(barco.token_compartido, barco.tipo_operacion); close() },
        },
      ],
    },
    {
      titulo: 'Datos',
      items: [
        ...(barco.tipo_operacion !== 'exportacion'
          ? [{
              icon: Clock,
              label: 'Viajes pendientes (paso 1)',
              color: 'text-yellow-400',
              hoverBg: 'hover:bg-yellow-500/20',
              onClick: () => { onVerViajesPaso1(barco); close() },
            }]
          : []),
        ...(barco.tipo_operacion === 'exportacion'
          ? [{
              icon: BarChart3,
              label: 'Producto recibido por banda',
              color: 'text-blue-400',
              hoverBg: 'hover:bg-blue-500/20',
              onClick: () => { onVerExportaciones(barco); close() },
            }]
          : []),
        {
          icon: BookOpen,
          label: 'Ver bitácora',
          color: 'text-purple-400',
          hoverBg: 'hover:bg-purple-500/20',
          onClick: () => { onVerBitacora(barco); close() },
        },
        {
          icon: FileText,
          label: 'Reporte de atrasos',
          color: 'text-orange-400',
          hoverBg: 'hover:bg-orange-500/20',
          isLink: true,
          href: `/admin/reporte-atrasos/${barco.id}`,
        },
      ],
    },
    {
      titulo: 'Administración',
      items: [
        {
          icon: Edit2,
          label: 'Editar barco',
          color: 'text-amber-400',
          hoverBg: 'hover:bg-amber-500/20',
          onClick: () => { onEditarBarco(barco); close() },
        },
        {
          icon: barco.estado === 'activo' ? Power : Play,
          label: barco.estado === 'activo' ? 'Finalizar operación' : 'Reanudar operación',
          color: barco.estado === 'activo' ? 'text-red-400' : 'text-green-400',
          hoverBg: barco.estado === 'activo' ? 'hover:bg-red-500/20' : 'hover:bg-green-500/20',
          onClick: () => { onCambiarEstado(barco.id, barco.estado); close() },
        },
        {
          icon: Download,
          label: exportando === barco.id ? 'Exportando...' : 'Exportar todos los datos',
          color: 'text-amber-300',
          hoverBg: 'hover:bg-amber-500/20',
          disabled: exportando === barco.id,
          onClick: () => { onExportarBarco(barco); close() },
        },
        {
          icon: Trash2,
          label: 'Eliminar barco',
          color: 'text-red-400',
          hoverBg: 'hover:bg-red-500/20',
          danger: true,
          onClick: () => { onEliminarBarco(barco.id, barco.nombre); close() },
        },
      ],
    },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm font-semibold
          ${open
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
        title="Acciones"
      >
        <MoreVertical className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Acciones</span>
      </button>

      {open && (
        <div
          className="
            absolute right-0 z-50 mt-1 w-72
            bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
          style={{ minWidth: '16rem' }}
        >
          {grupos.map((grupo, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="h-px bg-white/10 mx-2" />}
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {grupo.titulo}
              </p>

              {grupo.items.map((item, ii) => {
                const Icon = item.icon

                if (item.isLink) {
                  return (
                    <Link
                      key={ii}
                      href={item.href}
                      onClick={close}
                      className={`
                        flex items-center gap-3 px-3 py-2 mx-1 rounded-lg
                        transition-colors cursor-pointer
                        ${item.hoverBg} ${item.color}
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                        {item.label}
                      </span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-40" />
                    </Link>
                  )
                }

                return (
                  <button
                    key={ii}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 mx-1 rounded-lg
                      transition-colors text-left
                      ${item.disabled ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                      ${item.hoverBg}
                    `}
                    style={{ width: 'calc(100% - 0.5rem)' }}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${item.color}`} />
                    <span className={`text-sm font-medium ${item.danger ? 'text-red-300' : 'text-slate-200'}`}>
                      {item.label}
                    </span>
                    {item.disabled && (
                      <div className="ml-auto w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                )
              })}

              {gi === grupos.length - 1 && <div className="h-2" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}