import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Usamos SERVICE_ROLE_KEY aquí porque es server-side (nunca llega al browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuario y contraseña requeridos' },
        { status: 400 }
      )
    }

    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, nombre, username, password, rol, activo')
      .eq('username', username)
      .eq('activo', true)

    if (error) {
      console.error('❌ Error en consulta:', error)
      return NextResponse.json(
        { success: false, error: 'Error de base de datos' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const user = users[0]
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Nunca devolver el hash de password al cliente
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        rol: user.rol,
      }
    })

  } catch (error) {
    console.error('🔥 Error en login API:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}