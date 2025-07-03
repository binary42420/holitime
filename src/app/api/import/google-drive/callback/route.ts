import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/services/google-drive';

export async function POST(request: NextRequest) {
  try {
    console.log('Google Drive Callback: Processing OAuth callback');

    const { code } = await request.json();

    if (!code) {
      console.log('Google Drive Callback: Missing authorization code');
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    console.log('Google Drive Callback: Exchanging code for tokens');
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      console.error('Google Drive Callback: No access token received');
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
    }

    console.log('Google Drive Callback: Successfully obtained tokens');
    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to handle OAuth callback'
    }, { status: 500 });
  }
}
