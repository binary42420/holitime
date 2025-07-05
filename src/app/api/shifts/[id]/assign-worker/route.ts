import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { withCrewChiefPermission } from "@/lib/utils/crew-chief-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shiftId } = await params

  return withCrewChiefPermission(shiftId, async (session, permissionCheck) => {
    try {
      const body = await request.json()
      const { assignmentId, employeeId } = body

      if (!assignmentId || !employeeId) {
        return NextResponse.json(
          { error: "Assignment ID and Employee ID are required" },
          { status: 400 }
        )
      }

      // Check if the assignment exists and belongs to the shift
      const assignmentResult = await query(
        "SELECT id FROM assigned_personnel WHERE id = $1 AND shift_id = $2",
        [assignmentId, shiftId]
      )

      if (assignmentResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Assignment not found for this shift" },
          { status: 404 }
        )
      }

      // Update the assigned_personnel record with the new employee_id
      await query(
        "UPDATE assigned_personnel SET employee_id = $1, status = 'Clocked Out' WHERE id = $2",
        [employeeId, assignmentId]
      )

      return NextResponse.json({
        success: true,
        message: "Worker assigned to shift successfully",
      })
    } catch (error) {
      console.error("Error assigning worker to shift:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  })
}
