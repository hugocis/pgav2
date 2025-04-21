'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCheck, FaTimes } from 'react-icons/fa';

// Interfaces para tipado
interface CursoAcademico {
  id: number;
  activo: boolean;
  denominacion: string;
  cursoAnterior: string | null;
  cursoSiguiente: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCursoAcademico() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [cursosAcademicos, setCursosAcademicos] = useState<CursoAcademico[]>([]);
  const [filteredCursos, setFilteredCursos] = useState<CursoAcademico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActive, setShowActive] = useState<boolean | null>(null);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<CursoAcademico | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Referencias para los campos del formulario
  const denominacionRef = useRef<HTMLInputElement>(null);
  const cursoAnteriorRef = useRef<HTMLInputElement>(null);
  const cursoSiguienteRef = useRef<HTMLInputElement>(null);
  const activoRef = useRef<HTMLInputElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newDenominacionRef = useRef<HTMLInputElement>(null);
  const newCursoAnteriorRef = useRef<HTMLInputElement>(null);
  const newCursoSiguienteRef = useRef<HTMLInputElement>(null);
  const newActivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCursosAcademicos = async () => {
      try {
        const response = await fetch('/api/cursos-academicos', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar cursos académicos');
        }
        
        const data = await response.json();
        setCursosAcademicos(data);
        setFilteredCursos(data);
      } catch (error) {
        setError('Error al cargar los cursos académicos');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCursosAcademicos();
  }, []);

  // Filtrado de cursos académicos
  useEffect(() => {
    let result = [...cursosAcademicos];
    
    // Filtrar por término de búsqueda (denominación)
    if (searchTerm) {
      result = result.filter(curso => 
        curso.denominacion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado activo/inactivo
    if (showActive !== null) {
      result = result.filter(curso => curso.activo === showActive);
    }

    setFilteredCursos(result);
    setCurrentPage(1); // Resetear página cuando cambian los filtros
  }, [searchTerm, showActive, cursosAcademicos]);
  
  // Obtener los cursos para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredCursos.length);
    return filteredCursos.slice(startIndex, endIndex);
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    const totalPages = Math.ceil(filteredCursos.length / itemsPerPage);
    
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }

    // Animación de scroll suave
    if (scrollContainerRef.current) {
      const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
      const scrollAmount = ((newPage - 1) / (totalPages - 1)) * 
                          (scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth);
      
      scrollContainerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleActivateCurso = async (cursoId: number, currentStatus: boolean) => {
    try {
      // Si vamos a activar un curso, confirmamos que se desactivarán los demás
      if (!currentStatus) {
        if (!confirm('Al activar este curso académico, se desactivarán todos los demás. ¿Desea continuar?')) {
          return;
        }
      }

      const response = await fetch(`/api/cursos-academicos/${cursoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ activo: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado del curso académico');
      }
      
      const updatedCurso = await response.json();

      // Al activar un curso, actualizar el estado de todos los demás cursos a inactivo
      if (!currentStatus) {
        setCursosAcademicos(cursosAcademicos.map(curso => 
          curso.id === cursoId ? { ...curso, activo: true } : { ...curso, activo: false }
        ));
      } else {
        // Solo actualizar el curso específico
        setCursosAcademicos(cursosAcademicos.map(curso => 
          curso.id === cursoId ? { ...curso, activo: false } : curso
        ));
      }

    } catch (error) {
      console.error('Error:', error);
      alert('Error al cambiar el estado del curso académico');
    }
  };

  const handleDeleteCurso = async (cursoId: number) => {
    // Verificar si el curso está activo
    const cursoToDelete = cursosAcademicos.find(curso => curso.id === cursoId);
    if (cursoToDelete?.activo) {
      alert('No se puede eliminar un curso académico activo. Debe activar otro curso primero.');
      return;
    }
    
    if (!confirm('¿Estás seguro de que deseas eliminar este curso académico? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/cursos-academicos/${cursoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el curso académico');
      }

      // Actualizar la lista de cursos
      setCursosAcademicos(cursosAcademicos.filter(curso => curso.id !== cursoId));
      alert('Curso académico eliminado correctamente');
    } catch (error) {
      alert('Error al eliminar el curso académico');
      console.error(error);
    }
  };

  const handleRowClick = (curso: CursoAcademico) => {
    setSelectedCurso(curso);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCurso(null);
    setUpdateMessage(null);
  };

  const handleUpdateCurso = async () => {
    if (!selectedCurso) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      // Validación básica
      if (!denominacionRef.current?.value) {
        setUpdateMessage({
          text: 'La denominación del curso es obligatoria',
          type: 'error'
        });
        setIsUpdating(false);
        return;
      }
      
      const updatedData = {
        denominacion: denominacionRef.current.value,
        cursoAnterior: cursoAnteriorRef.current?.value || null,
        cursoSiguiente: cursoSiguienteRef.current?.value || null,
        activo: activoRef.current?.checked || false
      };
      
      const response = await fetch(`/api/cursos-academicos/${selectedCurso.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const updatedCurso = await response.json();
        
        // Si el curso se activó, desactivar todos los demás
        if (updatedCurso.activo && !selectedCurso.activo) {
          setCursosAcademicos(cursosAcademicos.map(curso => 
            curso.id === selectedCurso.id ? updatedCurso : { ...curso, activo: false }
          ));
        } else {
          // Actualización normal
          setCursosAcademicos(cursosAcademicos.map(curso => 
            curso.id === selectedCurso.id ? updatedCurso : curso
          ));
        }
        
        setUpdateMessage({ text: 'Curso académico actualizado correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setUpdateMessage({ 
          text: errorData.message || 'Error al actualizar el curso académico', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al actualizar el curso académico:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar el curso académico', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateMessage(null);
  };

  const handleCreateCurso = async () => {
    setIsCreating(true);
    setCreateMessage(null);
    
    try {
      // Validación básica
      if (!newDenominacionRef.current?.value) {
        setCreateMessage({
          text: 'La denominación del curso es obligatoria',
          type: 'error'
        });
        setIsCreating(false);
        return;
      }
      
      const newCursoData = {
        denominacion: newDenominacionRef.current.value,
        cursoAnterior: newCursoAnteriorRef.current?.value || null,
        cursoSiguiente: newCursoSiguienteRef.current?.value || null,
        activo: newActivoRef.current?.checked || false
      };
      
      // Si se va a activar este nuevo curso, advertir al usuario
      if (newCursoData.activo) {
        if (!confirm('Al activar este nuevo curso académico, se desactivarán todos los demás. ¿Desea continuar?')) {
          setIsCreating(false);
          return;
        }
      }
      
      const response = await fetch('/api/cursos-academicos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newCursoData),
      });

      if (response.ok) {
        // Añadir el nuevo curso al estado local
        const createdCurso = await response.json();
        
        // Si el curso se creó como activo, desactivar todos los demás
        if (createdCurso.activo) {
          setCursosAcademicos([
            ...cursosAcademicos.map(curso => ({ ...curso, activo: false })),
            createdCurso
          ]);
        } else {
          setCursosAcademicos([...cursosAcademicos, createdCurso]);
        }
        
        setCreateMessage({ text: 'Curso académico creado correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setCreateMessage({ 
          text: errorData.message || 'Error al crear el curso académico', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear el curso académico:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear el curso académico', 
        type: 'error' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de bienvenida mejorado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaCalendarAlt className="mr-3" /> 
                    Administración de Cursos Académicos
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona los cursos académicos del sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaCalendarAlt className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>
      
          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Buscar por denominación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={showActive === null ? '' : showActive ? 'active' : 'inactive'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') setShowActive(null);
                      else if (value === 'active') setShowActive(true);
                      else setShowActive(false);
                    }}
                  >
                    <option value="">Todos los cursos</option>
                    <option value="active">Cursos activos</option>
                    <option value="inactive">Cursos inactivos</option>
                  </select>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                >
                  <FaPlus className="mr-2" /> Nuevo Curso
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de cursos con paginación */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando cursos académicos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">{error}</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Denominación</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso Anterior</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso Siguiente</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCursos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron cursos académicos con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageItems().map(curso => (
                        <tr key={curso.id} className={`hover:bg-gray-50 cursor-pointer ${curso.activo ? 'bg-green-50' : ''}`} onClick={() => handleRowClick(curso)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {curso.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {curso.denominacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {curso.cursoAnterior || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {curso.cursoSiguiente || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              curso.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {curso.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActivateCurso(curso.id, curso.activo);
                                }}
                                className={curso.activo ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                                title={curso.activo ? "Desactivar curso" : "Activar curso"}
                              >
                                {curso.activo ? <FaTimes className="inline" /> : <FaCheck className="inline" />}
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCurso(curso.id);
                                }} 
                                className="text-red-600 hover:text-red-900"
                                disabled={curso.activo}
                                title={curso.activo ? "No se puede eliminar un curso activo" : "Eliminar curso"}
                              >
                                <FaTrash className={`inline ${curso.activo ? 'opacity-50 cursor-not-allowed' : ''}`} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Controles de paginación */}
              {filteredCursos.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredCursos.length)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCursos.length)}</span> de{" "}
                    <span className="font-medium">{filteredCursos.length}</span> cursos académicos
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => changePage('prev')} 
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Página anterior"
                    >
                      <FaChevronLeft />
                    </button>
                    <div 
                      ref={scrollContainerRef}
                      className="flex overflow-x-auto px-1 mx-1 scroll-smooth hide-scrollbar" 
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: '200px' }}
                    >
                      {Array.from({ length: Math.min(Math.ceil(filteredCursos.length / itemsPerPage), 20) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[36px] mx-1 px-2 py-1 rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => changePage('next')} 
                      disabled={currentPage >= Math.ceil(filteredCursos.length / itemsPerPage)}
                      className={`px-3 py-1 rounded ${currentPage >= Math.ceil(filteredCursos.length / itemsPerPage) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Página siguiente"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de edición */}
      {isDialogOpen && selectedCurso && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Curso Académico: {selectedCurso.denominacion}
              </h3>
              <button 
                onClick={handleCloseDialog}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Denominación *</label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedCurso.denominacion}
                    ref={denominacionRef}
                  />
                  <p className="text-xs text-gray-500 mt-1">Ejemplo: 2024-2025</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Anterior</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedCurso.cursoAnterior || ''}
                      ref={cursoAnteriorRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Siguiente</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedCurso.cursoSiguiente || ''}
                      ref={cursoSiguienteRef}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="activo"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked={selectedCurso.activo}
                      ref={activoRef}
                    />
                    <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                      Curso académico activo
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sólo un curso académico puede estar activo a la vez. Al activar este curso, se desactivarán todos los demás.</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Los campos marcados con * son obligatorios</p>
                </div>
              </div>
            </div>
            
            {updateMessage && (
              <div className={`mx-6 p-3 rounded ${updateMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {updateMessage.text}
              </div>
            )}
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateCurso}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none flex items-center"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  </>
                ) : (
                  <>
                    Guardar cambios <FaEdit className="inline ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Diálogo de creación de curso académico */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nuevo Curso Académico
              </h3>
              <button 
                onClick={handleCloseCreateDialog}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Denominación *</label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Ejemplo: 2024-2025"
                    ref={newDenominacionRef}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Anterior</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Ejemplo: 2023-2024"
                      ref={newCursoAnteriorRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Siguiente</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Ejemplo: 2025-2026"
                      ref={newCursoSiguienteRef}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newActivo"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      ref={newActivoRef}
                    />
                    <label htmlFor="newActivo" className="ml-2 block text-sm text-gray-900">
                      Curso académico activo
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sólo un curso académico puede estar activo a la vez. Al activar este curso, se desactivarán todos los demás.</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Los campos marcados con * son obligatorios</p>
                </div>
              </div>
            </div>
            
            {createMessage && (
              <div className={`mx-6 p-3 rounded ${createMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {createMessage.text}
              </div>
            )}
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseCreateDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateCurso}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none flex items-center"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Curso <FaPlus className="inline ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
