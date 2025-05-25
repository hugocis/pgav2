# Portal de Gestión de Asistencias (PGA)

## Descripción
Portal de Gestión de Asistencias para la Universidad Francisco de Vitoria.

## Requisitos
- Node.js 18.x o superior
- PostgreSQL 14.x
- Docker (opcional, para desarrollo)

## Configuración del entorno

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

## Ejecutar en desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar base de datos con Docker (opcional)
npm run docker:up

# Aplicar migraciones
npx prisma migrate dev

# Cargar datos de prueba
npm run seed

# Iniciar servidor de desarrollo
npm run dev
```

## Ejecutar en producción

```bash
# Construir la aplicación
npm run build

# Iniciar servidor
npm start
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

```
app/                # Directorio principal de Next.js App Router
  ├── api/          # Endpoints API
  ├── auth/         # Páginas de autenticación
  ├── admin/        # Panel de administrador
  ├── alumno/       # Panel de alumno
  ├── manager/      # Panel de gestor
  ├── pec/          # Panel de PEC
  └── profesor/     # Panel de profesor
components/         # Componentes React
lib/                # Utilidades y funciones
prisma/             # Esquema y migraciones de Prisma
public/             # Archivos estáticos
```

## Licencia
Propiedad de la Universidad Francisco de Vitoria.
