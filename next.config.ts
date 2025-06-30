import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.CAPACITOR_BUILD ? 'export' : 'standalone',
  trailingSlash: process.env.CAPACITOR_BUILD ? true : false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: process.env.CAPACITOR_BUILD ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
