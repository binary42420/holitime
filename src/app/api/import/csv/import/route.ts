 import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'
import { CSVRow } from '../parse/route'

interface ImportSummary {
  clients: { created: number; updated: number }
  jobs: { created: number; updated: number }
  shifts: { created: number; updated: number }
  users: { created: number; updated: number }
  assignments: { created: number; updated: number }
  timeEntries: { created: number; updated: number }
  errors: Array<{ rowNumber: number; error: string }>
}

async function createOrUpdateClient(clientName: string, contactName?: string, contactPhone?: string) {
  // Check if client exists (clients are stored as users with role 'Client')
  const existingClient = await query(
    'SELECT id FROM users WHERE role = $1 AND (LOWER(company_name) = LOWER($2) OR LOWER(name) = LOWER($2))',
    ['Client', clientName]
  )

  if (existingClient.rows.length > 0) {
    const clientId = existingClient.rows[0].id

    // Update contact info if provided
    if (contactName || contactPhone) {
      await query(
        'UPDATE users SET contact_person = COALESCE($2, contact_person), contact_phone = COALESCE($3, contact_phone), updated_at = NOW() WHERE id = $1',
        [clientId, contactName || null, contactPhone || null]
      )
      return { id: clientId, created: false }
    }

    return { id: clientId, created: false }
  }

  // Create new client user
  const email = `${clientName.toLowerCase().replace(/\s+/g, '.')}@client.temp`
  const result = await query(
    'INSERT INTO users (name, email, password_hash, role, company_name, contact_person, contact_phone, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id',
    [clientName, email, 'temp_password_change_required', 'Client', clientName, contactName || null, contactPhone || null]
  )

  return { id: result.rows[0].id, created: true }
}

async function createOrUpdateJob(clientId: string, jobName: string, jobStartDate?: string) {
  // Check if job exists for this client
  const existingJob = await query(
    'SELECT id FROM jobs WHERE client_id = $1 AND LOWER(name) = LOWER($2)',
    [clientId, jobName]
  )

  if (existingJob.rows.length > 0) {
    return { id: existingJob.rows[0].id, created: false }
  }

  // Create new job
  const result = await query(
    'INSERT INTO jobs (client_id, name, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
    [clientId, jobName, jobStartDate ? `Start Date: ${jobStartDate}` : null]
  )

  return { id: result.rows[0].id, created: true }
}

async function createOrUpdateShift(jobId: string, shiftDate: string, startTime: string, endTime: string) {
  // Check if shift exists
  const existingShift = await query(
    'SELECT id FROM shifts WHERE job_id = $1 AND date = $2 AND start_time = $3',
    [jobId, shiftDate, startTime]
  )

  if (existingShift.rows.length > 0) {
    return { id: existingShift.rows[0].id, created: false }
  }

  // Create new shift
  const result = await query(
    'INSERT INTO shifts (job_id, date, start_time, end_time, status, requested_workers, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
    [jobId, shiftDate, startTime, endTime, 'Upcoming', 1]
  )

  return { id: result.rows[0].id, created: true }
}

async function createOrUpdateUser(employeeName: string, employeeEmail?: string, employeePhone?: string) {
  // Try to find existing user by email first, then by name
  let existingUser

  if (employeeEmail) {
    existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND role IN ($2, $3, $4)',
      [employeeEmail, 'Employee', 'Crew Chief', 'Manager/Admin']
    )
  }

  if (!existingUser?.rows.length) {
    existingUser = await query(
      'SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND role IN ($2, $3, $4)',
      [employeeName, 'Employee', 'Crew Chief', 'Manager/Admin']
    )
  }

  if (existingUser?.rows.length > 0) {
    const userId = existingUser.rows[0].id

    // Update user info if provided
    if (employeeEmail || employeePhone) {
      await query(
        'UPDATE users SET email = COALESCE($2, email), contact_phone = COALESCE($3, contact_phone), updated_at = NOW() WHERE id = $1',
        [userId, employeeEmail || null, employeePhone || null]
      )
      return { id: userId, created: false }
    }

    return { id: userId, created: false }
  }

  // Create new user
  const email = employeeEmail || `${employeeName.toLowerCase().replace(/\s+/g, '.')}@temp.local`
  const result = await query(
    'INSERT INTO users (name, email, password_hash, contact_phone, role, created_at, updated_at, is_active) VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), true) RETURNING id',
    [employeeName, email, 'temp_password_change_required', employeePhone || null, 'Employee']
  )

  return { id: result.rows[0].id, created: true }
}

async function createAssignment(shiftId: string, employeeId: string, workerType: string) {
  // Check if assignment already exists
  const existingAssignment = await query(
    'SELECT id FROM assigned_personnel WHERE shift_id = $1 AND employee_id = $2',
    [shiftId, employeeId]
  )

  if (existingAssignment.rows.length > 0) {
    return { id: existingAssignment.rows[0].id, created: false }
  }

  // Create new assignment
  const roleNames: Record<string, string> = {
    'CC': 'Crew Chief',
    'SH': 'Stage Hand',
    'FO': 'Fork Operator',
    'RFO': 'Rough Fork Operator',
    'RG': 'Rigger',
    'GL': 'General Laborer'
  }

  const result = await query(
    'INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id',
    [shiftId, employeeId, roleNames[workerType] || workerType, workerType, 'Clocked Out']
  )

  return { id: result.rows[0].id, created: true }
}

async function createTimeEntries(assignmentId: string, clockTimes: Array<{clockIn: string, clockOut: string}>, shiftDate: string) {
  let created = 0
  
  for (let i = 0; i < clockTimes.length; i++) {
    const { clockIn, clockOut } = clockTimes[i]
    if (!clockIn) continue

    // Check if time entry already exists for this entry number
    const existingEntry = await query(
      'SELECT id FROM time_entries WHERE assigned_personnel_id = $1 AND entry_number = $2',
      [assignmentId, i + 1]
    )

    if (existingEntry.rows.length > 0) continue

    // Create time entry - convert HH:MM to timestamp using shiftDate
    const clockInTimestamp = clockIn ? `${shiftDate}T${clockIn}:00` : null
    const clockOutTimestamp = clockOut ? `${shiftDate}T${clockOut}:00` : null

    await query(
      'INSERT INTO time_entries (assigned_personnel_id, entry_number, clock_in, clock_out, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [assignmentId, i + 1, clockInTimestamp, clockOutTimestamp, !clockOut]
    )
    
    created++
  }

  return created
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { data }: { data: CSVRow[] } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      )
    }

    console.log('CSV Import: Starting import process with', data.length, 'rows')

    const summary: ImportSummary = {
      clients: { created: 0, updated: 0 },
      jobs: { created: 0, updated: 0 },
      shifts: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      assignments: { created: 0, updated: 0 },
      timeEntries: { created: 0, updated: 0 },
      errors: []
    }

    // Process each row
    for (const row of data) {
      try {
        console.log(`CSV Import: Processing row ${row._rowNumber}:`, {
          client: row.client_name,
          job: row.job_name,
          employee: row.employee_name,
          shift_date: row.shift_date
        })

        // Skip rows with validation errors
        if (row._errors && row._errors.length > 0) {
          console.log(`CSV Import: Skipping row ${row._rowNumber} due to validation errors:`, row._errors)
          summary.errors.push({
            rowNumber: row._rowNumber,
            error: `Validation errors: ${row._errors.join(', ')}`
          })
          continue
        }

        // Create/update client
        console.log(`CSV Import: Creating/updating client: ${row.client_name}`)
        const clientResult = await createOrUpdateClient(
          row.client_name,
          row.contact_name,
          row.contact_phone
        )
        console.log(`CSV Import: Client result:`, clientResult)
        if (clientResult.created) summary.clients.created++
        else summary.clients.updated++

        // Create/update job
        const jobResult = await createOrUpdateJob(
          clientResult.id,
          row.job_name,
          row.job_start_date
        )
        if (jobResult.created) summary.jobs.created++
        else summary.jobs.updated++

        // Create/update shift
        const shiftResult = await createOrUpdateShift(
          jobResult.id,
          row.shift_date,
          row.shift_start_time,
          row.shift_end_time
        )
        if (shiftResult.created) summary.shifts.created++
        else summary.shifts.updated++

        // Create/update user
        const userResult = await createOrUpdateUser(
          row.employee_name,
          row.employee_email,
          row.employee_phone
        )
        if (userResult.created) summary.users.created++
        else summary.users.updated++

        // Create assignment
        const assignmentResult = await createAssignment(
          shiftResult.id,
          userResult.id,
          row.worker_type
        )
        if (assignmentResult.created) summary.assignments.created++
        else summary.assignments.updated++

        // Create time entries
        const clockTimes = [
          { clockIn: row.clock_in_1, clockOut: row.clock_out_1 },
          { clockIn: row.clock_in_2, clockOut: row.clock_out_2 },
          { clockIn: row.clock_in_3, clockOut: row.clock_out_3 }
        ].filter(entry => entry.clockIn)

        const timeEntriesCreated = await createTimeEntries(assignmentResult.id, clockTimes, row.shift_date)
        summary.timeEntries.created += timeEntriesCreated

      } catch (error) {
        console.error(`Error processing row ${row._rowNumber}:`, error)
        summary.errors.push({
          rowNumber: row._rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('CSV Import: Final summary:', summary)

    return NextResponse.json({
      success: true,
      summary
    })

  } catch (error) {
    console.error('Error importing CSV data:', error)
    return NextResponse.json(
      { error: 'Failed to import CSV data' },
      { status: 500 }
    )
  }
}
