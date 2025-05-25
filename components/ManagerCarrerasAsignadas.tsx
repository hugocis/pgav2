'use client';

import { useState, useEffect } from 'react';
import { FaGraduationCap, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface Carrera {
  id: string;
  denominacion: string;
}

export default function ManagerCarrerasAsignadas() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  useEffect(() => {
    const fetchCarreras = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/carreras');
        if (!response.ok) {
          throw new Error('Error al cargar las carreras');
        }
        const data = await response.json();
        setCarreras(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarreras();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex justify-center items-center h-32">
          <FaSpinner className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center text-red-600 p-4">
          <FaExclamationTriangle className="mr-2" />
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (carreras.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-gray-500">No tienes carreras asignadas.</p>
            <p className="text-sm text-gray-400 mt-2">Contacta con un administrador para asignar carreras.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-white to-blue-50/30 p-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
            <FaGraduationCap className="text-blue-600" />
          </div>
          <span>Carreras Asignadas</span>
        </h2>
      </div>
      <div className="p-6">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Denominación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {carreras.map((carrera, index) => (
                <tr key={carrera.id} className={index % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{carrera.denominacion}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
