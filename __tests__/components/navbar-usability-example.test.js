/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';
import { SessionProvider } from 'next-auth/react';

// Mocks necesarios
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
  }),
  usePathname: jest.fn().mockReturnValue('/alumno/dashboard'),
}));

// Mock session para next-auth
const mockSession = {
  data: {
    user: {
      name: 'Usuario Test',
      email: 'test@example.com',
      roles: ['STUDENT'],
      image: null
    },
    expires: '2025-06-01T00:00:00.000Z'
  },
  status: 'authenticated'
};

// Ejemplo de test categorizado como usabilidad
describe('Componente Navbar', () => {
  it('debe renderizar elementos de navegación principales', () => {
    // Wrapping en SessionProvider para evitar el error de useSession
    render(
      <SessionProvider session={mockSession.data}>
        <Navbar />
      </SessionProvider>
    );
    
    // Assertions de ejemplo para usabilidad
    expect(screen.getByText(/Usuario Test/i)).toBeInTheDocument();
  });
});
