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
  FaCalendarAlt,
} from 'react-icons/fa';
import { AlumnoGrupo } from '@prisma/client';

interface Grupo {
  id: number;
  profesorId: string;
}

interface Asistencia {
  alumnoId: string;
  estado?: string;
  estadoAsistencia?: {
    denominacion: string;
  };
}

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
  const { data: session } = useSession({
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

        const cursoActivo = cursosData.find((curso: { id: number, denominacion: string, activo: boolean }) => curso.activo);
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
                // Obtener los grupos de la asignatura
                const gruposResponse = await fetch(`/api/grupos?asignaturaId=${docencia.asignatura.id}`, {
                  credentials: 'include'
                });

                if (!gruposResponse.ok) {
                  throw new Error(`Error al obtener grupos para asignatura ${docencia.asignatura.id}`);
                }

                const gruposData = await gruposResponse.json();
                const grupos = (gruposData.grupos || []).filter((g: Grupo) => g.profesorId === session.user.id);

                // Recopilar datos de alumnos, sesiones y asistencias por cada grupo
                let totalAlumnos = 0;
                let totalSesiones = 0;
                let totalAsistenciasRegistradas = 0;
                let posiblesAsistencias = 0;

                // Mantener registro de alumnos ya contados para evitar duplicados
                const alumnosContados = new Set();

                // Procesar cada grupo
                await Promise.all(grupos.map(async (grupo: Grupo) => {                  // Obtener alumnos del grupo
                  const alumnosGrupoResponse = await fetch(`/api/alumnos-grupo?grupoId=${grupo.id}&skipPagination=true`, {
                    credentials: 'include'
                  });

                  if (alumnosGrupoResponse.ok) {
                    const alumnosGrupo = await alumnosGrupoResponse.json();
                    // Contar solo alumnos únicos usando sus IDs
                    if (Array.isArray(alumnosGrupo)) {
                      alumnosGrupo.forEach((alumnoGrupo: AlumnoGrupo) => {
                        if (alumnoGrupo.alumno_Id && !alumnosContados.has(alumnoGrupo.alumno_Id)) {
                          alumnosContados.add(alumnoGrupo.alumno_Id);
                          totalAlumnos++;
                        }
                      });
                    }
                  }

                  // Obtener sesiones de clase del grupo
                  const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
                    credentials: 'include'
                  });

                  if (sesionesResponse.ok) {
                    const sesiones = await sesionesResponse.json();
                    const numSesiones = Array.isArray(sesiones) ? sesiones.length : 0;
                    totalSesiones += numSesiones;
                    // Obtener asistencias para cada sesión
                    await Promise.all(sesiones.map(async (sesion: { id: string }) => {
                      const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
                        credentials: 'include'
                      });

                      if (asistenciasResponse.ok) {
                        const asistencias = await asistenciasResponse.json();
                        if (Array.isArray(asistencias)) {
                          // Filtrar asistencias solo para alumnos de este grupo
                          const asistenciasAlumno = asistencias.filter((a: Asistencia) => {
                            const esAlumnoDeGrupo = alumnosContados.has(a.alumnoId);
                            const asiste = a.estado === 'Asiste' ||
                              (a.estadoAsistencia && a.estadoAsistencia.denominacion === 'Asiste');
                            return esAlumnoDeGrupo && asiste;
                          });

                          totalAsistenciasRegistradas += asistenciasAlumno.length;
                        }
                      }
                    }));                    // Calcular posibles asistencias (número de alumnos * número de sesiones)
                    const alumnosDelGrupo = await fetch(`/api/alumnos-grupo?grupoId=${grupo.id}&skipPagination=true`, {
                      credentials: 'include'
                    }).then(res => res.ok ? res.json() : []);

                    const numAlumnosGrupo = Array.isArray(alumnosDelGrupo) ? alumnosDelGrupo.length : 0;
                    posiblesAsistencias += numAlumnosGrupo * numSesiones;
                  }
                }));

                // Calcular porcentaje de asistencia
                const porcentajeAsistencia = posiblesAsistencias > 0
                  ? Math.round((totalAsistenciasRegistradas / posiblesAsistencias) * 100)
                  : 0;

                return {
                  ...docencia,
                  alumnosInscritos: totalAlumnos,
                  totalClases: totalSesiones,
                  totalAsistencias: porcentajeAsistencia
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
                        {docencia.asignatura.Curso}
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

                    {/* Panel de estadísticas */}                    <div className="flex mb-4 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 divide-x divide-gray-200">
                      <div className="flex-1 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {docencia.alumnosInscritos !== undefined ? docencia.alumnosInscritos : "0"}
                        </div>
                        <div className="text-xs text-gray-500">Alumnos</div>
                      </div>
                      <div className="flex-1 p-3 text-center">
                        <div className="text-lg font-semibold text-gray-800">
                          {docencia.totalClases !== undefined ? docencia.totalClases : "0"}
                        </div>
                        <div className="text-xs text-gray-500">Clases</div>
                      </div>
                      <div className="flex-1 p-3 text-center">                        <div className="flex flex-col items-center">
                        <div className={`text-lg font-semibold ${docencia.totalAsistencias !== undefined
                            ? docencia.totalAsistencias >= 80
                              ? 'text-green-700'
                              : docencia.totalAsistencias >= 50
                                ? 'text-yellow-700'
                                : 'text-red-700'
                            : 'text-gray-800'
                          }`}>
                          {docencia.totalAsistencias !== undefined ? `${docencia.totalAsistencias}%` : "0%"}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${docencia.totalAsistencias !== undefined
                                ? docencia.totalAsistencias >= 80
                                  ? 'bg-green-500'
                                  : docencia.totalAsistencias >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                : 'bg-gray-300'
                              }`}
                            style={{ width: `${docencia.totalAsistencias || 0}%` }}>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Asistencia</div>
                      </div>
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
                        Alumnos                      </Link>                      <Link
                          href={`/profesor/estadisticas?asignatura=${docencia.asignatura.id}`}
                          className="flex-1 bg-[#2d8fd5] hover:bg-[#2577b8] text-white text-sm font-medium py-2.5 px-3 rounded-md flex items-center justify-center transition-colors"
                        >
                        <FaChartPie className="mr-1.5" />
                        Estadísticas
                      </Link>                    </div>
                    {/* Botones de asistencia */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Link
                        href={`/profesor/pasar-clase?asignatura=${docencia.asignatura.id}`}
                        className="bg-[#0D3C68] hover:bg-[#072747] text-white text-sm font-medium py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaChalkboardTeacher className="mr-2" />
                        Pasar Asistencia
                      </Link>
                      <Link
                        href={`/profesor/historial-sesiones?asignatura=${docencia.asignatura.id}`}
                        className="bg-[#2d8fd5] hover:bg-[#2577b8] text-white text-sm font-medium py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaCalendarAlt className="mr-2" />
                        Historial
                      </Link>
                    </div>
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
