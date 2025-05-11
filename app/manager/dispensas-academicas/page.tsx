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
  FaCheck,
  FaTimes,
  FaUserGraduate,
  FaCalendarAlt,
  FaBook,
  FaPaperclip,
  FaChevronDown,
  FaCommentAlt,
  FaHome,
  FaTachometerAlt
} from 'react-icons/fa';

// Interfaces para el tipado
interface DispensationRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  subjectCode: string;
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

export default function AcademicDispensations() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<DispensationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DispensationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<DispensationRequest | null>(null);
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
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Construir parámetros de consulta basados en los filtros
        const queryParams = new URLSearchParams();
        if (filter.status !== 'all') queryParams.append('status', filter.status);
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
        setRequests(data);
        setFilteredRequests(data);
        setError(null);
      } catch (error) {
        console.error('Error al cargar las dispensas académicas:', error);
        setError('No se pudieron cargar las dispensas académicas. Por favor, intente nuevamente más tarde.');
        
        // Como fallback, usamos datos de ejemplo si la API falla
        const mockRequests: DispensationRequest[] = [
          {
            id: '1',
            studentId: 'ALU0001',
            studentName: 'Ana García Pérez',
            studentEmail: 'ana.garcia@estudiantes.ufv.es',
            subject: 'Matemáticas Discretas',
            subjectCode: 'MAT101',
            requestDate: '2025-05-10',
            reason: 'Motivos médicos: operación quirúrgica programada que requiere reposo absoluto durante 3 semanas',
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
            requestDate: '2025-05-09',
            reason: 'Coincidencia con competición deportiva nacional donde represento a la universidad',
            status: 'pending',
            documentationUrl: '/docs/convocatoria-competicion.pdf',
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
            requestDate: '2025-05-08',
            reason: 'Intercambio académico internacional durante el segundo semestre',
            status: 'approved',
            documentationUrl: '/docs/carta-aceptacion-intercambio.pdf',
            resolution: 'Aprobada por cumplir los requisitos de intercambio académico',
            resolutionDate: '2025-05-09',
            resolvedBy: 'Javier Moreno (Manager)',
            comments: 'El estudiante deberá realizar trabajos compensatorios acordados con el profesor'
          },
          {
            id: '4',
            studentId: 'ALU0078',
            studentName: 'Javier Martín González',
            studentEmail: 'javier.martin@estudiantes.ufv.es',
            subject: 'Programación II',
            subjectCode: 'PRG202',
            requestDate: '2025-05-07',
            reason: 'Situación familiar grave que requiere atención inmediata',
            status: 'rejected',
            documentationUrl: '/docs/declaracion-jurada.pdf',
            resolution: 'Documentación insuficiente para justificar la dispensa académica',
            resolutionDate: '2025-05-08',
            resolvedBy: 'Luisa Fernández (Manager)',
            comments: 'Se recomienda aportar documentación adicional si desea presentar nuevamente la solicitud'
          }
        ];
        
        setRequests(mockRequests);
        setFilteredRequests(mockRequests);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  useEffect(() => {
    // Aplicar filtros cuando cambien
    let result = [...requests];
    
    // Filtrar por estado
    if (filter.status !== 'all') {
      result = result.filter(req => req.status === filter.status);
    }
    
    // Filtrar por fecha (desde)
    if (filter.dateFrom) {
      result = result.filter(req => new Date(req.requestDate) >= new Date(filter.dateFrom));
    }
    
    // Filtrar por fecha (hasta)
    if (filter.dateTo) {
      result = result.filter(req => new Date(req.requestDate) <= new Date(filter.dateTo));
    }
    
    // Filtrar por código de asignatura
    if (filter.subjectCode) {
      result = result.filter(req => 
        req.subjectCode.toLowerCase().includes(filter.subjectCode.toLowerCase())
      );
    }
    
    // Filtrar por término de búsqueda
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(req => 
        req.studentName.toLowerCase().includes(term) ||
        req.studentId.toLowerCase().includes(term) ||
        req.subject.toLowerCase().includes(term) ||
        req.reason.toLowerCase().includes(term)
      );
    }
    
    setFilteredRequests(result);
  }, [filter, requests]);
  
  const viewRequestDetails = (request: DispensationRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setResolution({
      status: request.status,
      comments: request.comments || ''
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
  };
    const handleResolve = async () => {
    if (!selectedRequest) return;
    
    try {      // Llamada a la API para actualizar el estado de la solicitud
      const response = await fetch('/api/dispensas-academicas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedRequest.id,
          status: resolution.status,
          comments: resolution.comments,
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar la solicitud: ${response.status} ${response.statusText}`);
      }
      
      // Actualizamos el estado local
      const updatedRequests = requests.map(req => {
        if (req.id === selectedRequest.id) {
          return {
            ...req,
            status: resolution.status,
            comments: resolution.comments,
            resolution: resolution.status === 'approved' 
              ? 'Solicitud aprobada' 
              : 'Solicitud rechazada',
            resolutionDate: new Date().toISOString().split('T')[0],
            resolvedBy: session?.user?.name || 'Manager'
          };
        }
        return req;
      });
      
      setRequests(updatedRequests);
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
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                    {filteredRequests.length} solicitudes
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
                    <FaClipboardList className="text-[#0D3C68]" />
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
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Buscar solicitud..."
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
                              <div className="text-sm font-medium text-gray-900">{request.studentName}</div>
                              <div className="text-sm text-gray-500">{request.studentId} | {request.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{request.subject}</div>
                          <div className="text-sm text-gray-500">{request.subjectCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(request.requestDate).toLocaleDateString('es-ES')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => viewRequestDetails(request)}
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
          </div>

          {/* Modal de detalle */}
          {showDetailModal && selectedRequest && (
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                {/* Modal panel */}
                <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        {/* Header del modal */}
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                          <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Detalle de Solicitud de Dispensa
                          </h3>
                          <button
                            onClick={() => setShowDetailModal(false)}
                            type="button"
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                          >
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Contenido del modal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Estudiante</p>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.studentName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">ID de Estudiante</p>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.studentId}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.studentEmail}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Asignatura</p>
                            <p className="mt-1 text-sm text-gray-900">{selectedRequest.subject} ({selectedRequest.subjectCode})</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Fecha de Solicitud</p>
                            <p className="mt-1 text-sm text-gray-900">{new Date(selectedRequest.requestDate).toLocaleDateString('es-ES')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Estado</p>
                            <p className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(selectedRequest.status)}`}>
                                {getStatusText(selectedRequest.status)}
                              </span>
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-500">Motivo de la Solicitud</p>
                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{selectedRequest.reason}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm font-medium text-gray-500">Documentación Adjunta</p>
                            <div className="mt-1 flex items-center">
                              <FaPaperclip className="mr-2 text-blue-600" />
                              <a href={selectedRequest.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                                Ver documento adjunto
                              </a>
                            </div>
                          </div>

                          {(selectedRequest.status === 'approved' || selectedRequest.status === 'rejected') && (
                            <>
                              <div className="md:col-span-2">
                                <p className="text-sm font-medium text-gray-500">Resolución</p>
                                <p className="mt-1 text-sm text-gray-900">{selectedRequest.resolution}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Fecha de Resolución</p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {selectedRequest.resolutionDate ? new Date(selectedRequest.resolutionDate).toLocaleDateString('es-ES') : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Resuelta por</p>
                                <p className="mt-1 text-sm text-gray-900">{selectedRequest.resolvedBy || 'N/A'}</p>
                              </div>
                              {selectedRequest.comments && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-medium text-gray-500">Comentarios</p>
                                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{selectedRequest.comments}</p>
                                </div>
                              )}
                            </>
                          )}

                          {selectedRequest.status === 'pending' && (
                            <>
                              <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-base font-medium text-gray-900">Resolver Solicitud</h4>
                                
                                <div className="mt-3 mb-4">
                                  <label className="text-sm font-medium text-gray-700 block mb-2">Estado</label>
                                  <div className="flex gap-4">
                                    <label className="inline-flex items-center">
                                      <input
                                        type="radio"
                                        className="form-radio h-4 w-4 text-blue-600"
                                        name="status"
                                        value="approved"
                                        checked={resolution.status === 'approved'}
                                        onChange={() => setResolution({...resolution, status: 'approved'})}
                                      />
                                      <span className="ml-2 text-sm text-gray-700">Aprobar</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                      <input
                                        type="radio"
                                        className="form-radio h-4 w-4 text-blue-600"
                                        name="status"
                                        value="rejected"
                                        checked={resolution.status === 'rejected'}
                                        onChange={() => setResolution({...resolution, status: 'rejected'})}
                                      />
                                      <span className="ml-2 text-sm text-gray-700">Rechazar</span>
                                    </label>
                                  </div>
                                </div>
                                
                                <div className="mb-4">
                                  <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                                    Comentarios (opcional)
                                  </label>
                                  <textarea
                                    id="comments"
                                    rows={3}
                                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                    placeholder="Añade comentarios o instrucciones para el estudiante..."
                                    value={resolution.comments}
                                    onChange={(e) => setResolution({...resolution, comments: e.target.value})}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    {selectedRequest.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={handleResolve}
                          disabled={!resolution.status}
                          className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${resolution.status ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                          Guardar resolución
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {selectedRequest.status === 'pending' ? 'Cancelar' : 'Cerrar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
