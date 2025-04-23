import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todas las asignaciones de rol
export async function GET() {
  try {
    const userRoles = await prisma.userRole.findMany({
      include: {
        user: true,
        role: true
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return NextResponse.json(userRoles, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las asignaciones de rol:', error);
    return NextResponse.json(
      { error: 'Error al obtener las asignaciones de rol' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva asignación de rol
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar los campos requeridos
    if (!body.userId || !body.roleId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: userId, roleId' },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: body.userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el rol existe
    const role = await prisma.role.findUnique({
      where: { id: body.roleId }
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si la asignación ya existe
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: body.userId,
        roleId: body.roleId
      }
    });

    if (existingUserRole) {
      return NextResponse.json(
        { error: 'El usuario ya tiene asignado este rol' },
        { status: 409 }
      );
    }

    // Crear la nueva asignación de rol
    const newUserRole = await prisma.userRole.create({
      data: {
        userId: body.userId,
        roleId: body.roleId,
      },
      include: {
        user: true,
        role: true
      }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'userRole',
      entityId: newUserRole.id,
      details: `Asignación del rol "${newUserRole.role.name}" al usuario ${newUserRole.user.email}`
    });


    return NextResponse.json(newUserRole, { status: 201 });
  } catch (error) {
    console.error('Error al crear la asignación de rol:', error);
    return NextResponse.json(
      { error: 'Error al crear la asignación de rol' },
      { status: 500 }
    );
  }
}
