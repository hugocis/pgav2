import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener una configuración de carrera específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la configuración de carrera es obligatorio' },
        { status: 400 }
      );
    }

    const configuracion = await prisma.configuracionCarrera.findUnique({
      where: { id: id },
      include: {
        carrera: true
      }
    });

    if (!configuracion) {
      return NextResponse.json(
        { error: 'Configuración de carrera no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(configuracion, { status: 200 });
  } catch (error) {
    console.error('Error al obtener la configuración de carrera:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración de carrera' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una configuración de carrera específica por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { SolDispensa, SolJustificacion, FechaInicioDispensa, FechaFinDispensa } = body || {};

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la configuración de carrera es obligatorio' },
        { status: 400 }
      );
    }

    // Validar que SolDispensa y SolJustificacion sean booleanos
    if (typeof SolDispensa !== 'boolean' || typeof SolJustificacion !== 'boolean') {
      return NextResponse.json(
        { error: 'Los campos SolDispensa y SolJustificacion deben ser booleanos' },
        { status: 400 }
      );
    }

    // Verificar que la configuración existe
    const configuracionExistente = await prisma.configuracionCarrera.findUnique({
      where: { id: id }
    });

    if (!configuracionExistente) {
      return NextResponse.json(
        { error: 'La configuración de carrera no existe' },
        { status: 404 }
      );
    }

    // Validar fechas si se proporcionan
    if (FechaInicioDispensa && FechaFinDispensa) {
      const fechaInicio = new Date(FechaInicioDispensa);
      const fechaFin = new Date(FechaFinDispensa);

      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        return NextResponse.json(
          { error: 'Los formatos de fecha no son válidos' },
          { status: 400 }
        );
      }

      if (fechaInicio > fechaFin) {
        return NextResponse.json(
          { error: 'La fecha de inicio no puede ser posterior a la fecha de fin' },
          { status: 400 }
        );
      }
    }

    // Actualizar la configuración
    const configuracionActualizada = await prisma.configuracionCarrera.update({
      where: { id: id },
      data: {
        SolDispensa,
        SolJustificacion,
        FechaInicioDispensa: FechaInicioDispensa ? new Date(FechaInicioDispensa) : null,
        FechaFinDispensa: FechaFinDispensa ? new Date(FechaFinDispensa) : null
      }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'configuracionCarrera',
      entityId: id,
      details: `Actualización de configuración: SolDispensa=${SolDispensa}, SolJustificacion=${SolJustificacion}`
    });

    return NextResponse.json(
      {
        message: 'Configuración de carrera actualizada correctamente',
        configuracion: configuracionActualizada
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar la configuración de carrera:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la configuración de carrera' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una configuración de carrera específica por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la configuración de carrera es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que la configuración existe
    const configuracion = await prisma.configuracionCarrera.findUnique({
      where: { id: id },
      include: { carrera: true }
    });

    if (!configuracion) {
      return NextResponse.json(
        { error: 'Configuración de carrera no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la configuración
    await prisma.configuracionCarrera.delete({
      where: { id: id }
    });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'configuracionCarrera',
      entityId: id,
      details: `Configuración de carrera eliminada para la carrera: ${configuracion.carrera?.denominacion ?? 'desconocida'}`
    });

    return NextResponse.json(
      {
        message: 'Configuración de carrera eliminada correctamente',
        id: id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar la configuración de carrera:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la configuración de carrera' },
      { status: 500 }
    );
  }
}
