import dayjs from 'dayjs'
import 'dayjs/locale/es'
dayjs.locale('es')

// Formatos
export const formatTM = (kg, decimals = 3) => {
  if (kg == null || isNaN(kg)) return '0.000'
  const tm = kg / 1000
  return tm.toLocaleString('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  })
}

export const formatKg = (kg, decimals = 0) => {
  if (kg == null || isNaN(kg)) return '—'
  return kg.toLocaleString('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  })
}

// ✅ VERSIÓN CORREGIDA - Formato 24h sin conversión UTC
export const formatHora = (timeStr) => {
  if (!timeStr) return '—'
  
  // Si ya viene en formato HH:MM, devolverlo directamente
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    // Asegurar que tenga 2 dígitos en horas
    const [hours, minutes] = timeStr.split(':')
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  }
  
  // Si viene con T o es timestamp, extraer solo la hora
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1]
    if (timePart && timePart.includes(':')) {
      const [hours, minutes] = timePart.split(':')
      return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
    }
  }
  
  return '—'
}

// ✅ VERSIÓN CORREGIDA - Formato DD/MM/YY HH:mm sin conversión UTC
export const formatFechaHora = (datetime) => {
  if (!datetime) return '—'
  
  try {
    // Si es string ISO (YYYY-MM-DDTHH:mm:ss)
    if (typeof datetime === 'string') {
      // Separar fecha y hora
      const [fechaPart, horaPart] = datetime.split('T')
      if (!fechaPart || !horaPart) return datetime
      
      // Formatear fecha DD/MM/YY
      const [year, month, day] = fechaPart.split('-')
      if (!year || !month || !day) return datetime
      
      // Tomar solo HH:mm de la hora
      const hora = horaPart.substring(0, 5)
      
      return `${day}/${month}/${year.slice(2)} ${hora}`
    }
    
    // Si es objeto Date
    if (datetime instanceof Date) {
      const day = datetime.getDate().toString().padStart(2, '0')
      const month = (datetime.getMonth() + 1).toString().padStart(2, '0')
      const year = datetime.getFullYear().toString().slice(2)
      const hours = datetime.getHours().toString().padStart(2, '0')
      const minutes = datetime.getMinutes().toString().padStart(2, '0')
      
      return `${day}/${month}/${year} ${hours}:${minutes}`
    }
    
    // Fallback a dayjs si todo lo demás falla
    return dayjs(datetime).format('DD/MM/YY HH:mm')
  } catch (error) {
    console.error('Error formateando fecha:', error)
    return '—'
  }
}

export const calcularPorcentaje = (valor, total) => {
  if (!total || total <= 0) return 0
  return Math.min(100, (valor / total) * 100)
}

export const calcularFlujo = (pesoKg, horas) => {
  if (!horas || horas <= 0 || !pesoKg) return 0
  return (pesoKg / 1000) / horas
}

// Colores por producto
export const getProductoColor = (codigo) => {
  const colores = {
    'MA-001': { from: 'from-yellow-500', to: 'to-amber-600', accent: '#f59e0b' },
    'HS-001': { from: 'from-green-600', to: 'to-emerald-700', accent: '#059669' },
    'DDGS': { from: 'from-orange-600', to: 'to-red-700', accent: '#ea580c' }
  }
  return colores[codigo] || { from: 'from-blue-500', to: 'to-blue-700', accent: '#3b82f6' }
}

// Iconos por producto
export const getProductoIcono = (codigo) => {
  const iconos = {
    'MA-001': '🌽',
    'HS-001': '🌿',
    'DDGS': '🟤'
  }
  return iconos[codigo] || '📦'
}

// ✅ Formatear fecha local
export const formatFecha = (fecha) => {
  if (!fecha) return '—'
  
  try {
    if (typeof fecha === 'string') {
      const [year, month, day] = fecha.split('T')[0].split('-')
      return `${day}/${month}/${year}`
    }
    if (fecha instanceof Date) {
      const day = fecha.getDate().toString().padStart(2, '0')
      const month = (fecha.getMonth() + 1).toString().padStart(2, '0')
      const year = fecha.getFullYear()
      return `${day}/${month}/${year}`
    }
    return '—'
  } catch {
    return '—'
  }
}

// ✅ Validar y forzar formato 24h
export const validateHora24h = (hora) => {
  if (!hora) return ''
  
  // Si ya es string, limpiar
  const horaStr = String(hora)
  
  // Buscar patrón HH:MM
  const match = horaStr.match(/(\d{1,2}):(\d{2})/)
  if (match) {
    let hours = parseInt(match[1], 10)
    const minutes = match[2]
    
    // Convertir PM a 24h si es necesario
    if (horaStr.toLowerCase().includes('pm') && hours < 12) {
      hours += 12
    } else if (horaStr.toLowerCase().includes('am') && hours === 12) {
      hours = 0
    }
    
    // Asegurar rango 0-23
    hours = Math.min(23, Math.max(0, hours))
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`
  }
  
  return horaStr
}

// ✅ Detectar formato AM/PM
export const detectarFormatoAmPm = (hora) => {
  if (!hora) return false
  return hora.toLowerCase().includes('am') || hora.toLowerCase().includes('pm')
}