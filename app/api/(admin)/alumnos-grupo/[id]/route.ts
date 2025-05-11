import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener un registro específico de alumno-grupo por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    const alumnoGrupo = await prisma.alumnoGrupo.findUnique({
      where: { id },
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
        grupo: {
          include: {
            asignatura: true
          }
        }
      }
    });

    if (!alumnoGrupo) {
      return NextResponse.json(
        { error: 'Registro de alumno-grupo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(alumnoGrupo);
  } catch (error) {
    console.error('Error al obtener el registro de alumno-grupo:', error);
    return NextResponse.json(
      { error: 'Error al obtener el registro de alumno-grupo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un registro específico de alumno-grupo por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    // Primero obtenemos los datos para el registro de actividad
    const alumnoGrupo = await prisma.alumnoGrupo.findUnique({
      where: { id },
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
        grupo: {
          include: {
            asignatura: true
          }
        }
      }
    });

    if (!alumnoGrupo) {
      return NextResponse.json(
        { error: 'Registro de alumno-grupo no encontrado' },
        { status: 404 }
      );
    }

    // Eliminamos el registro
    await prisma.alumnoGrupo.delete({
      where: { id }
    });

    // Registramos la actividad
    await logActivity({
      req: request,
      action: 'delete',
      entityType: 'alumnoGrupo',
      entityId: id,
      details: `El alumno ${alumnoGrupo.user.name} ${alumnoGrupo.user.surname1} ha sido eliminado del grupo ${alumnoGrupo.grupo.denominacion} de la asignatura ${alumnoGrupo.grupo.asignatura.Denominacion}`,
      prevValue: alumnoGrupo
    });

    return NextResponse.json(
      { message: 'Registro de alumno-grupo eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el registro de alumno-grupo:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el registro de alumno-grupo' },
      { status: 500 }
    );
  }
}
