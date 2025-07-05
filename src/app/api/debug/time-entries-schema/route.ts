import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    // Get the table schema
    const schemaResult = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `)

    return NextResponse.json({
      success: true,
      schema: schemaResult.rows
    })

  } catch (error) {
    console.error("Error getting time_entries schema:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    )
  }
}
