/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/carreras/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { logActivity } from "@/lib/logActivity";
import fetch from 'node-fetch';

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    carrera: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn()
    },
    escuela: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    managerCarrera: {
      findMany: jest.fn()
    },
    configuracionCarrera: {
      create: jest.fn()
    },
    planDeEstudios: {
      create: jest.fn()
    },
    ofertaAcademica: {
      count: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

jest.mock("node-fetch", () => jest.fn());

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/carreras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/carreras");
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
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe devolver todas las carreras para un usuario admin", async () => {
    // Mock para getServerSession que devuelve una sesión con rol Admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para las carreras
    const mockCarreras = [
      {
        id: "carr1",
        denominacion: "Ingeniería Informática",
        escuelaId: "esc1",
        createdAt: new Date().toString(),
        updatedAt: new Date().toString(),
        escuela: { id: "esc1", denominacion: "Escuela de Informática" },
        ConfiguracionCarrera: { SolDispensa: true, SolJustificacion: true },
        PlanDeEstudios: [{ id: "plan1", denominacion: "Plan 2021", codPlan: "INF21" }]
      }
    ];

    prisma.carrera.findMany.mockResolvedValue(mockCarreras);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockCarreras);

    // Verificar que se consultaron todas las carreras
    expect(prisma.carrera.findMany).toHaveBeenCalledWith({
      include: {
        escuela: true,
        ConfiguracionCarrera: true,
        PlanDeEstudios: true
      },
      orderBy: {
        denominacion: 'asc',
      },
    });
  });

  it("debe devolver solo las carreras asignadas para un usuario manager", async () => {
    // Mock para getServerSession que devuelve una sesión con rol Manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para las asignaciones del manager
    const mockAsignaciones = [
      {
        id: "asig1",
        managerId: "manager1",
        carreraId: "carr1",
        carrera: {
          id: "carr1",
          denominacion: "Ingeniería Informática",
          escuela: { id: "esc1", denominacion: "Escuela de Informática" },
          ConfiguracionCarrera: { SolDispensa: true, SolJustificacion: true },
          PlanDeEstudios: [{ id: "plan1", denominacion: "Plan 2021", codPlan: "INF21" }]
        }
      }
    ];

    prisma.managerCarrera.findMany.mockResolvedValue(mockAsignaciones);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([mockAsignaciones[0].carrera]);

    // Verificar que se consultaron solo las carreras del manager
    expect(prisma.managerCarrera.findMany).toHaveBeenCalledWith({
      where: {
        managerId: "manager1",
        activo: true
      },
      include: {
        carrera: {
          include: {
            escuela: true,
            ConfiguracionCarrera: true,
            PlanDeEstudios: true
          }
        }
      },
      orderBy: {
        carrera: {
          denominacion: 'asc'
        }
      }
    });
  });

  it("debe devolver carreras de un manager específico si se proporciona managerId", async () => {
    // Mock para getServerSession que devuelve una sesión con rol Admin
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para las asignaciones del manager específico
    const mockAsignaciones = [
      {
        id: "asig2",
        managerId: "manager2",
        carreraId: "carr2",
        carrera: {
          id: "carr2",
          denominacion: "Arquitectura",
          escuela: { id: "esc2", denominacion: "Escuela de Arquitectura" },
          ConfiguracionCarrera: { SolDispensa: false, SolJustificacion: true },
          PlanDeEstudios: [{ id: "plan2", denominacion: "Plan 2023", codPlan: "ARQ23" }]
        }
      }
    ];

    prisma.managerCarrera.findMany.mockResolvedValue(mockAsignaciones);

    // Llamar al endpoint con managerId específico
    const req = mockRequest({ managerId: "manager2" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([mockAsignaciones[0].carrera]);

    // Verificar que se consultaron las carreras del manager específico
    expect(prisma.managerCarrera.findMany).toHaveBeenCalledWith({
      where: {
        managerId: "manager2",
        activo: true
      },
      include: expect.any(Object),
      orderBy: expect.any(Object)
    });
  });

  it("debe devolver 403 si un manager intenta ver carreras de otro manager", async () => {
    // Mock para getServerSession que devuelve una sesión con rol Manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Llamar al endpoint con managerId de otro manager
    const req = mockRequest({ managerId: "manager2" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado para ver carreras de otro manager" });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para simular un error
    prisma.carrera.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener las carreras" });
  });
});

describe("POST /api/carreras - Modo Manual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    nextUrl: {
      origin: "http://localhost:3000"
    }
  });

  it("debe crear una nueva carrera en modo manual", async () => {
    const carreraData = {
      denominacion: "Ingeniería Informática",
      escuelaId: "esc1",
      planesDeEstudio: [
        { denominacion: "Plan 2021", codPlan: "INF21" }
      ]
    };

    // Mock para la escuela
    prisma.escuela.findUnique.mockResolvedValue({
      id: "esc1",
      denominacion: "Escuela de Informática"
    });

    // Mock para verificar que no existe carrera con esa denominación en esa escuela
    prisma.carrera.findFirst.mockResolvedValue(null);

    // Mock para la creación exitosa de la carrera
    const nuevaCarrera = {
      id: "carr1",
      denominacion: "Ingeniería Informática",
      escuelaId: "esc1",
      createdAt: new Date().toString(),
      updatedAt: new Date().toString()
    };
    prisma.carrera.create.mockResolvedValue(nuevaCarrera);

    // Llamar al endpoint
    const req = mockRequest(carreraData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      message: "Carrera creada correctamente",
      carrera: nuevaCarrera
    });

    // Verificar que se verificó la escuela
    expect(prisma.escuela.findUnique).toHaveBeenCalledWith({
      where: { id: "esc1" }
    });

    // Verificar que se comprobó si ya existía la carrera
    expect(prisma.carrera.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [
          { denominacion: "Ingeniería Informática" },
          { escuelaId: "esc1" }
        ]
      }
    });

    // Verificar que se creó la carrera
    expect(prisma.carrera.create).toHaveBeenCalledWith({
      data: {
        denominacion: "Ingeniería Informática",
        escuelaId: "esc1"
      }
    });

    // Verificar que se creó la configuración de carrera
    expect(prisma.configuracionCarrera.create).toHaveBeenCalledWith({
      data: {
        SolDispensa: false,
        SolJustificacion: false,
        carreraId: "carr1"
      }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "create",
      entityType: "carrera",
      entityId: "carr1",
      details: expect.stringContaining("Creación manual de carrera 'Ingeniería Informática'")
    }));
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    const carreraData = {
      // Falta denominación
      escuelaId: "esc1"
    };

    // Llamar al endpoint
    const req = mockRequest(carreraData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Denominación y escuelaId son campos obligatorios" });
  });

  it("debe devolver 404 si la escuela no existe", async () => {
    const carreraData = {
      denominacion: "Ingeniería Informática",
      escuelaId: "esc_inexistente"
    };

    // Mock para escuela no encontrada
    prisma.escuela.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const req = mockRequest(carreraData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La escuela especificada no existe" });
  });

  it("debe devolver 409 si ya existe una carrera con la misma denominación en la misma escuela", async () => {
    const carreraData = {
      denominacion: "Ingeniería Informática",
      escuelaId: "esc1"
    };

    // Mock para la escuela
    prisma.escuela.findUnique.mockResolvedValue({
      id: "esc1",
      denominacion: "Escuela de Informática"
    });

    // Mock para carrera ya existente
    prisma.carrera.findFirst.mockResolvedValue({
      id: "carr1",
      denominacion: "Ingeniería Informática",
      escuelaId: "esc1"
    });

    // Llamar al endpoint
    const req = mockRequest(carreraData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: "Ya existe una carrera con esta denominación en la misma escuela" });
  });
});

describe("POST /api/carreras - Modo Automático", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request para modo automático (cuerpo vacío o error al parsear JSON)
  const mockEmptyRequest = () => ({
    json: jest.fn().mockRejectedValue(new Error("Error al parsear JSON vacío")),
    nextUrl: {
      origin: "http://localhost:3000"
    }
  });

  it("debe devolver 404 si no hay datos en OfertaAcademica", async () => {
    // Mock para OfertaAcademica sin datos
    prisma.ofertaAcademica.count.mockResolvedValue(0);

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "No hay datos en la tabla OfertaAcademica para importar" });
  });

  it("debe importar carreras automáticamente desde OfertaAcademica", async () => {
    // Mock para verificar que hay datos en OfertaAcademica
    prisma.ofertaAcademica.count.mockResolvedValue(10);

    // Mock para las ofertas académicas con CARRERAS
    prisma.ofertaAcademica.findMany.mockResolvedValue([
      {
        CARRERAS: "Ingeniería Informática GIN21",
        DENOMINACION: "Escuela de Informática"
      }
    ]);

    // Mock para fetch
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        escuela: {
          id: "esc1",
          denominacion: "Escuela de Informática"
        }
      })
    };
    fetch.mockResolvedValue(mockResponse);

    // Mock para verificar si la carrera ya existe
    prisma.carrera.findFirst.mockResolvedValue(null);

    // Mock para crear la carrera
    prisma.carrera.create.mockResolvedValue({
      id: "carr1",
      denominacion: "Ingeniería Informática",
      escuelaId: "esc1"
    });

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({
      message: "Proceso de importación de carreras completado",
      resultado: expect.objectContaining({
        procesados: 1,
        creados: expect.objectContaining({
          carreras: 1
        })
      })
    }));

    // Verificar que se consultaron las ofertas académicas
    expect(prisma.ofertaAcademica.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        CARRERAS: {
          not: null
        }
      }
    }));

    // Verificar que se crearon entidades
    expect(prisma.carrera.create).toHaveBeenCalled();
    expect(prisma.configuracionCarrera.create).toHaveBeenCalled();
    expect(prisma.planDeEstudios.create).toHaveBeenCalled();
  });

  it("debe manejar errores durante la importación automática", async () => {
    // Mock para verificar que hay datos en OfertaAcademica
    prisma.ofertaAcademica.count.mockResolvedValue(10);

    // Mock para error en la consulta
    prisma.ofertaAcademica.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al procesar la solicitud" });
  });
});
