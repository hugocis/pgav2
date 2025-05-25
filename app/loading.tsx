'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-blue-50">
      <div className="relative flex flex-col items-center">
        {/* Logo animado */}
        <div className="mb-6">
          <svg
            viewBox="0 0 100 100"
            className="w-24 h-24 drop-shadow-lg"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="white"
              className="shadow-sm"
            />
            <path
              d="M 50 20 Q 70 20 75 35 Q 80 50 75 65 Q 70 80 50 80 Q 30 80 25 65 Q 20 50 25 35 Q 30 20 50 20"
              fill="#2563EB"
              opacity="0.8"
              className="animate-pulse"
              style={{ animationDuration: '2s' }}
            />
            <path
              d="M 50 30 Q 65 30 67.5 42.5 Q 70 55 67.5 67.5 Q 65 80 50 70 Q 35 80 32.5 67.5 Q 30 55 32.5 42.5 Q 35 30 50 30"
              fill="#1D4ED8"
              opacity="0.9"
              className="animate-pulse"
              style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}
            />
          </svg>
        </div>
        
        {/* Spinner elegante */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-blue-300 border-l-transparent animate-spin" 
               style={{ animationDuration: '1.2s' }}></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-blue-400 animate-spin"
               style={{ animationDuration: '1.8s' }}></div>
        </div>
      </div>
      
      {/* Texto con animación elegante */}
      <div className="mt-10 text-center">
        <h2 className="text-xl font-semibold text-gray-800 tracking-wider">Cargando Datos</h2>
        <div className="mt-3 inline-block">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-1.5 h-5 bg-blue-600 rounded-full animate-[loader_1s_ease-in-out_infinite]"></div>
            <div className="w-1.5 h-5 bg-blue-500 rounded-full animate-[loader_1s_ease-in-out_0.2s_infinite]"></div>
            <div className="w-1.5 h-5 bg-blue-400 rounded-full animate-[loader_1s_ease-in-out_0.4s_infinite]"></div>
            <div className="w-1.5 h-5 bg-blue-300 rounded-full animate-[loader_1s_ease-in-out_0.6s_infinite]"></div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3 italic">Preparando su plataforma académica</p>
      </div>
      
      <style jsx>{`
        @keyframes loader {
          0%, 100% {
            height: 5px;
            transform: translateY(0);
          }
          50% {
            height: 20px;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
}