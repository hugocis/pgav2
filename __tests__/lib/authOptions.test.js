/**
 * @jest-environment node
 */
const { authOptions } = require("@/lib/authOptions");

// Mock de prisma
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock de bcrypt
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

describe("authOptions", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CredentialsProvider authorize", () => {
    // Helper function to get the authorize function from authOptions
    const getAuthorizeFunction = () => {
      const provider = authOptions.providers.find(p => p.id === "credentials");
      return provider?.authorize;
    };

    it("debe devolver null si las credenciales no son válidas", async () => {
      const authorize = getAuthorizeFunction();
      
      // Casos de prueba para credenciales inválidas
      const testCases = [
        { credentials: null },
        { credentials: {} },
        { credentials: { username: "test" } },
        { credentials: { password: "password" } },
        { credentials: { username: null, password: "password" } },
        { credentials: { username: "test", password: null } },
      ];
      
      for (const testCase of testCases) {
        const result = await authorize?.(testCase.credentials);
        expect(result).toBeNull();
      }
    });

    // Otros tests...
  });
});
