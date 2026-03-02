'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'
import { X, Ship, Calendar, User, Package, Save, Anchor, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BarcoForm({ pesadores, productos, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [productosExpandido, setProductosExpandido] = useState(true)
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barco: '',
    fecha_llegada: new Date().toISOString().split('T')[0],
    pesador_id: '',
    productos_seleccionados: {},
    metas: {}
  })

  // Inicializar productos seleccionados (todos false por defecto)
  useEffect(() => {
    if (productos && productos.length > 0) {
      const seleccionados = {}
      const metas = {}
      productos.forEach(p => {
        seleccionados[p.codigo] = false
        metas[p.codigo] = ''
      })
      setFormData(prev => ({ 
        ...prev, 
        productos_seleccionados: seleccionados,
        metas: metas 
      }))
    }
  }, [productos])

  // Generar código automático basado en el nombre
  const generarCodigo = () => {
    if (formData.nombre) {
      const palabras = formData.nombre.split(' ')
      let prefijo = ''
      palabras.forEach(p => {
        if (p.length > 0 && p.toUpperCase() !== 'MV' && p.toUpperCase() !== 'MS') {
          prefijo += p[0].toUpperCase()
        }
      })
      if (!prefijo) {
        prefijo = formData.nombre.substring(0, 3).toUpperCase()
      }
      const numero = Math.floor(Math.random() * 9000 + 1000)
      setFormData(prev => ({ ...prev, codigo_barco: `${prefijo}-${numero}` }))
    } else {
      toast.error('Primero ingresa el nombre del barco')
    }
  }

  const toggleProducto = (codigo) => {
    setFormData(prev => ({
      ...prev,
      productos_seleccionados: {
        ...prev.productos_seleccionados,
        [codigo]: !prev.productos_seleccionados[codigo]
      }
    }))
  }

  const seleccionarTodos = () => {
    const nuevos = {}
    Object.keys(formData.productos_seleccionados).forEach(key => {
      nuevos[key] = true
    })
    setFormData(prev => ({
      ...prev,
      productos_seleccionados: nuevos
    }))
  }

  const deseleccionarTodos = () => {
    const nuevos = {}
    Object.keys(formData.productos_seleccionados).forEach(key => {
      nuevos[key] = false
    })
    setFormData(prev => ({
      ...prev,
      productos_seleccionados: nuevos
    }))
  }

  const handleMetaChange = (codigo, value) => {
    setFormData(prev => ({
      ...prev,
      metas: {
        ...prev.metas,
        [codigo]: value ? parseFloat(value) : null
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('📝 Iniciando creación de barco...')
      
      const user = getCurrentUser()
      console.log('👤 Usuario actual:', user)
      
      if (!user) {
        toast.error('No hay usuario autenticado')
        setLoading(false)
        return
      }

      if (!formData.nombre.trim()) {
        toast.error('El nombre del barco es obligatorio')
        setLoading(false)
        return
      }

      // Verificar que al menos un producto esté seleccionado
      const productosSeleccionados = Object.entries(formData.productos_seleccionados)
        .filter(([_, selected]) => selected)
        .map(([codigo]) => codigo)

      if (productosSeleccionados.length === 0) {
        toast.error('Debes seleccionar al menos un producto que trae el barco')
        setLoading(false)
        return
      }

      // Filtrar metas solo de los productos seleccionados y con valor
      const metasValidas = {}
      productosSeleccionados.forEach(codigo => {
        const valor = formData.metas[codigo]
        if (valor && !isNaN(valor) && valor > 0) {
          metasValidas[codigo] = valor
        }
      })

      // Preparar datos para insertar
      const datosInsertar = {
        nombre: formData.nombre.trim(),
        codigo_barco: formData.codigo_barco?.trim() || null,
        fecha_llegada: formData.fecha_llegada || null,
        pesador_id: formData.pesador_id ? parseInt(formData.pesador_id) : null,
        metas_json: {
          productos: productosSeleccionados,
          limites: metasValidas
        },
        estado: 'activo',
        created_by: user.id,
        created_at: new Date().toISOString()
      }

      console.log('📦 Datos a insertar:', datosInsertar)

      const { data, error } = await supabase
        .from('barcos')
        .insert([datosInsertar])
        .select()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        
        if (error.code === '42501') {
          toast.error('Error de permisos. Verifica las políticas RLS en Supabase')
        } else if (error.code === '23502') {
          toast.error('Falta un campo obligatorio')
        } else if (error.message?.includes('violates row-level security')) {
          toast.error('Error de seguridad. Las políticas RLS están bloqueando la inserción')
        } else {
          toast.error(`Error: ${error.message || 'Error desconocido'}`)
        }
        return
      }

      console.log('✅ Barco creado:', data)

      if (data && data.length > 0) {
        const barcoCreado = data[0]
        
        toast.success(`✅ Barco "${formData.nombre}" creado con código ${barcoCreado.codigo_barco || 'sin código'}`)
        
        if (barcoCreado?.token_compartido) {
          const link = `${window.location.origin}/barco/${barcoCreado.token_compartido}`
          toast.success(`🔗 Link de acceso copiado al portapapeles`, {
            duration: 5000,
            icon: '🔗'
          })
          
          try {
            await navigator.clipboard.writeText(link)
            console.log('✅ Link copiado al portapapeles')
          } catch (clipError) {
            console.warn('No se pudo copiar automáticamente:', clipError)
          }
        }
      }

      onSuccess()
    } catch (error) {
      console.error('🔥 Error detallado:', error)
      toast.error(`Error: ${error.message || 'Error inesperado'}`)
    } finally {
      setLoading(false)
    }
  }

  const productosSeleccionadosCount = Object.values(formData.productos_seleccionados).filter(Boolean).length

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 sticky top-0 flex items-center justify-between z-10">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Anchor className="w-5 h-5" />
            Registrar Nuevo Barco
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos básicos */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-400" />
              Información del Barco
            </h4>
            
            <div className="space-y-4">
              {/* NOMBRE DEL BARCO */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                  <Ship className="w-4 h-4" />
                  Nombre del Barco <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: MV. ATLANTIC HALO"
                  required
                  disabled={loading}
                />
              </div>

              {/* CÓDIGO DEL BARCO */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Código del Barco <span className="text-blue-400">(opcional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.codigo_barco}
                    onChange={(e) => setFormData({ ...formData, codigo_barco: e.target.value })}
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: ATL-001"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={generarCodigo}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
                    disabled={loading}
                  >
                    Generar
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Código único para identificar el barco en reportes
                </p>
              </div>

              {/* FECHA DE ATRAQUE */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de Atraque
                </label>
                <input
                  type="date"
                  value={formData.fecha_llegada}
                  onChange={(e) => setFormData({ ...formData, fecha_llegada: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* ASIGNAR PESADOR */}
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Asignar a Pesador
                </label>
                <select
                  value={formData.pesador_id}
                  onChange={(e) => setFormData({ ...formData, pesador_id: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="">Sin asignar (acceso público con link)</option>
                  {pesadores?.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (@{p.username})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Si asignas un pesador, solo él podrá registrar viajes
                </p>
              </div>
            </div>
          </div>

          {/* Selección de Productos - VERSIÓN COMPACTA */}
          {productos && productos.length > 0 && (
            <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setProductosExpandido(!productosExpandido)}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  <h4 className="text-white font-bold">
                    Productos que trae el barco
                  </h4>
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                    {productosSeleccionadosCount} seleccionados
                  </span>
                </div>
                <button type="button" className="text-slate-400 hover:text-white">
                  {productosExpandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
              
              {productosExpandido && (
                <>
                  <div className="flex gap-2 mt-4 mb-3">
                    <button
                      type="button"
                      onClick={seleccionarTodos}
                      className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodos}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {productos.map(producto => {
                      const seleccionado = formData.productos_seleccionados[producto.codigo]
                      
                      return (
                        <div 
                          key={producto.id} 
                          className={`bg-slate-900 rounded-lg p-3 border transition-all ${
                            seleccionado 
                              ? 'border-green-500 bg-green-500/5' 
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => toggleProducto(producto.codigo)}
                              className="mt-1 w-4 h-4 rounded border-white/10 bg-slate-800 text-green-500 focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{producto.icono || '📦'}</span>
                                  <div>
                                    <p className="font-bold text-white text-sm">{producto.nombre}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-500">{producto.codigo}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                        producto.tipo_registro === 'mixto' ? 'bg-purple-500/20 text-purple-400' :
                                        producto.tipo_registro === 'banda' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-green-500/20 text-green-400'
                                      }`}>
                                        {producto.tipo_registro === 'mixto' ? '🚛+📊' :
                                         producto.tipo_registro === 'banda' ? '📊 BANDA' : '🚛 CAMIONES'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {seleccionado && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 relative">
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      value={formData.metas[producto.codigo] || ''}
                                      onChange={(e) => handleMetaChange(producto.codigo, e.target.value)}
                                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Meta en TM"
                                      disabled={loading}
                                    />
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-xs font-bold">
                                      TM
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <h4 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Resumen del Barco
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Barco:</p>
                <p className="font-bold text-white truncate">{formData.nombre || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Código:</p>
                <p className="font-bold text-white">{formData.codigo_barco || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Fecha Atraque:</p>
                <p className="font-bold text-white">
                  {formData.fecha_llegada ? new Date(formData.fecha_llegada).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Pesador:</p>
                <p className="font-bold text-white">
                  {pesadores?.find(p => p.id == formData.pesador_id)?.nombre || 'Sin asignar'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Productos:</p>
                <p className="font-bold text-white">
                  {productosSeleccionadosCount} seleccionados
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Con meta:</p>
                <p className="font-bold text-white">
                  {Object.entries(formData.metas).filter(([k, v]) => v > 0 && formData.productos_seleccionados[k]).length}
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creando Barco...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Crear Barco</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* Estilos para scrollbar personalizada */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}