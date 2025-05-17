import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Función para registrar actividades importantes en la aplicación (Create, Update, Delete).
 * Esta función debe ser llamada desde los controladores de API que realizan operaciones importantes.
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  details,
  prevValue = null
}: {
  req: Request | NextApiRequest;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId?: string;
  details?: string;
  prevValue?: unknown;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Si no hay detalles, creamos un mensaje genérico basado en la acción
    if (!details) {
      if (action === 'create') {
        details = `Creación de nuevo ${entityType}${entityId ? ` con ID: ${entityId}` : ''}`;
      } else if (action === 'update') {
        details = `Actualización de ${entityType}${entityId ? ` con ID: ${entityId}` : ''}`;
      } else if (action === 'delete') {
        details = `Eliminación de ${entityType}${entityId ? ` con ID: ${entityId}` : ''}`;
      }
    }

    // Generar hash y firma para la integridad de los datos
    const timestamp = new Date();
    const dataForHash = {
      action,
      entityType,
      entityId: entityId || null,
      timestamp: timestamp.toISOString(),
      details,
      prevValue
    };
    
    // Generar hash y firma
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(dataForHash))
      .digest('hex');
      
    const signature = crypto.createHmac('sha256', process.env.LOG_SECRET || '')
      .update(hash)
      .digest('hex');
      
    // Calcular hash del valor previo si existe
    const prevHash = prevValue ? 
      crypto.createHash('sha256')
        .update(JSON.stringify(prevValue))
        .digest('hex') : 
      '';

    // Definir interfaz para los datos de actividad (sin incluir userId como parte de la interfaz)
    interface ActivityData {
      action: 'create' | 'update' | 'delete';
      entityType: string;
      entityId: string | null;
      details: string;
      timestamp: Date;
      prevHash: string;
      hash: string;
      signature: string;
    }

    // Preparar datos para la actividad
    const activityData: ActivityData = {
      action,
      entityType,
      entityId: entityId || null,
      details: details || '',
      timestamp,
      prevHash,
      hash,
      signature
    };
    
    // Variable para almacenar el ID del usuario
    let userIdForLog: string | null = null;
    
    // Si tenemos un ID de usuario y es válido, lo asociamos con la actividad
    if (userId) {
      try {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        });
        
        if (userExists) {
          userIdForLog = userId;
        } else {
          // Si el usuario no existe (caso raro), buscamos admin como respaldo
          const adminUser = await prisma.user.findFirst({
            where: { username: 'admin@pga.com' },
            select: { id: true }
          });
          
          if (adminUser) {
            userIdForLog = adminUser.id;
            console.log(`Usuario no encontrado. Usando admin como respaldo: ${adminUser.id}`);
          } else {
            throw new Error('No se encontró un usuario válido para el registro');
          }
        }
      } catch (error) {
        console.error('Error al verificar usuario para registro de actividad:', error);
        throw error;
      }
    } else {
      // Si no hay sesión de usuario, intentamos usar un admin como respaldo
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin@pga.com' },
        select: { id: true }
      });
      
      if (!adminUser) {
        throw new Error('No hay usuario autenticado ni admin para registrar actividad');
      }
      
      userIdForLog = adminUser.id;
      console.log(`Sin usuario autenticado. Usando admin como respaldo: ${adminUser.id}`);
    }

    // Guardar el registro de actividad
    const log = await prisma.activityLog.create({
      data: {
        ...activityData,
        userId: userIdForLog
      }
    });

    return log;
  } catch (error) {
    console.error(`Error al registrar actividad (${action} en ${entityType}):`, error);
    // No lanzamos el error para que no interrumpa la operación principal
    return null;
  }
}
