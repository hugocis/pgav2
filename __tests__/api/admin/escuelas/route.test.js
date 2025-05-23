/**
 * @jest-environment node
 */

import { GET, POST, PUT, DELETE } from "@/app/api/(admin)/escuelas/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    escuela: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    ofertaAcademica: {
      findMany: jest.fn()
    }
  }
}));

// Mock logActivity
jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

describe("GET /api/admin/escuelas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe devolver todas las escuelas ordenadas por denominación", async () => {
    // Mock de escuelas
    const escuelasMock = [
      { id: "1", denominacion: "Escuela de Ingeniería" },
      { id: "2", denominacion: "Escuela de Ciencias" }
    ];
    
    prisma.escuela.findMany.mockResolvedValueOnce(escuelasMock);

    const response = await GET();
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(escuelasMock);
    expect(prisma.escuela.findMany).toHaveBeenCalledWith({
      orderBy: {
        denominacion: 'asc'
      }
    });
  });

  it("debe manejar errores internos", async () => {
    prisma.escuela.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await GET();
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener las escuelas" });
  });
});

describe("POST /api/admin/escuelas (Modo Manual)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request
  const mockRequest = (body) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/admin/escuelas"
    };
  };

  it("debe devolver 400 si falta la denominación", async () => {
    const req = mockRequest({});

    const response = await POST(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La denominación es obligatoria" });
  });

  it("debe devolver 409 si la escuela ya existe", async () => {
    const req = mockRequest({ denominacion: "Escuela de Ingeniería" });
    
    const escuelaExistente = {
      id: "1",
      denominacion: "Escuela de Ingeniería"
    };
    
    prisma.escuela.findFirst.mockResolvedValueOnce(escuelaExistente);

    const response = await POST(req);
    
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      error: "La escuela ya existe",
      escuela: escuelaExistente
    });
  });

  it("debe crear una nueva escuela correctamente", async () => {
    const req = mockRequest({ denominacion: "Nueva Escuela" });
    
    // No existe la escuela
    prisma.escuela.findFirst.mockResolvedValueOnce(null);
    
    const nuevaEscuela = {
      id: "3",
      denominacion: "Nueva Escuela"
    };
    
    prisma.escuela.create.mockResolvedValueOnce(nuevaEscuela);

    const response = await POST(req);
    
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual({
      message: "Escuela creada correctamente",
      escuela: nuevaEscuela
    });
    
    // Verificar llamada a create
    expect(prisma.escuela.create).toHaveBeenCalledWith({
      data: { denominacion: "Nueva Escuela" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "create",
      entityType: "escuela",
      entityId: "3",
      details: expect.stringContaining("Escuela creada manualmente")
    });
  });

  it("debe manejar errores internos", async () => {
    const req = mockRequest({ denominacion: "Nueva Escuela" });
    
    prisma.escuela.findFirst.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await POST(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear la escuela" });
  });
});

describe("POST /api/admin/escuelas (Modo Automático)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request vacío para modo automático
  const mockEmptyRequest = () => {
    return {
      json: jest.fn().mockRejectedValue(new Error("No hay cuerpo JSON")),
      url: "http://localhost:3000/api/admin/escuelas"
    };
  };

  it("debe devolver 404 si no hay denominaciones en OfertaAcademica", async () => {
    const req = mockEmptyRequest();
    
    // No hay ofertas académicas
    prisma.ofertaAcademica.findMany.mockResolvedValueOnce([]);

    const response = await POST(req);
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({
      error: "No se encontraron denominaciones de escuelas en la tabla OfertaAcademica"
    });
  });

  it("debe crear escuelas automáticamente desde OfertaAcademica", async () => {
    const req = mockEmptyRequest();
    
    // Mock ofertas académicas con denominaciones
    const ofertasAcademicas = [
      { DENOMINACION: "Escuela de Ingeniería" },
      { DENOMINACION: "Escuela de Medicina" },
      { DENOMINACION: "Escuela de Derecho" }
    ];
    
    prisma.ofertaAcademica.findMany.mockResolvedValueOnce(ofertasAcademicas);
    
    // Mock verificación de existencia de escuelas
    prisma.escuela.findFirst
      .mockResolvedValueOnce({ id: "1", denominacion: "Escuela de Ingeniería" }) // Ya existe
      .mockResolvedValueOnce(null) // No existe
      .mockResolvedValueOnce(null); // No existe
      
    // Mock creación de escuelas
    prisma.escuela.create
      .mockResolvedValueOnce({ id: "5", denominacion: "Escuela de Medicina" })
      .mockResolvedValueOnce({ id: "6", denominacion: "Escuela de Derecho" });

    const response = await POST(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mensaje).toContain("Proceso completado");
    expect(body.resultados.procesados).toBe(3);
    expect(body.resultados.creados).toBe(2);
    expect(body.resultados.yaExistentes.length).toBe(1);
    
    // Verificar llamadas a create
    expect(prisma.escuela.create).toHaveBeenCalledTimes(2);
    
    // Verificar llamadas a logActivity
    expect(logActivity).toHaveBeenCalledTimes(2);
  });

  it("debe manejar errores durante la creación automática", async () => {
    const req = mockEmptyRequest();
    
    // Mock ofertas académicas con denominaciones
    const ofertasAcademicas = [
      { DENOMINACION: "Escuela de Ingeniería" },
      { DENOMINACION: null }, // Denominación nula
      { DENOMINACION: "Escuela con Error" }
    ];
    
    prisma.ofertaAcademica.findMany.mockResolvedValueOnce(ofertasAcademicas);
    
    // Mock verificación de existencia de escuelas
    prisma.escuela.findFirst
      .mockResolvedValueOnce({ id: "1", denominacion: "Escuela de Ingeniería" }) // Ya existe
      .mockResolvedValueOnce(null); // No existe
      
    // Mock error en la creación
    prisma.escuela.create
      .mockRejectedValueOnce(new Error("Error al crear"));

    const response = await POST(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.resultados.procesados).toBe(3);
    expect(body.resultados.creados).toBe(0);
    expect(body.resultados.errores.length).toBe(2); // Un error de null y otro de creación
    expect(body.resultados.yaExistentes.length).toBe(1);
  });
});

describe("PUT /api/admin/escuelas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request
  const mockRequest = (body) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/admin/escuelas"
    };
  };

  it("debe devolver 400 si falta el ID", async () => {
    const req = mockRequest({
      denominacion: "Escuela Actualizada"
    });

    const response = await PUT(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la escuela es obligatorio" });
  });

  it("debe devolver 400 si falta la denominación", async () => {
    const req = mockRequest({
      id: "1"
    });

    const response = await PUT(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "La denominación es obligatoria" });
  });

  it("debe devolver 404 si la escuela no existe", async () => {
    const req = mockRequest({
      id: "1",
      denominacion: "Escuela Actualizada"
    });
    
    prisma.escuela.findUnique.mockResolvedValueOnce(null);

    const response = await PUT(req);
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La escuela no existe" });
  });

  it("debe devolver 409 si ya existe otra escuela con la misma denominación", async () => {
    const req = mockRequest({
      id: "1",
      denominacion: "Escuela Actualizada"
    });
    
    prisma.escuela.findUnique.mockResolvedValueOnce({
      id: "1",
      denominacion: "Escuela Original"
    });
    
    prisma.escuela.findFirst.mockResolvedValueOnce({
      id: "2",
      denominacion: "Escuela Actualizada"
    });

    const response = await PUT(req);
    
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({ error: "Ya existe otra escuela con esta denominación" });
  });

  it("debe actualizar la escuela correctamente", async () => {
    const req = mockRequest({
      id: "1",
      denominacion: "Escuela Actualizada"
    });
    
    const escuelaOriginal = {
      id: "1",
      denominacion: "Escuela Original"
    };
    
    const escuelaActualizada = {
      id: "1",
      denominacion: "Escuela Actualizada"
    };
    
    prisma.escuela.findUnique.mockResolvedValueOnce(escuelaOriginal);
    prisma.escuela.findFirst.mockResolvedValueOnce(null); // No hay conflicto
    prisma.escuela.update.mockResolvedValueOnce(escuelaActualizada);

    const response = await PUT(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: "Escuela actualizada correctamente",
      escuela: escuelaActualizada
    });
    
    // Verificar llamada a update
    expect(prisma.escuela.update).toHaveBeenCalledWith({
      where: { id: "1" },
      data: { denominacion: "Escuela Actualizada" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "update",
      entityType: "escuela",
      entityId: "1",
      prevValue: escuelaOriginal,
      details: expect.stringContaining("Escuela actualizada")
    });
  });

  it("debe manejar errores internos", async () => {
    const req = mockRequest({
      id: "1",
      denominacion: "Escuela Actualizada"
    });
    
    prisma.escuela.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await PUT(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al actualizar la escuela" });
  });
});

describe("DELETE /api/admin/escuelas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request con searchParams
  const mockRequest = (id) => {
    return {
      url: `http://localhost:3000/api/admin/escuelas?id=${id}`
    };
  };

  it("debe devolver 400 si falta el ID", async () => {
    const req = {
      url: "http://localhost:3000/api/admin/escuelas"
    };

    const response = await DELETE(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El ID de la escuela es obligatorio" });
  });

  it("debe devolver 404 si la escuela no existe", async () => {
    const req = mockRequest("1");
    
    prisma.escuela.findUnique.mockResolvedValueOnce(null);

    const response = await DELETE(req);
    
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "La escuela no existe" });
  });

  it("debe devolver 400 si la escuela tiene carreras asociadas", async () => {
    const req = mockRequest("1");
    
    prisma.escuela.findUnique.mockResolvedValueOnce({
      id: "1",
      denominacion: "Escuela de Ingeniería",
      Carrera: [
        { id: "carrera1", denominacion: "Ingeniería Informática" }
      ]
    });

    const response = await DELETE(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: "No se puede eliminar la escuela porque tiene carreras asociadas",
      carreras: 1
    });
  });

  it("debe eliminar la escuela correctamente", async () => {
    const req = mockRequest("1");
    
    const escuela = {
      id: "1",
      denominacion: "Escuela de Ingeniería",
      Carrera: []
    };
    
    prisma.escuela.findUnique.mockResolvedValueOnce(escuela);
    prisma.escuela.delete.mockResolvedValueOnce({ id: "1" });

    const response = await DELETE(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: "Escuela eliminada correctamente" });
    
    // Verificar llamada a delete
    expect(prisma.escuela.delete).toHaveBeenCalledWith({
      where: { id: "1" }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: "delete",
      entityType: "escuela",
      entityId: "1",
      prevValue: escuela,
      details: expect.stringContaining("Escuela eliminada")
    });
  });

  it("debe manejar errores internos", async () => {
    const req = mockRequest("1");
    
    prisma.escuela.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await DELETE(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al eliminar la escuela" });
  });
});
