import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

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

    // Only crew chiefs and managers can finalize timesheets
    if (!["Crew Chief", "Manager/Admin"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Crew Chiefs and Managers can finalize timesheets." },
        { status: 403 }
      )
    }

    const { id: shiftId } = await params

    console.log("SIMPLE Finalize timesheet request (UPDATED):", { shiftId, userId: user.id, userRole: user.role })

    // Check if all workers have ended their shifts
    const activeWorkersResult = await query(`
      SELECT COUNT(*) as active_count
      FROM assigned_personnel
      WHERE shift_id = $1 AND status != 'Shift Ended'
    `, [shiftId])

    const activeCount = parseInt(activeWorkersResult.rows[0].active_count)

    if (activeCount > 0) {
      return NextResponse.json(
        { error: `Cannot finalize timesheet. ${activeCount} workers have not ended their shifts yet.` },
        { status: 400 }
      )
    }

    // Check if timesheet already exists
    const existingTimesheetResult = await query(`
      SELECT id FROM timesheets WHERE shift_id = $1
    `, [shiftId])

    let timesheetId

    if (existingTimesheetResult.rows.length > 0) {
      // Update existing timesheet
      timesheetId = existingTimesheetResult.rows[0].id
      await query(`
        UPDATE timesheets
        SET status = 'pending_client_approval',
            submitted_by = $1,
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [user.id, timesheetId])
    } else {
      // Create new timesheet
      const newTimesheetResult = await query(`
        INSERT INTO timesheets (shift_id, status, submitted_by, submitted_at)
        VALUES ($1, 'pending_client_approval', $2, NOW())
        RETURNING id
      `, [shiftId, user.id])
      timesheetId = newTimesheetResult.rows[0].id
    }

    // Update shift status to "Completed" when timesheet is finalized
    console.log("SIMPLE Updating shift status to 'Completed' for shift:", shiftId)
    await query(`
      UPDATE shifts
      SET status = 'Completed'
      WHERE id = $1
    `, [shiftId])

    // Create notifications for relevant users
    console.log("SIMPLE Creating notifications for timesheet approval...")

    // Get shift and client information for notifications
    const shiftInfoResult = await query(`
      SELECT
        s.id as shift_id,
        s.crew_chief_id,
        s.date,
        j.name as job_name,
        j.client_id,
        c.company_name as client_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE s.id = $1
    `, [shiftId])

    if (shiftInfoResult.rows.length > 0) {
      const shiftInfo = shiftInfoResult.rows[0]

      // Get users to notify: client users, crew chief, and managers
      const usersToNotifyResult = await query(`
        SELECT DISTINCT u.id, u.name, u.role
        FROM users u
        WHERE
          (u.client_company_id = $1 AND u.role = 'Client') OR  -- Client users
          u.id = $2 OR  -- Crew chief
          u.role = 'Manager/Admin'  -- All managers
      `, [shiftInfo.client_id, shiftInfo.crew_chief_id])

      // Create notifications for each user
      for (const userToNotify of usersToNotifyResult.rows) {
        await query(`
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            related_timesheet_id,
            related_shift_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userToNotify.id,
          "timesheet_ready_for_approval",
          "Timesheet Ready for Approval",
          `Timesheet for ${shiftInfo.job_name} on ${shiftInfo.date} is ready for your approval.`,
          timesheetId,
          shiftId
        ])
      }

      console.log(`SIMPLE Created notifications for ${usersToNotifyResult.rows.length} users`)
    }

    console.log("SIMPLE Timesheet finalized successfully:", { timesheetId, shiftId })

    return NextResponse.json({
      success: true,
      message: "Timesheet finalized and submitted for client approval",
      timesheetId
    })

  } catch (error) {
    console.error("SIMPLE Error finalizing timesheet:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
