import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'
import { emailService } from '@/lib/email-service'

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

    // Only managers and crew chiefs can send shift confirmations
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { shiftId } = body

    // Get user details
    const userResult = await query(`
      SELECT id, name, email, role
      FROM users 
      WHERE id = $1
    `, [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Get shift details if specific shift provided, otherwise get next upcoming shift
    let shiftQuery = `
      SELECT 
        s.id,
        s.date,
        s.start_time,
        s.end_time,
        s.location,
        j.name as job_name,
        c.company_name as client_name,
        sa.role_on_shift
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE sa.user_id = $1 
      AND sa.status NOT IN ('Cancelled', 'No Show')
    `
    
    let queryParams = [userId]
    
    if (shiftId) {
      shiftQuery += ` AND s.id = $2`
      queryParams.push(shiftId)
    } else {
      shiftQuery += ` AND s.date >= CURRENT_DATE ORDER BY s.date, s.start_time LIMIT 1`
    }

    const shiftResult = await query(shiftQuery, queryParams)

    if (shiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: shiftId ? 'Shift assignment not found' : 'No upcoming shifts found for this user' },
        { status: 404 }
      )
    }

    const shift = shiftResult.rows[0]
    const template = emailService.getShiftConfirmationTemplate()

    const variables = {
      workerName: targetUser.name,
      jobName: shift.job_name,
      clientName: shift.client_name,
      shiftDate: new Date(shift.date).toLocaleDateString(),
      shiftTime: `${shift.start_time} - ${shift.end_time}`,
      location: shift.location,
      role: shift.role_on_shift
    }

    const emailSent = await emailService.sendEmail({
      to: [{ email: targetUser.email, name: targetUser.name }],
      template,
      variables
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      )
    }

    // Log the action
    console.log(`User ${user.email} sent shift confirmation request to ${targetUser.name} for shift ${shift.id}`)

    return NextResponse.json({
      success: true,
      message: `Shift confirmation email sent to ${targetUser.name}`,
      recipient: {
        name: targetUser.name,
        email: targetUser.email
      },
      shift: {
        id: shift.id,
        jobName: shift.job_name,
        date: shift.date,
        time: `${shift.start_time} - ${shift.end_time}`
      }
    })
  } catch (error) {
    console.error('Error sending shift confirmation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
