import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET - Obtener un plan de alumno por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de plan de alumno inválido' },
        { status: 400 }
      );
    }

    const alumnoPlan = await prisma.alumnoPlan.findUnique({
      where: { id: idNum },
      include: {
        user: true,
        cursoAcademico: true,
        plandeEstudios: {
          include: { carrera: true }
        }
      }
    });

    if (!alumnoPlan) {
      return NextResponse.json(
        { error: 'Plan de alumno no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(alumnoPlan, { status: 200 });
  } catch (error) {
    console.error('Error al obtener el plan de alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener el plan de alumno' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un plan de alumno por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de plan de alumno inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verificar que el plan de alumno exista
    const existingAlumnoPlan = await prisma.alumnoPlan.findUnique({
      where: { id: idNum }
    });
    if (!existingAlumnoPlan) {
      return NextResponse.json(
        { error: 'Plan de alumno no encontrado' },
        { status: 404 }
      );
    }

    // Preparar los datos para la actualización
    const updateData: Prisma.AlumnoPlanUpdateInput = {};

    if (body.fechaBaja !== undefined) {
      updateData.fechaBaja = body.fechaBaja ? new Date(body.fechaBaja) : null;
    }
    if (body.alumno_id !== undefined) {
      // comprobar que el usuario existe
      const alumno = await prisma.user.findUnique({ where: { id: body.alumno_id } });
      if (!alumno) {
        return NextResponse.json(
          { error: 'Alumno no encontrado' },
          { status: 404 }
        );
      }
      updateData.user = { connect: { id: body.alumno_id } };
    }
    if (body.cursoAcademicoId !== undefined) {
      const curso = await prisma.cursoAcademico.findUnique({ where: { id: body.cursoAcademicoId } });
      if (!curso) {
        return NextResponse.json(
          { error: 'Curso académico no encontrado' },
          { status: 404 }
        );
      }
      updateData.cursoAcademico = { connect: { id: body.cursoAcademicoId } };
    }
    if (body.plandeEstudiosId !== undefined) {
      const plan = await prisma.planDeEstudios.findUnique({ where: { id: body.plandeEstudiosId } });
      if (!plan) {
        return NextResponse.json(
          { error: 'Plan de estudios no encontrado' },
          { status: 404 }
        );
      }
      updateData.plandeEstudios = { connect: { id: body.plandeEstudiosId } };
    }

    const updatedAlumnoPlan = await prisma.alumnoPlan.update({
      where: { id: idNum },
      data: updateData,
      include: {
        user: true,
        cursoAcademico: true,
        plandeEstudios: true
      }
    });

    return NextResponse.json(updatedAlumnoPlan, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el plan de alumno:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el plan de alumno' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un plan de alumno por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = parseInt(id, 10);

    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: 'ID de plan de alumno inválido' },
        { status: 400 }
      );
    }

    const existingAlumnoPlan = await prisma.alumnoPlan.findUnique({
      where: { id: idNum }
    });
    if (!existingAlumnoPlan) {
      return NextResponse.json(
        { error: 'Plan de alumno no encontrado' },
        { status: 404 }
      );
    }

    await prisma.alumnoPlan.delete({ where: { id: idNum } });

    return NextResponse.json(
      { message: 'Plan de alumno eliminado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al eliminar el plan de alumno:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el plan de alumno' },
      { status: 500 }
    );
  }
}
