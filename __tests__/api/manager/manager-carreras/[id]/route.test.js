/**
 * @jest-environment node
 */

import { GET, PATCH, DELETE } from "@/app/api/(manager)/manager-carreras/[id]/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    managerCarrera: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("API Manager Carreras [id]", () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request para GET, PATCH, DELETE
  const mockRequest = () => ({
    url: "http://localhost:3000/api/(manager)/manager-carreras/id123"
  });

  // Mock request para PATCH con body
  const mockPatchRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    url: "http://localhost:3000/api/(manager)/manager-carreras/id123"
  });

  // Mock params
  const mockParams = {
    id: "id123"
  };

  describe("GET /api/(manager)/manager-carreras/[id]", () => {
    it("debe devolver 401 si no hay sesión de usuario", async () => {
      // Mock para getServerSession que devuelve null
      getServerSession.mockResolvedValueOnce(null);

      // Mock request
      const req = mockRequest();

      // Llamar al endpoint
      const response = await GET(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("debe devolver 401 si el usuario no tiene rol Admin", async () => {
      // Mock para getServerSession que devuelve una sesión sin rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "user1",
          roles: ["Manager"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Llamar al endpoint
      const response = await GET(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("debe devolver 404 si la asignación no existe", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para la asignación no encontrada
      prisma.managerCarrera.findUnique.mockResolvedValue(null);

      // Llamar al endpoint
      const response = await GET(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "Asignación no encontrada" });
    });

    it("debe devolver la asignación correctamente", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para la asignación encontrada
      const mockAsignacion = {
        id: "id123",
        managerId: "manager1",
        carreraId: "carrera1",
        activo: true,
        fechaAlta: new Date("2025-05-20"),
        fechaBaja: null,
        user: {
          id: "manager1",
          name: "Juan",
          surname1: "García",
          surname2: "López",
          email: "juan.garcia@example.com"
        },
        carrera: {
          id: "carrera1",
          denominacion: "Ingeniería Informática"
        }
      };
      prisma.managerCarrera.findUnique.mockResolvedValue(mockAsignacion);

      // Llamar al endpoint
      const response = await GET(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockAsignacion);

      // Verificar que se consultó con el ID correcto
      expect(prisma.managerCarrera.findUnique).toHaveBeenCalledWith({
        where: { id: "id123" },
        include: expect.objectContaining({
          user: expect.any(Object),
          carrera: expect.any(Object)
        })
      });
    });

    it("debe manejar errores durante la consulta", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para simular un error
      prisma.managerCarrera.findUnique.mockRejectedValue(new Error("Error de base de datos"));

      // Llamar al endpoint
      const response = await GET(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta de error
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: "Error interno del servidor" });
    });
  });

  describe("PATCH /api/(manager)/manager-carreras/[id]", () => {
    it("debe devolver 401 si no hay sesión de usuario", async () => {
      // Mock para getServerSession que devuelve null
      getServerSession.mockResolvedValueOnce(null);

      // Mock request
      const req = mockPatchRequest({ activo: false });

      // Llamar al endpoint
      const response = await PATCH(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("debe actualizar la asignación correctamente (desactivar)", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockPatchRequest({ activo: false });

      // Mock para la actualización exitosa
      const mockActualizado = {
        id: "id123",
        managerId: "manager1",
        carreraId: "carrera1",
        activo: false,
        fechaAlta: new Date("2025-05-20"),
        fechaBaja: new Date("2025-05-23")
      };
      prisma.managerCarrera.update.mockResolvedValue(mockActualizado);

      // Llamar al endpoint
      const response = await PATCH(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockActualizado);

      // Verificar que se actualizó con los datos correctos
      expect(prisma.managerCarrera.update).toHaveBeenCalledWith({
        where: { id: "id123" },
        data: {
          activo: false,
          fechaBaja: expect.any(Date)
        }
      });

      // Verificar que se registró la actividad
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "update",
        entityType: "managerCarrera",
        entityId: "id123",
        details: "Desactivada la asignación del manager a la carrera"
      }));
    });

    it("debe actualizar la asignación correctamente (reactivar)", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockPatchRequest({ activo: true });

      // Mock para la actualización exitosa
      const mockActualizado = {
        id: "id123",
        managerId: "manager1",
        carreraId: "carrera1",
        activo: true,
        fechaAlta: new Date("2025-05-20"),
        fechaBaja: null
      };
      prisma.managerCarrera.update.mockResolvedValue(mockActualizado);

      // Llamar al endpoint
      const response = await PATCH(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockActualizado);

      // Verificar que se actualizó con los datos correctos
      expect(prisma.managerCarrera.update).toHaveBeenCalledWith({
        where: { id: "id123" },
        data: {
          activo: true,
          fechaBaja: null
        }
      });

      // Verificar que se registró la actividad
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "update",
        entityType: "managerCarrera",
        entityId: "id123",
        details: "Reactivada la asignación del manager a la carrera"
      }));
    });

    it("debe manejar errores durante la actualización", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockPatchRequest({ activo: false });

      // Mock para simular un error
      prisma.managerCarrera.update.mockRejectedValue(new Error("Error de base de datos"));

      // Llamar al endpoint
      const response = await PATCH(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta de error
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: "Error interno del servidor" });
    });
  });

  describe("DELETE /api/(manager)/manager-carreras/[id]", () => {
    it("debe devolver 401 si no hay sesión de usuario", async () => {
      // Mock para getServerSession que devuelve null
      getServerSession.mockResolvedValueOnce(null);

      // Mock request
      const req = mockRequest();

      // Llamar al endpoint
      const response = await DELETE(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("debe devolver 404 si la asignación no existe", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para la asignación no encontrada
      prisma.managerCarrera.findUnique.mockResolvedValue(null);

      // Llamar al endpoint
      const response = await DELETE(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toEqual({ error: "Asignación no encontrada" });
    });

    it("debe eliminar la asignación correctamente", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para la asignación encontrada
      const mockAsignacion = {
        id: "id123",
        managerId: "manager1",
        carreraId: "carrera1",
        activo: true
      };
      prisma.managerCarrera.findUnique.mockResolvedValue(mockAsignacion);

      // Mock para la eliminación exitosa
      prisma.managerCarrera.delete.mockResolvedValue({});

      // Llamar al endpoint
      const response = await DELETE(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ message: "Asignación eliminada correctamente" });

      // Verificar que se eliminó con el ID correcto
      expect(prisma.managerCarrera.delete).toHaveBeenCalledWith({
        where: { id: "id123" }
      });

      // Verificar que se registró la actividad
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        action: "delete",
        entityType: "managerCarrera",
        entityId: "id123",
        details: "Eliminada la asignación del manager manager1 a la carrera carrera1"
      }));
    });

    it("debe manejar errores durante la eliminación", async () => {
      // Mock para getServerSession que devuelve una sesión con rol Admin
      getServerSession.mockResolvedValueOnce({
        user: {
          id: "admin1",
          roles: ["Admin"]
        }
      });

      // Mock request
      const req = mockRequest();

      // Mock para la asignación encontrada
      prisma.managerCarrera.findUnique.mockResolvedValue({
        id: "id123",
        managerId: "manager1",
        carreraId: "carrera1"
      });

      // Mock para simular un error en la eliminación
      prisma.managerCarrera.delete.mockRejectedValue(new Error("Error de base de datos"));

      // Llamar al endpoint
      const response = await DELETE(req, { params: Promise.resolve(mockParams) });

      // Verificar la respuesta de error
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: "Error interno del servidor" });
    });
  });
});
