import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only crew chiefs and managers can view timesheets
    if (user.role !== "Crew Chief" && user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shiftId = searchParams.get("shiftId")

    let whereClause = ""
    let params: any[] = []

    if (shiftId) {
      // Filter by specific shift ID
      whereClause = "WHERE t.shift_id = $1"
      params = [shiftId]

      // Additional permission check for crew chiefs
      if (user.role === "Crew Chief") {
        whereClause += " AND s.crew_chief_id = $2"
        params.push(user.id)
      }
    } else if (user.role === "Crew Chief") {
      // Crew chiefs can only see timesheets for their shifts
      whereClause = "WHERE s.crew_chief_id = $1"
      params = [user.id]
    }

    const result = await query(`
      SELECT
        t.id, t.status, t.client_signature, t.client_approved_at, t.manager_approved_at,
        s.id as shift_id, s.date, s.start_time, s.end_time, s.location,
        j.name as job_name,
        c.company_name as client_name,
        cc.name as crew_chief_name
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      ${whereClause}
      ORDER BY s.date DESC, s.start_time DESC
    `, params)

    const timesheets = result.rows.map(row => ({
      id: row.id,
      shiftId: row.shift_id,
      status: row.status,
      clientSignature: row.client_signature,
      approvedByClientAt: row.client_approved_at,
      approvedByManagerAt: row.manager_approved_at,
      shift: {
        id: row.shift_id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        jobName: row.job_name,
        clientName: row.client_name,
        crewChiefName: row.crew_chief_name,
      }
    }))

    return NextResponse.json({
      success: true,
      timesheets,
    })
  } catch (error) {
    console.error("Error getting timesheets:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
