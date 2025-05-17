# Instrucciones para Docker

Este documento explica cómo utilizar Docker para ejecutar la aplicación PGA.

## Configuración Inicial

1. Primero, asegúrate de tener Docker y Docker Compose instalados en tu sistema:
   - [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Docker Compose viene incluido con Docker Desktop

2. Copia el archivo `.env.example` a `.env.production` y ajusta los valores según tu entorno:
   ```bash
   cp .env.example .env.production
   ```

3. Edita `.env.production` con tus valores de configuración. **Importante**: Cambia las contraseñas y los secretos.

## Ejecutar la Aplicación

Para iniciar la aplicación usando Docker:

```bash
# Construye los contenedores
npm run docker:build

# Inicia los contenedores en modo detached (segundo plano)
npm run docker:up

# Ver los logs en tiempo real
npm run docker:logs
```

## Detener la Aplicación

Para detener la aplicación:

```bash
npm run docker:down
```

## Comandos Útiles

```bash
# Ver los logs específicos del contenedor de la aplicación web
docker logs -f pga-web

# Ver los logs específicos de la base de datos
docker logs -f pga-postgres

# Reiniciar un contenedor específico
docker restart pga-web
```

## Estructura Docker

El entorno Docker consta de dos servicios principales:

1. **postgres**: Base de datos PostgreSQL
   - Solo accesible por la aplicación Next.js dentro de la red Docker
   - Los datos se persisten en un volumen llamado `pga-postgres-data`

2. **web**: Aplicación Next.js
   - Expone el puerto 3000 para acceder a la aplicación
   - Se conecta a la base de datos PostgreSQL
   - Ejecuta automáticamente las migraciones de Prisma al inicio

## Notas importantes

- La base de datos no está expuesta fuera del entorno Docker, solo la aplicación Next.js puede acceder a ella.
- Las credenciales de la base de datos y otros secretos deben mantenerse seguros en el archivo `.env.production`.
- Al ejecutar en producción, considera cambiar todos los secretos y contraseñas predeterminadas.
