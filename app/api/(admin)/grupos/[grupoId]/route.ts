import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// GET: Obtener un grupo por ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  try {
    const { grupoId } = await params;

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        asignatura: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ grupo }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener el grupo:", error);
    return NextResponse.json(
      { error: "Error al obtener el grupo" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un grupo
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  try {
    const { grupoId } = await params;

    const grupoExistente = await prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupoExistente) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { denominacion, asignaturaId, profesorId } = body;

    if (!denominacion || !asignaturaId || !profesorId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (asignaturaId) {
      const asignatura = await prisma.asignatura.findUnique({
        where: { id: asignaturaId },
      });

      if (!asignatura) {
        return NextResponse.json(
          { error: "La asignatura no existe" },
          { status: 404 }
        );
      }
    }

    if (profesorId) {
      const profesor = await prisma.user.findUnique({
        where: { id: profesorId },
      });

      if (!profesor) {
        return NextResponse.json(
          { error: "El profesor no existe" },
          { status: 404 }
        );
      }
    }

    const grupoActualizado = await prisma.grupo.update({
      where: { id: grupoId },
      data: {
        denominacion,
        asignaturaId,
        profesorId,
      },
    });

    await logActivity({
      req,
      action: 'update',
      entityType: 'grupo',
      entityId: grupoActualizado.id,
      details: `Grupo actualizado a denominación '${grupoActualizado.denominacion}' con asignatura ID '${grupoActualizado.asignaturaId}' y profesor ID '${grupoActualizado.profesorId}'`,
      prevValue: grupoExistente
    });


    return NextResponse.json({ grupo: grupoActualizado }, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar el grupo:", error);
    return NextResponse.json(
      { error: "Error al actualizar el grupo" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un grupo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ grupoId: string }> }
) {
  try {
    const { grupoId } = await params;

    const grupoExistente = await prisma.grupo.findUnique({
      where: { id: grupoId },
    });

    if (!grupoExistente) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    await prisma.alumnoGrupo.deleteMany({
      where: { grupoId: grupoId },
    });

    await prisma.grupo.delete({
      where: { id: grupoId },
    });

    return NextResponse.json(
      { message: "Grupo eliminado correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar el grupo:", error);
    return NextResponse.json(
      { error: "Error al eliminar el grupo" },
      { status: 500 }
    );
  }
}
