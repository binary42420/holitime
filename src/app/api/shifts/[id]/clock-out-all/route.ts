import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers and crew chiefs can clock out all workers
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: shiftId } = await params

    // Get all currently clocked-in workers for this shift
    const clockedInResult = await query(`
      SELECT sa.id, sa.user_id, u.name as user_name
      FROM shift_assignments sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.shift_id = $1 
      AND sa.status IN ('Clocked In', 'Working')
    `, [shiftId])

    if (clockedInResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No workers were clocked in',
        clockedOutCount: 0
      })
    }

    // Clock out all workers
    const clockOutTime = new Date().toISOString()
    
    await query(`
      UPDATE shift_assignments 
      SET 
        status = 'Clocked Out',
        clock_out_time = $1,
        updated_at = $1
      WHERE shift_id = $2 
      AND status IN ('Clocked In', 'Working')
    `, [clockOutTime, shiftId])

    // Log the action
    console.log(`User ${user.email} clocked out ${clockedInResult.rows.length} workers from shift ${shiftId}`)

    return NextResponse.json({
      success: true,
      message: `Successfully clocked out ${clockedInResult.rows.length} workers`,
      clockedOutCount: clockedInResult.rows.length,
      clockedOutWorkers: clockedInResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name
      }))
    })
  } catch (error) {
    console.error('Error clocking out all workers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
