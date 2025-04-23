'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaHistory, 
  FaSearch, 
  FaFilter, 
  FaDownload, 
  FaEye, 
  FaTrash, 
  FaChevronLeft, 
  FaChevronRight,
  FaSortAmountDown, 
  FaSortAmountUp,
  FaClock,
  FaCalendarAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Interfaces para tipado
interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string;
  timestamp: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    surname1: string;
    surname2: string;
    username: string;
    email: string;
  };
  prevHash: string | null;
  hash: string;
  signature: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminActivity() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Lista de tipos de entidades y usuarios para filtros
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [actions] = useState<string[]>(['create', 'update', 'delete']);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Estado para diálogo de detalles
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  
  // Estado para ordenamiento
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        // Construir query params para filtros
        const queryParams = new URLSearchParams();
        if (selectedAction) queryParams.append('action', selectedAction);
        if (selectedEntityType) queryParams.append('entityType', selectedEntityType);
        if (selectedUserId) queryParams.append('userId', selectedUserId);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (searchTerm) queryParams.append('search', searchTerm);
        queryParams.append('sortField', sortField);
        queryParams.append('sortDirection', sortDirection);
        queryParams.append('page', currentPage.toString());
        queryParams.append('pageSize', itemsPerPage.toString());
        
        // Hacer la petición a la API
        const response = await fetch(`/api/activity-logs?${queryParams.toString()}`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar registros de actividad');
        }
        
        const data = await response.json();
        setActivities(data.activities);
        setFilteredActivities(data.activities);
        setTotalActivities(data.totalActivities);
        setTotalPages(data.totalPages);
        
        // Extraer los tipos de entidades y usuarios únicos si no están cargados ya
        if (entityTypes.length === 0 && data.activities.length > 0) {
          const types = [...new Set(data.activities.map((a: ActivityLog) => a.entityType))].filter(Boolean) as string[];
          setEntityTypes(types);
        }
        
        // Cargar usuarios para el filtro si aún no están cargados
        if (users.length === 0) {
          const usersResponse = await fetch('/api/users?minimal=true', {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData.map((u: any) => ({
              id: u.id,
              name: `${u.name || ''} ${u.surname1 || ''} ${u.username ? `(${u.username})` : ''}`.trim()
            })));
          }
        }
      } catch (error) {
        setError('Error al cargar los registros de actividad');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [currentPage, selectedAction, selectedEntityType, selectedUserId, startDate, endDate, searchTerm, sortField, sortDirection]);

  // Función para formatear fechas
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  // Función para determinar el estilo según el tipo de acción
  const getActionStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'update':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'delete':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para traducir la acción
  const translateAction = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'Crear';
      case 'update': return 'Actualizar';
      case 'delete': return 'Eliminar';
      case 'read': return 'Leer';
      default: return action;
    }
  };

  // Función para manejar cambios de página con botones
  const changePage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }

    // Animación de scroll suave para los números de página
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

  // Función para exportar registros a CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Acción', 'Tipo de Entidad', 'ID de Entidad', 'Detalles', 'Fecha', 'Usuario'];
    const csvContent = 
      headers.join(',') + '\n' + 
      filteredActivities.map(a => {
        return [
          a.id,
          a.action,
          a.entityType,
          a.entityId || 'N/A',
          `"${a.details?.replace(/"/g, '""') || ''}"`,
          a.timestamp,
          a.user ? `${a.user.name || ''} ${a.user.surname1 || ''}`.trim() : a.userId
        ].join(',');
      }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `registro-actividades-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para ver detalles de una actividad
  const handleViewActivityDetails = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setIsViewDialogOpen(true);
  };

  // Función para cerrar el diálogo de detalles
  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedActivity(null);
  };

  // Función para cambiar el ordenamiento
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedAction('');
    setSelectedEntityType('');
    setSelectedUserId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de título */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaHistory className="mr-3" /> 
                    Registro de Actividades
                  </h1>
                  <p className="text-blue-100 text-sm">Monitoreo y auditoría de todas las acciones realizadas en el sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaHistory className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>
      
          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Buscar en detalles..."
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
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                    >
                      <option value="">Todas las acciones</option>
                      {actions.map(action => (
                        <option key={action} value={action}>{translateAction(action)}</option>
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
                      value={selectedEntityType}
                      onChange={(e) => setSelectedEntityType(e.target.value)}
                    >
                      <option value="">Todas las entidades</option>
                      {entityTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-64">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaFilter className="text-gray-400" />
                    </div>
                    <select
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                    >
                      <option value="">Todos los usuarios</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Fecha inicio"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Fecha fin"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Limpiar filtros
                  </button>
                  <button 
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  >
                    <FaDownload className="mr-2" /> Exportar CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de actividades con paginación */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando registros de actividad...</p>
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
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('action')}
                      >
                        <div className="flex items-center">
                          Acción
                          {sortField === 'action' && (
                            sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('entityType')}
                      >
                        <div className="flex items-center">
                          Entidad
                          {sortField === 'entityType' && (
                            sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('userId')}
                      >
                        <div className="flex items-center">
                          Usuario
                          {sortField === 'userId' && (
                            sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => toggleSort('timestamp')}
                      >
                        <div className="flex items-center">
                          Fecha y Hora
                          {sortField === 'timestamp' && (
                            sortDirection === 'asc' ? <FaSortAmountUp className="ml-1" /> : <FaSortAmountDown className="ml-1" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron registros de actividad con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map(activity => (
                        <tr key={activity.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getActionStyle(activity.action)}`}>
                              {translateAction(activity.action)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {activity.entityType}
                            {activity.entityId && (
                              <div className="text-xs text-gray-500">ID: {activity.entityId}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-md truncate" title={activity.details}>
                              {activity.details}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {activity.user ? (
                              <>
                                <div className="font-medium">
                                  {`${activity.user.name || ''} ${activity.user.surname1 || ''}`.trim() || 'Usuario'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {activity.user.username || activity.user.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">Usuario desconocido</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(activity.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleViewActivityDetails(activity)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Ver detalles"
                            >
                              <FaEye className="inline" /> Ver
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Controles de paginación */}
              {filteredActivities.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalActivities)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalActivities)}</span> de{" "}
                    <span className="font-medium">{totalActivities}</span> registros
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
                      {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(page => (
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
                      disabled={currentPage >= totalPages}
                      className={`px-3 py-1 rounded ${currentPage >= totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
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

      {/* Diálogo para mostrar detalles de actividad */}
      {isViewDialogOpen && selectedActivity && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Detalles de Actividad
              </h3>
              <button 
                onClick={handleCloseViewDialog}
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
                  <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getActionStyle(selectedActivity.action)}`}>
                    {translateAction(selectedActivity.action)}
                  </span>
                  <span className="ml-2 font-medium">{selectedActivity.entityType}</span>
                  {selectedActivity.entityId && (
                    <span className="text-gray-500"> (ID: {selectedActivity.entityId})</span>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h4 className="font-medium mb-1 flex items-center">
                    <FaClock className="mr-2 text-blue-600" /> Registro de fecha y hora
                  </h4>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(selectedActivity.timestamp)}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Detalles:</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-md border border-gray-200">
                    {selectedActivity.details}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Usuario:</h4>
                    {selectedActivity.user ? (
                      <div className="text-sm">
                        <p className="font-medium">{`${selectedActivity.user.name || ''} ${selectedActivity.user.surname1 || ''}`.trim() || 'Usuario'}</p>
                        <p className="text-gray-500">{selectedActivity.user.username || selectedActivity.user.email}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Usuario desconocido</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">ID del registro:</h4>
                    <p className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded border border-gray-200">
                      {selectedActivity.id}
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-medium mb-2">Información de seguridad:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <span className="text-sm text-gray-500">Hash:</span>
                      <p className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 overflow-hidden overflow-ellipsis">
                        {selectedActivity.hash}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Firma:</span>
                      <p className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 overflow-hidden overflow-ellipsis">
                        {selectedActivity.signature}
                      </p>
                    </div>
                    {selectedActivity.prevHash && (
                      <div>
                        <span className="text-sm text-gray-500">Hash anterior:</span>
                        <p className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 overflow-hidden overflow-ellipsis">
                          {selectedActivity.prevHash}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseViewDialog}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
