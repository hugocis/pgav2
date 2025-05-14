import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Definición de roles
const ROLE = {
  ADMIN:   'Admin',
  MANAGER: 'Manager',
  PEC:     'PEC',
  PROF:    'Profesor',
  ALUM:    'Alumno',
};

// Permisos por prefijo de API y método HTTP
const apiPermissions: {
  [prefix: string]: {
    GET?:    string[];
    POST?:   string[];
    PUT?:    string[];
    DELETE?: string[];
  }
} = {
  '/api/configuracion-carrera': {
    GET:    [ROLE.ADMIN, ROLE.MANAGER, ROLE.ALUM, ROLE.PROF],
    POST:   [ROLE.ADMIN],
    PUT:    [ROLE.ADMIN],
    DELETE: [ROLE.ADMIN],
  },
  /*'/api/users': {
    GET:    [ROLE.ADMIN, ROLE.MANAGER],
    POST:   [ROLE.ADMIN],
    PUT:    [ROLE.ADMIN],
    DELETE: [ROLE.ADMIN],
  },
  '/api/activity-logs': {
    GET:    [ROLE.ADMIN],
    PUT:    [ROLE.ADMIN],
    DELETE: [ROLE.ADMIN],
  },
  '/api/alumnos-plan': {
    GET:  [ROLE.ADMIN, ROLE.MANAGER, ROLE.PROF, ROLE.ALUM],
    POST: [ROLE.ADMIN, ROLE.MANAGER],
  },
  // Añade aquí el resto de tus endpoints*/
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userRoles = (token?.roles as string[]) || [];

  // 1) Redirección de páginas y dashboards
  if ((pathname === '/' || pathname === '/login') && token) {
    if (userRoles.includes(ROLE.ADMIN)) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    if (userRoles.includes(ROLE.MANAGER)) {
      return NextResponse.redirect(new URL('/manager/dashboard', req.url));
    }
    if (userRoles.includes(ROLE.PEC)) {
      return NextResponse.redirect(new URL('/pec/dashboard', req.url));
    }
    if (userRoles.includes(ROLE.PROF)) {
      return NextResponse.redirect(new URL('/profesor/dashboard', req.url));
    }
    if (userRoles.includes(ROLE.ALUM)) {
      return NextResponse.redirect(new URL('/alumno/dashboard', req.url));
    }
  }

  // 2) Protección de páginas por rol
  const pageAreas: [string, string][] = [
    ['/admin',   ROLE.ADMIN],
    ['/manager', ROLE.MANAGER],
    ['/pec',     ROLE.PEC],
    ['/profesor',ROLE.PROF],
    ['/alumno',  ROLE.ALUM],
  ];
  for (const [prefix, requiredRole] of pageAreas) {
    if (pathname.startsWith(prefix)) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (!userRoles.includes(requiredRole)) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }
  }
  // 3) Protección de API por rol
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    // 3.a) Autenticación
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 3.b) Autorización según apiPermissions
    for (const [prefix, methods] of Object.entries(apiPermissions)) {
      if (pathname.startsWith(prefix)) {
        const allowed = methods[req.method as keyof typeof methods] || [];
        if (!allowed.some(r => userRoles.includes(r))) {
          return NextResponse.json(
            { error: 'Not authorized' },
            { status: 403 }
          );
        }
        break;
      }
    }
  }
  
  // 4) Continuar con la petición
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/', '/login',
    '/admin/:path*',
    '/manager/:path*',
    '/pec/:path*',
    '/profesor/:path*',
    '/alumno/:path*',
    '/api/:path*',
  ],
};
