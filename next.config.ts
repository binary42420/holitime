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
    NEXT_PUBLIC_API_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },
  // Webpack configuration for web build
  webpack: (config, { isServer }) => {
    // Exclude problematic directories and files from build
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: [
        /node_modules/,
        /handsonlabor-website/,
        /temp_app_backup/,
        /\.next/,
        /out/,
        /src\/ai/,
      ],
    });

    // Handle Node.js modules properly
    if (!isServer) {
      // For client-side builds, exclude all Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        pg: false,
        'pg-native': false,
      };
    }

    // Ignore problematic modules
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push(
        '@opentelemetry/exporter-jaeger',
        'pg-native'
      );
    }

    return config;
  },
};

export default nextConfig;