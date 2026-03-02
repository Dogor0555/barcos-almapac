'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, isAdmin } from '../../lib/auth'
import { 
  Users, Plus, Edit2, Trash2, X, Check, 
  UserPlus, Shield, User as UserIcon, Loader2 
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const currentUser = getCurrentUser()
      
      if (user) {
        // Actualizar usuario existente
        const { data, error } = await supabase
            .rpc('actualizar_usuario', {
    p_user_id: user.id,
    p_admin_id: currentUser.id,  // AHORA PASA EL ADMIN_ID PRIMERO
    p_nombre: formData.nombre,
    p_username: formData.username,
    p_password: formData.password || null,
    p_rol: formData.rol,
    p_activo: formData.activo
  })

        if (error) throw error
        if (!data.success) throw new Error(data.error)
        
        toast.success('Usuario actualizado')
      } else {
        // Crear nuevo usuario
        const { data, error } = await supabase
          .rpc('crear_usuario', {
            p_nombre: formData.nombre,
            p_username: formData.username,
            p_password: formData.password,
            p_rol: formData.rol,
            p_admin_id: currentUser.id
          })

        if (error) throw error
        if (!data.success) throw new Error(data.error)
        
        toast.success('Usuario creado')
      }

      onSave()
    } catch (error) {
      console.error('Error guardando usuario:', error)
      toast.error(error.message || 'Error al guardar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-white" />
            <h2 className="text-xl font-black text-white">
              {user ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
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
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1">
              Contraseña {user && '(dejar vacío para no cambiar)'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
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
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white"
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
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.activo}
                    onChange={() => setFormData({...formData, activo: true})}
                  />
                  <span className="text-green-400">Activo</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!formData.activo}
                    onChange={() => setFormData({...formData, activo: false})}
                  />
                  <span className="text-red-400">Inactivo</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
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

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)

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
      const currentUser = getCurrentUser()
      
      const { data, error } = await supabase
        .rpc('listar_usuarios', {
          p_admin_id: currentUser.id
        })

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleEliminarUsuario = async (userId, userName) => {
    if (!confirm(`¿Estás seguro de desactivar al usuario "${userName}"?`)) return

    try {
      const currentUser = getCurrentUser()
      
      const { data, error } = await supabase
        .rpc('eliminar_usuario', {
          p_user_id: userId,
          p_admin_id: currentUser.id
        })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      toast.success('Usuario desactivado')
      cargarUsuarios()
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      toast.error(error.message || 'Error al desactivar usuario')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-black">Gestión de Usuarios</h1>
                <p className="text-purple-200 text-sm">
                  Administra pesadores, chequeros y administradores
                </p>
              </div>
            </div>
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

        {/* Tabla de usuarios */}
        <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-900 px-6 py-4 border-b border-white/10">
            <h2 className="font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Usuarios del Sistema
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({usuarios.length} total)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.id}</td>
                    <td className="px-6 py-4 font-bold text-white">{user.nombre}</td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-900 px-2 py-1 rounded text-sm text-blue-400">
                        @{user.username}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                        user.rol === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        user.rol === 'pesador' ? 'bg-green-500/20 text-green-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {user.rol === 'admin' && <Shield className="w-3 h-3" />}
                        {user.rol === 'pesador' && <UserIcon className="w-3 h-3" />}
                        {user.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-xs font-bold ${
                        user.activo ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {user.activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setUsuarioEditando(user)
                            setShowModal(true)
                          }}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(user.id, user.nombre)}
                          disabled={user.rol === 'admin' && !user.activo}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.activo ? 'Desactivar Usuario' : 'Usuario ya inactivo'}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  )
}