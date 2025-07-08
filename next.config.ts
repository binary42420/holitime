
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    // Fix pg-native issue
    config.externals = config.externals || [];
    config.externals.push('pg-native');

    // Disable webpack cache to fix Cloud Build issue
    config.cache = false;

    return config;
  },
};

export default nextConfig;
