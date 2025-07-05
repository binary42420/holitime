import { NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const testEmail = "test@example.com"
    
    // Try to get a user (this tests database connectivity)
    const existingUser = await getUserByEmail(testEmail)
    
    const result = {
      timestamp: new Date().toISOString(),
      databaseConnection: "SUCCESS",
      existingUserTest: existingUser ? "USER_FOUND" : "USER_NOT_FOUND",
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    }
    
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: "DATABASE_CONNECTION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error",
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    }, { status: 500 })
  }
}
