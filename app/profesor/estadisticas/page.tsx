'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { FaChartPie, FaSearch, FaArrowLeft, FaSync, FaCalendarAlt, FaCheck, FaTimes, FaUserGraduate } from 'react-icons/fa';

// Interfaces para el tipado
interface Asignatura {
  id: string;
  CodAsignatura: string;
  Denominacion: string;
  Curso: string;
  Cuatrimestre: string;
  carrera: {
    denominacion: string;
  };
}

interface Grupo {
  id: string;
  denominacion: string;
  asignatura: Asignatura;
  profesorId: string;
}

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2: string;
  email: string;
}

interface SesionClase {
  id: string;
  fecha: Date;
  grupo: Grupo;
  grupoId: string;
}

interface AsistenciaAlumno {
  id: string;
  alumnoId: string;
  sesionClaseId: string;
  estado: string;
  estadoAsistenciaId: string;
  estadoAsistencia: {
    denominacion: string;
  };
  user: Alumno;
}

export default function ProfesorEstadisticas() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const asignaturaId = searchParams.get('asignatura');

  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaAlumno[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadosAsistencia, setEstadosAsistencia] = useState<Map<string, string>>(new Map());

  // Cargar datos iniciales
  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener detalles de la asignatura
        const asignaturaResponse = await fetch(`/api/asignaturas/${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!asignaturaResponse.ok) {
          throw new Error('No se pudo cargar la información de la asignatura');
        }
        
        const asignaturaData = await asignaturaResponse.json();
        setAsignatura(asignaturaData);
        
        // Verificar si el profesor tiene acceso a esta asignatura
        if (asignaturaData.profesorId !== session.user.id) {
          const docenciaResponse = await fetch(`/api/docencia?asignaturaId=${asignaturaId}&profesorId=${session.user.id}`, {
            credentials: 'include'
          });
          
          if (!docenciaResponse.ok || (await docenciaResponse.json()).length === 0) {
            setError('No tienes permisos para ver esta asignatura');
            setIsLoading(false);
            return;
          }
        }
        
        // Cargar grupos de la asignatura
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error('No se pudieron cargar los grupos');
        }
        
        const gruposData = await gruposResponse.json();
        // Filtrar solo los grupos donde el profesor es el dueño
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => grupo.profesorId === session.user.id);
        setGrupos(gruposFiltrados);
        
        // Si hay grupos disponibles, seleccionar el primero por defecto
        if (gruposFiltrados.length > 0) {
          setGrupoSeleccionado(gruposFiltrados[0].id);
        }
        
        // Cargar alumnos de la asignatura
        const alumnosResponse = await fetch(`/api/alumnos-asignatura?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos de la asignatura');
        }
        
        const alumnosData = await alumnosResponse.json();
        
        // Extraer alumnos de la asignatura
        let alumnosMatriculados = [];
        if (alumnosData && Array.isArray(alumnosData)) {
          alumnosMatriculados = alumnosData.map((matricula: any) => {
            if (matricula && matricula.user) {
              return matricula.user;
            }
            return null;
          }).filter((a: any) => a !== null);
        }
        
        // Ordenar los alumnos por apellido y nombre
        alumnosMatriculados.sort((a: Alumno, b: Alumno) => {
          const apellidoA = a.surname1 || '';
          const apellidoB = b.surname1 || '';
          return apellidoA.localeCompare(apellidoB) || a.name.localeCompare(b.name);
        });
        
        setAlumnos(alumnosMatriculados);
        
        // Cargar los estados de asistencia disponibles
        const estadosAsistenciaResponse = await fetch('/api/estados-asistencia', {
          credentials: 'include'
        });
        
        if (!estadosAsistenciaResponse.ok) {
          console.warn('No se pudieron cargar los estados de asistencia');
        } else {
          const estadosData = await estadosAsistenciaResponse.json();
          const mapaEstados = new Map();
          
          estadosData.forEach((estado: any) => {
            mapaEstados.set(estado.id, estado.denominacion);
          });
          
          setEstadosAsistencia(mapaEstados);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [asignaturaId, session?.user?.id]);

  // Cargar sesiones y asistencias cuando se selecciona un grupo
  useEffect(() => {
    if (!grupoSeleccionado) return;
    
    const fetchSesionesYAsistencias = async () => {
      setIsLoading(true);
      
      try {
        // Cargar las sesiones de clase del grupo seleccionado
        const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupoSeleccionado}`, {
          credentials: 'include'
        });
        
        if (!sesionesResponse.ok) {
          throw new Error('No se pudieron cargar las sesiones de clase');
        }
        
        const sesionesData = await sesionesResponse.json();
        
        // Ordenar sesiones por fecha (más reciente primero)
        const sesionesOrdenadas = sesionesData.sort((a: SesionClase, b: SesionClase) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        
        setSesiones(sesionesOrdenadas);
        
        // Cargar todas las asistencias para estas sesiones
        const promesasAsistencias = sesionesOrdenadas.map((sesion: SesionClase) =>
          fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
            credentials: 'include'
          })
            .then(response => {
              if (!response.ok) return [];
              return response.json();
            })
            .catch(error => {
              console.error(`Error al cargar asistencias para la sesión ${sesion.id}:`, error);
              return [];
            })
        );
        
        const resultadosAsistencias = await Promise.all(promesasAsistencias);
        const todasLasAsistencias = resultadosAsistencias.flat();
        
        setAsistencias(todasLasAsistencias);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar sesiones y asistencias:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchSesionesYAsistencias();
  }, [grupoSeleccionado]);

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTerm
    ? alumnos.filter(alumno => 
        alumno && (
          `${alumno.surname1 || ''} ${alumno.surname2 || ''} ${alumno.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (alumno.email && alumno.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
    : alumnos;

  // Obtener el estado de asistencia de un alumno para una sesión específica
  const getEstadoAsistencia = (alumnoId: string, sesionId: string) => {
    const asistenciaAlumno = asistencias.find(
      a => a.alumnoId === alumnoId && a.sesionClaseId === sesionId
    );
    
    if (!asistenciaAlumno) return 'Sin registro';
    
    return asistenciaAlumno.estadoAsistencia?.denominacion || asistenciaAlumno.estado || 'Sin registro';
  };
  
  // Formatear fecha para mostrar
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Obtener el color de fondo según el estado de asistencia
  const getEstadoBackgroundColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'asiste':
        return 'bg-green-100 text-green-800';
      case 'no asiste':
        return 'bg-red-100 text-red-800';
      case '50%':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispensado':
        return 'bg-blue-100 text-blue-800';
      case 'erasmus t':
        return 'bg-purple-100 text-purple-800';
      case 'erasmus nt':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/profesor/dashboard" className="mr-3 text-white hover:text-blue-200 transition">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaChartPie className="mr-3" />
                      Estadísticas de Asistencia
                    </h1>
                  </div>
                  {asignatura && (
                    <p className="text-blue-100 mt-1">
                      {asignatura.Denominacion} - {asignatura.carrera?.denominacion || ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando estadísticas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
                <Link href="/profesor/dashboard" className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md">
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <FaUserGraduate className="mr-2" />
                    Matriz de Asistencia
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar alumnos..."
                        className="pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="p-1 rounded text-gray-500 hover:bg-gray-100"
                      title="Recargar datos"
                    >
                      <FaSync />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  {grupos.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <label htmlFor="grupoSelect" className="font-medium text-gray-700">
                        Seleccionar Grupo:
                      </label>
                      <select
                        id="grupoSelect"
                        value={grupoSeleccionado}
                        onChange={(e) => setGrupoSeleccionado(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        {grupos.map((grupo) => (
                          <option key={grupo.id} value={grupo.id}>
                            {grupo.denominacion}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No hay grupos disponibles para esta asignatura.</p>
                  )}
                </div>
              </div>

              {!grupoSeleccionado ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">Selecciona un grupo para ver las estadísticas</p>
                </div>
              ) : sesiones.length === 0 ? (
                <div className="text-center py-10">
                  <FaCalendarAlt className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No hay sesiones de clase registradas para este grupo</p>
                  <Link 
                    href={`/profesor/pasar-clase/${asignatura?.id}?grupo=${grupoSeleccionado}`}
                    className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md"
                  >
                    Registrar Asistencia
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumno
                        </th>
                        {sesiones.map((sesion) => (
                          <th key={sesion.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-center min-w-[120px]">
                              <span>{formatDate(sesion.fecha)}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alumnosFiltrados.map((alumno, index) => {
                        if (!alumno || !alumno.id) return null;
                        
                        return (
                          <tr key={alumno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap bg-inherit">
                              <div className="flex items-start">
                                <span className="font-medium text-gray-900 mr-2">
                                  {index + 1}.-
                                </span>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {alumno.surname1 ? `${alumno.surname1}${alumno.surname2 ? ` ${alumno.surname2}` : ''}, ${alumno.name}` : alumno.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {alumno.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {sesiones.map((sesion) => {
                              const estado = getEstadoAsistencia(alumno.id, sesion.id);
                              const bgColorClass = getEstadoBackgroundColor(estado);
                              
                              return (
                                <td key={`${alumno.id}-${sesion.id}`} className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${bgColorClass}`}>
                                    {estado}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Leyenda:</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Asiste</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">No Asiste</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">50%</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Dispensado</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Erasmus T</span>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-800">Erasmus NT</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
