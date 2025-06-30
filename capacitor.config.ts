import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.bin4ry.hol',
  appName: 'holitime',
  webDir: 'out',
  server: {
    // For development - points to local dev server
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
    // For production - use deployed API
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
