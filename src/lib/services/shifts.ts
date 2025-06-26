import { query } from '../db';
import type { Shift, AssignedPersonnel, TimesheetStatus } from '../types';

export async function getAllShifts(): Promise<Shift[]> {
  try {
    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        s.requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        c.name as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.id, j.name, j.client_id, c.name,
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
        requestedWorkers: parseInt(row.requested_workers) || 0,
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
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        j.id as job_id, j.name as job_name, j.client_id,
        c.name as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      JOIN users cc ON s.crew_chief_id = cc.id
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
        e.id as employee_id, u.name as employee_name, e.certifications, e.performance, e.location, u.avatar
      FROM assigned_personnel ap
      LEFT JOIN employees e ON ap.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
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
    
    // Ensure we have at least 3 entries (as per the original mock data structure)
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
        c.name as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      JOIN users cc ON s.crew_chief_id = cc.id
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
