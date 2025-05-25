/**
 * @jest-environment node
 */
const { completePasswordReset } = require("@/lib/actions/password-reset-complete");
const prisma = require("@/lib/prisma");
const bcrypt = require("bcryptjs");

// Mocks
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockReturnValue("hashed_new_password"),
}));

describe("completePasswordReset", () => {
  it("debe estar definida", () => {
    expect(typeof completePasswordReset).toBe("function");
  });
});
