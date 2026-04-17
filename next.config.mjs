/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  // Configuración para mejorar la conectividad
  experimental: {
    // Optimizaciones de red
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Headers para CORS y seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
    ]
  },
  
  // Configuración de webpack para polyfills
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      }
    }
    return config
  },
}

export default nextConfig