'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function ProfesorDashboard() {
  return (
    <DashboardLayout roleName="Profesor">
      <div>
        <h3 className="text-xl font-semibold mb-4">Panel de Profesor</h3>
        <p className="mb-4">Bienvenido al panel de Profesor. Desde aquí podrás gestionar tus clases y la asistencia de alumnos.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700">Mis Asignaturas</h4>
            <p className="text-sm text-gray-600 mt-1">Gestiona las asignaturas que impartes</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-700">Registro de Asistencia</h4>
            <p className="text-sm text-gray-600 mt-1">Registra la asistencia de los alumnos a clase</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-700">Solicitudes de Justificación</h4>
            <p className="text-sm text-gray-600 mt-1">Revisa y gestiona las solicitudes de justificación</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
