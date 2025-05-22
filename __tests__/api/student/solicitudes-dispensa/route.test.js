/**
 * @jest-environment node
 */

import { POST, GET, PUT } from "@/app/api/(student)/solicitudes-dispensa/route";
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
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    matricula: {
      findUnique: jest.fn()
    },
    estadoDispensa: {
      findUnique: jest.fn(),
      findFirst: jest.fn()
    },
    managerCarrera: {
      findMany: jest.fn()
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

describe("GET /api/(student)/solicitudes-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock para request con URL
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(student)/solicitudes-dispensa");
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    return {
      url: url.toString(),
      nextUrl: url
    };
  };

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("debe permitir a un alumno ver solo sus propias solicitudes", async () => {
    // Mock para getServerSession que devuelve una sesión de alumno
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["alumno"]
      }
    });

    // Mock para solicitudDispensa.findMany
    const mockSolicitudes = [
      {
        id: "solicitud1",
        alumnoId: "alumno1",
        matriculaId: "matricula1",
        fechaAlegacion: new Date("2025-05-22T00:00:00.000Z").toISOString(),
        alegacion: "Alegación de prueba",
        estadoDispensaId: "estado1",
        user: {
          name: "Alumno",
          surname1: "Apellido1",
          surname2: "Apellido2",
          email: "alumno@example.com"
        },
        matricula: {
          asignatura: {
            carrera: {
              id: "carrera1",
              denominacion: "Ingeniería Informática"
            }
          }
        },
        estadoDispensa: {
          id: "estado1",
          denominacion: "Pendiente"
        },
        DocumentacionDispensa: []
      }
    ];

    prisma.solicitudDispensa.findMany.mockResolvedValueOnce(mockSolicitudes);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar que se consultó con el filtro por alumnoId
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { alumnoId: "alumno1" }
    }));

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockSolicitudes);
  });

  it("debe permitir a un manager ver solicitudes de sus carreras asignadas", async () => {
    // Mock para getServerSession que devuelve una sesión de manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["manager"]
      }
    });

    // Mock para las carreras asignadas al manager
    const managerCarreras = [
      { carreraId: "carrera1" },
      { carreraId: "carrera2" }
    ];
    prisma.managerCarrera.findMany.mockResolvedValueOnce(managerCarreras);

    // Mock para solicitudDispensa.findMany
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint
    const req = mockRequest();
    await GET(req);

    // Verificar que se consultó managerCarrera
    expect(prisma.managerCarrera.findMany).toHaveBeenCalledWith({
      where: {
        managerId: "manager1",
        activo: true
      },
      select: {
        carreraId: true
      }
    });

    // Verificar que se consultó con el filtro de carreraIds
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        matricula: {
          asignatura: {
            carrera: {
              id: { in: ["carrera1", "carrera2"] }
            }
          }
        }
      }
    }));
  });

  it("debe permitir a un admin ver todas las solicitudes", async () => {
    // Mock para getServerSession que devuelve una sesión de admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock para solicitudDispensa.findMany
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint
    const req = mockRequest();
    await GET(req);    // Verificar que se consultó con la consulta completa
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalled();
  });

  it("debe filtrar correctamente por alumnoId", async () => {
    // Mock para getServerSession que devuelve una sesión de admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock para solicitudDispensa.findMany
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint con filtro por alumnoId
    const req = mockRequest({ alumnoId: "alumno2" });
    await GET(req);

    // Verificar que se consultó con el filtro por alumnoId
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { alumnoId: "alumno2" }
    }));
  });

  it("debe filtrar correctamente por matriculaId", async () => {
    // Mock para getServerSession que devuelve una sesión de admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock para solicitudDispensa.findMany
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint con filtro por matriculaId
    const req = mockRequest({ matriculaId: "matricula2" });
    await GET(req);

    // Verificar que se consultó con el filtro por matriculaId
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { matriculaId: "matricula2" }
    }));
  });

  it("debe filtrar correctamente por estadoId", async () => {
    // Mock para getServerSession que devuelve una sesión de admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock para solicitudDispensa.findMany
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint con filtro por estadoId
    const req = mockRequest({ estadoId: "estado2" });
    await GET(req);

    // Verificar que se consultó con el filtro por estadoDispensaId
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { estadoDispensaId: "estado2" }
    }));
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["alumno"]
      }
    });

    // Mock para simular un error
    prisma.solicitudDispensa.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al procesar la solicitud" });
  });
});

describe("PUT /api/(student)/solicitudes-dispensa", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock para request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Mock request
    const req = mockRequest({
      id: "solicitud1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aceptada"
    });

    // Llamar al endpoint
    const response = await PUT(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 403 si el usuario no tiene permisos", async () => {
    // Mock para getServerSession que devuelve una sesión sin permisos
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "alumno1",
        roles: ["alumno"] // No es admin ni manager
      }
    });

    // Mock request
    const req = mockRequest({
      id: "solicitud1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aceptada"
    });

    // Llamar al endpoint
    const response = await PUT(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No tienes permiso para actualizar solicitudes de dispensa" });
  });

  it("debe devolver 400 si faltan datos requeridos", async () => {
    // Mock para getServerSession que devuelve una sesión con permisos
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["manager"]
      }
    });

    // Mock request con datos incompletos (falta estadoDispensaId)
    const req = mockRequest({
      id: "solicitud1",
      respuesta: "Dispensa aceptada"
    });

    // Llamar al endpoint
    const response = await PUT(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Faltan campos requeridos (id, estadoDispensaId)" });
  });

  it("debe actualizar correctamente la solicitud de dispensa", async () => {
    // Mock para getServerSession que devuelve una sesión con permisos
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["manager"]
      }
    });

    // Datos para la actualización
    const updateData = {
      id: "solicitud1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aceptada"
    };

    // Mock request
    const req = mockRequest(updateData);

    // Mock para solicitudDispensa.update que devuelve la solicitud actualizada
    const solicitudActualizada = {
      id: "solicitud1",
      alumnoId: "alumno1",
      matriculaId: "matricula1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aceptada",
      fechaRespuesta: new Date().toISOString()
    };
    prisma.solicitudDispensa.update.mockResolvedValueOnce(solicitudActualizada);

    // Llamar al endpoint
    const response = await PUT(req);

    // Verificar que se llamó a solicitudDispensa.update con los datos correctos
    expect(prisma.solicitudDispensa.update).toHaveBeenCalledWith({
      where: { id: "solicitud1" },
      data: expect.objectContaining({
        estadoDispensaId: "estado2",
        respuesta: "Dispensa aceptada",
        fechaRespuesta: expect.any(Date)
      })
    });

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(solicitudActualizada);
  });

  it("debe manejar errores durante la actualización", async () => {
    // Mock para getServerSession que devuelve una sesión con permisos
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["admin"]
      }
    });

    // Mock request
    const req = mockRequest({
      id: "solicitud1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aceptada"
    });

    // Mock para simular un error
    prisma.solicitudDispensa.update.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await PUT(req);

    // Verificar la respuesta de error    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al procesar la solicitud" });
  });
});
