import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Este middleware se ejecuta en cada petición a las rutas protegidas
export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    
    // Get token properly using getToken
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userRoles = token?.roles as string[] || [];
    
    // Redirección después del login basada en el rol del usuario
    if (pathname === '/' || pathname === '/login') {
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

    return NextResponse.next();
  },  {
    callbacks: {
      // Only run this middleware on protected routes
      authorized: ({ token }) => !!token,
    },
    pages: {
      // Configure custom login page
      signIn: '/login',
      error: '/login'
    }
  }
);

// Configuración para que middleware se ejecute en rutas específicas
export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/manager/:path*',
    '/pec/:path*',
    '/profesor/:path*',
    '/alumno/:path*',
  ],
};
