import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params
    const body = await request.json()
    const { employeeId } = body

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get the current shift's date and time
    const currentShiftResult = await query(`
      SELECT date, start_time, end_time
      FROM shifts
      WHERE id = $1
    `, [shiftId])

    if (currentShiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    const currentShift = currentShiftResult.rows[0]
    const shiftDate = currentShift.date
    const startTime = currentShift.start_time
    const endTime = currentShift.end_time

    // Check for conflicting assignments on the same date (simplified - no client info needed)
    const conflictResult = await query(`
      SELECT
        s.id as shift_id,
        s.start_time,
        s.end_time,
        ap.role_on_shift
      FROM assigned_personnel ap
      JOIN shifts s ON ap.shift_id = s.id
      WHERE ap.employee_id = $1
        AND s.date = $2
        AND s.id != $3
        AND (
          -- Check for time overlap
          (s.start_time < $5 AND s.end_time > $4) OR
          (s.start_time >= $4 AND s.start_time < $5) OR
          (s.end_time > $4 AND s.end_time <= $5)
        )
    `, [employeeId, shiftDate, shiftId, startTime, endTime])

    const conflicts = conflictResult.rows.map(row => ({
      shiftId: row.shift_id,
      startTime: row.start_time,
      endTime: row.end_time,
      jobName: row.job_name,
      clientName: row.client_name,
      roleOnShift: row.role_on_shift
    }))

    return NextResponse.json({
      success: true,
      hasConflicts: conflicts.length > 0,
      conflicts
    })

  } catch (error) {
    console.error('Error checking time conflicts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
