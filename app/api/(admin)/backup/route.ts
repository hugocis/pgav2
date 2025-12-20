import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Verificar que el usuario es admin
async function verifyAdminAccess(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { error: 'No autorizado', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  const isAdmin = user?.userRoles.some((ur: any) => ur.role.name === 'Admin');
  
  if (!isAdmin) {
    return { error: 'Acceso denegado. Solo administradores.', status: 403 };
  }

  return { user };
}

// GET: Obtener historial de backups
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAccess(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [backups, total] = await Promise.all([
      prisma.backupSystem.findMany({
        include: {
          ejecutadoPor: {
            select: {
              id: true,
              name: true,
              surname1: true,
              surname2: true,
              email: true
            }
          }
        },
        orderBy: { fechaInicio: 'desc' },
        skip,
        take: limit
      }),
      prisma.backupSystem.count()
    ]);

    // Obtener el último backup completo y el último incremental
    const [ultimoCompleto, ultimoIncremental] = await Promise.all([
      prisma.backupSystem.findFirst({
        where: { 
          tipoBackup: 'COMPLETO',
          estado: 'COMPLETADO'
        },
        orderBy: { fechaInicio: 'desc' }
      }),
      prisma.backupSystem.findFirst({
        where: { 
          tipoBackup: 'INCREMENTAL',
          estado: 'COMPLETADO'
        },
        orderBy: { fechaInicio: 'desc' }
      })
    ]);

    return NextResponse.json({
      backups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      resumen: {
        ultimoCompleto,
        ultimoIncremental
      }
    });

  } catch (error) {
    console.error('Error al obtener backups:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo backup
export async function POST() {
  try {
    const authResult = await verifyAdminAccess(new NextRequest(new URL('http://localhost')));
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    
    const { tipoBackup = 'INCREMENTAL' } = await request.json();

    if (!['INCREMENTAL', 'COMPLETO'].includes(tipoBackup)) {
      return NextResponse.json(
        { error: 'Tipo de backup inválido' },
        { status: 400 }
      );
    }

    // Crear registro de backup en la base de datos
    const backup = await prisma.backupSystem.create({
      data: {
        tipoBackup,
        ejecutadoPorId: user.id,
        estado: 'EN_PROGRESO'
      }
    });

    // Ejecutar backup en segundo plano
    executeBackup(backup.id, tipoBackup).catch(error => {
      console.error('Error en backup:', error);
      // Actualizar estado a fallido
      prisma.backupSystem.update({
        where: { id: backup.id },
        data: {
          estado: 'FALLIDO',
          fechaFin: new Date(),
          observaciones: error.message
        }
      }).catch(console.error);
    });

    return NextResponse.json({
      message: 'Backup iniciado correctamente',
      backupId: backup.id
    });

  } catch (error) {
    console.error('Error al iniciar backup:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function executeBackup(backupId: string, tipoBackup: string) {
  const backupDir = path.join(process.cwd(), 'backups');
  
  try {
    // Crear directorio de backups si no existe
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${tipoBackup.toLowerCase()}-${timestamp}.sql`;
    const filepath = path.join(backupDir, filename);

    // Obtener configuración de la base de datos
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no configurada');
    }

    const url = new URL(dbUrl);
    const dbName = url.pathname.slice(1);
    const dbHost = url.hostname;
    const dbPort = url.port || '5432';
    const dbUser = url.username;
    const dbPassword = url.password;

    let pgDumpCommand = '';

    if (tipoBackup === 'COMPLETO') {
      // Backup completo
      pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filepath}" --verbose --clean --if-exists --create`;
    } else {
      // Backup incremental: solo datos modificados desde el último backup
      await prisma.backupSystem.findFirst({
        where: {
          estado: 'COMPLETADO',
          fechaFin: { not: null }
        },
        orderBy: { fechaFin: 'desc' }
      });
      
      // Para el incremental, usamos pg_dump con una consulta WHERE basada en fechas
      // Esto es una simplificación, en un entorno real necesitarías un sistema más sofisticado
      pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filepath}" --verbose --data-only --table=public.*`;
    }

    // Configurar variable de entorno para contraseña
    const env = { ...process.env, PGPASSWORD: dbPassword };

    // Ejecutar comando de backup
    await execAsync(pgDumpCommand, { env });

    // Obtener tamaño del archivo
    const stats = await fs.stat(filepath);
    const tamaño = BigInt(stats.size);

    // Actualizar registro en la base de datos
    await prisma.backupSystem.update({
      where: { id: backupId },
      data: {
        estado: 'COMPLETADO',
        fechaFin: new Date(),
        archivoPath: filepath,
        tamaño,
        observaciones: stderr ? `Advertencias: ${stderr}` : 'Completado exitosamente'
      }
    });

    console.log(`Backup ${tipoBackup} completado: ${filename}`);

  } catch (error) {
    console.error('Error ejecutando backup:', error);
    
    await prisma.backupSystem.update({
      where: { id: backupId },
      data: {
        estado: 'FALLIDO',
        fechaFin: new Date(),
        observaciones: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    });

    throw error;
  }
}
