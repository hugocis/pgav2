import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/asignaturas
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const cursoAcademicoId = searchParams.get('cursoAcademicoId');
    const carreraId = searchParams.get('carreraId');
    const profesorId = searchParams.get('profesorId') ;
    
    const whereClause: Prisma.AsignaturaWhereInput = {};
    
    if (cursoAcademicoId) whereClause.cursoAcademicoId = parseInt(cursoAcademicoId);
    if (carreraId) whereClause.carreraId = parseInt(carreraId);
    if (profesorId) whereClause.profesorId = profesorId;
    
    const asignaturas = await prisma.asignatura.findMany({
      where: whereClause,
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
    });

    return NextResponse.json(asignaturas, { status: 200 });

  } catch (error) {
    console.error("Error al obtener asignaturas:", error);
    return NextResponse.json(
      { error: "Error al obtener asignaturas" },
      { status: 500 }
    );
  }
}

// POST /api/asignaturas
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      CodAsignatura, 
      Denominacion, 
      Curso, 
      Cuatrimestre, 
      carreraId, 
      cursoAcademicoId, 
      profesorId 
    } = body;

    // Validación básica
    if (!CodAsignatura || !Denominacion || !Curso || !Cuatrimestre || !carreraId || !cursoAcademicoId || !profesorId) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que la carrera existe
    const carrera = await prisma.carrera.findUnique({
      where: { id: carreraId }
    });

    if (!carrera) {
      return NextResponse.json(
        { error: "La carrera especificada no existe" },
        { status: 400 }
      );
    }

    // Verificar que el curso académico existe
    const cursoAcademico = await prisma.cursoAcademico.findUnique({
      where: { id: cursoAcademicoId }
    });

    if (!cursoAcademico) {
      return NextResponse.json(
        { error: "El curso académico especificado no existe" },
        { status: 400 }
      );
    }

    // Verificar que el profesor existe
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

    // Verificar que el usuario tenga rol de profesor (roleId = 2)
    const esProfesor = profesor.userRoles.some(role => role.roleId === 2);
    if (!esProfesor) {
      return NextResponse.json(
        { error: "El usuario especificado no es un profesor" },
        { status: 400 }
      );
    }
    
    const nuevaAsignatura = await prisma.asignatura.create({
      data: {
        CodAsignatura,
        Denominacion,
        Curso,
        Cuatrimestre,
        carreraId,
        cursoAcademicoId,
        profesorId
      }
    });

    return NextResponse.json(nuevaAsignatura, { status: 201 });

  } catch (error) {
    console.error("Error al crear asignatura:", error);
    return NextResponse.json(
      { error: "Error al crear la asignatura" },
      { status: 500 }
    );
  }
}

// PUT /api/asignaturas - Endpoint especial para crear asignaturas desde OfertaAcademica
export async function PUT() {
  try {
    // Primero, obtener el curso académico activo
    const cursoAcademicoActivo = await prisma.cursoAcademico.findFirst({
      where: { activo: true }
    });

    if (!cursoAcademicoActivo) {
      return NextResponse.json(
        { error: "No hay un curso académico activo" },
        { status: 400 }
      );
    }

    // Obtener todas las ofertas académicas para el curso activo
    const ofertasAcademicas = await prisma.ofertaAcademica.findMany({
      where: {
        ANY_ANYACA: cursoAcademicoActivo.denominacion,
        COD_AGORA: { not: null },
        MATERIA: { not: null },
        CURSOS: { not: null },
        CUATRIMESTRE: { not: null },
        CARRERAS: { not: null }
      }
    });

    if (ofertasAcademicas.length === 0) {
      return NextResponse.json(
        { message: "No se encontraron ofertas académicas para procesar" },
        { status: 200 }
      );
    }

    const asignaturasCreadas = [];
    const errores = [];

    // Procesar cada oferta académica
    for (const oferta of ofertasAcademicas) {
      try {
        // Extraer el nombre de la carrera limpio de la cadena CARRERAS
        let nombreCarrera = oferta.CARRERAS;
        if (nombreCarrera) {
          // Quitar el texto entre paréntesis y todo lo que sigue después
          nombreCarrera = nombreCarrera.replace(/\s*\(.*$/, '').trim();
        } else {
          continue; // Saltamos esta oferta si no tiene carrera
        }

        // Buscar la carrera por denominación
        const carrera = await prisma.carrera.findFirst({
          where: {
            denominacion: nombreCarrera
          }
        });

        if (!carrera) {
          errores.push(`No se encontró la carrera: ${nombreCarrera}`);
          continue;
        }

        // Buscar profesor por código de asignatura y año académico
        const profesorDetalle = await prisma.profesoresDetalle.findFirst({
          where: {
            CODASIGNATURA: oferta.COD_AGORA,
            ANY_ANYACA: cursoAcademicoActivo.denominacion,
            EMAIL: { not: null }
          }
        });

        if (!profesorDetalle || !profesorDetalle.EMAIL) {
          errores.push(`No se encontró profesor para la asignatura: ${oferta.COD_AGORA}`);
          continue;
        }

        // Buscar el usuario (profesor) por email y con rol de profesor (roleId = 2)
        const profesor = await prisma.user.findFirst({
          where: {
            email: profesorDetalle.EMAIL,
            userRoles: {
              some: {
                roleId: 2
              }
            }
          }
        });

        if (!profesor) {
          errores.push(`No se encontró usuario profesor con email: ${profesorDetalle.EMAIL}`);
          continue;
        }        // Verificar si ya existe una asignatura con el mismo código, carrera y curso académico
        const asignaturaExistente = await prisma.asignatura.findFirst({
          where: {
            CodAsignatura: oferta.COD_AGORA || "",
            carreraId: carrera.id,
            cursoAcademicoId: cursoAcademicoActivo.id
          }
        });

        if (asignaturaExistente) {
          // Actualizar la asignatura existente
          const asignaturaActualizada = await prisma.asignatura.update({
            where: { id: asignaturaExistente.id },
            data: {
              Denominacion: oferta.MATERIA || "",
              Curso: oferta.CURSOS || "",
              Cuatrimestre: oferta.CUATRIMESTRE || "",
              profesorId: profesor.id
            }
          });

          asignaturasCreadas.push({
            accion: 'actualizada',
            asignatura: asignaturaActualizada
          });
        } else {          // Crear nueva asignatura
          const nuevaAsignatura = await prisma.asignatura.create({
            data: {
              CodAsignatura: oferta.COD_AGORA?.toString() || "",
              Denominacion: oferta.MATERIA?.toString() || "",
              Curso: oferta.CURSOS?.toString() || "",
              Cuatrimestre: oferta.CUATRIMESTRE?.toString() || "",
              carreraId: carrera.id,
              cursoAcademicoId: cursoAcademicoActivo.id,
              profesorId: profesor.id
            }
          });

          asignaturasCreadas.push({
            accion: 'creada',
            asignatura: nuevaAsignatura
          });
        }
      } catch (error) {
        console.error(`Error procesando oferta académica:`, error);
        errores.push(`Error procesando oferta académica: ${error}`);
      }
    }

    return NextResponse.json({
      message: `Proceso completado. ${asignaturasCreadas.length} asignaturas procesadas.`,
      asignaturasCreadas,
      errores
    }, { status: 200 });

  } catch (error) {
    console.error("Error en la carga automática de asignaturas:", error);
    return NextResponse.json(
      { error: "Error en la carga automática de asignaturas" },
      { status: 500 }
    );
  }
}
