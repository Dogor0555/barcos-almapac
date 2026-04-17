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
      console.log('✅ IP obtenida:', ipCache)
      return ipCache
    }
  } catch (error) {
    console.error('Error obteniendo IP:', error)
  }
  return null
}

// Función para usar proxy
const usarProxy = async (url, options = {}) => {
  try {
    // Extraer el endpoint y el método de la URL
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/rest\/v1\/(.+)/)
    
    if (!pathMatch) {
      throw new Error('No se pudo extraer el endpoint de la URL')
    }
    
    const endpoint = pathMatch[1]
    let body = null
    
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
      } catch (e) {
        body = options.body
      }
    }
    
    console.log('🔄 Usando proxy para:', endpoint)
    
    const response = await fetch('/api/supabase-proxy', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: endpoint,
        method: options.method || 'GET',
        data: body,
        headers: options.headers || {}
      })
    })
    
    if (!response.ok) {
      throw new Error(`Proxy respondió con status ${response.status}`)
    }
    
    // El proxy devuelve los datos directamente
    const data = await response.json()
    
    // Crear una respuesta simulada que fetch pueda entender
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('❌ Error en proxy:', error)
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
      let controller = new AbortController()
      let timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const intentos = [
        {
          name: 'Directo',
          fn: async () => {
            console.log('🌐 Intento 1: Conexión directa a Supabase...')
            const response = await fetch(url, {
              ...options,
              signal: controller.signal,
              cache: 'no-store',
              headers: {
                ...options.headers,
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
              }
            })
            return response
          }
        },
        {
          name: 'IP Directa',
          fn: async () => {
            console.log('🔧 Intento 2: Usando IP directa...')
            const ip = await obtenerIP()
            if (!ip) throw new Error('No se pudo obtener IP')
            const ipUrl = url.replace(supabaseUrl, `https://${ip}`)
            console.log('📍 IP:', ip)
            return await fetch(ipUrl, {
              ...options,
              signal: controller.signal,
              headers: {
                ...options.headers,
                'Host': supabaseUrl.replace('https://', ''),
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
              }
            })
          }
        },
        {
          name: 'Proxy',
          fn: async () => {
            console.log('🔄 Intento 3: Usando proxy...')
            return await usarProxy(url, options)
          }
        }
      ]
      
      for (let i = 0; i < intentos.length; i++) {
        try {
          // Crear nuevo controller para cada intento
          controller = new AbortController()
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => controller.abort(), timeout)
          
          const response = await intentos[i].fn()
          clearTimeout(timeoutId)
          
          if (response.ok) {
            console.log(`✅ ${intentos[i].name} - ÉXITO!`)
            return response
          } else {
            console.log(`⚠️ ${intentos[i].name} - Status ${response.status}`)
            const text = await response.text()
            console.log(`   Response: ${text.substring(0, 200)}`)
            
            if (i === intentos.length - 1) {
              return response
            }
          }
        } catch (error) {
          clearTimeout(timeoutId)
          console.log(`❌ ${intentos[i].name} - FALLÓ:`, error.message)
          
          if (i === intentos.length - 1) {
            throw error
          }
          
          await new Promise(r => setTimeout(r, 1000))
        }
      }
      
      throw new Error('Todos los intentos fallaron')
    }
  }
})

// Función para probar la conexión
export const testConnection = async () => {
  try {
    console.log('🔍 Probando conexión a Supabase...')
    const { data, error } = await supabase
      .from('barcos')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Error en test:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Conexión exitosa!')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Excepción en test:', error)
    return { success: false, error: error.message }
  }
}