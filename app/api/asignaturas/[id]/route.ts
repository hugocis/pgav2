import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

// GET /api/asignaturas/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params antes de leer id
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "ID de asignatura inválido" },
        { status: 400 }
      );
    }

    const asignatura = await prisma.asignatura.findUnique({
      where: { id: idNum },
      include: {
        carrera: true,
        cursoAcademico: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
        Docencia: {
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
          },
        },
        Grupo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname1: true,
                surname2: true,
              },
            },
          },
        },
        Matricula: {
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
          },
        },
      },
    });

    if (!asignatura) {
      return NextResponse.json(
        { error: "Asignatura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(asignatura, { status: 200 });
  } catch (error) {
    console.error("Error al obtener asignatura:", error);
    return NextResponse.json(
      { error: "Error al obtener la asignatura" },
      { status: 500 }
    );
  }
}

// PATCH /api/asignaturas/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "ID de asignatura inválido" },
        { status: 400 }
      );
    }

    // Verificar que la asignatura existe
    const asignaturaExistente = await prisma.asignatura.findUnique({
      where: { id: idNum },
    });
    if (!asignaturaExistente) {
      return NextResponse.json(
        { error: "Asignatura no encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      CodAsignatura,
      Denominacion,
      Curso,
      Cuatrimestre,
      carreraId,
      cursoAcademicoId,
      profesorId,
    } = body;

    const updateData: Prisma.AsignaturaUpdateInput = {};
    if (CodAsignatura !== undefined) updateData.CodAsignatura = CodAsignatura;
    if (Denominacion !== undefined) updateData.Denominacion = Denominacion;
    if (Curso !== undefined) updateData.Curso = Curso;
    if (Cuatrimestre !== undefined) updateData.Cuatrimestre = Cuatrimestre;

    if (carreraId !== undefined) {
      const carrera = await prisma.carrera.findUnique({
        where: { id: carreraId },
      });
      if (!carrera) {
        return NextResponse.json(
          { error: "La carrera especificada no existe" },
          { status: 400 }
        );
      }
      updateData.carrera = { connect: { id: carreraId } };
    }

    if (cursoAcademicoId !== undefined) {
      const cursoAcademico = await prisma.cursoAcademico.findUnique({
        where: { id: cursoAcademicoId },
      });
      if (!cursoAcademico) {
        return NextResponse.json(
          { error: "El curso académico especificado no existe" },
          { status: 400 }
        );
      }
      updateData.cursoAcademico = { connect: { id: cursoAcademicoId } };
    }

    if (profesorId !== undefined) {
      const profesor = await prisma.user.findUnique({
        where: { id: profesorId },
        include: { userRoles: true },
      });
      if (!profesor) {
        return NextResponse.json(
          { error: "El profesor especificado no existe" },
          { status: 400 }
        );
      }
      const esProfesor = profesor.userRoles.some((r) => r.roleId === 2);
      if (!esProfesor) {
        return NextResponse.json(
          { error: "El usuario especificado no es un profesor" },
          { status: 400 }
        );
      }
      updateData.user = { connect: { id: profesorId } };
    }

    const asignaturaActualizada = await prisma.asignatura.update({
      where: { id: idNum },
      data: updateData,
    });

    return NextResponse.json(asignaturaActualizada, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar asignatura:", error);
    return NextResponse.json(
      { error: "Error al actualizar la asignatura" },
      { status: 500 }
    );
  }
}

// DELETE /api/asignaturas/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "ID de asignatura inválido" },
        { status: 400 }
      );
    }

    const asignaturaExistente = await prisma.asignatura.findUnique({
      where: { id: idNum },
    });
    if (!asignaturaExistente) {
      return NextResponse.json(
        { error: "Asignatura no encontrada" },
        { status: 404 }
      );
    }

    await prisma.asignatura.delete({
      where: { id: idNum },
    });

    return NextResponse.json(
      { message: "Asignatura eliminada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar asignatura:", error);
    return NextResponse.json(
      { error: "Error al eliminar la asignatura" },
      { status: 500 }
    );
  }
}
