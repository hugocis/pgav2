import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener un documento de justificación específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del documento de justificación es obligatorio' },
        { status: 400 }
      );
    }

    const documento = await prisma.documentacionJustificacion.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        solicitudJustificacion: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname1: true,
                surname2: true,
                email: true
              }
            },
            asistenciaAlumno: {
              include: {
                sesionClase: true,
                estadoAsistencia: true
              }
            },
            estadoJustificacion: true
          }
        }
      }
    });

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento de justificación no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(documento, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el documento de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener el documento de justificación' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un documento de justificación específico por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { url, fechaSubida, solicitudJustificacionId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del documento de justificación es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!url || !fechaSubida || !solicitudJustificacionId) {
      return NextResponse.json(
        { error: 'URL, fechaSubida y solicitudJustificacionId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si el documento existe
    const documentoExistente = await prisma.documentacionJustificacion.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!documentoExistente) {
      return NextResponse.json(
        { error: 'Documento de justificación no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si la solicitud de justificación existe
    const solicitudExistente = await prisma.solicitudJustificacion.findUnique({
      where: { id: parseInt(solicitudJustificacionId, 10) }
    });

    if (!solicitudExistente) {
      return NextResponse.json(
        { error: 'La solicitud de justificación especificada no existe' },
        { status: 400 }
      );
    }

    // Actualizar el documento de justificación
    const documentoActualizado = await prisma.documentacionJustificacion.update({
      where: { id: parseInt(id, 10) },
      data: {
        url,
        fechaSubida: new Date(fechaSubida),
        solicitudJustificacionId: parseInt(solicitudJustificacionId, 10)
      }
    });

    return NextResponse.json(documentoActualizado, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el documento de justificación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el documento de justificación' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un documento de justificación específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del documento de justificación es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el documento existe
    const documentoExistente = await prisma.documentacionJustificacion.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!documentoExistente) {
      return NextResponse.json(
        { error: 'Documento de justificación no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el documento de justificación
    await prisma.documentacionJustificacion.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json({ message: 'Documento de justificación eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el documento de justificación:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el documento de justificación' },
      { status: 500 }
    );
  }
}
