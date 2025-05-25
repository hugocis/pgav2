/**
 * @jest-environment node
 */

import { GET, POST, PUT } from "@/app/api/(admin)/docencia/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    docencia: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn()
    },
    asignatura: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn(),
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

describe("GET /api/(admin)/docencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/(admin)/docencia");
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    return {
      nextUrl: url
    };
  };

  it("debe obtener todas las docencias sin filtros", async () => {
    // Mock para la respuesta de la consulta
    const mockDocencias = [
      {
        id: "1",
        asignaturaId: "asig1",
        profesorId: "prof1",
        mostrar: true,
        asignatura: { 
          id: "asig1", 
          nombre: "Matemáticas",
          carrera: { id: "carr1", denominacion: "Ingeniería" },
          cursoAcademico: { id: "ca1", anyAnyaca: "2024-25" }
        },
        user: {
          id: "prof1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        }
      }
    ];

    prisma.docencia.findMany.mockResolvedValue(mockDocencias);

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockDocencias);

    // Verificar que se consultó sin filtros
    expect(prisma.docencia.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        asignatura: {
          include: {
            carrera: true,
            cursoAcademico: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        }
      }
    });
  });

  it("debe obtener docencias filtradas por asignaturaId", async () => {
    // Mock para la respuesta de la consulta
    const mockDocencias = [
      {
        id: "1",
        asignaturaId: "asig1",
        profesorId: "prof1",
        mostrar: true,
        asignatura: { 
          id: "asig1", 
          nombre: "Matemáticas",
          carrera: { id: "carr1", denominacion: "Ingeniería" },
          cursoAcademico: { id: "ca1", anyAnyaca: "2024-25" }
        },
        user: {
          id: "prof1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        }
      }
    ];

    prisma.docencia.findMany.mockResolvedValue(mockDocencias);

    // Llamar al endpoint con filtro por asignaturaId
    const req = mockRequest({ asignaturaId: "asig1" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockDocencias);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.docencia.findMany).toHaveBeenCalledWith({
      where: { asignaturaId: "asig1" },
      include: expect.any(Object)
    });
  });

  it("debe obtener docencias filtradas por profesorId", async () => {
    // Mock para la respuesta de la consulta
    prisma.docencia.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por profesorId
    const req = mockRequest({ profesorId: "prof1" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.docencia.findMany).toHaveBeenCalledWith({
      where: { profesorId: "prof1" },
      include: expect.any(Object)
    });
  });

  it("debe obtener docencias filtradas por mostrar", async () => {
    // Mock para la respuesta de la consulta
    prisma.docencia.findMany.mockResolvedValue([]);

    // Llamar al endpoint con filtro por mostrar
    const req = mockRequest({ mostrar: "true" });
    const response = await GET(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);

    // Verificar que se consultó con el filtro correcto
    expect(prisma.docencia.findMany).toHaveBeenCalledWith({
      where: { mostrar: true },
      include: expect.any(Object)
    });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para simular un error
    prisma.docencia.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest();
    const response = await GET(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener docencias" });
  });
});

describe("POST /api/(admin)/docencia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    // Mock request con datos incompletos (falta profesorId)
    const req = mockRequest({
      asignaturaId: "asig1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Asignatura y profesor son campos obligatorios" });

    // Verificar que no se creó ninguna docencia
    expect(prisma.docencia.create).not.toHaveBeenCalled();
  });

  it("debe devolver 400 si la asignatura no existe", async () => {
    // Mock para findUnique que devuelve null (asignatura no encontrada)
    prisma.asignatura.findUnique.mockResolvedValue(null);

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La asignatura especificada no existe" });

    // Verificar que se consultó la asignatura
    expect(prisma.asignatura.findUnique).toHaveBeenCalledWith({
      where: { id: "asig1" }
    });
  });

  it("debe devolver 400 si el profesor no existe", async () => {
    // Mock para asignatura encontrada
    prisma.asignatura.findUnique.mockResolvedValue({ id: "asig1", nombre: "Matemáticas" });
    
    // Mock para profesor no encontrado
    prisma.user.findUnique.mockResolvedValue(null);

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El profesor especificado no existe" });

    // Verificar que se consultó el profesor
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "prof1" },
      include: { userRoles: true }
    });
  });

  it("debe devolver 400 si el usuario no tiene el rol de profesor", async () => {
    // Mock para asignatura encontrada
    prisma.asignatura.findUnique.mockResolvedValue({ id: "asig1", nombre: "Matemáticas" });
    
    // Mock para profesor encontrado pero sin rol de profesor (roleId != 2)
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      userRoles: [{ roleId: 1 }] // No tiene el rol 2 (profesor)
    });

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El usuario especificado no tiene el rol de profesor" });
  });

  it("debe devolver 400 si ya existe una docencia para la misma asignatura y profesor", async () => {
    // Mock para asignatura encontrada
    prisma.asignatura.findUnique.mockResolvedValue({ id: "asig1", nombre: "Matemáticas" });
    
    // Mock para profesor encontrado con rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      userRoles: [{ roleId: 2 }] // Tiene el rol de profesor
    });

    // Mock para docencia existente
    prisma.docencia.findFirst.mockResolvedValue({
      id: "doc1",
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Ya existe una docencia para esta asignatura y profesor" });

    // Verificar que se consultó si ya existía la docencia
    expect(prisma.docencia.findFirst).toHaveBeenCalledWith({
      where: {
        asignaturaId: "asig1",
        profesorId: "prof1"
      }
    });
  });

  it("debe crear una nueva docencia y devolver 201", async () => {
    // Mock para asignatura encontrada
    prisma.asignatura.findUnique.mockResolvedValue({ id: "asig1", nombre: "Matemáticas" });
    
    // Mock para profesor encontrado con rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      userRoles: [{ roleId: 2 }] // Tiene el rol de profesor
    });

    // Mock para docencia no existente
    prisma.docencia.findFirst.mockResolvedValue(null);

    // Mock para la creación exitosa de docencia
    const nuevaDocencia = {
      id: "doc1",
      asignaturaId: "asig1",
      profesorId: "prof1",
      mostrar: true,
      asignatura: { nombre: "Matemáticas" },
      user: {
        id: "prof1",
        name: "Juan",
        surname1: "Pérez",
        surname2: "García",
        email: "juan.perez@example.com"
      }
    };
    prisma.docencia.create.mockResolvedValue(nuevaDocencia);

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1",
      mostrar: true
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevaDocencia);

    // Verificar que se creó la docencia con los datos correctos
    expect(prisma.docencia.create).toHaveBeenCalledWith({
      data: {
        asignaturaId: "asig1",
        profesorId: "prof1",
        mostrar: true
      },
      include: expect.any(Object)
    });

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      action: 'create',
      entityType: 'docencia',
      entityId: "doc1"
    }));
  });

  it("debe manejar errores durante la creación", async () => {
    // Mock para asignatura encontrada
    prisma.asignatura.findUnique.mockResolvedValue({ id: "asig1", nombre: "Matemáticas" });
    
    // Mock para profesor encontrado con rol de profesor
    prisma.user.findUnique.mockResolvedValue({
      id: "prof1",
      userRoles: [{ roleId: 2 }] // Tiene el rol de profesor
    });

    // Mock para docencia no existente
    prisma.docencia.findFirst.mockResolvedValue(null);

    // Mock para simular un error en la creación
    prisma.docencia.create.mockRejectedValue(new Error("Error de base de datos"));

    // Mock request
    const req = mockRequest({
      asignaturaId: "asig1",
      profesorId: "prof1"
    });

    // Llamar al endpoint
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear docencia" });
  });
});