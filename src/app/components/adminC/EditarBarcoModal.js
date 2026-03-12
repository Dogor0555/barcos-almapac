'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser } from '../../lib/auth'
import { 
  X, Ship, Calendar, User, Package, Save, Anchor, Hash, 
  ChevronDown, ChevronUp, Import, Upload as Export, Layers, Edit2, Target
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditarBarcoModal({ barco, pesadores, productos, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [productosExpandido, setProductosExpandido] = useState(true)
  const [bodegasExpandido, setBodegasExpandido] = useState(true)
  const [limitesExpandido, setLimitesExpandido] = useState(true)
  const [metasSacosExpandido, setMetasSacosExpandido] = useState(true)
  const [destinos, setDestinos] = useState([])
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_barco: '',
    fecha_llegada: '',
    pesador_id: '',
    tipo_operacion: 'importacion',
    productos_seleccionados: {},
    metas: {}
  })

  const [bodegas, setBodegas] = useState([])
  const [limitesDestino, setLimitesDestino] = useState({})
  // 👇 NUEVO: Estado para metas por bodega (sacos)
  const [metasBodegaSacos, setMetasBodegaSacos] = useState({})

  // Cargar destinos
  useEffect(() => {
    cargarDestinos()
  }, [])

  const cargarDestinos = async () => {
    try {
      const { data } = await supabase
        .from('destinos')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      
      setDestinos(data || [])
    } catch (error) {
      console.error('Error cargando destinos:', error)
    }
  }

  // Cargar datos del barco
  useEffect(() => {
    if (barco) {
      // Información básica
      setFormData({
        nombre: barco.nombre || '',
        codigo_barco: barco.codigo_barco || '',
        fecha_llegada: barco.fecha_llegada || '',
        pesador_id: barco.pesador_id || '',
        tipo_operacion: barco.tipo_operacion || 'importacion',
        productos_seleccionados: {},
        metas: barco.metas_json?.limites || {}
      })

      // Cargar bodegas del barco
      const bodegasBarco = barco.bodegas_json || []
      setBodegas(bodegasBarco.map(b => ({ ...b, activa: true })))

      // Cargar límites por destino
      const limitesGuardados = barco.metas_json?.limites_destino || {}
      setLimitesDestino(limitesGuardados)

      // 👇 NUEVO: Cargar metas por bodega para sacos
      const metasSacosGuardadas = barco.metas_json?.sacos_bodega || {}
      setMetasBodegaSacos(metasSacosGuardadas)

      // Inicializar productos seleccionados
      const productosDelBarco = barco.metas_json?.productos || []
      const seleccionados = {}
      productos.forEach(p => {
        seleccionados[p.codigo] = productosDelBarco.includes(p.codigo)
      })
      setFormData(prev => ({ ...prev, productos_seleccionados: seleccionados }))
    }
  }, [barco, productos])

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

  // Funciones para bodegas
  const toggleBodega = (id) => {
    setBodegas(bodegas.map(b => 
      b.id === id ? { ...b, activa: !b.activa } : b
    ))
  }

  const cambiarNombreBodega = (id, nuevoNombre) => {
    setBodegas(bodegas.map(b => 
      b.id === id ? { ...b, nombre: nuevoNombre } : b
    ))
  }

  const cambiarCodigoBodega = (id, nuevoCodigo) => {
    setBodegas(bodegas.map(b => 
      b.id === id ? { ...b, codigo: nuevoCodigo.toUpperCase() } : b
    ))
  }

  // Función para manejar límite por destino
  const handleLimiteDestinoChange = (destinoId, value) => {
    setLimitesDestino(prev => ({
      ...prev,
      [destinoId]: value ? parseFloat(value) : null
    }))
  }

  // 👇 NUEVO: Función para manejar meta por bodega (sacos)
  const handleMetaBodegaSacos = (bodegaNombre, value) => {
    setMetasBodegaSacos(prev => ({
      ...prev,
      [bodegaNombre]: value ? parseFloat(value) : null
    }))
  }

  const activarTodasBodegas = () => {
    setBodegas(bodegas.map(b => ({ ...b, activa: true })))
  }

  const desactivarTodasBodegas = () => {
    setBodegas(bodegas.map(b => ({ ...b, activa: false })))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = getCurrentUser()
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

      const productosSeleccionados = Object.entries(formData.productos_seleccionados)
        .filter(([_, selected]) => selected)
        .map(([codigo]) => codigo)

      if (productosSeleccionados.length === 0) {
        toast.error('Debes seleccionar al menos un producto')
        setLoading(false)
        return
      }

      const bodegasActivas = bodegas.filter(b => b.activa)
      if (bodegasActivas.length === 0) {
        toast.error('Debes seleccionar al menos una bodega')
        setLoading(false)
        return
      }

      const metasValidas = {}
      productosSeleccionados.forEach(codigo => {
        const valor = formData.metas[codigo]
        if (valor && !isNaN(valor) && valor > 0) {
          metasValidas[codigo] = valor
        }
      })

      // Filtrar límites de destino válidos
      const limitesDestinoValidos = {}
      Object.entries(limitesDestino).forEach(([destinoId, valor]) => {
        if (valor && !isNaN(valor) && valor > 0) {
          limitesDestinoValidos[destinoId] = valor
        }
      })

      // 👇 NUEVO: Filtrar metas de bodega para sacos válidas
      const metasBodegaSacosValidas = {}
      Object.entries(metasBodegaSacos).forEach(([bodegaNombre, valor]) => {
        if (valor && !isNaN(valor) && valor > 0) {
          metasBodegaSacosValidas[bodegaNombre] = valor
        }
      })

      const datosActualizar = {
        nombre: formData.nombre.trim(),
        codigo_barco: formData.codigo_barco?.trim() || null,
        fecha_llegada: formData.fecha_llegada || null,
        pesador_id: formData.pesador_id ? parseInt(formData.pesador_id) : null,
        tipo_operacion: formData.tipo_operacion,
        metas_json: {
          productos: productosSeleccionados,
          limites: metasValidas,
          limites_destino: limitesDestinoValidos,
          // 👇 NUEVO: Guardar metas de bodega para sacos
          sacos_bodega: metasBodegaSacosValidas
        },
        bodegas_json: bodegasActivas.map(b => ({
          id: b.id,
          nombre: b.nombre,
          codigo: b.codigo
        })),
        updated_at: new Date().toISOString()
      }

      console.log('📦 Datos a actualizar:', datosActualizar)

      const { data, error } = await supabase
        .from('barcos')
        .update(datosActualizar)
        .eq('id', barco.id)
        .select()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        toast.error(`Error: ${error.message || 'Error desconocido'}`)
        return
      }

      console.log('✅ Barco actualizado:', data)
      toast.success(`✅ Barco "${formData.nombre}" actualizado correctamente`)
      onSuccess()
    } catch (error) {
      console.error('🔥 Error detallado:', error)
      toast.error(`Error: ${error.message || 'Error inesperado'}`)
    } finally {
      setLoading(false)
    }
  }

  const productosSeleccionadosCount = Object.values(formData.productos_seleccionados).filter(Boolean).length
  const bodegasActivasCount = bodegas.filter(b => b.activa).length

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 sticky top-0 flex items-center justify-between z-10">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            Editar Barco: {barco.nombre}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos básicos */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
              <Ship className="w-4 h-4 text-blue-400" />
              Información del Barco
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Nombre del Barco <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_operacion: 'importacion' }))}
                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${
                      formData.tipo_operacion === 'importacion'
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-white/10 bg-slate-800'
                    }`}
                  >
                    <Import className={`w-5 h-5 ${formData.tipo_operacion === 'importacion' ? 'text-green-400' : 'text-slate-400'}`} />
                    <span className={`font-bold ${formData.tipo_operacion === 'importacion' ? 'text-green-400' : 'text-slate-400'}`}>
                      IMPORTACIÓN
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo_operacion: 'exportacion' }))}
                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-3 transition-all ${
                      formData.tipo_operacion === 'exportacion'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/10 bg-slate-800'
                    }`}
                  >
                    <Export className={`w-5 h-5 ${formData.tipo_operacion === 'exportacion' ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className={`font-bold ${formData.tipo_operacion === 'exportacion' ? 'text-blue-400' : 'text-slate-400'}`}>
                      EXPORTACIÓN
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Código del Barco
                </label>
                <input
                  type="text"
                  value={formData.codigo_barco}
                  onChange={(e) => setFormData({ ...formData, codigo_barco: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="Ej: ATL-001"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Fecha de Atraque
                </label>
                <input
                  type="date"
                  value={formData.fecha_llegada}
                  onChange={(e) => setFormData({ ...formData, fecha_llegada: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Asignar a
                </label>
                <select
                  value={formData.pesador_id}
                  onChange={(e) => setFormData({ ...formData, pesador_id: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white"
                  disabled={loading}
                >
                  <option value="">Sin asignar</option>
                  {pesadores?.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (@{p.username}) - {p.rol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN DE BODEGAS */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-blue-500/20">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setBodegasExpandido(!bodegasExpandido)}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h4 className="text-white font-bold">
                  Configuración de Bodegas
                </h4>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                  {bodegasActivasCount} activas
                </span>
              </div>
              <button type="button" className="text-slate-400 hover:text-white">
                {bodegasExpandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            {bodegasExpandido && (
              <>
                <p className="text-xs text-slate-400 mb-3 mt-2">
                  Personaliza las bodegas de este barco
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                  {bodegas.map(bodega => (
                    <div
                      key={bodega.id}
                      className={`p-3 rounded-lg border transition-all ${
                        bodega.activa
                          ? 'border-blue-500 bg-blue-500/5'
                          : 'border-white/10 bg-slate-800 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={bodega.activa}
                          onChange={() => toggleBodega(bodega.id)}
                          className="mt-1 w-4 h-4 rounded border-white/10 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-bold text-white">Bodega {bodega.id}</span>
                          </div>
                          
                          {bodega.activa && (
                            <>
                              <input
                                type="text"
                                value={bodega.nombre}
                                onChange={(e) => cambiarNombreBodega(bodega.id, e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                                placeholder="Nombre de la bodega"
                              />
                              <input
                                type="text"
                                value={bodega.codigo}
                                onChange={(e) => cambiarCodigoBodega(bodega.id, e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-blue-400 font-mono"
                                placeholder="Código"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={activarTodasBodegas}
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg"
                  >
                    Activar todas
                  </button>
                  <button
                    type="button"
                    onClick={desactivarTodasBodegas}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg"
                  >
                    Desactivar todas
                  </button>
                </div>
              </>
            )}
          </div>

          {/* LÍMITES POR DESTINO */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-amber-500/20">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setLimitesExpandido(!limitesExpandido)}
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h4 className="text-white font-bold">
                  Límites por Destino (opcional)
                </h4>
                <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs">
                  {Object.keys(limitesDestino).length} configurados
                </span>
              </div>
              <button type="button" className="text-slate-400 hover:text-white">
                {limitesExpandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            {limitesExpandido && (
              <>
                <p className="text-xs text-slate-400 mb-3 mt-2">
                  Define límites de tonelaje para destinos específicos.
                </p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {destinos.map(destino => (
                    <div key={destino.id} className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{destino.nombre}</p>
                          <p className="text-xs text-slate-500">{destino.codigo}</p>
                        </div>
                        <div className="relative w-48">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={limitesDestino[destino.id] || ''}
                            onChange={(e) => handleLimiteDestinoChange(destino.id, e.target.value)}
                            className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-white pr-12"
                            placeholder="Límite en TM"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-400 text-xs font-bold">
                            TM
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 👇 NUEVA SECCIÓN: METAS POR BODEGA PARA SACOS */}
          <div className="bg-slate-900/50 rounded-xl p-5 border border-green-500/20">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setMetasSacosExpandido(!metasSacosExpandido)}
            >
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-bold">
                  Metas por Bodega (Sacos)
                </h4>
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs">
                  {Object.keys(metasBodegaSacos).length} configuradas
                </span>
              </div>
              <button type="button" className="text-slate-400 hover:text-white">
                {metasSacosExpandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
            
            {metasSacosExpandido && (
              <>
                <p className="text-xs text-slate-400 mb-3 mt-2">
                  Define la cantidad estimada de toneladas que se espera recibir en cada bodega.
                </p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {bodegas.filter(b => b.activa).map(bodega => (
                    <div key={bodega.id} className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{bodega.nombre}</p>
                          <p className="text-xs text-slate-500">{bodega.codigo}</p>
                        </div>
                        <div className="relative w-48">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={metasBodegaSacos[bodega.nombre] || ''}
                            onChange={(e) => handleMetaBodegaSacos(bodega.nombre, e.target.value)}
                            className="w-full bg-slate-900 border border-green-500/30 rounded-lg px-3 py-2 text-white pr-12"
                            placeholder="Meta en TM"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 text-xs font-bold">
                            TM
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bodegas.filter(b => b.activa).length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No hay bodegas activas para configurar metas
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Selección de Productos */}
          {productos && productos.length > 0 && (
            <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setProductosExpandido(!productosExpandido)}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-400" />
                  <h4 className="text-white font-bold">
                    {formData.tipo_operacion === 'exportacion' 
                      ? 'Productos a cargar' 
                      : 'Productos a descargar'}
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
                      className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodos}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
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
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{producto.icono || '📦'}</span>
                                <div>
                                  <p className="font-bold text-white text-sm">{producto.nombre}</p>
                                  <span className="text-xs text-slate-500">{producto.codigo}</span>
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
                                      className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm pr-12"
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

          {/* Resumen de límites */}
          {Object.keys(limitesDestino).length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <h4 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Límites configurados por destino
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(limitesDestino).map(([id, valor]) => {
                  const destino = destinos.find(d => d.id === parseInt(id))
                  return (
                    <div key={id} className="flex justify-between items-center bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-slate-300">{destino?.nombre || `Destino ${id}`}</span>
                      <span className="font-bold text-amber-400">{valor.toFixed(3)} TM</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 👇 NUEVO: Resumen de metas por bodega */}
          {Object.keys(metasBodegaSacos).length > 0 && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Metas configuradas por bodega (sacos)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(metasBodegaSacos).map(([bodegaNombre, valor]) => (
                  <div key={bodegaNombre} className="flex justify-between items-center bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-300">{bodegaNombre}</span>
                    <span className="font-bold text-green-400">{valor.toFixed(3)} TM</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Actualizar Barco
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}