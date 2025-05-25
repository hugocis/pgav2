#!/bin/bash
# Script para inicializar la base de datos en el entorno dockerizado

# Mostramos la URL de conexión (con contraseña oculta)
echo "Intentando conectar a: $(echo $DATABASE_URL | sed 's/:\/\/[^:]*:[^@]*@/:\/\/****:****@/')"

# Definimos variables para conexión
DB_HOST=postgres
DB_PORT=5432
DB_USER=$PGUSER
DB_PASSWORD=$PGPASSWORD
DB_NAME=$PGDATABASE

# Esperar a que Postgres esté disponible usando postgres-specific tools
MAX_RETRIES=30
RETRY_COUNT=0

echo "Esperando a que la base de datos PostgreSQL esté disponible..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; do
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "No se pudo conectar a PostgreSQL después de $MAX_RETRIES intentos. Saliendo."
    exit 1
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Intento $RETRY_COUNT/$MAX_RETRIES: PostgreSQL no está disponible aún, esperando..."
  sleep 3
done

echo "¡PostgreSQL está disponible! Esperando 3 segundos adicionales para asegurar que está listo..."
sleep 3

# Mostramos información sobre la conexión
echo "Comprobando la conexión a la base de datos..."
export PGPASSWORD=$DB_PASSWORD
CONN_TEST=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 'Conexión exitosa';" 2>&1 || echo "Error de conexión")
echo "$CONN_TEST"

# Asegurarnos de que existe el directorio .npm y tiene los permisos correctos
mkdir -p $HOME/.npm
chmod 700 $HOME/.npm

# Verificar que el archivo schema.prisma existe
echo "Verificando la ubicación del schema.prisma..."
if [ -f "./prisma/schema.prisma" ]; then
  echo "✅ Schema encontrado en ./prisma/schema.prisma"
  SCHEMA_PATH="./prisma/schema.prisma"
else
  echo "❌ No se encontró el archivo schema.prisma"
  ls -la ./prisma/
  echo "Contenido del directorio actual:"
  ls -la ./
  exit 1
fi

# Intentamos ejecutar migraciones de Prisma
echo "Ejecutando migraciones de Prisma..."
HOME=$HOME npx prisma migrate deploy --schema=$SCHEMA_PATH

MIGRATE_EXIT_CODE=$?
if [ $MIGRATE_EXIT_CODE -eq 0 ]; then
  echo "✅ Migraciones de Prisma aplicadas correctamente."

  # Comprobamos si debemos ejecutar el seeder
  if [ "$RUN_SEEDER" = "true" ]; then
    echo "🌱 Ejecutando seeder de Prisma..."
    echo "Verificando que ts-node está instalado..."
    if ! command -v ts-node >/dev/null 2>&1; then
      echo "⚠️ ts-node no encontrado, intentando instalarlo globalmente..."
      npm install -g ts-node typescript
    fi
    
    echo "Ejecutando seed con HOME=$HOME"
    HOME=$HOME npx prisma db seed --schema=$SCHEMA_PATH
    if [ $? -eq 0 ]; then
      echo "✅ Seed ejecutado correctamente."
    else
      echo "❌ Error al ejecutar el seeder. Continuar de todos modos."
    fi
  else
    echo "ℹ️ Seeder desactivado. Establecer RUN_SEEDER=true para ejecutarlo."
  fi
else
  echo "❌ Error al aplicar las migraciones de Prisma, código de salida: $MIGRATE_EXIT_CODE"
  exit $MIGRATE_EXIT_CODE
fi

echo "✅ Inicialización de la base de datos completada."