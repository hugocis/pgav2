import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener parámetros de filtrado
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all';
    const dateFromStr = searchParams.get('dateFrom') || undefined;
    const dateToStr = searchParams.get('dateTo') || undefined;
    const subjectCode = searchParams.get('subjectCode') || undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;
    const isUrgent = searchParams.get('isUrgent') === 'true' ? true : undefined;    // Convertir fechas si están presentes
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    // Construir condiciones de filtro usando el tipo de Prisma para SolicitudJustificacion
    const whereConditions: Prisma.SolicitudJustificacionWhereInput = {};
    
    // Filtro por estado
    if (status !== 'all') {
      whereConditions.estadoJustificacion = {
        denominacion: mapStatusToDBStatus(status)
      };
    }
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      whereConditions.fechaAlegacion = {};
      if (dateFrom) whereConditions.fechaAlegacion.gte = dateFrom;
      if (dateTo) whereConditions.fechaAlegacion.lte = dateTo;
    }
      // Filtro por urgencia (este campo podría no existir aún en el modelo)
    if (isUrgent !== undefined) {
      // Usando type assertion para campo que no existe en el modelo
      (whereConditions as any).isUrgent = isUrgent;
    }
    
    // Filtro por código de asignatura
    if (subjectCode) {
      whereConditions.asistenciaAlumno = {
        sesionClase: {
          grupo: {
            asignatura: {
              CodAsignatura: subjectCode
            }
          }
        }
      };
    }
    
    // Filtro por término de búsqueda (nombre de estudiante o email)
    if (searchTerm) {
      whereConditions.OR = [
        {
          user: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { surname1: { contains: searchTerm, mode: 'insensitive' } },
              { surname2: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        },
        {
          alegacion: { contains: searchTerm, mode: 'insensitive' }
        }
      ];
    }

    // Obtener las solicitudes de justificación con los filtros aplicados
    const justificaciones = await prisma.solicitudJustificacion.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        asistenciaAlumno: {
          include: {
            sesionClase: {
              include: {
                grupo: {
                  include: {
                    asignatura: {
                      select: {
                        CodAsignatura: true,
                        Denominacion: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        estadoJustificacion: {
          select: {
            denominacion: true
          }
        },
        DocumentacionJustificacion: {
          select: {
            url: true
          }
        }
      },
      orderBy: {
        fechaAlegacion: 'desc'
      }
    });

    // Formatear los datos para el frontend
    const formattedJustificaciones = justificaciones.map(justificacion => ({
      id: justificacion.id,
      studentId: justificacion.user.id,
      studentName: `${justificacion.user.name} ${justificacion.user.surname1 || ''} ${justificacion.user.surname2 || ''}`.trim(),
      studentEmail: justificacion.user.email,
      subject: justificacion.asistenciaAlumno.sesionClase.grupo.asignatura.Denominacion,
      subjectCode: justificacion.asistenciaAlumno.sesionClase.grupo.asignatura.CodAsignatura,
      absenceDate: justificacion.asistenciaAlumno.sesionClase.fecha.toISOString(),
      requestDate: justificacion.fechaAlegacion.toISOString(),
      reason: justificacion.alegacion,
      status: mapDBStatusToUI(justificacion.estadoJustificacion.denominacion),
      documentationUrl: justificacion.DocumentacionJustificacion[0]?.url || null,
      resolution: justificacion.respuesta || '',
      resolutionDate: justificacion.fechaRespuesta ? justificacion.fechaRespuesta.toISOString() : null,
      resolvedBy: null, // Este dato no está disponible en el modelo actual
      comments: justificacion.respuesta || null,
      isUrgent: !!justificacion.fechaRespuesta // Temporalmente usamos la presencia de fechaRespuesta como indicador (podría añadirse un campo específico)
    }));

    return NextResponse.json(formattedJustificaciones);
  } catch (error) {
    console.error('Error en justificaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para actualizar una justificación
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener datos del cuerpo de la solicitud
    const body = await req.json();
    const { id, status, comments } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Falta el ID de la justificación' },
        { status: 400 }
      );
    }

    // Convertir estado de la interfaz al formato de la base de datos
    const dbStatus = mapStatusToDBStatus(status);

    // Buscar el estado en la base de datos
    const estadoJustificacion = await prisma.estadoJustificacion.findFirst({
      where: {
        denominacion: dbStatus
      }
    });

    if (!estadoJustificacion) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Actualizar la justificación
    const updatedJustificacion = await prisma.solicitudJustificacion.update({
      where: { id },
      data: {
        estadoJustificacionId: estadoJustificacion.id,
        respuesta: comments,
        fechaRespuesta: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      justificacion: updatedJustificacion
    });
  } catch (error) {
    console.error('Error al actualizar justificación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Funciones auxiliares para mapear estados entre UI y DB
function mapStatusToDBStatus(uiStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendiente',
    'approved': 'Aprobada',
    'rejected': 'Rechazada'
  };
  
  return statusMap[uiStatus] || 'Pendiente';
}

function mapDBStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'Pendiente': 'pending',
    'Aprobada': 'approved',
    'Rechazada': 'rejected'
  };
  
  return statusMap[dbStatus] || 'pending';
}
