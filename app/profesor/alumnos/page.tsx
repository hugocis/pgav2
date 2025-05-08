'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { 
  FaUserGraduate, 
  FaSearch, 
  FaArrowLeft, 
  FaSync, 
  FaChevronDown,
  FaFileExcel, 
  FaDownload,
  FaFilter,
  FaChartPie
} from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import * as XLSX from 'xlsx';

// Interfaces para el tipado
interface Asignatura {
  id: string;
  CodAsignatura: string;
  Denominacion: string;
  Curso: string;
  Cuatrimestre: string;
  carreraId: string;
  profesorId: string;
  cursoAcademicoId: string;
  carrera?: {
    id: string;
    denominacion: string;
  };
  cursoAcademico?: {
    id: string;
    denominacion: string;
    activo: boolean;
  };
}

interface Grupo {
  id: string;
  denominacion: string;
  asignaturaId: string;
  profesorId: string;
  asignatura?: Asignatura;
}

interface Alumno {
  id: string;
  username?: string;
  name?: string;
  surname1?: string;
  surname2?: string;
  email?: string;
}

interface AsistenciaAlumno {
  id: string;
  fecha: string;
  estado: string;
  sesionClaseId: string;
  alumnoId: string;
  estadoAsistenciaId: string;
  estadoAsistencia?: {
    id: string;
    denominacion: string;
  };
  sesionClase?: {
    id: string;
    fecha: string;
    grupoId: string;
  };
}

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  docenteId: string;
  grupo?: Grupo;
}

interface AlumnoGrupo {
  id: string;
  alumno_Id: string;
  grupoId: string;
  user?: Alumno;
  grupo?: Grupo;
}

interface AlumnoEstadisticas {
  alumnoId: string;
  nombreCompleto: string;
  email: string;
  gruposEstadisticas: {
    [grupoId: string]: {
      grupoId: string;
      grupoNombre: string;
      sesiones: number;
      asistencias: number;
      porcentaje: number;
    }
  };
  totalSesiones: number;
  totalAsistencias: number;
  porcentajeTotal: number;
}

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function ProfesorAlumnos() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const asignaturaId = searchParams.get('asignatura');

  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoEstadisticas[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadosAsistencia, setEstadosAsistencia] = useState<Map<string, string>>(new Map());  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'ascending' | 'descending' }>({
    key: 'nombreCompleto',
    direction: 'ascending'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (!asignaturaId || !session?.user) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener los detalles de la asignatura
        const asignaturaResponse = await fetch(`/api/asignaturas/${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!asignaturaResponse.ok) {
          throw new Error('No se pudo cargar la información de la asignatura');
        }
        
        const asignaturaData = await asignaturaResponse.json();
        setAsignatura(asignaturaData);
        
        // Verificar si el profesor tiene acceso a esta asignatura
        if (asignaturaData.profesorId !== session.user.id) {
          const docenciaResponse = await fetch(`/api/docencia?asignaturaId=${asignaturaId}&profesorId=${session.user.id}`, {
            credentials: 'include'
          });
          
          if (!docenciaResponse.ok || (await docenciaResponse.json()).length === 0) {
            setError('No tienes permisos para ver esta asignatura');
            setIsLoading(false);
            return;
          }
        }
        
        // Cargar grupos de la asignatura
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${asignaturaId}`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error('No se pudieron cargar los grupos');
        }
        
        const gruposData = await gruposResponse.json();
        // Filtrar solo los grupos donde el profesor es el dueño
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => 
          grupo.profesorId === session.user.id
        );
        
        setGrupos(gruposFiltrados);
        
        // Cargar los estados de asistencia disponibles
        const estadosAsistenciaResponse = await fetch('/api/estados-asistencia', {
          credentials: 'include'
        });
        
        if (estadosAsistenciaResponse.ok) {
          const estadosData = await estadosAsistenciaResponse.json();
          const mapaEstados = new Map();
          
          estadosData.forEach((estado: any) => {
            mapaEstados.set(estado.id, estado.denominacion);
          });
          
          setEstadosAsistencia(mapaEstados);
        }

        // Ahora debemos cargar todos los alumnos para cada grupo y sus asistencias
        await cargarDatosAlumnos(gruposFiltrados);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [asignaturaId, session?.user]);

  // Función para cargar datos de alumnos y estadísticas de asistencia
  const cargarDatosAlumnos = async (grupos: Grupo[]) => {
    try {
      // Primero, cargar todos los alumnos-grupo
      const todosAlumnosGrupo: AlumnoGrupo[] = [];
      
      for (const grupo of grupos) {
        const alumnosGrupoResponse = await fetch(`/api/alumnos-grupo?grupoId=${grupo.id}`, {
          credentials: 'include'
        });
        
        if (!alumnosGrupoResponse.ok) {
          console.error(`Error al cargar alumnos del grupo ${grupo.denominacion}`);
          continue;
        }
        
        const alumnosGrupo = await alumnosGrupoResponse.json();
        todosAlumnosGrupo.push(...alumnosGrupo);
      }
      
      // Crear un map para almacenar a qué grupos pertenece cada alumno
      const alumnosMap = new Map<string, Set<string>>();
      
      todosAlumnosGrupo.forEach((alumnoGrupo: AlumnoGrupo) => {
        if (!alumnoGrupo.alumno_Id || !alumnoGrupo.user) return;
        
        if (!alumnosMap.has(alumnoGrupo.alumno_Id)) {
          alumnosMap.set(alumnoGrupo.alumno_Id, new Set());
        }
        
        alumnosMap.get(alumnoGrupo.alumno_Id)?.add(alumnoGrupo.grupoId);
      });
      
      // Para cada grupo, obtener sesiones y asistencias
      const sesionesMap = new Map<string, SesionClase[]>();
      const asistenciasMap = new Map<string, AsistenciaAlumno[]>();
      
      for (const grupo of grupos) {
        // Obtener sesiones del grupo
        const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
          credentials: 'include'
        });
        
        if (!sesionesResponse.ok) {
          console.error(`Error al cargar sesiones del grupo ${grupo.denominacion}`);
          continue;
        }
        
        const sesionesGrupo = await sesionesResponse.json();
        sesionesMap.set(grupo.id, sesionesGrupo);
        
        // Para cada sesión, obtener asistencias
        for (const sesion of sesionesGrupo) {
          const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
            credentials: 'include'
          });
          
          if (!asistenciasResponse.ok) {
            console.error(`Error al cargar asistencias para la sesión ${sesion.id}`);
            continue;
          }
          
          const asistencias = await asistenciasResponse.json();
          
          if (!asistenciasMap.has(sesion.grupoId)) {
            asistenciasMap.set(sesion.grupoId, []);
          }
          
          asistenciasMap.get(sesion.grupoId)?.push(...asistencias);
        }
      }
      
      // Calcular estadísticas para cada alumno
      const alumnosEstadisticas: AlumnoEstadisticas[] = [];
      
      alumnosMap.forEach((gruposIds, alumnoId) => {
        // Encontrar el objeto de alumno
        const alumnoInfo = todosAlumnosGrupo.find(ag => ag.alumno_Id === alumnoId)?.user;
        
        if (!alumnoInfo) return;
        
        // Preparar objeto para estadísticas del alumno
        const estadisticas: AlumnoEstadisticas = {
          alumnoId: alumnoId,
          nombreCompleto: `${alumnoInfo.surname1 || ''} ${alumnoInfo.surname2 || ''} ${alumnoInfo.name || ''}`.trim(),
          email: alumnoInfo.email || '',
          gruposEstadisticas: {},
          totalSesiones: 0,
          totalAsistencias: 0,
          porcentajeTotal: 0
        };
        
        // Calcular estadísticas para cada grupo al que pertenece el alumno
        gruposIds.forEach(grupoId => {
          const grupo = grupos.find(g => g.id === grupoId);
          if (!grupo) return;
          
          const sesiones = sesionesMap.get(grupoId) || [];
          const asistencias = asistenciasMap.get(grupoId) || [];
          
          // Filtrar asistencias solo para este alumno en este grupo
          const asistenciasAlumno = asistencias.filter(a => a.alumnoId === alumnoId);
          
          // Contar asistencias positivas ("Asiste")
          const asistenciasPositivas = asistenciasAlumno.filter(a => 
            a.estado === 'Asiste' || 
            (a.estadoAsistencia && a.estadoAsistencia.denominacion === 'Asiste')
          ).length;
          
          const numSesiones = sesiones.length;
          const porcentaje = numSesiones > 0 ? Math.round((asistenciasPositivas / numSesiones) * 100) : 0;
          
          estadisticas.gruposEstadisticas[grupoId] = {
            grupoId,
            grupoNombre: grupo.denominacion,
            sesiones: numSesiones,
            asistencias: asistenciasPositivas,
            porcentaje
          };
          
          estadisticas.totalSesiones += numSesiones;
          estadisticas.totalAsistencias += asistenciasPositivas;
        });
        
        // Calcular porcentaje total
        estadisticas.porcentajeTotal = estadisticas.totalSesiones > 0 
          ? Math.round((estadisticas.totalAsistencias / estadisticas.totalSesiones) * 100) 
          : 0;
        
        alumnosEstadisticas.push(estadisticas);
      });
      
      // Ordenar por apellido y nombre
      alumnosEstadisticas.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      
      setAlumnos(alumnosEstadisticas);
    } catch (error) {
      console.error('Error al cargar datos de alumnos:', error);
      throw error;
    }
  };

  // Función para ordenar los alumnos
  const handleSort = (key: string) => {
    const newDirection = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    
    setSortConfig({ key, direction: newDirection });
    
    const sortedAlumnos = [...alumnos];
    
    if (key === 'nombreCompleto') {
      sortedAlumnos.sort((a, b) => {
        return newDirection === 'ascending' 
          ? a.nombreCompleto.localeCompare(b.nombreCompleto)
          : b.nombreCompleto.localeCompare(a.nombreCompleto);
      });
    } else if (key === 'porcentajeTotal') {
      sortedAlumnos.sort((a, b) => {
        return newDirection === 'ascending' 
          ? a.porcentajeTotal - b.porcentajeTotal
          : b.porcentajeTotal - a.porcentajeTotal;
      });
    }
    
    setAlumnos(sortedAlumnos);
  };
  // Función para exportar a Excel
  const exportarExcel = () => {
    const dataExport = alumnos.map(alumno => {
      const data: any = {
        'Alumno': alumno.nombreCompleto,
      };
      
      // Añadir cada grupo como columna
      Object.values(alumno.gruposEstadisticas).forEach(grupo => {
        data[`Grupo ${grupo.grupoNombre}`] = `${grupo.porcentaje}% (${grupo.asistencias}/${grupo.sesiones})`;
      });
      
      // Añadir totales
      data['Total sesiones'] = alumno.totalSesiones;
      data['Total asistencias'] = alumno.totalAsistencias;
      data['% Total'] = `${alumno.porcentajeTotal}%`;
      
      return data;
    });
    
    // Crear hoja de Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataExport);
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
    
    // Generar archivo
    const fileName = `Asistencias_${asignatura?.Denominacion || 'Asignatura'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTerm
    ? alumnos.filter(alumno => 
        alumno.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : alumnos;
  
  // Calcular la cantidad total de páginas
  const totalPages = Math.ceil(alumnosFiltrados.length / itemsPerPage);
  
  // Obtener los alumnos de la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlumnos = alumnosFiltrados.slice(indexOfFirstItem, indexOfLastItem);  // Función para obtener el color de fondo según el porcentaje de asistencia
  const getColorClase = (porcentaje: number) => {
    if (porcentaje >= 85) return 'bg-green-100 text-green-800';
    if (porcentaje >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  // Función para cambiar de página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  // Función para obtener el color de fondo y borde para los gráficos
  const getChartColors = (porcentaje: number) => {
    if (porcentaje >= 85) return { bg: 'rgba(34, 197, 94, 0.8)', border: 'rgba(22, 163, 74, 1)' };
    if (porcentaje >= 60) return { bg: 'rgba(234, 179, 8, 0.8)', border: 'rgba(202, 138, 4, 1)' };
    return { bg: 'rgba(239, 68, 68, 0.8)', border: 'rgba(220, 38, 38, 1)' };
  };// Componente para mostrar el gráfico de asistencia mejorado visualmente
  const AttendancePieChart = ({ 
    asistencias, 
    total, 
    porcentaje,
    size = 'md'
  }: { 
    asistencias: number, 
    total: number, 
    porcentaje: number,
    size?: 'sm' | 'md' | 'lg'
  }) => {
    const ausencias = total - asistencias;
    const { bg, border } = getChartColors(porcentaje);
    
    const chartSize = {
      sm: { width: 54, height: 54, fontSize: '0.75rem', strokeWidth: 3 },
      md: { width: 72, height: 72, fontSize: '0.875rem', strokeWidth: 4 },
      lg: { width: 96, height: 96, fontSize: '1rem', strokeWidth: 5 }
    };
    
    // Determinar el color basado en el porcentaje
    let fillColor, bgRingColor, textColor;
    if (porcentaje >= 85) {
      fillColor = 'rgb(34, 197, 94)'; // verde
      bgRingColor = 'rgba(34, 197, 94, 0.15)';
      textColor = 'text-green-600';
    } else if (porcentaje >= 60) {
      fillColor = 'rgb(234, 179, 8)'; // amarillo
      bgRingColor = 'rgba(234, 179, 8, 0.15)';
      textColor = 'text-yellow-600';
    } else {
      fillColor = 'rgb(239, 68, 68)'; // rojo
      bgRingColor = 'rgba(239, 68, 68, 0.15)';
      textColor = 'text-red-600';
    }    // Cálculos para el gráfico SVG
    const radius = chartSize[size].width / 2;
    const innerRadius = radius - chartSize[size].strokeWidth;
    const circumference = 2 * Math.PI * innerRadius;
    const progress = porcentaje / 100;
    const strokeDashoffset = circumference * (1 - progress);
    
    // Añadir animación de aparición
    const animationDuration = '1s';
    
    return (
      <div className="flex flex-col items-center">
        <div style={{ position: 'relative', width: chartSize[size].width, height: chartSize[size].height }}>
          <svg 
            width={chartSize[size].width} 
            height={chartSize[size].height} 
            viewBox={`0 0 ${chartSize[size].width} ${chartSize[size].height}`}
          >
            {/* Círculo exterior decorativo */}
            <circle 
              cx={radius} 
              cy={radius} 
              r={radius - 1} 
              fill="none" 
              stroke={`url(#gradientBg${size}${Math.floor(porcentaje)})`} 
              strokeWidth="1" 
              opacity="0.3"
            />
            
            {/* Definición de gradientes */}
            <defs>
              <linearGradient id={`gradientBg${size}${Math.floor(porcentaje)}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id={`gradient${size}${Math.floor(porcentaje)}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={fillColor} />
                <stop offset="100%" stopColor={fillColor} stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Círculo de fondo */}
            <circle 
              cx={radius} 
              cy={radius} 
              r={innerRadius} 
              fill="none" 
              stroke={bgRingColor} 
              strokeWidth={chartSize[size].strokeWidth} 
              style={{ transition: 'all 0.3s ease' }}
            />
            
            {/* Círculo de progreso */}
            <circle 
              cx={radius} 
              cy={radius} 
              r={innerRadius} 
              fill="none" 
              stroke={`url(#gradient${size}${Math.floor(porcentaje)})`} 
              strokeWidth={chartSize[size].strokeWidth} 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${radius} ${radius})`}
              style={{ 
                transition: 'stroke-dashoffset 0.8s ease-in-out',
                filter: 'drop-shadow(0px 0px 1px rgba(0,0,0,0.2))'
              }}
            >
              <animate 
                attributeName="stroke-dashoffset" 
                from={circumference} 
                to={strokeDashoffset} 
                dur={animationDuration} 
                fill="freeze" 
              />
            </circle>
            
            {/* Punto decorativo al final del arco (solo si no es 100% ni 0%) */}
            {porcentaje > 0 && porcentaje < 100 && (
              <circle 
                cx={radius + innerRadius * Math.sin(2 * Math.PI * progress - Math.PI/2)} 
                cy={radius + innerRadius * Math.cos(2 * Math.PI * progress - Math.PI/2)} 
                r={chartSize[size].strokeWidth / 2}
                fill="white"
                stroke={fillColor}
                strokeWidth="1"
              />
            )}
          </svg>
          
          {/* Texto central con valor numérico */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              fontSize: chartSize[size].fontSize,
            }} 
            className={`font-bold ${textColor}`}
          >
            {porcentaje}%
          </div>
        </div>
        <div className={`text-xs mt-1 ${textColor} font-medium`}>
          {asistencias}/{total}
        </div>
      </div>
    );
  };

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white shadow-md">
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('/pattern-grid.svg')] opacity-5 mix-blend-overlay"></div>
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <div className="flex items-center">
                    <Link href="/profesor/dashboard" className="mr-4 text-white hover:text-blue-200 transition bg-white/10 p-2 rounded-full">
                      <FaArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <div className="flex items-center justify-center bg-white/15 rounded-full p-2 mr-3">
                        <FaUserGraduate className="h-5 w-5" />
                      </div>
                      Gestión de Alumnos
                    </h1>
                  </div>
                  {asignatura && (
                    <p className="text-blue-100 mt-2 pl-12 flex items-center">
                      <span className="bg-blue-500/30 px-2 py-0.5 rounded-md text-xs font-medium mr-2">
                        {asignatura.Denominacion}
                      </span>
                      <span className="opacity-75">
                        {asignatura.carrera?.denominacion || ''}
                      </span>
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={exportarExcel}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm rounded-md px-4 py-2 flex items-center transition-colors shadow-sm border border-white/5"
                    disabled={isLoading || alumnos.length === 0}
                  >
                    <FaFileExcel className="mr-2" />
                    <span className="hidden sm:inline">Exportar a Excel</span>
                  </button>
                  
                  <button 
                    onClick={() => cargarDatosAlumnos(grupos)}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm rounded-md px-4 py-2 flex items-center transition-colors shadow-sm border border-white/5"
                    disabled={isLoading}
                  >
                    <FaSync className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Actualizar datos</span>
                  </button>
                </div>
              </div>
            </div>{/* Buscador y estadísticas */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">                <div className="flex-1 max-w-md">
                  <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                    <FaSearch className="h-3 w-3 mr-1.5 text-blue-600" /> 
                    Buscar alumno
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <div className="p-1 rounded-full bg-gray-100 group-focus-within:bg-blue-100 transition-colors duration-200">
                        <FaSearch className="h-3.5 w-3.5 text-gray-500 group-focus-within:text-blue-600 transition-colors duration-200" />
                      </div>
                    </div>
                    <input
                      id="search"
                      type="text"
                      className="form-input block w-full pl-12 pr-12 py-2.5 text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 group-hover:shadow-md"
                      placeholder="Buscar por nombre de alumno..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                    {searchTerm && (
                      <div className="absolute inset-y-0 right-0 flex py-1.5 pr-3">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                          }}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors duration-200"
                          title="Limpiar búsqueda"
                        >
                          <span className="sr-only">Limpiar búsqueda</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-blue-300 pointer-events-none transition-colors duration-200"></div>
                  </div>
                  {searchTerm && alumnosFiltrados.length > 0 && (
                    <div className="mt-1.5 text-xs text-blue-600 flex items-center font-medium animate-pulse">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {alumnosFiltrados.length} resultados para "{searchTerm}"
                    </div>
                  )}
                </div><div className="grid grid-cols-3 gap-4 md:gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg text-center shadow-sm border border-blue-200/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="flex items-center justify-center mb-2">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <FaUserGraduate className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 font-medium uppercase mb-1">Alumnos</p>
                    <p className="text-2xl font-bold text-gray-800 transition-all group-hover:scale-110">{alumnos.length}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg text-center shadow-sm border border-green-200/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="flex items-center justify-center mb-2">
                      <div className="bg-green-100 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 font-medium uppercase mb-1">Grupos</p>
                    <p className="text-2xl font-bold text-gray-800 transition-all group-hover:scale-110">{grupos.length}</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg text-center shadow-sm border border-amber-200/30 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                    <div className="flex items-center justify-center mb-2">
                      <div className="bg-amber-100 p-2 rounded-full">
                        <FaChartPie className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 font-medium uppercase mb-1">Asistencia Media</p>
                    <p className="text-2xl font-bold text-gray-800 transition-all group-hover:scale-110">
                      {alumnos.length > 0 
                        ? Math.round(alumnos.reduce((sum, alumno) => sum + alumno.porcentajeTotal, 0) / alumnos.length) 
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* Contenido principal */}          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute top-0 left-0 right-0 bottom-0 m-auto w-20 h-20 border-8 border-blue-100 rounded-full"></div>
                <div className="absolute top-0 left-0 right-0 bottom-0 m-auto w-20 h-20 border-t-8 border-blue-600 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 right-0 bottom-0 m-auto w-10 h-10 border-4 border-transparent border-t-4 border-t-blue-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
              </div>
              <div className="mt-6 relative">
                <p className="text-gray-700 text-lg font-medium">Cargando datos de alumnos...</p>
                <p className="text-gray-400 text-sm mt-2">Esto puede tomar un momento la primera vez</p>
                <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden w-48 mx-auto">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center border border-red-100">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-full p-6 w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Se produjo un error</h2>
              <div className="bg-red-50 py-3 px-4 rounded-lg border border-red-100 mb-6 inline-block">
                <p className="text-red-700">{error}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => router.push('/profesor/dashboard')}
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md hover:from-[#0b3459] hover:to-[#12487c] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-md transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Volver al Dashboard
                </button>
                <button
                  onClick={() => cargarDatosAlumnos(grupos)}
                  className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reintentar
                </button>
              </div>
            </div>
          ) : alumnosFiltrados.length === 0 ? (            <div className="bg-white rounded-lg shadow-sm p-10 text-center relative overflow-hidden">
              {/* Elementos decorativos de fondo */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-blue-50 rounded-full -mr-16 -mt-16 z-0"></div>
              <div className="absolute bottom-0 left-0 h-24 w-24 bg-blue-50 rounded-full -ml-12 -mb-12 z-0"></div>
              
              {searchTerm ? (
                <div className="relative z-10">
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-full p-6 w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-md border border-amber-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">No se encontraron resultados</h2>
                  <div className="flex flex-col items-center">
                    <p className="text-gray-600 mb-2">No se encontraron alumnos que coincidan con:</p>
                    <div className="bg-amber-50 py-2 px-4 rounded-full border border-amber-200 mb-6 inline-block">
                      <p className="text-amber-700 font-medium">"{searchTerm}"</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-md hover:from-amber-600 hover:to-amber-700 shadow-md transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-full p-6 w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-md border border-blue-200">
                    <FaUserGraduate className="h-10 w-10 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">No hay alumnos asignados</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    No hay alumnos asignados a los grupos de esta asignatura. 
                    Puede ir a la sección de grupos para gestionar la asignación de alumnos.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Link 
                      href={`/profesor/grupos?asignatura=${asignaturaId}`}
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md hover:from-[#0b3459] hover:to-[#12487c] shadow-md transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Gestionar Grupos
                    </Link>
                    <Link 
                      href="/profesor/dashboard"
                      className="inline-flex items-center px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Volver al Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (<div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0D3C68] via-[#1a5590] to-[#246baf] text-white shadow-lg">
                      <th 
                        scope="col" 
                        className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer border-b-2 border-blue-700/30 relative overflow-hidden group"
                        onClick={() => handleSort('nombreCompleto')}
                      >
                        {/* Efecto de hover */}
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        <div className="flex items-center relative z-10">
                          <div className="bg-white/20 p-1.5 rounded-full mr-2">
                            <FaUserGraduate className="h-3 w-3" />
                          </div>
                          <span>Alumno</span>
                          {sortConfig.key === 'nombreCompleto' && (
                            <FaChevronDown className={`ml-2 h-3.5 w-3.5 text-blue-200 ${sortConfig.direction === 'descending' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                        {/* Columnas para cada grupo */}
                      {grupos.map((grupo, index) => (
                        <th
                          key={grupo.id}
                          scope="col"
                          className={`px-6 py-4 text-center text-xs font-medium uppercase tracking-wider border-b-2 border-blue-700/30 relative group ${
                            index % 2 === 0 ? 'bg-blue-600/10' : 'bg-blue-600/20'
                          }`}
                        >
                          {/* Efecto de hover */}
                          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                          <div className="flex flex-col items-center relative z-10">
                            <span className="bg-white/20 text-white rounded-full w-7 h-7 flex items-center justify-center mb-1 shadow-inner">
                              {grupo.denominacion.substring(0, 1)}
                            </span>
                            <span>{grupo.denominacion}</span>
                          </div>
                        </th>
                      ))}
                        {/* Columna de asistencia total con gráfico */}
                      <th 
                        scope="col" 
                        className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer border-b-2 border-blue-700/30 relative group"
                        onClick={() => handleSort('porcentajeTotal')}
                      >
                        {/* Efecto de hover */}
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                        <div className="flex items-center justify-center relative z-10">
                          <div className="bg-white/20 p-1.5 rounded-full mr-2">
                            <FaChartPie className="h-3 w-3" />
                          </div>
                          <span>Asistencia Total</span>
                          {sortConfig.key === 'porcentajeTotal' && (
                            <FaChevronDown className={`ml-2 h-3.5 w-3.5 text-blue-200 ${sortConfig.direction === 'descending' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead><tbody className="bg-white divide-y divide-gray-200">
                    {currentAlumnos.map((alumno, index) => (
                      <tr key={alumno.alumnoId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/10'} hover:bg-blue-50/30 transition-colors duration-150`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                <span className="font-medium text-sm">{alumno.nombreCompleto.charAt(0).toUpperCase()}</span>
                              </div>
                            </div>
                            <div className="ml-3 flex flex-col justify-center">
                              <div className="text-sm font-medium text-gray-900">{alumno.nombreCompleto}</div>
                              <div className="text-xs text-blue-600">#{indexOfFirstItem + index + 1}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Porcentaje para cada grupo */}
                        {grupos.map(grupo => {
                          const estadisticasGrupo = alumno.gruposEstadisticas[grupo.id];                          if (!estadisticasGrupo) {
                            return (
                              <td key={grupo.id} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex justify-center">
                                  <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                                    No asignado
                                  </div>
                                </div>
                              </td>
                            );
                          }
                            return (                            <td key={grupo.id} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex justify-center">
                                <div className={`bg-white rounded-lg py-2 px-3 shadow-sm transition-all hover:shadow-md
                                  ${estadisticasGrupo.porcentaje >= 85 ? 'border border-green-100 hover:border-green-300' : 
                                    estadisticasGrupo.porcentaje >= 60 ? 'border border-yellow-100 hover:border-yellow-300' : 
                                    'border border-red-100 hover:border-red-300'}`}>
                                  <AttendancePieChart 
                                    asistencias={estadisticasGrupo.asistencias}
                                    total={estadisticasGrupo.sesiones}
                                    porcentaje={estadisticasGrupo.porcentaje}
                                    size="sm"
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                          {/* Porcentaje total con gráfico */}                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex justify-center">
                            <Link 
                              href={`/profesor/estadisticas?asignatura=${asignaturaId}&alumno=${alumno.alumnoId}`} 
                              className="hover:opacity-90 transition-all"
                              title="Ver detalle de asistencia"
                            >
                              <div className={`bg-gray-50 rounded-lg py-2 px-4 shadow-sm border transition-all hover:shadow-md 
                                ${alumno.porcentajeTotal >= 85 ? 'border-green-200 hover:border-green-300' : 
                                  alumno.porcentajeTotal >= 60 ? 'border-yellow-200 hover:border-yellow-300' : 
                                  'border-red-200 hover:border-red-300'}`}>
                                <AttendancePieChart 
                                  asistencias={alumno.totalAsistencias}
                                  total={alumno.totalSesiones}
                                  porcentaje={alumno.porcentajeTotal}
                                  size="md"
                                />
                              </div>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>              </div>
                {/* Pagination */}
              {alumnosFiltrados.length > itemsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-b from-white to-gray-50 rounded-b-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                      <p className="text-sm text-gray-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Mostrando <span className="font-bold mx-1 text-blue-700">{indexOfFirstItem + 1}</span> - 
                        <span className="font-bold mx-1 text-blue-700">
                          {Math.min(indexOfLastItem, alumnosFiltrados.length)}
                        </span> de <span className="font-bold mx-1 text-blue-700">{alumnosFiltrados.length}</span> alumnos
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <div className="flex items-center">
                        <label htmlFor="itemsPerPage" className="mr-2 text-sm text-gray-600 whitespace-nowrap">Mostrar:</label>
                        <select 
                          id="itemsPerPage"
                          className="form-select text-sm border-gray-300 rounded-md focus:border-blue-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 shadow-sm"
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          {[10, 25, 50, 100].map(size => (
                            <option key={size} value={size}>{size} por página</option>
                          ))}
                        </select>
                      </div>
                    
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`relative inline-flex items-center px-3 py-2 rounded-l-md border text-sm font-medium transition-colors ${
                            currentPage === 1 
                              ? 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed' 
                              : 'text-gray-700 border-gray-300 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          <span className="sr-only">Anterior</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Páginas numeradas con diseño mejorado */}
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                          // Si tenemos 5 páginas o menos, mostramos todas
                          let pageNumber = idx + 1;
                          
                          // Si tenemos más de 5 páginas, mostramos en relación a la página actual
                          if (totalPages > 5) {
                            if (currentPage <= 3) {
                              // Estamos al inicio: mostramos 1, 2, 3, 4, 5
                              pageNumber = idx + 1;
                            } else if (currentPage >= totalPages - 2) {
                              // Estamos al final: mostramos las últimas 5 páginas
                              pageNumber = totalPages - 4 + idx;
                            } else {
                              // Estamos en medio: mostramos currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2
                              pageNumber = currentPage - 2 + idx;
                            }
                          }
                          
                          return (
                            <button
                              key={pageNumber}
                              onClick={() => paginate(pageNumber)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 ${
                                pageNumber === currentPage
                                  ? 'z-10 bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                              }`}
                            >
                              {pageNumber}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`relative inline-flex items-center px-3 py-2 rounded-r-md border text-sm font-medium transition-colors ${
                            currentPage === totalPages 
                              ? 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed' 
                              : 'text-gray-700 border-gray-300 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                          }`}
                        >
                          <span className="sr-only">Siguiente</span>
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
  
        </div>
      </div>
    </DashboardContainer>
  );
}