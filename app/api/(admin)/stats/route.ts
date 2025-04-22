import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener estadísticas para el dashboard de administración
export async function GET() {
  try {
    // Consultar el total de usuarios
    const totalUsers = await prisma.user.count();    // Consultar el total de docencias
    const totalDocencias = await prisma.docencia.count();

    // Consultar el total de matrículas
    const totalMatriculas = await prisma.matricula.count();

    // Obtener los usuarios más recientes
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Mapear los usuarios más recientes para darles el formato esperado
    const formattedRecentUsers = recentUsers.map(user => ({
      id: user.id,
      name: user.name || '',
      email: user.email,
      username: user.username,
      roles: user.userRoles.map(ur => ur.role.name),
      createdAt: user.createdAt.toISOString(),
    }));    
    
    // Obtener estadísticas de distribución de roles
    const roleStats = await prisma.role.findMany({
      include: {
        userRoles: true,
      },
    });

    const usersByRole = roleStats.map(role => ({
      role: role.name,
      count: role.userRoles.length,
    }));
    
    // Obtener distribución de docencias por asignatura
    const subjectStats = await prisma.docencia.findMany({
      take: 20, // Limitamos a 20 docencias
      orderBy: { 
        createdAt: 'desc' 
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
          }
        },
        asignatura: {
          include: {
            Matricula: true,
          }
        }
      },
    });

    const subjectDistribution = subjectStats.map(docencia => ({
      name: docencia.asignatura?.Denominacion || 'Sin nombre',
      students: docencia.asignatura?.Matricula.length || 0,
      teachers: 1, // Cada docencia representa un profesor
    }));

    // Obtener logs de actividad reciente de la tabla ActivityLog
    const activityLogs = await prisma.activityLog.findMany({
      take: 10,
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        user: true,
      },
    });

    // Mapear los logs de actividad para el formato esperado por el frontend
    const recentActivity = activityLogs.map(log => ({
      id: String(log.id),
      userId: log.userId,
      userName: `${log.user.name || ''} ${log.user.surname1 || ''}`.trim(),
      action: log.action,
      target: log.entityType,
      createdAt: log.timestamp.toISOString(),
    }));    // Estructura completa de respuesta
    const stats = {
      totalUsers,
      totalSubjects: totalDocencias, // Usar docencias en lugar de asignaturas
      totalTeachers: totalMatriculas, // Usar matrículas en lugar de profesores
      recentUsers: formattedRecentUsers,
      recentActivity,
      usersByRole,
      subjectDistribution,
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas para el dashboard' },
      { status: 500 }
    );
  }
}
