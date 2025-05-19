'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaTachometerAlt,
  FaChartBar,
  FaClipboardList,
  FaFileAlt,
  FaUserCheck,
  FaExclamationTriangle,
  FaUniversity,
  FaUsers,
  FaFileSignature,
  FaHome,
} from 'react-icons/fa';

// Interfaces para el tipado
interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalSubjects: number;
  attendanceRate: number;
  pendingDispensations: number;
  pendingJustifications: number;
  pendingSignatures: number;
  recentDispensations: DispensationRequest[];
  recentJustifications: JustificationRequest[];
  attendanceByDepartment: DepartmentAttendance[];
}

interface DispensationRequest {
  id: string;
  studentName: string;
  subject: string;
  requestDate: string;
  status: string;
}

interface JustificationRequest {
  id: string;
  studentName: string;
  subject: string;
  date: string;
  status: string;
}

interface DepartmentAttendance {
  department: string;
  rate: number;
}

export default function ManagerDashboard() {
  useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubjects: 0,
    attendanceRate: 0,
    pendingDispensations: 0,
    pendingJustifications: 0,
    pendingSignatures: 0,
    recentDispensations: [],
    recentJustifications: [],
    attendanceByDepartment: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Obtener estadísticas generales del dashboard
        const dashboardResponse = await fetch('/api/dashboard-stats', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!dashboardResponse.ok) {
          throw new Error(`Error al obtener datos: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
        }
        
        const dashboardData = await dashboardResponse.json();
        
        // Obtener estadísticas de asistencia filtradas por carreras asignadas
        const attendanceResponse = await fetch('/api/attendance-stats', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!attendanceResponse.ok) {
          throw new Error(`Error al obtener estadísticas de asistencia: ${attendanceResponse.status} ${attendanceResponse.statusText}`);
        }
        
        const attendanceData = await attendanceResponse.json();
        
        // Combinar los datos
        setStats({
          ...dashboardData,
          attendanceByDepartment: attendanceData.attendanceByDepartment || []
        });
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        setError('No se pudieron cargar los datos del dashboard. Por favor, intente nuevamente más tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para obtener la clase de color según el porcentaje
  const getAttendanceColorClass = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'rejected':
        return 'Rechazado';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };

  return (
    <DashboardContainer roleName="Manager">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Breadcrumb navigation */}
          <nav className="flex mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-blue-600">
                  <FaHome className="mr-2" />
                  Inicio
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2">/</span>
                  <span className="text-blue-600">Panel de Control</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold flex items-center">
                    <FaTachometerAlt className="mr-3" />
                    Panel de Control
                  </h1>
                  <p className="text-blue-100 mt-1">
                    Bienvenido al panel de gestión académica
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white/10 px-3 py-2 rounded-lg text-sm">
                      <span className="font-semibold">{new Date().toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {/* Skeleton for summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-gray-200 h-12 w-12 animate-pulse"></div>
                      <div className="ml-4 flex-1">
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-1 bg-gray-100 mt-5"></div>
                  </div>
                ))}
              </div>
              
              {/* Skeleton for main content sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="rounded-full bg-gray-200 h-10 w-10 animate-pulse"></div>
                        <div className="ml-3 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2 mt-1 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="space-y-3">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Skeleton for statistics */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="rounded-full bg-gray-200 h-10 w-10 animate-pulse"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-1 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tarjetas de resumen */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
                  <div className="p-3 sm:p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-blue-100 p-2 sm:p-3 mr-3 sm:mr-4">
                        <FaUsers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">Total Alumnos</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.totalStudents}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-1"></div>
                </div>

                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
                  <div className="p-3 sm:p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-100 p-2 sm:p-3 mr-3 sm:mr-4">
                        <FaUserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">Total Profesores</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.totalTeachers}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-1"></div>
                </div>

                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
                  <div className="p-3 sm:p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-purple-100 p-2 sm:p-3 mr-3 sm:mr-4">
                        <FaUniversity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">Total Asignaturas</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.totalSubjects}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1"></div>
                </div>

                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
                  <div className="p-3 sm:p-5">
                    <div className="flex items-center">
                      <div className="rounded-full bg-amber-100 p-2 sm:p-3 mr-3 sm:mr-4">
                        <FaChartBar className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-500">Asistencia Media</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-800">
                          <span className={getAttendanceColorClass(stats.attendanceRate)}>
                            {stats.attendanceRate}%
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-1"></div>
                </div>
              </div>

              {/* Secciones principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
                {/* Solicitudes pendientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-white to-red-50/30 p-4 md:p-5 border-b border-gray-200">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
                      <div className="bg-red-100 p-2 rounded-full mr-3 shadow-sm">
                        <FaExclamationTriangle className="text-red-600 text-sm md:text-base" />
                      </div>
                      <div>
                        <span className="text-gray-900">Solicitudes Pendientes</span>
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          Gestión de solicitudes que requieren tu atención
                        </div>
                      </div>
                    </h2>
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                      <Link href="/manager/dispensas-academicas" className="flex items-center justify-between p-3 md:p-4 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                        <div className="flex items-center">
                          <div className="bg-red-100 p-1.5 md:p-2 rounded-full">
                            <FaClipboardList className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-800 text-sm md:text-base">Dispensas Académicas</p>
                            <p className="text-xs md:text-sm text-gray-500">Solicitudes pendientes de revisión</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-red-200 text-red-800 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                            {stats.pendingDispensations}
                          </div>
                        </div>
                      </Link>
                      
                      <Link href="/manager/justificaciones" className="flex items-center justify-between p-3 md:p-4 bg-yellow-50 rounded-lg border border-yellow-100 hover:bg-yellow-100 transition-colors">
                        <div className="flex items-center">
                          <div className="bg-yellow-100 p-1.5 md:p-2 rounded-full">
                            <FaFileAlt className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-800 text-sm md:text-base">Justificaciones de Faltas</p>
                            <p className="text-xs md:text-sm text-gray-500">Solicitudes pendientes de revisión</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-yellow-200 text-yellow-800 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                            {stats.pendingJustifications}
                          </div>
                        </div>
                      </Link>
                      
                      <Link href="/manager/firmas-docente" className="flex items-center justify-between p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-1.5 md:p-2 rounded-full">
                            <FaFileSignature className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-800 text-sm md:text-base">Firmas de Docente</p>
                            <p className="text-xs md:text-sm text-gray-500">Pendientes de verificación</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="bg-blue-200 text-blue-800 px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm font-semibold">
                            {stats.pendingSignatures}
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Solicitudes recientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-white to-amber-50/30 p-4 md:p-5 border-b border-gray-200">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
                      <div className="bg-amber-100 p-2 rounded-full mr-3 shadow-sm">
                        <FaClipboardList className="text-amber-600" />
                      </div>
                      <div>
                        <span className="text-gray-900">Dispensas Recientes</span>
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          Últimas solicitudes de dispensas académicas
                        </div>
                      </div>
                    </h2>
                  </div>
                  <div className="p-4 md:p-5">
                    {stats.recentDispensations.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentDispensations.map(dispensation => (
                          <div key={dispensation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div>
                              <p className="font-medium text-gray-800">{dispensation.studentName}</p>
                              <p className="text-xs text-gray-500">{dispensation.subject}</p>
                              <p className="text-xs text-gray-400 mt-1">Solicitado: {new Date(dispensation.requestDate).toLocaleDateString('es-ES')}</p>
                            </div>
                            <div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(dispensation.status)}`}>
                                {getStatusText(dispensation.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Link href="/manager/dispensas-academicas" className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-3 font-medium">
                          Ver todas las solicitudes →
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-gray-500">
                        No hay solicitudes recientes
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Justificaciones recientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-white to-green-50/30 p-4 md:p-5 border-b border-gray-200">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3 shadow-sm">
                        <FaFileAlt className="text-green-600" />
                      </div>
                      <div>
                        <span className="text-gray-900">Justificaciones Recientes</span>
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          Últimas solicitudes de justificación de faltas
                        </div>
                      </div>
                    </h2>
                  </div>
                  <div className="p-4 md:p-5">
                    {stats.recentJustifications.length > 0 ? (
                      <div className="space-y-3">
                        {stats.recentJustifications.map(justification => (
                          <div key={justification.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div>
                              <p className="font-medium text-gray-800">{justification.studentName}</p>
                              <p className="text-xs text-gray-500">{justification.subject}</p>
                              <p className="text-xs text-gray-400 mt-1">Fecha: {new Date(justification.date).toLocaleDateString('es-ES')}</p>
                            </div>
                            <div>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(justification.status)}`}>
                                {getStatusText(justification.status)}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Link href="/manager/justificaciones" className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-3 font-medium">
                          Ver todas las justificaciones →
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-gray-500">
                        No hay justificaciones recientes
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Estadísticas de asistencia por departamento */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-white to-blue-50/30 p-5 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                      <FaChartBar className="text-blue-600" />
                    </div>
                    <div>
                      <span className="text-gray-900">Estadísticas de Asistencia</span>
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        Porcentaje de asistencia por departamento académico
                      </div>
                    </div>
                  </h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.attendanceByDepartment.map((dept, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-medium text-gray-800">{dept.department}</div>
                          <div className={`font-bold ${getAttendanceColorClass(dept.rate)}`}>
                            {dept.rate}%
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              dept.rate >= 80 ? 'bg-green-500' : 
                              dept.rate >= 60 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} 
                            style={{ width: `${dept.rate}%` }}>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-5 text-center">
                    <Link href="/manager/informes-asistencia" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300">
                      <FaChartBar className="mr-2" />
                      Ver informes detallados
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardContainer>  );
}
