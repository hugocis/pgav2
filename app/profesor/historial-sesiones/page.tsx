'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FaBook, 
  FaArrowLeft, 
  FaSearch, 
  FaCalendarAlt, 
  FaEdit, 
  FaTrash,
  FaSortAmountDown,
  FaSortAmountUp,
  FaEye
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

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  docenteId: string;
  grupo: Grupo;
  asistencias: Asistencia[];
}

interface Asistencia {
  id: string;
  fecha: string;
  alumnoId: string;
  sesionClaseId: string;
  estadoAsistenciaId: string;
  estado: string;
  alumno: {
    name: string;
    surname1: string;
    surname2: string;
  };
}

interface EstadisticasSesion {
  total: number;
  asisten: number;
  noAsisten: number;
  parcial: number;
  otros: number;
  porcentajeAsistencia: number;
}

export default function HistorialSesiones() {
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
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionClase | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [sesionIdToDelete, setSesionIdToDelete] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<{[key: string]: EstadisticasSesion}>({});

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
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => 
          grupo.profesorId === session.user.id
        );
        
        setGrupos(gruposFiltrados);
        
        if (gruposFiltrados.length > 0) {
          // Consultar sesiones para todos los grupos del profesor
          const gruposIds = gruposFiltrados.map((grupo: Grupo) => grupo.id);
          const sesionesPorGrupo = await Promise.all(
            gruposIds.map(async (grupoId: string) => {
              const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupoId}`, {
                credentials: 'include'
              });
              
              if (!sesionesResponse.ok) {
                console.error(`Error al cargar sesiones para el grupo ${grupoId}`);
                return [];
              }
              
              const sesionesData = await sesionesResponse.json();
              return sesionesData;
            })
          );
          
          // Unir todas las sesiones y ordenarlas por fecha descendente
          const todasSesiones = sesionesPorGrupo.flat();
          const sesionesConEstadisticas = await Promise.all(
            todasSesiones.map(async (sesion: SesionClase) => {
              // Cargar asistencias para cada sesión
              const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
                credentials: 'include'
              });
              
              if (!asistenciasResponse.ok) {
                console.error(`Error al cargar asistencias para la sesión ${sesion.id}`);
                return { ...sesion, asistencias: [] };
              }
              
              const asistenciasData = await asistenciasResponse.json();
              
              // Calcular estadísticas de asistencia
              const total = asistenciasData.length;
              const asisten = asistenciasData.filter((a: Asistencia) => a.estado === 'Asiste').length;
              const noAsisten = asistenciasData.filter((a: Asistencia) => a.estado === 'No Asiste').length;
              const parcial = asistenciasData.filter((a: Asistencia) => a.estado === '50%').length;
              const otros = total - asisten - noAsisten - parcial;
              const porcentajeAsistencia = total > 0 ? (asisten + parcial * 0.5) / total * 100 : 0;
              
              // Guardar estadísticas
              const nuevasEstadisticas = { ...estadisticas };
              nuevasEstadisticas[sesion.id] = {
                total,
                asisten,
                noAsisten,
                parcial,
                otros,
                porcentajeAsistencia
              };
              setEstadisticas(nuevasEstadisticas);
              
              return { ...sesion, asistencias: asistenciasData };
            })
          );
          
          setSesiones(sesionesConEstadisticas);
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

  // Formatear la fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    return format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  // Formatear la hora para mostrar
  const formatearHora = (fechaStr: string) => {
    if (!fechaStr) return 'Hora no disponible';
    const fecha = new Date(fechaStr);
    return format(fecha, "HH:mm", { locale: es });
  };

  // Filtrar sesiones por grupo y término de búsqueda
  const sesionesFiltradas = sesiones
    .filter(sesion => 
      grupoSeleccionado === 'todos' || sesion.grupoId === grupoSeleccionado
    )
    .filter(sesion => {
      const fechaFormateada = formatearFecha(sesion.fecha);
      const horaFormateada = formatearHora(sesion.fecha);
      const grupoNombre = sesion.grupo?.denominacion || '';
      
      return (
        fechaFormateada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horaFormateada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grupoNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

  // Ordenar las sesiones
  const sortedSesiones = [...sesionesFiltradas].sort((a, b) => {
    const sortValue = sortConfig.key === 'fecha'
      ? new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      : (estadisticas[a.id]?.porcentajeAsistencia || 0) - (estadisticas[b.id]?.porcentajeAsistencia || 0);
      
    return sortConfig.direction === 'asc' ? sortValue : -sortValue;
  });

  // Cambiar el orden de las sesiones
  const requestSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Ver detalles de una sesión
  const verDetallesSesion = (sesion: SesionClase) => {
    setSesionSeleccionada(sesion);
    setModalVisible(true);
  };

  // Confirmar eliminación de una sesión
  const confirmarEliminarSesion = (sesionId: string) => {
    setSesionIdToDelete(sesionId);
    setConfirmDeleteVisible(true);
  };

  // Eliminar sesión
  const eliminarSesion = async () => {
    if (!sesionIdToDelete) return;
    
    try {
      // Primero eliminar todas las asistencias asociadas
      const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesionIdToDelete}`, {
        credentials: 'include'
      });
      
      if (asistenciasResponse.ok) {
        const asistencias = await asistenciasResponse.json();
        // Eliminar cada asistencia
        for (const asistencia of asistencias) {
          await fetch(`/api/asistencias-alumno/${asistencia.id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
        }
      }
      
      // Luego eliminar la sesión
      const response = await fetch(`/api/sesiones-clase/${sesionIdToDelete}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Actualizar la lista de sesiones
        setSesiones(sesiones.filter(sesion => sesion.id !== sesionIdToDelete));
        setConfirmDeleteVisible(false);
        setSesionIdToDelete(null);
      } else {
        throw new Error('Error al eliminar la sesión');
      }
    } catch (error) {
      console.error('Error al eliminar sesión:', error);
      setError(`Error al eliminar la sesión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };
  // Estados para el modal de edición
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [sesionParaEditar, setSesionParaEditar] = useState<SesionClase | null>(null);
  const [asistenciasEdicion, setAsistenciasEdicion] = useState<Asistencia[]>([]);
  const [estadosModificados, setEstadosModificados] = useState<{[key: string]: string}>({});
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  
  // Abrir modal de edición de sesión
  const editarSesion = async (sesionId: string) => {
    // Buscar la sesión seleccionada
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;
    
    setSesionParaEditar(sesion);
    setAsistenciasEdicion(sesion.asistencias || []);
    
    // Inicializar el estado de las asistencias para edición
    const estadosIniciales: {[key: string]: string} = {};
    if (sesion.asistencias) {
      sesion.asistencias.forEach(asistencia => {
        estadosIniciales[asistencia.id] = asistencia.estado;
      });
    }
    setEstadosModificados(estadosIniciales);
    
    setModalEdicionVisible(true);
  };
  // Cambiar estado de asistencia en edición
  const cambiarEstadoAsistencia = (asistenciaId: string) => {
    const estados = ["Asiste", "No Asiste", "50%"];
    const estadoActual = estadosModificados[asistenciaId] || "Asiste";
    const indexActual = estados.indexOf(estadoActual);
    const nuevoIndex = (indexActual + 1) % estados.length;
    
    setEstadosModificados({
      ...estadosModificados,
      [asistenciaId]: estados[nuevoIndex]
    });
  };
  
  // Guardar cambios de asistencia
  const guardarCambiosAsistencia = async () => {
    if (!sesionParaEditar) return;
    
    try {
      setGuardandoCambios(true);
      
      // Hacer las peticiones para actualizar cada asistencia modificada
      const promesasActualizacion = Object.entries(estadosModificados).map(async ([asistenciaId, nuevoEstado]) => {
        const asistencia = asistenciasEdicion.find(a => a.id === asistenciaId);
        
        // Solo actualizar si el estado ha cambiado
        if (asistencia && asistencia.estado !== nuevoEstado) {
          const response = await fetch(`/api/asistencias-alumno/${asistenciaId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              estado: nuevoEstado
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Error al actualizar la asistencia ${asistenciaId}`);
          }
          
          return response.json();
        }
        return null;
      });
      
      await Promise.all(promesasActualizacion);
      
      // Recargar la página para actualizar los datos
      window.location.reload();
      
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      setError(`Error al guardar los cambios: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setGuardandoCambios(false);
      setModalEdicionVisible(false);
    }
  };
  // Obtener clase para el porcentaje de asistencia
  const getPorcentajeClass = (porcentaje: number) => {
    if (porcentaje >= 80) return 'text-green-600 font-semibold';
    if (porcentaje >= 50) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };
  
  // Obtener clase para el estado de asistencia
  const getEstadoAsistenciaClass = (estado: string) => {
    switch (estado) {
      case 'Asiste':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'No Asiste':
        return 'bg-red-100 text-red-800 border-red-200';
      case '50%':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Dispensado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Erasmus T':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Erasmus NT':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                      <FaBook className="mr-3" />
                      Historial de Sesiones
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
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">
                    Sesiones de Clase
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href={`/profesor/pasar-clase?asignatura=${asignaturaId}`}
                      className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] flex items-center justify-center"
                    >
                      <FaCalendarAlt className="mr-2" />
                      Nueva Sesión
                    </Link>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector de grupo */}
                  <div>
                    <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 mb-1">
                      Filtrar por Grupo
                    </label>
                    <select
                      id="grupo"
                      value={grupoSeleccionado}
                      onChange={(e) => setGrupoSeleccionado(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todos los grupos</option>
                      {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.denominacion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Buscador */}
                  <div>
                    <label htmlFor="buscar" className="block text-sm font-medium text-gray-700 mb-1">
                      Buscar
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="buscar"
                        placeholder="Buscar por fecha, hora o grupo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de sesiones */}
              {sortedSesiones.length === 0 ? (
                <div className="py-10 text-center">
                  <FaCalendarAlt className="text-gray-300 text-5xl mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No hay sesiones registradas</p>
                  <p className="text-gray-400 text-sm">
                    Crea una nueva sesión para comenzar a registrar asistencias
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('fecha')}>
                          <div className="flex items-center">
                            Fecha/Hora
                            {sortConfig.key === 'fecha' ? (
                              sortConfig.direction === 'asc' ? 
                                <FaSortAmountUp className="ml-1" /> : 
                                <FaSortAmountDown className="ml-1" />
                            ) : null}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Grupo
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('porcentaje')}>
                          <div className="flex items-center">
                            Asistencia
                            {sortConfig.key === 'porcentaje' ? (
                              sortConfig.direction === 'asc' ? 
                                <FaSortAmountUp className="ml-1" /> : 
                                <FaSortAmountDown className="ml-1" />
                            ) : null}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedSesiones.map((sesion, index) => {
                        const stats = estadisticas[sesion.id] || {
                          total: 0,
                          asisten: 0,
                          noAsisten: 0,
                          parcial: 0,
                          otros: 0,
                          porcentajeAsistencia: 0
                        };
                        
                        return (
                          <tr key={sesion.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatearFecha(sesion.fecha)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatearHora(sesion.fecha)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {sesion.grupo?.denominacion || 'Grupo no disponible'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm mb-1 space-x-1">
                                <span className={getPorcentajeClass(stats.porcentajeAsistencia)}>
                                  {stats.porcentajeAsistencia.toFixed(1)}%
                                </span>
                                <span className="text-gray-500">
                                  ({stats.asisten} / {stats.total})
                                </span>
                              </div>
                              {/* Barra de progreso */}
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    stats.porcentajeAsistencia >= 80 ? 'bg-green-500' :
                                    stats.porcentajeAsistencia >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, stats.porcentajeAsistencia)}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => verDetallesSesion(sesion)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                  title="Ver detalles"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  onClick={() => editarSesion(sesion.id)}
                                  className="text-green-600 hover:text-green-800 transition-colors p-1"
                                  title="Editar sesión"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => confirmarEliminarSesion(sesion.id)}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                                  title="Eliminar sesión"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
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

      {/* Modal de detalles de sesión */}
      {modalVisible && sesionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Detalles de la Sesión
                </h3>
                <button 
                  onClick={() => setModalVisible(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha</p>
                  <p className="text-base">{formatearFecha(sesionSeleccionada.fecha)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Hora</p>
                  <p className="text-base">{formatearHora(sesionSeleccionada.fecha)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Grupo</p>
                  <p className="text-base">{sesionSeleccionada.grupo?.denominacion || 'Grupo no disponible'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estadísticas</p>
                  <p className="text-base">
                    <span className={getPorcentajeClass(estadisticas[sesionSeleccionada.id]?.porcentajeAsistencia || 0)}>
                      {(estadisticas[sesionSeleccionada.id]?.porcentajeAsistencia || 0).toFixed(1)}%
                    </span>{" "}
                    de asistencia
                  </p>
                </div>
              </div>
              
              <div className="overflow-x-auto mb-5">
                <h4 className="font-semibold text-gray-700 mb-3">Detalle de Asistencias</h4>
                {sesionSeleccionada.asistencias && sesionSeleccionada.asistencias.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumno
                        </th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sesionSeleccionada.asistencias.map((asistencia) => {
                        const nombreCompleto = [
                          asistencia.alumno?.surname1 || '',
                          asistencia.alumno?.surname2 || '',
                          asistencia.alumno?.name || ''
                        ].filter(Boolean).join(' ');
                        
                        // Definir clase según el estado
                        let estadoClass = 'bg-gray-100 text-gray-800';
                        if (asistencia.estado === 'Asiste') estadoClass = 'bg-green-100 text-green-800';
                        else if (asistencia.estado === 'No Asiste') estadoClass = 'bg-red-100 text-red-800';
                        else if (asistencia.estado === '50%') estadoClass = 'bg-yellow-100 text-yellow-800';
                        
                        return (
                          <tr key={asistencia.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {nombreCompleto || 'Alumno no disponible'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoClass}`}>
                                {asistencia.estado}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay registros de asistencia para esta sesión
                  </p>
                )}
              </div>
              
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => setModalVisible(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    setModalVisible(false);
                    editarSesion(sesionSeleccionada.id);
                  }}
                  className="ml-3 px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a]"
                >
                  <FaEdit className="inline-block mr-2" />
                  Editar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación de eliminación */}
      {confirmDeleteVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Confirmar Eliminación
              </h3>
            </div>
            
            <div className="p-5">
              <p className="text-gray-700 mb-4">
                ¿Estás seguro de que deseas eliminar esta sesión? Esta acción eliminará también todos los registros de asistencia asociados y no se puede deshacer.
              </p>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    setConfirmDeleteVisible(false);
                    setSesionIdToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={eliminarSesion}
                  className="ml-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
