import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

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
      where: { id: id }
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

    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es un campo obligatorio' },
        { status: 400 }
      );
    }

    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: id }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de asistencia no encontrado' },
        { status: 404 }
      );
    }

    const estadoActualizado = await prisma.estadoAsistencia.update({
      where: { id: id },
      data: { denominacion }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'estadoAsistencia',
      entityId: id,
      prevValue: estadoExistente,
      details: `Actualización del estado de asistencia: ${estadoExistente.denominacion} → ${denominacion}`
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

    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: id }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de asistencia no encontrado' },
        { status: 404 }
      );
    }

    const asistenciasAsociadas = await prisma.asistenciaAlumno.findFirst({
      where: { estadoAsistenciaId: id }
    });

    if (asistenciasAsociadas) {
      return NextResponse.json(
        { error: 'No se puede eliminar el estado porque hay registros de asistencia asociados a él' },
        { status: 400 }
      );
    }

    await prisma.estadoAsistencia.delete({
      where: { id: id }
    });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'estadoAsistencia',
      entityId: id,
      prevValue: estadoExistente,
      details: `Eliminación del estado de asistencia: ${estadoExistente.denominacion}`
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
