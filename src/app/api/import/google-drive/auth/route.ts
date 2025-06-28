import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { generateAuthUrl } from '@/lib/services/google-drive';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers can import data
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { authUrl, state } = generateAuthUrl(user.id);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Error generating Google Drive auth URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
