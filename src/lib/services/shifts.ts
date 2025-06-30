import { query } from '../db';
import type { Shift, AssignedPersonnel, TimesheetStatus } from '../types';
import { getWorkerRequirements } from './worker-requirements';

export async function getTodaysShifts(): Promise<Shift[]> {
  try {
    // First, try to add the column if it doesn't exist
    try {
      await query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS requested_workers INTEGER DEFAULT 1;`);
      await query(`UPDATE shifts SET requested_workers = 1 WHERE requested_workers IS NULL;`);
    } catch (error) {
      console.log('Column may already exist or permission issue:', error instanceof Error ? error.message : 'Unknown error');
    }

    const result = await query(`
      WITH shift_personnel AS (
        SELECT
          ap.shift_id,
          json_agg(
            json_build_object(
              'employee', json_build_object(
                'id', u.id,
                'name', u.name,
                'certifications', u.certifications,
                'performance', u.performance,
                'location', u.location,
                'avatar', u.avatar
              ),
              'roleOnShift', ap.role_on_shift,
              'roleCode', ap.role_code,
              'status', ap.status,
              'isPlaceholder', ap.is_placeholder
            )
          ) as assigned_personnel
        FROM assigned_personnel ap
        LEFT JOIN users u ON ap.employee_id = u.id
        GROUP BY ap.shift_id
      )
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        sp.assigned_personnel,
        (
          SELECT COUNT(*)
          FROM assigned_personnel ap
          WHERE ap.shift_id = s.id AND ap.is_placeholder = false
        ) + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN shift_personnel sp ON s.id = sp.shift_id
      WHERE s.date = CURRENT_DATE
      ORDER BY s.start_time, s.date
    `);

    const shifts: Shift[] = result.rows.map(row => ({
        id: row.id,
        timesheetId: row.timesheet_id || '',
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location || '',
        status: row.status,
        notes: row.notes || '',
        requestedWorkers: parseInt(row.requested_workers) || 1,
        assignedCount: parseInt(row.assigned_count) || 0,
        jobId: row.job_id,
        jobName: row.job_name,
        clientName: row.client_name,
        authorizedCrewChiefIds: [],
        crewChief: row.crew_chief_id ? {
          id: row.crew_chief_id,
          name: row.crew_chief_name,
          avatar: row.crew_chief_avatar,
          certifications: [],
          performance: 0,
          location: '',
        } : null,
        crewChiefId: row.crew_chief_id,
        crewChiefName: row.crew_chief_name,
        crewChiefAvatar: row.crew_chief_avatar,
        assignedPersonnel: row.assigned_personnel || [],
        workerRequirements: [], // This will be populated by a separate query if needed
        timesheetStatus: row.timesheet_status || 'Not Started',
      }));

    return shifts;
  } catch (error) {
    console.error('Error getting today\'s shifts:', error);
    return [];
  }
}

export async function getAllShifts(): Promise<Shift[]> {
  try {
    // First, try to add the column if it doesn't exist
    try {
      await query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS requested_workers INTEGER DEFAULT 1;`);
      await query(`UPDATE shifts SET requested_workers = 1 WHERE requested_workers IS NULL;`);
    } catch (error) {
      console.log('Column may already exist or permission issue:', error instanceof Error ? error.message : 'Unknown error');
    }

    const result = await query(`
      WITH shift_personnel AS (
        SELECT
          ap.shift_id,
          json_agg(
            json_build_object(
              'employee', json_build_object(
                'id', u.id,
                'name', u.name,
                'certifications', u.certifications,
                'performance', u.performance,
                'location', u.location,
                'avatar', u.avatar
              ),
              'roleOnShift', ap.role_on_shift,
              'roleCode', ap.role_code,
              'status', ap.status,
              'isPlaceholder', ap.is_placeholder
            )
          ) as assigned_personnel
        FROM assigned_personnel ap
        LEFT JOIN users u ON ap.employee_id = u.id
        GROUP BY ap.shift_id
      )
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        sp.assigned_personnel,
        (
          SELECT COUNT(*) 
          FROM assigned_personnel ap 
          WHERE ap.shift_id = s.id AND ap.is_placeholder = false
        ) + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN shift_personnel sp ON s.id = sp.shift_id
      ORDER BY s.date DESC, s.start_time
    `);

    const shifts: Shift[] = result.rows.map(row => ({
      id: row.id,
      timesheetId: row.timesheet_id || '',
      jobId: row.job_id,
      jobName: row.job_name,
      clientName: row.client_name,
      authorizedCrewChiefIds: row.crew_chief_id ? [row.crew_chief_id] : [],
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      requestedWorkers: parseInt(row.requested_workers) || 1,
      assignedCount: parseInt(row.assigned_count) || 0,
      crewChief: row.crew_chief_id ? {
        id: row.crew_chief_id,
        name: row.crew_chief_name,
        certifications: [],
        performance: 0,
        location: '',
        avatar: row.crew_chief_avatar || '',
      } : null,
      crewChiefId: row.crew_chief_id,
      crewChiefName: row.crew_chief_name,
      crewChiefAvatar: row.crew_chief_avatar || '',
      assignedPersonnel: row.assigned_personnel || [],
      status: row.status,
      timesheetStatus: row.timesheet_status || 'Pending Finalization',
      notes: row.notes,
    }));

    return shifts;
  } catch (error) {
    console.error('Error getting all shifts:', error);
    return [];
  }
}

export async function getShiftById(id: string): Promise<Shift | null> {
  try {
    const result = await query(`
      WITH shift_personnel AS (
        SELECT
          ap.shift_id,
          json_agg(
            json_build_object(
              'employee', json_build_object(
                'id', u.id,
                'name', u.name,
                'certifications', u.certifications,
                'performance', u.performance,
                'location', u.location,
                'avatar', u.avatar
              ),
              'roleOnShift', ap.role_on_shift,
              'roleCode', ap.role_code,
              'status', ap.status,
              'isPlaceholder', ap.is_placeholder
            )
          ) as assigned_personnel
        FROM assigned_personnel ap
        LEFT JOIN users u ON ap.employee_id = u.id
        GROUP BY ap.shift_id
      ),
      shift_requirements AS (
        SELECT
          wr.shift_id,
          json_agg(
            json_build_object(
              'roleCode', wr.role_code,
              'requiredCount', wr.required_count
            )
          ) as worker_requirements
        FROM worker_requirements wr
        GROUP BY wr.shift_id
      )
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, s.requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        sp.assigned_personnel,
        sr.worker_requirements
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN shift_personnel sp ON s.id = sp.shift_id
      LEFT JOIN shift_requirements sr ON s.id = sr.shift_id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      timesheetId: row.timesheet_id || '',
      jobId: row.job_id,
      jobName: row.job_name,
      clientName: row.client_name,
      authorizedCrewChiefIds: row.crew_chief_id ? [row.crew_chief_id] : [],
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      requestedWorkers: row.requested_workers,
      workerRequirements: row.worker_requirements || [],
      crewChiefName: row.crew_chief_name || null,
      crewChief: row.crew_chief_id ? {
        id: row.crew_chief_id,
        name: row.crew_chief_name,
        certifications: [],
        performance: 0,
        location: '',
        avatar: row.crew_chief_avatar || '',
      } : null,
      assignedPersonnel: row.assigned_personnel || [],
      status: row.status,
      timesheetStatus: row.timesheet_status || 'Pending Finalization',
      notes: row.notes,
    };
  } catch (error) {
    console.error('Error getting shift by ID:', error);
    return null;
  }
}



export async function getShiftsByCrewChief(crewChiefId: string): Promise<Shift[]> {
  try {
    const result = await query(`
      WITH shift_personnel AS (
        SELECT
          ap.shift_id,
          json_agg(
            json_build_object(
              'employee', json_build_object(
                'id', u.id,
                'name', u.name,
                'certifications', u.certifications,
                'performance', u.performance,
                'location', u.location,
                'avatar', u.avatar
              ),
              'roleOnShift', ap.role_on_shift,
              'roleCode', ap.role_code,
              'status', ap.status,
              'isPlaceholder', ap.is_placeholder
            )
          ) as assigned_personnel
        FROM assigned_personnel ap
        LEFT JOIN users u ON ap.employee_id = u.id
        GROUP BY ap.shift_id
      )
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        sp.assigned_personnel,
        (
          SELECT COUNT(*)
          FROM assigned_personnel ap
          WHERE ap.shift_id = s.id AND ap.is_placeholder = false
        ) + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN shift_personnel sp ON s.id = sp.shift_id
      WHERE s.crew_chief_id = $1
      ORDER BY s.date DESC, s.start_time
    `, [crewChiefId]);

    const shifts: Shift[] = result.rows.map(row => ({
        id: row.id,
        timesheetId: row.timesheet_id || '',
        jobId: row.job_id,
        jobName: row.job_name,
        clientName: row.client_name,
        authorizedCrewChiefIds: [row.crew_chief_id],
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        requestedWorkers: parseInt(row.requested_workers) || 1,
        assignedCount: parseInt(row.assigned_count) || 0,
        crewChief: {
          id: row.crew_chief_id,
          name: row.crew_chief_name,
          certifications: [],
          performance: 0,
          location: '',
          avatar: row.crew_chief_avatar || '',
        },
        crewChiefId: row.crew_chief_id,
        crewChiefName: row.crew_chief_name,
        crewChiefAvatar: row.crew_chief_avatar || '',
        assignedPersonnel: row.assigned_personnel || [],
        status: row.status,
        timesheetStatus: row.timesheet_status || 'Pending Finalization',
        notes: row.notes,
      }));

    return shifts;
  } catch (error) {
    console.error('Error getting shifts by crew chief:', error);
    return [];
  }
}

export async function createShift(shiftData: {
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  crewChiefId?: string;
  requestedWorkers: number;
  notes?: string;
}): Promise<Shift | null> {
  try {
    const result = await query(`
      INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, requested_workers, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Upcoming')
      RETURNING id
    `, [
      shiftData.jobId,
      shiftData.date,
      shiftData.startTime,
      shiftData.endTime,
      shiftData.location || '',
      shiftData.crewChiefId || null,
      shiftData.requestedWorkers,
      shiftData.notes || ''
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const shiftId = result.rows[0].id;

    // If a crew chief is assigned, add them to assigned_personnel table
    if (shiftData.crewChiefId) {
      try {
        await query(`
          INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status)
          VALUES ($1, $2, 'Crew Chief', 'CC', 'Clocked Out')
          ON CONFLICT (shift_id, employee_id) DO NOTHING
        `, [shiftId, shiftData.crewChiefId]);
      } catch (error) {
        console.error('Error adding crew chief to assigned personnel:', error);
        // Continue without failing the shift creation
      }
    }

    return await getShiftById(shiftId);
  } catch (error) {
    console.error('Error creating shift:', error);
    return null;
  }
}

export async function updateShift(shiftId: string, shiftData: {
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  crewChiefId?: string;
  requestedWorkers?: number;
  notes?: string;
}): Promise<Shift | null> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (shiftData.date !== undefined) {
      updates.push(`date = $${paramCount++}`);
      values.push(shiftData.date);
    }
    if (shiftData.startTime !== undefined) {
      updates.push(`start_time = $${paramCount++}`);
      values.push(shiftData.startTime);
    }
    if (shiftData.endTime !== undefined) {
      updates.push(`end_time = $${paramCount++}`);
      values.push(shiftData.endTime);
    }
    if (shiftData.location !== undefined) {
      updates.push(`location = $${paramCount++}`);
      values.push(shiftData.location);
    }
    if (shiftData.crewChiefId !== undefined) {
      updates.push(`crew_chief_id = $${paramCount++}`);
      // Convert empty string to null for UUID column
      values.push(shiftData.crewChiefId === '' ? null : shiftData.crewChiefId);
    }
    if (shiftData.requestedWorkers !== undefined) {
      updates.push(`requested_workers = $${paramCount++}`);
      values.push(shiftData.requestedWorkers);
    }
    if (shiftData.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(shiftData.notes);
    }

    if (updates.length === 0) {
      return await getShiftById(shiftId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(shiftId);

    await query(`
      UPDATE shifts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    // Handle crew chief assignment changes
    if (shiftData.crewChiefId !== undefined) {
      try {
        if (shiftData.crewChiefId) {
          // Add new crew chief to assigned_personnel if not already there
          await query(`
            INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status)
            VALUES ($1, $2, 'Crew Chief', 'CC', 'Clocked Out')
            ON CONFLICT (shift_id, employee_id) DO NOTHING
          `, [shiftId, shiftData.crewChiefId]);
        } else {
          // Remove crew chief from assigned_personnel if crew chief is being unassigned
          await query(`
            DELETE FROM assigned_personnel
            WHERE shift_id = $1 AND role_code = 'CC'
          `, [shiftId]);
        }
      } catch (error) {
        console.error('Error updating crew chief assignment:', error);
        // Continue without failing the shift update
      }
    }

    return await getShiftById(shiftId);
  } catch (error) {
    console.error('Error updating shift:', error);
    return null;
  }
}

export async function deleteShift(shiftId: string): Promise<boolean> {
  try {
    // Delete assigned personnel and their time entries
    await query(`
      DELETE FROM time_entries
      WHERE assigned_personnel_id IN (
        SELECT id FROM assigned_personnel WHERE shift_id = $1
      )
    `, [shiftId]);

    await query(`
      DELETE FROM assigned_personnel WHERE shift_id = $1
    `, [shiftId]);

    // Delete the shift
    const result = await query(`
      DELETE FROM shifts WHERE id = $1
    `, [shiftId]);

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting shift:', error);
    return false;
  }
}
