import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple token verification for middleware (edge runtime compatible)
// We'll do a basic check here and let the API routes handle full verification
function verifyTokenSimple(token: string) {
  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (basic check, not cryptographically verified)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
    };
  } catch (error) {
    return null;
  }
}

// Check if user has NextAuth.js session
function hasNextAuthSession(request: NextRequest): boolean {
  // Check for NextAuth.js session cookies
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value;

  return !!sessionToken;
}

// Note: Role-based access control is handled in individual API routes and pages
// since we need to support both NextAuth.js sessions and custom JWT tokens

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/debug') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Check for authentication - either custom JWT token or NextAuth.js session
  const token = request.cookies.get('auth-token')?.value
  const hasSession = hasNextAuthSession(request)

  if (!token && !hasSession) {
    // Redirect to login if no authentication
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If we have a NextAuth.js session but no custom token, allow access
  // The API routes will handle the actual user data retrieval
  if (hasSession && !token) {
    // For API routes, let them handle NextAuth.js session verification
    if (pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    // For pages, allow access (NextAuth.js will handle user data)
    return NextResponse.next()
  }

  // If we have a custom JWT token, verify it
  if (token) {
    const user = verifyTokenSimple(token)
    if (!user) {
      // Clear invalid token and redirect to login
      const response = pathname.startsWith('/api/')
        ? NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/login', request.url))

      response.cookies.set('auth-token', '', { maxAge: 0 })
      return response
    }

    // Add user info to request headers for API routes (custom JWT)
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', user.id)
      requestHeaders.set('x-user-role', user.role)
      requestHeaders.set('x-user-email', user.email)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  // For NextAuth.js sessions, let the API routes handle role-based access control
  // since we can't easily get user data in middleware
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
