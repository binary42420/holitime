import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/import') ||
    pathname.startsWith('/google-drive-callback')
  ) {
    return NextResponse.next();
  }

  // Check for authentication token
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      // Redirect to login if no token
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware auth error:', error);
    // If there's an error checking the token, allow the request to proceed
    // This prevents blocking the app if there are auth issues
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes (handled separately)
     * - Static files (_next/static, _next/image, favicon.ico)
     * - Public assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
