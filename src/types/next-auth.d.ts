import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      clientId?: string;
    };
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
    expiresAt?: number;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: string;
    clientId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    clientId?: string;
    accessToken?: string;
    refreshToken?: string;
    scope?: string;
    expiresAt?: number;
  }
}
