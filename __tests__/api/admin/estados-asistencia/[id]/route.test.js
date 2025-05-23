/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from "@/app/api/(admin)/estados-asistencia/[id]/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    estadoAsistencia: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    asistenciaAlumno: {
      findFirst: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(admin)/estados-asistencia/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it("debe devolver un estado de asistencia específico por ID", async () => {
    // Mock dates
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Mock data
    const mockEstado = { 
      id: "estado1", 
      denominacion: "Asistencia",
      createdAt: createdAt,
      updatedAt: updatedAt
    };

    // Mock params
    const params = Promise.resolve({ id: "estado1" });

    // Configurar mock
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce({
      ...mockEstado,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });

    // Llamar al endpoint
    const response = await GET({}, { params });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verificar la respuesta con fechas en formato ISO string
    expect(data).toEqual({
      ...mockEstado,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });
    
    expect(prisma.estadoAsistencia.findUnique).toHaveBeenCalledWith({
      where: { id: "estado1" }
    });
  });

  it("debe devolver 404 si el estado no existe", async () => {
    // Mock params
    const params = Promise.resolve({ id: "estadoInexistente" });

    // Configurar mock para devolver null
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await GET({}, { params });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Estado de asistencia no encontrado" });
  });

  it("debe manejar errores al obtener un estado de asistencia", async () => {
    // Mock params
    const params = Promise.resolve({ id: "estado1" });

    // Simular error
    prisma.estadoAsistencia.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET({}, { params });

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Error al obtener el estado de asistencia" });
  });
});

describe("PUT /api/(admin)/estados-asistencia/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValueOnce(body)
  });
  it("debe actualizar un estado de asistencia existente", async () => {
    // Mock data para actualización
    const mockUpdate = { 
      denominacion: "Asistencia Actualizada" 
    };

    // Mock dates
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Mock estado actualizado
    const estadoActualizado = {
      id: "estado1",
      denominacion: "Asistencia Actualizada",
      createdAt: createdAt,
      updatedAt: updatedAt
    };

    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = mockRequest(mockUpdate);

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce({ id: "estado1", denominacion: "Asistencia" });
    prisma.estadoAsistencia.update.mockResolvedValueOnce({
      ...estadoActualizado,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });

    // Llamar al endpoint
    const response = await PUT(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verificar la respuesta con fechas en formato ISO string
    expect(data).toEqual({
      ...estadoActualizado,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });
    
    expect(prisma.estadoAsistencia.update).toHaveBeenCalledWith({
      where: { id: "estado1" },
      data: { denominacion: "Asistencia Actualizada" }
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      entityType: 'estadoAsistencia',
      entityId: 'estado1',
      details: expect.stringContaining('Actualización del estado de asistencia')
    }));
  });

  it("debe devolver 404 si el estado a actualizar no existe", async () => {
    // Mock data para actualización
    const mockUpdate = { 
      denominacion: "Asistencia Actualizada" 
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estadoInexistente" });
    
    // Mock request
    const req = mockRequest(mockUpdate);

    // Configurar mock para devolver null (no existe)
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await PUT(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Estado de asistencia no encontrado" });
    expect(prisma.estadoAsistencia.update).not.toHaveBeenCalled();
  });

  it("debe devolver error 400 si falta la denominación", async () => {
    // Mock data sin denominación
    const mockUpdate = {};
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = mockRequest(mockUpdate);

    // Llamar al endpoint
    const response = await PUT(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: "La denominación es un campo obligatorio" });
    expect(prisma.estadoAsistencia.findUnique).not.toHaveBeenCalled();
  });  it("debe actualizar un estado de asistencia aunque exista otro con la misma denominación", async () => {
    // Mock data para actualización
    const mockUpdate = { 
      denominacion: "Falta" 
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = mockRequest(mockUpdate);

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce({ id: "estado1", denominacion: "Asistencia" });
    
    // Note: Currently the implementation doesn't check for existing states with the same name
    prisma.estadoAsistencia.update.mockResolvedValueOnce({
      id: "estado1",
      denominacion: "Falta"
    });

    // Llamar al endpoint
    const response = await PUT(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id: "estado1", denominacion: "Falta" });
    expect(prisma.estadoAsistencia.update).toHaveBeenCalledWith({
      where: { id: "estado1" },
      data: { denominacion: "Falta" }
    });
  });

  it("debe manejar errores al actualizar un estado de asistencia", async () => {
    // Mock data para actualización
    const mockUpdate = { 
      denominacion: "Error" 
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = mockRequest(mockUpdate);

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce({ id: "estado1", denominacion: "Asistencia" });
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(null);
    prisma.estadoAsistencia.update.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await PUT(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Error al actualizar el estado de asistencia" });
  });
});

describe("DELETE /api/(admin)/estados-asistencia/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });  it("debe eliminar un estado de asistencia existente", async () => {
    // Mock estado a eliminar
    const mockEstado = {
      id: "estado1",
      denominacion: "Asistencia"
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = {};

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(mockEstado);
    // Simular que no hay asistencias asociadas
    prisma.asistenciaAlumno.findFirst.mockResolvedValueOnce(null);
    prisma.estadoAsistencia.delete.mockResolvedValueOnce(mockEstado);

    // Llamar al endpoint
    const response = await DELETE(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // La implementación devuelve un mensaje de éxito, no el objeto eliminado
    expect(data).toEqual({ message: 'Estado de asistencia eliminado correctamente' });
    
    expect(prisma.estadoAsistencia.delete).toHaveBeenCalledWith({
      where: { id: "estado1" }
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delete',
      entityType: 'estadoAsistencia',
      entityId: 'estado1',
      details: expect.stringContaining('Eliminación del estado de asistencia')
    }));
  });  it("debe devolver error si el estado a eliminar no existe", async () => {
    // Mock params
    const params = Promise.resolve({ id: "estadoInexistente" });
    
    // Mock request
    const req = {};

    // Configurar mock para devolver null (no existe)
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await DELETE(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Estado de asistencia no encontrado" });
    expect(prisma.estadoAsistencia.delete).not.toHaveBeenCalled();
  });
  it("debe manejar errores al eliminar un estado de asistencia", async () => {
    // Mock estado a eliminar
    const mockEstado = {
      id: "estado1",
      denominacion: "Asistencia"
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = {};

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(mockEstado);
    // Simular que no hay asistencias asociadas
    prisma.asistenciaAlumno.findFirst.mockResolvedValueOnce(null);
    prisma.estadoAsistencia.delete.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await DELETE(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Error al eliminar el estado de asistencia" });
  });  it("debe devolver error 400 si el estado tiene asistencias asociadas", async () => {
    // Mock estado a eliminar
    const mockEstado = {
      id: "estado1",
      denominacion: "Asistencia"
    };
    
    // Mock params
    const params = Promise.resolve({ id: "estado1" });
    
    // Mock request
    const req = {};

    // Configurar mocks
    prisma.estadoAsistencia.findUnique.mockResolvedValueOnce(mockEstado);
    
    // Simular que hay asistencias asociadas
    prisma.asistenciaAlumno.findFirst.mockResolvedValueOnce({
      id: "asist1",
      estadoAsistenciaId: "estado1"
    });

    // Llamar al endpoint
    const response = await DELETE(req, { params });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ 
      error: "No se puede eliminar el estado porque hay registros de asistencia asociados a él" 
    });
  });
});
