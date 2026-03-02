// admin/usuarios/page.js - Página de gestión de usuarios para administradores

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin } from '../../lib/auth'
import { 
  Users, Plus, Edit2, Trash2, X, Check, 
  UserPlus, Shield, User as UserIcon, Loader2, AlertCircle,
  RefreshCw, ToggleLeft, ToggleRight, Save
} from 'lucide-react'
import toast from 'react-hot-toast'

// Modal para crear/editar usuario
const UsuarioModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    username: user?.username || '',
    password: '',
    rol: user?.rol || 'pesador',
    activo: user?.activo !== undefined ? user.activo : true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const currentUser = getCurrentUser()
      
      // Validaciones
      if (!formData.nombre.trim()) throw new Error('El nombre es requerido')
      if (!formData.username.trim()) throw new Error('El username es requerido')
      if (!user && !formData.password.trim()) throw new Error('La contraseña es requerida para nuevos usuarios')
      
      if (user) {
        // ACTUALIZAR USUARIO
        const { data, error } = await supabase
          .rpc('actualizar_usuario', {
            p_user_id: user.id,
            p_admin_id: currentUser.id,
            p_nombre: formData.nombre,
            p_username: formData.username,
            p_password: formData.password || null,
            p_rol: formData.rol,
            p_activo: formData.activo
          })

        if (error) throw error
        
        if (!data || !data.success) {
          throw new Error(data?.error || 'Error al actualizar usuario')
        }
        
        toast.success('✅ Usuario actualizado correctamente')
      } else {
        // CREAR NUEVO USUARIO
        const { data, error } = await supabase
          .rpc('crear_usuario', {
            p_nombre: formData.nombre,
            p_username: formData.username,
            p_password: formData.password,
            p_rol: formData.rol,
            p_admin_id: currentUser.id
          })

        if (error) throw error

        if (!data || !data.success) {
          throw new Error(data?.error || 'Error al crear usuario')
        }
        
        toast.success('✅ Usuario creado correctamente')
      }

      onSave()
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                {user ? <Edit2 className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              <h2 className="text-xl font-black text-white">
                {user ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              placeholder="Ej: Juan Pérez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              placeholder="Ej: juan.perez"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Contraseña {user && <span className="text-xs text-slate-500">(dejar vacío para no cambiar)</span>}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              placeholder={user ? '••••••••' : 'Ingrese contraseña'}
              required={!user}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Rol
            </label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData({...formData, rol: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
            >
              <option value="admin">Administrador</option>
              <option value="pesador">Pesador</option>
              <option value="chequero">Chequero</option>
            </select>
          </div>

          {user && (
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-1">
                Estado
              </label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="estado"
                    checked={formData.activo === true}
                    onChange={() => setFormData({...formData, activo: true})}
                    className="hidden"
                  />
                  <div className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.activo === true 
                      ? 'border-green-500 bg-green-500/20' 
                      : 'border-white/10 bg-slate-800'
                  }`}>
                    <ToggleRight className={`w-5 h-5 mx-auto mb-1 ${
                      formData.activo === true ? 'text-green-400' : 'text-slate-400'
                    }`} />
                    <span className={`text-xs font-bold ${
                      formData.activo === true ? 'text-green-400' : 'text-slate-400'
                    }`}>
                      Activo
                    </span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="estado"
                    checked={formData.activo === false}
                    onChange={() => setFormData({...formData, activo: false})}
                    className="hidden"
                  />
                  <div className={`p-3 rounded-lg border-2 text-center transition-all ${
                    formData.activo === false 
                      ? 'border-red-500 bg-red-500/20' 
                      : 'border-white/10 bg-slate-800'
                  }`}>
                    <ToggleLeft className={`w-5 h-5 mx-auto mb-1 ${
                      formData.activo === false ? 'text-red-400' : 'text-slate-400'
                    }`} />
                    <span className={`text-xs font-bold ${
                      formData.activo === false ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      Inactivo
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {user ? 'Actualizar' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente de confirmación
const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-500/20 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <p className="text-slate-400 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)
  const [usuarioEliminar, setUsuarioEliminar] = useState(null)
  const [accionEnProgreso, setAccionEnProgreso] = useState(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser || !isAdmin()) {
      router.push('/')
      return
    }
    cargarUsuarios()
  }, [router])

  const cargarUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentUser = getCurrentUser()
      
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado')
      }

      // Cargar usuarios directamente desde la tabla
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, username, rol, activo, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      setUsuarios(data || [])
      
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      setError(error.message)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarEstado = async (userId, userName, estadoActual) => {
    const nuevoEstado = !estadoActual
    const accion = nuevoEstado ? 'activar' : 'desactivar'
    
    try {
      setAccionEnProgreso(userId)
      
      const currentUser = getCurrentUser()
      
      // Verificar que no se está desactivando a sí mismo
      if (userId === currentUser.id && !nuevoEstado) {
        toast.error('No puedes desactivar tu propio usuario')
        return
      }

      // Actualizar estado directamente
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: nuevoEstado })
        .eq('id', userId)

      if (error) throw error

      toast.success(`Usuario ${accion}do correctamente`)
      await cargarUsuarios()
      
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setAccionEnProgreso(null)
    }
  }

  const handleEliminarClick = (user) => {
    const currentUser = getCurrentUser()
    if (user.id === currentUser.id) {
      toast.error('No puedes eliminar tu propio usuario')
      return
    }
    setUsuarioEliminar(user)
  }

  const handleEliminarConfirm = async () => {
    if (!usuarioEliminar) return

    try {
      setAccionEnProgreso(usuarioEliminar.id)
      
      const currentUser = getCurrentUser()

      // Desactivar usuario (soft delete)
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: false })
        .eq('id', usuarioEliminar.id)

      if (error) throw error

      toast.success(`Usuario "${usuarioEliminar.nombre}" desactivado`)
      await cargarUsuarios()
      
    } catch (error) {
      console.error('Error:', error)
      toast.error(error.message)
    } finally {
      setAccionEnProgreso(null)
      setUsuarioEliminar(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-2">
                <Users className="w-8 h-8" />
                Gestión de Usuarios
              </h1>
              <p className="text-purple-200 text-sm mt-1">
                Administra pesadores, chequeros y administradores del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cargarUsuarios}
                disabled={loading}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                title="Recargar usuarios"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Recargar
              </button>
              <button
                onClick={() => {
                  setUsuarioEditando(null)
                  setShowModal(true)
                }}
                className="bg-white hover:bg-purple-50 text-purple-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg"
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-200 text-xs">Total Usuarios</p>
              <p className="text-2xl font-black text-white">{usuarios.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-200 text-xs">Administradores</p>
              <p className="text-2xl font-black text-white">
                {usuarios.filter(u => u.rol === 'admin').length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-200 text-xs">Pesadores</p>
              <p className="text-2xl font-black text-white">
                {usuarios.filter(u => u.rol === 'pesador').length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-purple-200 text-xs">Chequeros</p>
              <p className="text-2xl font-black text-white">
                {usuarios.filter(u => u.rol === 'chequero').length}
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-bold">Error al cargar usuarios</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
            <button
              onClick={cargarUsuarios}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-all"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Lista de Usuarios
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({usuarios.length} registros)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Fecha Registro</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((user) => {
                    const currentUser = getCurrentUser()
                    const esUsuarioActual = user.id === currentUser?.id
                    const estaCargando = accionEnProgreso === user.id
                    
                    return (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold">
                              {user.nombre.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white">
                                {user.nombre}
                                {esUsuarioActual && (
                                  <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                    Tú
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="bg-slate-900 px-2 py-1 rounded text-sm text-blue-400">
                            @{user.username}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                            user.rol === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.rol === 'pesador' ? 'bg-green-500/20 text-green-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.rol === 'admin' && <Shield className="w-3 h-3" />}
                            {user.rol === 'pesador' && <UserIcon className="w-3 h-3" />}
                            {user.rol === 'chequero' && '📋'}
                            <span className="capitalize">{user.rol}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleCambiarEstado(user.id, user.nombre, user.activo)}
                            disabled={estaCargando || (esUsuarioActual && user.activo)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              user.activo 
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            } ${(esUsuarioActual && user.activo) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={
                              esUsuarioActual && user.activo 
                                ? 'No puedes desactivar tu propio usuario' 
                                : `Click para ${user.activo ? 'desactivar' : 'activar'}`
                            }
                          >
                            {estaCargando ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : user.activo ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                            <span>
                              {user.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(user.created_at).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setUsuarioEditando(user)
                                setShowModal(true)
                              }}
                              disabled={estaCargando}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-30"
                              title="Editar Usuario"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleEliminarClick(user)}
                              disabled={estaCargando || !user.activo || esUsuarioActual}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30"
                              title={
                                esUsuarioActual 
                                  ? 'No puedes eliminar tu propio usuario' 
                                  : !user.activo 
                                    ? 'Usuario ya inactivo' 
                                    : 'Desactivar Usuario'
                              }
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leyenda */}
        <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4 text-xs">
          <h3 className="font-bold text-white mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Roles del Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Administrador</p>
                <p className="text-slate-500 text-xs">Acceso total al sistema, puede gestionar usuarios y barcos</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-green-500/20 p-2 rounded-lg">
                <UserIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Pesador</p>
                <p className="text-slate-500 text-xs">Puede registrar viajes y lecturas de banda</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <span className="text-blue-400 text-sm">📋</span>
              </div>
              <div>
                <p className="font-bold text-white text-sm">Chequero</p>
                <p className="text-slate-500 text-xs">Puede ver información pero no modificar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <UsuarioModal
          user={usuarioEditando}
          onClose={() => {
            setShowModal(false)
            setUsuarioEditando(null)
          }}
          onSave={() => {
            setShowModal(false)
            setUsuarioEditando(null)
            cargarUsuarios()
          }}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={!!usuarioEliminar}
        onClose={() => setUsuarioEliminar(null)}
        onConfirm={handleEliminarConfirm}
        title="Confirmar acción"
        message={`¿Estás seguro de desactivar al usuario "${usuarioEliminar?.nombre}"? Podrás activarlo nuevamente después.`}
      />
    </div>
  )
}