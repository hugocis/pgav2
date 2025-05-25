/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/roles/route";
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
    role: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

describe("GET /api/(admin)/roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver todos los roles ordenados por ID", async () => {
    // Mock de datos
    const mockRoles = [
      {
        id: "1",
        name: "ADMIN",
        description: "Administrador del sistema",
        userRoles: [{ id: "ur1", roleId: "1", userId: "user1" }]
      },
      {
        id: "2",
        name: "Profesor",
        description: "Profesor de la universidad",
        userRoles: [{ id: "ur2", roleId: "2", userId: "user2" }]
      },
      {
        id: "3",
        name: "PEC",
        description: "Personal de Evaluación Continua",
        userRoles: []
      }
    ];

    // Configurar mock
    prisma.role.findMany.mockResolvedValueOnce(mockRoles);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockRoles);
    expect(prisma.role.findMany).toHaveBeenCalledWith({
      include: {
        userRoles: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  });

  it("debe manejar errores al obtener roles", async () => {
    // Simular error
    prisma.role.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al obtener los roles"
    });
  });
});

describe("POST /api/(admin)/roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });

  it("debe crear un nuevo rol", async () => {
    // Datos para la prueba
    const nuevoRol = {
      name: "Alumno",
      description: "Estudiante de la universidad"
    };
    
    const rolCreado = {
      id: "4",
      name: "Alumno",
      description: "Estudiante de la universidad"
    };

    // Configurar mocks
    prisma.role.findFirst.mockResolvedValueOnce(null);
    prisma.role.create.mockResolvedValueOnce(rolCreado);
    
    const req = mockRequest(nuevoRol);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(rolCreado);
    
    expect(prisma.role.findFirst).toHaveBeenCalledWith({
      where: { name: "Alumno" }
    });
    
    expect(prisma.role.create).toHaveBeenCalledWith({
      data: {
        name: "Alumno",
        description: "Estudiante de la universidad"
      }
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'role',
      entityId: '4',
      details: 'Creación del rol "Alumno" con descripción: "Estudiante de la universidad"'
    }));
  });

  it("debe crear un nuevo rol con ID específico", async () => {
    // Datos para la prueba
    const nuevoRol = {
      id: "custom_id",
      name: "Custom",
      description: "Rol con ID personalizado"
    };
    
    const rolCreado = {
      id: "custom_id",
      name: "Custom",
      description: "Rol con ID personalizado"
    };

    // Configurar mocks
    prisma.role.findFirst.mockResolvedValueOnce(null);
    prisma.role.create.mockResolvedValueOnce(rolCreado);
    
    const req = mockRequest(nuevoRol);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(rolCreado);
    
    expect(prisma.role.create).toHaveBeenCalledWith({
      data: {
        id: "custom_id",
        name: "Custom",
        description: "Rol con ID personalizado"
      }
    });
  });

  it("debe devolver error 400 si faltan campos requeridos", async () => {
    // Casos de prueba para campos faltantes
    const casos = [
      { body: {}, missingFields: "name, description" },
      { body: { name: "Test" }, missingFields: "description" },
      { body: { description: "Test" }, missingFields: "name" }
    ];

    for (const caso of casos) {
      const req = mockRequest(caso.body);

      // Llamar al endpoint
      const response = await POST(req);

      // Verificar la respuesta
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: "Faltan campos requeridos: name, description"
      });
      
      expect(prisma.role.create).not.toHaveBeenCalled();
    }
  });

  it("debe devolver error 409 si ya existe un rol con el mismo nombre", async () => {
    // Mock de rol existente
    const rolExistente = {
      id: "1",
      name: "ADMIN",
      description: "Administrador del sistema"
    };

    // Configurar mock para encontrar un rol existente
    prisma.role.findFirst.mockResolvedValueOnce(rolExistente);
    
    const req = mockRequest({
      name: "ADMIN",
      description: "Nuevo administrador"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      error: "Ya existe un rol con ese nombre"
    });
    
    expect(prisma.role.create).not.toHaveBeenCalled();
  });

  it("debe manejar errores al crear rol", async () => {
    // Datos para la prueba
    const nuevoRol = {
      name: "Error",
      description: "Este rol generará un error"
    };

    // Configurar mocks
    prisma.role.findFirst.mockResolvedValueOnce(null);
    prisma.role.create.mockRejectedValueOnce(new Error("Error de base de datos"));
    
    const req = mockRequest(nuevoRol);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al crear el rol"
    });
  });
});