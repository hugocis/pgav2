'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaCalendarAlt, FaClipboardList, FaFileSignature, FaHourglassHalf, FaInfoCircle } from 'react-icons/fa';
import DashboardContainer from '@/components/DashboardContainer';

export default function FirmasDocente() {
  useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    }
  });

  const router = useRouter();

  return (
    <DashboardContainer roleName="Manager">
      <div className="bg-gray-50 min-h-full pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Panel de encabezado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/manager/dashboard" className="mr-3 text-white hover:text-blue-200 transition">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaFileSignature className="mr-3" />
                      Firmas Docente
                    </h1>
                  </div>
                  <p className="text-blue-100 mt-1">
                    Gestión y validación de firmas de profesores
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Contenido principal */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                    <FaClipboardList className="text-[#0D3C68]" />
                  </div>
                  <div>
                    <span className="text-gray-900">Módulo Pendiente de Desarrollo</span>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                      Esta página está en construcción
                    </div>
                  </div>
                </h2>
              </div>
            </div>

            <div className="p-8">
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="bg-blue-50 rounded-full p-8 mb-6">
                  <FaHourglassHalf className="text-blue-400 text-6xl" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">Módulo en Desarrollo</h3>
                <p className="text-gray-600 mb-8 max-w-2xl">
                  El módulo de gestión de firmas de docentes está actualmente en desarrollo. 
                  En este módulo podrás validar y gestionar las firmas de asistencia de los profesores, 
                  verificar cumplimiento de horarios y generar informes de actividad docente.
                </p>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 max-w-2xl text-left">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <FaInfoCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Este módulo incluirá las siguientes funcionalidades:
                      </p>
                      <ul className="mt-2 list-disc list-inside text-sm text-yellow-700">
                        <li>Registro de firmas diarias de profesores</li>
                        <li>Validación de asistencia a clases programadas</li>
                        <li>Informes de cumplimiento por profesor y asignatura</li>
                        <li>Notificaciones de incidencias</li>
                        <li>Exportación de informes en PDF y Excel</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Link
                  href="/manager/dashboard"
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white rounded-md shadow-md hover:shadow-lg transition-all"
                >
                  <FaArrowLeft className="mr-2" />
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Cronograma de desarrollo (opcional) */}
          <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <FaCalendarAlt className="mr-2 text-[#0D3C68]" />
                Cronograma de Desarrollo
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Análisis de requisitos</p>
                    <p className="text-sm text-gray-500">Completado</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-500 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Diseño de interfaz</p>
                    <p className="text-sm text-gray-500">Completado</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-yellow-500 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Desarrollo de backend</p>
                    <p className="text-sm text-gray-500">En progreso</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-gray-300 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Implementación de frontend</p>
                    <p className="text-sm text-gray-500">Pendiente</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-gray-300 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Pruebas y validación</p>
                    <p className="text-sm text-gray-500">Pendiente</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-4 w-4 rounded-full bg-gray-300 mt-1"></div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Lanzamiento</p>
                    <p className="text-sm text-gray-500">Pendiente</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}