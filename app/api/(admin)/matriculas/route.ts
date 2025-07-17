import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/logActivity";

// GET /api/matriculas
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const asignaturaId = searchParams.get('asignaturaId');
    const alumnoId = searchParams.get('alumno_id');
    const mostrar = searchParams.get('mostrar');

    // Verificar si es una solicitud específica para alumno o asignatura
    const porAlumno = searchParams.get('porAlumno');
    const porAsignatura = searchParams.get('porAsignatura');

    // Caso especial para obtener todas las matrículas de un alumno con detalle
    if (alumnoId && porAlumno === 'true') {
      const matriculasAlumno = await prisma.matricula.findMany({
        where: {
          alumno_id: alumnoId,
          mostrar: mostrar === 'true' ? true : undefined
        },
        include: {
          asignatura: {
            include: {
              carrera: true,
              cursoAcademico: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  surname1: true,
                  surname2: true,
                  email: true
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
          }
        },
        orderBy: {
          asignatura: {
            Curso: 'asc'
          }
        }
      });

      return NextResponse.json(matriculasAlumno, { status: 200 });
    }

    // Caso especial para obtener todos los alumnos de una asignatura
    if (asignaturaId && porAsignatura === 'true') {
      const alumnosMatriculados = await prisma.matricula.findMany({
        where: {
          asignaturaId: asignaturaId,
          mostrar: mostrar === 'true' ? true : undefined
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              surname1: true,
              surname2: true,
              email: true
            }
          }
        },
        orderBy: {
          user: {
            surname1: 'asc'
          }
        }
      });

      return NextResponse.json(alumnosMatriculados, { status: 200 });
    }

    // Consulta estándar con filtros opcionales
    const whereClause: Prisma.MatriculaWhereInput = {};

    if (asignaturaId) whereClause.asignaturaId = asignaturaId;
    if (alumnoId) whereClause.alumno_id = alumnoId;
    if (mostrar) whereClause.mostrar = mostrar === 'true';

    const matriculas = await prisma.matricula.findMany({
      where: whereClause,
      include: {
        asignatura: {
          include: {
            carrera: true,
            cursoAcademico: true
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
        }
      }
    });

    return NextResponse.json(matriculas, { status: 200 });

  } catch (error) {
    console.error("Error al obtener matrículas:", error);
    return NextResponse.json(
      { error: "Error al obtener matrículas" },
      { status: 500 }
    );
  }
}

// POST /api/matriculas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      alumno_id,
      asignaturaId,
      mostrar
    } = body;

    // Validación básica
    if (!alumno_id || !asignaturaId) {
      return NextResponse.json(
        { error: "Alumno y asignatura son campos obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que la asignatura existe
    const asignatura = await prisma.asignatura.findUnique({
      where: { id: asignaturaId.toString() }
    });

    if (!asignatura) {
      return NextResponse.json(
        { error: "La asignatura especificada no existe" },
        { status: 400 }
      );
    }

    // Verificar que el alumno existe
    const alumno = await prisma.user.findUnique({
      where: { id: alumno_id },
      include: {
        userRoles: true
      }
    });

    if (!alumno) {
      return NextResponse.json(
        { error: "El alumno especificado no existe" },
        { status: 400 }
      );
    }

    // Verificar que el usuario es un alumno (rol 1)
    const esAlumno = alumno.userRoles.some(role => role.roleId === 1);

    if (!esAlumno) {
      return NextResponse.json(
        { error: "El usuario especificado no tiene el rol de alumno" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una matrícula para este alumno y asignatura
    const matriculaExistente = await prisma.matricula.findFirst({
      where: {
        alumno_id,
        asignaturaId
      }
    });
    if (matriculaExistente) {
      return NextResponse.json(
        { error: "Ya existe una matrícula para este alumno y asignatura" },
        { status: 400 }
      );
    }

    // Crear la nueva matrícula
    const nuevaMatricula = await prisma.matricula.create({
      data: {
        alumno_id,
        asignaturaId,
        mostrar: mostrar ?? false
      },
      include: {
        asignatura: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        }
      }
    });

    await logActivity({
      req,
      action: 'create',
      entityType: 'matricula',
      entityId: nuevaMatricula.id,
      details: `Matrícula creada para alumno ${alumno.name} ${alumno.surname1} en asignatura ${asignatura.Denominacion}`,
      prevValue: null
    });


    return NextResponse.json(nuevaMatricula, { status: 201 });

  } catch (error) {
    console.error("Error al crear matrícula:", error);
    return NextResponse.json(
      { error: "Error al crear matrícula" },
      { status: 500 }
    );
  }
}

// PUT /api/matriculas
export async function PUT(req: NextRequest) {
  try {
    // Verificar si hay datos en la solicitud para actualizar una matrícula específica
    const contentType = req.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const body = await req.clone().json();
        // Si hay un ID específico para actualizar, redirigimos a la ruta específica
        if (body.id) {
          const response = await fetch(`${req.url}/${body.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          return response;
        }
      } catch {
        // Si no se puede analizar como JSON, procedemos con la operación de poblar
      }
    }

    // Operación predeterminada: poblar matrículas desde ExpedienteAlumno
    // Obtener todos los alumnos con rol 1 (alumno)
    const alumnos = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: 1
          }
        }
      },
      include: {
        userRoles: true
      }
    });
    // Mapear alumnos por EMAIL para acceso rápido
    const alumnosPorEmail = new Map();
    for (const alumno of alumnos) {
      if (alumno.email) {
        alumnosPorEmail.set(alumno.email.toLowerCase(), alumno);
      }
    }

    // Obtener todos los datos de ExpedienteAlumno
    const expedientesAlumnos = await prisma.expedienteAlumno.findMany();

    // Obtener asignaturas para mapeo
    const asignaturas = await prisma.asignatura.findMany();
    const asignaturasPorCodigo = new Map();
    for (const asignatura of asignaturas) {
      asignaturasPorCodigo.set(asignatura.CodAsignatura, asignatura);
    }

    const resultados = {
      total: expedientesAlumnos.length,
      procesados: 0,
      creados: 0,
      errores: 0,
      detalles: [] as string[]
    };

    // Procesar cada expediente de alumno
    for (const expediente of expedientesAlumnos) {
      resultados.procesados++;

      try {
        if (!expediente.EMAIL || !expediente.CODIGO) {
          resultados.detalles.push(`Registro sin EMAIL o código de asignatura: ${expediente.id}`);
          continue;
        }

        // Buscar alumno por EMAIL
        const alumno = alumnosPorEmail.get(expediente.EMAIL.toLowerCase());
        if (!alumno) {
          resultados.detalles.push(`No se encontró alumno con EMAIL: ${expediente.EMAIL}`);
          continue;
        }

        // Buscar asignatura por código
        const asignatura = asignaturasPorCodigo.get(expediente.CODIGO);
        if (!asignatura) {
          resultados.detalles.push(`No se encontró asignatura con código: ${expediente.CODIGO}`);
          continue;
        }

        // Verificar si ya existe esta matrícula
        const matriculaExistente = await prisma.matricula.findFirst({
          where: {
            alumno_id: alumno.id,
            asignaturaId: asignatura.id
          }
        });
        if (matriculaExistente) {
          resultados.detalles.push(`Matrícula ya existe para alumno con EMAIL ${expediente.EMAIL} y asignatura ${expediente.CODIGO}`);
          continue;
        }

        // Crear nueva matrícula
        await prisma.matricula.create({
          data: {
            alumno_id: alumno.id,
            asignaturaId: asignatura.id,
            mostrar: true
          }
        });

        await logActivity({
          req,
          action: 'create',
          entityType: 'matricula',
          details: `Importación masiva de ${resultados.creados} matrículas desde expediente.`,
          prevValue: resultados
        });


        resultados.creados++;

      } catch (error) {
        resultados.errores++;
        resultados.detalles.push(`Error al procesar registro ${expediente.id}: ${error}`);
      }
    }

    return NextResponse.json(resultados, { status: 200 });

  } catch (error) {
    console.error("Error al poblar matrículas:", error);
    return NextResponse.json(
      { error: "Error al poblar matrículas", detalles: error },
      { status: 500 }
    );
  }
}
