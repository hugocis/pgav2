import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// GET /api/matriculas/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const matricula = await prisma.matricula.findUnique({
      where: { id },
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

    if (!matricula) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(matricula, { status: 200 });
  } catch (error) {
    console.error("Error al obtener matrícula:", error);
    return NextResponse.json(
      { error: "Error al obtener matrícula" },
      { status: 500 }
    );
  }
}

// PUT /api/matriculas/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { alumno_id, asignaturaId, mostrar, fechaBaja } = body;

    const matriculaExistente = await prisma.matricula.findUnique({
      where: { id }
    });

    if (!matriculaExistente) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    if (asignaturaId) {
      const asignatura = await prisma.asignatura.findUnique({
        where: { id: asignaturaId }
      });

      if (!asignatura) {
        return NextResponse.json(
          { error: "La asignatura especificada no existe" },
          { status: 400 }
        );
      }
    }

    if (alumno_id) {
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

      const esAlumno = alumno.userRoles.some((role) => role.roleId === 1);

      if (!esAlumno) {
        return NextResponse.json(
          { error: "El usuario especificado no tiene el rol de alumno" },
          { status: 400 }
        );
      }
    }

    const matriculaActualizada = await prisma.matricula.update({
      where: { id },
      data: {
        alumno_id: alumno_id !== undefined ? alumno_id : undefined,
        asignaturaId: asignaturaId !== undefined ? asignaturaId : undefined,
        mostrar: mostrar !== undefined ? mostrar : undefined,
        fechaBaja: fechaBaja !== undefined ? new Date(fechaBaja) : undefined
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
      action: 'update',
      entityType: 'matricula',
      entityId: id,
      details: `Matrícula actualizada para alumno ${matriculaActualizada.user.name} ${matriculaActualizada.user.surname1}`,
      prevValue: matriculaExistente
    });

    return NextResponse.json(matriculaActualizada, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar matrícula:", error);
    return NextResponse.json(
      { error: "Error al actualizar matrícula" },
      { status: 500 }
    );
  }
}

// DELETE /api/matriculas/[id]
// PATCH /api/matriculas/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    console.log("PATCH - Datos recibidos:", body);
    
    const matriculaExistente = await prisma.matricula.findUnique({
      where: { id }
    });

    if (!matriculaExistente) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    // Extraer los datos de la solicitud
    let alumnoId = matriculaExistente.alumno_id;
    let asignaturaId = matriculaExistente.asignaturaId;
    let mostrar = matriculaExistente.mostrar;

    // Si se proporciona un objeto asignatura con conexión, usar su id
    if (body.asignatura && body.asignatura.connect && body.asignatura.connect.id) {
      asignaturaId = body.asignatura.connect.id;
    }

    // Si se proporciona un objeto alumno con conexión, usar su id
    if (body.alumno && body.alumno.connect && body.alumno.connect.id) {
      alumnoId = body.alumno.connect.id;
    }

    // Si se proporciona un valor mostrar explícito, usarlo
    if (body.mostrar !== undefined) {
      mostrar = body.mostrar;
    }

    // Actualizar la matrícula
    const matriculaActualizada = await prisma.matricula.update({
      where: { id },
      data: {
        alumno_id: alumnoId,
        asignaturaId,
        mostrar
      },
      include: {
        asignatura: {
          include: {
            carrera: true
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

    // Verificar si hay cambios en alumnoId o asignaturaId
    if (alumnoId !== matriculaExistente.alumno_id || asignaturaId !== matriculaExistente.asignaturaId) {
      try {
        // Buscar los grupos de la asignatura para asignar al alumno
        const grupos = await prisma.grupo.findMany({
          where: {
            asignaturaId: asignaturaId
          }
        });

        // Si no hay grupos en la asignatura, crear un grupo predeterminado
        let grupoAsignar;
        if (!grupos || grupos.length === 0) {
          console.log("No se encontraron grupos para la asignatura. Creando grupo predeterminado.");
          
          // Obtener el profesor de la asignatura
          const asignatura = await prisma.asignatura.findUnique({
            where: { id: asignaturaId }
          });
          
          if (asignatura) {
            // Crear un grupo predeterminado para la asignatura
            grupoAsignar = await prisma.grupo.create({
              data: {
                denominacion: "Grupo A",
                asignaturaId: asignaturaId,
                profesorId: asignatura.profesorId
              }
            });
            
            console.log(`Grupo predeterminado creado con ID: ${grupoAsignar.id}`);
          }
        } else {
          // Usar el primer grupo existente
          grupoAsignar = grupos[0];
        }

        // Si tenemos un grupo (existente o recién creado), asignar el alumno
        if (grupoAsignar) {
          // Verificar si ya existe una asignación para este alumno en este grupo
          const existingAsignacion = await prisma.alumnoGrupo.findFirst({
            where: {
              alumno_Id: alumnoId,
              grupoId: grupoAsignar.id
            }
          });

          if (!existingAsignacion) {
            // Crear el registro de alumno-grupo
            await prisma.alumnoGrupo.create({
              data: {
                alumno_Id: alumnoId,
                grupoId: grupoAsignar.id
              }
            });
            
            console.log(`Alumno ${alumnoId} asignado automáticamente al grupo ${grupoAsignar.id} durante actualización`);
          }
        }
      } catch (groupError) {
        console.error("Error al asignar alumno al grupo durante actualización:", groupError);
        // No interrumpimos la actualización de la matrícula
      }
    }

    await logActivity({
      req,
      action: 'update',
      entityType: 'matricula',
      entityId: id,
      details: `Matrícula actualizada para alumno ${matriculaActualizada.user.name || 'N/A'} ${matriculaActualizada.user.surname1 || ''}, visibilidad: ${mostrar ? 'visible' : 'oculta'}`,
      prevValue: matriculaExistente
    });

    return NextResponse.json(matriculaActualizada, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar matrícula (PATCH):", error);
    return NextResponse.json(
      { error: "Error al actualizar matrícula" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const matricula = await prisma.matricula.findUnique({
      where: { id }
    });

    if (!matricula) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    await prisma.matricula.delete({
      where: { id }
    });

    await logActivity({
      req,
      action: 'delete',
      entityType: 'matricula',
      entityId: id,
      details: `Matrícula eliminada del alumno con ID ${matricula.alumno_id} en asignatura ID ${matricula.asignaturaId}`,
      prevValue: matricula
    });

    return NextResponse.json(
      { message: "Matrícula eliminada correctamente" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error al eliminar matrícula:", error);
    return NextResponse.json(
      { error: "Error al eliminar matrícula" },
      { status: 500 }
    );
  }
}
