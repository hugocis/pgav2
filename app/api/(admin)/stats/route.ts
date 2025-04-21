import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener estadísticas para el dashboard de administración
export async function GET() {
  try {
    // Consultar el total de usuarios
    const totalUsers = await prisma.user.count();

    // Consultar el total de asignaturas
    const totalSubjects = await prisma.asignatura.count();

    // Consultar el total de profesores (usuarios con rol 'Profesor')
    const totalTeachers = await prisma.userRole.count({
      where: {
        role: {
          name: 'Profesor'
        }
      }
    });

    // Obtener los usuarios más recientes
    const recentUsers = await prisma.user.findMany({
      take: 10,
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

    // Obtener distribución de estudiantes por asignatura
    const subjectStats = await prisma.asignatura.findMany({
      include: {
        Matricula: true,
        Docencia: true,
      },
      take: 20, // Limitamos a 20 asignaturas para no sobrecargar la respuesta
      orderBy: {
        createdAt: 'desc'
      }
    });

    const subjectDistribution = subjectStats.map(subject => ({
      name: subject.Denominacion,
      students: subject.Matricula.length,
      teachers: subject.Docencia.length,
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
    }));

    // Estructura completa de respuesta
    const stats = {
      totalUsers,
      totalSubjects,
      totalTeachers,
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
