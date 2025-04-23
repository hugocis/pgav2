import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// GET /api/docencia/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;

    // Comprobar si es un ID de usuario (formato string) o un ID de docencia (formato numérico)
    const isNumeric = /^\d+$/.test(idStr);

    // Si es un ID numérico, busca una docencia específica por ID
    if (isNumeric) {
      const id = parseInt(idStr);

      const docencia = await prisma.docencia.findUnique({
        where: { id: id.toString() },
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

      if (!docencia) {
        return NextResponse.json(
          { error: "Registro de docencia no encontrado" },
          { status: 404 }
        );
      }

      return NextResponse.json(docencia, { status: 200 });
    }
    // Si no es numérico, tratarlo como ID de usuario y buscar todas sus docencias
    else {
      // Extraer los parámetros de consulta opcionales
      const url = new URL(req.url);
      const cursoAcademicoId = url.searchParams.get('cursoAcademicoId');

      // Construir el filtro con condiciones opcionales
      const whereConditions: any = {
        profesorId: idStr
      };

      // Añadir filtro por curso académico si se proporciona
      if (cursoAcademicoId) {
        whereConditions.asignatura = {
          cursoAcademicoId: parseInt(cursoAcademicoId)
        };
      }

      const docencias = await prisma.docencia.findMany({
        where: whereConditions,
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
        },
        orderBy: {
          asignatura: {
            Denominacion: 'asc'
          }
        }
      });

      if (docencias.length === 0) {
        return NextResponse.json(
          { message: "No se encontraron docencias para este profesor", data: [] },
          { status: 200 }
        );
      }

      return NextResponse.json(docencias, { status: 200 });
    }
  } catch (error) {
    console.error("Error al obtener docencia:", error);
    return NextResponse.json(
      { error: "Error al obtener docencia" },
      { status: 500 }
    );
  }
}

// PUT /api/docencia/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID no válido" }, { status: 400 });
    }

    const body = await req.json();
    const { asignaturaId, profesorId, mostrar, fechaBaja } = body;
    const docenciaExistente = await prisma.docencia.findUnique({
      where: { id: id.toString() }
    });

    if (!docenciaExistente) {
      return NextResponse.json(
        { error: "Registro de docencia no encontrado" },
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

    if (profesorId) {
      const profesor = await prisma.user.findUnique({
        where: { id: profesorId },
        include: {
          userRoles: true
        }
      });

      if (!profesor) {
        return NextResponse.json(
          { error: "El profesor especificado no existe" },
          { status: 400 }
        );
      }

      const esProfesor = profesor.userRoles.some((role) => role.roleId === 2);

      if (!esProfesor) {
        return NextResponse.json(
          { error: "El usuario especificado no tiene el rol de profesor" },
          { status: 400 }
        );
      }
    }

    const docenciaActualizada = await prisma.docencia.update({
      where: { id: id.toString() },
      data: {
        asignaturaId: asignaturaId !== undefined ? asignaturaId : undefined,
        profesorId: profesorId !== undefined ? profesorId : undefined,
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
      entityType: 'docencia',
      entityId: id.toString(),
      details: `Docencia actualizada con profesorId=${profesorId}, asignaturaId=${asignaturaId}`
    });


    return NextResponse.json(docenciaActualizada, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar docencia:", error);
    return NextResponse.json(
      { error: "Error al actualizar docencia" },
      { status: 500 }
    );
  }
}

// DELETE /api/docencia/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID no válido" }, { status: 400 });
    }

    const docencia = await prisma.docencia.findUnique({
      where: { id: id.toString() }
    });

    if (!docencia) {
      return NextResponse.json(
        { error: "Registro de docencia no encontrado" },
        { status: 404 }
      );
    }

    await prisma.docencia.delete({
      where: { id: id.toString() }
    });

    await logActivity({
      req,
      action: 'delete',
      entityType: 'docencia',
      entityId: id.toString(),
      details: `Docencia eliminada (id=${id})`
    });


    return NextResponse.json(
      { message: "Docencia eliminada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar docencia:", error);
    return NextResponse.json(
      { error: "Error al eliminar docencia" },
      { status: 500 }
    );
  }
}
