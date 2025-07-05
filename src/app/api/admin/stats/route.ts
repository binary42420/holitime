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

    // Only managers can access admin stats
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const today = new Date().toISOString().split("T")[0]
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    // Get active shifts today
    const activeShiftsResult = await query(`
      SELECT COUNT(*) as count
      FROM shifts 
      WHERE date = $1 
      AND status IN ('scheduled', 'in_progress')
    `, [today])

    // Get pending timesheets
    const pendingTimesheetsResult = await query(`
      SELECT COUNT(*) as count
      FROM timesheets 
      WHERE status IN ('pending_client_approval', 'pending_final_approval')
    `)

    // Get total employees (excluding clients)
    const totalEmployeesResult = await query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role IN ('Employee', 'Crew Chief', 'Manager/Admin')
      AND is_active = true
    `)

    // Get total jobs (jobs table doesn't have status column)
    const totalJobsResult = await query(`
      SELECT COUNT(*) as count
      FROM jobs
    `)

    // Get upcoming shifts (next 7 days)
    const upcomingShiftsResult = await query(`
      SELECT COUNT(*) as count
      FROM shifts 
      WHERE date > $1 
      AND date <= $2
      AND status = 'scheduled'
    `, [today, sevenDaysFromNow])

    // Get understaffed shifts
    const understaffedShiftsResult = await query(`
      SELECT COUNT(*) as count
      FROM shifts s
      LEFT JOIN (
        SELECT shift_id, COUNT(*) as assigned_count
        FROM assigned_personnel
        GROUP BY shift_id
      ) ap ON s.id = ap.shift_id
      WHERE s.status = 'scheduled'
      AND (ap.assigned_count IS NULL OR ap.assigned_count < s.requested_workers)
    `)

    // Get total clients (clients table doesn't have status column)
    const totalClientsResult = await query(`
      SELECT COUNT(*) as count
      FROM clients
    `)

    // Get overdue timesheets (more than 3 days old and still pending)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const overdueTimesheetsResult = await query(`
      SELECT COUNT(*) as count
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      WHERE t.status IN ('pending_client_approval', 'pending_final_approval')
      AND s.date < $1
    `, [threeDaysAgo])

    const stats = {
      activeShiftsToday: parseInt(activeShiftsResult.rows[0].count),
      pendingTimesheets: parseInt(pendingTimesheetsResult.rows[0].count),
      totalEmployees: parseInt(totalEmployeesResult.rows[0].count),
      totalJobs: parseInt(totalJobsResult.rows[0].count),
      upcomingShifts: parseInt(upcomingShiftsResult.rows[0].count),
      understaffedShifts: parseInt(understaffedShiftsResult.rows[0].count),
      totalClients: parseInt(totalClientsResult.rows[0].count),
      overdueTimesheets: parseInt(overdueTimesheetsResult.rows[0].count)
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
