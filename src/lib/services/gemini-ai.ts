import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ExtractedClient {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

export interface ExtractedShift {
  jobName: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  requestedWorkers?: number;
  notes?: string;
  crewChiefName?: string;
  assignedPersonnel?: {
    name: string;
    role: string;
    roleCode?: string;
  }[];
}

export interface ExtractedData {
  clients: ExtractedClient[];
  shifts: ExtractedShift[];
  metadata: {
    sheetName: string;
    extractedAt: string;
    confidence: number;
  };
}

export interface SpreadsheetAnalysis {
  sheets: ExtractedData[];
  summary: {
    totalClients: number;
    totalShifts: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Initialize Gemini AI client
 */
function initializeGemini(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Extract data from spreadsheet content using Gemini AI
 */
export async function extractSpreadsheetData(
  fileContent: Buffer,
  fileName: string,
  mimeType: string
): Promise<SpreadsheetAnalysis> {
  const genAI = initializeGemini();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    // Convert buffer to base64 for Gemini
    const base64Data = fileContent.toString('base64');
    
    const prompt = `
You are an expert data extraction assistant. Analyze this spreadsheet file and extract client information and employee shift data.

File: ${fileName}
Type: ${mimeType}

Please extract the following information from each sheet in the spreadsheet:

1. **Client Information:**
   - Company/Client name
   - Contact person name
   - Email address
   - Phone number
   - Address
   
2. **Shift/Job Information:**
   - Job/Project name
   - Client name (link to client data)
   - Date (convert to YYYY-MM-DD format)
   - Start time (convert to HH:MM format)
   - End time (convert to HH:MM format)
   - Location/Address
   - Number of requested workers
   - Notes or description
   - Crew chief name (if specified)
   - Assigned personnel with their roles

**Important Guidelines:**
- Look for common spreadsheet patterns: headers in first row, data in subsequent rows
- Handle various date formats (MM/DD/YYYY, DD/MM/YYYY, etc.) and convert to YYYY-MM-DD
- Handle various time formats (12-hour, 24-hour) and convert to 24-hour HH:MM
- Identify role codes: CC=Crew Chief, SH=Stage Hand, FO=Fork Operator, etc.
- If client info is in a separate sheet, extract it separately
- If shifts reference clients by name, maintain those relationships
- Provide confidence score (0-100) for extraction quality
- Handle multiple sheets if present

Return the data in this exact JSON format:
{
  "sheets": [
    {
      "clients": [
        {
          "name": "Client Name",
          "companyName": "Company Name",
          "email": "email@example.com",
          "phone": "555-1234",
          "address": "123 Main St",
          "contactPerson": "John Doe"
        }
      ],
      "shifts": [
        {
          "jobName": "Job Name",
          "clientName": "Client Name",
          "date": "2024-01-15",
          "startTime": "08:00",
          "endTime": "17:00",
          "location": "123 Work Site",
          "requestedWorkers": 5,
          "notes": "Special requirements",
          "crewChiefName": "Chief Name",
          "assignedPersonnel": [
            {
              "name": "Worker Name",
              "role": "Stage Hand",
              "roleCode": "SH"
            }
          ]
        }
      ],
      "metadata": {
        "sheetName": "Sheet1",
        "extractedAt": "${new Date().toISOString()}",
        "confidence": 85
      }
    }
  ],
  "summary": {
    "totalClients": 1,
    "totalShifts": 1,
    "dateRange": {
      "start": "2024-01-15",
      "end": "2024-01-15"
    }
  }
}
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType === 'application/vnd.google-apps.spreadsheet' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : mimeType,
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]) as SpreadsheetAnalysis;
    
    // Validate the extracted data structure
    if (!extractedData.sheets || !Array.isArray(extractedData.sheets)) {
      throw new Error('Invalid data structure returned from AI');
    }

    return extractedData;
  } catch (error) {
    console.error('Error extracting spreadsheet data:', error);
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
