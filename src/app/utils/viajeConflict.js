import { supabase } from '../lib/supabase'

export const verificarNumeroViaje = async (barcoId, productoId, viajeNumero) => {
  // Verificar si el número específico está ocupado
  const { data, error } = await supabase
    .from('viajes')
    .select('viaje_numero')
    .eq('barco_id', barcoId)
    .eq('producto_id', productoId)
    .eq('viaje_numero', viajeNumero)
    .maybeSingle()

  if (error) throw error

  // Si NO está ocupado, devolver libre
  if (!data) {
    return { 
      libre: true, 
      sugerido: viajeNumero // El mismo número está libre
    }
  }

  // Si está ocupado, obtener TODOS los números ocupados para este barco+producto
  const { data: todos } = await supabase
    .from('viajes')
    .select('viaje_numero')
    .eq('barco_id', barcoId)
    .eq('producto_id', productoId)
    .order('viaje_numero', { ascending: true })

  // Crear un Set con todos los números ocupados
  const ocupados = new Set(todos.map(v => v.viaje_numero))
  
  // Buscar el siguiente número disponible DESDE 1 hacia arriba
  // No empezar desde viajeNumero + 1, sino buscar el primer hueco disponible
  let siguiente = 1
  while (ocupados.has(siguiente)) {
    siguiente++
  }

  return { 
    libre: false, 
    sugerido: siguiente 
  }
}

export const getSiguienteNumeroViaje = async (barcoId, productoId) => {
  const { data } = await supabase
    .from('viajes')
    .select('viaje_numero')
    .eq('barco_id', barcoId)
    .eq('producto_id', productoId)
    .order('viaje_numero', { ascending: false })
    .limit(1)

  // Si no hay viajes, empezar en 1
  if (!data || data.length === 0) return 1
  
  // Si hay viajes, el siguiente es el máximo + 1
  const maxViaje = data[0].viaje_numero
  return maxViaje + 1
}