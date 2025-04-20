// Utilidad para registrar actividades en la base de datos
import prisma from './prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Registra una actividad en el sistema
 * @param action Acción realizada (create, read, update, delete)
 * @param entityType Tipo de entidad sobre la que se actúa (user, role, asignatura, etc.)
 * @param userId ID del usuario que realiza la acción
 * @param entityId ID de la entidad (opcional)
 * @param details Detalles adicionales (opcional)
 */
export async function logActivity(
  action: string,
  entityType: string,
  userId: string,
  entityId?: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        details: details || null,
        entityType,
        entityId: entityId || null,
        userId,
        timestamp: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error('Error al registrar actividad:', error);
    return false;
  }
}

/**
 * High Order Function para envolver handlers de API y registrar automáticamente la actividad
 * @param handler El handler original de la API
 * @param entityType El tipo de entidad que maneja este endpoint
 */
export function withActivityLog(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  entityType: string
) {
  return async function(req: NextRequest, context: any) {
    // Determinamos la acción basada en el método HTTP
    const method = req.method;
    let action = '';
    
    switch (method) {
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

    // Intentamos obtener el ID de la entidad desde los parámetros
    const entityId = context?.params?.id;
    
    try {
      // Intentamos obtener el ID del usuario desde el token JWT
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const userId = token?.id || 'sistema';
      
      // Ejecutamos el handler original
      const response = await handler(req, context);
      
      // Registramos la actividad (de forma asíncrona para no bloquear)
      logActivity(
        action,
        entityType,
        userId as string,
        entityId,
        `${action.toUpperCase()} en ${req.nextUrl.pathname}`
      ).catch(err => console.error('Error al registrar actividad:', err));
      
      return response;
    } catch (error) {
      console.error('Error en withActivityLog:', error);
      // En caso de error, aún así intentamos ejecutar el handler original
      return handler(req, context);
    }
  };
}
