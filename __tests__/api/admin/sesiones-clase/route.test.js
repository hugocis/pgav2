/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/(admin)/sesiones-clase/route";
import prisma from "@/lib/prisma";
import { logActivity } from "@/lib/logActivity";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    sesionClase: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    grupo: {
      findUnique: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

// Mock logActivity
jest.mock("@/lib/logActivity", () => ({
  logActivity: jest.fn()
}));

describe("GET /api/admin/sesiones-clase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (params = {}) => {
    const url = new URL("http://localhost:3000/api/admin/sesiones-clase");
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value.toString());
    });
    
    return {
      url: url.toString()
    };
  };

  it("debe devolver todas las sesiones de clase sin filtros", async () => {
    const sesionesClaseMock = [
      {
        id: "sesion1",
        fecha: new Date("2025-05-01T10:00:00Z"),
        grupoId: "grupo1",
        docenteId: "docente1",
        grupo: { id: "grupo1", denominacion: "Grupo A" },
        user: {
          id: "docente1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        },
        AsistenciaAlumno: []
      }
    ];
    
    prisma.sesionClase.findMany.mockResolvedValueOnce(sesionesClaseMock);

    const req = createMockRequest();

    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionesClaseMock);
    expect(prisma.sesionClase.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        grupo: true,
        user: {
          select: {
            id: true,
            name: true,
            surname1: true,
            surname2: true,
            email: true
          }
        },
        AsistenciaAlumno: true
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  });

  it("debe filtrar sesiones de clase por grupoId", async () => {
    const sesionesClaseMock = [
      {
        id: "sesion1",
        fecha: new Date("2025-05-01T10:00:00Z"),
        grupoId: "grupo1",
        docenteId: "docente1",
        grupo: { id: "grupo1", denominacion: "Grupo A" },
        user: {
          id: "docente1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        },
        AsistenciaAlumno: []
      }
    ];
    
    prisma.sesionClase.findMany.mockResolvedValueOnce(sesionesClaseMock);

    const req = createMockRequest({ grupoId: "grupo1" });

    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionesClaseMock);
    expect(prisma.sesionClase.findMany).toHaveBeenCalledWith({
      where: { grupoId: "grupo1" },
      include: expect.anything(),
      orderBy: expect.anything()
    });
  });

  it("debe filtrar sesiones de clase por docenteId", async () => {
    const sesionesClaseMock = [
      {
        id: "sesion1",
        fecha: new Date("2025-05-01T10:00:00Z"),
        grupoId: "grupo1",
        docenteId: "docente1",
        grupo: { id: "grupo1", denominacion: "Grupo A" },
        user: {
          id: "docente1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        },
        AsistenciaAlumno: []
      }
    ];
    
    prisma.sesionClase.findMany.mockResolvedValueOnce(sesionesClaseMock);

    const req = createMockRequest({ docenteId: "docente1" });

    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionesClaseMock);
    expect(prisma.sesionClase.findMany).toHaveBeenCalledWith({
      where: { docenteId: "docente1" },
      include: expect.anything(),
      orderBy: expect.anything()
    });
  });

  it("debe filtrar sesiones de clase por grupoId y docenteId", async () => {
    const sesionesClaseMock = [
      {
        id: "sesion1",
        fecha: new Date("2025-05-01T10:00:00Z"),
        grupoId: "grupo1",
        docenteId: "docente1",
        grupo: { id: "grupo1", denominacion: "Grupo A" },
        user: {
          id: "docente1",
          name: "Juan",
          surname1: "Pérez",
          surname2: "García",
          email: "juan.perez@example.com"
        },
        AsistenciaAlumno: []
      }
    ];
    
    prisma.sesionClase.findMany.mockResolvedValueOnce(sesionesClaseMock);

    const req = createMockRequest({ grupoId: "grupo1", docenteId: "docente1" });

    const response = await GET(req);
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(sesionesClaseMock);
    expect(prisma.sesionClase.findMany).toHaveBeenCalledWith({
      where: { grupoId: "grupo1", docenteId: "docente1" },
      include: expect.anything(),
      orderBy: expect.anything()
    });
  });

  it("debe manejar errores internos", async () => {
    prisma.sesionClase.findMany.mockRejectedValueOnce(new Error("Error de base de datos"));

    const req = createMockRequest();

    const response = await GET(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al obtener las sesiones de clase" });
  });
});

describe("POST /api/admin/sesiones-clase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Mock request
  const mockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    url: "http://localhost:3000/api/admin/sesiones-clase"
  });

  it("debe devolver 400 si faltan campos obligatorios", async () => {
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1"
      // Falta docenteId
    });

    const response = await POST(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Fecha, grupoId y docenteId son campos obligatorios" });
  });

  it("debe devolver 400 si el grupo no existe", async () => {
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.grupo.findUnique.mockResolvedValueOnce(null);

    const response = await POST(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El grupo especificado no existe" });
  });

  it("debe devolver 400 si el docente no existe", async () => {
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.grupo.findUnique.mockResolvedValueOnce({ id: "grupo1", denominacion: "Grupo A" });
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const response = await POST(req);
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "El docente especificado no existe" });
  });

  it("debe crear la sesión de clase correctamente", async () => {
    const fechaTest = "2025-05-01T10:00:00Z";
    const req = mockRequest({
      fecha: fechaTest,
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    const grupo = { id: "grupo1", denominacion: "Grupo A" };
    const docente = { 
      id: "docente1", 
      name: "Juan",
      surname1: "Pérez",
      surname2: "García",
      email: "juan.perez@example.com"
    };
    
    prisma.grupo.findUnique.mockResolvedValueOnce(grupo);
    prisma.user.findUnique.mockResolvedValueOnce(docente);
    
    const nuevaSesion = {
      id: "sesion1",
      fecha: new Date(fechaTest),
      grupoId: "grupo1",
      docenteId: "docente1"
    };
    
    prisma.sesionClase.create.mockResolvedValueOnce(nuevaSesion);

    const response = await POST(req);
    
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(nuevaSesion);
    
    // Verificar llamada a create
    expect(prisma.sesionClase.create).toHaveBeenCalledWith({
      data: {
        fecha: new Date(fechaTest),
        grupoId: "grupo1",
        docenteId: "docente1"
      }
    });
    
    // Verificar llamada a logActivity
    expect(logActivity).toHaveBeenCalledWith({
      req: expect.anything(),
      action: 'create',
      entityType: 'sesionClase',
      entityId: 'sesion1',
      details: expect.stringContaining("Creación de sesión de clase")
    });
  });

  it("debe manejar errores internos", async () => {
    const req = mockRequest({
      fecha: "2025-05-01T10:00:00Z",
      grupoId: "grupo1",
      docenteId: "docente1"
    });
    
    prisma.grupo.findUnique.mockRejectedValueOnce(new Error("Error de base de datos"));

    const response = await POST(req);
    
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Error al crear la sesión de clase" });
  });
});
