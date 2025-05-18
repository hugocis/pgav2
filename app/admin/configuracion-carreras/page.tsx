'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { FaPlus, FaEdit, FaSearch, FaFilter, FaUniversity, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';

// Interfaces para tipado
interface ConfiguracionCarrera {
  id: string;
  FechaInicioDispensa: string | null;
  FechaFinDispensa: string | null;
  SolDispensa: boolean;
  SolJustificacion: boolean;
  carreraId: string;
  createdAt: string;
  updatedAt: string;
  carrera: {
    id: string;
    denominacion: string;
  };
}

interface Carrera {
  id: string;
  denominacion: string;
}

export default function AdminConfiguracionCarreras() {
  useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [configuraciones, setConfiguraciones] = useState<ConfiguracionCarrera[]>([]);
  const [filteredConfiguraciones, setFilteredConfiguraciones] = useState<ConfiguracionCarrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCarrera, setSelectedCarrera] = useState<string>('');
  
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carrerasSinConfig, setCarrerasSinConfig] = useState<Carrera[]>([]);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConfiguracion, setSelectedConfiguracion] = useState<ConfiguracionCarrera | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Referencias para los campos del formulario
  const fechaInicioDispensaRef = useRef<HTMLInputElement>(null);
  const fechaFinDispensaRef = useRef<HTMLInputElement>(null);
  const solDispensaRef = useRef<HTMLInputElement>(null);
  const solJustificacionRef = useRef<HTMLInputElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newCarreraRef = useRef<HTMLSelectElement>(null);
  const newFechaInicioDispensaRef = useRef<HTMLInputElement>(null);
  const newFechaFinDispensaRef = useRef<HTMLInputElement>(null);
  const newSolDispensaRef = useRef<HTMLInputElement>(null);
  const newSolJustificacionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfiguracionesCarreras = async () => {
      try {
        const response = await fetch('/api/configuracion-carrera', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar configuraciones de carreras');
        }
        
        const data = await response.json();
        setConfiguraciones(data);
        setFilteredConfiguraciones(data);
      } catch (error) {
        setError('Error al cargar las configuraciones de carreras');
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

    fetchConfiguracionesCarreras();
    fetchCarreras();
  }, []);

  // Filtrado de configuraciones y cálculo de carreras sin configuración
  useEffect(() => {
    let result = [...configuraciones];
    
    if (searchTerm) {
      result = result.filter(config => 
        config.carrera?.denominacion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }    if (selectedCarrera) {
      result = result.filter(config => config.carreraId === selectedCarrera);
    }

    setFilteredConfiguraciones(result);
    setCurrentPage(1); // Resetear página cuando cambian los filtros
      // Calcular carreras sin configuración para mostrarlas como opciones en el diálogo de creación
    // Asegurar que las comparaciones sean del mismo tipo (número)
    const carrerasConConfig = configuraciones.map(config => config.carreraId);
    setCarrerasSinConfig(carreras.filter(carrera => !carrerasConConfig.some(id => id === carrera.id)));
    
  }, [searchTerm, selectedCarrera, configuraciones, carreras]);
  
  // Obtener las configuraciones para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredConfiguraciones.length);
    return filteredConfiguraciones.slice(startIndex, endIndex);
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    const totalPages = Math.ceil(filteredConfiguraciones.length / itemsPerPage);
    
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

  const handleRowClick = (configuracion: ConfiguracionCarrera) => {
    setSelectedConfiguracion(configuracion);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedConfiguracion(null);
  };
  const handleUpdateConfiguracion = async () => {
    if (!selectedConfiguracion) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      // Formatear fechas para el API
      const fechaInicio = fechaInicioDispensaRef.current?.value || null;
      const fechaFin = fechaFinDispensaRef.current?.value || null;
      
      const updatedData = {
        FechaInicioDispensa: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        FechaFinDispensa: fechaFin ? new Date(fechaFin).toISOString() : null,
        SolDispensa: solDispensaRef.current?.checked || false,
        SolJustificacion: solJustificacionRef.current?.checked || false
      };
        const response = await fetch(`/api/configuracion-carrera/${selectedConfiguracion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });      
      
      if (response.ok) {
        // Actualizar la configuración en el estado local
        const updatedConfiguracion = await response.json();
          
        // Construir la configuración actualizada manteniendo la referencia a carrera
        const updatedConfig = {
          ...selectedConfiguracion,
          ...updatedConfiguracion,
          carrera: selectedConfiguracion.carrera,
          FechaInicioDispensa: fechaInicio ? new Date(fechaInicio).toISOString() : null,
          FechaFinDispensa: fechaFin ? new Date(fechaFin).toISOString() : null,
          SolDispensa: solDispensaRef.current?.checked || false,
          SolJustificacion: solJustificacionRef.current?.checked || false
        };

        // Actualizar configuraciones - copia inmutable para asegurar re-renderizado
        setConfiguraciones(prevConfigs => {
          const newConfigs = prevConfigs.map(config => 
            config.id === selectedConfiguracion.id ? { ...updatedConfig } : config
          );
          return [...newConfigs];
        });

        // Actualizar configuraciones filtradas - copia inmutable para asegurar re-renderizado
        setFilteredConfiguraciones(prevFiltered => {
          const newFiltered = prevFiltered.map(config => 
            config.id === selectedConfiguracion.id ? { ...updatedConfig } : config
          );
          return [...newFiltered];
        });
        
        setUpdateMessage({ text: 'Configuración actualizada correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setUpdateMessage({ 
          text: errorData.message || 'Error al actualizar la configuración', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al actualizar la configuración:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar la configuración', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateConfiguracion = async () => {
    setIsCreating(true);
    setCreateMessage(null);
      try {
      // Validación básica
      if (!newCarreraRef.current?.value) {
        setCreateMessage({ 
          text: 'El campo Carrera es obligatorio', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
        // Formatear fechas para el API
      const fechaInicio = newFechaInicioDispensaRef.current?.value || null;
      const fechaFin = newFechaFinDispensaRef.current?.value || null;      // Obtener y validar el ID de la carrera
      const carreraValue = newCarreraRef.current?.value;
      if (!carreraValue) {
        setCreateMessage({ 
          text: 'Debe seleccionar una carrera', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
      
      // Guardar el carreraId tal como está (string UUID), sin convertir a número
      const carreraId = carreraValue;
      
      const newConfigData = {
        carreraId: carreraId,
        FechaInicioDispensa: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        FechaFinDispensa: fechaFin ? new Date(fechaFin).toISOString() : null,
        SolDispensa: newSolDispensaRef.current?.checked || false,
        SolJustificacion: newSolJustificacionRef.current?.checked || false
      };console.log('Datos enviados al API:', newConfigData);
      
      const response = await fetch('/api/configuracion-carrera', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newConfigData),
      });if (response.ok) {        // Añadir la nueva configuración al estado local
    const createdConfig = await response.json();        // Encontrar la carrera correspondiente para añadirla a la configuración
        const carreraIdValue = newCarreraRef.current?.value || '';
        // No necesitamos convertir a número, c.id es un string UUID
        const carreraId = carreraIdValue;
        const carrera = carreras.find(c => c.id === carreraId);
        const newConfig = {
          ...createdConfig,
          carrera: carrera
        };
          // Actualizar ambos estados - hacer copias inmutables para forzar re-renderizado
        setConfiguraciones(prevConfigs => {
          return [...prevConfigs, { ...newConfig }];
        });
        setFilteredConfiguraciones(prevFiltered => {
          return [...prevFiltered, { ...newConfig }];
        });
        
        setCreateMessage({ text: 'Configuración creada correctamente', type: 'success' });        // Actualizar la lista de carreras sin configuración
        setCarrerasSinConfig(prevCarreras => 
          prevCarreras.filter(c => c.id !== carreraId) // carreraId es una string (UUID)
        );
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);      } else {
        let errorMessage = 'Error al crear la configuración';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          console.error('Error al parsear la respuesta JSON:', jsonError);
        }
        
        setCreateMessage({ 
          text: errorMessage, 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear la configuración:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear la configuración', 
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

  // Función auxiliar para formatear fechas
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD para inputs type="date"
  };
  const handleToggleDispensa = async (configId: string, currentValue: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el modal
    
    try {
      // Primero encontrar la configuración actual para mantener los otros campos
      const currentConfig = configuraciones.find(config => config.id === configId);
      if (!currentConfig) {
        console.error('No se encontró la configuración con ID:', configId);
        return;
      }

      // Crear objeto con todos los campos necesarios
      const updatedData = {
        FechaInicioDispensa: currentConfig.FechaInicioDispensa,
        FechaFinDispensa: currentConfig.FechaFinDispensa,
        SolDispensa: !currentValue,
        SolJustificacion: currentConfig.SolJustificacion
      };
      
      const response = await fetch(`/api/configuracion-carrera/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });
      
      if (response.ok) {
        // Actualizar inmediatamente la UI
        setConfiguraciones(prevConfigs => {
          return prevConfigs.map(config => {
            if (config.id === configId) {
              return { ...config, SolDispensa: !currentValue };
            }
            return config;
          });
        });
        
        // Actualizar también las configuraciones filtradas
        setFilteredConfiguraciones(prevFiltered => {
          return prevFiltered.map(config => {
            if (config.id === configId) {
              return { ...config, SolDispensa: !currentValue };
            }
            return config;
          });
        });      } else {
        try {
          const errorData = await response.json();
          console.error('Error de API:', errorData);
          alert(`Error al actualizar el estado de dispensas: ${errorData.message || response.statusText}`);
        } catch {
          alert(`Error al actualizar el estado de dispensas: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error de conexión al actualizar las dispensas');
    }
  };
  const handleToggleJustificacion = async (configId: string, currentValue: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se abra el modal
    
    try {
      // Primero encontrar la configuración actual para mantener los otros campos
      const currentConfig = configuraciones.find(config => config.id === configId);
      if (!currentConfig) {
        console.error('No se encontró la configuración con ID:', configId);
        return;
      }

      // Crear objeto con todos los campos necesarios
      const updatedData = {
        FechaInicioDispensa: currentConfig.FechaInicioDispensa,
        FechaFinDispensa: currentConfig.FechaFinDispensa,
        SolDispensa: currentConfig.SolDispensa,
        SolJustificacion: !currentValue
      };
      
      const response = await fetch(`/api/configuracion-carrera/${configId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),
      });
      
      if (response.ok) {
        // Actualizar inmediatamente la UI
        setConfiguraciones(prevConfigs => {
          return prevConfigs.map(config => {
            if (config.id === configId) {
              return { ...config, SolJustificacion: !currentValue };
            }
            return config;
          });
        });
        
        // Actualizar también las configuraciones filtradas
        setFilteredConfiguraciones(prevFiltered => {
          return prevFiltered.map(config => {
            if (config.id === configId) {
              return { ...config, SolJustificacion: !currentValue };
            }
            return config;
          });
        });      } else {
        try {
          const errorData = await response.json();
          console.error('Error de API:', errorData);
          alert(`Error al actualizar el estado de justificaciones: ${errorData.message || response.statusText}`);
        } catch {
          alert(`Error al actualizar el estado de justificaciones: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error de conexión al actualizar las justificaciones');
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
                    <FaUniversity className="mr-3" /> 
                    Configuración de Carreras
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona las configuraciones específicas para cada carrera</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaUniversity className="h-8 w-8 text-white" />
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
                    placeholder="Buscar por nombre de carrera..."
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
                  disabled={carrerasSinConfig.length === 0}
                  className={`${
                    carrerasSinConfig.length === 0 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white font-medium py-2 px-4 rounded flex items-center`}
                  title={carrerasSinConfig.length === 0 ? 'Todas las carreras ya tienen configuración' : 'Crear nueva configuración'}
                >
                  <FaPlus className="mr-2" /> Nueva Configuración
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de configuraciones con paginación */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando configuraciones...</p>
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrera</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center">
                          <FaCalendarAlt className="mr-2" />
                          Periodo de Dispensas
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center">
                          <FaToggleOn className="mr-2" />
                          Dispensas
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center">
                          <FaToggleOn className="mr-2" />
                          Justificaciones
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">{filteredConfiguraciones.length === 0 ? (
<tr>
<td colSpan={5} className="px-6 py-4 text-center text-gray-500">
No se encontraron configuraciones con los criterios de búsqueda.
</td>
</tr>
) : (
getCurrentPageItems().map(config => (
<tr key={config.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(config)}>
<td className="px-6 py-4 text-sm font-medium text-gray-900">
{config.carrera ? config.carrera.denominacion : 'No disponible'}
</td>
<td className="px-6 py-4 text-sm text-gray-500">
<div className="flex items-center justify-center space-x-2">
{config.FechaInicioDispensa && config.FechaFinDispensa ? (
<div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-center border border-blue-200">
{new Date(config.FechaInicioDispensa).toLocaleDateString('es-ES', { 
day: '2-digit',
month: 'short'
})} 
<span className="mx-1">→</span>
{new Date(config.FechaFinDispensa).toLocaleDateString('es-ES', { 
day: '2-digit',
month: 'short'
})}
</div>
) : (
<span className="text-gray-400 italic">Sin periodo definido</span>
)}
</div>
</td>
<td className="px-6 py-4">
<div className="flex justify-center">
<button 
onClick={(e) => handleToggleDispensa(config.id, config.SolDispensa, e)}
className={`px-3 py-1 rounded-full flex items-center transition-all duration-200 border ${
config.SolDispensa 
? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' 
: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
}`}
>
{config.SolDispensa ? (
<>
<FaToggleOn className="mr-2" /> Habilitado
</>
) : (
<>
<FaToggleOff className="mr-2" /> Deshabilitado
</>
)}
</button>
</div>
</td>
<td className="px-6 py-4">
<div className="flex justify-center">
<button 
onClick={(e) => handleToggleJustificacion(config.id, config.SolJustificacion, e)}
className={`px-3 py-1 rounded-full flex items-center transition-all duration-200 border ${
config.SolJustificacion 
? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' 
: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
}`}
>
{config.SolJustificacion ? (
<>
<FaToggleOn className="mr-2" /> Habilitado
</>
) : (
<>
<FaToggleOff className="mr-2" /> Deshabilitado
</>
)}
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
              {filteredConfiguraciones.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredConfiguraciones.length)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredConfiguraciones.length)}</span> de{" "}
                    <span className="font-medium">{filteredConfiguraciones.length}</span> configuraciones
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
                      {Array.from({ length: Math.min(Math.ceil(filteredConfiguraciones.length / itemsPerPage), 20) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage >= Math.ceil(filteredConfiguraciones.length / itemsPerPage)}
                      className={`px-3 py-1 rounded ${currentPage >= Math.ceil(filteredConfiguraciones.length / itemsPerPage) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
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
      {isDialogOpen && selectedConfiguracion && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Configuración: {selectedConfiguracion.carrera?.denominacion}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio Periodo de Dispensas</label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={formatDate(selectedConfiguracion.FechaInicioDispensa)}
                      ref={fechaInicioDispensaRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin Periodo de Dispensas</label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={formatDate(selectedConfiguracion.FechaFinDispensa)}
                      ref={fechaFinDispensaRef}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="solDispensa"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        defaultChecked={selectedConfiguracion.SolDispensa}
                        ref={solDispensaRef}
                      />
                      <label htmlFor="solDispensa" className="ml-2 block text-sm text-gray-900">
                        Habilitar solicitudes de dispensa
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="solJustificacion"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        defaultChecked={selectedConfiguracion.SolJustificacion}
                        ref={solJustificacionRef}
                      />
                      <label htmlFor="solJustificacion" className="ml-2 block text-sm text-gray-900">
                        Habilitar solicitudes de justificación
                      </label>
                    </div>
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
                onClick={handleUpdateConfiguracion}
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
      
      {/* Diálogo de creación de configuración */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nueva Configuración de Carrera
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
              <div className="space-y-4">                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carrera *</label>
                  <select
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ref={newCarreraRef}
                    required
                  >
                    <option value="">Seleccione una carrera</option>
                    {carrerasSinConfig.map(carrera => (
                      <option key={carrera.id} value={carrera.id.toString()}>
                        {carrera.denominacion}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio Periodo de Dispensas</label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newFechaInicioDispensaRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin Periodo de Dispensas</label>
                    <input
                      type="date"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      ref={newFechaFinDispensaRef}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newSolDispensa"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        ref={newSolDispensaRef}
                      />
                      <label htmlFor="newSolDispensa" className="ml-2 block text-sm text-gray-900">
                        Habilitar solicitudes de dispensa
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="newSolJustificacion"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        ref={newSolJustificacionRef}
                      />
                      <label htmlFor="newSolJustificacion" className="ml-2 block text-sm text-gray-900">
                        Habilitar solicitudes de justificación
                      </label>
                    </div>
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
                onClick={handleCreateConfiguracion}
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
                    Crear Configuración <FaPlus className="inline ml-1" />
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
