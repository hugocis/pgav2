/**
 * @jest-environment node
 */

import { GET, PUT } from "@/app/api/(manager)/dispensas-academicas/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Mock next-auth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    solicitudDispensa: {
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    estadoDispensa: {
      findFirst: jest.fn()
    }
  }
}));

// Mock authOptions
jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(manager)/dispensas-academicas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock para la solicitud con parámetros de consulta
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(manager)/dispensas-academicas");
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    return {
      nextUrl: url
    };
  };

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    const req = mockRequest();
    const response = await GET(req);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe devolver 401 si el usuario no tiene rol Manager", async () => {
    // Mock para getServerSession que devuelve una sesión con rol incorrecto
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Admin"] // No incluye "Manager"
      }
    });

    const req = mockRequest();
    const response = await GET(req);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });
  it("debe devolver solicitudes de dispensa correctamente sin filtros", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    const mockSolicitudes = [
      {
        id: "solicitud1",
        alumnoId: "alumno1",
        matriculaId: "matricula1",
        fechaAlegacion: new Date("2025-05-22T00:00:00.000Z"),
        fechaRespuesta: null,
        alegacion: "Alegación de prueba",
        respuesta: null,
        estadoDispensaId: "estado1",
        estadoDispensa: {
          denominacion: "Pendiente"
        },
        user: {
          id: "alumno1",
          name: "Alumno",
          surname1: "Apellido1",
          surname2: "Apellido2",
          email: "alumno@example.com"
        },
        matricula: {
          asignatura: {
            CodAsignatura: "MAT101",
            Denominacion: "Matemáticas"
          }
        },
        DocumentacionDispensa: [
          {
            url: "https://example.com/documento.pdf"
          }
        ]
      }
    ];
    
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce(mockSolicitudes);

    const req = mockRequest();
    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0]).toHaveProperty("id", "solicitud1");
    expect(body[0]).toHaveProperty("studentName", "Alumno Apellido1 Apellido2");
    expect(body[0]).toHaveProperty("studentEmail", "alumno@example.com");
    expect(body[0]).toHaveProperty("subject", "Matemáticas");
    expect(body[0]).toHaveProperty("subjectCode", "MAT101");
    expect(body[0]).toHaveProperty("requestDate");    expect(body[0]).toHaveProperty("status", "pending");
    // Verificar que se llamó correctamente al método findMany
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        user: expect.any(Object),
        matricula: expect.any(Object),
        estadoDispensa: expect.any(Object),
        DocumentacionDispensa: expect.any(Object)
      }),
      orderBy: {
        fechaAlegacion: 'desc'
      }
    }));
  });
  it("debe aplicar filtro por estado correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);    const req = mockRequest({ status: "pending" });
    await GET(req);
    
    // Verificar que se aplicó el filtro de estado
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estadoDispensa: {
            denominacion: "Pendiente"
          }
        })
      })
    );
  });

  it("debe aplicar filtros de fecha correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    const dateFrom = "2025-01-01";
    const dateTo = "2025-12-31";
    const req = mockRequest({ dateFrom, dateTo });
    await GET(req);
    
    // Verificar que se aplicaron los filtros de fecha
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fechaAlegacion: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      })
    );
  });

  it("debe aplicar filtro por código de asignatura correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    const subjectCode = "MAT101";
    const req = mockRequest({ subjectCode });
    await GET(req);
    
    // Verificar que se aplicó el filtro de código de asignatura
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          matricula: {
            asignatura: {
              CodAsignatura: subjectCode
            }
          }
        })
      })
    );
  });

  it("debe aplicar filtro por término de búsqueda correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);

    const searchTerm = "ejemplo";
    const req = mockRequest({ searchTerm });
    await GET(req);
    
    // Verificar que se aplicó el filtro de término de búsqueda
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              user: {
                OR: expect.arrayContaining([
                  { name: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } }
                ])
              }
            },
            { alegacion: { contains: searchTerm, mode: 'insensitive' } }
          ]
        })
      })
    );
  });

  it("debe aplicar múltiples filtros correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para solicitudes de dispensa
    prisma.solicitudDispensa.findMany.mockResolvedValueOnce([]);    const req = mockRequest({
      status: "approved",
      dateFrom: "2025-01-01",
      subjectCode: "MAT101",
      searchTerm: "ejemplo"
    });
    await GET(req);
    
    // Verificar que se aplicaron todos los filtros
    expect(prisma.solicitudDispensa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estadoDispensa: { denominacion: "Aprobada" },
          fechaAlegacion: { gte: expect.any(Date) },
          matricula: {
            asignatura: { CodAsignatura: "MAT101" }
          },
          OR: expect.any(Array)
        })
      })
    );
  });

  it("debe manejar errores adecuadamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para simular un error en la consulta
    prisma.solicitudDispensa.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    const req = mockRequest();
    const response = await GET(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error interno del servidor" });
  });
});

describe("PUT /api/(manager)/dispensas-academicas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock para la solicitud con cuerpo
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    const req = mockRequest({
      id: "solicitud1",
      status: "aprobada",
      comments: "Dispensa aprobada"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe devolver 401 si el usuario no tiene rol Manager", async () => {
    // Mock para getServerSession que devuelve una sesión con rol incorrecto
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno"] // No incluye "Manager"
      }
    });

    const req = mockRequest({
      id: "solicitud1",
      status: "aprobada",
      comments: "Dispensa aprobada"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe devolver 400 si falta el ID de la dispensa", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    const req = mockRequest({
      status: "aprobada",
      comments: "Dispensa aprobada"
      // Falta el ID
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Falta el ID de la dispensa" });
  });
  it("debe devolver 400 si el estado es inválido", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para estado no encontrado
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(null);

    const req = mockRequest({
      id: "solicitud1",
      status: "invalid_state",
      comments: "Dispensa con estado inexistente"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Estado inválido" });
  });
  it("debe actualizar correctamente la solicitud de dispensa", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para el estado encontrado
    const estadoDispensa = {
      id: "estado2",
      denominacion: "Aprobada"
    };
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(estadoDispensa);

    // Mock para la actualización exitosa
    const fechaRespuesta = new Date();
    const solicitudActualizada = {
      id: "solicitud1",
      estadoDispensaId: "estado2",
      respuesta: "Dispensa aprobada",
      fechaRespuesta: fechaRespuesta
    };
    prisma.solicitudDispensa.update.mockResolvedValueOnce({
      ...solicitudActualizada,
      fechaRespuesta: fechaRespuesta.toISOString()
    });

    const req = mockRequest({
      id: "solicitud1",
      status: "approved",
      comments: "Dispensa aprobada"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("dispensa", {
      ...solicitudActualizada,
      fechaRespuesta: fechaRespuesta.toISOString()
    });
      // Verificar que se buscó el estado correcto
    expect(prisma.estadoDispensa.findFirst).toHaveBeenCalledWith({
      where: {
        denominacion: "Aprobada"
      }
    });
    
    // Verificar que se actualizó la solicitud con los datos correctos
    expect(prisma.solicitudDispensa.update).toHaveBeenCalledWith({
      where: { id: "solicitud1" },
      data: {
        estadoDispensaId: "estado2",
        respuesta: "Dispensa aprobada",
        fechaRespuesta: expect.any(Date)
      }
    });
  });
  it("debe actualizar correctamente la solicitud con estado rechazada", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para el estado encontrado
    const estadoDispensa = {
      id: "estado3",
      denominacion: "Rechazada"
    };
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce(estadoDispensa);

    // Mock para la actualización exitosa
    const fechaRespuesta = new Date();
    const solicitudActualizada = {
      id: "solicitud1",
      estadoDispensaId: "estado3",
      respuesta: "Dispensa rechazada por motivos académicos",
      fechaRespuesta: fechaRespuesta
    };
    prisma.solicitudDispensa.update.mockResolvedValueOnce({
      ...solicitudActualizada,
      fechaRespuesta: fechaRespuesta.toISOString()
    });

    const req = mockRequest({
      id: "solicitud1",
      status: "rejected",
      comments: "Dispensa rechazada por motivos académicos"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("dispensa", {
      ...solicitudActualizada,
      fechaRespuesta: fechaRespuesta.toISOString()
    });
    
    // Verificar que se buscó el estado correcto
    expect(prisma.estadoDispensa.findFirst).toHaveBeenCalledWith({
      where: {
        denominacion: "Rechazada"
      }
    });
  });

  it("debe manejar errores adecuadamente", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para el estado encontrado
    prisma.estadoDispensa.findFirst.mockResolvedValueOnce({
      id: "estado2",
      denominacion: "Aprobada"
    });    // Mock para simular un error en la actualización
    prisma.solicitudDispensa.update.mockRejectedValueOnce(new Error("Error de base de datos"));

    const req = mockRequest({
      id: "solicitud1",
      status: "approved",
      comments: "Dispensa aprobada"
    });
    const response = await PUT(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error interno del servidor" });
  });
});
