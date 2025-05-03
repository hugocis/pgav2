'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { 
  FaChalkboardTeacher, 
  FaSearch, 
  FaArrowLeft, 
  FaSync, 
  FaCalendarAlt, 
  FaClock, 
  FaSave,
  FaUserGraduate
} from 'react-icons/fa';

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
  profesorId: string;
}

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2: string;
  email: string;
}

interface AlumnoGrupo {
  id: string;
  alumno_Id: string;
  grupoId: string;
  user: Alumno;
}

interface EstadoAsistencia {
  id: string;
  denominacion: string;
}

interface AsistenciaEstado {
  alumnoId: string;
  estado: string;
}

export default function PasarClase() {
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
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [alumnosGrupo, setAlumnosGrupo] = useState<AlumnoGrupo[]>([]);
  const [estadosAsistencia, setEstadosAsistencia] = useState<EstadoAsistencia[]>([]);
  const [estadosPermitidos, setEstadosPermitidos] = useState<string[]>(['Asiste', 'No Asiste', '50%']);
  const [asistencias, setAsistencias] = useState<Map<string, string>>(new Map());
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Obtener fecha y hora actual en formato adecuado para inputs
  useEffect(() => {
    const now = new Date();
    const fechaActual = now.toISOString().split('T')[0];
    let horaActual = now.toTimeString().split(' ')[0].substring(0, 5);
    
    setFecha(fechaActual);
    setHora(horaActual);
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
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
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => 
          grupo.profesorId === session.user.id
        );
        
        setGrupos(gruposFiltrados);
        
        // Si hay grupos disponibles, seleccionar el primero por defecto
        if (gruposFiltrados.length > 0) {
          setGrupoSeleccionado(gruposFiltrados[0].id);
        }
        
        // Cargar estados de asistencia
        const estadosResponse = await fetch('/api/estados-asistencia', {
          credentials: 'include'
        });
        
        if (!estadosResponse.ok) {
          console.warn('No se pudieron cargar los estados de asistencia');
        } else {
          const estadosData = await estadosResponse.json();
          setEstadosAsistencia(estadosData);
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

  // Cargar alumnos cuando se selecciona un grupo
  useEffect(() => {
    if (!grupoSeleccionado) return;
    
    const fetchAlumnos = async () => {
      setIsLoading(true);
      
      try {
        const alumnosResponse = await fetch(`/api/alumnos-grupo?grupoId=${grupoSeleccionado}`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos del grupo');
        }
        
        const alumnosData = await alumnosResponse.json();
        
        // Ordenar los alumnos por apellido y nombre
        alumnosData.sort((a: AlumnoGrupo, b: AlumnoGrupo) => {
          const apellidoA = a.user?.surname1 || '';
          const apellidoB = b.user?.surname1 || '';
          return apellidoA.localeCompare(apellidoB) || (a.user?.name || '').localeCompare(b.user?.name || '');
        });
        
        setAlumnosGrupo(alumnosData);
        
        // Inicializar todas las asistencias con "Asiste" por defecto
        const asistenciasIniciales = new Map<string, string>();
        alumnosData.forEach((alumnoGrupo: AlumnoGrupo) => {
          asistenciasIniciales.set(alumnoGrupo.alumno_Id, 'Asiste');
        });
        
        setAsistencias(asistenciasIniciales);
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar alumnos:', error);
        setError(`Error al cargar los alumnos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchAlumnos();
  }, [grupoSeleccionado]);

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTerm
    ? alumnosGrupo.filter(alumnoGrupo => 
        alumnoGrupo.user && (
          `${alumnoGrupo.user.surname1 || ''} ${alumnoGrupo.user.surname2 || ''} ${alumnoGrupo.user.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (alumnoGrupo.user.email && alumnoGrupo.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
    : alumnosGrupo;

  // Cambiar estado de asistencia al hacer clic
  const cambiarEstadoAsistencia = (alumnoId: string) => {
    const estadoActual = asistencias.get(alumnoId) || 'Asiste';
    const indexActual = estadosPermitidos.indexOf(estadoActual);
    const indexSiguiente = (indexActual + 1) % estadosPermitidos.length;
    const nuevoEstado = estadosPermitidos[indexSiguiente];
    
    const nuevasAsistencias = new Map(asistencias);
    nuevasAsistencias.set(alumnoId, nuevoEstado);
    setAsistencias(nuevasAsistencias);
  };

  // Guardar la sesión de clase y las asistencias
  const guardarSesion = async () => {
    if (!grupoSeleccionado || !fecha || !hora) {
      setError('Por favor, selecciona un grupo, fecha y hora válidos');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Crear la fecha completa con la hora
      const fechaHora = new Date(`${fecha}T${hora}`);
      
      // Crear la sesión de clase
      const sesionResponse = await fetch('/api/sesiones-clase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: fechaHora,
          grupoId: grupoSeleccionado,
          docenteId: session?.user?.id
        }),
        credentials: 'include'
      });
      
      if (!sesionResponse.ok) {
        throw new Error('Error al crear la sesión de clase');
      }
      
      const sesionData = await sesionResponse.json();
      const sesionId = sesionData.id;
      
      // Obtener IDs de estados de asistencia
      const mapaEstados = new Map<string, string>();
      estadosAsistencia.forEach(estado => {
        mapaEstados.set(estado.denominacion, estado.id);
      });
      
      // Crear las asistencias para cada alumno
      const promesasAsistencias = Array.from(asistencias.entries()).map(async ([alumnoId, estadoDenominacion]) => {
        const estadoId = mapaEstados.get(estadoDenominacion) || '';
        
        if (!estadoId) {
          console.error(`No se encontró ID para el estado: ${estadoDenominacion}`);
          return;
        }
        
        const asistenciaResponse = await fetch('/api/asistencias-alumno', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fecha: fechaHora,
            alumnoId,
            sesionClaseId: sesionId,
            estadoAsistenciaId: estadoId,
            estado: estadoDenominacion // Por compatibilidad
          }),
          credentials: 'include'
        });
        
        if (!asistenciaResponse.ok) {
          throw new Error(`Error al registrar asistencia para alumno ${alumnoId}`);
        }
        
        return await asistenciaResponse.json();
      });
      
      await Promise.all(promesasAsistencias);
      
      setSuccess('¡Sesión de clase y asistencias registradas con éxito!');
      
      // Reiniciar todas las asistencias a "Asiste" para una nueva sesión
      const asistenciasIniciales = new Map<string, string>();
      alumnosGrupo.forEach((alumnoGrupo: AlumnoGrupo) => {
        asistenciasIniciales.set(alumnoGrupo.alumno_Id, 'Asiste');
      });
      setAsistencias(asistenciasIniciales);
      
    } catch (error) {
      console.error('Error al guardar la sesión:', error);
      setError(`Error al guardar la sesión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Obtener clase para el estado de asistencia
  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'Asiste':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'No Asiste':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case '50%':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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
                      <FaChalkboardTeacher className="mr-3" />
                      Pasar Asistencia
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
                <p className="mt-2 text-gray-600">Cargando información...</p>
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
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Registrar Nueva Sesión de Clase
                </h2>

                {success && (
                  <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
                    <p>{success}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selector de grupo */}
                  <div>
                    <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 mb-1">
                      Grupo
                    </label>
                    <select
                      id="grupo"
                      value={grupoSeleccionado}
                      onChange={(e) => setGrupoSeleccionado(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {grupos.length === 0 ? (
                        <option value="">No hay grupos disponibles</option>
                      ) : (
                        grupos.map((grupo) => (
                          <option key={grupo.id} value={grupo.id}>
                            {grupo.denominacion}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Selector de fecha */}
                  <div>
                    <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className="text-gray-400" />
                      </div>
                      <input
                        type="date"
                        id="fecha"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Selector de hora */}
                  <div>
                    <label htmlFor="hora" className="block text-sm font-medium text-gray-700 mb-1">
                      Hora
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaClock className="text-gray-400" />
                      </div>
                      <input
                        type="time"
                        id="hora"
                        value={hora}
                        onChange={(e) => setHora(e.target.value)}
                        className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-500">
                      <strong>{alumnosGrupo.length}</strong> alumnos en este grupo
                    </div>
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
                  </div>
                </div>
              </div>

              {/* Lista de alumnos y asistencia */}
              {!grupoSeleccionado ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">Selecciona un grupo para ver los alumnos</p>
                </div>
              ) : alumnosFiltrados.length === 0 ? (
                <div className="text-center py-10">
                  <FaUserGraduate className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No hay alumnos en este grupo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumno
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alumnosFiltrados.map((alumnoGrupo, index) => {
                        if (!alumnoGrupo.user) return null;
                        
                        const alumno = alumnoGrupo.user;
                        const estadoAsistencia = asistencias.get(alumno.id) || 'Asiste';
                        const estadoClass = getEstadoClass(estadoAsistencia);
                        
                        return (
                          <tr key={alumno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {alumno.surname1 ? `${alumno.surname1}${alumno.surname2 ? ` ${alumno.surname2}` : ''}, ${alumno.name}` : alumno.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {alumno.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => cambiarEstadoAsistencia(alumno.id)}
                                className={`py-1 px-4 rounded-full text-sm font-medium ${estadoClass} transition-colors`}
                              >
                                {estadoAsistencia}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="p-5 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-sm text-gray-700">Estados:</span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Asiste</span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">No Asiste</span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">50%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Haz clic en el estado para cambiarlo
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href="/profesor/dashboard"
                      className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Link>
                    <button
                      onClick={guardarSesion}
                      disabled={isSaving || !grupoSeleccionado || alumnosGrupo.length === 0}
                      className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <FaSave className="mr-2" />
                          Guardar Asistencia
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
