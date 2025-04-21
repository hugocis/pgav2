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
