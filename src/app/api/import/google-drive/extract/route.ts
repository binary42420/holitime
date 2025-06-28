import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { downloadFile, getFileMetadata } from '@/lib/services/google-drive';
import { extractSpreadsheetData } from '@/lib/services/gemini-ai';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
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

    // Get file metadata
    const fileMetadata = await getFileMetadata(fileId, accessToken);
    
    // Download file content
    const fileContent = await downloadFile(fileId, accessToken);
    
    // Extract data using Gemini AI
    const extractedData = await extractSpreadsheetData(
      fileContent,
      fileMetadata.name,
      fileMetadata.mimeType
    );

    return NextResponse.json({
      success: true,
      data: extractedData,
      fileInfo: {
        id: fileMetadata.id,
        name: fileMetadata.name,
        mimeType: fileMetadata.mimeType,
        size: fileMetadata.size,
      },
    });
  } catch (error) {
    console.error('Error extracting data from file:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Google Drive authentication expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: `Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
