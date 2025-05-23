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
      findFirst: jest.fn(),
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
      cursoAnterior: "2024-25",
      cursoSiguiente: null,
      activo: true
    };

    // Mock para validación de formato
    const mockCursoCreado = {
      id: "ca3",
      denominacion: "2025-26",
      cursoAnterior: "2024-25",
      cursoSiguiente: null,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // No existe curso con ese denominacion
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce(null);
    
    // Mock crear curso
    prisma.cursoAcademico.create.mockResolvedValue(mockCursoCreado);

    // Mock for all courses to determine relationships
    prisma.cursoAcademico.findMany.mockResolvedValueOnce([
      {
        id: "ca2",
        denominacion: "2024-25", 
        cursoAnterior: "2023-24",
        cursoSiguiente: null
      },
      {
        id: "ca1",
        denominacion: "2023-24",
        cursoAnterior: null, 
        cursoSiguiente: "2024-25"
      }
    ]);

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(201);
    const body = await response.json();
    
    // Just check that response contains curso académico data, not exact values
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("denominacion", "2025-26");    // Verificar que se comprobó si ya existía el curso
    expect(prisma.cursoAcademico.findFirst).toHaveBeenCalled();

    // Verificar que se creó el curso con los datos correctos
    expect(prisma.cursoAcademico.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        denominacion: cursoData.denominacion,
        activo: cursoData.activo
      })
    }));

    // Verificar que se registró la actividad
    expect(logActivity).toHaveBeenCalled();
  });
  it("debe devolver 400 si el formato de denominación es inválido", async () => {
    const cursoData = {
      denominacion: "2025/26", // Formato inválido
      cursoAnterior: "2024-25",
      activo: true
    };

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ 
      error: "La denominación debe seguir el formato 1234-56 (por ejemplo: 2025-26)"
    });
  });
    it("debe devolver 409 si ya existe un curso con la misma denominación", async () => {
    const cursoData = {
      denominacion: "2024-25",
      cursoAnterior: "2023-24",
      activo: true
    };

    // Mock para curso ya existente
    prisma.cursoAcademico.findFirst.mockResolvedValue({
      id: "ca2",
      denominacion: "2024-25"
    });

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toHaveProperty("error", "El curso académico ya existe");
    expect(body).toHaveProperty("cursoAcademico");
  });
    it("debe devolver 400 si el formato del segundo año es incorrecto", async () => {
    const cursoData = {
      denominacion: "2025-27", // El segundo año debería ser 26, no 27
      activo: true
    };

    // No existe curso con esa denominación
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce(null);

    // Llamar al endpoint
    const req = mockRequest(cursoData);
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("El formato del curso académico no es válido");
    expect(body.error).toContain("2025-26");
  });
    it("debe manejar errores durante la creación manual", async () => {
    const cursoData = {
      denominacion: "2025-26",
      cursoAnterior: "2024-25",
      activo: true
    };    // No existe curso con ese denominacion
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce(null);
    
    // Mock para todos los cursos
    prisma.cursoAcademico.findMany.mockResolvedValueOnce([
      {
        id: "ca1",
        denominacion: "2024-25",
        cursoAnterior: null
      }
    ]);
    
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
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce({
      id: "ca1", 
      denominacion: "2023-24"
    }); // Ya existe
    
    // Para "2024-25"
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce({
      id: "ca2", 
      denominacion: "2024-25"
    }); // Ya existe
    
    // Para "2025-26"
    prisma.cursoAcademico.findFirst.mockResolvedValueOnce(null); // No existe
    
    // Mock para todos los cursos
    prisma.cursoAcademico.findMany.mockResolvedValueOnce([
      { 
        id: "ca1",
        denominacion: "2023-24",
        cursoAnterior: null,
        cursoSiguiente: "2024-25"
      },
      {
        id: "ca2",
        denominacion: "2024-25",
        cursoAnterior: "2023-24",
        cursoSiguiente: null
      }
    ]);
    
    // Mock para la creación del curso 2025-26
    prisma.cursoAcademico.create.mockResolvedValueOnce({
      id: "ca3",
      denominacion: "2025-26",
      cursoAnterior: "2024-25",
      cursoSiguiente: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Llamar al endpoint con request vacío para activar el modo automático
    const req = mockEmptyRequest();
    const response = await POST(req);

    // Verificar la respuesta
    expect(response.status).toBe(200);
    const body = await response.json();
    
    // Verificar que tenemos los datos esperados en el resultado
    expect(body).toHaveProperty("resultados");
    expect(body.resultados).toHaveProperty("procesados", 3);
    expect(body.resultados).toHaveProperty("creados", 1);
    expect(body.resultados).toHaveProperty("yaExistentes");
    expect(body.resultados.yaExistentes.length).toBe(2);
    
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