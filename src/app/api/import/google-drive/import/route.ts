import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import type { ExtractedClient, ExtractedShift, SpreadsheetAnalysis } from "@/lib/services/gemini-ai"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers can import data
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { extractedData }: { extractedData: SpreadsheetAnalysis } = body

    if (!extractedData || !extractedData.sheets) {
      return NextResponse.json(
        { error: "Invalid extracted data" },
        { status: 400 }
      )
    }

    const importResults = {
      clients: { created: 0, updated: 0, errors: 0 },
      jobs: { created: 0, updated: 0, errors: 0 },
      shifts: { created: 0, updated: 0, errors: 0 },
      assignments: { created: 0, errors: 0 },
    }

    // Process each sheet
    for (const sheet of extractedData.sheets) {
      // Import clients first
      const clientIdMap = new Map<string, string>()
      
      for (const clientData of sheet.clients) {
        try {
          // Check if client already exists
          const existingClient = await query(`
            SELECT id FROM users 
            WHERE role = 'Client' AND (
              LOWER(name) = LOWER($1) OR 
              LOWER(company_name) = LOWER($2) OR
              LOWER(email) = LOWER($3)
            )
          `, [clientData.name, clientData.companyName || clientData.name, clientData.email || ""])

          let clientId: string

          if (existingClient.rows.length > 0) {
            // Update existing client
            clientId = existingClient.rows[0].id
            await query(`
              UPDATE users SET
                name = COALESCE($1, name),
                company_name = COALESCE($2, company_name),
                email = COALESCE($3, email),
                phone = COALESCE($4, phone),
                address = COALESCE($5, address),
                updated_at = NOW()
              WHERE id = $6
            `, [
              clientData.contactPerson || clientData.name,
              clientData.companyName || clientData.name,
              clientData.email,
              clientData.phone,
              clientData.address,
              clientId
            ])
            importResults.clients.updated++
          } else {
            // Create new client
            const newClient = await query(`
              INSERT INTO users (name, company_name, email, phone, address, role, password)
              VALUES ($1, $2, $3, $4, $5, 'Client', 'temp_password_change_required')
              RETURNING id
            `, [
              clientData.contactPerson || clientData.name,
              clientData.companyName || clientData.name,
              clientData.email || `${(clientData.companyName || clientData.name).toLowerCase().replace(/\s+/g, "")}@example.com`,
              clientData.phone,
              clientData.address
            ])
            clientId = newClient.rows[0].id
            importResults.clients.created++
          }

          clientIdMap.set(clientData.name.toLowerCase(), clientId)
          if (clientData.companyName) {
            clientIdMap.set(clientData.companyName.toLowerCase(), clientId)
          }
        } catch (error) {
          console.error("Error importing client:", error)
          importResults.clients.errors++
        }
      }

      // Import shifts and create jobs as needed
      const jobIdMap = new Map<string, string>()

      for (const shiftData of sheet.shifts) {
        try {
          // Find client ID
          const clientId = clientIdMap.get(shiftData.clientName.toLowerCase())
          if (!clientId) {
            console.warn(`Client not found for shift: ${shiftData.clientName}`)
            importResults.shifts.errors++
            continue
          }

          // Check if job exists or create it
          let jobId: string
          const jobKey = `${clientId}-${shiftData.jobName.toLowerCase()}`
          
          if (jobIdMap.has(jobKey)) {
            jobId = jobIdMap.get(jobKey)!
          } else {
            const existingJob = await query(`
              SELECT id FROM jobs 
              WHERE client_id = $1 AND LOWER(name) = LOWER($2)
            `, [clientId, shiftData.jobName])

            if (existingJob.rows.length > 0) {
              jobId = existingJob.rows[0].id
              importResults.jobs.updated++
            } else {
              const newJob = await query(`
                INSERT INTO jobs (name, description, client_id)
                VALUES ($1, $2, $3)
                RETURNING id
              `, [shiftData.jobName, `Imported job: ${shiftData.jobName}`, clientId])
              jobId = newJob.rows[0].id
              importResults.jobs.created++
            }
            
            jobIdMap.set(jobKey, jobId)
          }

          // Find crew chief if specified
          let crewChiefId: string | null = null
          if (shiftData.crewChiefName) {
            const crewChief = await query(`
              SELECT id FROM users 
              WHERE role IN ('Crew Chief', 'Manager/Admin') 
              AND LOWER(name) LIKE LOWER($1)
            `, [`%${shiftData.crewChiefName}%`])
            
            if (crewChief.rows.length > 0) {
              crewChiefId = crewChief.rows[0].id
            }
          }

          // Create shift
          const newShift = await query(`
            INSERT INTO shifts (
              job_id, date, start_time, end_time, location, 
              crew_chief_id, requested_workers, notes, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Upcoming')
            RETURNING id
          `, [
            jobId,
            shiftData.date,
            shiftData.startTime,
            shiftData.endTime,
            shiftData.location,
            crewChiefId,
            shiftData.requestedWorkers || 1,
            shiftData.notes
          ])

          const shiftId = newShift.rows[0].id
          importResults.shifts.created++

          // Assign personnel if specified
          if (shiftData.assignedPersonnel && shiftData.assignedPersonnel.length > 0) {
            for (const personnel of shiftData.assignedPersonnel) {
              try {
                // Find employee
                const employee = await query(`
                  SELECT id FROM users 
                  WHERE role IN ('Employee', 'Crew Chief') 
                  AND LOWER(name) LIKE LOWER($1)
                `, [`%${personnel.name}%`])

                if (employee.rows.length > 0) {
                  await query(`
                    INSERT INTO assigned_personnel (
                      shift_id, employee_id, role_on_shift, role_code, status
                    )
                    VALUES ($1, $2, $3, $4, 'Clocked Out')
                  `, [
                    shiftId,
                    employee.rows[0].id,
                    personnel.role,
                    personnel.roleCode || "SH"
                  ])
                  importResults.assignments.created++
                }
              } catch (error) {
                console.error("Error assigning personnel:", error)
                importResults.assignments.errors++
              }
            }
          }
        } catch (error) {
          console.error("Error importing shift:", error)
          importResults.shifts.errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data imported successfully",
      results: importResults,
    })
  } catch (error) {
    console.error("Error importing data:", error)
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    )
  }
}
