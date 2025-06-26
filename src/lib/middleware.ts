import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import type { User } from './types';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

// Middleware to verify authentication
export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      // Get token from cookie
      const token = req.cookies.get('auth-token')?.value;

      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify token
      const user = verifyToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Add user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = user;

      return await handler(authenticatedReq);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

// Middleware to check role permissions
export function withRole(roles: string[], handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return await handler(req);
  });
}

// Helper function to get user from request (for use in API routes)
export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  try {
    // Try to get user from middleware headers first
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    const userEmail = req.headers.get('x-user-email');

    if (userId && userRole && userEmail) {
      // Get full user data from database
      const { getUserById } = await import('./auth');
      return await getUserById(userId);
    }

    // Fallback to token verification
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return null;
    }

    return verifyToken(token);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
