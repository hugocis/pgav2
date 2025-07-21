#!/bin/bash

# Script para configurar cron jobs de backup en Linux/macOS
# Uso: ./setup-backup-cron-linux.sh [API_URL] [CRON_TOKEN]

API_URL=${1:-"http://localhost:3000/api/backup/cron"}
CRON_TOKEN=${2:-"your-secret-token-here"}

echo "Configurando cron jobs de backup..."

# Crear directorio para logs si no existe
mkdir -p /var/log/pga-backup

# Crear script para backup incremental
cat > /usr/local/bin/pga-backup-incremental.sh << EOF
#!/bin/bash
LOG_FILE="/var/log/pga-backup/incremental-\$(date +%Y%m%d).log"
echo "\$(date): Iniciando backup incremental" >> \$LOG_FILE

curl -X POST "$API_URL" \\
  -H "Authorization: Bearer $CRON_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tipoBackup": "INCREMENTAL"}' \\
  >> \$LOG_FILE 2>&1

if [ \$? -eq 0 ]; then
    echo "\$(date): Backup incremental iniciado correctamente" >> \$LOG_FILE
else
    echo "\$(date): Error al iniciar backup incremental" >> \$LOG_FILE
fi
EOF

# Crear script para backup completo
cat > /usr/local/bin/pga-backup-completo.sh << EOF
#!/bin/bash
LOG_FILE="/var/log/pga-backup/completo-\$(date +%Y%m%d).log"
echo "\$(date): Iniciando backup completo" >> \$LOG_FILE

curl -X POST "$API_URL" \\
  -H "Authorization: Bearer $CRON_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tipoBackup": "COMPLETO"}' \\
  >> \$LOG_FILE 2>&1

if [ \$? -eq 0 ]; then
    echo "\$(date): Backup completo iniciado correctamente" >> \$LOG_FILE
else
    echo "\$(date): Error al iniciar backup completo" >> \$LOG_FILE
fi
EOF

# Hacer ejecutables los scripts
chmod +x /usr/local/bin/pga-backup-incremental.sh
chmod +x /usr/local/bin/pga-backup-completo.sh

echo "✓ Scripts de backup creados"

# Obtener crontab actual
crontab -l > /tmp/crontab_backup 2>/dev/null || touch /tmp/crontab_backup

# Eliminar entradas anteriores de PGA backup si existen
grep -v "pga-backup" /tmp/crontab_backup > /tmp/crontab_new

# Agregar nuevas entradas
echo "# PGA Backup System - Backup incremental diario a las 2:00 AM" >> /tmp/crontab_new
echo "0 2 * * * /usr/local/bin/pga-backup-incremental.sh" >> /tmp/crontab_new
echo "# PGA Backup System - Backup completo semanal (domingos a la 1:00 AM)" >> /tmp/crontab_new
echo "0 1 * * 0 /usr/local/bin/pga-backup-completo.sh" >> /tmp/crontab_new

# Instalar nuevo crontab
crontab /tmp/crontab_new

# Limpiar archivos temporales
rm /tmp/crontab_backup /tmp/crontab_new

echo "✓ Cron jobs configurados"
echo ""
echo "Configuración completada. Los cron jobs han sido creados:"
echo "- Backup incremental: Diario a las 2:00 AM"
echo "- Backup completo: Domingos a la 1:00 AM"
echo ""
echo "IMPORTANTE:"
echo "1. Configurar la variable de entorno CRON_SECRET_TOKEN en tu aplicación"
echo "2. Asegurarse de que la aplicación esté ejecutándose cuando se ejecuten los cron jobs"
echo "3. Verificar que PostgreSQL esté disponible y configurado correctamente"
echo "4. Los logs se guardarán en /var/log/pga-backup/"
echo ""
echo "Para ver los cron jobs: crontab -l"
echo "Para ver logs: tail -f /var/log/pga-backup/*.log"

# Mostrar crontab actual
echo ""
echo "Cron jobs actuales:"
crontab -l | grep -A1 -B1 "pga-backup"
