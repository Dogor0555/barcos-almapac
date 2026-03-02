// compartido/[token]/page-client.js - Componente cliente para validar el token y mostrar el dashboard compartido

"use client";

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import DashboardCompartido from './DashboardCompartido'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function ClientPage({ token }) {
  const [codigoBarco, setCodigoBarco] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const obtenerCodigoPorToken = async () => {
      try {
        setLoading(true)
        console.log("🔑 Buscando barco con token:", token)

        // Buscar el barco por su token_compartido
        const { data: barcos, error } = await supabase
          .from('barcos')
          .select('codigo_barco')
          .eq('token_compartido', token)

        if (error) throw error

        if (!barcos || barcos.length === 0) {
          setError('Token no válido')
          return
        }

        console.log("✅ Barco encontrado, código:", barcos[0].codigo_barco)
        setCodigoBarco(barcos[0].codigo_barco)
      } catch (err) {
        console.error('Error:', err)
        setError('Error al validar el token')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      obtenerCodigoPorToken()
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
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔑</div>
          <p>Validando acceso...</p>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            margin: '20px auto',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>
    )
  }

  if (error || !codigoBarco) {
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

  // Una vez tenemos el código, renderizamos el dashboard
  return <DashboardCompartido codigoBarco={codigoBarco} />
}