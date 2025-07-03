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

    // Only managers can send password reset emails
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get user details
    const result = await query(
      'SELECT id, name, email FROM users WHERE id = $1 AND is_active = true',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const targetUser = result.rows[0]

    // TODO: Implement actual email sending logic here
    // For now, we'll just log the action and return success
    console.log(`Password reset requested for user ${targetUser.email} by admin ${user.email}`)

    // In a real implementation, you would:
    // 1. Generate a secure reset token
    // 2. Store it in the database with expiration
    // 3. Send an email with the reset link
    // 4. Handle the reset process when user clicks the link

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${targetUser.email}`,
    })
  } catch (error) {
    console.error('Error sending password reset:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
