'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaUserGraduate,
  FaChartPie,
  FaInfoCircle,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCalendarCheck,
  FaFileAlt,
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

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

export default function AsistenciaDetallada() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const matriculaId = searchParams.get('matriculaId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matricula, setMatricula] = useState<Matricula | null>(null);
  const [sesionesAlumno, setSesionesAlumno] = useState<AsistenciaAlumno[]>([]);
  const [faltasJustificables, setFaltasJustificables] = useState<AsistenciaAlumno[]>([]);
  const [configuracionesCarrera, setConfiguracionesCarrera] = useState<ConfiguracionCarrera[]>([]);
  // Almacena los grupos a los que pertenece el alumno para evitar consultas repetidas
  const [gruposDelAlumno, setGruposDelAlumno] = useState<string[]>([]);
  // Efecto separado solo para obtener grupos del alumno, una sola vez
  useEffect(() => {
    // Obtener los grupos a los que pertenece el alumno para usarlos en múltiples funciones
    const obtenerGruposDelAlumno = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/alumnos-grupo?alumnoId=${session.user.id}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const grupos = data.filter((ag: any) => ag.alumno_Id === session.user.id)
                           .map((ag: any) => ag.grupo_Id);
          setGruposDelAlumno(grupos);
        }
      } catch (error) {
        console.error("Error al obtener grupos del alumno:", error);
      }
    };

    if (session?.user?.id) {
      obtenerGruposDelAlumno();
    }
  }, [session?.user?.id]); // Solo depende de la sesión del usuario, no de gruposDelAlumno

  useEffect(() => {
    const fetchMatricula = async () => {
      if (!matriculaId || !session?.user?.id) {
        router.push('/alumno/dashboard');
        return;
      }
      
      if (gruposDelAlumno.length === 0) {
        // Si no tenemos los grupos cargados aún, esperamos
        return;
      }

      try {
        setIsLoading(true);
        
        // Obtener la matrícula específica
        const url = `/api/matriculas?alumno_id=${session.user.id}&porAlumno=true`;
        
        const response = await fetch(url, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener la matrícula: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Buscar la matrícula específica
        const matriculaEncontrada = Array.isArray(data) 
          ? data.find((m: Matricula) => m.id === matriculaId)
          : null;
        
        if (!matriculaEncontrada) {
          throw new Error('Matrícula no encontrada');
        }
        
        // Obtener estadísticas para la matrícula
        const matriculaConEstadisticas = await enriquecerMatricula(matriculaEncontrada);
        setMatricula(matriculaConEstadisticas);
        
        // Obtener configuraciones de carrera para dispensas
        const configResponse = await fetch('/api/configuracion-carrera', {
          credentials: 'include'
        });
        
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfiguracionesCarrera(configData);
        }
        
        // Cargar sesiones y asistencias
        await fetchSesiones(matriculaConEstadisticas);
        
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };
      const enriquecerMatricula = async (matricula: Matricula): Promise<Matricula> => {
      try {
        if (!session?.user?.id || gruposDelAlumno.length === 0) {
          return matricula;
        }
        
        // Obtener los grupos de la asignatura
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${matricula.asignatura.id}`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error(`Error al obtener grupos para asignatura ${matricula.asignatura.id}`);
        }
        
        const gruposData = await gruposResponse.json();
        
        // Filtrar solo los grupos en los que el alumno está matriculado
        const gruposFiltrados = gruposData.grupos.filter(
          (grupo: any) => gruposDelAlumno.includes(grupo.id)
        );
        
        // Obtener todas las sesiones de los grupos relevantes
        const sesionesPromesas = gruposFiltrados.map(async (grupo: any) => {
          const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
            credentials: 'include'
          });
          
          if (!sesionesResponse.ok) return [];
          return sesionesResponse.json();
        });
        
        const sesionesResultados = await Promise.all(sesionesPromesas);
        const todasLasSesiones = sesionesResultados.flat();
        
        let totalSesiones = todasLasSesiones.length;
        let asistencias = 0;
        let faltas = 0;
        
        // Obtener asistencias para todas las sesiones en paralelo
        const asistenciasPromesas = todasLasSesiones.map(async (sesion: any) => {
          const asistenciaResponse = await fetch(
            `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}`,
            { credentials: 'include' }
          );
          
          if (!asistenciaResponse.ok) return null;
          
          const asistenciasData = await asistenciaResponse.json();
          
          if (Array.isArray(asistenciasData) && asistenciasData.length > 0) {
            return asistenciasData[0];
          }
          
          return null; // Si no hay registro, se considera falta
        });
        
        const asistenciasResultados = await Promise.all(asistenciasPromesas);
        
        // Contar asistencias y faltas
        for (const asistencia of asistenciasResultados) {
          if (asistencia && (
              asistencia.estado === 'Asiste' || 
              (asistencia.estadoAsistencia && asistencia.estadoAsistencia.denominacion === 'Asiste')
          )) {
            asistencias++;
          } else {
            faltas++;
          }
        }
        
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
    };
      const fetchSesiones = async (matricula: Matricula) => {
      if (!session?.user?.id || gruposDelAlumno.length === 0) return;

      try {
        // Obtener todos los grupos de la asignatura seleccionada
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${matricula.asignatura.id}`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error('Error al obtener los grupos');
        }
        
        const gruposData = await gruposResponse.json();
        
        // Solo incluir los grupos donde el alumno está matriculado
        const gruposDelAlumnoFiltrados = gruposData.grupos.filter(
          (grupo: any) => gruposDelAlumno.includes(grupo.id)
        );
        
        // Para cada grupo, verificar si el estudiante está matriculado y obtener sus sesiones y asistencias
        const todasLasAsistencias: AsistenciaAlumno[] = [];
        
        // Obtener todas las sesiones de los grupos relevantes primero
        const sesionesPromesas = gruposDelAlumnoFiltrados.map(async (grupo: any) => {
          const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}`, {
            credentials: 'include'
          });
          
          if (!sesionesResponse.ok) return [];
          return sesionesResponse.json();
        });
        
        const sesionesResultados = await Promise.all(sesionesPromesas);
        
        // Aplanar todas las sesiones en una sola lista
        const todasLasSesiones = sesionesResultados.flat();
        
        // Obtener asistencias para todas las sesiones en paralelo
        const asistenciasPromesas = todasLasSesiones.map(async (sesion: any) => {
          const asistenciaResponse = await fetch(
            `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}`,
            { credentials: 'include' }
          );
          
          if (!asistenciaResponse.ok) return [];
          return asistenciaResponse.json();
        });
        
        const asistenciasResultados = await Promise.all(asistenciasPromesas);
        
        // Aplanar todas las asistencias
        for (const asistencias of asistenciasResultados) {
          if (Array.isArray(asistencias) && asistencias.length > 0) {
            todasLasAsistencias.push(...asistencias);
          }
        }
        
        setSesionesAlumno(todasLasAsistencias);
        
        // Filtrar faltas que se pueden justificar (no tienen justificación)
        const faltas = todasLasAsistencias.filter(a => 
          a.estado !== 'Asiste' && 
          a.estadoAsistencia?.denominacion !== 'Asiste' && 
          (!a.SolicitudJustificacion || a.SolicitudJustificacion.length === 0)
        );
        
        setFaltasJustificables(faltas);
        
      } catch (error) {
        console.error('Error al cargar sesiones:', error);
      }
    };if (session?.user?.id && matriculaId && gruposDelAlumno.length > 0) {
      fetchMatricula();
    }
  }, [session, matriculaId, router, gruposDelAlumno.length]);

  // Determinar si las dispensas están disponibles
  const dispensasDisponibles = () => {
    if (!configuracionesCarrera.length || !matricula) return false;
    
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
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información de asistencia...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600 flex flex-col items-center">
                <FaInfoCircle className="text-3xl mb-2" />
                <p>{error}</p>
                <Link 
                  href="/alumno/dashboard"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Volver al dashboard
                </Link>
              </div>
            </div>
          ) : matricula ? (
            <>
              {/* Encabezado de la asignatura */}
              <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <Link 
                        href="/alumno/dashboard" 
                        className="mb-2 flex items-center text-sm text-blue-100 hover:text-white transition-colors"
                      >
                        <FaArrowLeft className="mr-1" /> Volver al dashboard
                      </Link>
                      <h2 className="text-xl font-bold">
                        {matricula.asignatura.Denominacion}
                      </h2>
                      <p className="text-blue-100 text-sm mt-1">
                        {matricula.asignatura.carrera.denominacion} • {matricula.asignatura.Curso} Curso • {matricula.asignatura.Cuatrimestre}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg px-3 py-2">
                      <span className="text-white text-sm font-medium">
                        {matricula.asignatura.CodAsignatura}
                      </span>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-gray-50 px-4 py-3 rounded-lg flex-1 min-w-[250px]">
                      <p className="text-xs text-gray-500 uppercase mb-1">Profesor</p>
                      <p className="text-gray-800">
                        {matricula.asignatura.user ? 
                          `${matricula.asignatura.user.name || ''} ${matricula.asignatura.user.surname1 || ''} ${matricula.asignatura.user.surname2 || ''}`
                          : 'No asignado'}
                      </p>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-lg flex-1 min-w-[250px]">
                      <p className="text-xs text-gray-500 uppercase mb-1">Porcentaje de asistencia</p>
                      <div className="flex items-center gap-2">
                        <div className={`text-lg font-bold ${
                          matricula.totalSesiones && matricula.totalSesiones > 0
                            ? (matricula.porcentajeAsistencia !== undefined 
                                ? matricula.porcentajeAsistencia >= 80
                                  ? 'text-green-700'
                                  : matricula.porcentajeAsistencia >= 50
                                    ? 'text-yellow-700'
                                    : 'text-red-700'
                                : 'text-gray-800')
                            : 'text-gray-500'
                        }`}>
                          {matricula.totalSesiones && matricula.totalSesiones > 0
                            ? `${matricula.porcentajeAsistencia || 0}%`
                            : "N/A"}
                        </div>
                        <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              matricula.totalSesiones && matricula.totalSesiones > 0
                                ? (matricula.porcentajeAsistencia !== undefined
                                    ? matricula.porcentajeAsistencia >= 80
                                      ? 'bg-green-500'
                                      : matricula.porcentajeAsistencia >= 50
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    : 'bg-gray-300')
                                : 'bg-gray-300'
                            }`}
                            style={{ width: `${(matricula.totalSesiones && matricula.totalSesiones > 0) ? (matricula.porcentajeAsistencia || 0) : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gráfico de asistencia */}
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <FaChartPie className="mr-2 text-blue-600" />
                      Resumen de asistencia
                    </h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-full max-w-[300px] h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Asistencias', value: matricula.asistencias || 0 },
                                { name: 'Faltas', value: matricula.faltas || 0 },
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              <Cell fill="#10B981" />
                              <Cell fill="#EF4444" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <div className="text-green-800 text-2xl font-bold">
                              {matricula.asistencias || 0}
                            </div>
                            <div className="text-green-600 text-sm">Asistencias registradas</div>
                          </div>
                          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <div className="text-red-800 text-2xl font-bold">
                              {matricula.faltas || 0}
                            </div>
                            <div className="text-red-600 text-sm">Faltas</div>
                          </div>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="text-blue-800 text-2xl font-bold">
                              {matricula.totalSesiones || 0}
                            </div>
                            <div className="text-blue-600 text-sm">Total de sesiones</div>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <div className="text-yellow-800 text-2xl font-bold">
                              {faltasJustificables.length}
                            </div>
                            <div className="text-yellow-600 text-sm">Faltas justificables</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Listado de todas las sesiones */}
              <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Sesiones y asistencias
                  </h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-md">
                      <thead>
                        <tr className="bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Grupo</th>
                          <th className="px-4 py-3">Estado</th>
                          <th className="px-4 py-3">Justificación</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {sesionesAlumno.length > 0 ? (
                          sesionesAlumno.map((asistencia) => (
                            <tr key={asistencia.id} className="border-t border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3">
                                {new Date(asistencia.sesionClase.fecha).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                {asistencia.sesionClase.grupo.denominacion}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium 
                                  ${asistencia.estado === 'Asiste' || asistencia.estadoAsistencia?.denominacion === 'Asiste' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'}`}>
                                  {asistencia.estadoAsistencia?.denominacion || asistencia.estado}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {asistencia.SolicitudJustificacion && asistencia.SolicitudJustificacion.length > 0 ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                    Justificada
                                  </span>
                                ) : asistencia.estado !== 'Asiste' && asistencia.estadoAsistencia?.denominacion !== 'Asiste' ? (
                                  <Link
                                    href={`/alumno/justificar?asistenciaId=${asistencia.id}`}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                  >
                                    Justificar falta
                                  </Link>
                                ) : null}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                              No hay sesiones registradas para esta asignatura.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Justificación de faltas y dispensas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Faltas pendientes de justificar */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <FaExclamationTriangle className="mr-2 text-yellow-600" />
                      Faltas pendientes de justificar
                    </h3>
                  </div>
                  <div className="p-6">
                    {faltasJustificables.length > 0 ? (
                      <div className="space-y-3">
                        {faltasJustificables.map(falta => (
                          <div key={falta.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                            <div>
                              <p className="text-gray-800 font-medium">
                                {new Date(falta.sesionClase.fecha).toLocaleDateString()} - {matricula.asignatura.Denominacion}
                              </p>
                              <p className="text-gray-500 text-sm">
                                Grupo: {falta.sesionClase.grupo.denominacion}
                              </p>
                            </div>
                            <Link
                              href={`/alumno/justificar?asistenciaId=${falta.id}`}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded transition-colors"
                            >
                              Justificar
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <div className="bg-yellow-50 inline-block p-3 rounded-full">
                          <FaCalendarCheck className="text-2xl text-yellow-500" />
                        </div>
                        <p className="mt-2 text-gray-600">No tienes faltas pendientes de justificar.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Solicitudes de dispensa */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <FaFileAlt className="mr-2 text-blue-600" />
                      Solicitudes de dispensa
                    </h3>
                  </div>
                  <div className="p-6">
                    {dispensasDisponibles() ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <p className="text-blue-800">
                            Las solicitudes de dispensa están disponibles para esta asignatura.
                          </p>
                          <p className="text-blue-600 text-sm mt-2">
                            Puedes solicitar una dispensa académica para esta asignatura si cumples con los requisitos establecidos.
                          </p>
                        </div>
                        
                        <Link
                          href={`/alumno/solicitar-dispensa?matriculaId=${matricula.id}`}
                          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-medium px-4 py-2 rounded transition-colors"
                        >
                          Solicitar dispensa
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center p-4">
                        <div className="bg-gray-50 inline-block p-3 rounded-full">
                          <FaFileAlt className="text-2xl text-gray-400" />
                        </div>
                        <p className="mt-2 text-gray-600">Las solicitudes de dispensa no están disponibles para esta carrera o asignatura.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center p-6 flex flex-col items-center">
                <FaInfoCircle className="text-5xl text-blue-200 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700">Información no disponible</h2>
                <p className="text-gray-500 mt-2">
                  No se pudo encontrar la información de la matrícula solicitada.
                </p>
                <Link 
                  href="/alumno/dashboard"
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Volver al dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
