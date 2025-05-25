import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Configurar el compilador de SWC
  compiler: {
    // No usar styledComponents si no lo necesitas
    styledComponents: false
  }
};

export default nextConfig;
