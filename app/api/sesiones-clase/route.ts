import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar autenticación
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar roles permitidos
    const allowedRoles = ["Admin", "Manager", "PEC", "Profesor"];
    if (!session.user?.roles.some(role => allowedRoles.includes(role))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const url = new URL(request.url);
    const grupoId = url.searchParams.get("grupoId");
    const fechaInicio = url.searchParams.get("fechaInicio");
    const fechaFin = url.searchParams.get("fechaFin");

    // Validar parámetros
    if (!grupoId) {
      return NextResponse.json({ error: "Falta el ID del grupo" }, { status: 400 });
    }

    // Construir filtros para la consulta
    let whereClause: any = {
      grupoId: grupoId
    };

    // Añadir filtros de fecha si están presentes
    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: parseISO(fechaInicio),
        lte: parseISO(fechaFin),
      };
    }

    // Obtener las sesiones de clase
    const sesionesClase = await prisma.sesionClase.findMany({
      where: whereClause,
      orderBy: {
        fecha: 'desc',
      },
      include: {
        grupo: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          }
        },
        AsistenciaAlumno: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname1: true,
                surname2: true,
                email: true,
              }
            },
            estadoAsistencia: true,
          }
        }
      }
    });

    return NextResponse.json(sesionesClase);
  } catch (error) {
    console.error("Error al obtener sesiones de clase:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Verificar autenticación
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar roles permitidos
    const allowedRoles = ["Profesor"];
    if (!session.user?.roles.some(role => allowedRoles.includes(role))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { grupoId, fecha } = body;

    // Validar datos requeridos
    if (!grupoId || !fecha) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (grupoId, fecha)" },
        { status: 400 }
      );
    }

    // Verificar que el grupo pertenece al profesor
    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: { asignatura: true }
    });

    if (!grupo) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    // Verificar que el profesor tiene acceso a este grupo
    const esProfesorAsignatura = grupo.profesorId === session.user.id;
    if (!esProfesorAsignatura) {
      const tieneDocencia = await prisma.docencia.findFirst({
        where: {
          profesorId: session.user.id,
          asignaturaId: grupo.asignaturaId
        }
      });

      if (!tieneDocencia) {
        return NextResponse.json(
          { error: "No tienes permisos para crear una sesión en este grupo" },
          { status: 403 }
        );
      }
    }

    // Crear la nueva sesión de clase
    const nuevaSesion = await prisma.sesionClase.create({
      data: {
        fecha: new Date(fecha),
        grupoId: grupoId,
        docenteId: session.user.id
      },
      include: {
        grupo: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(nuevaSesion);
  } catch (error) {
    console.error("Error al crear sesión de clase:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
