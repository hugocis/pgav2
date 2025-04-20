'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FaUser, FaLock, FaExclamationTriangle, FaCalendarCheck, FaSchool } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../styles/colors.css';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
    const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
        setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
      } else if (res?.url) {
        router.push(res.url);
      }
    } catch (error) {
      setError('Ocurrió un error al iniciar sesión. Por favor, inténtalo más tarde.');
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
                  "La educación es la clave para el futuro, y la asistencia es el primer paso hacia el éxito académico"
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
          <motion.div 
            className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Logo y título para móvil */}
            <motion.div variants={itemVariants} className="text-center mb-8 md:hidden">              <div className="mx-auto mb-4 flex justify-center">
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
                  </div>                  <input
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
                  </label>                  <button 
                    type="button" 
                    onClick={() => setIsRecoveryModalOpen(true)} 
                    className="text-sm text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors focus:outline-none"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>                  <input
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
              </div>
              
              <div>                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white transition-all ${
                    isLoading ? 'bg-opacity-70' : ''
                  } bg-[var(--primary)] hover:bg-[var(--primary-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando sesión...
                    </>
                  ) : 'Iniciar sesión'}
                </motion.button>
              </div>
            </motion.form>              <motion.div variants={itemVariants} className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center text-sm">
                <p className="text-gray-500 mb-4">
                  Para acceder al sistema utiliza tus credenciales institucionales:
                </p>
                <div className="flex flex-col space-y-2 text-gray-700">
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <span><span className="font-medium">Usuario:</span> correo electrónico institucional</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <span><span className="font-medium">Contraseña:</span> número de DNI (sin espacios ni guiones)</span>
                  </div>
                </div>
              </div>
            </motion.div>{/* Modal de recuperación de contraseña */}
            {isRecoveryModalOpen && (
              <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
                <motion.div 
                  className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-100"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Recuperación de contraseña</h3>
                  <p className="text-gray-600 mb-4">
                    Introduce tu correo electrónico institucional y te enviaremos las instrucciones para restablecer tu contraseña.
                  </p>
                  
                  <div className="mb-4">
                    <label htmlFor="recoveryEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      id="recoveryEmail"
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
                      placeholder="correo@ufv.es"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setIsRecoveryModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]"
                    >
                      Cancelar
                    </button>                    <button
                      type="button"
                      onClick={async () => {
                        if (!recoveryEmail || !recoveryEmail.includes('@')) {
                          setError('Por favor, introduce un correo electrónico válido');
                          return;
                        }
                        
                        try {
                          setIsLoading(true);
                          
                          // Importamos la función de forma dinámica para reducir el tamaño del bundle inicial
                          const { resetPassword } = await import('@/app/actions/password-reset');
                          const result = await resetPassword(recoveryEmail);
                          
                          if (result.success) {
                            setError('');
                            setIsRecoveryModalOpen(false);
                            setRecoveryEmail('');
                            // Mostrar mensaje de éxito
                            alert(result.message);
                          } else {
                            // Mostrar mensaje de error
                            setError(result.message);
                          }
                        } catch (error) {
                          setError('Ocurrió un error al procesar la solicitud. Inténtalo de nuevo más tarde.');
                          console.error(error);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 bg-[var(--primary)] border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[var(--primary-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </>
                      ) : 'Enviar instrucciones'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
