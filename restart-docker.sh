# Instalar dependencias si es necesario
npm install

# Detener los contenedores existentes
docker-compose down

# Reconstruir las imágenes con los cambios
docker-compose build

# Iniciar los contenedores
docker-compose up -d

# Ver los logs para verificar el funcionamiento
docker-compose logs -f