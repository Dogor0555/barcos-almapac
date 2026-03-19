'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronsUpDown, FolderOpen, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OperativoSelector({ selectedId, onSelect }) {
  const [operativos, setOperativos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarOperativos()
  }, [])

  const cargarOperativos = async () => {
    try {
      const { data, error } = await supabase
        .from('operativos_traslados')
        .select('*')
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOperativos(data || [])

      if (data?.length > 0 && !selectedId) {
        onSelect(data[0].id)
      }
    } catch (error) {
      console.error('Error cargando operativos:', error)
      toast.error('Error al cargar operativos')
    } finally {
      setLoading(false)
    }
  }

  const operativoSeleccionado = operativos.find(o => o.id === selectedId)

  return (
    <div className="space-y-3">
      <div className="relative">
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3.5 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 text-base pr-10"
          disabled={loading}
        >
          <option value="">{loading ? 'Cargando...' : 'Seleccionar Operativo'}</option>
          {operativos.map(op => (
            <option key={op.id} value={op.id}>
              {op.nombre} — {new Date(op.fecha_inicio).toLocaleDateString('es-SV')}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
      </div>

      {operativoSeleccionado && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
          <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
            <FolderOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-amber-400 font-bold text-sm truncate">{operativoSeleccionado.nombre}</p>
            {operativoSeleccionado.descripcion && (
              <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{operativoSeleccionado.descripcion}</p>
            )}
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(operativoSeleccionado.fecha_inicio).toLocaleDateString('es-SV')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}