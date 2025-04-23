'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaBookOpen, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Interfaces para tipado
interface Asignatura {
  id: number;
  CodAsignatura: string;
  Denominacion: string;
  Curso: number;
  Cuatrimestre: number;
  carreraId: number;
  carrera: {
    id: number;
    denominacion: string;
  };
  cursoAcademicoId: number;
  cursoAcademico: {
    id: number;
    denominacion: string;
  };
  profesorId: string | null;
  user: {
    id: string;
    name: string | null;
    surname1: string | null;
    surname2: string | null;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CursoAcademico {
  id: number;
  denominacion: string;
}

interface Carrera {
  id: number;
  denominacion: string;
}

export default function AdminAsignaturas() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [filteredAsignaturas, setFilteredAsignaturas] = useState<Asignatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrera, setSelectedCarrera] = useState<string>('');
  const [selectedCursoAcademico, setSelectedCursoAcademico] = useState<string>('');
  
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [cursosAcademicos, setCursosAcademicos] = useState<CursoAcademico[]>([]);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAsignatura, setSelectedAsignatura] = useState<Asignatura | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Lista de profesores para los selectores
  const [profesores, setProfesores] = useState<{id: string, name: string | null, surname1: string | null, surname2: string | null}[]>([]);
  
  // Referencias para los campos del formulario
  const denominacionRef = useRef<HTMLInputElement>(null);
  const cursoRef = useRef<HTMLSelectElement>(null);
  const cuatrimestreRef = useRef<HTMLSelectElement>(null);
  const carreraRef = useRef<HTMLSelectElement>(null);
  const cursoAcademicoRef = useRef<HTMLSelectElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newCodAsignaturaRef = useRef<HTMLInputElement>(null);
  const newDenominacionRef = useRef<HTMLInputElement>(null);
  const newCursoRef = useRef<HTMLSelectElement>(null);
  const newCuatrimestreRef = useRef<HTMLSelectElement>(null);
  const newCarreraRef = useRef<HTMLSelectElement>(null);
  const newCursoAcademicoRef = useRef<HTMLSelectElement>(null);
  const newProfesorRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const fetchAsignaturas = async () => {
      try {
        const response = await fetch('/api/asignaturas', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar asignaturas');
        }
        
        const data = await response.json();
        setAsignaturas(data);
        setFilteredAsignaturas(data);
      } catch (error) {
        setError('Error al cargar las asignaturas');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCarreras = async () => {
      try {
        const response = await fetch('/api/carreras', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar carreras');
        }
        
        const data = await response.json();
        setCarreras(data);
      } catch (error) {
        console.error('Error al cargar las carreras:', error);
      }
    };

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
      } catch (error) {
        console.error('Error al cargar los cursos académicos:', error);
      }
    };

    const fetchProfesores = async () => {
      try {
        const response = await fetch('/api/users?role=Profesor', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar profesores');
        }
        
        const data = await response.json();
        setProfesores(data);
      } catch (error) {
        console.error('Error al cargar los profesores:', error);
      }
    };

    fetchAsignaturas();
    fetchCarreras();
    fetchCursosAcademicos();
    fetchProfesores();
  }, []);

  // Filtrado de asignaturas
  useEffect(() => {
    let result = [...asignaturas];
    
    if (searchTerm) {
      result = result.filter(asignatura => 
        asignatura.CodAsignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asignatura.Denominacion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCarrera) {
      result = result.filter(asignatura => asignatura.carreraId === parseInt(selectedCarrera));
    }

    if (selectedCursoAcademico) {
      result = result.filter(asignatura => asignatura.cursoAcademicoId === parseInt(selectedCursoAcademico));
    }

    setFilteredAsignaturas(result);
    setCurrentPage(1); // Resetear página cuando cambian los filtros
  }, [searchTerm, selectedCarrera, selectedCursoAcademico, asignaturas]);
  // No cambiamos de página automáticamente al hacer scroll
  // Solo permitimos visualizar más números de página
  // Obtener las asignaturas para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredAsignaturas.length);
    return filteredAsignaturas.slice(startIndex, endIndex);
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    const totalPages = Math.ceil(filteredAsignaturas.length / itemsPerPage);
    
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

  const handleDeleteAsignatura = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta asignatura? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/asignaturas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la asignatura');
      }

      // Actualizar la lista de asignaturas
      setAsignaturas(asignaturas.filter(asignatura => asignatura.id !== id));
      alert('Asignatura eliminada correctamente');
    } catch (error) {
      alert('Error al eliminar la asignatura');
      console.error(error);
    }
  };

  const handleRowClick = (asignatura: Asignatura) => {
    setSelectedAsignatura(asignatura);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAsignatura(null);
  };
  const handleUpdateAsignatura = async () => {
    if (!selectedAsignatura) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      const updatedData = {
        Denominacion: denominacionRef.current?.value || selectedAsignatura.Denominacion,
        Curso: cursoRef.current?.value || selectedAsignatura.Curso.toString(), // Enviando como string para evitar error de tipo
        Cuatrimestre: cuatrimestreRef.current?.value || selectedAsignatura.Cuatrimestre.toString(), // Enviando como string para evitar error de tipo
        carrera: {
          connect: {
            id: parseInt(carreraRef.current?.value || selectedAsignatura.carreraId.toString())
          }
        },
        cursoAcademico: {
          connect: {
            id: parseInt(cursoAcademicoRef.current?.value || selectedAsignatura.cursoAcademicoId.toString())
          }
        }
      };
      
      const response = await fetch(`/api/asignaturas/${selectedAsignatura.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        // Actualizar la asignatura en el estado local
        const updatedAsignatura = await response.json();
        setAsignaturas(asignaturas.map(a => 
          a.id === selectedAsignatura.id ? { ...a, ...updatedAsignatura } : a
        ));
        setFilteredAsignaturas(filteredAsignaturas.map(a => 
          a.id === selectedAsignatura.id ? { ...a, ...updatedAsignatura } : a
        ));
        
        setUpdateMessage({ text: 'Asignatura actualizada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setUpdateMessage({ 
          text: errorData.message || 'Error al actualizar la asignatura', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al actualizar la asignatura:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar la asignatura', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };
  const handleCreateAsignatura = async () => {
    setIsCreating(true);
    setCreateMessage(null);
    
    try {
      // Validación básica
      if (!newCodAsignaturaRef.current?.value || !newDenominacionRef.current?.value) {
        setCreateMessage({ 
          text: 'Los campos Código y Denominación son obligatorios', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
      
      const newAsignaturaData = {
        CodAsignatura: newCodAsignaturaRef.current?.value,
        Denominacion: newDenominacionRef.current?.value,
        Curso: newCursoRef.current?.value || '1', // Enviando como string para evitar error de tipo
        Cuatrimestre: newCuatrimestreRef.current?.value || '1', // Enviando como string para evitar error de tipo
        carreraId: parseInt(newCarreraRef.current?.value || '1'),
        cursoAcademicoId: parseInt(newCursoAcademicoRef.current?.value || '1'),
        profesorId: newProfesorRef.current?.value || null // Añadiendo profesorId
      };
      
      const response = await fetch('/api/asignaturas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newAsignaturaData),
      });

      if (response.ok) {
        // Añadir la nueva asignatura al estado local
        const createdAsignatura = await response.json();
        setAsignaturas([...asignaturas, createdAsignatura]);
        setFilteredAsignaturas([...filteredAsignaturas, createdAsignatura]);
        
        setCreateMessage({ text: 'Asignatura creada correctamente', type: 'success' });
        
        // Resetear formulario
        if (newCodAsignaturaRef.current) newCodAsignaturaRef.current.value = '';
        if (newDenominacionRef.current) newDenominacionRef.current.value = '';
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setCreateMessage({ 
          text: errorData.message || 'Error al crear la asignatura', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear la asignatura:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear la asignatura', 
        type: 'error' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateMessage(null);
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
                    <FaBookOpen className="mr-3" /> 
                    Administración de Asignaturas
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona las asignaturas del sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaBookOpen className="h-8 w-8 text-white" />
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
                    placeholder="Buscar por código o nombre..."
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
                    value={selectedCarrera}
                    onChange={(e) => setSelectedCarrera(e.target.value)}
                  >                    <option value="">Todas las carreras</option>
                    {carreras.map(carrera => (
                      <option key={carrera.id} value={carrera.id.toString()}>{carrera.denominacion}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="w-full md:w-64">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedCursoAcademico}
                    onChange={(e) => setSelectedCursoAcademico(e.target.value)}
                  >                    <option value="">Todos los cursos académicos</option>
                    {cursosAcademicos.map(curso => (
                      <option key={curso.id} value={curso.id.toString()}>{curso.denominacion}</option>
                    ))}
                  </select>
                </div>
              </div>              <div>
                <button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                >
                  <FaPlus className="mr-2" /> Nueva Asignatura
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de asignaturas con paginación por scroll */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando asignaturas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">{error}</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso/Cuatrimestre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrera</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso Académico</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesor</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAsignaturas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron asignaturas con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageItems().map(asignatura => (
                        <tr key={asignatura.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(asignatura)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {asignatura.CodAsignatura}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {asignatura.Denominacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {`${asignatura.Curso}º curso / ${asignatura.Cuatrimestre === 3 ? 'Anual' : asignatura.Cuatrimestre + ' cuatrimestre'}`
                              .replace('ºº', 'º')
                              .replace('Anualº', 'Anual')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asignatura.carrera.denominacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asignatura.cursoAcademico.denominacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {asignatura.user ? 
                              `${asignatura.user.name || ''} ${asignatura.user.surname1 || ''} ${asignatura.user.surname2 || ''}`.trim() : 
                              'Sin asignar'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAsignatura(asignatura.id);
                              }} 
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar asignatura"
                            >
                              <FaTrash className="inline" /> Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                {/* Controles de paginación */}
              {filteredAsignaturas.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAsignaturas.length)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAsignaturas.length)}</span> de{" "}
                    <span className="font-medium">{filteredAsignaturas.length}</span> asignaturas
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
                      {Array.from({ length: Math.min(Math.ceil(filteredAsignaturas.length / itemsPerPage), 20) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage >= Math.ceil(filteredAsignaturas.length / itemsPerPage)}
                      className={`px-3 py-1 rounded ${currentPage >= Math.ceil(filteredAsignaturas.length / itemsPerPage) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
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
      </div>      {/* Diálogo de edición */}
      {isDialogOpen && selectedAsignatura && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Asignatura: {selectedAsignatura.Denominacion}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.CodAsignatura}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Denominación</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.Denominacion}
                      ref={denominacionRef}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.Curso}
                      ref={cursoRef}
                    >
                      <option value="1">1º</option>
                      <option value="2">2º</option>
                      <option value="3">3º</option>
                      <option value="4">4º</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuatrimestre</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.Cuatrimestre === 3 ? "3" : selectedAsignatura.Cuatrimestre.toString()}
                      ref={cuatrimestreRef}
                    >
                      <option value="1">1º</option>
                      <option value="2">2º</option>
                      <option value="3">Anual</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.carreraId}
                      ref={carreraRef}
                    >
                      {carreras.map(carrera => (
                        <option key={carrera.id} value={carrera.id}>
                          {carrera.denominacion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Académico</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedAsignatura.cursoAcademicoId}
                      ref={cursoAcademicoRef}
                    >
                      {cursosAcademicos.map(curso => (
                        <option key={curso.id} value={curso.id}>
                          {curso.denominacion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedAsignatura.user ? 
                      `${selectedAsignatura.user.name || ''} ${selectedAsignatura.user.surname1 || ''} ${selectedAsignatura.user.surname2 || ''}`.trim() : 
                      'Sin asignar'
                    }
                    readOnly
                  />
                  <p className="mt-1 text-xs text-gray-500">Para cambiar el profesor asignado, por favor utiliza la función específica en el panel de administración</p>
                </div>
              </div>
            </div>
              {updateMessage && (
              <div className={`mt-4 p-3 rounded ${updateMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
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
                onClick={handleUpdateAsignatura}
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
      
      {/* Diálogo de creación de asignatura */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nueva Asignatura
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Ej: MAT101"
                      ref={newCodAsignaturaRef}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Denominación *</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Ej: Matemáticas I"
                      ref={newDenominacionRef}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newCursoRef}
                    >
                      <option value="1">1º</option>
                      <option value="2">2º</option>
                      <option value="3">3º</option>
                      <option value="4">4º</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuatrimestre</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newCuatrimestreRef}
                    >
                      <option value="1">1º</option>
                      <option value="2">2º</option>
                      <option value="3">Anual</option>
                    </select>
                  </div>                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newCarreraRef}
                    >
                      {carreras.map(carrera => (
                        <option key={carrera.id} value={carrera.id}>
                          {carrera.denominacion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso Académico</label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newCursoAcademicoRef}
                    >
                      {cursosAcademicos.map(curso => (
                        <option key={curso.id} value={curso.id}>
                          {curso.denominacion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newProfesorRef}
                  >
                    <option value="">Sin asignar</option>
                    {profesores.map(profesor => (
                      <option key={profesor.id} value={profesor.id}>
                        {`${profesor.name || ''} ${profesor.surname1 || ''} ${profesor.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
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
                onClick={handleCreateAsignatura}
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
                    Crear Asignatura <FaPlus className="inline ml-1" />
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
