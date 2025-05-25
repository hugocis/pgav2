'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaArrowLeft,
  FaClipboard,
  FaSearch,
  FaFilter,
  FaFileDownload,
  FaEye,
  FaUserGraduate,
  FaCalendarAlt,
  FaPaperclip,
  FaChevronDown,
  FaHome,
  FaTachometerAlt
} from 'react-icons/fa';

// Interfaces para el tipado
interface JustificationRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  subjectCode: string;
  date: string;
  requestDate: string;
  reason: string;
  status: string;
  documentationUrl: string;
  resolution: string;
  resolutionDate: string | null;
  resolvedBy: string | null;
  comments: string | null;
}

interface Filter {
  status: string;
  dateFrom: string;
  dateTo: string;
  subjectCode: string;
  searchTerm: string;
}

export default function Justifications() {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justifications, setJustifications] = useState<JustificationRequest[]>([]);
  const [filteredJustifications, setFilteredJustifications] = useState<JustificationRequest[]>([]);
  const [selectedJustification, setSelectedJustification] = useState<JustificationRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<Filter>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    subjectCode: '',
    searchTerm: ''
  });
  
  const [resolution, setResolution] = useState({
    status: '',
    comments: ''
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Estado para notificaciones toast
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info'
  });
  
  useEffect(() => {
    const fetchData = async () => {
      try {        setIsLoading(true);
        
        // Build query parameters based on filters
        const queryParams = new URLSearchParams();
        if (filter.status !== 'all') queryParams.append('status', filter.status);
        if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
        if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
        if (filter.subjectCode) queryParams.append('subjectCode', filter.subjectCode);
        if (filter.searchTerm) queryParams.append('searchTerm', filter.searchTerm);        // Hacer la llamada a la API con los filtros aplicados y asegurando datos frescos
        const response = await fetch(`/api/justificaciones?${queryParams.toString()}&_=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setJustifications(data);
        setFilteredJustifications(data);
        setError(null);
      } catch (error) {
        console.error('Error al cargar las justificaciones:', error);
        setError('No se pudieron cargar las justificaciones. Por favor, intente nuevamente más tarde.');
        
        // Como fallback, usamos datos de ejemplo si la API falla
        const mockJustifications: JustificationRequest[] = [
          {
            id: '1',
            studentId: 'ALU0001',
            studentName: 'Ana García Pérez',
            studentEmail: 'ana.garcia@estudiantes.ufv.es',
            subject: 'Matemáticas Discretas',
            subjectCode: 'MAT101',
            date: '2025-05-05',
            requestDate: '2025-05-10',
            reason: 'Cita médica documentada con especialista',
            status: 'pending',
            documentationUrl: '/docs/justificante-medico-1.pdf',
            resolution: '',
            resolutionDate: null,
            resolvedBy: null,
            comments: null
          },
          {
            id: '2',
            studentId: 'ALU0045',
            studentName: 'Carlos López Martínez',
            studentEmail: 'carlos.lopez@estudiantes.ufv.es',
            subject: 'Física Cuántica',
            subjectCode: 'FIS302',
            date: '2025-05-06',
            requestDate: '2025-05-09',
            reason: 'Asistencia a congreso académico como ponente',
            status: 'pending',
            documentationUrl: '/docs/certificado-congreso.pdf',
            resolution: '',
            resolutionDate: null,
            resolvedBy: null,
            comments: null
          },
          {
            id: '3',
            studentId: 'ALU0023',
            studentName: 'María Sánchez Rodríguez',
            studentEmail: 'maria.sanchez@estudiantes.ufv.es',
            subject: 'Historia del Arte',
            subjectCode: 'HIS205',
            date: '2025-05-04',
            requestDate: '2025-05-08',
            reason: 'Enfermedad documentada con parte médico',
            status: 'approved',
            documentationUrl: '/docs/parte-medico.pdf',
            resolution: 'Justificación aprobada',
            resolutionDate: '2025-05-09',
            resolvedBy: 'Javier Moreno (Manager)',
            comments: 'Se recomienda ponerse al día con los apuntes'
          },
          {
            id: '4',
            studentId: 'ALU0078',
            studentName: 'Javier Martín González',
            studentEmail: 'javier.martin@estudiantes.ufv.es',
            subject: 'Programación II',
            subjectCode: 'PRG202',
            date: '2025-05-03',
            requestDate: '2025-05-07',
            reason: 'Ingreso hospitalario de urgencia',
            status: 'rejected',
            documentationUrl: '/docs/justificante.pdf',
            resolution: 'Justificación rechazada',
            resolutionDate: '2025-05-08',
            resolvedBy: 'Luisa Fernández (Manager)',
            comments: 'Documentación insuficiente o ilegible'
          }
        ];
        
        setJustifications(mockJustifications);
        setFilteredJustifications(mockJustifications);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  useEffect(() => {
    // Aplicar filtros cuando cambien
    let result = [...justifications];
    
    // Filtrar por estado
    if (filter.status !== 'all') {
      result = result.filter(req => req.status === filter.status);
    }
    
    // Filtrar por fecha (desde)
    if (filter.dateFrom) {
      result = result.filter(req => new Date(req.date) >= new Date(filter.dateFrom));
    }
    
    // Filtrar por fecha (hasta)
    if (filter.dateTo) {
      result = result.filter(req => new Date(req.date) <= new Date(filter.dateTo));
    }
    
    // Filter by subject code
    if (filter.subjectCode) {
      result = result.filter(req => 
        req.subjectCode.toLowerCase().includes(filter.subjectCode.toLowerCase())
      );
    }
    
    // Filter by search term
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(req => 
        req.studentName.toLowerCase().includes(term) ||
        req.studentId.toLowerCase().includes(term) ||
        req.subject.toLowerCase().includes(term) ||
        req.reason.toLowerCase().includes(term)
      );
    }
    
    setFilteredJustifications(result);
  }, [filter, justifications]);
    // Function to handle clicks outside the modal
  const handleClickOutside = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      setShowDetailModal(false);
    }
  };
  const viewJustificationDetails = (justification: JustificationRequest) => {
    setSelectedJustification(justification);
    setShowDetailModal(true);
    
    // Para solicitudes pendientes, inicializamos el estado con un valor por defecto 'approved'
    // Para solicitudes ya resueltas, usamos los valores existentes
    if (justification.status === 'pending') {
      setResolution({
        status: 'approved', // Establecer un valor predeterminado válido
        comments: ''
      });
    } else {
      setResolution({
        status: justification.status,
        comments: justification.comments || ''
      });
    }
  };
  
  const handleFilterChange = (key: keyof Filter, value: string) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const resetFilters = () => {
    setFilter({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      subjectCode: '',
      searchTerm: ''
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      case 'pending':
      default:
        return 'Pendiente';
    }
  };  const handleResolve = async () => {
    if (!selectedJustification) return;
    
    // Validar que se ha seleccionado un estado antes de enviar
    if (!resolution.status) {
      setUpdateError('Debe seleccionar un estado (Aprobar o Rechazar) antes de guardar.');
      return;
    }
    
    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      // Verificar que el estado seleccionado sea válido según la API
      // Los estados válidos son 'approved' o 'rejected'
      const validStatus = resolution.status === 'approved' || resolution.status === 'rejected';
      if (!validStatus) {
        setUpdateError(`Estado no válido: ${resolution.status}. Debe ser 'approved' o 'rejected'.`);
        setIsUpdating(false);
        return;
      }
      
      // Llamada a la API para actualizar el estado de la justificación
      const response = await fetch('/api/justificaciones', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedJustification.id,
          status: resolution.status, // Este es el valor correcto que la API espera: 'approved' o 'rejected'
          comments: resolution.comments,
        }),
        credentials: 'include'
      });
      
      let responseData;      try {
        // Intentar obtener el cuerpo de la respuesta para un mejor manejo de errores
        responseData = await response.json();

      } catch (parseError) {
        // Si hay error al parsear JSON, continuamos con responseData undefined
        console.error('Error al parsear respuesta:', parseError);
      }
      
      if (!response.ok) {
        // Construir mensaje de error detallado
        let errorMessage = 'Error al actualizar la justificación';
        
        if (responseData) {
          if (responseData.error) {
            errorMessage = responseData.error;
          } else if (responseData.message) {
            errorMessage = responseData.message;
          } else if (typeof responseData === 'string') {
            errorMessage = responseData;
          }
          
          // Si hay información adicional de diagnóstico, añadirla al mensaje
          if (responseData.requestedStatus) {
            errorMessage += `\nEstado solicitado: "${responseData.requestedStatus}", mapeado a: "${responseData.mappedStatus}"`;
          }
        }
        
        // Incluir código de estado en mensajes de error de servidor
        if (response.status >= 500) {
          errorMessage = `Error del servidor: ${errorMessage} (${response.status})`;
        } else if (response.status === 400) {
          // Mejoramos el mensaje para el error 400 - Bad Request
          errorMessage = `Error en la solicitud: ${errorMessage}`;
        }
        
        throw new Error(errorMessage);
      }      
      // Actualizamos el estado local tras la respuesta exitosa
      const updatedJustifications = justifications.map(req => {
        if (req.id === selectedJustification.id) {
          return {
            ...req,
            status: resolution.status,
            comments: resolution.comments,
            resolution: resolution.status === 'approved' 
              ? 'Justificación aprobada' 
              : 'Justificación rechazada',
            resolutionDate: new Date().toISOString().split('T')[0],
            resolvedBy: session?.user?.name || 'Manager'
          };
        }
        return req;
      });
      
      // Actualizar tanto el array principal como el filtrado
      setJustifications(updatedJustifications);
      
      // Actualizar el array filtrado usando el mismo enfoque
      setFilteredJustifications(prevFiltered => 
        prevFiltered.map(req => 
          req.id === selectedJustification.id 
            ? {
                ...req,
                status: resolution.status,
                comments: resolution.comments,
                resolution: resolution.status === 'approved' 
                  ? 'Justificación aprobada' 
                  : 'Justificación rechazada',
                resolutionDate: new Date().toISOString().split('T')[0],
                resolvedBy: session?.user?.name || 'Manager'
              }
            : req
        )      );
        // Log successful update
      // Status updated successfully
      
      // Mostrar notificación de éxito
      setNotification({
        show: true,
        message: `Justificación ${resolution.status === 'approved' ? 'aprobada' : 'rechazada'} correctamente`,
        type: 'success'
      });
      
      // Ocultar la notificación después de 5 segundos
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
        // Esperar un momento antes de cerrar el modal para dar feedback visual
      setTimeout(() => {
        // Cerrar el modal
        setShowDetailModal(false);
        setSelectedJustification(null);
        
        // Recargamos los datos de la API después de actualizar, para asegurar sincronización
        const reloadData = async () => {
          try {
            // Construir parámetros de consulta basados en los filtros
            const queryParams = new URLSearchParams();
            if (filter.status !== 'all') queryParams.append('status', filter.status);
            if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
            if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
            if (filter.subjectCode) queryParams.append('subjectCode', filter.subjectCode);
            if (filter.searchTerm) queryParams.append('searchTerm', filter.searchTerm);
            
            // Hacer la llamada a la API con los filtros aplicados
            const response = await fetch(`/api/justificaciones?${queryParams.toString()}`, {
              credentials: 'include',
              // Añadir un parámetro para evitar caché
              cache: 'no-store'
            });
            
            if (response.ok) {
              const freshData = await response.json();
              setJustifications(freshData);
              // También actualizamos los datos filtrados para mantener coherencia
              setFilteredJustifications(prevFiltered => {
                // Si los filtros están activos, aplicar los filtros
                if (filter.status !== 'all' || filter.dateFrom || filter.dateTo || 
                    filter.subjectCode || filter.searchTerm) {
                  return prevFiltered;
                }
                // Si no hay filtros, usar los datos frescos
                return freshData;
              });
              // Data successfully reloaded from API after update
            }
          } catch (error) {
            console.error('Error al recargar datos después de actualizar:', error);
          }
        };
        
        reloadData();
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar la justificación:', error);
      
      // Manejo detallado de errores para mostrar mensajes más descriptivos
      let errorMsg = 'Error al actualizar la justificación. Por favor, inténtelo de nuevo.';
      
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      // Si no hay estado seleccionado, mostrar un error específico
      if (!resolution.status) {
        errorMsg = 'Debe seleccionar un estado (Aprobar o Rechazar) antes de guardar.';
      }
      
      setUpdateError(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <DashboardContainer roleName="Manager">
      <div className="bg-gray-50 min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb navigation */}
          <nav className="flex mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-blue-600">
                  <FaHome className="mr-2" />
                  Inicio
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2">/</span>
                  <Link href="/manager/dashboard" className="text-gray-500 hover:text-blue-600 inline-flex items-center">
                    <FaTachometerAlt className="mr-1" />
                    Panel de Control
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2">/</span>
                  <span className="text-blue-600">Justificaciones de Faltas</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Header with back button */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/manager/dashboard" className="mr-3 text-white hover:text-blue-200 transition">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaClipboard className="mr-3" />
                      Justificaciones de Faltas
                    </h1>
                  </div>
                  <p className="text-blue-100 mt-1">
                    Gestiona solicitudes de justificación de faltas de alumnos
                  </p>
                </div>
                <div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {filteredJustifications.length} solicitudes
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Filtros y acciones */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                    <FaClipboard className="text-[#0D3C68]" />
                  </div>
                  <div>
                    <span className="text-gray-900">Solicitudes de Justificaciones</span>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      Vista y gestión de justificaciones de faltas
                    </div>
                  </div>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Buscar justificación..."
                      value={filter.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <FaSearch />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <FaFilter className="mr-2" />
                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </button>
                  <button
                    className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] flex items-center justify-center transition-colors shadow-sm"
                  >
                    <FaFileDownload className="mr-2" />
                    Exportar
                  </button>
                </div>
              </div>

              {/* Filtros avanzados */}
              {showFilters && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-medium text-gray-700">Filtros avanzados</h3>
                    <button 
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={resetFilters}
                    >
                      Restablecer filtros
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <div className="relative">
                        <select
                          value={filter.status}
                          onChange={(e) => handleFilterChange('status', e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                        >
                          <option value="all">Todos</option>
                          <option value="pending">Pendientes</option>
                          <option value="approved">Aprobadas</option>
                          <option value="rejected">Rechazadas</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <FaChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={filter.dateFrom}
                          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={filter.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código de asignatura</label>
                      <input
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ej. MAT101"
                        value={filter.subjectCode}
                        onChange={(e) => handleFilterChange('subjectCode', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla de solicitudes */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-gray-600">Cargando solicitudes...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="bg-red-100 text-red-800 p-4 rounded-md inline-block">
                    <p>{error}</p>
                  </div>
                </div>
              ) : filteredJustifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-gray-100 text-gray-700 p-6 rounded-lg inline-block">
                    <FaClipboard className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium mb-2">No hay solicitudes que mostrar</h3>
                    <p className="text-gray-500">No se encontraron solicitudes con los filtros aplicados</p>
                  </div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estudiante
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asignatura
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Falta
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredJustifications.map((justification, index) => (
                      <tr key={justification.id} className={index % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FaUserGraduate className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{justification.studentName}</div>
                              <div className="text-sm text-gray-500">{justification.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{justification.subject}</div>
                          <div className="text-sm text-gray-500">{justification.subjectCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(justification.date).toLocaleDateString('es-ES')}</div>
                          <div className="text-xs text-gray-500">Solicitada: {new Date(justification.requestDate).toLocaleDateString('es-ES')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(justification.status)}`}>
                            {getStatusText(justification.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => viewJustificationDetails(justification)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-1.5 inline-flex items-center justify-center"
                          >
                            <FaEye className="h-5 w-5" />
                            <span className="sr-only">Ver detalles</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>          {/* Modal de detalle */}          
          {showDetailModal && selectedJustification && (
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0" onClick={handleClickOutside}
              >                {/* Background overlay con efecto glassmorphism mejorado */}
                <div className="fixed inset-0 bg-blue-900/10 backdrop-blur-sm transition-all duration-300" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal panel */}                <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-100">
                  {/* Barra superior decorativa */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                  
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        {/* Header del modal con estilo mejorado */}
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                          <h3 className="text-xl font-medium text-gray-900 flex items-center" id="modal-title">
                            <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                              <FaClipboard className="h-5 w-5 text-blue-600" />
                            </div>
                            Detalle de Justificación de Falta
                          </h3>
                          <button
                            onClick={() => setShowDetailModal(false)}
                            type="button"
                            className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                          {/* Contenido del modal con diseño mejorado */}
                        <div className="rounded-md bg-blue-50/50 border border-blue-100 p-4 mb-6">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <FaUserGraduate className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <h4 className="text-lg font-semibold text-gray-800">{selectedJustification.studentName}</h4>
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2 border border-blue-200">{selectedJustification.studentId}</span>
                                {selectedJustification.studentEmail}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              Asignatura
                            </p>
                            <p className="mt-1 text-gray-900 font-medium">{selectedJustification.subject}</p>
                            <p className="text-xs text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-1 border border-blue-100">{selectedJustification.subjectCode}</p>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h-3l-4 4z" />
                              </svg>
                              Fechas
                            </p>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs text-gray-500">Falta:</p>
                                <p className="text-gray-900 font-medium">{new Date(selectedJustification.date).toLocaleDateString('es-ES')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Solicitud:</p>
                                <p className="text-gray-900 font-medium">{new Date(selectedJustification.requestDate).toLocaleDateString('es-ES')}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-1 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Estado
                            </p>
                            <p className="mt-1">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(selectedJustification.status)}`}>
                                {getStatusText(selectedJustification.status)}
                              </span>
                            </p>
                          </div>                          <div className="md:col-span-2 bg-white p-4 rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              Motivo de la Justificación
                            </p>
                            <div className="bg-gray-50 rounded-md p-3 border border-gray-200 mt-1">
                              <p className="text-gray-800 whitespace-pre-line">{selectedJustification.reason}</p>
                            </div>
                          </div>
                          
                          <div className="md:col-span-2 bg-white p-4 rounded-md border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-xs uppercase font-semibold text-gray-500 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              Documentación Adjunta
                            </p>
                            <div className="mt-2 flex items-center">
                              <div className="bg-blue-50 rounded-md p-3 border border-blue-100 flex items-center hover:bg-blue-100 transition-colors">
                                <FaPaperclip className="mr-2 text-blue-600" />
                                <a 
                                  href={selectedJustification.documentationUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  Ver documento justificativo
                                </a>
                              </div>
                            </div>
                          </div>                          {(selectedJustification.status === 'approved' || selectedJustification.status === 'rejected') && (
                            <>
                              <div className={`md:col-span-2 mt-3 rounded-md border p-4 ${
                                selectedJustification.status === 'approved' 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="flex items-center mb-3">
                                  {selectedJustification.status === 'approved' ? (
                                    <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </div>
                                  )}
                                  <h4 className={`ml-3 text-lg font-medium ${
                                    selectedJustification.status === 'approved' ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {selectedJustification.resolution}
                                  </h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                  <div className={`rounded-md p-2 ${
                                    selectedJustification.status === 'approved' ? 'bg-green-100/50' : 'bg-red-100/50'
                                  }`}>
                                    <p className="text-xs font-semibold uppercase text-gray-600">Fecha de Resolución</p>
                                    <p className={`font-medium ${
                                      selectedJustification.status === 'approved' ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                      {selectedJustification.resolutionDate ? new Date(selectedJustification.resolutionDate).toLocaleDateString('es-ES') : 'N/A'}
                                    </p>
                                  </div>
                                  
                                  <div className={`rounded-md p-2 ${
                                    selectedJustification.status === 'approved' ? 'bg-green-100/50' : 'bg-red-100/50'
                                  }`}>
                                    <p className="text-xs font-semibold uppercase text-gray-600">Resuelta por</p>
                                    <p className={`font-medium ${
                                      selectedJustification.status === 'approved' ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                      {selectedJustification.resolvedBy || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                
                                {selectedJustification.comments && (
                                  <div className={`mt-3 p-3 border rounded-md ${
                                    selectedJustification.status === 'approved' 
                                      ? 'border-green-200 bg-white' 
                                      : 'border-red-200 bg-white'
                                  }`}>
                                    <p className="text-xs font-semibold uppercase text-gray-600 mb-1">Comentarios</p>
                                    <p className="text-gray-800 whitespace-pre-line">{selectedJustification.comments}</p>
                                  </div>
                                )}
                              </div>
                            </>
                          )}                          {selectedJustification.status === 'pending' && (
                            <>
                              <div className="md:col-span-2 mt-6 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50/30 overflow-hidden">
                                <div className="px-4 py-3 bg-blue-100/50 border-b border-blue-200">
                                  <h4 className="font-semibold text-blue-900 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Resolver Solicitud
                                  </h4>
                                </div>
                                
                                <div className="p-4">
                                  <div className="mb-5">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Decisión</label>
                                    <div className="flex gap-4">
                                      <label className={`relative flex items-center justify-between w-full p-3 rounded-md cursor-pointer ${
                                        resolution.status === 'approved' 
                                          ? 'border-2 border-green-500 bg-green-50' 
                                          : 'border border-gray-300 bg-white hover:bg-green-50/50'
                                      }`}>
                                        <div className="flex items-center">
                                          <div className={`flex-shrink-0 w-7 h-7 rounded-full ${
                                            resolution.status === 'approved' ? 'bg-green-100' : 'bg-gray-100'
                                          } flex items-center justify-center mr-2`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                                              resolution.status === 'approved' ? 'text-green-600' : 'text-gray-400'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                          <div>
                                            <span className="font-medium">Aprobar</span>
                                            <p className="text-xs text-gray-500">Aceptar la justificación de falta</p>
                                          </div>
                                        </div>
                                        <input
                                          type="radio"
                                          className="sr-only"
                                          name="status"
                                          value="approved"
                                          checked={resolution.status === 'approved'}
                                          onChange={() => setResolution({...resolution, status: 'approved'})}
                                        />
                                      </label>
                                      
                                      <label className={`relative flex items-center justify-between w-full p-3 rounded-md cursor-pointer ${
                                        resolution.status === 'rejected' 
                                          ? 'border-2 border-red-500 bg-red-50' 
                                          : 'border border-gray-300 bg-white hover:bg-red-50/50'
                                      }`}>
                                        <div className="flex items-center">
                                          <div className={`flex-shrink-0 w-7 h-7 rounded-full ${
                                            resolution.status === 'rejected' ? 'bg-red-100' : 'bg-gray-100'
                                          } flex items-center justify-center mr-2`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                                              resolution.status === 'rejected' ? 'text-red-600' : 'text-gray-400'
                                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </div>
                                          <div>
                                            <span className="font-medium">Rechazar</span>
                                            <p className="text-xs text-gray-500">Denegar la justificación de falta</p>
                                          </div>
                                        </div>
                                        <input
                                          type="radio"
                                          className="sr-only"
                                          name="status"
                                          value="rejected"
                                          checked={resolution.status === 'rejected'}
                                          onChange={() => setResolution({...resolution, status: 'rejected'})}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                  
                                  <div className="mb-2">
                                    <label htmlFor="comments" className="block text-sm font-semibold text-gray-700 mb-2">
                                      Comentarios (opcional)
                                    </label>
                                    <textarea
                                      id="comments"
                                      rows={3}
                                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border border-gray-300 rounded-md p-3"
                                      placeholder="Añade comentarios o instrucciones para el estudiante..."
                                      value={resolution.comments}
                                      onChange={(e) => setResolution({...resolution, comments: e.target.value})}
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>                  <div className="bg-gray-50 px-6 py-4 sm:px-6 sm:flex sm:flex-col border-t border-gray-200">
                    {/* Mensaje de error si existe */}
                    {updateError && (
                      <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-md shadow-sm overflow-hidden">
                        <div className="p-3 flex items-start">
                          <div className="flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error al actualizar</h3>
                            <div className="mt-1 text-sm text-red-700">
                              {updateError}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="sm:flex sm:flex-row-reverse">
                      {selectedJustification.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={handleResolve}
                            disabled={!resolution.status || isUpdating}
                            className={`flex justify-center items-center rounded-md shadow-sm px-5 py-2.5 text-sm font-medium sm:ml-4 ${
                              isUpdating 
                                ? 'bg-blue-400 text-white cursor-wait border border-blue-500' 
                                : resolution.status === 'approved'
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-transparent'
                                  : resolution.status === 'rejected'
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border border-transparent'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed border border-transparent'
                            } transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              resolution.status === 'approved' 
                                ? 'focus:ring-green-500' 
                                : resolution.status === 'rejected'
                                  ? 'focus:ring-red-500'
                                  : 'focus:ring-blue-500'
                            }`}
                          >
                            {isUpdating ? (
                              <div className="flex items-center">
                                <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                              </div>
                            ) : resolution.status === 'approved' ? (
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Aprobar Justificación
                              </div>
                            ) : resolution.status === 'rejected' ? (
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Rechazar Justificación
                              </div>
                            ) : (
                              'Seleccione una opción'
                            )}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDetailModal(false)}
                        disabled={isUpdating}
                        className="mt-3 sm:mt-0 w-full sm:w-auto flex justify-center items-center rounded-md border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {selectedJustification.status === 'pending' ? 'Cancelar' : 'Cerrar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>      </div>
      
      {/* Notificación toast */}
      {notification.show && (
        <div className={`fixed bottom-5 right-5 max-w-md shadow-lg rounded-md overflow-hidden border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200' : 
          notification.type === 'error' ? 'bg-red-50 border-red-200' : 
          'bg-blue-50 border-blue-200'
        } transition-all duration-300 transform translate-y-0 opacity-100`}>
          <div className="p-4">
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : notification.type === 'error' ? (
                <div className="flex-shrink-0 bg-red-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-800' : 
                  notification.type === 'error' ? 'text-red-800' : 
                  'text-blue-800'
                }`}>
                  {notification.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button 
                    onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                    className={`inline-flex rounded-md p-1.5 ${
                      notification.type === 'success' ? 'text-green-500 hover:bg-green-100' : 
                      notification.type === 'error' ? 'text-red-500 hover:bg-red-100' : 
                      'text-blue-500 hover:bg-blue-100'
                    } focus:outline-none`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className={`h-1 ${
            notification.type === 'success' ? 'bg-green-500' : 
            notification.type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
          }`}>
            <div className="h-1 bg-white opacity-50 animate-progress"></div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
