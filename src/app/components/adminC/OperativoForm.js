// components/traslados/OperativoForm.js
'use client'

import { useState } from 'react'
import { X, Save, Calendar } from 'lucide-react'

export default function OperativoForm({ operativo = null, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: operativo?.nombre || '',
    descripcion: operativo?.descripcion || '',
    fecha_inicio: operativo?.fecha_inicio || new Date().toISOString().split('T')[0],
    fecha_fin: operativo?.fecha_fin || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.nombre.trim()) {
        throw new Error('El nombre del operativo es requerido')
      }

      await onSave(formData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {operativo ? 'Editar Operativo' : 'Nuevo Operativo'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Nombre del Operativo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Ej: Zafra 2024"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows="3"
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              placeholder="Descripción del operativo (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Fecha de Inicio <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Fecha de Fin (opcional)
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {operativo ? 'Actualizar' : 'Crear Operativo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-white font-bold py-2 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}