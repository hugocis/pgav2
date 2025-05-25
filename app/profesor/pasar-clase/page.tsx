'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardContainer from '@/components/DashboardContainer';
import Link from 'next/link';
import {   
  FaChalkboardTeacher, 
  FaSearch, 
  FaArrowLeft,  
  FaCalendarAlt, 
  FaClock, 
  FaSave,
  FaUserGraduate,
  FaCheck,
  FaTimes,
  FaPercentage,
  FaBook
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

interface SesionClase {
  id: string;
  fecha: string;
  grupoId: string;
  docenteId: string;
}

interface Grupo {
  id: string;
  denominacion: string;
  profesorId: string;
}

interface Alumno {
  id: string;
  name: string;
  surname1: string;
  surname2: string;
  email: string;
}

interface AlumnoGrupo {
  id: string;
  alumno_Id: string;
  grupoId: string;
  user: Alumno;
}

interface EstadoAsistencia {
  id: string;
  denominacion: string;
}

export default function PasarClase() {
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
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>('');
  const [alumnosGrupo, setAlumnosGrupo] = useState<AlumnoGrupo[]>([]);
  const [estadosAsistencia, setEstadosAsistencia] = useState<EstadoAsistencia[]>([]);
  const [estadosPermitidos] = useState<string[]>(['Asiste', 'No Asiste', '50%']);
  const [asistencias, setAsistencias] = useState<Map<string, string>>(new Map());
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);  const [fechasConSesion, setFechasConSesion] = useState<string[]>([]);
  const [mostrarGuia, setMostrarGuia] = useState<boolean>(false);
  // Obtener fecha y hora actual en formato adecuado para inputs
  useEffect(() => {
    const now = new Date();
    const fechaActual = now.toISOString().split('T')[0];
    const horaActual = now.toTimeString().split(' ')[0].substring(0, 5);
    
    setFecha(fechaActual);
    setHora(horaActual);
  }, []);
    // Add functionality to visually mark days with sessions on the calendar
  useEffect(() => {
    if (!fechasConSesion.length) return;
    
    // This function will run when the calendar is opened
    const handleCalendarOpen = () => {
      // Give time for the calendar DOM to render
      setTimeout(() => {
        // Try to mark days with sessions
        document.querySelectorAll('td[data-date]').forEach(day => {
          const dateValue = day.getAttribute('data-date');
          if (dateValue && fechasConSesion.includes(dateValue)) {
            day.classList.add('bg-green-100');
            const dayElement = day as HTMLElement;
            dayElement.style.backgroundColor = '#d1fae5';
            dayElement.style.fontWeight = 'bold';
            dayElement.style.color = '#065f46';
            dayElement.style.borderRadius = '50%';
          }
        });
      }, 100);
    };
    
    // Agregar el listener al input de fecha
    const dateInput = document.getElementById('fecha');
    if (dateInput) {
      dateInput.addEventListener('mousedown', handleCalendarOpen);
      dateInput.addEventListener('focus', handleCalendarOpen);
      
      // Limpiar al desmontar
      return () => {
        dateInput.removeEventListener('mousedown', handleCalendarOpen);
        dateInput.removeEventListener('focus', handleCalendarOpen);
      };
    }
  }, [fechasConSesion]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!asignaturaId || !session?.user?.id) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
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
        // Filter only groups where the teacher is the owner
        const gruposFiltrados = gruposData.grupos.filter((grupo: Grupo) => 
          grupo.profesorId === session.user.id
        );
        
        setGrupos(gruposFiltrados);
        
        // If there are available groups, select the first one by default
        if (gruposFiltrados.length > 0) {
          setGrupoSeleccionado(gruposFiltrados[0].id);
        }
        
        // Cargar estados de asistencia
        const estadosResponse = await fetch('/api/estados-asistencia', {
          credentials: 'include'
        });
        
        if (!estadosResponse.ok) {
          console.warn('No se pudieron cargar los estados de asistencia');
        } else {
          const estadosData = await estadosResponse.json();
          setEstadosAsistencia(estadosData);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchData();  }, [asignaturaId, session?.user?.id]);  // Apply styles to calendar days that have sessions
  useEffect(() => {
    if (fechasConSesion.length === 0) return;
    
    // Create custom style to mark days with sessions in green
    const styleId = 'calendar-green-days-style';
    
    // Remove previous style if it exists
    if (document.getElementById(styleId)) {
      document.getElementById(styleId)?.remove();
    }
    
    // Create CSS rules for each date with sessions
    const cssRules = fechasConSesion.map(fecha => {
      return `
        input[type="date"].calendar-with-green-days::-webkit-calendar-picker-indicator {
          background-color: white;
        }
        input[type="date"].calendar-with-green-days::-webkit-datetime-edit-day-field:focus,
        input[type="date"].calendar-with-green-days::-webkit-datetime-edit-month-field:focus,
        input[type="date"].calendar-with-green-days::-webkit-datetime-edit-year-field:focus {
          background-color: transparent;
        }
        
        /* Esta es la regla específica para cada fecha con sesión */
        td[data-date="${fecha}"] {
          background-color: #d1fae5 !important;
          border-radius: 50%;
          font-weight: bold;
          color: #065f46 !important;
        }
      `;
    }).join('\n');
    
    // Insertar el elemento de estilo en el head del documento
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = cssRules;
    document.head.appendChild(styleEl);
    
    // Limpiar cuando el componente se desmonte
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [fechasConSesion]);
    // Load students and session dates when a group is selected
  useEffect(() => {
    if (!grupoSeleccionado) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {        // Load students from the group
        const alumnosResponse = await fetch(`/api/alumnos-grupo?grupoId=${grupoSeleccionado}&skipPagination=true`, {
          credentials: 'include'
        });
        
        if (!alumnosResponse.ok) {
          throw new Error('Could not load students from the group');
        }
          const responseData = await alumnosResponse.json();
        
        // Handle both direct array response and data property response
        let alumnosData;
        if (Array.isArray(responseData)) {
          alumnosData = responseData;
        } else if (responseData && responseData.data && Array.isArray(responseData.data)) {
          alumnosData = responseData.data;
        } else {
          alumnosData = [];
          console.error('Formato de respuesta inesperado para alumnos-grupo:', responseData);
        }
        
        // Ordenar los alumnos por apellido y nombre
        alumnosData.sort((a: AlumnoGrupo, b: AlumnoGrupo) => {
          const apellidoA = a.user?.surname1 || '';
          const apellidoB = b.user?.surname1 || '';
          return apellidoA.localeCompare(apellidoB) || (a.user?.name || '').localeCompare(b.user?.name || '');
        });
        
        setAlumnosGrupo(alumnosData);
        
        // Inicializar todas las asistencias con "Asiste" por defecto
        const asistenciasIniciales = new Map<string, string>();
        alumnosData.forEach((alumnoGrupo: AlumnoGrupo) => {
          asistenciasIniciales.set(alumnoGrupo.alumno_Id, 'Asiste');
        });
        
        setAsistencias(asistenciasIniciales);
        
        // Cargar las sesiones de clase para obtener las fechas
        const sesionesResponse = await fetch(`/api/sesiones-clase?grupoId=${grupoSeleccionado}`, {
          credentials: 'include'
        });
        
        if (sesionesResponse.ok) {
          const sesionesData = await sesionesResponse.json();
            // Extraer solo las fechas (formato YYYY-MM-DD) de las sesiones
          const fechas = sesionesData.map((sesion: SesionClase) => {
            const fecha = new Date(sesion.fecha);
            return fecha.toISOString().split('T')[0];
          });
          
          setFechasConSesion(fechas);
        } else {
          console.warn('No se pudieron cargar las sesiones del grupo');
          setFechasConSesion([]);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [grupoSeleccionado]);
  // Filter students by search term
  const alumnosFiltrados = searchTerm
    ? alumnosGrupo.filter(alumnoGrupo => 
        alumnoGrupo.user && (
          `${alumnoGrupo.user.surname1 || ''} ${alumnoGrupo.user.surname2 || ''} ${alumnoGrupo.user.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (alumnoGrupo.user.email && alumnoGrupo.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      )
    : alumnosGrupo;
  // Change attendance status on click
  const cambiarEstadoAsistencia = (alumnoId: string) => {
    // Create a small "click" effect
    const element = document.getElementById(`alumno-${alumnoId}`);
    if (element) {
      element.classList.add('scale-95', 'shadow-inner');
      setTimeout(() => {
        element.classList.remove('scale-95', 'shadow-inner');
      }, 150);
    }
    
    const estadoActual = asistencias.get(alumnoId) || 'Asiste';
    const indexActual = estadosPermitidos.indexOf(estadoActual);
    const indexSiguiente = (indexActual + 1) % estadosPermitidos.length;
    const nuevoEstado = estadosPermitidos[indexSiguiente];
    
    const nuevasAsistencias = new Map(asistencias);
    nuevasAsistencias.set(alumnoId, nuevoEstado);
    setAsistencias(nuevasAsistencias);
  };    // Save the class session and attendance records
  const guardarSesion = async () => {
    if (!grupoSeleccionado || !fecha || !hora) {
      setError('Please select a valid group, date and time');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Create complete date with time
      const fechaHora = new Date(`${fecha}T${hora}`);
      
      // Create class session
      const sesionResponse = await fetch('/api/sesiones-clase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: fechaHora,
          grupoId: grupoSeleccionado,
          docenteId: session?.user?.id
        }),
        credentials: 'include'
      });
      
      if (!sesionResponse.ok) {
        throw new Error('Error al crear la sesión de clase');
      }
      
      const sesionData = await sesionResponse.json();
      const sesionId = sesionData.id;
      
      // Obtener IDs de estados de asistencia
      const mapaEstados = new Map<string, string>();
      estadosAsistencia.forEach(estado => {
        mapaEstados.set(estado.denominacion, estado.id);
      });
      
      // Crear las asistencias para cada alumno
      const promesasAsistencias = Array.from(asistencias.entries()).map(async ([alumnoId, estadoDenominacion]) => {
        const estadoId = mapaEstados.get(estadoDenominacion) || '';
        
        if (!estadoId) {
          console.error(`No se encontró ID para el estado: ${estadoDenominacion}`);
          return;
        }
        
        const asistenciaResponse = await fetch('/api/asistencias-alumno', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fecha: fechaHora,
            alumnoId,
            sesionClaseId: sesionId,
            estadoAsistenciaId: estadoId,
            estado: estadoDenominacion // Por compatibilidad
          }),
          credentials: 'include'
        });
        
        if (!asistenciaResponse.ok) {
          throw new Error(`Error al registrar asistencia para alumno ${alumnoId}`);
        }
        
        return await asistenciaResponse.json();
      });
        await Promise.all(promesasAsistencias);
      
      setSuccess('¡Sesión de clase y asistencias registradas con éxito! Redirigiendo al historial...');
        // Reset all attendance records to "Asiste" for a new session
      const asistenciasIniciales = new Map<string, string>();
      alumnosGrupo.forEach((alumnoGrupo: AlumnoGrupo) => {
        asistenciasIniciales.set(alumnoGrupo.alumno_Id, 'Asiste');
      });
      setAsistencias(asistenciasIniciales);
      
      // Scroll smoothly but quickly to the top to show the success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Redirigir al historial después de 3 segundos
      setTimeout(() => {
        router.push(`/profesor/historial-sesiones?asignatura=${asignaturaId}`);
      }, 3000);
        } catch (error) {      console.error('Error saving the session:', error);
      setError(`Error saving the session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // If there's an error, scroll to the top to show the error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-100 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-8 bg-white rounded-xl shadow-md overflow-hidden border border-blue-50">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#2563EB] px-6 py-8 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">                <div>
                  <div className="flex items-center">
                    <Link 
                      href="/profesor/dashboard" 
                      className="mr-4 text-white hover:text-blue-200 transition bg-blue-800 hover:bg-blue-700 p-3 rounded-full shadow-md"
                    >
                      <FaArrowLeft />
                    </Link>
                    <div>
                      <h1 className="text-3xl font-bold flex items-center">
                        <FaChalkboardTeacher className="mr-3 text-white drop-shadow-md" />
                        Control de Asistencia
                      </h1>
                      {asignatura && (
                        <p className="text-blue-100 mt-2 flex items-center text-lg">
                          <FaBook className="mr-2 text-blue-200" />
                          <span className="text-white font-medium">{asignatura.Denominacion}</span>
                          <span className="mx-2 text-blue-200">•</span>
                          <span>{asignatura.carrera?.denominacion || ''}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <Link 
                  href={`/profesor/historial-sesiones?asignatura=${asignaturaId}`} 
                  className="bg-blue-800 hover:bg-blue-700 text-white py-3 px-5 rounded-lg 
                    flex items-center transition shadow-md hover:shadow-lg font-medium"
                >
                  <FaCalendarAlt className="mr-2" />
                  Ver Historial de Asistencias
                </Link>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>          {isLoading ? (
            <div className="bg-white rounded-xl shadow p-12 flex justify-center border border-blue-50">
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                    <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-300 animate-spin animate-pulse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                </div>
                <p className="mt-6 text-gray-700 font-medium text-lg">Cargando información...</p>
                <p className="text-sm text-gray-500 mt-2">Esto puede tomar unos segundos</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-md p-8 border border-red-100">
              <div className="text-center">
                <div className="bg-red-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">Se ha producido un error</h3>
                <p className="text-gray-700 mb-6">{error}</p>
                <Link 
                  href="/profesor/dashboard" 
                  className="mt-4 inline-block px-6 py-3 bg-gradient-to-r from-[#0D3C68] to-[#2563EB] text-white rounded-lg shadow hover:shadow-md transition-all"
                >
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"><div className="p-7 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center">
                  <FaCalendarAlt className="mr-3 text-blue-600" />
                  <span>Registrar Nueva Sesión</span>
                </h2>                {success && (
                  <div id="mensaje-exito" className="mb-8 bg-green-100 border-2 border-green-500 text-green-800 p-6 rounded-xl shadow-lg text-center animate-pulse">
                    <div className="flex items-center justify-center">
                      <div className="bg-green-200 p-3 rounded-full mr-3 shadow-inner">
                        <FaCheck className="text-green-700 text-2xl" />
                      </div>
                      <p className="font-bold text-xl">{success.split('!')[0]}!</p>
                    </div>
                    {success.includes('Redirigiendo') && (
                      <div className="mt-4 flex flex-col items-center">
                        <p className="text-green-700 font-medium">{success.split('!')[1]}</p>
                        <div className="mt-3 flex justify-center">
                          <div className="flex space-x-2">
                            <div className="h-3 w-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="h-3 w-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
                            <div className="h-3 w-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm mb-8 border border-blue-100">
                  <h3 className="text-xl font-semibold text-blue-900 mb-5 flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <FaChalkboardTeacher className="text-blue-600" />
                    </div>
                    Información de la Sesión
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
                    {/* Selector de grupo */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-50 hover:shadow-md transition-shadow">
                      <label htmlFor="grupo" className="block text-sm font-semibold text-gray-700 mb-2">
                        Grupo de Clase
                      </label>
                      <select
                        id="grupo"
                        value={grupoSeleccionado}
                        onChange={(e) => setGrupoSeleccionado(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-base"
                      >
                        {grupos.length === 0 ? (
                          <option value="">No hay grupos disponibles</option>
                        ) : (
                          grupos.map((grupo) => (
                            <option key={grupo.id} value={grupo.id}>
                              {grupo.denominacion}
                            </option>
                          ))
                        )}
                      </select>
                    </div>                    {/* Selector de fecha */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-50 hover:shadow-md transition-shadow">
                      <label htmlFor="fecha" className="block text-sm font-semibold text-gray-700 mb-2 flex items-center justify-between">
                        <span>Fecha de la Clase</span>
                        {fechasConSesion.includes(fecha) && (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                            <FaCheck className="mr-1" size={10} />
                            Sesión registrada
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaCalendarAlt className={`${fechasConSesion.includes(fecha) ? 'text-green-600' : 'text-blue-500'}`} />
                        </div>                        <input
                          type="date"
                          id="fecha"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          className={`w-full pl-10 p-3 border ${fechasConSesion.includes(fecha) ? 'border-green-300 bg-green-50' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-base calendar-with-green-days`}
                          style={{ colorScheme: 'light' }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {fechasConSesion.length > 0 ? 'Los días en verde indican fechas con sesiones ya registradas' : 'No hay sesiones registradas para este grupo'}
                      </div>
                    </div>

                    {/* Selector de hora */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-50 hover:shadow-md transition-shadow">
                      <label htmlFor="hora" className="block text-sm font-semibold text-gray-700 mb-2">
                        Hora de la Clase
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FaClock className="text-blue-500" />
                        </div>
                        <input
                          type="time"
                          id="hora"
                          value={hora}
                          onChange={(e) => setHora(e.target.value)}
                          className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-base"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center bg-blue-50 px-5 py-3 rounded-lg text-sm mb-3 md:mb-0">
                    <div className="bg-blue-100 p-1.5 rounded-full mr-3">
                      <FaUserGraduate className="text-blue-600" />
                    </div>
                    <span className="font-semibold mr-1 text-blue-900">
                      {alumnosGrupo.length}
                    </span>
                    <span className="text-gray-700">
                      {alumnosGrupo.length === 1 ? 'alumno en este grupo' : 'alumnos en este grupo'}
                    </span>
                  </div>
                  <div className="relative w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaSearch className="text-blue-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar alumnos..."
                      className="w-full md:w-80 pl-11 pr-4 py-3 border border-gray-200 rounded-lg leading-5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-sm transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                {searchTerm && alumnosFiltrados.length > 0 && (
                  <div className="text-center bg-yellow-50 p-3 rounded-lg text-sm text-yellow-700 mb-4 border border-yellow-100 shadow-sm">
                    Mostrando {alumnosFiltrados.length} de {alumnosGrupo.length} alumnos
                  </div>
                )}
              </div>{/* Lista de alumnos y asistencia */}
              {!grupoSeleccionado ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 mb-4">Selecciona un grupo para ver los alumnos</p>
                </div>
              ) : alumnosFiltrados.length === 0 ? (
                <div className="text-center py-10">
                  <FaUserGraduate className="mx-auto text-gray-300 text-5xl mb-3" />
                  <p className="text-gray-500 mb-4">No hay alumnos en este grupo</p>
                </div>
              ) : (                <div className="px-7 py-6 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {alumnosFiltrados.map((alumnoGrupo) => {
                      if (!alumnoGrupo.user) return null;
                      
                      const alumno = alumnoGrupo.user;
                      const estadoAsistencia = asistencias.get(alumno.id) || 'Asiste';
                      
                      let bgColor, textColor, borderColor, iconComponent, gradientColors;
                      switch (estadoAsistencia) {
                        case 'Asiste':
                          bgColor = 'bg-green-50 hover:bg-green-100';
                          textColor = 'text-green-800';
                          borderColor = 'border-green-200';
                          gradientColors = 'from-green-50 to-green-100';
                          iconComponent = <div className="absolute top-3 right-3 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <FaCheck className="text-green-600 text-xs" />
                          </div>;
                          break;
                        case 'No Asiste':
                          bgColor = 'bg-red-50 hover:bg-red-100';
                          textColor = 'text-red-800';
                          borderColor = 'border-red-200';
                          gradientColors = 'from-red-50 to-red-100';
                          iconComponent = <div className="absolute top-3 right-3 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <FaTimes className="text-red-600 text-xs" />
                          </div>;
                          break;
                        case '50%':
                          bgColor = 'bg-yellow-50 hover:bg-yellow-100';
                          textColor = 'text-yellow-800';
                          borderColor = 'border-yellow-200';
                          gradientColors = 'from-yellow-50 to-yellow-100';
                          iconComponent = <div className="absolute top-3 right-3 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                            <FaPercentage className="text-yellow-600 text-xs" />
                          </div>;
                          break;
                        default:
                          bgColor = 'bg-gray-50 hover:bg-gray-100';
                          textColor = 'text-gray-800';
                          borderColor = 'border-gray-200';
                          gradientColors = 'from-gray-50 to-gray-100';
                          iconComponent = null;
                      }
                      
                      // Obtén las iniciales para el avatar
                      const nombre = alumno.name || '';
                      const apellido1 = alumno.surname1 || '';
                      const iniciales = `${nombre.charAt(0)}${apellido1.charAt(0)}`.toUpperCase();
                      
                      return (
                        <button
                          id={`alumno-${alumno.id}`}
                          key={alumno.id}
                          onClick={() => cambiarEstadoAsistencia(alumno.id)}
                          className={`relative flex flex-col items-center justify-between p-6 rounded-xl border ${borderColor} bg-gradient-to-br ${gradientColors} transition-all transform hover:scale-102 focus:outline-none shadow hover:shadow-md min-h-[160px]`}
                        >
                          {iconComponent}
                          
                          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg mb-3 shadow-sm">
                            {iniciales}
                          </div>
                          
                          <div className="text-center flex-grow w-full flex flex-col justify-between">
                            <div className="font-semibold text-base text-gray-900 mb-3 line-clamp-2 px-1">
                              {alumno.surname1 
                                ? `${alumno.surname1}${alumno.surname2 ? ` ${alumno.surname2.charAt(0)}.` : ''}, ${alumno.name}` 
                                : alumno.name}
                            </div>
                            
                            <div className={`text-sm font-bold px-4 py-2 rounded-lg ${bgColor} ${textColor} border ${borderColor} mt-auto mx-auto`}>
                              {estadoAsistencia}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}                <div className="px-7 py-8 bg-white border-t border-gray-200">                <div className="mb-8">
                  {/* Botón para mostrar/ocultar la guía */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                      <FaCheck className="mr-2" />
                      Guía de Estados
                    </h3>
                    <button
                      onClick={() => setMostrarGuia(!mostrarGuia)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center transition-all"
                    >
                      {mostrarGuia ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Ocultar guía
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Mostrar guía
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Contenido de la guía - se muestra/oculta según el estado */}
                  {mostrarGuia && (
                    <>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6 shadow-sm border border-blue-100 transition-all">
                        <div className="flex flex-wrap justify-center gap-6">
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100 flex flex-col items-center">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                              <FaCheck className="text-green-600" />
                            </div>
                            <span className="px-4 py-1.5 text-sm font-medium rounded-lg bg-green-50 text-green-800 border border-green-200">
                              Asiste
                            </span>
                            <span className="text-xs mt-2 text-gray-600">Alumno presente</span>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100 flex flex-col items-center">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mb-2">
                              <FaTimes className="text-red-600" />
                            </div>
                            <span className="px-4 py-1.5 text-sm font-medium rounded-lg bg-red-50 text-red-800 border border-red-200">
                              No Asiste
                            </span>
                            <span className="text-xs mt-2 text-gray-600">Alumno ausente</span>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex flex-col items-center">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                              <FaPercentage className="text-yellow-600" />
                            </div>
                            <span className="px-4 py-1.5 text-sm font-medium rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                              50%
                            </span>
                            <span className="text-xs mt-2 text-gray-600">Asistencia parcial</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700 font-medium">
                              Haz clic sobre cada tarjeta de alumno para cambiar su estado de asistencia
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
                  <Link
                    href="/profesor/dashboard"
                    className="w-full sm:w-auto px-8 py-3.5 border border-gray-300 rounded-xl bg-white text-gray-700 hover:bg-gray-50 text-center font-medium shadow-sm hover:shadow transition-all"
                  >
                    Cancelar
                  </Link>
                  <button
                    onClick={guardarSesion}
                    disabled={isSaving || !grupoSeleccionado || alumnosGrupo.length === 0}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#0D3C68] to-[#2563EB] text-white rounded-xl hover:from-[#0a325a] hover:to-[#1e56d3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-sm hover:shadow transition-all"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <FaSave className="mr-3 text-lg" />
                        Guardar Asistencia
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
