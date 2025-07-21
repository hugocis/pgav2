'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaPlay, 
  FaClock, 
  FaCheckCircle, 
  FaTimesCircle,
  FaDatabase,
  FaHistory,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaUser,
  FaFileArchive,
  FaSync,
  FaShieldAlt,
  FaChartLine,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BackupRecord {
  id: string;
  tipoBackup: 'INCREMENTAL' | 'COMPLETO';
  fechaInicio: string;
  fechaFin: string | null;
  estado: 'EN_PROGRESO' | 'COMPLETADO' | 'FALLIDO';
  archivoPath: string | null;
  tamaño: string | null;
  observaciones: string | null;
  ejecutadoPor: {
    id: string;
    name: string | null;
    surname1: string | null;
    surname2: string | null;
    email: string;
  } | null;
}

interface BackupResponse {
  backups: BackupRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  resumen: {
    ultimoCompleto: BackupRecord | null;
    ultimoIncremental: BackupRecord | null;
  };
}

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'COMPLETADO':
      return <FaCheckCircle className="text-green-500" />;
    case 'FALLIDO':
      return <FaTimesCircle className="text-red-500" />;
    case 'EN_PROGRESO':
      return <FaClock className="text-yellow-500 animate-spin" />;
    default:
      return <FaClock className="text-gray-500" />;
  }
};

const getEstadoBadge = (estado: string) => {
  const baseClasses = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
  switch (estado) {
    case 'COMPLETADO':
      return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
    case 'FALLIDO':
      return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
    case 'EN_PROGRESO':
      return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
  }
};

const formatFileSize = (bytes: string | null): string => {
  if (!bytes) return 'N/A';
  const size = parseInt(bytes);
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
};

const formatUserName = (user: BackupRecord['ejecutadoPor']) => {
  if (!user) return 'Sistema';
  return `${user.name || ''} ${user.surname1 || ''} ${user.surname2 || ''}`.trim() || user.email;
};

export default function BackupPage() {
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [data, setData] = useState<BackupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ejecutandoBackup, setEjecutandoBackup] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');

  const loadBackups = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/backup?page=${pageNumber}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Error al cargar backups');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups(page);
  }, [page]);

  const ejecutarBackup = async (tipo: 'INCREMENTAL' | 'COMPLETO') => {
    try {
      setEjecutandoBackup(true);
      
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tipoBackup: tipo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ejecutar backup');
      }

      // Recargar la lista de backups
      await loadBackups(1);
      setPage(1);
      
      // Mostrar un mensaje de éxito (podrías usar una librería de toast aquí)
      alert('Backup iniciado correctamente. Revisa el estado en unos momentos.');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setEjecutandoBackup(false);
    }
  };

  const formatFileSize = (size: string | number | null): string => {
    if (!size) return 'N/A';
    const bytes = typeof size === 'string' ? parseInt(size) : size;
    if (isNaN(bytes)) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUserName = (user: any): string => {
    if (user?.nombre && user?.apellidos) {
      return `${user.nombre} ${user.apellidos}`;
    }
    return user?.email || 'Usuario desconocido';
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
        return <FaCheckCircle className="h-4 w-4 text-green-500" />;
      case 'EN_PROGRESO':
        return <FaClock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'FALLIDO':
        return <FaTimesCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FaExclamationCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'COMPLETADO':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'EN_PROGRESO':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'FALLIDO':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  };

  const getDaysAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : `Hace ${diff} días`;
  };

  // Filtrar backups basado en términos de búsqueda y filtros
  const filteredBackups = data?.backups.filter(backup => {
    const matchesSearch = !searchTerm || 
      backup.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatUserName(backup.ejecutadoPor).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = !filtroTipo || backup.tipoBackup === filtroTipo;
    const matchesEstado = !filtroEstado || backup.estado === filtroEstado;
    
    return matchesSearch && matchesTipo && matchesEstado;
  }) || [];

  if (status === 'loading' || loading) {
    return (
      <DashboardContainer roleName="Admin">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0D3C68]"></div>
            <p className="mt-4 text-lg text-gray-600">Cargando sistema de backup...</p>
          </div>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          
          {/* Header principal */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaDatabase className="mr-3" /> 
                    Sistema de Backup
                  </h1>
                  <p className="text-blue-100 text-sm">
                    Gestiona backups incrementales y completos para proteger la información del sistema
                  </p>
                </div>
                <div className="bg-white/10 rounded-full p-3">
                  <FaShieldAlt className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Estadísticas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Último backup completo */}
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full p-3">
                    <FaFileArchive className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Último Backup Completo</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {data?.resumen.ultimoCompleto ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getEstadoIcon(data.resumen.ultimoCompleto.estado)}
                              <span className={getEstadoBadge(data.resumen.ultimoCompleto.estado)}>
                                {data.resumen.ultimoCompleto.estado}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {getDaysAgo(data.resumen.ultimoCompleto.fechaInicio)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-yellow-600">Sin backups</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Último backup incremental */}
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-3">
                    <FaClock className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Último Backup Incremental</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {data?.resumen.ultimoIncremental ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getEstadoIcon(data.resumen.ultimoIncremental.estado)}
                              <span className={getEstadoBadge(data.resumen.ultimoIncremental.estado)}>
                                {data.resumen.ultimoIncremental.estado}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {getDaysAgo(data.resumen.ultimoIncremental.fechaInicio)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-yellow-600">Sin backups</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total backups */}
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full p-3">
                    <FaChartLine className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Backups</dt>
                      <dd className="text-lg font-medium text-gray-900">{data?.pagination.total || 0}</dd>
                      <dd className="text-sm text-gray-600">
                        <span className="text-green-600">{data?.backups.filter(b => b.estado === 'COMPLETADO').length || 0} completados</span>
                        {(data?.backups.filter(b => b.estado === 'FALLIDO').length || 0) > 0 && (
                          <span className="text-red-600 ml-2">{data?.backups.filter(b => b.estado === 'FALLIDO').length || 0} fallidos</span>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ejecutar Backup Manual</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ejecuta un backup inmediato del sistema de forma manual
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => ejecutarBackup('INCREMENTAL')}
                  disabled={ejecutandoBackup}
                  className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaClock className="mr-2 h-5 w-5" />
                  Backup Incremental
                </button>
                
                <button
                  onClick={() => ejecutarBackup('COMPLETO')}
                  disabled={ejecutandoBackup}
                  className="flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaFileArchive className="mr-2 h-5 w-5" />
                  Backup Completo
                </button>
              </div>
              
              {ejecutandoBackup && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <FaClock className="animate-spin h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Backup en progreso...</p>
                      <p className="text-sm text-yellow-700">Esto puede tomar varios minutos dependiendo del tamaño de la base de datos</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historial de backups */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FaHistory className="mr-2 text-purple-600" />
                    Historial de Backups
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Registro completo de todas las operaciones de backup
                  </p>
                </div>
                <div className="mt-3 sm:mt-0">
                  <button
                    onClick={() => loadBackups(page)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D3C68]"
                  >
                    <FaSync className="mr-2 h-4 w-4" />
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por usuario u observaciones..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#0D3C68] focus:border-[#0D3C68] text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68] text-sm rounded-md"
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                  >
                    <option value="">Todos los tipos</option>
                    <option value="INCREMENTAL">Incremental</option>
                    <option value="COMPLETO">Completo</option>
                  </select>
                </div>
                
                <div>
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#0D3C68] focus:border-[#0D3C68] text-sm rounded-md"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                  >
                    <option value="">Todos los estados</option>
                    <option value="COMPLETADO">Completado</option>
                    <option value="EN_PROGRESO">En progreso</option>
                    <option value="FALLIDO">Fallido</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaTimesCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error al cargar los backups</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de backups */}
            <div className="overflow-hidden">
              <div className="min-w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duración
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamaño
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ejecutado por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Observaciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBackups.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                          <div className="flex flex-col items-center">
                            <FaExclamationTriangle className="h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="font-medium text-gray-900 mb-2">No hay backups</h3>
                            <p>No se encontraron backups que coincidan con los criterios de búsqueda.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBackups.map((backup) => {
                        const duracion = backup.fechaFin 
                          ? Math.round((new Date(backup.fechaFin).getTime() - new Date(backup.fechaInicio).getTime()) / 1000)
                          : null;
                        
                        return (
                          <tr key={backup.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                backup.tipoBackup === 'COMPLETO' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {backup.tipoBackup === 'COMPLETO' ? (
                                  <FaFileArchive className="mr-1.5 h-3 w-3" />
                                ) : (
                                  <FaClock className="mr-1.5 h-3 w-3" />
                                )}
                                {backup.tipoBackup}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getEstadoIcon(backup.estado)}
                                <span className={`ml-2 ${getEstadoBadge(backup.estado)}`}>
                                  {backup.estado}
                                </span>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div className="flex items-center">
                                  <FaCalendarAlt className="mr-1.5 h-3 w-3 text-gray-400" />
                                  {format(new Date(backup.fechaInicio), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {getDaysAgo(backup.fechaInicio)}
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {duracion ? `${duracion}s` : 'N/A'}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatFileSize(backup.tamaño)}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <FaUser className="mr-1.5 h-3 w-3 text-gray-400" />
                                {formatUserName(backup.ejecutadoPor)}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="max-w-xs truncate" title={backup.observaciones || 'N/A'}>
                                {backup.observaciones || 'N/A'}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{((data.pagination.page - 1) * data.pagination.limit) + 1}</span> a{' '}
                      <span className="font-medium">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}</span> de{' '}
                      <span className="font-medium">{data.pagination.total}</span> backups
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Anterior</span>
                        <FaChevronLeft className="h-4 w-4" />
                      </button>
                      
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        {page} de {data.pagination.totalPages}
                      </span>
                      
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= data.pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Siguiente</span>
                        <FaChevronRight className="h-4 w-4" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
