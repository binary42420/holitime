import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has permission to create pending employees
    if (!['Manager/Admin', 'Crew Chief'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Manager/Admin and Crew Chief users can create pending employees.' },
        { status: 403 }
      )
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Employee name is required' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    // Check for duplicate pending accounts (case-insensitive)
    const duplicateCheck = await query(`
      SELECT id, name FROM users 
      WHERE LOWER(name) = LOWER($1) 
      AND status = 'pending_activation'
      AND requires_approval = true
    `, [trimmedName])

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `A pending employee account for "${trimmedName}" already exists` },
        { status: 409 }
      )
    }

    // Check for existing active users with the same name
    const existingUserCheck = await query(`
      SELECT id, name FROM users 
      WHERE LOWER(name) = LOWER($1) 
      AND status = 'active'
    `, [trimmedName])

    if (existingUserCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `An active employee named "${trimmedName}" already exists` },
        { status: 409 }
      )
    }

    // Generate temporary email and password
    const tempUuid = uuidv4()
    const tempEmail = `pending-${tempUuid}@temp.local`
    const tempPasswordHash = 'pending-activation-placeholder'

    // Create pending user account
    const result = await query(`
      INSERT INTO users (
        id, email, password_hash, name, role, status, 
        created_by, requires_approval, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, email, role, status, created_at
    `, [
      uuidv4(),
      tempEmail,
      tempPasswordHash,
      trimmedName,
      'Employee',
      'pending_activation',
      user.id,
      true
    ])

    const newUser = result.rows[0]

    // Log the creation
    console.log(`Pending employee created: ${trimmedName} by ${user.name} (${user.id})`)

    return NextResponse.json({
      success: true,
      employee: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        isPending: true,
        createdAt: newUser.created_at
      },
      message: `Pending employee account created for ${trimmedName}. Manager approval required.`
    })

  } catch (error) {
    console.error('Error creating pending employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
