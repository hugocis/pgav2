import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener un estado de asistencia específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del estado de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    const estadoAsistencia = await prisma.estadoAsistencia.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoAsistencia) {
      return NextResponse.json(
        { error: 'Estado de asistencia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(estadoAsistencia, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el estado de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado de asistencia' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un estado de asistencia específico por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { denominacion } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del estado de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es un campo obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el estado existe
    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de asistencia no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el estado de asistencia
    const estadoActualizado = await prisma.estadoAsistencia.update({
      where: { id: parseInt(id, 10) },
      data: { denominacion }
    });

    return NextResponse.json(estadoActualizado, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el estado de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado de asistencia' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un estado de asistencia específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del estado de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el estado existe
    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de asistencia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay registros de asistencia asociados
    const asistenciasAsociadas = await prisma.asistenciaAlumno.findFirst({
      where: { estadoAsistenciaId: parseInt(id, 10) }
    });

    if (asistenciasAsociadas) {
      return NextResponse.json(
        { error: 'No se puede eliminar el estado porque hay registros de asistencia asociados a él' },
        { status: 400 }
      );
    }

    // Eliminar el estado de asistencia
    await prisma.estadoAsistencia.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ message: 'Estado de asistencia eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el estado de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el estado de asistencia' },
      { status: 500 }
    );
  }
}
