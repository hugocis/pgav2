/**
 * @jest-environment node
 */

import { POST } from "@/app/api/user/change-password/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { hash, compare } from "bcrypt";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("POST /api/user/change-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Mock request
    const req = mockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ message: "No autorizado" });
  });

  it("debe devolver 400 si faltan datos requeridos", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request con datos incompletos
    const req = mockRequest({
      currentPassword: "password123"
      // newPassword no está presente
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ message: "Se requiere la contraseña actual y la nueva" });
  });

  it("debe devolver 400 si la nueva contraseña es demasiado corta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request con contraseña muy corta
    const req = mockRequest({
      currentPassword: "password123",
      newPassword: "short"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ message: "La contraseña debe tener al menos 8 caracteres" });
  });

  it("debe devolver 404 si el usuario no existe", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request
    const req = mockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123"
    });

    // Mock para usuario no encontrado
    prisma.user.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ message: "Usuario no encontrado" });
  });

  it("debe devolver 401 si la contraseña actual es incorrecta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request
    const req = mockRequest({
      currentPassword: "wrongpassword",
      newPassword: "newpassword123"
    });

    // Mock para usuario encontrado
    prisma.user.findUnique.mockResolvedValue({
      id: "user1",
      password: "hashedpassword"
    });

    // Mock para verificación de contraseña fallida
    compare.mockResolvedValue(false);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ message: "Contraseña actual incorrecta" });
  });

  it("debe actualizar la contraseña correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request
    const req = mockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123"
    });

    // Mock para usuario encontrado
    prisma.user.findUnique.mockResolvedValue({
      id: "user1",
      password: "hashedpassword"
    });

    // Mock para verificación de contraseña correcta
    compare.mockResolvedValue(true);

    // Mock para generación de hash
    hash.mockResolvedValue("newhashpassword");

    // Mock para actualización exitosa
    prisma.user.update.mockResolvedValue({
      id: "user1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Contraseña actualizada correctamente" });

    // Verificar que se actualizó la contraseña con los datos correctos
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { password: "newhashpassword" }
    });
  });

  it("debe manejar errores durante el proceso", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1"
      }
    });

    // Mock request
    const req = mockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123"
    });

    // Mock para simular un error
    prisma.user.findUnique.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ message: "Error al procesar la solicitud" });
  });
});
