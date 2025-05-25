import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { de } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
            denominacion: true
          }
        }
      }
    });
    
    const carreraIds = managerCarreras.map(mc => mc.carreraId);

    
    // Si no tiene carreras asignadas, devolver datos vacíos
    if (carreraIds.length === 0) {
      return NextResponse.json({
        academicYears: [],
        departments: [],
        courses: ['Todos', '1º', '2º', '3º', '4º'],
        semesters: ['Todos', '1er Semestre', '2do Semestre', 'Anual'],
        attendanceData: [],
        departmentStats: [],
        averageAttendanceRate: 0
      });
    }
    
    // Obtener parámetros de filtrado
    const searchParams = req.nextUrl.searchParams;
    const academicYear = searchParams.get('academicYear') || undefined;
    const department = searchParams.get('department') || undefined;
    const subjectCode = searchParams.get('subjectCode') || undefined;
    const course = searchParams.get('course') || undefined;
    const semester = searchParams.get('semester') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const dateFromStr = searchParams.get('dateFrom') || undefined;
    const dateToStr = searchParams.get('dateTo') || undefined;
    const minAttendanceRate = searchParams.get('minAttendanceRate') ? 
      parseFloat(searchParams.get('minAttendanceRate')!) : 0;
    const maxAttendanceRate = searchParams.get('maxAttendanceRate') ? 
      parseFloat(searchParams.get('maxAttendanceRate')!) : 100;

    // Convertir fechas si están presentes
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;    // Obtener todos los cursos académicos
    const academicYears = await prisma.cursoAcademico.findMany({
      orderBy: { denominacion: 'desc' }
    });
    
    console.log("Cursos académicos disponibles:", academicYears.length);

    // Obtener solo las carreras asignadas al manager
    const departments = await prisma.carrera.findMany({
      where: {
        id: {
          in: carreraIds
        }
      },
      orderBy: { denominacion: 'asc' }
    });
    
    console.log("Departamentos disponibles:", departments.map(d => d.denominacion));

    // Buscar el ID de la carrera si se proporciona por nombre
    let departmentCarreraId: string | undefined = undefined;
    if (department && department !== 'Todos') {
      const carrera = departments.find(d => d.denominacion === department);      if (carrera) {
        departmentCarreraId = carrera.id;
      }
    }

    // Encontrar el curso académico si se proporciona por nombre
    let acadYearId: string | undefined = undefined;    if (academicYear && academicYear !== 'Todos') {
      const curso = academicYears.find(y => y.denominacion === academicYear);      if (curso) {
        acadYearId = curso.id;
      }
    }
    
    // Obtener todas las asignaturasde las carreras asignadas al manager y que tienen sesiones
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
        // Filtrar por carreras asignadas al manager
        carreraId: {
          in: carreraIds
        },
        // Filtrar solo asignaturas que tienen al menos una sesión
        Grupo: {
          some: {
            SesionClase: {
              some: {}
            }
          }
        },        ...(departmentCarreraId ? { carreraId: departmentCarreraId } : {}),
        ...(course && course !== 'Todos' ? { Curso: course } : {}),
        ...(semester && semester !== 'Todos' ? { Cuatrimestre: semester } : {}),
        ...(acadYearId ? { cursoAcademicoId: acadYearId } : {}),
        ...(subjectCode && subjectCode !== 'Todos' ? { 
          OR: [
            { CodAsignatura: { contains: subjectCode } },
            { Denominacion: { contains: subjectCode } }
          ]
        } : {})
      },
      orderBy: { Denominacion: 'asc' }
    });
      if (subjects.length === 0) {
      return NextResponse.json({
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
        subjects: [],
        attendanceData: [],
        departmentStats: [],
        averageAttendanceRate: 0
      });
    }

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
          }          // Contar asistencias presentes
          for (const asistencia of sesion.AsistenciaAlumno) {
            if (asistencia.estado === 'Presente' || asistencia.estado === 'P' || asistencia.estado === 'Asiste') {
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
    const filteredAttendanceData = attendanceData.filter(data => 
      data.attendanceRate >= minAttendanceRate && data.attendanceRate <= maxAttendanceRate
    );
      // Calcular estadísticas por carrera para el gráfico
    const departmentStats = await Promise.all(departments.map(async (dept) => {
      // Obtener las asignaturas de esta carrera que tienen docencia asignada
      const asignaturasConDocencia = await prisma.asignatura.findMany({
        where: {
          carreraId: dept.id,
          Docencia: {
            some: {}  // Solo asignaturas con docencia asignada
          },
          Grupo: {
            some: {
              SesionClase: {
                some: {}  // Solo asignaturas con sesiones
              }
            }
          }
        },
        select: {
          id: true
        }
      });
        const asignaturaIds = asignaturasConDocencia.map(asig => asig.id);
      
      if (asignaturaIds.length === 0) {
        // Si no hay asignaturas con docencia y sesiones en esta carrera, devolver 0%
        return {
          id: dept.id,
          name: dept.denominacion,
          value: 0
        };
      }
      
      // Obtener todas las asistencias de asignaturas de esta carrera
      const asistencias = await prisma.asistenciaAlumno.findMany({
        where: {
          sesionClase: {
            grupo: {
              asignatura: {
                id: {
                  in: asignaturaIds
                }
              }
            }
          }
        },
        select: {
          estado: true
        }
      });
      
      const totalAsistencias = asistencias.length;
      const asistenciasPresentes = asistencias.filter(a => 
        a.estado === 'Presente' || a.estado === 'P' || a.estado === 'Asiste'
      ).length;
      
      const rate = totalAsistencias > 0
        ? Number(((asistenciasPresentes / totalAsistencias) * 100).toFixed(1))
        : 0;
      
      return {
        id: dept.id,
        name: dept.denominacion,
        value: rate
      };
    }));

    // Si no hay estadísticas de departamentos disponibles, asegurar un array vacío
    if (!departmentStats || departmentStats.length === 0) {
      // No department statistics available, create empty array
      const emptyStats = departments.map(dept => ({
        id: dept.id,
        name: dept.denominacion,
        value: 0
      }));
      
      return NextResponse.json({
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
        attendanceData: filteredAttendanceData,
        departmentStats: emptyStats,
        averageAttendanceRate: 0
      });
    }

    // Calcular la media total de asistencia por departamentos
    let totalRateSum = 0;
    let departmentsWithData = 0;
    
    departmentStats.forEach(dept => {
      if (dept.value > 0) {
        totalRateSum += dept.value;
        departmentsWithData++;
      }
    });
    
    const averageAttendanceRate = departmentsWithData > 0
      ? Number((totalRateSum / departmentsWithData).toFixed(1))
      : 0;

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
      attendanceData: filteredAttendanceData,
      departmentStats: departmentStats,
      averageAttendanceRate: averageAttendanceRate
    };

    console.log("Respuesta final:");
    console.log("- Total de años académicos:", response.academicYears.length);
    console.log("- Total de departamentos:", response.departments.length - 1); // -1 para quitar el "Todos"
    console.log("- Total de asignaturas con datos:", response.attendanceData.length);
    console.log("- Total de estadísticas de departamentos:", response.departmentStats.length);
    console.log("- Tasa media de asistencia:", response.averageAttendanceRate);
    
    if (response.departmentStats.length > 0) {
      console.log("- Detalles de estadísticas por departamento:");
      response.departmentStats.forEach(dept => {
        console.log(`  - ${dept.name}: ${dept.value}%`);
      });
    }

    return NextResponse.json(response);  } catch (error) {
    console.error('Error in attendance reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
