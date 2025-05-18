import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener una asignación específica de PEC-carrera-curso
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pecCarreraCurso = await prisma.pecCarreraCurso.findUnique({
      where: {
        id: (await params).id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
        carrera: {
          select: {
            id: true,
            denominacion: true,
          },
        },
      },
    });

    if (!pecCarreraCurso) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(pecCarreraCurso);
  } catch (error) {
    console.error('Error al obtener asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH: Actualizar una asignación de PEC-carrera-curso (desactivar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { activo } = body;

    // Solo permitimos actualizar el estado activo
    const updatedPecCarreraCurso = await prisma.pecCarreraCurso.update({
      where: {
        id: (await params).id,
      },
      data: {
        activo,
        fechaBaja: activo ? null : new Date(),
      },
    });

    await logActivity({
      req,
      action: 'update',
      entityType: 'pecCarreraCurso',
      entityId: updatedPecCarreraCurso.id,
      details: activo 
        ? `Reactivada la asignación del PEC a la carrera y curso académico` 
        : `Desactivada la asignación del PEC a la carrera y curso académico`,
    });

    return NextResponse.json(updatedPecCarreraCurso);
  } catch (error) {
    console.error('Error al actualizar asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(JSON.stringify({ message: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const assignmentId = params.id;
    const { carreraId, curso } = await request.json();

    // Validar los datos de entrada
    if (!carreraId || !curso) {
      return new NextResponse(JSON.stringify({ message: 'Faltan datos requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar que la asignación existe
    const existingAssignment = await prisma.pecCarreraCurso.findUnique({
      where: { id: assignmentId },
      include: { carrera: true }
    });

    if (!existingAssignment) {
      return new NextResponse(JSON.stringify({ message: 'La asignación no existe' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar que el usuario actual es el PEC o un administrador
    const isAdmin = session?.user?.roles.includes('Admin');
    const isPec = session?.user?.id === existingAssignment.pecId;

    if (!isAdmin && !isPec) {
      return new NextResponse(JSON.stringify({ message: 'No tiene permisos para actualizar esta asignación' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar si la combinación ya está asignada y es diferente a la actual
    const duplicateCheck = await prisma.pecCarreraCurso.findFirst({
      where: {
        id: { not: assignmentId },
        pecId: existingAssignment.pecId,
        carreraId: carreraId,
        curso: curso,
        activo: true,
      },
    });

    if (duplicateCheck) {
      return new NextResponse(JSON.stringify({
        message: 'Esta combinación de carrera y curso ya está asignada al PEC'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Actualizar la asignación
    const updatedAssignment = await prisma.pecCarreraCurso.update({
      where: { id: assignmentId },
      data: { 
        carreraId,
        curso
      },
      include: { carrera: true }
    });

    // Registrar la actividad
    await logActivity({
      req: request,
      action: 'update',
      entityType: 'pecCarreraCurso',
      entityId: assignmentId,
      details: `Actualizada asignación para PEC ${existingAssignment.pecId}: Carrera ${existingAssignment.carrera?.denominacion || carreraId} - Curso ${curso}`
    });

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error('Error al actualizar la asignación:', error);
    return new NextResponse(JSON.stringify({ message: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE: Eliminar una asignación de PEC-carrera-curso
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.roles.includes('Admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Primero verificamos que la asignación existe
    const pecCarreraCurso = await prisma.pecCarreraCurso.findUnique({
      where: {
        id: (await params).id,
      },
    });

    if (!pecCarreraCurso) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    // Eliminamos la asignación
    await prisma.pecCarreraCurso.delete({
      where: {
        id: (await params).id,
      },
    });

    await logActivity({
      req,
      action: 'delete',
      entityType: 'pecCarreraCurso',
      entityId: (await params).id,
      details: `Eliminada la asignación del PEC ${pecCarreraCurso.pecId} a la carrera ${pecCarreraCurso.carreraId} y curso académico ${pecCarreraCurso.curso}`,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar asignación de PEC:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
