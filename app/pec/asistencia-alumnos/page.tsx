'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import {
  FaArrowLeft, FaCalendarAlt, FaSearch, FaFilter, FaChartBar, FaExclamationTriangle, FaDownload, FaSyncAlt,
  FaUser, FaUniversity, FaCalendarCheck, FaBriefcaseMedical, FaFileMedical, FaTimes, FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

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

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2?: string;
  email: string;
  asistencia?: number;
  faltas?: number;
  ultimaAsistencia?: string;
  estado?: 'normal' | 'warning' | 'danger';
  goe?: boolean;
}

interface AsistenciaDetalle {
  id: string;
  fecha: string;
  estado: string;
  asignatura: {
    denominacion: string;
  };
}

interface AlumnoDetalle extends Alumno {
  dni?: string;
  telefono?: string;
  mentor?: string;
  notasGoe?: string[];
  carrera?: string;
  curso?: number;
  historialAsistencia?: AsistenciaDetalle[];
}

export default function AsistenciaAlumnos() {
  const { data: session } = useSession();
  const [carrerasCursos, setCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [selectedCarreraCurso, setSelectedCarreraCurso] = useState<string>('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState<Alumno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoDetalle | null>(null);
  const [isLoadingAlumnoDetalle, setIsLoadingAlumnoDetalle] = useState(false);
  const [carreraPec, setCarreraPec] = useState<string>('');
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAlumnos, setTotalAlumnos] = useState<number>(0);

  useEffect(() => {
    const fetchCarrerasCursos = async () => {
      if (!session?.user?.id) return;
      try {
        // Obtener las carreras y cursos asignados al PEC
        // El PEC solo puede ver los cursos de la carrera asignada
        const response = await fetch('/api/carreras-cursos', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar las asignaciones');
        }

        const data = await response.json();
        
        // Si hay datos, establecer el nombre de la carrera del PEC
        if (data && data.length > 0) {
          setCarreraPec(data[0].carrera.denominacion);
        }
        
        setCarrerasCursos(data);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarrerasCursos();
  }, [session]);
  // Efecto para cargar alumnos cuando se selecciona una carrera-curso
  useEffect(() => {
    if (!selectedCarreraCurso) {
      setAlumnos([]);
      setFilteredAlumnos([]);
      return;
    }

    setIsLoading(true);

    // Llamada real a la API para obtener los alumnos por carrera y curso
    const fetchAlumnos = async () => {      try {
        // Cuando hay búsqueda activa, no usar paginación para buscar en todos los resultados
        const urlParams = searchTerm 
          ? `carreraCursoId=${selectedCarreraCurso}`
          : `carreraCursoId=${selectedCarreraCurso}&page=${currentPage}&pageSize=${pageSize}`;
          
        const response = await fetch(
          `/api/alumnos-asistencia?${urlParams}`, 
          {
            credentials: 'include'
          }
        );

        if (!response.ok) {
          throw new Error('No se pudieron cargar los datos de alumnos');
        }

        const responseData = await response.json();
        // Extraer los datos de alumnos de la respuesta paginada
        const data = responseData.data || [];
        
        // Guardar información de paginación
        setTotalPages(responseData.pagination?.totalPages || 1);
        setTotalAlumnos(responseData.pagination?.total || data.length);

        // Ordenar por apellido y nombre
        data.sort((a: Alumno, b: Alumno) => {
          return a.surname1.localeCompare(b.surname1) || a.name.localeCompare(b.name);
        });

        setAlumnos(data);
        setFilteredAlumnos(data);
      } catch (error) {
        console.error('Error al cargar los alumnos:', error);
        setError(`Error al cargar los alumnos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlumnos();
  }, [selectedCarreraCurso, carrerasCursos, currentPage, pageSize]);
  // Efecto para filtrar alumnos cuando cambia el término de búsqueda
  useEffect(() => {
    // Si hay un término de búsqueda, realizar la búsqueda
    if (searchTerm && searchTerm.length >= 2) {
      // Cuando se busca, se recargan los alumnos completos desde el servidor
      const buscarAlumnos = async () => {
        if (!selectedCarreraCurso) return;
        
        setIsLoading(true);
        try {
          const response = await fetch(
            `/api/alumnos-asistencia?carreraCursoId=${selectedCarreraCurso}&search=${encodeURIComponent(searchTerm)}`,
            {
              credentials: 'include'
            }
          );
          
          if (!response.ok) {
            throw new Error('Error al buscar alumnos');
          }
          
          const responseData = await response.json();
          const data = responseData.data || [];
          
          // Ordenar por apellido y nombre
          data.sort((a: Alumno, b: Alumno) => {
            return a.surname1.localeCompare(b.surname1) || a.name.localeCompare(b.name);
          });
          
          setFilteredAlumnos(data);
        } catch (error) {
          console.error('Error en búsqueda:', error);
          // Si hay error en búsqueda, filtrar localmente
          const filtered = alumnos.filter(alumno => {
            const fullName = `${alumno.name} ${alumno.surname1} ${alumno.surname2 || ''}`.toLowerCase();
            const email = alumno.email.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
          });
          setFilteredAlumnos(filtered);
        } finally {
          setIsLoading(false);
        }
      };
      
      // Debounce para evitar muchas llamadas
      const handler = setTimeout(() => {
        buscarAlumnos();
      }, 300);
      
      return () => {
        clearTimeout(handler);
      };
    } else {
      // Si no hay término de búsqueda o es muy corto, mostrar todos los alumnos cargados
      setFilteredAlumnos(alumnos);
    }
  }, [searchTerm, selectedCarreraCurso]);
  // Función para ver detalles del alumno
  const verDetalleAlumno = async (alumno: Alumno) => {
    setIsLoadingAlumnoDetalle(true);

    // Obtener los detalles del alumno de la API
    try {
      const response = await fetch(`/api/alumnos-asignatura?alumnoId=${alumno.id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los detalles del alumno');
      }

      const alumnoDetalle = await response.json();

      // Asegurarse de que el objeto tiene la estructura esperada
      const detalleCompleto: AlumnoDetalle = {
        ...alumno,
        ...alumnoDetalle,
        carrera: carrerasCursos.find(cc => cc.id === selectedCarreraCurso)?.carrera?.denominacion || "No especificada",
        curso: carrerasCursos.find(cc => cc.id === selectedCarreraCurso)?.curso || 0
      };
      setSelectedAlumno(detalleCompleto);
      setShowDetalleModal(true);
    } catch (error) {
      console.error('Error al cargar detalles del alumno:', error);
      alert(`Error al cargar los detalles: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoadingAlumnoDetalle(false);
    }
  };

  // Función para cerrar el modal de detalle
  const cerrarDetalleModal = () => {
    setShowDetalleModal(false);
    setSelectedAlumno(null);
  };
  // No necesitamos generar datos aleatorios, usamos la API real
  // Función para marcar/desmarcar alumno como GOE
  const toggleGoeStatus = async () => {
    if (!selectedAlumno) return;

    setIsLoadingAlumnoDetalle(true);

    try {
      // Llamada a la API para actualizar el estado GOE
      const response = await fetch('/api/pec/toggle-goe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alumnoId: selectedAlumno.id,
          goe: !selectedAlumno.goe
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado GOE');
      }

      const updatedData = await response.json();

      // Actualizar el alumno seleccionado
      setSelectedAlumno({
        ...selectedAlumno,
        goe: updatedData.goe,
        notasGoe: updatedData.notasGoe
      });

      // También actualizar en la lista principal
      const updatedAlumnos = alumnos.map(alumno =>
        alumno.id === selectedAlumno.id ? { ...alumno, goe: updatedData.goe } : alumno
      );

      setAlumnos(updatedAlumnos);
      setFilteredAlumnos(
        filteredAlumnos.map(alumno =>
          alumno.id === selectedAlumno.id ? { ...alumno, goe: updatedData.goe } : alumno
        )
      );
    } catch (error) {
      console.error('Error al actualizar estado GOE:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoadingAlumnoDetalle(false);
    }
  };

  // Función para formatear el nombre completo
  const getFullName = (alumno: Alumno) => {
    return `${alumno.surname1} ${alumno.surname2 ? alumno.surname2 + ',' : ','} ${alumno.name}`;
  };

  // Función para exportar a Excel (ahora usa la API real)
  const exportToExcel = async () => {
    if (!selectedCarreraCurso) {
      alert('Por favor, selecciona un curso antes de exportar.');
      return;
    }

    try {
      // Llamar a la API con el parámetro export=excel
      const response = await fetch(`/api/alumnos-asistencia?carreraCursoId=${selectedCarreraCurso}&export=excel`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel');
      }

      // Obtener el blob del excel
      const blob = await response.blob();
      
      // Crear una URL para el blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear un elemento <a> para descargarlo
      const a = document.createElement('a');
      a.href = url;
      
      // Obtener el nombre del archivo desde Content-Disposition o usar uno predeterminado
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileName = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'alumnos-asistencia.xlsx';
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert(`Error al exportar a Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Función para abrir el modal de detalles del alumno
  const openModal = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setShowDetalleModal(true);
  };

  // Función para cerrar el modal
  const closeModal = () => {
    setSelectedAlumno(null);
    setShowDetalleModal(false);
  };  return (
    <DashboardContainer roleName="PEC">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaCalendarCheck className="mr-3" />
                    Asistencia de Alumnos
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center">
                    <Link href="/pec/dashboard" className="flex items-center hover:underline">
                      <FaArrowLeft className="mr-1" /> Volver al dashboard
                    </Link>
                  </p>
                </div>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700"
                >
                  <FaDownload className="mr-2" /> Exportar a Excel
                </button>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
              {/* Descripción */}
            <div className="px-6 py-4 bg-white">
              <p className="text-gray-600">Consulta y monitorea la asistencia de los alumnos de tu curso asignado.</p>
            </div>
          </div>          {/* Selector de carrera y curso */}          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {carrerasCursos.length > 0 && (
                  <span className="flex items-center">
                    <FaUniversity className="mr-2 text-blue-600" /> 
                    Carrera: {carrerasCursos[0]?.carrera?.denominacion}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecciona el curso
                  </label>
                  <select
                    value={selectedCarreraCurso}
                    onChange={(e) => setSelectedCarreraCurso(e.target.value)}
                    className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Seleccionar curso --</option>
                    {carrerasCursos.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.curso}º Curso
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar Alumno
                  </label>
                  <div className="flex">
                    <div className="absolute inset-y-0 left-0 mt-8 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>                <div className="flex items-end space-x-2">
                  <button 
                    className="p-3 bg-blue-50 border border-blue-300 rounded-md flex items-center text-blue-600 hover:bg-blue-100 transition-all"
                    onClick={() => {
                      // Aplicar filtros
                      if (selectedCarreraCurso) {
                        setCurrentPage(1); // Volver a la primera página al filtrar
                      }
                    }}
                  >
                    <FaFilter className="mr-2" /> Filtrar
                  </button>

                  <button 
                    className="p-3 bg-gray-50 border border-gray-300 rounded-md flex items-center text-gray-600 hover:bg-gray-100 transition-all"
                    onClick={() => {
                      // Limpiar búsqueda y refrescar datos
                      setSearchTerm('');
                      setCurrentPage(1);
                      // La recarga se hará automáticamente por el efecto al cambiar currentPage
                    }}
                  >
                    <FaSyncAlt className="mr-2" /> Actualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen estadístico */}
          {selectedCarreraCurso && !isLoading && filteredAlumnos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center border-l-4 border-blue-500">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <FaChartBar className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Asistencia Media</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {Math.round(filteredAlumnos.reduce((acc, curr) => acc + (curr.asistencia || 0), 0) / filteredAlumnos.length)}%
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center border-l-4 border-yellow-500">
                <div className="p-3 bg-yellow-100 rounded-full mr-4">
                  <FaExclamationTriangle className="text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Alumnos en Riesgo</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {filteredAlumnos.filter(a => a.estado === 'warning').length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center border-l-4 border-red-500">
                <div className="p-3 bg-red-100 rounded-full mr-4">
                  <FaExclamationTriangle className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Alumnos Críticos</h3>
                  <p className="text-2xl font-bold text-gray-800">
                    {filteredAlumnos.filter(a => a.estado === 'danger').length}
                  </p>
                </div>
              </div>
            </div>
          )}          {/* Tabla de alumnos */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedCarreraCurso ? (
                  <span className="flex items-center">
                    <FaUser className="mr-2 text-blue-600" /> 
                    Alumnos de {carrerasCursos.find(cc => cc.id === selectedCarreraCurso)?.curso}º Curso
                  </span>
                ) : 'Selecciona un curso para ver los alumnos'}
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-r-2 border-b-0 border-l-0 mb-4"></div>
                <p className="text-gray-600">Cargando datos de alumnos...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                  {error}
                </div>
              </div>
            ) : selectedCarreraCurso && filteredAlumnos.length === 0 ? (
              <div className="p-8 text-center">
                <FaSearch className="mx-auto text-gray-300 text-4xl mb-4" />
                <p className="text-gray-600">No se encontraron alumnos con el filtro actual</p>
              </div>
            ) : selectedCarreraCurso ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Asistencia</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Faltas</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Última Asistencia</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAlumnos.map((alumno) => (
                      <tr key={alumno.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{getFullName(alumno)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 h-16 relative">
                              <svg className="w-16 h-16" viewBox="0 0 36 36">
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#e5e7eb"
                                  strokeWidth="3"
                                />
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke={
                                    alumno.estado === 'danger' ? '#ef4444' :
                                      alumno.estado === 'warning' ? '#f59e0b' : '#10b981'
                                  }
                                  strokeWidth="3"
                                  strokeDasharray={`${alumno.asistencia || 0}, 100`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-semibold">{alumno.asistencia}%</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${alumno.faltas && alumno.faltas > 5 ? 'bg-red-100 text-red-800' :
                              alumno.faltas && alumno.faltas > 2 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {alumno.faltas}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {alumno.ultimaAsistencia}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => verDetalleAlumno(alumno)}
                            className="text-blue-600 hover:text-blue-900 focus:outline-none"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Controles de paginación */}
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                        currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Siguiente
                    </button>
                  </div>                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{filteredAlumnos.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}</span> a <span className="font-medium">
                          {Math.min(currentPage * pageSize, totalAlumnos)}
                        </span> de <span className="font-medium">{totalAlumnos}</span> resultados
                      </p>
                      
                      <div className="flex items-center">
                        <span className="text-sm text-gray-700 mr-2">Mostrar:</span>
                        <select 
                          value={pageSize} 
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1); // Volver a la primera página al cambiar el tamaño
                          }}
                          className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                            currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Primera</span>
                          ««
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                            currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Anterior</span>
                          «
                        </button>
                        
                        {/* Números de página */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Cálculo para mostrar páginas alrededor de la página actual
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === currentPage
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                            currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Siguiente</span>
                          »
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                            currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <span className="sr-only">Última</span>
                          »»
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            ) : (              <div className="p-8 text-center">
                <FaCalendarAlt className="mx-auto text-gray-300 text-4xl mb-4" />
                <p className="text-gray-600">Selecciona un curso para ver los alumnos asignados</p>
              </div>
            )}
          </div>          {/* La paginación ya está incluida dentro de la tabla */}
        </div>        {/* Modal de detalle del alumno */}
        {showDetalleModal && selectedAlumno && (
          <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={cerrarDetalleModal}>
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Encabezado del modal */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
                <h3 className="text-lg font-medium">
                  Detalle del Alumno: {selectedAlumno.name} {selectedAlumno.surname1} {selectedAlumno.surname2 || ''}
                </h3>
                <button
                  onClick={cerrarDetalleModal}
                  className="text-white hover:text-gray-200 focus:outline-none"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>

              {isLoadingAlumnoDetalle ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500 border-r-2 border-b-0 border-l-0 mb-4"></div>
                  <p className="text-gray-600">Cargando información del alumno...</p>
                </div>
              ) : (
                <>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Información personal */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                          <FaUser className="text-blue-500 mr-2" /> Información Personal
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-gray-500">Nombre completo</dt>
                            <dd className="font-medium">{selectedAlumno.name} {selectedAlumno.surname1} {selectedAlumno.surname2 || ''}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Email</dt>
                            <dd className="font-medium">{selectedAlumno.email}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">DNI</dt>
                            <dd className="font-medium">{selectedAlumno.dni || 'No disponible'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Teléfono</dt>
                            <dd className="font-medium">{selectedAlumno.telefono || 'No disponible'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Mentor</dt>
                            <dd className="font-medium">{selectedAlumno.mentor || 'No asignado'}</dd>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <dt className="text-sm text-gray-500">Estado GOE</dt>
                            <dd className={`font-medium ${selectedAlumno.goe ? 'text-purple-600' : 'text-gray-600'}`}>
                              {selectedAlumno.goe ? 'En seguimiento GOE' : 'No en programa GOE'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Información académica */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                          <FaUniversity className="text-green-500 mr-2" /> Información Académica
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-gray-500">Carrera</dt>
                            <dd className="font-medium">{selectedAlumno.carrera}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Curso</dt>
                            <dd className="font-medium">{selectedAlumno.curso}º Curso</dd>
                          </div>
                        </dl>
                      </div>

                      {/* Estadísticas de asistencia */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                          <FaChartBar className="text-orange-500 mr-2" /> Estadísticas de Asistencia
                        </h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-sm text-gray-500">Porcentaje de asistencia</dt>
                            <dd className="font-medium">
                              <div className="flex justify-between items-center mb-1">
                                <span className={selectedAlumno.asistencia && selectedAlumno.asistencia > 70 ? 'text-green-600' : 'text-red-600'}>
                                  {selectedAlumno.asistencia}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${selectedAlumno.asistencia && selectedAlumno.asistencia > 70 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${selectedAlumno.asistencia}%` }}
                                ></div>
                              </div>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Faltas</dt>
                            <dd className={`font-medium ${selectedAlumno.faltas && selectedAlumno.faltas > 5 ? 'text-red-600' : 'text-gray-600'}`}>
                              {selectedAlumno.faltas || 0} faltas sin justificar
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-gray-500">Última asistencia</dt>
                            <dd className="font-medium">{selectedAlumno.ultimaAsistencia || 'No disponible'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Historial de asistencias */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                        <FaCalendarCheck className="text-blue-500 mr-2" /> Historial de Asistencias
                      </h4>

                      {selectedAlumno.historialAsistencia && selectedAlumno.historialAsistencia.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full table-auto">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedAlumno.historialAsistencia.map((asistencia) => (
                                <tr key={asistencia.id}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                    {asistencia.fecha}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                    {asistencia.asignatura.denominacion}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${asistencia.estado === 'presente' ? 'bg-green-100 text-green-800' :
                                        asistencia.estado === 'justificado' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-red-100 text-red-800'
                                      }`}>
                                      {asistencia.estado === 'presente' && <FaCheckCircle className="mr-1 h-3 w-3" />}
                                      {asistencia.estado === 'ausente' && <FaTimesCircle className="mr-1 h-3 w-3" />}
                                      {asistencia.estado === 'justificado' && <FaCalendarCheck className="mr-1 h-3 w-3" />}
                                      {asistencia.estado.charAt(0).toUpperCase() + asistencia.estado.slice(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-3">No hay registros de asistencia disponibles</p>
                      )}
                    </div>

                    {/* Sección de GOE */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center mb-3">
                        <FaBriefcaseMedical className="text-purple-500 mr-2" /> Información GOE
                      </h4>

                      {selectedAlumno.goe ? (
                        <>
                          {selectedAlumno.notasGoe && selectedAlumno.notasGoe.length > 0 ? (
                            <div className="space-y-2 mb-4">
                              <h5 className="text-sm font-medium text-gray-700">Notas de seguimiento:</h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {selectedAlumno.notasGoe.map((nota, index) => (
                                  <li key={index} className="text-sm text-gray-600">{nota}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-gray-500 mb-4">No hay notas de seguimiento registradas</p>
                          )}

                          <div className="flex space-x-2">
                            <button
                              onClick={toggleGoeStatus}
                              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none flex items-center"
                            >
                              <FaTimes className="mr-1" /> Quitar de GOE
                            </button>
                            <button
                              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 focus:outline-none flex items-center"
                            >
                              <FaFileMedical className="mr-1" /> Añadir nota
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-gray-500 mb-4">Este alumno no está actualmente en el programa GOE.</p>
                          <button
                            onClick={toggleGoeStatus}
                            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 focus:outline-none flex items-center"
                          >
                            <FaFileMedical className="mr-1" /> Añadir a GOE
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 flex justify-between">
                    <button
                      onClick={cerrarDetalleModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cerrar
                    </button>

                    <div className="flex space-x-2">                      <Link
                        href={`/pec/alumno/${selectedAlumno.id}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Ver página completa
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardContainer>
  );
}
