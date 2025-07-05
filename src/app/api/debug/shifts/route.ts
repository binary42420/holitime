import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get all shifts with their company and job names for debugging
    const result = await query(`
      SELECT 
        s.id,
        s.date,
        c.name as company_name,
        j.name as job_name,
        s.location,
        s.status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      ORDER BY s.date DESC
    `)

    return NextResponse.json({
      success: true,
      shifts: result.rows,
      count: result.rows.length
    })

  } catch (error) {
    console.error("Error getting debug shifts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
