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
  const [estadosAsistencia, setEstadosAsistencia] = useState<Map<string, string>>(new Map());
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'ascending' | 'descending' }>({
    key: 'nombreCompleto',
    direction: 'ascending'
  });

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
        'Email': alumno.email,
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
  };

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTerm
    ? alumnos.filter(alumno => 
        alumno.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alumno.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : alumnos;

  // Función para obtener el color de fondo según el porcentaje de asistencia
  const getColorClase = (porcentaje: number) => {
    if (porcentaje >= 85) return 'bg-green-100 text-green-800';
    if (porcentaje >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/profesor/dashboard" className="mr-3 text-white hover:text-blue-200 transition">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaUserGraduate className="mr-3" />
                      Gestión de Alumnos
                    </h1>
                  </div>
                  {asignatura && (
                    <p className="text-blue-100 mt-1">
                      {asignatura.Denominacion} - {asignatura.carrera?.denominacion || ''}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={exportarExcel}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm rounded-md px-3 py-2 flex items-center transition-colors"
                    disabled={isLoading || alumnos.length === 0}
                  >
                    <FaFileExcel className="mr-1" />
                    <span className="hidden sm:inline">Exportar</span>
                  </button>
                  
                  <button 
                    onClick={() => cargarDatosAlumnos(grupos)}
                    className="bg-white/10 hover:bg-white/20 text-white text-sm rounded-md px-3 py-2 flex items-center transition-colors"
                    disabled={isLoading}
                  >
                    <FaSync className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Actualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Buscador */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="form-input block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando datos de alumnos...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
                <button 
                  onClick={() => router.push('/profesor/dashboard')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Volver al Dashboard
                </button>
              </div>
            </div>
          ) : alumnosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              {searchTerm ? (
                <p className="text-gray-600">No se encontraron alumnos que coincidan con la búsqueda.</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">No hay alumnos asignados a los grupos de esta asignatura.</p>
                  <Link 
                    href={`/profesor/grupos?asignatura=${asignaturaId}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Gestionar Grupos
                  </Link>
                </div>
              )}
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
                        onClick={() => handleSort('nombreCompleto')}
                      >
                        <div className="flex items-center">
                          Alumno
                          {sortConfig.key === 'nombreCompleto' && (
                            <FaChevronDown className={`ml-1 h-4 w-4 ${sortConfig.direction === 'descending' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                      
                      {/* Columnas para cada grupo */}
                      {grupos.map(grupo => (
                        <th
                          key={grupo.id}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {grupo.denominacion}
                        </th>
                      ))}
                      
                      {/* Columna de asistencia total */}
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('porcentajeTotal')}
                      >
                        <div className="flex items-center">
                          % Total
                          {sortConfig.key === 'porcentajeTotal' && (
                            <FaChevronDown className={`ml-1 h-4 w-4 ${sortConfig.direction === 'descending' ? 'transform rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                      
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Sesiones
                      </th>
                      
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alumnosFiltrados.map((alumno) => (
                      <tr key={alumno.alumnoId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <div className="ml-0">
                              <div className="text-sm font-medium text-gray-900">{alumno.nombreCompleto}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{alumno.email}</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Porcentaje para cada grupo */}
                        {grupos.map(grupo => {
                          const estadisticasGrupo = alumno.gruposEstadisticas[grupo.id];
                          
                          if (!estadisticasGrupo) {
                            return (
                              <td key={grupo.id} className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                  No asignado
                                </span>
                              </td>
                            );
                          }
                          
                          return (
                            <td key={grupo.id} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <span 
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getColorClase(estadisticasGrupo.porcentaje)}`}
                                  >
                                    {estadisticasGrupo.porcentaje}%
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {estadisticasGrupo.asistencias}/{estadisticasGrupo.sesiones} sesiones
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        
                        {/* Porcentaje total */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getColorClase(alumno.porcentajeTotal)}`}
                          >
                            {alumno.porcentajeTotal}%
                          </span>
                        </td>
                        
                        {/* Total de sesiones */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {alumno.totalSesiones}
                        </td>
                        
                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/profesor/estadisticas?asignatura=${asignaturaId}&alumno=${alumno.alumnoId}`}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-end"
                          >
                            <FaChartPie className="mr-1" /> Detalle
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}