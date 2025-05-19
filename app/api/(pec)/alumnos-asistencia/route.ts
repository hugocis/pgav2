import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tenga el rol de PEC
    if (!session.user.roles.includes('PEC')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el ID del carrera-curso de la URL
    const carreraCursoId = req.nextUrl.searchParams.get('carreraCursoId');
    
    if (!carreraCursoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de carrera-curso' },
        { status: 400 }
      );
    }

    // Verificar que el PEC tenga acceso a este carrera-curso
    const carreraCurso = await prisma.pecCarreraCurso.findFirst({
      where: {
        id: carreraCursoId,
        pecId: session.user.id,
      },
      include: {
        carrera: true,
      },
    });

    if (!carreraCurso) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta carrera-curso' },
        { status: 403 }
      );
    }    // Obtener los alumnos de esta carrera-curso con sus datos de asistencia
    // Buscar primero los planes de estudio para la carrera y curso
    const alumnosPlanes = await prisma.alumnoPlan.findMany({
      where: {
        plandeEstudios: {
          carreraId: carreraCurso.carreraId,
        },
        // El curso está en la relación con el plan de estudios
      },
      include: {
        user: true,
      },
    });

    const alumnosIds = alumnosPlanes.map(plan => plan.alumno_id);
    
    // Ahora obtener los alumnos completos con sus datos
    const alumnos = await prisma.user.findMany({
      where: {
        id: {
          in: alumnosIds,
        },
      },      select: {
        id: true,
        name: true,
        surname1: true,
        surname2: true,
        email: true,
        AsistenciaAlumno: {
          orderBy: {
            fecha: 'desc',
          },
          take: 30, // Últimos 30 registros de asistencia
          include: {
            estadoAsistencia: true,
            sesionClase: true,
          },
        },
      },
    });    // Procesar los datos para el formato requerido
    const alumnosConAsistencia = alumnos.map((alumno: any) => {      // Calcular el porcentaje de asistencia
      const totalSesiones = alumno.asistencias.length;
      const asistencias = alumno.asistencias.filter((a: any) => 
        a.estadoAsistencia.codigo === 'PRESENTE' || a.estadoAsistencia.codigo === 'JUSTIFICADO'
      ).length;
      
      const asistenciaPorcentaje = totalSesiones > 0 
        ? Math.round((asistencias / totalSesiones) * 100) 
        : 0;
      
      // Determinar el estado basado en el porcentaje
      let estado: 'normal' | 'warning' | 'danger' = 'normal';
      if (asistenciaPorcentaje < 60) {
        estado = 'danger';
      } else if (asistenciaPorcentaje < 80) {
        estado = 'warning';
      }

      // Obtener la fecha de última asistencia
      const ultimaAsistencia = alumno.asistencias[0]?.fecha 
        ? new Date(alumno.asistencias[0].fecha).toISOString().split('T')[0]
        : null;
        // Contar el número de faltas (no asistencias sin justificar)
      const faltas = alumno.asistencias.filter((a: any) => 
        a.estadoAsistencia.codigo === 'AUSENTE' && !a.justificado
      ).length;

      return {
        id: alumno.id,
        name: alumno.name,
        surname1: alumno.surname1,
        surname2: alumno.surname2,
        email: alumno.email,
        goe: alumno.goe,
        asistencia: asistenciaPorcentaje,
        faltas: faltas,
        ultimaAsistencia: ultimaAsistencia,
        estado: estado      };
    });
    
    // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ALUMNOS_ASISTENCIA',
      entityId: carreraCursoId,
      details: `El PEC ha consultado la lista de alumnos con asistencia para ${carreraCurso.carrera.denominacion} - ${carreraCurso.curso}° curso`,
    });

    return NextResponse.json(alumnosConAsistencia);
  } catch (error) {
    console.error('Error al obtener alumnos con asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}
