#!/bin/sh
# Script para inicializar la base de datos en el entorno dockerizado

# Esperamos a que la base de datos esté disponible
echo "Esperando a que la base de datos esté disponible..."
until npx prisma migrate status > /dev/null 2>&1; do
  echo "Base de datos no disponible aún, esperando..."
  sleep 2
done

# Ejecutamos las migraciones de Prisma
echo "Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Opcionalmente ejecutamos el seeder si es necesario
if [ "$RUN_SEEDER" = "true" ]; then
  echo "Ejecutando seeder..."
  npx prisma db seed
fi

echo "Base de datos inicializada correctamente."
