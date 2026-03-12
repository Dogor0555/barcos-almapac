// admin/GenerarDashboardSacosModal.js - Modal para generar y compartir el dashboard de sacos

'use client'

import { useState } from 'react'
import { X, Copy, Check, ExternalLink, Ship, QrCode, Download, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'

export default function GenerarDashboardSacosModal({ barco, onClose }) {
  const [copiado, setCopiado] = useState(false)
  const [qrGenerado, setQrGenerado] = useState(false)
  const [qrDataURL, setQrDataURL] = useState('')
  const [mostrarQR, setMostrarQR] = useState(false)

  // Usar token compartido para la URL
  const dashboardUrl = `${window.location.origin}/compartido-sacos/${barco.token_compartido}`

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(dashboardUrl)
      setCopiado(true)
      toast.success('✅ Link copiado al portapapeles')
      setTimeout(() => setCopiado(false), 2000)
    } catch (error) {
      toast.error('Error al copiar')
    }
  }

  const handleGenerarQR = async () => {
    try {
      const qrData = await QRCode.toDataURL(dashboardUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      setQrDataURL(qrData)
      setMostrarQR(true)
      setQrGenerado(true)
      toast.success('✅ Código QR generado')
    } catch (error) {
      console.error('Error generando QR:', error)
      toast.error('Error al generar QR')
    }
  }

  const handleDescargarQR = () => {
    const link = document.createElement('a')
    link.download = `sacos-${barco.nombre}.png`
    link.href = qrDataURL
    link.click()
    toast.success('✅ QR descargado')
  }

  const handleAbrirDashboard = () => {
    window.open(dashboardUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  Dashboard de Sacos - {barco.nombre}
                </h2>
                <p className="text-green-200 text-sm">
                  Código: {barco.codigo_barco} · Token: {barco.token_compartido?.substring(0, 8)}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="bg-slate-900 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-400 mb-2">🔗 Link del Dashboard de Sacos:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-800 text-green-400 px-3 py-2 rounded-lg text-sm font-mono break-all">
                {dashboardUrl}
              </code>
              <button
                onClick={handleCopiar}
                className={`p-2 rounded-lg transition-all ${
                  copiado ? 'bg-green-500/20' : 'bg-slate-800 hover:bg-slate-700'
                }`}
                title="Copiar link"
              >
                {copiado ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Vista previa del QR */}
          {mostrarQR && qrDataURL && (
            <div className="bg-white rounded-xl p-4 mb-4 flex flex-col items-center">
              <img src={qrDataURL} alt="QR Code" className="w-48 h-48" />
              <p className="text-xs text-slate-600 mt-2">
                Escanea para abrir el dashboard de sacos
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleAbrirDashboard}
              className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Dashboard
            </button>

            {!qrGenerado ? (
              <button
                onClick={handleGenerarQR}
                className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4" />
                Generar QR
              </button>
            ) : (
              <button
                onClick={handleDescargarQR}
                className="bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar QR
              </button>
            )}
          </div>

          {/* Instrucciones */}
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <p className="text-sm text-green-400 flex items-start gap-2">
              <span className="text-lg">📦</span>
              <span>
                Dashboard exclusivo para el registro de sacos. 
                Muestra estadísticas de viajes, sacos por bodega y control de calidad.
                <br /><br />
                <span className="text-xs text-green-300">
                  Token: {barco.token_compartido}
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}