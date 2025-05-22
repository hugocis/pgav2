/**
 * @jest-environment node
 */
const { logActivity } = require("@/lib/logActivity");
const prisma = require("@/lib/prisma");
const { getServerSession } = require("next-auth");
const crypto = require("crypto");

// Mocks
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/authOptions", () => ({
  authOptions: {},
}));

jest.mock("crypto", () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("hashed-data"),
  }),
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("signed-data"),
  }),
}));

describe("logActivity", () => {
  it("debe estar definida", () => {
    expect(typeof logActivity).toBe("function");
  });
});
