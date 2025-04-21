import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

// GET - Obtener un usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener el usuario' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un usuario por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (body.username !== undefined) updateData.username = body.username;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.surname1 !== undefined) updateData.surname1 = body.surname1;
    if (body.surname2 !== undefined) updateData.surname2 = body.surname2;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.lockout !== undefined) updateData.lockout = body.lockout;
    if (body.password !== undefined) {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un usuario por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json(
      { message: 'Usuario eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el usuario' },
      { status: 500 }
    );
  }
}
