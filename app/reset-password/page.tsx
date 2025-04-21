'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FaLock, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../styles/colors.css';

// Component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Validar que el token exista
    if (!token) {
      setError('Enlace inválido o expirado. Por favor, solicita un nuevo enlace de restablecimiento de contraseña.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Importamos la función de reseteo
      const { completePasswordReset } = await import('@/lib/actions/password-reset-complete');
      const result = await completePasswordReset(token as string, password);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Ha ocurrido un error al restablecer tu contraseña. Inténtalo de nuevo más tarde.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
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
      {/* Logo */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <div className="mx-auto mb-4 flex justify-center">
          <Image 
            src="/logo-UFV.png"
            alt="Logo UFV"
            width={150}
            height={60}
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Restablecer Contraseña</h1>
      </motion.div>

      {success ? (
        <motion.div 
          variants={itemVariants}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-6 rounded-md flex flex-col items-center text-center space-y-4"
        >
          <FaCheck className="text-green-500 text-3xl" />
          <div>
            <p className="text-lg font-semibold">¡Contraseña actualizada con éxito!</p>
            <p className="mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <p className="mt-3 text-sm">Redirigiendo a la página de inicio de sesión...</p>
          </div>
        </motion.div>
      ) : (
        <>
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
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
                  placeholder="Ingresa una nueva contraseña"
                  disabled={isLoading || !token}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-[var(--primary)] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
                  placeholder="Confirma tu nueva contraseña"
                  disabled={isLoading || !token}
                />
              </div>
            </div>

            <div>
              <motion.button
                type="submit"
                disabled={isLoading || !token}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white transition-all ${
                  isLoading || !token ? 'bg-opacity-70' : ''
                } bg-[var(--primary)] hover:bg-[var(--primary-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  </>
                ) : 'Cambiar contraseña'}
              </motion.button>
            </div>
          </motion.form>
        </>
      )}

      <motion.div variants={itemVariants} className="mt-6 text-center">
        <a 
          href="/login" 
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors"
        >
          Volver a inicio de sesión
        </a>
      </motion.div>
    </motion.div>
  );
}

// Main component with Suspense
export default function ResetPasswordPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      {mounted && (
        <Suspense fallback={
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md flex justify-center items-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)] mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando...</p>
            </div>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      )}
    </div>
  );
}
