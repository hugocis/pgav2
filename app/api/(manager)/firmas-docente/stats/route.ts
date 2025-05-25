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

    // Obtener parámetros de filtrado para estadísticas
    const searchParams = req.nextUrl.searchParams;
    const dateFromStr = searchParams.get('dateFrom') || undefined;
    const dateToStr = searchParams.get('dateTo') || undefined;
    const carreraId = searchParams.get('carreraId') || undefined;

    // Convertir fechas si están presentes
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (dateFromStr) {
      dateFrom = new Date(dateFromStr);
      // Establece la hora a las 00:00:00
      dateFrom.setHours(0, 0, 0, 0);
    }

    if (dateToStr) {
      dateTo = new Date(dateToStr);
      // Establece la hora a las 23:59:59
      dateTo.setHours(23, 59, 59, 999);
    }

    // Si no se proporcionan fechas, establecer un rango por defecto (último mes)
    if (!dateFrom && !dateTo) {
      dateTo = new Date();
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
    }

    // Filtros base para las consultas
    const baseFilter = {
      fecha: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
      ...(carreraId && {
        grupo: {
          asignatura: {
            carreraId: carreraId
          }
        }
      })
    };

    // 1. Total de sesiones firmadas
    const totalSesiones = await prisma.sesionClase.count({
      where: baseFilter,
    });

    // 2. Sesiones por día (para gráfico de tendencia)
    const sesionesPorDia = await prisma.$queryRaw`
      SELECT 
        DATE(fecha) as dia,
        COUNT(*) as total
      FROM SesionClase
      WHERE fecha >= ${dateFrom} AND fecha <= ${dateTo}
      ${carreraId ? `AND grupoId IN (
        SELECT g.id FROM Grupo g
        JOIN Asignatura a ON g.asignaturaId = a.id
        WHERE a.carreraId = ${carreraId}
      )` : 'GROUP BY DATE(fecha)'}
      ORDER BY dia ASC
    `;

    // 3. Top 10 profesores con más sesiones firmadas
    const topProfesores = await prisma.sesionClase.groupBy({
      by: ['docenteId'],
      where: baseFilter,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Obtener detalles de los profesores
    const profesoresDetails = await Promise.all(
      topProfesores.map(async (prof) => {
        const docente = await prisma.user.findUnique({
          where: { id: prof.docenteId },
          select: { 
            id: true,
            name: true, 
            surname1: true,
            surname2: true, 
            email: true 
          }
        });
        
        return {
          id: docente?.id,
          nombre: `${docente?.name || ''} ${docente?.surname1 || ''} ${docente?.surname2 || ''}`.trim(),
          email: docente?.email,
          totalSesiones: prof._count.id
        };
      })
    );

    // 4. Distribución de sesiones por asignatura (Top 10)
    const sesionesAsignatura = await prisma.sesionClase.groupBy({
      by: ['grupoId'],
      where: baseFilter,
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    const asignaturasDetails = await Promise.all(
      sesionesAsignatura.map(async (item) => {
        const grupo = await prisma.grupo.findUnique({
          where: { id: item.grupoId },
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
        });

        return {
          grupoId: item.grupoId,
          asignaturaId: grupo?.asignaturaId,
          asignaturaNombre: grupo?.asignatura.Denominacion || 'Sin nombre',
          asignaturaCodigo: grupo?.asignatura.CodAsignatura || 'N/A',
          carreraNombre: grupo?.asignatura.carrera.denominacion || 'Sin carrera',
          totalSesiones: item._count.id
        };
      })
    );

    // 5. Distribución por hora del día
    const sesionesPorHora = await prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM fecha) as hora,
        COUNT(*) as total
      FROM SesionClase
      WHERE fecha >= ${dateFrom} AND fecha <= ${dateTo}
      ${carreraId ? `AND grupoId IN (
        SELECT g.id FROM Grupo g
        JOIN Asignatura a ON g.asignaturaId = a.id
        WHERE a.carreraId = ${carreraId}
      )` : ''}
      GROUP BY EXTRACT(HOUR FROM fecha)
      ORDER BY hora ASC
    `;

    // 6. Distribución por día de la semana
    interface DiaSemanaStats {
      diasemana: number;
      total: number;
    }
    
    const sesionesPorDiaSemana = await prisma.$queryRaw<DiaSemanaStats[]>`
      SELECT 
        EXTRACT(DOW FROM fecha) as diaSemana,
        COUNT(*) as total
      FROM SesionClase
      WHERE fecha >= ${dateFrom} AND fecha <= ${dateTo}
      ${carreraId ? `AND grupoId IN (
        SELECT g.id FROM Grupo g
        JOIN Asignatura a ON g.asignaturaId = a.id
        WHERE a.carreraId = ${carreraId}
      )` : ''}
      GROUP BY EXTRACT(DOW FROM fecha)
      ORDER BY diaSemana ASC
    `;

    // 7. Calcular estadísticas adicionales
    // Profesores únicos que han firmado
    const profesoresUnicos = await prisma.sesionClase.groupBy({
      by: ['docenteId'],
      where: baseFilter,
    });

    // Asignaturas únicas con sesiones firmadas
    const asignaturasUnicas = await prisma.sesionClase.groupBy({
      by: ['grupoId'],
      where: baseFilter,
    });

    // 8. Sesiones recientes (últimas 10)
    const sesionesRecientes = await prisma.sesionClase.findMany({
      where: baseFilter,
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
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 10
    });

    const sesionesFormateadas = sesionesRecientes.map(sesion => ({
      id: sesion.id,
      docenteId: sesion.user.id,
      docenteNombre: `${sesion.user.name || ''} ${sesion.user.surname1 || ''} ${sesion.user.surname2 || ''}`.trim(),
      docenteEmail: sesion.user.email,
      asignaturaNombre: sesion.grupo.asignatura.Denominacion,
      asignaturaCodigo: sesion.grupo.asignatura.CodAsignatura,
      carrera: sesion.grupo.asignatura.carrera.denominacion,
      fecha: sesion.fecha.toISOString(),
      createdAt: sesion.createdAt.toISOString()
    }));

    // Construir y devolver la respuesta completa
    const stats = {
      totalSesiones,
      totalProfesoresUnicos: profesoresUnicos.length,
      totalAsignaturasUnicas: asignaturasUnicas.length,
      sesionesPorDia,
      profesoresTop: profesoresDetails,
      asignaturasTop: asignaturasDetails,
      sesionesPorHora,
      sesionesPorDiaSemana: sesionesPorDiaSemana.map((item: DiaSemanaStats) => ({
        diaSemana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][item.diasemana] || `Día ${item.diasemana}`,
        total: item.total
      })),
      sesionesRecientes: sesionesFormateadas,
      periodoConsultado: {
        desde: dateFrom?.toISOString(),
        hasta: dateTo?.toISOString()
      }
    };    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error en estadísticas de firmas docentes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
