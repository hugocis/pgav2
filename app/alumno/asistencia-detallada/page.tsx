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
  FaClock,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { motion } from 'framer-motion';

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
  SolicitudJustificacion: Array<{
    id: string;
    estadoJustificacion: {
      id: string;
      denominacion: string;
    };
    fechaAlegacion: string;
  }>;
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

interface Grupo {
  id: string;
  denominacion: string;
  asignaturaId: string;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  grupo: {
    id: string;
    denominacion: string;
  };
}

// Interface para tipar las propiedades del sector activo en PieChart
interface ActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: {
    name: string;
    value: number;
  };
  percent: number;
  value: number;
}

// Componente para renderizar un sector activo del PieChart
const renderActiveShape = (props: ActiveShapeProps) => {
  const RADIAN = Math.PI / 180;
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    payload, percent, value
  } = props;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  // Si el nombre del payload es 'Sin sesiones', mostramos un mensaje diferente
  if (payload.name === 'Sin sesiones') {
    return (
      <g>
        <text x={cx} y={cy} textAnchor="middle" fill="#475569" fontSize="16" fontWeight="500">
          Sin sesiones registradas
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="#E2E8F0"
          opacity={0.8}
          stroke="#CBD5E1"
          strokeWidth={1}
        />
      </g>
    );
  }
  // Determinar colores basados en el tipo de dato
  let mainColor, secondaryColor;

  switch (payload.name) {
    case 'Asistencias':
      mainColor = '#059669';
      secondaryColor = '#10B981';
      break;
    case 'Faltas':
      mainColor = '#DC2626';
      secondaryColor = '#EF4444';
      break;
    case '50%':
      mainColor = '#EAB308';
      secondaryColor = '#FBBF24';
      break;
    case 'Justificada':
      mainColor = '#3B82F6';
      secondaryColor = '#60A5FA';
      break;
    case 'Dispensado':
      mainColor = '#8B5CF6';
      secondaryColor = '#A78BFA';
      break;
    default:
      mainColor = '#475569';
      secondaryColor = '#64748B';
      break;
  }

  return (
    <g>
      {/* Centro del gráfico con información */}
      <text x={cx} y={cy - 15} textAnchor="middle" fill={mainColor} fontSize="16" fontWeight="600">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#1E293B" fontSize="15" fontWeight="500">
        {`${value} (${(percent * 100).toFixed(0)}%)`}
      </text>

      {/* Sector principal */}      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={payload.name === 'Asistencias'
          ? "url(#greenGradient)"
          : payload.name === 'Faltas'
            ? "url(#redGradient)"
            : mainColor}
        stroke="#FFF"
        strokeWidth={2}
      />

      {/* Arco exterior */}
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={secondaryColor}
        opacity={0.7}
      />

      {/* Línea conectora y etiqueta */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={mainColor}
        strokeWidth={1.5}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={3} fill={mainColor} stroke="white" strokeWidth={1} />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey - 4}
        textAnchor={textAnchor}
        fill="#334155"
        fontSize="14"
        fontWeight="500"
      >{`${value} sesiones`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey + 16}
        textAnchor={textAnchor}
        fill="#64748B"
        fontSize="13"
      >
        {`(${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

// Componente para una tarjeta de estadísticas animada
const StatCard = ({
  title,
  value,
  bgColor,
  textColor,
  icon: Icon
}: {
  title: string;
  value: number | string;
  bgColor: string;
  textColor: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) => (
  <motion.div
    className={`${bgColor} p-5 rounded-lg border shadow-sm`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
        <div className={`text-sm ${textColor} opacity-90`}>{title}</div>
      </div>
      <div className={`${textColor} opacity-80 text-xl`}>
        <Icon />
      </div>
    </div>
  </motion.div>
);

export default function AsistenciaDetallada() {
  const { data: session } = useSession({
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
  const [activeIndex, setActiveIndex] = useState(0);
  // Almacena los grupos a los que pertenece el alumno para evitar consultas repetidas
  const [gruposDelAlumno, setGruposDelAlumno] = useState<string[]>([]);

  // Efecto separado solo para obtener grupos del alumno, una sola vez
  useEffect(() => {
    // Obtener los grupos a los que pertenece el alumno para usarlos en múltiples funciones
    const obtenerGruposDelAlumno = async () => {
      if (!session?.user?.id) return;

      try {        const response = await fetch(`/api/alumnos-grupo?alumnoId=${session.user.id}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (response.ok) {
          const responseData = await response.json();
          // Asegurar que estamos trabajando con el formato correcto, independientemente de si
          // los datos vienen en la propiedad 'data' o directamente en la respuesta
          const data = responseData.data || responseData;
          
          if (!Array.isArray(data)) {
            console.error("Error: los datos de alumnos-grupo no son un array", responseData);
            throw new Error('El formato de respuesta para alumnos-grupo no es válido');
          }
            // Flexibilidad para manejar diferentes formatos de respuesta
          interface AlumnoGrupo {
            grupoId?: string;
            grupo_Id?: string;
          }
          // Filter out undefined values with the .filter Boolean trick
          const grupos = data
            .map((ag: AlumnoGrupo) => ag.grupoId || ag.grupo_Id)
            .filter(Boolean) as string[];

          console.log('Grupos obtenidos del alumno:', grupos);
          setGruposDelAlumno(grupos);
        } else {
          console.error("Error en la respuesta al obtener grupos del alumno:", response.status);
        }
      } catch (error) {
        console.error("Error al obtener grupos del alumno:", error);
      }
    };

    if (session?.user?.id) {
      obtenerGruposDelAlumno();
    }
  }, [session?.user?.id]);

  // Efecto principal para cargar los datos de la matrícula y asistencias
  useEffect(() => {
    const cargarDatos = async () => {
      if (!matriculaId || !session?.user?.id) {
        router.push('/alumno/dashboard');
        return;
      }

      if (gruposDelAlumno.length === 0) {
        console.log('Esperando a que se carguen los grupos del alumno...');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Cargando datos para matrícula:', matriculaId);

        // Obtener la matrícula específica
        const timestamp = new Date().getTime(); // Añadir timestamp para evitar caché
        const url = `/api/matriculas?alumno_id=${session.user.id}&porAlumno=true&_ts=${timestamp}`;

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

        // Obtener configuraciones de carrera para dispensas
        const configResponse = await fetch('/api/configuracion-carrera', {
          credentials: 'include',
          cache: 'no-store'
        });

        if (configResponse.ok) {
          const configData = await configResponse.json();
          setConfiguracionesCarrera(configData);
        }

        // Enriquecer matrícula con estadísticas de asistencia
        const matriculaConEstadisticas = await enriquecerMatricula(matriculaEncontrada);
        setMatricula(matriculaConEstadisticas);

        // Cargar sesiones y asistencias
        await cargarSesionesYAsistencias(matriculaConEstadisticas);

      } catch (error) {
        console.error('Error al cargar los datos:', error);
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

        console.log('Enriqueciendo matrícula con estadísticas:', matricula.id);

        // Obtener los grupos de la asignatura
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${matricula.asignatura.id}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (!gruposResponse.ok) {
          throw new Error(`Error al obtener grupos para asignatura ${matricula.asignatura.id}`);
        }

        const gruposData = await gruposResponse.json();
        // Filtrar solo los grupos en los que el alumno está matriculado
        const gruposFiltrados = gruposData.grupos.filter(
          (grupo: Grupo) => gruposDelAlumno.includes(grupo.id)
        );

        console.log('Grupos filtrados del alumno para esta asignatura:',
          gruposFiltrados.map((g: Grupo) => ({ id: g.id, nombre: g.denominacion })));

        if (gruposFiltrados.length === 0) {
          console.warn('El alumno no está en ningún grupo de esta asignatura');
        }

        // Obtener todas las sesiones de los grupos relevantes
        const sesionesPromesas = gruposFiltrados.map(async (grupo: Grupo) => {
          const timestamp = new Date().getTime();
          const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}&_ts=${timestamp}`, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (!sesionesResponse.ok) return [];
          const sesiones = await sesionesResponse.json();
          return sesiones;
        });

        const sesionesResultados = await Promise.all(sesionesPromesas);
        const todasLasSesiones = sesionesResultados.flat();

        console.log('Total sesiones encontradas para estadísticas:', todasLasSesiones.length);

        let totalSesiones = todasLasSesiones.length;
        let asistencias = 0;
        let faltas = 0;

        if (totalSesiones === 0) {
          console.warn('No se encontraron sesiones para los grupos del alumno');
          return {
            ...matricula,
            totalSesiones: 0,
            asistencias: 0,
            faltas: 0,
            porcentajeAsistencia: 0
          };
        }
        // Obtener asistencias para todas las sesiones en paralelo
        const asistenciasPromesas = todasLasSesiones.map(async (sesion: SesionClase) => {
          const timestamp = new Date().getTime();
          const asistenciaResponse = await fetch(
            `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}&includeJustificaciones=true&_ts=${timestamp}`,
            {
              credentials: 'include',
              cache: 'no-store'
            }
          );

          if (!asistenciaResponse.ok) return null;

          const asistenciasData = await asistenciaResponse.json();

          if (Array.isArray(asistenciasData) && asistenciasData.length > 0) {
            return asistenciasData[0];
          }

          return null; // Si no hay registro, se considera falta
        });

        const asistenciasResultados = await Promise.all(asistenciasPromesas);

        // Contar asistencias y faltas con soporte para diversos tipos de asistencia
        for (const asistencia of asistenciasResultados) {
          if (asistencia) {
            const estado = asistencia.estado || (asistencia.estadoAsistencia && asistencia.estadoAsistencia.denominacion);

            switch (estado) {
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
                break;
            }
          } else {
            // Si no hay registro, se considera falta
            faltas++;
          }
        }

        // Calcular porcentaje de asistencia
        const porcentajeAsistencia = totalSesiones > 0
          ? Math.round((asistencias / totalSesiones) * 100)
          : 0;

        console.log('Estadísticas calculadas para la matrícula:', {
          totalSesiones,
          asistencias,
          faltas,
          porcentajeAsistencia
        });

        // Asegurarse de que los valores sean números válidos
        return {
          ...matricula,
          totalSesiones: Number.isFinite(totalSesiones) ? totalSesiones : 0,
          asistencias: Number.isFinite(asistencias) ? asistencias : 0,
          faltas: Number.isFinite(faltas) ? faltas : 0,
          porcentajeAsistencia
        };
      } catch (error) {
        console.error(`Error al obtener estadísticas para matrícula ${matricula.id}:`, error);
        return matricula;
      }
    };

    const cargarSesionesYAsistencias = async (matricula: Matricula) => {
      if (!session?.user?.id || gruposDelAlumno.length === 0) {
        console.log('No se pueden cargar sesiones y asistencias: faltan datos de sesión o grupos');
        return;
      }

      try {
        console.log('Cargando sesiones y asistencias para la matrícula:', matricula.id);

        // Obtener todos los grupos de la asignatura seleccionada
        const timestamp = new Date().getTime();
        const gruposResponse = await fetch(`/api/grupos?asignaturaId=${matricula.asignatura.id}&_ts=${timestamp}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        const gruposData = await gruposResponse.json();
        // Solo incluir los grupos donde el alumno está matriculado
        const gruposDelAlumnoFiltrados = gruposData.grupos.filter(
          (grupo: Grupo) => gruposDelAlumno.includes(grupo.id)
        );

        console.log('Grupos del alumno para sesiones y asistencias:',
          gruposDelAlumnoFiltrados.map((g: Grupo) => ({ id: g.id, nombre: g.denominacion })));

        if (gruposDelAlumnoFiltrados.length === 0) {
          console.warn('El alumno no está en ningún grupo de esta asignatura - No se pueden cargar sesiones');
          setSesionesAlumno([]);
          setFaltasJustificables([]);
          return;
        }

        // Para cada grupo, obtener las sesiones de clase
        const todasLasAsistencias: AsistenciaAlumno[] = [];
        // Obtener todas las sesiones de los grupos relevantes primero
        const sesionesPromesas = gruposDelAlumnoFiltrados.map(async (grupo: Grupo) => {
          const ts = new Date().getTime();
          const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupo.id}&_ts=${ts}`, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (!sesionesResponse.ok) return [];
          const sesiones = await sesionesResponse.json();
          return sesiones;
        });

        const sesionesResultados = await Promise.all(sesionesPromesas);

        // Aplanar todas las sesiones en una sola lista
        const todasLasSesiones = sesionesResultados.flat();

        console.log('Total sesiones encontradas para cargar asistencias detalladas:', todasLasSesiones.length);

        if (todasLasSesiones.length === 0) {
          console.warn('No se encontraron sesiones para los grupos del alumno');
          setSesionesAlumno([]);
          setFaltasJustificables([]);
          return;
        }
        // Obtener asistencias para todas las sesiones en paralelo con timestamp para evitar caché
        const asistenciasPromesas = todasLasSesiones.map(async (sesion: SesionClase) => {
          const ts = new Date().getTime();
          const asistenciaResponse = await fetch(
            `/api/asistencias-alumno?sesionClaseId=${sesion.id}&alumnoId=${session.user.id}&includeJustificaciones=true&_ts=${ts}`,
            {
              credentials: 'include',
              cache: 'no-store'
            }
          );

          if (!asistenciaResponse.ok) return [];
          const asistencias = await asistenciaResponse.json();
          return asistencias;
        });

        const asistenciasResultados = await Promise.all(asistenciasPromesas);

        // Aplanar todas las asistencias
        for (const asistencias of asistenciasResultados) {
          if (Array.isArray(asistencias) && asistencias.length > 0) {
            todasLasAsistencias.push(...asistencias);
          }
        }

        console.log('Total asistencias encontradas para la vista detallada:', todasLasAsistencias.length);

        setSesionesAlumno(todasLasAsistencias);

        // Filtrar faltas que se pueden justificar
        const faltas = todasLasAsistencias.filter(a =>
          (a.estado === 'No Asiste' ||
            a.estadoAsistencia?.denominacion === 'No Asiste' ||
            a.estado === '50%' ||
            a.estadoAsistencia?.denominacion === '50%') &&
          (!a.SolicitudJustificacion ||
            a.SolicitudJustificacion.length === 0 ||
            a.SolicitudJustificacion.every(s =>
              s.estadoJustificacion?.denominacion === 'Rechazado' ||
              s.estadoJustificacion?.denominacion === 'No Justificado'
            ))
        );

        console.log('Faltas justificables encontradas:', faltas.length);
        setFaltasJustificables(faltas);

      } catch (error) {
        console.error('Error al cargar sesiones y asistencias:', error);
      }
    };

    if (session?.user?.id && matriculaId && gruposDelAlumno.length > 0) {
      cargarDatos();
    }
  }, [session?.user?.id, matriculaId, router, gruposDelAlumno]);

  return (
    <DashboardContainer roleName="Alumno">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {isLoading ? (
            <motion.div
              className="bg-white rounded-lg shadow-md p-8 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center flex flex-col items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200"></div>
                  <div
                    className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-blue-600"
                    style={{ animationDuration: '1s' }}
                  ></div>
                </div>
                <motion.p
                  className="mt-4 text-gray-600 text-base"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  Cargando información de asistencia...
                </motion.p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              className="bg-white rounded-lg shadow-md p-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center flex flex-col items-center max-w-lg mx-auto py-6">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                  <FaExclamationTriangle className="text-4xl text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ha ocurrido un error</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link
                  href="/alumno/dashboard"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-colors shadow-md flex items-center gap-2"
                >
                  <FaArrowLeft className="text-sm" />
                  Volver al dashboard
                </Link>
              </div>
            </motion.div>
          ) : matricula ? (
            <>
              {/* Encabezado de la asignatura */}
              <motion.div
                className="bg-white rounded-lg shadow-md mb-6 overflow-hidden"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-gradient-to-r from-[#0D3C68] via-[#164673] to-[#1a5590] px-6 py-6 text-white relative">
                  <div className="flex justify-between items-center">
                    <div>
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Link
                          href="/alumno/dashboard"
                          className="mb-3 flex items-center text-sm text-blue-100 hover:text-white transition-colors group"
                        >
                          <FaArrowLeft className="mr-1.5 group-hover:transform group-hover:-translate-x-1 transition-transform" />
                          Volver al dashboard
                        </Link>
                      </motion.div>
                      <motion.h2
                        className="text-2xl font-bold"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                      >
                        {matricula.asignatura.Denominacion}
                      </motion.h2>
                      <motion.p
                        className="text-blue-100 text-sm mt-2"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        {matricula.asignatura.carrera.denominacion} • {matricula.asignatura.Curso} Curso • {matricula.asignatura.Cuatrimestre}
                      </motion.p>
                    </div>
                    <motion.div
                      className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-white text-sm font-medium">
                        {matricula.asignatura.CodAsignatura}
                      </span>
                    </motion.div>
                  </div>

                  {/* Decorative line constrained to container */}
                  <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                      className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 py-4 rounded-lg shadow-sm flex items-center"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <div className="bg-blue-100 p-3 rounded-full mr-4">
                        <FaUserGraduate className="text-blue-600 text-lg" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase mb-1 tracking-wider">Profesor</p>
                        <p className="text-gray-800 font-medium">
                          {matricula.asignatura.user ?
                            `${matricula.asignatura.user.name || ''} ${matricula.asignatura.user.surname1 || ''} ${matricula.asignatura.user.surname2 || ''}`
                            : 'No asignado'}
                        </p>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-gradient-to-br from-gray-50 to-gray-100 px-5 py-4 rounded-lg shadow-sm"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    >
                      <p className="text-xs text-gray-500 uppercase mb-2 tracking-wider">Porcentaje de asistencia</p>
                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-bold ${matricula.totalSesiones && matricula.totalSesiones > 0
                          ? (matricula.porcentajeAsistencia !== undefined
                            ? matricula.porcentajeAsistencia >= 80
                              ? 'text-green-600'
                              : matricula.porcentajeAsistencia >= 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            : 'text-gray-800')
                          : 'text-gray-500'
                          }`}>
                          {matricula.totalSesiones && matricula.totalSesiones > 0
                            ? `${matricula.porcentajeAsistencia || 0}%`
                            : "N/A"}
                        </div>
                        <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(matricula.totalSesiones && matricula.totalSesiones > 0) ? (matricula.porcentajeAsistencia || 0) : 0}%`
                            }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className={`h-3 rounded-full ${matricula.totalSesiones && matricula.totalSesiones > 0
                              ? (matricula.porcentajeAsistencia !== undefined
                                ? matricula.porcentajeAsistencia >= 80
                                  ? 'bg-gradient-to-r from-green-400 to-green-600'
                                  : matricula.porcentajeAsistencia >= 50
                                    ? 'bg-gradient-to-r from-yellow-300 to-yellow-500'
                                    : 'bg-gradient-to-r from-red-400 to-red-600'
                                : 'bg-gray-300')
                              : 'bg-gray-300'
                              }`}
                          ></motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Gráfico de asistencia */}
                  <motion.div
                    className="mt-8 bg-white border border-gray-100 rounded-lg p-6 shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                      <FaChartPie className="mr-2 text-blue-600" />
                      Resumen de asistencia
                    </h3>
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                      <div className="w-full max-w-[450px] h-[400px] relative mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>                            {/* Definición de gradientes y efectos para mejorar la visualización */}
                            <defs>
                              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                              </linearGradient>
                              <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F87171" stopOpacity={1} />
                                <stop offset="100%" stopColor="#DC2626" stopOpacity={1} />
                              </linearGradient>
                              <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                                <stop offset="100%" stopColor="#EAB308" stopOpacity={1} />
                              </linearGradient>
                              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
                                <stop offset="100%" stopColor="#3B82F6" stopOpacity={1} />
                              </linearGradient>
                              <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
                                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={1} />
                              </linearGradient>
                              <filter id="pieChartShadow" height="200%">
                                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15" />
                              </filter>
                            </defs>

                            {/* Círculo decorativo de fondo */}
                            <circle
                              cx="50%"
                              cy="50%"
                              r="45%"
                              fill="none"
                              stroke="#f1f5f9"
                              strokeWidth={4}
                              strokeDasharray="2 4"
                            />                              <Pie
                              activeIndex={activeIndex}
                              activeShape={(props: unknown) => renderActiveShape(props as ActiveShapeProps)}
                              data={
                                // Asegurarse de que haya sesiones para mostrar y al menos una asistencia o falta
                                (matricula.totalSesiones && matricula.totalSesiones > 0 &&
                                  ((matricula.asistencias ?? 0) > 0 || (matricula.faltas ?? 0) > 0))
                                  ? [
                                    { name: 'Asistencias', value: matricula.asistencias || 0, fill: '#059669' },
                                    { name: 'Faltas', value: matricula.faltas || 0, fill: '#DC2626' },
                                  ]
                                  : [{ name: 'Sin sesiones', value: 1, fill: '#E2E8F0' }]
                              }
                              cx="50%"
                              cy="50%"
                              innerRadius={85}
                              outerRadius={120}
                              dataKey="value"
                              onMouseEnter={(_, index) => setActiveIndex(index)}
                              animationBegin={300}
                              animationDuration={1200}
                              animationEasing="ease-out"
                              isAnimationActive={true}
                              paddingAngle={4}
                              startAngle={90}
                              endAngle={-270}
                              cornerRadius={6}
                              stroke="#ffffff"
                              strokeWidth={3}
                              labelLine={false}
                            >
                              {((matricula.totalSesiones ?? 0) > 0)
                                ? <>
                                  <Cell key="asistencias" fill="url(#greenGradient)" />
                                  <Cell key="faltas" fill="url(#redGradient)" />
                                </>
                                : <Cell key="sin-sesiones" fill="#E2E8F0" />
                              }
                            </Pie>

                            <Tooltip
                              formatter={(value, name) => [`${value} ${name.toString().toLowerCase()}`, '']}
                              contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(255,255,255,0.97)',
                                fontSize: '14px',
                              }}
                              itemStyle={{ color: '#334155' }}
                              cursor={{ fill: 'transparent' }}
                            />                              <Legend
                              verticalAlign="bottom"
                              layout="horizontal"
                              iconSize={14}
                              iconType="circle"
                              wrapperStyle={{
                                paddingTop: '25px'
                              }} formatter={(value) => {
                                const color = value === 'Asistencias' ? '#059669' : value === 'Faltas' ? '#DC2626' : '#475569';
                                return <span style={{ color, fontSize: '16px', fontWeight: 500 }}>{value}</span>;
                              }}
                              content={() => {
                                // Definimos todos los estados posibles con sus colores respectivos
                                const estadosAsistencia = [
                                  { nombre: 'Asiste', color: '#059669' },
                                  { nombre: 'No Asiste', color: '#DC2626' },
                                  { nombre: '50%', color: '#EAB308' },
                                  { nombre: 'Justificada', color: '#3B82F6' },
                                  { nombre: 'Dispensado', color: '#8B5CF6' }
                                ];
                                return (
                                  <div className="flex flex-wrap justify-center mt-6 gap-x-6 gap-y-3">
                                    {estadosAsistencia.map((estado, index) => (
                                      <div
                                        key={`estado-${index}`}
                                        className="flex items-center px-2 py-1.5 rounded-md"
                                        style={{ backgroundColor: `${estado.color}15` }} // Color con opacidad baja (15%)
                                      >
                                        <div
                                          className="w-3 h-3 rounded-full mr-2"
                                          style={{ backgroundColor: estado.color }}
                                        />
                                        <span style={{ color: estado.color, fontSize: '13px', fontWeight: 600 }}>
                                          {estado.nombre}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex-1 w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <StatCard
                            title="Asistencias registradas"
                            value={matricula.asistencias || 0}
                            bgColor="bg-gradient-to-br from-green-50 to-green-100"
                            textColor="text-green-800"
                            icon={FaCheck}
                          />
                          <StatCard
                            title="Faltas"
                            value={matricula.faltas || 0}
                            bgColor="bg-gradient-to-br from-red-50 to-red-100"
                            textColor="text-red-800"
                            icon={FaTimes}
                          />
                          <StatCard
                            title="Total de sesiones"
                            value={matricula.totalSesiones || 0}
                            bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
                            textColor="text-blue-800"
                            icon={FaClock}
                          />
                          <StatCard
                            title="Faltas justificables"
                            value={faltasJustificables.length}
                            bgColor="bg-gradient-to-br from-yellow-50 to-yellow-100"
                            textColor="text-yellow-800"
                            icon={FaFileAlt}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Listado de todas las sesiones */}
              <motion.div
                className="bg-white rounded-lg shadow-md mb-8 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 px-6 py-5 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FaCalendarCheck className="text-blue-600 mr-3" />
                    Sesiones y asistencias
                  </h3>
                </div>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white rounded-lg">
                      <thead>
                        <tr className="bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200">
                          <th className="px-6 py-3 rounded-tl-lg">Fecha</th>
                          <th className="px-6 py-3">Grupo</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3 rounded-tr-lg">Justificación</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {sesionesAlumno.length > 0 ? (
                          sesionesAlumno.map((asistencia) => (
                            <tr key={asistencia.id} className="hover:bg-blue-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="bg-blue-100 rounded-full p-1.5 mr-3">
                                    <FaCalendarCheck className="text-blue-600 text-xs" />
                                  </div>
                                  <span className="font-medium text-gray-700">
                                    {new Date(asistencia.sesionClase.fecha).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs">
                                  {asistencia.sesionClase.grupo.denominacion}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5
                                  ${asistencia.estado === 'Asiste' || asistencia.estadoAsistencia?.denominacion === 'Asiste'
                                    ? 'bg-green-100 text-green-800'
                                    : asistencia.estado === '50%' || asistencia.estadoAsistencia?.denominacion === '50%'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'}`}>
                                  {asistencia.estado === 'Asiste' || asistencia.estadoAsistencia?.denominacion === 'Asiste'
                                    ? <FaCheck className="text-xs" />
                                    : <FaTimes className="text-xs" />
                                  }                                  {asistencia.estadoAsistencia?.denominacion || asistencia.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {asistencia.SolicitudJustificacion && asistencia.SolicitudJustificacion.length > 0 ? (
                                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs ${asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Pendiente')
                                    ? 'bg-blue-100 text-blue-800'
                                    : asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Justificado')
                                      ? 'bg-green-100 text-green-800'
                                      : asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Rechazado' || s.estadoJustificacion?.denominacion === 'No Justificado')
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    <FaFileAlt className="mr-1.5 text-xs" />
                                    {asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Pendiente')
                                      ? 'Pendiente'
                                      : asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Justificado')
                                        ? 'Justificada'
                                        : asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'Rechazado')
                                          ? 'Rechazada'
                                          : asistencia.SolicitudJustificacion.some(s => s.estadoJustificacion?.denominacion === 'No Justificado')
                                            ? 'No Justificada'
                                            : 'Justificación enviada'}
                                  </span>
                                ) : (asistencia.estado === 'No Asiste' ||
                                  asistencia.estadoAsistencia?.denominacion === 'No Asiste' ||
                                  asistencia.estado === '50%' ||
                                  asistencia.estadoAsistencia?.denominacion === '50%') &&
                                  (() => {
                                    const configCarrera = configuracionesCarrera.find(c => c.carreraId === matricula.asignatura.carrera.id);
                                    return configCarrera?.SolJustificacion;
                                  })() ? (
                                  <Link
                                    href={`/alumno/justificar?asistenciaId=${asistencia.id}`}
                                    className="inline-flex items-center px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 rounded-full text-xs transition-colors"
                                  >
                                    <FaFileAlt className="mr-1.5 text-xs" />
                                    Justificar falta
                                  </Link>
                                ) : null}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center">
                              <div className="flex flex-col items-center">
                                <FaInfoCircle className="text-3xl text-gray-300 mb-3" />
                                <p className="text-gray-500">No hay sesiones registradas para esta asignatura.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              className="bg-white rounded-lg shadow-md p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center p-8 flex flex-col items-center max-w-md mx-auto">
                <motion.div
                  className="bg-blue-50 p-5 rounded-full mb-5"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <FaInfoCircle className="text-5xl text-blue-400" />
                </motion.div>
                <motion.h2
                  className="text-2xl font-semibold text-gray-700 mb-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Información no disponible
                </motion.h2>
                <motion.p
                  className="text-gray-500 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  No se pudo encontrar la información de la matrícula solicitada.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link
                    href="/alumno/dashboard"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 transition-colors shadow-md flex items-center gap-2"
                  >
                    <FaArrowLeft className="text-sm" />
                    Volver al dashboard
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
