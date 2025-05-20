'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';

interface Carrera {
  id: string;
  denominacion: string;
}

interface Asignatura {
  id: string;
  Denominacion: string;
  CodAsignatura: string;
  carrera: Carrera;
  Curso?: string;
  Cuatrimestre?: string;
}

interface Matricula {
  id: string;
  asignatura: Asignatura;
  totalSesiones?: number;
  asistencias?: number;
  faltas?: number;
  porcentajeAsistencia?: number;
}

interface ConfiguracionCarrera {
  id: string;
  carreraId: string;
  FechaInicioDispensa: string | null;
  FechaFinDispensa: string | null;
  SolDispensa: boolean;
  SolJustificacion: boolean;
}

interface EstadoDispensa {
  id: string;
  denominacion: string;
}

export default function SolicitarDispensa() {
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const matriculaId = searchParams.get('matriculaId');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [matricula, setMatricula] = useState<Matricula | null>(null);
  const [configuracionCarrera, setConfiguracionCarrera] = useState<ConfiguracionCarrera | null>(null);
  const [estadosDispensa, setEstadosDispensa] = useState<EstadoDispensa[]>([]);
  
  const [alegacion, setAlegacion] = useState('');
  const [enlaceDocumentacion, setEnlaceDocumentacion] = useState('');

  useEffect(() => {
    const fetchMatricula = async () => {
      if (!matriculaId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/matriculas/${matriculaId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener la información de matrícula');
        }

        const data = await response.json();
        // La API devuelve un objeto único, no un array
        if (data && data.id) {
          setMatricula(data);
          
          // Una vez que tenemos la matrícula, buscamos la configuración de la carrera
          const configResponse = await fetch(`/api/configuracion-carrera?carreraId=${data.asignatura.carrera.id}`, {
            credentials: 'include',
          });
          
          if (!configResponse.ok) {
            throw new Error('Error al obtener la configuración de carrera');
          }
          
          const configData = await configResponse.json();
          const configuracionCarrera = Array.isArray(configData) ? configData[0] : configData;
          
          if (configuracionCarrera) {
            setConfiguracionCarrera(configuracionCarrera);
          }

          // Verificar si ya existe una solicitud de dispensa pendiente para esta matrícula
          if (session?.user?.id) {
            const dispensasResponse = await fetch(`/api/solicitudes-dispensa?alumnoId=${session.user.id}&matriculaId=${data.id}`, {
              credentials: 'include',
            });
            
            if (dispensasResponse.ok) {
              const dispensasData = await dispensasResponse.json();
              
              // Comprobar si hay alguna solicitud pendiente
              const tieneSolicitudPendiente = Array.isArray(dispensasData) && dispensasData.some(
                solicitud => solicitud.estadoDispensa?.denominacion === 'Pendiente'
              );
              
              if (tieneSolicitudPendiente) {
                setError('Ya tienes una solicitud de dispensa pendiente para esta asignatura. No puedes enviar otra hasta que se resuelva.');
                console.log('Se encontró solicitud pendiente para esta matrícula');
              }
            }
          }
        } else {
          throw new Error('Registro de matrícula no encontrado');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Obtener los estados de dispensa
    const fetchEstadosDispensa = async () => {
      try {
        const response = await fetch('/api/estados-dispensa', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener los estados de dispensa');
        }
        
        const data = await response.json();
        setEstadosDispensa(data);
        console.log('Estados de dispensa disponibles:', data);
      } catch (error) {
        console.error('Error al obtener estados de dispensa:', error);
      }
    };

    if (session?.user?.id) {
      fetchEstadosDispensa();
      if (matriculaId) {
        fetchMatricula();
      }
    }
  }, [session, matriculaId]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!matricula || !session?.user?.id || !enlaceDocumentacion) return;
    
    try {
      setIsLoading(true);
      
      // Validar que haya un enlace
      if (!enlaceDocumentacion.startsWith('http://') && !enlaceDocumentacion.startsWith('https://')) {
        throw new Error('Por favor, proporciona un enlace válido (debe comenzar con http:// o https://)');
      }
      
      // Verificar de nuevo si ya existe una solicitud pendiente para esta matrícula
      const dispensasResponse = await fetch(`/api/solicitudes-dispensa?alumnoId=${session.user.id}&matriculaId=${matricula.id}`, {
        credentials: 'include',
      });
      
      if (dispensasResponse.ok) {
        const dispensasData = await dispensasResponse.json();
        
        // Comprobar si hay alguna solicitud pendiente
        const tieneSolicitudPendiente = Array.isArray(dispensasData) && dispensasData.some(
          solicitud => solicitud.estadoDispensa?.denominacion === 'Pendiente'
        );
        
        if (tieneSolicitudPendiente) {
          throw new Error('Ya tienes una solicitud de dispensa pendiente para esta asignatura. No puedes enviar otra hasta que se resuelva.');
        }
      }
      
      // Buscar el estado "Pendiente" para nuevas dispensas
      const pendienteEstado = estadosDispensa.find((estado: EstadoDispensa) => 
        estado.denominacion.toLowerCase() === 'pendiente'
      );
      
      // Usar el estado "Pendiente" o el primer estado disponible como fallback
      const estadoDispensaId = pendienteEstado ? pendienteEstado.id : 
        (estadosDispensa.length > 0 ? estadosDispensa[0].id : null);
      
      console.log('Estado Pendiente encontrado:', pendienteEstado?.denominacion || 'No encontrado');
      console.log('Usando estado de dispensa:', estadoDispensaId);
      
      if (!estadoDispensaId) {
        console.error('ESTADO_DISPENSA_ERROR: No hay estados de dispensa disponibles en el sistema.');
        throw new Error('No se encontró ningún estado de dispensa válido en el sistema.');
      }
      
      // Crear los datos para la solicitud de dispensa
      const solicitudData = {
        alumnoId: session.user.id,
        matriculaId: matricula.id,
        fechaAlegacion: new Date(),
        alegacion: alegacion,
        estadoDispensaId: estadoDispensaId
      };
      
      // Enviar la solicitud de dispensa
      const response = await fetch('/api/solicitudes-dispensa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(solicitudData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        // Intentar obtener el mensaje de error detallado de la API
        let errorMessage = 'Error al enviar la solicitud de dispensa';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Error detallado:', errorData);
          console.error('Datos enviados:', solicitudData);
        } catch {
          console.error('No se pudo obtener detalle del error');
        }
        throw new Error(`${errorMessage} (código: ${response.status})`);
      }
      
      const result = await response.json();
      
      // Registrar la documentación como un enlace
      const docData = {
        solicitudDispensaId: result.id,
        url: enlaceDocumentacion,
        fechaSubida: new Date()
      };
      
      const docResponse = await fetch('/api/documentacion-dispensa', {
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
      }, 2000);
    } catch (error) {
      console.error('Error detallado completo:', error);
      
      let errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Dar un mensaje más amigable para ciertos errores comunes
      if (errorMessage.includes('estado de dispensa especificado no existe')) {
        errorMessage = 'El sistema no tiene configurados los estados de dispensa correctamente. Por favor, contacte con el administrador y mencione este error.';
      }
      
      setError(`Error al enviar la dispensa: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardContainer roleName="Alumno">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-4 sm:px-6 py-5 text-white">
            <Link
              href="/alumno/dashboard"
              className="inline-flex items-center mb-3 text-sm text-blue-100 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-1.5" /> Volver al dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l3 3m0 0l3-3m-3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
              Solicitud de dispensa académica
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
                  <p className="text-gray-600 mb-2">Tu solicitud de dispensa ha sido enviada correctamente y será revisada por un gestor académico.</p>
                  <p className="text-gray-500 text-sm">Serás redirigido al dashboard en unos segundos...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {matricula && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Información de la asignatura</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Asignatura</p>
                        <p className="font-medium">
                          {matricula.asignatura.Denominacion}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Código</p>
                        <p className="font-medium">{matricula.asignatura.CodAsignatura}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Carrera</p>
                        <p className="font-medium">{matricula.asignatura.carrera.denominacion}</p>
                      </div>
                      {matricula.asignatura.Curso && (
                        <div>
                          <p className="text-sm text-gray-500">Curso</p>
                          <p className="font-medium">{matricula.asignatura.Curso}</p>
                        </div>
                      )}
                      {matricula.asignatura.Cuatrimestre && (
                        <div>
                          <p className="text-sm text-gray-500">Cuatrimestre</p>
                          <p className="font-medium">{matricula.asignatura.Cuatrimestre}</p>
                        </div>
                      )}
                      {configuracionCarrera && configuracionCarrera.FechaFinDispensa && (
                        <div>
                          <p className="text-sm text-gray-500">Fecha límite</p>
                          <p className="font-medium">
                            {new Date(configuracionCarrera.FechaFinDispensa).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-sm text-blue-700">
                        La dispensa académica exime al alumno de la obligación de asistencia a clase. Su solicitud será evaluada por un gestor académico.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <label 
                    htmlFor="alegacion" 
                    className="block text-sm font-medium text-gray-700 mb-1 flex items-center"
                  >
                    <span className="text-red-500 mr-1">*</span> Motivo de la dispensa
                  </label>
                  <div className="relative">
                    <textarea
                      id="alegacion"
                      className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={5}
                      placeholder="Describe de forma detallada el motivo por el que solicitas la dispensa académica..."
                      value={alegacion}
                      onChange={(e) => setAlegacion(e.target.value)}
                      required
                    ></textarea>
                    <div className="absolute top-0 right-0 p-1 bg-white rounded-bl text-xs text-gray-500">
                      {alegacion.length}/500 caracteres
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Detalla las razones por las que solicitas ser eximido de la obligación de asistir a clase. Información clara ayudará a evaluar tu solicitud más rápido.</p>
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
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://enlace-a-tu-documento.com/..."
                      value={enlaceDocumentacion}
                      onChange={(e) => setEnlaceDocumentacion(e.target.value)}
                      required
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
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
                        Enviar dispensa
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
