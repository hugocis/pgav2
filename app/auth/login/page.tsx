'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FaSpinner, FaArrowRight, FaUnlock } from 'react-icons/fa';

export default function AuthLogin() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const duration = 2000; // 2 segundos para la redirección
  const interval = 20; // Actualizar cada 20ms
  const steps = duration / interval;

  useEffect(() => {
    // Redirect to the actual login page after duration
    const redirectTimer = setTimeout(() => {
      router.push('/login');
    }, duration);
    
    // Actualizar progreso
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + (100 / steps);
      });
    }, interval);
    
    return () => {
      clearTimeout(redirectTimer);
      clearInterval(progressTimer);
    };
  }, [router]);

  return (
    <div 
      className="flex min-h-screen items-center justify-center flex-col"
      style={{
        backgroundImage: 'linear-gradient(to bottom right, rgba(5, 38, 76, 0.95), rgba(39, 64, 112, 0.9)), url(/Fondo_login.jpg)', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      {/* Panel principal con efecto de cristal */}
      <motion.div 
        className="relative overflow-hidden bg-white/20 p-10 rounded-2xl shadow-2xl flex flex-col items-center max-w-lg w-full backdrop-blur-md border border-white/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Fondo decorativo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-200/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
        
        {/* Logo con efecto de iluminación */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-blue-100/30 rounded-full filter blur-xl transform -translate-y-2 scale-110"></div>
          <Image
            src="/logo-UFV.png"
            alt="Logo UFV"
            width={240}
            height={96}
            priority
            className="relative z-10 drop-shadow-lg"
          />
        </motion.div>
        
        {/* Icono animado */}
        <motion.div
          className="mb-6 flex justify-center items-center p-4 rounded-full bg-gradient-to-tr from-blue-800 to-blue-600 text-white shadow-lg"
          animate={{ 
            rotate: [0, 10, 0, -10, 0],
            scale: [1, 1.1, 1, 1.1, 1]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <FaUnlock size={30} className="drop-shadow-lg" />
        </motion.div>
        
        {/* Mensaje principal */}
        <motion.div
          className="text-center relative z-10"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white mb-3 tracking-wide">
            Portal de Gestión Académica
          </h1>
          <p className="text-blue-100 text-xl mb-8">
            Redirigiendo a la página de acceso...
          </p>
        </motion.div>
        
        {/* Barra de progreso con estilo mejorado */}
        <motion.div 
          className="flex items-center justify-center w-full mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="relative w-full h-3 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm border border-white/40">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
              style={{ width: `${progress}%` }}
              initial={{ width: "0%" }}
            >
              <div className="absolute inset-0 bg-white/30 opacity-75 animate-pulse"></div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Animación de carga y botón */}
        <div className="flex justify-between items-center w-full">
          <motion.div 
            className="flex items-center gap-2 text-blue-100"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <FaSpinner className="animate-spin" />
            <span>Cargando sesión...</span>
          </motion.div>
          
          <motion.button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition border border-white/30 backdrop-blur"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
          >
            Acceder ahora <FaArrowRight />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
