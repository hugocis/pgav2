'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { FaTachometerAlt, FaUsers, FaBookOpen, FaChalkboardTeacher, FaCog } from 'react-icons/fa';

// Definir nuevas interfaces más detalladas para estadísticas
interface Stats {
  totalUsers: number;
  totalSubjects: number;
  totalTeachers: number;
  recentUsers: UserSummary[];
  recentActivity: ActivityLog[];
  usersByRole: RoleCount[];
  subjectDistribution: SubjectStat[];
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
  username: string;
  roles: string[];
  createdAt: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  createdAt: string;
}

interface RoleCount {
  role: string;
  count: number;
}

interface SubjectStat {
  name: string;
  students: number;
  teachers: number;
}

interface ApiResponse {
  isOpen: boolean;
  isLoading: boolean;
  title: string;
  data: any;
  error: string | null;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSubjects: 0,
    totalTeachers: 0,
    recentUsers: [],
    recentActivity: [],
    usersByRole: [],
    subjectDistribution: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [apiResponse, setApiResponse] = useState<ApiResponse>({
    isOpen: false,
    isLoading: false,
    title: '',
    data: null,
    error: null
  });

  // Función para llamar a una API
  const callApi = async (endpoint: string, title: string) => {
    setApiResponse({
      isOpen: true,
      isLoading: true,
      title,
      data: null,
      error: null
    });

    try {
      const response = await fetch(`/api/${endpoint}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      
      const data = await response.json();
      
      setApiResponse({
        isOpen: true,
        isLoading: false,
        title,
        data,
        error: null
      });

      // Actualizar estadísticas tras sincronización
      fetchStats(true);
    } catch (error) {
      console.error(`Error al llamar a ${endpoint}:`, error);
      setApiResponse({
        isOpen: true,
        isLoading: false,
        title,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  // Cerrar el diálogo
  const closeDialog = () => {
    setApiResponse(prev => ({ ...prev, isOpen: false }));
  };

  // Función para cargar las estadísticas
  const fetchStats = async (forceReload = false) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stats', {
        credentials: 'include',
        cache: 'no-store',
        // Añadimos un parámetro para evitar el almacenamiento en caché del navegador
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          ...data,
          // Si la API no devuelve estos datos, usamos valores por defecto
          recentUsers: data.recentUsers || [],
          recentActivity: data.recentActivity || [],
          usersByRole: data.usersByRole || [],
          subjectDistribution: data.subjectDistribution || []
        });
      } else {
        const errorText = `Error en la respuesta de la API: ${response.status}`;
        console.error(errorText);
        // Mostramos el error en la UI
        setApiResponse({
          isOpen: true,
          isLoading: false,
          title: 'Error al cargar estadísticas',
          data: null,
          error: errorText
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Mostramos el error en la UI
      setApiResponse({
        isOpen: true,
        isLoading: false,
        title: 'Error al cargar estadísticas',
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Cargar las estadísticas siempre que el componente se monte y el usuario esté autenticado
    if (status === 'authenticated') {
      fetchStats();
    }
    
    // Usamos el evento focus para recargar los datos cuando la ventana recupera el enfoque
    // Esto asegurará que los datos se actualicen cuando el usuario vuelva a esta página
    const handleFocus = () => {
      if (status === 'authenticated') {
        fetchStats();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Limpieza del evento cuando el componente se desmonte
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [status]);

  // Formatea la fecha en formato legible
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Función para obtener el icono del rol
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'teacher':
      case 'profesor':
        return (
          <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'student':
      case 'alumno':
        return (
          <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        );
      case 'manager':
        return (
          <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'pec':
        return (
          <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  // Componente de diálogo para mostrar respuestas de API
  const ApiDialog = () => {
    if (!apiResponse.isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">{apiResponse.title}</h3>
            <button 
              onClick={closeDialog}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            {apiResponse.isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0D3C68]"></div>
                <p className="ml-3 text-gray-600">Cargando...</p>
              </div>
            ) : apiResponse.error ? (
              <div className="bg-red-50 p-4 rounded-md border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{apiResponse.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 p-4 mb-4 rounded-md border border-green-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Operación exitosa</h3>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Datos recibidos:</h4>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100 overflow-auto max-h-60">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={closeDialog}
              className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-opacity-90 focus:outline-none"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };
  if (status === 'loading' || isLoading) {
    return (
      <DashboardContainer roleName="Admin">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0D3C68]"></div>
            <p className="mt-4 text-lg text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </DashboardContainer>
    );
  }
  return (
    <DashboardContainer roleName="Admin">
      <ApiDialog />
      
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">          {/* Panel de bienvenida mejorado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaTachometerAlt className="mr-3" /> 
                    Panel de Administración
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/10 rounded-full p-3">
                  <FaCog className="h-8 w-8 text-white" />
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            
            {/* Sección de bienvenida y acciones rápidas */}
            <div className="px-6 py-4 bg-white">
              <p className="text-gray-600">Bienvenido al panel de control administrativo. Aquí podrás gestionar todos los aspectos de la aplicación.</p>
            </div>
          </div>
          
          {/* Tarjetas de estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 opacity-5">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                  </svg>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Usuarios Registrados</p>
                    <div className="mt-1 flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                      {stats.usersByRole && stats.usersByRole.length > 0 && (
                        <p className="ml-2 text-xs text-gray-500">
                          {stats.usersByRole.map((role, idx) => (
                            <span key={role.role} className={idx > 0 ? "ml-1" : ""}>
                              <span className="inline-flex items-center">
                                {getRoleIcon(role.role)}
                                <span className="ml-1">{role.count}</span>
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-blue-600">
                      <Link href="/admin/users/new" className="hover:underline">Añadir usuario</Link>
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Link href="/admin/users" className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200">
                    Gestionar usuarios
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 opacity-5">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 005.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
                  </svg>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Asignaturas</p>
                    <div className="mt-1 flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalSubjects}</p>
                      {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (
                        <p className="ml-2 text-xs text-gray-500">
                          Promedio: {Math.round(stats.subjectDistribution.reduce((acc, curr) => acc + curr.students, 0) / stats.subjectDistribution.length)} estudiantes/asignatura
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-green-600">
                      <button 
                        onClick={() => callApi('asignaturas', 'Poblar Asignaturas')}
                        className="inline-flex items-center hover:underline"
                      >
                        Sincronizar asignaturas
                      </button>
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Link href="/admin/asignaturas" className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors duration-200">
                    Ver asignaturas
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300 transform hover:-translate-y-1">
              <div className="p-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 opacity-5">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                  </svg>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full p-3">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Profesores</p>
                    <div className="mt-1 flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalTeachers}</p>
                      {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (
                        <p className="ml-2 text-xs text-gray-500">
                          {Math.round((stats.totalSubjects / stats.totalTeachers) * 10) / 10} asignaturas/profesor
                        </p>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-purple-600">
                      <button 
                        onClick={() => callApi('user-roles', 'Poblar Roles de Usuario')}
                        className="inline-flex items-center hover:underline"
                      >
                        Sincronizar roles
                      </button>
                    </p>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Link href="/admin/users?role=Profesor" className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors duration-200">
                    Ver profesores
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Secciones principales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Panel izquierdo: Administración principal (2/3 del ancho) */}
            <div className="lg:col-span-2 space-y-5">
              {/* Herramientas de administración */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
                  <Link href="/admin/actions" className="text-sm font-medium text-[#0D3C68] hover:text-opacity-75 transition-opacity">
                    Ver todas
                  </Link>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Link href="/admin/users/new"
                      className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:border-[#0D3C68] hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors duration-200">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </div>
                      <span className="mt-2 text-sm font-medium text-gray-700 group-hover:text-[#0D3C68] transition-colors duration-200">Nuevo Usuario</span>
                    </Link>

                    <Link href="/admin/users"
                      className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:border-[#0D3C68] hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="bg-indigo-100 p-3 rounded-full group-hover:bg-indigo-200 transition-colors duration-200">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="mt-2 text-sm font-medium text-gray-700 group-hover:text-[#0D3C68] transition-colors duration-200">Usuarios</span>
                    </Link>

                    <Link href="/admin/asignaturas"
                      className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-100 hover:border-[#0D3C68] hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="bg-green-100 p-3 rounded-full group-hover:bg-green-200 transition-colors duration-200">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <span className="mt-2 text-sm font-medium text-gray-700 group-hover:text-[#0D3C68] transition-colors duration-200">Asignaturas</span>
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Actividad Reciente */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
                  <Link
                    href="/admin/activity"
                    className="text-sm font-medium text-[#0D3C68] hover:text-opacity-75 transition-opacity"
                  >
                    Ver todas
                  </Link>
                </div>
                <div className="overflow-hidden">
                  <ul role="list" className="divide-y divide-gray-100">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                      stats.recentActivity.slice(0, 5).map((activity, index) => (
                        <li key={activity.id || index} className="px-5 py-4 hover:bg-gray-50 transition-colors duration-150">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {activity.userName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {activity.userName}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {activity.action} {activity.target}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-xs text-gray-400">
                              {formatDate(activity.createdAt)}
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-5 py-8 text-center">
                        <p className="text-sm text-gray-500">No hay actividad reciente para mostrar.</p>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Estadísticas detalladas */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900">Distribución de Asignaturas</h3>
                </div>
                <div className="p-5">
                  {stats.subjectDistribution && stats.subjectDistribution.length > 0 ? (
                    <div className="space-y-4">
                      {stats.subjectDistribution.slice(0, 5).map((subject, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-36 sm:w-40 truncate text-sm font-medium text-gray-700">
                            {subject.name}
                          </div>
                          <div className="flex-1 ml-3">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-100 rounded-full h-2.5 dark:bg-gray-200">
                                <div 
                                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${Math.min(100, (subject.students / 50) * 100)}%` }}>
                                </div>
                              </div>
                              <span className="flex-shrink-0 ml-3 text-xs text-gray-500">
                                {subject.students} estudiantes / {subject.teachers} profesores
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {stats.subjectDistribution.length > 5 && (
                        <div className="text-center pt-2">
                          <Link href="/admin/asignaturas" className="text-sm text-[#0D3C68] hover:text-opacity-75">
                            Ver todas las asignaturas ({stats.subjectDistribution.length})
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">No hay datos de asignaturas disponibles.</p>
                      <button 
                        onClick={() => callApi('asignaturas', 'Poblar Asignaturas')}
                        className="mt-2 text-sm text-[#0D3C68] hover:underline"
                      >
                        Sincronizar asignaturas
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900">Últimos Usuarios</h3>
                </div>
                <div className="overflow-hidden">
                  <ul role="list" className="divide-y divide-gray-100">
                    {stats.recentUsers && stats.recentUsers.length > 0 ? (
                      stats.recentUsers.map((user, index) => (
                        <li key={user.id} className="px-5 py-4 hover:bg-gray-50 transition-colors duration-150">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                                <span className="font-medium text-sm">
                                  {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.name || user.username}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="flex items-center space-x-1">
                                {user.roles?.map((role) => (
                                  <span key={`${user.id}-${role}`} className="inline-flex items-center">
                                    {getRoleIcon(role)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-5 py-8 text-center">
                        <p className="text-sm text-gray-500">No hay usuarios recientes para mostrar.</p>
                      </li>
                    )}
                  </ul>

                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                    <Link
                      href="/admin/users"
                      className="text-sm font-medium text-[#0D3C68] hover:text-opacity-75 flex items-center justify-center"
                    >
                      <span>Ver todos los usuarios</span>
                      <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Estadísticas de usuario por rol */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900">Distribución por Roles</h3>
                </div>
                <div className="p-5">
                  {stats.usersByRole && stats.usersByRole.length > 0 ? (
                    <div className="space-y-4">
                      {stats.usersByRole.map((roleData, index) => {
                        // Calcular el porcentaje para la barra de progreso
                        const percentage = (roleData.count / stats.totalUsers) * 100;
                        
                        // Determinar color de la barra según el rol
                        let barColorClass = 'from-blue-400 to-blue-600'; // Default
                        
                        switch (roleData.role.toLowerCase()) {
                          case 'admin':
                            barColorClass = 'from-red-400 to-red-600';
                            break;
                          case 'profesor':
                          case 'teacher':
                            barColorClass = 'from-purple-400 to-purple-600';
                            break;
                          case 'alumno':
                          case 'student':
                            barColorClass = 'from-blue-400 to-blue-600';
                            break;
                          case 'manager':
                            barColorClass = 'from-green-400 to-green-600';
                            break;
                          case 'pec':
                            barColorClass = 'from-yellow-400 to-yellow-600';
                            break;
                        }
                        
                        return (
                          <div key={roleData.role} className="flex items-center">
                            <div className="flex items-center w-24">
                              {getRoleIcon(roleData.role)}
                              <span className="ml-2 text-sm font-medium text-gray-700">{roleData.role}</span>
                            </div>
                            <div className="flex-1 ml-3">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                  <div 
                                    className={`bg-gradient-to-r ${barColorClass} h-2.5 rounded-full`} 
                                    style={{ width: `${percentage}%` }}>
                                  </div>
                                </div>
                                <span className="flex-shrink-0 ml-3 text-xs text-gray-500 w-12 text-right">
                                  {roleData.count} ({Math.round(percentage)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">No hay datos de roles disponibles.</p>
                      <button 
                        onClick={() => callApi('user-roles', 'Poblar Roles de Usuario')}
                        className="mt-2 text-sm text-[#0D3C68] hover:underline"
                      >
                        Sincronizar roles
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>        </div>
      </div>
    </DashboardContainer>
  );
}
