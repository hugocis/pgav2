'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function PECDashboard() {
  return (
    <DashboardLayout roleName="PEC">
      <div>
        <h3 className="text-xl font-semibold mb-4">Panel de Profesor Encargado de Curso</h3>
        <p className="mb-4">Bienvenido al panel de PEC. Desde aquí podrás gestionar aspectos relacionados con el curso del que eres encargado.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700">Revisión de Asistencia</h4>
            <p className="text-sm text-gray-600 mt-1">Monitorea la asistencia de los alumnos del curso</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-700">Justificaciones Pendientes</h4>
            <p className="text-sm text-gray-600 mt-1">Revisa y gestiona solicitudes de justificación</p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-700">Coordinación Docente</h4>
            <p className="text-sm text-gray-600 mt-1">Coordina con los profesores del curso</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
