/**
 * @jest-environment node
 */
const { resetPassword } = require('@/lib/actions/password-reset');

// Mock de prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock de nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe ser una función', () => {
    expect(typeof resetPassword).toBe('function');
  });
});
