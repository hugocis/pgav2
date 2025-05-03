'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import { FaUserFriends, FaPlus, FaTrash, FaSearch, FaArrowLeft, FaUsers, FaUserCog, FaSync } from 'react-icons/fa';
import Link from 'next/link';

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
  user: {
    id: string;
    name: string;
    surname1: string;
    surname2: string;
  };
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

export default function ProfesorGrupos() {
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
  const [alumnosAsignatura, setAlumnosAsignatura] = useState<Alumno[]>([]);
  const [todosLosAlumnosGrupo, setTodosLosAlumnosGrupo] = useState<AlumnoGrupo[]>([]);
  const [modalCrearGrupoAbierto, setModalCrearGrupoAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [grupoAEliminar, setGrupoAEliminar] = useState<Grupo | null>(null);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [searchTermAlumnos, setSearchTermAlumnos] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Cargar datos de la asignatura
  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;
    
    const fetchAsignaturaData = async () => {
      setIsLoading(true);
      setError(null);
      setDebugInfo('');
      
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
        setDebugInfo(prev => prev + `| Asignatura: ${asignaturaData.Denominacion}`);
        
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
        
        // Cargar grupos de la asignatura donde el profesor es el dueño
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
        setDebugInfo(prev => prev + `| Grupos cargados: ${gruposFiltrados.length}`);
        console.log("Grupos cargados:", gruposFiltrados);
          // Cargar alumnos de la asignatura específica
        const alumnosResponse = await fetch(`/api/alumnos-asignatura?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos de la asignatura');
        }
        
        const alumnosAsignaturaData = await alumnosResponse.json();
        console.log("Respuesta API alumnos-asignatura:", alumnosAsignaturaData);
        
        // Extraer alumnos de la asignatura (solo los matriculados en esta asignatura específica)
        let alumnosMatriculados = [];
        if (alumnosAsignaturaData && Array.isArray(alumnosAsignaturaData)) {
          alumnosMatriculados = alumnosAsignaturaData.map((matricula: any) => {
            if (matricula && matricula.user) {
              return matricula.user;
            }
            return null;
          }).filter((a: any) => a !== null);
          
          console.log("Alumnos matriculados en la asignatura:", alumnosMatriculados.length);
        }
        
        // Cargar las relaciones alumno-grupo solo para los grupos del profesor
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
        const alumnosGrupoProfesor = resultadosAlumnosGrupo.flat();
        setTodosLosAlumnosGrupo(alumnosGrupoProfesor);
        setDebugInfo(prev => prev + `| Alumnos-grupo cargados: ${alumnosGrupoProfesor.length}`);
          // Si no hay alumnos matriculados, intenta extraerlos de los alumnos-grupo
        if (alumnosMatriculados.length === 0) {
          console.log("No hay alumnos matriculados, extrayendo de los grupos...");
          // Extraer alumnos únicos a partir de los datos de alumnos-grupo
          const mapaAlumnos = new Map();
          alumnosGrupoProfesor.forEach(ag => {
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
        setDebugInfo(prev => prev + `| Alumnos cargados: ${alumnosMatriculados.length}`);
        console.log("Alumnos matriculados:", alumnosMatriculados.length);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchAsignaturaData();
  }, [asignaturaId, session?.user?.id]);

  const handleCrearGrupo = async () => {
    if (!nuevoGrupoNombre.trim() || !asignaturaId || !session?.user?.id) {
      return;
    }
    
    try {
      const response = await fetch('/api/grupos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          denominacion: nuevoGrupoNombre.trim(),
          asignaturaId,
          profesorId: session.user.id
        }),
      });
      
      if (!response.ok) {
        throw new Error('No se pudo crear el grupo');
      }
      
      const data = await response.json();
      setGrupos([...grupos, data.grupo]);
      setModalCrearGrupoAbierto(false);
      setNuevoGrupoNombre('');
    } catch (error) {
      console.error('Error al crear el grupo:', error);
      alert('Error al crear el grupo. Por favor, inténtalo de nuevo.');
    }
  };

  const handleEliminarGrupo = async () => {
    if (!grupoAEliminar) return;
    
    try {
      const response = await fetch(`/api/grupos/${grupoAEliminar.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('No se pudo eliminar el grupo');
      }
      
      // Actualizar la lista de grupos
      setGrupos(grupos.filter(g => g.id !== grupoAEliminar.id));
      
      // Actualizar la lista de alumnos-grupo
      setTodosLosAlumnosGrupo(todosLosAlumnosGrupo.filter(ag => ag.grupoId !== grupoAEliminar.id));
      
      setModalConfirmacionAbierto(false);
      setGrupoAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar el grupo:', error);
      alert('Error al eliminar el grupo. Por favor, inténtalo de nuevo.');
    }
  };

  const toggleAlumnoEnGrupo = async (alumnoId: string, grupoId: string) => {
    try {
      const alumnoYaEnGrupo = todosLosAlumnosGrupo.find(
        ag => ag.alumno_Id === alumnoId && ag.grupoId === grupoId
      );
      
      if (alumnoYaEnGrupo) {
        // Si el alumno ya está en el grupo, lo eliminamos
        const deleteResponse = await fetch(`/api/alumnos-grupo/${alumnoYaEnGrupo.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Error al eliminar al alumno del grupo');
        }
        
        // Actualizar localmente
        setTodosLosAlumnosGrupo(
          todosLosAlumnosGrupo.filter(ag => ag.id !== alumnoYaEnGrupo.id)
        );
      } else {
        // Si el alumno no está en el grupo, lo añadimos
        // Primero verificamos si el alumno está en otro grupo (para la misma asignatura)
        const alumnoEnOtroGrupo = todosLosAlumnosGrupo.find(
          ag => ag.alumno_Id === alumnoId && 
               grupos.some(g => g.id === ag.grupoId)
        );
        
        // Si está en otro grupo, lo eliminamos primero
        if (alumnoEnOtroGrupo) {
          const deleteResponse = await fetch(`/api/alumnos-grupo/${alumnoEnOtroGrupo.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          
          if (!deleteResponse.ok) {
            throw new Error('Error al eliminar al alumno de su grupo actual');
          }
          
          // Actualizar localmente
          setTodosLosAlumnosGrupo(
            todosLosAlumnosGrupo.filter(ag => ag.id !== alumnoEnOtroGrupo.id)
          );
        }
        
        // Añadir al alumno al nuevo grupo
        const addResponse = await fetch('/api/alumnos-grupo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            alumno_Id: alumnoId,
            grupoId: grupoId
          }),
        });
        
        if (!addResponse.ok) {
          throw new Error('Error al añadir el alumno al grupo');
        }
        
        // Actualizar localmente
        const nuevoAlumnoGrupo = await addResponse.json();
        setTodosLosAlumnosGrupo([...todosLosAlumnosGrupo, nuevoAlumnoGrupo]);
      }
    } catch (error) {
      console.error('Error al cambiar el estado del alumno en el grupo:', error);
      alert('Error al cambiar el estado del alumno en el grupo. Por favor, inténtalo de nuevo.');
    }
  };

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTermAlumnos
    ? alumnosAsignatura.filter(alumno => 
        alumno && `${alumno.surname1 || ''} ${alumno.name || ''}`.toLowerCase().includes(searchTermAlumnos.toLowerCase()) ||
        (alumno && alumno.email && alumno.email.toLowerCase().includes(searchTermAlumnos.toLowerCase()))
      )
    : alumnosAsignatura;

  // Verificar si un alumno está en un grupo específico
  const estaAlumnoEnGrupo = (alumnoId: string, grupoId: string) => {
    return todosLosAlumnosGrupo.some(ag => ag.alumno_Id === alumnoId && ag.grupoId === grupoId);
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
                      <FaUserFriends className="mr-3" />
                      Gestión de Grupos
                    </h1>
                  </div>
                  {asignatura && (
                    <p className="text-blue-100 mt-1">
                      {asignatura.Denominacion} - {asignatura.carrera?.denominacion || ''}
                    </p>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => setModalCrearGrupoAbierto(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center"
                  >
                    <FaPlus className="mr-2" /> 
                    Crear Nuevo Grupo
                  </button>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información de grupos...</p>
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
                    Asignación de Alumnos a Grupos
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
                  <p className="text-gray-500 mb-4">No hay alumnos para mostrar</p>
                  <div className="mt-2 p-3 bg-gray-100 text-xs text-left mx-auto max-w-2xl">
                    <p className="font-bold">Información de depuración:</p>
                    <p>{debugInfo || "No hay información de depuración disponible"}</p>
                    <p className="mt-2">Total de alumnos cargados: {alumnosAsignatura?.length || 0}</p>
                    <p>Total de grupos: {grupos?.length || 0}</p>
                    <p>Total de alumnos-grupo: {todosLosAlumnosGrupo?.length || 0}</p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                  >
                    Recargar página
                  </button>
                </div>
              ) : grupos.length === 0 ? (
                <div className="text-center py-10">
                  <FaUserFriends className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No hay grupos creados para esta asignatura</p>
                  <button
                    onClick={() => setModalCrearGrupoAbierto(true)}
                    className="bg-[#0D3C68] hover:bg-[#092a4a] text-white py-2 px-4 rounded-md font-medium"
                  >
                    Crear Primer Grupo
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumnos
                        </th>
                        {grupos.map(grupo => (
                          <th key={grupo.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-center">
                              <span className="mb-2">{grupo.denominacion}</span>
                              <div className="flex space-x-2">
                                <button 
                                  className="text-blue-600 hover:text-blue-800" 
                                  title="Asignar alumnos"
                                >
                                  <FaUserCog />
                                </button>
                                <button 
                                  onClick={() => {
                                    setGrupoAEliminar(grupo);
                                    setModalConfirmacionAbierto(true);
                                  }} 
                                  className="text-red-600 hover:text-red-800"
                                  title="Eliminar grupo"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alumnosFiltrados && alumnosFiltrados.map((alumno, index) => {
                        if (!alumno || !alumno.id) return null;
                        
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
                            {grupos.map(grupo => (
                              <td key={grupo.id} className="px-6 py-4 whitespace-nowrap text-center">
                                <button 
                                  onClick={() => toggleAlumnoEnGrupo(alumno.id, grupo.id)}
                                  className={`py-1 px-3 rounded-full text-xs font-medium ${estaAlumnoEnGrupo(alumno.id, grupo.id) 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                >
                                  {estaAlumnoEnGrupo(alumno.id, grupo.id) 
                                    ? 'Alumno matriculado' 
                                    : 'Alumno no matriculado'}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de crear grupo */}
      {modalCrearGrupoAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Crear Nuevo Grupo</h3>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label htmlFor="nombreGrupo" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  id="nombreGrupo"
                  value={nuevoGrupoNombre}
                  onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Grupo A, Grupo Mañana..."
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => setModalCrearGrupoAbierto(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearGrupo}
                className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#092a4a] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!nuevoGrupoNombre.trim()}
              >
                Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {modalConfirmacionAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold text-red-600">Confirmar Eliminación</h3>
            </div>
            <div className="p-5">
              {grupoAEliminar && (
                <p>
                  ¿Estás seguro de que deseas eliminar el grupo <strong>{grupoAEliminar.denominacion}</strong>?
                  Esta acción eliminará también todas las asignaciones de alumnos a este grupo y no se puede deshacer.
                </p>
              )}
            </div>
            <div className="p-3 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => {
                  setModalConfirmacionAbierto(false);
                  setGrupoAEliminar(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarGrupo}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
