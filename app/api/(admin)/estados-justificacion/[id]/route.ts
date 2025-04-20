import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener un estado de justificación específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del estado de justificación es obligatorio' },
        { status: 400 }
      );
    }

    const estadoJustificacion = await prisma.estadoJustificacion.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoJustificacion) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(estadoJustificacion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado de justificación' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un estado de justificación específico por ID
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
        { error: 'El ID del estado de justificación es obligatorio' },
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
    const estadoExistente = await prisma.estadoJustificacion.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el estado de justificación
    const estadoActualizado = await prisma.estadoJustificacion.update({
      where: { id: parseInt(id, 10) },
      data: { denominacion }
    });

    return NextResponse.json(estadoActualizado, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado de justificación' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un estado de justificación específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del estado de justificación es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el estado existe
    const estadoExistente = await prisma.estadoJustificacion.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay solicitudes de justificación asociadas
    const solicitudesAsociadas = await prisma.solicitudJustificacion.findFirst({
      where: { estadoJustificacionId: parseInt(id, 10) }
    });

    if (solicitudesAsociadas) {
      return NextResponse.json(
        { error: 'No se puede eliminar el estado porque hay solicitudes asociadas a él' },
        { status: 400 }
      );
    }

    // Eliminar el estado de justificación
    await prisma.estadoJustificacion.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ message: 'Estado de justificación eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el estado de justificación' },
      { status: 500 }
    );
  }
}
