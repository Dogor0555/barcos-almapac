// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Función para obtener IP de Supabase (cache)
let cachedIp = null

const getSupabaseIp = async () => {
  if (cachedIp) return cachedIp
  
  try {
    // Extraer el dominio sin https://
    const domain = supabaseUrl.replace('https://', '').replace('http://', '')
    
    // Usar API de DNS sobre HTTPS para resolver
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
    const data = await response.json()
    
    if (data.Answer && data.Answer.length > 0) {
      cachedIp = data.Answer[0].data
      console.log('✅ IP de Supabase obtenida:', cachedIp)
      return cachedIp
    }
  } catch (error) {
    console.error('❌ Error obteniendo IP:', error)
  }
  return null
}

// Cliente con reintentos y fallback
class SupabaseClientWithFallback {
  constructor(url, key) {
    this.url = url
    this.key = key
    this.client = null
    this.fallbackMode = false
    this.initClient()
  }

  initClient() {
    // Opciones avanzadas para mejor conectividad
    const options = {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        headers: {
          'x-application-name': 'almapac-barcos',
        },
        fetch: this.customFetch.bind(this)
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }

    this.client = createClient(this.url, this.key, options)
  }

  async customFetch(url, options = {}) {
    const timeout = 15000 // 15 segundos timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Intentar con la URL original primero
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Forzar keepalive para conexiones largas
        keepalive: true,
        // Cache policy
        cache: 'no-store',
        // Headers adicionales
        headers: {
          ...options.headers,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Si falla y estamos en modo fallback, intentar con IP
      if (this.fallbackMode && error.name === 'AbortError') {
        console.log('🔄 Intentando con IP directa...')
        const ip = await getSupabaseIp()
        if (ip) {
          const ipUrl = url.replace(this.url, `https://${ip}`)
          try {
            const response = await fetch(ipUrl, {
              ...options,
              headers: {
                ...options.headers,
                'Host': this.url.replace('https://', ''),
              }
            })
            return response
          } catch (ipError) {
            console.error('❌ También falló con IP:', ipError)
          }
        }
      }
      
      throw error
    }
  }

  enableFallbackMode() {
    if (!this.fallbackMode) {
      console.log('⚠️ Activando modo fallback...')
      this.fallbackMode = true
      this.initClient() // Re-inicializar con modo fallback
    }
  }

  getClient() {
    return this.client
  }
}

// Crear instancia única
const supabaseInstance = new SupabaseClientWithFallback(supabaseUrl, supabaseAnonKey)
export const supabase = supabaseInstance.getClient()

// Función para probar conexión con reintentos automáticos
export const testConnectionWithRetry = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Intento ${i + 1} de ${retries}...`)
      
      const { data, error } = await supabase
        .from('barcos')
        .select('count')
        .limit(1)
        .timeout(10000)
      
      if (!error) {
        console.log('✅ Conexión exitosa!')
        return { success: true }
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('⚠️ Error de red, reintentando...')
        if (i === retries - 2) {
          supabaseInstance.enableFallbackMode()
        }
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return { success: false, error }
      
    } catch (error) {
      console.error(`❌ Intento ${i + 1} falló:`, error.message)
      if (i === retries - 1) {
        return { success: false, error }
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return { success: false, error: new Error('Todos los intentos fallaron') }
}