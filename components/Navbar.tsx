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
  FaBars,
  FaTimes
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

export default function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const roles = session?.user?.roles || [];
  const currentRole = Object.keys(roleConfigs).find(role => 
    pathname?.includes(role.toLowerCase())
  ) || (roles.includes('Admin') ? 'Admin' : roles[0]);

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
    <header className="bg-[#0D3C68] text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto py-2 px-4 md:px-6">
        <div className="flex justify-between items-center">
          {/* Logo y título */}
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo-UFV.png" 
              alt="Logo UFV" 
              width={50} 
              height={50} 
              className="hidden md:block"
            />
            <div>
              <h1 className="text-lg md:text-xl font-bold">Portal de Gestión de Asistencias</h1>
              <p className="text-xs md:text-sm text-blue-200">Universidad Francisco de Vitoria</p>
            </div>
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-[#1a5590] transition-colors"
          >
            {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {roles.length > 0 && (
              <nav className="flex items-center space-x-1">
                {roles.map(role => {
                  const config = roleConfigs[role];
                  if (!config) return null;
                  
                  const isActive = pathname?.startsWith(config.path);
                  return (
                    <Link 
                      key={role}
                      href={config.path}
                      className={`px-3 py-2 rounded-md flex items-center space-x-1 transition-colors ${
                        isActive 
                          ? 'bg-[#1a5590] text-white' 
                          : 'text-blue-100 hover:bg-[#1a5590]/70'
                      }`}
                    >
                      <span className="hidden lg:block">{config.icon}</span>
                      <span>{config.name}</span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-[#1a5590] transition-colors"
              >
                <FaUserCircle size={24} />
                <span className="hidden lg:inline">{fullName}</span>
                <FaChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-md shadow-lg py-1 text-gray-800 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium">{fullName}</p>
                    <p className="text-xs text-gray-500 mt-1">{session?.user?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {roles.map(role => (
                        <span 
                          key={role} 
                          className={`${roleConfigs[role]?.color || 'bg-gray-500'} text-white text-xs px-2 py-0.5 rounded`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                    >
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
          <nav className="md:hidden pt-4 pb-3 border-t border-blue-500 mt-3">
            <div className="space-y-2">
              {roles.map(role => {
                const config = roleConfigs[role];
                if (!config) return null;
                
                const isActive = pathname?.startsWith(config.path);
                return (
                  <Link 
                    key={role}
                    href={config.path}
                    className={`px-3 py-2 rounded-md flex items-center space-x-2 ${
                      isActive 
                        ? 'bg-[#1a5590] text-white' 
                        : 'text-blue-100 hover:bg-[#1a5590]/70'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                  </Link>
                );
              })}
              
              <hr className="border-blue-500 my-2" />
              
              <div className="px-3 py-2 text-sm">
                <p className="font-medium">{fullName}</p>
                <p className="text-blue-200 text-xs mt-1">{session?.user?.email}</p>
              </div>
              
              <button
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[#1a5590] transition-colors flex items-center"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <span className="flex-grow">Cerrar sesión</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
