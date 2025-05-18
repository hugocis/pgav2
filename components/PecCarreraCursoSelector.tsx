'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

interface Carrera {
  id: string;
  denominacion: string;
}

interface PecCarreraCurso {
  id: string;
  pecId: string;
  carreraId: string;
  curso: number;
  activo: boolean;
  carrera: {
    id: string;
    denominacion: string;
  };
}

interface PecCarreraCursoSelectorProps {
  userId: string;
  isOpen: boolean;
  onCloseAction?: () => void;
  onClose?: () => void;
}

export default function PecCarreraCursoSelector({ userId, isOpen, onCloseAction, onClose }: PecCarreraCursoSelectorProps) {
  // Usar cualquiera de las funciones de cierre que esté disponible
  const handleCloseDialog = () => {
    if (onClose) {
      onClose();
    } else if (onCloseAction) {
      onCloseAction();
    }
  };
  const [carreras, setCarreras] = useState<Carrera[]>([]);  const [assignedCarrerasCursos, setAssignedCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCarreraId, setSelectedCarreraId] = useState<string>("");
  const [selectedCurso, setSelectedCurso] = useState<number>(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cursos disponibles (1º, 2º, 3º, 4º)
  const cursos = [
    { value: 1, label: "1º Curso" },
    { value: 2, label: "2º Curso" },
    { value: 3, label: "3º Curso" },
    { value: 4, label: "4º Curso" }
  ];  // Definir loadData con useCallback para evitar recreaciones innecesarias
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {      // Cargar carreras disponibles
      const carrerasResponse = await fetch('/api/carreras');
      const carrerasData = await carrerasResponse.json();
      setCarreras(carrerasData);

      // Cargar asignaciones del PEC
      const assignedResponse = await fetch(`/api/pec-carreras-cursos?pecId=${userId}`);
      const assignedData = await assignedResponse.json();
      setAssignedCarrerasCursos(assignedData);
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

  const handleAddAsignacion = async () => {
    if (!selectedCarreraId) {
      setMessage({ text: 'Por favor, selecciona una carrera', type: 'error' });
      return;
    }
    
    if (!selectedCurso) {
      setMessage({ text: 'Por favor, selecciona un curso', type: 'error' });
      return;
    }

    // Verificar si la combinación ya está asignada
    if (assignedCarrerasCursos.some(
      acc => acc.carreraId === selectedCarreraId && 
             acc.curso === selectedCurso && 
             acc.activo
    )) {
      setMessage({ text: 'Esta combinación de carrera y curso ya está asignada al PEC', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/pec-carreras-cursos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pecId: userId,
          carreraId: selectedCarreraId,
          curso: selectedCurso
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al asignar carrera y curso');
      }

      await response.json();
      
      // Refrescar la lista de asignaciones
      await loadData();
      
      setMessage({ text: 'Asignación creada correctamente', type: 'success' });
      setSelectedCarreraId("");
      setSelectedCurso(0);    } catch (error: Error | unknown) {
      console.error('Error al crear asignación:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al crear asignación', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAsignacion = async (assignmentId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pec-carreras-cursos/${assignmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la asignación');
      }

      // Refrescar la lista de asignaciones
      await loadData();
      
      setMessage({ text: 'Asignación eliminada correctamente', type: 'success' });    } catch (error: Error | unknown) {
      console.error('Error al eliminar asignación:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al eliminar asignación', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            Asignar Carreras y Cursos al PEC
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
            {/* Selector de carreras */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
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
            </div>

            {/* Selector de cursos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
              <select
                value={selectedCurso}
                onChange={(e) => setSelectedCurso(Number(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={0}>Selecciona un curso...</option>
                {cursos.map((curso) => (
                  <option key={curso.value} value={curso.value}>
                    {curso.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón de agregar */}
            <div className="flex justify-end">
              <button
                onClick={handleAddAsignacion}
                disabled={isLoading || !selectedCarreraId || !selectedCurso}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 flex items-center"
              >
                <FaPlus className="mr-2" /> Agregar Asignación
              </button>
            </div>
            
            {/* Lista de asignaciones */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Asignaciones actuales</h4>
              {assignedCarrerasCursos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay asignaciones para este PEC</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrera</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignedCarrerasCursos.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.carrera?.denominacion || 'Carrera no disponible'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {assignment.curso}º Curso
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {assignment.activo ? 
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Activa</span> :
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactiva</span>
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRemoveAsignacion(assignment.id)}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-900 focus:outline-none"
                            >
                              <FaTimes className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
          >
            <FaTimes className="mr-2" /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
