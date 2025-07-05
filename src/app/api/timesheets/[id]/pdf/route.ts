import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

// GET /api/timesheets/[id]/pdf - Download PDF from database
export async function GET(
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

    const { id } = await params

    // Get timesheet with PDF data and access control info
    const timesheetResult = await query(`
      SELECT
        t.id,
        t.pdf_data,
        t.pdf_filename,
        t.pdf_content_type,
        t.pdf_generated_at,
        s.crew_chief_id,
        j.client_id
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      WHERE t.id = $1
    `, [id])

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Timesheet not found" },
        { status: 404 }
      )
    }

    const row = timesheetResult.rows[0]

    // Check if PDF exists
    if (!row.pdf_data) {
      return NextResponse.json(
        { error: "PDF not generated yet. Please generate the PDF first." },
        { status: 404 }
      )
    }

    // Check permissions
    const hasAccess =
      user.role === "Manager/Admin" ||
      user.id === row.crew_chief_id ||
      (user.role === "Client" && user.client_company_id === row.client_id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    // Return the PDF from database
    const pdfBuffer = Buffer.from(row.pdf_data)
    const filename = row.pdf_filename || `timesheet-${id}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": row.pdf_content_type || "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    })







  } catch (error) {
    console.error("Error generating timesheet PDF:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
