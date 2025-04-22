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

/*
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rutas protegidas por rol
const roleRoutes: Record<string, string[]> = {
  'Alumno': ['/alumno'],
  'Profesor': ['/profesor'],
  'Admin': ['/admin'],
  'Manager': ['/manager'],
  'PEC': ['/pec'],
};

// Rutas públicas
const publicRoutes = ['/login', '/reset-password', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Permitir rutas API excepto las que están en carpetas protegidas
  if (pathname.startsWith('/api') && 
      !pathname.startsWith('/api/(admin)') && 
      !pathname.startsWith('/api/(Alumno)') && 
      !pathname.startsWith('/api/(Manager)') && 
      !pathname.startsWith('/api/(PEC)') && 
      !pathname.startsWith('/api/(Profesor)')) {
    return NextResponse.next();
  }

  // Verificar autenticación
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Si no hay token, redirigir al login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  // Verificar permisos de ruta según rol
  const userRoles = token.roles as string[] || [];
  
  // Si está intentando acceder a una ruta protegida
  let isAllowed = false;
  let appropriateRoute = '/';

  // Comprobar si el usuario tiene permiso para acceder a la ruta actual
  for (const [role, routes] of Object.entries(roleRoutes)) {
    // Si el usuario tiene este rol, guardar la ruta correspondiente
    if (userRoles.includes(role)) {
      appropriateRoute = routes[0] + '/dashboard'; // Usar la primera ruta del rol
      
      // Si la ruta actual comienza con una ruta permitida para este rol
      if (routes.some(route => pathname.startsWith(route))) {
        isAllowed = true;
      }
    }
  }

  // Si el usuario está en la raíz, redirigir a su dashboard según rol
  if (pathname === '/' && appropriateRoute !== '/') {
    return NextResponse.redirect(new URL(appropriateRoute, request.url));
  }

  // Si no tiene permiso para la ruta actual, redirigir a su dashboard
  if (!isAllowed) {
    return NextResponse.redirect(new URL(appropriateRoute || '/login', request.url));
  }

  return NextResponse.next();
}

// Ver: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
 */ 
