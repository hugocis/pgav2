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
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaUser
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

interface Carrera {
  id: string;
  denominacion: string;
}

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
  dni: string;
  email: string;
}

interface AlumnoGOE {
  id: string;
  name: string;
  surname1: string;
  surname2?: string;
  dni: string;
  email: string;
  tipoNecesidad: string;
  fechaRegistro: string;
  observaciones: string;
  estado: 'activo' | 'inactivo';
  alumnoId: string; // ID del usuario alumno en la base de datos
}

// Datos de ejemplo para tipos de necesidades especiales
const tiposNecesidades = [
  "Dificultades de aprendizaje",
  "Trastorno por déficit de atención (TDA/TDAH)",
  "Discapacidad visual",
  "Discapacidad auditiva",
  "Discapacidad física/motora",
  "Trastorno del espectro autista",
  "Altas capacidades",
  "Dislexia",
  "Otro"
];

export default function AlumnosGOE() {
  // Un PEC está asociado a uno o varios curso(s) (1º, 2º, 3º, 4º)
  // y gestiona a los alumnos de ese curso (todos los estudiantes que tienen asignaturas en ese curso)
  // Aquí podemos ver los alumnos con necesidades especiales (GOE) para facilitar su seguimiento
  const { data: session } = useSession();
  const [carrerasCursos, setCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [selectedCarreraCurso, setSelectedCarreraCurso] = useState<string>('');
  const [alumnosGOE, setAlumnosGOE] = useState<AlumnoGOE[]>([]);
  const [filteredAlumnos, setFilteredAlumnos] = useState<AlumnoGOE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estado para manejo del modal de creación/edición
  const [showModal, setShowModal] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState<AlumnoGOE | null>(null);
  const [formData, setFormData] = useState({
    alumnoId: '', // ID del usuario alumno en la base de datos
    tipoNecesidad: '',
    observaciones: '',
    estado: 'activo'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para la búsqueda de alumnos existentes
  const [searchingAlumnos, setSearchingAlumnos] = useState<boolean>(false);
  const [alumnosSearchTerm, setAlumnosSearchTerm] = useState<string>('');
  const [alumnosResults, setAlumnosResults] = useState<Alumno[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);

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
  }, [session]);  // Efecto para cargar alumnos GOE cuando se selecciona una carrera-curso
  useEffect(() => {
    if (!selectedCarreraCurso) {
      setAlumnosGOE([]);
      setFilteredAlumnos([]);
      return;
    }

    const fetchAlumnosGOE = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Llamada real a la API para obtener los alumnos GOE
        const response = await fetch(`/api/alumnos-goe?carreraCursoId=${selectedCarreraCurso}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al cargar alumnos GOE: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ordenar por apellido y nombre
        const alumnosOrdenados = data.sort((a: AlumnoGOE, b: AlumnoGOE) => {
          return a.surname1.localeCompare(b.surname1) || a.name.localeCompare(b.name);
        });
        
        setAlumnosGOE(alumnosOrdenados);
        setFilteredAlumnos(alumnosOrdenados);
      } catch (error) {
        console.error('Error al cargar datos de alumnos GOE:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setAlumnosGOE([]);
        setFilteredAlumnos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlumnosGOE();
  }, [selectedCarreraCurso]);

  // Efecto para filtrar alumnos cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setFilteredAlumnos(alumnosGOE);
      return;
    }

    const filtered = alumnosGOE.filter(alumno => {
      const fullName = `${alumno.name} ${alumno.surname1} ${alumno.surname2 || ''}`.toLowerCase();
      const email = alumno.email.toLowerCase();
      const tipo = alumno.tipoNecesidad.toLowerCase();
      return (
        fullName.includes(searchTerm.toLowerCase()) || 
        email.includes(searchTerm.toLowerCase()) ||
        tipo.includes(searchTerm.toLowerCase())
      );
    });
    
    setFilteredAlumnos(filtered);
  }, [searchTerm, alumnosGOE]);

  // Función para formatear el nombre completo
  const getFullName = (alumno: AlumnoGOE) => {
    return `${alumno.surname1} ${alumno.surname2 ? alumno.surname2 + ',' : ','} ${alumno.name}`;
  };

  // Función para buscar alumnos existentes
  const handleSearchAlumnos = async () => {
    if (!alumnosSearchTerm.trim()) {
      return;
    }
    
    setSearchingAlumnos(true);
    setAlumnosResults([]);
    
    try {
      // Buscar alumnos existentes en la base de datos
      const response = await fetch(`/api/alumnos/search?query=${encodeURIComponent(alumnosSearchTerm)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error al buscar alumnos: ${response.status}`);
      }
      
      const data = await response.json();
      setAlumnosResults(data);
    } catch (error) {
      console.error('Error al buscar alumnos:', error);
      toast.error(`Error al buscar alumnos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setSearchingAlumnos(false);
    }
  };

  // Función para seleccionar un alumno de la búsqueda
  const handleSelectAlumno = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setFormData(prev => ({
      ...prev,
      alumnoId: alumno.id
    }));
  };

  // Función para abrir modal en modo creación
  const handleOpenCreateModal = () => {
    setEditingAlumno(null);
    setFormData({
      alumnoId: '',
      tipoNecesidad: '',
      observaciones: '',
      estado: 'activo'
    });
    setSelectedAlumno(null);
    setAlumnosSearchTerm('');
    setAlumnosResults([]);
    setShowModal(true);
  };

  // Función para abrir modal en modo edición
  const handleOpenEditModal = (alumno: AlumnoGOE) => {
    setEditingAlumno(alumno);
    setFormData({
      alumnoId: alumno.alumnoId,
      tipoNecesidad: alumno.tipoNecesidad,
      observaciones: alumno.observaciones || '',
      estado: alumno.estado
    });
    // Para la edición, necesitamos cargar los datos del alumno desde la API
    // para mostrar su información en el formulario
    const fetchAlumnoData = async () => {
      try {
        const response = await fetch(`/api/alumnos/${alumno.alumnoId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const alumnoData = await response.json();
          setSelectedAlumno(alumnoData);
        }
      } catch (error) {
        console.error('Error al cargar datos del alumno:', error);
      }
    };
    
    fetchAlumnoData();
    setShowModal(true);
  };

  // Función para manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para guardar el formulario
  const handleSaveAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar datos obligatorios
    if (!formData.alumnoId || !formData.tipoNecesidad || !selectedCarreraCurso) {
      setFormError('Debes seleccionar un alumno y el tipo de necesidad');
      return;
    }
    
    setIsSaving(true);
    setFormError(null);
    
    try {
      const url = editingAlumno 
        ? `/api/alumnos-goe/${editingAlumno.id}` 
        : '/api/alumnos-goe';
      
      const method = editingAlumno ? 'PUT' : 'POST';
      
      // Enviamos los datos del formulario
      const dataToSend = {
        ...formData,
        carreraCursoId: selectedCarreraCurso,
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        throw new Error(`Error al ${editingAlumno ? 'actualizar' : 'crear'} alumno GOE: ${response.status}`);
      }

      const updatedAlumno = await response.json();
      
      // Actualizar la lista local de alumnos GOE
      setAlumnosGOE(prevAlumnos => {
        if (editingAlumno) {
          return prevAlumnos.map(alumno => 
            alumno.id === updatedAlumno.id ? updatedAlumno : alumno
          );
        } else {
          return [...prevAlumnos, updatedAlumno];
        }
      });
      
      // Actualizar también la lista filtrada
      setFilteredAlumnos(prevAlumnos => {
        if (editingAlumno) {
          return prevAlumnos.map(alumno => 
            alumno.id === updatedAlumno.id ? updatedAlumno : alumno
          );
        } else {
          const newList = [...prevAlumnos, updatedAlumno];
          // Ordenar por apellido y nombre
          return newList.sort((a, b) => a.surname1.localeCompare(b.surname1) || a.name.localeCompare(b.name));
        }
      });
      
      // Cerrar modal
      setShowModal(false);
      
      // Mostrar mensaje de éxito
      toast.success(`Alumno GOE ${editingAlumno ? 'actualizado' : 'registrado'} correctamente`);
      
    } catch (error) {
      console.error(`Error al ${editingAlumno ? 'actualizar' : 'guardar'} alumno GOE:`, error);
      setFormError(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Función para eliminar un alumno GOE
  const handleDeleteAlumno = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
      try {
        const response = await fetch(`/api/alumnos-goe/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al eliminar alumno GOE: ${response.status}`);
        }
        
        // Eliminación exitosa - actualizar estado local
        setAlumnosGOE(prev => prev.filter(alumno => alumno.id !== id));
        setFilteredAlumnos(prev => prev.filter(alumno => alumno.id !== id));
        
        // Mostrar mensaje de éxito
        toast.success('Alumno GOE eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar alumno GOE:', error);
        toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
  };

  return (
    <DashboardContainer roleName="PEC">
      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            {/* Encabezado del modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                {editingAlumno ? 'Editar alumno GOE' : 'Registrar nuevo alumno GOE'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
              <form onSubmit={handleSaveAlumno}>
              <div className="px-6 py-4 space-y-4">
                {/* Búsqueda de alumno existente */}
                <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <FaUser className="mr-2 text-purple-600" /> 
                    {editingAlumno ? 'Alumno seleccionado' : 'Buscar alumno existente*'}
                  </h4>
                  
                  {!editingAlumno && (
                    <div className="mb-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Buscar por nombre, apellido, email o DNI..."
                          value={alumnosSearchTerm}
                          onChange={(e) => setAlumnosSearchTerm(e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={handleSearchAlumnos}
                          disabled={searchingAlumnos}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center hover:bg-purple-700 disabled:bg-purple-300"
                        >
                          {searchingAlumnos ? 'Buscando...' : <><FaSearch className="mr-2" /> Buscar</>}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Resultados de búsqueda */}
                  {alumnosResults.length > 0 && !selectedAlumno && (
                    <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                            <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {alumnosResults.map((alumno) => (
                            <tr key={alumno.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {alumno.surname1} {alumno.surname2 ? alumno.surname2 + ',' : ','} {alumno.name}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {alumno.email}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {alumno.dni}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => handleSelectAlumno(alumno)}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {/* Alumno seleccionado */}
                  {selectedAlumno && (
                    <div className="bg-white border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div className="mb-1 font-medium">
                          {selectedAlumno.surname1} {selectedAlumno.surname2 ? selectedAlumno.surname2 + ',' : ','} {selectedAlumno.name}
                        </div>
                        {!editingAlumno && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAlumno(null);
                              setFormData(prev => ({...prev, alumnoId: ''}));
                            }}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <div>Email: {selectedAlumno.email}</div>
                        <div>DNI: {selectedAlumno.dni}</div>
                      </div>
                    </div>
                  )}
                  
                  {formError && !selectedAlumno && (
                    <div className="mt-2 text-sm text-red-600">
                      {formError}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de necesidad*
                    </label>
                    <select
                      name="tipoNecesidad"
                      value={formData.tipoNecesidad}
                      onChange={handleInputChange}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Seleccionar...</option>
                      {tiposNecesidades.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <div className="flex space-x-4 mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="estado"
                          value="activo"
                          checked={formData.estado === 'activo'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="ml-2 text-gray-700">Activo</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="estado"
                          value="inactivo"
                          checked={formData.estado === 'inactivo'}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="ml-2 text-gray-700">Inactivo</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  ></textarea>
                </div>
                
                {formError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
                    {formError}
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingAlumno ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
                <button 
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center hover:bg-purple-700"
                >
                  <FaPlus className="mr-2" /> Nuevo Registro GOE
                </button>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            
            {/* Descripción */}
            <div className="px-6 py-4 bg-white">
              <p className="text-gray-600">Gestiona y haz seguimiento de los alumnos con necesidades especiales registrados en el Gabinete de Orientación Educativa.</p>
            </div>
          </div>        {/* Selector de carrera y curso */}
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
                    placeholder="Buscar por nombre, email o tipo de necesidad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div className="flex items-end space-x-2">
                <button className="p-3 bg-purple-50 border border-purple-300 rounded-md flex items-center text-purple-600 hover:bg-purple-100 transition-all">
                  <FaFilter className="mr-2" /> Filtrar
                </button>
              </div>
            </div>
          </div>
        </div>        {/* Tabla de alumnos GOE */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FaBriefcaseMedical className="text-purple-600 mr-2" />
              {selectedCarreraCurso 
                ? `Alumnos con necesidades especiales (${filteredAlumnos.length})`
                : 'Selecciona una carrera y curso para ver alumnos con GOE'}
            </h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500 border-r-2 border-b-0 border-l-0 mb-4"></div>
              <p className="text-gray-600">Cargando datos de alumnos con GOE...</p>
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
              <p className="text-gray-600 mb-4">No hay alumnos registrados con necesidades especiales en este curso</p>
              <button 
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center mx-auto hover:bg-purple-700"
              >
                <FaPlus className="mr-2" /> Registrar alumno GOE
              </button>
            </div>
          ) : selectedCarreraCurso ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alumno</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de necesidad</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de registro</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {alumno.tipoNecesidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {alumno.fechaRegistro}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          alumno.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {alumno.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center space-x-3">
                          <button 
                            onClick={() => handleOpenEditModal(alumno)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteAlumno(alumno.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FaBriefcaseMedical className="mx-auto text-gray-300 text-4xl mb-4" />
              <p className="text-gray-600">Selecciona una carrera y curso para gestionar alumnos con GOE</p>
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
              Los alumnos registrados aquí recibirán adaptaciones según sus necesidades específicas.
            </p>
          </div>
        </div>
      </div>
      </div>
    </DashboardContainer>
  );
}
