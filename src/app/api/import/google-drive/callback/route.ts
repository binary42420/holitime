import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/services/google-drive';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/import?error=oauth_error', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/import?error=missing_params', request.url)
      );
    }

    try {
      // Decode state to get user info
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);
      
      // Store tokens in session/cookie (simplified for demo)
      const response = NextResponse.redirect(new URL('/import?success=true', request.url));
      
      // Set secure cookie with access token (in production, use proper session management)
      response.cookies.set('google_drive_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in || 3600, // 1 hour default
      });

      if (tokens.refresh_token) {
        response.cookies.set('google_drive_refresh_token', tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60, // 30 days
        });
      }

      return response;
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError);
      return NextResponse.redirect(
        new URL('/import?error=token_exchange_failed', request.url)
      );
    }
  } catch (error) {
    console.error('Error in Google Drive callback:', error);
    return NextResponse.redirect(
      new URL('/import?error=callback_error', request.url)
    );
  }
}
