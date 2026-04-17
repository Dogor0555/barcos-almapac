/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  
  // Configuración para Turbopack
  turbopack: {
    // Configuración para resolver problemas de red
    resolve: {
      alias: {
        // Si tienes alias, ponlos aquí
      }
    },
    // Optimizaciones
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  
  // Headers para CORS (esto funciona en producción, no en dev)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

export default nextConfig