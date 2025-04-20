import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ExpedienteAlumno, Grupo} from "@prisma/client";

type GrupoCreado = {
  id: number;
  denominacion: string;
  asignatura: string;
  profesor: string;
};

export async function PUT() {
  try {
    const gruposCreados: GrupoCreado[] = [];
    const errores: string[] = [];
    let totalGruposCreados = 0;
    let totalAlumnosAsignados = 0;

    const asignaturas = await prisma.asignatura.findMany({
      include: {
        Docencia: {
          where: { fechaBaja: null, mostrar: true },
          include: { user: true },
        },
      },
    });

    if (asignaturas.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron asignaturas" },
        { status: 404 }
      );
    }

    for (const asignatura of asignaturas) {
      if (!asignatura.Docencia || asignatura.Docencia.length === 0) {
        errores.push(`La asignatura ${asignatura.Denominacion} no tiene docentes asignados`);
        continue;
      }

      const expedientes: ExpedienteAlumno[] = [];

      const expedientesExactos = await prisma.expedienteAlumno.findMany({
        where: {
          ASIG_DENOM: {
            equals: asignatura.Denominacion,
            mode: "insensitive",
          },
        },
      });

      if (expedientesExactos.length > 0) {
        expedientes.push(...expedientesExactos);
      } else {
        const expedientesContiene = await prisma.expedienteAlumno.findMany({
          where: {
            ASIG_DENOM: {
              contains: asignatura.Denominacion,
              mode: "insensitive",
            },
          },
        });

        if (expedientesContiene.length > 0) {
          expedientes.push(...expedientesContiene);
        } else {
          const palabrasClave = asignatura.Denominacion.split(" ")
            .filter((palabra) => palabra.length > 3)
            .map((palabra) => ({
              ASIG_DENOM: {
                contains: palabra,
                mode: "insensitive" as const,
              },
            }));

          if (palabrasClave.length > 0) {
            const expedientesPorPalabras = await prisma.expedienteAlumno.findMany({
              where: {
                OR: palabrasClave,
              },
            });

            if (expedientesPorPalabras.length > 0) {
              expedientes.push(...expedientesPorPalabras);
            }
          }
        }
      }

      if (expedientes.length === 0) {
        errores.push(`No se encontraron alumnos para la asignatura ${asignatura.Denominacion}`);
        continue;
      }

      console.log(`Encontrados ${expedientes.length} expedientes para ${asignatura.Denominacion}`);

      const gruposAgrupados: Record<string, ExpedienteAlumno[]> = expedientes.reduce(
        (grupos: Record<string, ExpedienteAlumno[]>, expediente) => {
          if (!expediente.GRUPO) return grupos;

          if (!grupos[expediente.GRUPO]) {
            grupos[expediente.GRUPO] = [];
          }

          grupos[expediente.GRUPO].push(expediente);
          return grupos;
        },
        {}
      );

      for (const [denominacionGrupo, expedientesGrupo] of Object.entries(gruposAgrupados)) {
        const profesorId = asignatura.Docencia[0].profesorId;

        const grupoExistente = await prisma.grupo.findFirst({
          where: {
            asignaturaId: asignatura.id,
            denominacion: denominacionGrupo,
          },
        });

        let grupoDB: Grupo;

        if (grupoExistente) {
          grupoDB = grupoExistente;
        } else {
          grupoDB = await prisma.grupo.create({
            data: {
              denominacion: denominacionGrupo,
              asignaturaId: asignatura.id,
              profesorId: profesorId,
            },
          });
          totalGruposCreados++;
          gruposCreados.push({
            id: grupoDB.id,
            denominacion: grupoDB.denominacion,
            asignatura: asignatura.Denominacion,
            profesor: asignatura.Docencia[0].user.name ?? "Nombre desconocido",
          });
        }

        for (const expediente of expedientesGrupo) {
          if (!expediente.EMAIL) {
            errores.push(
              `El alumno ${expediente.NOMBRE} ${expediente.APE1} ${expediente.APE2 || ""} no tiene correo electrónico`
            );
            continue;
          }

          const alumno = await prisma.user.findFirst({
            where: { email: expediente.EMAIL },
          });

          if (!alumno) {
            errores.push(`No se encontró un usuario para el email ${expediente.EMAIL}`);
            continue;
          }

          const alumnoGrupoExistente = await prisma.alumnoGrupo.findFirst({
            where: {
              alumno_Id: alumno.id,
              grupoId: grupoDB.id,
            },
          });

          if (!alumnoGrupoExistente) {
            await prisma.alumnoGrupo.create({
              data: {
                alumno_Id: alumno.id,
                grupoId: grupoDB.id,
              },
            });
            totalAlumnosAsignados++;
          }
        }
      }
    }

    return NextResponse.json(
      {
        mensaje: `Proceso completado: ${totalGruposCreados} grupos creados, ${totalAlumnosAsignados} alumnos asignados`,
        gruposCreados,
        errores,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al poblar grupos:", error);
    return NextResponse.json(
      { error: "Error al poblar grupos y asignar alumnos" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const grupos = await prisma.grupo.findMany({
      include: {
        asignatura: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ grupos }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener los grupos:", error);
    return NextResponse.json(
      { error: "Error al obtener los grupos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { denominacion, asignaturaId, profesorId } = body;

    if (!denominacion || !asignaturaId || !profesorId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const asignatura = await prisma.asignatura.findUnique({
      where: { id: asignaturaId },
    });

    if (!asignatura) {
      return NextResponse.json(
        { error: "La asignatura no existe" },
        { status: 404 }
      );
    }

    const profesor = await prisma.user.findUnique({
      where: { id: profesorId },
    });

    if (!profesor) {
      return NextResponse.json(
        { error: "El profesor no existe" },
        { status: 404 }
      );
    }

    const grupo = await prisma.grupo.create({
      data: {
        denominacion,
        asignaturaId,
        profesorId,
      },
    });

    return NextResponse.json({ grupo }, { status: 201 });
  } catch (error) {
    console.error("Error al crear el grupo:", error);
    return NextResponse.json(
      { error: "Error al crear el grupo" },
      { status: 500 }
    );
  }
}
