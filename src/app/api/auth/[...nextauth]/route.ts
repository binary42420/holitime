import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// Use the centralized auth configuration
const handler = NextAuth(authOptions);

// Add error handling and logging
const wrappedHandler = async (req: Request, context: any) => {
  try {
    console.log('NextAuth handler called:', req.method, req.url);
    console.log('Environment check:', {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV
    });
    return await handler(req, context);
  } catch (error) {
    console.error('NextAuth handler error:', error);
    throw error;
  }
};

export { wrappedHandler as GET, wrappedHandler as POST };
