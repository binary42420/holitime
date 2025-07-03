import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers and crew chiefs can mark no-shows
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: shiftId, assignmentId } = await params

    // Get shift and assignment details
    const shiftResult = await query(`
      SELECT s.date, s.start_time, sa.user_id, u.name as user_name
      FROM shifts s
      JOIN shift_assignments sa ON s.id = sa.shift_id
      JOIN users u ON sa.user_id = u.id
      WHERE s.id = $1 AND sa.id = $2
    `, [shiftId, assignmentId])

    if (shiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      )
    }

    const assignment = shiftResult.rows[0]
    
    // Check if it's been at least 30 minutes since shift start
    const now = new Date()
    const shiftDate = new Date(assignment.date)
    const [hours, minutes] = assignment.start_time.split(':').map(Number)
    const shiftStart = new Date(shiftDate)
    shiftStart.setHours(hours, minutes, 0, 0)
    
    const timeDiffMinutes = (now.getTime() - shiftStart.getTime()) / (1000 * 60)
    
    if (timeDiffMinutes < 30) {
      return NextResponse.json(
        { 
          error: 'Cannot mark no-show within 30 minutes of shift start time',
          minutesRemaining: Math.ceil(30 - timeDiffMinutes)
        },
        { status: 400 }
      )
    }

    // Update assignment status to no-show
    const updateTime = new Date().toISOString()
    
    await query(`
      UPDATE shift_assignments 
      SET 
        status = 'No Show',
        updated_at = $1,
        notes = COALESCE(notes, '') || CASE 
          WHEN notes IS NULL OR notes = '' THEN 'Marked as no-show by ' || $2
          ELSE '; Marked as no-show by ' || $2
        END
      WHERE id = $3
    `, [updateTime, user.name, assignmentId])

    // Log the action
    console.log(`User ${user.email} marked ${assignment.user_name} as no-show for shift ${shiftId}`)

    return NextResponse.json({
      success: true,
      message: `${assignment.user_name} has been marked as no-show`,
      assignmentId,
      markedBy: user.name,
      markedAt: updateTime
    })
  } catch (error) {
    console.error('Error marking worker as no-show:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
