import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { Prisma } from '@prisma/client';

// Define the type for the where conditions
type SesionClaseWhereInput = Prisma.SesionClaseWhereInput;

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
    const department = searchParams.get('department') || undefined;
    const subjectCode = searchParams.get('subjectCode') || undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;

    // Convertir fechas si están presentes
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    // Como no existe un modelo específico para firmas docentes, 
    // utilizaremos las SesionClase para representarlas
    
    // Construir condiciones de filtro
    const whereConditions: SesionClaseWhereInput = {};
    
    // Filtro por fecha
    if (dateFrom || dateTo) {
      whereConditions.fecha = {};
      if (dateFrom) whereConditions.fecha.gte = dateFrom;
      if (dateTo) whereConditions.fecha.lte = dateTo;
    }
      // Preparar objeto para filtros de la asignatura
    let asignaturaFilter: Prisma.AsignaturaWhereInput = {};
    let grupoFilter: Prisma.GrupoWhereInput = {};
    
    // Filtro por departamento (a través de la carrera asociada a la asignatura)
    if (department) {
      asignaturaFilter = {
        ...asignaturaFilter,
        carrera: {
          denominacion: department
        }
      };
    }
    
    // Filtro por código de asignatura
    if (subjectCode) {
      asignaturaFilter = {
        ...asignaturaFilter,
        CodAsignatura: subjectCode
      };
    }
    
    // Aplicar filtros de asignatura al filtro de grupo
    if (Object.keys(asignaturaFilter).length > 0) {
      grupoFilter = {
        ...grupoFilter,
        asignatura: asignaturaFilter
      };
      
      // Aplicar filtro de grupo completo a whereConditions
      whereConditions.grupo = grupoFilter;
    }
    
    // Filtro por término de búsqueda (nombre de profesor o email)
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
        }
      ];
    }
    
    // Obtener sesiones de clase (que representan las firmas)
    const sesiones = await prisma.sesionClase.findMany({
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
        grupo: {
          include: {
            asignatura: {
              include: {
                carrera: {
                  select: {
                    denominacion: true
                  }
                }
              }
            }
          }
        },
        AsistenciaAlumno: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });

    // Para este ejemplo, generaremos un estado simulado para las firmas
    // En una implementación real, esto debería estar en la base de datos
    const statuses = ['pending', 'verified', 'rejected'];
    
    // Formatear los datos para el frontend
    const formattedSignatures = sesiones.map((sesion, index) => {
      // Asignar un estado basado en algún criterio como la fecha o el índice
      // En un sistema real esto vendría de la base de datos
      const calculatedStatus = statuses[index % statuses.length];
      
      return {
        id: sesion.id,
        teacherId: sesion.user.id,
        teacherName: `${sesion.user.name} ${sesion.user.surname1 || ''} ${sesion.user.surname2 || ''}`.trim(),
        teacherEmail: sesion.user.email,
        department: sesion.grupo.asignatura.carrera.denominacion,
        subject: sesion.grupo.asignatura.Denominacion,
        subjectCode: sesion.grupo.asignatura.CodAsignatura,
        classDate: sesion.fecha.toISOString(),
        signatureTime: sesion.createdAt.toISOString(),
        classroom: `Aula ${Math.floor(Math.random() * 100) + 1}`, // Simulado
        content: `Contenido de la clase ${sesion.id}`, // Simulado
        status: calculatedStatus,
        verificationDate: calculatedStatus !== 'pending' ? new Date().toISOString() : null,
        verifiedBy: calculatedStatus !== 'pending' ? 'Sistema automatizado' : null,
        comments: calculatedStatus === 'rejected' ? 'Firma rechazada por inconsistencias' : null
      };
    });

    // Aplicar filtro de estado si está especificado
    let filteredSignatures = formattedSignatures;
    if (status !== 'all') {
      filteredSignatures = formattedSignatures.filter(sig => sig.status === status);
    }

    return NextResponse.json(filteredSignatures);
  } catch (error) {
    console.error('Error en firmas-docente:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para actualizar el estado de una firma
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
        { error: 'Falta el ID de la firma' },
        { status: 400 }
      );
    }

    // En un sistema real, esto actualizaría el estado de la firma en la base de datos
    // Como es una simulación, simplemente devolvemos una respuesta exitosa

    return NextResponse.json({
      success: true,
      message: `Firma ${id} actualizada a estado ${status} con comentarios: ${comments || 'ninguno'}`
    });
  } catch (error) {
    console.error('Error al actualizar firma:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
