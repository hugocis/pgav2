import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener una carrera específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la carrera es obligatorio' },
        { status: 400 }
      );
    }

    const carrera = await prisma.carrera.findUnique({
      where: { id: id },
      include: {
        escuela: true,
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      }
    });

    if (!carrera) {
      return NextResponse.json(
        { error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(carrera, { status: 200 });
  } catch (error) {
    console.error('Error al obtener la carrera:', error);
    return NextResponse.json(
      { error: 'Error al obtener la carrera' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una carrera específica por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { denominacion, escuelaId, planesDeEstudio } = body || {};

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la carrera es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!denominacion || !escuelaId) {
      return NextResponse.json(
        { error: 'Denominación y escuelaId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que la carrera existe
    const carreraExistente = await prisma.carrera.findUnique({
      where: { id: id },
      include: {
        PlanDeEstudios: true
      }
    });

    if (!carreraExistente) {
      return NextResponse.json(
        { error: 'La carrera no existe' },
        { status: 404 }
      );
    }

    // Verificar que la escuela existe
    const escuelaExistente = await prisma.escuela.findUnique({
      where: { id: escuelaId }
    });

    if (!escuelaExistente) {
      return NextResponse.json(
        { error: 'La escuela especificada no existe' },
        { status: 404 }
      );
    }

    // Verificar si existe otra carrera con el mismo nombre en la misma escuela
    const otraCarreraMismoDenom = await prisma.carrera.findFirst({
      where: {
        denominacion,
        escuelaId: escuelaId,
        id: { not: id }
      }
    });

    if (otraCarreraMismoDenom) {
      return NextResponse.json(
        { error: 'Ya existe otra carrera con esta denominación en la misma escuela' },
        { status: 409 }
      );
    }

    // Actualizar la carrera
    await prisma.carrera.update({
      where: { id: id },
      data: {
        denominacion,
        escuelaId: escuelaId
      }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'carrera',
      entityId: id,
      details: `Actualización de carrera '${denominacion}' con nueva escuela ID: '${escuelaId}'`,
      prevValue: {
        denominacion: carreraExistente.denominacion,
        escuelaId: carreraExistente.escuelaId
      }
    });

    // Si se proporcionan planes de estudio, actualizar o crear según corresponda
    if (planesDeEstudio && Array.isArray(planesDeEstudio)) {
      // Obtener los IDs de los planes existentes
      const planesExistentesIds = carreraExistente.PlanDeEstudios.map(plan => plan.id);

      // Identificar planes a crear, actualizar o eliminar
      const planesActualizados: string[] = [];

      for (const plan of planesDeEstudio) {
        if (plan.id) {
          // Si el plan tiene ID, es una actualización
          await prisma.planDeEstudios.update({
            where: { id: plan.id },
            data: {
              denominacion: plan.denominacion,
              codPlan: plan.codPlan
            }
          });
          await logActivity({
            req: request,
            action: 'update',
            entityType: 'planDeEstudios',
            entityId: plan.id,
            details: `Actualización del plan '${plan.codPlan}' para carrera '${denominacion}'`
          });

          planesActualizados.push(plan.id);
        } else if (plan.denominacion && plan.codPlan) {
          // Si el plan no tiene ID pero tiene denominación y código, es una creación
          const nuevoPlan = await prisma.planDeEstudios.create({
            data: {
              denominacion: plan.denominacion,
              codPlan: plan.codPlan,
              carreraId: id
            }
          });

          await logActivity({
            req: request,
            action: 'create',
            entityType: 'planDeEstudios',
            entityId: nuevoPlan.id,
            details: `Creación de nuevo plan '${plan.codPlan}' para carrera '${denominacion}'`
          });
        }
      }

      // Eliminar planes que no se incluyeron en la actualización (opcional)
      const planesAEliminar = planesExistentesIds.filter(
        planId => !planesActualizados.includes(planId)
      );

      if (planesAEliminar.length > 0) {
        await prisma.planDeEstudios.deleteMany({
          where: {
            id: {
              in: planesAEliminar
            }
          }
        });

        await logActivity({
          req: request,
          action: 'delete',
          entityType: 'planDeEstudios',
          details: `Eliminación de planes de estudio: ${planesAEliminar.join(', ')} para carrera '${denominacion}'`
        });
      }
    }

    // Obtener la carrera actualizada con sus planes de estudio
    const carreraCompleta = await prisma.carrera.findUnique({
      where: { id: id },
      include: {
        escuela: true,
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      }
    });

    return NextResponse.json(
      {
        message: 'Carrera actualizada correctamente',
        carrera: carreraCompleta
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar la carrera:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la carrera' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una carrera específica por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la carrera es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que la carrera existe
    const carrera = await prisma.carrera.findUnique({
      where: { id: id },
      include: {
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      }
    });

    if (!carrera) {
      return NextResponse.json(
        { error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la carrera (Cascade eliminará también su configuración y planes de estudio)
    await prisma.carrera.delete({
      where: { id: id }
    });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'carrera',
      entityId: id,
      details: `Eliminación de carrera '${carrera?.denominacion}' y relaciones asociadas (configuración, planes)`
    });


    return NextResponse.json(
      {
        message: 'Carrera eliminada correctamente',
        id: id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar la carrera:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la carrera' },
      { status: 500 }
    );
  }
}
