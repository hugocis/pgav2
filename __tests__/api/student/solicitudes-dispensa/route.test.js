/**
 * @jest-environment node
 */

import { POST } from "@/app/api/(student)/solicitudes-dispensa/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    solicitudDispensa: {
      create: jest.fn(),
      findFirst: jest.fn()
    },
    matricula: {
      findUnique: jest.fn()
    },
    estadoDispensa: {
      findUnique: jest.fn(),
      findFirst: jest.fn() // Agregamos findFirst que está siendo utilizado
    }
  }
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("POST /api/(student)/solicitudes-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock para request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 401 si no hay sesi�n de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Mock request
    const req = mockRequest({
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: new Date("2025-05-22T00:00:00.000Z")
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 400 si faltan datos requeridos", async () => {
    // Mock para getServerSession que devuelve una sesi�n v�lida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["Alumno"]
      }
    });

    // Mock request con datos incompletos (falta alegacion)
    const req = mockRequest({
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      estadoDispensaId: "estado1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La alegación es obligatoria y debe ser un string" });
  });

  it("debe devolver 403 si el usuario no tiene permisos", async () => {
    // Mock para getServerSession que devuelve una sesi�n con un usuario diferente
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno2", // Diferente al alumnoId en la petici�n
        roles: ["Alumno"]
      }
    });

    // Mock request
    const req = mockRequest({
      alumnoId: "alumno1", // Este es diferente al usuario de la sesi�n
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: new Date("2025-05-22T00:00:00.000Z")
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No tienes permiso para crear una solicitud para este alumno" });
  });

  it("debe devolver 404 si la matr�cula no existe", async () => {
    // Mock para getServerSession que devuelve una sesi�n v�lida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["Alumno"]
      }
    });

    // Mock request
    const req = mockRequest({
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: new Date("2025-05-22T00:00:00.000Z")
    });

    // Mock para matricula.findUnique que devuelve null (no existe)
    prisma.matricula.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La matrícula especificada no existe o no pertenece al alumno" });
  });

  it("debe devolver 404 si el estado de dispensa no existe", async () => {
    // Mock para getServerSession que devuelve una sesi�n v�lida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["Alumno"]
      }
    });

    // Mock request
    const req = mockRequest({
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: new Date("2025-05-22T00:00:00.000Z")
    });

    // Mock para matricula.findUnique que devuelve una matr�cula v�lida
    prisma.matricula.findUnique.mockResolvedValueOnce({
      id: "matricula1",
      alumno_id: "alumno1"
    });

    // Mock para estadoDispensa.findUnique que devuelve null (no existe)
    prisma.estadoDispensa.findUnique.mockResolvedValueOnce(null);
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "El estado de dispensa especificado no existe" });
  });

  it("debe crear una nueva solicitud de dispensa correctamente", async () => {
    // Mock para getServerSession que devuelve una sesi�n v�lida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["Alumno"]
      }
    });

    // Datos de entrada
    const inputData = {
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: new Date("2025-05-22T00:00:00.000Z")
    };

    // Mock request
    const req = mockRequest(inputData);

    // Mock para matricula.findUnique que devuelve una matr�cula v�lida
    prisma.matricula.findUnique.mockResolvedValueOnce({
      id: "matricula1",
      alumno_id: "alumno1"
    });

    // Mock para estadoDispensa.findUnique que devuelve un estado v�lido
    prisma.estadoDispensa.findUnique.mockResolvedValueOnce({
      id: "estado1",
      denominacion: "Pendiente"
    });
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce({
      id: "estado1",
      denominacion: "Pendiente"
    });

    // Mock para solicitudDispensa.create que devuelve la nueva solicitud
    const nuevaSolicitud = {
      id: "solicitud1",
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: "2025-05-22T00:00:00.000Z"
    };
    prisma.solicitudDispensa.create.mockResolvedValueOnce(nuevaSolicitud);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llam� a solicitudDispensa.create con los datos correctos
    expect(prisma.solicitudDispensa.create).toHaveBeenCalledWith({
      data: {
        alumnoId: inputData.alumnoId,
        matriculaId: inputData.matriculaId,
        alegacion: inputData.alegacion,
        estadoDispensaId: inputData.estadoDispensaId,
        fechaAlegacion: expect.any(Date)
      }
    });

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevaSolicitud);
  });

  it("debe permitir a un administrador crear una solicitud para cualquier alumno", async () => {
    // Mock para getServerSession que devuelve una sesi�n de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"] // el rol es admin (con min�sculas seg�n el c�digo)
      }
    });

    // Datos de entrada (alumnoId diferente al ID del admin)
    const inputData = {
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: "2025-05-22T00:00:00.000Z"
    };

    // Mock request
    const req = mockRequest(inputData);

    // Mock para matricula.findUnique que devuelve una matr�cula v�lida
    prisma.matricula.findUnique.mockResolvedValueOnce({
      id: "matricula1",
      alumno_id: "alumno1"
    });

    // Mock para estadoDispensa.findUnique que devuelve un estado v�lido
    prisma.estadoDispensa.findUnique.mockResolvedValueOnce({
      id: "estado1",
      denominacion: "Pendiente"
    });
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce({
      id: "estado1",
      denominacion: "Pendiente"
    });

    // Mock para solicitudDispensa.create que devuelve la nueva solicitud
    const nuevaSolicitud = {
      id: "solicitud1",
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: "2025-05-22T00:00:00.000Z"
    };
    prisma.solicitudDispensa.create.mockResolvedValueOnce(nuevaSolicitud);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar que se llam� a solicitudDispensa.create con los datos correctos
    expect(prisma.solicitudDispensa.create).toHaveBeenCalled();

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevaSolicitud);
  });

  it("debe manejar fechas inv�lidas", async () => {
    // Mock para getServerSession que devuelve una sesi�n v�lida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["Alumno"]
      }
    });

    // Mock request con fecha inv�lida
    const req = mockRequest({
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      alegacion: "Alegaci�n de prueba",
      estadoDispensaId: "estado1",
      fechaAlegacion: "fecha-invalida"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La fecha de alegación debe ser válida" });
  });
});
