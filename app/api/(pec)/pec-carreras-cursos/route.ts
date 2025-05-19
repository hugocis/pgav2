import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener todas las asignaciones de PECs a carreras y cursos académicos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pecCarreraCursos = await prisma.pecCarreraCurso.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
        carrera: {
          select: {
            id: true,
            denominacion: true,
          },
        },
      },
    });

    return NextResponse.json(pecCarreraCursos);
  } catch (error) {
    console.error('Error al obtener asignaciones de PECs:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Asignar un PEC a una carrera y curso académico
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pecId, carreraId, curso } = body;

    if (!pecId || !carreraId || curso === undefined) {
      return NextResponse.json({ error: 'Se requieren los campos pecId, carreraId y curso' }, { status: 400 });
    }

    // Verificar si el usuario es un PEC
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: pecId,
      },
      include: {
        role: true,
      },
    });

    if (!userRoles.some(ur => ur.role.name === 'PEC')) {
      return NextResponse.json({ error: 'El usuario no tiene el rol de PEC' }, { status: 400 });
    }

    // Verificar si la relación ya existe
    const existingRelation = await prisma.pecCarreraCurso.findFirst({
      where: {
        pecId,
        carreraId,
        curso: Number(curso),
      },
    });

    if (existingRelation) {
      // Si existe pero está inactiva, la activamos de nuevo
      if (!existingRelation.activo) {
        const updatedRelation = await prisma.pecCarreraCurso.update({
          where: { id: existingRelation.id },
          data: {
            activo: true,
            fechaBaja: null,
          },
        });

        await logActivity({
          req: req,
          action: 'update',
          entityType: 'pecCarreraCurso',
          entityId: updatedRelation.id,
          details: `Reactivada la asignación del PEC ${pecId} a la carrera ${carreraId} y curso ${curso}`,
        });

        return NextResponse.json(updatedRelation);
      }
      
      return NextResponse.json({ error: 'El PEC ya está asignado a esta carrera y curso' }, { status: 400 });
    }

    // Crear la nueva relación
    const newPecCarreraCurso = await prisma.pecCarreraCurso.create({
      data: {
        pecId,
        carreraId,
        curso: Number(curso),
      },
    });

    await logActivity({
      req: req,
      action: 'create',
      entityType: 'pecCarreraCurso',
      entityId: newPecCarreraCurso.id,
      details: `Asignado el PEC ${pecId} a la carrera ${carreraId} y curso ${curso}`,
    });

    return NextResponse.json(newPecCarreraCurso, { status: 201 });
  } catch (error) {
    console.error('Error al asignar PEC a carrera y curso académico:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
