import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener todas las escuelas
export async function GET() {
  try {
    const escuelas = await prisma.escuela.findMany({
      orderBy: {
        denominacion: 'asc',
      },
    });

    return NextResponse.json(escuelas, { status: 200 });
  } catch (error) {
    console.error('Error al obtener las escuelas:', error);
    return NextResponse.json(
      { error: 'Error al obtener las escuelas' },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva escuela (manual o automático)
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

    // MODO AUTOMÁTICO: Crear escuelas desde OfertaAcademica
    if (isAutomaticMode) {
      // Buscar todas las denominaciones disponibles en la tabla OfertaAcademica
      const ofertasAcademicas = await prisma.ofertaAcademica.findMany({
        select: {
          DENOMINACION: true,
        },
        distinct: ['DENOMINACION'],
        where: {
          DENOMINACION: {
            not: null,
          },
        },
      });

      // Si no hay datos, retornar error
      if (ofertasAcademicas.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron denominaciones de escuelas en la tabla OfertaAcademica' },
          { status: 404 }
        );
      }

      // Resultados para el reporte
      const resultados: {
        procesados: number;
        creados: number;
        errores: string[];
        yaExistentes: string[];
        detalles: {
          escuela: string;
          accion: string;
        }[];
      } = {
        procesados: 0,
        creados: 0,
        errores: [],
        yaExistentes: [],
        detalles: []
      };

      // Procesar cada denominación encontrada
      for (const oferta of ofertasAcademicas) {
        const denominacion = oferta.DENOMINACION;
        resultados.procesados++;

        if (!denominacion) {
          resultados.errores.push('Se encontró un registro con DENOMINACION nula');
          continue;
        }

        // Verificar si la escuela ya existe
        const escuelaExistente = await prisma.escuela.findFirst({
          where: {
            denominacion: denominacion
          }
        });

        if (escuelaExistente) {
          resultados.yaExistentes.push(denominacion);
          continue;
        }

        try {
          // Crear nueva escuela
          await prisma.escuela.create({
            data: {
              denominacion: denominacion
            }
          });

          resultados.creados++;
          resultados.detalles.push({
            escuela: denominacion,
            accion: "creada"
          });
        } catch (error: unknown) {
          resultados.errores.push(`Error al crear la escuela ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return NextResponse.json(
        {
          mensaje: `Proceso completado: ${resultados.creados} escuelas creadas, ${resultados.yaExistentes.length} ya existentes, ${resultados.errores.length} errores.`,
          resultados
        },
        { status: 200 }
      );
    }

    // MODO MANUAL: Crear una escuela específica
    const { denominacion } = body || {};

    // Validar que la denominación sea obligatoria
    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es obligatoria' },
        { status: 400 }
      );
    }

    // Verificar si la escuela ya existe
    const escuelaExistente = await prisma.escuela.findFirst({
      where: {
        denominacion: denominacion
      }
    });

    if (escuelaExistente) {
      return NextResponse.json(
        {
          error: 'La escuela ya existe',
          escuela: escuelaExistente
        },
        { status: 409 } // 409 Conflict - el recurso ya existe
      );
    }

    // Crear nueva escuela

    return NextResponse.json({
      message: 'Escuela creada correctamente',
      escuela: await prisma.escuela.create({
        data: { denominacion }
      })
    }, { status: 201 });

  } catch (error) {
    console.error('Error al crear la escuela:', error);
    return NextResponse.json(
      { error: 'Error al crear la escuela' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una escuela existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, denominacion } = body || {};

    // Validaciones básicas
    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la escuela es obligatorio' },
        { status: 400 }
      );
    }

    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es obligatoria' },
        { status: 400 }
      );
    }

    // Verificar si la escuela existe
    const escuelaExistente = await prisma.escuela.findUnique({
      where: {
        id: parseInt(id)
      }
    });

    if (!escuelaExistente) {
      return NextResponse.json(
        { error: 'La escuela no existe' },
        { status: 404 }
      );
    }

    // Verificar si ya existe otra escuela con la misma denominación
    const escuelaConMismaDenom = await prisma.escuela.findFirst({
      where: {
        denominacion: denominacion,
        id: { not: parseInt(id) }
      }
    });

    if (escuelaConMismaDenom) {
      return NextResponse.json(
        { error: 'Ya existe otra escuela con esta denominación' },
        { status: 409 }
      );
    }

    // Actualizar la escuela
    const escuelaActualizada = await prisma.escuela.update({
      where: {
        id: parseInt(id)
      },
      data: {
        denominacion
      }
    });

    return NextResponse.json({
      message: 'Escuela actualizada correctamente',
      escuela: escuelaActualizada
    }, { status: 200 });

  } catch (error) {
    console.error('Error al actualizar la escuela:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la escuela' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una escuela
export async function DELETE(request: NextRequest) {
  try {
    // Obtener el ID de la URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'El ID de la escuela es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si la escuela existe
    const escuela = await prisma.escuela.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        Carrera: true
      }
    });

    if (!escuela) {
      return NextResponse.json(
        { error: 'La escuela no existe' },
        { status: 404 }
      );
    }

    // Comprobar si la escuela tiene carreras asociadas
    if (escuela.Carrera.length > 0) {
      return NextResponse.json(
        {
          error: 'No se puede eliminar la escuela porque tiene carreras asociadas',
          carreras: escuela.Carrera.length
        },
        { status: 400 }
      );
    }

    // Eliminar la escuela
    await prisma.escuela.delete({
      where: {
        id: parseInt(id)
      }
    });

    return NextResponse.json({
      message: 'Escuela eliminada correctamente'
    }, { status: 200 });

  } catch (error) {
    console.error('Error al eliminar la escuela:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la escuela' },
      { status: 500 }
    );
  }
}
