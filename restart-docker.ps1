# Este script reinicia los contenedores Docker con la nueva configuración

$dockerComposeFile = "c:\Users\Hugo\Desktop\PFG-v2\pga\docker-compose.yml"

Write-Host "[INFO] Verificando que Docker está en ejecución..." -ForegroundColor Cyan
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker no está en ejecución. Por favor, inicia Docker Desktop primero." -ForegroundColor Red
        exit 1
    }
    else {
        Write-Host "[OK] Docker está en ejecución." -ForegroundColor Green
    }
}
catch {
    Write-Host "[ERROR] Docker no está instalado o no se puede acceder a él." -ForegroundColor Red
    exit 1
}

Write-Host "[STOP] Deteniendo los contenedores Docker..." -ForegroundColor Red
docker-compose -f $dockerComposeFile down

Write-Host "[CLEAN] Eliminando contenedor web para forzar reconstrucción..." -ForegroundColor Yellow
docker rm pga-web -f 2>$null

Write-Host "[CHECK] Verificando que la variable RUN_SEEDER está activada..." -ForegroundColor Cyan
$envContent = Get-Content "$PSScriptRoot\.env.production"
$seedEnabled = $false

foreach ($line in $envContent) {
    if ($line -match "RUN_SEEDER=true") {
        $seedEnabled = $true
        break
    }
}

if (-not $seedEnabled) {
    Write-Host "[WARNING] La variable RUN_SEEDER no está activada. ¿Desea activarla? (s/n)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "s" -or $response -eq "S") {
        $envContent = $envContent -replace "RUN_SEEDER=false", "RUN_SEEDER=true"
        $envContent | Set-Content "$PSScriptRoot\.env.production"
        Write-Host "[OK] RUN_SEEDER activado." -ForegroundColor Green
    }
}

Write-Host "[BUILD] Reconstruyendo la imagen de la aplicación web sin cache..." -ForegroundColor Magenta
docker-compose -f $dockerComposeFile build --no-cache web

Write-Host "[START] Iniciando los contenedores..." -ForegroundColor Green
docker-compose -f $dockerComposeFile up -d

Write-Host "[WAIT] Esperando a que los contenedores se inicien..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "[LOGS] Mostrando logs de los contenedores..." -ForegroundColor Blue
docker-compose -f $dockerComposeFile logs

Write-Host "[TIP] Para ver logs en tiempo real, ejecuta: docker-compose logs -f" -ForegroundColor Cyan
Write-Host "[DONE] Script completado. La aplicación debería estar disponible en http://localhost:3000" -ForegroundColor Green
