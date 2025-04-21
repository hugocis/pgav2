'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaUserPlus, 
  FaUserEdit, 
  FaUserTimes, 
  FaSearch, 
  FaFilter, 
  FaUsers, 
  FaUserGraduate,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaLock,
  FaLockOpen,
  FaTrash,
  FaSortAmountDown,
  FaSortAmountUp
} from 'react-icons/fa';

// Definir interfaces para tipado
interface User {
  id: string;
  username: string;
  name: string | null;
  surname1: string | null;
  surname2: string | null;
  email: string;
  createdAt: string;
  lockout: boolean;
  userRoles: { role: { id: string; name: string } }[];
}

interface Role {
  id: string;
  name: string;
}

export default function AdminUsers() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    }
  });
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sortField, setSortField] = useState<string>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Referencia para el contenedor de scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar usuarios');
        }
        
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        setError('Error al cargar los usuarios');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Error al cargar roles');
        }
        
        const data = await response.json();
        setRoles(data);
      } catch (error) {
        console.error('Error al cargar los roles:', error);
      }
    };

    fetchUsers();
    fetchRoles();
  }, []);

  // Efecto para simular carga progresiva para mejorar la percepción de velocidad
  useEffect(() => {
    if (!isLoading && !isLoaded) {
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, isLoaded]);

  // Filtrado y ordenación de usuarios
  useEffect(() => {
    let result = [...users];
    
    // Aplicar filtros
    if (searchTerm) {
      result = result.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.surname1 && user.surname1.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedRole) {
      result = result.filter(user => 
        user.userRoles.some(ur => ur.role.name === selectedRole)
      );
    }

    // Aplicar ordenación
    result.sort((a: any, b: any) => {
      let fieldA: any;
      let fieldB: any;

      // Manejar campos anidados o casos especiales
      if (sortField === 'fullName') {
        fieldA = [a.name, a.surname1, a.surname2].filter(Boolean).join(' ').toLowerCase();
        fieldB = [b.name, b.surname1, b.surname2].filter(Boolean).join(' ').toLowerCase();
      } else if (sortField === 'roles') {
        fieldA = a.userRoles.map((ur: any) => ur.role.name).join(',').toLowerCase();
        fieldB = b.userRoles.map((ur: any) => ur.role.name).join(',').toLowerCase();
      } else {
        fieldA = a[sortField as keyof User];
        fieldB = b[sortField as keyof User];

        // Convertir a minúsculas si son strings
        if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
        if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
      }

      if (fieldA === fieldB) return 0;
      
      const comparison = fieldA < fieldB ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredUsers(result);
    setTotalUsers(result.length);
    // Reset a la primera página cuando cambian los filtros
    setCurrentPage(1);
  }, [searchTerm, selectedRole, users, sortField, sortDirection]);
  
  // Calcular usuarios paginados
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);
  
  // Funciones para la paginación
  const totalPages = Math.ceil(totalUsers / pageSize);
  
  // Manejo de scroll para paginación
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        
        if (scrollWidth <= clientWidth) return; // No scroll necesario
        
        // Calcular la página actual basado en la posición del scroll
        const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
        const newPage = Math.max(1, Math.min(totalPages, Math.ceil(scrollPercentage * totalPages)));
        
        if (newPage !== currentPage) {
          setCurrentPage(newPage);
        }
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [currentPage, totalPages]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    
    // Animación de scroll suave
    if (scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      const totalWidth = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      
      if (totalWidth > 0) { // Solo si hay scroll
        const scrollPosition = ((page - 1) / (totalPages - 1 || 1)) * totalWidth;
        
        scrollContainer.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cambiar dirección si ya está ordenando por este campo
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nuevo campo, ordenar ascendente por defecto
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el usuario');
      }

      // Actualizar la lista de usuarios
      setUsers(users.filter(user => user.id !== userId));
      alert('Usuario eliminado correctamente');
    } catch (error) {
      alert('Error al eliminar el usuario');
      console.error(error);
    }
  };

  const handleToggleLockout = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...user,
          lockout: !user.lockout
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado de bloqueo');
      }

      // Actualizar la lista de usuarios
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, lockout: !u.lockout } : u
      ));
    } catch (error) {
      alert('Error al actualizar el estado de bloqueo');
      console.error(error);
    }
  };

  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de bienvenida mejorado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaUsers className="mr-3" /> 
                    Administración de Usuarios
                  </h1>
                  <p className="text-blue-100 text-sm">Panel centralizado para la gestión de usuarios y roles del sistema</p>
                </div>
                <div className="bg-white/10 rounded-full p-3">
                  <FaUsers className="h-8 w-8 text-white" />
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>

          {/* Dashboard stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5 relative">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-3">
                    <FaUsers className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5 relative">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full p-3">
                    <FaUserGraduate className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Roles</p>
                    <p className="text-2xl font-semibold text-gray-900">{roles.length}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden rounded-lg shadow-sm hover:shadow transition-all duration-300">
              <div className="p-5 relative">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gradient-to-br from-red-400 to-red-600 rounded-full p-3">
                    <FaUserTimes className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Cuentas Bloqueadas</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.filter(user => user.lockout).length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Buscar y filtrar usuarios</h2>
              <Link href="/admin/users/create">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                  <FaUserPlus /> Nuevo Usuario
                </button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Buscar por nombre, email o username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="">Todos los roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabla de usuarios con paginación por scroll */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 flex justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando usuarios...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center text-red-600">{error}</div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gray-100">
                    <FaSearch className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No se encontraron usuarios</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    No hay usuarios que coincidan con tus criterios de búsqueda.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedRole('');
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  ref={scrollContainerRef}
                  className="overflow-x-auto scroll-container"
                  style={{ scrollbarWidth: 'thin', scrollBehavior: 'smooth' }}
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('username')}
                        >
                          <div className="flex items-center">
                            Usuario
                            {sortField === 'username' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? <FaSortAmountUp className="h-3 w-3" /> : <FaSortAmountDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center">
                            Email
                            {sortField === 'email' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? <FaSortAmountUp className="h-3 w-3" /> : <FaSortAmountDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('roles')}
                        >
                          <div className="flex items-center">
                            Roles
                            {sortField === 'roles' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? <FaSortAmountUp className="h-3 w-3" /> : <FaSortAmountDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('lockout')}
                        >
                          <div className="flex items-center">
                            Estado
                            {sortField === 'lockout' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? <FaSortAmountUp className="h-3 w-3" /> : <FaSortAmountDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center">
                            Fecha Creación
                            {sortField === 'createdAt' && (
                              <span className="ml-1">
                                {sortDirection === 'asc' ? <FaSortAmountUp className="h-3 w-3" /> : <FaSortAmountDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg mr-3">
                                {(user.name?.charAt(0) || user.username?.charAt(0) || "").toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.username}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {[user.name, user.surname1, user.surname2].filter(Boolean).join(' ')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a className="text-sm text-blue-600 hover:underline" href={`mailto:${user.email}`}>
                              {user.email}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {user.userRoles.map((ur, idx) => (
                                <span 
                                  key={idx} 
                                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm 
                                    ${ur.role.name === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                                      ur.role.name === 'Profesor' ? 'bg-green-100 text-green-800' : 
                                      ur.role.name === 'Alumno' ? 'bg-blue-100 text-blue-800' :
                                      ur.role.name === 'PEC' ? 'bg-yellow-100 text-yellow-800' :
                                      ur.role.name === 'Manager' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                  {ur.role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${user.lockout ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                              {user.lockout ? 'Bloqueado' : 'Activo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-3">
                              <Link href={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-900 transition-colors">
                                <button className="p-1 rounded-full hover:bg-blue-100">
                                  <FaEye className="h-5 w-5" title="Ver detalles" />
                                </button>
                              </Link>
                              <button 
                                onClick={() => handleToggleLockout(user)} 
                                className={`p-1 rounded-full ${user.lockout ? 'text-green-600 hover:text-green-900 hover:bg-green-100' : 'text-red-600 hover:text-red-900 hover:bg-red-100'} transition-colors`}
                                title={user.lockout ? "Desbloquear usuario" : "Bloquear usuario"}
                              >
                                {user.lockout ? <FaLockOpen className="h-5 w-5" /> : <FaLock className="h-5 w-5" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)} 
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition-colors"
                                title="Eliminar usuario"
                              >
                                <FaTrash className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Controles de paginación */}
              {filteredUsers.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalUsers)}</span> a{" "}
                    <span className="font-medium">{Math.min(currentPage * pageSize, totalUsers)}</span> de{" "}
                    <span className="font-medium">{totalUsers}</span> usuarios
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-2 items-center mr-4">
                      <span className="text-sm text-gray-700">Filas por página:</span>
                      <select
                        className="border border-gray-300 rounded-md text-sm py-1 pl-2 pr-8 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                      >
                        {[5, 10, 20, 50].map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      >
                        <FaChevronLeft />
                      </button>
                      <span className="px-3 py-1 text-sm font-medium text-gray-700">
                        Página {currentPage} de {Math.ceil(totalUsers / pageSize)}
                      </span>
                      <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage >= Math.ceil(totalUsers / pageSize)}
                        className={`px-3 py-1 rounded ${currentPage >= Math.ceil(totalUsers / pageSize) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
