// lib/auth.js
import { supabase } from './supabase'
import Cookies from 'js-cookie'

// Función de login con bcrypt (usando RPC)
export const login = async (username, password) => {
  try {
    console.log('🔐 Intentando login:', username)
    
    // Usar la nueva función segura
    const { data, error } = await supabase
      .rpc('login_usuario_seguro', {
        p_username: username,
        p_password: password
      })

    if (error) {
      console.error('❌ Error en login RPC:', error)
      throw error
    }
    
    if (data && data.length > 0) {
      const user = data[0]
      console.log('✅ Usuario encontrado:', user)
      
      // Crear objeto de usuario
      const userData = {
        id: user.user_id,
        nombre: user.user_nombre,
        username: user.user_username,
        rol: user.user_rol,
        token: user.user_token,
        loginTime: Date.now()
      }
      
      // Guardar en cookie (expira en 8 horas)
      Cookies.set('session', JSON.stringify(userData), { 
        expires: 1/3, // 8 horas
        path: '/',
        sameSite: 'strict'
      })
      
      // También guardar en sessionStorage para acceso rápido en cliente
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(userData))
      }
      
      return { 
        success: true, 
        user: {
          id: user.user_id,
          nombre: user.user_nombre,
          username: user.user_username,
          rol: user.user_rol
        }
      }
    }
    
    return { success: false, error: 'Credenciales inválidas' }
  } catch (error) {
    console.error('🔥 Error en login:', error)
    return { success: false, error: error.message }
  }
}

// Logout
export const logout = () => {
  // Eliminar cookie
  Cookies.remove('session', { path: '/' })
  
  // Eliminar de sessionStorage
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('user')
    // Redirigir al login
    window.location.href = '/'
  }
}

// Obtener usuario actual
export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null
  
  try {
    // Primero intentar con cookie
    const cookieUser = Cookies.get('session')
    if (cookieUser) {
      return JSON.parse(cookieUser)
    }
    
    // Si no hay cookie, intentar con sessionStorage (por si acaso)
    const userStr = sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      // Restaurar cookie si encontramos en sessionStorage
      Cookies.set('session', JSON.stringify(user), { 
        expires: 1/3, 
        path: '/',
        sameSite: 'strict'
      })
      return user
    }
    
    return null
  } catch (e) {
    console.error('Error getting user:', e)
    return null
  }
}

// Verificar si está autenticado
export const isAuthenticated = () => {
  return !!getCurrentUser()
}

// Verificar si es admin
export const isAdmin = () => {
  const user = getCurrentUser()
  return user?.rol === 'admin'
}

// Verificar si es pesador
export const isPesador = () => {
  const user = getCurrentUser()
  return user?.rol === 'pesador'
}

// Verificar si es pesador o admin (para páginas que ambos pueden ver)
export const isPesadorOrAdmin = () => {
  const user = getCurrentUser()
  return user && (user.rol === 'pesador' || user.rol === 'admin')
}