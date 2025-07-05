import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

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

    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        s.requested_workers,
        j.name as job_name,
        c.company_name as client_name,
        cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      WHERE s.job_id = $1
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.name, c.company_name, cc.name, cc.avatar
      ORDER BY s.date ASC, s.start_time ASC
    `, [id])

    const shifts = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      status: row.status,
      notes: row.notes,
      requestedWorkers: row.requested_workers || 1,
      jobName: row.job_name,
      clientName: row.client_name,
      crewChief: row.crew_chief_name ? {
        name: row.crew_chief_name,
        avatar: row.crew_chief_avatar,
      } : null,
      assignedCount: parseInt(row.assigned_count) || 0,
      assignedPersonnel: Array(parseInt(row.assigned_count) || 0).fill({}), // Simplified for count
    }))

    return NextResponse.json({
      success: true,
      shifts,
    })
  } catch (error) {
    console.error("Error getting shifts for job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
