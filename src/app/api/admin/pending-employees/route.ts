import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers can access pending employees
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Manager/Admin users can view pending employees.' },
        { status: 403 }
      )
    }

    // Fetch pending employees using the view
    const result = await query(`
      SELECT * FROM pending_employees
      ORDER BY created_at DESC
    `)

    return NextResponse.json({
      success: true,
      pendingEmployees: result.rows
    })

  } catch (error) {
    console.error('Error fetching pending employees:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
