'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaChalkboardTeacher, 
  FaArrowLeft, 
  FaUsers, 
  FaUserGraduate, 
  FaCalendarAlt,
  FaInfoCircle,
  FaChevronRight
} from 'react-icons/fa';

// Interfaces para tipado
interface Docencia {
  id: number;
  asignatura: {
    id: number;
    CodAsignatura: string;
    Denominacion: string;
    Curso: string;
    Cuatrimestre: string;
    carrera: {
      id: number;
      denominacion: string;
    };
    cursoAcademico: {
      id: number;
      denominacion: string;
      activo: boolean;
    };
  };
}

interface Grupo {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  asignaturaId: number;
  totalAlumnos?: number;
  asistenciaPromedio?: number;
}

export default function GruposDocencia() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const params = useParams();
  const docenciaId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : null;
  
  const [docencia, setDocencia] = useState<Docencia | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocenciaYGrupos = async () => {
      if (!docenciaId) {
        setError('ID de docencia no válido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // 1. Obtener información de la docencia
        const docenciaResponse = await fetch(`/api/docencia/${docenciaId}`, {
          credentials: 'include'
        });
        
        if (!docenciaResponse.ok) {
          throw new Error('Error al obtener información de la docencia');
        }
        
        const docenciaData = await docenciaResponse.json();
        setDocencia(docenciaData);
        
        // 2. Obtener grupos asociados a la asignatura de esta docencia
        const gruposResponse = await fetch(`/api/(admin)/asignaturas/${docenciaData.asignaturaId}/grupos`, {
          credentials: 'include'
        });
        
        if (!gruposResponse.ok) {
          throw new Error('Error al obtener los grupos asociados a la asignatura');
        }
        
        const gruposData = await gruposResponse.json();
        
        // 3. Para cada grupo, obtener estadísticas adicionales (número de alumnos y asistencia promedio)
        const gruposConEstadisticas = await Promise.all(gruposData.map(async (grupo: Grupo) => {
          try {
            // 3.1 Obtener número de alumnos del grupo
            const alumnosResponse = await fetch(`/api/(admin)/grupos/${grupo.id}/alumnos/count`, {
              credentials: 'include'
            }).catch(() => ({ ok: false }));
            
            // 3.2 Obtener promedio de asistencia del grupo
            const asistenciaResponse = await fetch(`/api/(admin)/grupos/${grupo.id}/asistencia/promedio`, {
              credentials: 'include'
            }).catch(() => ({ ok: false }));
            
            const alumnosData = alumnosResponse.ok && 'json' in alumnosResponse ? await alumnosResponse.json() : null;
            const asistenciaData = asistenciaResponse.ok && 'json' in asistenciaResponse ? await asistenciaResponse.json() : null;
            
            return {
              ...grupo,
              totalAlumnos: alumnosData?.count || 0,
              asistenciaPromedio: asistenciaData?.promedio || null
            };
          } catch (err) {
            console.error(`Error al obtener estadísticas para el grupo ${grupo.id}:`, err);
            return grupo;
          }
        }));
        
        setGrupos(gruposConEstadisticas);
        
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocenciaYGrupos();
  }, [docenciaId]);

  return (
    <DashboardContainer roleName="Profesor">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
          {/* Navegación y Título */}
          <div className="mb-5 flex items-center">
            <Link 
              href="/profesor/dashboard" 
              className="mr-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FaArrowLeft className="inline-block" />
              <span className="ml-1">Volver al Dashboard</span>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D3C68] mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información de grupos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600 flex flex-col items-center">
                <FaInfoCircle className="text-3xl mb-2" />
                <p>{error}</p>
                <Link 
                  href="/profesor/dashboard" 
                  className="mt-4 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : docencia ? (
            <>
              {/* Encabezado de información de asignatura */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-4 text-white">
                  <h1 className="text-2xl font-bold flex items-center">
                    <FaUsers className="mr-3" />
                    Grupos de {docencia.asignatura.Denominacion}
                  </h1>
                  <p className="text-blue-100 text-sm mt-1">
                    {docencia.asignatura.carrera.denominacion} • {docencia.asignatura.cursoAcademico.denominacion}
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs uppercase tracking-wider text-blue-700 font-medium mb-1">Asignatura</p>
                      <p className="font-medium">{docencia.asignatura.CodAsignatura} - {docencia.asignatura.Denominacion}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs uppercase tracking-wider text-blue-700 font-medium mb-1">Curso y Cuatrimestre</p>
                      <p className="font-medium">
                        {docencia.asignatura.Curso} {docencia.asignatura.Curso && docencia.asignatura.Curso.includes('º') ? 'curso' : ''} 
                        {docencia.asignatura.Cuatrimestre && `, ${docencia.asignatura.Cuatrimestre} ${docencia.asignatura.Cuatrimestre.includes('º') ? 'cuatrimestre' : ''}`}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-xs uppercase tracking-wider text-blue-700 font-medium mb-1">Total de Grupos</p>
                      <p className="font-medium">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Lista de grupos */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Listado de Grupos</h2>
                  
                  {grupos.length === 0 ? (
                    <div className="text-center py-8">
                      <FaUsers className="text-5xl text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-600">No hay grupos asociados</h3>
                      <p className="text-gray-500 mt-2">
                        No se encontraron grupos asociados a esta asignatura. 
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Código
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Alumnos
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Asistencia promedio
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {grupos.map((grupo) => (
                            <tr key={grupo.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {grupo.codigo}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {grupo.nombre}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {grupo.totalAlumnos ?? 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {grupo.asistenciaPromedio !== undefined && grupo.asistenciaPromedio !== null
                                  ? `${Math.round(grupo.asistenciaPromedio * 100)}%`
                                  : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <Link 
                                  href={`/profesor/grupos/${docenciaId}/alumnos/${grupo.id}`} 
                                  className="text-[#0D3C68] hover:text-[#072747] font-medium flex items-center justify-end"
                                >
                                  Ver alumnos
                                  <FaChevronRight className="ml-1" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600 flex flex-col items-center">
                <FaInfoCircle className="text-3xl mb-2" />
                <p>No se encontró información de la docencia solicitada</p>
                <Link 
                  href="/profesor/dashboard" 
                  className="mt-4 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
