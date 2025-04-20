'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function AlumnoDashboard() {
  return (
    <DashboardLayout roleName="Alumno">
      <div>
        <h3 className="text-xl font-semibold mb-4">Panel de Alumno</h3>
        <p className="mb-4">Bienvenido a tu panel de estudiante. Desde aquí podrás consultar tu asistencia y gestionar justificaciones.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700">Mi Asistencia</h4>
            <p className="text-sm text-gray-600 mt-1">Consulta tu registro de asistencia a clases</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-700">Mis Justificaciones</h4>
            <p className="text-sm text-gray-600 mt-1">Gestiona tus solicitudes de justificación de faltas</p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-700">Mis Dispensas</h4>
            <p className="text-sm text-gray-600 mt-1">Solicita y consulta dispensas académicas</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
