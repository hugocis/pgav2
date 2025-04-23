import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener un registro de asistencia específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del registro de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    const asistencia = await prisma.asistenciaAlumno.findUnique({
      where: { id: id },
      include: {
        sesionClase: {
          include: {
            grupo: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        estadoAsistencia: true,
        SolicitudJustificacion: {
          include: {
            estadoJustificacion: true,
            DocumentacionJustificacion: true
          }
        }
      }
    });

    if (!asistencia) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(asistencia, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener el registro de asistencia' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un registro de asistencia específico por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fecha, estado, sesionClaseId, alumnoId, estadoAsistenciaId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del registro de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!fecha || !sesionClaseId || !alumnoId || !estadoAsistenciaId) {
      return NextResponse.json(
        { error: 'Fecha, sesionClaseId, alumnoId y estadoAsistenciaId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si el registro de asistencia existe
    const asistenciaExistente = await prisma.asistenciaAlumno.findUnique({
      where: { id: id }
    });

    if (!asistenciaExistente) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si la sesión de clase existe
    const sesionExistente = await prisma.sesionClase.findUnique({
      where: { id: sesionClaseId }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'La sesión de clase especificada no existe' },
        { status: 400 }
      );
    }

    // Verificar si el alumno existe
    const alumnoExistente = await prisma.user.findUnique({
      where: { id: alumnoId }
    });

    if (!alumnoExistente) {
      return NextResponse.json(
        { error: 'El alumno especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar si el estado de asistencia existe
    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: estadoAsistenciaId }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'El estado de asistencia especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar si ya existe otro registro para este alumno en esta sesión (que no sea el actual)
    const otroRegistroExistente = await prisma.asistenciaAlumno.findFirst({
      where: {
        sesionClaseId: sesionClaseId,
        alumnoId,
        NOT: {
          id: id
        }
      }
    });

    if (otroRegistroExistente) {
      return NextResponse.json(
        { error: 'Ya existe otro registro de asistencia para este alumno en esta sesión' },
        { status: 400 }
      );
    }

    // Actualizar el registro de asistencia
    const asistenciaActualizada = await prisma.asistenciaAlumno.update({
      where: { id: id },
      data: {
        fecha: new Date(fecha),
        estado: estado || estadoExistente.denominacion, // Si no se proporciona estado, usar la denominación del estadoAsistencia
        sesionClaseId: sesionClaseId,
        alumnoId,
        estadoAsistenciaId: estadoAsistenciaId
      }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'asistenciaAlumno',
      entityId: asistenciaActualizada.id,
      details: `Actualización de asistencia del alumno ${alumnoExistente.email} en la sesión del ${new Date(fecha).toLocaleDateString()}`,
      prevValue: asistenciaExistente
    });


    return NextResponse.json(asistenciaActualizada, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el registro de asistencia' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un registro de asistencia específico por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID del registro de asistencia es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el registro de asistencia existe
    const asistenciaExistente = await prisma.asistenciaAlumno.findUnique({
      where: { id: id }
    });

    if (!asistenciaExistente) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay solicitudes de justificación asociadas
    const solicitudesAsociadas = await prisma.solicitudJustificacion.findFirst({
      where: { asistenciaAlumnoId: id }
    });

    if (solicitudesAsociadas) {
      // Eliminar todas las solicitudes de justificación asociadas
      await prisma.solicitudJustificacion.deleteMany({
        where: { asistenciaAlumnoId: id }
      });
    }

    // Eliminar el registro de asistencia
    await prisma.asistenciaAlumno.delete({
      where: { id: id }
    });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'asistenciaAlumno',
      entityId: asistenciaExistente.id,
      details: `Eliminación del registro de asistencia del alumno ${asistenciaExistente.alumnoId}`,
      prevValue: asistenciaExistente
    });


    return NextResponse.json({ message: 'Registro de asistencia eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el registro de asistencia' },
      { status: 500 }
    );
  }
}
