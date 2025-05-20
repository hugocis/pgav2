'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

interface EstadoJustificacion {
  id: string;
  denominacion: string;
}

interface Grupo {
  id: string;
  denominacion: string;
  asignaturaId?: string;
}

interface SesionClase {
  id: string;
  fecha: string;
  grupo: Grupo;
}

interface AsistenciaAlumno {
  id: string;
  fecha: string;
  estado: string;
  sesionClaseId: string;
  alumnoId: string;
  estadoAsistenciaId?: string;
  createdAt?: string;
  updatedAt?: string;
  sesionClase: SesionClase;
  SolicitudJustificacion?: SolicitudJustificacion[];
}

interface SolicitudJustificacion {
  id: string;
  fechaAlegacion: string;
  alegacion?: string;
  respuesta?: string | null;
  rechazada?: boolean;
  fechaRespuesta?: string | null;
  estadoJustificacion?: {
    id: string;
    denominacion: string;
  };
}

export default function JustificarFalta() {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const asistenciaId = searchParams.get('asistenciaId');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);  const [asistencia, setAsistencia] = useState<AsistenciaAlumno | null>(null);  
  const [alegacion, setAlegacion] = useState('');
  const [enlaceDocumentacion, setEnlaceDocumentacion] = useState('');  
  const [estadosJustificacion, setEstadosJustificacion] = useState<EstadoJustificacion[]>([]);
  useEffect(() => {
    const fetchAsistencia = async () => {
      if (!asistenciaId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/asistencias-alumno/${asistenciaId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener la información de asistencia');
        }

        const data = await response.json();
        // La API devuelve un objeto único, no un array
        if (data && data.id) {
          setAsistencia(data);
          
          // Comprobar si hay una justificación rechazada y cargar los datos
          if (data.SolicitudJustificacion && data.SolicitudJustificacion.length > 0) {
            const justificacion = data.SolicitudJustificacion[0];
            if (justificacion.rechazada) {
              // Prellenar el formulario con la alegación anterior
              setAlegacion(justificacion.alegacion || '');
            }
          }
        } else {
          throw new Error('Registro de asistencia no encontrado');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };    // Obtener los estados de justificación
    const fetchEstadosJustificacion = async () => {
      try {
        const response = await fetch('/api/estados-justificacion', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener los estados de justificación');
        }        
        
        const data = await response.json();
        setEstadosJustificacion(data);
          console.log('Estados de justificación disponibles:', data);
        // Mostrar los IDs y denominaciones para depuración
        console.log('Estados detallados:', data.map((e: EstadoJustificacion) => `${e.denominacion} (${e.id})`));
      } catch (error) {
        console.error('Error al obtener estados de justificación:', error);
      }
    };

    if (session?.user?.id) {
      fetchEstadosJustificacion();
      if (asistenciaId) {
        fetchAsistencia();
      }
    }
  }, [session, asistenciaId]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!asistencia || !session?.user?.id || !enlaceDocumentacion) return;
    
    try {
      setIsLoading(true);
        // Validar que haya un enlace
      if (!enlaceDocumentacion.startsWith('http://') && !enlaceDocumentacion.startsWith('https://')) {
        throw new Error('Por favor, proporciona un enlace válido (debe comenzar con http:// o https://)');
      }      // Crear los datos para la solicitud de justificación
      // Buscar el estado "Pendiente" para nuevas justificaciones
      const pendienteEstado = estadosJustificacion.find((estado: EstadoJustificacion) => 
        estado.denominacion.toLowerCase() === 'pendiente'
      );
      
      // Usar el estado "Pendiente" o el primer estado disponible como fallback
      const estadoJustificacionId = pendienteEstado ? pendienteEstado.id : 
        (estadosJustificacion.length > 0 ? estadosJustificacion[0].id : null);
        
      // Registrar para debug
      console.log('Estado Pendiente encontrado:', pendienteEstado?.denominacion || 'No encontrado');
      console.log('Usando estado de justificación:', estadoJustificacionId);
        
      if (!estadoJustificacionId) {
        console.error('ESTADO_JUSTIFICACION_ERROR: No hay estados de justificación disponibles en el sistema.');
        throw new Error('No se encontró ningún estado de justificación válido en el sistema.');
      }
      
      console.log('Utilizando estadoJustificacionId:', estadoJustificacionId);
      
      const solicitudData = {
        asistenciaAlumnoId: asistencia.id,
        alumnoId: session.user.id,
        fechaAlegacion: new Date(), // Usando el objeto Date directamente
        alegacion: alegacion,
        estadoJustificacionId: estadoJustificacionId
      };
        // Enviar la solicitud de justificación
      const response = await fetch('/api/solicitudes-justificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(solicitudData),
        credentials: 'include',
      });
        if (!response.ok) {
        // Intentar obtener el mensaje de error detallado de la API
        let errorMessage = 'Error al enviar la solicitud de justificación';        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Error detallado:', errorData);
          console.error('Datos enviados:', solicitudData);
        } catch {
          console.error('No se pudo obtener detalle del error');
        }
        throw new Error(`${errorMessage} (código: ${response.status})`);
      }
      
      const result = await response.json();      // Registrar la documentación como un enlace
      const docData = {
        solicitudJustificacionId: result.id,
        url: enlaceDocumentacion,
        fechaSubida: new Date(), // Usando el objeto Date directamente
        // Eliminamos campos no reconocidos por la API
      };
        const docResponse = await fetch('/api/documentacion-justificacion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docData),
        credentials: 'include',
      });
      
      if (!docResponse.ok) {
        // Intentar obtener el mensaje de error detallado de la API
        let errorMessage = 'Error al registrar la documentación';
        try {
          const errorData = await docResponse.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Error detallado documentación:', errorData);
        } catch {
          console.error('No se pudo obtener detalle del error de documentación');
        }
        throw new Error(errorMessage);
      }
      
      setSuccess(true);
      
      // Redirección a dashboard después de un tiempo
      setTimeout(() => {
        router.push('/alumno/dashboard');
      }, 2000);    } catch (error) {
      console.error('Error detallado completo:', error);
      
      // Mostrar información detallada del error en la consola para depuración
      if (error instanceof Error) {
        console.error('Mensaje del error:', error.message);
        if ('cause' in error && error.cause) {
          console.error('Causa del error:', error.cause);
        }
      }
      
      let errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Dar un mensaje más amigable para ciertos errores comunes
      if (errorMessage.includes('estado de justificación especificado no existe')) {
        errorMessage = 'El sistema no tiene configurados los estados de justificación correctamente. Por favor, contacte con el administrador y mencione este error.';
      }
      
      setError(`Error al enviar la justificación: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
    // Eliminado el componente AdminNotice ya que no es necesario
  
  return (
    <DashboardContainer roleName="Alumno">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-4 sm:px-6 py-5 text-white">
            <Link
              href="/alumno/dashboard"
              className="inline-flex items-center mb-3 text-sm text-blue-100 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-1.5" /> Volver al dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Solicitud de justificación de falta
            </h1>
          </div>
            <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 font-medium">Cargando información...</p>
                <p className="text-sm text-gray-500 mt-1">Esto puede tardar unos segundos</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4">
                <div className="bg-red-100 p-4 rounded-full inline-flex items-center justify-center mx-auto mb-4">
                  <FaExclamationTriangle className="text-4xl text-red-500" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Ha ocurrido un error</h2>
                <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
                <Link 
                  href="/alumno/dashboard"
                  className="mt-4 inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
                >
                  <FaArrowLeft className="mr-2" /> Volver al dashboard
                </Link>
              </div>
            ) : success ? (
              <div className="text-center py-12 px-4">
                <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mt-2 mb-2 text-gray-800">¡Solicitud enviada con éxito!</h2>
                <div className="max-w-md mx-auto">
                  <p className="text-gray-600 mb-2">Tu solicitud de justificación ha sido enviada correctamente y será revisada por un gestor académico.</p>
                  <p className="text-gray-500 text-sm">Serás redirigido al dashboard en unos segundos...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {asistencia && asistencia.SolicitudJustificacion && asistencia.SolicitudJustificacion.length > 0 && 
                  asistencia.SolicitudJustificacion[0].rechazada && asistencia.SolicitudJustificacion[0].respuesta && (
                  <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                      <FaExclamationTriangle className="mr-2" />
                      Justificación rechazada anteriormente
                    </h3>
                    <p className="text-gray-700 mb-2">Tu justificación anterior fue rechazada por el siguiente motivo:</p>
                    <div className="p-3 bg-white rounded border border-red-100 text-gray-800">
                      {asistencia.SolicitudJustificacion[0].respuesta}
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      Por favor, revisa el motivo del rechazo, modifica tu justificación y vuelve a enviarla.
                    </p>
                  </div>
                )}

                {asistencia && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Información de la falta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Fecha</p>
                        <p className="font-medium">
                          {new Date(asistencia.fecha).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Grupo</p>
                        <p className="font-medium">{asistencia.sesionClase.grupo.denominacion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Estado de asistencia</p>
                        <p className={`font-medium ${
                          asistencia.estado === 'No Asiste' ? 'text-red-600' : 
                          asistencia.estado === '50%' ? 'text-amber-600' : 
                          'text-gray-800'
                        }`}>
                          {asistencia.estado}
                          {asistencia.estado === '50%' && (
                            <span className="ml-1 text-sm font-normal text-gray-500">(Asistencia parcial)</span>
                          )}
                        </p>
                      </div>
                    </div>                    <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-sm text-blue-700">
                        {asistencia.estado === '50%' 
                          ? "Estás justificando una asistencia parcial (50%). Esta solicitud será evaluada por un gestor académico."
                          : "Tu solicitud de justificación será evaluada por un gestor académico."}
                      </p>
                    </div>
                  </div>
                )}
                  <div className="mb-6">
                  <label 
                    htmlFor="alegacion" 
                    className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <span className="text-red-500 mr-1">*</span> Motivo de la justificación
                  </label>
                  <div className="relative">
                    <textarea
                      id="alegacion"
                      className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={5}
                      placeholder="Describe de forma detallada el motivo de tu ausencia..."
                      value={alegacion}
                      onChange={(e) => setAlegacion(e.target.value)}
                      required
                    ></textarea>
                    <div className="absolute top-0 right-0 p-1 bg-white rounded-bl text-xs text-gray-500">
                      {alegacion.length}/500 caracteres
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Detalla las razones de tu ausencia o asistencia parcial. Información clara ayudará a evaluar tu solicitud más rápido.</p>
                </div>
                  <div className="mb-6">
                  <label 
                    htmlFor="enlaceDocumentacion" 
                    className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <span className="text-red-500 mr-1">*</span> Enlace a documentación justificativa
                  </label>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-3">
                    <p className="text-sm text-gray-700">
                      <strong>Instrucciones:</strong> Comparte tu documento justificativo mediante un enlace. Puedes usar cualquier servicio de almacenamiento (Google Drive, OneDrive, Dropbox, etc.) o cualquier otra forma de compartir el archivo.
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-700 mt-2 ml-2 space-y-1">
                      <li>Sube tu archivo a un servicio de almacenamiento (Drive, OneDrive, Dropbox, WeTransfer...)</li>
                      <li>Crea un enlace público para compartir</li>
                      <li>Asegúrate de que el archivo sea accesible sin necesidad de solicitar permisos</li>
                      <li>Pega el enlace completo en el campo a continuación</li>
                    </ol>
                  </div>
                  
                  <div className="relative">
                    <input
                      id="enlaceDocumentacion"
                      type="url"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"                      placeholder="https://enlace-a-tu-documento.com/..."
                      value={enlaceDocumentacion}
                      onChange={(e) => setEnlaceDocumentacion(e.target.value)}
                      required
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 border-t border-gray-200 pt-6">
                  <Link
                    href="/alumno/dashboard"
                    className="flex justify-center items-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    className={`flex justify-center items-center px-5 py-2.5 rounded-md shadow-sm transition-colors ${
                      isLoading || !alegacion.trim() || !enlaceDocumentacion.trim() 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={isLoading || !alegacion.trim() || !enlaceDocumentacion.trim()}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin h-5 w-5 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enviar justificación
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
