import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener un plan de estudios específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del plan de estudios es obligatorio' },
        { status: 400 }
      );
    }

    const planEstudio = await prisma.planDeEstudios.findUnique({
      where: { id: parseInt(id, 10) },
      include: { 
        carrera: {
          include: {
            escuela: true
          }
        },
        AlumnoPlan: true
      }
    });

    if (!planEstudio) {
      return NextResponse.json(
        { error: 'Plan de estudios no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(planEstudio, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el plan de estudios:', error);
    return NextResponse.json(
      { error: 'Error al obtener el plan de estudios' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un plan de estudios específico por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { denominacion, codPlan, carreraId } = body || {};

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del plan de estudios es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!denominacion || !codPlan || !carreraId) {
      return NextResponse.json(
        { error: 'La denominación, código del plan y carreraId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el plan existe
    const planExistente = await prisma.planDeEstudios.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!planExistente) {
      return NextResponse.json(
        { error: 'El plan de estudios no existe' },
        { status: 404 }
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

    // Verificar si existe otro plan con el mismo código en la misma carrera
    const otroPlanMismoCodigo = await prisma.planDeEstudios.findFirst({
      where: {
        codPlan,
        carreraId: parseInt(carreraId, 10),
        id: { not: parseInt(id, 10) }
      }
    });

    if (otroPlanMismoCodigo) {
      return NextResponse.json(
        { error: 'Ya existe otro plan de estudios con este código en la misma carrera' },
        { status: 409 }
      );
    }

    // Actualizar el plan de estudios
    const planActualizado = await prisma.planDeEstudios.update({
      where: { id: parseInt(id, 10) },
      data: { 
        denominacion,
        codPlan,
        carreraId: parseInt(carreraId, 10)
      }
    });

    return NextResponse.json(
      {
        message: 'Plan de estudios actualizado correctamente',
        planDeEstudios: planActualizado
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar el plan de estudios:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el plan de estudios' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un plan de estudios específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del plan de estudios es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que el plan existe
    const planEstudio = await prisma.planDeEstudios.findUnique({
      where: { id: parseInt(id, 10) },
      include: { 
        AlumnoPlan: true
      }
    });

    if (!planEstudio) {
      return NextResponse.json(
        { error: 'Plan de estudios no encontrado' },
        { status: 404 }
      );
    }

    // Comprobar si el plan tiene alumnos asociados
    if (planEstudio.AlumnoPlan.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar el plan de estudios porque tiene alumnos asociados',
          alumnosAsociados: planEstudio.AlumnoPlan.length
        },
        { status: 400 }
      );
    }

    // Eliminar el plan de estudios
    await prisma.planDeEstudios.delete({
      where: { id: parseInt(id, 10) }
    });

    return NextResponse.json(
      { 
        message: 'Plan de estudios eliminado correctamente',
        id: parseInt(id, 10)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el plan de estudios:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el plan de estudios' },
      { status: 500 }
    );
  }
}
