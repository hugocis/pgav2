'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaUserPlus, 
  FaUserEdit,  
  FaSearch, 
  FaFilter, 
  FaUsers, 
  FaChevronLeft,
  FaChevronRight,
  FaLock,
  FaLockOpen,
  FaTrash,
  FaSortAmountDown,
  FaSortAmountUp,
  FaSave
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
  userRoles: { role: { id: number; name: string } }[];
}

interface Role {
  id: number;
  name: string;
}

export default function AdminUsers() {
  useSession({
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sortField, setSortField] = useState<string>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Estados para el diálogo de creación
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Referencias para los campos del formulario de edición
  const usernameRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const surname1Ref = useRef<HTMLInputElement>(null);
  const surname2Ref = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const userRolesRef = useRef<HTMLSelectElement>(null);
  const lockoutRef = useRef<HTMLInputElement>(null);
  
  // Referencias para los campos del formulario de creación
  const newUsernameRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const newSurname1Ref = useRef<HTMLInputElement>(null);
  const newSurname2Ref = useRef<HTMLInputElement>(null);
  const newEmailRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const newUserRolesRef = useRef<HTMLSelectElement>(null);
  
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
    result.sort((a: User, b: User) => {
      let fieldA: string | null | boolean | undefined;
      let fieldB: string | null | boolean | undefined;

      // Manejar campos anidados o casos especiales
      if (sortField === 'fullName') {
        fieldA = [a.name, a.surname1, a.surname2].filter(Boolean).join(' ').toLowerCase();
        fieldB = [b.name, b.surname1, b.surname2].filter(Boolean).join(' ').toLowerCase();
      } else if (sortField === 'roles') {
        fieldA = a.userRoles.map((ur: { role: { id: number; name: string } }) => ur.role.name).join(',').toLowerCase();
        fieldB = b.userRoles.map((ur: { role: { id: number; name: string } }) => ur.role.name).join(',').toLowerCase();
      } else {
        // Usar type assertion para manejar tipos más complejos
        const valueA = a[sortField as keyof User];
        const valueB = b[sortField as keyof User];
        
        // Convertir valores complejos a strings comparables
        if (typeof valueA === 'object' && valueA !== null) {
          fieldA = String(valueA);
        } else {
          fieldA = valueA as string | boolean | null;
        }
        
        if (typeof valueB === 'object' && valueB !== null) {
          fieldB = String(valueB);
        } else {
          fieldB = valueB as string | boolean | null;
        }

        // Convertir a minúsculas si son strings
        if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
        if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
      }

      // Manejar valores nulos o indefinidos para comparación segura
      if (fieldA === null || fieldA === undefined) fieldA = '';
      if (fieldB === null || fieldB === undefined) fieldB = '';
      
      if (fieldA === fieldB) return 0;
      
      // Ahora es seguro comparar los valores
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
  
  const changePage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }

    // Animación de scroll suave
    if (scrollContainerRef.current) {
      const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
      const scrollAmount = ((newPage - 1) / (totalPages - 1)) * 
                          (scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth);
      
      scrollContainerRef.current.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Función para alternar estado de bloqueo
  const toggleLockout = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ lockout: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado de bloqueo');
      }

      // Actualizar el estado local
      setUsers(users.map(user => 
        user.id === userId ? { ...user, lockout: !currentStatus } : user
      ));
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cambiar el estado de bloqueo');
    }
  };
  
  // Función para eliminar usuario
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
  
  // Función para abrir el diálogo de edición
  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  // Función para cerrar el diálogo de edición
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setUpdateMessage(null);
  };
    // Función para actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setIsUpdating(true);
    setUpdateMessage(null);
    
    try {
      // Obtener los roles seleccionados
      let selectedRoles: number[] = [];
      
      if (userRolesRef.current) {
        // Convertir la colección de checkboxes a un array de IDs de roles
        const checkboxes = document.querySelectorAll('input[name="userRoles"]:checked');
        selectedRoles = Array.from(checkboxes).map(checkbox => 
          parseInt((checkbox as HTMLInputElement).value)
        );
      }
      
      // Asegurarse de que al menos un rol está seleccionado
      if (selectedRoles.length === 0) {
        setUpdateMessage({ 
          text: 'Debe seleccionar al menos un rol para el usuario', 
          type: 'error' 
        });
        setIsUpdating(false);
        return;
      }
      
      const updatedData = {
        username: usernameRef.current?.value || selectedUser.username,
        name: nameRef.current?.value || selectedUser.name,
        surname1: surname1Ref.current?.value || selectedUser.surname1,
        surname2: surname2Ref.current?.value || selectedUser.surname2,
        email: emailRef.current?.value || selectedUser.email,
        lockout: lockoutRef.current?.checked || false,
        roles: selectedRoles
      };
        const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',  // Cambiado de PATCH a PUT para coincidir con el método que acepta la API
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedData),      });

      if (response.ok) {
        try {
          // Intentar parsear la respuesta solo si hay contenido
          let updatedUser: Partial<User> = {};
          let text = "";
          
          try {
            // Capturar errores específicamente al leer la respuesta
            text = await response.text();
          } catch (readError) {
            console.log("Error al leer la respuesta:", readError);
            // Continuar con texto vacío para manejar el caso como respuesta vacía
          }
          
          if (text && text.trim()) {
            // Solo intentar parsear si el texto no está vacío
            try {
              updatedUser = JSON.parse(text) as Partial<User>;
              
              // Actualizar el usuario en el estado local con datos de la respuesta
              setUsers(users.map(user => 
                user.id === selectedUser.id ? { ...user, ...updatedUser } : user
              ));
            } catch (parseError) {
              console.error("Error al parsear JSON:", parseError, "Texto recibido:", text);
              // Si hay error de parsing, tratar como respuesta vacía
            }
          } else {
            // Si la respuesta está vacía (lo que es normal), obtener el usuario actualizado
            try {
              // Hacer una nueva solicitud para obtener los datos actualizados del usuario
              const userResponse = await fetch(`/api/users/${selectedUser.id}`, {
                credentials: 'include',
                cache: 'no-store'
              });
              
              if (userResponse.ok) {
                updatedUser = await userResponse.json() as User;
                
                // Actualizar el usuario en el estado local
                setUsers(users.map(user => 
                  user.id === selectedUser.id ? { ...user, ...updatedUser } : user
                ));
              } else {
                console.warn("No se pudo refrescar el usuario actualizado");
                
                // Actualizar el usuario con los datos locales y los roles seleccionados
                setUsers(users.map(user => {
                  if (user.id === selectedUser.id) {
                    // Crear un objeto con los datos actualizados del formulario
                    const userClone = { ...user };
                    userClone.username = usernameRef.current?.value || user.username;
                    userClone.name = nameRef.current?.value || user.name;
                    userClone.surname1 = surname1Ref.current?.value || user.surname1;
                    userClone.surname2 = surname2Ref.current?.value || user.surname2;
                    userClone.email = emailRef.current?.value || user.email;
                    userClone.lockout = lockoutRef.current?.checked || false;
                    
                    // Actualizar los roles basados en las selecciones
                    userClone.userRoles = selectedRoles.map(roleId => {
                      const role = roles.find(r => r.id === roleId);
                      return { role: { id: roleId, name: role?.name || '' } };
                    });
                    
                    return userClone;
                  }
                  return user;
                }));
              }
            } catch (refreshError) {
              console.error("Error al refrescar datos del usuario:", refreshError);
            }
          }
        } catch (parseError) {
          console.error("Error al parsear respuesta:", parseError);
          
          // A pesar del error, la actualización fue exitosa
          // Intentar refrescar los datos del usuario
          try {
            const userResponse = await fetch(`/api/users/${selectedUser.id}`, {
              credentials: 'include'
            });
            const updatedUser = await userResponse.json();
            
            setUsers(users.map(user => 
              user.id === selectedUser.id ? { ...user, ...updatedUser } : user
            ));
          } catch (e) {
            console.warn("No se pudo obtener el usuario actualizado");
          }
        }
        
        setUpdateMessage({ text: 'Usuario actualizado correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseDialog();
        }, 1500);      } else {
        try {
          // Intentar obtener datos de error, pero manejar respuestas vacías
          let errorMessage = 'Error al actualizar el usuario';
          try {
            const errorText = await response.text();
            if (errorText && errorText.trim()) {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
            }
          } catch (e) {
            console.warn("Error al obtener detalles del error:", e);
          }
          
          setUpdateMessage({ 
            text: errorMessage, 
            type: 'error' 
          });
        } catch (error) {
          console.error("Error completo al procesar respuesta de error:", error);
          setUpdateMessage({ 
            text: 'Error al actualizar el usuario', 
            type: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      setUpdateMessage({ 
        text: 'Error de conexión al actualizar el usuario', 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Función para manejar el diálogo de creación
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateMessage(null);
  };
    // Función para crear un nuevo usuario
  const handleCreateUser = async () => {
    setIsCreating(true);
    setCreateMessage(null);
    
    try {
      // Validación básica
      if (!newUsernameRef.current?.value || !newEmailRef.current?.value || !newPasswordRef.current?.value) {
        setCreateMessage({ 
          text: 'Los campos Usuario, Email y Contraseña son obligatorios', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
      
      // Obtener los roles seleccionados directamente de los checkboxes
      const checkboxes = document.querySelectorAll('input[name="newUserRoles"]:checked');
      const selectedRoles: number[] = Array.from(checkboxes).map(checkbox => 
        parseInt((checkbox as HTMLInputElement).value)
      );
      
      if (selectedRoles.length === 0) {
        setCreateMessage({ 
          text: 'Debe seleccionar al menos un rol', 
          type: 'error' 
        });
        setIsCreating(false);
        return;
      }
      
      const newUserData = {
        username: newUsernameRef.current?.value,
        name: newNameRef.current?.value || '',
        surname1: newSurname1Ref.current?.value || '',
        surname2: newSurname2Ref.current?.value || '',
        email: newEmailRef.current?.value,
        password: newPasswordRef.current?.value,
        roles: selectedRoles
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newUserData),
      });

      if (response.ok) {
        // Añadir el nuevo usuario al estado local
        const createdUser = await response.json();
        setUsers([...users, createdUser]);
        
        setCreateMessage({ text: 'Usuario creado correctamente', type: 'success' });
        
        // Esperar 1.5 segundos antes de cerrar el diálogo
        setTimeout(() => {
          handleCloseCreateDialog();
        }, 1500);
      } else {
        const errorData = await response.json();
        setCreateMessage({ 
          text: errorData.message || 'Error al crear el usuario', 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('Error al crear el usuario:', error);
      setCreateMessage({ 
        text: 'Error de conexión al crear el usuario', 
        type: 'error' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Función para alternar la dirección de ordenación
  const toggleSortDirection = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Renderizar icono de ordenación
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <FaSortAmountUp className="ml-1 inline text-blue-500" /> 
      : <FaSortAmountDown className="ml-1 inline text-blue-500" />;
  };

  return (
    <DashboardContainer roleName="Admin">
      <div className="bg-gray-50 min-h-full pb-8">      
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative">
          {/* Panel de bienvenida mejorado */}
          <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative bg-gradient-to-r from-[#0D3C68] to-[#1a5590] px-6 py-5 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-2 flex items-center">
                    <FaUsers className="mr-3" /> 
                    Administración de Usuarios
                  </h1>
                  <p className="text-blue-100 text-sm">Gestiona los usuarios y sus roles en el sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => history.back()}
                    className="bg-white/10 hover:bg-white/20 transition-colors duration-200 rounded-lg px-3 py-2 flex items-center"
                  >
                    <FaChevronLeft className="mr-2" /> Volver
                  </button>
                  <div className="bg-white/10 rounded-full p-3">
                    <FaUsers className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Línea de navegación */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            </div>
          </div>
      
          {/* Filtros y búsqueda */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Buscar por nombre, email o usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaFilter className="text-gray-400" />
                  </div>
                  <select
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value="">Todos los roles</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                >
                  <FaUserPlus className="mr-2" /> Nuevo Usuario
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de usuarios con paginación */}
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSortDirection('username')}
                      >
                        Usuario {renderSortIcon('username')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSortDirection('fullName')}
                      >
                        Nombre completo {renderSortIcon('fullName')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSortDirection('email')}
                      >
                        Email {renderSortIcon('email')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSortDirection('roles')}
                      >
                        Roles {renderSortIcon('roles')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          No se encontraron usuarios con los criterios de búsqueda.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map(user => (
                        <tr key={user.id} className={`hover:bg-gray-50 ${user.lockout ? 'bg-red-50' : ''}`}>
                          <td 
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium cursor-pointer"
                            onClick={() => handleRowClick(user)}
                          >
                            {user.username}                          </td><td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                            onClick={() => handleRowClick(user)}
                          >
                            {[user.name, user.surname1, user.surname2].filter(Boolean).join(' ')}
                          </td><td 
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                            onClick={() => handleRowClick(user)}
                          >
                            {user.email}
                          </td><td 
                            className="px-6 py-4 text-sm text-gray-500 cursor-pointer"
                            onClick={() => handleRowClick(user)}
                          >
                            {user.userRoles.length <= 2 ? (
                              // Si hay 1 o 2 roles, mostrarlos todos en línea
                              <div className="flex flex-wrap gap-1">
                                {user.userRoles.map(ur => (
                                  <span 
                                    key={ur.role.id} 
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      ur.role.name === 'Admin' ? 'bg-red-100 text-red-800' : 
                                      ur.role.name === 'Profesor' ? 'bg-blue-100 text-blue-800' : 
                                      ur.role.name === 'Alumno' ? 'bg-green-100 text-green-800' : 
                                      ur.role.name === 'PEC' ? 'bg-purple-100 text-purple-800' :
                                      ur.role.name === 'Manager' ? 'bg-amber-100 text-amber-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {ur.role.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              // Si hay más de 2 roles, mostrar los 2 primeros y un +X más
                              <div className="flex items-center gap-1">
                                {user.userRoles.slice(0, 2).map(ur => (
                                  <span 
                                    key={ur.role.id} 
                                    className={`px-2 py-1 text-xs rounded-full ${
                                      ur.role.name === 'Admin' ? 'bg-red-100 text-red-800' : 
                                      ur.role.name === 'Profesor' ? 'bg-blue-100 text-blue-800' : 
                                      ur.role.name === 'Alumno' ? 'bg-green-100 text-green-800' : 
                                      ur.role.name === 'PEC' ? 'bg-purple-100 text-purple-800' :
                                      ur.role.name === 'Manager' ? 'bg-amber-100 text-amber-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {ur.role.name}
                                  </span>
                                ))}
                                <span 
                                  className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 cursor-pointer"
                                  title={user.userRoles.slice(2).map(ur => ur.role.name).join(', ')}
                                >
                                  +{user.userRoles.length - 2} más
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleRowClick(user)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Editar usuario"
                              >
                                <FaUserEdit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => toggleLockout(user.id, user.lockout)}
                                className={user.lockout ? "text-green-600 hover:text-green-900" : "text-yellow-600 hover:text-yellow-900"}
                                title={user.lockout ? "Desbloquear usuario" : "Bloquear usuario"}
                              >
                                {user.lockout ? <FaLockOpen className="w-5 h-5" /> : <FaLock className="w-5 h-5" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar usuario"
                              >
                                <FaTrash className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Controles de paginación */}
              {totalUsers > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-700 gap-4">
                    <div>
                      Mostrando <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalUsers)}</span> a{" "}
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalUsers)}</span> de{" "}
                      <span className="font-medium">{totalUsers}</span> usuarios
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Mostrar</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1); // Reset to first page when changing page size
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {[10, 20, 50, 100].map(size => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <span>por página</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => changePage('prev')} 
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Página anterior"
                    >
                      <FaChevronLeft />
                    </button>
                    <div 
                      ref={scrollContainerRef}
                      className="flex overflow-x-auto px-1 mx-1 scroll-smooth hide-scrollbar" 
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxWidth: '200px' }}
                    >
                      {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-[36px] mx-1 px-2 py-1 rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={() => changePage('next')} 
                      disabled={currentPage >= totalPages}
                      className={`px-3 py-1 rounded ${currentPage >= totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`}
                      aria-label="Página siguiente"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de edición */}
      {isDialogOpen && selectedUser && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Editar Usuario: {selectedUser.username}
              </h3>
              <button 
                onClick={handleCloseDialog}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedUser.username}
                      ref={usernameRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedUser.email}
                      ref={emailRef}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedUser.name || ''}
                      ref={nameRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedUser.surname1 || ''}
                      ref={surname1Ref}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      defaultValue={selectedUser.surname2 || ''}
                      ref={surname2Ref}
                    />
                  </div>
                </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50 flex flex-wrap gap-2">
                    {roles.map(role => {
                      const isChecked = selectedUser.userRoles.some(ur => ur.role.id === role.id);
                      return (
                        <label 
                          key={role.id} 
                          className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors border ${
                            isChecked 
                              ? 'bg-blue-50 border-blue-200 shadow-sm' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="userRoles"
                            value={role.id.toString()}
                            defaultChecked={isChecked}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            ref={el => {
                              // Crear/actualizar un array para los checkboxes
                              if (el && !userRolesRef.current) {
                                userRolesRef.current = document.createElement('select');
                                userRolesRef.current.multiple = true;
                              }
                            }}
                            onChange={(e) => {
                              // Simular el comportamiento de un select múltiple
                              if (!userRolesRef.current) return;
                              
                              const option = Array.from(userRolesRef.current.options).find(
                                opt => opt.value === role.id.toString()
                              );
                              
                              if (!option) {
                                const newOption = document.createElement('option');
                                newOption.value = role.id.toString();
                                newOption.selected = e.target.checked;
                                userRolesRef.current.add(newOption);
                              } else {
                                option.selected = e.target.checked;
                              }
                            }}
                          />
                          <span 
                            className={`ml-2 ${
                              role.name === 'Admin' ? 'text-red-700' : 
                              role.name === 'Profesor' ? 'text-blue-700' : 
                              role.name === 'Alumno' ? 'text-green-700' : 
                              role.name === 'PEC' ? 'text-purple-700' :
                              role.name === 'Manager' ? 'text-amber-700' :
                              'text-gray-700'
                            }`}
                          >
                            {role.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Selecciona todos los roles que deseas asignar a este usuario</p>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="lockout"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      defaultChecked={selectedUser.lockout}
                      ref={lockoutRef}
                    />
                    <label htmlFor="lockout" className="ml-2 block text-sm text-gray-900">
                      Usuario bloqueado
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            {updateMessage && (
              <div className={`mx-6 p-3 rounded ${updateMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {updateMessage.text}
              </div>
            )}
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateUser}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none flex items-center"
              >
                {isUpdating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Actualizando...
                  </>
                ) : (
                  <>
                    Guardar Cambios <FaSave className="inline ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Diálogo de creación de usuario */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-gray-700/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#0D3C68] to-[#1a5590] text-white">
              <h3 className="text-lg font-medium">
                Crear Nuevo Usuario
              </h3>
              <button 
                onClick={handleCloseCreateDialog}
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Nombre de usuario"
                      ref={newUsernameRef}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="ejemplo@email.com"
                      ref={newEmailRef}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input
                    type="password"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Contraseña segura"
                    ref={newPasswordRef}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Nombre"
                      ref={newNameRef}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Primer apellido"
                      ref={newSurname1Ref}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Segundo apellido"
                      ref={newSurname2Ref}
                    />
                  </div>
                </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Roles *</label>
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50 flex flex-wrap gap-2">
                    {roles.map(role => (
                      <label 
                        key={role.id} 
                        className="flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors border bg-white border-gray-200 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          name="newUserRoles"
                          value={role.id.toString()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          ref={el => {
                            // Crear/actualizar un array para los checkboxes
                            if (el && !newUserRolesRef.current) {
                              newUserRolesRef.current = document.createElement('select');
                              newUserRolesRef.current.multiple = true;
                            }
                          }}
                          onChange={(e) => {
                            // Simular el comportamiento de un select múltiple
                            if (!newUserRolesRef.current) return;
                            
                            const option = Array.from(newUserRolesRef.current.options).find(
                              opt => opt.value === role.id.toString()
                            );
                            
                            if (!option) {
                              const newOption = document.createElement('option');
                              newOption.value = role.id.toString();
                              newOption.selected = e.target.checked;
                              newUserRolesRef.current.add(newOption);
                            } else {
                              option.selected = e.target.checked;
                            }
                          }}
                        />
                        <span 
                          className={`ml-2 ${
                            role.name === 'Admin' ? 'text-red-700' : 
                            role.name === 'Profesor' ? 'text-blue-700' : 
                            role.name === 'Alumno' ? 'text-green-700' : 
                            role.name === 'PEC' ? 'text-purple-700' :
                            role.name === 'Manager' ? 'text-amber-700' :
                            'text-gray-700'
                          }`}
                        >
                          {role.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Selecciona todos los roles que deseas asignar a este usuario</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500">Los campos marcados con * son obligatorios</p>
                </div>
              </div>
            </div>
            
            {createMessage && (
              <div className={`mx-6 p-3 rounded ${createMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {createMessage.text}
              </div>
            )}
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseCreateDialog}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-3"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateUser}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none flex items-center"
              >
                {isCreating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Usuario <FaUserPlus className="inline ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardContainer>
  );
}
