'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { FaUserGraduate, FaChartBar, FaClipboardList, FaBriefcaseMedical, FaCalendarAlt, FaSearch, FaUniversity } from 'react-icons/fa';

interface PecCarreraCurso {
  id: string;
  carreraId: string;
  curso: number;
  activo: boolean;
  carrera: {
    id: string;
    denominacion: string;
  };
}

export default function PECDashboard() {
  const { data: session } = useSession();
  const [carrerasCursos, setCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const [asistenciaStats, setAsistenciaStats] = useState<any>({
    totalAlumnos: 0,
    asistenciaMedia: 0,
    alumnosConProblemas: 0,
    alumnosGOE: 0
  });

  useEffect(() => {
    const fetchCarrerasCursos = async () => {
      if (!session?.user?.id) return;
        try {
        // Obtener las carreras y cursos asignados al PEC
        const response = await fetch('/api/carreras-cursos', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('No se pudieron cargar las asignaciones');
        }
          const data = await response.json();
        setCarrerasCursos(data);

        // Obtener las estadísticas de los alumnos asignados
        try {
          const statsResponse = await fetch(`/api/estadisticas?pecId=${session.user.id}`, {
            credentials: 'include'
          });
            
          if (!statsResponse.ok) {
            throw new Error('No se pudieron cargar las estadísticas');
          }
            
          const statsData = await statsResponse.json();
          setAsistenciaStats(statsData);
        } catch (statsError) {
          console.error('Error al cargar estadísticas:', statsError);
          // Si falla, inicializamos con valores predeterminados
          setAsistenciaStats({
            totalAlumnos: 0,
            asistenciaMedia: 0,
            alumnosConProblemas: 0,
            alumnosGOE: 0
          });
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarrerasCursos();
  }, [session]);
  // El PEC no puede gestionar sus asignaciones, esta funcionalidad es exclusiva del admin

  const fullName = session?.user 
    ? `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim()
    : 'PEC';  return (
    <DashboardContainer roleName="PEC">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de bienvenida mejorado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaUserGraduate className="mr-3" /> 
                    Panel de Coordinación PEC
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            
            {/* Sección de bienvenida */}
            <div className="px-6 py-4 bg-white">
              <p className="text-gray-600">¡Bienvenido, {fullName}! Desde este panel podrás supervisar la asistencia de alumnos y gestionar alumnos con necesidades especiales.</p>
            </div>
          </div>

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <FaUserGraduate className="text-blue-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Total Alumnos</h3>
                  <p className="text-2xl font-bold text-blue-600">{asistenciaStats.totalAlumnos}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full mr-4">
                  <FaChartBar className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Asistencia Media</h3>
                  <p className="text-2xl font-bold text-green-600">{asistenciaStats.asistenciaMedia}%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full mr-4">
                  <FaClipboardList className="text-orange-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Problemas Asistencia</h3>
                  <p className="text-2xl font-bold text-orange-600">{asistenciaStats.alumnosConProblemas}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full mr-4">
                  <FaBriefcaseMedical className="text-purple-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Alumnos GOE</h3>
                  <p className="text-2xl font-bold text-purple-600">{asistenciaStats.alumnosGOE}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección de carreras y cursos asignados */}
          <div className="bg-white rounded-lg shadow-sm mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Carreras y Cursos Asignados</h2>
            </div>
            
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-r-2 border-b-0 border-l-0"></div>
                  <p className="mt-3 text-gray-600">Cargando asignaciones...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                  {error}
                </div>
              ) : carrerasCursos.length === 0 ? (
                <div className="text-center py-10">
                  <FaUniversity className="text-gray-300 text-5xl mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No tienes carreras o cursos asignados actualmente</p>
                  <p className="text-sm text-gray-400">Contacta con el administrador para solicitar asignaciones</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {carrerasCursos.map((asignacion) => (
                    <div 
                      key={asignacion.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-800 mb-2">{asignacion.carrera.denominacion}</h3>
                      <div className="flex justify-between items-center">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">
                          {asignacion.curso}º Curso
                        </span>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded ${asignacion.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {asignacion.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sección de acciones rápidas */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Acciones Rápidas</h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/pec/asistencia-alumnos" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <FaCalendarAlt className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Ver Asistencias</h3>
                  <p className="text-sm text-gray-500">Revisa las asistencias de los alumnos</p>
                </div>
              </Link>
              
              <Link href="/pec/alumnos-goe" className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors">
                <div className="p-3 bg-purple-100 rounded-full mr-4">
                  <FaBriefcaseMedical className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Gestión GOE</h3>
                  <p className="text-sm text-gray-500">Gestiona alumnos con necesidades especiales</p>
                </div>              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
