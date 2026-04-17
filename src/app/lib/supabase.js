// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente personalizado que USA EL PROXY SIEMPRE
const createProxyClient = () => {
  // Crear un fetch personalizado que siempre usa el proxy
  const customFetch = async (url, options = {}) => {
    console.log('🔄 Usando proxy para:', url)
    
    try {
      // Extraer el endpoint de la URL de Supabase
      let endpoint = ''
      let method = options.method || 'GET'
      let body = null
      
      // Parsear la URL para obtener el endpoint
      if (url.includes('/rest/v1/')) {
        endpoint = url.split('/rest/v1/')[1]
        // Limpiar query parameters si existen
        if (endpoint.includes('?')) {
          endpoint = endpoint.split('?')[0]
        }
      } else if (url.includes('/auth/v1/')) {
        // Para auth, pasar la URL completa
        endpoint = url
      } else {
        endpoint = url
      }
      
      // Extraer body si existe
      if (options.body) {
        try {
          body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        } catch (e) {
          body = options.body
        }
      }
      
      console.log('📡 Proxy request:', { endpoint, method, hasBody: !!body })
      
      // Llamar al proxy
      const proxyResponse = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: endpoint,
          method: method,
          data: body,
          originalUrl: url,
          headers: options.headers || {}
        })
      })
      
      if (!proxyResponse.ok) {
        const errorText = await proxyResponse.text()
        throw new Error(`Proxy error ${proxyResponse.status}: ${errorText}`)
      }
      
      const data = await proxyResponse.json()
      
      // Crear una respuesta simulada que Supabase pueda entender
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
    } catch (error) {
      console.error('❌ Proxy fetch falló:', error)
      throw error
    }
  }
  
  // Crear cliente de Supabase con nuestro fetch personalizado
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      fetch: customFetch
    }
  })
  
  return supabase
}

// Exportar el cliente que siempre usa proxy
export const supabase = createProxyClient()

// Función para probar la conexión
export const testConnection = async () => {
  try {
    console.log('🔍 Probando conexión vía proxy...')
    const { data, error } = await supabase
      .from('barcos')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Error en test:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Conexión exitosa vía proxy!')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Excepción en test:', error)
    return { success: false, error: error.message }
  }
}