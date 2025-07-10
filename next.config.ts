
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
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
module.exports = {
  env: {
    customKey: 'my-value',
  },
}
    // Fix pg-native issue
    config.externals = config.externals || [];
    config.externals.push('pg-native');

    config.cache = false;
    // The 'config.cache = false' line was removed to improve build performance.
    // Webpack caching is now enabled by default, which significantly speeds up
    // local development builds. If you encounter caching issues in your CI/CD
    // environment (like Google Cloud Build), consider disabling the cache only
    // for CI builds by adding:
    // if (process.env.CI) {
    //   config.cache = false;
    // }

    return config;
  },
};

export default nextConfig;
