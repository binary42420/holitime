import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateUser, createUser, getUserByEmail } from './auth';

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials Provider (existing username/password)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await authenticateUser({
            email: credentials.email,
            password: credentials.password
          });

          if (result) {
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              image: result.user.avatar,
            };
          }
          return null;
        } catch (error) {
          console.error('Credentials auth error:', error);
          return null;
        }
      }
    }),

    // Google OAuth Provider - basic scopes for user authentication only
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: {
            scope: [
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
              'openid',
              'email',
              'profile'
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
    ] : [])
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google') {
          // Check if user exists in our database
          const existingUser = await getUserByEmail(user.email!);

          if (!existingUser) {
            // Create new user for Google OAuth
            const newUser = await createUser({
              email: user.email!,
              password: 'oauth_user', // Placeholder password for OAuth users
              name: user.name!,
              role: 'Employee', // Default role, can be changed by admin
            });

            if (!newUser) {
              console.error('Failed to create user for Google OAuth');
              return false;
            }
          }
        }

        return true;
      } catch (error) {
        console.error('Sign-in error:', error);
        return true; // Allow sign-in even if database operations fail
      }
    },

    async jwt({ token, user }) {
      try {
        if (user) {
          // Get user data from our database
          const dbUser = await getUserByEmail(user.email!);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.clientId = dbUser.clientId || undefined;
          }
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.clientId = token.clientId as string;
        }
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    }
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  debug: process.env.NODE_ENV === 'development',

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
