'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function ManagerDashboard() {
  return (
    <DashboardLayout roleName="Manager">
      <div>
        <h3 className="text-xl font-semibold mb-4">Panel de Gestión</h3>
        <p className="mb-4">Bienvenido al panel de Manager. Desde aquí podrás gestionar la configuración y operación académica.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700">Asignaciones Docentes</h4>
            <p className="text-sm text-gray-600 mt-1">Gestiona asignaciones de profesores a asignaturas</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-700">Gestión de Grupos</h4>
            <p className="text-sm text-gray-600 mt-1">Configura los grupos académicos y sus horarios</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-700">Reportes Académicos</h4>
            <p className="text-sm text-gray-600 mt-1">Visualiza informes de asistencia y rendimiento</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
