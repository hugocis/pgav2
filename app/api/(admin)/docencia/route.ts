import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/docencia
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const asignaturaId = searchParams.get('asignaturaId');
    const profesorId = searchParams.get('profesorId');
    const mostrar = searchParams.get('mostrar');
    
    const whereClause: Prisma.DocenciaWhereInput = {};
    
    if (asignaturaId) whereClause.asignaturaId = parseInt(asignaturaId);
    if (profesorId) whereClause.profesorId = profesorId;
    if (mostrar) whereClause.mostrar = mostrar === 'true';
    
    const docencias = await prisma.docencia.findMany({
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

    return NextResponse.json(docencias, { status: 200 });

  } catch (error) {
    console.error("Error al obtener docencias:", error);
    return NextResponse.json(
      { error: "Error al obtener docencias" },
      { status: 500 }
    );
  }
}

// POST /api/docencia
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      asignaturaId, 
      profesorId,
      mostrar
    } = body;

    // Validación básica
    if (!asignaturaId || !profesorId) {
      return NextResponse.json(
        { error: "Asignatura y profesor son campos obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que la asignatura existe
    const asignatura = await prisma.asignatura.findUnique({
      where: { id: asignaturaId }
    });

    if (!asignatura) {
      return NextResponse.json(
        { error: "La asignatura especificada no existe" },
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

    // Verificar que el usuario es un profesor (rol 2)
    const esProfesor = profesor.userRoles.some(role => role.roleId === 2);
    
    if (!esProfesor) {
      return NextResponse.json(
        { error: "El usuario especificado no tiene el rol de profesor" },
        { status: 400 }
      );
    }

    // Crear la nueva entrada de docencia
    const nuevaDocencia = await prisma.docencia.create({
      data: {
        asignaturaId,
        profesorId,
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

    return NextResponse.json(nuevaDocencia, { status: 201 });

  } catch (error) {
    console.error("Error al crear docencia:", error);
    return NextResponse.json(
      { error: "Error al crear docencia" },
      { status: 500 }
    );
  }
}

// PUT /api/docencia
export async function PUT(req: NextRequest) {
  try {
    // Verificar si hay datos en la solicitud para actualizar una docencia específica
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
      } catch{
        // Si no se puede analizar como JSON, procedemos con la operación de poblar
      }
    }
    
    // Operación predeterminada: poblar docencia desde ProfesoresDetalle
    // Obtener todos los profesores con rol 2 (profesor)
    const profesores = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            roleId: 2
          }
        }
      },
      include: {
        userRoles: true
      }
    });
      // Mapear profesores por EMAIL para acceso rápido
    const profesoresPorEmail = new Map();
    for (const profesor of profesores) {
      if (profesor.email) {
        profesoresPorEmail.set(profesor.email.toLowerCase(), profesor);
      }
    }

    // Obtener todos los datos de ProfesoresDetalle
    const detallesProfesores = await prisma.profesoresDetalle.findMany();
    
    // Obtener asignaturas para mapeo
    const asignaturas = await prisma.asignatura.findMany();
    const asignaturasPorCodigo = new Map();
    for (const asignatura of asignaturas) {
      asignaturasPorCodigo.set(asignatura.CodAsignatura, asignatura);
    }

    const resultados = {
      total: detallesProfesores.length,
      procesados: 0,
      creados: 0,
      errores: 0,
      detalles: [] as string[]
    };

    // Procesar cada detalle de profesor
    for (const detalle of detallesProfesores) {
      resultados.procesados++;
        try {
        if (!detalle.EMAIL || !detalle.CODASIGNATURA) {
          resultados.detalles.push(`Registro sin EMAIL o código de asignatura: ${detalle.id}`);
          continue;
        }
        
        // Buscar profesor por EMAIL
        const profesor = profesoresPorEmail.get(detalle.EMAIL.toLowerCase());
        if (!profesor) {
          resultados.detalles.push(`No se encontró profesor con EMAIL: ${detalle.EMAIL}`);
          continue;
        }
        
        // Buscar asignatura por código
        const asignatura = asignaturasPorCodigo.get(detalle.CODASIGNATURA);
        if (!asignatura) {
          resultados.detalles.push(`No se encontró asignatura con código: ${detalle.CODASIGNATURA}`);
          continue;
        }
        
        // Verificar si ya existe esta relación
        const docenciaExistente = await prisma.docencia.findFirst({
          where: {
            profesorId: profesor.id,
            asignaturaId: asignatura.id
          }
        });
          if (docenciaExistente) {
          resultados.detalles.push(`Docencia ya existe para profesor con EMAIL ${detalle.EMAIL} y asignatura ${detalle.CODASIGNATURA}`);
          continue;
        }
        
        // Crear nueva docencia
        await prisma.docencia.create({
          data: {
            profesorId: profesor.id,
            asignaturaId: asignatura.id,
            mostrar: true
          }
        });
        
        resultados.creados++;
        
      } catch (error) {
        resultados.errores++;
        resultados.detalles.push(`Error al procesar registro ${detalle.id}: ${error}`);
      }
    }
    
    return NextResponse.json(resultados, { status: 200 });
    
  } catch (error) {
    console.error("Error al poblar docencia:", error);
    return NextResponse.json(
      { error: "Error al poblar docencia", detalles: error },
      { status: 500 }
    );
  }
}
