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
      // Get all assigned personnel with active time entries (currently clocked in)
      const activeWorkersResult = await query(`
        SELECT
          ap.id as assignment_id,
          ap.employee_id,
          u.name as employee_name,
          te.id as time_entry_id
        FROM assigned_personnel ap
        JOIN users u ON ap.employee_id = u.id
        JOIN time_entries te ON ap.id = te.assigned_personnel_id
        WHERE ap.shift_id = $1
        AND te.clock_out IS NULL
        AND ap.status = 'Clocked In'
      `, [shiftId])

      if (activeWorkersResult.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No workers are currently clocked in',
          clockedOutCount: 0
        })
      }

      const clockOutTime = new Date()

      // Clock out all active time entries
      for (const worker of activeWorkersResult.rows) {
        // Update the time entry with clock out time
        await query(`
          UPDATE time_entries
          SET clock_out = $1
          WHERE id = $2
        `, [clockOutTime, worker.time_entry_id])

        // Update assigned personnel status to clocked out
        await query(`
          UPDATE assigned_personnel
          SET status = 'Clocked Out'
          WHERE id = $1
        `, [worker.assignment_id])
      }

      console.log(`User ${session.user.email} clocked out ${activeWorkersResult.rows.length} workers from shift ${shiftId}`)

      return NextResponse.json({
        success: true,
        message: `Successfully clocked out ${activeWorkersResult.rows.length} workers`,
        clockedOutCount: activeWorkersResult.rows.length,
        clockedOutWorkers: activeWorkersResult.rows.map(row => ({
          assignmentId: row.assignment_id,
          employeeId: row.employee_id,
          employeeName: row.employee_name
        }))
      })

    } catch (error) {
      console.error('Error clocking out all workers:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}
