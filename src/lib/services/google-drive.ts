import { google } from 'googleapis';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink: string;
  thumbnailLink?: string;
}

export interface DriveAuthUrl {
  authUrl: string;
  state: string;
}

// Supported spreadsheet MIME types
const SPREADSHEET_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet', // Google Sheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel (.xlsx)
  'application/vnd.ms-excel', // Excel (.xls)
  'text/csv', // CSV files
];

// Required scopes for Google Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

/**
 * Create OAuth2 client for Google Drive API
 */
function createOAuth2Client() {
  // Use production URL for OAuth callback
  const baseUrl = process.env.NEXTAUTH_URL || 'https://holitime-369017734615.us-central1.run.app';
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/google-drive-callback`
  );
}

/**
 * Generate Google OAuth URL for Drive access
 */
export function generateAuthUrl(userId: string): DriveAuthUrl {
  const oauth2Client = createOAuth2Client();
  
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to get refresh token
  });

  return { authUrl, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<any> {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * List spreadsheet files from Google Drive
 */
export async function listSpreadsheetFiles(accessToken: string): Promise<DriveFile[]> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.list({
      q: `(${SPREADSHEET_MIME_TYPES.map(type => `mimeType='${type}'`).join(' or ')}) and trashed=false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    return response.data.files?.map(file => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size || undefined,
      modifiedTime: file.modifiedTime!,
      webViewLink: file.webViewLink!,
      thumbnailLink: file.thumbnailLink || undefined,
    })) || [];
  } catch (error) {
    console.error('Error listing Drive files:', error);
    throw new Error('Failed to list Drive files');
  }
}

/**
 * Download file content from Google Drive
 */
export async function downloadFile(fileId: string, accessToken: string): Promise<Buffer> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // Get file metadata first
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'mimeType',
    });

    let response;
    
    if (fileMetadata.data.mimeType === 'application/vnd.google-apps.spreadsheet') {
      // For Google Sheets, export as Excel format
      response = await drive.files.export({
        fileId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }, { responseType: 'arraybuffer' });
    } else {
      // For other files, download directly
      response = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'arraybuffer' });
    }

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Get file metadata from Google Drive
 */
export async function getFileMetadata(fileId: string, accessToken: string): Promise<any> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,parents',
    });

    return response.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
}
