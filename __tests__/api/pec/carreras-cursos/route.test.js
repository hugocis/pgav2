/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(pec)/carreras-cursos/route";
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
    pecCarreraCurso: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    carrera: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(pec)/carreras-cursos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(pec)/carreras-cursos");
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

  it("debe devolver 403 si el usuario no tiene los permisos necesarios", async () => {
    // Mock para getServerSession que devuelve una sesión con rol inválido
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno", "Profesor"] // No tiene PEC ni ADMIN
      }
    });

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: "No autorizado",
      roles: ["Alumno", "Profesor"],
      requiredRoles: ["PEC", "ADMIN"]
    });
  });

  it("debe obtener las carreras y cursos asignados al PEC autenticado", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });    // Mock para las asignaciones de carreras-cursos
    const mockAsignaciones = [
      {
        id: "asig1",
        pecId: "pec1",
        carreraId: "carr1",
        curso: 1,
        activo: true,
        createdAt: "2025-05-22T20:30:42.782Z",
        updatedAt: "2025-05-22T20:30:42.782Z",
        carrera: {
          id: "carr1",
          denominacion: "Ingeniería Informática",
          codigo: "INFO"
        }
      },
      {
        id: "asig2",
        pecId: "pec1",
        carreraId: "carr2",
        curso: 2,
        activo: true,
        createdAt: "2025-05-22T20:30:42.782Z",
        updatedAt: "2025-05-22T20:30:42.782Z",
        carrera: {
          id: "carr2",
          denominacion: "Arquitectura",
          codigo: "ARQ"
        }
      }
    ];

    // Mock para la consulta de asignaciones
    prisma.pecCarreraCurso.findMany.mockResolvedValue(mockAsignaciones);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockAsignaciones);

    // Verificar que se consultó con el filtrado correcto
    expect(prisma.pecCarreraCurso.findMany).toHaveBeenCalledWith({
      where: {
        pecId: "pec1",
      },
      include: {
        carrera: true,
      },
      orderBy: [
        { carrera: { denominacion: 'asc' } },
        { curso: 'asc' },
      ],
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      entityType: 'PEC_ASIGNACIONES',
      entityId: "pec1",
    }));
  });

  it("debe permitir a un ADMIN consultar asignaciones de otro PEC", async () => {
    // Mock para getServerSession que devuelve una sesión de ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock para las asignaciones de carreras-cursos
    const mockAsignaciones = [
      {
        id: "asig1",
        pecId: "pec2",
        carreraId: "carr1",
        curso: 1,
        activo: true,
        carrera: {
          id: "carr1",
          denominacion: "Ingeniería Informática",
        }
      }
    ];

    // Mock para la consulta de asignaciones
    prisma.pecCarreraCurso.findMany.mockResolvedValue(mockAsignaciones);

    // Llamar al endpoint con pecId específico
    const req = mockRequest({ pecId: "pec2" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockAsignaciones);

    // Verificar que se consultó con el pecId del parámetro
    expect(prisma.pecCarreraCurso.findMany).toHaveBeenCalledWith({
      where: {
        pecId: "pec2",
      },
      include: {
        carrera: true,
      },
      orderBy: expect.any(Array)
    });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para getServerSession que devuelve una sesión válida
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock para simular un error
    prisma.pecCarreraCurso.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener los datos" });
  });
});

describe("POST /api/(pec)/carreras-cursos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    url: "http://localhost:3000/api/(pec)/carreras-cursos"
  });

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Mock request
    const req = mockRequest({
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 403 si el usuario no tiene el rol ADMIN", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC (no ADMIN)
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock request
    const req = mockRequest({
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: "No autorizado",
      roles: ["PEC"],
      requiredRoles: ["ADMIN"]
    });
  });

  it("debe devolver 400 si faltan datos requeridos", async () => {
    // Mock para getServerSession que devuelve una sesión con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock request con datos incompletos (falta curso)
    const req = mockRequest({
      pecId: "pec1",
      carreraId: "carr1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Faltan datos requeridos (pecId, carreraId, curso)" });
  });

  it("debe devolver 400 si ya existe una asignación activa", async () => {
    // Mock para getServerSession que devuelve una sesión con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock request
    const req = mockRequest({
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1
    });

    // Mock para asignación existente activa
    prisma.pecCarreraCurso.findFirst.mockResolvedValue({
      id: "asig1",
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1,
      activo: true
    });

    // Llamar al endpoint
    const response = await POST(req);
    // Verificar la respuesta
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "Ya existe una asignación activa para esta combinación de PEC, carrera y curso" 
    });
  });

  it("debe crear una nueva asignación de carrera y curso", async () => {
    // Mock para getServerSession que devuelve una sesión con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock request
    const requestData = {
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1
    };
    const req = mockRequest(requestData);

    // Mock para verificar que no existe asignación previa
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(null);

    // Mock para la carrera
    prisma.carrera.findUnique.mockResolvedValue({
      id: "carr1", 
      denominacion: "Ingeniería Informática"
    });

    // Mock para el usuario PEC
    prisma.user.findUnique.mockResolvedValue({
      id: "pec1", 
      name: "Juan", 
      surname1: "Pérez"
    });

    // Mock para la creación exitosa    
    const nuevaAsignacion = {
      id: "asig1",
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1,
      activo: true,
      createdAt: "2025-05-22T20:30:42.782Z",
      updatedAt: "2025-05-22T20:30:42.782Z"
    };
    prisma.pecCarreraCurso.create.mockResolvedValue(nuevaAsignacion);

    // Llamar al endpoint
    const response = await POST(req);
    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(nuevaAsignacion);

    // Verificar que se creó la asignación con los datos correctos
    expect(prisma.pecCarreraCurso.create).toHaveBeenCalledWith({
      data: {
        pecId: "pec1",
        carreraId: "carr1",
        curso: 1,
        activo: true
      }
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: "create",
      details: "Se ha creado una nueva asignación de carrera (carr1) y curso (1) para el PEC con ID pec1",
      entityId: "asig1",
      entityType: "PEC_ASIGNACIONES",
      req: {
        json: expect.any(Function),
        url: "http://localhost:3000/api/(pec)/carreras-cursos"
      }
    }));
  });

  it("debe manejar errores durante la creación", async () => {
    // Mock para getServerSession que devuelve una sesión con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock request
    const req = mockRequest({
      pecId: "pec1",
      carreraId: "carr1",
      curso: 1
    });

    // Mock para verificar que no existe asignación previa
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(null);

    // Mock para la carrera
    prisma.carrera.findUnique.mockResolvedValue({
      id: "carr1", 
      denominacion: "Ingeniería Informática"
    });

    // Mock para el usuario PEC
    prisma.user.findUnique.mockResolvedValue({
      id: "pec1", 
      name: "Juan", 
      surname1: "Pérez"
    });

    // Mock para simular un error en la creación
    prisma.pecCarreraCurso.create.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await POST(req);
    
    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al procesar la solicitud" });
  });
});