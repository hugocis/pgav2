/**
 * @jest-environment node
 */
const prisma = require('@/lib/prisma');

// Mock de PrismaClient
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

describe('Prisma Client', () => {
  it('debe exportar una instancia de PrismaClient', () => {
    expect(prisma).toBeDefined();
  });
});
