import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener una asignación específica de PEC-carrera-curso
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pecCarreraCurso = await prisma.pecCarreraCurso.findUnique({
      where: {
        id: (await params).id,
      },
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

    if (!pecCarreraCurso) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(pecCarreraCurso);
  } catch (error) {
    console.error('Error al obtener asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: Actualizar una asignación de PEC-carrera-curso (desactivar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { activo } = body;

    // Solo permitimos actualizar el estado activo
    const updatedPecCarreraCurso = await prisma.pecCarreraCurso.update({
      where: {
        id: (await params).id,
      },
      data: {
        activo,
        fechaBaja: activo ? null : new Date(),
      },
    });

    await logActivity({
      req,
      action: 'update',
      entityType: 'pecCarreraCurso',
      entityId: updatedPecCarreraCurso.id,
      details: activo 
        ? `Reactivada la asignación del PEC a la carrera y curso académico` 
        : `Desactivada la asignación del PEC a la carrera y curso académico`,
    });

    return NextResponse.json(updatedPecCarreraCurso);
  } catch (error) {
    console.error('Error al actualizar asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar una asignación de PEC-carrera-curso
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Primero verificamos que la asignación existe
    const pecCarreraCurso = await prisma.pecCarreraCurso.findUnique({
      where: {
        id: (await params).id,
      },
    });

    if (!pecCarreraCurso) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Eliminamos la asignación
    await prisma.pecCarreraCurso.delete({
      where: {
        id: (await params).id,
      },
    });

    await logActivity({
      req,
      action: 'delete',
      entityType: 'pecCarreraCurso',
      entityId: (await params).id,
      details: `Eliminada la asignación del PEC ${pecCarreraCurso.pecId} a la carrera ${pecCarreraCurso.carreraId} y curso académico ${pecCarreraCurso.curso}`,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
