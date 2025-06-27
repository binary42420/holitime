import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the auth token cookie more aggressively
    const cookieStore = await cookies();

    // Method 1: Set to empty with immediate expiration
    cookieStore.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    // Method 2: Delete the cookie explicitly
    cookieStore.delete('auth-token');

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Method 3: Also clear via response headers
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
