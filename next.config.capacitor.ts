import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* Mobile-only frontend configuration */
  output: 'export',
  trailingSlash: true,
  basePath: '',
  distDir: 'out',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
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
  // Environment variables for mobile API endpoint
  env: {
    NEXT_PUBLIC_API_URL: 'https://holitime-369017734615.us-central1.run.app',
    NEXT_PUBLIC_IS_MOBILE: 'true',
  },
  // Webpack configuration for mobile build
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side only - exclude server-side dependencies
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
