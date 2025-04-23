'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function PECDashboard() {
  return (
    <DashboardLayout roleName="PEC">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Hola, PEC</h1>
        <p className="text-gray-600 mb-6">
          Bienvenido a tu portal de gestión. Desde aquí podrás coordinar actividades académicas,
          supervisar procesos educativos y gestionar la planificación del curso.
        </p>
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
          <p className="text-amber-700 font-medium">
            Este es tu dashboard personalizado. Próximamente tendrás acceso a más funcionalidades.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
