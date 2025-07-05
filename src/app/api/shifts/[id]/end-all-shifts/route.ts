import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params

    console.log("End all shifts request:", { shiftId })

    // Get all assigned personnel for this shift
    const assignedPersonnelResult = await query(`
      SELECT id, status
      FROM assigned_personnel 
      WHERE shift_id = $1 AND status != 'Shift Ended'
    `, [shiftId])

    if (assignedPersonnelResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active workers to end shifts for"
      })
    }

    // For each assigned personnel, clock out any active time entries and end their shift
    for (const personnel of assignedPersonnelResult.rows) {
      // Clock out any active time entries
      await query(`
        UPDATE time_entries 
        SET clock_out = NOW(), is_active = false
        WHERE assigned_personnel_id = $1 AND clock_out IS NULL
      `, [personnel.id])

      // Update status to shift ended
      await query(`
        UPDATE assigned_personnel 
        SET status = 'Shift Ended'
        WHERE id = $1
      `, [personnel.id])
    }

    return NextResponse.json({
      success: true,
      message: `Ended shifts for ${assignedPersonnelResult.rows.length} workers`
    })

  } catch (error) {
    console.error("Error ending all shifts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
