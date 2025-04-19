import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener todos los planes de alumno
export async function GET() {
  try {
    const alumnosPlanes = await prisma.alumnoPlan.findMany({
      include: {
        user: true,
        cursoAcademico: true,
        plandeEstudios: {
          include: {
            carrera: true
          }
        }
      },
      orderBy: {
        fechaalta: 'desc',
      },
    });
    
    return NextResponse.json(alumnosPlanes, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los planes de alumno:', error);
    return NextResponse.json(
      { error: 'Error al obtener los planes de alumno' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo plan de alumno
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar los campos requeridos
    if (!body.alumno_id || !body.cursoAcademicoId || !body.plandeEstudiosId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: alumno_id, cursoAcademicoId, plandeEstudiosId' },
        { status: 400 }
      );
    }

    // Verificar si el alumno existe
    const alumno = await prisma.user.findUnique({
      where: { id: body.alumno_id },
      include: {
        userRoles: true
      }
    });

    if (!alumno) {
      return NextResponse.json(
        { error: 'Alumno no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el alumno tiene el rol de alumno
    const esAlumno = alumno.userRoles.some(ur => ur.roleId === 1);
    if (!esAlumno) {
      return NextResponse.json(
        { error: 'El usuario no tiene rol de alumno' },
        { status: 400 }
      );
    }

    // Verificar si el curso académico existe
    const cursoAcademico = await prisma.cursoAcademico.findUnique({
      where: { id: body.cursoAcademicoId }
    });

    if (!cursoAcademico) {
      return NextResponse.json(
        { error: 'Curso académico no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el plan de estudios existe
    const planEstudios = await prisma.planDeEstudios.findUnique({
      where: { id: body.plandeEstudiosId }
    });

    if (!planEstudios) {
      return NextResponse.json(
        { error: 'Plan de estudios no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si ya existe una asignación activa para el alumno en ese curso y plan
    const existingAlumnoPlan = await prisma.alumnoPlan.findFirst({
      where: {
        alumno_id: body.alumno_id,
        cursoAcademicoId: body.cursoAcademicoId,
        plandeEstudiosId: body.plandeEstudiosId,
        fechaBaja: null
      }
    });

    if (existingAlumnoPlan) {
      return NextResponse.json(
        { error: 'El alumno ya está asignado a este plan en el curso académico indicado' },
        { status: 409 }
      );
    }
    
    // Crear el nuevo plan de alumno
    const newAlumnoPlan = await prisma.alumnoPlan.create({
      data: {
        alumno_id: body.alumno_id,
        cursoAcademicoId: body.cursoAcademicoId,
        plandeEstudiosId: body.plandeEstudiosId,
      },
      include: {
        user: true,
        cursoAcademico: true,
        plandeEstudios: true
      }
    });

    return NextResponse.json(newAlumnoPlan, { status: 201 });
  } catch (error) {
    console.error('Error al crear el plan de alumno:', error);
    return NextResponse.json(
      { error: 'Error al crear el plan de alumno' },
      { status: 500 }
    );
  }
}

// POST - Crear planes de alumnos en masa desde ExpedienteAlumno
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, cursoAcademicoId } = body;

    if (action !== 'importAlumnoPlan') {
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

    // Buscar el curso académico (por ID si se proporciona o el activo si no)
    let cursoAcademico;
    
    if (cursoAcademicoId) {
      // Si se proporciona un ID, usarlo
      cursoAcademico = await prisma.cursoAcademico.findUnique({
        where: { id: cursoAcademicoId }
      });
    } else {
      // Si no se proporciona ID, buscar el curso activo
      cursoAcademico = await prisma.cursoAcademico.findFirst({
        where: { activo: true }
      });
    }

    if (!cursoAcademico) {
      return NextResponse.json(
        { error: 'No se encontró un curso académico activo ni se proporcionó un ID válido' },
        { status: 404 }
      );
    }

    // Obtener todos los expedientes de alumnos
    const expedientes = await prisma.expedienteAlumno.findMany({
      where: {
        EMAIL: {
          not: null
        },
        DNI: {
          not: null
        },
        CARRERA: {
          not: null
        }
      },
      distinct: ['DNI', 'CARRERA']
    });

    const createdPlans = [];
    const errors = [];

    for (const expediente of expedientes) {
      try {
        if (!expediente.EMAIL || !expediente.DNI || !expediente.CARRERA) {
          errors.push({ 
            dni: expediente.DNI, 
            carrera: expediente.CARRERA,
            error: 'Datos incompletos' 
          });
          continue;
        }
        
        // Buscar al usuario por email completo
        const user = await prisma.user.findFirst({
          where: {
            email: expediente.EMAIL
          }
        });

        if (!user) {
          errors.push({ 
            dni: expediente.DNI, 
            carrera: expediente.CARRERA,
            error: 'Usuario no encontrado para email: ' + expediente.EMAIL
          });
          continue;
        }

        // Primero intentamos buscar un plan de estudios que coincida con el código en CARRERA
        const planDeEstudios = await prisma.planDeEstudios.findFirst({
          where: {
            codPlan: expediente.CARRERA
          },
          include: {
            carrera: true
          }
        });

        // Si encontramos el plan, lo usamos directamente
        if (planDeEstudios) {
          // Verificar si ya existe una asignación activa
          const existingAlumnoPlan = await prisma.alumnoPlan.findFirst({
            where: {
              alumno_id: user.id,
              cursoAcademicoId: cursoAcademico.id,
              plandeEstudiosId: planDeEstudios.id,
              fechaBaja: null
            }
          });

          if (existingAlumnoPlan) {
            errors.push({ 
              dni: expediente.DNI, 
              carrera: expediente.CARRERA,
              error: 'El alumno ya está asignado a este plan' 
            });
            continue;
          }

          // Crear el plan de alumno con el plan de estudios encontrado
          const newAlumnoPlan = await prisma.alumnoPlan.create({
            data: {
              alumno_id: user.id,
              cursoAcademicoId: cursoAcademico.id,
              plandeEstudiosId: planDeEstudios.id
            },
            include: {
              user: true,
              plandeEstudios: true
            }
          });
          
          createdPlans.push(newAlumnoPlan);
          continue;
        }

        // Si no encontramos por código de plan, intentamos buscar la carrera y sus planes
        const carrera = await prisma.carrera.findFirst({
          where: {
            OR: [
              {
                denominacion: {
                  contains: expediente.CARRERA,
                  mode: 'insensitive'
                }
              },
              {
                PlanDeEstudios: {
                  some: {
                    codPlan: {
                      contains: expediente.CARRERA,
                      mode: 'insensitive'
                    }
                  }
                }
              }
            ]
          },
          include: {
            PlanDeEstudios: true
          }
        });

        if (!carrera || carrera.PlanDeEstudios.length === 0) {
          errors.push({ 
            dni: expediente.DNI, 
            carrera: expediente.CARRERA,
            error: 'Carrera o plan de estudios no encontrado para código: ' + expediente.CARRERA 
          });
          continue;
        }

        // Tomar el primer plan de estudios disponible para la carrera
        const planEstudios = carrera.PlanDeEstudios[0];

        // Verificar si ya existe una asignación activa
        const existingAlumnoPlan = await prisma.alumnoPlan.findFirst({
          where: {
            alumno_id: user.id,
            cursoAcademicoId: cursoAcademico.id,
            plandeEstudiosId: planEstudios.id,
            fechaBaja: null
          }
        });

        if (existingAlumnoPlan) {
          errors.push({ 
            dni: expediente.DNI, 
            carrera: expediente.CARRERA,
            error: 'El alumno ya está asignado a este plan' 
          });
          continue;
        }

        // Crear el plan de alumno
        const newAlumnoPlan = await prisma.alumnoPlan.create({
          data: {
            alumno_id: user.id,
            cursoAcademicoId: cursoAcademico.id,
            plandeEstudiosId: planEstudios.id
          },
          include: {
            user: true,
            plandeEstudios: true
          }
        });

        createdPlans.push(newAlumnoPlan);
      } catch (error) {
        errors.push({ 
          dni: expediente.DNI, 
          carrera: expediente.CARRERA,
          error: `Error: ${(error as Error).message}` 
        });
      }
    }

    return NextResponse.json({
      message: `Creados ${createdPlans.length} planes de alumno. ${errors.length} errores.`,
      created: createdPlans.length,
      errors: errors.length,
      errorDetails: errors
    }, { status: 200 });
  } catch (error) {
    console.error('Error en la importación de planes de alumno:', error);
    return NextResponse.json(
      { error: `Error en la importación de planes de alumno: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
