import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener todas las asignaciones de managers a carreras
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const managerCarreras = await prisma.managerCarrera.findMany({
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

    return NextResponse.json(managerCarreras);
  } catch (error) {
    console.error('Error al obtener asignaciones de managers a carreras:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST: Asignar un manager a una carrera
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { managerId, carreraId } = body;

    if (!managerId || !carreraId) {
      return NextResponse.json({ error: 'Se requieren los campos managerId y carreraId' }, { status: 400 });
    }

    // Verificar si el usuario es un manager
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: managerId,
      },
      include: {
        role: true,
      },
    });

    if (!userRoles.some(ur => ur.role.name === 'Manager')) {
      return NextResponse.json({ error: 'El usuario no tiene el rol de Manager' }, { status: 400 });
    }

    // Verificar si la relación ya existe
    const existingRelation = await prisma.managerCarrera.findFirst({
      where: {
        managerId,
        carreraId,
      },
    });

    if (existingRelation) {
      // Si existe pero está inactiva, la activamos de nuevo
      if (!existingRelation.activo) {
        const updatedRelation = await prisma.managerCarrera.update({
          where: { id: existingRelation.id },
          data: {
            activo: true,
            fechaBaja: null,
          },
        });

        await logActivity({
          req: req,
          action: 'update',
          entityType: 'managerCarrera',
          entityId: updatedRelation.id,
          details: `Reactivada la asignación del manager ${managerId} a la carrera ${carreraId}`,
        });

        return NextResponse.json(updatedRelation);
      }
      
      return NextResponse.json({ error: 'El manager ya está asignado a esta carrera' }, { status: 400 });
    }

    // Crear la nueva relación
    const newManagerCarrera = await prisma.managerCarrera.create({
      data: {
        managerId,
        carreraId,
      },
    });

    await logActivity({
      req: req,
      action: 'create',
      entityType: 'managerCarrera',
      entityId: newManagerCarrera.id,
      details: `Asignado el manager ${managerId} a la carrera ${carreraId}`,
    });

    return NextResponse.json(newManagerCarrera, { status: 201 });
  } catch (error) {
    console.error('Error al asignar manager a carrera:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
