import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

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
      where.grupoId = grupoId;
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
      where: { id: grupoId }
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

    // Crear la nueva sesión de clase y su firma docente en una transacción
    const nuevaSesionClase = await prisma.$transaction(async (tx) => {
      // Crear la sesión de clase
      const sesion = await tx.sesionClase.create({
        data: {
          fecha: new Date(fecha),
          grupoId: grupoId,
          docenteId
        }
      });
      
      // Crear automáticamente la firma docente al crear la sesión
      await tx.firmaDocente.create({
        data: {
          sesionClaseId: sesion.id,
          fechaFirma: new Date(), // Se registra la firma en el momento actual
          observaciones: 'Firma automática al pasar lista'
        }
      });
      
      return sesion;
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'sesionClase',
      entityId: nuevaSesionClase.id,
      details: `Creación de sesión de clase y firma docente para el grupo ${grupoExistente.denominacion} el día ${new Date(fecha).toLocaleDateString()}`
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
