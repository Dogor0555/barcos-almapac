'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { Ship, LogOut, Zap, Clock, Play, Lock, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ElectricistaPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [barcos, setBarcos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u) {
      router.replace('/')
      return
    }
    if (u.rol !== 'electricista') {
      router.replace('/')
      return
    }
    setUser(u)
    cargarBarcos()
  }, [])

  const cargarBarcos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('barcos')
        .select('id, nombre, codigo_barco, estado, token_compartido, operacion_iniciada_at, operacion_finalizada_at')
        .in('estado', ['activo', 'planeado'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setBarcos(data || [])
    } catch (error) {
      console.error('Error cargando barcos:', error)
      toast.error('Error al cargar los barcos')
    } finally {
      setLoading(false)
    }
  }

  const seleccionarBarco = (token) => {
    router.push(`/barco/${token}/exportacion`)
  }

  const handleLogout = () => {
    logout()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-8">
      {/* Fondos decorativos */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
      </div>

      <div className="relative max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Panel Electricista</h1>
                <p className="text-yellow-200 text-sm mt-0.5">
                  Bienvenido, <span className="font-bold">{user?.nombre}</span> · Selecciona un barco activo
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>

        {/* Botón refrescar + contador */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            {barcos.length > 0
              ? `${barcos.length} barco${barcos.length !== 1 ? 's' : ''} disponible${barcos.length !== 1 ? 's' : ''}`
              : 'No hay barcos disponibles'}
          </p>
          <button
            onClick={cargarBarcos}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-all text-sm font-bold border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>

        {/* Lista de barcos */}
        {barcos.length === 0 ? (
          <div className="bg-[#1e293b] border border-white/10 rounded-2xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-400">No hay barcos activos</p>
            <p className="text-slate-600 text-sm mt-2">No hay operaciones en curso en este momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barcos.map((barco) => (
              <button
                key={barco.id}
                onClick={() => seleccionarBarco(barco.token_compartido)}
                className="bg-[#1e293b] border border-white/10 hover:border-yellow-500/40 hover:bg-yellow-500/5 rounded-2xl p-6 text-left transition-all group shadow-lg hover:shadow-yellow-500/10"
              >
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-500/10 group-hover:bg-yellow-500/20 p-3 rounded-xl transition-all">
                      <Ship className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white group-hover:text-yellow-300 transition-colors">
                        {barco.nombre}
                      </h2>
                      {barco.codigo_barco && (
                        <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                          {barco.codigo_barco}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge de estado */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    barco.estado === 'activo'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {barco.estado === 'activo'
                      ? <><Play className="w-3 h-3" /> ACTIVO</>
                      : <><Clock className="w-3 h-3" /> PLANEADO</>
                    }
                  </span>
                </div>

                {/* Info de operación */}
                <div className="space-y-2">
                  {barco.operacion_iniciada_at ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Play className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-400">Descarga iniciada:</span>
                      <span className="text-green-400 font-bold">
                        {new Date(barco.operacion_iniciada_at).toLocaleString('es-ES', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                      <span className="text-slate-500">Descarga aún no iniciada</span>
                    </div>
                  )}

                  {barco.operacion_finalizada_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span className="text-slate-400">Finalizado:</span>
                      <span className="text-red-400 font-bold">
                        {new Date(barco.operacion_finalizada_at).toLocaleString('es-ES', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer de la card */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    Toca para ver exportaciones
                  </span>
                  <span className="text-xs font-bold text-yellow-400 group-hover:translate-x-1 transition-transform inline-block">
                    Ver →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}