import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener y validar los datos
    const data = await req.json();
    
    // Validación manual de los datos
    if (!data.solicitudDispensaId || typeof data.solicitudDispensaId !== 'string') {
      return NextResponse.json(
        { error: 'El ID de la solicitud de dispensa es requerido y debe ser un string' },
        { status: 400 }
      );
    }
    
    if (!data.url || typeof data.url !== 'string') {
      return NextResponse.json(
        { error: 'La URL es requerida y debe ser un string' },
        { status: 400 }
      );
    }
    
    // Validar que es una URL
    try {
      new URL(data.url);
    } catch (e) {
      return NextResponse.json(
        { error: 'La URL debe ser válida' },
        { status: 400 }
      );
    }
    
    // Convertir fechaSubida a Date si es string
    let fechaSubida: Date;
    if (data.fechaSubida instanceof Date) {
      fechaSubida = data.fechaSubida;
    } else if (typeof data.fechaSubida === 'string') {
      fechaSubida = new Date(data.fechaSubida);
      if (isNaN(fechaSubida.getTime())) {
        return NextResponse.json(
          { error: 'La fecha de subida debe ser válida' },
          { status: 400 }
        );
      }
    } else {
      fechaSubida = new Date(); // Si no se proporciona, usamos la fecha actual
    }

    // Verificar que la solicitud de dispensa existe
    const solicitud = await prisma.solicitudDispensa.findUnique({
      where: {
        id: data.solicitudDispensaId
      }
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'La solicitud de dispensa especificada no existe' },
        { status: 404 }
      );
    }    // Verificar que el usuario tiene permiso para añadir documentación a esta solicitud
    // Solo el alumno que creó la solicitud o un administrador pueden añadir documentación
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');

    if (!isAdmin && session.user.id !== solicitud.alumnoId) {
      return NextResponse.json(
        { error: 'No tienes permiso para añadir documentación a esta solicitud' },
        { status: 403 }
      );
    }

    // Crear la documentación
    const documentacion = await prisma.documentacionDispensa.create({
      data: {
        solicitudDispensaId: data.solicitudDispensaId,
        url: data.url,
        fechaSubida: fechaSubida
      }
    });

    return NextResponse.json(documentacion, { status: 201 });

  } catch (error) {
    console.error('Error al crear documentación de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const url = new URL(req.url);
    const solicitudDispensaId = url.searchParams.get('solicitudDispensaId');

    if (!solicitudDispensaId) {
      return NextResponse.json(
        { error: 'Falta el parámetro solicitudDispensaId' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tiene permiso para ver esta documentación
    const solicitud = await prisma.solicitudDispensa.findUnique({
      where: {
        id: solicitudDispensaId
      }
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'La solicitud de dispensa especificada no existe' },
        { status: 404 }
      );
    }

    // Comprobar permisos
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');
    const isManager = roles.includes('manager');

    // Si no es admin ni manager, solo puede ver su propia documentación
    if (!isAdmin && !isManager && session.user.id !== solicitud.alumnoId) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver esta documentación' },
        { status: 403 }
      );
    }

    // Si es manager, verificar que tiene acceso a la carrera
    if (isManager && !isAdmin) {
      const matricula = await prisma.matricula.findUnique({
        where: {
          id: solicitud.matriculaId
        },
        include: {
          asignatura: {
            include: {
              carrera: true
            }
          }
        }
      });

      if (!matricula) {
        return NextResponse.json(
          { error: 'No se encontró la matrícula asociada' },
          { status: 404 }
        );
      }

      const managerCarreras = await prisma.managerCarrera.findMany({
        where: {
          managerId: session.user.id,
          activo: true
        },
        select: {
          carreraId: true
        }
      });

      const carreraIds = managerCarreras.map(mc => mc.carreraId);
      
      if (!carreraIds.includes(matricula.asignatura.carrera.id)) {
        return NextResponse.json(
          { error: 'No tienes permiso para gestionar esta carrera' },
          { status: 403 }
        );
      }
    }

    // Obtener la documentación
    const documentacion = await prisma.documentacionDispensa.findMany({
      where: {
        solicitudDispensaId
      },
      orderBy: {
        fechaSubida: 'desc'
      }
    });

    return NextResponse.json(documentacion);

  } catch (error) {
    console.error('Error al obtener documentación de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
