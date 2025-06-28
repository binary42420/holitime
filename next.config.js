/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  output: 'standalone', // Enable standalone output for Docker
  eslint: {
    ignoreDuringBuilds: true, // Disable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking but be more lenient
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow self-signed certificates for database connections
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Exclude problematic AI dependencies from build
    config.externals = config.externals || [];
    config.externals.push({
      '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
      'handlebars': 'commonjs handlebars'
    });

    return config;
  },
  // Optimize for production
  experimental: {
    // optimizeCss: true, // Disabled due to critters module issue
  },
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    domains: ['i.pravatar.cc'],
    formats: ['image/webp', 'image/avif'],
  },
}

module.exports = nextConfig
