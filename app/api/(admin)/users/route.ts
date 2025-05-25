import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { logActivity } from '@/lib/logActivity';

// GET - Obtener todos los usuarios
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error al obtener los usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener los usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar los campos requeridos
    if (!body.username || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: username, email, password' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          { username: body.username }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email o username' },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Crear el nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        username: body.username,
        name: body.name || null,
        surname1: body.surname1 || null,
        surname2: body.surname2 || null,
        email: body.email,
        password: hashedPassword,
        lockout: body.lockout || false,
      },
    });    // Si se especifican roles, asignarlos
    if (Array.isArray(body.roles) && body.roles.length > 0) {
      // Crear un registro UserRole para cada rol seleccionado
      await Promise.all(body.roles.map((roleId: number) => {
        return prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId,
          }
        });
      }));
    } 
    // Para mantener compatibilidad con versiones anteriores
    else if (body.roleId) {
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleId: body.roleId,
        }
      });
    }

    // Incluir los roles del usuario en la respuesta
    const userWithRoles = await prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    await logActivity({
      req: request,
      action: 'create',
      entityType: 'user',
      entityId: newUser.id,
      details: `Creación manual del usuario ${newUser.email} (con ${Array.isArray(body.roles) ? body.roles.length : (body.roleId ? '1' : '0')} roles asignados)`
    });


    return NextResponse.json(userWithRoles, { status: 201 });
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear el usuario' },
      { status: 500 }
    );
  }
}

// POST - Importar estudiantes desde ExpedienteAlumno
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'importStudents') {
      // Verificar si el rol de alumno existe, si no, crearlo
      let alumnoRole = await prisma.role.findFirst({
        where: { id: 1 }
      });

      if (!alumnoRole) {
        alumnoRole = await prisma.role.create({
          data: {
            id: 1,
            name: 'Alumno',
            description: 'Rol de alumno'
          }
        });
      }

      // Obtener todos los expedientes de alumnos
      const expedientes = await prisma.expedienteAlumno.findMany({
        where: {
          EMAIL: {
            not: null
          },
          DNI: {
            not: null
          }
        },
        distinct: ['DNI']
      });

      const createdUsers = [];
      const errors = [];

      for (const expediente of expedientes) {
        try {
          if (!expediente.EMAIL || !expediente.DNI) {
            errors.push({ dni: expediente.DNI, error: 'Email o DNI faltante' });
            continue;
          }

          // Extraer username del email
          const username = expediente.EMAIL.split('@')[0];

          // Verificar si el usuario ya existe
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: expediente.EMAIL },
                { username }
              ]
            }
          });

          if (existingUser) {
            errors.push({ dni: expediente.DNI, error: 'Usuario ya existe' });
            continue;
          }

          // Hash de la contraseña (DNI)
          const hashedPassword = await bcrypt.hash(expediente.DNI, 10);

          // Crear el usuario
          const newUser = await prisma.user.create({
            data: {
              username,
              name: expediente.NOMBRE || '',
              surname1: expediente.APE1 || '',
              surname2: expediente.APE2 || '',
              email: expediente.EMAIL,
              password: hashedPassword,
              lockout: false,
            }
          });

          // Asignar el rol de alumno
          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: 1, // Rol de alumno
            }
          });

          createdUsers.push(newUser);

          await logActivity({
            req: request,
            action: 'create',
            entityType: 'user',
            entityId: newUser.id,
            details: `Importación automática de estudiante ${newUser.email}`
          });

        } catch (error) {
          errors.push({
            dni: expediente.DNI,
            error: `Error: ${(error as Error).message}`
          });
        }
      }

      return NextResponse.json({
        message: `Importados ${createdUsers.length} estudiantes. ${errors.length} errores.`,
        created: createdUsers.length,
        errors: errors.length,
        errorDetails: errors
      }, { status: 200 });
    } else if (action === 'importProfessors') {
      // Verificar si el rol de profesor existe, si no, crearlo
      let profesorRole = await prisma.role.findFirst({
        where: { id: 2 }
      });

      if (!profesorRole) {
        profesorRole = await prisma.role.create({
          data: {
            id: 2,
            name: 'Profesor',
            description: 'Rol de profesor'
          }
        });
      }

      // Obtener todos los profesores
      const profesores = await prisma.profesoresDetalle.findMany({
        where: {
          EMAIL: {
            not: null
          },
          DNI: {
            not: null
          }
        },
        distinct: ['DNI']
      });

      const createdUsers = [];
      const errors = [];

      for (const profesor of profesores) {
        try {
          if (!profesor.EMAIL || !profesor.DNI) {
            errors.push({ dni: profesor.DNI, error: 'Email o DNI faltante' });
            continue;
          }

          // Extraer username del email
          const username = profesor.EMAIL.split('@')[0];

          // Verificar si el usuario ya existe
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: profesor.EMAIL },
                { username }
              ]
            }
          });

          if (existingUser) {
            errors.push({ dni: profesor.DNI, error: 'Usuario ya existe' });
            continue;
          }

          // Hash de la contraseña (DNI)
          const hashedPassword = await bcrypt.hash(profesor.DNI, 10);

          // Crear el usuario
          const newUser = await prisma.user.create({
            data: {
              username,
              name: profesor.NOMBRE || '',
              surname1: profesor.APELLIDO1 || '',
              surname2: profesor.APELLIDO2 || '',
              email: profesor.EMAIL,
              password: hashedPassword,
              lockout: false,
            }
          });

          // Asignar el rol de profesor
          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: 2, // Rol de profesor
            }
          });

          await logActivity({
            req: request,
            action: 'create',
            entityType: 'user',
            entityId: newUser.id,
            details: `Importación automática de profesor ${newUser.email}`
          });


          createdUsers.push(newUser);
        } catch (error) {
          errors.push({
            dni: profesor.DNI,
            error: `Error: ${(error as Error).message}`
          });
        }
      }

      return NextResponse.json({
        message: `Importados ${createdUsers.length} profesores. ${errors.length} errores.`,
        created: createdUsers.length,
        errors: errors.length,
        errorDetails: errors
      }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: 'Acción no reconocida' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error en la importación:', error);
    return NextResponse.json(
      { error: `Error en la importación: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
