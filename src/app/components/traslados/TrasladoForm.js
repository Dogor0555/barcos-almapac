'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'
import { X, Truck, User, Hash, Calendar, Clock, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TrasladoForm({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre_conductor: '',
    remolque: '',
    tipo_unidad: 'plana',
    transporte: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio_carga: '',
    hora_fin_carga: '',
    no_marchamo: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = getCurrentUser()
      if (!user) throw new Error('No autenticado')

      // Validaciones
      if (!formData.nombre_conductor.trim()) throw new Error('Conductor requerido')
      if (!formData.remolque.trim()) throw new Error('Remolque requerido')
      if (!formData.transporte.trim()) throw new Error('Transporte requerido')
      if (!formData.hora_inicio_carga) throw new Error('Hora inicio requerida')
      if (!formData.hora_fin_carga) throw new Error('Hora fin requerida')
      if (!formData.no_marchamo.trim()) throw new Error('Marchamo requerido')

      const { data, error } = await supabase
        .from('traslados')
        .insert([{
          ...formData,
          created_by: user.id
        }])
        .select()

      if (error) throw error

      toast.success(`✅ Traslado creado: ${data[0].correlativo_viaje}`)
      onSuccess()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Nuevo Traslado
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Conductor <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.nombre_conductor}
                onChange={(e) => setFormData({...formData, nombre_conductor: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Remolque <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.remolque}
                onChange={(e) => setFormData({...formData, remolque: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ej: ABC-123"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Tipo Unidad <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.tipo_unidad}
                onChange={(e) => setFormData({...formData, tipo_unidad: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="plana">Plana</option>
                <option value="volteo">Volteo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Transporte <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.transporte}
                onChange={(e) => setFormData({...formData, transporte: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ej: Transportes SA"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Fecha <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({...formData, fecha: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Hora Inicio <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={formData.hora_inicio_carga}
                onChange={(e) => setFormData({...formData, hora_inicio_carga: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Hora Fin <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={formData.hora_fin_carga}
                onChange={(e) => setFormData({...formData, hora_fin_carga: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              No. Marchamo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.no_marchamo}
              onChange={(e) => setFormData({...formData, no_marchamo: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white font-mono"
              placeholder="Ej: 1234567890"
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Traslado'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}