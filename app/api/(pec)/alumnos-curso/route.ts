import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

/**
 * GET: Obtener alumnos que pertenecen a un curso específico (tienen asignaturas en ese curso)
 * Query params:
 * - carreraCursoId: ID de la asignación PecCarreraCurso (obligatorio)
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tenga el rol de PEC o ADMIN
    const userRoles = session.user.roles.map(role => role.toUpperCase());
    if (!userRoles.includes('PEC') && !userRoles.includes('ADMIN')) {
      return NextResponse.json({ 
        error: 'No autorizado', 
        roles: session.user.roles,
        requiredRoles: ['PEC', 'ADMIN']
      }, { status: 403 });
    }

    // Obtener el ID de carrera-curso de los parámetros de la URL
    const url = new URL(req.url);
    const carreraCursoId = url.searchParams.get('carreraCursoId');

    if (!carreraCursoId) {
      return NextResponse.json({ error: 'Se requiere el ID de carrera-curso' }, { status: 400 });
    }

    // Obtener la información del carrera-curso para validar que existe
    const carreraCurso = await prisma.pecCarreraCurso.findUnique({
      where: { id: carreraCursoId },
      include: { carrera: true }
    });

    if (!carreraCurso) {
      return NextResponse.json({ error: 'Carrera-curso no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario PEC esté asignado a este carrera-curso o sea ADMIN
    if (!userRoles.includes('ADMIN') && carreraCurso.pecId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado para esta carrera-curso' }, { status: 403 });
    }

    // Obtener asignaturas de la carrera seleccionada y del curso elegido
    const asignaturas = await prisma.asignatura.findMany({
      where: {
        carreraId: carreraCurso.carreraId,
        Curso: String(carreraCurso.curso)
      }
    });

    // Si no hay asignaturas, retornar una lista vacía
    if (asignaturas.length === 0) {
      return NextResponse.json([]);
    }

    // IDs de las asignaturas encontradas
    const asignaturaIds = asignaturas.map(asig => asig.id);

    // Buscar alumnos matriculados en esas asignaturas
    const matriculas = await prisma.matricula.findMany({
      where: {
        asignaturaId: {
          in: asignaturaIds
        }
      },
      select: {
        alumno_id: true
      },
      distinct: ['alumno_id']
    });

    // IDs de los alumnos matriculados
    const alumnoIds = matriculas.map(m => m.alumno_id);

    // Buscar la información de los alumnos
    const alumnos = await prisma.user.findMany({
      where: {
        id: { in: alumnoIds },
        userRoles: {
          some: {
            role: {
              name: 'Alumno'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        surname1: true,
        surname2: true,
        email: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: [
        { surname1: 'asc' },
        { surname2: 'asc' },
        { name: 'asc' }
      ]
    });

    // Añadir el campo para indicar si el alumno tiene rol GOE
    const alumnosConGOE = alumnos.map(alumno => ({
      ...alumno,
      tieneRolGOE: alumno.userRoles.some(ur => ur.role.name === 'GOE')
    }));

    // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ALUMNOS_CURSO',
      entityId: carreraCursoId,
      details: `El PEC ha consultado la lista de alumnos para ${carreraCurso.carrera.denominacion} - ${carreraCurso.curso}° curso`
    });

    return NextResponse.json(alumnosConGOE);
  } catch (error) {
    console.error('Error al obtener alumnos del curso:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}
