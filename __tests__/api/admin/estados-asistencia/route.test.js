/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/estados-asistencia/route";
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
    estadoAsistencia: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

describe("GET /api/(admin)/estados-asistencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver todos los estados de asistencia ordenados por denominación", async () => {
    // Mock data
    const mockEstados = [
      { id: "estado1", denominacion: "Asistencia" },
      { id: "estado2", denominacion: "Falta" },
      { id: "estado3", denominacion: "Justificada" }
    ];

    // Configurar mock
    prisma.estadoAsistencia.findMany.mockResolvedValueOnce(mockEstados);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockEstados);
    expect(prisma.estadoAsistencia.findMany).toHaveBeenCalledWith({
      orderBy: {
        denominacion: 'asc'
      }
    });
  });

  it("debe manejar errores al obtener estados de asistencia", async () => {
    // Simular error
    prisma.estadoAsistencia.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al obtener los estados de asistencia"
    });
  });
});

describe("POST /api/(admin)/estados-asistencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });

  it("debe crear un nuevo estado de asistencia", async () => {
    // Mock data
    const nuevoEstado = {
      denominacion: "Dispensa"
    };
    
    const estadoCreado = {
      id: "estado4",
      denominacion: "Dispensa"
    };

    // Configurar mocks
    prisma.estadoAsistencia.findFirst.mockResolvedValueOnce(null);
    prisma.estadoAsistencia.create.mockResolvedValueOnce(estadoCreado);
    
    const req = mockRequest(nuevoEstado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(estadoCreado);
    
    expect(prisma.estadoAsistencia.findFirst).toHaveBeenCalledWith({
      where: { denominacion: "Dispensa" }
    });
    
    expect(prisma.estadoAsistencia.create).toHaveBeenCalledWith({
      data: { denominacion: "Dispensa" }
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'estadoAsistencia',
      entityId: 'estado4',
      details: 'Se creó el estado de asistencia: Dispensa'
    }));
  });

  it("debe devolver error 400 si falta la denominación", async () => {
    // Mock request sin denominación
    const req = mockRequest({});

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "La denominación es un campo obligatorio"
    });
  });

  it("debe devolver error 400 si ya existe un estado con la misma denominación", async () => {
    // Mock de estado existente
    const estadoExistente = {
      id: "estado1",
      denominacion: "Asistencia"
    };

    // Configurar mock para encontrar un estado existente
    prisma.estadoAsistencia.findFirst.mockResolvedValueOnce(estadoExistente);
    
    const req = mockRequest({
      denominacion: "Asistencia"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "Ya existe un estado de asistencia con esta denominación"
    });
    
    expect(prisma.estadoAsistencia.create).not.toHaveBeenCalled();
  });

  it("debe manejar errores al crear estado de asistencia", async () => {
    // Mock data
    const nuevoEstado = {
      denominacion: "Error"
    };

    // Configurar mocks
    prisma.estadoAsistencia.findFirst.mockResolvedValueOnce(null);
    prisma.estadoAsistencia.create.mockRejectedValueOnce(new Error("Error de base de datos"));
    
    const req = mockRequest(nuevoEstado);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({
      error: "Error al crear el estado de asistencia"
    });
  });
});