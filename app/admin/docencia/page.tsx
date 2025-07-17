'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { FaPlus, FaEdit, FaSearch, FaFilter, FaBookOpen, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// Interfaces para tipado
interface Docencia {
  id: number;
  fechaalta: string;
  fechaBaja: string | null;
  asignaturaId: number;
  profesorId: string;
  profesorTitularId?: string | null;
  mostrar: boolean;
  createdAt: string;
  updatedAt: string;
  asignatura: {
    id: number;
    CodAsignatura: string;
    Denominacion: string;
    carrera: {
      id: number;
      denominacion: string;
    }
  };
  user: {
    id: string;
    name: string | null;
    surname1: string | null;
    surname2: string | null;
    email: string;
  };
  profesorTitular?: {
    id: string;
    name: string | null;
    surname1: string | null;
    surname2: string | null;
    email: string;
  } | null;
}

interface Asignatura {
  id: number;
  CodAsignatura: string;
  Denominacion: string;
  carreraId: number;
}

interface User {
  id: string;
  name: string | null;
  surname1: string | null;
  surname2: string | null;
  email: string;
}

interface Carrera {
  id: number;
  denominacion: string;
}

export default function AdminDocencia() {
  useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });
  const [docencias, setDocencias] = useState<Docencia[]>([]);
  const [filteredDocencias, setFilteredDocencias] = useState<Docencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrera, setSelectedCarrera] = useState<string>('');
  
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [profesores, setProfesores] = useState<User[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocencia, setSelectedDocencia] = useState<Docencia | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    // Referencias para los campos del formulario
  const asignaturaRef = useRef<HTMLSelectElement>(null);
  const profesorRef = useRef<HTMLSelectElement>(null);
  const profesorTitularRef = useRef<HTMLSelectElement>(null);
  const mostrarRef = useRef<HTMLInputElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newAsignaturaRef = useRef<HTMLSelectElement>(null);
  const newProfesorRef = useRef<HTMLSelectElement>(null);
  const newProfesorTitularRef = useRef<HTMLSelectElement>(null);
  const newMostrarRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const fetchDocencias = async () => {
      try {
        const response = await fetch('/api/docencia', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar docencias');
        }
        
        const data = await response.json();
        setDocencias(data);
        setFilteredDocencias(data);
      } catch (error) {
        setError('Error al cargar las docencias');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

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
      } catch (error) {
        console.error('Error al cargar las asignaturas:', error);
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

    fetchDocencias();
    fetchAsignaturas();
    fetchProfesores();
    fetchCarreras();
  }, []);// Filtrado de docencias
  useEffect(() => {
    let result = [...docencias];
    
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(docencia => 
        (docencia.asignatura?.Denominacion || '').toLowerCase().includes(searchTermLower) ||
        (docencia.asignatura?.CodAsignatura || '').toLowerCase().includes(searchTermLower) ||
        `${docencia.user?.name || ''} ${docencia.user?.surname1 || ''} ${docencia.user?.surname2 || ''}`.toLowerCase().includes(searchTermLower)
      );
    }    if (selectedCarrera && selectedCarrera !== '') {
      // No convertimos a número, comparamos como string directamente
      result = result.filter(docencia => docencia.asignatura?.carrera?.id.toString() === selectedCarrera);
    }

    setFilteredDocencias(result);
    setCurrentPage(1); // Resetear página cuando cambian los filtros
  }, [searchTerm, selectedCarrera, docencias]);
  
  // Obtener las docencias para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredDocencias.length);
    return filteredDocencias.slice(startIndex, endIndex);
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    const totalPages = Math.ceil(filteredDocencias.length / itemsPerPage);
    
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

  const handleRowClick = (docencia: Docencia) => {
    setSelectedDocencia(docencia);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedDocencia(null);
  };
  const handleUpdateDocencia = async () => {
    if (!selectedDocencia) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      const updatedData = {
        asignatura: {
          connect: {
            id: parseInt(asignaturaRef.current?.value || selectedDocencia.asignaturaId.toString())
          }
        },
        profesor: {
          connect: {
            id: profesorRef.current?.value || selectedDocencia.profesorId
          }
        },
        profesorTitular: profesorTitularRef.current?.value ? {
          connect: {
            id: profesorTitularRef.current.value
          }
        } : {
          disconnect: true
        },
        mostrar: mostrarRef.current?.checked || selectedDocencia.mostrar
      };
      
      const response = await fetch(`/api/docencia/${selectedDocencia.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        // Actualizar la docencia en el estado local
        const updatedDocencia = await response.json();
        setDocencias(docencias.map(d => 
          d.id === selectedDocencia.id ? { ...d, ...updatedDocencia } : d
        ));
        setFilteredDocencias(filteredDocencias.map(d => 
          d.id === selectedDocencia.id ? { ...d, ...updatedDocencia } : d
        ));
        
        setUpdateMessage({ text: 'Docencia actualizada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setUpdateMessage({ 
          text: errorData.message || 'Error al actualizar la docencia', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al actualizar la docencia:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar la docencia', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateDocencia = async () => {
    setIsCreating(true);
    setCreateMessage(null);
    
    try {
      // Validación básica
      if (!newAsignaturaRef.current?.value || !newProfesorRef.current?.value) {
        setCreateMessage({ 
          text: 'Los campos Asignatura y Profesor son obligatorios', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
        const newDocenciaData = {
        asignaturaId: newAsignaturaRef.current?.value,
        profesorId: newProfesorRef.current?.value,
        profesorTitularId: newProfesorTitularRef.current?.value || null,
        mostrar: newMostrarRef.current?.checked || false
      };
      
      const response = await fetch('/api/docencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newDocenciaData),
      });

      if (response.ok) {
        // Añadir la nueva docencia al estado local
        const createdDocencia = await response.json();
        setDocencias([...docencias, createdDocencia]);
        setFilteredDocencias([...filteredDocencias, createdDocencia]);
        
        setCreateMessage({ text: 'Docencia creada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setCreateMessage({ 
          text: errorData.message || 'Error al crear la docencia', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear la docencia:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear la docencia', 
        type: 'error' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Función para cerrar el diálogo de creación
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateMessage(null);
  };

  // Función para manejar clics fuera de los diálogos
  const handleClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    // Si se hizo clic en el fondo (div exterior), cerrar el diálogo
    if (event.target === event.currentTarget) {
      if (isDialogOpen) {
        handleCloseDialog();
      } else if (isCreateDialogOpen) {
        handleCloseCreateDialog();
      }
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
                    <FaBookOpen className="mr-3" /> 
                    Administración de Docencia
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona las asignaciones de docencia</p>
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
                    placeholder="Buscar por asignatura o profesor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>              <div className="w-full md:w-64">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedCarrera}
                    onChange={(e) => setSelectedCarrera(e.target.value)}
                  >
                    <option value="">Todas las carreras</option>
                    {carreras.map(carrera => (
                      <option key={carrera.id} value={carrera.id.toString()}>
                        {carrera.denominacion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                >
                  <FaPlus className="mr-2" /> Nueva Docencia
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de docencias con paginación */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando docencias...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">{error}</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesor Titular</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrera</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mostrar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">                    {filteredDocencias.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron docencias con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (getCurrentPageItems().map(docencia => (
                        <tr key={docencia.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(docencia)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {docencia.asignatura ? `${docencia.asignatura.Denominacion} (${docencia.asignatura.CodAsignatura})` : 'No disponible'}
                          </td>                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {docencia.user ? 
                              `${docencia.user.name || ''} ${docencia.user.surname1 || ''} ${docencia.user.surname2 || ''}`.trim() : 
                              'Sin asignar'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {docencia.profesorTitular ? 
                              `${docencia.profesorTitular.name || ''} ${docencia.profesorTitular.surname1 || ''} ${docencia.profesorTitular.surname2 || ''}`.trim() : 
                              'Sin asignar'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {docencia.asignatura?.carrera ? docencia.asignatura.carrera.denominacion : 'No asignada'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                docencia.mostrar 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation(); // Evitar que se active el onClick del tr
                                // Esta función solo muestra el indicador visual, no realiza la acción
                                // La actualización real ocurre en el diálogo
                              }}
                            >
                              {docencia.mostrar ? 'Visible' : 'Oculto'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Controles de paginación */}
              {filteredDocencias.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredDocencias.length)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredDocencias.length)}</span> de{" "}
                    <span className="font-medium">{filteredDocencias.length}</span> docencias
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
                      {Array.from({ length: Math.min(Math.ceil(filteredDocencias.length / itemsPerPage), 20) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage >= Math.ceil(filteredDocencias.length / itemsPerPage)}
                      className={`px-3 py-1 rounded ${currentPage >= Math.ceil(filteredDocencias.length / itemsPerPage) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
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
      {isDialogOpen && selectedDocencia && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Docencia: {selectedDocencia.id}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedDocencia.asignaturaId}
                    ref={asignaturaRef}
                  >
                    {asignaturas.map(asignatura => (
                      <option key={asignatura.id} value={asignatura.id}>
                        {asignatura.CodAsignatura} - {asignatura.Denominacion}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedDocencia.profesorId}
                    ref={profesorRef}
                  >
                    {profesores.map(profesor => (
                      <option key={profesor.id} value={profesor.id}>
                        {`${profesor.name || ''} ${profesor.surname1 || ''} ${profesor.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor Titular</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedDocencia.profesorTitularId || ""}
                    ref={profesorTitularRef}
                  >
                    <option value="">Sin profesor titular</option>
                    {profesores.map(profesor => (
                      <option key={profesor.id} value={profesor.id}>
                        {`${profesor.name || ''} ${profesor.surname1 || ''} ${profesor.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visible en el sistema</label>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (mostrarRef.current) {
                          mostrarRef.current.checked = !mostrarRef.current.checked;
                        }
                      }}
                      className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        selectedDocencia.mostrar ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      role="switch"
                      aria-checked={selectedDocencia.mostrar}
                    >
                      <span className="sr-only">Mostrar asignatura</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          selectedDocencia.mostrar ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      ></span>
                    </button>
                    <input
                      type="checkbox"
                      id="mostrar"
                      className="sr-only"
                      defaultChecked={selectedDocencia.mostrar}
                      ref={mostrarRef}
                    />
                    <span className="ml-3 text-sm text-gray-500">
                      {selectedDocencia.mostrar ? 'Visible para los alumnos' : 'Oculto para los alumnos'}
                    </span>
                  </div>
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
                onClick={handleUpdateDocencia}
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
        {/* Diálogo de creación de docencia */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={handleClickOutside}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nueva Docencia
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura *</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newAsignaturaRef}
                    required
                  >
                    <option value="">Seleccione una asignatura</option>
                    {asignaturas.map(asignatura => (
                      <option key={asignatura.id} value={asignatura.id}>
                        {asignatura.CodAsignatura} - {asignatura.Denominacion}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor *</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newProfesorRef}
                    required
                  >
                    <option value="">Seleccione un profesor</option>
                    {profesores.map(profesor => (
                      <option key={profesor.id} value={profesor.id}>
                        {`${profesor.name || ''} ${profesor.surname1 || ''} ${profesor.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profesor Titular</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newProfesorTitularRef}
                  >
                    <option value="">Sin profesor titular</option>
                    {profesores.map(profesor => (
                      <option key={profesor.id} value={profesor.id}>
                        {`${profesor.name || ''} ${profesor.surname1 || ''} ${profesor.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visible en el sistema</label>
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (newMostrarRef.current) {
                          newMostrarRef.current.checked = !newMostrarRef.current.checked;
                        }
                      }}
                      className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gray-200"
                      role="switch"
                      aria-checked="false"
                    >
                      <span className="sr-only">Mostrar asignatura</span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 translate-x-0"
                        id="newMostrarToggle"
                      ></span>
                    </button>
                    <input
                      type="checkbox"
                      id="newMostrar"
                      className="sr-only"
                      ref={newMostrarRef}
                      onChange={() => {
                        const toggle = document.getElementById('newMostrarToggle');
                        if (toggle && newMostrarRef.current) {
                          toggle.classList.toggle('translate-x-5');
                          toggle.classList.toggle('translate-x-0');
                          toggle.closest('button')?.classList.toggle('bg-blue-600');
                          toggle.closest('button')?.classList.toggle('bg-gray-200');
                        }
                      }}
                    />
                    <span className="ml-3 text-sm text-gray-500" id="newMostrarText">
                      Oculto para los alumnos
                    </span>
                  </div>
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
                onClick={handleCreateDocencia}
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
                    Crear Docencia <FaPlus className="inline ml-1" />
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
