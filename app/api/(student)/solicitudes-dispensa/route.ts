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
    if (!data.alumnoId || typeof data.alumnoId !== 'string') {
      return NextResponse.json(
        { error: 'El ID del alumno es requerido y debe ser un string' },
        { status: 400 }
      );
    }
    
    if (!data.matriculaId || typeof data.matriculaId !== 'string') {
      return NextResponse.json(
        { error: 'El ID de la matrícula es requerido y debe ser un string' },
        { status: 400 }
      );
    }
    
    if (!data.alegacion || typeof data.alegacion !== 'string') {
      return NextResponse.json(
        { error: 'La alegación es obligatoria y debe ser un string' },
        { status: 400 }
      );
    }
    
    if (!data.estadoDispensaId || typeof data.estadoDispensaId !== 'string') {
      return NextResponse.json(
        { error: 'El ID del estado de dispensa es requerido y debe ser un string' },
        { status: 400 }
      );
    }
    
    // Convertir fechaAlegacion a Date si es string
    let fechaAlegacion: Date;
    if (data.fechaAlegacion instanceof Date) {
      fechaAlegacion = data.fechaAlegacion;
    } else if (typeof data.fechaAlegacion === 'string') {
      fechaAlegacion = new Date(data.fechaAlegacion);
      if (isNaN(fechaAlegacion.getTime())) {
        return NextResponse.json(
          { error: 'La fecha de alegación debe ser válida' },
          { status: 400 }
        );
      }
    } else {
      fechaAlegacion = new Date(); // Si no se proporciona, usamos la fecha actual
    }

    // Verificar que el alumnoId pertenece al usuario autenticado o es un administrador
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');

    if (!isAdmin && session.user.id !== data.alumnoId) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear una solicitud para este alumno' },
        { status: 403 }
      );
    }

    // Verificar que la matrícula existe y pertenece al alumno
    const matricula = await prisma.matricula.findUnique({
      where: {
        id: data.matriculaId,
        alumno_id: data.alumnoId
      }
    });

    if (!matricula) {
      return NextResponse.json(
        { error: 'La matrícula especificada no existe o no pertenece al alumno' },
        { status: 404 }
      );
    }

    // Verificar que el estado de dispensa existe
    const estadoDispensa = await prisma.estadoDispensa.findUnique({
      where: {
        id: data.estadoDispensaId
      }
    });

    if (!estadoDispensa) {
      return NextResponse.json(
        { error: 'El estado de dispensa especificado no existe' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una solicitud de dispensa pendiente para esta matrícula
    const pendienteId = await prisma.estadoDispensa.findFirst({
      where: { denominacion: 'Pendiente' },
      select: { id: true }
    });

    if (pendienteId) {
      const solicitudExistente = await prisma.solicitudDispensa.findFirst({
        where: {
          matriculaId: data.matriculaId,
          alumnoId: data.alumnoId,
          estadoDispensaId: pendienteId.id
        }
      });

      if (solicitudExistente) {
        return NextResponse.json(
          { error: 'Ya existe una solicitud de dispensa pendiente para esta matrícula' },
          { status: 409 }
        );
      }
    }

    // Crear la solicitud de dispensa
    const solicitud = await prisma.solicitudDispensa.create({
      data: {
        alumnoId: data.alumnoId,
        matriculaId: data.matriculaId,
        fechaAlegacion: fechaAlegacion,
        alegacion: data.alegacion,
        estadoDispensaId: data.estadoDispensaId
      }
    });

    return NextResponse.json(solicitud, { status: 201 });

  } catch (error) {
    console.error('Error al crear solicitud de dispensa:', error);
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

    // Obtener los roles del usuario
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');
    const isManager = roles.includes('manager');

    // Parámetros de consulta
    const url = new URL(req.url);
    const alumnoId = url.searchParams.get('alumnoId');
    const matriculaId = url.searchParams.get('matriculaId');
    const estadoId = url.searchParams.get('estadoId');

    // Construir la consulta base
    const query: {
      where?: Record<string, unknown>;
      include: {
        user: {
          select: {
            name: boolean;
            surname1: boolean;
            surname2: boolean;
            email: boolean;
          }
        };
        matricula: {
          include: {
            asignatura: {
              include: {
                carrera: boolean;
              }
            }
          }
        };
        estadoDispensa: boolean;
        DocumentacionDispensa: boolean;
      }
    } = {
      include: {
        user: {
          select: {
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          }
        },
        matricula: {
          include: {
            asignatura: {
              include: {
                carrera: true
              }
            }
          }
        },
        estadoDispensa: true,
        DocumentacionDispensa: true
      }
    };

    // Filtros
    if (alumnoId) {
      query.where = { ...query.where, alumnoId };
    }

    if (matriculaId) {
      query.where = { ...query.where, matriculaId };
    }

    if (estadoId) {
      query.where = { ...query.where, estadoDispensaId: estadoId };
    }

    // Restricciones según el rol
    if (!isAdmin && !isManager) {
      // Si es alumno, solo puede ver sus propias solicitudes
      query.where = { ...query.where, alumnoId: session.user.id };
    } else if (isManager) {
      // Si es manager, puede ver las solicitudes de las carreras que gestiona
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
      
      if (carreraIds.length > 0) {
        query.where = {
          ...query.where,
          matricula: {
            asignatura: {
              carrera: {
                id: { in: carreraIds }
              }
            }
          }
        };
      }
    }

    // Ejecutar la consulta
    const solicitudes = await prisma.solicitudDispensa.findMany(query);

    return NextResponse.json(solicitudes);

  } catch (error) {
    console.error('Error al obtener solicitudes de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar roles
    const roles = session.user.roles || [];
    const isAdmin = roles.includes('admin');
    const isManager = roles.includes('manager');

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar solicitudes de dispensa' },
        { status: 403 }
      );
    }

    // Obtener y validar los datos
    const data = await req.json();
    const { id, estadoDispensaId, respuesta } = data;

    if (!id || !estadoDispensaId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (id, estadoDispensaId)' },
        { status: 400 }
      );
    }

    // Verificar que la solicitud existe
    const solicitud = await prisma.solicitudDispensa.findUnique({
      where: { id },
      include: {
        matricula: {
          include: {
            asignatura: {
              include: {
                carrera: true
              }
            }
          }
        }
      }
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'La solicitud especificada no existe' },
        { status: 404 }
      );
    }

    // Si es manager, verificar que tiene permisos sobre la carrera
    if (isManager && !isAdmin) {
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
      
      if (!carreraIds.includes(solicitud.matricula.asignatura.carrera.id)) {
        return NextResponse.json(
          { error: 'No tienes permiso para gestionar esta carrera' },
          { status: 403 }
        );
      }
    }

    // Verificar que el estado de dispensa existe
    const estadoDispensa = await prisma.estadoDispensa.findUnique({
      where: { id: estadoDispensaId }
    });

    if (!estadoDispensa) {
      return NextResponse.json(
        { error: 'El estado de dispensa especificado no existe' },
        { status: 404 }
      );
    }

    // Actualizar la solicitud
    const solicitudActualizada = await prisma.solicitudDispensa.update({
      where: { id },
      data: {
        estadoDispensaId,
        respuesta: respuesta || null,
        fechaRespuesta: new Date()
      }
    });

    return NextResponse.json(solicitudActualizada);

  } catch (error) {
    console.error('Error al actualizar solicitud de dispensa:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
