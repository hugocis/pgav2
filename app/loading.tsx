'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="relative flex flex-col items-center">
        {/* Círculos concéntricos animados */}
        <div className="absolute animate-ping opacity-10 rounded-full h-32 w-32 bg-blue-600"></div>
        <div className="absolute animate-ping opacity-30 delay-75 rounded-full h-24 w-24 bg-blue-500"></div>
        <div className="absolute animate-pulse opacity-75 rounded-full h-16 w-16 bg-blue-400"></div>
        
        {/* Spinner central */}
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200"></div>
          <div className="absolute top-0 left-0 animate-spin rounded-full h-20 w-20 border-4 border-t-transparent border-blue-600"
               style={{ animationDuration: '1s' }}></div>
        </div>
      </div>
      
      {/* Texto */}
      <div className="mt-8 text-center">
        <h2 className="text-xl font-medium text-gray-700">Cargando</h2>
        <div className="mt-2 flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}