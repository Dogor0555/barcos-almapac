// app/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from './lib/auth'
import toast from 'react-hot-toast'
import { LogIn, Ship, Lock, User, Bug, X, Wifi, WifiOff, Server, Clock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estado para el modal de logs
  const [showLogModal, setShowLogModal] = useState(false)
  const [logs, setLogs] = useState([])
  const [networkStatus, setNetworkStatus] = useState(null)

  // Función para agregar logs
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const newLog = { id: Date.now() + Math.random(), timestamp, message, type }
    setLogs(prev => [newLog, ...prev].slice(0, 50))
    console.log(`[${timestamp}] ${message}`)
  }

  // Diagnóstico de red
  const runDiagnostics = async () => {
    addLog('🔍 INICIANDO DIAGNÓSTICO COMPLETO...', 'info')
    addLog(`📱 User Agent: ${navigator.userAgent.substring(0, 80)}...`, 'info')
    
    // 1. Verificar conexión a internet
    addLog('📡 Verificando conexión a internet...', 'info')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const response = await fetch('https://www.google.com', { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        addLog('✅ Internet: CONECTADO', 'success')
        setNetworkStatus('connected')
      } else {
        addLog(`⚠️ Internet: Respuesta ${response.status}`, 'warning')
      }
    } catch (error) {
      addLog(`❌ Internet: SIN CONEXIÓN - ${error.message}`, 'error')
      setNetworkStatus('disconnected')
    }

    // 2. Verificar Supabase
    addLog('🗄️ Verificando conexión a Supabase...', 'info')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    addLog(`📍 URL: ${supabaseUrl}`, 'info')
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        addLog('✅ Supabase: ACCESIBLE', 'success')
      } else {
        addLog(`⚠️ Supabase: HTTP ${response.status}`, 'warning')
      }
    } catch (error) {
      addLog(`❌ Supabase: INACCESIBLE - ${error.message}`, 'error')
      if (error.message.includes('Failed to fetch')) {
        addLog(`💡 Posible causa: Puerto bloqueado o DNS del operador`, 'warning')
      }
    }

    // 3. Información de red (si está disponible)
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const conn = navigator.connection
      addLog(`📶 Tipo de red: ${conn.effectiveType || 'desconocido'}`, 'info')
      addLog(`⚡ Velocidad: ${conn.downlink || '?'} Mbps`, 'info')
      addLog(`⏱️ Latencia: ${conn.rtt || '?'} ms`, 'info')
    }

    // 4. Verificar DNS
    addLog('🌐 Verificando resolución DNS...', 'info')
    const domains = ['google.com', 'vercel.com', supabaseUrl.replace('https://', '')]
    for (const domain of domains) {
      try {
        const start = Date.now()
        const response = await fetch(`https://${domain}`, { method: 'HEAD', mode: 'no-cors' })
        const time = Date.now() - start
        addLog(`✅ DNS ${domain}: ${time}ms`, 'success')
      } catch (error) {
        addLog(`❌ DNS ${domain}: FALLÓ`, 'error')
      }
    }

    addLog('🏁 DIAGNÓSTICO COMPLETADO', 'success')
  }

  // Ejecutar diagnóstico automático al abrir el modal
  useEffect(() => {
    if (showLogModal) {
      runDiagnostics()
    }
  }, [showLogModal])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    addLog(`🔐 Intentando login para: ${username}`, 'info')
    addLog(`⏰ Hora: ${new Date().toLocaleString()}`, 'info')
    
    const startTime = Date.now()
    
    try {
      const result = await login(username, password)
      const elapsed = Date.now() - startTime
      addLog(`⏱️ Tiempo respuesta: ${elapsed}ms`, 'info')
      
      if (result.success) {
        addLog(`✅ Login exitoso para ${username} (rol: ${result.user.rol})`, 'success')
        toast.success('¡Bienvenido!')
        
        let redirectPath = '/traslados'
        if (result.user.rol === 'admin') redirectPath = '/admin'
        else if (result.user.rol === 'pesador') redirectPath = '/admin'
        else if (result.user.rol === 'envasador') redirectPath = '/envasador'
        else if (result.user.rol === 'electricista') redirectPath = '/electricista'
        else if (result.user.rol === 'chequero') redirectPath = '/chequero'
        
        router.push(redirectPath)
      } else {
        addLog(`❌ Login fallido: ${result.error}`, 'error')
        toast.error(result.error || 'Credenciales inválidas')
      }
    } catch (error) {
      const elapsed = Date.now() - startTime
      addLog(`💥 Error crítico: ${error.message}`, 'error')
      addLog(`⏱️ Tiempo hasta error: ${elapsed}ms`, 'error')
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        addLog(`📡 ERROR DE RED DETECTADO`, 'error')
        addLog(`Posibles causas:`, 'warning')
        addLog(`  • Puerto bloqueado por operador móvil`, 'warning')
        addLog(`  • DNS no resuelve Supabase`, 'warning')
        addLog(`  • IPv6 vs IPv4`, 'warning')
        addLog(`  • Certificado SSL bloqueado`, 'warning')
      }
      
      toast.error(`Error de conexión: ${error.message}`)
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Botón de diagnóstico (discreto abajo a la derecha) */}
        <button
          onClick={() => setShowLogModal(true)}
          className="fixed bottom-4 right-4 bg-slate-800/80 backdrop-blur-sm p-2 rounded-full border border-slate-700 hover:border-blue-500 transition-all group z-40"
          title="Diagnóstico de red"
        >
          <Bug className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
        </button>

        {/* Modal de Logs */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${networkStatus === 'connected' ? 'bg-green-500 animate-pulse' : networkStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <h3 className="text-white font-bold">📋 DIAGNÓSTICO DE RED</h3>
                  {networkStatus === 'connected' ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Botones de acción */}
              <div className="p-3 border-b border-slate-800 flex gap-2">
                <button
                  onClick={runDiagnostics}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1"
                >
                  <Server className="w-3 h-3" />
                  Ejecutar diagnóstico
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
                >
                  Limpiar logs
                </button>
              </div>

              {/* Área de logs */}
              <div className="p-4 overflow-y-auto max-h-[60vh] font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Haz clic en "Ejecutar diagnóstico" para comenzar</p>
                    <p className="text-[10px] mt-2">o intenta iniciar sesión para ver logs</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`border-l-2 pl-2 py-1 ${
                        log.type === 'error' ? 'border-red-500 text-red-400 bg-red-500/5' :
                        log.type === 'success' ? 'border-green-500 text-green-400' :
                        log.type === 'warning' ? 'border-yellow-500 text-yellow-400' :
                        'border-blue-500 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer con información */}
              <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    {logs.length} logs registrados
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#1e293b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Ship className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white">BARCOS ALMAPAC</h1>
            <p className="text-blue-200 text-sm mt-2">Sistema de gestión portuaria</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa tu usuario"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ingresa tu contraseña"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Ingresar al Sistema</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}