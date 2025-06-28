import { NextRequest, NextResponse } from 'next/server';
import { listSpreadsheetFiles } from '@/lib/services/google-drive';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 401 });
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const files = await listSpreadsheetFiles(accessToken);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing Drive files:', error);
    return NextResponse.json(
      { error: 'Failed to list Drive files' },
      { status: 500 }
    );
  }
}
