import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET: Obtener todos los alumnos-grupo con opción de filtrar por grupoId o alumnoId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const alumnoId = searchParams.get('alumnoId');
    
    // Configurar los filtros según los parámetros recibidos
    const where: any = {};
    if (grupoId) {
      where.grupoId = grupoId;
    }
    if (alumnoId) {
      where.alumno_Id = alumnoId;
    }
    
    const alumnosGrupo = await prisma.alumnoGrupo.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
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

    return NextResponse.json(alumnosGrupo);
  } catch (error) {
    console.error('Error al obtener alumnos-grupo:', error);
    return NextResponse.json(
      { error: 'Error al obtener los registros de alumnos-grupo' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo registro de alumno-grupo
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Verificar que los campos requeridos estén presentes
    if (!data.alumno_Id || !data.grupoId) {
      return NextResponse.json(
        { error: 'Los campos alumno_Id y grupoId son obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el alumno existe
    const alumnoExists = await prisma.user.findUnique({
      where: { id: data.alumno_Id }
    });

    if (!alumnoExists) {
      return NextResponse.json(
        { error: 'El alumno especificado no existe' },
        { status: 404 }
      );
    }

    // Verificar que el grupo existe
    const grupoExists = await prisma.grupo.findUnique({
      where: { id: data.grupoId }
    });

    if (!grupoExists) {
      return NextResponse.json(
        { error: 'El grupo especificado no existe' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una asignación para este alumno en este grupo
    const existingAsignacion = await prisma.alumnoGrupo.findFirst({
      where: {
        alumno_Id: data.alumno_Id,
        grupoId: data.grupoId
      }
    });

    if (existingAsignacion) {
      return NextResponse.json(
        { error: 'Este alumno ya está asignado a este grupo' },
        { status: 409 }
      );
    }

    // Crear el registro de alumno-grupo
    const newAlumnoGrupo = await prisma.alumnoGrupo.create({
      data,
      include: {
        user: true,
        grupo: true
      }
    });

    // Registrar la actividad
    await logActivity({
      req: request,
      action: 'create',
      entityType: 'alumnoGrupo',
      entityId: newAlumnoGrupo.id,
      details: `Asignación del alumno ${newAlumnoGrupo.user?.email} al grupo ${newAlumnoGrupo.grupo?.denominacion}`
    });

    return NextResponse.json(newAlumnoGrupo, { status: 201 });
  } catch (error) {
    console.error('Error al crear alumno-grupo:', error);
    return NextResponse.json(
      { error: 'Error al crear el registro de alumno-grupo' },
      { status: 500 }
    );
  }
}
