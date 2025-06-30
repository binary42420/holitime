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
    // Exclude handsonlabor-website directory from build
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: [
        /node_modules/,
        /handsonlabor-website/,
        /\.next/,
        /out/,
      ],
    });

    return config;
  },
};

export default nextConfig;