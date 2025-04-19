import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener una asignación de rol por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de asignación inválido' },
        { status: 400 }
      );
    }

    const userRole = await prisma.userRole.findUnique({
      where: { id: idNum },
      include: {
        user: true,
        role: true
      }
    });

    if (!userRole) {
      return NextResponse.json(
        { error: 'Asignación de rol no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(userRole, { status: 200 });
  } catch (error) {
    console.error('Error al obtener la asignación de rol:', error);
    return NextResponse.json(
      { error: 'Error al obtener la asignación de rol' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una asignación de rol por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de asignación inválido' },
        { status: 400 }
      );
    }

    // Verificar si la asignación de rol existe
    const existingUserRole = await prisma.userRole.findUnique({
      where: { id: idNum }
    });

    if (!existingUserRole) {
      return NextResponse.json(
        { error: 'Asignación de rol no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la asignación de rol
    await prisma.userRole.delete({
      where: { id: idNum }
    });

    return NextResponse.json(
      { message: 'Asignación de rol eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar la asignación de rol:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la asignación de rol' },
      { status: 500 }
    );
  }
}
