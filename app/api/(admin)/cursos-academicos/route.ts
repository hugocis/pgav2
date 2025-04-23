import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los cursos académicos
export async function GET() {
  try {
    const cursosAcademicos = await prisma.cursoAcademico.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(cursosAcademicos, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los cursos académicos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los cursos académicos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo curso académico (manual o automático)
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
    
    // MODO AUTOMÁTICO: Crear cursos desde OfertaAcademica
    if (isAutomaticMode) {
      // Buscar todos los años académicos disponibles en la tabla OfertaAcademica
      const ofertasAcademicas = await prisma.ofertaAcademica.findMany({
        select: {
          ANY_ANYACA: true,
        },
        distinct: ['ANY_ANYACA'],
        where: {
          ANY_ANYACA: {
            not: null,
          },
        },
      });

      // Si no hay datos, retornar error
      if (ofertasAcademicas.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron años académicos en la tabla OfertaAcademica' },
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
          curso: string;
          accion: string;
          cursoAnterior: string | null;
          cursoSiguiente: string | null;
        }[];
      } = {
        procesados: 0,
        creados: 0,
        errores: [],
        yaExistentes: [],
        detalles: []
      };

      // Procesar cada año académico encontrado
      for (const oferta of ofertasAcademicas) {
        const anyAnyaca = oferta.ANY_ANYACA;
        resultados.procesados++;
        
        if (!anyAnyaca) {
          resultados.errores.push('Se encontró un registro con ANY_ANYACA nulo');
          continue;
        }

        // Validar el formato del año académico
        const formatoRegex = /^\d{4}-\d{2}$/;
        if (!formatoRegex.test(anyAnyaca)) {
          resultados.errores.push(`El formato "${anyAnyaca}" no es válido. Debe ser YYYY-YY (por ejemplo: 2025-26)`);
          continue;
        }
        
        // Verificar que el segundo año sea el siguiente al primero
        const [primerAño, segundoAñoAbreviado] = anyAnyaca.split('-');
        const primerAñoNum = parseInt(primerAño);
        const segundoAñoAbreviadoEsperado = (primerAñoNum + 1).toString().slice(-2);
        
        if (segundoAñoAbreviado !== segundoAñoAbreviadoEsperado) {
          resultados.errores.push(
            `El formato "${anyAnyaca}" no es válido. Para el año ${primerAño}, el segundo año debe ser ${segundoAñoAbreviadoEsperado} (${primerAñoNum}-${segundoAñoAbreviadoEsperado})`
          );
          continue;
        }

        // Verificar si el curso académico ya existe
        const cursoExistente = await prisma.cursoAcademico.findFirst({
          where: {
            denominacion: anyAnyaca
          }
        });

        if (cursoExistente) {
          resultados.yaExistentes.push(anyAnyaca);
          continue;
        }

        try {
          // Buscar todos los cursos académicos existentes
          const cursosAcademicos = await prisma.cursoAcademico.findMany({
            orderBy: {
              denominacion: 'asc'
            }
          });

          // Extraer el año inicial del nuevo curso académico
          const añoInicioNuevo = parseInt(anyAnyaca.split('-')[0]);
          
          // Determinar si hay un curso anterior o posterior
          let cursoAnterior: string | null = null;
          let cursoSiguiente: string | null = null;

          for (const curso of cursosAcademicos) {
            const añoInicioCurso = parseInt(curso.denominacion.split('-')[0]);
            
            if (añoInicioCurso < añoInicioNuevo && 
                (!cursoAnterior || parseInt(cursoAnterior.split('-')[0]) < añoInicioCurso)) {
              cursoAnterior = curso.denominacion;
            }
            
            if (añoInicioCurso > añoInicioNuevo && 
                (!cursoSiguiente || parseInt(cursoSiguiente.split('-')[0]) > añoInicioCurso)) {
              cursoSiguiente = curso.denominacion;
            }
          }          // Crear nuevo curso académico
          const nuevoCursoAuto = await prisma.cursoAcademico.create({
            data: {
              denominacion: anyAnyaca,
              activo: false, // Por defecto no está activo
              cursoAnterior,
              cursoSiguiente
            }
          });
          
          // Registrar la creación del curso académico en el log de actividades
          await logActivity({
            req: request,
            action: 'create',
            entityType: 'cursoAcademico',
            entityId: nuevoCursoAuto.id,
            details: `Creación automática del curso académico ${anyAnyaca}`
          });

          // Si existe un curso anterior, actualizarlo para que su cursoSiguiente sea el nuevo curso
          if (cursoAnterior) {
            await prisma.cursoAcademico.updateMany({
              where: { denominacion: cursoAnterior },
              data: { cursoSiguiente: anyAnyaca }
            });
          }

          // Si existe un curso siguiente, actualizarlo para que su cursoAnterior sea el nuevo curso
          if (cursoSiguiente) {
            await prisma.cursoAcademico.updateMany({
              where: { denominacion: cursoSiguiente },
              data: { cursoAnterior: anyAnyaca }
            });
          }

          resultados.creados++;
          resultados.detalles.push({
            curso: anyAnyaca,
            accion: "creado",
            cursoAnterior,
            cursoSiguiente
          });
        } catch (error: unknown) {
          resultados.errores.push(`Error al crear el curso ${anyAnyaca}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return NextResponse.json(
        { 
          mensaje: `Proceso completado: ${resultados.creados} cursos creados, ${resultados.yaExistentes.length} ya existentes, ${resultados.errores.length} errores.`,
          resultados 
        }, 
        { status: 200 }
      );
    }
    
    // MODO MANUAL: Crear un curso específico
    const { denominacion, activo, cursoAnterior, cursoSiguiente } = body || {};
    
    // Validar que la denominación sea obligatoria
    if (!denominacion) {
      return NextResponse.json(
        { error: 'La denominación es obligatoria' },
        { status: 400 }
      );
    }
    
    // Validar el formato 1234-56 (por ejemplo 2025-26)
    const formatoRegex = /^\d{4}-\d{2}$/;
    if (!formatoRegex.test(denominacion)) {
      return NextResponse.json(
        { error: 'La denominación debe seguir el formato 1234-56 (por ejemplo: 2025-26)' },
        { status: 400 }
      );
    }
    
    // Verificar si el curso académico ya existe
    const cursoExistente = await prisma.cursoAcademico.findFirst({
      where: {
        denominacion: denominacion
      }
    });

    if (cursoExistente) {
      return NextResponse.json(
        { 
          error: 'El curso académico ya existe',
          cursoAcademico: cursoExistente 
        },
        { status: 409 } // 409 Conflict - el recurso ya existe
      );
    }

    // Verificar que el segundo año sea el siguiente al primero
    const [primerAño, segundoAñoAbreviado] = denominacion.split('-');
    const primerAñoNum = parseInt(primerAño);
    const segundoAñoAbreviadoEsperado = (primerAñoNum + 1).toString().slice(-2);
    
    if (segundoAñoAbreviado !== segundoAñoAbreviadoEsperado) {
      return NextResponse.json(
        { 
          error: `El formato del curso académico no es válido. Para el año ${primerAño}, el segundo año debe ser ${segundoAñoAbreviadoEsperado} (${primerAñoNum}-${segundoAñoAbreviadoEsperado})` 
        },
        { status: 400 }
      );
    }
    
    // Buscar todos los cursos académicos existentes para establecer relaciones
    const cursosAcademicos = await prisma.cursoAcademico.findMany({
      orderBy: {
        denominacion: 'asc'
      }
    });

    // Extraer el año inicial del nuevo curso académico
    const añoInicioNuevo = parseInt(denominacion.split('-')[0]);
    
    // Valores por defecto para curso anterior y siguiente
    let cursoAnteriorFinal = cursoAnterior || null;
    let cursoSiguienteFinal = cursoSiguiente || null;

    // Si no se proporcionaron manualmente, buscar cursos anteriores y siguientes
    if (!cursoAnteriorFinal || !cursoSiguienteFinal) {
      // Para encontrar el curso anterior más reciente y el siguiente más próximo
      let cursoAnteriorMasReciente: string | null = null;
      let añoInicioCursoAnterior = -1;
      let cursoSiguienteMasProximo: string | null = null;
      let añoInicioCursoSiguiente = Number.MAX_SAFE_INTEGER;
      
      for (const curso of cursosAcademicos) {
        const añoParte = curso.denominacion.split('-')[0];
        if (!añoParte) continue;
        
        const añoInicioCurso = parseInt(añoParte);
        
        // Buscar el curso anterior más reciente
        if (añoInicioCurso < añoInicioNuevo && añoInicioCurso > añoInicioCursoAnterior) {
          cursoAnteriorMasReciente = curso.denominacion;
          añoInicioCursoAnterior = añoInicioCurso;
        }
        
        // Buscar el curso siguiente más próximo
        if (añoInicioCurso > añoInicioNuevo && añoInicioCurso < añoInicioCursoSiguiente) {
          cursoSiguienteMasProximo = curso.denominacion;
          añoInicioCursoSiguiente = añoInicioCurso;
        }
      }
      
      // Asignar los cursos encontrados si no se proporcionaron manualmente
      if (!cursoAnteriorFinal) {
        cursoAnteriorFinal = cursoAnteriorMasReciente;
      }
      
      if (!cursoSiguienteFinal) {
        cursoSiguienteFinal = cursoSiguienteMasProximo;
      }
    }
    
    // Si el curso actual está marcado como activo, desactivar todos los demás
    if (activo) {
      await prisma.cursoAcademico.updateMany({
        where: { activo: true },
        data: { activo: false },
      });
    }
      // Crear nuevo curso académico
    const nuevoCurso = await prisma.cursoAcademico.create({
      data: {
        denominacion,
        activo: activo || false,
        cursoAnterior: cursoAnteriorFinal,
        cursoSiguiente: cursoSiguienteFinal,
      },
    });
    
    // Registrar la creación manual del curso académico
    await logActivity({
      req: request,
      action: 'create',
      entityType: 'cursoAcademico',
      entityId: nuevoCurso.id,
      details: `Creación manual del curso académico ${denominacion}${activo ? ' (activado)' : ''}`
    });
    
    // Si existe un curso anterior, actualizarlo para que su cursoSiguiente sea el nuevo curso
    if (cursoAnteriorFinal) {
      await prisma.cursoAcademico.updateMany({
        where: { denominacion: cursoAnteriorFinal },
        data: { cursoSiguiente: denominacion }
      });
    }

    // Si existe un curso siguiente, actualizarlo para que su cursoAnterior sea el nuevo curso
    if (cursoSiguienteFinal) {
      await prisma.cursoAcademico.updateMany({
        where: { denominacion: cursoSiguienteFinal },
        data: { cursoAnterior: denominacion }
      });
    }
    
    return NextResponse.json({
      message: 'Curso académico creado correctamente',
      cursoAcademico: nuevoCurso,
      relaciones: {
        cursoAnterior: cursoAnteriorFinal,
        cursoSiguiente: cursoSiguienteFinal
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error al crear el curso académico:', error);
    return NextResponse.json(
      { error: 'Error al crear el curso académico' },
      { status: 500 }
    );
  }
}
