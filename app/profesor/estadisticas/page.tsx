'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import { FaChartPie, FaSearch, FaArrowLeft, FaSync, FaCalendarAlt, FaUserGraduate, FaFileExcel} from 'react-icons/fa';
import * as XLSX from 'xlsx';

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
  asignatura: Asignatura;
  profesorId: string;
}

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2: string;
  email: string;
}

interface SesionClase {
  id: string;
  fecha: Date;
  grupo: Grupo;
  grupoId: string;
}

interface AsistenciaAlumno {
  id: string;
  alumnoId: string;
  sesionClaseId: string;
  estado: string;
  estadoAsistenciaId: string;
  estadoAsistencia: {
    denominacion: string;
  };
  user: Alumno;
}

interface EstadoAsistencia {
  id: string;
  denominacion: string;
  nombre?: string;
}

interface AlumnoGrupo {
  id: string;
  alumno_Id: string;
  grupoId: string;
  user: Alumno;
}

export default function ProfesorEstadisticas() {
  const { data: session } = useSession({
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
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [sesiones, setSesiones] = useState<SesionClase[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaAlumno[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');  const [searchTerm, setSearchTerm] = useState('');  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removing unused state variable
  // const [estadosAsistencia, setEstadosAsistencia] = useState<Map<string, string>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  // Cargar datos iniciales
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
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => grupo.profesorId === session.user.id);
        setGrupos(gruposFiltrados);
        
        // Si hay grupos disponibles, seleccionar el primero por defecto
        if (gruposFiltrados.length > 0) {
          setGrupoSeleccionado(gruposFiltrados[0].id);
        }
        
        // Cargar los estados de asistencia disponibles
        const estadosAsistenciaResponse = await fetch('/api/estados-asistencia', {
          credentials: 'include'
        });
        
        if (!estadosAsistenciaResponse.ok) {
          console.warn('No se pudieron cargar los estados de asistencia');
        } else {          const estadosData = await estadosAsistenciaResponse.json();
          const mapaEstados = new Map<string, string>();
            estadosData.forEach((estado: EstadoAsistencia) => {
            mapaEstados.set(estado.id, estado.denominacion);
          });
          
          // Commenting out since the state variable is now also commented out
          // setEstadosAsistencia(mapaEstados);
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
  // Cargar sesiones y asistencias cuando se selecciona un grupo
  useEffect(() => {
    if (!grupoSeleccionado) return;
    
    const fetchSesionesYAsistencias = async () => {
      setIsLoading(true);
      
      try {        // Cargar los alumnos del grupo seleccionado
        const alumnosGrupoResponse = await fetch(`/api/alumnos-grupo?grupoId=${grupoSeleccionado}&skipPagination=true`, {
          credentials: 'include'
        });
        
        if (!alumnosGrupoResponse.ok) {
          throw new Error('No se pudieron cargar los alumnos del grupo');
        }
        
        const alumnosGrupoData = await alumnosGrupoResponse.json();
          // Extraer alumnos del grupo
        const alumnosDelGrupo = alumnosGrupoData
          .filter((ag: AlumnoGrupo) => ag.user && ag.user.id) // Filtrar relaciones válidas
          .map((ag: AlumnoGrupo) => ag.user); // Extraer los datos de usuario
        
        // Ordenar los alumnos por apellido y nombre
        alumnosDelGrupo.sort((a: Alumno, b: Alumno) => {
          const apellidoA = a.surname1 || '';
          const apellidoB = b.surname1 || '';
          return apellidoA.localeCompare(apellidoB) || a.name.localeCompare(b.name);
        });
        
        setAlumnos(alumnosDelGrupo);
        
        // Cargar las sesiones de clase del grupo seleccionado
        const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupoSeleccionado}`, {
          credentials: 'include'
        });
        
        if (!sesionesResponse.ok) {
          throw new Error('No se pudieron cargar las sesiones de clase');
        }
        
        const sesionesData = await sesionesResponse.json();
          // Ordenar sesiones por fecha (más antigua primero para mejor visualización)
        const sesionesOrdenadas = sesionesData.sort((a: SesionClase, b: SesionClase) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        
        setSesiones(sesionesOrdenadas);
        
        // Cargar todas las asistencias para estas sesiones
        const promesasAsistencias = sesionesOrdenadas.map((sesion: SesionClase) =>
          fetch(`/api/asistencias-alumno?sesionClaseId=${sesion.id}`, {
            credentials: 'include'
          })
            .then(response => {
              if (!response.ok) return [];
              return response.json();
            })
            .catch(error => {
              console.error(`Error al cargar asistencias para la sesión ${sesion.id}:`, error);
              return [];
            })
        );
          const resultadosAsistencias = await Promise.all(promesasAsistencias);        const todasLasAsistencias = resultadosAsistencias.flat();
        
        setAsistencias(todasLasAsistencias);
        setIsLoading(false);      } catch (error) {
        console.error('Error loading sessions and attendance records:', error);
        setError(`Error loading data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
      fetchSesionesYAsistencias();
  }, [grupoSeleccionado, alumnos.length]);

  // Filtrar alumnos por término de búsqueda
  const alumnosFiltrados = searchTerm
    ? alumnos.filter(alumno => 
        alumno && (
          `${alumno.surname1 || ''} ${alumno.surname2 || ''} ${alumno.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (alumno.email && alumno.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
    : alumnos;
  // Obtener el estado de asistencia de un alumno para una sesión específica
  const getEstadoAsistencia = (alumnoId: string, sesionId: string) => {
    const asistenciaAlumno = asistencias.find(
      a => a.alumnoId === alumnoId && a.sesionClaseId === sesionId
    );
    
    if (!asistenciaAlumno) return 'Sin registro';
    
    // Verificamos la existencia de estadoAsistencia y su propiedad denominacion
    if (asistenciaAlumno.estadoAsistencia && asistenciaAlumno.estadoAsistencia.denominacion) {
      return asistenciaAlumno.estadoAsistencia.denominacion;
    }
    
    return asistenciaAlumno.estado || 'Sin registro';
  };
  
  // Formatear fecha para mostrar
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
    
  // Obtener el color de fondo según el estado de asistencia
  const getEstadoBackgroundColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'asiste':
        return 'bg-green-100 text-green-800';
      case 'no asiste':
        return 'bg-red-100 text-red-800';
      case '50%':
        return 'bg-yellow-100 text-yellow-800';
      case 'dispensado':
        return 'bg-blue-100 text-blue-800';
      case 'erasmus t':
        return 'bg-purple-100 text-purple-800';
      case 'erasmus nt':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Calcular estadísticas de asistencia para un alumno
  const getEstadisticasAlumno = (alumnoId: string) => {
    const asistenciasAlumno = asistencias.filter(a => a.alumnoId === alumnoId);
    if (asistenciasAlumno.length === 0) return { porcentaje: 0, asiste: 0, noAsiste: 0, parcial: 0, dispensado: 0 };
    
    const total = asistenciasAlumno.length;
    const asiste = asistenciasAlumno.filter(a => a.estadoAsistencia?.denominacion.toLowerCase() === 'asiste').length;
    const noAsiste = asistenciasAlumno.filter(a => a.estadoAsistencia?.denominacion.toLowerCase() === 'no asiste').length;
    const parcial = asistenciasAlumno.filter(a => a.estadoAsistencia?.denominacion.toLowerCase() === '50%').length;
    const dispensado = asistenciasAlumno.filter(a => a.estadoAsistencia?.denominacion.toLowerCase() === 'dispensado').length;
    
    const porcentaje = total > 0 ? Math.round((asiste + (parcial * 0.5)) / total * 100) : 0;
    
    return { porcentaje, asiste, noAsiste, parcial, dispensado };
  };
    // Exportar datos a Excel con estilos mejorados
  const exportToExcel = async () => {
    if (!asignatura || alumnos.length === 0 || sesiones.length === 0) {
      alert('No hay datos suficientes para exportar a Excel.');
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Crear una matriz con los datos para Excel
      const headers = ['ID', 'Apellidos', 'Nombre', '% Asistencia'];
      
      // Añadir columnas para cada sesión
      sesiones.forEach(sesion => {
        headers.push(`${formatDate(sesion.fecha).split(',')[0]}`);
      });
      
      // Añadir datos de los alumnos
      const alumnosData = alumnos.map(alumno => {
        const estadisticas = getEstadisticasAlumno(alumno.id);
        const row: (string | number)[] = [
          alumno.id,
          `${alumno.surname1 || ''} ${alumno.surname2 || ''}`.trim(),
          alumno.name,
          estadisticas.porcentaje + '%'
        ];
        
        // Añadir estado para cada sesión
        sesiones.forEach(sesion => {
          const asistencia = asistencias.find(a => a.alumnoId === alumno.id && a.sesionClaseId === sesion.id);
          row.push(asistencia?.estadoAsistencia?.denominacion || 'Sin registro');
        });
        
        return row;
      });
      
      // Crear el libro de Excel
      const ws = XLSX.utils.aoa_to_sheet([headers, ...alumnosData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
        // Obtener referencias de celdas para aplicar estilos
      // Removing unused variable
      // const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const totalRows = alumnosData.length + 1; // +1 por el header
      const totalCols = headers.length;
      
      // Crear estilos para el encabezado
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '0D3C68' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
      
      // Crear estilos para las filas de datos (alternando colores)
      const evenRowStyle = {
        fill: { fgColor: { rgb: 'F3F4F6' } },
        border: { outline: true }
      };
      
      const oddRowStyle = {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        border: { outline: true }
      };
      
      // Estilos para porcentajes de asistencia
      const highAttendanceStyle = {
        font: { color: { rgb: '166534' } },
        fill: { fgColor: { rgb: 'DCFCE7' } }
      };
      
      const mediumAttendanceStyle = {
        font: { color: { rgb: '854D0E' } },
        fill: { fgColor: { rgb: 'FEF3C7' } }
      };
      
      const lowAttendanceStyle = {
        font: { color: { rgb: '991B1B' } },
        fill: { fgColor: { rgb: 'FEE2E2' } }
      };
      
      // Estilos para estados de asistencia
      const attendanceStyles = {
        'Asiste': { font: { color: { rgb: '166534' } }, fill: { fgColor: { rgb: 'DCFCE7' } } },
        'No Asiste': { font: { color: { rgb: '991B1B' } }, fill: { fgColor: { rgb: 'FEE2E2' } } },
        '50%': { font: { color: { rgb: '854D0E' } }, fill: { fgColor: { rgb: 'FEF3C7' } } },
        'Dispensado': { font: { color: { rgb: '1E40AF' } }, fill: { fgColor: { rgb: 'DBEAFE' } } },
        'Sin registro': { font: { color: { rgb: '4B5563' } }, fill: { fgColor: { rgb: 'F9FAFB' } } }
      };
      
      // Aplicar estilos al encabezado
      for (let col = 0; col < totalCols; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellRef]) ws[cellRef] = { v: headers[col] };
        ws[cellRef].s = headerStyle;
      }
      
      // Aplicar estilos a las filas de datos
      for (let row = 1; row < totalRows; row++) {
        const rowStyle = row % 2 === 1 ? evenRowStyle : oddRowStyle;
        
        // Aplicar estilo a cada celda de la fila
        for (let col = 0; col < totalCols; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellRef]) continue;
          
          // Estilo base según fila par/impar
          ws[cellRef].s = { ...rowStyle };
          
          // Aplicar estilos específicos según el contenido
          if (col === 3) { // Columna de porcentaje de asistencia
            const porcentajeText = ws[cellRef].v?.toString() || '';
            const porcentaje = parseInt(porcentajeText, 10);
            
            if (porcentaje >= 85) {
              ws[cellRef].s = { ...ws[cellRef].s, ...highAttendanceStyle };
            } else if (porcentaje >= 60) {
              ws[cellRef].s = { ...ws[cellRef].s, ...mediumAttendanceStyle };
            } else {
              ws[cellRef].s = { ...ws[cellRef].s, ...lowAttendanceStyle };
            }
            
            // Formato numérico para el porcentaje
            if (!isNaN(porcentaje)) {
              ws[cellRef].z = '0%'; // Formato de porcentaje
            }
          }
          
          // Estilos para columnas de asistencia (a partir de la columna 4)
          if (col >= 4) {
            const estadoAsistencia = ws[cellRef].v?.toString() || '';
            const estadoKey = Object.keys(attendanceStyles).find(
              key => estadoAsistencia.toLowerCase() === key.toLowerCase()
            );
            
            if (estadoKey) {
              ws[cellRef].s = { ...ws[cellRef].s, ...attendanceStyles[estadoKey as keyof typeof attendanceStyles] };
            }
          }
        }
      }
      
      // Aplicar ancho de columnas
      ws['!cols'] = [
        { width: 10 }, // ID
        { width: 20 }, // Apellidos
        { width: 15 }, // Nombre
        { width: 12 }, // % Asistencia
        ...Array(sesiones.length).fill({ width: 12 }) // Sesiones
      ];
      
      // Añadir fila de resumen al final
      const resumenRow = ['RESUMEN'];
      let totalAsistencia = 0;
      
      // Calcular medias de asistencia
      alumnosData.forEach(row => {
        const porcentajeText = row[3].toString();
        const porcentaje = parseInt(porcentajeText, 10);
        if (!isNaN(porcentaje)) {
          totalAsistencia += porcentaje;
        }
      });
      
      const mediaAsistencia = alumnosData.length > 0 ? Math.round(totalAsistencia / alumnosData.length) : 0;
      
      // Completar fila de resumen
      resumenRow.push(''); // Apellidos
      resumenRow.push('Media del grupo:'); // Nombre
      resumenRow.push(`${mediaAsistencia}%`); // % Asistencia
      
      // Añadir estadísticas para cada sesión
      sesiones.forEach((sesion) => {
        const asistentes = asistencias.filter(a => 
          a.sesionClaseId === sesion.id && 
          a.estadoAsistencia?.denominacion.toLowerCase() === 'asiste'
        ).length;
        
        const porcentajeSesion = alumnos.length > 0 ? Math.round((asistentes / alumnos.length) * 100) : 0;
        resumenRow.push(`${porcentajeSesion}%`);
      });
      
      // Añadir fila de resumen a la hoja
      const resumenStartRow = totalRows + 1;
      XLSX.utils.sheet_add_aoa(ws, [resumenRow], { origin: resumenStartRow });
      
      // Aplicar estilo a la fila de resumen
      for (let col = 0; col < totalCols; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: resumenStartRow, c: col });
        if (!ws[cellRef]) continue;
        
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E5E7EB' } },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          }
        };
        
        // Estilo especial para la celda de media de asistencia
        if (col === 3) {
          if (mediaAsistencia >= 85) {
            ws[cellRef].s.fill = { fgColor: { rgb: 'DCFCE7' } };
            ws[cellRef].s.font = { bold: true, color: { rgb: '166534' } };
          } else if (mediaAsistencia >= 60) {
            ws[cellRef].s.fill = { fgColor: { rgb: 'FEF3C7' } };
            ws[cellRef].s.font = { bold: true, color: { rgb: '854D0E' } };
          } else {
            ws[cellRef].s.fill = { fgColor: { rgb: 'FEE2E2' } };
            ws[cellRef].s.font = { bold: true, color: { rgb: '991B1B' } };
          }
        }
      }
      
      // Metadatos del documento
      wb.Props = {
        Title: `Estadísticas de Asistencia - ${asignatura.Denominacion}`,
        Subject: `Grupo: ${grupos.find(g => g.id === grupoSeleccionado)?.denominacion || 'Todos los grupos'}`,
        Author: session?.user?.name || 'Profesor',
        CreatedDate: new Date(),
        Company: 'Universidad Francisco de Vitoria',
        Manager: 'Sistema PGA'
      };
      
      // Generar el nombre del archivo
      const fileName = `Estadisticas_Asistencia_${asignatura.Denominacion.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Guardar el archivo
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los datos a Excel. Por favor, inténtelo de nuevo.');
    } finally {
      setIsExporting(false);
    }
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
                      <FaChartPie className="mr-3" />
                      Estadísticas de Asistencia
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
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando estadísticas...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
                <Link href="/profesor/dashboard" className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md">
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">              <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                      <FaUserGraduate className="text-[#0D3C68]" />
                    </div>
                    <div>
                      <span className="text-gray-900">Matriz de Asistencia</span>
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        Monitoriza la asistencia de tus alumnos por sesión de clase
                      </div>
                    </div>
                  </h2>                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaSearch className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Buscar alumnos..."
                          className="pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Link 
                        href={`/profesor/pasar-clase?asignatura=${asignatura?.id}&grupo=${grupoSeleccionado}`} 
                        className={`inline-flex items-center px-3 py-2 border
                        ${!grupoSeleccionado || !asignatura
                          ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                        } rounded-md shadow-sm text-sm font-medium transition-colors`}
                        onClick={(e) => {
                          if (!grupoSeleccionado || !asignatura) {
                            e.preventDefault();
                            alert('Por favor, seleccione un grupo');
                          }
                        }}
                      >
                        <FaCalendarAlt className="mr-2" />
                        <span>Nueva sesión</span>
                      </Link>
                      <button
                        onClick={exportToExcel}
                        disabled={isExporting || alumnos.length === 0 || sesiones.length === 0}
                        className={`inline-flex items-center px-3 py-2 border ${
                          isExporting || alumnos.length === 0 || sesiones.length === 0
                            ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                        } rounded-md shadow-sm text-sm font-medium transition-colors`}
                        title="Exportar a Excel"
                      >
                        {isExporting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700 mr-2"></div>
                            <span>Exportando...</span>
                          </>
                        ) : (
                          <>
                            <FaFileExcel className="mr-2" />
                            <span>Exportar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="p-2 rounded-full text-gray-500 hover:bg-blue-100 hover:text-[#0D3C68] transition-colors"
                        title="Recargar datos"
                      >
                        <FaSync className="h-4 w-4" />
                      </button>
                    </div>
                </div>
                  <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  {grupos.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <label htmlFor="grupoSelect" className="flex items-center font-medium text-gray-700 mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                        </svg>
                        Seleccionar Grupo:
                      </label>
                      <div className="relative inline-block w-full md:w-auto">
                        <select
                          id="grupoSelect"
                          value={grupoSeleccionado}
                          onChange={(e) => setGrupoSeleccionado(e.target.value)}
                          className="appearance-none block w-full md:w-auto px-4 py-2.5 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm sm:text-sm"
                        >
                          {grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              {grupo.denominacion}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                          </svg>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 md:mt-0 md:ml-3">
                        {grupos.length === 1 
                          ? '1 grupo disponible' 
                          : `${grupos.length} grupos disponibles`}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500 italic bg-gray-50 p-3 rounded-md border border-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 10-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      No hay grupos disponibles para esta asignatura.
                    </div>
                  )}
                </div>
              </div>              {!grupoSeleccionado ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">Selecciona un grupo para ver las estadísticas</p>
                </div>
              ) : alumnos.length > 0 && sesiones.length > 0 ? (
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 uppercase font-semibold">Alumnos</p>
                          <p className="text-2xl font-bold text-gray-800">{alumnos.length}</p>
                        </div>
                        <div className="bg-blue-200 p-2 rounded-full">
                          <FaUserGraduate className="h-5 w-5 text-blue-700" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 uppercase font-semibold">Sesiones</p>
                          <p className="text-2xl font-bold text-gray-800">{sesiones.length}</p>
                        </div>
                        <div className="bg-green-200 p-2 rounded-full">
                          <FaCalendarAlt className="h-5 w-5 text-green-700" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-600 uppercase font-semibold">Registros</p>
                          <p className="text-2xl font-bold text-gray-800">{asistencias.length}</p>
                        </div>
                        <div className="bg-purple-200 p-2 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-700" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-amber-600 uppercase font-semibold">Última sesión</p>
                          <p className="text-base font-bold text-gray-800">
                            {sesiones.length > 0 ? formatDate(sesiones[sesiones.length - 1].fecha).split(',')[0] : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-amber-200 p-2 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : alumnos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="bg-amber-50 rounded-full p-6 mb-4">
                    <FaUserGraduate className="text-amber-400 text-5xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Grupo sin alumnos</h3>
                  <p className="text-gray-600 mb-6 text-center max-w-md">
                    No hay alumnos matriculados en este grupo. Para poder ver estadísticas de asistencia, 
                    primero debe haber alumnos asignados a este grupo.
                  </p>
                  <div className="flex space-x-4">
                    <Link 
                      href="/profesor/dashboard" 
                      className="mt-2 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md shadow-md hover:shadow-lg transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Volver al Dashboard
                    </Link>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-2 inline-flex items-center px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Actualizar datos
                    </button>
                  </div>
                </div>
              ) : sesiones.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="bg-blue-50 rounded-full p-6 mb-4 animate-pulse">
                    <FaCalendarAlt className="text-blue-300 text-5xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay sesiones registradas</h3>
                  <p className="text-gray-600 mb-6 text-center max-w-md">
                    Todavía no se han registrado sesiones de clase para este grupo. 
                    Para poder visualizar estadísticas, primero necesitas registrar alguna sesión.
                  </p>
                  <Link 
                    href={`/profesor/pasar-clase?asignatura=${asignatura?.id}&grupo=${grupoSeleccionado}`}
                    className="mt-2 inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md shadow-md hover:shadow-lg transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Registrar nueva sesión
                  </Link>
                </div>
              ) : (                <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-[#0D3C68]/95 to-[#1a5590]/95 text-white">
                      <tr>
                        <th scope="col" className="sticky left-0 bg-[#0D3C68] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider shadow-md z-20">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            <span>Alumno</span>
                          </div>
                        </th>
                        {sesiones.map((sesion, index) => (
                          <th key={sesion.id} scope="col" className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                            <div className="flex flex-col items-center min-w-[130px]">
                              <div className="flex items-center mb-1">
                                <span className="bg-blue-200 text-blue-800 w-5 h-5 rounded-full flex items-center justify-center mr-1.5 text-xs font-bold">
                                  {index + 1}
                                </span>
                                <FaCalendarAlt className="text-blue-300 mr-1.5" />
                                <span>{formatDate(sesion.fecha).split(',')[0]}</span>
                              </div>
                              <span className="text-xs font-normal text-blue-300">
                                {formatDate(sesion.fecha).split(',')[1].trim()}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {alumnosFiltrados.map((alumno, index) => {
                        if (!alumno || !alumno.id) return null;
                        
                        return (
                          <tr key={alumno.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'} hover:bg-blue-50/40 transition-colors duration-150`}>
                            <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap bg-inherit shadow-sm border-r border-gray-100">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-[#0D3C68]/80 to-[#1a5590]/80 flex items-center justify-center text-xs font-medium text-white shadow-sm">
                                  {index + 1}
                                </div>                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {alumno.surname1 ? `${alumno.surname1}${alumno.surname2 ? ` ${alumno.surname2}` : ''}, ${alumno.name}` : alumno.name}
                                  </div>
                                  <div className="flex items-center mt-1">
                                    <div className="text-xs text-gray-500 mr-2">
                                      ID: {alumno.id.substring(0, 6)}...
                                    </div>
                                    {sesiones.length > 0 && (
                                      <div className="flex items-center">
                                        <div 
                                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                            getEstadisticasAlumno(alumno.id).porcentaje >= 75 
                                              ? 'bg-green-100 text-green-800' 
                                              : getEstadisticasAlumno(alumno.id).porcentaje >= 50 
                                                ? 'bg-yellow-100 text-yellow-800' 
                                                : 'bg-red-100 text-red-800'
                                          }`}
                                        >
                                          {getEstadisticasAlumno(alumno.id).porcentaje}% asistencia
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {sesiones.map((sesion) => {
                              const estado = getEstadoAsistencia(alumno.id, sesion.id);
                              const bgColorClass = getEstadoBackgroundColor(estado);
                                // Determinar icono según estado
                              const getIconForStatus = (status: string) => {
                                switch(status.toLowerCase()) {
                                  case 'asiste':
                                    return <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>;
                                  case 'no asiste':
                                    return <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>;                                  case '50%':
                                    return <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                                    </svg>;
                                  case 'dispensado':
                                    return <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                    </svg>;
                                  default:
                                    return <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                    </svg>;
                                }
                              };
                              
                              return (
                                <td key={`${alumno.id}-${sesion.id}`} className="px-2 py-3 whitespace-nowrap text-center">
                                  <span className={`px-3 py-1.5 inline-flex items-center text-xs leading-5 font-medium rounded-full shadow-sm ${bgColorClass}`}>
                                    {getIconForStatus(estado)}
                                    {estado}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}                <div className="p-5 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-blue-100">
                <div className="mb-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#0D3C68]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Leyenda de estados de asistencia</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Asiste</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 w-full text-center">Presente</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">No Asiste</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 w-full text-center">Ausente</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">50%</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 w-full text-center">Parcial</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Dispensado</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 w-full text-center">Justificado</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                      <span className="text-xs font-medium">Erasmus T</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 w-full text-center">Estudiante</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-pink-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                        <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zm12.96 3.762a1 1 0 01-.89.89 8.969 8.969 0 00-1.05.174V10.12l1.69-.723a11.115 11.115 0 01.25 3.762zM7.4 16.573A9.026 9.026 0 006 18a1 1 0 001 1h6a1 1 0 001-1 9.026 9.026 0 00-1.4-1.427 1 1 0 01-1.4 0z" />
                      </svg>
                      <span className="text-xs font-medium">Erasmus NT</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-800 w-full text-center">Estudiante</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center justify-center mb-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Sin registro</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 w-full text-center">Pendiente</span>
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
