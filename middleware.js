// middleware.js
import { NextResponse } from 'next/server'

// Rutas que requieren autenticación
const protectedRoutes = ['/admin', '/dashboard', '/barco']
// Rutas públicas
const publicRoutes = ['/', '/compartido']

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  // 1. SIEMPRE permitir archivos estáticos y APIs
  if (
    pathname.includes('/_next') || 
    pathname.includes('/api/') ||
    pathname.includes('.') // archivos con extensión
  ) {
    return NextResponse.next()
  }
  
  // 2. Rutas completamente públicas
  if (pathname === '/' || pathname.startsWith('/compartido/')) {
    return NextResponse.next()
  }
  
  // 3. Verificar si la ruta actual está protegida
  const isProtected = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  if (!isProtected) {
    return NextResponse.next()
  }
  
  // 4. Obtener sesión
  const sessionCookie = request.cookies.get('session')?.value
  
  if (!sessionCookie) {
    const url = new URL('/', request.url)
    return NextResponse.redirect(url)
  }
  
  try {
    const user = JSON.parse(sessionCookie)
    
    if (!user || !user.rol) {
      throw new Error('Invalid session')
    }
    
    // 5. Validar acceso a /admin (solo admin)
    if (pathname.startsWith('/admin/') || pathname === '/admin') {
      if (user.rol !== 'admin') {
        const url = new URL('/', request.url)
        return NextResponse.redirect(url)
      }
    }
    
    // 6. Validar acceso a /barco (admin o pesador)
    if (pathname.startsWith('/barco/')) {
      if (user.rol !== 'admin' && user.rol !== 'pesador') {
        const url = new URL('/', request.url)
        return NextResponse.redirect(url)
      }
    }
    
    // 7. Validar acceso a /dashboard (admin o pesador)
    if (pathname.startsWith('/dashboard/')) {
      if (user.rol !== 'admin' && user.rol !== 'pesador') {
        const url = new URL('/', request.url)
        return NextResponse.redirect(url)
      }
    }
    
    return NextResponse.next()
    
  } catch (e) {
    console.error('Middleware error:', e)
    const url = new URL('/', request.url)
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}