#!/bin/bash

# Este script ejecuta comandos de Prisma dentro del contenedor Docker para evitar tener que instalar Prisma localmente
# Uso: ./prisma-docker.sh <comando>
# Ejemplo: ./prisma-docker.sh migrate dev

# Asegurarse de que el contenedor web está ejecutándose
if ! docker ps | grep -q pga-web; then
  echo "El contenedor pga-web no está en ejecución. Inicie los contenedores primero con 'npm run docker:up'"
  exit 1
fi

# Ejecutar el comando Prisma dentro del contenedor
docker exec -it pga-web npx prisma $@

echo "Comando prisma $@ ejecutado en el contenedor Docker"
