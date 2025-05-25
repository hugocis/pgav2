/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/asignaturas/route";
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
    asignatura: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    carrera: {
      findUnique: jest.fn()
    },
    cursoAcademico: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    managerCarrera: {
      findMany: jest.fn()
    }
  }
}));

jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {}
}));

describe("GET /api/(admin)/asignaturas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(admin)/asignaturas");
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
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "No autorizado" });
  });

  it("debe obtener todas las asignaturas para un administrador sin filtros", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para asignaturas
    const mockAsignaturas = [
      {
        id: "asig1",
        CodAsignatura: "MAT101",
        Denominacion: "Matemáticas",
        Curso: 1,
        Cuatrimestre: 1,
        carreraId: "carr1",
        cursoAcademicoId: "ca1",
        profesorId: "prof1",
        carrera: { id: "carr1", denominacion: "Ingeniería Informática" },
        cursoAcademico: { id: "ca1", anyAnyaca: "2024-25" },
        user: {
          id: "prof1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        }
      },
      {
        id: "asig2",
        CodAsignatura: "FIS101",
        Denominacion: "Física",
        Curso: 1,
        Cuatrimestre: 2,
        carreraId: "carr2",
        cursoAcademicoId: "ca1",
        profesorId: "prof2",
        carrera: { id: "carr2", denominacion: "Ingeniería Electrónica" },
        cursoAcademico: { id: "ca1", anyAnyaca: "2024-25" },
        user: {
          id: "prof2",
          name: "Ana",
          surname1: "García",
          surname2: "López",
          email: "ana.garcia@example.com"
        }
      }
    ];

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue(mockAsignaturas);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockAsignaturas);

    // Verificar que se consultó sin filtros específicos
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        carrera: true,
        cursoAcademico: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        }
      },
      orderBy: [
        { Curso: 'asc' },
        { Denominacion: 'asc' },
      ],
    });
  });

  it("debe filtrar asignaturas por carreraId", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por carreraId
    const req = mockRequest({ carreraId: "carr1" });
    const response = await GET(req);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: { carreraId: "carr1" },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe filtrar asignaturas por cursoAcademicoId", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por cursoAcademicoId
    const req = mockRequest({ cursoAcademicoId: "ca1" });
    const response = await GET(req);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: { cursoAcademicoId: "ca1" },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe filtrar asignaturas por profesorId", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por profesorId
    const req = mockRequest({ profesorId: "prof1" });
    const response = await GET(req);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: { profesorId: "prof1" },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe filtrar asignaturas por curso", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por curso
    const req = mockRequest({ curso: "1" });
    const response = await GET(req);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: { Curso: "1" },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe filtrar asignaturas por codAsignatura", async () => {
    // Mock para getServerSession que devuelve una sesión de administrador
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "admin1",
        roles: ["Admin"]
      }
    });

    // Mock para la consulta
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por codAsignatura
    const req = mockRequest({ codAsignatura: "MAT101" });
    const response = await GET(req);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: { CodAsignatura: "MAT101" },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe filtrar asignaturas por las carreras asignadas al manager", async () => {
    // Mock para getServerSession que devuelve una sesión de manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para las carreras asignadas al manager
    const managerCarreras = [
      { carreraId: "carr1" },
      { carreraId: "carr2" }
    ];
    prisma.managerCarrera.findMany.mockResolvedValue(managerCarreras);

    // Mock para la consulta de asignaturas
    prisma.asignatura.findMany.mockResolvedValue([]);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

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

    // Verificar que se consultó con el filtro de carreraId en las carreras asignadas
    expect(prisma.asignatura.findMany).toHaveBeenCalledWith({
      where: {
        carreraId: {
          in: ["carr1", "carr2"]
        }
      },
      include: expect.any(Object),
      orderBy: expect.any(Array)
    });
  });

  it("debe devolver 403 si un manager intenta acceder a una carrera no asignada", async () => {
    // Mock para getServerSession que devuelve una sesión de manager
    getServerSession.mockResolvedValueOnce({
      user: {
        id: "manager1",
        roles: ["Manager"]
      }
    });

    // Mock para las carreras asignadas al manager
    const managerCarreras = [
      { carreraId: "carr1" },
      { carreraId: "carr2" }
    ];
    prisma.managerCarrera.findMany.mockResolvedValue(managerCarreras);

    // Llamar al endpoint con carreraId no asignado al manager
    const req = mockRequest({ carreraId: "carr3" });
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "No tienes acceso a esta carrera" });
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
    prisma.asignatura.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener asignaturas" });
  });
});

describe("POST /api/(admin)/asignaturas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    // Mock request con datos incompletos (falta Curso)
    const req = mockRequest({
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Todos los campos son obligatorios" });
  });

  it("debe devolver 400 si la carrera no existe", async () => {
    // Mock request con datos completos
    const req = mockRequest({
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr_inexistente",
      cursoAcademicoId: "ca1",
      profesorId: "prof1"
    });

    // Mock para carrera no encontrada
    prisma.carrera.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La carrera especificada no existe" });
  });

  it("debe devolver 400 si el curso académico no existe", async () => {
    // Mock request con datos completos
    const req = mockRequest({
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca_inexistente",
      profesorId: "prof1"
    });

    // Mock para carrera encontrada
    prisma.carrera.findUnique.mockResolvedValue({ id: "carr1", denominacion: "Ingeniería Informática" });

    // Mock para curso académico no encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El curso académico especificado no existe" });
  });

  it("debe devolver 400 si el profesor no existe", async () => {
    // Mock request con datos completos
    const req = mockRequest({
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca1",
      profesorId: "prof_inexistente"
    });

    // Mock para carrera encontrada
    prisma.carrera.findUnique.mockResolvedValue({ id: "carr1", denominacion: "Ingeniería Informática" });

    // Mock para curso académico encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue({ id: "ca1", anyAnyaca: "2024-25" });

    // Mock para profesor no encontrado
    prisma.user.findUnique.mockResolvedValue(null);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El profesor especificado no existe" });
  });

  it("debe devolver 400 si el usuario no es un profesor", async () => {
    // Mock request con datos completos
    const req = mockRequest({
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca1",
      profesorId: "user1"
    });

    // Mock para carrera encontrada
    prisma.carrera.findUnique.mockResolvedValue({ id: "carr1", denominacion: "Ingeniería Informática" });

    // Mock para curso académico encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue({ id: "ca1", anyAnyaca: "2024-25" });

    // Mock para usuario encontrado pero sin rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "user1",
      name: "Usuario",
      userRoles: [
        { roleId: 1 },
        { roleId: 3 }
      ]
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El usuario especificado no es un profesor" });
  });

  it("debe crear una nueva asignatura correctamente", async () => {
    // Datos para la asignatura
    const asignaturaData = {
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca1",
      profesorId: "prof1"
    };

    // Mock request con datos completos
    const req = mockRequest(asignaturaData);

    // Mock para carrera encontrada
    prisma.carrera.findUnique.mockResolvedValue({ id: "carr1", denominacion: "Ingeniería Informática" });

    // Mock para curso académico encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue({ id: "ca1", anyAnyaca: "2024-25" });

    // Mock para profesor encontrado con rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      name: "Juan",
      userRoles: [
        { roleId: 2 } // Rol de profesor
      ]
    });    // Mock para la creación exitosa
    const createdDate = new Date();
    const nuevaAsignatura = {
      id: "asig1",
      ...asignaturaData,
      createdAt: createdDate.toISOString(),
      updatedAt: createdDate.toISOString()
    };
    prisma.asignatura.create.mockResolvedValue(nuevaAsignatura);

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevaAsignatura);

    // Verificar que se creó con los datos correctos
    expect(prisma.asignatura.create).toHaveBeenCalledWith({
      data: asignaturaData
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'asignatura',
      entityId: "asig1"
    }));
  });

  it("debe manejar errores durante la creación", async () => {
    // Datos para la asignatura
    const asignaturaData = {
      CodAsignatura: "MAT101",
      Denominacion: "Matemáticas",
      Curso: 1,
      Cuatrimestre: 1,
      carreraId: "carr1",
      cursoAcademicoId: "ca1",
      profesorId: "prof1"
    };

    // Mock request con datos completos
    const req = mockRequest(asignaturaData);

    // Mock para carrera encontrada
    prisma.carrera.findUnique.mockResolvedValue({ id: "carr1", denominacion: "Ingeniería Informática" });

    // Mock para curso académico encontrado
    prisma.cursoAcademico.findUnique.mockResolvedValue({ id: "ca1", anyAnyaca: "2024-25" });

    // Mock para profesor encontrado con rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      name: "Juan",
      userRoles: [
        { roleId: 2 } // Rol de profesor
      ]
    });

    // Mock para simular un error en la creación
    prisma.asignatura.create.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear la asignatura" });
  });
});