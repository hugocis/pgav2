'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaBookOpen, FaChevronLeft, FaChevronRight, FaUserGraduate } from 'react-icons/fa';

// Interfaces para tipado
interface Matricula {
  id: number;
  fechaalta: string;
  fechaBaja: string | null;
  mostrar: boolean;
  alumno_id: string;
  asignaturaId: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    surname1: string | null;
    surname2: string | null;
    email: string;
  };
  asignatura: {
    id: number;
    CodAsignatura: string;
    Denominacion: string;
    carrera: {
      id: number;
      denominacion: string;
    }
  };
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

export default function AdminMatriculas() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [filteredMatriculas, setFilteredMatriculas] = useState<Matricula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsignatura, setSelectedAsignatura] = useState<string>('');
  const [selectedAlumno, setSelectedAlumno] = useState<string>('');
  
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [alumnos, setAlumnos] = useState<User[]>([]);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMatricula, setSelectedMatricula] = useState<Matricula | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Referencias para los campos del formulario
  const asignaturaRef = useRef<HTMLSelectElement>(null);
  const alumnoRef = useRef<HTMLSelectElement>(null);
  const mostrarRef = useRef<HTMLInputElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newAsignaturaRef = useRef<HTMLSelectElement>(null);
  const newAlumnoRef = useRef<HTMLSelectElement>(null);
  const newMostrarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMatriculas = async () => {
      try {
        const response = await fetch('/api/matriculas', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar matrículas');
        }
        
        const data = await response.json();
        setMatriculas(data);
        setFilteredMatriculas(data);
      } catch (error) {
        setError('Error al cargar las matrículas');
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

    const fetchAlumnos = async () => {
      try {
        const response = await fetch('/api/users?role=Alumno', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar alumnos');
        }
        
        const data = await response.json();
        setAlumnos(data);
      } catch (error) {
        console.error('Error al cargar los alumnos:', error);
      }
    };

    fetchMatriculas();
    fetchAsignaturas();
    fetchAlumnos();
  }, []);

  // Filtrado de matrículas
  useEffect(() => {
    let result = [...matriculas];
    
    if (searchTerm) {
      result = result.filter(matricula => 
        matricula.asignatura?.Denominacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matricula.asignatura?.CodAsignatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${matricula.user?.name || ''} ${matricula.user?.surname1 || ''} ${matricula.user?.surname2 || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedAsignatura) {
      result = result.filter(matricula => matricula.asignaturaId === parseInt(selectedAsignatura));
    }

    if (selectedAlumno) {
      result = result.filter(matricula => matricula.alumno_id === selectedAlumno);
    }

    setFilteredMatriculas(result);
    setCurrentPage(1); // Resetear página cuando cambian los filtros
  }, [searchTerm, selectedAsignatura, selectedAlumno, matriculas]);
  
  // Obtener las matrículas para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredMatriculas.length);
    return filteredMatriculas.slice(startIndex, endIndex);
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    const totalPages = Math.ceil(filteredMatriculas.length / itemsPerPage);
    
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

  const handleDeleteMatricula = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta matrícula? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/matriculas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la matrícula');
      }

      // Actualizar la lista de matrículas
      setMatriculas(matriculas.filter(matricula => matricula.id !== id));
      alert('Matrícula eliminada correctamente');
    } catch (error) {
      alert('Error al eliminar la matrícula');
      console.error(error);
    }
  };

  const handleRowClick = (matricula: Matricula) => {
    setSelectedMatricula(matricula);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMatricula(null);
  };

  const handleUpdateMatricula = async () => {
    if (!selectedMatricula) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      const updatedData = {
        asignatura: {
          connect: {
            id: parseInt(asignaturaRef.current?.value || selectedMatricula.asignaturaId.toString())
          }
        },
        alumno: {
          connect: {
            id: alumnoRef.current?.value || selectedMatricula.alumno_id
          }
        },
        mostrar: mostrarRef.current?.checked || selectedMatricula.mostrar
      };
      
      const response = await fetch(`/api/matriculas/${selectedMatricula.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        // Actualizar la matrícula en el estado local
        const updatedMatricula = await response.json();
        setMatriculas(matriculas.map(m => 
          m.id === selectedMatricula.id ? { ...m, ...updatedMatricula } : m
        ));
        setFilteredMatriculas(filteredMatriculas.map(m => 
          m.id === selectedMatricula.id ? { ...m, ...updatedMatricula } : m
        ));
        
        setUpdateMessage({ text: 'Matrícula actualizada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setUpdateMessage({ 
          text: errorData.message || 'Error al actualizar la matrícula', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al actualizar la matrícula:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar la matrícula', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateMatricula = async () => {
    setIsCreating(true);
    setCreateMessage(null);
    
    try {
      // Validación básica
      if (!newAsignaturaRef.current?.value || !newAlumnoRef.current?.value) {
        setCreateMessage({ 
          text: 'Los campos Asignatura y Alumno son obligatorios', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
      
      const newMatriculaData = {
        asignaturaId: parseInt(newAsignaturaRef.current?.value),
        alumno_id: newAlumnoRef.current?.value,
        mostrar: newMostrarRef.current?.checked || false
      };
      
      const response = await fetch('/api/matriculas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newMatriculaData),
      });

      if (response.ok) {
        // Añadir la nueva matrícula al estado local
        const createdMatricula = await response.json();
        setMatriculas([...matriculas, createdMatricula]);
        setFilteredMatriculas([...filteredMatriculas, createdMatricula]);
        
        setCreateMessage({ text: 'Matrícula creada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setCreateMessage({ 
          text: errorData.message || 'Error al crear la matrícula', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear la matrícula:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear la matrícula', 
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
                    <FaUserGraduate className="mr-3" /> 
                    Administración de Matrículas
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona las matrículas de los alumnos</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaUserGraduate className="h-8 w-8 text-white" />
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
                    placeholder="Buscar por asignatura o alumno..."
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
                    value={selectedAsignatura}
                    onChange={(e) => setSelectedAsignatura(e.target.value)}
                  >
                    <option value="">Todas las asignaturas</option>
                    {asignaturas.map(asignatura => (
                      <option key={asignatura.id} value={asignatura.id.toString()}>
                        {asignatura.CodAsignatura} - {asignatura.Denominacion}
                      </option>
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
                    value={selectedAlumno}
                    onChange={(e) => setSelectedAlumno(e.target.value)}
                  >
                    <option value="">Todos los alumnos</option>
                    {alumnos.map(alumno => (
                      <option key={alumno.id} value={alumno.id}>
                        {`${alumno.name || ''} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`.trim()}
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
                  <FaPlus className="mr-2" /> Nueva Matrícula
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de matrículas con paginación */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando matrículas...</p>
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Alta</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mostrar</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMatriculas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron matrículas con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      getCurrentPageItems().map(matricula => (
                        <tr key={matricula.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(matricula)}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {matricula.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {matricula.user ? 
                              `${matricula.user.name || ''} ${matricula.user.surname1 || ''} ${matricula.user.surname2 || ''}`.trim() : 
                              'Sin asignar'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {matricula.asignatura ? `${matricula.asignatura.CodAsignatura} - ${matricula.asignatura.Denominacion}` : 'No disponible'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(matricula.fechaalta).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {matricula.mostrar ? 'Sí' : 'No'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMatricula(matricula.id);
                              }} 
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar matrícula"
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
              {filteredMatriculas.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredMatriculas.length)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredMatriculas.length)}</span> de{" "}
                    <span className="font-medium">{filteredMatriculas.length}</span> matrículas
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
                      {Array.from({ length: Math.min(Math.ceil(filteredMatriculas.length / itemsPerPage), 20) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage >= Math.ceil(filteredMatriculas.length / itemsPerPage)}
                      className={`px-3 py-1 rounded ${currentPage >= Math.ceil(filteredMatriculas.length / itemsPerPage) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
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
      {isDialogOpen && selectedMatricula && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Matrícula: {selectedMatricula.id}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedMatricula.alumno_id}
                    ref={alumnoRef}
                  >
                    {alumnos.map(alumno => (
                      <option key={alumno.id} value={alumno.id}>
                        {`${alumno.name || ''} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    defaultValue={selectedMatricula.asignaturaId}
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
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="mostrar"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked={selectedMatricula.mostrar}
                      ref={mostrarRef}
                    />
                    <label htmlFor="mostrar" className="ml-2 block text-sm text-gray-900">
                      Mostrar
                    </label>
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
                onClick={handleUpdateMatricula}
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
      
      {/* Diálogo de creación de matrícula */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nueva Matrícula
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alumno *</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newAlumnoRef}
                    required
                  >
                    <option value="">Seleccione un alumno</option>
                    {alumnos.map(alumno => (
                      <option key={alumno.id} value={alumno.id}>
                        {`${alumno.name || ''} ${alumno.surname1 || ''} ${alumno.surname2 || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
                
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
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="newMostrar"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      ref={newMostrarRef}
                    />
                    <label htmlFor="newMostrar" className="ml-2 block text-sm text-gray-900">
                      Mostrar
                    </label>
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
                onClick={handleCreateMatricula}
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
                    Crear Matrícula <FaPlus className="inline ml-1" />
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
