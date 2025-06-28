import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/services/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate OAuth URL with user ID from session
    const { authUrl, state } = generateAuthUrl(session.user.id);

    return NextResponse.json({ authUrl, state });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
