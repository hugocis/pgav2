import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// GET - Obtener todos los registros de asistencia de alumnos
export async function GET(request: NextRequest) {
  try {
    // Permitir filtrado por alumnoId, sesionClaseId y/o estadoAsistenciaId
    const { searchParams } = new URL(request.url);
    const alumnoId = searchParams.get('alumnoId');
    const sesionClaseId = searchParams.get('sesionClaseId');
    const estadoAsistenciaId = searchParams.get('estadoAsistenciaId');

    // Construir el filtro de búsqueda
    const where: Prisma.AsistenciaAlumnoWhereInput = {};
    
    if (alumnoId) {
      where.alumnoId = alumnoId;
    }
    
    if (sesionClaseId) {
      where.sesionClaseId = parseInt(sesionClaseId, 10);
    }

    if (estadoAsistenciaId) {
      where.estadoAsistenciaId = parseInt(estadoAsistenciaId, 10);
    }

    const asistencias = await prisma.asistenciaAlumno.findMany({
      where,
      include: {
        sesionClase: {
          include: {
            grupo: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        estadoAsistencia: true,
        SolicitudJustificacion: true
      },
      orderBy: {
        fecha: 'desc',
      },
    });

    return NextResponse.json(asistencias, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los registros de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener los registros de asistencia' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo registro de asistencia de alumno
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fecha, estado, sesionClaseId, alumnoId, estadoAsistenciaId } = body;

    // Validar datos obligatorios
    if (!fecha || !sesionClaseId || !alumnoId || !estadoAsistenciaId) {
      return NextResponse.json(
        { error: 'Fecha, sesionClaseId, alumnoId y estadoAsistenciaId son campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar si la sesión de clase existe
    const sesionExistente = await prisma.sesionClase.findUnique({
      where: { id: parseInt(sesionClaseId, 10) }
    });

    if (!sesionExistente) {
      return NextResponse.json(
        { error: 'La sesión de clase especificada no existe' },
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

    // Verificar si el estado de asistencia existe
    const estadoExistente = await prisma.estadoAsistencia.findUnique({
      where: { id: parseInt(estadoAsistenciaId, 10) }
    });

    if (!estadoExistente) {
      return NextResponse.json(
        { error: 'El estado de asistencia especificado no existe' },
        { status: 400 }
      );
    }

    // Verificar si ya existe un registro para este alumno en esta sesión
    const asistenciaExistente = await prisma.asistenciaAlumno.findFirst({
      where: {
        sesionClaseId: parseInt(sesionClaseId, 10),
        alumnoId
      }
    });

    if (asistenciaExistente) {
      return NextResponse.json(
        { error: 'Ya existe un registro de asistencia para este alumno en esta sesión' },
        { status: 400 }
      );
    }

    // Crear el nuevo registro de asistencia
    const nuevaAsistencia = await prisma.asistenciaAlumno.create({
      data: {
        fecha: new Date(fecha),
        estado: estado || estadoExistente.denominacion, // Si no se proporciona estado, usar la denominación del estadoAsistencia
        sesionClaseId: parseInt(sesionClaseId, 10),
        alumnoId,
        estadoAsistenciaId: parseInt(estadoAsistenciaId, 10)
      }
    });

    return NextResponse.json(nuevaAsistencia, { status: 201 });
  } catch (error) {
    console.error('Error al crear el registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al crear el registro de asistencia' },
      { status: 500 }
    );
  }
}
