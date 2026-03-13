// app/compartido-sacos/[token]/page-client.js
"use client";

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import DashboardSacosCompartido from './DashboardSacosCompartido'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ClientPage({ token }) {
  const [barco, setBarco] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const obtenerBarcoPorToken = async () => {
      try {
        setLoading(true)
        console.log("🔑 Buscando barco con token (sacos):", token)

        const { data: barcos, error } = await supabase
          .from('barcos')
          .select('id, nombre, codigo_barco, token_compartido, bodegas_json, metas_json, created_at')
          //                                                                   ^^^^^^^^^^^ FIX
          .eq('token_compartido', token)

        if (error) throw error

        if (!barcos || barcos.length === 0) {
          setError('Token no válido')
          return
        }

        console.log("✅ Barco encontrado:", barcos[0].nombre)
        console.log("🎯 metas_json raw:", barcos[0].metas_json)
        setBarco(barcos[0])
      } catch (err) {
        console.error('Error:', err)
        setError('Error al validar el token')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      obtenerBarcoPorToken()
    }
  }, [token])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <p>Validando acceso...</p>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            margin: '20px auto',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error || !barco) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{ 
          background: '#1e293b', 
          padding: '40px', 
          borderRadius: '16px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px', color: '#ef4444' }}>
            Acceso No Válido
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
            {error || 'El enlace que has utilizado no es válido'}
          </p>
          <p style={{ fontSize: '12px', color: '#64748b' }}>
            Si crees que esto es un error, contacta al administrador
          </p>
        </div>
      </div>
    )
  }

  return <DashboardSacosCompartido barco={barco} />
}