import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function GET(
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

    // Only managers can view user shift history
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get shifts where the user was assigned
    const result = await query(`
      SELECT DISTINCT
        s.id,
        s.date,
        s.start_time,
        s.end_time,
        s.location,
        s.status,
        s.notes,
        j.name as job_name,
        c.company_name as client_name
      FROM shifts s
      LEFT JOIN jobs j ON s.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      LEFT JOIN shift_assignments sa ON s.id = sa.shift_id
      WHERE sa.user_id = $1
      ORDER BY s.date DESC, s.start_time DESC
      LIMIT 50
    `, [id])

    const shifts = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location || '',
      status: row.status,
      notes: row.notes || '',
      jobName: row.job_name || 'Unknown Job',
      clientName: row.client_name || 'Unknown Client'
    }))

    return NextResponse.json({
      success: true,
      shifts,
    })
  } catch (error) {
    console.error('Error getting user shifts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
