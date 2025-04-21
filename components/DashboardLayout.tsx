'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardProps {
  roleName: string;
  children?: React.ReactNode;
}

export default function DashboardLayout({ roleName, children }: DashboardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Verificar si el usuario está autenticado y tiene el rol correcto
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session?.user?.roles && !session.user.roles.includes(roleName)) {
      // Si el usuario no tiene el rol necesario, lo redirigimos a su dashboard adecuado
      if (session.user.roles.includes('Admin')) {
        router.push('/admin/dashboard');
      } else if (session.user.roles.includes('Manager')) {
        router.push('/manager/dashboard');
      } else if (session.user.roles.includes('PEC')) {
        router.push('/pec/dashboard');
      } else if (session.user.roles.includes('Profesor')) {
        router.push('/profesor/dashboard');
      } else if (session.user.roles.includes('Alumno')) {
        router.push('/alumno/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [status, session, roleName, router]);

  // Nombre completo del usuario
  const fullName = session?.user ? 
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() : 
    'Usuario';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-semibold">Cargando...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.roles.includes(roleName)) {
    return null; // No renderizar nada mientras se redirige
  }
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Ya no necesitamos este header porque importaremos el componente Navbar */}
      {/* Quitamos esta sección y usaremos el componente Navbar en su lugar */}

      {/* Content */}
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white text-center p-4 mt-auto border-t">
        <p className="text-gray-600">
          © {new Date().getFullYear()} Universidad Francisco de Vitoria. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
