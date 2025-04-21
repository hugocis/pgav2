import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando el proceso de seeds...');
  // Verificar si el rol 'Admin' existe, si no, crearlo
  let adminRole;
  const existingRole = await prisma.role.findUnique({
    where: { name: 'Admin' },
  });

  if (existingRole) {
    adminRole = existingRole;
    console.log(`ℹ️ El rol Admin ya existe con ID: ${adminRole.id}`);
  } else {
    adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: 'Administrador del sistema con acceso completo',
      },
    });
    console.log(`✅ Rol Admin creado con ID: ${adminRole.id}`);
  }

  console.log(`✅ Rol Admin creado/verificado con ID: ${adminRole.id}`);

  // Crear el hash para la contraseña
  const hashedPassword = await bcrypt.hash('Admin123!', 10);  // Verificar si el usuario ya existe - primero buscamos por email 
  let existingUser = await prisma.user.findUnique({
    where: { email: 'admin@pga.com' },
  });

  // Si no encontramos por email, buscamos por username por si acaso
  if (!existingUser) {
    existingUser = await prisma.user.findUnique({
      where: { username: 'admin@pga.com' },
    });
  }

  if (existingUser) {
    console.log('⚠️ El usuario admin@pga.com ya existe. Actualizando contraseña y asignando rol Admin...');
      // Actualizar la contraseña y asegurar que el username sea correcto
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { 
        username: 'admin@pga.com', // Asegurar que el username sea igual al email para login
        password: hashedPassword,
      },
    });

    // Verificar si ya tiene el rol de Admin
    const hasAdminRole = await prisma.userRole.findFirst({
      where: {
        userId: existingUser.id,
        roleId: adminRole.id
      }
    });

    if (!hasAdminRole) {
      // Asignar rol Admin si no lo tiene
      await prisma.userRole.create({
        data: {
          userId: existingUser.id,
          roleId: adminRole.id,
        },
      });
      console.log(`✅ Rol Admin asignado al usuario existente: ${existingUser.email}`);
    } else {
      console.log(`ℹ️ El usuario ${existingUser.email} ya tiene el rol Admin`);
    }
    
  } else {    // Crear el usuario admin
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin@pga.com', // Usamos el email como username para que coincida con la autenticación
        name: 'Administrador',
        surname1: 'Sistema',
        email: 'admin@pga.com',
        password: hashedPassword,
      },
    });

    console.log(`✅ Usuario admin creado con ID: ${adminUser.id}`);

    // Asignar rol Admin al usuario
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log(`✅ Rol Admin asignado al usuario: ${adminUser.email}`);
    
    // Registrar la actividad
    await prisma.activityLog.create({
      data: {
        userId: adminUser.id,
        action: 'USER_CREATED',
        details: 'Usuario administrador creado por script de inicialización',
        entityType: 'user',
        entityId: adminUser.id
      }
    });
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
