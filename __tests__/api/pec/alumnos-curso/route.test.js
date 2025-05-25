/**
 * @jest-environment node
 */

import { GET } from "@/app/api/(pec)/alumnos-curso/route";
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
      findUnique: jest.fn()
    },
    asignatura: {
      findMany: jest.fn()
    },
    matricula: {
      findMany: jest.fn()
    },
    user: {
      findMany: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn().mockResolvedValue(true)
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(pec)/alumnos-curso", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(pec)/alumnos-curso");
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    return {
      url,
      nextUrl: url
    };
  };

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 403 si el usuario no tiene los permisos necesarios", async () => {
    // Mock para getServerSession con roles insuficientes
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Profesor", "Alumno"] // No tiene PEC ni ADMIN
      }
    });

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({
      error: "No autorizado",
      roles: ["Profesor", "Alumno"],
      requiredRoles: ["PEC", "ADMIN"]
    });
  });

  it("debe devolver 400 si falta el parámetro carreraCursoId", async () => {
    // Mock para getServerSession con roles suficientes
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["PEC"]
      }
    });

    // Llamar al endpoint sin carreraCursoId
    const response = await GET(mockRequest());

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ error: "Se requiere el ID de carrera-curso" });
  });

  it("debe devolver 404 si el carrera-curso no existe", async () => {
    // Mock para getServerSession con roles suficientes
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["PEC"]
      }
    });

    // Mock para pecCarreraCurso.findUnique que devuelve null
    prisma.pecCarreraCurso.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc_inexistente" }));

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Carrera-curso no encontrado" });
  });

  it("debe devolver 403 si el PEC no está asignado a este carrera-curso", async () => {
    // Mock para getServerSession con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1", // Este PEC no es el asignado a la carrera-curso
        roles: ["PEC"]
      }
    });

    // Mock para pecCarreraCurso.findUnique
    prisma.pecCarreraCurso.findUnique.mockResolvedValueOnce({
      id: "cc1",
      carreraId: "carrera1",
      curso: 1,
      pecId: "pec2", // El PEC asignado es otro
      carrera: {
        id: "carrera1",
        denominacion: "Ingeniería Informática"
      }
    });

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({ error: "No autorizado para esta carrera-curso" });
  });

  it("debe devolver una lista vacía si no hay asignaturas para la carrera-curso", async () => {
    // Mock para getServerSession con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock para pecCarreraCurso.findUnique
    prisma.pecCarreraCurso.findUnique.mockResolvedValueOnce({
      id: "cc1",
      carreraId: "carrera1",
      curso: 1,
      pecId: "pec1",
      carrera: {
        id: "carrera1",
        denominacion: "Ingeniería Informática"
      }
    });

    // Mock para asignatura.findMany que devuelve una lista vacía
    prisma.asignatura.findMany.mockResolvedValueOnce([]);

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
    
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: {
        carreraId: "carrera1",
        Curso: "1"
      }
    });
  });

  it("debe devolver la lista de alumnos correctamente para un PEC asignado", async () => {
    // Mock para getServerSession con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1", // Este PEC es el asignado a la carrera-curso
        roles: ["PEC"]
      }
    });

    // Mock para pecCarreraCurso.findUnique
    prisma.pecCarreraCurso.findUnique.mockResolvedValueOnce({
      id: "cc1",
      carreraId: "carrera1",
      curso: 1,
      pecId: "pec1", // El mismo PEC que está haciendo la petición
      carrera: {
        id: "carrera1",
        denominacion: "Ingeniería Informática"
      }
    });

    // Mock para asignatura.findMany
    prisma.asignatura.findMany.mockResolvedValueOnce([
      { id: "asig1", nombre: "Programación", carreraId: "carrera1", Curso: "1" },
      { id: "asig2", nombre: "Matemáticas", carreraId: "carrera1", Curso: "1" }
    ]);

    // Mock para matricula.findMany
    prisma.matricula.findMany.mockResolvedValueOnce([
      { alumno_id: "alumno1" },
      { alumno_id: "alumno2" },
    ]);

    // Mock para user.findMany
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: "alumno1",
        name: "Juan",
        surname1: "Pérez",
        surname2: "García",
        email: "juan.perez@example.com",
        userRoles: [
          { role: { name: "Alumno" } },
          { role: { name: "GOE" } } // Este tiene rol GOE
        ]
      },
      {
        id: "alumno2",
        name: "María",
        surname1: "López",
        surname2: "Martínez",
        email: "maria.lopez@example.com",
        userRoles: [
          { role: { name: "Alumno" } } // Este no tiene rol GOE
        ]
      }
    ]);

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("alumno1");
    expect(data[0].tieneRolGOE).toBe(true);
    expect(data[1].id).toBe("alumno2");
    expect(data[1].tieneRolGOE).toBe(false);
    
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: {
        carreraId: "carrera1",
        Curso: "1"
      }
    });
    
    expect(prisma.matricula.findMany).toHaveBeenCalledWith({
      where: {
        asignaturaId: {
          in: ["asig1", "asig2"]
        }
      },
      select: {
        alumno_id: true
      },
      distinct: ['alumno_id']
    });
    
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["alumno1", "alumno2"] },
        userRoles: {
          some: {
            role: {
              name: 'Alumno'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        surname1: true,
        surname2: true,
        email: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: [
        { surname1: 'asc' },
        { surname2: 'asc' },
        { name: 'asc' }
      ]
    });
    
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      entityType: 'PEC_ALUMNOS_CURSO',
      entityId: 'cc1',
      details: 'El PEC ha consultado la lista de alumnos para Ingeniería Informática - 1° curso'
    }));
  });

  it("debe devolver la lista de alumnos correctamente para un ADMIN", async () => {
    // Mock para getServerSession con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Mock para pecCarreraCurso.findUnique
    prisma.pecCarreraCurso.findUnique.mockResolvedValueOnce({
      id: "cc1",
      carreraId: "carrera1",
      curso: 1,
      pecId: "pec1", // El ADMIN puede acceder aunque no sea el PEC asignado
      carrera: {
        id: "carrera1",
        denominacion: "Ingeniería Informática"
      }
    });

    // Mock para asignatura.findMany
    prisma.asignatura.findMany.mockResolvedValueOnce([
      { id: "asig1", nombre: "Programación", carreraId: "carrera1", Curso: "1" }
    ]);

    // Mock para matricula.findMany
    prisma.matricula.findMany.mockResolvedValueOnce([
      { alumno_id: "alumno1" }
    ]);

    // Mock para user.findMany
    prisma.user.findMany.mockResolvedValueOnce([
      {
        id: "alumno1",
        name: "Juan",
        surname1: "Pérez",
        surname2: "García",
        email: "juan.perez@example.com",
        userRoles: [
          { role: { name: "Alumno" } }
        ]
      }
    ]);

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  it("debe manejar errores internos", async () => {
    // Mock para getServerSession con rol ADMIN
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["ADMIN"]
      }
    });

    // Forzar un error en pecCarreraCurso.findUnique
    prisma.pecCarreraCurso.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET(mockRequest({ carreraCursoId: "cc1" }));

    // Verificar la respuesta
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Error al obtener los datos" });
  });
});