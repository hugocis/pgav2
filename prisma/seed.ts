import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting the seeding process...');

  // Define the system roles
  const rolesData = [
    { name: 'Alumno', description: 'Student enrolled at the university' },
    { name: 'Profesor', description: 'Teacher responsible for delivering classes' },
    { name: 'Admin', description: 'System administrator with full access' },
    { name: 'Manager', description: 'Departmental academic coordinator' },
    { name: 'PEC', description: 'Coordinator of educational projects' },
  ];

  // Store created or found roles
  const roles: Record<string, any> = {};

  // Create or verify each role
  for (const roleData of rolesData) {
    const existingRole = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (existingRole) {
      roles[roleData.name] = existingRole;
      console.log(`ℹ️ Role ${roleData.name} already exists with ID: ${existingRole.id}`);
    } else {
      const newRole = await prisma.role.create({
        data: roleData,
      });
      roles[roleData.name] = newRole;
      console.log(`✅ Role ${roleData.name} created with ID: ${newRole.id}`);
    }
  }

  console.log('✅ All roles have been created or verified.');

  // Test user data
  const testUsers = [
    {
      username: 'alumno@pga.com',
      name: 'Student',
      surname1: 'Test',
      email: 'alumno@pga.com',
      role: 'Alumno',
    },
    {
      username: 'profesor@pga.com',
      name: 'Teacher',
      surname1: 'Faculty',
      email: 'profesor@pga.com',
      role: 'Profesor',
    },
    {
      username: 'admin@pga.com',
      name: 'Administrator',
      surname1: 'System',
      email: 'admin@pga.com',
      role: 'Admin',
    },
    {
      username: 'manager@pga.com',
      name: 'Manager',
      surname1: 'Academic',
      email: 'manager@pga.com',
      role: 'Manager',
    },
    {
      username: 'pec@pga.com',
      name: 'Coordinator',
      surname1: 'Educational',
      email: 'pec@pga.com',
      role: 'PEC',
    },
  ];

  // Hash for the default password
  const standardPassword = await bcrypt.hash('Admin123!', 10);

  // Create or update each test user
  for (const userData of testUsers) {
    // Check if the user already exists
    let existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    // If not found by email, check by username
    if (!existingUser) {
      existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });
    }

    let user;

    if (existingUser) {
      console.log(`⚠️ User ${userData.email} already exists. Updating data...`);

      // Update the user
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
      // Create the user
      user = await prisma.user.create({
        data: {
          username: userData.username,
          name: userData.name,
          surname1: userData.surname1,
          email: userData.email,
          password: standardPassword,
        },
      });

      console.log(`✅ ${userData.role} user created with ID: ${user.id}`);
    }

    // Check if the user already has the role
    const hasRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: roles[userData.role].id,
      },
    });

    if (!hasRole) {
      // Assign the role to the user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: roles[userData.role].id,
        },
      });
      console.log(`✅ Role ${userData.role} assigned to user: ${user.email}`);
    } else {
      console.log(`ℹ️ User ${user.email} already has the role ${userData.role}`);
    }
  }

  console.log('🎉 Seeding process completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during the seeding process:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });