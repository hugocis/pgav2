/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/user-roles/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";
import { getServerSession } from "next-auth/next";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    userRole: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    role: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

describe("GET /api/(admin)/user-roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("debe devolver todas las asignaciones de rol ordenadas por fecha", async () => {
    // Mock de datos
    const mockUserRoles = [
      {
        id: "ur1",
        userId: "user1",
        roleId: "role1",
        assignedAt: "2025-05-15T10:00:00.000Z",
        user: { id: "user1", email: "admin@example.com" },
        role: { id: "role1", name: "ADMIN" }
      },
      {
        id: "ur2",
        userId: "user2",
        roleId: "role2",
        assignedAt: "2025-05-14T10:00:00.000Z",
        user: { id: "user2", email: "profesor@example.com" },
        role: { id: "role2", name: "Profesor" }
      }
    ];

    // Configurar mock
    prisma.userRole.findMany.mockResolvedValueOnce(mockUserRoles);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockUserRoles);
    expect(prisma.userRole.findMany).toHaveBeenCalledWith({
      include: {
        user: true,
        role: true
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });
  });

  it("debe manejar errores al obtener asignaciones de rol", async () => {
    // Simular error
    prisma.userRole.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al obtener las asignaciones de rol"
    });
  });
});

describe("POST /api/(admin)/user-roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });

  it("debe crear una nueva asignación de rol", async () => {
    // Datos para la prueba
    const nuevaAsignacion = {
      userId: "user3",
      roleId: "role3"
    };
    
    const mockUser = { id: "user3", email: "estudiante@example.com" };
    const mockRole = { id: "role3", name: "Alumno" };
      const asignacionCreada = {
      id: "ur3",
      userId: "user3",
      roleId: "role3",
      assignedAt: "2025-05-22T10:00:00.000Z",
      user: mockUser,
      role: mockRole
    };

    // Configurar mocks
    prisma.user.findUnique.mockResolvedValueOnce(mockUser);
    prisma.role.findUnique.mockResolvedValueOnce(mockRole);
    prisma.userRole.findFirst.mockResolvedValueOnce(null);
    prisma.userRole.create.mockResolvedValueOnce(asignacionCreada);
    
    const req = mockRequest(nuevaAsignacion);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(asignacionCreada);
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user3" }
    });
    
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: "role3" }
    });
    
    expect(prisma.userRole.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user3",
        roleId: "role3"
      }
    });
    
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: {
        userId: "user3",
        roleId: "role3"
      },
      include: {
        user: true,
        role: true
      }
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'userRole',
      entityId: 'ur3',
      details: 'Asignación del rol "Alumno" al usuario estudiante@example.com'
    }));
  });

  it("debe devolver error 400 si faltan campos requeridos", async () => {
    // Casos de prueba para campos faltantes
    const casos = [
      { body: {}, missingFields: "userId, roleId" },
      { body: { userId: "user1" }, missingFields: "roleId" },
      { body: { roleId: "role1" }, missingFields: "userId" }
    ];

    for (const caso of casos) {
      const req = mockRequest(caso.body);

      // Llamar al endpoint
      const response = await POST(req);

      // Verificar la respuesta
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: "Faltan campos requeridos: userId, roleId"
      });
      
      expect(prisma.userRole.create).not.toHaveBeenCalled();
    }
  });

  it("debe devolver error 404 si el usuario no existe", async () => {
    // Configurar mock para usuario no encontrado
    prisma.user.findUnique.mockResolvedValueOnce(null);
    
    const req = mockRequest({
      userId: "user_inexistente",
      roleId: "role1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: "Usuario no encontrado"
    });
    
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("debe devolver error 404 si el rol no existe", async () => {
    // Configurar mocks
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user1", email: "test@example.com" });
    prisma.role.findUnique.mockResolvedValueOnce(null);
    
    const req = mockRequest({
      userId: "user1",
      roleId: "role_inexistente"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: "Rol no encontrado"
    });
    
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("debe devolver error 409 si la asignación de rol ya existe", async () => {
    // Configurar mocks
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user1", email: "test@example.com" });
    prisma.role.findUnique.mockResolvedValueOnce({ id: "role1", name: "ADMIN" });
    
    // La asignación ya existe
    prisma.userRole.findFirst.mockResolvedValueOnce({
      id: "existing_ur",
      userId: "user1",
      roleId: "role1"
    });
    
    const req = mockRequest({
      userId: "user1",
      roleId: "role1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      error: "El usuario ya tiene asignado este rol"
    });
    
    expect(prisma.userRole.create).not.toHaveBeenCalled();
  });

  it("debe manejar errores al crear asignación de rol", async () => {
    // Configurar mocks
    prisma.user.findUnique.mockResolvedValueOnce({ id: "user1", email: "test@example.com" });
    prisma.role.findUnique.mockResolvedValueOnce({ id: "role1", name: "ADMIN" });
    prisma.userRole.findFirst.mockResolvedValueOnce(null);
    prisma.userRole.create.mockRejectedValueOnce(new Error("Error de base de datos"));
    
    const req = mockRequest({
      userId: "user1",
      roleId: "role1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al crear la asignación de rol"
    });
  });
});