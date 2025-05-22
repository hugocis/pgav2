/**
 * @jest-environment node
 */
const { POST } = require("@/app/api/user/change-password/route");
const prisma = require("@/lib/prisma");
const { getServerSession } = require("next-auth");
const { hash, compare } = require("bcrypt");

// Mocks
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

describe("POST /api/user/change-password", () => {
  // Crear un mock de Request
  const createMockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
  });

  // Reseteamos los mocks antes de cada test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Crear un mock de la solicitud
    const req = createMockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123",
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que getServerSession fue llamado
    expect(getServerSession).toHaveBeenCalled();

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ message: "No autorizado" });
  });

  it("debe devolver 400 si faltan datos en la solicitud", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: { id: "user123" },
    });

    // Crear un mock de la solicitud con datos incompletos
    const req = createMockRequest({
      // Falta currentPassword
      newPassword: "newpassword123",
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ message: "Se requiere la contraseña actual y la nueva" });
  });

  it("debe devolver 400 si la nueva contraseña es muy corta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: { id: "user123" },
    });

    // Crear un mock de la solicitud con contraseña corta
    const req = createMockRequest({
      currentPassword: "password123",
      newPassword: "short", // menos de 8 caracteres
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ message: "La contraseña debe tener al menos 8 caracteres" });
  });

  it("debe cambiar la contraseña correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: { id: "user123" },
    });

    // Mock para findUnique que devuelve un usuario
    prisma.default.user.findUnique.mockResolvedValueOnce({
      id: "user123",
      password: "hashed_password",
    });

    // Mock para compare que devuelve true (contraseña correcta)
    compare.mockResolvedValueOnce(true);

    // Mock para hash que devuelve una nueva contraseña hasheada
    hash.mockResolvedValueOnce("new_hashed_password");

    // Crear un mock de la solicitud
    const req = createMockRequest({
      currentPassword: "password123",
      newPassword: "newpassword123",
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llamó a findUnique con los parámetros correctos
    expect(prisma.default.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user123" },
      select: { id: true, password: true }
    });

    // Verificar que se llamó a compare con los parámetros correctos
    expect(compare).toHaveBeenCalledWith("password123", "hashed_password");

    // Verificar que se llamó a hash con la nueva contraseña
    expect(hash).toHaveBeenCalledWith("newpassword123", 10);

    // Verificar que se llamó a update con los parámetros correctos
    expect(prisma.default.user.update).toHaveBeenCalledWith({
      where: { id: "user123" },
      data: { password: "new_hashed_password" },
    });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Contraseña actualizada correctamente" });
  });
});
