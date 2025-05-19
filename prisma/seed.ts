import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { importProfesoresDetalle, importExpedienteAlumno, importOfertaAcademica } from './importCsvData';

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
    { name: 'GOE', description: 'Estudiante con necesidades educativas especiales' },
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

  // Create or verify attendance states
  const estadosAsistencia = [
    { denominacion: 'Asiste' },
    { denominacion: 'No Asiste' },
    { denominacion: '50%' },
    { denominacion: 'Dispensado' },
    { denominacion: 'Erasmus T' },
    { denominacion: 'Erasmus NT' },
  ];

  console.log('🔄 Creating or verifying attendance states...');
  
  for (const estadoData of estadosAsistencia) {
    const existingEstado = await prisma.estadoAsistencia.findFirst({
      where: { denominacion: estadoData.denominacion },
    });

    if (existingEstado) {
      console.log(`ℹ️ Estado de asistencia "${estadoData.denominacion}" already exists with ID: ${existingEstado.id}`);
    } else {
      const newEstado = await prisma.estadoAsistencia.create({
        data: estadoData,
      });
      console.log(`✅ Estado de asistencia "${estadoData.denominacion}" created with ID: ${newEstado.id}`);
    }
  }
  console.log('✅ All attendance states have been created or verified.');
  // Create or verify estados de justificación
  const estadosJustificacion = [
    { denominacion: 'Justificado' },
    { denominacion: 'No Justificado' },
    { denominacion: 'Pendiente' },
    { denominacion: 'Rechazado' },
  ];

  console.log('🔄 Creating or verifying justification states...');
  
  for (const estadoData of estadosJustificacion) {
    const existingEstado = await prisma.estadoJustificacion.findFirst({
      where: { denominacion: estadoData.denominacion },
    });

    if (existingEstado) {
      console.log(`ℹ️ Estado de justificación "${estadoData.denominacion}" already exists with ID: ${existingEstado.id}`);
    } else {
      const newEstado = await prisma.estadoJustificacion.create({
        data: estadoData,
      });
      console.log(`✅ Estado de justificación "${estadoData.denominacion}" created with ID: ${newEstado.id}`);
    }
  }

  console.log('✅ All justification states have been created or verified.');

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
      name: 'Iván',
      surname1: 'Barcia',
      surname2: 'Santos',
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
  console.log('✅ Seeding process base data completed!');
    // Importar datos desde archivos CSV
  try {
    // Las rutas son relativas al directorio desde donde se ejecuta el script
    const seedsDir = path.join(__dirname, 'seeds');
    
    console.log(`🔍 Buscando archivos CSV en: ${seedsDir}`);
    
    // Importar datos de profesores
    const profesoresFile = path.join(seedsDir, 'ProfesoresDetalle (1).csv');
    await importProfesoresDetalle(profesoresFile);
    
    // Importar datos de expedientes de alumnos
    const expedientesFile = path.join(seedsDir, 'ExpedienteAlumno (1).csv');
    await importExpedienteAlumno(expedientesFile);
    
    // Importar datos de oferta académica
    const ofertaFile = path.join(seedsDir, 'OfertaAcademica (1).csv');
    await importOfertaAcademica(ofertaFile);
    
    console.log('🎉 Importación de datos CSV completada con éxito!');
  } catch (error) {
    console.error('❌ Error al importar datos CSV:', error);
    console.log('⚠️ Continuando sin importar datos CSV...');
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