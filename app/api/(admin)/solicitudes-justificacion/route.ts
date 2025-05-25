import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todas las solicitudes de justificación
export async function GET(request: NextRequest) {
  try {
    // Permitir filtrado por alumnoId, estadoJustificacionId y/o asistenciaAlumnoId
    const { searchParams } = new URL(request.url);
    const alumnoId = searchParams.get('alumnoId');
    const estadoJustificacionId = searchParams.get('estadoJustificacionId');
    const asistenciaAlumnoId = searchParams.get('asistenciaAlumnoId');

    // Construir el filtro de búsqueda
    const where: Prisma.SolicitudJustificacionWhereInput = {};

    if (alumnoId) {
      where.alumnoId = alumnoId;
    }

    if (estadoJustificacionId) {
      where.estadoJustificacionId = estadoJustificacionId;
    }

    if (asistenciaAlumnoId) {
      where.asistenciaAlumnoId = asistenciaAlumnoId;
    }

    const solicitudes = await prisma.solicitudJustificacion.findMany({
      where,
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
        estadoJustificacion: true,
        asistenciaAlumno: {
          include: {
            sesionClase: {
              include: {
                grupo: true
              }
            },
            estadoAsistencia: true
          }
        },
        DocumentacionJustificacion: true
      },
      orderBy: {
        fechaAlegacion: 'desc',
      },
    });

    return NextResponse.json(solicitudes, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las solicitudes de justificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener las solicitudes de justificación' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva solicitud de justificación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alegacion, fechaAlegacion, alumnoId, estadoJustificacionId, asistenciaAlumnoId } = body;

    // Validar datos obligatorios
    if (!alegacion || !fechaAlegacion || !alumnoId || !estadoJustificacionId || !asistenciaAlumnoId) {
      return NextResponse.json(
        { error: 'Alegación, fechaAlegacion, alumnoId, estadoJustificacionId y asistenciaAlumnoId son campos obligatorios' },
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

    // Verificar si el estado de justificación existe
    const estadoExistente = await prisma.estadoJustificacion.findUnique({
      where: { id: estadoJustificacionId }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'El estado de justificación especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar si la asistencia existe
    const asistenciaExistente = await prisma.asistenciaAlumno.findUnique({
      where: { id: asistenciaAlumnoId }
    });

    if (!asistenciaExistente) {
      return NextResponse.json(
        { error: 'El registro de asistencia especificado no existe' },
        { status: 400 }
      );
    }    // Verificar si ya existe una solicitud para esta asistencia
    const solicitudExistente = await prisma.solicitudJustificacion.findFirst({
      where: {
        asistenciaAlumnoId: asistenciaAlumnoId,
        alumnoId
      }
    });

    if (solicitudExistente) {
      // Si la solicitud existe pero fue rechazada, actualizarla en lugar de crear una nueva
      if (solicitudExistente.rechazada) {
        const solicitudActualizada = await prisma.solicitudJustificacion.update({
          where: { id: solicitudExistente.id },
          data: {
            alegacion,
            fechaAlegacion: new Date(fechaAlegacion),
            // Establecer el estado de nuevo a pendiente
            estadoJustificacionId,
            // Reiniciar los campos de respuesta y fecha
            respuesta: null,
            fechaRespuesta: null,
            rechazada: false
          }
        });

        await logActivity({
          req: request,
          action: 'update',
          entityType: 'solicitudJustificacion',
          entityId: solicitudActualizada.id,
          details: `Actualización de solicitud de justificación rechazada del alumno ${alumnoExistente.email}`
        });

        return NextResponse.json(solicitudActualizada, { status: 200 });
      } else {
        return NextResponse.json(
          { error: 'Ya existe una solicitud de justificación para esta asistencia' },
          { status: 400 }
        );
      }
    }

    // Crear la nueva solicitud de justificación
    const nuevaSolicitud = await prisma.solicitudJustificacion.create({
      data: {
        alegacion,
        fechaAlegacion: new Date(fechaAlegacion),
        alumnoId,
        estadoJustificacionId: estadoJustificacionId,
        asistenciaAlumnoId: asistenciaAlumnoId
      }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'solicitudJustificacion',
      entityId: nuevaSolicitud.id,
      details: `Creación de solicitud de justificación del alumno ${alumnoExistente.email}`
    });


    return NextResponse.json(nuevaSolicitud, { status: 201 });
  } catch (error) {
    console.error('Error al crear la solicitud de justificación:', error);
    return NextResponse.json(
      { error: 'Error al crear la solicitud de justificación' },
      { status: 500 }
    );
  }
}
