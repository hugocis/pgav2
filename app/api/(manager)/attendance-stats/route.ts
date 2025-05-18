import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function GET() {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener las carreras asignadas al manager
    const managerCarreras = await prisma.managerCarrera.findMany({
      where: {
        managerId: session.user.id,
        activo: true
      },
      select: {
        carreraId: true,
        carrera: {
          select: {
            id: true,
            denominacion: true
          }
        }
      }
    });
    
    const carreraIds = managerCarreras.map(mc => mc.carreraId);
    
    if (carreraIds.length === 0) {
      return NextResponse.json({ attendanceByDepartment: [] });
    }

    // Obtener estadísticas de asistencia por carrera
    const attendanceData = [];
    
    // Para cada carrera asignada, calcular su tasa de asistencia
    for (const managerCarrera of managerCarreras) {
      const carrera = managerCarrera.carrera;
      
      // Obtener todas las asistencias relacionadas con esta carrera
      const asistencias = await prisma.asistenciaAlumno.findMany({
        where: {
          sesionClase: {
            grupo: {
              asignatura: {
                carreraId: carrera.id
              }
            }
          }
        },
        select: {
          estado: true
        }
      });
      
      let totalAsistencias = asistencias.length;
      let asistenciasPresentes = asistencias.filter(a => 
        a.estado === 'Presente' || a.estado === 'P'
      ).length;
      
      const rate = totalAsistencias > 0 
        ? Number(((asistenciasPresentes / totalAsistencias) * 100).toFixed(1))
        : 0;
      
      attendanceData.push({
        department: carrera.denominacion,
        rate: rate
      });
    }
    
    return NextResponse.json({ attendanceByDepartment: attendanceData });
  } catch (error) {
    console.error('Error en manager-attendance-stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
