import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

// GET /api/alumnos-asignatura - Obtener alumnos matriculados en una asignatura
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const url = new URL(req.url);
    const asignaturaId = url.searchParams.get('asignaturaId');

    if (!asignaturaId) {
      return NextResponse.json({ error: 'El parámetro asignaturaId es obligatorio' }, { status: 400 });
    }

    // Si es un profesor, verificar que tiene docencia en esta asignatura
    if (session.user.roles.includes('Profesor') && !session.user.roles.includes('Admin')) {
      const profesorId = session.user.id;
      
      const docencia = await prisma.docencia.findFirst({
        where: {
          asignaturaId: asignaturaId,
          profesorId: profesorId
        }
      });

      if (!docencia) {
        return NextResponse.json({ error: 'No tienes permisos para ver los alumnos de esta asignatura' }, { status: 403 });
      }
    }

    // Obtener las matrículas activas en esta asignatura
    const matriculas = await prisma.matricula.findMany({
      where: {
        asignaturaId,
        fechaBaja: null,
        mostrar: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        }
      },
      orderBy: [
        { user: { surname1: 'asc' } },
        { user: { surname2: 'asc' } },
        { user: { name: 'asc' } }
      ]
    });

    // Extraer y devolver solo los datos de los usuarios
    const alumnos = matriculas.map(matricula => matricula.user);
    
    return NextResponse.json(alumnos);
  } catch (error) {
    console.error('Error al obtener alumnos de la asignatura:', error);
    return NextResponse.json({ error: 'Error al obtener los alumnos de la asignatura' }, { status: 500 });
  }
}
