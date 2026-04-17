// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Lista de DNS alternativos para fallback
const DNS_ALTERNATIVOS = [
  'https://dns.google/resolve',
  'https://cloudflare-dns.com/dns-query',
  'https://dns.quad9.net/resolve'
]

// Cache de IP
let ipCache = null
let lastIpFetch = 0

const obtenerIPSupabase = async () => {
  // Cache por 5 minutos
  if (ipCache && (Date.now() - lastIpFetch) < 300000) {
    return ipCache
  }

  const domain = supabaseUrl.replace('https://', '').replace('http://', '')
  
  for (const dns of DNS_ALTERNATIVOS) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const url = dns.includes('google') 
        ? `${dns}?name=${domain}&type=A`
        : dns
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: dns.includes('cloudflare') ? { 'Accept': 'application/dns-json' } : {}
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        let ip = null
        
        if (data.Answer) {
          ip = data.Answer.find(a => a.type === 1)?.data
        } else if (data.Question && data.Answer) {
          ip = data.Answer[0]?.data
        }
        
        if (ip) {
          ipCache = ip
          lastIpFetch = Date.now()
          console.log('✅ IP obtenida:', ip)
          return ip
        }
      }
    } catch (error) {
      console.warn(`DNS ${dns} falló:`, error.message)
    }
  }
  
  return null
}

// Cliente con timeout extendido
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  global: {
    fetch: async (url, options = {}) => {
      const timeout = 30000 // 30 segundos timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      try {
        // Intentar con URL normal
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          cache: 'no-store',
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
        
        // Si es error de DNS, intentar con IP directa
        if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
          console.log('🔄 Error de conexión, intentando con IP...')
          const ip = await obtenerIPSupabase()
          
          if (ip) {
            const ipUrl = url.replace(supabaseUrl, `https://${ip}`)
            try {
              const response = await fetch(ipUrl, {
                ...options,
                headers: {
                  ...options.headers,
                  'Host': supabaseUrl.replace('https://', ''),
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
  }
})

// Función de prueba con reintentos
export const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Test de conexión - Intento ${i + 1}/${retries}`)
      const { data, error } = await supabase
        .from('barcos')
        .select('count')
        .limit(1)
        .timeout(10000)
      
      if (!error) {
        console.log('✅ Conexión a Supabase exitosa')
        return { success: true }
      }
      
      if (i === retries - 1) {
        return { success: false, error: error.message }
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      if (i === retries - 1) {
        return { success: false, error: error.message }
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  return { success: false, error: 'Todos los intentos fallaron' }
}