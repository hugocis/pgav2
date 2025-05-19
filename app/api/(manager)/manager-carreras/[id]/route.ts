import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener una asignación específica de manager-carrera
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const managerCarrera = await prisma.managerCarrera.findUnique({
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

    if (!managerCarrera) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(managerCarrera);
  } catch (error) {
    console.error('Error al obtener asignación de manager a carrera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: Actualizar una asignación de manager-carrera (desactivar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { activo } = body;

    // Solo permitimos actualizar el estado activo
    const updatedManagerCarrera = await prisma.managerCarrera.update({
      where: {
        id: (await params).id,
      },
      data: {
        activo,
        fechaBaja: activo ? null : new Date(),
      },
    });

    await logActivity({
      req: req,
      action: 'update',
      entityType: 'managerCarrera',
      entityId: updatedManagerCarrera.id,
      details: activo 
        ? `Reactivada la asignación del manager a la carrera` 
        : `Desactivada la asignación del manager a la carrera`,
    });

    return NextResponse.json(updatedManagerCarrera);
  } catch (error) {
    console.error('Error al actualizar asignación de manager a carrera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE: Eliminar una asignación de manager-carrera
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Primero verificamos que la asignación existe
    const managerCarrera = await prisma.managerCarrera.findUnique({
      where: {
        id: (await params).id,
      },
    });

    if (!managerCarrera) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Eliminamos la asignación
    await prisma.managerCarrera.delete({
      where: {
        id: (await params).id,
      },
    });

    await logActivity({
      req: req,
      action: 'delete',
      entityType: 'managerCarrera',
      entityId: (await params).id,
      details: `Eliminada la asignación del manager ${managerCarrera.managerId} a la carrera ${managerCarrera.carreraId}`,
    });

    return NextResponse.json({ message: 'Asignación eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar asignación de manager a carrera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
