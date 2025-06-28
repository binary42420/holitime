import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(_request: NextRequest) {
    // Add custom middleware logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Public routes (login, api/auth)
     * - Static files (_next/static, _next/image, favicon.ico)
     * - Import page (which uses client-side Google auth)
     * - Google Drive OAuth callback
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|import|google-drive-callback).*)',
  ],
};
