'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { FaArrowLeft, FaUpload, FaSave, FaExclamationTriangle } from 'react-icons/fa';

export default function JustificarFalta() {
  const { data: session, status } = useSession({
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
  const [success, setSuccess] = useState(false);
  const [asistencia, setAsistencia] = useState<any | null>(null);
  const [alegacion, setAlegacion] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    const fetchAsistencia = async () => {
      if (!asistenciaId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/asistencias-alumno?alumnoId=${session?.user?.id}&sesionClaseId=${asistenciaId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Error al obtener la información de asistencia');
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAsistencia(data[0]);
        } else {
          throw new Error('Registro de asistencia no encontrado');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(`Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id && asistenciaId) {
      fetchAsistencia();
    }
  }, [session, asistenciaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!asistencia || !session?.user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Este es un componente placeholder. En una implementación real, aquí se enviaría
      // la solicitud de justificación al backend y se manejarían los archivos adjuntos
      
      // Simulamos una petición exitosa
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      
      // Redirección a dashboard después de un tiempo
      setTimeout(() => {
        router.push('/alumno/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      setError(`Error al enviar la justificación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardContainer roleName="Alumno">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-4 text-white">
            <Link
              href="/alumno/dashboard"
              className="inline-block mb-3 text-sm text-blue-100 hover:text-white"
            >
              <FaArrowLeft className="inline mr-1" /> Volver al dashboard
            </Link>
            <h1 className="text-xl font-bold">Solicitud de justificación de falta</h1>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-3" />
                <p className="text-red-600">{error}</p>
                <Link 
                  href="/alumno/dashboard"
                  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  Volver al dashboard
                </Link>
              </div>
            ) : success ? (
              <div className="text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <FaSave className="text-2xl text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mt-4 mb-2">Solicitud enviada con éxito</h2>
                <p className="text-gray-600">Tu solicitud de justificación ha sido enviada correctamente. 
                Serás redirigido al dashboard en unos segundos.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {asistencia && (
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Información de la falta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Fecha</p>
                        <p className="font-medium">
                          {new Date(asistencia.sesionClase.fecha).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Grupo</p>
                        <p className="font-medium">{asistencia.sesionClase.grupo.denominacion}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mb-6">
                  <label 
                    htmlFor="alegacion" 
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Motivo de la justificación
                  </label>
                  <textarea
                    id="alegacion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={5}
                    placeholder="Describe el motivo de tu falta..."
                    value={alegacion}
                    onChange={(e) => setAlegacion(e.target.value)}
                    required
                  ></textarea>
                </div>
                
                <div className="mb-6">
                  <label 
                    htmlFor="documento" 
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Documentación justificativa (opcional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label 
                      htmlFor="documentacion"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaUpload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-gray-500">PDF, JPG, PNG (Máx. 10MB)</p>
                      </div>
                      <input 
                        id="documentacion" 
                        type="file" 
                        className="hidden"
                        onChange={(e) => setFiles(e.target.files)} 
                      />
                    </label>
                  </div>
                  {files && files.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-green-600">
                        Archivo seleccionado: {files[0].name}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3">
                  <Link
                    href="/alumno/dashboard"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={isLoading || !alegacion.trim()}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar justificación'}
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
