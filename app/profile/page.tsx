'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaUser, 
  FaLock, 
  FaEye, 
  FaEyeSlash, 
  FaGraduationCap, 
  FaChalkboardTeacher,
  FaCheck,
  FaExclamationTriangle,
  FaChevronLeft
} from 'react-icons/fa';

// Interfaz para el estado del formulario de cambio de contraseña
interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Interfaz para el mensaje de estado
interface StatusMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

// Interfaz para la preferencia de visibilidad
interface VisibilityPreference {
  matriculasVisible?: boolean;
  docenciaVisible?: boolean;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  // Referencias para los inputs de contraseña
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  
  // Estados de formulario
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<StatusMessage | null>(null);
  const [visibilityMessage, setVisibilityMessage] = useState<StatusMessage | null>(null);
  
  // Preferencias de visibilidad
  const [visibilityPreference, setVisibilityPreference] = useState<VisibilityPreference>({
    matriculasVisible: true,
    docenciaVisible: true
  });
  
  // Detectar si el usuario es alumno o profesor para mostrar las preferencias correspondientes
  const isAlumno = session?.user?.roles?.includes('Alumno');
  const isProfesor = session?.user?.roles?.includes('Profesor');
  
  // Cargar las preferencias al montar el componente
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/user-preferences', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const preferences = await response.json();
          setVisibilityPreference(preferences);
        }
      } catch (error) {
        console.error('Error al cargar preferencias:', error);
      }
    };
    
    if (session?.user) {
      loadPreferences();
    }
  }, [session]);

  // Manejar cambio de contraseña
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validar coincidencia de contraseña nueva
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Las contraseñas nuevas no coinciden'
      });
      return;
    }
    
    // Validar longitud mínima
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'La contraseña debe tener al menos 8 caracteres'
      });
      return;
    }
    
    setIsSubmitting(true);
    setPasswordMessage(null);
    
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      if (response.ok) {
        setPasswordMessage({
          type: 'success',
          text: 'Contraseña actualizada correctamente'
        });
        // Limpiar el formulario
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        setPasswordMessage({
          type: 'error',
          text: error.message || 'Error al cambiar la contraseña'
        });
      }
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: 'Error de conexión. Inténtalo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar cambio de preferencias de visibilidad
  const handleVisibilityChange = async (type: 'matriculas' | 'docencia', isVisible: boolean) => {
    setVisibilityMessage(null);
    
    const newPreference = { 
      ...visibilityPreference, 
      [type === 'matriculas' ? 'matriculasVisible' : 'docenciaVisible']: isVisible 
    };
    
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newPreference)
      });
      
      if (response.ok) {
        setVisibilityPreference(newPreference);
        setVisibilityMessage({
          type: 'success',
          text: 'Preferencias actualizadas correctamente'
        });
      } else {
        setVisibilityMessage({
          type: 'error',
          text: 'Error al actualizar preferencias'
        });
      }
    } catch (error) {
      setVisibilityMessage({
        type: 'error',
        text: 'Error de conexión. Inténtalo de nuevo.'
      });
    }
  };

  if (status === 'loading') {
    return (
      <DashboardContainer roleName="Perfil">
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardContainer>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }
  
  return (
    <DashboardContainer roleName="Perfil">
      <div className="bg-gray-50 min-h-full pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Encabezado */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Link 
                href="javascript:history.back()" 
                className="mr-4 p-2 rounded-full bg-white shadow-sm hover:bg-gray-50"
              >
                <FaChevronLeft className="text-gray-500" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
            </div>
            <p className="text-gray-600">Gestiona tu información personal y preferencias de cuenta</p>
          </div>
          
          {/* Panel de información del usuario */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {session?.user?.name?.charAt(0) || session?.user?.username?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {session?.user?.name
                      ? `${session.user.name} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`
                      : session?.user?.username}
                  </h2>
                  <p className="text-gray-500">{session?.user?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {session?.user?.roles?.map((role: string) => {
                      let bgColor = 'bg-gray-200';
                      let textColor = 'text-gray-800';
                      
                      switch (role) {
                        case 'Admin':
                          bgColor = 'bg-red-100';
                          textColor = 'text-red-800';
                          break;
                        case 'Profesor':
                          bgColor = 'bg-blue-100';
                          textColor = 'text-blue-800';
                          break;
                        case 'Alumno':
                          bgColor = 'bg-green-100';
                          textColor = 'text-green-800';
                          break;
                        case 'PEC':
                          bgColor = 'bg-purple-100';
                          textColor = 'text-purple-800';
                          break;
                        case 'Manager':
                          bgColor = 'bg-amber-100';
                          textColor = 'text-amber-800';
                          break;
                      }
                      
                      return (
                        <span 
                          key={role} 
                          className={`${bgColor} ${textColor} px-2 py-0.5 rounded-full text-xs font-medium`}
                        >
                          {role}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de cambio de contraseña */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <FaLock className="text-blue-600 mr-3" />
                <h2 className="text-lg font-semibold">Cambiar Contraseña</h2>
              </div>
              
              <form onSubmit={handlePasswordChange}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        ref={currentPasswordRef}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? (
                          <FaEyeSlash className="h-4 w-4 text-gray-400" />
                        ) : (
                          <FaEye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        ref={newPasswordRef}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        minLength={8}
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <FaEyeSlash className="h-4 w-4 text-gray-400" />
                        ) : (
                          <FaEye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mínimo 8 caracteres
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar nueva contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        ref={confirmPasswordRef}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      />
                      <button 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="h-4 w-4 text-gray-400" />
                        ) : (
                          <FaEye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {passwordMessage && (
                    <div className={`p-3 rounded-md ${
                      passwordMessage.type === 'success' ? 'bg-green-50 text-green-800' : 
                      passwordMessage.type === 'error' ? 'bg-red-50 text-red-800' : 
                      'bg-blue-50 text-blue-800'
                    }`}>
                      <div className="flex">
                        {passwordMessage.type === 'success' ? (
                          <FaCheck className="h-5 w-5 mr-2" />
                        ) : (
                          <FaExclamationTriangle className="h-5 w-5 mr-2" />
                        )}
                        <p className="text-sm">{passwordMessage.text}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Procesando...' : 'Actualizar Contraseña'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Panel de preferencias de visibilidad */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <FaUser className="text-blue-600 mr-3" />
                <h2 className="text-lg font-semibold">Preferencias de Visibilidad</h2>
              </div>
              
              <div className="space-y-6">
                {isAlumno && (
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FaGraduationCap className="text-green-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">Matrículas</h3>
                          <p className="text-sm text-gray-500">
                            Mostrar información de tus matrículas a profesores
                          </p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={visibilityPreference.matriculasVisible} 
                            onChange={() => handleVisibilityChange('matriculas', !visibilityPreference.matriculasVisible)}
                          />
                          <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                {isProfesor && (
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FaChalkboardTeacher className="text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">Docencia</h3>
                          <p className="text-sm text-gray-500">
                            Mostrar información de tu docencia a alumnos
                          </p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <label className="inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={visibilityPreference.docenciaVisible} 
                            onChange={() => handleVisibilityChange('docencia', !visibilityPreference.docenciaVisible)}
                          />
                          <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                {!isAlumno && !isProfesor && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No hay preferencias de visibilidad disponibles para tu rol.
                    </p>
                  </div>
                )}
                
                {visibilityMessage && (
                  <div className={`mt-4 p-3 rounded-md ${
                    visibilityMessage.type === 'success' ? 'bg-green-50 text-green-800' : 
                    visibilityMessage.type === 'error' ? 'bg-red-50 text-red-800' : 
                    'bg-blue-50 text-blue-800'
                  }`}>
                    <div className="flex">
                      {visibilityMessage.type === 'success' ? (
                        <FaCheck className="h-5 w-5 mr-2" />
                      ) : (
                        <FaExclamationTriangle className="h-5 w-5 mr-2" />
                      )}
                      <p className="text-sm">{visibilityMessage.text}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardContainer>
  );
}
