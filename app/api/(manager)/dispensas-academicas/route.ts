import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';

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

    // Convertir fechas si están presentes
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    // Construir condiciones de filtro
    const whereConditions: any = {};
    
    // Filtro por estado
    if (status !== 'all') {
      whereConditions.estadoDispensa = {
        denominacion: mapStatusToDBStatus(status)
      };
    }
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      whereConditions.fechaAlegacion = {};
      if (dateFrom) whereConditions.fechaAlegacion.gte = dateFrom;
      if (dateTo) whereConditions.fechaAlegacion.lte = dateTo;
    }
    
    // Filtro por código de asignatura
    if (subjectCode) {
      whereConditions.matricula = {
        asignatura: {
          CodAsignatura: subjectCode
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

    // Obtener las solicitudes de dispensa con los filtros aplicados
    const dispensas = await prisma.solicitudDispensa.findMany({
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
        matricula: {
          include: {
            asignatura: {
              select: {
                CodAsignatura: true,
                Denominacion: true
              }
            }
          }
        },
        estadoDispensa: {
          select: {
            denominacion: true
          }
        },
        DocumentacionDispensa: {
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
    const formattedDispensas = dispensas.map(dispensa => ({
      id: dispensa.id,
      studentId: dispensa.user.id,
      studentName: `${dispensa.user.name} ${dispensa.user.surname1 || ''} ${dispensa.user.surname2 || ''}`.trim(),
      studentEmail: dispensa.user.email,
      subject: dispensa.matricula.asignatura.Denominacion,
      subjectCode: dispensa.matricula.asignatura.CodAsignatura,
      requestDate: dispensa.fechaAlegacion.toISOString(),
      reason: dispensa.alegacion,
      status: mapDBStatusToUI(dispensa.estadoDispensa.denominacion),
      documentationUrl: dispensa.DocumentacionDispensa[0]?.url || '',
      resolution: dispensa.respuesta || '',
      resolutionDate: dispensa.fechaRespuesta ? dispensa.fechaRespuesta.toISOString() : null,
      resolvedBy: null, // Este dato no está disponible en el modelo actual
      comments: dispensa.respuesta || null
    }));

    return NextResponse.json(formattedDispensas);
  } catch (error) {
    console.error('Error en dispensas-academicas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para actualizar una dispensa académica
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
        { error: 'Falta el ID de la dispensa' },
        { status: 400 }
      );
    }

    // Convertir estado de la interfaz al formato de la base de datos
    const dbStatus = mapStatusToDBStatus(status);

    // Buscar el estado en la base de datos
    const estadoDispensa = await prisma.estadoDispensa.findFirst({
      where: {
        denominacion: dbStatus
      }
    });

    if (!estadoDispensa) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

    // Actualizar la dispensa
    const updatedDispensa = await prisma.solicitudDispensa.update({
      where: { id },
      data: {
        estadoDispensaId: estadoDispensa.id,
        respuesta: comments,
        fechaRespuesta: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      dispensa: updatedDispensa
    });
  } catch (error) {
    console.error('Error al actualizar dispensa:', error);
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
