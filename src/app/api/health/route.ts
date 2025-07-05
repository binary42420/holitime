import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/db"

export async function GET() {
  try {
    const dbHealthy = await checkDatabaseHealth()
    
    if (!dbHealthy) {
      return NextResponse.json(
        { status: "unhealthy", database: "disconnected" },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "Health check failed" },
      { status: 503 }
    )
  }
}
