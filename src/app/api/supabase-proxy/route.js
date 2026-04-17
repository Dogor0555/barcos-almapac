// app/api/supabase-proxy/route.js
import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { endpoint, method = 'GET', data, headers = {} } = body
    
    // Construir URL completa de Supabase
    let supabaseEndpoint = `${SUPABASE_URL}/rest/v1/${endpoint}`
    
    console.log('📡 Proxy recibiendo petición:')
    console.log('  - Endpoint:', endpoint)
    console.log('  - Método:', method)
    console.log('  - Tiene data:', !!data)
    
    // Configurar headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...headers
    }
    
    // Configurar opciones de fetch
    const fetchOptions = {
      method,
      headers: requestHeaders,
    }
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data)
    }
    
    // Hacer la petición a Supabase
    console.log('🔄 Proxy llamando a Supabase...')
    const response = await fetch(supabaseEndpoint, fetchOptions)
    
    // Leer la respuesta
    let responseData
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }
    
    const elapsed = Date.now() - startTime
    console.log(`✅ Proxy respondió en ${elapsed}ms - Status: ${response.status}`)
    
    // Devolver la respuesta
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
        'Cache-Control': 'no-store, max-age=0',
      }
    })
    
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ Error en proxy:', error)
    
    return NextResponse.json(
      { 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
}

// Manejar OPTIONS para CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
      'Access-Control-Max-Age': '86400',
    },
  })
}