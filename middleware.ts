import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Este middleware se encarga únicamente de la autenticación y autorización
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Obtener el token y la información del usuario
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userRoles = token?.roles as string[] || [];
  
  // AUTENTICACIÓN Y AUTORIZACIÓN
  // Redirección después del login basada en el rol del usuario
  if ((pathname === '/' || pathname === '/login') && token) {
    // Solo redirigimos si el usuario está autenticado
    if (userRoles.length > 0) {
      // Determinamos la redirección según rol (prioridad si tiene múltiples roles)
      if (userRoles.includes('Admin')) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      } else if (userRoles.includes('Manager')) {
        return NextResponse.redirect(new URL('/manager/dashboard', req.url));
      } else if (userRoles.includes('PEC')) {
        return NextResponse.redirect(new URL('/pec/dashboard', req.url));
      } else if (userRoles.includes('Profesor')) {
        return NextResponse.redirect(new URL('/profesor/dashboard', req.url));
      } else if (userRoles.includes('Alumno')) {
        return NextResponse.redirect(new URL('/alumno/dashboard', req.url));
      }
    }
  }
  
  // Verificación de acceso basado en roles para áreas protegidas
  // Si la ruta está protegida pero no hay token, redirigimos al login
  if (
    (pathname.startsWith('/admin') ||
     pathname.startsWith('/manager') ||
     pathname.startsWith('/pec') ||
     pathname.startsWith('/profesor') ||
     pathname.startsWith('/alumno')) && 
    !token
  ) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Verificamos que el usuario tenga el rol correcto para acceder a cada área
  if (pathname.startsWith('/admin') && !userRoles.includes('Admin')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (pathname.startsWith('/manager') && !userRoles.includes('Manager')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (pathname.startsWith('/pec') && !userRoles.includes('PEC')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (pathname.startsWith('/profesor') && !userRoles.includes('Profesor')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  if (pathname.startsWith('/alumno') && !userRoles.includes('Alumno')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Si no se ha redirigido, continuamos con la solicitud
  return NextResponse.next();
}

// Configurar las rutas a las que se aplica este middleware
export const config = {
  matcher: [
    '/',                // Ruta principal
    '/login',           // Ruta de login
    '/admin/:path*',    // Todas las rutas de admin
    '/manager/:path*',  // Todas las rutas de manager
    '/pec/:path*',      // Todas las rutas de PEC
    '/profesor/:path*', // Todas las rutas de profesor
    '/alumno/:path*',   // Todas las rutas de alumno
    '/api/:path*',      // Todas las rutas de API
  ],
};
