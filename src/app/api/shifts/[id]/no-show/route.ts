import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"

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

    const { id: shiftId } = await params
    const { workerId } = await request.json()

    if (!workerId) {
      return NextResponse.json(
        { error: "Worker ID is required" },
        { status: 400 }
      )
    }

    // Check if user has permission to manage this shift
    if (user.role !== "Manager/Admin") {
      // Check if user is a crew chief for this shift
      const crewChiefCheck = await query(`
        SELECT 1 FROM job_authorizations ja
        JOIN jobs j ON ja.job_id = j.id
        JOIN shifts s ON s.job_id = j.id
        WHERE s.id = $1 AND ja.crew_chief_id = $2
      `, [shiftId, user.id])

      if (crewChiefCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        )
      }
    }

    // Get the assigned personnel record (workerId is the assigned_personnel.id)
    const assignmentCheck = await query(`
      SELECT id, employee_id, status FROM assigned_personnel
      WHERE id = $1 AND shift_id = $2
    `, [workerId, shiftId])

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Worker assignment not found" },
        { status: 404 }
      )
    }

    const assignment = assignmentCheck.rows[0]

    // Check if worker has already started (has time entries)
    const timeEntriesCheck = await query(`
      SELECT id FROM time_entries
      WHERE assigned_personnel_id = $1
    `, [assignment.id])

    if (timeEntriesCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Cannot mark as no-show - worker has already clocked in" },
        { status: 400 }
      )
    }

    // Update the assigned personnel status to indicate no-show
    await query(`
      UPDATE assigned_personnel
      SET status = 'no_show', updated_at = NOW()
      WHERE id = $1
    `, [assignment.id])

    // Log the action
    await query(`
      INSERT INTO shift_logs (shift_id, user_id, action, details, created_at)
      VALUES ($1, $2, 'no_show_marked', $3, NOW())
    `, [
      shiftId,
      user.id,
      JSON.stringify({
        employeeId: assignment.employee_id,
        assignmentId: assignment.id,
        markedBy: user.name
      })
    ])

    return NextResponse.json({
      success: true,
      message: "Worker marked as no-show"
    })

  } catch (error) {
    console.error("Error marking no-show:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
