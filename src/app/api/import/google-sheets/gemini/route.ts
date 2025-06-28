import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'

const GEMINI_PROMPT = `Core Objective
Extract client, job, shift, employee, and time tracking information from each worksheet and transform it into a single, unified CSV output.
Data Extraction Rules
For each worksheet, identify and extract the following. Note that column headers may not always be in the first row; scan the first few rows to accurately identify them.
1. Client & Job Details (Per Worksheet)
client_name: Look for headers like "CLIENT NAME:", "Client".
contact_name: Look for headers like "POC:", "Contact".
contact_phone: Look for headers like "POC:", "Contact" (if clearly a phone number), or "Contact Phone".
job_name: Look for headers like "HANDS ON JOB #:", "JOB Name:", "Job".
Inference Rule: If no explicit job_name is found, infer it from LOCATION: (e.g., "7471 University Ave, La Mesa" -> "University Ave Project") or CLIENT NAME: (e.g., "RCA MIDLAND" -> "RCA MIDLAND Project"). Prioritize LOCATION: for inference.
job_start_date: This is the earliest shift_date found within that specific worksheet. Each worksheet represents a distinct job for a single client.
2. Shift & Employee Details (Per Row)
shift_date: Look for headers like "DATE/TIME:", "DATE:".
shift_start_time: Look for headers like "DATE/TIME:", "TIME:".
shift_end_time: This will be the clock_out_1 if only one pair, or the last clock_out_X if multiple pairs are present for that row.
employee_name: Look for headers like "EMPLOYEE NAME:", "NAME", "Worker", "Staff".
employee_email: Look for headers like "Email Adresss:", "Email", "Email Address".
employee_phone: Look for headers like "Contact" (if clearly a phone number), "phone", "CONTACT INFO:".
worker_type: Look for headers like "JT", "Position", "Job Title", "Role".
3. Time Tracking (Per Row, up to 3 pairs)
clock_in_1, clock_out_1: First pair of clock in/out times.
clock_in_2, clock_out_2: Second pair (e.g., after lunch break).
clock_in_3, clock_out_3: Third pair (if present).
Column Headers: These are typically found under "IN", "OUT" columns, often repeated.
Data Transformation & Validation Rules
Date Formatting:
Recognize formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, "Month Day, Year", "DD-Mon-YY".
Convert ALL dates to YYYY-MM-DD format (e.g., 2024-01-15).
Time Formatting:
Recognize 12-hour (e.g., "8:00 AM", "5:30 PM", "7a", "12p", "1230p", "330p", "1p", "8p") and 24-hour formats.
Convert ALL times to HH:MM in 24-hour format (e.g., "08:00", "17:30", "07:00", "12:00", "12:30", "15:30", "13:00", "20:00).
Infer AM/PM if not explicitly stated (e.g., "7a" is 07:00, "7p" is 19:00).
Worker Type Mapping:
"CC" -> CC (Crew Chief)
"SH" -> SH (Stage Hand)
"FO" -> FO (Foreman)
Any other value found in the worker type column (e.g., "PR", "TRK", "OTC") should be mapped to GL (General Labor).
Time Sequence Validation:
shift_end_time must be logically after shift_start_time.
For clock in/out pairs: clock_out_X must be after clock_in_X, and clock_in_X+1 must be after clock_out_X.
If a shift spans midnight (e.g., starts 22:00, ends 02:00 the next day), the shift_date remains the start date, and the end time should reflect the correct time (e.g., 02:00).

Missing Data Handling:
If employee_email or employee_phone is missing or invalid, leave the field empty.
If an employee row has no clock in/out entries, leave clock_in_X and clock_out_X fields empty.
If worker_type cannot be determined, leave it empty.
Crucially, leave fields completely blank (empty string) rather than inserting "N/A", "null", or placeholders, unless an inference rule specifically applies (like for job_name or job_start_date).

Output Requirements
CSV Format Specification
Generate a CSV with exactly these 18 columns in this precise order:
client_name,contact_name,contact_phone,job_name,job_start_date,shift_date,shift_start_time,shift_end_time,employee_name,employee_email,employee_phone,worker_type,clock_in_1,clock_out_1,clock_in_2,clock_out_2,clock_in_3,clock_out_3

Row Structure
One row per employee per shift assignment.
If an employee works multiple shifts (on different dates/times), create separate rows for each shift.
If multiple employees work the same shift, create separate rows for each employee.

Final Processing Instructions
Iterate through each worksheet in the provided JSON data.
For each worksheet, apply the data extraction, transformation, and validation rules.
Aggregate all extracted data from all worksheets.
Generate the final CSV output.
Output only the CSV data. Do not include any introductory text, summary, or commentary. 
The response must begin immediately with the CSV header row.
`

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

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API not configured. Please set GOOGLE_AI_API_KEY environment variable.' },
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
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
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
          temperature: 0.4,
          topK: 1,
          topP: 1,
          maxOutputTokens: 20000,
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
