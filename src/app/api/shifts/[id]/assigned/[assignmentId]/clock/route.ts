import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params
    const body = await request.json()
    const { action } = body

    console.log(`Clock ${action} request - FIXED:`, { shiftId, assignmentId, action })

    if (!action || !['clock_in', 'clock_out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be clock_in or clock_out' },
        { status: 400 }
      )
    }



    if (action === 'clock_in') {
      // Check if there's already an active time entry
      const activeEntryCheck = await query(`
        SELECT id FROM time_entries 
        WHERE assigned_personnel_id = $1 AND clock_out IS NULL
        ORDER BY entry_number DESC
        LIMIT 1
      `, [assignmentId])

      if (activeEntryCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Worker is already clocked in' },
          { status: 400 }
        )
      }

      // Get the next entry number for this assignment
      const entryNumberResult = await query(`
        SELECT COALESCE(MAX(entry_number), 0) + 1 as next_entry_number
        FROM time_entries 
        WHERE assigned_personnel_id = $1
      `, [assignmentId])

      const nextEntryNumber = entryNumberResult.rows[0].next_entry_number

      // Create new time entry with clock in
      const result = await query(`
        INSERT INTO time_entries (assigned_personnel_id, entry_number, clock_in)
        VALUES ($1, $2, NOW())
        RETURNING id, clock_in
      `, [assignmentId, nextEntryNumber])

      // Update assigned personnel status
      await query(`
        UPDATE assigned_personnel 
        SET status = 'Clocked In'
        WHERE id = $1
      `, [assignmentId])

      return NextResponse.json({
        success: true,
        timeEntry: {
          id: result.rows[0].id,
          entryNumber: nextEntryNumber,
          clockIn: result.rows[0].clock_in,
          isActive: true
        }
      })

    } else if (action === 'clock_out') {
      // Find the active time entry
      const activeEntryResult = await query(`
        SELECT id, entry_number, clock_in 
        FROM time_entries 
        WHERE assigned_personnel_id = $1 AND clock_out IS NULL
        ORDER BY entry_number DESC
        LIMIT 1
      `, [assignmentId])

      if (activeEntryResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No active time entry found to clock out' },
          { status: 400 }
        )
      }

      const activeEntry = activeEntryResult.rows[0]

      // Update the time entry with clock out
      const result = await query(`
        UPDATE time_entries
        SET clock_out = NOW()
        WHERE id = $1
        RETURNING clock_out
      `, [activeEntry.id])

      // Update assigned personnel status
      await query(`
        UPDATE assigned_personnel 
        SET status = 'Clocked Out'
        WHERE id = $1
      `, [assignmentId])

      return NextResponse.json({
        success: true,
        timeEntry: {
          id: activeEntry.id,
          entryNumber: activeEntry.entry_number,
          clockIn: activeEntry.clock_in,
          clockOut: result.rows[0].clock_out,
          isActive: false
        }
      })
    }

  } catch (error) {
    console.error('Error processing clock action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
