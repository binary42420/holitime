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

    // Only managers can reject pending employees
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Manager/Admin users can reject employees." },
        { status: 403 }
      )
    }

    const { id: employeeId } = await params
    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    // Verify the employee exists and is pending
    const employeeCheck = await query(`
      SELECT id, name, created_by FROM users 
      WHERE id = $1 AND status = 'pending_activation' AND requires_approval = true
    `, [employeeId])

    if (employeeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Pending employee not found" },
        { status: 404 }
      )
    }

    const employee = employeeCheck.rows[0]

    // Check if employee has any shift assignments
    const assignmentCheck = await query(`
      SELECT COUNT(*) as assignment_count FROM assigned_personnel 
      WHERE employee_id = $1
    `, [employeeId])

    const assignmentCount = parseInt(assignmentCheck.rows[0].assignment_count)

    // Remove shift assignments if any exist
    if (assignmentCount > 0) {
      await query(`
        DELETE FROM assigned_personnel WHERE employee_id = $1
      `, [employeeId])
    }

    // Update user record with rejection details before deletion
    await query(`
      UPDATE users SET 
        status = 'inactive',
        rejected_by = $1,
        rejected_at = NOW(),
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [user.id, reason.trim(), employeeId])

    // Delete the user record
    await query(`
      DELETE FROM users WHERE id = $1
    `, [employeeId])

    // Log the rejection
    console.log(`Employee rejected: ${employee.name} (${employeeId}) by ${user.name} (${user.id}). Reason: ${reason}`)

    // TODO: Notify the creator about the rejection
    // This could be implemented with your notification system

    return NextResponse.json({
      success: true,
      message: `Employee ${employee.name} has been rejected and removed`,
      removedAssignments: assignmentCount
    })

  } catch (error) {
    console.error("Error rejecting employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
