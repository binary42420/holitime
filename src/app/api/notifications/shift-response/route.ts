import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { notificationService } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const response = searchParams.get('response') as 'accept' | 'decline'

    if (!token || !response) {
      return NextResponse.json(
        { error: 'Missing token or response' },
        { status: 400 }
      )
    }

    // Find the shift assignment notification by token
    const tokenQuery = `
      SELECT 
        san.notification_id,
        san.shift_id,
        n.user_id,
        n.title,
        n.data,
        u.name as user_name,
        u.email as user_email
      FROM shift_assignment_notifications san
      JOIN notifications n ON san.notification_id = n.id
      JOIN users u ON n.user_id = u.id
      WHERE san.confirmation_token = $1
      AND n.expires_at > CURRENT_TIMESTAMP
    `

    const result = await query(tokenQuery, [token])

    if (result.rows.length === 0) {
      return NextResponse.redirect(
        new URL('/notifications/expired', request.url)
      )
    }

    const assignment = result.rows[0]

    // Check if already responded
    const responseQuery = `
      SELECT id FROM notification_responses 
      WHERE notification_id = $1 AND user_id = $2
    `
    const responseResult = await query(responseQuery, [assignment.notification_id, assignment.user_id])

    if (responseResult.rows.length > 0) {
      return NextResponse.redirect(
        new URL('/notifications/already-responded', request.url)
      )
    }

    // Record the response
    const success = await notificationService.respondToNotification(
      assignment.notification_id,
      assignment.user_id,
      response,
      `Response via email link`,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record response' },
        { status: 500 }
      )
    }

    // Redirect to confirmation page
    const redirectUrl = new URL('/notifications/response-confirmed', request.url)
    redirectUrl.searchParams.set('response', response)
    redirectUrl.searchParams.set('shift_title', assignment.title)
    
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error processing shift response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      token,
      response,
      message
    } = await request.json()

    if (!token || !response) {
      return NextResponse.json(
        { error: 'Missing token or response' },
        { status: 400 }
      )
    }

    // Find the shift assignment notification by token
    const tokenQuery = `
      SELECT 
        san.notification_id,
        san.shift_id,
        n.user_id,
        n.title,
        n.data
      FROM shift_assignment_notifications san
      JOIN notifications n ON san.notification_id = n.id
      WHERE san.confirmation_token = $1
      AND n.expires_at > CURRENT_TIMESTAMP
    `

    const result = await query(tokenQuery, [token])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    const assignment = result.rows[0]

    // Check if already responded
    const responseQuery = `
      SELECT id FROM notification_responses 
      WHERE notification_id = $1 AND user_id = $2
    `
    const responseResult = await query(responseQuery, [assignment.notification_id, assignment.user_id])

    if (responseResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Already responded to this notification' },
        { status: 400 }
      )
    }

    // Record the response
    const success = await notificationService.respondToNotification(
      assignment.notification_id,
      assignment.user_id,
      response,
      message,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to record response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Response recorded successfully`
    })
  } catch (error) {
    console.error('Error processing shift response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
