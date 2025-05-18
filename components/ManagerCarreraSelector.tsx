'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

interface Carrera {
  id: string;
  denominacion: string;
}

interface ManagerCarrera {
  id: string;
  managerId: string;
  carreraId: string;
  activo: boolean;
  carrera: {
    id: string;
    denominacion: string;
  };
}

interface ManagerCarreraSelectorProps {
  userId: string;
  isOpen: boolean;
  onCloseAction?: () => void;
  onClose?: () => void;
}

export default function ManagerCarreraSelector({ userId, isOpen, onCloseAction, onClose }: ManagerCarreraSelectorProps) {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [assignedCarreras, setAssignedCarreras] = useState<ManagerCarrera[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCarreraId, setSelectedCarreraId] = useState<string>("");
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Usar cualquiera de las funciones de cierre que esté disponible
  const handleCloseDialog = () => {
    if (onClose) {
      onClose();
    } else if (onCloseAction) {
      onCloseAction();
    }
  };
  
  // Definir loadData con useCallback para evitar recreaciones innecesarias
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Cargar carreras disponibles
      const carrerasResponse = await fetch('/api/carreras');
      const carrerasData = await carrerasResponse.json();
      setCarreras(carrerasData);

      // Cargar carreras asignadas al manager
      const assignedResponse = await fetch(`/api/manager-carreras?managerId=${userId}`);
      const assignedData = await assignedResponse.json();
      setAssignedCarreras(assignedData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMessage({ text: 'Error al cargar los datos', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Cargar datos al abrir el diálogo
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);
  const handleAddCarrera = async () => {
    if (assignedCarreras.some(ac => ac.carreraId === selectedCarreraId && ac.activo)) {
      setMessage({ text: 'Esta carrera ya está asignada al manager', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/manager-carreras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          managerId: userId,
          carreraId: selectedCarreraId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al asignar carrera');
      }

      await response.json();
      
      // Refrescar la lista de asignaciones
      await loadData();
      
      setMessage({ text: 'Carrera asignada correctamente', type: 'success' });
      setSelectedCarreraId("");
    } catch (error: Error | unknown) {
      console.error('Error al asignar carrera:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al asignar carrera', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleRemoveCarrera = async (assignmentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/manager-carreras/${assignmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar asignación');
      }

      // Refrescar la lista de asignaciones
      await loadData();
      setMessage({ text: 'Asignación eliminada correctamente', type: 'success' });
    } catch (error: Error | unknown) {
      console.error('Error al eliminar asignación:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al eliminar asignación', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  // Función para manejar clics fuera del diálogo
  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseDialog();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleOutsideClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
          <h3 className="text-lg font-medium">
            Asignar Carreras al Manager
          </h3>          <button 
            onClick={handleCloseDialog}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {/* Selector de carreras y botón de agregar */}
            <div className="flex space-x-2">
              <select
                value={selectedCarreraId}
                onChange={(e) => setSelectedCarreraId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Selecciona una carrera...</option>
                {carreras.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.denominacion}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddCarrera}
                disabled={isLoading || !selectedCarreraId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
              >
                <FaPlus />
              </button>
            </div>
            
            {/* Lista de carreras asignadas */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Carreras asignadas</h4>
              {assignedCarreras.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay carreras asignadas a este manager</p>
              ) : (
                <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                  {assignedCarreras.map((assignment) => (
                    <li key={assignment.id} className="py-3 flex justify-between items-center">
                      <span className="text-sm">
                        {assignment.carrera?.denominacion || 'Carrera no disponible'}
                        {!assignment.activo && <span className="ml-2 text-xs text-red-600">(Inactiva)</span>}
                      </span>
                      <button
                        onClick={() => handleRemoveCarrera(assignment.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar asignación"
                      >
                        <FaTimes />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        
        {message && (
          <div className={`mx-6 p-3 rounded ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
