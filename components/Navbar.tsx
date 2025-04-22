'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaUserCircle, 
  FaTachometerAlt, 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaBriefcase, 
  FaClipboardCheck,
  FaChevronDown,
  FaChevronUp,
  FaBars,
  FaTimes,
  FaUsers,
  FaUserCog,
  FaCalendarAlt,
  FaGraduationCap,
  FaUniversity,
  FaBook
} from 'react-icons/fa';

type RoleInfo = {
  name: string;
  path: string;
  icon: ReactNode;
  color: string;
};

const roleConfigs: Record<string, RoleInfo> = {
  Admin: { 
    name: 'Administrador', 
    path: '/admin/dashboard', 
    icon: <FaTachometerAlt className="w-5 h-5" />,
    color: 'bg-red-600'
  },
  Manager: { 
    name: 'Manager', 
    path: '/manager/dashboard', 
    icon: <FaBriefcase className="w-5 h-5" />,
    color: 'bg-amber-600'
  },
  PEC: { 
    name: 'PEC', 
    path: '/pec/dashboard', 
    icon: <FaClipboardCheck className="w-5 h-5" />,
    color: 'bg-green-600'
  },
  Profesor: { 
    name: 'Profesor', 
    path: '/profesor/dashboard', 
    icon: <FaChalkboardTeacher className="w-5 h-5" />,
    color: 'bg-blue-600'
  },
  Alumno: { 
    name: 'Alumno', 
    path: '/alumno/dashboard', 
    icon: <FaUserGraduate className="w-5 h-5" />,
    color: 'bg-purple-600'
  }
};

// Definición de los elementos del subnavbar de administración
const adminNavItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: <FaTachometerAlt className="w-4 h-4" /> },
  { name: 'Curso Académico', path: '/admin/curso-academico', icon: <FaCalendarAlt className="w-4 h-4" /> },
  { name: 'Matrículas', path: '/admin/matriculas', icon: <FaGraduationCap className="w-4 h-4" /> },
  { name: 'Docencia', path: '/admin/docencia', icon: <FaBook className="w-4 h-4" /> },
  { name: 'Usuarios', path: '/admin/users', icon: <FaUsers className="w-4 h-4" /> },
  { name: 'Configuración', path: '/admin/configuracion-carreras', icon: <FaUniversity className="w-4 h-4" /> },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubnavCollapsed, setIsSubnavCollapsed] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [manualToggle, setManualToggle] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const subnavRef = useRef<HTMLDivElement>(null);

  const roles = session?.user?.roles || [];
  const currentRole = Object.keys(roleConfigs).find(role => 
    pathname?.includes(role.toLowerCase())
  ) || (roles.includes('Admin') ? 'Admin' : roles[0]);

  // Verificar si estamos en la sección de administración
  const isAdminSection = pathname?.startsWith('/admin');

  // Manejar el scroll para colapsar/expandir el subnavbar
  useEffect(() => {
    if (!isAdminSection) return;

    const handleScroll = () => {
      if (manualToggle) return; // No alterar el estado si el usuario acaba de hacer un toggle manual
      
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling down - colapsar
        setIsSubnavCollapsed(true);
      } else if (currentScrollY < lastScrollY - 5 || currentScrollY < 20) {
        // Scrolling up significativamente o cerca del tope - expandir
        setIsSubnavCollapsed(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isAdminSection, manualToggle]);

  // Resetear el bloqueo de scroll automático después de un tiempo
  useEffect(() => {
    if (manualToggle) {
      const timer = setTimeout(() => {
        setManualToggle(false);
      }, 1500); // Bloquear el toggle automático por 1.5 segundos después de un toggle manual
      return () => clearTimeout(timer);
    }
  }, [manualToggle]);

  // Función para toggle manual del subnavbar
  const toggleSubnav = () => {
    setIsSubnavCollapsed(!isSubnavCollapsed);
    setManualToggle(true);
  };

  // Cerrar menú de perfil cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Nombre completo del usuario
  const fullName = session?.user ? 
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() : 
    'Usuario';

  if (status === 'loading') {
    return (
      <header className="bg-[#0D3C68] text-white shadow-lg">
        <div className="container mx-auto py-4 px-6">
          <div className="h-16 animate-pulse bg-[#1a5590] rounded"></div>
        </div>
      </header>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }
  
  return (
    <header className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto py-3 px-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Logo y título */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Image 
                src="/logo-UFV.png" 
                alt="Logo UFV" 
                width={48} 
                height={48} 
                className="hidden md:block"
              />
              {/* Punto verde eliminado */}
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight">Portal de Gestión de Asistencias</h1>
              <p className="text-xs md:text-sm text-blue-100 opacity-90">Universidad Francisco de Vitoria</p>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-white/10 focus:bg-white/20 transition-colors"
            aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMobileMenuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
          </button>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-5">
            {roles.length > 0 && (
              <nav className="flex items-center space-x-2">
                {roles.map(role => {
                  const config = roleConfigs[role];
                  if (!config) return null;
                  
                  const isActive = pathname?.startsWith(config.path);
                  return (
                    <Link 
                      key={role}
                      href={config.path}
                      className={`px-3 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                        isActive 
                          ? 'bg-white/20 text-white font-medium' 
                          : 'text-blue-50 hover:bg-white/10'
                      }`}
                    >
                      <span className="hidden lg:block">{config.icon}</span>
                      <span>{config.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-300 ml-1"></span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}            
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-expanded={isProfileOpen}
                aria-label="Menú de perfil"
              >
                <div className="w-7 h-7 bg-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline font-medium">{fullName}</span>
                <FaChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl overflow-hidden text-gray-800 z-50 border border-gray-100">
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <p className="text-sm font-medium text-gray-800">{fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{session?.user?.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {roles.map(role => (
                        <span 
                          key={role} 
                          className={`${roleConfigs[role]?.color || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center`}
                        >
                          {roleConfigs[role]?.icon && <span className="mr-1 text-[10px]">{roleConfigs[role].icon}</span>}
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="py-1 border-t border-gray-100">
                    <Link 
                      href="/profile" 
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="flex-grow">Mi perfil</span>
                    </Link>
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                      <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="flex-grow">Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden pt-4 pb-3 border-t border-white/10 mt-3 animate-fadeIn">
            <div className="space-y-1">
              <div className="flex items-center space-x-3 px-3 py-2 mb-2">
                <div className="w-9 h-9 bg-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{fullName}</p>
                  <p className="text-blue-200 text-xs">{session?.user?.email}</p>
                </div>
              </div>
              
              <div className="bg-white/5 py-1.5 rounded-md my-3">
                {roles.map(role => {
                  const config = roleConfigs[role];
                  if (!config) return null;
                  
                  const isActive = pathname?.startsWith(config.path);
                  return (
                    <Link 
                      key={role}
                      href={config.path}
                      className={`px-3 py-2 flex items-center space-x-2.5 ${
                        isActive 
                          ? 'bg-white/10 text-white relative pl-5' 
                          : 'text-blue-50 hover:bg-white/5'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r"></div>
                      )}
                      <span>{config.icon}</span>
                      <span>{config.name}</span>
                    </Link>
                  );
                })}
              </div>
              
              <Link 
                href="/profile" 
                className="px-3 py-2.5 flex items-center space-x-2 text-sm text-blue-50 hover:bg-white/5"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Mi perfil</span>
              </Link>
              
              <button
                className="w-full text-left px-3 py-2.5 text-sm text-blue-50 hover:bg-white/5 flex items-center space-x-2"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <svg className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </nav>
        )}        {/* Subnavbar para administración - versión simplificada */}
        {isAdminSection && (
          <div className="mt-1 border-t border-white/10">
            <div className={`transition-all duration-300 overflow-hidden ${
              isSubnavCollapsed ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
            }`}>
              <nav className="flex flex-wrap items-center gap-2 overflow-x-auto pt-2 pb-2 hide-scrollbar">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 text-xs md:text-sm whitespace-nowrap transition-colors ${
                        isActive 
                          ? 'bg-white text-[#0D3C68] font-medium shadow-sm' 
                          : 'text-blue-100 bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {/* Versión móvil del subnavbar */}
            {isMobileMenuOpen && (
              <div className="md:hidden pt-1 space-y-1 animate-fadeIn">
                <h3 className="text-xs uppercase text-blue-200 font-medium px-3 py-1 flex justify-between items-center">
                  <span>Administración</span>
                </h3>
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`px-3 py-2 flex items-center space-x-2.5 ${
                        isActive 
                          ? 'bg-white/10 text-white relative pl-5' 
                          : 'text-blue-50 hover:bg-white/5'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r"></div>
                      )}
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
