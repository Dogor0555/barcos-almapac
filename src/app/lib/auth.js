// src/app/lib/auth.js
import { supabase, testConnection } from './supabase'
import Cookies from 'js-cookie'
import bcrypt from 'bcryptjs'

// Función de login con reintentos
export const login = async (username, password, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔐 Intentando login (${attempt}/${retries}):`, username)
      
      // Timeout de 20 segundos para toda la operación
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de conexión')), 20000)
      })
      
      const queryPromise = supabase
        .from('usuarios')
        .select('id, nombre, username, password, rol, activo')
        .eq('username', username)
        .eq('activo', true)
      
      const { data: users, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        console.error('❌ Error en consulta:', error)
        
        // Si es error de red en el último intento, probar conexión
        if (attempt === retries && error.message.includes('Failed to fetch')) {
          const connectionTest = await testConnection()
          if (!connectionTest.success) {
            return { 
              success: false, 
              error: 'No se puede conectar al servidor. Verifica tu conexión a internet.' 
            }
          }
        }
        
        if (attempt === retries) {
          return { success: false, error: error.message }
        }
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      console.log('📦 Usuarios encontrados:', users?.length)

      if (!users || users.length === 0) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      const user = users[0]
      
      const passwordMatch = await bcrypt.compare(password, user.password)
      console.log('🔑 Verificación de password:', passwordMatch)

      if (!passwordMatch) {
        return { success: false, error: 'Credenciales inválidas' }
      }

      console.log('✅ Usuario autenticado:', user.nombre)
      
      const userData = {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
        loginTime: Date.now()
      }
      
      Cookies.set('session', JSON.stringify(userData), { 
        expires: 1/3,
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      })
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user', JSON.stringify(userData))
      }
      
      return { 
        success: true, 
        user: {
          id: user.id,
          nombre: user.nombre,
          username: user.username,
          rol: user.rol
        }
      }
      
    } catch (error) {
      console.error(`🔥 Error en login (intento ${attempt}):`, error)
      
      if (attempt === retries) {
        return { 
          success: false, 
          error: error.message === 'Timeout de conexión' 
            ? 'La conexión está tardando demasiado. Verifica tu red.' 
            : error.message 
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  return { success: false, error: 'Error desconocido' }
}

// Resto de tu código auth.js igual...
export const logout = () => {
  Cookies.remove('session', { path: '/' })
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('user')
    window.location.href = '/'
  }
}

export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null
  
  try {
    const cookieUser = Cookies.get('session')
    if (cookieUser) {
      return JSON.parse(cookieUser)
    }
    
    const userStr = sessionStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
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

export const isAuthenticated = () => !!getCurrentUser()
export const isAdmin = () => getCurrentUser()?.rol === 'admin'
export const isPesador = () => getCurrentUser()?.rol === 'pesador'
export const isElectricista = () => getCurrentUser()?.rol === 'electricista'
export const isChequero = () => getCurrentUser()?.rol === 'chequero'
export const isChequeroTraslado = () => getCurrentUser()?.rol === 'chequerotraslado'
export const isEnvasador = () => getCurrentUser()?.rol === 'envasador'
export const isPesadorOrAdmin = () => {
  const user = getCurrentUser()
  return user && (user.rol === 'admin' || user.rol === 'pesador' || user.rol === 'electricista' || user.rol === 'chequero' || user.rol === 'chequerotraslado')
}