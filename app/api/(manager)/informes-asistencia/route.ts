import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener parámetros de filtrado
    const searchParams = req.nextUrl.searchParams;
    const academicYearId = searchParams.get('academicYear') || undefined;
    const departmentId = searchParams.get('department') || undefined;
    const subjectCode = searchParams.get('subjectCode') || undefined;
    const course = searchParams.get('course') || undefined;
    const semester = searchParams.get('semester') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const dateFromStr = searchParams.get('dateFrom') || undefined;
    const dateToStr = searchParams.get('dateTo') || undefined;

    // Convertir fechas si están presentes
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    // Obtener todos los cursos académicos
    const academicYears = await prisma.cursoAcademico.findMany({
      orderBy: { denominacion: 'desc' }
    });

    // Obtener todas las carreras (departamentos)
    const departments = await prisma.carrera.findMany({
      orderBy: { denominacion: 'asc' }
    });

    // Obtener todas las asignaturas
    const subjects = await prisma.asignatura.findMany({
      select: {
        id: true,
        CodAsignatura: true,
        Denominacion: true,
        Curso: true,
        Cuatrimestre: true,
        carrera: {
          select: {
            id: true,
            denominacion: true
          }
        }
      },
      where: {
        ...(departmentId && departmentId !== 'Todos' ? { carreraId: departmentId } : {}),
        ...(course && course !== 'Todos' ? { Curso: course } : {}),
        ...(semester && semester !== 'Todos' ? { Cuatrimestre: semester } : {}),
        ...(academicYearId && academicYearId !== 'Todos' ? { cursoAcademicoId: academicYearId } : {})
      },
      orderBy: { Denominacion: 'asc' }
    });

    // Obtener estadísticas de asistencia para cada asignatura
    const attendanceData = await Promise.all(subjects.map(async (subject) => {
      // Obtener grupos de la asignatura
      const grupos = await prisma.grupo.findMany({
        where: { asignaturaId: subject.id }
      });

      let totalStudents = 0;
      let totalSessions = 0;
      let totalPresent = 0;
      let lastUpdateDate = new Date(0); // Fecha más antigua posible

      // Para cada grupo, obtener sesiones y estadísticas
      for (const grupo of grupos) {
        // Contar alumnos en el grupo
        const alumnosCount = await prisma.alumnoGrupo.count({
          where: { grupoId: grupo.id }
        });
        totalStudents += alumnosCount;

        // Obtener sesiones de clase con filtro de fechas si aplica
        const sesiones = await prisma.sesionClase.findMany({
          where: {
            grupoId: grupo.id,
            ...(dateFrom ? { fecha: { gte: dateFrom } } : {}),
            ...(dateTo ? { fecha: { lte: dateTo } } : {})
          },
          include: {
            AsistenciaAlumno: {
              where: {
                ...(studentId ? { alumnoId: studentId } : {})
              }
            }
          }
        });

        totalSessions += sesiones.length;

        // Calcular asistencias presentes y la última fecha de actualización
        for (const sesion of sesiones) {
          // Actualizar fecha de última actualización si es más reciente
          if (sesion.updatedAt > lastUpdateDate) {
            lastUpdateDate = sesion.updatedAt;
          }

          // Contar asistencias presentes
          for (const asistencia of sesion.AsistenciaAlumno) {
            if (asistencia.estado === 'Presente' || asistencia.estado === 'P') {
              totalPresent++;
            }
          }
        }
      }

      // Calcular tasa de asistencia
      const totalPossibleAttendances = totalStudents * totalSessions;
      const attendanceRate = totalPossibleAttendances > 0 
        ? Number(((totalPresent / totalPossibleAttendances) * 100).toFixed(1))
        : 0;

      return {
        id: subject.id,
        subject: subject.Denominacion,
        department: subject.carrera.denominacion,
        course: subject.Curso,
        semester: subject.Cuatrimestre,
        attendanceRate,
        totalStudents,
        totalSessions,
        lastUpdateDate: lastUpdateDate.toISOString()
      };
    }));

    // Filtrar por tasa de asistencia si se especifican los parámetros
    const minRate = searchParams.get('minAttendanceRate') ? parseFloat(searchParams.get('minAttendanceRate')!) : 0;
    const maxRate = searchParams.get('maxAttendanceRate') ? parseFloat(searchParams.get('maxAttendanceRate')!) : 100;
    
    const filteredAttendanceData = attendanceData.filter(data => 
      data.attendanceRate >= minRate && data.attendanceRate <= maxRate
    );

    // Preparar la respuesta con toda la información
    const response = {
      academicYears: academicYears.map(year => ({
        id: year.id,
        name: year.denominacion
      })),
      departments: [{id: 'Todos', name: 'Todos'}, ...departments.map(dept => ({
        id: dept.id,
        name: dept.denominacion
      }))],
      courses: ['Todos', '1º', '2º', '3º', '4º'],
      semesters: ['Todos', '1er Semestre', '2do Semestre', 'Anual'],
      attendanceData: filteredAttendanceData
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error en informes-asistencia:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
