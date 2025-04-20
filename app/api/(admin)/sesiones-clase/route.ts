import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// GET - Obtener todas las sesiones de clase
export async function GET(request: NextRequest) {
  try {
    // Permitir filtrado por grupoId y/o docenteId
    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const docenteId = searchParams.get('docenteId');

    // Construir el filtro de búsqueda
    const where: Prisma.SesionClaseWhereInput = {};
    
    if (grupoId) {
      where.grupoId = parseInt(grupoId, 10);
    }
    
    if (docenteId) {
      where.docenteId = docenteId;
    }

    const sesionesClase = await prisma.sesionClase.findMany({
      where,
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
        AsistenciaAlumno: true
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    return NextResponse.json(sesionesClase, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las sesiones de clase:', error);
    return NextResponse.json(
      { error: 'Error al obtener las sesiones de clase' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva sesión de clase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fecha, grupoId, docenteId } = body;

    // Validar datos obligatorios
    if (!fecha || !grupoId || !docenteId) {
      return NextResponse.json(
        { error: 'Fecha, grupoId y docenteId son campos obligatorios' },
        { status: 400 }
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

    // Crear la nueva sesión de clase
    const nuevaSesionClase = await prisma.sesionClase.create({
      data: {
        fecha: new Date(fecha),
        grupoId: parseInt(grupoId, 10),
        docenteId
      }
    });

    return NextResponse.json(nuevaSesionClase, { status: 201 });
  } catch (error) {
    console.error('Error al crear la sesión de clase:', error);
    return NextResponse.json(
      { error: 'Error al crear la sesión de clase' },
      { status: 500 }
    );
  }
}
