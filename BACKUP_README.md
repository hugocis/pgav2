# Sistema de Backup Incremental - PGA

Este sistema proporciona backup automático incremental y completo para la base de datos del sistema PGA.

## Características

- **Backups Incrementales**: Se ejecutan diariamente y solo incluyen cambios desde el último backup
- **Backups Completos**: Se ejecutan semanalmente e incluyen toda la base de datos
- **Interfaz Web**: Panel de administración para gestionar backups manualmente
- **Programación Automática**: Cron jobs para automatizar los backups
- **Limpieza Automática**: Mantiene solo los 30 backups más recientes
- **Logs y Monitoreo**: Registro detallado de todas las operaciones

## Configuración Inicial

### 1. Variables de Entorno

Agregar al archivo `.env`:

```bash
# Token secreto para autorizar cron jobs
CRON_SECRET_TOKEN=tu-token-secreto-muy-seguro-aqui
```

### 2. Migración de Base de Datos

El sistema ya incluye las migraciones necesarias. Si no se han aplicado, ejecutar:

```bash
npx prisma migrate deploy
```

### 3. Configuración de PostgreSQL

Asegurarse de que `pg_dump` esté disponible en el PATH del sistema y que las credenciales de la base de datos permitan hacer backups.

## Configuración de Backups Automáticos

### Windows

1. Abrir PowerShell como Administrador
2. Ejecutar el script de configuración:

```powershell
cd scripts
.\setup-backup-cron-windows.ps1 -ApiUrl "http://localhost:3000/api/backup/cron" -CronToken "tu-token-secreto"
```

Esto creará tareas programadas de Windows que se ejecutarán:
- **Backup Incremental**: Diariamente a las 2:00 AM
- **Backup Completo**: Domingos a la 1:00 AM

### Linux/macOS

1. Hacer ejecutable el script:

```bash
chmod +x scripts/setup-backup-cron-linux.sh
```

2. Ejecutar como root o con sudo:

```bash
sudo ./scripts/setup-backup-cron-linux.sh "http://localhost:3000/api/backup/cron" "tu-token-secreto"
```

## Uso del Panel Web

### Acceso

El panel de backup está disponible solo para administradores en:
`/admin/backup`

Se puede acceder desde el menú desplegable de administración en la barra de navegación.

### Funcionalidades

1. **Ejecutar Backup Manual**:
   - Hacer clic en "Backup Incremental" o "Backup Completo"
   - El sistema mostrará el estado del backup en tiempo real

2. **Ver Historial**:
   - Lista completa de todos los backups ejecutados
   - Estado, fecha, duración y tamaño de cada backup
   - Información sobre quién ejecutó cada backup

3. **Resumen**:
   - Información sobre el último backup completo e incremental
   - Estado actual del sistema de backup

## API Endpoints

### Gestión Manual (Solo Administradores)

#### GET `/api/backup`
Obtiene el historial de backups con paginación.

Parámetros de consulta:
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)

#### POST `/api/backup`
Ejecuta un backup manual.

Body:
```json
{
  "tipoBackup": "INCREMENTAL" | "COMPLETO"
}
```

### Automatización (Solo Cron Jobs)

#### POST `/api/backup/cron`
Ejecuta backup automático (requiere token de autorización).

Headers:
```
Authorization: Bearer tu-token-secreto
Content-Type: application/json
```

Body:
```json
{
  "tipoBackup": "INCREMENTAL" | "COMPLETO"
}
```

## Estructura de Archivos

```
backups/
├── backup-incremental-2025-01-20T02-00-00-000Z.sql
├── backup-completo-2025-01-21T01-00-00-000Z.sql
└── ...
```

Los archivos se nombran con:
- Tipo de backup (incremental/completo)
- Timestamp ISO con caracteres seguros para nombres de archivo

## Monitoreo y Logs

### Windows
- Ver tareas programadas: `Get-ScheduledTask -TaskName 'PGA_Backup_*'`
- Logs del sistema en el Visor de Eventos

### Linux/macOS
- Ver cron jobs: `crontab -l`
- Logs en `/var/log/pga-backup/`

### Base de Datos
Todos los backups se registran en la tabla `BackupSystem` con:
- Estado del backup
- Fechas de inicio y fin
- Tamaño del archivo
- Observaciones y errores
- Usuario que ejecutó el backup

## Solución de Problemas

### Error: "pg_dump no encontrado"
Instalar PostgreSQL client tools o agregar pg_dump al PATH.

### Error: "CRON_SECRET_TOKEN no configurado"
Verificar que la variable de entorno esté configurada en el archivo `.env`.

### Error: "No autorizado"
Verificar que el token en las tareas programadas coincida con el configurado en la aplicación.

### Backup toma mucho tiempo
Los backups grandes pueden tomar tiempo. El timeout está configurado a 30 minutos.

### Espacio en disco
El sistema mantiene automáticamente solo los 30 backups más recientes para evitar llenar el disco.

## Seguridad

- Solo usuarios con rol "Admin" pueden acceder al panel web
- Los cron jobs requieren un token secreto para ejecutarse
- Los archivos de backup se almacenan localmente y deben ser protegidos adecuadamente
- Se recomienda configurar backups adicionales de los archivos generados a ubicaciones seguras

## Recomendaciones de Producción

1. **Almacenamiento Externo**: Configurar copia automática de backups a almacenamiento en la nube o servidores remotos
2. **Monitoreo**: Configurar alertas para detectar fallos en los backups
3. **Pruebas de Restauración**: Probar regularmente que los backups se pueden restaurar correctamente
4. **Retención**: Ajustar la política de retención según las necesidades de la organización
