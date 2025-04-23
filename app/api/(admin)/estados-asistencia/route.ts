import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los estados de asistencia
export async function GET() {
  try {
    const estadosAsistencia = await prisma.estadoAsistencia.findMany({
      orderBy: {
        denominacion: 'asc',
      },
    });

    return NextResponse.json(estadosAsistencia, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los estados de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener los estados de asistencia' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo estado de asistencia
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

    const estadoExistente = await prisma.estadoAsistencia.findFirst({
      where: { denominacion }
    });

    if (estadoExistente) {
      return NextResponse.json(
        { error: 'Ya existe un estado de asistencia con esta denominación' },
        { status: 400 }
      );
    }

    const nuevoEstado = await prisma.estadoAsistencia.create({
      data: { denominacion }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'estadoAsistencia',
      entityId: nuevoEstado.id,
      details: `Se creó el estado de asistencia: ${denominacion}`
    });

    return NextResponse.json(nuevoEstado, { status: 201 });
  } catch (error) {
    console.error('Error al crear el estado de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al crear el estado de asistencia' },
      { status: 500 }
    );
  }
}
