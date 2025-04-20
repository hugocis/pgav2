'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function AdminDashboard() {
  return (
    <DashboardLayout roleName="Admin">
      <div>
        <h3 className="text-xl font-semibold mb-4">Panel de Administración</h3>
        <p className="mb-4">Bienvenido al panel de administración. Desde aquí podrás gestionar todos los aspectos del sistema.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-700">Gestión de Usuarios</h4>
            <p className="text-sm text-gray-600 mt-1">Administra usuarios, roles y permisos</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-700">Configuración Académica</h4>
            <p className="text-sm text-gray-600 mt-1">Gestiona escuelas, carreras y planes de estudio</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-purple-700">Registros del Sistema</h4>
            <p className="text-sm text-gray-600 mt-1">Consulta logs y actividad del sistema</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
