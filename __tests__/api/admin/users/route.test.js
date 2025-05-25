/**
 * @jest-environment node
 */
const { GET, POST } = require('@/app/api/(admin)/users/route');
const prisma = require('@/lib/prisma');
const bcrypt = require('bcrypt');
const { logActivity } = require('@/lib/logActivity');

// Mocks
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    expedienteAlumno: {
      findMany: jest.fn(),
    }
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('@/lib/logActivity', () => ({
  logActivity: jest.fn().mockResolvedValue(true),
}));

describe('GET /api/(admin)/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver todos los usuarios', async () => {
    // Mock data
    const mockUsers = [
      {
        id: 'user1',
        username: 'user1',
        email: 'user1@example.com',
        userRoles: [{ role: { id: 1, name: 'Admin' } }]
      },
      {
        id: 'user2',
        username: 'user2',
        email: 'user2@example.com',
        userRoles: [{ role: { id: 2, name: 'Profesor' } }]
      }
    ];

    // Setup mock para findMany
    prisma.default.user.findMany.mockResolvedValueOnce(mockUsers);

    // Llamar al endpoint
    const response = await GET();

    // Verificar que se llamó correctamente a prisma
    expect(prisma.default.user.findMany).toHaveBeenCalledWith({
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockUsers);
  });

  it('debe manejar errores al obtener usuarios', async () => {
    // Setup mock para findMany que lanza un error
    prisma.default.user.findMany.mockRejectedValueOnce(new Error('Database error'));
    
    // Espiar console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Llamar al endpoint
    const response = await GET();
    
    // Verificar que se registró el error
    expect(consoleSpy).toHaveBeenCalled();
    
    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Error al obtener los usuarios' });
    
    // Restaurar consola
    consoleSpy.mockRestore();
  });
});

describe('POST /api/(admin)/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock para request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  it('debe crear un nuevo usuario con roles', async () => {
    // Mock data
    const requestBody = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New',
      surname1: 'User',
      surname2: 'Test',
      roles: [1, 2]  // IDs de roles
    };

    const hashedPassword = 'hashed_password_123';
    
    const newUser = {
      id: 'new_user_id',
      username: requestBody.username,
      email: requestBody.email,
      name: requestBody.name,
      surname1: requestBody.surname1,
      surname2: requestBody.surname2,
      password: hashedPassword,
      lockout: false,
    };

    const userWithRoles = {
      ...newUser,
      userRoles: [
        { role: { id: 1, name: 'Admin' } },
        { role: { id: 2, name: 'Profesor' } }
      ]
    };

    // Setup mocks
    const req = mockRequest(requestBody);
    prisma.default.user.findFirst.mockResolvedValueOnce(null); // No existe usuario
    bcrypt.hash.mockResolvedValueOnce(hashedPassword);
    prisma.default.user.create.mockResolvedValueOnce(newUser);
    prisma.default.user.findUnique.mockResolvedValueOnce(userWithRoles);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llamó correctamente a findFirst
    expect(prisma.default.user.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: requestBody.email },
          { username: requestBody.username }
        ]
      }
    });

    // Verificar que se llamó a hash
    expect(bcrypt.hash).toHaveBeenCalledWith(requestBody.password, 10);

    // Verificar que se llamó a user.create
    expect(prisma.default.user.create).toHaveBeenCalledWith({
      data: {
        username: requestBody.username,
        name: requestBody.name,
        surname1: requestBody.surname1,
        surname2: requestBody.surname2,
        email: requestBody.email,
        password: hashedPassword,
        lockout: false,
      },
    });

    // Verificar que se llamó a userRole.create para cada rol
    expect(prisma.default.userRole.create).toHaveBeenCalledTimes(2);
    expect(prisma.default.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: newUser.id,
        roleId: 1,
      }
    });
    expect(prisma.default.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: newUser.id,
        roleId: 2,
      }
    });

    // Verificar que se llamó a findUnique para obtener el usuario con roles
    expect(prisma.default.user.findUnique).toHaveBeenCalledWith({
      where: { id: newUser.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    // Verificar que se llamó a logActivity
    expect(logActivity).toHaveBeenCalled();

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(userWithRoles);
  });

  it('debe devolver error si el usuario ya existe', async () => {
    // Mock data
    const requestBody = {
      username: 'existinguser',
      email: 'existing@example.com',
      password: 'password123',
    };

    const existingUser = {
      id: 'existing_id',
      username: requestBody.username,
      email: requestBody.email,
    };

    // Setup mocks
    const req = mockRequest(requestBody);
    prisma.default.user.findFirst.mockResolvedValueOnce(existingUser); // Usuario ya existe

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: 'Ya existe un usuario con ese email o username' });
  });

  it('debe devolver error si faltan campos requeridos', async () => {
    // Mock data - falta password
    const requestBody = {
      username: 'newuser',
      email: 'newuser@example.com',
    };

    // Setup mocks
    const req = mockRequest(requestBody);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Faltan campos requeridos: username, email, password' });
  });

  it('debe manejar errores internos', async () => {
    // Mock data
    const requestBody = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
    };

    // Setup mocks
    const req = mockRequest(requestBody);
    prisma.default.user.findFirst.mockRejectedValueOnce(new Error('Database error'));
    
    // Espiar console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se registró el error
    expect(consoleSpy).toHaveBeenCalled();
    
    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'Error al crear el usuario' });
    
    // Restaurar consola
    consoleSpy.mockRestore();
  });
});
