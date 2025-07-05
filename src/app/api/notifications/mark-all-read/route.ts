import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

// POST /api/notifications/mark-all-read - Mark all notifications as read for current user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const result = await query(`
      UPDATE notifications
      SET is_read = true, updated_at = NOW()
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `, [user.id])

    return NextResponse.json({
      success: true,
      message: `Marked ${result.rows.length} notifications as read`,
      updatedCount: result.rows.length
    })

  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
