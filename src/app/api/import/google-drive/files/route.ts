import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { listSpreadsheetFiles } from '@/lib/services/google-drive';

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

    // Get access token from cookie
    const accessToken = request.cookies.get('google_drive_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Drive not authenticated' },
        { status: 401 }
      );
    }

    const files = await listSpreadsheetFiles(accessToken);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error) {
    console.error('Error listing Google Drive files:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Google Drive authentication expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
