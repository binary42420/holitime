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

    const result = await query(`
      SELECT a.id, a.title, a.content, a.date, u.name as created_by_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      ORDER BY a.date DESC, a.created_at DESC
      LIMIT 10
    `)

    const announcements = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      date: row.date,
      createdBy: row.created_by_name,
    }))

    return NextResponse.json({
      success: true,
      announcements,
    })
  } catch (error) {
    console.error("Error getting announcements:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
