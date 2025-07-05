import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { getAllJobs, createJob } from "@/lib/services/jobs"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can view all jobs
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const jobs = await getAllJobs()

    return NextResponse.json({
      success: true,
      jobs,
    })
  } catch (error) {
    console.error("Error getting jobs:", error)
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

    // Only managers can create jobs
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, clientId } = body

    if (!name || !clientId) {
      return NextResponse.json(
        { error: "Name and client ID are required" },
        { status: 400 }
      )
    }

    const job = await createJob({
      name,
      description,
      clientId,
    })

    if (!job) {
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error) {
    console.error("Error creating job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
