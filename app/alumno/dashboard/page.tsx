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

interface SolicitudJustificacion {
  id: string;
  estadoJustificacion: {
    id: string;
    denominacion: string;
  };
  fechaAlegacion: string;
}

interface SolicitudDispensa {
  id: string;
  estadoDispensa: {
    id: string;
    denominacion: string;
  };
  fechaAlegacion: string;
  alegacion: string;
  matriculaId: string;
  matricula: {
    asignatura: {
      Denominacion: string;
      carrera: {
        denominacion: string;
      };
    };
  };
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
  SolicitudJustificacion: Array<SolicitudJustificacion>;
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

// New interfaces added
interface AlumnoGrupo {
  grupoId?: string;
  grupo_Id?: string;
}

interface CursoAcademico {
  id: string;
  denominacion: string;
  activo: boolean;
}

interface Grupo {
  id: string;
  denominacion: string;
  asignaturaId: string;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupo: {
    id: string;
    denominacion: string;
    asignaturaId: string;
  };
}

export default function AlumnoDashboard() {
  const { data: session } = useSession({
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
  const [solicitudesDispensa, setSolicitudesDispensa] = useState<SolicitudDispensa[]>([]);
    // Add a state for attendance filter
  const [filtroFaltas, setFiltroFaltas] = useState<'todas' | 'pendientes' | 'sinjustificar'>('todas');
  // Function to get filtered absences according to selected criteria
  const getFaltasFiltradas = () => {
    switch (filtroFaltas) {
      case 'pendientes':
        return faltasJustificables.filter(f => 
          f.SolicitudJustificacion?.some(s => 
            // Incluir las solicitudes pendientes
            s.estadoJustificacion?.denominacion === 'Pendiente'
          )
        );
      case 'sinjustificar':
        return faltasJustificables.filter(f => 
          // Sin solicitudes de justificación O
          // Todas las solicitudes están rechazadas/no justificadas (sin ninguna pendiente o justificada)
          !f.SolicitudJustificacion || 
          f.SolicitudJustificacion.length === 0 ||
          (f.SolicitudJustificacion.every(s => 
            s.estadoJustificacion?.denominacion === 'Rechazado' || 
            s.estadoJustificacion?.denominacion === 'No Justificado'
          ) && 
          !f.SolicitudJustificacion.some(s =>
            s.estadoJustificacion?.denominacion === 'Pendiente' ||
            s.estadoJustificacion?.denominacion === 'Justificado'
          ))
        );
      default:
        return faltasJustificables;
    }
  };
  
  // Obtener las faltas filtradas
  const faltasFiltradas = getFaltasFiltradas();
  
  useEffect(() => {
    const fetchMatriculas = async () => {
      try {
        setIsLoading(true);
        // Primero, obtener el curso académico current
        const cursosResponse = await fetch('/api/cursos-academicos?activo=true', {
          credentials: 'include'
        });

        if (!cursosResponse.ok) {
          throw new Error('Error al obtener el curso académico activo');
        }        const cursosData = await cursosResponse.json();
        setCursosAcademicos(cursosData);

        const cursoActivo = cursosData.find((curso: CursoAcademico) => curso.activo);
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

          const data = await response.json();          // Obtener todos los grupos del alumno en una sola llamada
          const alumnoGruposResponse = await fetch(`/api/alumnos-grupo?alumnoId=${session.user.id}`, {
            credentials: 'include'
          });

          if (!alumnoGruposResponse.ok) {
            throw new Error('Error al obtener grupos del alumno');
          }          
          const alumnoGruposData = await alumnoGruposResponse.json();
          
          // Asegurar que estamos trabajando con el formato correcto, independientemente de si
          // los datos vienen en la propiedad 'data' o directamente en la respuesta
          const alumnoGrupos = alumnoGruposData.data || alumnoGruposData;
          
          if (!Array.isArray(alumnoGrupos)) {
            console.error("Error: alumnoGrupos no es un array", alumnoGruposData);
            throw new Error('El formato de respuesta para alumnos-grupo no es válido');
          }
          
          // Crear un conjunto de IDs de grupos a los que pertenece el alumno para búsqueda rápida
          const gruposDelAlumno = new Set(alumnoGrupos.map((ag: AlumnoGrupo) => ag.grupoId));

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
                let faltas = 0;                // Filtrar solo grupos a los que pertenece el alumno
                const gruposDelAlumnoEnAsignatura = gruposData.grupos.filter(
                  (grupo: Grupo) => gruposDelAlumno.has(grupo.id)
                );                // Procesar solo los grupos a los que pertenece el alumno
                await Promise.all(gruposDelAlumnoEnAsignatura.map(async (grupo: Grupo) => {
                  // Obtener sesiones de este grupo
                  const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
                    credentials: 'include'
                  });

                  if (sesionesResponse.ok) {
                    const sesiones = await sesionesResponse.json();
                    totalSesiones += sesiones.length;                    // Obtener asistencias del alumno en estas sesiones
                    await Promise.all(sesiones.map(async (sesion: SesionClase) => {                      // Incluir explícitamente la solicitud de incluir justificaciones                      // Usamos un timestamp para evitar la caché del navegador y obtener datos frescos
                      const timestamp = new Date().getTime();
                      const asistenciaResponse = await fetch(
                        `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}&includeJustificaciones=true&_ts=${timestamp}`,
                        { 
                          credentials: 'include',
                          cache: 'no-store' // Asegurar que no se use caché
                        }
                      );

                      if (asistenciaResponse.ok) {
                        const asistenciasData = await asistenciaResponse.json();

                        if (Array.isArray(asistenciasData) && asistenciasData.length > 0) {
                          const asistencia = asistenciasData[0];
                          const estado = asistencia.estado || (asistencia.estadoAsistencia && asistencia.estadoAsistencia.denominacion);
                            // Verificar si la falta tiene justificación aceptada
                          const tieneJustificacionAceptada = asistencia.SolicitudJustificacion?.some(
                            (s: SolicitudJustificacion) => s.estadoJustificacion?.denominacion === 'Justificado'
                          );
                          
                          switch(estado) {
                            case 'Asiste':
                              asistencias++;
                              break;
                            case '50%':
                              // Para 50% de asistencia, contamos como 0.5
                              // Si está justificada, consideramos asistencia completa
                              if (tieneJustificacionAceptada) {
                                asistencias += 1; // Contamos como asistencia completa
                              } else {
                                asistencias += 0.5;
                                faltas += 0.5;
                              
                                // Permitir justificar también las faltas del 50%
                                // Solo agregar la falta si se puede justificar
                                if (puedeJustificarFalta(asistencia)) {
                                  setFaltasJustificables(prevFaltas => {
                                    // Solo agregar la falta si no existe ya en la lista
                                    const exists = prevFaltas.some(f => f.id === asistencia.id);
                                    if (!exists) {
                                      return [...prevFaltas, asistencia];
                                    }
                                    return prevFaltas;
                                  });
                                }
                              }
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
                              // Si está justificada, contamos como asistencia
                              if (tieneJustificacionAceptada) {
                                asistencias++; // Contamos como asistencia completa
                              } else {
                                faltas++;
                                
                                // Solo agregar la falta si se puede justificar
                                if (puedeJustificarFalta(asistencia)) {
                                  setFaltasJustificables(prevFaltas => {
                                    // Solo agregar la falta si no existe ya en la lista
                                    const exists = prevFaltas.some(f => f.id === asistencia.id);
                                    if (!exists) {
                                      return [...prevFaltas, asistencia];
                                    }
                                    return prevFaltas;
                                  });
                                }
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

            // Después de obtener las configuraciones de carrera, buscamos las dispensas
            try {
              const dispensasResponse = await fetch(`/api/solicitudes-dispensa?alumnoId=${session.user.id}`, {
                credentials: 'include'
              });

              if (dispensasResponse.ok) {
                const dispensasData = await dispensasResponse.json();
                console.log("Solicitudes de dispensa:", dispensasData);
                setSolicitudesDispensa(Array.isArray(dispensasData) ? dispensasData : []);
              }
            } catch (error) {
              console.error("Error al obtener dispensas:", error);
            }
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

  useEffect(() => {
    // Debug log to check faltas justificables
    if (faltasJustificables.length > 0) {
      console.log("Faltas Justificables:", faltasJustificables.map(f => ({
        id: f.id,
        fecha: f.fecha,
        estado: f.estadoAsistencia?.denominacion,
        solicitudes: f.SolicitudJustificacion?.map(s => ({
          id: s.id,
          estado: s.estadoJustificacion?.denominacion
        }))
      })));
    } else {
      console.log("No hay faltas justificables encontradas");
    }
    
    // Mostrar directamente los estados de justificación para depuración
    console.log("Estados de justificación de faltasJustificables:", 
      faltasJustificables.filter(f => f.SolicitudJustificacion && f.SolicitudJustificacion.length > 0)
        .map(f => ({
          id: f.id, 
          solicitudes: f.SolicitudJustificacion.map(s => s.estadoJustificacion?.denominacion)
        }))
    );
  }, [faltasJustificables]);

  const fullName = session?.user ?
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() :
    'Alumno';  // Determinar si una asistencia se puede justificar o debe mostrarse en la lista
  const puedeJustificarFalta = (asistencia: AsistenciaAlumno) => {
    // Protección contra valores nulos o indefinidos
    if (!asistencia) {
      console.warn('Asistencia es null o undefined en puedeJustificarFalta');
      return false;
    }
    
    // Debug: Imprimir toda la asistencia para inspección
    console.log('Revisando asistencia completa:', {
      id: asistencia.id,
      tiene_solicitudes: Boolean(asistencia.SolicitudJustificacion?.length),
      solicitudes_estados: asistencia.SolicitudJustificacion?.map(s => s?.estadoJustificacion?.denominacion) || []
    });
    
    // Si no tiene solicitudes, se puede justificar
    if (!asistencia.SolicitudJustificacion || asistencia.SolicitudJustificacion.length === 0) {
      console.log(`[${asistencia.id}] No tiene solicitudes, se muestra en la lista`);
      return true;
    }
    
    // Si tiene alguna solicitud pendiente, rechazada o no justificada, también debe mostrarse
    const tieneSolicitudPendienteORechazada = asistencia.SolicitudJustificacion.some((sol) => {
      const estado = sol?.estadoJustificacion?.denominacion;
      return estado === 'Pendiente' || estado === 'No Justificado' || estado === 'Rechazado';
    });
    
    // Añadimos un log para depuración
    console.log(`[${asistencia.id}] Tiene solicitud pendiente o rechazada: ${tieneSolicitudPendienteORechazada}`, 
      asistencia.SolicitudJustificacion.map(s => s?.estadoJustificacion?.denominacion || 'Sin estado'));
    
    return tieneSolicitudPendienteORechazada;
  };

  // Determinar si las dispensas están disponibles para una matrícula  // Función para verificar si se puede solicitar dispensa para una matrícula
  const isDispensaDisponible = (matricula: Matricula, configuracionesCarrera: ConfiguracionCarrera[]) => {
    if (!configuracionesCarrera.length) return false;

    const configCarrera = configuracionesCarrera.find(
      c => c.carreraId === matricula.asignatura.carreraId
    );

    if (!configCarrera) return false;

    // Verificar si las dispensas están activadas y si estamos en el período permitido
    if (!configCarrera.SolDispensa) return false;

    // Verificar si ya existe una solicitud pendiente para esta matrícula
    const tieneSolicitudPendiente = solicitudesDispensa.some(
      solicitud => 
        solicitud.matriculaId === matricula.id && 
        (solicitud.estadoDispensa?.denominacion === 'Pendiente' ||
         solicitud.estadoDispensa?.denominacion === 'Aprobada' ||
         solicitud.estadoDispensa?.denominacion === 'Aceptada')
    );
    
    // Si ya hay una solicitud pendiente o aprobada, no mostrar la asignatura
    if (tieneSolicitudPendiente) return false;

    // Verificar si estamos en el periodo permitido para solicitudes
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
              </div>              {/* Sección de faltas pendientes de justificar */}              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 transition-all hover:shadow-lg">
                <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-4 relative">
                  <div className="flex flex-wrap items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <FaExclamationTriangle className="mr-2 text-blue-200" />
                      Faltas y solicitudes de justificación
                    </h3>
                    <div className="flex items-center mt-1 sm:mt-0">                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium shadow-inner">
                        {faltasJustificables.length} {faltasJustificables.length === 1 ? 'registro' : 'registros'}
                      </span>
                      {faltasJustificables.filter(f => 
                        f.SolicitudJustificacion?.some(s => 
                          s.estadoJustificacion?.denominacion === 'Pendiente'
                        )
                      ).length > 0 && (
                        <span className="ml-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-inner flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {faltasJustificables.filter(f => 
                            f.SolicitudJustificacion?.some(s => 
                              s.estadoJustificacion?.denominacion === 'Pendiente'
                            )
                          ).length} en revisión
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Decorative line at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                </div>
                
                <div className="p-4 sm:p-6">
                  {faltasJustificables.length > 0 ? (
                    <div>                      {/* Tabs for filtering faltas */}
                      <div className="flex flex-wrap border-b border-gray-200 mb-5">
                        <button 
                          onClick={() => setFiltroFaltas('todas')}
                          className={`px-4 py-2 text-sm font-medium ${
                            filtroFaltas === 'todas' 
                              ? 'text-blue-700 border-b-2 border-blue-700' 
                              : 'text-gray-500 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-700'
                          } transition-colors`}
                        >
                          Todas ({faltasJustificables.length})
                        </button>                        <button 
                          onClick={() => setFiltroFaltas('pendientes')}
                          className={`px-4 py-2 text-sm font-medium ${
                            filtroFaltas === 'pendientes' 
                              ? 'text-blue-700 border-b-2 border-blue-700' 
                              : 'text-gray-500 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-700'
                          } transition-colors`}
                        >
                          Pendientes ({faltasJustificables.filter(f => 
                            f.SolicitudJustificacion?.some(s => 
                              s.estadoJustificacion?.denominacion === 'Pendiente'
                            )
                          ).length})
                        </button>                        <button 
                          onClick={() => setFiltroFaltas('sinjustificar')}
                          className={`px-4 py-2 text-sm font-medium ${
                            filtroFaltas === 'sinjustificar' 
                              ? 'text-blue-700 border-b-2 border-blue-700' 
                              : 'text-gray-500 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-700'
                          } transition-colors`}
                        >
                          Sin justificar ({
                            faltasJustificables.filter(f => 
                              !f.SolicitudJustificacion || 
                              f.SolicitudJustificacion.length === 0 ||
                              (f.SolicitudJustificacion.every(s => 
                                s.estadoJustificacion?.denominacion === 'Rechazado' || 
                                s.estadoJustificacion?.denominacion === 'No Justificado'
                              ) && 
                              !f.SolicitudJustificacion.some(s =>
                                s.estadoJustificacion?.denominacion === 'Pendiente' ||
                                s.estadoJustificacion?.denominacion === 'Justificado'
                              ))
                            ).length
                          })
                        </button>
                      </div>
                      
                      {/* Cards grid for faltas */}
                      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                        {faltasFiltradas.map(falta => {
                          // Encontrar la matrícula correspondiente a esta falta
                          const matriculaFalta = matriculas.find(m =>
                            m.asignatura.id === falta.sesionClase?.grupo?.asignaturaId
                          );

                          if (!matriculaFalta) return null;

                          // Obtener el estado de la falta para mostrar información más detallada
                          const estadoFalta = falta.estado || (falta.estadoAsistencia && falta.estadoAsistencia.denominacion) || 'No Asiste';
                          
                          // Determinar el color del badge según el tipo de falta
                          let badgeStyle = "";
                          let statusBg = "";
                          
                          if (estadoFalta === 'No Asiste') {
                            badgeStyle = "bg-gradient-to-r from-red-500 to-red-600 text-white";
                            statusBg = "bg-red-50 border-red-100";
                          } else if (estadoFalta === '50%') {
                            badgeStyle = "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white";
                            statusBg = "bg-yellow-50 border-yellow-100";
                          }
                          
                          // Verificar si hay solicitud de justificación y obtener su estado
                          const tieneSolicitud = falta.SolicitudJustificacion && falta.SolicitudJustificacion.length > 0;
                          
                          // Obtener todas las solicitudes para esta falta
                          const solicitudes = tieneSolicitud 
                            ? falta.SolicitudJustificacion.map(s => ({
                                id: s.id,
                                estado: s.estadoJustificacion?.denominacion || 'Desconocido',
                                fecha: s.fechaAlegacion
                              }))
                            : [];                          // Identificar el estado de la solicitud más reciente (o prioritaria)
                          // Prioridad: Pendiente > Rechazado > No Justificado > Justificado
                          let solicitudEstado = null;
                          if (solicitudes.some(s => s.estado === 'Pendiente')) {
                            solicitudEstado = 'Pendiente';
                          } else if (solicitudes.some(s => s.estado === 'Rechazado')) {
                            solicitudEstado = 'Rechazado';
                          } else if (solicitudes.some(s => s.estado === 'No Justificado')) {
                            solicitudEstado = 'No Justificado';
                          } else if (solicitudes.some(s => s.estado === 'Justificado')) {
                            solicitudEstado = 'Justificado';
                          }                          // Variables para estilos de estado de justificación
                          let justificacionStyle = "";
                          let justificacionIcon = null;
                          
                          if (solicitudEstado === 'Pendiente') {
                            justificacionStyle = "bg-blue-600 text-white";
                            justificacionIcon = (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            );
                          } else if (solicitudEstado === 'Justificado') {
                            justificacionStyle = "bg-green-600 text-white";
                            justificacionIcon = (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            );
                          } else if (solicitudEstado === 'Rechazado' || solicitudEstado === 'No Justificado') {
                            justificacionStyle = "bg-red-600 text-white";
                            justificacionIcon = (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            );
                          }
                          
                          return (
                            <div key={falta.id} className={`rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${statusBg}`}>
                              {/* Card header with date and status */}
                              <div className="bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center">
                                  <div className="text-blue-700 bg-blue-50 p-2 rounded-lg mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 012 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {new Date(falta.sesionClase.fecha).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                      })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(falta.sesionClase.fecha).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <span className={`${badgeStyle} text-xs px-3 py-1 rounded-full font-medium shadow-sm`}>
                                    {estadoFalta}
                                  </span>
                                  {tieneSolicitud && (
                                    <span className={`${justificacionStyle} ml-2 text-xs px-3 py-1 rounded-full font-medium shadow-sm flex items-center`}>
                                      {justificacionIcon}
                                      {solicitudEstado}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Card body with details */}
                              <div className="bg-white p-4">
                                <div className="mb-3">
                                  <h4 className="font-semibold text-gray-800">
                                    {matriculaFalta.asignatura.Denominacion}
                                  </h4>
                                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                                    <span className="inline-flex items-center text-gray-600">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                      Grupo: {falta.sesionClase.grupo.denominacion}
                                    </span>
                                    
                                    <span className="inline-flex items-center text-gray-600">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      {matriculaFalta.asignatura.user ?
                                        `${matriculaFalta.asignatura.user.name || ''} ${matriculaFalta.asignatura.user.surname1 || ''}`
                                        : 'No asignado'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Status timeline if it has solicitudes */}
                                {tieneSolicitud && (
                                  <div className="mt-4 pt-3 border-t border-gray-100">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Historial de solicitud</h5>
                                    <div className="flex items-center text-xs">
                                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded">Enviada</span>
                                      <div className={`h-0.5 flex-grow mx-1 ${solicitudEstado !== 'Pendiente' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={`${solicitudEstado !== 'Pendiente' ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'} px-2 py-0.5 rounded`}>
                                        Revisada
                                      </span>
                                      <div className={`h-0.5 flex-grow mx-1 ${solicitudEstado === 'Justificado' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <span className={`${solicitudEstado === 'Justificado' ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'} px-2 py-0.5 rounded`}>
                                        Aceptada
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      Fecha solicitud: {new Date(falta.SolicitudJustificacion[0].fechaAlegacion).toLocaleDateString('es-ES')}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Action buttons */}
                                <div className="mt-4 flex justify-end">
                                  {!tieneSolicitud || (solicitudEstado === 'Rechazado' || solicitudEstado === 'No Justificado') ? (
                                    <Link
                                      href={`/alumno/justificar?asistenciaId=${falta.id}`}
                                      className="bg-[#0D3C68] hover:bg-[#072747] text-white font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all flex items-center"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      {tieneSolicitud ? 'Volver a justificar' : 'Justificar falta'}
                                    </Link>
                                  ) : (
                                    <div className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                                      solicitudEstado === 'Pendiente' 
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : solicitudEstado === 'Justificado'
                                          ? 'bg-green-100 text-green-700 border border-green-300'
                                          : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {solicitudEstado === 'Pendiente' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      ) : solicitudEstado === 'Justificado' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      )}                                      {solicitudEstado === 'Pendiente' 
                                        ? 'En revisión'
                                        : solicitudEstado === 'Justificado' 
                                          ? 'Justificación aceptada' 
                                          : solicitudEstado === 'Rechazado'
                                            ? 'Justificación rechazada'
                                            : solicitudEstado === 'No Justificado'
                                              ? 'No justificado'
                                              : 'Estado desconocido'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="bg-blue-50 inline-block p-5 rounded-full shadow-sm mb-3">
                        <FaCalendarCheck className="text-4xl text-[#0D3C68]" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">No tienes faltas pendientes de justificar</h4>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Todas tus asistencias están en orden o ya han sido justificadas correctamente. Aquí aparecerán 
                        tus faltas cuando necesites justificarlas.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* División visual entre las secciones de faltas y dispensas */}
              <div className="flex items-center mb-6 mt-4">
                <div className="flex-grow border-t border-gray-200"></div>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>              {/* Sección de solicitudes de dispensas */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-4 relative">
                  <div className="flex flex-wrap items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <FaFileAlt className="mr-2 text-blue-200" />
                      Solicitudes de dispensa académica
                    </h3>
                    <div className="flex items-center mt-1 sm:mt-0">
                      <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium shadow-inner">
                        {solicitudesDispensa.length} {solicitudesDispensa.length === 1 ? 'solicitud' : 'solicitudes'}
                      </span>
                      {solicitudesDispensa.filter(d => 
                        d.estadoDispensa?.denominacion === 'Pendiente'
                      ).length > 0 && (
                        <span className="ml-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-inner flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {solicitudesDispensa.filter(d => 
                            d.estadoDispensa?.denominacion === 'Pendiente'
                          ).length} en revisión
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Decorative line at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                </div>
                <div className="p-6">
                  {configuracionesCarrera.length > 0 ? (
                    <div>
                      {solicitudesDispensa.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                          {solicitudesDispensa.map(dispensa => {
                            
                            // Variables para estilos de estado de dispensa
                            let dispensaStyle = "";
                            let dispensaIcon = null;
                            
                            if (dispensa.estadoDispensa?.denominacion === 'Pendiente') {
                              dispensaStyle = "bg-blue-600 text-white";
                              dispensaIcon = (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              );
                            } else if (dispensa.estadoDispensa?.denominacion === 'Aceptada' || dispensa.estadoDispensa?.denominacion === 'Aprobada') {
                              dispensaStyle = "bg-green-600 text-white";
                              dispensaIcon = (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              );
                            } else if (dispensa.estadoDispensa?.denominacion === 'Rechazada' || dispensa.estadoDispensa?.denominacion === 'Denegada') {
                              dispensaStyle = "bg-red-600 text-white";
                              dispensaIcon = (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              );
                            }
                            
                            return (
                              <div key={dispensa.id} className="rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md bg-gray-50">
                                {/* Card header */}
                                <div className="bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="text-blue-700 bg-blue-50 p-2 rounded-lg mr-3">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-800">
                                        Solicitud de dispensa
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(dispensa.fechaAlegacion).toLocaleDateString('es-ES', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <span className={`${dispensaStyle} text-xs px-3 py-1 rounded-full font-medium shadow-sm flex items-center`}>
                                      {dispensaIcon}
                                      {dispensa.estadoDispensa?.denominacion || 'Estado desconocido'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Card body */}
                                <div className="bg-white p-4">
                                  <div className="mb-3">
                                    <h4 className="font-semibold text-gray-800">
                                      {dispensa.matricula?.asignatura.Denominacion || "Asignatura"}
                                    </h4>
                                    <div className="mt-1 flex flex-wrap text-sm text-gray-600">
                                      {dispensa.matricula?.asignatura.carrera?.denominacion || "Carrera"}
                                    </div>
                                    <div className="mt-2 pb-2 border-b border-gray-100">
                                      <p className="text-sm text-gray-700 italic">{dispensa.alegacion}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Status timeline */}
                                  <div className="mt-3">
                                    <div className="flex items-center text-xs mb-2">
                                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded">Enviada</span>
                                      <div className={`h-0.5 flex-grow mx-1 ${
                                        dispensa.estadoDispensa?.denominacion !== 'Pendiente' ? 'bg-green-500' : 'bg-gray-300'
                                      }`}></div>
                                      <span className={`${
                                        dispensa.estadoDispensa?.denominacion !== 'Pendiente' ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
                                      } px-2 py-0.5 rounded`}>
                                        Revisada
                                      </span>
                                      <div className={`h-0.5 flex-grow mx-1 ${
                                        dispensa.estadoDispensa?.denominacion === 'Aceptada' || dispensa.estadoDispensa?.denominacion === 'Aprobada' ? 'bg-green-500' : 'bg-gray-300'
                                      }`}></div>
                                      <span className={`${
                                        dispensa.estadoDispensa?.denominacion === 'Aceptada' || dispensa.estadoDispensa?.denominacion === 'Aprobada' ? 'bg-green-600 text-white' : 'bg-gray-300 text-white'
                                      } px-2 py-0.5 rounded`}>
                                        Aceptada
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-6">
                          <div className="bg-blue-50 p-4 rounded-full mb-3">
                            <FaFileAlt className="text-3xl text-blue-600" />
                          </div>
                          <p className="text-gray-700 font-medium">No tienes solicitudes de dispensa</p>
                          <p className="text-gray-500 text-sm mt-1 text-center max-w-md">
                            Si necesitas solicitar una dispensa académica, puedes hacerlo desde la sección de asignaturas.
                          </p>
                        </div>
                      )}                      <div className="mt-6">
                        <h4 className="font-medium text-gray-700 mb-3">Asignaturas con dispensas disponibles:</h4>
                        {matriculas.some(m => isDispensaDisponible(m, configuracionesCarrera)) ? (
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
                        ) : (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                            {solicitudesDispensa.some(s => s.estadoDispensa?.denominacion === 'Pendiente') ? (
                              <p className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Ya tienes solicitudes de dispensa pendientes de revisión. No puedes solicitar más hasta que se resuelvan.
                              </p>
                            ) : (
                              <p>No hay dispensas disponibles actualmente para ninguna de tus asignaturas.</p>
                            )}
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
