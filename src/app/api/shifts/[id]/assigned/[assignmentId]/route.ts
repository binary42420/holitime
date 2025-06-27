import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params

    const pool = getPool()

    // Check if the assignment exists and belongs to the shift
    const assignmentCheck = await pool.query(
      'SELECT id, employee_id FROM assigned_personnel WHERE id = $1 AND shift_id = $2',
      [assignmentId, shiftId]
    )

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Check if there are any time entries for this assignment
    const timeEntriesCheck = await pool.query(
      'SELECT COUNT(*) as count FROM time_entries WHERE assigned_personnel_id = $1',
      [assignmentId]
    )

    const hasTimeEntries = parseInt(timeEntriesCheck.rows[0].count) > 0

    if (hasTimeEntries) {
      // If there are time entries, we should not delete the assignment
      // Instead, we could mark it as inactive or handle it differently
      return NextResponse.json(
        { error: 'Cannot unassign worker with existing time entries. Please end their shift first.' },
        { status: 400 }
      )
    }

    // Delete the assignment
    await pool.query(
      'DELETE FROM assigned_personnel WHERE id = $1',
      [assignmentId]
    )

    return NextResponse.json({
      success: true,
      message: 'Worker unassigned successfully'
    })

  } catch (error) {
    console.error('Error unassigning worker from shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
