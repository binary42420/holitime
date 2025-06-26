import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

// Define protected routes and their required roles
const protectedRoutes = {
  '/dashboard': ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'],
  '/shifts': ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'],
  '/timesheets': ['Crew Chief', 'Manager/Admin'],
  '/staffing': ['Manager/Admin'],
  '/clients': ['Manager/Admin'],
  '/documents': ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'],
  '/api/shifts': ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'],
  '/api/timesheets': ['Crew Chief', 'Manager/Admin'],
  '/api/clients': ['Manager/Admin'],
  '/api/employees': ['Manager/Admin'],
  '/api/documents': ['Employee', 'Crew Chief', 'Manager/Admin', 'Client'],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    // Redirect to login if no token
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token
  const user = verifyToken(token)
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

  // Check role-based access for protected routes
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(user.role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          )
        }
        // Redirect to dashboard if user doesn't have access
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      break
    }
  }

  // Add user info to request headers for API routes
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
