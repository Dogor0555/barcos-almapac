// src/app/lib/auth.js

import { supabase } from './supabase'
import Cookies from 'js-cookie'
import bcrypt from 'bcryptjs'

// Función de login con bcrypt
export const login = async (username, password) => {
  try {
    console.log('🔐 Intentando login:', username)
    
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, nombre, username, password, rol, activo')
      .eq('username', username)
      .eq('activo', true)

    if (error) {
      console.error('❌ Error en consulta:', error)
      return { success: false, error: error.message }
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
      sameSite: 'strict'
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
    console.error('🔥 Error en login:', error)
    return { success: false, error: error.message }
  }
}

// Logout
export const logout = () => {
  Cookies.remove('session', { path: '/' })
  
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('user')
    window.location.href = '/'
  }
}

// Obtener usuario actual
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

// Verificar roles
export const isAuthenticated = () => {
  return !!getCurrentUser()
}

export const isAdmin = () => {
  const user = getCurrentUser()
  return user?.rol === 'admin'
}

export const isPesador = () => {
  const user = getCurrentUser()
  return user?.rol === 'pesador'
}

export const isElectricista = () => {
  const user = getCurrentUser()
  return user?.rol === 'electricista'
}

export const isChequero = () => {
  const user = getCurrentUser()
  return user?.rol === 'chequero'
}

// NUEVA FUNCIÓN
export const isChequeroTraslado = () => {
  const user = getCurrentUser()
  return user?.rol === 'chequerotraslado'
}


export const isEnvasador = () => {
  const user = getCurrentUser()
  return user?.rol === 'envasador'
}

// ACTUALIZADA
export const isPesadorOrAdmin = () => {
  const user = getCurrentUser()
  return user && (
    user.rol === 'admin' || 
    user.rol === 'pesador' || 
    user.rol === 'electricista' || 
    user.rol === 'chequero' ||
    user.rol === 'chequerotraslado'
  )
}