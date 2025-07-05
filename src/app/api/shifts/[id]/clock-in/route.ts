import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { withCrewChiefPermission } from "@/lib/utils/crew-chief-auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shiftId } = await params

  console.log(`Clock-in API called for shiftId: ${shiftId}`)

  return withCrewChiefPermission(shiftId, async (session, permissionCheck) => {
    try {
      const body = await request.json()
      const { workerId } = body

      console.log(`Clock-in request for workerId: ${workerId}`)

      if (!workerId) {
        return NextResponse.json(
          { error: "Worker ID is required" },
          { status: 400 }
        )
      }

      // Get the assigned personnel record
      const assignedPersonnelResult = await query(`
        SELECT id, employee_id FROM assigned_personnel
        WHERE id = $1 AND shift_id = $2
      `, [workerId, shiftId])

      if (assignedPersonnelResult.rows.length === 0) {
        console.log(`Worker not found on shift: workerId=${workerId}, shiftId=${shiftId}`)
        return NextResponse.json(
          { error: "Worker not found on this shift" },
          { status: 404 }
        )
      }

      const assignedPersonnel = assignedPersonnelResult.rows[0]

      // Find the next available entry number (1, 2, or 3)
      const existingEntriesResult = await query(`
      SELECT entry_number FROM time_entries 
      WHERE assigned_personnel_id = $1 
      ORDER BY entry_number ASC
    `, [workerId])

      let nextEntryNumber = 1
      const existingEntries = existingEntriesResult.rows.map(row => row.entry_number)
    
      // Find first available entry number
      for (let i = 1; i <= 3; i++) {
        if (!existingEntries.includes(i)) {
          nextEntryNumber = i
          break
        }
      }

      // Check if there's already an active entry
      const activeEntryResult = await query(`
      SELECT id FROM time_entries 
      WHERE assigned_personnel_id = $1 AND is_active = true
    `, [workerId])

      if (activeEntryResult.rows.length > 0) {
        console.log(`Employee already clocked in: workerId=${workerId}`)
        return NextResponse.json(
          { error: "Employee is already clocked in" },
          { status: 400 }
        )
      }

      // Create new time entry with clock in time
      const now = new Date().toISOString()
      await query(`
      INSERT INTO time_entries (assigned_personnel_id, entry_number, clock_in, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (assigned_personnel_id, entry_number) 
      DO UPDATE SET clock_in = $3, is_active = true
    `, [workerId, nextEntryNumber, now])

      // Update the status of the assigned personnel
      await query(`
      UPDATE assigned_personnel
      SET status = 'clocked_in'
      WHERE id = $1
    `, [workerId])

      return NextResponse.json({
        success: true,
        message: "Employee clocked in successfully",
      })
    } catch (error) {
      console.error("Error clocking in employee:", error)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      )
    }
  })
}
