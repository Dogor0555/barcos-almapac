// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cache de IP
let ipCache = null
let lastIpFetch = 0

const obtenerIP = async () => {
  if (ipCache && (Date.now() - lastIpFetch) < 300000) return ipCache
  
  const domain = supabaseUrl.replace('https://', '')
  
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
    const data = await response.json()
    
    if (data.Answer && data.Answer.length > 0) {
      ipCache = data.Answer[0].data
      lastIpFetch = Date.now()
      return ipCache
    }
  } catch (error) {
    console.error('Error obteniendo IP:', error)
  }
  return null
}

// Función para usar proxy como último recurso
const usarProxy = async (url, options = {}) => {
  try {
    const response = await fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        method: options.method || 'GET',
        body: options.body
      })
    })
    return response
  } catch (error) {
    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    fetch: async (url, options = {}) => {
      const timeout = 20000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const intentos = [
        async () => {
          // Intento 1: Normal
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            cache: 'no-store'
          })
          return response
        },
        async () => {
          // Intento 2: Con IP directa
          const ip = await obtenerIP()
          if (!ip) throw new Error('No se pudo obtener IP')
          const ipUrl = url.replace(supabaseUrl, `https://${ip}`)
          return await fetch(ipUrl, {
            ...options,
            headers: { ...options.headers, 'Host': supabaseUrl.replace('https://', '') }
          })
        },
        async () => {
          // Intento 3: Con proxy
          return await usarProxy(url, options)
        }
      ]
      
      for (let i = 0; i < intentos.length; i++) {
        try {
          clearTimeout(timeoutId)
          const response = await intentos[i]()
          if (response.ok || response.status < 500) {
            console.log(`✅ Intento ${i + 1} exitoso`)
            return response
          }
        } catch (error) {
          console.log(`❌ Intento ${i + 1} falló:`, error.message)
          if (i === intentos.length - 1) throw error
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      
      throw new Error('Todos los intentos fallaron')
    }
  }
})

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('barcos')
      .select('count')
      .limit(1)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}