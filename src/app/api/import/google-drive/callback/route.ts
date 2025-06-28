import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/services/google-drive';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const tokens = await exchangeCodeForTokens(code);

    return NextResponse.json({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return NextResponse.json({ error: 'Failed to handle OAuth callback' }, { status: 500 });
  }
}
