import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { notificationService } from '@/lib/notification-service'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins and crew chiefs can assign shifts
    if (user.role !== 'Manager/Admin' && user.role !== 'Crew Chief') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const {
      user_id,
      shift_id,
      shift_details,
      response_deadline,
      auto_accept_after,
      assignment_type = 'direct'
    } = await request.json()

    // Validate required fields
    if (!user_id || !shift_id || !shift_details) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user details
    const userQuery = 'SELECT name, email FROM users WHERE id = $1'
    const userResult = await query(userQuery, [user_id])
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Create shift assignment notification
    const { notification, confirmationToken } = await notificationService.createShiftAssignmentNotification(
      user_id,
      {
        shift_id,
        assigned_by: user.id,
        assignment_type,
        response_deadline: response_deadline ? new Date(response_deadline) : undefined,
        auto_accept_after: auto_accept_after ? new Date(auto_accept_after) : undefined,
        requires_confirmation: true
      },
      {
        ...shift_details,
        workerName: targetUser.name,
        responseDeadline: response_deadline
      }
    )

    if (!notification) {
      return NextResponse.json(
        { error: 'Failed to create shift assignment notification' },
        { status: 500 }
      )
    }

    // Create or update shift assignment record
    const assignmentQuery = `
      INSERT INTO shift_assignments (shift_id, user_id, assigned_by, status, assigned_at)
      VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)
      ON CONFLICT (shift_id, user_id) 
      DO UPDATE SET 
        assigned_by = $3,
        status = 'pending',
        assigned_at = CURRENT_TIMESTAMP
    `

    await query(assignmentQuery, [shift_id, user_id, user.id])

    return NextResponse.json({
      success: true,
      notification,
      confirmation_token: confirmationToken,
      message: `Shift assigned to ${targetUser.name}. Notification sent via email.`
    })
  } catch (error) {
    console.error('Error creating shift assignment notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
