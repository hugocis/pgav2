# Guía de Testing del Portal de Gestión de Asistencias (PGA)

Este documento describe la estrategia de testing implementada en el Portal de Gestión de Asistencias para la Universidad Francisco de Vitoria.

## Tecnologías utilizadas

- **Jest**: Framework de testing
- **Testing Library**: Para tests de componentes React (cuando sea necesario)
- **Mock Service Worker**: Para simular peticiones API en tests de frontend (cuando sea necesario)

## Estructura de los tests

Los tests están organizados de forma que reflejan la estructura del proyecto:

`
__tests__/
  +-- api/                   # Tests para las rutas API
  ¦    +-- admin/            # Tests para APIs de administración
  ¦    ¦    +-- users/       # Tests para API de usuarios
  ¦    +-- auth/             # Tests para autenticación
  ¦    +-- health/           # Tests para endpoint de salud
  ¦    +-- manager/          # Tests para APIs de gestores
  ¦    ¦    +-- manager-carreras/  # Tests para API de asignación de carreras a managers
  ¦    +-- student/          # Tests para APIs de estudiantes
  ¦         +-- solicitudes-dispensa/  # Tests para API de solicitudes de dispensa
  ¦
  +-- lib/                   # Tests para funciones de utilidad
       +-- authOptions.test.js       # Tests para opciones de autenticación
       +-- authOptions-adicional.test.js  # Tests adicionales para autenticación
       +-- logActivity.test.js       # Tests para registro de actividades
       +-- logActivity-adicional.test.js  # Tests adicionales para registro de actividades
       +-- password-reset.test.js    # Tests para restablecimiento de contraseña
       +-- password-reset-complete.test.js  # Tests para completar restablecimiento de contraseña
       +-- prisma.test.js            # Tests para cliente Prisma
`

## Ejecutar los tests

Los tests pueden ejecutarse usando los siguientes comandos:

`ash
# Ejecutar todos los tests
npm test

# Ejecutar tests con watch mode (útil durante desarrollo)
npm run test:watch

# Generar informe de cobertura
npm run test:coverage

# Ejecutar sólo tests específicos
npm run test:api    # Tests de API
npm run test:lib    # Tests de utilidades/funciones
`

## Mocks

Para facilitar el testing, se utilizan mocks para varios componentes:

### Mock de Prisma

Para tests que interactúan con la base de datos, usamos un mock de Prisma Client:

`javascript
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    // Aquí se definen los modelos y métodos necesarios para cada test
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      // ...
    },
    // ...otros modelos
  },
}));
`

### Mock de NextAuth

Para tests que requieren autenticación:

`javascript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));
`

### Otros mocks comunes

- crypt: Para funciones de hash de contraseñas
- crypto: Para funciones criptográficas
- 
odemailer: Para envío de emails

## Guía para escribir tests

### Tests de API

Cada endpoint debe probarse para verificar:

1. **Autenticación/Autorización**: ¿El endpoint rechaza peticiones no autorizadas?
2. **Validación de entrada**: ¿Valida correctamente los datos de entrada?
3. **Camino feliz**: ¿Funciona correctamente con entradas válidas?
4. **Manejo de errores**: ¿Maneja graciosamente los errores?

Ejemplo básico:

`javascript
describe('GET /api/some-endpoint', () => {
  it('debe rechazar peticiones sin autenticación', async () => {
    // Setup mocks
    getServerSession.mockResolvedValueOnce(null);
    
    // Llamar al endpoint
    const response = await GET();
    
    // Verificar respuesta
    expect(response.status).toBe(401);
  });

  it('debe devolver datos correctos cuando está autenticado', async () => {
    // Setup mocks para autenticación
    getServerSession.mockResolvedValueOnce({
      user: { id: 'user123', roles: ['Admin'] }
    });
    
    // Setup mocks para datos
    prisma.default.someModel.findMany.mockResolvedValueOnce([
      // datos mock
    ]);
    
    // Llamar al endpoint
    const response = await GET();
    
    // Verificar respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(/* resultados esperados */);
  });
});
`

### Tests de utilidades

Para funciones de utilidad, verificar:

1. **Entradas válidas**: ¿Funciona con entradas esperadas?
2. **Entradas extremas/inválidas**: ¿Maneja casos extremos?
3. **Manejo de errores**: ¿Lanza o maneja errores apropiadamente?

`javascript
describe('algunaFuncion', () => {
  it('debe procesar datos correctamente', async () => {
    // Llamar a la función con datos válidos
    const resultado = await algunaFuncion(datosValidos);
    
    // Verificar resultado
    expect(resultado).toEqual(/* resultado esperado */);
  });

  it('debe manejar entradas inválidas', async () => {
    // Llamar a la función con datos inválidos
    const resultado = await algunaFuncion(datosInvalidos);
    
    // Verificar comportamiento
    expect(resultado).toBeNull(); // o el comportamiento esperado
  });
});
`

## Buenas prácticas

1. **Aislamiento**: Cada test debe ser independiente, sin depender del estado de otros tests.
2. **Preparar, Actuar, Verificar**: Estructura clara de los tests.
3. **Mocks específicos**: Crear mocks sólo con lo necesario para cada test.
4. **Tests significativos**: Verificar comportamientos importantes, no detalles de implementación.
5. **Nombres descriptivos**: Los nombres de los tests deben describir claramente el comportamiento a probar.

## Cobertura de código

La meta es mantener una cobertura de tests adecuada para componentes críticos:

- **Autenticación/Autorización**: >90%
- **APIs y lógica de negocio**: >80%
- **Utilidades y helper functions**: >70%

Para ver la cobertura actual, ejecutar:

`ash
npm run test:coverage
`

## Áreas pendientes de prueba

Todavía hay áreas importantes del backend que necesitan más tests:

1. **API de profesores**: Endpoints para gestión de clases y estadísticas.
2. **API de alumnos**: Endpoints para asistencia y justificaciones.
3. **API de PEC**: Endpoints para gestión de alumnos y carreras.
4. **Endpoints especializados de administración**: Cargas masivas, configuración, etc.

## Mejora continua

El proceso de testing debe ser continuo. A medida que se añaden nuevas funcionalidades, se deben crear los tests correspondientes para asegurar la calidad del código y prevenir regresiones.
