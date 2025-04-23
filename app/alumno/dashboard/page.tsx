'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function AlumnoDashboard() {
  return (
    <DashboardLayout roleName="Alumno">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Hola, Alumno</h1>
        <p className="text-gray-600 mb-6">
          Bienvenido a tu portal de gestión de asistencias. Aquí podrás consultar tus asistencias, 
          solicitar justificaciones y ver tu progreso académico.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
          <p className="text-blue-700 font-medium">
            Este es tu dashboard personalizado. Próximamente tendrás acceso a más funcionalidades.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
