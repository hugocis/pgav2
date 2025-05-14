'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaUserGraduate,
  FaChartPie,
  FaBook,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaFileAlt,
} from 'react-icons/fa';

// Interfaces para tipado
interface Matricula {
  id: string;
  fechaalta: string;
  fechaBaja: string | null;
  mostrar: boolean;
  alumno_id: string;
  asignaturaId: string;
  createdAt: string;
  updatedAt: string;
  asignatura: {
    id: string;
    CodAsignatura: string;
    Denominacion: string;
    Curso: string;
    Cuatrimestre: string;
    carreraId: string;
    cursoAcademicoId: string;
    profesorId: string;
    createdAt: string;
    updatedAt: string;
    carrera: {
      id: string;
      denominacion: string;
      escuelaId: string;
      createdAt: string;
      updatedAt: string;
    };
    cursoAcademico: {
      id: string;
      activo: boolean;
      denominacion: string;
      cursoAnterior: string | null;
      cursoSiguiente: string | null;
      createdAt: string;
      updatedAt: string;
    };
    user: {
      id: string;
      name: string;
      surname1: string;
      surname2: string;
      email: string;
    };
  };
  user?: {
    id: string;
    name: string;
    surname1: string;
    surname2: string;
    email: string;
  };
  totalSesiones?: number;
  asistencias?: number;
  faltas?: number;
  porcentajeAsistencia?: number;
}

interface AsistenciaAlumno {
  id: string;
  fecha: string;
  estado: string;
  sesionClaseId: string;
  alumnoId: string;
  estadoAsistenciaId: string;
  createdAt: string;
  updatedAt: string;
  sesionClase: {
    id: string;
    fecha: string;
    grupo: {
      id: string;
      denominacion: string;
      asignaturaId: string;
    };
  };
  estadoAsistencia: {
    id: string;
    denominacion: string;
  };
  SolicitudJustificacion: any[];
}

interface ConfiguracionCarrera {
  id: string;
  FechaInicioDispensa: string | null;
  FechaFinDispensa: string | null;
  SolDispensa: boolean;
  SolJustificacion: boolean;
  carreraId: string;
  carrera: {
    id: string;
    denominacion: string;
  };
}

export default function AlumnoDashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCursoId, setCurrentCursoId] = useState<string | null>(null);
  const [cursosAcademicos, setCursosAcademicos] = useState<{ id: string, denominacion: string, activo: boolean }[]>([]);
  const [faltasJustificables, setFaltasJustificables] = useState<AsistenciaAlumno[]>([]);
  const [configuracionesCarrera, setConfiguracionesCarrera] = useState<ConfiguracionCarrera[]>([]);
  useEffect(() => {
    const fetchMatriculas = async () => {
      try {
        setIsLoading(true);
        // Primero, obtener el curso académico actual
        const cursosResponse = await fetch('/api/cursos-academicos?activo=true', {
          credentials: 'include'
        });

        if (!cursosResponse.ok) {
          throw new Error('Error al obtener el curso académico activo');
        }

        const cursosData = await cursosResponse.json();
        setCursosAcademicos(cursosData);

        const cursoActivo = cursosData.find((curso: any) => curso.activo);
        const cursoActivoId = cursoActivo ? cursoActivo.id : (cursosData.length > 0 ? cursosData[0].id : null);
        setCurrentCursoId(cursoActivoId);

        // Obtener las matrículas del alumno usando su ID
        if (session?.user?.id) {
          // Llamada a la API de matrículas usando el ID del alumno
          const url = `/api/matriculas?alumno_id=${session.user.id}&porAlumno=true`;

          const response = await fetch(url, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (!response.ok) {
            throw new Error(`Error al obtener las matrículas: ${response.status}`);
          }

          const data = await response.json();

          // Obtener todos los grupos del alumno en una sola llamada
          const alumnoGruposResponse = await fetch(`/api/alumnos-grupo?alumnoId=${session.user.id}`, {
            credentials: 'include'
          });

          if (!alumnoGruposResponse.ok) {
            throw new Error('Error al obtener grupos del alumno');
          }

          const alumnoGrupos = await alumnoGruposResponse.json();
          // Crear un conjunto de IDs de grupos a los que pertenece el alumno para búsqueda rápida
          const gruposDelAlumno = new Set(alumnoGrupos.map((ag: any) => ag.grupoId));

          // Procesamos los datos recibidos
          if (Array.isArray(data)) {
            // Obtenemos estadísticas para cada matrícula
            const matriculasEnriquecidas = await Promise.all(data.map(async (matricula: Matricula) => {
              try {
                // Obtener los grupos de la asignatura
                const gruposResponse = await fetch(`/api/grupos?asignaturaId=${matricula.asignatura.id}`, {
                  credentials: 'include'
                });

                if (!gruposResponse.ok) {
                  throw new Error(`Error al obtener grupos para asignatura ${matricula.asignatura.id}`);
                }

                const gruposData = await gruposResponse.json();

                let totalSesiones = 0;
                let asistencias = 0;
                let faltas = 0;

                // Filtrar solo grupos a los que pertenece el alumno
                const gruposDelAlumnoEnAsignatura = gruposData.grupos.filter(
                  (grupo: any) => gruposDelAlumno.has(grupo.id)
                );

                // Procesar solo los grupos a los que pertenece el alumno
                await Promise.all(gruposDelAlumnoEnAsignatura.map(async (grupo: any) => {
                  // Obtener sesiones de este grupo
                  const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
                    credentials: 'include'
                  });

                  if (sesionesResponse.ok) {
                    const sesiones = await sesionesResponse.json();
                    totalSesiones += sesiones.length;

                    // Obtener asistencias del alumno en estas sesiones
                    await Promise.all(sesiones.map(async (sesion: any) => {
                      const asistenciaResponse = await fetch(
                        `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}`,
                        { credentials: 'include' }
                      );

                      if (asistenciaResponse.ok) {
                        const asistenciasData = await asistenciaResponse.json();

                        if (Array.isArray(asistenciasData) && asistenciasData.length > 0) {
                          const asistencia = asistenciasData[0];
                          const estado = asistencia.estado || (asistencia.estadoAsistencia && asistencia.estadoAsistencia.denominacion);
                          
                          switch(estado) {
                            case 'Asiste':
                              asistencias++;
                              break;
                            case '50%':
                              // Para 50% de asistencia, contamos como 0.5
                              asistencias += 0.5;
                              faltas += 0.5;
                              break;
                            case 'Erasmus T':
                            case 'Erasmus NT':
                              // No se cuentan como falta ni asistencia
                              // Reducimos el total de sesiones para este caso
                              totalSesiones--;
                              break;
                            case 'Dispensado':
                              // No se cuenta como falta
                              // Reducimos el total de sesiones para este caso
                              totalSesiones--;
                              break;
                            case 'No Asiste':
                            default:
                              faltas++;
                              // Comprobar si esta falta se puede justificar y agregarla a la lista (evitando duplicados)
                              if (!asistencia.SolicitudJustificacion || asistencia.SolicitudJustificacion.length === 0) {
                                setFaltasJustificables(prevFaltas => {
                                  // Solo agregar la falta si no existe ya en la lista
                                  const exists = prevFaltas.some(f => f.id === asistencia.id);
                                  if (!exists) {
                                    return [...prevFaltas, asistencia];
                                  }
                                  return prevFaltas;
                                });
                              }
                              break;
                          }
                        } else {
                          // Si no hay registro, se considera falta
                          faltas++;
                        }
                      }
                    }));
                  }
                }));

                // Calcular porcentaje de asistencia
                const porcentajeAsistencia = totalSesiones > 0
                  ? Math.round((asistencias / totalSesiones) * 100)
                  : 0;

                return {
                  ...matricula,
                  totalSesiones,
                  asistencias,
                  faltas,
                  porcentajeAsistencia
                };
              } catch (error) {
                console.error(`Error al obtener estadísticas para matrícula ${matricula.id}:`, error);
                return matricula;
              }
            }));

            setMatriculas(matriculasEnriquecidas.filter((m: Matricula) => !m.fechaBaja));
          } else {
            setMatriculas([]);
          }

          // Obtener configuraciones de carrera para dispensas
          const configResponse = await fetch('/api/configuracion-carrera', {
            credentials: 'include'
          });

          if (configResponse.ok) {
            const configData = await configResponse.json();
            setConfiguracionesCarrera(configData);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchMatriculas();
    }
  }, [session]);

  const fullName = session?.user ?
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() :
    'Alumno';

  // Determinar si las dispensas están disponibles para una matrícula
  const isDispensaDisponible = (matricula: Matricula, configuracionesCarrera: ConfiguracionCarrera[]) => {
    if (!configuracionesCarrera.length) return false;

    const configCarrera = configuracionesCarrera.find(
      c => c.carreraId === matricula.asignatura.carreraId
    );

    if (!configCarrera) return false;

    // Verificar si las dispensas están activadas y si estamos en el período permitido
    if (!configCarrera.SolDispensa) return false;

    if (configCarrera.FechaInicioDispensa && configCarrera.FechaFinDispensa) {
      const ahora = new Date();
      const inicio = new Date(configCarrera.FechaInicioDispensa);
      const fin = new Date(configCarrera.FechaFinDispensa);

      return ahora >= inicio && ahora <= fin;
    }

    return configCarrera.SolDispensa;
  };

  return (
    <DashboardContainer roleName="Alumno">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de bienvenida */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaUserGraduate className="mr-3" />
                    Bienvenido, {fullName}
                  </h1>
                  <p className="text-blue-100 text-sm">Portal del Estudiante - Universidad Francisco de Vitoria</p>
                </div>
                <div className="bg-white/10 rounded-full p-3">
                  <FaUserGraduate className="h-8 w-8 text-white" />
                </div>
              </div>

              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-gray-600">
                  Gestiona tus asignaturas, revisa tu asistencia y solicita justificaciones o dispensas.
                </p>
                {cursosAcademicos.length > 0 && (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Curso académico:</span>
                    <span className="px-3 py-1 rounded bg-blue-50 text-blue-700 text-sm font-medium">
                      {cursosAcademicos.find(curso => curso.id === currentCursoId)?.denominacion || ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Mini resumen */}
              {matriculas.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center bg-white px-4 py-2 rounded-md shadow-sm">
                    <FaBook className="mr-2 text-blue-600" />
                    <div>
                      <span className="text-sm text-gray-500">Total Asignaturas:</span>
                      <span className="ml-2 font-medium">{matriculas.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center bg-white px-4 py-2 rounded-md shadow-sm">
                    <FaChartPie className="mr-2 text-blue-600" />                    <div>
                      <span className="text-sm text-gray-500">Asistencia Promedio:</span>
                      {typeof getPromedioPorcentaje(matriculas) === 'number' ? (
                        <span className={`ml-2 font-medium ${typeof getPromedioPorcentaje(matriculas) === 'number'
                            ? getPromedioPorcentaje(matriculas) >= "80"
                              ? 'text-green-600'
                              : getPromedioPorcentaje(matriculas) >= "50"
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            : 'text-gray-500'
                          }`}>{getPromedioPorcentaje(matriculas)}%</span>
                      ) : (
                        <span className="ml-2 font-medium text-gray-500">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando tus asignaturas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600 flex flex-col items-center">
                <FaInfoCircle className="text-3xl mb-2" />
                <p>{error}</p>
              </div>
            </div>
          ) : matriculas.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center p-6 flex flex-col items-center">
                <FaBook className="text-5xl text-blue-200 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">No tienes asignaturas matriculadas</h2>
                <p className="text-gray-500 mt-2">
                  No tienes matrículas activas para el curso académico {cursosAcademicos.find(curso => curso.id === currentCursoId)?.denominacion || 'actual'}.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Vista principal: mostrar todas las asignaturas */}              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {matriculas.map((matricula) => (
                  <div
                    key={matricula.id}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-100"
                  >
                    {/* Cabecera de la tarjeta */}
                    <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-5 py-4 text-white">
                      <h3 className="font-semibold text-xl truncate">
                        {matricula.asignatura.Denominacion}
                      </h3>
                      <p className="text-blue-100 text-xs mt-1 truncate">
                        {matricula.asignatura.carrera.denominacion}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-blue-100 text-sm">
                          {matricula.asignatura.Curso}
                          {matricula.asignatura.Curso && matricula.asignatura.Curso.includes('º') ? ' Curso' : ''}
                          {matricula.asignatura.Cuatrimestre ?
                            ` • ${matricula.asignatura.Cuatrimestre}${matricula.asignatura.Cuatrimestre.includes('º') ? ' Cuatrimestre' : ''}`
                            : ''}
                        </p>
                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded">
                          {matricula.asignatura.CodAsignatura}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Panel de estadísticas */}
                      <div className="flex mb-4 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 divide-x divide-gray-200">
                        <div className="flex-1 p-3 text-center">
                          <div className="text-lg font-semibold text-gray-800">
                            {matricula.totalSesiones !== undefined ? matricula.totalSesiones : "0"}
                          </div>
                          <div className="text-xs text-gray-500">Sesiones</div>
                        </div>
                        <div className="flex-1 p-3 text-center">
                          <div className="text-lg font-semibold text-gray-800">
                            {matricula.asistencias !== undefined ? matricula.asistencias : "0"}
                          </div>
                          <div className="text-xs text-gray-500">Asistencias</div>
                        </div>                        <div className="flex-1 p-3 text-center">
                          <div className="flex flex-col items-center">
                            <div className={`text-lg font-semibold ${matricula.totalSesiones !== undefined && matricula.totalSesiones > 0
                                ? matricula.porcentajeAsistencia !== undefined && matricula.porcentajeAsistencia >= 80
                                  ? 'text-green-700'
                                  : matricula.porcentajeAsistencia !== undefined && matricula.porcentajeAsistencia >= 50
                                    ? 'text-yellow-700'
                                    : 'text-red-700'
                                : 'text-gray-500'
                              }`}>
                              {matricula.totalSesiones !== undefined && matricula.totalSesiones > 0
                                ? `${matricula.porcentajeAsistencia}%`
                                : "N/A"}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className={`h-1.5 rounded-full ${matricula.totalSesiones !== undefined && matricula.totalSesiones > 0
                                    ? matricula.porcentajeAsistencia !== undefined && matricula.porcentajeAsistencia >= 80
                                      ? 'bg-green-500'
                                      : matricula.porcentajeAsistencia !== undefined && matricula.porcentajeAsistencia >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    : 'bg-gray-300'
                                  }`}
                                style={{ width: `${matricula.totalSesiones !== undefined && matricula.totalSesiones > 0 ? matricula.porcentajeAsistencia : 0}%` }}>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Asistencia</div>
                        </div>
                      </div>

                      <div className="mt-5 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                        <p className="flex items-center">
                          <FaUserGraduate className="mr-2 text-blue-600" />
                          Profesor: {matricula.asignatura.user ?
                            `${matricula.asignatura.user.name || ''} ${matricula.asignatura.user.surname1 || ''}`
                            : 'No asignado'}
                        </p>
                      </div>

                      {/* Enlace a la página de detalles */}
                      <Link
                        href={`/alumno/asistencia-detallada?matriculaId=${matricula.id}`}
                        className="w-full mt-4 bg-[#0D3C68] hover:bg-[#072747] text-white text-sm font-medium py-3 px-4 rounded-md flex items-center justify-center transition-colors"
                      >
                        <FaChartPie className="mr-2" />
                        Ver asistencia detallada
                      </Link>
                    </div>
                  </div>
                ))}              </div>

              {/* Divisor decorativo entre secciones */}
              <div className="relative py-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gray-50 px-4 text-sm text-gray-500 font-medium rounded-full shadow-sm border border-gray-200">
                    Justificaciones y Dispensas
                  </span>
                </div>
              </div>

              {/* Sección de faltas pendientes de justificar */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-4 border-b border-blue-700">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <FaExclamationTriangle className="mr-2 text-blue-200" />
                    Faltas pendientes de justificar
                  </h3>
                </div>
                <div className="p-6">
                  {faltasJustificables.length > 0 ? (
                    <div className="space-y-4">
                      {faltasJustificables.map(falta => {
                        // Encontrar la matrícula correspondiente a esta falta
                        const matriculaFalta = matriculas.find(m =>
                          m.asignatura.id === falta.sesionClase.grupo.asignaturaId
                        );

                        if (!matriculaFalta) return null;

                        return (
                          <div key={falta.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-blue-50 rounded-md border border-blue-100">
                            <div className="mb-3 md:mb-0">
                              <p className="text-gray-800 font-medium flex flex-wrap items-center">
                                <span className="mr-2">{new Date(falta.sesionClase.fecha).toLocaleDateString()}</span>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                  {matriculaFalta.asignatura.Denominacion}
                                </span>
                              </p>
                              <p className="text-gray-600 text-sm mt-1">
                                Grupo: {falta.sesionClase.grupo.denominacion}
                              </p>
                              <p className="text-gray-600 text-sm">
                                Profesor: {matriculaFalta.asignatura.user ?
                                  `${matriculaFalta.asignatura.user.name || ''} ${matriculaFalta.asignatura.user.surname1 || ''}`
                                  : 'No asignado'}
                              </p>
                            </div>
                            <Link
                              href={`/alumno/justificar?asistenciaId=${falta.id}`}
                              className="bg-[#0D3C68] hover:bg-[#072747] text-white font-medium px-4 py-2 rounded transition-colors"
                            >
                              Justificar falta
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="bg-blue-50 inline-block p-4 rounded-full">
                        <FaCalendarCheck className="text-3xl text-[#0D3C68]" />
                      </div>
                      <p className="mt-3 text-gray-600 font-medium">No tienes faltas pendientes de justificar</p>
                      <p className="text-gray-500 text-sm mt-1">Todas tus asistencias están en orden o ya han sido justificadas</p>
                    </div>
                  )}
                </div>              </div>

              {/* División visual entre las secciones de faltas y dispensas */}
              <div className="flex items-center mb-6 mt-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Sección de solicitudes de dispensas */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FaFileAlt className="mr-2 text-blue-600" />
                    Solicitudes de dispensa académica
                  </h3>
                </div>
                <div className="p-6">
                  {configuracionesCarrera.length > 0 ? (
                    <div>
                      <p className="mb-4 text-gray-600">
                        Las dispensas académicas te permiten justificar períodos prolongados de ausencia por motivos específicos (médicos, deportivos, etc.).
                      </p>

                      <div className="space-y-4">
                        {matriculas.some(m => isDispensaDisponible(m, configuracionesCarrera)) ? (
                          <>
                            <h4 className="font-medium text-gray-700">Asignaturas con dispensas disponibles:</h4>

                            <div className="grid gap-4 md:grid-cols-2">
                              {matriculas.filter(m => isDispensaDisponible(m, configuracionesCarrera)).map(m => (
                                <div key={m.id} className="p-4 bg-gray-50 rounded-md border border-gray-200">
                                  <p className="font-medium text-gray-800">{m.asignatura.Denominacion}</p>
                                  <p className="text-sm text-gray-600 mt-1 mb-3">
                                    {m.asignatura.carrera.denominacion} • {m.asignatura.Curso} Curso
                                  </p>
                                  <Link
                                    href={`/alumno/solicitar-dispensa?matriculaId=${m.id}`}
                                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded transition-colors"
                                  >
                                    Solicitar dispensa
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-8">
                            <div className="bg-gray-100 inline-block p-4 rounded-full">
                              <FaFileAlt className="text-3xl text-gray-400" />
                            </div>
                            <p className="mt-3 text-gray-600 font-medium">
                              No hay dispensas disponibles actualmente
                            </p>
                            <p className="text-gray-500 text-sm mt-1">
                              En este momento no hay dispensas disponibles para ninguna de tus asignaturas
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="bg-gray-100 inline-block p-4 rounded-full">
                        <FaInfoCircle className="text-3xl text-gray-400" />
                      </div>
                      <p className="mt-3 text-gray-600 font-medium">
                        Información no disponible
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        La información sobre dispensas académicas no está disponible en este momento
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}

// Función para calcular el promedio de porcentaje de asistencia
function getPromedioPorcentaje(matriculas: Matricula[]): number | string {
  if (matriculas.length === 0) return "N/A";

  // Filtrar las asignaturas que tienen sesiones
  const matriculasConSesiones = matriculas.filter(m => m.totalSesiones && m.totalSesiones > 0);

  if (matriculasConSesiones.length === 0) return "N/A";

  const total = matriculasConSesiones.reduce((sum, m) => sum + (m.porcentajeAsistencia || 0), 0);
  return Math.round(total / matriculasConSesiones.length);
}
