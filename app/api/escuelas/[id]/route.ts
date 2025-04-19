import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener una escuela específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la escuela es obligatorio' },
        { status: 400 }
      );
    }

    const escuela = await prisma.escuela.findUnique({
      where: { id: parseInt(id, 10) },
      include: { Carrera: true }
    });

    if (!escuela) {
      return NextResponse.json(
        { error: 'Escuela no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(escuela, { status: 200 });
  } catch (error) {
    console.error('Error al obtener la escuela:', error);
    return NextResponse.json(
      { error: 'Error al obtener la escuela' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una escuela específica por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { denominacion } = body || {};

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la escuela es obligatorio' },
        { status: 400 }
      );
    }

    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es obligatoria' },
        { status: 400 }
      );
    }

    const escuelaExistente = await prisma.escuela.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!escuelaExistente) {
      return NextResponse.json(
        { error: 'La escuela no existe' },
        { status: 404 }
      );
    }

    const escuelaConMismaDenom = await prisma.escuela.findFirst({
      where: {
        denominacion,
        id: { not: parseInt(id, 10) }
      }
    });

    if (escuelaConMismaDenom) {
      return NextResponse.json(
        { error: 'Ya existe otra escuela con esta denominación' },
        { status: 409 }
      );
    }

    const escuelaActualizada = await prisma.escuela.update({
      where: { id: parseInt(id, 10) },
      data: { denominacion }
    });

    return NextResponse.json(
      {
        message: 'Escuela actualizada correctamente',
        escuela: escuelaActualizada
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar la escuela:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la escuela' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una escuela específica por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la escuela es obligatorio' },
        { status: 400 }
      );
    }

    const escuela = await prisma.escuela.findUnique({
      where: { id: parseInt(id, 10) },
      include: { Carrera: true }
    });

    if (!escuela) {
      return NextResponse.json(
        { error: 'La escuela no existe' },
        { status: 404 }
      );
    }

    if (escuela.Carrera.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la escuela porque tiene carreras asociadas',
          carreras: escuela.Carrera.length
        },
        { status: 400 }
      );
    }

    await prisma.escuela.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json(
      { message: 'Escuela eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar la escuela:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la escuela' },
      { status: 500 }
    );
  }
}
