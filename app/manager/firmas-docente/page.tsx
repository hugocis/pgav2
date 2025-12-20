'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaArrowLeft, 
  FaCalendarAlt, 
  FaCheck, 
  FaClipboardList, 
  FaFileSignature, 
  FaSearch,
  FaTimes,
  FaFilter,
  FaDownload,
  FaUniversity,
  FaUser,
  FaInfoCircle
} from 'react-icons/fa';
import DashboardContainer from '@/components/DashboardContainer';
import ManagerCarreraSelector from '@/components/ManagerCarreraSelector';

// Tipos
interface FirmaDocente {
  id: string;
  fechaFirma: string;
  observaciones?: string;
  sesionClaseId: string;
}

interface Docente {
  id: string;
  name?: string;
  surname1?: string;
  surname2?: string;
  email: string;
}

interface Asignatura {
  id: string;
  CodAsignatura: string;
  Denominacion: string;
  carrera: {
    id: string;
    denominacion: string;
  };
}

interface Grupo {
  id: string;
  denominacion: string;
  asignatura: Asignatura;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  docenteId: string;
  grupo: Grupo;
  user: Docente;
  FirmaDocente: FirmaDocente | null;
  // Campo para identificar el estado de la firma: 'programada', 'pendiente', 'firmada'
  estadoFirma: 'programada' | 'pendiente' | 'firmada';
}

export default function FirmasDocente() {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [fechaActual, setFechaActual] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  });
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'firmadas' | 'pendientes' | 'programadas'>('todas');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [statsFirmadas, setStatsFirmadas] = useState<number>(0);
  const [statsPendientes, setStatsPendientes] = useState<number>(0);
  const [statsTotal, setStatsTotal] = useState<number>(0);
  const [exportLoading, setExportLoading] = useState<{pdf: boolean, excel: boolean}>({
    pdf: false,
    excel: false
  });

  // Función para cargar las sesiones
  const cargarSesiones = async (fechaSeleccionada: string, carrera: string, filtro: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let url = `/firmas-docente?fecha=${fechaSeleccionada}&incluirProgramadas=true`;
      
      // Añadir filtro por carrera si está seleccionada
      if (carrera) {
        url += `&carreraId=${carrera}`;
      }
      
      // Filtro por estado de firma
      if (filtro === 'firmadas') {
        url += '&firmadas=true';
      } else if (filtro === 'pendientes') {
        url += '&firmadas=pendiente';
      } else if (filtro === 'programadas') {
        url += '&firmadas=programada';
      } else {
        // Si no se especifica un filtro (todas), no añadimos parámetro de firma
        // para que el backend devuelva todas las sesiones
        console.log('Mostrando todas las sesiones sin filtro de estado');
      }
      
      console.log(`Realizando petición a: ${url}`);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache' // Evitamos caché para obtener datos frescos
        }
      });
      
      if (!response.ok) {
        // Intentamos obtener más información del error
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || 'Error desconocido';
        } catch {
          errorText = `Error HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorText);
      }
      
      const data: SesionClase[] = await response.json();
      console.log(`Datos recibidos: ${data.length} sesiones`);
      
      // Verificar que todos los registros tengan el campo estadoFirma
      const sinEstadoFirma = data.filter(s => !s.estadoFirma);
      if (sinEstadoFirma.length > 0) {
        console.warn(`${sinEstadoFirma.length} sesiones no tienen estadoFirma definido`);
      }
      
      setSesiones(data);
      
      // Calcular estadísticas
      const firmadas = data.filter(sesion => sesion.estadoFirma === 'firmada').length;
      const pendientes = data.filter(sesion => sesion.estadoFirma === 'pendiente').length;
      const programadas = data.filter(sesion => sesion.estadoFirma === 'programada').length;
      
      console.log(`Estadísticas: Firmadas=${firmadas}, Pendientes=${pendientes}, Programadas=${programadas}`);
      
      setStatsFirmadas(firmadas);
      setStatsPendientes(pendientes); // Solo contamos las pendientes (que ya tienen sesión creada)
      setStatsTotal(data.length);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar firmas docentes:', error);
      setError(`Error al cargar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setIsLoading(false);
    }
  };

  // Cargar datos cuando cambien los filtros
  useEffect(() => {
    if (session?.user?.id) {
      cargarSesiones(fechaActual, carreraSeleccionada, filtroEstado);
    }
  }, [fechaActual, carreraSeleccionada, filtroEstado, session?.user?.id]);

  // Función para cambiar el filtro de estado
  const cambiarFiltro = (filtro: 'todas' | 'firmadas' | 'pendientes' | 'programadas') => {
    setFiltroEstado(filtro);
  };

  // Filtrar sesiones por término de búsqueda
  const sesionesFiltradas = busqueda 
    ? sesiones.filter(sesion => 
        `${sesion.user.surname1 || ''} ${sesion.user.surname2 || ''} ${sesion.user.name || ''}`.toLowerCase().includes(busqueda.toLowerCase()) ||
        sesion.grupo.asignatura.Denominacion.toLowerCase().includes(busqueda.toLowerCase()) ||
        sesion.grupo.denominacion.toLowerCase().includes(busqueda.toLowerCase())
      )
    : sesiones;

  // Formatear nombre completo
  const formatearNombreCompleto = (docente: Docente) => {
    return `${docente.surname1 || ''} ${docente.surname2 || ''} ${docente.name || ''}`.trim();
  };
  
  // Formatear hora
  const formatearHora = (fechaString: string) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };
  
  // Exportar a PDF
  const exportarPDF = async () => {
    setExportLoading(prev => ({ ...prev, pdf: true }));
    try {
      // Crear datos para el PDF
      const fechaFormateada = new Date(fechaActual).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const titulo = `Informe de Firmas Docente - ${fechaFormateada}`;
      const subtitulo = filtroEstado === 'todas' ? 'Todas las sesiones' :
                      filtroEstado === 'firmadas' ? 'Sesiones firmadas' :
                      'Sesiones pendientes de firma';
      
      // Datos para la tabla
      const datosPDF = sesionesFiltradas.map(sesion => ({
        profesor: formatearNombreCompleto(sesion.user),
        asignatura: sesion.grupo.asignatura.Denominacion,
        grupo: sesion.grupo.denominacion,
        carrera: sesion.grupo.asignatura.carrera.denominacion,
        hora: formatearHora(sesion.fecha),
        estado: sesion.estadoFirma === 'firmada' ? 'Firmada' : sesion.estadoFirma === 'programada' ? 'Programada' : 'Pendiente',
        horaFirma: sesion.FirmaDocente ? formatearHora(sesion.FirmaDocente.fechaFirma) : '-'
      }));
      
      // Enviar datos al endpoint de generación de PDF
      const response = await fetch('/api/generar-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo,
          subtitulo,
          fecha: fechaFormateada,
          datos: datosPDF,
          estadisticas: {
            total: statsTotal,
            firmadas: statsFirmadas,
            pendientes: statsPendientes
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al generar el PDF');
      }
      
      // Descargar el PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `firmas-docente-${fechaActual}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      alert('Error al generar el PDF. Inténtelo de nuevo.');
    } finally {
      setExportLoading(prev => ({ ...prev, pdf: false }));
    }
  };
  
  // Exportar a Excel
  const exportarExcel = async () => {
    setExportLoading(prev => ({ ...prev, excel: true }));
    try {
      // Crear datos para el Excel
      const fechaFormateada = new Date(fechaActual).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Datos para el Excel
      const datosExcel = sesionesFiltradas.map(sesion => ({
        Profesor: formatearNombreCompleto(sesion.user),
        Email: sesion.user.email,
        Asignatura: sesion.grupo.asignatura.Denominacion,
        'Código': sesion.grupo.asignatura.CodAsignatura,
        Grupo: sesion.grupo.denominacion,
        Carrera: sesion.grupo.asignatura.carrera.denominacion,
        Hora: formatearHora(sesion.fecha),
        Estado: sesion.estadoFirma === 'firmada' ? 'Firmada' : sesion.estadoFirma === 'programada' ? 'Programada' : 'Pendiente',
        'Hora de Firma': sesion.FirmaDocente ? formatearHora(sesion.FirmaDocente.fechaFirma) : '-',
        Tipo: sesion.estadoFirma === 'programada' ? 'Programada' : 'Registrada'
      }));
      
      // Enviar datos al endpoint de generación de Excel
      const response = await fetch('/api/generar-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titulo: `Firmas Docente - ${fechaFormateada}`,
          datos: datosExcel,
          estadisticas: {
            total: statsTotal,
            firmadas: statsFirmadas,
            pendientes: statsPendientes
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al generar el Excel');
      }
      
      // Descargar el Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `firmas-docente-${fechaActual}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al generar el Excel. Inténtelo de nuevo.');
    } finally {
      setExportLoading(prev => ({ ...prev, excel: false }));
    }
  };

  return (
    <DashboardContainer roleName="Manager">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/manager/dashboard" className="mr-3 text-white hover:text-blue-200 transition bg-blue-800 hover:bg-blue-700 p-2.5 rounded-full shadow-sm">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaFileSignature className="mr-3" />
                      Firmas Docente
                    </h1>
                  </div>
                  <p className="text-blue-100 mt-1">
                    Control y seguimiento de firmas de profesores
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Panel de filtros */}
          <div className="mb-6 bg-white rounded-lg shadow-md p-5">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <FaFilter className="mr-2 text-blue-600" />
              Filtros de búsqueda
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Filtro de fecha */}
              <div>
                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaCalendarAlt className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="fecha"
                    value={fechaActual}
                    onChange={(e) => setFechaActual(e.target.value)}
                    className="pl-10 block w-full rounded-md border border-gray-300 bg-white py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Selector de carrera */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrera
                </label>
                <ManagerCarreraSelector 
                  onCarreraChange={setCarreraSeleccionada} 
                  carreraSeleccionada={carreraSeleccionada}
                  incluirTodasLasCarreras={true}
                />
              </div>
              
              {/* Filtro de estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <div className="grid grid-cols-4 bg-gray-100 rounded-md overflow-hidden shadow-sm">
                  <button
                    onClick={() => cambiarFiltro('todas')}
                    className={`py-2.5 px-1 text-xs md:text-sm font-medium ${
                      filtroEstado === 'todas' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => cambiarFiltro('firmadas')}
                    className={`py-2.5 px-1 text-xs md:text-sm font-medium ${
                      filtroEstado === 'firmadas' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition flex items-center justify-center`}
                  >
                    <FaCheck className="mr-1 text-xs" /> Firmadas
                  </button>
                  <button
                    onClick={() => cambiarFiltro('pendientes')}
                    className={`py-2.5 px-1 text-xs md:text-sm font-medium ${
                      filtroEstado === 'pendientes' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition flex items-center justify-center`}
                  >
                    <FaTimes className="mr-1 text-xs" /> Pendientes
                  </button>
                  <button
                    onClick={() => cambiarFiltro('programadas')}
                    className={`py-2.5 px-1 text-xs md:text-sm font-medium ${
                      filtroEstado === 'programadas' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } transition flex items-center justify-center`}
                  >
                    <FaCalendarAlt className="mr-1 text-xs" /> Programadas
                  </button>
                </div>
              </div>
            </div>
            
            {/* Búsqueda adicional y estadísticas */}
            <div className="mt-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por profesor o asignatura..."
                  className="pl-10 block w-full rounded-md border border-gray-300 bg-white py-2.5 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              
              <div className="flex w-full md:w-auto gap-3">
                <div className="bg-blue-50 py-2 px-4 rounded-md flex items-center text-blue-800">
                  <div className="mr-2 bg-blue-100 p-1.5 rounded-full">
                    <FaClipboardList className="text-blue-700" />
                  </div>
                  <div>
                    <span className="block text-xs text-blue-600">Total</span>
                    <span className="font-bold">{statsTotal}</span>
                  </div>
                </div>
                
                <div className="bg-green-50 py-2 px-4 rounded-md flex items-center text-green-800">
                  <div className="mr-2 bg-green-100 p-1.5 rounded-full">
                    <FaCheck className="text-green-700" />
                  </div>
                  <div>
                    <span className="block text-xs text-green-600">Firmadas</span>
                    <span className="font-bold">{statsFirmadas}</span>
                  </div>
                </div>
                
                <div className="bg-red-50 py-2 px-4 rounded-md flex items-center text-red-800">
                  <div className="mr-2 bg-red-100 p-1.5 rounded-full">
                    <FaTimes className="text-red-700" />
                  </div>
                  <div>
                    <span className="block text-xs text-red-600">Pendientes</span>
                    <span className="font-bold">{sesiones.filter(s => s.estadoFirma === 'pendiente').length}</span>
                  </div>
                </div>
                
                <div className="bg-indigo-50 py-2 px-4 rounded-md flex items-center text-indigo-800">
                  <div className="mr-2 bg-indigo-100 p-1.5 rounded-full">
                    <FaCalendarAlt className="text-indigo-700" />
                  </div>
                  <div>
                    <span className="block text-xs text-indigo-600">Programadas</span>
                    <span className="font-bold">{sesiones.filter(s => s.estadoFirma === 'programada').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido principal - Lista de sesiones y firmas */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                    <FaClipboardList className="text-[#0D3C68]" />
                  </div>
                  <div>
                    <span className="text-gray-900">
                      {new Date(fechaActual).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      {busqueda ? `Resultados de búsqueda: ${sesionesFiltradas.length}` : 
                        filtroEstado === 'todas' ? 'Todas las sesiones' :
                        filtroEstado === 'firmadas' ? 'Sesiones firmadas' : 
                        filtroEstado === 'programadas' ? 'Sesiones programadas' :
                        'Sesiones pendientes de firma'}
                    </div>
                  </div>
                </h2>
                
                <button
                  className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                  onClick={() => cargarSesiones(fechaActual, carreraSeleccionada, filtroEstado)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>

            {/* Lista de sesiones */}
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                  <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-300 animate-spin animate-pulse" 
                    style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="ml-4 text-lg text-gray-600">Cargando firmas...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="bg-red-100 p-4 rounded-lg inline-block mb-4">
                  <FaTimes className="text-red-600 text-3xl" />
                </div>
                <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
                <p className="text-gray-600">{error}</p>
              </div>
            ) : sesionesFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-blue-50 inline-block rounded-full p-5 mb-4">
                  <FaInfoCircle className="text-blue-500 text-3xl" />
                </div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">No hay sesiones disponibles</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  No se encontraron sesiones de clase para la fecha y filtros seleccionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profesor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asignatura
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grupo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carrera
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hora
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hora Firma
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sesionesFiltradas.map((sesion) => {
                      return (
                        <tr key={sesion.id} className={`hover:bg-gray-50 ${sesion.estadoFirma === 'programada' ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-10 w-10 rounded-full ${sesion.estadoFirma === 'programada' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center`}>
                                <FaUser className="h-4 w-4" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatearNombreCompleto(sesion.user)}
                                </div>
                                <div className="text-xs text-gray-500">{sesion.user.email}</div>
                                {sesion.estadoFirma === 'programada' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 mt-1">
                                    Programada
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{sesion.grupo.asignatura.Denominacion}</div>
                            <div className="text-xs text-gray-500">{sesion.grupo.asignatura.CodAsignatura}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sesion.grupo.denominacion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaUniversity className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                              <span className="text-sm text-gray-900">{sesion.grupo.asignatura.carrera.denominacion}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FaCalendarAlt className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                              <span className="text-sm text-gray-900">{formatearHora(sesion.fecha)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sesion.estadoFirma === 'firmada' ? (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                                <FaCheck className="mr-1.5" /> Firmada
                              </span>
                            ) : sesion.estadoFirma === 'programada' ? (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-indigo-100 text-indigo-800">
                                <FaTimes className="mr-1.5" /> Programada
                              </span>
                            ) : (
                              <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-red-100 text-red-800">
                                <FaTimes className="mr-1.5" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sesion.FirmaDocente ? 
                              formatearHora(sesion.FirmaDocente.fechaFirma) : 
                              '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Panel de exportación */}
          {sesionesFiltradas.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FaDownload className="mr-2 text-blue-600" />
                    Exportar Informe
                  </h3>
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={exportarPDF}
                      disabled={exportLoading.pdf}
                      className={`px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition inline-flex items-center ${exportLoading.pdf ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {exportLoading.pdf ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-blue-700 rounded-full"></div>
                          Generando...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={exportarExcel}
                      disabled={exportLoading.excel}
                      className={`px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition inline-flex items-center ${exportLoading.excel ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {exportLoading.excel ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-green-700 rounded-full"></div>
                          Generando...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Excel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Panel informativo */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm overflow-hidden border border-blue-100">
            <div className="p-5">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaInfoCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Sobre las Firmas Docentes</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Cuando un profesor pasa lista a una clase, automáticamente se registra su firma en el sistema.
                      Esta página le permite monitorear qué profesores han pasado lista (firmado) y cuáles aún no lo han hecho para la fecha seleccionada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}