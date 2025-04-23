import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener una sesión de clase específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la sesión de clase es obligatorio' },
        { status: 400 }
      );
    }

    const sesionClase = await prisma.sesionClase.findUnique({
      where: { id: id },
      include: {
        grupo: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        AsistenciaAlumno: {
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
            estadoAsistencia: true
          }
        }
      }
    });

    if (!sesionClase) {
      return NextResponse.json(
        { error: 'Sesión de clase no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(sesionClase, { status: 200 });
  } catch (error) {
    console.error('Error al obtener la sesión de clase:', error);
    return NextResponse.json(
      { error: 'Error al obtener la sesión de clase' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una sesión de clase específica por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fecha, grupoId, docenteId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la sesión de clase es obligatorio' },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!fecha || !grupoId || !docenteId) {
      return NextResponse.json(
        { error: 'Fecha, grupoId y docenteId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si la sesión existe
    const sesionExistente = await prisma.sesionClase.findUnique({
      where: { id },
      include: {
        grupo: true
      }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'Sesión de clase no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si el grupo existe
    const grupoExistente = await prisma.grupo.findUnique({
      where: { id: grupoId }
    });

    if (!grupoExistente) {
      return NextResponse.json(
        { error: 'El grupo especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar si el docente existe
    const docenteExistente = await prisma.user.findUnique({
      where: { id: docenteId }
    });

    if (!docenteExistente) {
      return NextResponse.json(
        { error: 'El docente especificado no existe' },
        { status: 400 }
      );
    }

    // Actualizar la sesión de clase
    const sesionActualizada = await prisma.sesionClase.update({
      where: { id },
      data: {
        fecha: new Date(fecha),
        grupoId: grupoId,
        docenteId
      }
    });

    await logActivity({
      req: request,
      action: 'update',
      entityType: 'sesionClase',
      entityId: sesionActualizada.id,
      details: `Actualización de sesión de clase para el grupo ${grupoExistente.denominacion} el día ${new Date(fecha).toLocaleDateString()}`,
      prevValue: sesionExistente
    });


    return NextResponse.json(sesionActualizada, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar la sesión de clase:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la sesión de clase' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una sesión de clase específica por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la sesión de clase es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si la sesión existe
    const sesionExistente = await prisma.sesionClase.findUnique({
      where: { id },
      include: {
        grupo: true
      }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'Sesión de clase no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si hay registros de asistencia asociados
    const asistenciasAsociadas = await prisma.asistenciaAlumno.findFirst({
      where: { sesionClaseId: id }
    });

    if (asistenciasAsociadas) {
      // Eliminar todos los registros de asistencia asociados
      await prisma.asistenciaAlumno.deleteMany({
        where: { sesionClaseId: id }
      });
    }

    // Eliminar la sesión de clase
    await prisma.sesionClase.delete({
      where: { id: id }
    });

    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'sesionClase',
      entityId: sesionExistente.id,
      details: `Eliminación de sesión de clase para el grupo ${sesionExistente.grupo?.denominacion ?? 'desconocido'}`,
      prevValue: sesionExistente
    });


    return NextResponse.json({ message: 'Sesión de clase eliminada correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar la sesión de clase:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la sesión de clase' },
      { status: 500 }
    );
  }
}
