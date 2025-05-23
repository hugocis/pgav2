/**
 * @jest-environment node
 */

import { GET, PUT, DELETE, POST } from "@/app/api/(admin)/estados-justificacion/[id]/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    estadoJustificacion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    solicitudJustificacion: {
      findFirst: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(admin)/estados-justificacion/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = () => ({});
  const mockParams = (id) => Promise.resolve({ id });

  it("debe obtener un estado de justificación específico", async () => {
    const mockEstado = {
      id: "ej1",
      denominacion: "Aceptada",
      createdAt: new Date().toString(),
      updatedAt: new Date().toString()
    };

    // Mock para la búsqueda del estado
    prisma.estadoJustificacion.findUnique.mockResolvedValue(mockEstado);

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ej1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockEstado);

    // Verificar que se consultó con el ID correcto
    expect(prisma.estadoJustificacion.findUnique).toHaveBeenCalledWith({
      where: { id: "ej1" }
    });
  });

  it("debe devolver 400 si no se proporciona ID", async () => {
    // Llamar al endpoint con ID vacío
    const response = await GET(mockRequest(), { params: mockParams("") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID del estado de justificación es obligatorio" });
  });

  it("debe devolver 404 si el estado no existe", async () => {
    // Mock para estado no encontrado
    prisma.estadoJustificacion.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ej_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Estado de justificación no encontrado" });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para simular un error
    prisma.estadoJustificacion.findUnique.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ej1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener el estado de justificación" });
  });
});

describe("PUT /api/(admin)/estados-justificacion/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });
  const mockParams = (id) => Promise.resolve({ id });

  it("debe actualizar un estado de justificación correctamente", async () => {
    const updateData = {
      denominacion: "Revisada"
    };

    // Mock para el estado existente
    const estadoExistente = {
      id: "ej1",
      denominacion: "Aceptada",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    prisma.estadoJustificacion.findUnique.mockResolvedValue(estadoExistente);

    // Mock para la actualización exitosa
    const estadoActualizado = {
      id: "ej1",
      denominacion: "Revisada",
      createdAt: estadoExistente.createdAt.toString(),
      updatedAt: new Date().toString()
    };
    prisma.estadoJustificacion.update.mockResolvedValue(estadoActualizado);

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ej1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(estadoActualizado);

    // Verificar que se actualizó el estado con los datos correctos
    expect(prisma.estadoJustificacion.update).toHaveBeenCalledWith({
      where: { id: "ej1" },
      data: { denominacion: "Revisada" }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "update",
      entityType: "estadoJustificacion",
      entityId: "ej1",
      details: "Actualización de estado de justificación",
      prevValue: estadoExistente
    }));
  });

  it("debe devolver 400 si falta la denominación", async () => {
    const updateData = {
      // No se proporciona denominación
    };

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ej1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "ID y denominación son obligatorios" });
  });

  it("debe devolver 404 si el estado no existe", async () => {
    const updateData = {
      denominacion: "Revisada"
    };

    // Mock para estado no encontrado
    prisma.estadoJustificacion.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ej_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Estado de justificación no encontrado" });
  });

  it("debe manejar errores durante la actualización", async () => {
    const updateData = {
      denominacion: "Revisada"
    };

    // Mock para el estado existente
    prisma.estadoJustificacion.findUnique.mockResolvedValue({
      id: "ej1",
      denominacion: "Aceptada"
    });

    // Mock para simular un error durante la actualización
    prisma.estadoJustificacion.update.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ej1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar el estado de justificación" });
  });
});

describe("DELETE /api/(admin)/estados-justificacion/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = () => ({});
  const mockParams = (id) => Promise.resolve({ id });

  it("debe eliminar un estado de justificación correctamente", async () => {
    // Mock para el estado existente
    const estadoExistente = {
      id: "ej1",
      denominacion: "Aceptada"
    };
    prisma.estadoJustificacion.findUnique.mockResolvedValue(estadoExistente);

    // Mock para verificar que no tiene solicitudes asociadas
    prisma.solicitudJustificacion.findFirst.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ej1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Estado de justificación eliminado correctamente" });

    // Verificar que se eliminó con el ID correcto
    expect(prisma.estadoJustificacion.delete).toHaveBeenCalledWith({
      where: { id: "ej1" }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "delete",
      entityType: "estadoJustificacion",
      entityId: "ej1",
      details: "Eliminación del estado de justificación: Aceptada",
      prevValue: estadoExistente
    }));
  });

  it("debe devolver 400 si no se proporciona ID", async () => {
    // Llamar al endpoint con ID vacío
    const response = await DELETE(mockRequest(), { params: mockParams("") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID del estado de justificación es obligatorio" });
  });

  it("debe devolver 404 si el estado no existe", async () => {
    // Mock para estado no encontrado
    prisma.estadoJustificacion.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ej_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Estado de justificación no encontrado" });
  });

  it("debe devolver 400 si el estado tiene solicitudes asociadas", async () => {
    // Mock para el estado existente
    prisma.estadoJustificacion.findUnique.mockResolvedValue({
      id: "ej1",
      denominacion: "Aceptada"
    });

    // Mock para verificar que tiene solicitudes asociadas
    prisma.solicitudJustificacion.findFirst.mockResolvedValue({
      id: "sj1",
      estadoJustificacionId: "ej1"
    });

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ej1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "No se puede eliminar el estado porque hay solicitudes asociadas" });

    // Verificar que no se intentó eliminar
    expect(prisma.estadoJustificacion.delete).not.toHaveBeenCalled();
  });

  it("debe manejar errores durante la eliminación", async () => {
    // Mock para el estado existente
    prisma.estadoJustificacion.findUnique.mockResolvedValue({
      id: "ej1",
      denominacion: "Aceptada"
    });

    // Mock para verificar que no tiene solicitudes asociadas
    prisma.solicitudJustificacion.findFirst.mockResolvedValue(null);

    // Mock para simular un error durante la eliminación
    prisma.estadoJustificacion.delete.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ej1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar el estado de justificación" });
  });
});

describe("POST /api/(admin)/estados-justificacion/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      createdAt: new Date().toString(),
      updatedAt: new Date().toString()  
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
      details: `Se creó el estado de justificación: En revisión`
    }));
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
