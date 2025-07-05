import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { getAllShifts, getShiftsByCrewChief, createShift } from "@/lib/services/shifts"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    let shiftsData

    // Filter shifts based on user role
    if (user.role === "Manager/Admin") {
      shiftsData = await getAllShifts()
    } else if (user.role === "Crew Chief") {
      const crewChiefShifts = await getShiftsByCrewChief(user.id)
      shiftsData = { shifts: crewChiefShifts, total: crewChiefShifts.length, pages: 1 }
    } else if (user.role === "Employee") {
      // For employees, get shifts where they are assigned
      const allShiftsData = await getAllShifts()
      // Filter to only shifts where the employee is assigned
      const filteredShifts = allShiftsData.shifts.filter((shift: any) =>
        shift.assignedPersonnel.some((person: any) => person.employee.id === user.id)
      )
      shiftsData = { shifts: filteredShifts, total: filteredShifts.length, pages: 1 }
    } else if (user.role === "Client") {
      // Get shifts for client's jobs
      const searchParams = new URL(request.url).searchParams
      const clientId = searchParams.get("clientId") || user.clientCompanyId

      if (clientId) {
        shiftsData = await getAllShifts({
          jobId: undefined,
          clientId: clientId
        })
      } else {
        shiftsData = { shifts: [], total: 0, pages: 0 }
      }
    } else {
      shiftsData = { shifts: [], total: 0, pages: 0 }
    }

    return NextResponse.json({
      success: true,
      shifts: shiftsData.shifts,
      total: shiftsData.total,
      pages: shiftsData.pages,
    })
  } catch (error) {
    console.error("Error getting shifts:", error)
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

    // Only managers can create shifts
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { jobId, date, startTime, endTime, location, crewChiefId, requestedWorkers, notes } = body

    if (!jobId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Job, date, start time, and end time are required" },
        { status: 400 }
      )
    }

    const shift = await createShift({
      jobId,
      date,
      startTime,
      endTime,
      location,
      crewChiefId,
      requestedWorkers: requestedWorkers || 1,
      notes,
    })

    if (!shift) {
      return NextResponse.json(
        { error: "Failed to create shift" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      shift,
    })
  } catch (error) {
    console.error("Error creating shift:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
