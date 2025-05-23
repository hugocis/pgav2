/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from "@/app/api/(admin)/carreras/[id]/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { logActivity } from "@/lib/logActivity";

// Mock next-auth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    carrera: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn()
    },
    escuela: {
      findUnique: jest.fn()
    },
    planDeEstudios: {
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

// Mock logActivity
jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

// Mock authOptions
jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/admin/carreras/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const request = new Request("http://localhost:3000/api/admin/carreras/");

    const response = await GET(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la carrera es obligatorio" });
  });

  it("debe devolver 404 si la carrera no existe", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de la respuesta de prisma cuando no se encuentra la carrera
    prisma.carrera.findUnique.mockResolvedValueOnce(null);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Carrera no encontrada" });
    expect(prisma.carrera.findUnique).toHaveBeenCalledWith({
      where: { id: "carrera1" },
      include: {
        escuela: true,
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      }
    });
  });

  it("debe devolver la carrera si existe", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de la carrera encontrada
    const carreraMock = {
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela1",
      escuela: {
        id: "escuela1",
        nombre: "Escuela de Ingeniería"
      },
      ConfiguracionCarrera: [],
      PlanDeEstudios: [
        { id: "plan1", denominacion: "Plan 2022", codPlan: "INF2022" }
      ]
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraMock);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(carreraMock);
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de error
    prisma.carrera.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await GET(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener la carrera" });
  });
});

describe("PUT /api/admin/carreras/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/admin/carreras/carrera1"
    };
  };

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la carrera es obligatorio" });
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    
    // Denominación faltante
    const req = mockRequest({
      escuelaId: "escuela1"
    });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Denominación y escuelaId son campos obligatorios" });
  });

  it("debe devolver 404 si la carrera no existe", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de la carrera no encontrada
    prisma.carrera.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La carrera no existe" });
  });

  it("debe devolver 404 si la escuela no existe", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de la carrera encontrada
    prisma.carrera.findUnique.mockResolvedValueOnce({
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela2",
      PlanDeEstudios: []
    });
    
    // Mock de la escuela no encontrada
    prisma.escuela.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La escuela especificada no existe" });
  });

  it("debe devolver 409 si ya existe otra carrera con el mismo nombre en la misma escuela", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de la carrera encontrada
    prisma.carrera.findUnique.mockResolvedValueOnce({
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela2",
      PlanDeEstudios: []
    });
    
    // Mock de la escuela encontrada
    prisma.escuela.findUnique.mockResolvedValueOnce({
      id: "escuela1",
      nombre: "Escuela de Ingeniería"
    });
    
    // Mock de otra carrera con el mismo nombre
    prisma.carrera.findFirst.mockResolvedValueOnce({
      id: "carrera2",
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: "Ya existe otra carrera con esta denominación en la misma escuela" });
  });

  it("debe actualizar la carrera correctamente sin planes de estudio", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de la carrera encontrada
    const carreraExistente = {
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela2",
      PlanDeEstudios: []
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraExistente);
    
    // Mock de la escuela encontrada
    prisma.escuela.findUnique.mockResolvedValueOnce({
      id: "escuela1",
      nombre: "Escuela de Ingeniería"
    });
    
    // Mock de no encontrar otra carrera con el mismo nombre
    prisma.carrera.findFirst.mockResolvedValueOnce(null);
    
    // Mock de actualización de carrera exitosa
    prisma.carrera.update.mockResolvedValueOnce({
      id: "carrera1",
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de la carrera actualizada para el retorno
    const carreraActualizada = {
      id: "carrera1",
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1",
      escuela: {
        id: "escuela1",
        nombre: "Escuela de Ingeniería"
      },
      ConfiguracionCarrera: [],
      PlanDeEstudios: []
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraActualizada);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: "Carrera actualizada correctamente",
      carrera: carreraActualizada
    });
    
    // Verificar llamada a update
    expect(prisma.carrera.update).toHaveBeenCalledWith({
      where: { id: "carrera1" },
      data: {
        denominacion: "Ingeniería Informática Actualizada",
        escuelaId: "escuela1"
      }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "update",
      entityType: "carrera",
      entityId: "carrera1",
      details: expect.stringContaining("Actualización de carrera"),
      prevValue: {
        denominacion: carreraExistente.denominacion,
        escuelaId: carreraExistente.escuelaId
      }
    });
  });

  it("debe actualizar la carrera y gestionar planes de estudio", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1",
      planesDeEstudio: [
        { id: "plan1", denominacion: "Plan 2023", codPlan: "INF2023" },
        { denominacion: "Nuevo Plan", codPlan: "INF2025" }
      ]
    });
    
    // Mock de la carrera encontrada con planes existentes
    const carreraExistente = {
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela2",
      PlanDeEstudios: [
        { id: "plan1", denominacion: "Plan 2022", codPlan: "INF2022" },
        { id: "plan2", denominacion: "Plan antiguo", codPlan: "INF2020" }
      ]
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraExistente);
    
    // Mock de la escuela encontrada
    prisma.escuela.findUnique.mockResolvedValueOnce({
      id: "escuela1",
      nombre: "Escuela de Ingeniería"
    });
    
    // Mock de no encontrar otra carrera con el mismo nombre
    prisma.carrera.findFirst.mockResolvedValueOnce(null);
    
    // Mock de actualización de carrera exitosa
    prisma.carrera.update.mockResolvedValueOnce({
      id: "carrera1",
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de actualización del plan existente
    prisma.planDeEstudios.update.mockResolvedValueOnce({
      id: "plan1",
      denominacion: "Plan 2023",
      codPlan: "INF2023",
      carreraId: "carrera1"
    });
    
    // Mock de creación del nuevo plan
    prisma.planDeEstudios.create.mockResolvedValueOnce({
      id: "plan3",
      denominacion: "Nuevo Plan",
      codPlan: "INF2025",
      carreraId: "carrera1"
    });
    
    // Mock de la carrera actualizada para el retorno con planes actualizados
    const carreraActualizada = {
      id: "carrera1",
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1",
      escuela: {
        id: "escuela1",
        nombre: "Escuela de Ingeniería"
      },
      ConfiguracionCarrera: [],
      PlanDeEstudios: [
        { id: "plan1", denominacion: "Plan 2023", codPlan: "INF2023" },
        { id: "plan3", denominacion: "Nuevo Plan", codPlan: "INF2025" }
      ]
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraActualizada);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: "Carrera actualizada correctamente",
      carrera: carreraActualizada
    });
    
    // Verificar llamada a actualizar plan
    expect(prisma.planDeEstudios.update).toHaveBeenCalledWith({
      where: { id: "plan1" },
      data: {
        denominacion: "Plan 2023",
        codPlan: "INF2023"
      }
    });
    
    // Verificar llamada a crear plan
    expect(prisma.planDeEstudios.create).toHaveBeenCalledWith({
      data: {
        denominacion: "Nuevo Plan",
        codPlan: "INF2025",
        carreraId: "carrera1"
      }
    });
    
    // Verificar eliminación de planes no incluidos
    expect(prisma.planDeEstudios.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["plan2"]
        }
      }
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const req = mockRequest({
      denominacion: "Ingeniería Informática Actualizada",
      escuelaId: "escuela1"
    });
    
    // Mock de error
    prisma.carrera.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar la carrera" });
  });
});

describe("DELETE /api/admin/carreras/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const request = new Request("http://localhost:3000/api/admin/carreras/");

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la carrera es obligatorio" });
  });

  it("debe devolver 404 si la carrera no existe", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de la carrera no encontrada
    prisma.carrera.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Carrera no encontrada" });
  });

  it("debe eliminar la carrera correctamente", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de la carrera encontrada
    const carreraMock = {
      id: "carrera1",
      denominacion: "Ingeniería Informática",
      escuelaId: "escuela1",
      ConfiguracionCarrera: [],
      PlanDeEstudios: [
        { id: "plan1", denominacion: "Plan 2022", codPlan: "INF2022" }
      ]
    };
    
    prisma.carrera.findUnique.mockResolvedValueOnce(carreraMock);
    
    // Mock de eliminación exitosa
    prisma.carrera.delete.mockResolvedValueOnce({
      id: "carrera1"
    });

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: "Carrera eliminada correctamente",
      id: "carrera1"
    });
    
    // Verificar llamada a delete
    expect(prisma.carrera.delete).toHaveBeenCalledWith({
      where: { id: "carrera1" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "delete",
      entityType: "carrera",
      entityId: "carrera1",
      details: expect.stringContaining("Eliminación de carrera")
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "carrera1" });
    const request = new Request("http://localhost:3000/api/admin/carreras/carrera1");
    
    // Mock de la carrera encontrada
    prisma.carrera.findUnique.mockResolvedValueOnce({
      id: "carrera1",
      denominacion: "Ingeniería Informática"
    });
    
    // Mock de error durante la eliminación
    prisma.carrera.delete.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar la carrera" });
  });
});
