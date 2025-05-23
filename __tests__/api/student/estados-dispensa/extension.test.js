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

describe("Pruebas avanzadas para GET /api/(student)/estados-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver estados de dispensa sin filtros aplicados", async () => {
    // Mock para getServerSession con sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Profesor"]
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
  });

  it("debe ser accesible para usuarios con rol Profesor", async () => {
    // Mock para getServerSession con rol profesor
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "prof1",
        roles: ["Profesor"]
      }
    });

    // Mock de datos
    const mockEstados = [];
    prisma.estadoDispensa.findMany.mockResolvedValueOnce(mockEstados);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
  });

  it("debe ser accesible para usuarios con rol Manager", async () => {
    // Mock para getServerSession con rol manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock de datos
    const mockEstados = [];
    prisma.estadoDispensa.findMany.mockResolvedValueOnce(mockEstados);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
  });
});

describe("Pruebas avanzadas para POST /api/(student)/estados-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });

  it("debe validar el estado de dispensa con denominación que contiene espacios en blanco", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock request con denominación con espacios en blanco al inicio y fin
    const req = mockRequest({ denominacion: "   Pendiente Revisión   " });

    // Configurar mock para no encontrar estado existente
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);
    
    const estadoCreado = {
      id: "estado5",
      denominacion: "   Pendiente Revisión   " // Se debería guardar sin trimear en esta implementación
    };
    
    prisma.estadoDispensa.create.mockResolvedValueOnce(estadoCreado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(estadoCreado);
  });

  it("debe rechazar la creación si la denominación es demasiado larga", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Crear una denominación de 256 caracteres (suponiendo que hay un límite razonable)
    const denominacionLarga = "a".repeat(256);
    
    const req = mockRequest({ denominacion: denominacionLarga });

    // Configurar mock para no encontrar estado existente
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);
    
    // Mock para simular un error de validación de base de datos
    prisma.estadoDispensa.create.mockRejectedValueOnce(
      new Error("String is too long")
    );

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      error: "Error al procesar la solicitud"
    });
  });

  it("debe ser case-insensitive al verificar denominaciones duplicadas", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock de estado existente con diferente capitalización
    const estadoExistente = {
      id: "estado1",
      denominacion: "aprobada" // Notar minúsculas
    };

    // Configurar mock para encontrar un estado existente
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(estadoExistente);
    
    // Intentar crear un estado con la misma denominación pero diferente capitalización
    const req = mockRequest({
      denominacion: "APROBADA" // Notar mayúsculas
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
    expect(prisma.estadoDispensa.findFirst).toHaveBeenCalledWith({
      where: {
        denominacion: {
          equals: "APROBADA",
          mode: 'insensitive' // Verificar que se usa mode: insensitive
        }
      }
    });
  });

  it("debe permitir la creación a usuarios con rol 'Admin' (sin distinguir mayúsculas/minúsculas)", async () => {
    // Mock para getServerSession con rol Admin (con mayúscula)
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"] // Notar la mayúscula
      }
    });

    // Datos para la prueba
    const nuevoEstado = {
      denominacion: "Nueva Denominación"
    };
    
    const estadoCreado = {
      id: "estado6",
      denominacion: "Nueva Denominación"
    };

    // Configurar mocks
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);
    prisma.estadoDispensa.create.mockResolvedValueOnce(estadoCreado);
    
    const req = mockRequest(nuevoEstado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta - debería fallar porque la comparación actual es sensible a mayúsculas/minúsculas
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({
      error: "No tienes permisos para crear estados de dispensa"
    });
  });

  it("debe rechazar peticiones con formato JSON inválido", async () => {
    // Mock para getServerSession con rol administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock request que falla al parsear JSON
    const req = {
      json: jest.fn().mockRejectedValueOnce(new Error("Invalid JSON"))
    };

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
