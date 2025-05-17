# Portal de Gestión Académica (PGA)

Aplicación web para la gestión académica universitaria, desarrollada con Next.js, Prisma y PostgreSQL. Facilita la administración de asistencia a clase, gestión de matrículas, dispensas académicas, justificaciones y otros aspectos relacionados con la vida académica.

## Características

- **Gestión de asistencia**: Permite a los profesores registrar asistencia y a los alumnos revisar sus registros.
- **Múltiples roles**: Funcionalidad adaptada para alumnos, profesores, administradores y gestores académicos.
- **Justificaciones**: Sistema para solicitar, revisar y aprobar justificaciones de ausencia.
- **Dispensas académicas**: Gestión de solicitudes de dispensas para actividades académicas específicas.
- **Dashboard personalizado**: Interfaz adaptada a cada tipo de usuario.
- **Registro de actividad**: Control detallado de acciones realizadas en el sistema.

## Tecnologías

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: API Routes de Next.js
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Contenedorización**: Docker y Docker Compose

## Requisitos

- Node.js (versión 20 o superior)
- npm (versión 10 o superior)
- PostgreSQL (opcional si usas Docker)
- Docker y Docker Compose (opcional)

## Instalación y Ejecución

### Desarrollo Local

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd pga
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Edita `.env` con tus configuraciones locales.

4. **Configurar la base de datos**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Ejecutar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Usando Docker

1. **Configurar variables de entorno para Docker**
   ```bash
   cp .env.example .env.production
   ```
   Edita `.env.production` con las configuraciones para Docker.

2. **Construir e iniciar los contenedores**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

3. **Ver logs (opcional)**
   ```bash
   npm run docker:logs
   ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

Para más detalles sobre la configuración de Docker, consulta [README-docker.md](README-docker.md).

## Estructura del proyecto

```
app/                      # Código de la aplicación Next.js
  api/                    # API Routes (backend)
  (rutas de frontend)     # Páginas de la aplicación
components/               # Componentes React reutilizables
lib/                      # Utilidades y configuraciones
prisma/                   # Esquemas y migraciones de Prisma
public/                   # Archivos estáticos
scripts/                  # Scripts de utilidad
types/                    # Declaraciones de tipos TypeScript
```

## Entornos de ejecución

- **Desarrollo**: Ejecuta `npm run dev` para desarrollo local
- **Producción con Docker**: Usa Docker Compose como se describe en la sección Docker
- **Producción sin Docker**: Construye la aplicación con `npm run build` y ejecútala con `npm start`

## Licencia

Este proyecto es privado y está destinado exclusivamente para uso académico.
