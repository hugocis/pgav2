import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los estados de justificación
export async function GET() {
  try {
    const estadosJustificacion = await prisma.estadoJustificacion.findMany({
      orderBy: {
        denominacion: 'asc',
      },
    });

    return NextResponse.json(estadosJustificacion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los estados de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener los estados de justificación' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo estado de justificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { denominacion } = body;

    // Validar datos obligatorios
    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es un campo obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un estado con la misma denominación
    const estadoExistente = await prisma.estadoJustificacion.findFirst({
      where: { denominacion }
    });

    if (estadoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un estado de justificación con esta denominación' },
        { status: 400 }
      );
    }

    // Crear el nuevo estado de justificación
    const nuevoEstadoJustificacion = await prisma.estadoJustificacion.create({
      data: {
        denominacion
      }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'estadoJustificacion',
      entityId: nuevoEstadoJustificacion.id,
      details: `Estado de justificación creado con denominación '${nuevoEstadoJustificacion.denominacion}'`
    });


    return NextResponse.json(nuevoEstadoJustificacion, { status: 201 });
  } catch (error) {
    console.error('Error al crear el estado de justificación:', error);
    return NextResponse.json(
      { error: 'Error al crear el estado de justificación' },
      { status: 500 }
    );
  }
}
