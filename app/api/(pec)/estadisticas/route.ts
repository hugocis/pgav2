import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// Umbral de asistencia para considerar que un alumno tiene problemas
const UMBRAL_PROBLEMAS_ASISTENCIA = 80; // Porcentaje mínimo de asistencia requerido

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

    // Obtener el ID del PEC desde la sesión
    const pecId = session.user.id;

    // Obtener las carreras y cursos asignados al PEC
    const carrerasCursos = await prisma.pecCarreraCurso.findMany({
      where: {
        pecId: pecId,
        activo: true,
      },
      include: {
        carrera: true,
      },
    });

    if (carrerasCursos.length === 0) {
      return NextResponse.json({
        totalAlumnos: 0,
        asistenciaMedia: 0,
        alumnosConProblemas: 0,
        alumnosGOE: 0,
      });
    }    // Lista de IDs de carreras y cursos asignados al PEC
    const carreraIds = carrerasCursos.map(cc => cc.carreraId);
    const cursos = carrerasCursos.map(cc => cc.curso);
    
    // Crear un mapa de carrera-curso para filtrado eficiente
    const carreraCursoMap = new Map();
    carrerasCursos.forEach(cc => {
      if (!carreraCursoMap.has(cc.carreraId)) {
        carreraCursoMap.set(cc.carreraId, []);
      }
      carreraCursoMap.get(cc.carreraId).push(cc.curso);
    });

    console.log(`PEC: ${pecId} tiene asignadas ${carrerasCursos.length} combinaciones de carrera-curso`);
    console.log(`Carreras: ${carreraIds.join(', ')}`);
    console.log(`Cursos: ${cursos.join(', ')}`);

    // Obtener el total de alumnos en estas carreras y cursos
    const alumnos = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: "ALUMNO"
            }
          }
        },
        Matricula: {
          some: {
            asignatura: {
              carreraId: {
                in: carreraIds
              },
              // Filtrar por curso numérico (1, 2, 3, 4)
              Curso: {
                in: cursos.map(curso => curso.toString())
              }
            }
          }
        },
        lockout: false
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        Matricula: {
          where: {
            asignatura: {
              carreraId: {
                in: carreraIds
              },
              Curso: {
                in: cursos.map(curso => curso.toString())
              }
            }
          },
          include: {
            asignatura: true,
          }
        },
        AsistenciaAlumno: {
          include: {
            sesionClase: {
              include: {
                grupo: {
                  include: {
                    asignatura: true
                  }
                }
              }
            },
            estadoAsistencia: true
          }
        }
      }
    });

    // Contar el total de alumnos
    const totalAlumnos = alumnos.length;    // Contar alumnos con rol GOE
    const alumnosConRolGOE = alumnos.filter(alumno => 
      alumno.userRoles.some(ur => ur.role.name === 'GOE')
    );
    const alumnosGOE = alumnosConRolGOE.length;
    
    console.log(`Alumnos encontrados: ${totalAlumnos}`);
    console.log(`Alumnos con rol GOE: ${alumnosGOE}`);
    if (alumnosConRolGOE.length > 0) {
      console.log('IDs de alumnos con rol GOE:', alumnosConRolGOE.map(a => a.id));
    }

    // Calcular porcentaje de asistencia por alumno y contar problemas
    let totalPorcentajeAsistencia = 0;
    let alumnosConAsistenciaValida = 0;
    let alumnosConProblemas = 0;    // Filtrar asistencias relevantes para los cursos y carreras del PEC
    for (const alumno of alumnos) {
      // Agrupar asistencias por asignatura
      const asistenciasPorAsignatura = new Map();
      
      // Recorremos las asistencias del alumno
      for (const asistencia of alumno.AsistenciaAlumno) {
        // Si no hay datos de la sesión o del grupo, continuamos
        if (!asistencia.sesionClase || !asistencia.sesionClase.grupo || !asistencia.sesionClase.grupo.asignatura) {
          continue;
        }
        
        const asignatura = asistencia.sesionClase.grupo.asignatura;
        const asignaturaId = asignatura.id;
        const carreraId = asignatura.carreraId;
        const curso = parseInt(asignatura.Curso);
        
        // Verificar si la asignatura pertenece a una carrera-curso que el PEC gestiona
        const cursosDeCarrera = carreraCursoMap.get(carreraId) || [];
        if (!cursosDeCarrera.includes(curso)) {
          continue; // Ignorar si no es una carrera-curso del PEC
        }
        
        if (!asistenciasPorAsignatura.has(asignaturaId)) {
          asistenciasPorAsignatura.set(asignaturaId, { total: 0, asistidas: 0, nombre: asignatura.Denominacion });
        }
        
        const datos = asistenciasPorAsignatura.get(asignaturaId);
        datos.total++;
        
        // Consideramos "Asistencia" como asistencia válida
        if (asistencia.estadoAsistencia && asistencia.estadoAsistencia.denominacion === 'Asistencia') {
          datos.asistidas++;
        }
      }
      
      // Si el alumno tiene asignatura relevantes, imprimir información de depuración
      if (asistenciasPorAsignatura.size > 0 && alumnosGOE > 0) {
        console.log(`Alumno ${alumno.id} (${alumno.name || ''} ${alumno.surname1 || ''}): ${asistenciasPorAsignatura.size} asignaturas relevantes`);
        for (const [asignaturaId, datos] of asistenciasPorAsignatura) {
          console.log(`  - ${datos.nombre}: ${datos.asistidas}/${datos.total} (${Math.round(datos.asistidas / datos.total * 100)}%)`);
        }
      }

      // Calcular porcentaje de asistencia por cada asignatura con sesiones
      let sumaPorcentajes = 0;
      let asignaturasConSesiones = 0;

      for (const [, datos] of asistenciasPorAsignatura) {
        if (datos.total > 0) { // Solo consideramos asignaturas con sesiones
          const porcentaje = (datos.asistidas / datos.total) * 100;
          sumaPorcentajes += porcentaje;
          asignaturasConSesiones++;
          
          // Si el porcentaje de esta asignatura está por debajo del umbral,
          // consideramos que el alumno tiene problemas de asistencia
          if (porcentaje < UMBRAL_PROBLEMAS_ASISTENCIA) {
            alumnosConProblemas++;
            break; // Un alumno solo cuenta una vez, incluso si tiene problemas en varias asignaturas
          }
        }
      }

      // Si el alumno tiene asignaturas con sesiones, calculamos su porcentaje medio
      if (asignaturasConSesiones > 0) {
        const porcentajeMedioAlumno = sumaPorcentajes / asignaturasConSesiones;
        totalPorcentajeAsistencia += porcentajeMedioAlumno;
        alumnosConAsistenciaValida++;
      }
    }    // Calcular la asistencia media global, evitando división por cero
    const asistenciaMedia = alumnosConAsistenciaValida > 0
      ? Math.round(totalPorcentajeAsistencia / alumnosConAsistenciaValida)
      : 0;

    return NextResponse.json({
      totalAlumnos,
      asistenciaMedia,
      alumnosConProblemas,
      alumnosGOE,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del PEC:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}
