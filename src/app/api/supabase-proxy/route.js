// app/api/supabase-proxy/route.js
import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    let { endpoint, method = 'GET', data, originalUrl, headers = {} } = body
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📡 PROXY RECIBIENDO PETICIÓN')
    console.log('  Método:', method)
    console.log('  Endpoint:', endpoint)
    
    let supabaseEndpoint
    
    // Determinar la URL completa de Supabase
    if (endpoint && (endpoint.startsWith('http://') || endpoint.startsWith('https://'))) {
      // Es una URL completa (para auth)
      supabaseEndpoint = endpoint
    } else if (endpoint && endpoint.includes('/rest/v1/')) {
      // Ya incluye la URL base
      supabaseEndpoint = endpoint
    } else if (endpoint) {
      // Es solo el endpoint, construir URL completa
      supabaseEndpoint = `${SUPABASE_URL}/rest/v1/${endpoint}`
    } else if (originalUrl) {
      // Usar la URL original
      supabaseEndpoint = originalUrl
    } else {
      throw new Error('No se pudo determinar el endpoint')
    }
    
    console.log('  URL:', supabaseEndpoint)
    
    // Configurar headers
    const requestHeaders = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...headers
    }
    
    // Configurar opciones de fetch
    const fetchOptions = {
      method,
      headers: requestHeaders,
    }
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(data)
      console.log('  Body:', JSON.stringify(data).substring(0, 200))
    }
    
    // Hacer la petición a Supabase
    console.log('🔄 Llamando a Supabase...')
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
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