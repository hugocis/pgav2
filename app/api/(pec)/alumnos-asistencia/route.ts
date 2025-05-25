import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';
import * as xlsx from 'xlsx';

// Interfaces for type safety
interface EstadoAsistencia {
  id: string;
  denominacion: string;
  codigo: string;
}

interface SesionClase {
  id: string;
  fecha: Date;
}

interface AsistenciaAlumno {
  fecha: Date;
  estadoAsistencia: EstadoAsistencia;
  sesionClase: SesionClase;
  justificado?: boolean;
}

interface UserRole {
  role: {
    name: string;
  };
}

interface AlumnoUser {
  id: string;
  name: string | null;
  surname1: string | null;
  surname2: string | null;
  email: string | null;
  userRoles: UserRole[];
  AsistenciaAlumno: AsistenciaAlumno[];
}

interface AlumnoConAsistencia {
  id: string;
  name: string | null;
  surname1: string | null;
  surname2: string | null;
  email: string;
  goe: boolean;
  asistencia: number;
  faltas: number;
  ultimaAsistencia: string | null;
  estado: 'normal' | 'warning' | 'danger';
}

interface CarreraCurso {
  id: string;
  carreraId: string;
  curso: number;
  carrera: {
    denominacion: string;
  };
}

// Interface for Prisma where conditions
interface WhereCondition {
  id?: {
    in: string[];
  };
  AND?: WhereCondition[];
  OR?: {
    name?: { contains: string };
    surname1?: { contains: string };
    surname2?: { contains: string };
    email?: { contains: string };
  }[];
}

export async function GET(req: NextRequest) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }    // Verificar que el usuario tenga el rol de PEC
    if (!session.user.roles.includes('PEC')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }    // Obtener parámetros de la URL
    const carreraCursoId = req.nextUrl.searchParams.get('carreraCursoId');
    const exportToExcel = req.nextUrl.searchParams.get('export') === 'excel';
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '10');
    const searchTerm = req.nextUrl.searchParams.get('search');
    
    if (!carreraCursoId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de carrera-curso' },
        { status: 400 }
      );
    }

    // Verificar que el PEC tenga acceso a este carrera-curso
    const carreraCurso = await prisma.pecCarreraCurso.findFirst({
      where: {
        id: carreraCursoId,
        pecId: session.user.id,
      },
      include: {
        carrera: true,
      },
    }) as CarreraCurso | null;

    if (!carreraCurso) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta carrera-curso' },
        { status: 403 }
      );
    }    // Obtener los alumnos de esta carrera-curso con sus datos de asistencia
    // Buscar primero los planes de estudio para la carrera y curso
    const alumnosPlanes = await prisma.alumnoPlan.findMany({
      where: {
        plandeEstudios: {
          carreraId: carreraCurso.carreraId,
        },
        // El curso está en la relación con el plan de estudios
      },
      include: {
        user: true,
      },
    });    const alumnosIds = alumnosPlanes.map(plan => plan.alumno_id);
    
    // Calcular el total de alumnos para la paginación
    const totalAlumnos = await prisma.user.count({
      where: {
        id: {
          in: alumnosIds,
        },
      },
    });
      // Calcular límites para paginación
    const skip = (page - 1) * pageSize;
    // No aplicar paginación si se está exportando a Excel
    const take = exportToExcel ? undefined : pageSize;    // Construir la condición para búsqueda si existe término
    let whereCondition: WhereCondition = {
      id: {
        in: alumnosIds,
      }
    };
    
    // Añadir condición de búsqueda si existe
    if (searchTerm) {
      whereCondition = {
        AND: [
          whereCondition,
          {
            OR: [
              { name: { contains: searchTerm } },
              { surname1: { contains: searchTerm } },
              { surname2: { contains: searchTerm } },
              { email: { contains: searchTerm } }
            ]
          }
        ]
      };
    }    // Ahora obtener los alumnos completos con sus datos
    const alumnos = await prisma.user.findMany({
      where: whereCondition,
      skip: searchTerm ? 0 : skip, // Si hay búsqueda, no aplicar skip para buscar en todos
      take: searchTerm ? undefined : take, // Si hay búsqueda, no limitar resultados
      select: {
        id: true,
        name: true,
        surname1: true,
        surname2: true,
        email: true,
        userRoles: {
          include: {
            role: true
          }
        },
        AsistenciaAlumno: {
          orderBy: {
            fecha: 'desc',
          },
          take: 30, // Últimos 30 registros de asistencia
          include: {
            estadoAsistencia: true,
            sesionClase: true,
          },
        },
      },    }) as unknown as AlumnoUser[];
    
    // Procesar los datos para el formato requerido
    const alumnosConAsistencia = alumnos.map((alumno: AlumnoUser) => {      
      // Verificar que AsistenciaAlumno existe y convertirlo a un array
      const asistencias = alumno.AsistenciaAlumno || [];
      
      // Calcular el porcentaje de asistencia
      const totalSesiones = asistencias.length;
      const asistenciasPresentes = asistencias.filter((a: AsistenciaAlumno) => 
        a.estadoAsistencia?.codigo === 'PRESENTE' || a.estadoAsistencia?.codigo === 'JUSTIFICADO'
      ).length;
        const asistenciaPorcentaje = totalSesiones > 0 
        ? Math.round((asistenciasPresentes / totalSesiones) * 100) 
        : 0;
      
      // Determinar el estado basado en el porcentaje
      let estado: 'normal' | 'warning' | 'danger' = 'normal';
      if (asistenciaPorcentaje < 60) {
        estado = 'danger';
      } else if (asistenciaPorcentaje < 80) {
        estado = 'warning';
      }      // Obtener la fecha de última asistencia
      const ultimaAsistencia = asistencias[0]?.fecha 
        ? new Date(asistencias[0].fecha).toISOString().split('T')[0]
        : null;      // Contar el número de faltas (no asistencias sin justificar)
      const faltas = asistencias.filter((a: AsistenciaAlumno) => 
        a.estadoAsistencia?.codigo === 'AUSENTE' && !a.justificado
      ).length;      // Verificar si el alumno tiene el rol GOE
      const tieneRolGOE = alumno.userRoles?.some((userRole: UserRole) => 
        userRole.role?.name === 'GOE'
      ) || false;
      
      return {
        id: alumno.id,
        name: alumno.name,
        surname1: alumno.surname1,
        surname2: alumno.surname2 || '',
        email: alumno.email || '',
        goe: tieneRolGOE, // Indicador basado en si tiene el rol GOE
        asistencia: asistenciaPorcentaje,
        faltas: faltas,
        ultimaAsistencia: ultimaAsistencia,
        estado: estado
      };
    });
      // Registrar la actividad
    await logActivity({
      req,
      action: 'update',
      entityType: 'PEC_ALUMNOS_ASISTENCIA',
      entityId: carreraCursoId,
      details: `El PEC ha ${exportToExcel ? 'exportado a Excel' : 'consultado'} la lista de alumnos con asistencia para ${carreraCurso.carrera.denominacion} - ${carreraCurso.curso}° curso`,
    });

    // Si se solicita exportar a Excel
    if (exportToExcel) {
      const excelData = generarExcelAlumnos(alumnosConAsistencia, carreraCurso);
      
      // Responder con los datos en formato que pueda ser interpretado como Excel por el cliente
      return new NextResponse(excelData, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="alumnos-asistencia-${carreraCurso.carrera.denominacion.replace(/\s/g, '-')}-${carreraCurso.curso}-curso.xlsx"`,
        },
      });
    }

    // Respuesta normal con paginación
    return NextResponse.json({
      data: alumnosConAsistencia,
      pagination: {
        page,
        pageSize,
        total: totalAlumnos,
        totalPages: Math.ceil(totalAlumnos / pageSize)
      }
    });
  } catch (error) {
    console.error('Error al obtener alumnos con asistencia:', error);
    return NextResponse.json(
      { error: 'Error al obtener los datos' },
      { status: 500 }
    );
  }
}

// Función para generar un archivo Excel con los datos de alumnos
function generarExcelAlumnos(alumnos: AlumnoConAsistencia[], carreraCurso: CarreraCurso): Buffer {
  // Crear un libro de trabajo
  const workbook = xlsx.utils.book_new();
  
  // Formatear los datos para el Excel
  const excelData = alumnos.map((alumno, index) => ({
    'Nº': index + 1,
    'Nombre': alumno.name,
    'Primer Apellido': alumno.surname1,
    'Segundo Apellido': alumno.surname2 || '',
    'Email': alumno.email,
    'GOE': alumno.goe ? 'Sí' : 'No',
    'Asistencia (%)': alumno.asistencia,
    'Faltas': alumno.faltas,
    'Última Asistencia': alumno.ultimaAsistencia || 'No registrada',
    'Estado': alumno.estado === 'danger' ? 'Crítico' : alumno.estado === 'warning' ? 'Advertencia' : 'Normal'
  }));
  
  // Crear una hoja de trabajo con los datos
  const worksheet = xlsx.utils.json_to_sheet(excelData);
  
  // Ajustar el ancho de las columnas
  const columnsWidth = [
    { wch: 5 },   // Nº
    { wch: 20 },  // Nombre
    { wch: 20 },  // Primer Apellido
    { wch: 20 },  // Segundo Apellido
    { wch: 30 },  // Email
    { wch: 8 },   // GOE
    { wch: 15 },  // Asistencia (%)
    { wch: 10 },  // Faltas
    { wch: 15 },  // Última Asistencia
    { wch: 15 },  // Estado
  ];
  
  worksheet['!cols'] = columnsWidth;
  
  // Añadir la hoja al libro
  xlsx.utils.book_append_sheet(
    workbook, 
    worksheet, 
    `${carreraCurso.carrera.denominacion} - ${carreraCurso.curso}º curso`.substring(0, 31)
  );
  
  // Convertir el libro a un buffer
  const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return excelBuffer;
}
