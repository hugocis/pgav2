'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import { FaUserFriends, FaPlus, FaTrash, FaSearch, FaArrowLeft, FaSync } from 'react-icons/fa';
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
  esGrupoPredefinido?: boolean; // Para indicar si es un grupo creado por el sistema o por el profesor
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

interface Matricula {
  id: string;
  alumno_id: string;
  asignaturaId: string;
  user: Alumno;
}

export default function ProfesorGrupos() {
  const { data: session } = useSession({
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
  const [alumnosAsignatura, setAlumnosAsignatura] = useState<Alumno[]>([]);  const [todosLosAlumnosGrupo, setTodosLosAlumnosGrupo] = useState<AlumnoGrupo[]>([]);
  const [modalCrearGrupoAbierto, setModalCrearGrupoAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [modalEditarGrupoAbierto, setModalEditarGrupoAbierto] = useState(false);
  const [grupoAEliminar, setGrupoAEliminar] = useState<Grupo | null>(null);
  const [grupoAEditar, setGrupoAEditar] = useState<Grupo | null>(null);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [nombreEditadoGrupo, setNombreEditadoGrupo] = useState('');
  const [searchTermAlumnos, setSearchTermAlumnos] = useState('');  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

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
        }          // Load groups from the subject where the teacher is the owner
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error('Could not load groups');
        }
        
        const gruposData = await gruposResponse.json();        // Filter only groups where the teacher is the owner
        let gruposFiltrados = [];
        if (gruposData && gruposData.grupos && Array.isArray(gruposData.grupos)) {
          gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => grupo.profesorId === session.user.id);
        } else {
          console.error('Incorrect groups response format:', gruposData);
        }
          // Marcar grupos predefinidos (Grupo A, Grupo B, etc.) o los que tienen ID menor o igual a 100
        gruposFiltrados = gruposFiltrados.map((grupo: Grupo) => {
          // Es un grupo predefinido si:          // 1. Its name is exactly "GRUPO A", "GRUPO B", "GRUPO A INGLÉS", or "GRUPO B INGLÉS"
          // 2. Or if its ID is less than or equal to 100
          const nombreMayusculas = grupo.denominacion.toUpperCase();
          const esGrupoPredefinidoExacto = ["GRUPO A", "GRUPO B", "GRUPO A INGLÉS", "GRUPO B INGLÉS"].includes(nombreMayusculas);
          const esGrupoConIdPredefinido = (parseInt(grupo.id) <= 100);
          
          const esPredefinido = esGrupoPredefinidoExacto || esGrupoConIdPredefinido;
          return {
            ...grupo,
            esGrupoPredefinido: esPredefinido
          };
        });
          setGrupos(gruposFiltrados);
        setDebugInfo(prev => prev + `| Groups loaded: ${gruposFiltrados.length}`);
          // Load students from the specific subject
        const alumnosResponse = await fetch(`/api/alumnos-asignatura?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos de la asignatura');        }        const alumnosAsignaturaData = await alumnosResponse.json();
        // Extract students from the subject (only those enrolled in this specific subject)
        let alumnosMatriculados: Alumno[] = [];
        if (alumnosAsignaturaData && Array.isArray(alumnosAsignaturaData)) {
          alumnosMatriculados = alumnosAsignaturaData.map((matricula: Matricula) => {
            if (matricula && matricula.user) {
              return matricula.user;
            }            return null;
          }).filter((a: Alumno | null) => a !== null);
          
        }          // Load student-group relationships only for the teacher's groups
        const promesasAlumnosGrupo = gruposFiltrados.map((grupo: Grupo) => 
          fetch(`/api/alumnos-grupo?grupoId=${grupo.id}&skipPagination=true`, { credentials: 'include' })
            .then(response => {
              if (!response.ok) return [];
              return response.json().then(result => {                // With skipPagination=true the API now returns the array directly
                if (Array.isArray(result)) {
                  return result;
                } 
                // To maintain compatibility, we also check the previous format
                else if (result && result.data && Array.isArray(result.data)) {
                  return result.data;
                } else {
                  console.error(`Formato inesperado en respuesta de alumnos-grupo:`, result);
                  return [];
                }
              });
            })
            .catch(error => {
              console.error(`Error al cargar alumnos del grupo ${grupo?.denominacion || grupo.id}:`, error);
              return [];
            })
        );
        
        const resultadosAlumnosGrupo = await Promise.all(promesasAlumnosGrupo);
        const alumnosGrupoProfesor = resultadosAlumnosGrupo.flat();
        setTodosLosAlumnosGrupo(alumnosGrupoProfesor);
        if (alumnosAsignatura.length > 0) { 
        setDebugInfo(prev => prev + `| Alumnos-grupo cargados: ${alumnosGrupoProfesor.length}`);// Si no hay alumnos matriculados, intenta extraerlos de los alumnos-grupo        if (alumnosMatriculados.length === 0) {
          // Extract unique students from student-group data
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
        setDebugInfo(prev => prev + `| Students loaded: ${alumnosMatriculados.length}`);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        // Show success notification
      setNotification({
        message: `Group "${nuevoGrupoNombre.trim()}" created successfully!`,
        type: 'success'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group. Please try again.');
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
        const nombreGrupoEliminado = grupoAEliminar.denominacion;
      
      setModalConfirmacionAbierto(false);
      setGrupoAEliminar(null);
        // Show success notification
      setNotification({
        message: `Group "${nombreGrupoEliminado}" deleted successfully`,
        type: 'success'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Error deleting group. Please try again.');
    }
  };  const toggleAlumnoEnGrupo = async (alumnoId: string, grupoId: string) => {
    try {
      const alumnoYaEnGrupo = todosLosAlumnosGrupo.find(
        ag => ag.alumno_Id === alumnoId && ag.grupoId === grupoId
      );
        if (alumnoYaEnGrupo) {
        // If the student is already in the group, remove them
        const deleteResponse = await fetch(`/api/alumnos-grupo/${alumnoYaEnGrupo.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (!deleteResponse.ok) {
          throw new Error('Error removing student from group');
        }
        
        // Update locally
        setTodosLosAlumnosGrupo(
          todosLosAlumnosGrupo.filter(ag => ag.id !== alumnoYaEnGrupo.id)
        );
        
        setNotification({
          message: 'Student successfully removed from group',
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
      } else {        // If the student is not in the group, add them directly
        // We no longer remove the student from other groups, allowing them to be in multiple groups
        
        // Add the student to the selected group
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
          const errorData = await addResponse.json();
          console.error('Error al añadir alumno al grupo:', errorData);          throw new Error(errorData.error || 'Error adding student to group');
        }
        
        // Update locally - the API could return the object directly or inside a property
        const respuestaJson = await addResponse.json();
        const nuevoAlumnoGrupo = respuestaJson.data || respuestaJson;
        
        setTodosLosAlumnosGrupo([...todosLosAlumnosGrupo, nuevoAlumnoGrupo]);
        
        setNotification({
          message: 'Student added to group successfully',
          type: 'success'
        });
        setTimeout(() => setNotification(null), 3000);
      }    } catch (error) {
      console.error('Error changing student status in group:', error);
      setNotification({
        message: error instanceof Error ? error.message : 'Error changing student status in group',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    }  };// Function to edit a group's name
  const handleEditarGrupo = async () => {
    if (!grupoAEditar || !nombreEditadoGrupo.trim()) return;
      try {
      // Inspect the group object we're going to edit
      const response = await fetch(`/api/grupos/${grupoAEditar.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          denominacion: nombreEditadoGrupo.trim(),
          asignaturaId: grupoAEditar.asignatura.id,
          profesorId: grupoAEditar.profesorId
        }),
      });
        if (!response.ok) {
        throw new Error('Could not update group name');
      }        // Update locally
      const grupoActualizado = await response.json();
        // Make sure the name is assigned correctly
      const nuevaDenominacion = nombreEditadoGrupo.trim();
      
      // Make sure all important properties are preserved, including esGrupoPredefinido
      const grupoConPropiedadesPreservadas = {
        ...grupoAEditar,
        ...grupoActualizado,
        // Force the explicit update of the denomination
        denominacion: nuevaDenominacion,
        // Ensure esGrupoPredefinido is preserved
        esGrupoPredefinido: grupoAEditar.esGrupoPredefinido
      };
        // Create a new copy of the groups array with the updated group
      const gruposActualizados = grupos.map(g => 
        g.id === grupoAEditar.id ? grupoConPropiedadesPreservadas : g
      );
        // Update state with the new array
      setGrupos(gruposActualizados);
        // Clean up state after completing the edit
      setModalEditarGrupoAbierto(false);
      setGrupoAEditar(null);
      setNombreEditadoGrupo('');
        // Show success notification
      setNotification({
        message: `Group "${nuevaDenominacion}" updated successfully!`,
        type: 'success'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Error editing group:', error);
      alert('Error editing group name. Please try again.');
    }  };  // Helper function to check if a student is in a specific group
  const estaAlumnoEnGrupo = (alumnoId: string, grupoId: string): boolean => {
    return todosLosAlumnosGrupo.some(
      ag => ag.alumno_Id === alumnoId && ag.grupoId === grupoId
    );
  };
  // Filter students by search term
  const alumnosFiltrados = searchTermAlumnos
    ? alumnosAsignatura.filter(alumno => 
        alumno && `${alumno.surname1 || ''} ${alumno.name || ''}`.toLowerCase().includes(searchTermAlumnos.toLowerCase()) ||
        (alumno && alumno.email && alumno.email.toLowerCase().includes(searchTermAlumnos.toLowerCase()))
      )
    : alumnosAsignatura;
  return (
    <DashboardContainer roleName="Profesor">      {/* Success notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
        } transform transition-all duration-500 ease-in-out animate-fadeIn opacity-90 hover:opacity-100`}>
          <div className="flex items-center">
            {notification.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {notification.type === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 min-h-full pb-8">        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link 
                      href="/profesor/dashboard" 
                      className="mr-3 text-white hover:text-blue-200 transition"
                    >
                      <FaArrowLeft />
                    </Link>
                    <div>
                      <h1 className="text-2xl font-semibold flex items-center">
                        <FaUserFriends className="mr-2 text-white" />
                        Gestión de Grupos
                      </h1>
                      {asignatura && (
                        <p className="text-blue-100 mt-1 flex items-center text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span className="text-white font-medium">{asignatura.Denominacion}</span>
                          <span className="mx-1 text-blue-200">•</span>
                          <span>{asignatura.carrera?.denominacion || ''}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setModalCrearGrupoAbierto(true)}
                  className="bg-blue-700 hover:bg-blue-800 text-white py-2 px-4 rounded-lg 
                    flex items-center transition text-sm"
                >
                  <FaPlus className="mr-1" /> 
                  Crear Grupo
                </button>
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
              </div>              {!alumnosAsignatura || alumnosAsignatura.length === 0 ? (
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
                          <th key={grupo.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">                            <div className="flex flex-col items-center">                              <div className="mb-2 font-semibold text-sm">
                                <span className={grupo.esGrupoPredefinido 
                                  ? "text-[#2c7be5]" 
                                  : "text-emerald-600"
                                }>
                                  {/* Mostrar denominación explícitamente para evitar problemas de actualización */}
                                  {grupo?.denominacion || ''}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                {/* Solo mostrar botón de editar para grupos creados por el profesor */}
                                {!grupo.esGrupoPredefinido && (
                                  <button 
                                    onClick={() => {
                                      setGrupoAEditar(grupo);
                                      setNombreEditadoGrupo(grupo.denominacion);
                                      setModalEditarGrupoAbierto(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-100 rounded-full transition-colors"
                                    title="Editar nombre del grupo"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                
                                {/* Solo mostrar botón de eliminar para grupos creados por el profesor */}
                                {!grupo.esGrupoPredefinido && (
                                  <button 
                                    onClick={() => {
                                      setGrupoAEliminar(grupo);
                                      setModalConfirmacionAbierto(true);
                                    }} 
                                    className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-100 rounded-full transition-colors"
                                    title="Eliminar grupo"
                                  >
                                    <FaTrash className="h-4 w-4" />
                                  </button>
                                )}
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
                              <div className="flex items-center">
                                <div 
                                  className="flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center font-medium text-white shadow-sm"
                                  style={{ 
                                    backgroundColor: '#2c7be5' 
                                  }}
                                >
                                  {(alumno.name?.charAt(0) || '') + (alumno.surname1?.charAt(0) || '')}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {alumno.surname1 ? `${alumno.surname1}${alumno.surname2 ? ` ${alumno.surname2}` : ''}, ${alumno.name}` : alumno.name}
                                  </div>
                                  {/* Eliminamos los emails que no aportan valor */}
                                </div>
                              </div>
                            </td>
                            {grupos.map(grupo => (
                              <td key={grupo.id} className="px-6 py-4 whitespace-nowrap text-center">
                                <button 
                                  onClick={() => toggleAlumnoEnGrupo(alumno.id, grupo.id)}
                                  className={`py-3 px-5 rounded-md text-sm font-medium transition-all transform hover:scale-105 min-w-[120px] ${estaAlumnoEnGrupo(alumno.id, grupo.id) 
                                    ? 'bg-[#eef2f6] text-[#2c7be5] hover:bg-[#dce5f0] border border-[#c5d4e7] shadow-sm' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'}`}
                                >
                                  {estaAlumnoEnGrupo(alumno.id, grupo.id) 
                                    ? (
                                      <span className="flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Asignado
                                      </span>
                                    ) 
                                    : (
                                      <span className="flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                        </svg>
                                        Asignar
                                      </span>
                                    )}
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
      </div>      {/* Modal de crear grupo */}
      {modalCrearGrupoAbierto && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn border border-gray-200">
            <div className="p-5 border-b border-[#c5d4e7] bg-[#eef2f6]">
              <h3 className="text-lg font-semibold text-[#2c7be5] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear Grupo Personal
              </h3>
            </div>
            <div className="p-5">
              <div className="mb-6">
                <label htmlFor="nombreGrupo" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  id="nombreGrupo"
                  value={nuevoGrupoNombre}
                  onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#2c7be5] focus:border-[#2c7be5] shadow-sm"
                  placeholder="Ej: Grupo Tarde, Grupo Avanzado..."
                  autoFocus
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-4">
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Los grupos personales te permiten organizar a tus alumnos según tus propios criterios, independientemente de los grupos oficiales.</span>
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg border-t border-gray-100">
              <button
                onClick={() => setModalCrearGrupoAbierto(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearGrupo}
                className="px-5 py-2.5 bg-[#2c7be5] text-white rounded-md hover:bg-[#1a68d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                disabled={!nuevoGrupoNombre.trim()}
              >
                Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}      {/* Modal de confirmación */}
      {modalConfirmacionAbierto && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
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
      )}      {/* Modal de editar grupo */}
      {modalEditarGrupoAbierto && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-fadeIn border border-gray-200">
            <div className="p-5 border-b border-[#c5d4e7] bg-[#eef2f6]">
              <h3 className="text-lg font-semibold text-[#2c7be5] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Nombre del Grupo
              </h3>
            </div>
            <div className="p-5">
              {grupoAEditar && (
                <div>
                  <div className="mb-4">
                    <label htmlFor="nombreEditadoGrupo" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Grupo
                    </label>
                    <input
                      type="text"
                      id="nombreEditadoGrupo"
                      value={nombreEditadoGrupo}
                      onChange={(e) => setNombreEditadoGrupo(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Introduce el nuevo nombre del grupo"
                      autoFocus
                    />
                  </div>
                  <p className="text-sm text-gray-600 bg-[#eef2f6] p-3 rounded-lg mt-4">
                    Solo puedes editar los grupos que has creado manualmente.
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg border-t border-gray-100">
              <button
                onClick={() => {
                  setModalEditarGrupoAbierto(false);
                  setGrupoAEditar(null);
                  setNombreEditadoGrupo('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditarGrupo}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={!nombreEditadoGrupo.trim()}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
