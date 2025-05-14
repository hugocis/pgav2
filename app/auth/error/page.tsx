'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaExclamationTriangle} from 'react-icons/fa';

export default function AuthError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'default';
  const [progress, setProgress] = useState(100);
  const duration = 3000; // 3 segundos para la redirección
  const interval = 30; // Actualizar cada 30ms
  const steps = duration / interval;

  // Función para obtener un mensaje de error más amigable
  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'CredentialsSignin':
        return 'Las credenciales proporcionadas son incorrectas.';
      case 'AccessDenied':
        return 'No tienes permiso para acceder a este recurso.';
      case 'EmailSignin':
        return 'Hubo un problema con el inicio de sesión por correo.';
      case 'SessionRequired':
        return 'Se requiere iniciar sesión para acceder a esta página.';
      default:
        return 'Se ha producido un error durante la autenticación.';
    }
  };

  useEffect(() => {
    // Redirect to the login page after duration
    const redirectTimer = setTimeout(() => {
      router.push('/login');
    }, duration);
    
    // Actualizar progreso (cuenta regresiva)
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(progressTimer);
          return 0;
        }
        return prev - (100 / steps);
      });
    }, interval);
    
    return () => {
      clearTimeout(redirectTimer);
      clearInterval(progressTimer);
    };
  }, [router, steps]);

  // Convertir el progreso a segundos para mostrarlo
  const secondsRemaining = Math.ceil((progress / 100) * (duration / 1000));
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <motion.div 
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col items-center">
          <Image
            src="/logo-UFV.png"
            alt="Logo UFV"
            width={180}
            height={72}
            priority
            className="mb-6"
          />
          
          <div className="p-3 rounded-full bg-red-100 mb-4">
            <FaExclamationTriangle size={24} className="text-red-500" />
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Error de autenticación
          </h1>
          
          <p className="text-gray-600 text-center mb-6 pb-4 border-b">
            {getErrorMessage(error)}
          </p>
          
          {/* Barra de progreso simple */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
            <motion.div 
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center w-full">
            <span className="text-sm text-gray-500">
              Redirigiendo en {secondsRemaining}s
            </span>
            
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              onClick={() => router.push('/login')}
            >
              Ir al login
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
