import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { getShiftById } from "@/lib/services/shifts"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get("company")
    const jobSlug = searchParams.get("job")
    const dateSlug = searchParams.get("date")
    const startTime = searchParams.get("startTime")
    const sequence = searchParams.get("sequence")

    if (!companySlug || !jobSlug || !dateSlug) {
      return NextResponse.json(
        { error: "Company, job, and date parameters are required" },
        { status: 400 }
      )
    }

    // Convert URL-friendly slugs back to searchable terms
    const companyName = decodeURIComponent(companySlug).replace(/-/g, " ")
    const jobName = decodeURIComponent(jobSlug).replace(/-/g, " ")
    const shiftDate = decodeURIComponent(dateSlug)
    const decodedStartTime = startTime ? decodeURIComponent(startTime) : null
    const sequenceNumber = sequence ? parseInt(sequence) : 1

    console.log("Looking for shift with:", {
      companyName,
      jobName,
      shiftDate,
      startTime: decodedStartTime,
      sequence: sequenceNumber,
      originalParams: { companySlug, jobSlug, dateSlug, startTime, sequence }
    })

    // Build query with more flexible matching
    let queryText = `
      SELECT s.id, u.name as client_name, u.company_name, j.name as job_name, s.date, s.start_time
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users u ON j.client_id = u.id AND u.role = 'Client'
      WHERE (
        LOWER(REPLACE(COALESCE(u.company_name, u.name), ' ', '-')) LIKE LOWER($1)
        OR LOWER(REPLACE(COALESCE(u.company_name, u.name), '.', '')) LIKE LOWER($2)
        OR LOWER(COALESCE(u.company_name, u.name)) LIKE LOWER($3)
      )
      AND (
        LOWER(REPLACE(j.name, ' ', '-')) LIKE LOWER($4)
        OR LOWER(REPLACE(j.name, '.', '')) LIKE LOWER($5)
        OR LOWER(j.name) LIKE LOWER($6)
      )
      AND s.date = $7
    `

    const queryParams = [
      `%${companyName.replace(/ /g, "-")}%`,  // slug format
      `%${companyName.replace(/\./g, "")}%`,  // no dots
      `%${companyName}%`,                     // original format
      `%${jobName.replace(/ /g, "-")}%`,      // slug format
      `%${jobName.replace(/\./g, "")}%`,      // no dots
      `%${jobName}%`,                         // original format
      shiftDate
    ]

    // Add start time filter if provided
    if (decodedStartTime) {
      queryText += ` AND s.start_time = $${queryParams.length + 1}`
      queryParams.push(decodedStartTime)
    }

    queryText += " ORDER BY s.start_time, s.created_at"

    // If we have a sequence number > 1, use OFFSET to get the nth shift
    if (sequenceNumber > 1) {
      queryText += ` OFFSET $${queryParams.length + 1}`
      queryParams.push((sequenceNumber - 1).toString())
    }

    queryText += " LIMIT 1"

    console.log("Executing query:", queryText)
    console.log("Query params:", queryParams)

    const result = await query(queryText, queryParams)

    console.log("Query result:", result.rows)

    if (result.rows.length === 0) {
      // Try a broader search without start time if no exact match found
      if (decodedStartTime) {
        console.log("No exact match found, trying without start time...")
        
        const broadQueryText = `
          SELECT s.id, u.name as client_name, u.company_name, j.name as job_name, s.date, s.start_time
          FROM shifts s
          JOIN jobs j ON s.job_id = j.id
          JOIN users u ON j.client_id = u.id AND u.role = 'Client'
          WHERE (
            LOWER(REPLACE(COALESCE(u.company_name, u.name), ' ', '-')) LIKE LOWER($1)
            OR LOWER(REPLACE(COALESCE(u.company_name, u.name), '.', '')) LIKE LOWER($2)
            OR LOWER(COALESCE(u.company_name, u.name)) LIKE LOWER($3)
          )
          AND (
            LOWER(REPLACE(j.name, ' ', '-')) LIKE LOWER($4)
            OR LOWER(REPLACE(j.name, '.', '')) LIKE LOWER($5)
            OR LOWER(j.name) LIKE LOWER($6)
          )
          AND s.date = $7
          ORDER BY s.start_time, s.created_at
          LIMIT 1
        `
        
        const broadParams = queryParams.slice(0, 7) // Remove start time param
        const broadResult = await query(broadQueryText, broadParams)
        
        if (broadResult.rows.length > 0) {
          const shiftId = broadResult.rows[0].id
          const shift = await getShiftById(shiftId)
          
          if (shift) {
            // Check if user has access to this shift
            const hasAccess = 
              user.role === "Manager/Admin" ||
              (user.role === "Crew Chief" && shift.crewChief?.id === user.id) ||
              (user.role === "Employee" && shift.assignedPersonnel.some(person => person.employee.id === user.id))

            if (hasAccess) {
              return NextResponse.json({
                success: true,
                shift,
              })
            }
          }
        }
      }
      
      return NextResponse.json(
        { 
          error: "Shift not found",
          debug: {
            searchedFor: {
              companyName,
              jobName,
              shiftDate,
              startTime: decodedStartTime,
              sequence: sequenceNumber
            }
          }
        },
        { status: 404 }
      )
    }

    const shiftId = result.rows[0].id
    const shift = await getShiftById(shiftId)

    if (!shift) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 }
      )
    }

    // Check if user has access to this shift
    const hasAccess = 
      user.role === "Manager/Admin" ||
      (user.role === "Crew Chief" && shift.crewChief?.id === user.id) ||
      (user.role === "Employee" && shift.assignedPersonnel.some(person => person.employee.id === user.id))

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      shift,
    })

  } catch (error) {
    console.error("Error getting shift by slug:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
