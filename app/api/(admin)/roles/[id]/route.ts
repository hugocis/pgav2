import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener un rol por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de rol inválido' },
        { status: 400 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { id: idNum },
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(role, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el rol:', error);
    return NextResponse.json(
      { error: 'Error al obtener el rol' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un rol por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de rol inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verificar si el rol existe
    const existingRole = await prisma.role.findUnique({
      where: { id: idNum }
    });
    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    // Preparar los datos para la actualización
    const updateData: Prisma.RoleUpdateInput = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    const updatedRole = await prisma.role.update({
      where: { id: idNum },
      data: updateData,
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'role',
      entityId: updatedRole.id.toString(),
      details: `Actualización del rol "${updatedRole.name}"`,
      prevValue: existingRole
    });


    return NextResponse.json(updatedRole, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el rol:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el rol' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un rol por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de rol inválido' },
        { status: 400 }
      );
    }

    const existingRole = await prisma.role.findUnique({
      where: { id: idNum }
    });
    if (!existingRole) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }

    await prisma.role.delete({ where: { id: idNum } });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'role',
      entityId: existingRole.id.toString(),
      details: `Eliminación del rol "${existingRole.name}"`,
      prevValue: existingRole
    });


    return NextResponse.json(
      { message: 'Rol eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el rol:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el rol' },
      { status: 500 }
    );
  }
}
