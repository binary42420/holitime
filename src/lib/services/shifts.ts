import { query } from '../db';
import type { Shift, AssignedPersonnel, TimesheetStatus } from '../types';

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
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.id, j.name, j.client_id, c.company_name, c.name,
               cc.id, cc.name, cc.avatar, t.id, t.status
      ORDER BY s.date DESC, s.start_time
    `);

    const shifts: Shift[] = [];
    
    for (const row of result.rows) {
      // Get assigned personnel for this shift
      const assignedPersonnel = await getAssignedPersonnelForShift(row.id);
      
      shifts.push({
        id: row.id,
        timesheetId: row.timesheet_id || '',
        jobId: row.job_id,
        jobName: row.job_name,
        clientName: row.client_name,
        authorizedCrewChiefIds: [row.crew_chief_id], // Simplified for now
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
        assignedPersonnel,
        status: row.status,
        timesheetStatus: row.timesheet_status || 'Pending Finalization',
        notes: row.notes,
      });
    }

    return shifts;
  } catch (error) {
    console.error('Error getting all shifts:', error);
    return [];
  }
}

export async function getShiftById(id: string): Promise<Shift | null> {
  try {
    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, s.requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const assignedPersonnel = await getAssignedPersonnelForShift(row.id);

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
      crewChiefName: row.crew_chief_name || null,
      crewChief: row.crew_chief_id ? {
        id: row.crew_chief_id,
        name: row.crew_chief_name,
        certifications: [],
        performance: 0,
        location: '',
        avatar: row.crew_chief_avatar || '',
      } : null,
      assignedPersonnel,
      status: row.status,
      timesheetStatus: row.timesheet_status || 'Pending Finalization',
      notes: row.notes,
    };
  } catch (error) {
    console.error('Error getting shift by ID:', error);
    return null;
  }
}

async function getAssignedPersonnelForShift(shiftId: string): Promise<AssignedPersonnel[]> {
  try {
    const result = await query(`
      SELECT
        ap.id as assigned_id, ap.role_on_shift, ap.role_code, ap.status, ap.is_placeholder,
        u.id as employee_id, u.name as employee_name, u.certifications, u.performance, u.location, u.avatar
      FROM assigned_personnel ap
      LEFT JOIN users u ON ap.employee_id = u.id
      WHERE ap.shift_id = $1
      ORDER BY ap.role_code, u.name
    `, [shiftId]);

    const personnel: AssignedPersonnel[] = [];

    for (const row of result.rows) {
      // Get time entries for this assigned personnel
      const timeEntries = await getTimeEntriesForAssignedPersonnel(row.assigned_id);

      if (row.is_placeholder) {
        // Handle placeholder personnel
        personnel.push({
          employee: {
            id: '',
            name: 'Unassigned',
            certifications: [],
            performance: 0,
            location: '',
            avatar: '',
          },
          roleOnShift: row.role_on_shift || '',
          roleCode: row.role_code,
          status: row.status,
          timeEntries,
          isPlaceholder: true,
        });
      } else if (row.employee_id) {
        personnel.push({
          employee: {
            id: row.employee_id,
            name: row.employee_name,
            certifications: row.certifications || [],
            performance: parseFloat(row.performance) || 0,
            location: row.location || '',
            avatar: row.avatar || '',
          },
          roleOnShift: row.role_on_shift || '',
          roleCode: row.role_code,
          status: row.status,
          timeEntries,
        });
      }
    }

    return personnel;
  } catch (error) {
    console.error('Error getting assigned personnel for shift:', error);
    return [];
  }
}

async function getTimeEntriesForAssignedPersonnel(assignedPersonnelId: string): Promise<{ clockIn?: string; clockOut?: string }[]> {
  try {
    const result = await query(`
      SELECT entry_number, clock_in, clock_out
      FROM time_entries
      WHERE assigned_personnel_id = $1
      ORDER BY entry_number
    `, [assignedPersonnelId]);

    const timeEntries: { clockIn?: string; clockOut?: string }[] = [];
    
    for (let i = 0; i < 3; i++) {
      const entry = result.rows.find(row => row.entry_number === i + 1);
      timeEntries.push({
        clockIn: entry?.clock_in || '',
        clockOut: entry?.clock_out || '',
      });
    }

    return timeEntries;
  } catch (error) {
    console.error('Error getting time entries for assigned personnel:', error);
    return [{ clockIn: '', clockOut: '' }, { clockIn: '', clockOut: '' }, { clockIn: '', clockOut: '' }];
  }
}

export async function getShiftsByCrewChief(crewChiefId: string): Promise<Shift[]> {
  try {
    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      WHERE s.crew_chief_id = $1
      ORDER BY s.date DESC, s.start_time
    `, [crewChiefId]);

    const shifts: Shift[] = [];
    
    for (const row of result.rows) {
      const assignedPersonnel = await getAssignedPersonnelForShift(row.id);
      
      shifts.push({
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
        crewChief: {
          id: row.crew_chief_id,
          name: row.crew_chief_name,
          certifications: [],
          performance: 0,
          location: '',
          avatar: row.crew_chief_avatar || '',
        },
        assignedPersonnel,
        status: row.status,
        timesheetStatus: row.timesheet_status || 'Pending Finalization',
        notes: row.notes,
      });
    }

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
