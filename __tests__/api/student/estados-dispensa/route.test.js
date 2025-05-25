/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(student)/estados-dispensa/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    estadoDispensa: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(student)/estados-dispensa", () => {
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
    const data = await response.json();
    expect(data).toEqual({ error: "No autenticado" });
  });

  it("debe devolver todos los estados de dispensa ordenados por denominación", async () => {
    // Mock para getServerSession con sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno"]
      }
    });

    // Mock de datos
    const mockEstados = [
      { id: "estado1", denominacion: "Aprobada" },
      { id: "estado2", denominacion: "En revisión" },
      { id: "estado3", denominacion: "Rechazada" }
    ];

    // Configurar mock
    prisma.estadoDispensa.findMany.mockResolvedValueOnce(mockEstados);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockEstados);
    expect(prisma.estadoDispensa.findMany).toHaveBeenCalledWith({
      orderBy: {
        denominacion: 'asc'
      }
    });
  });

  it("debe manejar errores al obtener estados de dispensa", async () => {
    // Mock para getServerSession con sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno"]
      }
    });

    // Simular error
    prisma.estadoDispensa.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: "Error al procesar la solicitud"
    });
  });
});

describe("POST /api/(student)/estados-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    const req = mockRequest({ denominacion: "Nueva" });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 403 si el usuario no es administrador", async () => {
    // Mock para getServerSession con rol insuficiente
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno"] // No es admin
      }
    });

    const req = mockRequest({ denominacion: "Nueva" });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({
      error: "No tienes permisos para crear estados de dispensa"
    });
  });

  it("debe crear un nuevo estado de dispensa como administrador", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Datos para la prueba
    const nuevoEstado = {
      denominacion: "Nueva Estado"
    };
    
    const estadoCreado = {
      id: "estado4",
      denominacion: "Nueva Estado"
    };

    // Configurar mocks
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);
    prisma.estadoDispensa.create.mockResolvedValueOnce(estadoCreado);
    
    const req = mockRequest(nuevoEstado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(estadoCreado);
    
    expect(prisma.estadoDispensa.findFirst).toHaveBeenCalledWith({
      where: {
        denominacion: {
          equals: "Nueva Estado",
          mode: 'insensitive'
        }
      }
    });
    
    expect(prisma.estadoDispensa.create).toHaveBeenCalledWith({
      data: {
        denominacion: "Nueva Estado"
      }
    });
  });

  it("debe devolver error 400 si falta la denominación", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock request sin denominación
    const req = mockRequest({});

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: "La denominación es requerida y debe ser una cadena de texto"
    });
  });

  it("debe devolver error 400 si la denominación no es una cadena", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock request con denominación numérica
    const req = mockRequest({ denominacion: 123 });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({
      error: "La denominación es requerida y debe ser una cadena de texto"
    });
  });

  it("debe devolver error 409 si ya existe un estado con la misma denominación", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock de estado existente
    const estadoExistente = {
      id: "estado1",
      denominacion: "Aprobada"
    };

    // Configurar mock para encontrar un estado existente
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(estadoExistente);
    
    const req = mockRequest({
      denominacion: "Aprobada"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data).toEqual({
      error: "Ya existe un estado de dispensa con esa denominación"
    });
    
    expect(prisma.estadoDispensa.create).not.toHaveBeenCalled();
  });

  it("debe manejar errores al crear estado de dispensa", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Datos para la prueba
    const nuevoEstado = {
      denominacion: "Error"
    };

    // Configurar mocks
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);
    prisma.estadoDispensa.create.mockRejectedValueOnce(new Error("Error de base de datos"));
    
    const req = mockRequest(nuevoEstado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: "Error al procesar la solicitud"
    });
  });
});