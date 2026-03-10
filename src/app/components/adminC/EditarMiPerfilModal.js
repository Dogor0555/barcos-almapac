// app/admin/components/EditarMiPerfilModal.js
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getCurrentUser, updateUserPassword } from '../../lib/auth'
import { 
  X, Save, Loader2, User, Key, AlertCircle, 
  CheckCircle, Eye, EyeOff, Lock, Shield
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditarMiPerfilModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    username: '',
    password: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      setFormData({
        nombre: currentUser.nombre || '',
        username: currentUser.username || '',
        password: '',
        confirmPassword: ''
      })
    }
  }, [])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'El username es requerido'
    } else if (formData.username.length < 3) {
      newErrors.username = 'El username debe tener al menos 3 caracteres'
    }

    // Validar contraseña solo si se está cambiando
    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)

    try {
      const currentUser = getCurrentUser()
      if (!currentUser || !currentUser.id) {
        throw new Error('Usuario no autenticado')
      }

      // Validar que el ID sea un UUID válido
      if (!isValidUUID(currentUser.id)) {
        console.error('ID de usuario inválido:', currentUser.id)
        throw new Error('El ID del usuario no es válido')
      }

      // Actualizar información básica
      const updates = {
        nombre: formData.nombre,
        username: formData.username,
        updated_at: new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Actualizar contraseña si se proporcionó una nueva
      if (formData.password) {
        try {
          // Primero intentamos con la función RPC
          const { error: passwordError } = await supabase.rpc('cambiar_password', {
            p_user_id: currentUser.id,
            p_new_password: formData.password
          })

          if (passwordError) {
            console.error('Error con RPC:', passwordError)
            
            // Si falla RPC, intentamos con update directo si existe el campo password_hash
            const { error: directUpdateError } = await supabase
              .from('usuarios')
              .update({ password: formData.password })
              .eq('id', currentUser.id)

            if (directUpdateError) throw directUpdateError
          }
        } catch (passwordError) {
          console.error('Error actualizando contraseña:', passwordError)
          toast.error('Error al actualizar la contraseña')
          throw passwordError
        }
      }

      // Actualizar el usuario en localStorage
      const updatedUser = {
        ...currentUser,
        nombre: formData.nombre,
        username: formData.username
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))

      toast.success('✅ Perfil actualizado correctamente')
      
      if (onSuccess) {
        onSuccess(updatedUser)
      }
      
      onClose()
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      toast.error(error.message || 'Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Editar Mi Perfil</h2>
                <p className="text-blue-200 text-xs mt-1">Actualiza tu información personal</p>
              </div>
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
          {/* Información del rol */}
          <div className="bg-slate-900 rounded-xl p-4 border border-blue-500/20 mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                user.rol === 'admin' ? 'bg-purple-500/20' :
                user.rol === 'pesador' ? 'bg-green-500/20' :
                user.rol === 'electricista' ? 'bg-blue-500/20' :
                'bg-orange-500/20'
              }`}>
                {user.rol === 'admin' && <Shield className="w-5 h-5 text-purple-400" />}
                {user.rol === 'pesador' && <User className="w-5 h-5 text-green-400" />}
                {user.rol === 'electricista' && <span className="text-blue-400 text-lg">⚡</span>}
                {user.rol === 'chequero' && <span className="text-orange-400 text-lg">⏱️</span>}
              </div>
              <div>
                <p className="text-xs text-slate-400">Tu rol actual</p>
                <p className="font-bold text-white capitalize">{user.rol}</p>
              </div>
              <div className="ml-auto">
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Activo
                </span>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-4 h-4" />
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className={`w-full bg-slate-900 border ${
                errors.nombre ? 'border-red-500' : 'border-white/10'
              } rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition-all`}
              placeholder="Tu nombre completo"
            />
            {errors.nombre && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.nombre}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Lock className="w-4 h-4" />
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className={`w-full bg-slate-900 border ${
                errors.username ? 'border-red-500' : 'border-white/10'
              } rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition-all`}
              placeholder="Tu nombre de usuario"
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.username}
              </p>
            )}
          </div>

          {/* Separador */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0f172a] px-3 text-xs text-slate-500">
                Cambiar Contraseña (opcional)
              </span>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Key className="w-4 h-4" />
              Nueva Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className={`w-full bg-slate-900 border ${
                  errors.password ? 'border-red-500' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition-all pr-10`}
                placeholder="Dejar vacío para no cambiar"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Key className="w-4 h-4" />
              Confirmar Contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className={`w-full bg-slate-900 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-white/10'
                } rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none transition-all pr-10`}
                placeholder="Repite la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Nota informativa */}
          {formData.password && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs text-blue-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Al cambiar tu contraseña, deberás usar la nueva contraseña en tu próximo inicio de sesión.
                </span>
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Guardar Cambios
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}