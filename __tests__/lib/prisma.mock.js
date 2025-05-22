/**
 * @jest-environment node
 */

// Mock de Prisma para tests
const prismaClientMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userRole: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  // Otros modelos según sea necesario
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe("Prisma Client Mock", () => {
  it("debe proporcionar mocks para los modelos de Prisma", () => {
    expect(prismaClientMock.user).toBeDefined();
    expect(prismaClientMock.role).toBeDefined();
    expect(prismaClientMock.userRole).toBeDefined();
    expect(prismaClientMock.$connect).toBeDefined();
    expect(prismaClientMock.$disconnect).toBeDefined();
  });

  it("debe permitir mockear operaciones de Prisma", () => {
    // Mockear una operación
    prismaClientMock.user.findUnique.mockResolvedValue({
      id: "1",
      username: "testuser",
    });

    // Verificar que se pueda acceder al mock
    expect(prismaClientMock.user.findUnique).toBeDefined();
  });
});
