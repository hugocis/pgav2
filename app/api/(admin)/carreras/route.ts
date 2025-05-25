import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Función para extraer denominación de carrera y códigos de plan de estudios
function extraerDenominacionYCodigoPlan(carreraTexto: string): { denominacion: string; codigos: string[] } {
  // Buscar un patrón donde los códigos suelen estar al final después de "Plan YYYY"
  const regex = /^(.*?)(?:\s*\(Plan\s+\d{4}\))?\s*((?:G[A-Z]+\d+(?:,\s*G[A-Z]+\d+)*)|(?:[A-Z]+\d+(?:,\s*[A-Z]+\d+)*))$/;
  const match = carreraTexto.match(regex);

  if (match && match[1] && match[2]) {
    // Extraer denominación y códigos separados por comas
    const denominacion = match[1].trim();
    // Separar los códigos que pueden venir como "GMA2, GMA0, GMA9"
    const codigos = match[2].split(',').map(codigo => codigo.trim());

    return {
      denominacion: denominacion,
      codigos: codigos
    };
  }

  // Si no coincide el patrón, intentar identificar el código como la última parte después del último espacio
  const ultimoEspacio = carreraTexto.lastIndexOf(' ');
  if (ultimoEspacio !== -1) {
    const posibleCodigo = carreraTexto.substring(ultimoEspacio + 1).trim();
    const posibleDenom = carreraTexto.substring(0, ultimoEspacio).trim();

    // Si el posible código parece un código de plan de estudios (letras y números)
    if (/^[A-Z0-9]+$/.test(posibleCodigo)) {
      return {
        denominacion: posibleDenom,
        codigos: [posibleCodigo]
      };
    }
  }

  // Si no se puede extraer un código claro, devolver todo como denominación y un código genérico
  return {
    denominacion: carreraTexto.trim(),
    codigos: [carreraTexto.substring(0, 3).toUpperCase()]
  };
}

// GET - Obtener todas las carreras
// Si el usuario es Admin, devuelve todas las carreras
// Si el usuario es Manager, devuelve solo las carreras asignadas a ese manager
// Acepta parámetro managerId para filtrar carreras por un manager específico (solo para admins)
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const url = new URL(req.url);
    // Permitir obtener carreras para un manager específico (útil para admins)
    const managerId = url.searchParams.get('managerId');
    
    const isManager = session.user.roles.includes('Manager');
    const isAdmin = session.user.roles.includes('Admin');

    // Si se proporciona managerId, verificar autorización
    if (managerId) {
      // Solo admins pueden consultar carreras de managers específicos
      if (managerId !== session.user.id && !isAdmin) {
        return NextResponse.json({ error: 'No autorizado para ver carreras de otro manager' }, { status: 403 });
      }
      
      // Obtener las asignaciones del manager específico
      const managerCarreras = await prisma.managerCarrera.findMany({
        where: {
          managerId: managerId,
          activo: true
        },
        include: {
          carrera: {
            include: {
              escuela: true,
              ConfiguracionCarrera: true,
              PlanDeEstudios: true
            }
          }
        },
        orderBy: {
          carrera: {
            denominacion: 'asc'
          }
        }
      });

      const carreras = managerCarreras.map(mc => mc.carrera);
      return NextResponse.json(carreras, { status: 200 });
    }

    // Si es manager y no es admin, mostrar solo sus carreras asignadas
    if (isManager && !isAdmin) {
      const managerCarreras = await prisma.managerCarrera.findMany({
        where: {
          managerId: session.user.id,
          activo: true
        },
        include: {
          carrera: {
            include: {
              escuela: true,
              ConfiguracionCarrera: true,
              PlanDeEstudios: true
            }
          }
        },
        orderBy: {
          carrera: {
            denominacion: 'asc'
          }
        }
      });

      const carreras = managerCarreras.map(mc => mc.carrera);
      return NextResponse.json(carreras, { status: 200 });
    }

    // Para Admin u otros roles autorizados, mostrar todas las carreras
    const carreras = await prisma.carrera.findMany({
      include: {
        escuela: true,
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      },
      orderBy: {
        denominacion: 'asc',
      },
    });

    return NextResponse.json(carreras, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las carreras:', error);
    return NextResponse.json(
      { error: 'Error al obtener las carreras' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva carrera (manual o automático)
export async function POST(request: NextRequest) {
  try {
    // Intentar obtener el cuerpo de la solicitud
    let body;
    let isAutomaticMode = false;

    try {
      body = await request.json();
      // Si el cuerpo está vacío o es un objeto vacío, activar el modo automático
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        isAutomaticMode = true;
      }
    } catch {
      // Si hay error al parsear JSON (cuerpo vacío), activar el modo automático
      isAutomaticMode = true;
    }

    // MODO MANUAL: Crear carrera con datos proporcionados
    if (!isAutomaticMode) {
      const { denominacion, escuelaId, planesDeEstudio } = body;

      // Validar datos obligatorios
      if (!denominacion || !escuelaId) {
        return NextResponse.json(
          { error: 'Denominación y escuelaId son campos obligatorios' },
          { status: 400 }
        );
      }

      // Verificar que la escuela existe
      const escuelaExistente = await prisma.escuela.findUnique({
        where: { id: escuelaId }
      });

      if (!escuelaExistente) {
        return NextResponse.json(
          { error: 'La escuela especificada no existe' },
          { status: 404 }
        );
      }

      // Verificar si la carrera ya existe
      const carreraExistente = await prisma.carrera.findFirst({
        where: {
          AND: [
            { denominacion },
            { escuelaId: escuelaId }
          ]
        }
      });

      if (carreraExistente) {
        return NextResponse.json(
          { error: 'Ya existe una carrera con esta denominación en la misma escuela' },
          { status: 409 }
        );
      }

      // Crear la carrera
      const nuevaCarrera = await prisma.carrera.create({
        data: {
          denominacion,
          escuelaId: escuelaId,
        }
      });

      await logActivity({
        req: request,
        action: 'create',
        entityType: 'carrera',
        entityId: nuevaCarrera.id,
        details: `Creación manual de carrera '${denominacion}' en escuela '${escuelaExistente?.denominacion}'`
      });

      // Crear automáticamente la configuración de carrera
      await prisma.configuracionCarrera.create({
        data: {
          SolDispensa: false,
          SolJustificacion: false,
          carreraId: nuevaCarrera.id
        }
      });

      await logActivity({
        req: request,
        action: 'create',
        entityType: 'configuracionCarrera',
        entityId: nuevaCarrera.id,
        details: `Configuración de carrera creada para '${denominacion}'`
      });


      // Crear planes de estudio si se proporcionan
      if (planesDeEstudio && Array.isArray(planesDeEstudio) && planesDeEstudio.length > 0) {
        for (const plan of planesDeEstudio) {
          if (!plan.denominacion || !plan.codPlan) continue;

          await prisma.planDeEstudios.create({
            data: {
              denominacion: plan.denominacion,
              codPlan: plan.codPlan,
              carreraId: nuevaCarrera.id
            }
          });

          await logActivity({
            req: request,
            action: 'create',
            entityType: 'planDeEstudios',
            details: `Plan de estudios '${plan.codPlan}' creado para carrera '${denominacion}'`
          });
        }
      } else {
        // Si no se proporcionan planes, crear uno por defecto con la misma denominación
        await prisma.planDeEstudios.create({
          data: {
            denominacion: denominacion,
            codPlan: denominacion.substring(0, 5).toUpperCase().replace(/\s+/g, ''),
            carreraId: nuevaCarrera.id
          }
        });

        await logActivity({
          req: request,
          action: 'create',
          entityType: 'planDeEstudios',
          details: `Plan de estudios por defecto creado para carrera '${denominacion}'`
        });
      }

      return NextResponse.json(
        {
          message: 'Carrera creada correctamente',
          carrera: nuevaCarrera
        },
        { status: 201 }
      );
    }

    // MODO AUTOMÁTICO: Crear carreras desde OfertaAcademica
    else {
      // Verificar que la tabla OfertaAcademica tiene datos
      const countOfertas = await prisma.ofertaAcademica.count();
      if (countOfertas === 0) {
        return NextResponse.json(
          { error: 'No hay datos en la tabla OfertaAcademica para importar' },
          { status: 404 }
        );
      }

      // Obtener todas las ofertas académicas con CARRERAS disponibles
      const ofertasAcademicas = await prisma.ofertaAcademica.findMany({
        select: {
          CARRERAS: true,
          DENOMINACION: true
        },
        where: {
          CARRERAS: {
            not: null,
          }
        }
      });

      // Resultados para el reporte
      const resultados: {
        procesados: number;
        creados: {
          carreras: number;
          planes: number;
        };
        errores: string[];
        yaExistentes: string[];
        detalles: {
          carrera: string;
          escuela: string;
          planes: {
            codigo: string;
            accion: string;
          }[];
          accion: string;
        }[];
      } = {
        procesados: 0,
        creados: {
          carreras: 0,
          planes: 0
        },
        errores: [],
        yaExistentes: [],
        detalles: []
      };

      // Procesar cada carrera encontrada
      for (const oferta of ofertasAcademicas) {
        if (!oferta.CARRERAS || !oferta.DENOMINACION) continue;
        resultados.procesados++;

        // Obtener el nombre de la escuela desde DENOMINACION
        const nombreEscuela = oferta.DENOMINACION;

        // Buscar o crear la escuela
        let escuela;
        try {
          // Hacer petición al endpoint de escuelas para buscar o crear la escuela
          const response = await fetch(`${request.nextUrl.origin}/api/escuelas`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ denominacion: nombreEscuela })
          });

          if (!response.ok) {
            // Si hay error al crear la escuela, intentar buscarla
            escuela = await prisma.escuela.findFirst({
              where: {
                denominacion: nombreEscuela
              }
            });

            if (!escuela) {
              resultados.errores.push(`No se pudo crear ni encontrar la escuela ${nombreEscuela}`);
              continue;
            }
          } else {
            const data = await response.json();
            escuela = data.escuela;
          }
        } catch {
          // Si falla la petición, intentar buscar directamente en la BD
          escuela = await prisma.escuela.findFirst({
            where: {
              denominacion: nombreEscuela
            }
          });

          if (!escuela) {
            try {
              escuela = await prisma.escuela.create({
                data: {
                  denominacion: nombreEscuela
                }
              });

              await logActivity({
                req: request,
                action: 'create',
                entityType: 'escuela',
                entityId: escuela.id,
                details: `Escuela creada automáticamente con nombre '${nombreEscuela}' desde OfertaAcademica`
              });

            } catch (e) {
              resultados.errores.push(`Error al crear la escuela ${nombreEscuela}: ${e}`);
              continue;
            }
          }
        }

        // Extraer denominación y códigos de plan de la carrera
        const { denominacion, codigos } = extraerDenominacionYCodigoPlan(oferta.CARRERAS);

        // Verificar si la carrera ya existe
        const carreraExistente = await prisma.carrera.findFirst({
          where: {
            AND: [
              { denominacion },
              { escuelaId: escuela.id }
            ]
          },
          include: {
            PlanDeEstudios: true
          }
        });

        // Preparar objeto de detalle
        const detalle = {
          carrera: denominacion,
          escuela: nombreEscuela,
          planes: [] as { codigo: string; accion: string; }[],
          accion: ""
        };

        // Si la carrera ya existe
        if (carreraExistente) {
          resultados.yaExistentes.push(denominacion);
          detalle.accion = "Ya existente";

          // Verificar y crear planes de estudio que no existan
          for (const codigo of codigos) {
            const planExistente = carreraExistente.PlanDeEstudios.find(
              plan => plan.codPlan === codigo
            );

            if (!planExistente) {
              try {
                await prisma.planDeEstudios.create({
                  data: {
                    denominacion,
                    codPlan: codigo,
                    carreraId: carreraExistente.id
                  }
                });

                await logActivity({
                  req: request,
                  action: 'create',
                  entityType: 'planDeEstudios',
                  details: `Plan de estudios '${codigo}' creado automáticamente para carrera '${denominacion}'`
                });

                resultados.creados.planes++;
                detalle.planes.push({
                  codigo: codigo,
                  accion: "Creado"
                });
              } catch (error) {
                resultados.errores.push(`Error al crear el plan ${codigo} para la carrera ${denominacion}: ${error}`);
              }
            } else {
              detalle.planes.push({
                codigo: codigo,
                accion: "Ya existente"
              });
            }
          }
        } else {
          try {
            // Crear la carrera
            const nuevaCarrera = await prisma.carrera.create({
              data: {
                denominacion,
                escuelaId: escuela.id
              }
            });

            await logActivity({
              req: request,
              action: 'create',
              entityType: 'carrera',
              entityId: nuevaCarrera.id,
              details: `Importación automática de carrera '${denominacion}' desde OfertaAcademica en escuela '${escuela.denominacion}'`
            });

            // Crear automáticamente la configuración de carrera
            await prisma.configuracionCarrera.create({
              data: {
                SolDispensa: false,
                SolJustificacion: false,
                carreraId: nuevaCarrera.id
              }
            });

            await logActivity({
              req: request,
              action: 'create',
              entityType: 'configuracionCarrera',
              entityId: nuevaCarrera.id,
              details: `Configuración de carrera creada automáticamente para '${denominacion}'`
            });

            resultados.creados.carreras++;
            detalle.accion = "Creada";

            // Crear los planes de estudio para la carrera
            for (const codigo of codigos) {
              try {
                await prisma.planDeEstudios.create({
                  data: {
                    denominacion,
                    codPlan: codigo,
                    carreraId: nuevaCarrera.id
                  }
                });

                await logActivity({
                  req: request,
                  action: 'create',
                  entityType: 'planDeEstudios',
                  details: `Plan de estudios '${codigo}' creado automáticamente para carrera '${denominacion}'`
                });
                
                resultados.creados.planes++;
                detalle.planes.push({
                  codigo: codigo,
                  accion: "Creado"
                });
              } catch (error) {
                resultados.errores.push(`Error al crear el plan ${codigo} para la carrera ${denominacion}: ${error}`);
              }
            }
          } catch (error) {
            resultados.errores.push(`Error al crear la carrera ${denominacion}: ${error}`);
          }
        }

        resultados.detalles.push(detalle);
      }

      return NextResponse.json({
        message: 'Proceso de importación de carreras completado',
        resultado: resultados
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
