'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {  FaBook,
  FaArrowLeft,
  FaSearch,
  FaCalendarAlt,
  FaEdit,
  FaSortAmountDown,
  FaSortAmountUp,
  FaEye,
  FaUserFriends,
  FaUserGraduate,
  FaChevronDown,
} from 'react-icons/fa';

// Interfaces para el tipado
interface Asignatura {
  id: string;
  CodAsignatura: string;
  Denominacion: string;
  Curso: string;
  Cuatrimestre: string;
  carrera: {
    denominacion: string;
  };
}

interface Grupo {
  id: string;
  denominacion: string;
  profesorId: string;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  docenteId: string;
  grupo: Grupo;
  asistencias: Asistencia[];
  estadisticas?: {
    total: number;
    asisten: number;
    noAsisten: number;
    parcial: number;
    otros: number;
    porcentajeAsistencia: number;
  };
}

// Interfaz para datos de usuario/alumno
interface AlumnoData {
  name?: string;
  surname1?: string;
  surname2?: string;
  id?: string;
  email?: string;
}

interface Asistencia {
  id: string;
  fecha: string;
  alumnoId: string;
  sesionClaseId: string;
  estadoAsistenciaId: string;
  estado: string;
  alumno?: {
    name: string;
    surname1: string;
    surname2: string;
  };
  user?: {
    id: string;
    name: string;
    surname1: string;
    surname2: string;
    email: string;
  };
  estadoAsistencia?: {
    id: string;
    denominacion: string;
  };
  solicitudesJustificacion?: Array<{
    id: string;
    estadoJustificacionId: string;
    observaciones?: string;
  }>;
}

interface EstadisticasSesion {
  total: number;
  asisten: number;
  noAsisten: number;
  parcial: number;
  otros: number;
  porcentajeAsistencia: number;
}

// Estilos personalizados para las animaciones
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
  }
`;

export default function HistorialSesiones() {  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const asignaturaId = searchParams.get('asignatura');

  const [asignatura, setAsignatura] = useState<Asignatura | null>(null);
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionClase | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });  const [modalVisible, setModalVisible] = useState(false);
  const [estadisticas, setEstadisticas] = useState<{ [key: string]: EstadisticasSesion }>({});

  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Obtener detalles de la asignatura
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

        if (gruposFiltrados.length > 0) {
          // Consultar sesiones para todos los grupos del profesor
          const gruposIds = gruposFiltrados.map((grupo: Grupo) => grupo.id);
          const sesionesPorGrupo = await Promise.all(
            gruposIds.map(async (grupoId: string) => {
              const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupoId}`, {
                credentials: 'include'
              });

              if (!sesionesResponse.ok) {
                console.error(`Error al cargar sesiones para el grupo ${grupoId}`);
                return [];
              }

              const sesionesData = await sesionesResponse.json();
              return sesionesData;
            })
          );

          // Unir todas las sesiones y ordenarlas por fecha descendente
          const todasSesiones = sesionesPorGrupo.flat();
          const sesionesConEstadisticas = await Promise.all(
            todasSesiones.map(async (sesion: SesionClase) => {
              // Cargar asistencias para cada sesión
              const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
                credentials: 'include'
              });

              if (!asistenciasResponse.ok) {
                console.error(`Error al cargar asistencias para la sesión ${sesion.id}`);
                return { ...sesion, asistencias: [] };
              }
              const asistenciasData = await asistenciasResponse.json();
              
              console.log(`Asistencias encontradas: ${asistenciasData.length}`);
                // Comprobar solicitudes de justificación (manera segura)
              const conSolicitudes = asistenciasData.filter((a: Asistencia) => 
                Array.isArray(a.solicitudesJustificacion) && a.solicitudesJustificacion.length > 0);              
              const conSolicitudesPendientes = asistenciasData.filter((a: Asistencia) => 
                Array.isArray(a.solicitudesJustificacion) && 
                a.solicitudesJustificacion.some((s: {estadoJustificacionId: string}) => s.estadoJustificacionId === 'pendiente'));
                
              console.log(`Con solicitudes: ${conSolicitudes.length}`);
              console.log(`Con solicitudes pendientes: ${conSolicitudesPendientes.length}`);

              // Comprobar si hay alumnos con datos incompletos y registrarlo en consola
              const alumnosIncompletos = asistenciasData.filter((a: Asistencia) => !a.alumno || !a.alumno.name);
              if (alumnosIncompletos.length > 0) {
                console.warn(`Sesión ${sesion.id} tiene ${alumnosIncompletos.length} alumnos con datos incompletos:`, alumnosIncompletos);
              }

              // Calcular estadísticas de asistencia
              const total = asistenciasData.length;
              const asisten = asistenciasData.filter((a: Asistencia) => a.estado === 'Asiste').length;
              const noAsisten = asistenciasData.filter((a: Asistencia) => a.estado === 'No Asiste').length;
              const parcial = asistenciasData.filter((a: Asistencia) => a.estado === '50%').length;
              const otros = total - asisten - noAsisten - parcial;
              const porcentajeAsistencia = total > 0 ? (asisten + parcial * 0.5) / total * 100 : 0;

              // Guardar estadísticas sin invocar el setter dentro del useEffect
              return { 
                ...sesion, 
                asistencias: asistenciasData,
                estadisticas: {
                  total,
                  asisten,
                  noAsisten,
                  parcial,
                  otros,
                  porcentajeAsistencia
                }
              };
            })
          );
            // Actualizar estadísticas en un solo paso después de procesar todas las sesiones
          const nuevoEstadisticas: { [key: string]: EstadisticasSesion } = {};          sesionesConEstadisticas.forEach((sesion: SesionClase & {estadisticas?: EstadisticasSesion}) => {
            if (sesion && sesion.id && sesion.estadisticas) {
              nuevoEstadisticas[sesion.id] = sesion.estadisticas;
              // Usar una variable temporal para la eliminación segura
              const sesionTemp = sesion as {estadisticas?: EstadisticasSesion};
              delete sesionTemp.estadisticas;
            }
          });
          setEstadisticas(nuevoEstadisticas);
          setSesiones(sesionesConEstadisticas);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [asignaturaId, session?.user?.id]);

  // Formatear la fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return 'Fecha no disponible';
    const fecha = new Date(fechaStr);
    return format(fecha, "d 'de' MMMM 'de' yyyy", { locale: es });
  };

  // Formatear la hora para mostrar
  const formatearHora = (fechaStr: string) => {
    if (!fechaStr) return 'Hora no disponible';
    const fecha = new Date(fechaStr);
    return format(fecha, "HH:mm", { locale: es });
  };

  // Filtrar sesiones por grupo y término de búsqueda
  const sesionesFiltradas = sesiones
    .filter(sesion =>
      grupoSeleccionado === 'todos' || sesion.grupoId === grupoSeleccionado
    )
    .filter(sesion => {
      const fechaFormateada = formatearFecha(sesion.fecha);
      const horaFormateada = formatearHora(sesion.fecha);
      const grupoNombre = sesion.grupo?.denominacion || '';

      return (
        fechaFormateada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        horaFormateada.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grupoNombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

  // Ordenar las sesiones
  const sortedSesiones = [...sesionesFiltradas].sort((a, b) => {
    const sortValue = sortConfig.key === 'fecha'
      ? new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      : (estadisticas[a.id]?.porcentajeAsistencia || 0) - (estadisticas[b.id]?.porcentajeAsistencia || 0);

    return sortConfig.direction === 'asc' ? sortValue : -sortValue;
  });

  // Cambiar el orden de las sesiones
  const requestSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  // Ver detalles de una sesión
  const verDetallesSesion = async (sesion: SesionClase) => {
    // Obtener los datos actualizados de asistencias para esta sesión
    try {
      const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
        credentials: 'include'
      });

      if (asistenciasResponse.ok) {
        const asistenciasData = await asistenciasResponse.json();
        console.log("Asistencias cargadas para detalle:", asistenciasData);

        // Actualizar la sesión con los datos frescos
        const sesionActualizada = { ...sesion, asistencias: asistenciasData };
        setSesionSeleccionada(sesionActualizada);
      } else {
        // Si hay error, usar los datos que ya tenemos
        console.error("Error al cargar asistencias frescas para detalle");
        setSesionSeleccionada(sesion);
      }
    } catch (error) {
      console.error("Error al cargar asistencias para detalle:", error);
      setSesionSeleccionada(sesion);
    }

    setModalVisible(true);
  };
  // Las funciones de eliminación han sido removidas
  // Estados para el modal de edición
  const [modalEdicionVisible, setModalEdicionVisible] = useState(false);
  const [sesionParaEditar, setSesionParaEditar] = useState<SesionClase | null>(null);
  const [asistenciasEdicion, setAsistenciasEdicion] = useState<Asistencia[]>([]);
  const [estadosModificados, setEstadosModificados] = useState<{ [key: string]: string }>({});
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [searchAsistencias, setSearchAsistencias] = useState('');
  // Abrir modal de edición de sesión
  const editarSesion = async (sesionId: string) => {
    // Buscar la sesión seleccionada
    const sesion = sesiones.find(s => s.id === sesionId);
    if (!sesion) return;

    // Volver a cargar las asistencias frescas desde el API
    try {
      const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesionId}`, {
        credentials: 'include'
      });

      if (asistenciasResponse.ok) {
        const asistenciasData = await asistenciasResponse.json();
        console.log("Datos de asistencias cargados:", asistenciasData);

        // Actualizar la sesión con las asistencias actualizadas
        const sesionActualizada = { ...sesion, asistencias: asistenciasData };
        setSesionParaEditar(sesionActualizada);
        setAsistenciasEdicion(asistenciasData || []);
      } else {
        // Si hay error, usar los datos que ya tenemos
        console.error("Error al refrescar asistencias, usando datos existentes.");
        setSesionParaEditar(sesion);
        setAsistenciasEdicion(sesion.asistencias || []);
      }
    } catch (error) {
      console.error("Error al cargar asistencias:", error);
      setSesionParaEditar(sesion);
      setAsistenciasEdicion(sesion.asistencias || []);
    }    // Inicializar el estado de las asistencias para edición
    const estadosIniciales: { [key: string]: string } = {};
    if (sesion.asistencias) {
      sesion.asistencias.forEach(asistencia => {
        // Usar cualquiera de los dos campos de estado disponibles
        estadosIniciales[asistencia.id] = asistencia.estado || (asistencia.estadoAsistencia?.denominacion || 'Sin registro');
      });
    }
    setEstadosModificados(estadosIniciales);

    setModalEdicionVisible(true);
  };
  // Cambiar estado de asistencia en edición
  const cambiarEstadoAsistencia = (asistenciaId: string) => {
    const estados = ["Asiste", "No Asiste", "50%"];
    const estadoActual = estadosModificados[asistenciaId] || "Asiste";
    const indexActual = estados.indexOf(estadoActual);
    const nuevoIndex = (indexActual + 1) % estados.length;

    setEstadosModificados({
      ...estadosModificados,
      [asistenciaId]: estados[nuevoIndex]
    });
  };  // Guardar cambios de asistencia
  const guardarCambiosAsistencia = async () => {
    if (!sesionParaEditar) return;

    try {
      setGuardandoCambios(true);

      // Hacer las peticiones para actualizar cada asistencia modificada
      const promesasActualizacion = Object.entries(estadosModificados).map(async ([asistenciaId, nuevoEstado]) => {
        const asistencia = asistenciasEdicion.find(a => a.id === asistenciaId);        // Solo actualizar si el estado ha cambiado
        const estadoActual = asistencia?.estado || asistencia?.estadoAsistencia?.denominacion || 'Sin registro';
        if (asistencia && estadoActual !== nuevoEstado) {
          console.log(`Actualizando asistencia ${asistenciaId} - Estado actual: ${estadoActual}, Nuevo estado: ${nuevoEstado}`);

          // Consultar los estados de asistencia para obtener el ID correspondiente
          const estadosResponse = await fetch(`/api/estados-asistencia`, {
            credentials: 'include'
          });

          if (!estadosResponse.ok) {
            throw new Error('No se pudieron obtener los estados de asistencia');
          } const estadosData = await estadosResponse.json();          // Buscar el objeto de estado por nombre o denominación
          interface EstadoAsistencia {
            id: string;
            nombre?: string;
            denominacion?: string;
          }
          
          const estadoObj = estadosData.find((e: EstadoAsistencia) =>
            e.nombre === nuevoEstado || e.denominacion === nuevoEstado
          );

          if (!estadoObj) {
            console.error(`Estado no encontrado: ${nuevoEstado} en:`, estadosData);
            throw new Error(`Estado de asistencia no encontrado: ${nuevoEstado}`);
          } const response = await fetch(`/api/asistencias-alumno/${asistenciaId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              estado: nuevoEstado,
              estadoAsistenciaId: estadoObj.id, // Agregar el ID del estado
              fecha: asistencia.fecha, // Incluir fecha original
              sesionClaseId: asistencia.sesionClaseId, // Incluir ID de sesión
              alumnoId: asistencia.alumnoId // Incluir ID de alumno
            }),
            cache: 'no-store' // Asegurar que no se use caché
          });

          if (!response.ok) {
            const errorResponse = await response.text();
            console.error(`Error en respuesta API: ${errorResponse}`);
            throw new Error(`Error al actualizar la asistencia ${asistenciaId}`);
          }

          const updatedData = await response.json();
          return {
            id: asistenciaId,
            data: updatedData
          };
        }
        return null;
      });

      const resultados = await Promise.all(promesasActualizacion);
      console.log("Resultados de actualizaciones:", resultados);

      // Verificar que todas las actualizaciones se realizaron correctamente
      if (resultados.every(r => r === null || r !== undefined)) {
        // Mostrar mensaje de éxito
        setError(null);        // Inmediatamente actualizar la UI con los datos actualizados
        const nuevasAsistencias: Asistencia[] = [...asistenciasEdicion].map(asistencia => {
          const nuevoEstado = estadosModificados[asistencia.id];
          if (nuevoEstado && asistencia.estado !== nuevoEstado) {
            // Asegurarnos de que mantenemos la estructura correcta de Asistencia
            return { 
              ...asistencia, 
              estado: nuevoEstado,
              estadoAsistencia: asistencia.estadoAsistencia 
                ? {
                    id: asistencia.estadoAsistenciaId,
                    denominacion: nuevoEstado
                  }
                : {
                    id: asistencia.estadoAsistenciaId,
                    denominacion: nuevoEstado
                  }
            } as Asistencia;
          }
          return asistencia;
        });
        
        // Actualizar sesionParaEditar localmente con datos actualizados
        setSesionParaEditar((prevSesion: SesionClase | null): SesionClase | null => {
          if (!prevSesion) return null;
          return { ...prevSesion, asistencias: nuevasAsistencias } as SesionClase;
        });

        // Actualizar asistenciasEdicion con los datos actualizados
        setAsistenciasEdicion(nuevasAsistencias);

        // Después de actualizar localmente, refrescar datos del servidor
        try {
          // Cargar datos actualizados de sesión con caché deshabilitada
          const timestamp = new Date().getTime(); // Para invalidar la caché del navegador
          const sesionesActualizadasResponse = await fetch(`/api/sesiones-clase?grupoId=${sesionParaEditar.grupoId}&t=${timestamp}`, {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
            }
          });

          if (sesionesActualizadasResponse.ok) {
            const sesionesActualizadas = await sesionesActualizadasResponse.json();
            const sesionActualizada = sesionesActualizadas.find((s: SesionClase) => s.id === sesionParaEditar.id);

            if (sesionActualizada) {
              // Cargar asistencias actualizadas forzando refresco de cache
              const asistenciasResponse = await fetch(`/api/asistencias-alumno?sesionClaseId=${sesionParaEditar.id}&t=${timestamp}`, {
                credentials: 'include',
                cache: 'no-store',
                headers: {
                  'Pragma': 'no-cache',
                  'Cache-Control': 'no-cache'
                }
              });

              if (asistenciasResponse.ok) {
                const asistenciasActualizadas = await asistenciasResponse.json();
                console.log("Asistencias actualizadas recibidas:", asistenciasActualizadas);                // Verificar si hay datos de alumnos completos
                const datosIncompletos = asistenciasActualizadas.filter((a: Asistencia) => !a.alumno && !a.user);
                if (datosIncompletos.length > 0) {
                  console.warn(`Se encontraron ${datosIncompletos.length} registros con datos incompletos:`, datosIncompletos);
                }

                // Actualizar la sesión con los datos frescos
                const sesionCompletaActualizada = { ...sesionActualizada, asistencias: asistenciasActualizadas };                // Actualizar la lista de sesiones
                const nuevasSesiones = sesiones.map(s =>
                  s.id === sesionParaEditar.id ? sesionCompletaActualizada as SesionClase : s
                );
                setSesiones(nuevasSesiones);
                  // Actualizar la sesionSeleccionada si está visible el modal de detalles
                if (modalVisible && sesionSeleccionada && sesionSeleccionada.id === sesionParaEditar.id) {
                  setSesionSeleccionada(sesionCompletaActualizada as SesionClase);
                }
                
                // Recalcular estadísticas
                if (sesionCompletaActualizada.asistencias) {
                  const total = sesionCompletaActualizada.asistencias.length;
                  const asisten = sesionCompletaActualizada.asistencias.filter((a: Asistencia) => a.estado === 'Asiste').length;
                  const noAsisten = sesionCompletaActualizada.asistencias.filter((a: Asistencia) => a.estado === 'No Asiste').length;
                  const parcial = sesionCompletaActualizada.asistencias.filter((a: Asistencia) => a.estado === '50%').length;
                  const otros = total - asisten - noAsisten - parcial;
                  const porcentajeAsistencia = total > 0 ? (asisten + parcial * 0.5) / total * 100 : 0;

                  setEstadisticas(prev => ({
                    ...prev,
                    [sesionCompletaActualizada.id]: {
                      total,
                      asisten,
                      noAsisten,
                      parcial,
                      otros,
                      porcentajeAsistencia
                    }
                  }));
                }
              }
            }
          }
        } catch (error) {
          console.error("Error al refrescar datos después de guardar:", error);
          // Si falla el refresco, usamos los datos que tenemos
          const sesionActualizada = { ...sesionParaEditar, asistencias: nuevasAsistencias };
          const nuevasSesiones = sesiones.map(s =>
            s.id === sesionParaEditar.id ? sesionActualizada : s
          );
          setSesiones(nuevasSesiones);
        }

        // Cerrar el modal de edición
        setModalEdicionVisible(false);
      } else {
        throw new Error('Algunas actualizaciones no pudieron completarse');
      }
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      setError(`Error al guardar los cambios: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setGuardandoCambios(false);
    }
  };
  // Obtener clase para el porcentaje de asistencia
  const getPorcentajeClass = (porcentaje: number) => {
    if (porcentaje >= 80) return 'text-green-600 font-semibold';
    if (porcentaje >= 50) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  // Obtener clase para el estado de asistencia
  const getEstadoAsistenciaClass = (estado: string) => {
    switch (estado) {
      case 'Asiste':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'No Asiste':
        return 'bg-red-100 text-red-800 border-red-200';
      case '50%':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Dispensado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Erasmus T':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Erasmus NT':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  return (
    <DashboardContainer roleName="Profesor">
      <style jsx global>{animationStyles}</style>
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
                      <FaBook className="mr-3" />
                      Historial de Sesiones
                    </h1>
                  </div>
                  {asignatura && (
                    <p className="text-blue-100 mt-1">
                      {asignatura.Denominacion} - {asignatura.carrera?.denominacion || ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
                <Link href="/profesor/dashboard" className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] transition-colors">
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                      <FaCalendarAlt className="text-[#0D3C68]" />
                    </div>
                    <div>
                      <span className="text-gray-900">Historial de Sesiones</span>
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        Gestiona tus sesiones de clase y registros de asistencia
                      </div>
                    </div>
                  </h2>
                  <div className="flex flex-wrap sm:flex-nowrap gap-3">
                    <Link
                      href={`/profesor/pasar-clase?asignatura=${asignaturaId}`}
                      className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] flex items-center justify-center transition-colors shadow-sm"
                    >
                      <FaCalendarAlt className="mr-2" />
                      Nueva Sesión
                    </Link>
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100">                  {/* Selector de grupo */}
                  <div className="flex items-center">
                    <div className="text-[#0D3C68] mr-2">
                      <FaUserFriends className="w-5 h-5" />
                    </div>
                    <div className="w-full">
                      <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 mb-1">
                        Filtrar por Grupo
                      </label>
                      <div className="relative">
                        <select
                          id="grupo"
                          value={grupoSeleccionado}
                          onChange={(e) => setGrupoSeleccionado(e.target.value)}
                          className="w-full appearance-none pl-3 pr-10 py-2.5 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-700"
                        >
                          <option value="todos">Todos los grupos</option>
                          {grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              {grupo.denominacion}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <FaChevronDown className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="flex items-center">
                    <div className="text-[#0D3C68] mr-2">
                      <FaSearch className="w-5 h-5" />
                    </div>
                    <div className="w-full">
                      <label htmlFor="buscar" className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar Sesión
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaSearch className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="buscar"
                          placeholder="Buscar por fecha, hora o grupo..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>              {/* Lista de sesiones */}
              <div className="p-5">
                {/* Panel de resumen de sesiones */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-600 uppercase font-semibold">Total Sesiones</p>
                        <p className="text-2xl font-bold text-gray-800">{sortedSesiones.length}</p>
                      </div>
                      <div className="bg-blue-200 p-2 rounded-full">
                        <FaCalendarAlt className="h-5 w-5 text-blue-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-600 uppercase font-semibold">Media Asistencia</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {sortedSesiones.length > 0
                            ? (Object.values(estadisticas).reduce((sum, stats) => sum + stats.porcentajeAsistencia, 0) / sortedSesiones.length).toFixed(1)
                            : "0"}%
                        </p>
                      </div>
                      <div className="bg-green-200 p-2 rounded-full">
                        <FaUserGraduate className="h-5 w-5 text-green-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-purple-600 uppercase font-semibold">Última Sesión</p>
                        <p className="text-base font-bold text-gray-800">
                          {sortedSesiones.length > 0 ? formatearFecha(sortedSesiones[0].fecha).split(' de ').slice(0, 2).join(' de ') : "N/A"}
                        </p>
                      </div>
                      <div className="bg-purple-200 p-2 rounded-full">
                        <FaCalendarAlt className="h-5 w-5 text-purple-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {sortedSesiones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-lg shadow-sm">
                    <div className="bg-blue-50 rounded-full p-6 mb-4 animate-pulse">
                      <FaCalendarAlt className="text-blue-300 text-5xl" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay sesiones registradas</h3>
                    <p className="text-gray-600 mb-6 text-center max-w-md">
                      Todavía no se han registrado sesiones de clase para esta asignatura.
                      Para poder visualizar el historial, primero necesitas registrar alguna sesión.
                    </p>
                    <Link
                      href={`/profesor/pasar-clase?asignatura=${asignaturaId}`}
                      className="mt-2 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md shadow-md hover:shadow-lg transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      Registrar nueva sesión
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/80">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-gray-700">Historial de sesiones</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span className="hidden sm:inline">Ordenar por:</span>
                          <button
                            onClick={() => requestSort('fecha')}
                            className={`px-2 py-1 rounded ${sortConfig.key === 'fecha' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                          >
                            <div className="flex items-center">
                              <span>Fecha</span>
                              {sortConfig.key === 'fecha' && (
                                sortConfig.direction === 'asc' ?
                                  <FaSortAmountUp className="ml-1 h-3 w-3" /> :
                                  <FaSortAmountDown className="ml-1 h-3 w-3" />
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => requestSort('porcentaje')}
                            className={`px-2 py-1 rounded ${sortConfig.key === 'porcentaje' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                          >
                            <div className="flex items-center">
                              <span>Asistencia</span>
                              {sortConfig.key === 'porcentaje' && (
                                sortConfig.direction === 'asc' ?
                                  <FaSortAmountUp className="ml-1 h-3 w-3" /> :
                                  <FaSortAmountDown className="ml-1 h-3 w-3" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha/Hora
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Grupo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Asistencia
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">{sortedSesiones.map((sesion, index) => {
                          const stats = estadisticas[sesion.id] || {
                            total: 0,
                            asisten: 0,
                            noAsisten: 0,
                            parcial: 0,
                            otros: 0,
                            porcentajeAsistencia: 0
                          };

                          return (
                            <tr key={sesion.id} className={index % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'} style={{ transition: "all 0.2s" }}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 mr-3 hidden sm:flex">
                                    <FaCalendarAlt />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {formatearFecha(sesion.fecha)}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center">
                                      <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {formatearHora(sesion.fecha)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900 py-1 px-3 bg-gray-100 rounded-full">
                                    {sesion.grupo?.denominacion || 'Grupo no disponible'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <div className="hidden md:block">
                                    <div
                                      className={`w-2 h-8 rounded-full ${stats.porcentajeAsistencia >= 80 ? 'bg-green-500' :
                                        stats.porcentajeAsistencia >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    ></div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm mb-1 space-x-1">
                                      <span className={getPorcentajeClass(stats.porcentajeAsistencia)}>
                                        {stats.porcentajeAsistencia.toFixed(1)}%
                                      </span>
                                      <span className="text-gray-500">
                                        ({stats.asisten} / {stats.total})
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${stats.porcentajeAsistencia >= 80 ? 'bg-green-500' :
                                          stats.porcentajeAsistencia >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                        style={{ width: `${Math.min(100, stats.porcentajeAsistencia)}%`, transition: "width 1s ease-in-out" }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex justify-center space-x-1">
                                  <button
                                    onClick={() => verDetallesSesion(sesion)}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition-colors p-2 rounded-full"
                                    title="Ver detalles"
                                  >
                                    <FaEye />
                                  </button>
                                  <button
                                    onClick={() => editarSesion(sesion.id)}
                                    className="text-green-600 hover:text-green-800 hover:bg-green-100 transition-colors p-2 rounded-full"
                                    title="Editar sesión"
                                  >
                                    <FaEdit />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/80 text-center text-sm text-gray-500">
                      Mostrando {sortedSesiones.length} {sortedSesiones.length === 1 ? 'sesión' : 'sesiones'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>      {/* Modal de detalles de sesión */}
      {modalVisible && sesionSeleccionada && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalVisible(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] p-5 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  Detalles de la Sesión
                </h3>
                <button
                  onClick={() => setModalVisible(false)}
                  className="text-white hover:text-blue-200 transition-colors rounded-full hover:bg-white/10 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* Información principal de la sesión */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 flex items-center">
                  <div className="bg-blue-100 rounded-full p-3 mr-3">
                    <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 uppercase font-medium">Fecha</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formatearFecha(sesionSeleccionada.fecha)}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-lg p-4 flex items-center">
                  <div className="bg-indigo-100 rounded-full p-3 mr-3">
                    <svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 uppercase font-medium">Hora</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{formatearHora(sesionSeleccionada.fecha)}</p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 flex items-center">
                  <div className="bg-green-100 rounded-full p-3 mr-3">
                    <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 uppercase font-medium">Grupo</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{sesionSeleccionada.grupo?.denominacion || 'Grupo no disponible'}</p>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 flex items-center">
                  <div className="bg-purple-100 rounded-full p-3 mr-3">
                    <svg className="w-6 h-6 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 uppercase font-medium">Asistencia</p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      <span className={`${getPorcentajeClass(estadisticas[sesionSeleccionada.id]?.porcentajeAsistencia || 0)}`}>
                        {(estadisticas[sesionSeleccionada.id]?.porcentajeAsistencia || 0).toFixed(1)}%
                      </span>{" "}
                      ({estadisticas[sesionSeleccionada.id]?.asisten || 0}/{estadisticas[sesionSeleccionada.id]?.total || 0} alumnos)
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel de estadísticas visual */}
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Resumen de Asistencias
                </h4>
                <div className="flex flex-wrap items-center justify-around gap-3">
                  <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Total</div>
                    <div className="text-xl font-bold">{estadisticas[sesionSeleccionada.id]?.total || 0}</div>
                  </div>
                  <div className="flex flex-col items-center bg-green-50 p-3 rounded-lg shadow-sm border border-green-100">
                    <div className="text-sm font-medium text-green-700">Asisten</div>
                    <div className="text-xl font-bold text-green-800">{estadisticas[sesionSeleccionada.id]?.asisten || 0}</div>
                  </div>
                  <div className="flex flex-col items-center bg-red-50 p-3 rounded-lg shadow-sm border border-red-100">
                    <div className="text-sm font-medium text-red-700">No Asisten</div>
                    <div className="text-xl font-bold text-red-800">{estadisticas[sesionSeleccionada.id]?.noAsisten || 0}</div>
                  </div>
                  <div className="flex flex-col items-center bg-yellow-50 p-3 rounded-lg shadow-sm border border-yellow-100">
                    <div className="text-sm font-medium text-yellow-700">Parcial (50%)</div>
                    <div className="text-xl font-bold text-yellow-800">{estadisticas[sesionSeleccionada.id]?.parcial || 0}</div>
                  </div>
                  <div className="flex flex-col items-center bg-blue-50 p-3 rounded-lg shadow-sm border border-blue-100">
                    <div className="text-sm font-medium text-blue-700">Otros</div>
                    <div className="text-xl font-bold text-blue-800">{estadisticas[sesionSeleccionada.id]?.otros || 0}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(estadisticas[sesionSeleccionada.id]?.asisten || 0) / (estadisticas[sesionSeleccionada.id]?.total || 1) * 100}%`, float: "left" }}></div>
                    <div className="h-full bg-yellow-500" style={{ width: `${(estadisticas[sesionSeleccionada.id]?.parcial || 0) / (estadisticas[sesionSeleccionada.id]?.total || 1) * 100}%`, float: "left" }}></div>
                    <div className="h-full bg-red-500" style={{ width: `${(estadisticas[sesionSeleccionada.id]?.noAsisten || 0) / (estadisticas[sesionSeleccionada.id]?.total || 1) * 100}%`, float: "left" }}></div>
                    <div className="h-full bg-blue-500" style={{ width: `${(estadisticas[sesionSeleccionada.id]?.otros || 0) / (estadisticas[sesionSeleccionada.id]?.total || 1) * 100}%`, float: "left" }}></div>
                  </div>
                </div>
              </div>

              {/* Lista de asistencias */}
              <div className="overflow-x-auto mb-5 border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-semibold text-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Detalle de Asistencias
                  </h4>
                  <div className="text-xs text-gray-500">
                    {sesionSeleccionada.asistencias?.length || 0} registros
                  </div>
                </div>
                {sesionSeleccionada.asistencias && sesionSeleccionada.asistencias.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alumno
                        </th>
                        <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">{sesionSeleccionada.asistencias.sort((a, b) => {
                      // Acceder tanto a alumno como a user
                      const alumnoA: AlumnoData = a.alumno || a.user || {};
                      const alumnoB: AlumnoData = b.alumno || b.user || {};
                      const apellidoA = alumnoA.surname1 || '';
                      const apellidoB = alumnoB.surname1 || '';
                      return apellidoA.localeCompare(apellidoB);
                    }).map((asistencia) => {
                      // Manejar correctamente el caso donde alumno podría ser undefined
                      const alumnoData: AlumnoData = asistencia.alumno || asistencia.user || {};
                      let nombreCompleto = [
                        alumnoData.surname1 || '',
                        alumnoData.surname2 || '',
                        alumnoData.name || ''
                      ].filter(Boolean).join(' ');

                      // Si después de filtrar y unir sigue vacío, esto indica que no hay datos de nombre
                      nombreCompleto = nombreCompleto.trim();

                      return (
                        <tr key={asistencia.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 mr-3">
                                <FaUserGraduate />
                              </div>
                              <span>{nombreCompleto ? nombreCompleto : 'Alumno no disponible'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoAsistenciaClass(asistencia.estado || (asistencia.estadoAsistencia?.denominacion || 'Sin registro'))}`}>
                              {asistencia.estado || (asistencia.estadoAsistencia?.denominacion || 'Sin registro')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">No hay registros de asistencia para esta sesión</p>
                  </div>
                )}
              </div>              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setModalVisible(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setModalVisible(false);
                    editarSesion(sesionSeleccionada.id);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md hover:from-[#0a325a] hover:to-[#174879] transition-colors shadow-sm flex items-center"
                >
                  <FaEdit className="mr-2" />
                  Editar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>      )}      {/* Modal de edición de asistencias */}
      {modalEdicionVisible && sesionParaEditar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setModalEdicionVisible(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] p-5 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center">
                  <FaEdit className="mr-2" />
                  Editar Registros de Asistencia
                </h3>
                <button
                  onClick={() => setModalEdicionVisible(false)}
                  className="text-white hover:text-blue-200 transition-colors rounded-full hover:bg-white/10 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* Información de la sesión */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <FaCalendarAlt className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Fecha</p>
                    <p className="font-semibold">{formatearFecha(sesionParaEditar.fecha)}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <FaUserFriends className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-green-600 font-medium">Grupo</p>
                    <p className="font-semibold">{sesionParaEditar.grupo?.denominacion || 'Grupo no disponible'}</p>
                  </div>
                </div>
              </div>

              {/* Buscador de alumnos */}
              <div className="mb-5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar alumno..."
                    value={searchAsistencias}
                    onChange={(e) => setSearchAsistencias(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Tabla de asistencias */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-medium text-gray-800">
                    Editar Asistencias
                  </h4>
                  <div className="text-xs text-gray-500">
                    {asistenciasEdicion.length} registros
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[400px]">
                  {asistenciasEdicion.length > 0 ? (
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alumno
                          </th>
                          <th scope="col" className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado de Asistencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">{asistenciasEdicion.filter(asistencia => {
                        // Manejar correctamente el caso donde alumno podría ser undefined
                        // Accediendo tanto a alumno como a user para asegurar que obtenemos los datos
                        const alumnoData: AlumnoData = asistencia.alumno || asistencia.user || {};
                        let nombreCompleto = [
                          alumnoData.surname1 || '',
                          alumnoData.surname2 || '',
                          alumnoData.name || ''
                        ].filter(Boolean).join(' ').toLowerCase();

                        nombreCompleto = nombreCompleto.trim();

                        // Si el nombre está vacío y la búsqueda también, mostrar el alumno
                        if (!nombreCompleto && !searchAsistencias) return true;

                        return nombreCompleto.includes(searchAsistencias.toLowerCase());
                      }).sort((a, b) => {
                        // Manejar correctamente el caso donde alumno podría ser undefined
                        // Accediendo tanto a alumno como a user para asegurar que obtenemos los datos
                        const alumnoA: AlumnoData = a.alumno || a.user || {};
                        const alumnoB: AlumnoData = b.alumno || b.user || {};
                        const apellidoA = alumnoA.surname1 || '';
                        const apellidoB = alumnoB.surname1 || '';
                        return apellidoA.localeCompare(apellidoB);
                      }).map((asistencia) => {
                        // Manejar correctamente el caso donde alumno podría ser undefined
                        // Acceder tanto a alumno como a user ya que la API puede devolver datos en ambas estructuras
                        const alumnoData: AlumnoData = asistencia.alumno || asistencia.user || {};
                        let nombreCompleto = [
                          alumnoData.surname1 || '',
                          alumnoData.surname2 || '',
                          alumnoData.name || ''
                        ].filter(Boolean).join(' ');

                        // Si después de filtrar y unir sigue vacío, esto indica que no hay datos de nombre
                        nombreCompleto = nombreCompleto.trim();

                        const estado = estadosModificados[asistencia.id] || asistencia.estado;

                        return (
                        <tr key={asistencia.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-full w-full rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                  <FaUserGraduate />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {nombreCompleto ? nombreCompleto : 'Alumno no disponible'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button
                              onClick={() => cambiarEstadoAsistencia(asistencia.id)}
                              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${getEstadoAsistenciaClass(estado)}`}
                            >
                              {estado}
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FaUserGraduate className="mx-auto text-4xl text-gray-300 mb-2" />
                      <p>No hay registros de asistencia para esta sesión</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Leyenda de estados */}
              <div className="mb-5 p-4 bg-gray-50 rounded-lg">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Estados de asistencia</h5>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800 border border-green-200">
                    Asiste
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-800 border border-red-200">
                    No Asiste
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-800 border border-yellow-200">
                    50%
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                    Dispensado
                  </span>
                  <span className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                    Sin registro
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Haz clic en el estado de un alumno para cambiar entre los diferentes estados.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 mt-5 border-t border-gray-100 pt-5">
                <button
                  onClick={() => setModalEdicionVisible(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center"
                  disabled={guardandoCambios}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  onClick={guardarCambiosAsistencia}
                  className="px-4 py-2 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md hover:from-[#0a325a] hover:to-[#174879] transition-colors shadow-sm flex items-center"
                  disabled={guardandoCambios}
                >
                  {guardandoCambios ? (<>
                    <div className="animate-spin mr-2 h-4 w-4 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 108-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    Guardando...
                  </>
                  ) : (
                    <>
                      <FaEdit className="mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}