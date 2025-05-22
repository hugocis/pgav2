/**
 * @jest-environment node
 */

import { GET } from "@/app/api/(pec)/alumnos-asistencia/route";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";

// Mocks
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    pecCarreraCurso: {
      findFirst: jest.fn()
    },
    alumnoPlan: {
      findMany: jest.fn()
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

jest.mock("xlsx", () => ({
  utils: {
    json_to_sheet: jest.fn().mockReturnValue({}),
    book_new: jest.fn().mockReturnValue({}),
    book_append_sheet: jest.fn()
  },
  write: jest.fn().mockReturnValue(Buffer.from("mock-excel-data"))
}));

describe("GET /api/(pec)/alumnos-asistencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(pec)/alumnos-asistencia");
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    return {
      nextUrl: url
    };
  };

  it("debe devolver 401 si no hay sesión de usuario", async () => {
    // Mock para getServerSession que devuelve null
    getServerSession.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const req = mockRequest({ carreraCursoId: "cc1" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autenticado" });
  });

  it("debe devolver 403 si el usuario no tiene rol PEC", async () => {
    // Mock para getServerSession que devuelve una sesión sin rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "user1",
        roles: ["Alumno", "Profesor"] // No tiene PEC
      }
    });

    // Llamar al endpoint
    const req = mockRequest({ carreraCursoId: "cc1" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe devolver 400 si falta el parámetro carreraCursoId", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Llamar al endpoint sin carreraCursoId
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Se requiere el ID de carrera-curso" });
  });

  it("debe devolver 403 si el PEC no tiene acceso a la carrera-curso", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock para carreraCurso no encontrado
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(null);

    // Llamar al endpoint
    const req = mockRequest({ carreraCursoId: "cc1" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No tienes acceso a esta carrera-curso" });
  });

  it("debe obtener los alumnos con sus datos de asistencia correctamente", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock para carreraCurso encontrado
    const mockCarreraCurso = {
      id: "cc1",
      carreraId: "carr1",
      curso: 1,
      pecId: "pec1",
      carrera: {
        id: "carr1",
        denominacion: "Ingeniería Informática"
      }
    };
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(mockCarreraCurso);

    // Mock para alumnos encontrados en planes de estudio
    const mockAlumnosPlanes = [
      { alumno_id: "alumno1", user: { id: "alumno1", name: "Alumno 1" } },
      { alumno_id: "alumno2", user: { id: "alumno2", name: "Alumno 2" } }
    ];
    prisma.alumnoPlan.findMany.mockResolvedValue(mockAlumnosPlanes);

    // Mock para el total de alumnos
    prisma.user.count.mockResolvedValue(2);

    // Mock para los usuarios con sus datos completos
    const mockAlumnos = [
      {
        id: "alumno1",
        name: "Alumno 1",
        surname1: "Apellido1",
        surname2: "Apellido2",
        email: "alumno1@example.com",
        userRoles: [
          { role: { id: "role1", name: "Alumno" } },
          { role: { id: "role3", name: "GOE" } }
        ],
        AsistenciaAlumno: [
          {
            fecha: new Date("2023-05-20"),
            estadoAsistencia: { id: "ea1", codigo: "P", denominacion: "Presente" },
            sesionClase: { id: "sc1", fecha: new Date("2023-05-20") }
          },
          {
            fecha: new Date("2023-05-19"),
            estadoAsistencia: { id: "ea1", codigo: "P", denominacion: "Presente" },
            sesionClase: { id: "sc2", fecha: new Date("2023-05-19") }
          }
        ]
      },
      {
        id: "alumno2",
        name: "Alumno 2",
        surname1: "López",
        surname2: "Gómez",
        email: "alumno2@example.com",
        userRoles: [
          { role: { id: "role1", name: "Alumno" } }
        ],
        AsistenciaAlumno: [
          {
            fecha: new Date("2023-05-20"),
            estadoAsistencia: { id: "ea2", codigo: "F", denominacion: "Falta" },
            sesionClase: { id: "sc1", fecha: new Date("2023-05-20") }
          },
          {
            fecha: new Date("2023-05-19"),
            estadoAsistencia: { id: "ea1", codigo: "P", denominacion: "Presente" },
            sesionClase: { id: "sc2", fecha: new Date("2023-05-19") }
          }
        ]
      }
    ];
    prisma.user.findMany.mockResolvedValue(mockAlumnos);

    // Llamar al endpoint
    const req = mockRequest({
      carreraCursoId: "cc1",
      page: "1",
      pageSize: "10"
    });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();    // Verificar la estructura de la respuesta
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toEqual({
      total: 2,
      totalPages: 1,
      page: 1,
      pageSize: 10
    });    // Verificar que los alumnos tienen los campos calculados
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toHaveProperty('asistencia');
    expect(body.data[0]).toHaveProperty('faltas');
    expect(body.data[0]).toHaveProperty('goe', true); // Este alumno es GOE
    expect(body.data[1]).toHaveProperty('goe', false); // Este alumno no es GOE
  });

  it("debe filtrar alumnos por término de búsqueda", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock para carreraCurso encontrado
    const mockCarreraCurso = {
      id: "cc1",
      carreraId: "carr1",
      curso: 1,
      pecId: "pec1",
      carrera: {
        id: "carr1",
        denominacion: "Ingeniería Informática"
      }
    };
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(mockCarreraCurso);

    // Mock para alumnos encontrados en planes de estudio
    const mockAlumnosPlanes = [
      { alumno_id: "alumno1", user: { id: "alumno1", name: "Alumno 1" } },
      { alumno_id: "alumno2", user: { id: "alumno2", name: "Alumno 2" } }
    ];
    prisma.alumnoPlan.findMany.mockResolvedValue(mockAlumnosPlanes);

    // Mock para el total de alumnos
    prisma.user.count.mockResolvedValue(2);

    // Mock para los usuarios con sus datos completos
    prisma.user.findMany.mockResolvedValue([]);

    // Llamar al endpoint con término de búsqueda
    const req = mockRequest({
      carreraCursoId: "cc1",
      search: "López"
    });
    await GET(req);

    // Verificar que se construyó la condición de búsqueda correctamente
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {
            id: {
              in: ["alumno1", "alumno2"]
            }
          },
          {
            OR: [
              { name: { contains: "López" } },
              { surname1: { contains: "López" } },
              { surname2: { contains: "López" } },
              { email: { contains: "López" } }
            ]
          }
        ]
      },
      skip: 0, // No aplicar skip en búsquedas
      take: undefined // No limitar resultados en búsquedas
    }));
  });

  it("debe generar un archivo Excel cuando se solicita exportación", async () => {
    // Mock para getServerSession que devuelve una sesión con rol PEC
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "pec1",
        roles: ["PEC"]
      }
    });

    // Mock para carreraCurso encontrado
    const mockCarreraCurso = {
      id: "cc1",
      carreraId: "carr1",
      curso: 1,
      pecId: "pec1",
      carrera: {
        id: "carr1",
        denominacion: "Ingeniería Informática"
      }
    };
    prisma.pecCarreraCurso.findFirst.mockResolvedValue(mockCarreraCurso);

    // Mock para alumnos encontrados en planes de estudio
    const mockAlumnosPlanes = [
      { alumno_id: "alumno1", user: { id: "alumno1", name: "Alumno 1" } }
    ];
    prisma.alumnoPlan.findMany.mockResolvedValue(mockAlumnosPlanes);

    // Mock para el total de alumnos
    prisma.user.count.mockResolvedValue(1);

    // Mock para los usuarios con sus datos completos
    const mockAlumnos = [
      {
        id: "alumno1",
        name: "Alumno 1",
        surname1: "Apellido1",
        surname2: "Apellido2",
        email: "alumno1@example.com",
        userRoles: [
          { role: { id: "role1", name: "Alumno" } }
        ],
        AsistenciaAlumno: []
      }
    ];
    prisma.user.findMany.mockResolvedValue(mockAlumnos);

    // Llamar al endpoint con solicitud de exportación
    const req = mockRequest({
      carreraCursoId: "cc1",
      export: "excel"
    });
    const response = await GET(req);

    // Verificar que la respuesta es un archivo Excel
    expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="alumnos-asistencia');
  });
});