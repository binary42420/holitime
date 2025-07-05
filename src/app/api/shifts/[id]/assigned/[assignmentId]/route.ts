import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: shiftId, assignmentId } = await params

    console.log(`DEBUG: Unassigning worker - shiftId: ${shiftId}, assignmentId: ${assignmentId} - NEW VERSION`)

    const pool = getPool()

    // First, let's see all assignments for this shift before deletion
    const allAssignments = await pool.query(
      "SELECT id, employee_id, role_on_shift, role_code FROM assigned_personnel WHERE shift_id = $1",
      [shiftId]
    )
    console.log("DEBUG: All assignments before deletion:", allAssignments.rows)

    // Check if the assignment exists and belongs to the shift
    const assignmentCheck = await pool.query(
      "SELECT id, employee_id FROM assigned_personnel WHERE id = $1 AND shift_id = $2",
      [assignmentId, shiftId]
    )

    console.log("DEBUG: Assignment check result:", assignmentCheck.rows)

    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    // Check if there are any time entries for this assignment
    const timeEntriesCheck = await pool.query(
      "SELECT COUNT(*) as count FROM time_entries WHERE assigned_personnel_id = $1",
      [assignmentId]
    )

    const hasTimeEntries = parseInt(timeEntriesCheck.rows[0].count) > 0
    console.log(`DEBUG: Has time entries: ${hasTimeEntries}`)

    if (hasTimeEntries) {
      // Check if the worker is currently clocked in
      const activeTimeEntry = await pool.query(
        "SELECT id FROM time_entries WHERE assigned_personnel_id = $1 AND clock_out IS NULL",
        [assignmentId]
      )

      if (activeTimeEntry.rows.length > 0) {
        return NextResponse.json(
          { error: "Cannot unassign worker who is currently clocked in. Please clock them out first." },
          { status: 400 }
        )
      }

      // If they have time entries but are not currently clocked in, allow unassignment
      // but warn that time entries will be preserved
      console.log("DEBUG: Worker has time entries but is not currently clocked in. Allowing unassignment.")
    }

    // Delete the assignment
    const deleteResult = await pool.query(
      "DELETE FROM assigned_personnel WHERE id = $1",
      [assignmentId]
    )

    console.log(`DEBUG: Delete result - rows affected: ${deleteResult.rowCount}`)

    // Check assignments after deletion
    const allAssignmentsAfter = await pool.query(
      "SELECT id, employee_id, role_on_shift, role_code FROM assigned_personnel WHERE shift_id = $1",
      [shiftId]
    )
    console.log("DEBUG: All assignments after deletion:", allAssignmentsAfter.rows)

    return NextResponse.json({
      success: true,
      message: "Worker unassigned successfully"
    })

  } catch (error) {
    console.error("Error unassigning worker from shift:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
