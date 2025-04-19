import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener todos los cursos académicos
export async function GET() {
  try {
    const cursosAcademicos = await prisma.cursoAcademico.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(cursosAcademicos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los cursos académicos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los cursos académicos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo curso académico
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { denominacion, activo, cursoAnterior, cursoSiguiente } = body;
    
    // Validar que la denominación sea obligatoria
    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es obligatoria' },
        { status: 400 }
      );
    }
    
    // Validar el formato 1234-56 (por ejemplo 2025-26)
    const formatoRegex = /^\d{4}-\d{2}$/;
    if (!formatoRegex.test(denominacion)) {
      return NextResponse.json(
        { error: 'La denominación debe seguir el formato 1234-56 (por ejemplo: 2025-26)' },
        { status: 400 }
      );
    }
    // Si el curso actual está marcado como activo, desactivar todos los demás
    if (activo) {
      await prisma.cursoAcademico.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
    }
    
    const nuevoCurso = await prisma.cursoAcademico.create({
      data: {
        denominacion,
        activo: activo || false,
        cursoAnterior,
        cursoSiguiente,
      },
    });
    
    return NextResponse.json(nuevoCurso, { status: 201 });
  } catch (error) {
    console.error('Error al crear el curso académico:', error);
    return NextResponse.json(
      { error: 'Error al crear el curso académico' },
      { status: 500 }
    );
  }
}
