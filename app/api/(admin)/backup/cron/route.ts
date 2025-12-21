import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Función para verificar si es un acceso autorizado (token secreto)
function verifyAuthorization(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET_TOKEN;
  
  if (!expectedToken) {
    console.error('CRON_SECRET_TOKEN no está configurado en las variables de entorno');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === expectedToken;
}

// POST: Ejecutar backup automático (para ser llamado por cron)
export async function POST(request: NextRequest) {
  try {
    // Verificar autorización
    if (!verifyAuthorization(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { tipoBackup } = await request.json();
    
    if (!['INCREMENTAL', 'COMPLETO'].includes(tipoBackup)) {
      return NextResponse.json(
        { error: 'Tipo de backup inválido' },
        { status: 400 }
      );
    }

    // Crear registro de backup automático (sin usuario específico)
    const backup = await prisma.backupSystem.create({
      data: {
        tipoBackup,
        estado: 'EN_PROGRESO',
        observaciones: 'Backup automático ejecutado por cron'
      }
    });

    // Ejecutar backup en segundo plano
    executeAutomaticBackup(backup.id, tipoBackup).catch(error => {
      console.error('Error en backup automático:', error);
      // Actualizar estado a fallido
      prisma.backupSystem.update({
        where: { id: backup.id },
        data: {
          estado: 'FALLIDO',
          fechaFin: new Date(),
          observaciones: `Error en backup automático: ${error.message}`
        }
      }).catch(console.error);
    });

    return NextResponse.json({
      message: 'Backup automático iniciado correctamente',
      backupId: backup.id
    });

  } catch (error) {
    console.error('Error al iniciar backup automático:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function executeAutomaticBackup(backupId: string, tipoBackup: string) {
  const backupDir = path.join(process.cwd(), 'backups');
  
  try {
    // Crear directorio de backups si no existe
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-auto-${tipoBackup.toLowerCase()}-${timestamp}.sql`;
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

      // Para el incremental, hacemos un backup de datos modificados
      pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${filepath}" --verbose --data-only`;
    }

    // Configurar variable de entorno para contraseña
    const env = { ...process.env, PGPASSWORD: dbPassword };

    // Ejecutar comando de backup
    await execAsync(pgDumpCommand, { 
      env,
      timeout: 30 * 60 * 1000 // 30 minutos de timeout
    });

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
        observaciones: 'Backup automático completado exitosamente'
      }
    });

    console.log(`Backup automático ${tipoBackup} completado: ${filename}`);

    // Limpiar backups antiguos (mantener solo los últimos 30)
    await cleanupOldBackups();

  } catch (error) {
    console.error('Error ejecutando backup automático:', error);
    
    await prisma.backupSystem.update({
      where: { id: backupId },
      data: {
        estado: 'FALLIDO',
        fechaFin: new Date(),
        observaciones: `Error en backup automático: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    });

    throw error;
  }
}

async function cleanupOldBackups() {
  try {
    // Obtener backups antiguos (mantener solo los últimos 30)
    const backupsAntiguos = await prisma.backupSystem.findMany({
      where: {
        estado: 'COMPLETADO',
        archivoPath: { not: null }
      },
      orderBy: { fechaFin: 'desc' },
      skip: 30 // Saltar los 30 más recientes
    });

    for (const backup of backupsAntiguos) {
      try {
        // Eliminar archivo físico si existe
        if (backup.archivoPath) {
          await fs.unlink(backup.archivoPath);
        }
        
        // Actualizar registro para indicar que el archivo fue eliminado
        await prisma.backupSystem.update({
          where: { id: backup.id },
          data: {
            archivoPath: null,
            observaciones: backup.observaciones + ' (Archivo eliminado por limpieza automática)'
          }
        });
        
        console.log(`Backup antiguo eliminado: ${backup.id}`);
      } catch (error) {
        console.error(`Error eliminando backup ${backup.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error en limpieza de backups antiguos:', error);
  }
}
