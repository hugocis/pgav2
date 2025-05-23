/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/estados-justificacion/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    estadoJustificacion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(admin)/estados-justificacion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe obtener todos los estados de justificación", async () => {
    // Mock para la respuesta de la consulta
    const mockEstados = [
      { id: "ej1", denominacion: "Aceptada", createdAt: new Date(), updatedAt: new Date() },
      { id: "ej2", denominacion: "Pendiente", createdAt: new Date(), updatedAt: new Date() },
      { id: "ej3", denominacion: "Rechazada", createdAt: new Date(), updatedAt: new Date() }
    ];

    prisma.estadoJustificacion.findMany.mockResolvedValue(mockEstados);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockEstados);

    // Verificar que se consultó con el ordenamiento correcto
    expect(prisma.estadoJustificacion.findMany).toHaveBeenCalledWith({
      orderBy: {
        denominacion: 'asc',
      },
    });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para simular un error
    prisma.estadoJustificacion.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener los estados de justificación" });
  });
});

describe("POST /api/(admin)/estados-justificacion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe crear un nuevo estado de justificación", async () => {
    const estadoData = {
      denominacion: "En revisión"
    };

    // Mock para verificar que no existe estado con esa denominación
    prisma.estadoJustificacion.findFirst.mockResolvedValue(null);

    // Mock para la creación exitosa
    const nuevoEstado = {
      id: "ej4",
      denominacion: "En revisión",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    prisma.estadoJustificacion.create.mockResolvedValue(nuevoEstado);

    // Llamar al endpoint
    const req = mockRequest(estadoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevoEstado);

    // Verificar que se comprobó si ya existía el estado
    expect(prisma.estadoJustificacion.findFirst).toHaveBeenCalledWith({
      where: { denominacion: estadoData.denominacion }
    });

    // Verificar que se creó el estado con los datos correctos
    expect(prisma.estadoJustificacion.create).toHaveBeenCalledWith({
      data: {
        denominacion: estadoData.denominacion
      }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "create",
      entityType: "estadoJustificacion",
      entityId: nuevoEstado.id,
      details: `Estado de justificación creado con denominación 'En revisión'`
    }));
  });

  it("debe devolver 400 si falta la denominación", async () => {
    const estadoData = {
      // No se proporciona denominación
    };

    // Llamar al endpoint
    const req = mockRequest(estadoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La denominación es un campo obligatorio" });
  });

  it("debe devolver 400 si ya existe un estado con la misma denominación", async () => {
    const estadoData = {
      denominacion: "Pendiente"
    };

    // Mock para estado ya existente
    prisma.estadoJustificacion.findFirst.mockResolvedValue({
      id: "ej2",
      denominacion: "Pendiente"
    });

    // Llamar al endpoint
    const req = mockRequest(estadoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Ya existe un estado de justificación con esta denominación" });
  });

  it("debe manejar errores durante la creación", async () => {
    const estadoData = {
      denominacion: "En revisión"
    };

    // Mock para verificar que no existe estado con esa denominación
    prisma.estadoJustificacion.findFirst.mockResolvedValue(null);

    // Mock para simular un error en la creación
    prisma.estadoJustificacion.create.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest(estadoData);
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear el estado de justificación" });
  });
});
