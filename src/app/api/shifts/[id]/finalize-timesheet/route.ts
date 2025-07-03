import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withCrewChiefPermission } from '@/lib/utils/crew-chief-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shiftId } = await params

  return withCrewChiefPermission(shiftId, async (session, permissionCheck) => {
    try {
      console.log(`Finalize timesheet request (UPDATED):`, { shiftId, userId: session.user.id })

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

    let timesheetId;

    if (existingTimesheetResult.rows.length > 0) {
      // Update existing timesheet
      timesheetId = existingTimesheetResult.rows[0].id
      await query(`
        UPDATE timesheets
        SET status = 'pending_client_approval',
            submitted_by = $1,
            submitted_at = NOW()
        WHERE id = $2
      `, [session.user.id, timesheetId])
    } else {
      // Create new timesheet
      const newTimesheetResult = await query(`
        INSERT INTO timesheets (shift_id, status, submitted_by, submitted_at)
        VALUES ($1, 'pending_client_approval', $2, NOW())
        RETURNING id
      `, [shiftId, session.user.id])
      timesheetId = newTimesheetResult.rows[0].id
    }

    // Update shift status to completed (shift is completed even if timesheet is pending approval)
    await query(`
      UPDATE shifts
      SET status = 'Completed'
      WHERE id = $1
    `, [shiftId])

    return NextResponse.json({
      success: true,
        message: 'Timesheet finalized and submitted for client approval',
        timesheetId
      })

    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  });
}
