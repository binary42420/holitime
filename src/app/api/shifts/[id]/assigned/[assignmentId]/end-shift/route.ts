import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params

    console.log(`End shift request:`, { shiftId, assignmentId })



    // First, clock out any active time entries
    const activeEntryResult = await query(`
      SELECT id, entry_number, clock_in 
      FROM time_entries 
      WHERE assigned_personnel_id = $1 AND clock_out IS NULL
      ORDER BY entry_number DESC
      LIMIT 1
    `, [assignmentId])

    if (activeEntryResult.rows.length > 0) {
      // Clock out the active entry
      await query(`
        UPDATE time_entries 
        SET clock_out = NOW(), is_active = false
        WHERE id = $1
      `, [activeEntryResult.rows[0].id])
    }

    // Update assigned personnel status to Shift Ended
    await query(`
      UPDATE assigned_personnel 
      SET status = 'Shift Ended'
      WHERE id = $1
    `, [assignmentId])

    return NextResponse.json({
      success: true,
      message: 'Shift ended successfully'
    })

  } catch (error) {
    console.error('Error ending shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
