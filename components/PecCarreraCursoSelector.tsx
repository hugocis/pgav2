'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTimes, FaEdit, FaCheck } from 'react-icons/fa';

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
  const [carreras, setCarreras] = useState<Carrera[]>([]);  
  const [assignedCarrerasCursos, setAssignedCarrerasCursos] = useState<PecCarreraCurso[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCarreraId, setSelectedCarreraId] = useState<string>("");
  const [selectedCurso, setSelectedCurso] = useState<number>(0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<PecCarreraCurso | null>(null);

  // Cursos disponibles (1º, 2º, 3º, 4º)
  const cursos = [
    { value: 1, label: "1º Curso" },
    { value: 2, label: "2º Curso" },
    { value: 3, label: "3º Curso" },
    { value: 4, label: "4º Curso" }
  ];  
  
  // Definir loadData con useCallback para evitar recreaciones innecesarias
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Cargar carreras disponibles
      const carrerasResponse = await fetch('/api/carreras');
      if (!carrerasResponse.ok) {
        throw new Error(`Error al cargar carreras: ${carrerasResponse.status}`);
      }
      const carrerasData = await carrerasResponse.json();
      setCarreras(Array.isArray(carrerasData) ? carrerasData : []);
      
      // Cargar asignaciones del PEC
      console.log('Solicitando asignaciones para pecId:', userId);
      const assignedResponse = await fetch(`/api/carreras-cursos?pecId=${userId}`);
      
      if (!assignedResponse.ok) {
        const errorData = await assignedResponse.json();
        console.error('Error en la respuesta de la API:', errorData);
        throw new Error(`Error al cargar asignaciones: ${assignedResponse.status} - ${errorData.error || 'Error desconocido'}`);
      }
      
      const assignedData = await assignedResponse.json();
      console.log('Datos recibidos:', assignedData);
      
      // Asegurar que assignedData sea un array
      setAssignedCarrerasCursos(Array.isArray(assignedData) ? assignedData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setMessage({ text: `Error al cargar los datos: ${error instanceof Error ? error.message : 'Error desconocido'}`, type: 'error' });
      // Inicializar arrays vacíos para evitar errores de mapeo
      setAssignedCarrerasCursos([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Cargar datos al abrir el diálogo
  useEffect(() => {
    if (isOpen) {
      loadData();
      // Resetear estados
      setEditMode(false);
      setEditingAssignment(null);
      setSelectedCarreraId("");
      setSelectedCurso(0);
    }
  }, [isOpen, loadData]);
  
  // Asegurar que assignedCarrerasCursos siempre sea un array válido
  const safeAssignedCarrerasCursos = Array.isArray(assignedCarrerasCursos) ? assignedCarrerasCursos : [];
  
  // Definir la función handleEditAssignment si no existe
  const handleStartEdit = (assignment: PecCarreraCurso) => {
    setEditMode(true);
    setEditingAssignment(assignment);
    setSelectedCarreraId(assignment.carreraId);
    setSelectedCurso(assignment.curso);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingAssignment(null);
    setSelectedCarreraId("");
    setSelectedCurso(0);
  };

  const handleAddAsignacion = async () => {
    if (!selectedCarreraId) {
      setMessage({ text: 'Por favor, selecciona una carrera', type: 'error' });
      return;
    }
    
    if (!selectedCurso) {
      setMessage({ text: 'Por favor, selecciona un curso', type: 'error' });
      return;
    }    // Verificar si ya existe esta asignación
    if (safeAssignedCarrerasCursos.some((acc: PecCarreraCurso) => 
        acc.carreraId === selectedCarreraId && 
        acc.curso === selectedCurso && 
        acc.activo
    )) {
      setMessage({ text: 'Esta combinación de carrera y curso ya está asignada al PEC', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      if (editMode && editingAssignment) {        // Actualizar una asignación existente
        const response = await fetch(`/api/carreras-cursos/${editingAssignment?.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            carreraId: selectedCarreraId,
            curso: selectedCurso
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Error al actualizar la asignación');
        }

        await response.json();
        setMessage({ text: 'Asignación actualizada correctamente', type: 'success' });
        
        // Salir del modo de edición
        setEditMode(false);
        setEditingAssignment(null);
      } else {        // Crear una nueva asignación
        const response = await fetch(`/api/carreras-cursos?pecId=${userId}`, {
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
        setMessage({ text: 'Asignación creada correctamente', type: 'success' });
      }
      
      // Refrescar la lista de asignaciones
      await loadData();
      
      // Limpiar selecciones
      setSelectedCarreraId("");
      setSelectedCurso(0);
    } catch (error: unknown) {
      console.error('Error al procesar asignación:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al procesar asignación', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAsignacion = async (assignmentId: string) => {
    // Si estamos en modo de edición y tratando de eliminar la asignación que estamos editando, cancele
    if (editMode && editingAssignment?.id === assignmentId) {
      return;
    }
    
    setIsLoading(true);
    try {      const response = await fetch(`/api/carreras-cursos/${assignmentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la asignación');
      }

      // Refrescar la lista de asignaciones
      await loadData();
      
      setMessage({ text: 'Asignación eliminada correctamente', type: 'success' });
    } catch (error: unknown) {
      console.error('Error al eliminar asignación:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Error al eliminar asignación', 
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleCloseDialog()}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
          <h3 className="text-lg font-medium">
            {editMode ? 'Editar Asignación de Carrera y Curso' : 'Asignar Carreras y Cursos al PEC'}
          </h3>
          <button 
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
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-3">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                <select
                  value={selectedCurso}
                  onChange={(e) => setSelectedCurso(Number(e.target.value))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value={0}>Selecciona...</option>
                  {cursos.map((curso) => (
                    <option key={curso.value} value={curso.value}>
                      {curso.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end">
              <div className="flex space-x-2">
                {editMode && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none"
                  >
                    <FaTimes className="mr-2 inline" /> Cancelar
                  </button>
                )}
                <button
                  onClick={handleAddAsignacion}
                  disabled={isLoading || !selectedCarreraId || !selectedCurso}
                  className={`px-4 py-2 ${editMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md focus:outline-none disabled:bg-gray-400 flex items-center`}
                >
                  {editMode ? (
                    <>
                      <FaCheck className="mr-2" /> Actualizar
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" /> Agregar
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Lista de asignaciones */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Asignaciones actuales</h4>
              {safeAssignedCarrerasCursos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No hay asignaciones para este PEC</p>
              ) : (
                <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
                  {safeAssignedCarrerasCursos.map((assignment: PecCarreraCurso) => (
                    <li key={assignment.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="text-sm">
                          {assignment.carrera?.denominacion || 'Carrera no disponible'} - {assignment.curso}º Curso
                          {!assignment.activo && <span className="ml-2 text-xs text-red-600">(Inactiva)</span>}
                        </span>
                      </div>
                      <div className="flex space-x-3">
                        {assignment.activo && (
                          <button
                            onClick={() => handleStartEdit(assignment)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Editar asignación"
                          >
                            <FaEdit />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveAsignacion(assignment.id)}
                          className="text-red-500 hover:text-red-700"
                          title={assignment.activo ? "Desactivar asignación" : "Eliminar asignación"}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
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
