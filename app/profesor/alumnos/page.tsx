'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { FaUserGraduate, FaSearch, FaArrowLeft, FaSync, FaCheck, FaTimes, FaInfoCircle } from 'react-icons/fa';

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
  profesorId?: string;
}

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2: string;
  email: string;
  username?: string;
}

interface AlumnoGrupo {
  id: string;
  alumno_Id: string;
  grupoId: string;
  user: Alumno;
  grupo: Grupo;
}

interface AsistenciaAlumno {
  id: string;
  fecha: string;
  estado: string;
  alumnoId: string;
  sesionClaseId: string;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
}

interface EstadisticasAsistencia {
  alumnoId: string;
  totalSesiones: number;
  asistencias: number;
  porcentaje: number;
}

export default function ProfesorAlumnos() {
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
  const [alumnosAsignatura, setAlumnosAsignatura] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alumnosGrupo, setAlumnosGrupo] = useState<AlumnoGrupo[]>([]);
  const [sesionesClase, setSesionesClase] = useState<SesionClase[]>([]);
  const [asistenciasAlumnos, setAsistenciasAlumnos] = useState<AsistenciaAlumno[]>([]);
  const [estadisticasAsistencia, setEstadisticasAsistencia] = useState<Map<string, EstadisticasAsistencia>>(new Map());
  const [searchTermAlumnos, setSearchTermAlumnos] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos de la asignatura y alumnos
  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;
    
    const fetchAsignaturaData = async () => {
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
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => grupo.profesorId === session.user.id);
        setGrupos(gruposFiltrados);

        // Cargar alumnos de la asignatura
        const alumnosResponse = await fetch(`/api/alumnos-asignatura?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos de la asignatura');
        }
        
        const alumnosAsignaturaData = await alumnosResponse.json();
        
        // Extraer alumnos de la asignatura
        let alumnosMatriculados = [];
        if (alumnosAsignaturaData && Array.isArray(alumnosAsignaturaData)) {
          alumnosMatriculados = alumnosAsignaturaData.map((matricula: any) => {
            if (matricula && matricula.user) {
              return matricula.user;
            }
            return null;
          }).filter((a: any) => a !== null);
        }
        
        // Cargar relaciones alumno-grupo
        const promesasAlumnosGrupo = gruposFiltrados.map((grupo: Grupo) => 
          fetch(`/api/alumnos-grupo?grupoId=${grupo.id}`, { credentials: 'include' })
            .then(response => {
              if (!response.ok) return [];
              return response.json();
            })
            .catch(error => {
              console.error(`Error al cargar alumnos del grupo ${grupo?.denominacion || grupo.id}:`, error);
              return [];
            })
        );
        
        const resultadosAlumnosGrupo = await Promise.all(promesasAlumnosGrupo);
        const alumnosGrupoData = resultadosAlumnosGrupo.flat();
        setAlumnosGrupo(alumnosGrupoData);
        
        // Si no hay alumnos matriculados, extraerlos de los alumnos-grupo
        if (alumnosMatriculados.length === 0) {
          const mapaAlumnos = new Map();
          alumnosGrupoData.forEach((ag: AlumnoGrupo) => {
            if (ag && ag.user && ag.user.id) {
              mapaAlumnos.set(ag.user.id, ag.user);
            }
          });
          alumnosMatriculados = Array.from(mapaAlumnos.values()) as Alumno[];
        }
        
        // Ordenar los alumnos por apellido y nombre
        alumnosMatriculados.sort((a: Alumno, b: Alumno) => {
          const apellidoA = a.surname1 || '';
          const apellidoB = b.surname1 || '';
          return apellidoA.localeCompare(apellidoB) || a.name.localeCompare(b.name);
        });
        
        setAlumnosAsignatura(alumnosMatriculados);
        
        // Cargar sesiones de clase para todos los grupos
        const promesasSesionesClase = gruposFiltrados.map((grupo: Grupo) =>
          fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, { credentials: 'include' })
            .then(response => {
              if (!response.ok) return [];
              return response.json();
            })
            .catch(error => {
              console.error(`Error al cargar sesiones de clase del grupo ${grupo?.denominacion || grupo.id}:`, error);
              return [];
            })
        );
        
        const resultadosSesionesClase = await Promise.all(promesasSesionesClase);
        const sesionesClaseData = resultadosSesionesClase.flat();
        setSesionesClase(sesionesClaseData);
        
        // Cargar asistencias para todos los alumnos
        const promesasAsistencias = sesionesClaseData.map((sesion: SesionClase) =>
          fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, { credentials: 'include' })
            .then(response => {
              if (!response.ok) return [];
              return response.json();
            })
            .catch(error => {
              console.error(`Error al cargar asistencias de la sesión ${sesion.id}:`, error);
              return [];
            })
        );
        
        const resultadosAsistencias = await Promise.all(promesasAsistencias);
        const asistenciasData = resultadosAsistencias.flat();
        setAsistenciasAlumnos(asistenciasData);
        
        // Calcular estadísticas de asistencia para cada alumno
        const estadisticas = new Map<string, EstadisticasAsistencia>();
        
        alumnosMatriculados.forEach((alumno: Alumno) => {
          // Encontrar el grupo al que pertenece el alumno
          const alumnoGrupoRelacion = alumnosGrupoData.find((ag: AlumnoGrupo) => ag.alumno_Id === alumno.id);
          
          if (alumnoGrupoRelacion) {
            const grupoId = alumnoGrupoRelacion.grupoId;
            // Contar sesiones del grupo
            const sesionesGrupo = sesionesClaseData.filter((sesion: SesionClase) => sesion.grupoId === grupoId);
            const totalSesiones = sesionesGrupo.length;
            
            // Contar asistencias del alumno
            const asistenciasAlumno = asistenciasData.filter(
              (asistencia: AsistenciaAlumno) => 
                asistencia.alumnoId === alumno.id && 
                asistencia.estado === "Asiste"
            );
            
            const numAsistencias = asistenciasAlumno.length;
            const porcentaje = totalSesiones > 0 ? (numAsistencias / totalSesiones) * 100 : 0;
            
            estadisticas.set(alumno.id, {
              alumnoId: alumno.id,
              totalSesiones,
              asistencias: numAsistencias,
              porcentaje
            });
          } else {
            // Si el alumno no tiene grupo asignado, mostrar estadísticas en cero
            estadisticas.set(alumno.id, {
              alumnoId: alumno.id,
              totalSesiones: 0,
              asistencias: 0,
              porcentaje: 0
            });
          }
        });
        
        setEstadisticasAsistencia(estadisticas);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchAsignaturaData();
  }, [asignaturaId, session?.user?.id]);

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTermAlumnos
    ? alumnosAsignatura.filter(alumno => 
        alumno && `${alumno.surname1 || ''} ${alumno.name || ''}`.toLowerCase().includes(searchTermAlumnos.toLowerCase()) ||
        (alumno && alumno.email && alumno.email.toLowerCase().includes(searchTermAlumnos.toLowerCase()))
      )
    : alumnosAsignatura;

  // Obtener grupo de un alumno
  const getGrupoAlumno = (alumnoId: string) => {
    const alumnoGrupo = alumnosGrupo.find(ag => ag.alumno_Id === alumnoId);
    if (alumnoGrupo) {
      const grupo = grupos.find(g => g.id === alumnoGrupo.grupoId);
      return grupo ? grupo.denominacion : 'Sin grupo';
    }
    return 'Sin grupo';
  };

  // Obtener estadísticas de asistencia de un alumno
  const getEstadisticasAlumno = (alumnoId: string) => {
    return estadisticasAsistencia.get(alumnoId) || {
      alumnoId,
      totalSesiones: 0,
      asistencias: 0,
      porcentaje: 0
    };
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
                      <FaUserGraduate className="mr-3" />
                      Asistencia de Alumnos
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
                <p className="mt-2 text-gray-600">Cargando información de alumnos...</p>
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
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">
                    Listado de Alumnos y Asistencia
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {alumnosAsignatura?.length || 0} alumnos matriculados
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
                <div className="mt-4 w-full max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar alumnos por nombre o apellido..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={searchTermAlumnos}
                      onChange={(e) => setSearchTermAlumnos(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {!alumnosAsignatura || alumnosAsignatura.length === 0 ? (
                <div className="text-center py-10">
                  <FaInfoCircle className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No hay alumnos matriculados en esta asignatura</p>
                  <Link href="/profesor/dashboard" className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md">
                    Volver al Dashboard
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumno
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grupo
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Asistencia
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sesiones Asistidas
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Sesiones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alumnosFiltrados.map((alumno, index) => {
                        if (!alumno || !alumno.id) return null;
                        const estadisticas = getEstadisticasAlumno(alumno.id);
                        const porcentaje = estadisticas.porcentaje;
                        
                        return (
                          <tr key={alumno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {getGrupoAlumno(alumno.id)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      porcentaje >= 80 ? 'bg-green-500' : 
                                      porcentaje >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`} 
                                    style={{ width: `${porcentaje}%` }}>
                                  </div>
                                </div>
                                <span className="ml-2 text-sm font-medium text-gray-700">
                                  {porcentaje.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm text-gray-900">{estadisticas.asistencias}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm text-gray-900">{estadisticas.totalSesiones}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Información sobre asistencia actualizada con las sesiones registradas.
                  </div>
                  <Link href="/profesor/dashboard" className="px-4 py-2 bg-[#0D3C68] text-white rounded-md text-sm hover:bg-[#092a4a] transition-colors">
                    Volver al Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
