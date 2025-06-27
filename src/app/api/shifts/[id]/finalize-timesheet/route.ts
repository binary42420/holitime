import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params

    console.log(`Finalize timesheet request:`, { shiftId })

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

    // Update shift status to pending client approval
    await query(`
      UPDATE shifts 
      SET status = 'Pending Client Approval'
      WHERE id = $1
    `, [shiftId])

    return NextResponse.json({
      success: true,
      message: 'Timesheet finalized and set to pending client approval'
    })

  } catch (error) {
    console.error('Error finalizing timesheet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
