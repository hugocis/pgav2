import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener todas las configuraciones de carreras
export async function GET() {
  try {
    const configuraciones = await prisma.configuracionCarrera.findMany({
      include: {
        carrera: true,
      },
    });

    return NextResponse.json(configuraciones, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las configuraciones de carreras:', error);
    return NextResponse.json(
      { error: 'Error al obtener las configuraciones de carreras' },
      { status: 500 }
    );
  }
}
