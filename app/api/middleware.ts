import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Middleware para registrar actividad en la API
 * Se ejecutará solo en las rutas de API
 */
export async function middleware(request: NextRequest) {
  // Solo procedemos si es una ruta de API y no es una ruta de autenticación
  if (!request.nextUrl.pathname.startsWith('/api') || 
      request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Intentamos obtener el ID del usuario desde el token JWT en la cookie
  const userId = request.cookies.get('next-auth.session-token')?.value || 
                request.cookies.get('__Secure-next-auth.session-token')?.value || 
                'sistema';

  // Determinamos la acción basada en el método HTTP
  let action = '';
  switch (request.method) {
    case 'GET':
      action = 'read';
      break;
    case 'POST':
      action = 'create';
      break;
    case 'PUT':
    case 'PATCH':
      action = 'update';
      break;
    case 'DELETE':
      action = 'delete';
      break;
    default:
      action = 'access';
  }

  // Extraemos la ruta para determinar el tipo de entidad
  const pathname = request.nextUrl.pathname;
  const pathParts = pathname.split('/').filter(part => part && part !== 'api');
  
  // Determinamos el tipo de entidad y posible ID
  let entityType = pathParts[1] || 'unknown';
  let entityId = pathParts.length > 2 ? pathParts[2] : undefined;

  // Limpiamos la entidad si tiene paréntesis de grupo de ruta
  entityType = entityType.replace(/[\(\)]/g, '');

  try {
    // Registramos la actividad de forma asíncrona para no bloquear la respuesta
    prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId: typeof userId === 'string' ? userId : 'sistema',
        details: `${action.toUpperCase()} en ${pathname}`,
        timestamp: new Date(),
      },
    }).catch(error => {
      console.error('Error al registrar actividad en middleware:', error);
    });
  } catch (error) {
    console.error('Error en middleware de registro de actividad:', error);
  }

  // Continuamos con la solicitud sin bloquear
  return NextResponse.next();
}
