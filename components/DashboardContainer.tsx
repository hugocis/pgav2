'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface DashboardContainerProps {
  roleName: string;
  children?: React.ReactNode;
}

export default function DashboardContainer({ roleName, children }: DashboardContainerProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Verificar si el usuario está autenticado y tiene el rol correcto
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (roleName !== "Perfil" && session?.user?.roles && !session.user.roles.includes(roleName)) {
      // Si el usuario no tiene el rol necesario Y no estamos en la página de perfil, redirigimos a su dashboard adecuado
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="bg-[#0D3C68] h-16 animate-pulse" />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-2xl font-semibold text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }
  if (status === 'unauthenticated' || (roleName !== "Perfil" && !session?.user?.roles.includes(roleName))) {
    return null; // No renderizar nada mientras se redirige
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header con Navbar */}
      <Navbar />

      {/* Content */}
      <main className="flex-grow container mx-auto px-4 py-6 md:px-6">
        {children}
      </main>
      
      {/* Footer simplificado */}
      <Footer />
    </div>
  );
}
