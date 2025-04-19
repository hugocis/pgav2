import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST - Cargar cursos académicos automáticamente desde OfertaAcademica
export async function POST(request: NextRequest) {
  try {
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
    const resultados = {
      procesados: 0,
      creados: 0,
      errores: [] as string[],
      yaExistentes: [] as string[],
      detalles: [] as Array<{
        curso: string;
        accion: string;
        cursoAnterior: string | null;
        cursoSiguiente: string | null;
      }>
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
        let cursoAnterior = null;
        let cursoSiguiente = null;

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
        }

        // Crear nuevo curso académico
        const nuevoCurso = await prisma.cursoAcademico.create({
          data: {
            denominacion: anyAnyaca,
            activo: false, // Por defecto no está activo
            cursoAnterior,
            cursoSiguiente
          }
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
          accion: 'creado',
          cursoAnterior,
          cursoSiguiente
        });
      } catch (error: any) {
        resultados.errores.push(`Error al crear el curso ${anyAnyaca}: ${error.message}`);
      }
    }

    return NextResponse.json(
      { 
        mensaje: `Proceso completado: ${resultados.creados} cursos creados, ${resultados.yaExistentes.length} ya existentes, ${resultados.errores.length} errores.`,
        resultados 
      }, 
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al cargar cursos académicos:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
