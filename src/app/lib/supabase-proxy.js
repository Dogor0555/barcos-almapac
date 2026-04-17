// lib/supabase-proxy.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente que usa nuestro proxy cuando falla
class SupabaseProxyClient {
  constructor() {
    this.useProxy = false
    this.originalClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  }

  async fetchWithProxy(endpoint, options = {}) {
    try {
      const response = await fetch('/api/supabase-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method: options.method || 'GET',
          data: options.body ? JSON.parse(options.body) : null
        })
      })
      
      return await response.json()
    } catch (error) {
      console.error('Proxy también falló:', error)
      throw error
    }
  }

  getClient() {
    // Envolver el cliente original para usar proxy cuando falle
    const originalFrom = this.originalClient.from.bind(this.originalClient)
    
    this.originalClient.from = (table) => {
      const queryBuilder = originalFrom(table)
      
      // Envolver los métodos que hacen fetch
      const originalSelect = queryBuilder.select.bind(queryBuilder)
      const originalInsert = queryBuilder.insert.bind(queryBuilder)
      const originalUpdate = queryBuilder.update.bind(queryBuilder)
      const originalDelete = queryBuilder.delete.bind(queryBuilder)
      
      queryBuilder.select = async (...args) => {
        try {
          return await originalSelect(...args)
        } catch (error) {
          if (error.message.includes('Failed to fetch')) {
            console.log('⚠️ Fallback a proxy para SELECT')
            const result = await this.fetchWithProxy(`${table}?select=${args[0] || '*'}`)
            return { data: result, error: null }
          }
          throw error
        }
      }
      
      queryBuilder.insert = async (data) => {
        try {
          return await originalInsert(data)
        } catch (error) {
          if (error.message.includes('Failed to fetch')) {
            console.log('⚠️ Fallback a proxy para INSERT')
            const result = await this.fetchWithProxy(table, { method: 'POST', body: data })
            return { data: result, error: null }
          }
          throw error
        }
      }
      
      return queryBuilder
    }
    
    return this.originalClient
  }
}

const proxyClient = new SupabaseProxyClient()
export const supabase = proxyClient.getClient()

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('barcos')
      .select('id')
      .limit(1)
    
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}