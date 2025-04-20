import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener todos los planes de estudio
export async function GET() {
  try {
    const planesEstudio = await prisma.planDeEstudios.findMany({
      include: {
        carrera: {
          include: {
            escuela: true
          }
        },
        AlumnoPlan: true
      },
      orderBy: {
        denominacion: 'asc',
      },
    });

    return NextResponse.json(planesEstudio, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los planes de estudio:', error);
    return NextResponse.json(
      { error: 'Error al obtener los planes de estudio' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo plan de estudios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { denominacion, codPlan, carreraId } = body || {};

    // Validaciones básicas
    if (!denominacion || !codPlan || !carreraId) {
      return NextResponse.json(
        { error: 'La denominación, código del plan y carreraId son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que la carrera existe
    const carreraExistente = await prisma.carrera.findUnique({
      where: { id: parseInt(carreraId, 10) }
    });

    if (!carreraExistente) {
      return NextResponse.json(
        { error: 'La carrera especificada no existe' },
        { status: 404 }
      );
    }

    // Verificar si ya existe un plan con el mismo código dentro de la carrera
    const planExistente = await prisma.planDeEstudios.findFirst({
      where: {
        codPlan,
        carreraId: parseInt(carreraId, 10)
      }
    });

    if (planExistente) {
      return NextResponse.json(
        { error: 'Ya existe un plan de estudios con este código en la misma carrera' },
        { status: 409 }
      );
    }

    // Crear nuevo plan de estudios
    const nuevoPlan = await prisma.planDeEstudios.create({
      data: {
        denominacion,
        codPlan,
        carreraId: parseInt(carreraId, 10)
      }
    });

    return NextResponse.json({
      message: 'Plan de estudios creado correctamente',
      planDeEstudios: nuevoPlan
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear el plan de estudios:', error);
    return NextResponse.json(
      { error: 'Error al crear el plan de estudios' },
      { status: 500 }
    );
  }
}
