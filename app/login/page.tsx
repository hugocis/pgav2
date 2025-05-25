'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FaUser, FaLock, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../styles/colors.css';

// Component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorType = searchParams.get('error');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Creating a toggle function to use the setShowPassword state
  const togglePasswordVisibility = () => setShowPassword(prev => !prev);
  
  // Set error message based on error parameter in URL
  useEffect(() => {
    if (errorType === 'AccountLocked') {
      setError('Esta cuenta ha sido bloqueada. Por favor, contacte con el administrador.');
    }
  }, [errorType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const res = await signIn('credentials', {
        redirect: false,
        username,
        password,
        callbackUrl,
      });
        if (res?.error) {
        // Check for specific error messages
        if (res.error.includes('Account locked')) {
          setError('Esta cuenta ha sido bloqueada. Por favor, contacte con el administrador.');
        } else {
          setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
        }
      } else if (res?.ok) {
        // Get user session to determine which dashboard to redirect to
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        console.log('Session after login:', session);
        console.log('User roles:', session?.user?.roles);
        
        // Check if roles array exists
        if (!session?.user?.roles) {
          console.log('No roles found in session!');
          
          // Wait a moment for session to be fully established
          setTimeout(async () => {
            const retryResponse = await fetch('/api/auth/session');
            const retrySession = await retryResponse.json();
            console.log('Retry session data:', retrySession);
            
            if (retrySession?.user?.roles?.includes('Admin')) {
              console.log('Redirecting to Admin dashboard');
              router.push('/admin/dashboard');
            } else if (retrySession?.user?.roles?.includes('PEC')) {
              console.log('Redirecting to PEC dashboard');
              router.push('/pec/dashboard');
            } else if (retrySession?.user?.roles?.includes('Profesor')) {
              console.log('Redirecting to Profesor dashboard');
              router.push('/profesor/dashboard');
            } else if (retrySession?.user?.roles?.includes('Alumno')) {
              console.log('Redirecting to Alumno dashboard');
              router.push('/alumno/dashboard');
            } else if (retrySession?.user?.roles?.includes('Manager')) {
              console.log('Redirecting to Manager dashboard');
              router.push('/manager/dashboard');
            } else {
              console.log('No specific role found, redirecting to homepage');
              router.push('/');
            }
          }, 1000);
          return;
        }
        
        if (session?.user?.roles?.includes('Admin')) {
          console.log('Redirecting to Admin dashboard');
          router.push('/admin/dashboard');
        } else if (session?.user?.roles?.includes('PEC')) {
          console.log('Redirecting to PEC dashboard');
          router.push('/pec/dashboard');
        } else if (session?.user?.roles?.includes('Profesor')) {
          console.log('Redirecting to Profesor dashboard');
          router.push('/profesor/dashboard');
        } else if (session?.user?.roles?.includes('Alumno')) {
          console.log('Redirecting to Alumno dashboard');
          router.push('/alumno/dashboard');
        } else if (session?.user?.roles?.includes('Manager')) {
          console.log('Redirecting to Manager dashboard');
          router.push('/manager/dashboard');
        } else {
          console.log('No specific role found, redirecting to homepage');
          router.push('/');
        }
      }
    } catch {
      setError('Ocurrió un error al iniciar sesión. Por favor, inténtalo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle password reset redirection
  const handlePasswordReset = () => {
    router.push('/reset-password');
  };

  // Variantes para animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Logo y título para móvil */}
      <motion.div variants={itemVariants} className="text-center mb-8 md:hidden">
        <div className="mx-auto mb-4 flex justify-center">
          <Image
            src="/logo-UFV.png"
            alt="Logo UFV"
            width={120}
            height={50}
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Portal de Gestión de Asistencias</h1>
        <p className="text-gray-600 mt-2">Universidad Francisco de Vitoria</p>
      </motion.div>

      <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-800 mb-6 hidden md:block text-center">
        Inicia sesión
      </motion.h2>

      {error && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center"
        >
          <FaExclamationTriangle className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Usuario
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaUser className="text-gray-400" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              placeholder="Nombre de usuario"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors focus:outline-none"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
              placeholder="Contraseña"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <FaEyeSlash className="text-gray-400 hover:text-gray-600" />
              ) : (
                <FaEye className="text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </motion.form>
    </motion.div>
  );
}

// Main component with Suspense
export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Columna de branding - visible en dispositivos medianos y grandes */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/Fondo_login.jpg"
            alt="Universidad Francisco de Vitoria"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0D3C68]/80 to-[#092a4a]/70"></div>
        </div>
        {/* Logo, título y copyright */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-8">
          <div className="flex flex-col items-center mt-8 space-y-8">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <Image
                src="/logo-UFV.png"
                alt="Logo UFV"
                width={180}
                height={70}
                priority
              />
            </div>

            <div className="text-center max-w-lg">
              <h1 className="text-4xl font-bold text-white mb-6">Portal de Gestión de Asistencias</h1>
              <p className="text-xl text-white/90 mx-auto">
                Accede al sistema de gestión de asistencias de la Universidad Francisco de Vitoria
              </p>

              <div className="mt-8 p-6 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-white text-lg italic">
                  &quot;La educación es la clave para el futuro, y la asistencia es el primer paso hacia el éxito académico&quot;
                </p>
              </div>
            </div>
          </div>

          <div className="text-white/70 text-sm">
            © {new Date().getFullYear()} Universidad Francisco de Vitoria
          </div>
        </div>
      </div>
      {/* Formulario de login */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8">
        {mounted && (
          <Suspense fallback={
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md flex justify-center items-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)] mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando...</p>
              </div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        )}
      </div>
    </div>
  );
}
