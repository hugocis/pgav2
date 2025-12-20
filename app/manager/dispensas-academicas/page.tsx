'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaArrowLeft,
  FaClipboardList,
  FaSearch,
  FaFilter,
  FaFileDownload,
  FaEye,
  FaUserGraduate,
  FaCalendarAlt,
  FaPaperclip,
  FaChevronDown,
  FaHome,
  FaTachometerAlt,
  FaComment,
  FaBook,
  FaFile,
  FaDownload,
  FaFilePdf,
  FaCog,
  FaTag,
  FaFlag,
  FaCheckCircle,
  FaSave as FaSaveIcon,
  FaTimes as FaTimesIcon
} from 'react-icons/fa';

// Interfaces para el tipado
interface EstadoDispensa {
  id: string;
  denominacion: string;
}

interface Carrera {
  id: string;
  denominacion: string;
}

interface Asignatura {
  id: string;
  CodAsignatura: string;
  Denominacion: string;
  carrera: Carrera;
}

interface Matricula {
  id: string;
  asignatura: Asignatura;
}

interface User {
  id: string;
  name: string | null;
  surname1: string | null;
  surname2: string | null;
  email: string;
}

interface DocumentacionDispensa {
  id: string;
  url: string;
  fechaSubida: string;
}

interface SolicitudDispensa {
  id: string;
  alumnoId: string;
  matriculaId: string;
  fechaAlegacion: string;
  fechaRespuesta: string | null;
  alegacion: string;
  respuesta: string | null;
  estadoDispensaId: string;
  estadoDispensa: EstadoDispensa;
  user: User;
  matricula: Matricula;
  DocumentacionDispensa: DocumentacionDispensa[];
  createdAt: string;
  updatedAt: string;
}

interface Filter {
  status: string;
  dateFrom: string;
  dateTo: string;
  subjectCode: string;
  searchTerm: string;
}

export default function AcademicDispensations() {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<SolicitudDispensa[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SolicitudDispensa[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SolicitudDispensa | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [estadosDispensa, setEstadosDispensa] = useState<EstadoDispensa[]>([]);
  
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
  
  // Función para convertir el formato de la API a SolicitudDispensa
  const mapApiResponseToSolicitudDispensa = (data: {
    id: number;
    studentId: string;
    requestDate: string;
    resolutionDate?: string;
    reason: string;
    resolution?: string;
    comments?: string;
    studentName?: string;
    studentEmail?: string;
    subjectCode?: string;
    subject?: string;
  }): SolicitudDispensa => {
    return {
      id: data.id,
      alumnoId: data.studentId,
      matriculaId: '',
      fechaAlegacion: data.requestDate,
      fechaRespuesta: data.resolutionDate,
      alegacion: data.reason,
      respuesta: data.resolution || data.comments,
      estadoDispensaId: '',
      user: {
        id: data.studentId,
        name: data.studentName?.split(' ')[0] || '',
        surname1: data.studentName?.split(' ')[1] || '',
        surname2: data.studentName?.split(' ')[2] || '',
        email: data.studentEmail || '',
      },
      matricula: {
        id: '',
        asignatura: {
          id: '',
          CodAsignatura: data.subjectCode || '',
          Denominacion: data.subject || '',
          carrera: { id: '', denominacion: '' }
        }
      },
      DocumentacionDispensa: data.documentationUrl ? [{
        id: '',
        url: data.documentationUrl,
        fechaSubida: data.requestDate
      }] : [],
      estadoDispensa: {
        id: '',
        denominacion: data.status === 'pending' ? 'Pendiente' : 
                     data.status === 'approved' ? 'Aprobada' : 
                     data.status === 'rejected' ? 'Rechazada' : 'Pendiente'
      },
      createdAt: data.requestDate,
      updatedAt: data.requestDate
    };
  };
    // Efecto para cargar los estados de dispensa (separado para evitar bucles)
  useEffect(() => {
    const fetchEstados = async () => {
      try {
        // Obtener los estados de dispensa para usarlos en filtros y resolución
        const estadosResponse = await fetch('/api/estados-dispensa', {
          credentials: 'include'
        });
        
        if (estadosResponse.ok) {
          const estadosData = await estadosResponse.json();
          setEstadosDispensa(estadosData);
        }
      } catch (error) {
        console.error('Error al cargar estados de dispensa:', error);
      }
    };

    if (session?.user?.id) {
      fetchEstados();
    }
  }, [session?.user?.id]);

  // Efecto para cargar los datos de solicitudes de dispensa
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Construir parámetros de consulta basados en los filtros
        const queryParams = new URLSearchParams();
        if (filter.status !== 'all') {
          queryParams.append('status', filter.status);
        }
        if (filter.dateFrom) queryParams.append('dateFrom', filter.dateFrom);
        if (filter.dateTo) queryParams.append('dateTo', filter.dateTo);
        if (filter.subjectCode) queryParams.append('subjectCode', filter.subjectCode);
        if (filter.searchTerm) queryParams.append('searchTerm', filter.searchTerm);
          
        // Hacer la llamada a la API con los filtros aplicados
        const response = await fetch(`/api/dispensas-academicas?${queryParams.toString()}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Mapear los datos de la API al formato SolicitudDispensa
        console.log("Datos recibidos de la API:", data);
        const mappedData = Array.isArray(data) ? data.map(mapApiResponseToSolicitudDispensa) : [];
        console.log("Datos mapeados:", mappedData);
        
        setRequests(mappedData);
        setFilteredRequests(mappedData);
        setError(null);
      } catch (error) {
        console.error('Error al cargar las dispensas académicas:', error);
        setError('No se pudieron cargar las dispensas académicas. Por favor, intente nuevamente más tarde.');
        
        // Si no hay datos reales, no mostramos datos de ejemplo en producción
        setRequests([]);
        setFilteredRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id && estadosDispensa.length > 0) {
      fetchData();
    }
  }, [filter, session?.user?.id, estadosDispensa]);
  
  useEffect(() => {
    // Aplicar filtros locales cuando cambien
    if (requests.length === 0) return;
    
    let result = [...requests];
    
    // Filtrar por término de búsqueda
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(req => 
        `${req.user?.name || ''} ${req.user?.surname1 || ''} ${req.user?.surname2 || ''}`.toLowerCase().includes(term) ||
        (req.user?.email || '').toLowerCase().includes(term) ||
        (req.matricula?.asignatura?.Denominacion || '').toLowerCase().includes(term) ||
        (req.matricula?.asignatura?.CodAsignatura || '').toLowerCase().includes(term) ||
        (req.alegacion || '').toLowerCase().includes(term)
      );
    }
    
    // Filtrar por código de asignatura si no se aplicó en la API
    if (filter.subjectCode) {
      result = result.filter(req => 
        req.matricula.asignatura.CodAsignatura.toLowerCase().includes(filter.subjectCode.toLowerCase())
      );
    }
    
    // Filtrar por fecha (desde)
    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      result = result.filter(req => new Date(req.fechaAlegacion) >= fromDate);
    }
    
    // Filtrar por fecha (hasta)
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      toDate.setHours(23, 59, 59, 999); // Final del día
      result = result.filter(req => new Date(req.fechaAlegacion) <= toDate);
    }
    
    setFilteredRequests(result);
  }, [filter, requests]);
  
  const viewRequestDetails = (request: SolicitudDispensa) => {
    if (!request) return;
    
    setSelectedRequest(request);
    setShowDetailModal(true);
    setResolution({
      status: request.estadoDispensa?.id || '',
      comments: request.respuesta || ''
    });
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
  };  const getStatusBadgeClass = (estado?: string) => {
    if (!estado) return 'bg-sky-200 text-sky-900 border-sky-300';
    
    switch (estado.toLowerCase()) {
      case 'aprobada':
      case 'aceptada':
      case 'justificada':
        return 'bg-emerald-200 text-emerald-900 border-emerald-300';
      case 'rechazada':
      case 'denegada':
      case 'no justificada':
        return 'bg-indigo-200 text-indigo-900 border-indigo-300';
      case 'pendiente':
      default:
        return 'bg-sky-200 text-sky-900 border-sky-300';
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    
    try {
      // Determinar el estado UI basado en la selección
      const status = estadosDispensa.find(e => e.id === resolution.status)?.denominacion?.toLowerCase();
      let uiStatus = 'pending';
      
      if (status === 'aprobada' || status === 'aceptada') {
        uiStatus = 'approved';
      } else if (status === 'rechazada' || status === 'denegada') {
        uiStatus = 'rejected';
      }
      
      // Llamada a la API para actualizar el estado de la solicitud
      const response = await fetch('/api/dispensas-academicas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: uiStatus,
          comments: resolution.comments,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar la solicitud: ${response.status} ${response.statusText}`);
      }
      
      // Obtener la solicitud actualizada
      await response.json();
      
      // Como la API podría devolver un formato diferente, adaptamos:
      const updatedRequest = { 
        ...selectedRequest, 
        estadoDispensa: {
          id: resolution.status,
          denominacion: status || 'Pendiente'
        },
        respuesta: resolution.comments,
        fechaRespuesta: new Date().toISOString()
      };
      
      // Actualizamos el estado local
      const updatedRequests = requests.map(req => {
        if (req.id === selectedRequest.id) {
          return updatedRequest;
        }
        return req;
      });
      
      setRequests(updatedRequests);
      // Actualizar también las solicitudes filtradas
      setFilteredRequests(filteredRequests.map(req => {
        if (req.id === selectedRequest.id) {
          return updatedRequest;
        }
        return req;
      }));
      
      setShowDetailModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error al actualizar la dispensa:', error);
      alert('Error al actualizar la solicitud. Por favor, inténtelo de nuevo.');
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
                  <span className="text-blue-600">Dispensas Académicas</span>
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
                      <FaClipboardList className="mr-3" />
                      Dispensas Académicas
                    </h1>
                  </div>
                  <p className="text-blue-100 mt-1">
                    Gestiona solicitudes de dispensas académicas de alumnos
                  </p>
                </div>
                <div>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                    {filteredRequests.length} solicitudes
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 to-blue-100"></div>
            </div>
          </div>          {/* Filtros y acciones */}          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="p-5 border-b border-gray-200 bg-white">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] p-2 rounded-full mr-3 shadow-sm">
                    <FaClipboardList className="text-white" />
                  </div>
                  <div>
                    <span className="text-gray-900">Solicitudes de Dispensas</span>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      Vista y gestión de solicitudes
                    </div>
                  </div>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#0D3C68] focus:border-[#0D3C68]"
                      placeholder="Buscar solicitud..."
                      value={filter.searchTerm}
                      onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <FaSearch />
                    </div>
                  </div>                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-gray-100 flex items-center justify-center transition-colors shadow-sm"
                  >
                    <FaFilter className="mr-2" />
                    {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </button>
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md hover:from-[#092a4a] hover:to-[#0D3C68] flex items-center justify-center transition-colors shadow-sm"
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
                      className="text-sm text-[#0D3C68] hover:text-[#092a4a]"
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
                          className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68] sm:text-sm rounded-md appearance-none"
                        >
                          <option value="all">Todos</option>
                          {estadosDispensa.map(estado => (
                            <option key={estado.id} value={estado?.denominacion?.toLowerCase() || ''}>
                              {estado?.denominacion || 'Estado sin nombre'}
                            </option>
                          ))}
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
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68]"
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
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68]"
                          value={filter.dateTo}
                          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código de asignatura</label>
                      <input
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68]"
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
              {isLoading ? (                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D3C68] mx-auto"></div>
                  <p className="mt-3 text-gray-600">Cargando solicitudes...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="bg-red-100 text-red-800 p-4 rounded-md inline-block">
                    <p>{error}</p>
                  </div>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-gray-100 text-gray-700 p-6 rounded-lg inline-block">
                    <FaClipboardList className="h-10 w-10 mx-auto text-gray-400 mb-3" />
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
                        Fecha solicitud
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
                    {filteredRequests.map((request, index) => (
                      <tr key={request.id} className={index % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <FaUserGraduate className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {request.user?.name || ''} {request.user?.surname1 || ''} {request.user?.surname2 || ''}
                              </div>
                              <div className="text-sm text-gray-500">{request.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {request.matricula && request.matricula.asignatura ? request.matricula.asignatura.Denominacion : 'Sin denominación'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.matricula && request.matricula.asignatura ? request.matricula.asignatura.CodAsignatura : 'Sin código'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {request.fechaAlegacion ? new Date(request.fechaAlegacion).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(request.estadoDispensa?.denominacion)}`}>
                            {request.estadoDispensa?.denominacion || 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => request && viewRequestDetails(request)}
                            className="text-[#0D3C68] hover:text-[#092a4a] hover:bg-blue-100 rounded-full p-1.5 inline-flex items-center justify-center"
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
          </div>

          {/* Modal de detalle */}
          {showDetailModal && selectedRequest && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              {/* Background overlay con efecto glassmorphism */}
              <div className="fixed inset-0 bg-blue-900/10 backdrop-blur-sm transition-all duration-300" aria-hidden="true" onClick={() => setShowDetailModal(false)}></div>
              
              {/* Modal panel */}
              <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl w-full max-w-2xl m-4 border border-gray-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                {/* Barra superior decorativa */}
                <div className="h-1.5 bg-gradient-to-r from-[#0D3C68] via-[#1a5590] to-[#092a4a]"></div>
                
                {/* Header con título */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-[#0D3C68]">
                  <h3 className="text-xl font-medium text-white flex items-center" id="modal-title">
                    <div className="bg-white/10 p-2 rounded-full mr-3 shadow-sm">
                      <FaClipboardList className="h-5 w-5 text-white" />
                    </div>
                    Detalle de Solicitud de Dispensa
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    type="button"
                    className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Contenido scrollable */}
                <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                  {/* Información del estudiante */}
                  <div className="flex items-center mb-5 pb-4 border-b border-gray-100">
                    <div className="h-12 w-12 bg-[#0D3C68]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaUserGraduate className="h-6 w-6 text-[#0D3C68]" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        {selectedRequest.user?.name || ''} {selectedRequest.user?.surname1 || ''} {selectedRequest.user?.surname2 || ''}
                      </h4>
                      <p className="text-sm text-gray-500">{selectedRequest.user?.email || 'Email no disponible'}</p>
                    </div>
                  </div>
                  
                  {/* Información de asignatura y estado */}
                  <div className="bg-[#0D3C68]/5 rounded-lg mb-5 p-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex items-center">
                        <FaBook className="mr-2 text-[#0D3C68]" />
                        <div>
                          <h4 className="text-base font-medium text-gray-900">
                            {selectedRequest.matricula?.asignatura?.Denominacion || 'Asignatura no especificada'}
                          </h4>
                          {selectedRequest.matricula?.asignatura?.CodAsignatura && (
                            <p className="text-xs text-gray-500">
                              Código: {selectedRequest.matricula.asignatura.CodAsignatura}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white px-3 py-1.5 rounded-md border border-gray-100 text-sm">
                          <FaCalendarAlt className="mr-2 text-[#0D3C68]" />
                          {selectedRequest.fechaAlegacion 
                            ? new Date(selectedRequest.fechaAlegacion).toLocaleDateString('es-ES')
                            : 'Sin fecha'}
                        </div>
                        
                        <span className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${getStatusBadgeClass(selectedRequest.estadoDispensa?.denominacion)}`}>
                          <FaFlag className="mr-2" />
                          {selectedRequest.estadoDispensa?.denominacion || 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Motivo de la solicitud */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100 mb-5">
                    <p className="text-sm font-medium text-gray-700 flex items-center mb-2">
                      <FaComment className="mr-2 text-[#0D3C68]" /> 
                      Motivo de la solicitud
                    </p>
                    <div className="mt-1 text-sm text-gray-900 whitespace-pre-line bg-white p-3 rounded border border-gray-200">
                      {selectedRequest.alegacion || 'No se ha proporcionado motivo'}
                    </div>
                  </div>
                  
                  {/* Documentación adjunta */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100 mb-5">
                    <p className="text-sm font-medium text-gray-700 flex items-center mb-2">
                      <FaPaperclip className="mr-2 text-[#0D3C68]" /> 
                      Documentación adjunta
                    </p>
                    {selectedRequest.DocumentacionDispensa && selectedRequest.DocumentacionDispensa.length > 0 ? (
                      <div className="space-y-2">
                        {selectedRequest.DocumentacionDispensa.map((doc, index) => (
                          doc && <div key={doc.id} className="flex items-center bg-white p-3 rounded-md border border-gray-200 hover:border-[#0D3C68]/30 transition-colors">
                            <div className="h-8 w-8 bg-[#0D3C68]/10 rounded-full flex items-center justify-center mr-3">
                              <FaFile className="text-[#0D3C68]" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Documento {index + 1}</p>
                              <p className="text-xs text-gray-500">Subido el {new Date(doc.fechaSubida).toLocaleDateString('es-ES')}</p>
                            </div>
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-3 py-1.5 bg-[#0D3C68] text-white text-sm rounded hover:bg-[#092a4a] transition-colors flex items-center"
                            >
                              <FaDownload className="mr-1" size={12} /> Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 bg-white rounded-md border border-dashed border-gray-300">
                        <FaFilePdf className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No hay documentación adjunta</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Información de resolución (si existe) */}
                  {selectedRequest.fechaRespuesta && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-100 mb-5">
                      <div className="flex items-center mb-3">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                          <FaCheckCircle className="text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-gray-900">Solicitud resuelta</h4>
                          <p className="text-xs text-gray-500">
                            {selectedRequest.fechaRespuesta ? new Date(selectedRequest.fechaRespuesta).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-sm text-gray-900 whitespace-pre-line">{selectedRequest.respuesta || 'Sin comentarios adicionales'}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Formulario de resolución (solo si está pendiente) */}
                  {selectedRequest.estadoDispensa?.denominacion?.toLowerCase() === 'pendiente' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="h-8 w-8 bg-[#0D3C68]/10 rounded-full flex items-center justify-center mr-2">
                          <FaCog className="text-[#0D3C68]" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900">Resolver solicitud</h4>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="mb-4">
                          <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center">
                            <FaTag className="mr-2 text-[#0D3C68]" />
                            Estado de la solicitud
                          </label>
                          <div className="relative">
                            <select
                              value={resolution.status}
                              onChange={(e) => setResolution({...resolution, status: e.target.value})}
                              className="block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68] sm:text-sm rounded-lg shadow-sm appearance-none"
                            >
                              <option value="" disabled>Seleccione un estado</option>
                              {estadosDispensa
                                .filter(e => e?.denominacion?.toLowerCase() !== 'pendiente')
                                .map(estado => (
                                  <option key={estado.id} value={estado.id}>
                                    {estado?.denominacion || 'Estado sin nombre'}
                                  </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-1">
                          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <FaComment className="mr-2 text-[#0D3C68]" />
                            Comentarios (opcional)
                          </label>
                          <textarea
                            id="comments"
                            rows={3}
                            className="shadow-sm focus:ring-[#0D3C68] focus:border-[#0D3C68] block w-full sm:text-sm border border-gray-300 rounded-lg p-3"
                            placeholder="Añade comentarios o instrucciones para el estudiante..."
                            value={resolution.comments}
                            onChange={(e) => setResolution({...resolution, comments: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer con botones */}
                <div className="bg-gray-50 p-4 sm:px-6 flex flex-col sm:flex-row-reverse sm:items-center gap-2 border-t border-gray-100 mt-auto">
                  {selectedRequest.estadoDispensa?.denominacion?.toLowerCase() === 'pendiente' && (
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={!resolution.status}
                      className={`flex items-center justify-center rounded-lg border border-transparent shadow-sm px-5 py-2 text-sm font-medium transition-all duration-200 ${resolution.status ? 'bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white hover:from-[#092a4a] hover:to-[#0D3C68] focus:ring-2 focus:ring-[#0D3C68] focus:ring-offset-1' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      <FaSaveIcon className="mr-2" />
                      Guardar resolución
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="flex items-center justify-center rounded-lg border border-gray-300 shadow-sm px-5 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#0D3C68] focus:outline-none focus:ring-2 focus:ring-[#0D3C68] focus:ring-offset-1 transition-all duration-200"
                  >
                    <FaTimesIcon className="mr-2" />
                    {selectedRequest.estadoDispensa?.denominacion?.toLowerCase() === 'pendiente' ? 'Cancelar' : 'Cerrar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
