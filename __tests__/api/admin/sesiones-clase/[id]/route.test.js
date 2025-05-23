/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from "@/app/api/(admin)/sesiones-clase/[id]/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    sesionClase: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    grupo: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    asistenciaAlumno: {
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

// Mock logActivity
jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

describe("GET /api/admin/sesiones-clase/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/");

    const response = await GET(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la sesión de clase es obligatorio" });
  });

  it("debe devolver 404 si la sesión de clase no existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(null);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Sesión de clase no encontrada" });
  });

  it("debe devolver la sesión de clase si existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    const sesionClaseMock = {
      id: "sesion1",
      fecha: new Date("2025-05-01T10:00:00Z"),
      grupoId: "grupo1",
      docenteId: "docente1",
      grupo: { id: "grupo1", denominacion: "Grupo A" },
      user: {
        id: "docente1",
        name: "Juan",
        surname1: "Pérez",
        surname2: "García",
        email: "juan.perez@example.com"
      },
      AsistenciaAlumno: [
        {
          id: "asistencia1",
          userId: "alumno1",
          sesionClaseId: "sesion1",
          estadoAsistenciaId: 1,
          user: {
            id: "alumno1",
            name: "Ana",
            surname1: "López",
            surname2: "Martínez",
            email: "ana.lopez@example.com"
          },
          estadoAsistencia: { id: 1, descripcion: "Presente" }
        }
      ]
    };
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(sesionClaseMock);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionClaseMock);
    expect(prisma.sesionClase.findUnique).toHaveBeenCalledWith({
      where: { id: "sesion1" },
      include: {
        grupo: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        AsistenciaAlumno: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                surname1: true,
                surname2: true,
                email: true
              }
            },
            estadoAsistencia: true
          }
        }
      }
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    prisma.sesionClase.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await GET(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener la sesión de clase" });
  });
});

describe("PUT /api/admin/sesiones-clase/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    url: "http://localhost:3000/api/admin/sesiones-clase/sesion1"
  });

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la sesión de clase es obligatorio" });
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1"
      // Falta docenteId
    });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Fecha, grupoId y docenteId son campos obligatorios" });
  });

  it("debe devolver 404 si la sesión de clase no existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Sesión de clase no encontrada" });
  });

  it("debe devolver 400 si el grupo no existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce({
      id: "sesion1",
      fecha: new Date("2025-05-01T09:00:00Z"),
      grupoId: "grupo2",
      docenteId: "docente2",
      grupo: { id: "grupo2", denominacion: "Grupo B" }
    });
    
    prisma.grupo.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El grupo especificado no existe" });
  });

  it("debe devolver 400 si el docente no existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce({
      id: "sesion1",
      fecha: new Date("2025-05-01T09:00:00Z"),
      grupoId: "grupo2",
      docenteId: "docente2",
      grupo: { id: "grupo2", denominacion: "Grupo B" }
    });
    
    prisma.grupo.findUnique.mockResolvedValueOnce({
      id: "grupo1",
      denominacion: "Grupo A"
    });
    
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El docente especificado no existe" });
  });

  it("debe actualizar la sesión de clase correctamente", async () => {
    const fechaTest = "2025-05-01T10:00:00Z";
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: fechaTest,
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    const sesionExistente = {
      id: "sesion1",
      fecha: new Date("2025-05-01T09:00:00Z"),
      grupoId: "grupo2",
      docenteId: "docente2",
      grupo: { id: "grupo2", denominacion: "Grupo B" }
    };
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(sesionExistente);
    
    const grupo = { id: "grupo1", denominacion: "Grupo A" };
    const docente = { id: "docente1", name: "Juan Pérez" };
    
    prisma.grupo.findUnique.mockResolvedValueOnce(grupo);
    prisma.user.findUnique.mockResolvedValueOnce(docente);
    
    const sesionActualizada = {
      id: "sesion1",
      fecha: new Date(fechaTest),
      grupoId: "grupo1",
      docenteId: "docente1"
    };
    
    prisma.sesionClase.update.mockResolvedValueOnce(sesionActualizada);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionActualizada);
    
    // Verificar llamada a update
    expect(prisma.sesionClase.update).toHaveBeenCalledWith({
      where: { id: "sesion1" },
      data: {
        fecha: new Date(fechaTest),
        grupoId: "grupo1",
        docenteId: "docente1"
      }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: 'update',
      entityType: 'sesionClase',
      entityId: 'sesion1',
      details: expect.stringContaining("Actualización de sesión de clase"),
      prevValue: sesionExistente
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.sesionClase.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar la sesión de clase" });
  });
});

describe("DELETE /api/admin/sesiones-clase/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si no se proporciona un ID", async () => {
    const params = Promise.resolve({ id: "" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/");

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la sesión de clase es obligatorio" });
  });

  it("debe devolver 404 si la sesión de clase no existe", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Sesión de clase no encontrada" });
  });

  it("debe eliminar la sesión de clase sin registros de asistencia asociados", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    const sesionExistente = {
      id: "sesion1",
      fecha: new Date("2025-05-01T09:00:00Z"),
      grupoId: "grupo1",
      docenteId: "docente1",
      grupo: { id: "grupo1", denominacion: "Grupo A" }
    };
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(sesionExistente);
    prisma.asistenciaAlumno.findFirst.mockResolvedValueOnce(null);
    prisma.sesionClase.delete.mockResolvedValueOnce({ id: "sesion1" });

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Sesión de clase eliminada correctamente" });
    
    // Verificar que no se llamó a deleteMany
    expect(prisma.asistenciaAlumno.deleteMany).not.toHaveBeenCalled();
    
    // Verificar llamada a delete
    expect(prisma.sesionClase.delete).toHaveBeenCalledWith({
      where: { id: "sesion1" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: 'delete',
      entityType: 'sesionClase',
      entityId: 'sesion1',
      details: expect.stringContaining("Eliminación de sesión de clase"),
      prevValue: sesionExistente
    });
  });

  it("debe eliminar la sesión de clase y sus registros de asistencia asociados", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    const sesionExistente = {
      id: "sesion1",
      fecha: new Date("2025-05-01T09:00:00Z"),
      grupoId: "grupo1",
      docenteId: "docente1",
      grupo: { id: "grupo1", denominacion: "Grupo A" }
    };
    
    prisma.sesionClase.findUnique.mockResolvedValueOnce(sesionExistente);
    
    // Hay registros de asistencia asociados
    prisma.asistenciaAlumno.findFirst.mockResolvedValueOnce({
      id: "asistencia1",
      sesionClaseId: "sesion1"
    });
    
    prisma.sesionClase.delete.mockResolvedValueOnce({ id: "sesion1" });

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Sesión de clase eliminada correctamente" });
    
    // Verificar que se llamó a deleteMany
    expect(prisma.asistenciaAlumno.deleteMany).toHaveBeenCalledWith({
      where: { sesionClaseId: "sesion1" }
    });
    
    // Verificar llamada a delete
    expect(prisma.sesionClase.delete).toHaveBeenCalledWith({
      where: { id: "sesion1" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: 'delete',
      entityType: 'sesionClase',
      entityId: 'sesion1',
      details: expect.stringContaining("Eliminación de sesión de clase"),
      prevValue: sesionExistente
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "sesion1" });
    const request = new Request("http://localhost:3000/api/admin/sesiones-clase/sesion1");
    
    prisma.sesionClase.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar la sesión de clase" });
  });
});
