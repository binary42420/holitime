import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* Web application configuration with full functionality */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'holitime-369017734615.us-central1.run.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Environment variables for production
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXTAUTH_URL || 'https://holitime-369017734615.us-central1.run.app',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },
  // Webpack configuration for web build
  webpack: (config, { isServer }) => {
    // Exclude problematic directories and files from build
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: [
        /node_modules/,
        /temp_app_backup/,
        /\.next/,
        /out/,
        /src\/ai/,
      ],
    });

    // Ignore AI-related modules that cause build issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore problematic modules
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@opentelemetry/exporter-jaeger');
    }

    return config;
  },
};

export default nextConfig;
