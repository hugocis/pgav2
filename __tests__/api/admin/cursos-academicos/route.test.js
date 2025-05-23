/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/cursos-academicos/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    cursoAcademico: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    ofertaAcademica: {
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

describe("GET /api/cursos-academicos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe obtener todos los cursos académicos ordenados por fecha de creación descendente", async () => {    // Mock para la respuesta de la consulta
    const mockCursosAcademicos = [
      { id: "ca2", anyAnyaca: "2024-25", createdAt: "2023-05-01T00:00:00.000Z" },
      { id: "ca1", anyAnyaca: "2023-24", createdAt: "2022-05-01T00:00:00.000Z" }
    ];

    prisma.cursoAcademico.findMany.mockResolvedValue(mockCursosAcademicos);

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(mockCursosAcademicos);

    // Verificar que se consultó con el ordenamiento correcto
    expect(prisma.cursoAcademico.findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it("debe manejar errores durante la consulta", async () => {
    // Mock para simular un error
    prisma.cursoAcademico.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const response = await GET();

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener los cursos académicos" });
  });
});

describe("POST /api/cursos-academicos - Modo Manual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request para modo manual
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body)
  });

  it("debe crear un nuevo curso académico con datos manuales", async () => {
    const cursoData = {
      denominacion: "2025-26",
      cursoAnteriorId: "ca2",
      cursoSiguienteId: null,
      activo: true
    };

    // Mock para validación de formato
    const mockCursoCreado = {
      id: "ca3",
      denominacion: "2025-26",
      cursoAnteriorId: "ca2",
      cursoSiguienteId: null,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // No existe curso con ese anyAnyaca
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce(null);
    
    // Mock curso anterior
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce({
      id: "ca2",
      denominacion: "2024-25",
      cursoAnteriorId: "ca1",
      cursoSiguienteId: null,
      activo: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Mock crear curso
    prisma.cursoAcademico.create.mockResolvedValue(mockCursoCreado);

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    // expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(mockCursoCreado);

    // Verificar que se comprobó si ya existía el curso
    expect(prisma.cursoAcademico.findUnique).toHaveBeenCalledWith({
      where: { anyAnyaca: cursoData.anyAnyaca }
    });

    // Verificar que se creó el curso con los datos correctos
    expect(prisma.cursoAcademico.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        anyAnyaca: cursoData.anyAnyaca,
        cursoAnteriorId: cursoData.cursoAnteriorId,
        activo: cursoData.activo
      })
    }));

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalled();
  });

  it("debe devolver 400 si el formato de anyAnyaca es inválido", async () => {
    const cursoData = {
      anyAnyaca: "2025/26", // Formato inválido
      denominacion: "2025-26",
      cursoAnteriorId: "ca1",
      activo: true
    };

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "Formato de año académico inválido. Debe ser YYYY-YY (por ejemplo: 2025-26)"
    });
  });
  
  it("debe devolver 400 si ya existe un curso con el mismo anyAnyaca", async () => {
    const cursoData = {
      anyAnyaca: "2024-25",
      denominacion: "2024-25",
      cursoAnteriorId: "ca1",
      activo: true
    };

    // Mock para curso ya existente
    prisma.cursoAcademico.findUnique.mockResolvedValue({
      id: "ca2",
      anyAnyaca: "2024-25"
    });

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "Ya existe un curso académico con el nombre 2024-25"
    });
  });
  
  it("debe devolver 400 si cursoAnteriorId no existe", async () => {
    const cursoData = {
      anyAnyaca: "2025-26",
      denominacion: "2025-26",
      cursoAnteriorId: "ca_inexistente",
      activo: true
    };

    // No existe curso con ese anyAnyaca
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce(null);
    
    // No existe el curso anterior
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "El curso anterior especificado no existe"
    });
  });
  
  it("debe manejar errores durante la creación manual", async () => {
    const cursoData = {
      anyAnyaca: "2025-26",
      denominacion: "2025-26",
      cursoAnteriorId: "ca1",
      activo: true
    };

    // No existe curso con ese anyAnyaca
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce(null);
    
    // Mock curso anterior existe
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce({
      id: "ca1",
      anyAnyaca: "2023-24"
    });
    
    // Mock error en la creación
    prisma.cursoAcademico.create.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear el curso académico" });
  });
});

describe("POST /api/cursos-academicos - Modo Automático", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock request para modo automático (cuerpo vacío o error al parsear JSON)
  const mockEmptyRequest = () => ({
    json: jest.fn().mockRejectedValue(new Error("Error al parsear JSON vacío"))
  });
  
  it("debe crear cursos académicos automáticamente desde OfertaAcademica", async () => {
    // Mock para encontrar años académicos en OfertaAcademica
    prisma.ofertaAcademica.findMany.mockResolvedValue([
      { ANY_ANYACA: "2023-24" },
      { ANY_ANYACA: "2024-25" },
      { ANY_ANYACA: "2025-26" }
    ]);

    // Mocks para la validación de cursos existentes
    // Para "2023-24"
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce({
      id: "ca1", 
      anyAnyaca: "2023-24"
    }); // Ya existe
    
    // Para "2024-25"
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce({
      id: "ca2", 
      anyAnyaca: "2024-25"
    }); // Ya existe
    
    // Para "2025-26"
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce(null); // No existe
    
    // Mock para la creación del curso 2025-26
    prisma.cursoAcademico.create.mockResolvedValueOnce({
      id: "ca3",
      anyAnyaca: "2025-26",
      cursoAnteriorId: "ca2",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Mock para buscar el curso anterior (2024-25)
    prisma.cursoAcademico.findUnique.mockResolvedValueOnce({
      id: "ca2",
      anyAnyaca: "2024-25",
      cursoAnteriorId: "ca1",
      cursoSiguienteId: null
    });

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    
    // Verificar que se procesaron 3 cursos
    expect(body.procesados).toBe(3);
    // Verificar que se creó 1 curso nuevo
    expect(body.creados).toBe(1);
    // Verificar que 2 cursos ya existían
    expect(body.yaExistentes.length).toBe(2);
    
    // Verificar que se consultaron los años académicos de OfertaAcademica
    expect(prisma.ofertaAcademica.findMany).toHaveBeenCalledWith({
      select: {
        ANY_ANYACA: true,
      },
      distinct: ['ANY_ANYACA'],
      where: {
        ANY_ANYACA: {
          not: null,
        },
      },
    });
  });

  it("debe devolver 404 si no hay datos en OfertaAcademica", async () => {
    // Mock para OfertaAcademica sin datos
    prisma.ofertaAcademica.findMany.mockResolvedValue([]);

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "No se encontraron años académicos en la tabla OfertaAcademica" 
    });
  });

  it("debe manejar errores durante la creación automática", async () => {
    // Mock para encontrar años académicos en OfertaAcademica
    prisma.ofertaAcademica.findMany.mockRejectedValue(new Error("Error de base de datos"));

    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta de error
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear el curso académico" });
  });
});