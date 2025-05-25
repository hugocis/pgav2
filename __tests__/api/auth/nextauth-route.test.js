/**
 * @jest-environment node
 */
const { GET, POST } = require("@/app/api/auth/[...nextauth]/route");
const NextAuth = require("next-auth");

// Mock de NextAuth
jest.mock("next-auth", () => {
  const mockHandler = {
    GET: jest.fn().mockReturnValue({ status: 200 }),
    POST: jest.fn().mockReturnValue({ status: 200 }),
  };
  return jest.fn(() => mockHandler);
});

jest.mock("@/lib/authOptions", () => ({
  authOptions: {
    providers: [
      {
        id: "credentials",
        name: "Credentials",
        credentials: {
          username: { label: "Usuario", type: "text" },
          password: { label: "Contraseña", type: "password" },
        },
        authorize: jest.fn(),
      },
    ],
  },
}));

describe("NextAuth API Route", () => {
  it("debe exportar handlers GET y POST", () => {
    // Verificar que los handlers existen
    expect(GET).toBeDefined();
    expect(POST).toBeDefined();
  });
});
