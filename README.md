# Portal de Gestión de Asistencias (PGA)

![Logo UFV](public/logo-UFV.png)

## Descripción
Portal de Gestión de Asistencias para la Universidad Francisco de Vitoria. 

Este sistema permite la gestión integral de asistencia de los alumnos a las diferentes asignaturas, facilitando el proceso tanto para estudiantes como para personal docente y administrativo. La aplicación está diseñada con diferentes roles y permisos para atender a las necesidades específicas de cada tipo de usuario.

### Características principales
- Registro y control de asistencia a clases
- Justificación de ausencias por parte de los alumnos
- Gestión de dispensas académicas
- Generación de informes de asistencia
- Estadísticas de asistencia por asignaturas, grupos y alumnos
- Panel administrativo para configuración del sistema

### Tecnologías
- **Frontend:** React, Next.js 13+ (App Router)
- **Backend:** Node.js con API Routes de Next.js
- **Base de datos:** PostgreSQL con Prisma ORM
- **Autenticación:** NextAuth.js
- **Testing:** Jest

## Requisitos
- Node.js 18.x o superior
- PostgreSQL 14.x
- Docker (opcional, para desarrollo)

## Configuración del entorno

### Instalación de dependencias

Primero, instala todas las dependencias necesarias:

```bash
npm install
```

### Configuración de la base de datos

Tienes dos opciones para configurar la base de datos:

#### Opción 1: PostgreSQL local
Si ya tienes PostgreSQL instalado localmente, solo necesitas crear una base de datos llamada `pga`.

#### Opción 2: Docker (recomendado para desarrollo)
El proyecto incluye configuración de Docker para facilitar el desarrollo:

```bash
# Iniciar contenedor de PostgreSQL
npm run docker:up
# o directamente
docker-compose up -d
```

Para detener los contenedores:
```bash
npm run docker:down
# o directamente
docker-compose down
```

También puedes utilizar los scripts `restart-docker.ps1` (Windows) o `restart-docker.sh` (Linux/Mac) para reiniciar los contenedores.

### Variables de entorno
Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Base de datos
DATABASE_URL="postgresql://username:password@localhost:5432/pga"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-aqui"

# Email (para recuperación de contraseña)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="tu-usuario@example.com"
EMAIL_SERVER_PASSWORD="tu-contraseña"
EMAIL_FROM="noreply@example.com"

# Seguridad
LOG_INTEGRITY_SECRET="clave-secreta-para-firmar-logs"
```

Para desarrollo con Docker, puedes usar estas credenciales por defecto:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pga"
```

## Ejecutar en desarrollo

Sigue estos pasos para configurar y ejecutar el proyecto en modo desarrollo:

```bash
# 1. Instalar dependencias (si no lo has hecho ya)
npm install

# 2. Iniciar base de datos con Docker (opcional)
npm run docker:up

# 3. Aplicar migraciones de la base de datos
npx prisma migrate dev

# 4. Cargar datos de prueba (seed)
npm run seed
# o directamente
npx prisma db seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

Una vez ejecutados estos comandos, la aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Comandos útiles durante el desarrollo

```bash
# Generar cliente de Prisma (después de cambiar schema.prisma)
npx prisma generate

# Ver estructura de la base de datos con Prisma Studio
npx prisma studio

# Formatear los archivos de Prisma
npx prisma format

# Resetear la base de datos (¡cuidado! eliminará todos los datos)
npx prisma migrate reset
```

## Ejecutar en producción

Para desplegar la aplicación en un entorno de producción:

```bash
# 1. Instalar dependencias sin desarrollo
npm install --production

# 2. Construir la aplicación
npm run build

# 3. Aplicar migraciones (solo si hay cambios en el esquema)
npx prisma migrate deploy

# 4. Iniciar servidor
npm start
```

### Consideraciones para producción

- Asegúrate de configurar correctamente las variables de entorno para el entorno de producción
- Utiliza un servicio de PostgreSQL gestionado o configura correctamente un servidor propio
- Configura un proxy inverso (como Nginx) delante de la aplicación
- Establece un sistema de monitorización para la aplicación

### Despliegue con Docker

También puedes utilizar Docker para producción con el Dockerfile incluido:

```bash
# Construir la imagen
docker build -t pga-app .

# Ejecutar el contenedor
docker run -p 3000:3000 --env-file .env.production pga-app
```

## Testing

Este proyecto utiliza Jest para pruebas unitarias. Para ejecutar los tests:

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con watch mode (útil durante desarrollo)
npm run test:watch

# Generar informe de cobertura
npm run test:coverage

# Ejecutar sólo tests específicos
npm run test:api    # Tests de API
npm run test:lib    # Tests de utilidades/funciones
```

### Estructura de tests
Los tests están organizados en directorios que reflejan la estructura del proyecto:

```
__tests__/
  ├── api/         # Tests para las rutas API
  │    ├── auth/   # Tests para autenticación
  │    └── user/   # Tests para usuarios
  └── lib/         # Tests para funciones de utilidad
```

## Estructura del proyecto

El proyecto sigue la estructura de Next.js con App Router:

```
app/                      # Directorio principal de Next.js App Router
  ├── api/                # Endpoints API
  │   ├── (admin)/        # API para administradores
  │   ├── (manager)/      # API para gestores
  │   ├── (pec)/          # API para PEC
  │   ├── (student)/      # API para estudiantes
  │   ├── (teacher)/      # API para profesores
  │   ├── auth/           # API de autenticación
  │   ├── health/         # API de estado del sistema
  │   └── user/           # API de usuarios
  ├── auth/               # Páginas de autenticación
  ├── admin/              # Panel de administrador
  │   ├── dashboard/      # Dashboard del administrador
  │   ├── users/          # Gestión de usuarios
  │   ├── curso-academico/# Configuración de cursos
  │   └── ...             # Otros módulos de administración
  ├── alumno/             # Panel de alumno
  ├── manager/            # Panel de gestor
  ├── pec/                # Panel de PEC
  └── profesor/           # Panel de profesor
      ├── pasar-clase/    # Registro de asistencia
      └── ...             # Otras funcionalidades
components/               # Componentes React reutilizables
lib/                      # Utilidades y funciones
  ├── actions/            # Acciones del servidor
  ├── authOptions.ts      # Configuración de autenticación
  └── prisma.ts           # Cliente de Prisma
prisma/                   # Esquema y migraciones de Prisma
  ├── schema.prisma       # Definición del modelo de datos
  ├── seed.ts             # Script para cargar datos de prueba
  └── migrations/         # Migraciones de la base de datos
public/                   # Archivos estáticos
types/                    # Definiciones de tipos TypeScript
__tests__/                # Tests unitarios y de integración
__mocks__/                # Mocks para testing
```

### Sistema de roles

El portal distingue entre diferentes tipos de usuarios, cada uno con su propio panel y funcionalidades:

#### 1. Administrador (`admin`)
- Gestión completa de usuarios y permisos
- Configuración de carreras, asignaturas y cursos académicos
- Vista general de actividad del sistema
- Gestión de matrículas

#### 2. Alumno (`alumno`)
- Visualización de su asistencia por asignaturas
- Justificación de ausencias
- Solicitud de dispensas académicas

#### 3. Gestor (`manager`)
- Gestión de justificaciones presentadas por alumnos
- Tramitación de dispensas académicas
- Generación de informes de asistencia
- Control de firmas de docentes

#### 4. PEC (`pec`)
- Gestión de asistencia de alumnos
- Consulta de alumnos GOE (Grupo de Orientación Educativa)
- Vista específica para seguimiento de alumnos

#### 5. Profesor (`profesor`)
- Registro de asistencia en clase
- Consulta de historial de sesiones
- Visualización de estadísticas de asistencia
- Gestión de grupos y alumnos asignados

## Contribución

Si deseas contribuir al proyecto:

1. Crea un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -am 'Añadir nueva funcionalidad'`)
4. Sube tus cambios a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

### Convenciones de código
- Utiliza ESLint para mantener la consistencia del código
- Escribe tests para todas las nuevas funcionalidades
- Sigue las prácticas de TypeScript para el tipado estricto

## Versiones

### v1.0.0 (Mayo 2025)
- Versión inicial del Portal de Gestión de Asistencias
- Implementación de todos los roles básicos
- Sistema de justificación y dispensas

## Licencia
Propiedad de la Universidad Francisco de Vitoria.

## Solución de problemas comunes

### Problemas con la base de datos
- **Error "Could not connect to database"**: Verifica que PostgreSQL esté en ejecución y que las credenciales en `.env` sean correctas.
- **Error al ejecutar migraciones**: Intenta ejecutar `npx prisma migrate reset --force` para reiniciar la base de datos.
- **Prisma Client no está generado**: Ejecuta `npx prisma generate` para regenerar el cliente.

### Problemas con Docker
- **No se puede conectar al contenedor**: Verifica que Docker esté en ejecución y utiliza `docker ps` para comprobar el estado del contenedor.
- **Conflicto de puertos**: Si el puerto 5432 ya está en uso, modifica el puerto mapeado en `docker-compose.yml`.
- **Contenedor no inicia**: Utiliza `docker logs [nombre-contenedor]` para ver los logs de error.

### Problemas con Next.js
- **Error "Module not found"**: Verifica que todas las dependencias estén instaladas con `npm install`.
- **Problemas de compilación**: Limpia la caché con `npm run clean` y vuelve a intentar.
- **Cambios no se reflejan**: Reinicia el servidor de desarrollo.

Para cualquier otro problema, por favor abre un issue en el repositorio del proyecto con una descripción detallada del error y los pasos para reproducirlo.
