/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow self-signed certificates for database connections
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    return config;
  }
}

module.exports = nextConfig
