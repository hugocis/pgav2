'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaChartPie,
  FaBook,
  FaInfoCircle,
  FaUserFriends,
} from 'react-icons/fa';

// Interfaces para tipado
interface Docencia {
  id: number;
  fechaalta: string;
  fechaBaja: string | null;
  asignaturaId: number;
  profesorId: string;
  mostrar: boolean;
  createdAt: string;
  updatedAt: string;
  asignatura: {
    id: number;
    CodAsignatura: string;
    Denominacion: string;
    Curso: string;
    Cuatrimestre: string;
    carreraId: number;
    cursoAcademicoId: number;
    profesorId: string;
    createdAt: string;
    updatedAt: string;
    carrera: {
      id: number;
      denominacion: string;
      escuelaId: number;
      createdAt: string;
      updatedAt: string;
    };
    cursoAcademico: {
      id: number;
      activo: boolean;
      denominacion: string;
      cursoAnterior: string | null;
      cursoSiguiente: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
  user?: {
    id: string;
    name: string;
    surname1: string;
    surname2: string;
    email: string;
  };
  alumnosInscritos?: number;
  totalClases?: number;
  totalAsistencias?: number;
}

export default function ProfesorDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [docencias, setDocencias] = useState<Docencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCursoId, setCurrentCursoId] = useState<number | null>(null);
  const [cursosAcademicos, setCursosAcademicos] = useState<{ id: number, denominacion: string, activo: boolean }[]>([]);
  
  useEffect(() => {
    const fetchDocencias = async () => {
      try {
        setIsLoading(true);
        // Primero, obtener el curso académico actual
        const cursosResponse = await fetch('/api/cursos-academicos?activo=true', {
          credentials: 'include'
        });
        
        if (!cursosResponse.ok) {
          throw new Error('Error al obtener el curso académico activo');
        }
        
        const cursosData = await cursosResponse.json();
        setCursosAcademicos(cursosData);
        
        const cursoActivo = cursosData.find((curso: any) => curso.activo);
        const cursoActivoId = cursoActivo ? cursoActivo.id : (cursosData.length > 0 ? cursosData[0].id : null);
        setCurrentCursoId(cursoActivoId);
        
        // Obtener las docencias del profesor usando su ID
        if (session?.user?.id) {
          console.log('ID de usuario:', session.user.id);
          
          // Llamada a la API de docencia usando el ID del profesor
          const url = `/api/docencia/${session.user.id}`;
          console.log('Fetching docencias from:', url);
          
          const response = await fetch(url, {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            throw new Error(`Error al obtener las docencias: ${response.status} ${errorText}`);
          }
          
          const data = await response.json();
          console.log('Datos recibidos de la API:', data);
          
          // Procesamos los datos recibidos
          if (Array.isArray(data)) {
            // Obtenemos estadísticas para cada docencia
            const docenciasEnriquecidas = await Promise.all(data.map(async (docencia: Docencia) => {
              try {
                // En un caso real, aquí se harían las llamadas a las APIs para obtener
                // estadísticas reales de alumnos, clases y asistencias
                
                // Por ahora usamos datos de ejemplo, pero en una implementación real
                // se obtendrían de las APIs correspondientes
                return {
                  ...docencia,
                  // Estos valores serían reemplazados por los resultados de las APIs reales
                  alumnosInscritos: undefined, 
                  totalClases: undefined,
                  totalAsistencias: undefined
                };
              } catch (error) {
                console.error(`Error al obtener estadísticas para docencia ${docencia.id}:`, error);
                return docencia;
              }
            }));
            
            setDocencias(docenciasEnriquecidas);
          } else {
            console.log('La respuesta no es un array:', data);
            setDocencias([]);
          }
        } else {
          setDocencias([]);
        }
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchDocencias();
    }
  }, [session]);

  const fullName = session?.user ?
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() :
    'Profesor';

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de bienvenida */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaChalkboardTeacher className="mr-3" />
                    Bienvenido, {fullName}
                  </h1>
                  <p className="text-blue-100 text-sm">Portal del Profesor - Universidad Francisco de Vitoria</p>
                </div>
                <div className="bg-white/10 rounded-full p-3">
                  <FaChalkboardTeacher className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-gray-600">
                  Gestiona tus asignaturas, alumnos y lleva un seguimiento de la asistencia.
                </p>
                {cursosAcademicos.length > 0 && (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Curso académico:</span>
                    <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-sm font-medium">
                      {cursosAcademicos.find(curso => curso.id === currentCursoId)?.denominacion || ''}
                      {cursosAcademicos.find(curso => curso.id === currentCursoId)?.activo}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando tus docencias...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600 flex flex-col items-center">
                <FaInfoCircle className="text-3xl mb-2" />
                <p>{error}</p>
              </div>
            </div>
          ) : docencias.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center p-6 flex flex-col items-center">
                <FaBook className="text-5xl text-blue-200 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">No tienes clases asignadas</h2>
                <p className="text-gray-500 mt-2">
                  Todavía no tienes docencias asignadas para el curso académico {cursosAcademicos.find(curso => curso.id === currentCursoId)?.denominacion || 'actual'}.
                </p>
                <p className="text-gray-500 mt-1">
                  Cuando se te asignen clases, aparecerán aquí.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {docencias.map((docencia) => (
                <div key={docencia.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-100">                  {/* Cabecera de la tarjeta */}
                  <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-5 py-4 text-white">
                    <h3 className="font-semibold text-xl truncate">
                      {docencia.asignatura.Denominacion}
                    </h3>
                    <p className="text-blue-100 text-xs mt-1 truncate">
                      {docencia.asignatura.carrera.denominacion}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-blue-100 text-sm">
                        Curso {docencia.asignatura.cursoAcademico.denominacion} • {docencia.asignatura.Curso} 
                        {docencia.asignatura.Curso && docencia.asignatura.Curso.includes('º') ? ' Curso' : ''}
                        {docencia.asignatura.Cuatrimestre ? 
                          ` • ${docencia.asignatura.Cuatrimestre}${docencia.asignatura.Cuatrimestre.includes('º') ? ' Cuatrimestre' : ''}` 
                          : ''}
                      </p>
                      <span className="bg-white/20 text-white text-xs px-2 py-1 rounded">
                        {docencia.asignatura.CodAsignatura}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">

                    {/* Panel de estadísticas */}
                    <div className="flex mb-4 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 divide-x divide-gray-200">
                      <div className="flex-1 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {docencia.alumnosInscritos !== undefined ? docencia.alumnosInscritos : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">Alumnos</div>
                      </div>
                      <div className="flex-1 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {docencia.totalClases !== undefined ? docencia.totalClases : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">Clases</div>
                      </div>
                      <div className="flex-1 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {docencia.totalAsistencias !== undefined && docencia.totalClases && docencia.alumnosInscritos
                            ? `${Math.round((docencia.totalAsistencias / (docencia.totalClases * docencia.alumnosInscritos)) * 100)}%`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">Asistencia</div>
                      </div>
                    </div>                     <div className="flex flex-wrap gap-2 mt-5">
                      <Link
                        href={`/profesor/grupos?asignatura=${docencia.asignatura.id}`}
                        className="flex-1 bg-[#0D3C68] hover:bg-[#0a325a] text-white text-sm font-medium py-2.5 px-3 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaUserFriends className="mr-1.5" />
                        Grupos
                      </Link>                      <Link
                        href={`/profesor/alumnos?asignatura=${docencia.asignatura.id}`}
                        className="flex-1 bg-[#1e6ba8] hover:bg-[#185a8f] text-white text-sm font-medium py-2.5 px-3 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaUserGraduate className="mr-1.5" />
                        Alumnos
                      </Link>                      <Link
                        href={`/profesor/estadisticas?asignatura=${docencia.asignatura.id}`}
                        className="flex-1 bg-[#2d8fd5] hover:bg-[#2577b8] text-white text-sm font-medium py-2.5 px-3 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaChartPie className="mr-1.5" />
                        Estadísticas
                      </Link>
                    </div>
                      {/* Botón de pasar clase */}
                    <Link
                      href={`/profesor/pasar-clase/${docencia.id}`}
                      className="w-full mt-3 bg-[#0D3C68] hover:bg-[#072747] text-white text-sm font-medium py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                    >
                      <FaChalkboardTeacher className="mr-2" />
                      Pasar Asistencia
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
