'use client';

import { useState } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaUsers, 
  FaUserGraduate, 
  FaChalkboardTeacher,
  FaBuilding,
  FaBook,
  FaCalendarAlt, 
  FaClipboardList, 
  FaCog, 
  FaSearch, 
  FaPlay,
  FaCheckCircle,
  FaTimesCircle,
  FaCode,
  FaSync,
  FaChevronLeft
} from 'react-icons/fa';

// Definición de tipos para los endpoints
interface Endpoint {
  name: string;
  method: string;
  url: string;
  requiresBody: boolean;
  paramId?: boolean;
  description?: string;
  isSync?: boolean;
  defaultBody?: string;
}

interface CategoryEndpoint {
  category: string;
  icon: React.ReactElement;
  endpoints: Endpoint[];
}

// Definición de los endpoints
const apiEndpoints: CategoryEndpoint[] = [
  {
    category: 'Usuarios',
    icon: <FaUsers className="text-blue-600" />,
    endpoints: [
      { name: 'Listar usuarios', method: 'GET', url: '/api/users', requiresBody: false },
      { name: 'Buscar usuario', method: 'GET', url: '/api/users/:id', requiresBody: false, paramId: true },
      { name: 'Crear usuario', method: 'POST', url: '/api/users', requiresBody: true },
      { name: 'Actualizar usuario', method: 'PUT', url: '/api/users/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar usuario', method: 'DELETE', url: '/api/users/:id', requiresBody: false, paramId: true },
      { name: 'Roles de usuario', method: 'GET', url: '/api/user-roles', requiresBody: false }
    ]
  },
  {
    category: 'Roles',
    icon: <FaUserGraduate className="text-purple-600" />,
    endpoints: [
      { name: 'Listar roles', method: 'GET', url: '/api/roles', requiresBody: false },
      { name: 'Buscar rol', method: 'GET', url: '/api/roles/:id', requiresBody: false, paramId: true },
      { name: 'Crear rol', method: 'POST', url: '/api/roles', requiresBody: true },
      { name: 'Actualizar rol', method: 'PUT', url: '/api/roles/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar rol', method: 'DELETE', url: '/api/roles/:id', requiresBody: false, paramId: true },
      { name: 'Asignar rol', method: 'POST', url: '/api/user-roles', requiresBody: true }
    ]
  },
  {
    category: 'Carreras y Escuelas',
    icon: <FaBuilding className="text-emerald-600" />,
    endpoints: [
      { name: 'Listar carreras', method: 'GET', url: '/api/carreras', requiresBody: false },
      { name: 'Buscar carrera', method: 'GET', url: '/api/carreras/:id', requiresBody: false, paramId: true },
      { name: 'Crear carrera', method: 'POST', url: '/api/carreras', requiresBody: true },
      { name: 'Actualizar carrera', method: 'PUT', url: '/api/carreras/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar carrera', method: 'DELETE', url: '/api/carreras/:id', requiresBody: false, paramId: true },
      { name: 'Listar escuelas', method: 'GET', url: '/api/escuelas', requiresBody: false },
      { name: 'Buscar escuela', method: 'GET', url: '/api/escuelas/:id', requiresBody: false, paramId: true }
    ]
  },
  {
    category: 'Planes y Asignaturas',
    icon: <FaBook className="text-indigo-600" />,
    endpoints: [
      { name: 'Listar planes de estudio', method: 'GET', url: '/api/planes-estudio', requiresBody: false },
      { name: 'Buscar plan', method: 'GET', url: '/api/planes-estudio/:id', requiresBody: false, paramId: true },
      { name: 'Crear plan', method: 'POST', url: '/api/planes-estudio', requiresBody: true },
      { name: 'Actualizar plan', method: 'PUT', url: '/api/planes-estudio/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar plan', method: 'DELETE', url: '/api/planes-estudio/:id', requiresBody: false, paramId: true },
      { name: 'Listar asignaturas', method: 'GET', url: '/api/asignaturas', requiresBody: false },
      { name: 'Buscar asignatura', method: 'GET', url: '/api/asignaturas/:id', requiresBody: false, paramId: true },
      { name: 'Crear asignatura', method: 'POST', url: '/api/asignaturas', requiresBody: true },
      { name: 'Actualizar asignatura', method: 'PUT', url: '/api/asignaturas/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar asignatura', method: 'DELETE', url: '/api/asignaturas/:id', requiresBody: false, paramId: true }
    ]
  },
  {
    category: 'Cursos y Grupos',
    icon: <FaCalendarAlt className="text-yellow-600" />,
    endpoints: [
      { name: 'Listar cursos académicos', method: 'GET', url: '/api/cursos-academicos', requiresBody: false },
      { name: 'Buscar curso académico', method: 'GET', url: '/api/cursos-academicos/:id', requiresBody: false, paramId: true },
      { name: 'Crear curso académico', method: 'POST', url: '/api/cursos-academicos', requiresBody: true },
      { name: 'Actualizar curso académico', method: 'PUT', url: '/api/cursos-academicos/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar curso académico', method: 'DELETE', url: '/api/cursos-academicos/:id', requiresBody: false, paramId: true },
      { name: 'Listar grupos', method: 'GET', url: '/api/grupos', requiresBody: false },
      { name: 'Buscar grupo', method: 'GET', url: '/api/grupos/:id', requiresBody: false, paramId: true },
      { name: 'Crear grupo', method: 'POST', url: '/api/grupos', requiresBody: true },
      { name: 'Actualizar grupo', method: 'PUT', url: '/api/grupos/:grupoId', requiresBody: true, paramId: true },
      { name: 'Eliminar grupo', method: 'DELETE', url: '/api/grupos/:id', requiresBody: false, paramId: true }
    ]
  },
  {
    category: 'Docencia y Matrículas',
    icon: <FaChalkboardTeacher className="text-red-600" />,
    endpoints: [
      { name: 'Listar docencia', method: 'GET', url: '/api/docencia', requiresBody: false },
      { name: 'Buscar docencia', method: 'GET', url: '/api/docencia/:id', requiresBody: false, paramId: true },
      { name: 'Crear docencia', method: 'POST', url: '/api/docencia', requiresBody: true },
      { name: 'Actualizar docencia', method: 'PUT', url: '/api/docencia/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar docencia', method: 'DELETE', url: '/api/docencia/:id', requiresBody: false, paramId: true },
      { name: 'Listar matrículas', method: 'GET', url: '/api/matriculas', requiresBody: false },
      { name: 'Buscar matrícula', method: 'GET', url: '/api/matriculas/:id', requiresBody: false, paramId: true },
      { name: 'Crear matrícula', method: 'POST', url: '/api/matriculas', requiresBody: true },
      { name: 'Actualizar matrícula', method: 'PUT', url: '/api/matriculas/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar matrícula', method: 'DELETE', url: '/api/matriculas/:id', requiresBody: false, paramId: true },
      { name: 'Alumnos por grupo', method: 'GET', url: '/api/alumnos-grupo/:id', requiresBody: false, paramId: true },
      { name: 'Alumnos por plan', method: 'GET', url: '/api/alumnos-plan/:id', requiresBody: false, paramId: true }
    ]
  },
  {
    category: 'Asistencias y Sesiones',
    icon: <FaClipboardList className="text-amber-600" />,
    endpoints: [
      { name: 'Listar sesiones', method: 'GET', url: '/api/sesiones-clase', requiresBody: false },
      { name: 'Buscar sesión', method: 'GET', url: '/api/sesiones-clase/:id', requiresBody: false, paramId: true },
      { name: 'Crear sesión', method: 'POST', url: '/api/sesiones-clase', requiresBody: true },
      { name: 'Actualizar sesión', method: 'PUT', url: '/api/sesiones-clase/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar sesión', method: 'DELETE', url: '/api/sesiones-clase/:id', requiresBody: false, paramId: true },
      { name: 'Asistencias alumno', method: 'GET', url: '/api/asistencias-alumno/:id', requiresBody: false, paramId: true },
      { name: 'Estados asistencia', method: 'GET', url: '/api/estados-asistencia', requiresBody: false }
    ]
  },
  {
    category: 'Justificaciones',
    icon: <FaCheckCircle className="text-green-600" />,
    endpoints: [
      { name: 'Solicitudes justificación', method: 'GET', url: '/api/solicitudes-justificacion', requiresBody: false },
      { name: 'Buscar solicitud', method: 'GET', url: '/api/solicitudes-justificacion/:id', requiresBody: false, paramId: true },
      { name: 'Crear solicitud', method: 'POST', url: '/api/solicitudes-justificacion', requiresBody: true },
      { name: 'Actualizar solicitud', method: 'PUT', url: '/api/solicitudes-justificacion/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar solicitud', method: 'DELETE', url: '/api/solicitudes-justificacion/:id', requiresBody: false, paramId: true },
      { name: 'Estados justificación', method: 'GET', url: '/api/estados-justificacion', requiresBody: false },
      { name: 'Documentación justificación', method: 'GET', url: '/api/documentacion-justificacion', requiresBody: false }
    ]
  },
  {
    category: 'Configuración',
    icon: <FaCog className="text-gray-600" />,
    endpoints: [
      { name: 'Configuración carrera', method: 'GET', url: '/api/configuracion-carrera', requiresBody: false },
      { name: 'Buscar configuración', method: 'GET', url: '/api/configuracion-carrera/:id', requiresBody: false, paramId: true },
      { name: 'Crear configuración', method: 'POST', url: '/api/configuracion-carrera', requiresBody: true },
      { name: 'Actualizar configuración', method: 'PUT', url: '/api/configuracion-carrera/:id', requiresBody: true, paramId: true },
      { name: 'Eliminar configuración', method: 'DELETE', url: '/api/configuracion-carrera/:id', requiresBody: false, paramId: true },
      { name: 'Estadísticas', method: 'GET', url: '/api/stats', requiresBody: false },
      { name: 'Carga de datos', method: 'POST', url: '/api/carga-datos', requiresBody: true }
    ]
  },  {
    category: 'Sincronizar datos',
    icon: <FaSync className="text-blue-500" />,
    endpoints: [
      { name: '1. Sincronizar cursos académicos', method: 'POST', url: '/api/cursos-academicos', requiresBody: false, description: 'Crear cursos académicos automáticamente desde OfertaAcademica', isSync: true },
      { name: '2. Sincronizar escuelas', method: 'POST', url: '/api/escuelas', requiresBody: false, description: 'Importar escuelas desde OfertaAcademica', isSync: true },
      { name: '3. Sincronizar carreras y planes', method: 'POST', url: '/api/carreras', requiresBody: false, description: 'Importar carreras y planes de estudio automáticamente', isSync: true },
      { name: '4. Sincronizar estudiantes', method: 'PUT', url: '/api/users', requiresBody: true, description: 'Importar estudiantes desde OfertaAcademica', isSync: true, defaultBody: JSON.stringify({ action: "importStudents" }, null, 2) },
      { name: '5. Sincronizar profesores', method: 'PUT', url: '/api/users', requiresBody: true, description: 'Importar profesores desde OfertaAcademica', isSync: true, defaultBody: JSON.stringify({ action: "importProfessors" }, null, 2) },
      { name: '6. Sincronizar alumnos por plan', method: 'PUT', url: '/api/alumnos-plan', requiresBody: false, description: 'Asociar alumnos a planes de estudio', isSync: true },
      { name: '7. Sincronizar asignaturas', method: 'PUT', url: '/api/asignaturas', requiresBody: false, description: 'Importar asignaturas desde OfertaAcademica', isSync: true },
      { name: '8. Sincronizar matrículas', method: 'PUT', url: '/api/matriculas', requiresBody: false, description: 'Importar matrículas desde OfertaAcademica', isSync: true },
      { name: '9. Sincronizar docencia', method: 'PUT', url: '/api/docencia', requiresBody: false, description: 'Importar información de docencia', isSync: true },
      { name: '10. Sincronizar grupos', method: 'PUT', url: '/api/grupos', requiresBody: false, description: 'Importar grupos de asignaturas', isSync: true }
    ]
  }
];

export default function AdminActions() {  const [activeEndpoint, setActiveEndpoint] = useState<any>(null);
  const [paramId, setParamId] = useState('');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{step: number, total: number, currentName: string, results: {name: string, success: boolean, message: string}[]}>({
    step: 0,
    total: 0,
    currentName: '',
    results: []
  });

  // Función para ejecutar la llamada a la API
  const executeApiCall = async () => {
    if (!activeEndpoint) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setResponse(null);

    try {
      // Construir la URL con los parámetros
      let url = activeEndpoint.url;
      if (activeEndpoint.paramId && paramId) {
        url = url.replace(':id', paramId);
      }

      // Configurar opciones de fetch
      const options: RequestInit = {
        method: activeEndpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // Añadir body si es necesario
      if (activeEndpoint.requiresBody && requestBody) {
        try {
          const parsedBody = JSON.parse(requestBody);
          options.body = JSON.stringify(parsedBody);
        } catch (e) {
          setError('El cuerpo de la solicitud no es un JSON válido');
          setLoading(false);
          return;
        }
      }

      // Realizar la llamada
      const res = await fetch(url, options);
      const data = await res.json();
      
      setResponse({
        status: res.status,
        data
      });
      
      if (res.ok) {
        setSuccess(`Operación completada con éxito (${res.status})`);
      } else {
        setError(`Error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setError(`Error al realizar la petición: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    setLoading(false);
  };
  // Preparar un endpoint seleccionado
  const prepareEndpoint = (endpoint: any) => {
    setActiveEndpoint(endpoint);
    setParamId('');
    
    // Si el endpoint tiene un cuerpo predeterminado, usarlo
    if (endpoint.defaultBody) {
      setRequestBody(endpoint.defaultBody);
    } else if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      setRequestBody('{\n  \n}');
    } else {
      setRequestBody('');
    }
    
    setResponse(null);
    setError('');
    setSuccess('');
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(e.target.value.toLowerCase());
  };
  
  // Filtrar endpoints basados en la búsqueda y categoría seleccionada
  const filteredEndpoints = apiEndpoints.map(category => {
    const filtered = {
      ...category,
      endpoints: category.endpoints.filter(endpoint => 
        endpoint.name.toLowerCase().includes(filterQuery) || 
        endpoint.url.toLowerCase().includes(filterQuery) ||
        endpoint.method.toLowerCase().includes(filterQuery)
      )
    };
    return filtered;
  }).filter(category => 
    category.endpoints.length > 0 && 
    (selectedCategory === null || category.category === selectedCategory)
  );
  
  // Función para ejecutar secuencialmente todos los endpoints de sincronización
  const executeSyncSequence = async () => {
    // Obtener todos los endpoints de sincronización
    const syncEndpoints = apiEndpoints.find(cat => cat.category === 'Sincronizar datos')?.endpoints || [];
    
    if (syncEndpoints.length === 0) return;
    
    setSyncing(true);
    setSyncProgress({
      step: 1,
      total: syncEndpoints.length,
      currentName: syncEndpoints[0].name,
      results: []
    });
    
    // Ejecutar cada endpoint en secuencia
    for (let i = 0; i < syncEndpoints.length; i++) {
      const endpoint = syncEndpoints[i];
      
      setSyncProgress(prev => ({
        ...prev,
        step: i + 1,
        currentName: endpoint.name
      }));
      
      try {
        // Construir la URL
        let url = endpoint.url;
        
        // Configurar opciones de fetch
        const options: RequestInit = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        // Añadir body si es necesario
        if (endpoint.requiresBody && endpoint.defaultBody) {
          options.body = endpoint.defaultBody;
        }
        
        // Realizar la llamada
        const res = await fetch(url, options);
        const data = await res.json();
        
        // Actualizar resultados
        setSyncProgress(prev => ({
          ...prev,
          results: [
            ...prev.results, 
            {
              name: endpoint.name,
              success: res.ok,
              message: res.ok ? 'Operación completada con éxito' : `Error: ${res.status} ${res.statusText}`
            }
          ]
        }));
        
        // Si falla, continuar con el siguiente pero registrar el error
        if (!res.ok) {
          console.error(`Error en endpoint ${endpoint.name}:`, data);
        } else {
          // Esperar un breve momento entre llamadas para evitar sobrecargar el servidor
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (err) {
        setSyncProgress(prev => ({
          ...prev,
          results: [
            ...prev.results, 
            {
              name: endpoint.name,
              success: false,
              message: `Error: ${err instanceof Error ? err.message : String(err)}`
            }
          ]
        }));
        
        console.error(`Error en endpoint ${endpoint.name}:`, err);
      }
    }
    
    setSyncing(false);
  };
  
  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {/* Header mejorado con el nuevo estilo */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaCode className="mr-3" /> 
                    Centro de Control API
                  </h1>
                  <p className="text-blue-100 text-sm">Interactúa directamente con todas las APIs del sistema de forma sencilla y efectiva</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="h-4 w-4 mr-2" /> 
                    Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaCog className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Línea decorativa */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Panel de categorías de API */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Categorías de API</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {apiEndpoints.map((category, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedCategory(selectedCategory === category.category ? null : category.category)}
                  className={`flex items-center p-3 rounded-lg transition-all ${
                    selectedCategory === category.category 
                      ? 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm' 
                      : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:border-blue-100'
                  }`}
                >
                  <div className="mr-3">
                    {category.icon}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm">{category.category}</span>
                    <div className="text-xs text-gray-500 mt-0.5">{category.endpoints.length} endpoints</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel lateral de endpoints mejorado */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden lg:col-span-1 border border-gray-200">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Buscar endpoint..." 
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition duration-150 ease-in-out"
                    onChange={handleSearch}
                    value={filterQuery}
                  />
                </div>
                {selectedCategory && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      {selectedCategory} <span className="ml-1">×</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {filteredEndpoints.length > 0 ? (
                  filteredEndpoints.map((category, idx) => (
                    <div key={idx} className="border-b last:border-0">
                      <div className="p-3 bg-gradient-to-r from-gray-50 to-white flex items-center gap-2 border-l-4 border-blue-500">
                        {category.icon}
                        <h3 className="font-medium text-gray-800">{category.category}</h3>
                        <span className="ml-auto bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                          {category.endpoints.length}
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {category.endpoints.map((endpoint, endpointIdx) => (
                          <li 
                            key={endpointIdx} 
                            className={`px-3 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${
                              activeEndpoint === endpoint ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                            onClick={() => prepareEndpoint(endpoint)}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`inline-flex items-center justify-center w-16 text-xs font-medium px-2 py-1 rounded ${
                                endpoint.method === 'GET' ? 'bg-green-100 text-green-800 border border-green-200' :
                                endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                endpoint.method === 'PUT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-red-100 text-red-800 border border-red-200'
                              }`}>{endpoint.method}</span>
                              <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                                {endpoint.name}
                              </span>
                            </div>
                            {activeEndpoint === endpoint && (
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <FaSearch className="text-gray-300 text-4xl mb-3" />
                    <p className="text-gray-500 mb-2">No se encontraron endpoints que coincidan con tu búsqueda</p>
                    <button 
                      onClick={() => {setFilterQuery(''); setSelectedCategory(null);}}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Panel de detalles y ejecución mejorado */}
            <div className="lg:col-span-2">
              {!activeEndpoint ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-200">
                  <div className="bg-blue-50 rounded-full w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                    <FaCode className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Bienvenido al Centro de Control API</h3>
                  <p className="text-gray-600 mt-3 max-w-md mx-auto">
                    Selecciona un endpoint del panel izquierdo para comenzar a interactuar con la API del sistema
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    {apiEndpoints.slice(0, 4).map((category, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedCategory(category.category)} 
                        className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center gap-2"
                      >
                        {category.icon} {category.category}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Detalles del endpoint */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block text-xs font-medium px-3 py-1.5 rounded-full ${
                          activeEndpoint.method === 'GET' ? 'bg-green-100 text-green-800 border border-green-200' :
                          activeEndpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          activeEndpoint.method === 'PUT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>{activeEndpoint.method}</span>
                        <h3 className="font-semibold text-gray-800 text-lg">{activeEndpoint.name}</h3>
                      </div>
                      <button
                        onClick={() => setActiveEndpoint(null)} 
                        className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1"
                        title="Cerrar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-gray-700">URL de la petición:</h4>
                          <button 
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                            onClick={() => {
                              let url = activeEndpoint.url;
                              if (activeEndpoint.paramId && paramId) {
                                url = url.replace(':id', paramId);
                              }
                              navigator.clipboard.writeText(url);
                            }}
                          >
                            Copiar URL
                          </button>
                        </div>
                        <div className="relative">
                          <code className="block bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm font-mono overflow-x-auto">
                            {activeEndpoint.url}
                          </code>
                        </div>
                      </div>

                      {/* Campo para ID si es necesario */}
                      {activeEndpoint.paramId && (
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 mb-2">ID del recurso:</label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                              type="text"
                              value={paramId}
                              onChange={(e) => setParamId(e.target.value)}
                              placeholder="Introduce el ID"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                            />
                            {paramId && (
                              <button
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                onClick={() => setParamId('')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Este ID reemplazará el parámetro :id en la URL</p>
                        </div>
                      )}

                      {/* Cuerpo de la petición si es necesario */}
                      {activeEndpoint.requiresBody && (
                        <div className="mb-5">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Cuerpo de la petición (JSON):</label>
                            <div className="flex gap-2">
                              <button 
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                                onClick={() => {
                                  try {
                                    const formatted = JSON.stringify(JSON.parse(requestBody), null, 2);
                                    setRequestBody(formatted);
                                  } catch (e) {}
                                }}
                              >
                                Formatear
                              </button>
                              <button 
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                                onClick={() => setRequestBody('{\n  \n}')}
                              >
                                Limpiar
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={requestBody}
                            onChange={(e) => setRequestBody(e.target.value)}
                            rows={6}
                            className="w-full p-4 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            spellCheck="false"
                          />
                        </div>
                      )}

                      <div className="mt-5 flex flex-col sm:flex-row sm:justify-end gap-3">
                        <button
                          onClick={() => setActiveEndpoint(null)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={executeApiCall}
                          disabled={loading}
                          className="px-6 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <FaPlay className="text-sm" /> Ejecutar petición
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Respuesta */}
                  {(response || error || success) && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="font-medium text-gray-800 flex items-center gap-2">
                          {response && (
                            <span className={`h-2 w-2 rounded-full ${
                              response.status >= 200 && response.status < 300 
                                ? 'bg-green-500' 
                                : 'bg-red-500'
                            }`}></span>
                          )}
                          Respuesta
                        </h3>
                        <div className="text-xs text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="p-5">
                        {/* Mensajes de error o éxito */}
                        {error && (
                          <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3">
                            <FaTimesCircle className="text-red-500 mt-0.5 flex-shrink-0" /> 
                            <div>
                              <p className="font-medium">Error en la petición</p>
                              <p className="text-sm mt-1">{error}</p>
                            </div>
                          </div>
                        )}
                        {success && (
                          <div className="mb-5 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-start gap-3">
                            <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" /> 
                            <div>
                              <p className="font-medium">Petición exitosa</p>
                              <p className="text-sm mt-1">{success}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Datos de la respuesta */}
                        {response && (
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">Estado:</span>
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                                  response.status >= 200 && response.status < 300 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                  {response.status}
                                </span>
                              </div>
                              <button 
                                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(response.data, null, 2))
                                }}
                              >
                                Copiar JSON
                              </button>
                            </div>
                            
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium text-gray-700">Datos recibidos:</h4>
                                {Array.isArray(response.data) && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    {response.data.length} elementos
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto max-h-[350px] text-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                  {JSON.stringify(response.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Botón flotante para ejecutar la secuencia de sincronización */}
      {selectedCategory === 'Sincronizar datos' && (
        <div className="fixed bottom-8 right-8 z-50">
          {/* Modal de progreso de sincronización */}
          {syncing && (
            <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden mb-4">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                  <FaSync className="text-blue-500" /> Sincronización en progreso
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {syncProgress.step}/{syncProgress.total}
                </span>
              </div>
              <div className="p-4">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(syncProgress.step / syncProgress.total) * 100}%` }}
                  ></div>
                </div>
                
                <div className="text-sm text-gray-700 mb-3">
                  <span className="font-medium">Ejecutando:</span> {syncProgress.currentName}
                </div>
                
                {syncProgress.results.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Resultados:</h5>
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="space-y-1">
                        {syncProgress.results.map((result, idx) => (
                          <li key={idx} className="text-sm flex items-start">
                            {result.success ? (
                              <FaCheckCircle className="text-green-500 mr-1.5 mt-0.5 flex-shrink-0" />
                            ) : (
                              <FaTimesCircle className="text-red-500 mr-1.5 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <span className="font-medium">{result.name.replace(/^\d+\.\s+/, '')}</span>
                              <div className={result.success ? 'text-green-600' : 'text-red-600'}>
                                {result.message}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Botón para ejecutar la secuencia */}
          <button
            onClick={executeSyncSequence}
            disabled={syncing}
            className={`group flex items-center gap-2 px-6 py-3 rounded-full shadow-lg text-white font-medium transition-all transform hover:scale-105 ${
              syncing ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title="Ejecutar todos los endpoints de sincronización en secuencia"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <FaSync className="text-white group-hover:animate-spin" />
                <span>Sincronizar todo</span>
              </>
            )}
          </button>
        </div>
      )}
    </DashboardContainer>
  );
}
