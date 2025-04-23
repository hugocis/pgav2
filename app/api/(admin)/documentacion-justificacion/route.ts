import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los documentos de justificación
export async function GET(request: NextRequest) {
  try {
    // Permitir filtrado por solicitudJustificacionId
    const { searchParams } = new URL(request.url);
    const solicitudJustificacionId = searchParams.get('solicitudJustificacionId');

    // Construir el filtro de búsqueda
    const where: Prisma.DocumentacionJustificacionWhereInput = {};

    if (solicitudJustificacionId) {
      where.solicitudJustificacionId = solicitudJustificacionId;
    }

    const documentos = await prisma.documentacionJustificacion.findMany({
      where,
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
            asistenciaAlumno: true
          }
        }
      },
      orderBy: {
        fechaSubida: 'desc',
      },
    });

    return NextResponse.json(documentos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los documentos de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener los documentos de justificación' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo documento de justificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, fechaSubida, solicitudJustificacionId } = body;

    // Validar datos obligatorios
    if (!url || !fechaSubida || !solicitudJustificacionId) {
      return NextResponse.json(
        { error: 'URL, fechaSubida y solicitudJustificacionId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si la solicitud de justificación existe
    const solicitudExistente = await prisma.solicitudJustificacion.findUnique({
      where: { id: solicitudJustificacionId }
    });

    if (!solicitudExistente) {
      return NextResponse.json(
        { error: 'La solicitud de justificación especificada no existe' },
        { status: 400 }
      );
    }

    // Crear el nuevo documento de justificación
    const nuevoDocumento = await prisma.documentacionJustificacion.create({
      data: {
        url,
        fechaSubida: new Date(fechaSubida),
        solicitudJustificacionId: solicitudJustificacionId
      }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'documentacionJustificacion',
      entityId: nuevoDocumento.id,
      details: `Documento subido para solicitud ${solicitudJustificacionId}`
    });

    return NextResponse.json(nuevoDocumento, { status: 201 });
  } catch (error) {
    console.error('Error al crear el documento de justificación:', error);
    return NextResponse.json(
      { error: 'Error al crear el documento de justificación' },
      { status: 500 }
    );
  }
}
