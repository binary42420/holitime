import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { getWorkerRequirements, updateWorkerRequirements } from "@/lib/services/worker-requirements"
import { getShiftById } from "@/lib/services/shifts"
import type { WorkerRequirement } from "@/lib/types"

export async function GET(
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

    const { id } = await params
    const workerRequirements = await getWorkerRequirements(id)

    return NextResponse.json({
      success: true,
      workerRequirements,
    })
  } catch (error) {
    console.error("Error getting worker requirements:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Only managers can edit worker requirements
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { workerRequirements } = body

    if (!Array.isArray(workerRequirements)) {
      return NextResponse.json(
        { error: "Invalid worker requirements format" },
        { status: 400 }
      )
    }

    const success = await updateWorkerRequirements(id, workerRequirements as WorkerRequirement[])

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update worker requirements" },
        { status: 500 }
      )
    }

    // Get updated shift data
    const shift = await getShiftById(id)

    return NextResponse.json({
      success: true,
      shift,
    })
  } catch (error) {
    console.error("Error updating worker requirements:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
