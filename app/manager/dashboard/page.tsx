'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function ManagerDashboard() {
  return (
    <DashboardLayout roleName="Manager">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Hola, Manager</h1>
        <p className="text-gray-600 mb-6">
          Bienvenido a tu portal de gestión. Aquí podrás supervisar y gestionar la actividad académica,
          revisar informes y coordinar al equipo docente.
        </p>
        
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-md">
          <p className="text-purple-700 font-medium">
            Este es tu dashboard personalizado. Próximamente tendrás acceso a más funcionalidades.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
