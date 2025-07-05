import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can view all employees
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const result = await query(`
      SELECT id, name, email, role, avatar, created_at, updated_at
      FROM users
      ORDER BY name ASC
    `)

    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error("Error getting employees:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can create employees
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, role, password, avatar } = body

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: "Name, email, role, and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Store password directly (no hashing)

    // Create user
    const result = await query(`
      INSERT INTO users (name, email, role, password_hash, avatar)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, avatar, created_at
    `, [name, email, role, password, avatar || ""])

    const newUser = result.rows[0]

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        createdAt: newUser.created_at,
      },
    })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
