'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { 
  FaArrowLeft, 
  FaBriefcaseMedical, 
  FaSearch, 
  FaFilter, 
  FaCheck,
  FaToggleOn,
  FaToggleOff,
  FaSyncAlt
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

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
  tieneRolGOE: boolean;
  userRoles: {
    role: {
      id: number;
      name: string;
    }
  }[];
}

export default function AlumnosGOE() {
  // Un PEC está asociado a uno o varios curso(s) (1º, 2º, 3º, 4º)
  // y gestiona a los alumnos de ese curso (todos los estudiantes que tienen asignaturas en ese curso)
  // Aquí podemos ver los alumnos con necesidades especiales (GOE) para facilitar su seguimiento
  const { data: session } = useSession();
  const [carrerasCursos, setCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [selectedCarreraCurso, setSelectedCarreraCurso] = useState<string>('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState<Alumno[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAlumnos, setTotalAlumnos] = useState<number>(0);

  // Cargar carreras y cursos del PEC
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
    setError(null);
    
    const fetchAlumnos = async () => {
      try {
        // Cuando hay búsqueda activa, no usar paginación para buscar en todos los resultados
        const urlParams = searchTerm 
          ? `carreraCursoId=${selectedCarreraCurso}&search=${encodeURIComponent(searchTerm)}`
          : `carreraCursoId=${selectedCarreraCurso}&page=${currentPage}&pageSize=${pageSize}`;
          
        // Llamada a la API para obtener los alumnos del curso seleccionado
        const response = await fetch(`/api/alumnos-asistencia?${urlParams}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al cargar alumnos: ${response.status}`);
        }
        
        const responseData = await response.json();
        // Extraer los datos de alumnos de la respuesta paginada
        const data = responseData.data || [];
        
        // Guardar información de paginación
        setTotalPages(responseData.pagination?.totalPages || 1);
        setTotalAlumnos(responseData.pagination?.total || data.length);
        
        // Ordenar por apellido y nombre
        const alumnosOrdenados = data.sort((a: Alumno, b: Alumno) => {
          return a.surname1.localeCompare(b.surname1) || a.name.localeCompare(b.name);
        });
        
        // Convertir los datos para que coincidan con la estructura de Alumno que esperamos
        const alumnosFormateados = alumnosOrdenados.map((alumno: any) => ({
          id: alumno.id,
          name: alumno.name,
          surname1: alumno.surname1,
          surname2: alumno.surname2,
          email: alumno.email,
          tieneRolGOE: alumno.goe, // En asistencia-alumnos está como 'goe'
          userRoles: [] // Añadimos esto para mantener la estructura
        }));
        
        setAlumnos(alumnosFormateados);
        setFilteredAlumnos(alumnosFormateados);
      } catch (error) {
        console.error('Error al cargar datos de alumnos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setAlumnos([]);
        setFilteredAlumnos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlumnos();
  }, [selectedCarreraCurso, searchTerm, currentPage, pageSize]);

  // Efecto para filtrar alumnos cuando cambia el término de búsqueda (para filtrado local)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      return; // No filtramos con términos muy cortos, usamos la API en su lugar
    }
    
    // Debounce para evitar muchas llamadas
    const handler = setTimeout(() => {
      // El filtrado principal se hace en el useEffect anterior a través de la API
      // Aquí solo hacemos un filtrado local adicional si es necesario
      if (alumnos.length > 0 && searchTerm.length >= 2) {
        const filtered = alumnos.filter(alumno => {
          const fullName = `${alumno.name} ${alumno.surname1} ${alumno.surname2 || ''}`.toLowerCase();
          const email = alumno.email.toLowerCase();
          const tieneGoe = alumno.tieneRolGOE ? 'goe' : '';
          return (
            fullName.includes(searchTerm.toLowerCase()) || 
            email.includes(searchTerm.toLowerCase()) ||
            tieneGoe.includes(searchTerm.toLowerCase())
          );
        });
        
        setFilteredAlumnos(filtered);
      }
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, alumnos]);

  // Función para formatear el nombre completo
  const getFullName = (alumno: Alumno) => {
    return `${alumno.surname1} ${alumno.surname2 ? alumno.surname2 + ',' : ','} ${alumno.name}`;
  };

  // Función para asignar o quitar el rol GOE
  const toggleRolGOE = async (alumno: Alumno) => {
    if (procesando) return;
    
    setProcesando(true);
    
    try {
      if (alumno.tieneRolGOE) {
        // Quitar rol GOE
        const response = await fetch(`/api/alumnos-goe?alumnoId=${alumno.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al quitar rol GOE: ${response.status}`);
        }
        
        await response.json();
        
        // Actualizar estado local
        setAlumnos(prev => prev.map(a => 
          a.id === alumno.id 
            ? { ...a, tieneRolGOE: false } 
            : a
        ));
        setFilteredAlumnos(prev => prev.map(a => 
          a.id === alumno.id 
            ? { ...a, tieneRolGOE: false } 
            : a
        ));
        
        toast.success('Rol GOE eliminado correctamente');
      } else {
        // Asignar rol GOE
        const response = await fetch('/api/alumnos-goe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ alumnoId: alumno.id }),
        });
        
        if (!response.ok) {
          throw new Error(`Error al asignar rol GOE: ${response.status}`);
        }
        
        await response.json();
        
        // Actualizar estado local
        setAlumnos(prev => prev.map(a => 
          a.id === alumno.id 
            ? { ...a, tieneRolGOE: true } 
            : a
        ));
        setFilteredAlumnos(prev => prev.map(a => 
          a.id === alumno.id 
            ? { ...a, tieneRolGOE: true } 
            : a
        ));
        
        toast.success('Rol GOE asignado correctamente');
      }
    } catch (error) {
      console.error('Error al cambiar rol GOE:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <DashboardContainer roleName="PEC">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaBriefcaseMedical className="mr-3" /> 
                    Gestión de Alumnos con GOE
                  </h1>
                  <p className="text-blue-100 text-sm flex items-center">
                    <Link href="/pec/dashboard" className="flex items-center hover:underline">
                      <FaArrowLeft className="mr-1" /> Volver al dashboard
                    </Link>
                  </p>
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            
            {/* Descripción */}
            <div className="px-6 py-4 bg-white">
              <p className="text-gray-600">Gestiona y asigna el rol GOE a los alumnos que requieran atención especial desde el Gabinete de Orientación Educativa.</p>
            </div>
          </div>
          
          {/* Selector de carrera y curso */}
          <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Selecciona Carrera y Curso</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carrera y Curso
                  </label>
                  <select
                    value={selectedCarreraCurso}
                    onChange={(e) => setSelectedCarreraCurso(e.target.value)}
                    className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">-- Seleccionar --</option>
                    {carrerasCursos.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.carrera.denominacion} - {cc.curso}º Curso
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
                      placeholder="Buscar por nombre, email o GOE..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-end space-x-2">
                  <button 
                    className="p-3 bg-purple-50 border border-purple-300 rounded-md flex items-center text-purple-600 hover:bg-purple-100 transition-all"
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
          
          {/* Tabla de alumnos */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FaBriefcaseMedical className="text-purple-600 mr-2" />
                {selectedCarreraCurso 
                  ? `Alumnos del curso (${filteredAlumnos.length})`
                  : 'Selecciona una carrera y curso para ver alumnos'}
              </h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500 border-r-2 border-b-0 border-l-0 mb-4"></div>
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
                <FaBriefcaseMedical className="mx-auto text-gray-300 text-4xl mb-4" />
                <p className="text-gray-600 mb-4">No hay alumnos registrados en este curso</p>
              </div>
            ) : selectedCarreraCurso ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado GOE</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAlumnos.map((alumno) => (
                      <tr key={alumno.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{getFullName(alumno)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            alumno.tieneRolGOE ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alumno.tieneRolGOE ? 'GOE Activo' : 'Sin GOE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center">
                            <button 
                              onClick={() => toggleRolGOE(alumno)}
                              disabled={procesando}
                              className={`text-${alumno.tieneRolGOE ? 'red' : 'green'}-600 hover:text-${alumno.tieneRolGOE ? 'red' : 'green'}-900 disabled:opacity-50`}
                              title={alumno.tieneRolGOE ? "Quitar rol GOE" : "Asignar rol GOE"}
                            >
                              {procesando ? (
                                <span>Procesando...</span>
                              ) : alumno.tieneRolGOE ? (
                                <FaToggleOn size={20} className="text-purple-600" />
                              ) : (
                                <FaToggleOff size={20} className="text-gray-400" />
                              )}
                            </button>
                          </div>
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
                  </div>
                  
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
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
                          className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                                  ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
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
            ) : (
              <div className="p-8 text-center">
                <FaBriefcaseMedical className="mx-auto text-gray-300 text-4xl mb-4" />
                <p className="text-gray-600">Selecciona una carrera y curso para gestionar alumnos</p>
              </div>
            )}
          </div>
          
          {/* Información sobre GOE */}
          <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FaCheck className="text-purple-600 mr-2" />
                Información sobre el GOE
              </h2>
            </div>
            <div className="p-6 bg-purple-50">
              <p className="text-sm text-purple-700">
                <strong>Gabinete de Orientación Educativa (GOE):</strong> Proporciona apoyo a estudiantes con necesidades educativas especiales.
                Los alumnos con rol GOE recibirán adaptaciones según sus necesidades específicas.
                <br/><br/>
                <strong>¿Cómo funciona?</strong> Busca al alumno que requiera adaptaciones y asígnale el rol GOE usando el botón de activación.
                Puedes quitar el rol en cualquier momento si ya no es necesario.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
