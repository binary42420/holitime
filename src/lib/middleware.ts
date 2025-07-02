import { NextRequest } from 'next/server';
import type { User } from './types';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config';

// Helper function to get user from request (for use in API routes)
export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name!,
      role: session.user.role as any, // Cast because role is not on default User type
      avatar: session.user.image || `https://i.pravatar.cc/32?u=${session.user.email}`,
      clientCompanyId: session.user.clientCompanyId || null,
    };
  }

  return null;
}
