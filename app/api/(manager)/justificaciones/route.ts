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
    }    // Filtro por urgencia (este campo podría no existir aún en el modelo)
    if (isUrgent !== undefined) {
      // Usando un tipo más específico para el campo adicional
      (whereConditions as Prisma.SolicitudJustificacionWhereInput & { isUrgent?: boolean }).isUrgent = isUrgent;
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
    });    // Formatear los datos para el frontend
    const formattedJustificaciones = justificaciones.map(justificacion => ({
      id: justificacion.id,
      studentId: justificacion.user.id,
      studentName: `${justificacion.user.name} ${justificacion.user.surname1 || ''} ${justificacion.user.surname2 || ''}`.trim(),
      studentEmail: justificacion.user.email,
      subject: justificacion.asistenciaAlumno.sesionClase.grupo.asignatura.Denominacion,
      subjectCode: justificacion.asistenciaAlumno.sesionClase.grupo.asignatura.CodAsignatura,
      // Proporcionar tanto 'date' como 'absenceDate' para mantener compatibilidad
      date: justificacion.asistenciaAlumno.sesionClase.fecha.toISOString(),
      absenceDate: justificacion.asistenciaAlumno.sesionClase.fecha.toISOString(),
      requestDate: justificacion.fechaAlegacion.toISOString(),
      reason: justificacion.alegacion,
      status: mapDBStatusToUI(justificacion.estadoJustificacion.denominacion),
      documentationUrl: justificacion.DocumentacionJustificacion[0]?.url || null,
      resolution: justificacion.respuesta || '',
      resolutionDate: justificacion.fechaRespuesta ? justificacion.fechaRespuesta.toISOString() : null,
      resolvedBy: justificacion.fechaRespuesta ? (session.user?.name || 'Manager') : null, // Usar el nombre del usuario de la sesión si hay respuesta
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
    const dbStatus = mapStatusToDBStatus(status);    // Buscar el estado en la base de datos
    const estadoJustificacion = await prisma.estadoJustificacion.findFirst({
      where: {
        denominacion: dbStatus
      }
    });

    // Si no se encuentra el estado específico, buscar todos los estados disponibles para diagnóstico
    if (!estadoJustificacion) {
      // Obtener todos los estados para diagnóstico
      const allEstados = await prisma.estadoJustificacion.findMany({
        select: { id: true, denominacion: true }
      });
      
      console.error(`Error: Estado "${dbStatus}" no encontrado en la base de datos. Estados disponibles:`, 
        allEstados.map(e => `"${e.denominacion}" (${e.id})`).join(', '));
      
      return NextResponse.json(
        { 
          error: `Estado inválido: "${dbStatus}". Estados disponibles: ${allEstados.map(e => `"${e.denominacion}"`).join(', ')}`,
          requestedStatus: status,
          mappedStatus: dbStatus
        },
        { status: 400 }
      );
    }    // Primero, obtener la información completa de la justificación para acceder al ID de asistencia
    const justificacionOriginal = await prisma.solicitudJustificacion.findUnique({
      where: { id },
      include: {
        asistenciaAlumno: true,
        estadoJustificacion: true,
      }
    });

    if (!justificacionOriginal) {
      return NextResponse.json(
        { error: 'No se encontró la justificación' },
        { status: 404 }
      );
    }

    // Actualizar la justificación
    const updatedJustificacion = await prisma.solicitudJustificacion.update({
      where: { id },
      data: {
        estadoJustificacionId: estadoJustificacion.id,
        respuesta: comments,
        fechaRespuesta: new Date(),
        rechazada: status === 'rejected' // Marcar como rechazada si el estado es 'rejected'
      }
    });

    // Si la justificación se ha aprobado, actualizar también el estado de asistencia a "Justificada"
    if (status === 'approved') {
      try {
        // Buscar el estado de asistencia "Justificada" en la base de datos
        const estadoJustificada = await prisma.estadoAsistencia.findFirst({
          where: {
            denominacion: "Justificada" // Asumiendo que existe este estado en la BD
          }
        });
        
        if (estadoJustificada) {
          // Actualizar el estado de asistencia del alumno
          await prisma.asistenciaAlumno.update({
            where: {
              id: justificacionOriginal.asistenciaAlumnoId
            },
            data: {
              estadoAsistenciaId: estadoJustificada.id,
              // Opcional: podemos actualizar también el campo estado si se utiliza directamente
              estado: "Justificada"
            }
          });
          
          console.log(`Asistencia ${justificacionOriginal.asistenciaAlumnoId} actualizada a estado Justificada`);
        } else {
          console.error("No se encontró el estado de asistencia 'Justificada'");
          // Podría crear el estado si no existe, pero es mejor asegurarse de que exista en la DB
        }
      } catch (asistenciaError) {
        console.error('Error al actualizar el estado de asistencia:', asistenciaError);
        // No fallamos la solicitud principal, pero registramos el error
      }
    }

    // Obtener la justificación completa actualizada (con detalles)
    const justificacionCompleta = await prisma.solicitudJustificacion.findUnique({
      where: { id },
      include: {
        estadoJustificacion: true,
        user: {
          select: {
            name: true,
            surname1: true,
            email: true
          }
        },
        asistenciaAlumno: {
          include: {
            estadoAsistencia: true
          }
        }
      }
    });    // Responder con datos detallados para facilitar diagnóstico
    return NextResponse.json({
      success: true,
      justificacion: updatedJustificacion,
      detalles: {
        id: justificacionCompleta?.id,
        estado: justificacionCompleta?.estadoJustificacion?.denominacion,
        estadoId: justificacionCompleta?.estadoJustificacionId,
        mapeoUI: mapDBStatusToUI(justificacionCompleta?.estadoJustificacion?.denominacion || ''),
        respuesta: justificacionCompleta?.respuesta,
        fechaRespuesta: justificacionCompleta?.fechaRespuesta,
        // Información sobre el estado de asistencia actualizado
        asistencia: justificacionCompleta?.asistenciaAlumno ? {
          id: justificacionCompleta.asistenciaAlumno.id,
          estado: justificacionCompleta.asistenciaAlumno.estado,
          estadoAsistencia: justificacionCompleta.asistenciaAlumno.estadoAsistencia?.denominacion,
          estadoAsistenciaId: justificacionCompleta.asistenciaAlumno.estadoAsistenciaId,
        } : null
      }
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
    'approved': 'Justificado',
    'rejected': 'Rechazado'
  };
  
  return statusMap[uiStatus] || 'Pendiente';
}

function mapDBStatusToUI(dbStatus: string): string {
  const statusMap: Record<string, string> = {
    'Pendiente': 'pending',
    'Justificado': 'approved',
    'Rechazado': 'rejected',
    'Aprobada': 'approved',
    'Rechazada': 'rejected'
  };
  
  return statusMap[dbStatus] || 'pending';
}
