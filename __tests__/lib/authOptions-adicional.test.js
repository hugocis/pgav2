/**
 * @jest-environment node
 */
const { GET, POST } = require("@/app/api/(manager)/manager-carreras/route");
const prisma = require("@/lib/prisma");
const { getServerSession } = require("next-auth");
const { logActivity } = require("@/lib/logActivity");

// Mocks
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    managerCarrera: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    }
  },
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true),
}));

describe("GET /api/(manager)/manager-carreras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("debe devolver 401 si el usuario no es administrador", async () => {
    // Mock para getServerSession que devuelve una sesión sin rol de admin
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "user123",
        roles: ["Manager"]  // No tiene rol de Admin
      }
    });

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("debe devolver todas las asignaciones de managers a carreras", async () => {
    // Mock data
    const mockManagerCarreras = [
      {
        id: "mc1",
        managerId: "manager1",
        carreraId: "carrera1",
        activo: true,
        user: {
          id: "manager1",
          name: "Juan",
          surname1: "López",
          surname2: "García",
          email: "juan.lopez@example.com",
        },
        carrera: {
          id: "carrera1",
          denominacion: "Ingeniería Informática",
        }
      },
      {
        id: "mc2",
        managerId: "manager2",
        carreraId: "carrera2",
        activo: true,
        user: {
          id: "manager2",
          name: "María",
          surname1: "Rodríguez",
          surname2: "Sánchez",
          email: "maria.rodriguez@example.com",
        },
        carrera: {
          id: "carrera2",
          denominacion: "Arquitectura",
        }
      }
    ];

    // Mock para getServerSession que devuelve una sesión con rol de admin
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Setup mock para findMany
    prisma.default.managerCarrera.findMany.mockResolvedValueOnce(mockManagerCarreras);

    // Llamar al endpoint
    const response = await GET();

    // Verificar que se llamó correctamente a prisma
    expect(prisma.default.managerCarrera.findMany).toHaveBeenCalledWith({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true,
          },
        },
        carrera: {
          select: {
            id: true,
            denominacion: true,
          },
        },
      },
    });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockManagerCarreras);
  });

  it("debe manejar errores al obtener asignaciones", async () => {
    // Mock para getServerSession que devuelve una sesión con rol de admin
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Setup mock para findMany que lanza un error
    prisma.default.managerCarrera.findMany.mockRejectedValueOnce(new Error("Database error"));
    
    // Espiar console.error
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    
    // Llamar al endpoint
    const response = await GET();
    
    // Verificar que se registró el error
    expect(consoleSpy).toHaveBeenCalled();
    
    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error interno del servidor" });
    
    // Restaurar consola
    consoleSpy.mockRestore();
  });
});

describe("POST /api/(manager)/manager-carreras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock para request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Mock request
    const req = mockRequest({
      managerId: "manager1",
      carreraId: "carrera1",
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("debe devolver 400 si faltan campos requeridos", async () => {
    // Mock para getServerSession que devuelve una sesión con rol de admin
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Mock request con datos incompletos (falta carreraId)
    const req = mockRequest({
      managerId: "manager1",
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Se requieren los campos managerId y carreraId" });
  });

  it("debe devolver 400 si el usuario no tiene el rol de Manager", async () => {
    // Mock para getServerSession que devuelve una sesión con rol de admin
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Mock request
    const req = mockRequest({
      managerId: "user123",
      carreraId: "carrera1",
    });

    // Mock para userRole.findMany que devuelve roles sin Manager
    prisma.default.userRole.findMany.mockResolvedValueOnce([
      { role: { name: "Alumno" } }
    ]);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El usuario no tiene el rol de Manager" });
  });

  it("debe reactivar una relación existente que estaba inactiva", async () => {
    // Mock data
    const requestBody = {
      managerId: "manager1",
      carreraId: "carrera1",
    };

    const existingRelation = {
      id: "relation1",
      managerId: "manager1",
      carreraId: "carrera1",
      activo: false, // Inactiva
      fechaBaja: new Date(),
    };

    const updatedRelation = {
      ...existingRelation,
      activo: true,
      fechaBaja: null,
    };

    // Mock para getServerSession
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Mock request
    const req = mockRequest(requestBody);

    // Mock para userRole.findMany
    prisma.default.userRole.findMany.mockResolvedValueOnce([
      { role: { name: "Manager" } }
    ]);

    // Mock para managerCarrera.findFirst
    prisma.default.managerCarrera.findFirst.mockResolvedValueOnce(existingRelation);

    // Mock para managerCarrera.update
    prisma.default.managerCarrera.update.mockResolvedValueOnce(updatedRelation);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llamó a update
    expect(prisma.default.managerCarrera.update).toHaveBeenCalledWith({
      where: { id: existingRelation.id },
      data: {
        activo: true,
        fechaBaja: null,
      },
    });

    // Verificar que se llamó a logActivity
    expect(logActivity).toHaveBeenCalled();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedRelation);
  });

  it("debe crear una nueva relación si no existe", async () => {
    // Mock data
    const requestBody = {
      managerId: "manager1",
      carreraId: "carrera1",
    };

    // Omitimos fechaAlta para evitar problemas con la comparación
    const newRelation = {
      id: "relation1",
      managerId: "manager1",
      carreraId: "carrera1",
      activo: true,
      fechaBaja: null,
    };

    // Mock para getServerSession
    getServerSession.mockResolvedValueOnce({
      user: { 
        id: "admin123",
        roles: ["Admin"]
      }
    });

    // Mock request
    const req = mockRequest(requestBody);

    // Mock para userRole.findMany
    prisma.default.userRole.findMany.mockResolvedValueOnce([
      { role: { name: "Manager" } }
    ]);

    // Mock para managerCarrera.findFirst (no existe relación)
    prisma.default.managerCarrera.findFirst.mockResolvedValueOnce(null);

    // Mock para managerCarrera.create
    prisma.default.managerCarrera.create.mockResolvedValueOnce(newRelation);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llamó a create
    expect(prisma.default.managerCarrera.create).toHaveBeenCalledWith({
      data: {
        managerId: requestBody.managerId,
        carreraId: requestBody.carreraId,
      },
    });

    // Verificar que se llamó a logActivity
    expect(logActivity).toHaveBeenCalled();

    // Verificar la respuesta
    expect(response.status).toBe(201);
    
    // Obtenemos el cuerpo de la respuesta
    const body = await response.json();
    
    // Verificamos las propiedades individualmente para evitar problemas con fechaAlta
    expect(body.id).toBe(newRelation.id);
    expect(body.managerId).toBe(newRelation.managerId);
    expect(body.carreraId).toBe(newRelation.carreraId);
    expect(body.activo).toBe(newRelation.activo);
    expect(body.fechaBaja).toBe(newRelation.fechaBaja);
  });
});
