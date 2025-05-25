'use client';

import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardContainer from '@/components/DashboardContainer';
import { 
  FaUser, 
  FaLock, 
  FaEye, 
  FaEyeSlash,
  FaCheck,
  FaExclamationTriangle,
  FaEnvelope,
  FaIdCard,
  FaShieldAlt,
  FaUserCircle,
  FaCog,
  FaInfoCircle,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaClipboardCheck,
  FaBriefcase
} from 'react-icons/fa';

// Interface for password change form state
interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Interface for status message
interface StatusMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
    // Tabs for profile page
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
  
  // References for password inputs
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
  // Handle password change
  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate new password match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New passwords do not match'
      });
      return;
    }
    
    // Validate minimum length
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({        type: 'error',
        text: 'Password must be at least 8 characters long'
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
    } catch  {
      setPasswordMessage({
        type: 'error',
        text: 'Error de conexión. Inténtalo de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
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
  
  const fullName = session?.user ? 
    `${session.user.name || ''} ${session.user.surname1 || ''} ${session.user.surname2 || ''}`.trim() : 
    'Usuario';
  
  // Obtener el rol principal del usuario
  const getPrimaryRole = () => {
    if (!session?.user?.roles || session.user.roles.length === 0) return 'Usuario';
    
    if (session.user.roles.includes('Admin')) return 'Administrador';
    if (session.user.roles.includes('Manager')) return 'Manager';
    if (session.user.roles.includes('PEC')) return 'PEC';
    if (session.user.roles.includes('Profesor')) return 'Profesor';
    if (session.user.roles.includes('Alumno')) return 'Alumno';
    
    return 'Usuario';
  };

  return (
    <DashboardContainer roleName="Perfil">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner superior con diseño atractivo pero compacto */}
        <div className="mb-6 bg-gradient-to-r from-[#0D3C68] to-[#1a5590] rounded-lg shadow-sm overflow-hidden">
          <div className="relative">
            {/* Elementos decorativos sutiles */}
            <div className="absolute inset-0 overflow-hidden opacity-10">
              <div className="absolute right-0 top-0 transform translate-x-1/3 -translate-y-1/3 w-80 h-80 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute left-0 bottom-0 transform -translate-x-1/3 translate-y-1/3 w-80 h-80 bg-white/5 rounded-full blur-xl"></div>
            </div>
            
            <div className="relative px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between z-10">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                  {fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl text-white font-medium">{fullName}</h1>
                  <p className="text-blue-100 text-sm">{getPrimaryRole()}</p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
                {session?.user?.roles?.map((role: string) => {
                  const bgColor = 'bg-white/10';
                  
                  return (
                    <span 
                      key={role} 
                      className={`${bgColor} px-2.5 py-1 rounded-md text-xs font-medium text-white border border-white/20 backdrop-blur-sm`}
                    >
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Pestañas con navegación mejorada */}
        <div className="bg-white rounded-lg shadow-sm mb-5 overflow-hidden border border-gray-200">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 px-4 text-center transition-colors ${
                activeTab === 'info'
                  ? 'bg-gradient-to-b from-white to-gray-50 border-b-2 border-blue-500 font-medium text-blue-700'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center">
                <FaUserCircle className={`mr-2 ${activeTab === 'info' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span>Información Personal</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2.5 px-4 text-center transition-colors ${
                activeTab === 'security'
                  ? 'bg-gradient-to-b from-white to-gray-50 border-b-2 border-blue-500 font-medium text-blue-700'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center">
                <FaShieldAlt className={`mr-2 ${activeTab === 'security' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span>Seguridad</span>
              </div>
            </button>
          </div>
        </div>

        {/* Contenido de la pestaña seleccionada */}
        <div className="space-y-5">
          {/* Contenido - Información personal */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center">
                    <FaUser className="text-blue-600 mr-2" />
                    <h2 className="text-base font-medium text-gray-800">Detalles de la Cuenta</h2>
                  </div>
                  
                  <div className="p-5">
                    <dl className="divide-y divide-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 py-3">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <FaIdCard className="text-gray-400 mr-2" />
                          Nombre Completo
                        </dt>
                        <dd className="mt-1 md:mt-0 md:col-span-2 text-gray-900">{fullName}</dd>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 py-3">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <FaEnvelope className="text-gray-400 mr-2" />
                          Email
                        </dt>
                        <dd className="mt-1 md:mt-0 md:col-span-2 text-gray-900">
                          {session?.user?.email || 'No disponible'}
                        </dd>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 py-3">
                        <dt className="text-sm font-medium text-gray-500 flex items-center">
                          <FaShieldAlt className="text-gray-400 mr-2" />
                          Rol Principal
                        </dt>
                        <dd className="mt-1 md:mt-0 md:col-span-2 text-gray-900">
                          {getPrimaryRole()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center">
                    <FaCog className="text-blue-600 mr-2" />
                    <h2 className="text-base font-medium text-gray-800">Roles y Permisos</h2>
                  </div>
                  
                  <div className="p-5">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {session?.user?.roles?.map((role: string) => {
                          let bgColor = 'bg-gray-100';
                          let textColor = 'text-gray-800';
                          let icon;
                          
                          switch (role) {
                            case 'Admin':
                              bgColor = 'bg-red-50';
                              textColor = 'text-red-800';
                              icon = <FaUserCircle className="mr-1.5" />;
                              break;
                            case 'Profesor':
                              bgColor = 'bg-blue-50';
                              textColor = 'text-blue-800';
                              icon = <FaChalkboardTeacher className="mr-1.5" />;
                              break;
                            case 'Alumno':
                              bgColor = 'bg-green-50';
                              textColor = 'text-green-800';
                              icon = <FaUserGraduate className="mr-1.5" />;
                              break;
                            case 'PEC':
                              bgColor = 'bg-purple-50';
                              textColor = 'text-purple-800';
                              icon = <FaClipboardCheck className="mr-1.5" />;
                              break;
                            case 'Manager':
                              bgColor = 'bg-amber-50';
                              textColor = 'text-amber-800';
                              icon = <FaBriefcase className="mr-1.5" />;
                              break;
                          }
                          
                          return (
                            <div 
                              key={role} 
                              className={`${bgColor} ${textColor} px-3 py-2 rounded-md text-sm font-medium flex items-center shadow-sm border border-gray-100`}
                            >
                              {icon}
                              {role}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mt-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <FaInfoCircle className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-xs text-blue-700">
                              Los roles determinan a qué secciones y funcionalidades tienes acceso en el portal.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Contenido - Seguridad */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center">
                <FaLock className="text-blue-600 mr-2" />
                <h2 className="text-base font-medium text-gray-800">Cambiar Contraseña</h2>
              </div>
              
              <div className="p-5">
                <form onSubmit={handlePasswordChange} className="max-w-2xl mx-auto">
                  <div className="mb-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-5 flex items-start">
                      <FaInfoCircle className="text-blue-400 mt-0.5 mr-3" />
                      <p className="text-sm text-blue-700">
                        Tu contraseña debe tener al menos 8 caracteres. Te recomendamos usar una combinación de letras, números y símbolos.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña actual
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                            required
                            ref={currentPasswordRef}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                            placeholder="Introduce tu contraseña actual"
                          />
                          <button 
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            tabIndex={-1}
                            aria-label={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showCurrentPassword ? (
                              <FaEyeSlash className="h-4 w-4 text-gray-400" />
                            ) : (
                              <FaEye className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nueva contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                              required
                              ref={newPasswordRef}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                              minLength={8}
                              placeholder="Mínimo 8 caracteres"
                            />
                            <button 
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              tabIndex={-1}
                              aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {showNewPassword ? (
                                <FaEyeSlash className="h-4 w-4 text-gray-400" />
                              ) : (
                                <FaEye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar nueva contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                              required
                              ref={confirmPasswordRef}
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                              placeholder="Repite tu nueva contraseña"
                            />
                            <button 
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              tabIndex={-1}
                              aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {showConfirmPassword ? (
                                <FaEyeSlash className="h-4 w-4 text-gray-400" />
                              ) : (
                                <FaEye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {passwordMessage && (
                        <div className={`p-4 rounded-lg flex items-start shadow-sm ${
                          passwordMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
                          passwordMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
                          'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          <div className="flex-shrink-0 mt-0.5">
                            {passwordMessage.type === 'success' ? (
                              <FaCheck className="h-4 w-4" />
                            ) : (
                              <FaExclamationTriangle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium">
                              {passwordMessage.type === 'success' ? 'Éxito' : 'Error'}
                            </h3>
                            <p className="text-sm mt-1">{passwordMessage.text}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm flex items-center"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Procesando...
                        </>
                      ) : (
                        'Actualizar Contraseña'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardContainer>
  );
}
