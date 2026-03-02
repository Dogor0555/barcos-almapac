// components/adminC/ProductoForm.js - Formulario para crear o editar productos en el panel de administración

'use client'

import { useState, useEffect } from 'react'
import { X, Package, Type, Palette, Activity, Scale, Truck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductoForm({ producto, onClose, onSave }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    icono: '📦',
    tipo_registro: 'mixto', // 'mixto', 'banda', 'viajes'
    color_from: 'from-blue-500',
    color_to: 'to-blue-700',
    color_accent: '#3b82f6',
    activo: true
  })

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo || '',
        nombre: producto.nombre || '',
        icono: producto.icono || '📦',
        tipo_registro: producto.tipo_registro || 'mixto',
        color_from: producto.color_from || 'from-blue-500',
        color_to: producto.color_to || 'to-blue-700',
        color_accent: producto.color_accent || '#3b82f6',
        activo: producto.activo !== undefined ? producto.activo : true
      })
    }
  }, [producto])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validaciones
      if (!formData.codigo.trim()) {
        toast.error('El código es obligatorio')
        return
      }
      if (!formData.nombre.trim()) {
        toast.error('El nombre es obligatorio')
        return
      }

      await onSave(formData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Opciones de colores predefinidos
  const colores = [
    { from: 'from-blue-500', to: 'to-blue-700', accent: '#3b82f6', nombre: 'Azul' },
    { from: 'from-green-500', to: 'to-green-700', accent: '#22c55e', nombre: 'Verde' },
    { from: 'from-yellow-500', to: 'to-yellow-700', accent: '#eab308', nombre: 'Amarillo' },
    { from: 'from-orange-500', to: 'to-orange-700', accent: '#f97316', nombre: 'Naranja' },
    { from: 'from-red-500', to: 'to-red-700', accent: '#ef4444', nombre: 'Rojo' },
    { from: 'from-purple-500', to: 'to-purple-700', accent: '#a855f7', nombre: 'Púrpura' },
    { from: 'from-pink-500', to: 'to-pink-700', accent: '#ec4899', nombre: 'Rosa' },
    { from: 'from-indigo-500', to: 'to-indigo-700', accent: '#6366f1', nombre: 'Índigo' },
  ]

  // Iconos comunes
  const iconos = ['🌽', '🌿', '🟤', '🍚', '🌾', '🫘', '🧂', '🫒', '🍇', '📦', '⚡', '🔋', '🧪', '⚙️']

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Código y Nombre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Código <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="MA-001"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Maíz Amarillo"
                required
              />
            </div>
          </div>

          {/* Icono */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">
              Icono
            </label>
            <div className="grid grid-cols-8 gap-2">
              {iconos.map(icono => (
                <button
                  key={icono}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icono }))}
                  className={`p-2 text-2xl rounded-lg border transition-all ${
                    formData.icono === icono 
                      ? 'border-purple-500 bg-purple-500/20' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {icono}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Registro */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo_registro: 'mixto' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  formData.tipo_registro === 'mixto'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-slate-900 border-white/10 hover:border-white/30'
                }`}
              >
                <Activity className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                <span className="text-xs font-bold">Mixto</span>
                <p className="text-[8px] text-slate-500">Viajes + Banda</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo_registro: 'banda' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  formData.tipo_registro === 'banda'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-900 border-white/10 hover:border-white/30'
                }`}
              >
                <Scale className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <span className="text-xs font-bold">Banda</span>
                <p className="text-[8px] text-slate-500">Solo acumulado</p>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, tipo_registro: 'viajes' }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  formData.tipo_registro === 'viajes'
                    ? 'bg-green-500/20 border-green-500'
                    : 'bg-slate-900 border-white/10 hover:border-white/30'
                }`}
              >
                <Truck className="w-5 h-5 mx-auto mb-1 text-green-400" />
                <span className="text-xs font-bold">Viajes</span>
                <p className="text-[8px] text-slate-500">Solo camiones</p>
              </button>
            </div>
          </div>

          {/* Colores */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">
              <Palette className="w-3 h-3 inline mr-1" />
              Esquema de colores
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colores.map(color => (
                <button
                  key={color.accent}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    color_from: color.from,
                    color_to: color.to,
                    color_accent: color.accent
                  }))}
                  className={`p-2 rounded-lg border transition-all ${
                    formData.color_accent === color.accent
                      ? 'border-white ring-2 ring-white/50'
                      : 'border-white/10'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${color.accent}40, ${color.accent}20)` }}
                >
                  <div className={`h-6 rounded bg-gradient-to-r ${color.from} ${color.to}`} />
                  <span className="text-[8px] text-slate-400 mt-1 block">{color.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activo */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="w-4 h-4 rounded border-white/10 bg-slate-900"
            />
            <span className="text-sm text-slate-300">Producto activo</span>
          </label>

          {/* Vista previa */}
          <div className="bg-slate-900 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-slate-500 mb-2">Vista previa:</p>
            <div className={`bg-gradient-to-r ${formData.color_from} ${formData.color_to} rounded-lg p-3 text-white`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{formData.icono}</span>
                <div>
                  <p className="font-bold">{formData.nombre || 'Nombre del Producto'}</p>
                  <p className="text-xs opacity-80">{formData.codigo || 'COD-001'}</p>
                </div>
                <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
                  formData.tipo_registro === 'mixto' ? 'bg-purple-500/30' :
                  formData.tipo_registro === 'banda' ? 'bg-blue-500/30' :
                  'bg-green-500/30'
                }`}>
                  {formData.tipo_registro}
                </span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-2 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : (producto ? 'Actualizar Producto' : 'Crear Producto')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}