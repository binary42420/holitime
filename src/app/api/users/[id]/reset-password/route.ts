import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers/admins can reset passwords
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { newPassword } = body

    if (!newPassword) {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Check if the target user exists
    const userResult = await query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Hash the new password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update the user's password
    await query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, id]
    )

    // Log the password reset action (optional - for audit trail)
    console.log(`Password reset by admin ${user.email} for user ${targetUser.email} (${targetUser.name})`)

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
