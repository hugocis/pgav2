import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
      where: { id: parseInt(id, 10) },
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
      where: { id: parseInt(id, 10) }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'Sesión de clase no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si el grupo existe
    const grupoExistente = await prisma.grupo.findUnique({
      where: { id: parseInt(grupoId, 10) }
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
      where: { id: parseInt(id, 10) },
      data: {
        fecha: new Date(fecha),
        grupoId: parseInt(grupoId, 10),
        docenteId
      }
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
      where: { id: parseInt(id, 10) }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'Sesión de clase no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si hay registros de asistencia asociados
    const asistenciasAsociadas = await prisma.asistenciaAlumno.findFirst({
      where: { sesionClaseId: parseInt(id, 10) }
    });

    if (asistenciasAsociadas) {
      // Eliminar todos los registros de asistencia asociados
      await prisma.asistenciaAlumno.deleteMany({
        where: { sesionClaseId: parseInt(id, 10) }
      });
    }

    // Eliminar la sesión de clase
    await prisma.sesionClase.delete({
      where: { id: parseInt(id, 10) }
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
