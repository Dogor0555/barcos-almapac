'use client'

import { useState } from 'react'
import { formatTM, formatHora } from '../../lib/utils'
import { Edit2, Save, X, Trash2, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function ExcelTable({ viajes, productos, destinos, resumen, onRefresh }) {
  const [editandoId, setEditandoId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [ordenAsc, setOrdenAsc] = useState(false)

  const viajesOrdenados = [...viajes].sort((a, b) => 
    ordenAsc ? a.viaje_numero - b.viaje_numero : b.viaje_numero - a.viaje_numero
  )

  const handleEditar = (viaje) => {
    setEditandoId(viaje.id)
    setEditForm({
      hora_entrada_almapac: viaje.hora_entrada_almapac || '',
      hora_salida_updp: viaje.hora_salida_updp || '',
      placa: viaje.placa || '',
      peso_neto_updp_kg: viaje.peso_neto_updp_kg || '',
      peso_bruto_almapac_kg: viaje.peso_bruto_almapac_kg || '',
      producto_id: viaje.producto_id || '',
      destino_id: viaje.destino_id || ''
    })
  }

  const handleCancelar = () => {
    setEditandoId(null)
    setEditForm({})
  }

  const handleGuardar = async (viajeId) => {
    try {
      const { error } = await supabase
        .from('viajes')
        .update({
          hora_entrada_almapac: editForm.hora_entrada_almapac || null,
          hora_salida_updp: editForm.hora_salida_updp || null,
          placa: editForm.placa,
          peso_neto_updp_kg: Number(editForm.peso_neto_updp_kg),
          peso_bruto_almapac_kg: editForm.peso_bruto_almapac_kg ? Number(editForm.peso_bruto_almapac_kg) : null,
          producto_id: Number(editForm.producto_id),
          destino_id: Number(editForm.destino_id)
        })
        .eq('id', viajeId)

      if (error) throw error

      toast.success('Viaje actualizado')
      setEditandoId(null)
      onRefresh()
    } catch (error) {
      console.error('Error actualizando:', error)
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (viajeId) => {
    if (!confirm('¿Estás seguro de eliminar este viaje?')) return

    try {
      const { error } = await supabase
        .from('viajes')
        .delete()
        .eq('id', viajeId)

      if (error) throw error

      toast.success('Viaje eliminado')
      onRefresh()
    } catch (error) {
      console.error('Error eliminando:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-white/10">
        <h3 className="font-black text-white flex items-center gap-2">
          <span className="text-lg">📋</span>
          Historial de Viajes ({viajes.length})
        </h3>
        <button
          onClick={() => setOrdenAsc(!ordenAsc)}
          className="flex items-center gap-1 text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
        >
          {ordenAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {ordenAsc ? 'Más antiguos' : 'Más recientes'}
        </button>
      </div>

      {/* Tabla estilo Excel */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">#</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Ent.</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Hora Sal.</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Placa</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Neto (kg)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Neto (TM)</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Destino</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acumulado</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Faltante</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {viajesOrdenados.map((viaje) => {
              const productoInfo = resumen?.[viaje.producto_id]
              const faltanteTM = productoInfo?.faltanteTM || 0
              const metaCumplida = productoInfo?.completado
              
              return (
                <tr key={viaje.id} className={`hover:bg-white/5 transition-colors ${
                  editandoId === viaje.id ? 'bg-blue-500/10' : ''
                }`}>
                  {editandoId === viaje.id ? (
                    // Modo edición
                    <>
                      <td className="px-4 py-3 font-bold text-white">{viaje.viaje_numero}</td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          name="hora_entrada_almapac"
                          value={editForm.hora_entrada_almapac}
                          onChange={handleInputChange}
                          className="w-20 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          name="hora_salida_updp"
                          value={editForm.hora_salida_updp}
                          onChange={handleInputChange}
                          className="w-20 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          name="placa"
                          value={editForm.placa}
                          onChange={handleInputChange}
                          className="w-24 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          name="peso_neto_updp_kg"
                          value={editForm.peso_neto_updp_kg}
                          onChange={handleInputChange}
                          className="w-24 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-green-400">
                        {formatTM(editForm.peso_neto_updp_kg)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          name="producto_id"
                          value={editForm.producto_id}
                          onChange={handleInputChange}
                          className="w-28 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        >
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.codigo}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          name="destino_id"
                          value={editForm.destino_id}
                          onChange={handleInputChange}
                          className="w-28 bg-slate-800 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        >
                          {destinos.map(d => (
                            <option key={d.id} value={d.id}>{d.codigo}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-400">
                        {formatTM(viaje.total_acumulado_kg)}
                      </td>
                      <td className="px-4 py-3">
                        {faltanteTM > 0 ? (
                          <span className="text-amber-400 font-bold">{formatTM(faltanteTM * 1000)}</span>
                        ) : metaCumplida ? (
                          <span className="text-green-400">✓</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleGuardar(viaje.id)}
                            className="p-1.5 hover:bg-green-500/20 rounded-lg text-green-400 transition-colors"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelar}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // Modo vista
                    <>
                      <td className="px-4 py-3 font-bold text-white">{viaje.viaje_numero}</td>
                      <td className="px-4 py-3">{formatHora(viaje.hora_entrada_almapac)}</td>
                      <td className="px-4 py-3">{formatHora(viaje.hora_salida_updp)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">{viaje.placa}</td>
                      <td className="px-4 py-3 text-slate-400">{viaje.peso_neto_updp_kg?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold text-green-400">{formatTM(viaje.peso_neto_updp_kg)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          viaje.producto?.codigo === 'MA-001' ? 'bg-amber-500/20 text-amber-400' :
                          viaje.producto?.codigo === 'HS-001' ? 'bg-green-500/20 text-green-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {viaje.producto?.icono} {viaje.producto?.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">{viaje.destino?.nombre}</td>
                      <td className="px-4 py-3 font-bold text-blue-400">{formatTM(viaje.total_acumulado_kg)}</td>
                      <td className="px-4 py-3">
                        {faltanteTM > 0 ? (
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-400 font-bold">{formatTM(faltanteTM * 1000)}</span>
                          </div>
                        ) : metaCumplida ? (
                          <span className="text-green-400 font-bold">✓ META</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditar(viaje)}
                            className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(viaje.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}