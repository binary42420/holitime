import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { google } from "googleapis"
import { format, parseISO } from "date-fns"

// Helper function to convert column number to Excel-style letter
function numberToColumnLetter(num: number): string {
  let result = ""
  while (num > 0) {
    num--
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26)
  }
  return result
}

// Helper function to convert Excel-style letter to column number
function columnLetterToNumber(letter: string): number {
  let result = 0
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64)
  }
  return result - 1
}

// Helper function to calculate total hours from time entries
function calculateTotalHours(timeEntries: any[]): string {
  let totalMinutes = 0
  
  for (const entry of timeEntries) {
    if (entry.clock_in && entry.clock_out) {
      const clockIn = new Date(entry.clock_in)
      const clockOut = new Date(entry.clock_out)
      const diffMs = clockOut.getTime() - clockIn.getTime()
      totalMinutes += Math.floor(diffMs / (1000 * 60))
    }
  }
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}:${minutes.toString().padStart(2, "0")}`
}

// Helper function to format time for display
function formatTime(dateString: string | null): string {
  if (!dateString) return ""
  try {
    return format(parseISO(dateString), "h:mm a")
  } catch {
    return ""
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers and crew chiefs can export timesheets
    if (user.role !== "Manager/Admin" && user.role !== "Crew Chief") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id: timesheetId } = await params
    const body = await request.json()
    const { templateId, spreadsheetId, createNew = false } = body

    // Validate required parameters
    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      )
    }

    if (!createNew && !spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID is required when not creating new spreadsheet" },
        { status: 400 }
      )
    }

    // Get timesheet data with all related information
    const timesheetResult = await query(`
      SELECT 
        t.id as timesheet_id,
        t.status as timesheet_status,
        s.id as shift_id,
        s.date as shift_date,
        s.start_time,
        s.end_time,
        s.location,
        j.id as job_id,
        j.name as job_name,
        j.job_number,
        c.id as client_id,
        c.company_name as client_name,
        c.contact_person as client_contact,
        c.contact_email as client_email,
        cc.name as crew_chief_name
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      WHERE t.id = $1
    `, [timesheetId])

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      )
    }

    const timesheetData = timesheetResult.rows[0]

    // Check if timesheet is finalized
    if (!["completed", "pending_client_approval", "pending_final_approval"].includes(timesheetData.timesheet_status)) {
      return NextResponse.json(
        { error: "Only finalized timesheets can be exported" },
        { status: 400 }
      )
    }

    // Get assigned personnel and their time entries
    const personnelResult = await query(`
      SELECT 
        ap.id as assignment_id,
        u.id as employee_id,
        u.name as employee_name,
        u.email as employee_email,
        u.phone as employee_phone,
        ap.role_on_shift,
        te.id as time_entry_id,
        te.entry_number,
        te.clock_in,
        te.clock_out
      FROM assigned_personnel ap
      JOIN users u ON ap.employee_id = u.id
      LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
      WHERE ap.shift_id = $1
      ORDER BY u.name, te.entry_number
    `, [timesheetData.shift_id])

    // Group time entries by employee
    const employeeData = new Map()
    for (const row of personnelResult.rows) {
      if (!employeeData.has(row.employee_id)) {
        employeeData.set(row.employee_id, {
          id: row.employee_id,
          name: row.employee_name,
          email: row.employee_email,
          phone: row.employee_phone,
          role: row.role_on_shift,
          timeEntries: []
        })
      }
      
      if (row.time_entry_id) {
        employeeData.get(row.employee_id).timeEntries.push({
          id: row.time_entry_id,
          entryNumber: row.entry_number,
          clockIn: row.clock_in,
          clockOut: row.clock_out
        })
      }
    }

    // Get template configuration
    const templateResult = await query(`
      SELECT 
        t.name as template_name,
        t.description as template_description,
        fm.field_type,
        fm.field_name,
        fm.column_letter,
        fm.row_number,
        fm.is_header,
        fm.display_name,
        fm.data_type,
        fm.format_pattern
      FROM timesheet_export_templates t
      JOIN template_field_mappings fm ON t.id = fm.template_id
      WHERE t.id = $1
      ORDER BY fm.field_type, fm.row_number, fm.column_letter
    `, [templateId])

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found or has no field mappings" },
        { status: 404 }
      )
    }

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    let targetSpreadsheetId = spreadsheetId

    // Create new spreadsheet if requested
    if (createNew) {
      const newSpreadsheet = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `Timesheet Export - ${timesheetData.job_name} - ${format(parseISO(timesheetData.shift_date), "MM/dd/yyyy")}`
          }
        }
      })
      targetSpreadsheetId = newSpreadsheet.data.spreadsheetId!
    }

    // Prepare data for insertion
    const updates: any[] = []
    const templateConfig = templateResult.rows

    // Process client metadata
    const clientMetadataFields = templateConfig.filter(row => row.field_type === "client_metadata")
    for (const field of clientMetadataFields) {
      let value = ""
      
      switch (field.field_name) {
      case "hands_on_job_number":
        value = timesheetData.job_number || ""
        break
      case "client_po_number":
        value = "" // This would need to be added to the database schema
        break
      case "client_name":
        value = timesheetData.client_name || ""
        break
      case "client_contact":
        value = timesheetData.client_contact || ""
        break
      case "job_location":
        value = timesheetData.location || ""
        break
      case "job_name":
        value = timesheetData.job_name || ""
        break
      case "shift_date":
        value = format(parseISO(timesheetData.shift_date), "MM/dd/yyyy")
        break
      case "crew_requested":
        value = `${employeeData.size} employees` // Could be more specific
        break
      case "job_notes":
        value = "" // This would need to be added to the database schema
        break
      }

      if (value) {
        updates.push({
          range: `${field.column_letter}${field.row_number}`,
          values: [[value]]
        })
      }
    }

    // Process employee data
    const employeeDataFields = templateConfig.filter(row => row.field_type === "employee_data" && !row.is_header)
    const employees = Array.from(employeeData.values())
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i]
      const rowNumber = (employeeDataFields[0]?.row_number || 19) + i
      
      for (const field of employeeDataFields) {
        let value = ""
        
        switch (field.field_name) {
        case "shift_date":
          value = format(parseISO(timesheetData.shift_date), "MM/dd/yyyy")
          break
        case "crew_requested":
          value = employee.role || ""
          break
        case "employee_email":
          value = employee.email || ""
          break
        case "employee_contact":
          value = employee.phone || ""
          break
        case "employee_name":
          value = employee.name || ""
          break
        case "job_title":
          value = employee.role || ""
          break
        case "check_in_out_status":
          value = employee.timeEntries.length > 0 ? "Completed" : "No Show"
          break
        case "clock_in_1":
          value = employee.timeEntries[0] ? formatTime(employee.timeEntries[0].clockIn) : ""
          break
        case "clock_out_1":
          value = employee.timeEntries[0] ? formatTime(employee.timeEntries[0].clockOut) : ""
          break
        case "clock_in_2":
          value = employee.timeEntries[1] ? formatTime(employee.timeEntries[1].clockIn) : ""
          break
        case "clock_out_2":
          value = employee.timeEntries[1] ? formatTime(employee.timeEntries[1].clockOut) : ""
          break
        case "clock_in_3":
          value = employee.timeEntries[2] ? formatTime(employee.timeEntries[2].clockIn) : ""
          break
        case "clock_out_3":
          value = employee.timeEntries[2] ? formatTime(employee.timeEntries[2].clockOut) : ""
          break
        case "timecard_notes":
          value = "" // Could be added from shift notes or employee notes
          break
        }

        if (value || field.field_name.includes("clock_")) {
          updates.push({
            range: `${field.column_letter}${rowNumber}`,
            values: [[value]]
          })
        }
      }
    }

    // Batch update the spreadsheet
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: targetSpreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: updates
        }
      })
    }

    // Record export in history
    await query(`
      INSERT INTO timesheet_export_history 
      (timesheet_id, template_id, exported_by, google_sheets_url, export_status)
      VALUES ($1, $2, $3, $4, 'completed')
    `, [
      timesheetId,
      templateId,
      user.id,
      `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`
    ])

    return NextResponse.json({
      success: true,
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`,
      exportedEmployees: employees.length,
      message: "Timesheet exported successfully to Google Sheets"
    })

  } catch (error) {
    console.error("Error exporting timesheet to Google Sheets:", error)
    
    // Record failed export
    try {
      const { id: timesheetId } = await params
      const body = await request.json()
      const { templateId } = body
      const user = await getCurrentUser(request)
      
      if (user && timesheetId && templateId) {
        await query(`
          INSERT INTO timesheet_export_history 
          (timesheet_id, template_id, exported_by, export_status, error_message)
          VALUES ($1, $2, $3, 'failed', $4)
        `, [timesheetId, templateId, user.id, error instanceof Error ? error.message : "Unknown error"])
      }
    } catch (historyError) {
      console.error("Error recording export failure:", historyError)
    }

    return NextResponse.json(
      { error: "Failed to export timesheet to Google Sheets" },
      { status: 500 }
    )
  }
}
