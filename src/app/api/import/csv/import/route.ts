import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/middleware';
import { CSVRow } from '../parse/route';

interface ImportSummary {
  clients: { created: number; updated: number };
  jobs: { created: number; updated: number };
  shifts: { created: number; updated: number };
  users: { created: number; updated: number };
  assignments: { created: number; updated: number };
  timeEntries: { created: number; updated: number };
  errors: Array<{ rowNumber: number; error: string; rowData: CSVRow }>;
}

// --- NEW TRANSACTION-AWARE HELPER FUNCTIONS ---

async function createOrUpdateClient(client, row: CSVRow) {
  const { client_name, contact_name, contact_phone, contact_email } = row;

  // 1. Find or create the Client Company
  let companyRes = await client.query(
    'SELECT id FROM clients WHERE LOWER(company_name) = LOWER($1)',
    [client_name]
  );
  let companyId;
  let clientCompanyCreated = false;

  if (companyRes.rows.length > 0) {
    companyId = companyRes.rows[0].id;
  } else {
    const newCompanyRes = await client.query(
      'INSERT INTO clients (company_name, contact_phone, contact_email) VALUES ($1, $2, $3) RETURNING id',
      [client_name, contact_phone, contact_email]
    );
    companyId = newCompanyRes.rows[0].id;
    clientCompanyCreated = true;
  }

  // 2. Find or create the Client Contact User
  const contactEmail = contact_email || `${client_name.toLowerCase().replace(/\s+/g, '.')}@client.temp`;
  let userRes = await client.query(
    "SELECT id FROM users WHERE role = 'Client' AND (LOWER(email) = LOWER($1) OR (LOWER(name) = LOWER($2) AND client_company_id = $3))",
    [contactEmail, contact_name || client_name, companyId]
  );
  let userId;
  let clientUserCreated = false;

  if (userRes.rows.length > 0) {
    userId = userRes.rows[0].id;
    // Optionally update user details
    await client.query(
        `UPDATE users SET name = $1, client_company_id = $2, updated_at = NOW() WHERE id = $3`,
        [contact_name || client_name, companyId, userId]
    );
  } else {
    const newUserRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, client_company_id, is_active)
       VALUES ($1, $2, $3, 'Client', $4, true) RETURNING id`,
      [contact_name || client_name, contactEmail, 'temp_password_change_required', companyId]
    );
    userId = newUserRes.rows[0].id;
    clientUserCreated = true;
  }

  return { companyId, userId, created: clientCompanyCreated || clientUserCreated };
}

async function createOrUpdateJob(client, companyId: string, row: CSVRow) {
    const { job_name, job_start_date } = row;
    const existingJob = await client.query(
        'SELECT id FROM jobs WHERE client_id = $1 AND LOWER(name) = LOWER($2)',
        [companyId, job_name]
    );

    if (existingJob.rows.length > 0) {
        return { id: existingJob.rows[0].id, created: false };
    }

    const result = await client.query(
        'INSERT INTO jobs (client_id, name, description) VALUES ($1, $2, $3) RETURNING id',
        [companyId, job_name, job_start_date ? `Start Date: ${job_start_date}` : null]
    );
    return { id: result.rows[0].id, created: true };
}

async function createOrUpdateShift(client, jobId: string, row: CSVRow) {
    const { shift_date, shift_start_time, shift_end_time, crew_chief_name } = row;
    
    // Find crew chief user ID
    const crewChiefUser = await client.query(
        "SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND role IN ('Crew Chief', 'Manager/Admin')",
        [crew_chief_name]
    );

    if (crewChiefUser.rows.length === 0) {
        throw new Error(`Crew Chief '${crew_chief_name}' not found.`);
    }
    const crewChiefId = crewChiefUser.rows[0].id;

    const existingShift = await client.query(
        'SELECT id FROM shifts WHERE job_id = $1 AND date = $2 AND start_time = $3',
        [jobId, shift_date, shift_start_time]
    );

    if (existingShift.rows.length > 0) {
        return { id: existingShift.rows[0].id, created: false };
    }

    const result = await client.query(
        'INSERT INTO shifts (job_id, date, start_time, end_time, status, requested_workers, crew_chief_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [jobId, shift_date, shift_start_time, shift_end_time, 'Upcoming', 1, crewChiefId]
    );
    return { id: result.rows[0].id, created: true };
}

async function createOrUpdateUser(client, row: CSVRow) {
    const { employee_name, employee_email, employee_phone, worker_type } = row;
    const email = employee_email || `${employee_name.toLowerCase().replace(/\s+/g, '.')}@temp.local`;

    let existingUser = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND role <> 'Client'",
        [email]
    );

    if (existingUser.rows.length === 0) {
        existingUser = await client.query(
            "SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND role <> 'Client'",
            [employee_name]
        );
    }

    if (existingUser.rows.length > 0) {
        const userId = existingUser.rows[0].id;
        // Optionally update details
        await client.query(
            'UPDATE users SET contact_phone = COALESCE($2, contact_phone) WHERE id = $1',
            [userId, employee_phone]
        );
        return { id: userId, created: false };
    }

    const isCrewChief = worker_type === 'CC';
    const isForkOperator = worker_type === 'FO' || worker_type === 'RFO';
    
    const result = await client.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, crew_chief_eligible, fork_operator_eligible)
         VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING id`,
        [employee_name, email, 'temp_password_change_required', isCrewChief ? 'Crew Chief' : 'Employee', isCrewChief, isForkOperator]
    );
    return { id: result.rows[0].id, created: true };
}

async function createAssignment(client, shiftId: string, employeeId: string, row: CSVRow) {
    const { worker_type } = row;
    const existingAssignment = await client.query(
        'SELECT id FROM assigned_personnel WHERE shift_id = $1 AND employee_id = $2',
        [shiftId, employeeId]
    );

    if (existingAssignment.rows.length > 0) {
        return { id: existingAssignment.rows[0].id, created: false };
    }

    const roleNames = {
        'CC': 'Crew Chief', 'SH': 'Stage Hand', 'FO': 'Fork Operator',
        'RFO': 'Rough Fork Operator', 'RG': 'Rigger', 'GL': 'General Laborer'
    };

    const result = await client.query(
        'INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [shiftId, employeeId, roleNames[worker_type] || worker_type, worker_type, 'Clocked Out']
    );
    return { id: result.rows[0].id, created: true };
}

async function createTimeEntries(client, assignmentId: string, row: CSVRow) {
    const clockTimes = [
        { clockIn: row.clock_in_1, clockOut: row.clock_out_1 },
        { clockIn: row.clock_in_2, clockOut: row.clock_out_2 },
        { clockIn: row.clock_in_3, clockOut: row.clock_out_3 }
    ].filter(entry => entry.clockIn);

    let createdCount = 0;
    for (let i = 0; i < clockTimes.length; i++) {
        const { clockIn, clockOut } = clockTimes[i];
        const clockInTimestamp = clockIn ? `${row.shift_date} ${clockIn}` : null;
        const clockOutTimestamp = clockOut ? `${row.shift_date} ${clockOut}` : null;

        await client.query(
            'INSERT INTO time_entries (assigned_personnel_id, entry_number, clock_in, clock_out, is_active) VALUES ($1, $2, $3, $4, $5)',
            [assignmentId, i + 1, clockInTimestamp, clockOutTimestamp, !!clockIn && !clockOut]
        );
        createdCount++;
    }
    return createdCount;
}


export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data }: { data: CSVRow[] } = await request.json();
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }

    const summary: ImportSummary = {
      clients: { created: 0, updated: 0 },
      jobs: { created: 0, updated: 0 },
      shifts: { created: 0, updated: 0 },
      users: { created: 0, updated: 0 },
      assignments: { created: 0, updated: 0 },
      timeEntries: { created: 0, updated: 0 },
      errors: [],
    };

    for (const row of data) {
      if (row._errors && row._errors.length > 0) {
        summary.errors.push({ rowNumber: row._rowNumber, error: `Validation errors: ${row._errors.join(', ')}`, rowData: row });
        continue;
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        const clientResult = await createOrUpdateClient(client, row);
        if (clientResult.created) summary.clients.created++; else summary.clients.updated++;

        const jobResult = await createOrUpdateJob(client, clientResult.companyId, row);
        if (jobResult.created) summary.jobs.created++; else summary.jobs.updated++;

        const shiftResult = await createOrUpdateShift(client, jobResult.id, row);
        if (shiftResult.created) summary.shifts.created++; else summary.shifts.updated++;

        const userResult = await createOrUpdateUser(client, row);
        if (userResult.created) summary.users.created++; else summary.users.updated++;

        const assignmentResult = await createAssignment(client, shiftResult.id, userResult.id, row);
        if (assignmentResult.created) summary.assignments.created++; else summary.assignments.updated++;

        const timeEntriesCreated = await createTimeEntries(client, assignmentResult.id, row);
        summary.timeEntries.created += timeEntriesCreated;

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        const error = e as Error;
        console.error(`Error processing row ${row._rowNumber}:`, error.message);
        summary.errors.push({ rowNumber: row._rowNumber, error: error.message, rowData: row });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error importing CSV data:', error);
    return NextResponse.json({ error: 'Failed to import CSV data' }, { status: 500 });
  }
}
