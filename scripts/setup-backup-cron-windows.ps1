# Script para configurar tareas programadas de backup en Windows
# Ejecutar como administrador

param(
    [string]$ApiUrl = "http://localhost:3000/api/backup/cron",
    [string]$CronToken = "your-secret-token-here"
)

Write-Host "Configurando tareas programadas de backup..." -ForegroundColor Green

# Crear tarea para backup incremental diario (cada día a las 2:00 AM)
$incrementalAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument @"
-Command "
try {
    `$headers = @{ 'Authorization' = 'Bearer $CronToken'; 'Content-Type' = 'application/json' }
    `$body = @{ tipoBackup = 'INCREMENTAL' } | ConvertTo-Json
    `$response = Invoke-RestMethod -Uri '$ApiUrl' -Method POST -Headers `$headers -Body `$body
    Write-Output \"Backup incremental iniciado: `$(`$response.backupId)\"
} catch {
    Write-Error \"Error en backup incremental: `$(`$_.Exception.Message)\"
}
"
"@

$incrementalTrigger = New-ScheduledTaskTrigger -Daily -At "02:00"
$incrementalSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable
$incrementalPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "PGA_Backup_Incremental" -Action $incrementalAction -Trigger $incrementalTrigger -Settings $incrementalSettings -Principal $incrementalPrincipal -Description "Backup incremental diario del sistema PGA"

Write-Host "✓ Tarea de backup incremental diario configurada (2:00 AM)" -ForegroundColor Green

# Crear tarea para backup completo semanal (domingos a las 1:00 AM)
$completoAction = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument @"
-Command "
try {
    `$headers = @{ 'Authorization' = 'Bearer $CronToken'; 'Content-Type' = 'application/json' }
    `$body = @{ tipoBackup = 'COMPLETO' } | ConvertTo-Json
    `$response = Invoke-RestMethod -Uri '$ApiUrl' -Method POST -Headers `$headers -Body `$body
    Write-Output \"Backup completo iniciado: `$(`$response.backupId)\"
} catch {
    Write-Error \"Error en backup completo: `$(`$_.Exception.Message)\"
}
"
"@

$completoTrigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek Sunday -At "01:00"
$completoSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable
$completoPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "PGA_Backup_Completo" -Action $completoAction -Trigger $completoTrigger -Settings $completoSettings -Principal $completoPrincipal -Description "Backup completo semanal del sistema PGA"

Write-Host "✓ Tarea de backup completo semanal configurada (Domingos 1:00 AM)" -ForegroundColor Green

Write-Host ""
Write-Host "Configuración completada. Las tareas programadas han sido creadas:" -ForegroundColor Cyan
Write-Host "- PGA_Backup_Incremental: Diario a las 2:00 AM" -ForegroundColor Yellow
Write-Host "- PGA_Backup_Completo: Domingos a la 1:00 AM" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Asegúrate de:" -ForegroundColor Red
Write-Host "1. Configurar la variable de entorno CRON_SECRET_TOKEN en tu aplicación" -ForegroundColor White
Write-Host "2. Que la aplicación esté ejecutándose cuando se ejecuten las tareas" -ForegroundColor White
Write-Host "3. Que PostgreSQL esté disponible y configurado correctamente" -ForegroundColor White
Write-Host ""
Write-Host "Para ver las tareas: Get-ScheduledTask -TaskName 'PGA_Backup_*'" -ForegroundColor Gray
Write-Host "Para eliminar las tareas: Unregister-ScheduledTask -TaskName 'PGA_Backup_*' -Confirm:`$false" -ForegroundColor Gray
