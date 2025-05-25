/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from "@/app/api/(admin)/cursos-academicos/[id]/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    cursoAcademico: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    asignatura: {
      count: jest.fn()
    },
    alumnoPlan: {
      count: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/cursos-academicos/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = () => ({});
  const mockParams = (id) => Promise.resolve({ id });

  it("debe obtener un curso académico específico", async () => {
    const mockCurso = {
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: true,
      createdAt: new Date().toString(),
      updatedAt: new Date().toString()
    };

    // Mock para la búsqueda del curso
    prisma.cursoAcademico.findUnique.mockResolvedValue(mockCurso);

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockCurso);

    // Verificar que se consultó con el ID correcto
    expect(prisma.cursoAcademico.findUnique).toHaveBeenCalledWith({
      where: { id: "ca1" }
    });
  });

  it("debe devolver 404 si el curso académico no existe", async () => {
    // Mock para curso no encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ca_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Curso académico no encontrado" });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para simular un error
    prisma.cursoAcademico.findUnique.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener el curso académico" });
  });
});

describe("PUT /api/cursos-academicos/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });
  const mockParams = (id) => Promise.resolve({ id });

  it("debe actualizar un curso académico correctamente", async () => {
    const updateData = {
      denominacion: "2023-24",
      activo: true
    };

    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: false
    });

    // Mock para la actualización
    const mockCursoActualizado = {
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: true,
      updatedAt: new Date().toString()
    };
    prisma.cursoAcademico.update.mockResolvedValue(mockCursoActualizado);

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockCursoActualizado);

    // Verificar que se actualizaron otros cursos a inactivo
    expect(prisma.cursoAcademico.updateMany).toHaveBeenCalledWith({
      where: { id: { not: "ca1" }, activo: true },
      data: { activo: false }
    });

    // Verificar que se actualizó el curso con los datos correctos
    expect(prisma.cursoAcademico.update).toHaveBeenCalledWith({
      where: { id: "ca1" },
      data: {
        denominacion: "2023-24",
        activo: true,
        cursoAnterior: undefined,
        cursoSiguiente: undefined
      }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "update",
      entityType: "cursoAcademico",
      entityId: "ca1",
      details: "Curso académico actualizado a 2023-24 (activado)"
    }));
  });

  it("debe devolver 400 si falta la denominación", async () => {
    const updateData = {
      activo: true
    };

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La denominación es obligatoria" });
  });

  it("debe devolver 400 si el formato de denominación es inválido", async () => {
    const updateData = {
      denominacion: "2023/24", // Formato inválido
      activo: true
    };

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "La denominación debe seguir el formato 1234-56 (por ejemplo: 2025-26)" 
    });
  });

  it("debe devolver 404 si el curso académico no existe", async () => {
    const updateData = {
      denominacion: "2023-24",
      activo: true
    };

    // Mock para curso no encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Curso académico no encontrado" });
  });

  it("debe mantener activo como estaba si no se proporciona", async () => {
    const updateData = {
      denominacion: "2023-24"
      // No se proporciona activo
    };

    // Mock para el curso existente con activo=true
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: true
    });

    // Mock para la actualización
    const mockCursoActualizado = {
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: true,
      updatedAt: new Date()
    };
    prisma.cursoAcademico.update.mockResolvedValue(mockCursoActualizado);

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);

    // Verificar que se actualizó manteniendo activo=true
    expect(prisma.cursoAcademico.update).toHaveBeenCalledWith({
      where: { id: "ca1" },
      data: expect.objectContaining({
        activo: true
      })
    });
  });

  it("debe manejar errores durante la actualización", async () => {
    const updateData = {
      denominacion: "2023-24",
      activo: true
    };

    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24",
      activo: false
    });

    // Mock para simular un error durante la actualización
    prisma.cursoAcademico.update.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest(updateData);
    const response = await PUT(req, { params: mockParams("ca1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar el curso académico" });
  });
});

describe("DELETE /api/cursos-academicos/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = () => ({});
  const mockParams = (id) => Promise.resolve({ id });

  it("debe eliminar un curso académico correctamente", async () => {
    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24"
    });

    // Mock para verificar que no tiene elementos asociados
    prisma.asignatura.count.mockResolvedValue(0);
    prisma.alumnoPlan.count.mockResolvedValue(0);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Curso académico eliminado correctamente" });

    // Verificar que se eliminó con el ID correcto
    expect(prisma.cursoAcademico.delete).toHaveBeenCalledWith({
      where: { id: "ca1" }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "delete",
      entityType: "cursoAcademico",
      entityId: "ca1",
      details: "Curso académico eliminado: 2023-24"
    }));
  });

  it("debe devolver 404 si el curso académico no existe", async () => {
    // Mock para curso no encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ca_inexistente") });

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Curso académico no encontrado" });
  });

  it("debe devolver 400 si el curso tiene asignaturas asociadas", async () => {
    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24"
    });

    // Mock para verificar que tiene asignaturas asociadas
    prisma.asignatura.count.mockResolvedValue(5);
    prisma.alumnoPlan.count.mockResolvedValue(0);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "No se puede eliminar el curso académico porque tiene elementos asociados",
      asignaturas: 5,
      alumnosPlanes: 0
    });

    // Verificar que no se intentó eliminar
    expect(prisma.cursoAcademico.delete).not.toHaveBeenCalled();
  });

  it("debe devolver 400 si el curso tiene alumnos plan asociados", async () => {
    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24"
    });

    // Mock para verificar que tiene alumnos plan asociados
    prisma.asignatura.count.mockResolvedValue(0);
    prisma.alumnoPlan.count.mockResolvedValue(10);

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "No se puede eliminar el curso académico porque tiene elementos asociados",
      asignaturas: 0,
      alumnosPlanes: 10
    });
  });

  it("debe manejar errores durante la eliminación", async () => {
    // Mock para el curso existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca1",
      anyAnyaca: "2023-24",
      denominacion: "2023-24"
    });

    // Mock para verificar que no tiene elementos asociados
    prisma.asignatura.count.mockResolvedValue(0);
    prisma.alumnoPlan.count.mockResolvedValue(0);

    // Mock para simular un error durante la eliminación
    prisma.cursoAcademico.delete.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await DELETE(mockRequest(), { params: mockParams("ca1") });

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar el curso académico" });
  });
});
