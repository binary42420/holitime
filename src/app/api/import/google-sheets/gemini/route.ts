import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

const GEMINI_PROMPT = `You are a data extraction and transformation specialist for the Holitime workforce management system. Your task is to analyze Google Sheets documents and extract workforce scheduling data, transforming it into a standardized CSV format for import.

## INPUT SPECIFICATIONS

**Google Sheets Document**: You will receive a Google Sheets document ID for a publicly shared document. Process ALL worksheets/tabs within the file.

**Expected Data Types**: Look for client companies, job projects, shift schedules, employee information, and time tracking data across all sheets.

## DATA EXTRACTION REQUIREMENTS

### 1. IDENTIFY AND EXTRACT DATA
Scan all worksheets for the following information types:

**Client Information:**
- Company names (not individual contact names)
- Contact person names
- Phone numbers
- Email addresses

**Job/Project Information:**
- Job names, project titles, event names
- Start dates, project dates
- Client associations

**Shift Information:**
- Shift dates
- Start and end times
- Job associations
- Location information

**Employee Information:**
- Full employee names
- Email addresses
- Phone numbers
- Role assignments, job titles, worker types

**Time Tracking:**
- Clock in/out times
- Multiple time pairs per employee per shift
- Break times, lunch periods

### 2. RECOGNIZE FLEXIBLE DATA FORMATS
Be prepared to handle various spreadsheet layouts:

**Column Header Variations:**
- "CLIENT NAME:", "Client" → client_name
- "POC:", "Contact" → contact_name
- "POC:", "Contact Phone" → contact_phone (might be combined with contact name or under it)
- "HANDS ON JOB #:", "Job" → job_name
- "(there is no labeled start and end date for the job. this should be determined by the first shift start date, SEPERATELY BY EACH SHEET, EACH SHEET INDICATES A DIFFERENT JOB. EACH SEPERATE GOOGLE SPREADSHEET CONTAIN DATA FOR 1 SINGLE CLIENT COMPANY, EACH SHEET BEING A DIFFERENT JOB FOR THAT 1 CLIENT, AND MULTIPLE SHIFTS ARE CONTAINED ON EACH SHEET ALL PERTAINING TO THE SAME JOB FOR THE SAME CLIENT)" → job_start_date
- "DATE/TIME:" (COMBINED WITH SHIFT START TIME) → shift_date
- "DATE/TIME:", "Begin", "Clock In", "Start" → shift_start_time
- "End Time", "Finish", "Clock Out", "End" → shift_end_time
- "Employee", "Worker", "Staff", "Name" → employee_name
- "Email", "E-mail", "Email Address" → employee_email
- "Phone", "Mobile", "Cell", "Contact" → employee_phone
- "Role", "Position", "Type", "Job Title" → worker_type

**Date Format Recognition:**
- MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- "January 15, 2024", "15-Jan-24", "1/15/24"
- Convert ALL dates to YYYY-MM-DD format

**Time Format Recognition:**
- 12-hour format (8:00 AM, 5:30 PM) → 24-hour format (08:00, 17:30)
- 24-hour format (08:00, 17:30) → 24-HOUR FORMAT
- other 12-hour time formats (8p 830p 1115a, 1p) → 24-hour format (20:00, 20:30, 11:15, 13:00)

**Worker Type Mapping:**
- "CC" → CC
- "SH" → SH
- "FO" → FO
- ALL OTHER VALUES IN THE JT COLUMN SHOULD BE MAPPED TO "GL"

### 3. DATA PROCESSING LOGIC

**Multi-Sheet Processing:**
1. Identify the primary data structure across all sheets
2. Look for master client/job lists in separate tabs
3. Combine employee assignments from multiple sheets
4. Maintain data relationships across sheets
5. each sheet represents all the shifts scheduled for 1 client company for 1 specific job. 
6. each seperate sheet in a spreadsheet is a different job.
7. if no job name can be determined for a sheet, use part of the location as the name, ie location: waterfront park > job name: waterfront 

**Data Validation:**
- Ensure dates are valid and logical (shift dates after job start dates)
- Validate email formats (contains @ and domain)
- Check time logic (end times after start times)
- Verify worker types match allowed codes
- the shift start date and shift start time are generally both combined in 1 cell, you'll need to split the date and time to the corresponding columns
**Missing Data Handling:**
- Leave fields empty rather than inserting "N/A" or placeholders
- Infer missing data where logical (e.g., job start date from first shift date)
- Flag required fields that are completely missing

## OUTPUT REQUIREMENTS

### 4. CSV FORMAT SPECIFICATION
Generate a CSV with exactly these 18 columns in this order:

client_name,contact_name,contact_phone,job_name,job_start_date,shift_date,shift_start_time,shift_end_time,employee_name,employee_email,employee_phone,worker_type,clock_in_1,clock_out_1,clock_in_2,clock_out_2,clock_in_3,clock_out_3

**Row Structure:**
- One row per employee per shift assignment
- If an employee works multiple shifts, create separate rows
- If multiple employees work the same shift, create separate rows for each

**Data Format Requirements:**
- Dates: YYYY-MM-DD (e.g., 2024-01-15)
- Times: HH:MM in 24-hour format (e.g., 08:00, 17:30)
- Worker types: Exact codes (CC, SH, FO, RFO, RG, GL)
- Empty fields: Leave completely blank, no quotes or spaces

### 5. SUMMARY REPORT
Provide a detailed analysis including:

**Data Discovery:**
- Number of sheets processed
- Types of data found in each sheet
- Total clients, jobs, shifts, and employees identified

**Data Quality Assessment:**
- Rows with complete data vs. missing information
- Date/time format issues encountered
- Unrecognized worker types or roles
- Invalid email addresses or phone numbers

**Processing Summary:**
- Total CSV rows generated
- Data transformations performed
- Assumptions made for missing data

**Recommendations:**
- Suggest corrections for problematic data
- Identify patterns that might need manual review
- Recommend additional data that would improve import quality

### 6. ERROR HANDLING AND VALIDATION

**Critical Issues (Stop Processing):**
- No recognizable workforce data found
- All sheets are empty or inaccessible
- Fundamental data structure cannot be determined

**Warning Issues (Continue with Notes):**
- Some sheets couldn't be processed
- Significant amounts of missing required data
- Date/time formats that couldn't be parsed
- Unrecognized worker types

**Data Integrity Checks:**
- Ensure each row has at minimum: client_name, job_name, shift_date, employee_name
- Verify shift times are logical (start before end)
- Check that employee assignments don't conflict (same person, same time)
- Validate that job dates align with shift dates

## EXAMPLE OUTPUT STRUCTURE

client_name,contact_name,contact_phone,job_name,job_start_date,shift_date,shift_start_time,shift_end_time,employee_name,employee_email,employee_phone,worker_type,clock_in_1,clock_out_1,clock_in_2,clock_out_2,clock_in_3,clock_out_3
Acme Construction,John Smith,555-0123,Downtown Office Building,2024-01-15,2024-01-20,08:00,17:00,Jane Doe,jane.doe@email.com,555-0456,SH,08:00,12:00,13:00,17:00,,
Acme Construction,John Smith,555-0123,Downtown Office Building,2024-01-15,2024-01-20,08:00,17:00,Bob Wilson,bob.wilson@email.com,555-0789,FO,08:00,17:00,,,,

## PROCESSING INSTRUCTIONS

1. **Access the Google Sheets document** using the provided document ID
2. **Scan all worksheets** for workforce-related data
3. **Identify data patterns** and map to Holitime format
4. **Transform and validate** all extracted data
5. **Generate the standardized CSV** with proper formatting
6. **Create the summary report** with findings and recommendations
7. **Flag any critical issues** that require manual intervention

**Remember**: The goal is to minimize manual data entry while maintaining data accuracy. When in doubt, preserve the original data and flag for manual review rather than making assumptions that could introduce errors.

**Output the CSV data first, followed by the summary report.**`

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { googleSheetsId, sheetsData } = await request.json()

    if (!googleSheetsId || !sheetsData) {
      return NextResponse.json(
        { error: 'Google Sheets ID and data are required' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API not configured' },
        { status: 500 }
      )
    }

    console.log('Gemini Processing: Starting analysis of Google Sheets data')

    // Prepare the data for Gemini
    const sheetsContent = JSON.stringify(sheetsData, null, 2)
    
    const fullPrompt = `${GEMINI_PROMPT}

## GOOGLE SHEETS DATA TO PROCESS

Google Sheets ID: ${googleSheetsId}

Sheets Data:
${sheetsContent}

Please analyze this data and provide:
1. The standardized CSV output with the exact 18 columns
2. A detailed summary report of the processing

Begin your response with "CSV_DATA:" followed by the CSV content, then "SUMMARY_REPORT:" followed by the analysis.`

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API Error:', errorText)
      return NextResponse.json(
        { error: 'Failed to process data with Gemini API' },
        { status: 500 }
      )
    }

    const geminiResult = await geminiResponse.json()
    
    if (!geminiResult.candidates || geminiResult.candidates.length === 0) {
      return NextResponse.json(
        { error: 'No response from Gemini API' },
        { status: 500 }
      )
    }

    const responseText = geminiResult.candidates[0].content.parts[0].text
    
    // Parse the response to extract CSV and summary
    const csvMatch = responseText.match(/CSV_DATA:([\s\S]*?)(?=SUMMARY_REPORT:|$)/)
    const summaryMatch = responseText.match(/SUMMARY_REPORT:([\s\S]*?)$/)
    
    if (!csvMatch) {
      return NextResponse.json(
        { error: 'Could not extract CSV data from Gemini response' },
        { status: 500 }
      )
    }

    const csvData = csvMatch[1].trim()
    const summaryReport = summaryMatch ? summaryMatch[1].trim() : 'No summary provided'

    console.log('Gemini Processing: Successfully processed data')

    return NextResponse.json({
      success: true,
      csvData,
      summaryReport,
      originalResponse: responseText
    })

  } catch (error) {
    console.error('Error processing with Gemini:', error)
    return NextResponse.json(
      { error: 'Failed to process Google Sheets data' },
      { status: 500 }
    )
  }
}
