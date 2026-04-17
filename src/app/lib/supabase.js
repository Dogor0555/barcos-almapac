import { createClient } from '@supabase/supabase-js'

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Inicializando Supabase...')
console.log('URL:', supabaseUrl ? '✓ Presente' : '✗ FALTANTE')
console.log('KEY:', supabaseAnonKey ? '✓ Presente' : '✗ FALTANTE')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Faltan variables de entorno de Supabase')
  throw new Error('Faltan variables de entorno de Supabase')
}

// Crear el cliente con opciones explícitas
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
})

// Función para probar la conexión
export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Probando conexión a Supabase...')
    
    const { data, error } = await supabase
      .from('barcos')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Error de conexión:', error)
      return { success: false, error }
    }

    console.log('✅ Conexión exitosa a Supabase')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error inesperado:', error)
    return { success: false, error }
  }
}