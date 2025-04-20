// Utilidad para registrar actividades en la base de datos
import { Session } from 'next-auth';
import prisma from './prisma';

type LogActivity = {
  action: string;
  details?: string;
  entityType: string;
  entityId?: string;
  userId: string;
};

/**
 * Registra una actividad en el sistema
 * @param data Datos de la actividad a registrar
 */
export async function logActivity(data: LogActivity) {
  try {
    await prisma.activityLog.create({
      data: {
        action: data.action,
        details: data.details || null,
        entityType: data.entityType,
        entityId: data.entityId || null,
        userId: data.userId,
      },
    });
    return true;
  } catch (error) {
    console.error('Error al registrar actividad:', error);
    return false;
  }
}

/**
 * Extrae el ID de usuario de la sesión
 * @param session Sesión de NextAuth
 * @returns ID del usuario o undefined si no hay sesión
 */
export function getUserIdFromSession(session: Session | null): string | undefined {
  return session?.user?.id;
}
