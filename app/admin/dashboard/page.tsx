'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { FaUsers, FaUserGraduate, FaChalkboardTeacher, FaBuilding, FaBook, FaCalendarAlt } from 'react-icons/fa';

// Tipo para estadísticas
interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalCareers: number;
  totalSubjects: number;
  totalCourses: number;
  isLoading: boolean;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalCareers: 0,
    totalSubjects: 0,
    totalCourses: 0,
    isLoading: true,
  });

  useEffect(() => {
    // Función para cargar estadísticas desde la API
    const fetchStats = async () => {
      try {
        // Esta es solo una simulación para mostrar datos de ejemplo
        // En un entorno real, se harían llamadas a la API para obtener datos reales
        
        // Simular tiempo de carga
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setStats({
          totalUsers: 458,
          totalStudents: 380,
          totalTeachers: 42,
          totalCareers: 15,
          totalSubjects: 124,
          totalCourses: 4,
          isLoading: false,
        });
        
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  // Tarjetas de estadísticas
  const statCards = [
    { title: 'Usuarios Totales', value: stats.totalUsers, icon: <FaUsers className="text-blue-500" size={24} />, color: 'blue' },
    { title: 'Alumnos', value: stats.totalStudents, icon: <FaUserGraduate className="text-green-500" size={24} />, color: 'green' },
    { title: 'Profesores', value: stats.totalTeachers, icon: <FaChalkboardTeacher className="text-purple-500" size={24} />, color: 'purple' },
    { title: 'Carreras', value: stats.totalCareers, icon: <FaBuilding className="text-amber-500" size={24} />, color: 'amber' },
    { title: 'Asignaturas', value: stats.totalSubjects, icon: <FaBook className="text-rose-500" size={24} />, color: 'rose' },
    { title: 'Cursos Académicos', value: stats.totalCourses, icon: <FaCalendarAlt className="text-indigo-500" size={24} />, color: 'indigo' },
  ];

  return (
    <DashboardLayout roleName="Admin">
      <div>
        <h3 className="text-2xl font-bold mb-2">Dashboard Administración</h3>
        <p className="text-gray-600 mb-8">Vista general del sistema de gestión de asistencias</p>

        {stats.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse h-32 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {statCards.map((card, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-lg shadow p-6 border-l-4 border-${card.color}-500 hover:shadow-lg transition-shadow`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-gray-500 text-sm font-medium">{card.title}</h4>
                      <p className="text-3xl font-bold">{card.value}</p>
                    </div>
                    <div className={`rounded-full p-3 bg-${card.color}-100`}>
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10">
              <h3 className="text-xl font-semibold mb-4">Accesos Rápidos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                  <h4 className="font-semibold text-blue-700">Gestión de Usuarios</h4>
                  <p className="text-sm text-gray-600 mt-1">Administra usuarios, roles y permisos</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                  <h4 className="font-semibold text-green-700">Configuración Académica</h4>
                  <p className="text-sm text-gray-600 mt-1">Gestiona escuelas, carreras y planes de estudio</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
                  <h4 className="font-semibold text-purple-700">Registros del Sistema</h4>
                  <p className="text-sm text-gray-600 mt-1">Consulta logs y actividad del sistema</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
