import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el proceso de seeds...');
  
  // Definir los roles del sistema
  const rolesData = [
    { name: 'Alumno', description: 'Estudiante matriculado en la universidad' },
    { name: 'Profesor', description: 'Docente que imparte clases' },
    { name: 'Admin', description: 'Administrador del sistema con acceso completo' },
    { name: 'Manager', description: 'Gestor de departamentos académicos' },
    { name: 'PEC', description: 'Coordinador de proyectos educativos' },
  ];

  // Array para almacenar los roles creados o encontrados
  const roles: Record<string, any> = {};

  // Crear o verificar cada rol
  for (const roleData of rolesData) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      roles[roleData.name] = existingRole;
      console.log(`ℹ️ El rol ${roleData.name} ya existe con ID: ${existingRole.id}`);
    } else {
      const newRole = await prisma.role.create({
        data: roleData,
      });
      roles[roleData.name] = newRole;
      console.log(`✅ Rol ${roleData.name} creado con ID: ${newRole.id}`);
    }
  }

  console.log('✅ Todos los roles han sido creados o verificados');

  // Datos de usuarios de prueba
  const testUsers = [
    {
      username: 'alumno@pga.com',
      name: 'Estudiante',
      surname1: 'Prueba',
      email: 'alumno@pga.com',
      role: 'Alumno',
    },
    {
      username: 'profesor@pga.com',
      name: 'Profesor',
      surname1: 'Docente',
      email: 'profesor@pga.com',
      role: 'Profesor',
    },
    {
      username: 'admin@pga.com',
      name: 'Administrador',
      surname1: 'Sistema',
      email: 'admin@pga.com',
      role: 'Admin',
    },
    {
      username: 'manager@pga.com',
      name: 'Manager',
      surname1: 'Académico',
      email: 'manager@pga.com',
      role: 'Manager',
    },
    {
      username: 'pec@pga.com',
      name: 'Coordinador',
      surname1: 'Educativo',
      email: 'pec@pga.com',
      role: 'PEC',
    },
  ];

  // Crear o actualizar cada usuario de prueba
  const standardPassword = await bcrypt.hash('Admin123!', 10);
  
  for (const userData of testUsers) {
    // Verificar si el usuario ya existe
    let existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    // Si no encontramos por email, buscamos por username
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });
    }

    let user;
    
    if (existingUser) {
      console.log(`⚠️ El usuario ${userData.email} ya existe. Actualizando datos...`);
      
      // Actualizar los datos del usuario
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          username: userData.username,
          name: userData.name,
          surname1: userData.surname1,
          password: standardPassword,
        },
      });
    } else {
      // Crear el usuario
      user = await prisma.user.create({
        data: {
          username: userData.username,
          name: userData.name,
          surname1: userData.surname1,
          email: userData.email,
          password: standardPassword,
        },
      });

      console.log(`✅ Usuario ${userData.role} creado con ID: ${user.id}`);
      
      // Registrar la actividad
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'USER_CREATED',
          details: `Usuario ${userData.role} creado por script de inicialización`,
          entityType: 'user',
          entityId: user.id
        }
      });
    }

    // Verificar si ya tiene el rol asignado
    const hasRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: roles[userData.role].id
      }
    });

    if (!hasRole) {
      // Asignar rol al usuario
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roles[userData.role].id,
        },
      });
      console.log(`✅ Rol ${userData.role} asignado al usuario: ${user.email}`);
    } else {
      console.log(`ℹ️ El usuario ${user.email} ya tiene el rol ${userData.role}`);
    }
  }

  console.log('🎉 Proceso de seeds completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el proceso de seeds:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
