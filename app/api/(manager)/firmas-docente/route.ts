import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// GET - Obtener firmas docentes con filtros
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.roles.includes('Manager')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const carreraId = searchParams.get('carreraId');
    const docenteId = searchParams.get('docenteId');
    const firmadas = searchParams.get('firmadas');

    // Obtener fecha para filtrar
    let fechaInicio: Date;
    let fechaFin: Date;
    
    // Filtro por fecha (si se proporciona)
    if (fecha) {
      fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      
      fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);
    } else {
      // Si no se proporciona fecha, por defecto se muestra el día actual
      fechaInicio = new Date();
      fechaInicio.setHours(0, 0, 0, 0);
      
      fechaFin = new Date();
      fechaFin.setHours(23, 59, 59, 999);
    }
    
    // Obtener el día de la semana (0 = Domingo, 1 = Lunes, etc.)
    const diaSemana = fechaInicio.getDay();
    const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const nombreDia = nombresDias[diaSemana];
    
    // Filtros para las sesiones existentes
    const where: {
      fecha?: { gte: Date; lte: Date };
      grupo?: { asignatura: { carreraId: string } };
      docenteId?: string;
      FirmaDocente?: { isNot: null } | null;
    } = {
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    };

    // Filtro por carrera
    if (carreraId) {
      where.grupo = {
        asignatura: {
          carreraId: carreraId
        }
      };
    }

    // Filtro por docente
    if (docenteId) {
      where.docenteId = docenteId;
    }

    // Filtro por estado de firma
    // Este filtro solo se usa para la consulta inicial de sesiones existentes
    // Para los filtros 'programada' y 'pendiente' usamos la lógica posterior
    if (firmadas === 'true') {
      where.FirmaDocente = { 
        isNot: null 
      };
    } else if (firmadas === 'false') {
      where.FirmaDocente = null;
    }
    // No aplicamos filtros aquí para 'programada' o 'pendiente' porque necesitamos obtener todas
    // las sesiones primero y luego filtrar por estadoFirma

    // Obtener las carreras asignadas al manager para filtrar
    let carreraIdsFilter: string[] = [];
    if (carreraId) {
      carreraIdsFilter = [carreraId];
    } else {
      const managerCarreras = await prisma.managerCarrera.findMany({
        where: {
          managerId: session.user.id,
          activo: true
        },
        select: {
          carreraId: true
        }
      });
      carreraIdsFilter = managerCarreras.map(mc => mc.carreraId);
    }

    // Ahora invertimos el proceso: primero obtenemos todos los horarios programados 
    // para hoy según los horarios de los profesores, y luego verificamos cuáles ya tienen
    // sesiones creadas (firmadas o no)

    // 1. Buscar todos los horarios programados para hoy
    const horariosProfesor = await prisma.horariosProfesor.findMany({
      where: {
        [nombreDia]: {
          not: null
        },
        asignatura: {
          carreraId: {
            in: carreraIdsFilter
          }
        }
      },
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
        asignatura: {
          include: {
            carrera: true,
            Grupo: true
          }
        }
      }
    });

    // 2. Procesar los horarios y crear una lista de todas las sesiones programadas
    const sesionesCompletas: any[] = [];
    
    // 3. Procesar cada horario de profesor para generar todas las sesiones programadas
    for (const horario of horariosProfesor) {
      // Obtener el horario del día actual
      const horarioString = horario[nombreDia as keyof typeof horario] as string | null;
      if (!horarioString) continue;
      
      const franjas = horarioString.split(',');
      
      for (const franja of franjas) {
        if (!franja.trim()) continue;
        
        // Extraer la hora del horario (formato típico: "10:30-12:30")
        const horaMatch = franja.match(/(\d{1,2}):(\d{2})/);
        if (!horaMatch) continue;
        
        const hora = parseInt(horaMatch[1]);
        const minutos = parseInt(horaMatch[2]);
        
        // Para cada grupo de la asignatura
        for (const grupo of horario.asignatura.Grupo) {
          // Crear fecha y hora para esta sesión programada
          const fechaHora = new Date(fechaInicio);
          fechaHora.setHours(hora, minutos, 0, 0);
          
          // Crear un ID único para la sesión programada
          const idProgramada = `programada-${grupo.id}-${fechaHora.getTime()}`;
          
          // Añadir a la lista de sesiones con un objeto grupo válido
          sesionesCompletas.push({
            id: idProgramada,
            fecha: fechaHora,
            grupoId: grupo.id,
            docenteId: horario.profesorId,
            grupo: {
              id: grupo.id,
              denominacion: grupo.denominacion,
              asignatura: horario.asignatura,
              profesorId: horario.profesorId,
              asignaturaId: horario.asignaturaId
            },
            user: horario.user,
            FirmaDocente: null, // Por defecto no firmada
            createdAt: new Date(),
            updatedAt: new Date(),
            estadoFirma: 'programada' // Usaremos este campo para indicar el estado
          });
        }
      }
    }
    
    // 4. Ahora buscar las sesiones existentes (las que ya han sido pasadas/firmadas)
    const sesionesExistentes = await prisma.sesionClase.findMany({
      where,
      include: {
        grupo: {
          include: {
            asignatura: {
              include: {
                carrera: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        FirmaDocente: true
      },
      orderBy: {
        fecha: 'asc',
      },
    });
    
    // 5. Actualizar el estado de las sesiones programadas si ya existen reales
    // y agregar las que faltan
    const mapaSesionesExistentes = new Map();
    
    // Primero agregamos todas las sesiones existentes al mapa
    for (const sesion of sesionesExistentes) {
      const key = `${sesion.grupoId}-${new Date(sesion.fecha).getHours()}-${new Date(sesion.fecha).getMinutes()}`;
      mapaSesionesExistentes.set(key, sesion);
    }
    
    // Recorremos todas las programadas y verificamos si ya existe una real
    const sesionesFinales = [];
    for (const sesionProgramada of sesionesCompletas) {
      const fechaHora = new Date(sesionProgramada.fecha);
      const key = `${sesionProgramada.grupoId}-${fechaHora.getHours()}-${fechaHora.getMinutes()}`;
      
      // Si ya existe una real, usamos esa
      if (mapaSesionesExistentes.has(key)) {
        const sesionReal = mapaSesionesExistentes.get(key);
        // Verificamos si está firmada
        if (sesionReal.FirmaDocente) {
          sesionReal.estadoFirma = 'firmada';
        } else {
          sesionReal.estadoFirma = 'pendiente';
        }
        sesionesFinales.push(sesionReal);
        mapaSesionesExistentes.delete(key); // La eliminamos para no duplicar
      } else {
        // Si no existe, usamos la programada
        sesionesFinales.push(sesionProgramada);
      }
    }
    
    // Agregar cualquier sesión existente que no haya sido mapeada
    // (pueden haber sesiones en horarios no programados)
    for (const sesion of mapaSesionesExistentes.values()) {
      if (sesion.FirmaDocente) {
        sesion.estadoFirma = 'firmada';
      } else {
        sesion.estadoFirma = 'pendiente';
      }
      sesionesFinales.push(sesion);
    }
    
    // Ordenar todas las sesiones por hora
    sesionesFinales.sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // 6. Filtrar por estado de firma si se especifica
    let sesionesResultado = sesionesFinales;
    if (firmadas === 'true') {
      sesionesResultado = sesionesFinales.filter(s => s.estadoFirma === 'firmada');
    } else if (firmadas === 'false') {
      sesionesResultado = sesionesFinales.filter(s => s.estadoFirma === 'pendiente' || s.estadoFirma === 'programada');
    } else if (firmadas === 'programada') {
      sesionesResultado = sesionesFinales.filter(s => s.estadoFirma === 'programada');
    } else if (firmadas === 'pendiente') {
      sesionesResultado = sesionesFinales.filter(s => s.estadoFirma === 'pendiente');
    }
    
    // Agregamos logging para ayudar a depurar
    console.log(`Filtro aplicado: ${firmadas}, Sesiones encontradas: ${sesionesResultado.length}`);
    // Agregamos el detalle de estados para verificar los filtros
    const estadisticas = {
      total: sesionesFinales.length,
      firmadas: sesionesFinales.filter(s => s.estadoFirma === 'firmada').length,
      pendientes: sesionesFinales.filter(s => s.estadoFirma === 'pendiente').length,
      programadas: sesionesFinales.filter(s => s.estadoFirma === 'programada').length
    };
    console.log('Estadísticas de sesiones:', estadisticas);
    
    return NextResponse.json(sesionesResultado, { status: 200 });
  } catch (error) {
    console.error('Error al obtener firmas docentes:', error);
    return NextResponse.json(
      { error: 'Error al obtener firmas docentes' },
      { status: 500 }
    );
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
    const { id, comments } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Falta el ID de la firma' },
        { status: 400 }
      );
    }

    // En un sistema real, esto actualizaría el estado de la firma en la base de datos
    // Actualizar o crear firma según corresponda
    if (id.startsWith('programada-')) {
      // Para sesiones programadas, se crearía primero la sesión y luego la firma
      return NextResponse.json({
        success: true,
        message: `No se puede actualizar una sesión programada directamente. Primero debe pasarse lista.`
      });
    }
    
    // Para sesiones existentes, actualizamos o creamos la firma
    const firmaExistente = await prisma.firmaDocente.findUnique({
      where: { sesionClaseId: id }
    });
    
    if (firmaExistente) {
      // Actualizar firma existente
      await prisma.firmaDocente.update({
        where: { id: firmaExistente.id },
        data: {
          observaciones: comments
        }
      });
    } else {
      // Crear nueva firma
      await prisma.firmaDocente.create({
        data: {
          sesionClaseId: id,
          fechaFirma: new Date(),
          observaciones: comments
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Firma ${id} actualizada con comentarios: ${comments || 'ninguno'}`
    });
  } catch (error) {
    console.error('Error al actualizar firma:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
