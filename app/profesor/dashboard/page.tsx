'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function ProfesorDashboard() {
  return (
    <DashboardLayout roleName="Profesor">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Hola, Profesor</h1>
        <p className="text-gray-600 mb-6">
          Bienvenido a tu portal de gestión de asistencias. Aquí podrás registrar asistencias, 
          gestionar tus clases y revisar justificaciones de alumnos.
        </p>
        
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <p className="text-green-700 font-medium">
            Este es tu dashboard personalizado. Próximamente tendrás acceso a más funcionalidades.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
