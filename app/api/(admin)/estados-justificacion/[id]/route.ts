import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// POST - Crear un nuevo estado de justificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { denominacion } = body;

    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es un campo obligatorio' },
        { status: 400 }
      );
    }

    const estadoExistente = await prisma.estadoJustificacion.findFirst({
      where: { denominacion }
    });

    if (estadoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un estado de justificación con esta denominación' },
        { status: 400 }
      );
    }

    const nuevoEstado = await prisma.estadoJustificacion.create({
      data: { denominacion }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'estadoJustificacion',
      entityId: nuevoEstado.id,
      details: `Se creó el estado de justificación: ${denominacion}`
    });

    return NextResponse.json(nuevoEstado, { status: 201 });
  } catch (error) {
    console.error('Error al crear el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al crear el estado de justificación' },
      { status: 500 }
    );
  }
}

// GET - Obtener un estado por ID
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

    const estado = await prisma.estadoJustificacion.findUnique({
      where: { id }
    });

    if (!estado) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(estado, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado de justificación' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un estado por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { denominacion } = body;

    if (!id || !denominacion) {
      return NextResponse.json(
        { error: 'ID y denominación son obligatorios' },
        { status: 400 }
      );
    }

    const estadoExistente = await prisma.estadoJustificacion.findUnique({ where: { id } });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    const actualizado = await prisma.estadoJustificacion.update({
      where: { id },
      data: { denominacion }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'estadoJustificacion',
      entityId: actualizado.id,
      details: `Actualización de estado de justificación`,
      prevValue: estadoExistente
    });

    return NextResponse.json(actualizado, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado de justificación' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un estado por ID
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

    const estadoExistente = await prisma.estadoJustificacion.findUnique({ where: { id } });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'Estado de justificación no encontrado' },
        { status: 404 }
      );
    }

    const tieneSolicitudes = await prisma.solicitudJustificacion.findFirst({
      where: { estadoJustificacionId: id }
    });

    if (tieneSolicitudes) {
      return NextResponse.json(
        { error: 'No se puede eliminar el estado porque hay solicitudes asociadas' },
        { status: 400 }
      );
    }

    await prisma.estadoJustificacion.delete({ where: { id } });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'estadoJustificacion',
      entityId: id,
      details: `Eliminación del estado de justificación: ${estadoExistente.denominacion}`,
      prevValue: estadoExistente
    });

    return NextResponse.json(
      { message: 'Estado de justificación eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el estado de justificación' },
      { status: 500 }
    );
  }
}
