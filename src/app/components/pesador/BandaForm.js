// components/pesador/BandaForm.js - Formulario para registrar una nueva lectura de banda en el componente de pesador

'use client'

import { useState } from 'react'
import { Scale, Save } from 'lucide-react'

export default function BandaForm({ producto, destinos, onGuardar }) {
  const [lectura, setLectura] = useState({
    fecha_hora: new Date().toISOString().slice(0, 16),
    acumulado_kg: '',
    destino_id: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setLectura(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = () => {
    onGuardar(lectura)
    setLectura({
      fecha_hora: new Date().toISOString().slice(0, 16),
      acumulado_kg: '',
      destino_id: ''
    })
  }

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Scale className="w-5 h-5 text-blue-400" />
        Nueva Lectura de Banda - {producto?.nombre}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Fecha y Hora</label>
          <input
            type="datetime-local"
            name="fecha_hora"
            value={lectura.fecha_hora}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Acumulado (kg) *</label>
          <input
            type="number"
            name="acumulado_kg"
            value={lectura.acumulado_kg}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            placeholder="15000"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Destino *</label>
          <select
            name="destino_id"
            value={lectura.destino_id}
            onChange={handleChange}
            className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Seleccionar</option>
            {destinos.map(d => (
              <option key={d.id} value={d.id}>{d.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end col-span-3">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            Guardar Lectura de Banda
          </button>
        </div>
      </div>
    </div>
  )
}