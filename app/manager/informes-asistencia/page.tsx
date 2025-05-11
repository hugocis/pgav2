'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import {
  FaArrowLeft,
  FaChartBar,
  FaFileDownload,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBook,
  FaUniversity,
  FaChevronDown,
  FaHome,
  FaTachometerAlt
} from 'react-icons/fa';

// Interfaces para el tipado
interface AttendanceReportFilters {
  academicYear: string;
  department: string;
  subject: string;
  course: string;
  semester: string;
  minAttendanceRate: number;
  maxAttendanceRate: number;
  studentId: string;
  dateFrom: string;
  dateTo: string;
}

interface AttendanceData {
  id: string;
  subject: string;
  department: string;
  course: string;
  semester: string;
  attendanceRate: number;
  totalStudents: number;
  totalSessions: number;
  lastUpdateDate: string;
}

export default function AttendanceReports() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState(['2024-2025', '2023-2024']);
  const [departments, setDepartments] = useState(['Todos', 'Ingeniería', 'Ciencias', 'Humanidades', 'Derecho', 'Medicina']);
  const [subjects, setSubjects] = useState(['Todos', 'Matemáticas Discretas', 'Programación II', 'Física Cuántica', 'Historia del Arte']);
  const [courses, setCourses] = useState(['Todos', '1º', '2º', '3º', '4º']);
  const [semesters, setSemesters] = useState(['Todos', '1er Semestre', '2do Semestre', 'Anual']);
  
  const [filters, setFilters] = useState<AttendanceReportFilters>({
    academicYear: '2024-2025',
    department: 'Todos',
    subject: 'Todos',
    course: 'Todos',
    semester: 'Todos',
    minAttendanceRate: 0,
    maxAttendanceRate: 100,
    studentId: '',
    dateFrom: '',
    dateTo: ''
  });
  
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [reportType, setReportType] = useState<'course' | 'subject' | 'student' | 'rate'>('course');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Construir parámetros de consulta basados en los filtros actuales
        const queryParams = new URLSearchParams();
        if (filters.academicYear !== 'Todos') queryParams.append('academicYear', filters.academicYear);
        if (filters.department !== 'Todos') queryParams.append('department', filters.department);
        if (filters.subject !== 'Todos') queryParams.append('subjectCode', filters.subject);
        if (filters.course !== 'Todos') queryParams.append('course', filters.course);
        if (filters.semester !== 'Todos') queryParams.append('semester', filters.semester);
        if (filters.minAttendanceRate > 0) queryParams.append('minAttendanceRate', filters.minAttendanceRate.toString());
        if (filters.maxAttendanceRate < 100) queryParams.append('maxAttendanceRate', filters.maxAttendanceRate.toString());
        if (filters.studentId) queryParams.append('studentId', filters.studentId);
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
        
        // Hacer la llamada a la API con los filtros aplicados
        const response = await fetch(`/api/informes-asistencia?${queryParams.toString()}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Actualizar los datos de asistencia
        if (data.attendanceData) {
          setAttendanceData(data.attendanceData);
          setFilteredData(data.attendanceData);
        } else {
          setAttendanceData(data);
          setFilteredData(data);
        }
        
        // Actualizar los filtros disponibles si la API los proporciona
        if (data.academicYears) setAcademicYears(data.academicYears.map((year: any) => year.name));
        if (data.departments) setDepartments(data.departments.map((dept: any) => dept.name));
        if (data.subjects) setSubjects(['Todos', ...data.subjects.map((subj: any) => subj.Denominacion)]);
        if (data.courses) setCourses(data.courses);
        if (data.semesters) setSemesters(data.semesters);
        
        setError(null);
      } catch (error) {
        console.error('Error al cargar datos de asistencia:', error);
        setError('No se pudieron cargar los datos de asistencia. Por favor, intente nuevamente más tarde.');
        
        // Usar datos de ejemplo en caso de error
        const mockData: AttendanceData[] = [
          {
            id: '1',
            subject: 'Matemáticas Discretas',
            department: 'Ciencias',
            course: '1º',
            semester: '1er Semestre',
            attendanceRate: 78.5,
            totalStudents: 45,
            totalSessions: 28,
            lastUpdateDate: '2025-05-10'
          },
          {
            id: '2',
            subject: 'Programación II',
            department: 'Ingeniería',
            course: '1º',
            semester: '2do Semestre',
            attendanceRate: 82.3,
            totalStudents: 38,
            totalSessions: 32,
            lastUpdateDate: '2025-05-09'
          },
          {
            id: '3',
            subject: 'Historia del Arte',
            department: 'Humanidades',
            course: '2º',
            semester: '1er Semestre',
            attendanceRate: 75.2,
            totalStudents: 56,
            totalSessions: 24,
            lastUpdateDate: '2025-05-08'
          },
          {
            id: '4',
            subject: 'Derecho Romano',
            department: 'Derecho',
            course: '1º',
            semester: '1er Semestre',
            attendanceRate: 81.7,
            totalStudents: 62,
            totalSessions: 30,
            lastUpdateDate: '2025-05-07'
          },
          {
            id: '5',
            subject: 'Física Cuántica',
            department: 'Ciencias',
            course: '3º',
            semester: '2do Semestre',
            attendanceRate: 69.8,
            totalStudents: 34,
            totalSessions: 22,
            lastUpdateDate: '2025-05-06'
          },
          {
            id: '6',
            subject: 'Economía Aplicada',
            department: 'Economía',
            course: '2º',
            semester: '1er Semestre',
            attendanceRate: 73.2,
            totalStudents: 51,
            totalSessions: 26,
            lastUpdateDate: '2025-05-05'
          }
        ];
        
        setAttendanceData(mockData);
        setFilteredData(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters]);
  
  useEffect(() => {
    // Filtramos los datos según los filtros aplicados
    let filteredResults = [...attendanceData];
    
    if (filters.department !== 'Todos') {
      filteredResults = filteredResults.filter(item => item.department === filters.department);
    }
    
    if (filters.subject !== 'Todos') {
      filteredResults = filteredResults.filter(item => item.subject === filters.subject);
    }
    
    if (filters.course !== 'Todos') {
      filteredResults = filteredResults.filter(item => item.course === filters.course);
    }
    
    if (filters.semester !== 'Todos') {
      filteredResults = filteredResults.filter(item => item.semester === filters.semester);
    }
    
    // Filtro de tasa de asistencia
    filteredResults = filteredResults.filter(item => 
      item.attendanceRate >= filters.minAttendanceRate && 
      item.attendanceRate <= filters.maxAttendanceRate
    );
    
    // Aplicar búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredResults = filteredResults.filter(item => 
        item.subject.toLowerCase().includes(term) ||
        item.department.toLowerCase().includes(term)
      );
    }
    
    setFilteredData(filteredResults);
  }, [filters, searchTerm, attendanceData]);
  
  // Función para obtener la clase de color según el porcentaje
  const getAttendanceColorClass = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgAttendanceColorClass = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 border-green-200 text-green-800';
    if (rate >= 60) return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    return 'bg-red-100 border-red-200 text-red-800';
  };

  const handleFilterChange = (key: keyof AttendanceReportFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      academicYear: '2024-2025',
      department: 'Todos',
      subject: 'Todos',
      course: 'Todos',
      semester: 'Todos',
      minAttendanceRate: 0,
      maxAttendanceRate: 100,
      studentId: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchTerm('');
  };
  
  const generateReport = () => {
    alert('Generando informe con los filtros seleccionados...');
    // Aquí iría la lógica para generar un informe PDF o Excel
  };

  return (
    <DashboardContainer roleName="Manager">
      <div className="bg-gray-50 min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb navigation */}
          <nav className="flex mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-blue-600">
                  <FaHome className="mr-2" />
                  Inicio
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2">/</span>
                  <Link href="/manager/dashboard" className="text-gray-500 hover:text-blue-600 inline-flex items-center">
                    <FaTachometerAlt className="mr-1" />
                    Panel de Control
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="mx-2">/</span>
                  <span className="text-blue-600">Informes de Asistencia</span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Header with back button */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Link href="/manager/dashboard" className="mr-3 text-white hover:text-blue-200 transition">
                      <FaArrowLeft />
                    </Link>
                    <h1 className="text-2xl font-bold flex items-center">
                      <FaChartBar className="mr-3" />
                      Informes de Asistencia
                    </h1>
                  </div>
                  <p className="text-blue-100 mt-1">
                    Gestiona y visualiza estadísticas de asistencia
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando información...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">
                <p>{error}</p>
                <Link href="/manager/dashboard" className="mt-4 inline-block px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] transition-colors">
                  Volver al Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                        <FaChartBar className="text-[#0D3C68]" />
                      </div>
                      <div>
                        <span className="text-gray-900">Generación de Informes</span>
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          Selecciona los filtros para generar informes detallados
                        </div>
                      </div>
                    </h2>
                    <div className="flex flex-wrap sm:flex-nowrap gap-3">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center transition-colors shadow-sm"
                      >
                        <FaFilter className="mr-2" />
                        {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                      </button>
                      <button
                        onClick={generateReport}
                        className="px-4 py-2 bg-[#0D3C68] text-white rounded-md hover:bg-[#0a325a] flex items-center justify-center transition-colors shadow-sm"
                      >
                        <FaFileDownload className="mr-2" />
                        Generar Informe
                      </button>
                    </div>
                  </div>

                  {/* Panel de selección de tipo de informe */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de Informe</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button 
                        onClick={() => setReportType('course')}
                        className={`p-3 rounded-lg border ${reportType === 'course' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 ${reportType === 'course' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <FaUniversity className="h-5 w-5" />
                          </div>
                          <div className="ml-3 text-left">
                            <p className={`font-medium ${reportType === 'course' ? 'text-blue-700' : 'text-gray-800'}`}>Por Curso</p>
                            <p className="text-xs text-gray-500">Asistencia por cursos académicos</p>
                          </div>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setReportType('subject')}
                        className={`p-3 rounded-lg border ${reportType === 'subject' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 ${reportType === 'subject' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <FaBook className="h-5 w-5" />
                          </div>
                          <div className="ml-3 text-left">
                            <p className={`font-medium ${reportType === 'subject' ? 'text-blue-700' : 'text-gray-800'}`}>Por Asignatura</p>
                            <p className="text-xs text-gray-500">Asistencia por asignaturas</p>
                          </div>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setReportType('student')}
                        className={`p-3 rounded-lg border ${reportType === 'student' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 ${reportType === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <FaUserGraduate className="h-5 w-5" />
                          </div>
                          <div className="ml-3 text-left">
                            <p className={`font-medium ${reportType === 'student' ? 'text-blue-700' : 'text-gray-800'}`}>Por Alumno</p>
                            <p className="text-xs text-gray-500">Asistencia individual de alumnos</p>
                          </div>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setReportType('rate')}
                        className={`p-3 rounded-lg border ${reportType === 'rate' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'} transition-colors`}
                      >
                        <div className="flex items-center">
                          <div className={`rounded-full p-2 ${reportType === 'rate' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            <FaChartBar className="h-5 w-5" />
                          </div>
                          <div className="ml-3 text-left">
                            <p className={`font-medium ${reportType === 'rate' ? 'text-blue-700' : 'text-gray-800'}`}>Por Porcentaje</p>
                            <p className="text-xs text-gray-500">Filtrar por tasa de asistencia</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="mt-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FaSearch className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Buscar por asignatura, departamento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Filtros avanzados */}
                  {showFilters && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="mb-4 flex justify-between items-center">
                        <h3 className="font-medium text-gray-700">Filtros avanzados</h3>
                        <button 
                          className="text-sm text-blue-600 hover:text-blue-800"
                          onClick={resetFilters}
                        >
                          Restablecer filtros
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Curso Académico</label>
                          <div className="relative">
                            <select
                              value={filters.academicYear}
                              onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                            >
                              {academicYears.map((year) => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                          <div className="relative">
                            <select
                              value={filters.department}
                              onChange={(e) => handleFilterChange('department', e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                            >
                              {departments.map((department) => (
                                <option key={department} value={department}>
                                  {department}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura</label>
                          <div className="relative">
                            <select
                              value={filters.subject}
                              onChange={(e) => handleFilterChange('subject', e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                            >
                              {subjects.map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
                          <div className="relative">
                            <select
                              value={filters.course}
                              onChange={(e) => handleFilterChange('course', e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                            >
                              {courses.map((course) => (
                                <option key={course} value={course}>
                                  {course}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
                          <div className="relative">
                            <select
                              value={filters.semester}
                              onChange={(e) => handleFilterChange('semester', e.target.value)}
                              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
                            >
                              {semesters.map((semester) => (
                                <option key={semester} value={semester}>
                                  {semester}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                              <FaChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Asistencia (%)</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={filters.minAttendanceRate}
                              onChange={(e) => handleFilterChange('minAttendanceRate', Number(e.target.value))}
                              className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                              placeholder="Min"
                            />
                            <span className="text-gray-500">a</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={filters.maxAttendanceRate}
                              onChange={(e) => handleFilterChange('maxAttendanceRate', Number(e.target.value))}
                              className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                              placeholder="Max"
                            />
                          </div>
                        </div>
                        
                        {reportType === 'student' && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID del Estudiante</label>
                            <input
                              type="text"
                              value={filters.studentId}
                              onChange={(e) => handleFilterChange('studentId', e.target.value)}
                              className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                              placeholder="Introduce ID o nombre del estudiante"
                            />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="date"
                              value={filters.dateFrom}
                              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="date"
                              value={filters.dateTo}
                              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                              className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Listado de resultados */}
                <div className="p-5">
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-medium text-gray-800">Resultados ({filteredData.length})</h3>
                    <div className="text-sm text-gray-500">
                      Última actualización: {new Date().toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Asignatura
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Departamento
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Curso
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Semestre
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            % Asistencia
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alumnos
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sesiones
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.length > 0 ? (
                          filteredData.map((item, index) => (
                            <tr key={item.id} className={index % 2 === 0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/30'}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{item.subject}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{item.department}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{item.course}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{item.semester}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getBgAttendanceColorClass(item.attendanceRate)}`}>
                                    {item.attendanceRate.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="text-sm text-gray-700">{item.totalStudents}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="text-sm text-gray-700">{item.totalSessions}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-1.5 transition-colors"
                                    title="Ver detalles"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  <button
                                    className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full p-1.5 transition-colors"
                                    title="Descargar informe"
                                  >
                                    <FaFileDownload className="h-5 w-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                              No se encontraron resultados con los filtros aplicados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Panel de estadísticas visuales */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-white to-blue-50/30">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
                      <FaChartBar className="text-[#0D3C68]" />
                    </div>
                    <div>
                      <span className="text-gray-900">Estadísticas de Asistencia</span>
                      <div className="text-xs text-gray-500 font-normal mt-0.5">
                        Vista general de la asistencia según departamentos
                      </div>
                    </div>
                  </h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gráfico de barras simulado */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h3 className="font-medium text-gray-800 mb-4">Asistencia por Departamento</h3>
                      <div className="space-y-4">
                        {[
                          { name: 'Ingeniería', value: 82.3 },
                          { name: 'Ciencias', value: 76.8 },
                          { name: 'Humanidades', value: 75.2 },
                          { name: 'Derecho', value: 81.7 },
                          { name: 'Medicina', value: 88.9 }
                        ].map((item, index) => (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-700">{item.name}</span>
                              <span className={`text-sm font-medium ${getAttendanceColorClass(item.value)}`}>
                                {item.value.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  item.value >= 80 ? 'bg-green-500' : 
                                  item.value >= 60 ? 'bg-yellow-500' : 
                                  'bg-red-500'
                                }`} 
                                style={{ width: `${item.value}%` }}>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Gráfico circular simulado */}
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                      <h3 className="font-medium text-gray-800 mb-4">Distribución de Asistencia</h3>
                      <div className="flex items-center justify-center h-64">
                        <div className="w-48 h-48 rounded-full bg-gray-200 relative overflow-hidden">
                          <div className="absolute inset-0 border-8 border-white rounded-full"></div>
                          <div className="absolute top-0 left-0 w-full h-full bg-green-500" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 70%, 50% 50%)' }}></div>
                          <div className="absolute top-0 left-0 w-full h-full bg-yellow-500" style={{ clipPath: 'polygon(50% 50%, 100% 70%, 100% 100%, 60% 100%, 50% 50%)' }}></div>
                          <div className="absolute top-0 left-0 w-full h-full bg-red-500" style={{ clipPath: 'polygon(50% 50%, 60% 100%, 0% 100%, 0% 40%, 50% 50%)' }}></div>
                          <div className="absolute top-0 left-0 w-full h-full bg-blue-500" style={{ clipPath: 'polygon(50% 50%, 0% 40%, 0% 0%, 50% 0%, 50% 50%)' }}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-800">78.5%</div>
                                <div className="text-xs text-gray-500">Media total</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Asistencia alta ({'>'}80%)</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Asistencia media (60-80%)</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Asistencia baja ({'<'}60%)</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-sm text-gray-700">Sin datos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}