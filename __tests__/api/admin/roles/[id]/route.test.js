/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from "@/app/api/(admin)/roles/[id]/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    role: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

// Mock logActivity
jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

describe("GET /api/admin/roles/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si el ID no es un número válido", async () => {
    const params = Promise.resolve({ id: "invalid" });
    const request = new Request("http://localhost:3000/api/admin/roles/invalid");

    const response = await GET(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "ID de rol inválido" });
  });

  it("debe devolver 404 si el rol no existe", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    prisma.role.findUnique.mockResolvedValueOnce(null);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Rol no encontrado" });
    expect(prisma.role.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });
  });

  it("debe devolver el rol si existe", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    const mockRole = {
      id: 1,
      name: "Admin",
      description: "Administrador del sistema",
      userRoles: [
        {
          id: "ur1",
          userId: "user1",
          roleId: 1,
          user: { id: "user1", name: "Usuario Administrador" }
        }
      ]
    };
    
    prisma.role.findUnique.mockResolvedValueOnce(mockRole);

    const response = await GET(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockRole);
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    prisma.role.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await GET(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener el rol" });
  });
});

describe("PUT /api/admin/roles/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request
  const mockRequest = (body) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/admin/roles/1"
    };
  };

  it("debe devolver 400 si el ID no es un número válido", async () => {
    const params = Promise.resolve({ id: "invalid" });
    const req = mockRequest({ name: "Nuevo Nombre" });

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "ID de rol inválido" });
  });

  it("debe devolver 404 si el rol no existe", async () => {
    const params = Promise.resolve({ id: "1" });
    const req = mockRequest({ name: "Nuevo Nombre" });
    
    prisma.role.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Rol no encontrado" });
  });

  it("debe actualizar solo el nombre del rol", async () => {
    const params = Promise.resolve({ id: "1" });
    const req = mockRequest({ name: "Nuevo Nombre" });
    
    const existingRole = {
      id: 1,
      name: "Admin",
      description: "Administrador del sistema"
    };
    
    const updatedRole = {
      id: 1,
      name: "Nuevo Nombre",
      description: "Administrador del sistema",
      userRoles: []
    };
    
    prisma.role.findUnique.mockResolvedValueOnce(existingRole);
    prisma.role.update.mockResolvedValueOnce(updatedRole);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedRole);
    
    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Nuevo Nombre" },
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });
    
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "update",
      entityType: "role",
      entityId: "1",
      details: expect.stringContaining("Actualización del rol"),
      prevValue: existingRole
    });
  });

  it("debe actualizar solo la descripción del rol", async () => {
    const params = Promise.resolve({ id: "1" });
    const req = mockRequest({ description: "Nueva descripción" });
    
    const existingRole = {
      id: 1,
      name: "Admin",
      description: "Administrador del sistema"
    };
    
    const updatedRole = {
      id: 1,
      name: "Admin",
      description: "Nueva descripción",
      userRoles: []
    };
    
    prisma.role.findUnique.mockResolvedValueOnce(existingRole);
    prisma.role.update.mockResolvedValueOnce(updatedRole);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedRole);
    
    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { description: "Nueva descripción" },
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });
  });

  it("debe actualizar tanto el nombre como la descripción del rol", async () => {
    const params = Promise.resolve({ id: "1" });
    const req = mockRequest({
      name: "Nuevo Nombre",
      description: "Nueva descripción"
    });
    
    const existingRole = {
      id: 1,
      name: "Admin",
      description: "Administrador del sistema"
    };
    
    const updatedRole = {
      id: 1,
      name: "Nuevo Nombre",
      description: "Nueva descripción",
      userRoles: []
    };
    
    prisma.role.findUnique.mockResolvedValueOnce(existingRole);
    prisma.role.update.mockResolvedValueOnce(updatedRole);

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedRole);
    
    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        name: "Nuevo Nombre",
        description: "Nueva descripción"
      },
      include: {
        userRoles: {
          include: { user: true }
        }
      }
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "1" });
    const req = mockRequest({ name: "Nuevo Nombre" });
    
    prisma.role.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await PUT(req, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar el rol" });
  });
});

describe("DELETE /api/admin/roles/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 400 si el ID no es un número válido", async () => {
    const params = Promise.resolve({ id: "invalid" });
    const request = new Request("http://localhost:3000/api/admin/roles/invalid");

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "ID de rol inválido" });
  });

  it("debe devolver 404 si el rol no existe", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    prisma.role.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "Rol no encontrado" });
  });

  it("debe eliminar el rol correctamente", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    const existingRole = {
      id: 1,
      name: "Admin",
      description: "Administrador del sistema"
    };
    
    prisma.role.findUnique.mockResolvedValueOnce(existingRole);
    prisma.role.delete.mockResolvedValueOnce({ id: 1 });

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Rol eliminado correctamente" });
    
    expect(prisma.role.delete).toHaveBeenCalledWith({
      where: { id: 1 }
    });
    
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "delete",
      entityType: "role",
      entityId: "1",
      details: expect.stringContaining("Eliminación del rol"),
      prevValue: existingRole
    });
  });

  it("debe manejar errores internos", async () => {
    const params = Promise.resolve({ id: "1" });
    const request = new Request("http://localhost:3000/api/admin/roles/1");
    
    prisma.role.findUnique.mockResolvedValueOnce({
      id: 1,
      name: "Admin"
    });
    
    prisma.role.delete.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await DELETE(request, { params });
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar el rol" });
  });
});
