import { query, cachedQuery } from '../db';
import type { 
  Shift, 
  AssignedPersonnel, 
  TimesheetStatus, 
  Employee, 
  WorkerRequirement 
} from '../types';
import { getWorkerRequirements } from './worker-requirements';

interface ShiftRow {
  id: string;
  timesheet_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  notes: string | null;
  requested_workers: string | number;
  job_id: string;
  job_name: string;
  client_name: string;
  client_logo_url: string | null;
  crew_chief_id: string | null;
  crew_chief_name: string | null;
  crew_chief_avatar: string | null;
  assigned_personnel: any[] | null;
  assigned_count: string | number;
  timesheet_status: string | null;
  worker_requirements?: WorkerRequirement[];
}

const SHIFTS_PER_PAGE = 50; // Default page size

interface ShiftQueryOptions {
  page?: number;
  pageSize?: number;
  status?: string[];
  startDate?: string;
  endDate?: string;
  jobId?: string;
  clientId?: string;
}

// Helper function to map database row to Shift type
function mapShiftRow(row: ShiftRow): Shift {
  return {
    id: row.id,
    timesheetId: row.timesheet_id || '',
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location || '',
    status: row.status as Shift['status'],
    notes: row.notes || '',
    requestedWorkers: parseInt(row.requested_workers.toString()) || 1,
    assignedCount: row.assigned_count ? parseInt(row.assigned_count.toString()) : 0,
    jobId: row.job_id,
    jobName: row.job_name,
    clientName: row.client_name,
    clientLogoUrl: row.client_logo_url || null,
    authorizedCrewChiefIds: row.crew_chief_id ? [row.crew_chief_id] : [],
    crewChief: row.crew_chief_id ? {
      id: row.crew_chief_id,
      name: row.crew_chief_name || '',
      avatar: row.crew_chief_avatar || '',
      certifications: [],
      performance: 0,
      location: '',
    } : null,
    crewChiefId: row.crew_chief_id || undefined,
    crewChiefName: row.crew_chief_name || undefined,
    crewChiefAvatar: row.crew_chief_avatar || undefined,
    assignedPersonnel: row.assigned_personnel || [],
    workerRequirements: row.worker_requirements || [],
    timesheetStatus: (row.timesheet_status as TimesheetStatus) || 'Pending Finalization',
  };
}

// Reusable CTE for shift personnel
const SHIFT_PERSONNEL_CTE = "WITH shift_personnel AS (" +
  "SELECT " +
    "ap.shift_id, " +
    "json_agg( " +
      "json_build_object( " +
        "'employee', json_build_object( " +
          "'id', u.id, " +
          "'name', u.name, " +
          "'certifications', u.certifications, " +
          "'performance', u.performance, " +
          "'location', u.location, " +
          "'avatar', u.avatar " +
        "), " +
        "'roleOnShift', ap.role_on_shift, " +
        "'roleCode', ap.role_code, " +
        "'status', ap.status, " +
        "'isPlaceholder', ap.is_placeholder " +
      ") " +
    ") as assigned_personnel " +
  "FROM assigned_personnel ap " +
  "LEFT JOIN users u ON ap.employee_id = u.id " +
  "GROUP BY ap.shift_id " +
")";

export async function getTodaysShifts(): Promise<Shift[]> {
  try {
    const result = await cachedQuery(
      SHIFT_PERSONNEL_CTE +
      " SELECT " +
        "s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, " +
        "s.requested_workers, " +
        "j.id as job_id, j.name as job_name, j.client_id, " +
        "c.company_name as client_name, " +
        "c.logo_url as client_logo_url, " +
        "cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar, " +
        "t.id as timesheet_id, t.status as timesheet_status, " +
        "sp.assigned_personnel, " +
        "( " +
          "SELECT COUNT(*) " +
          "FROM assigned_personnel ap " +
          "WHERE ap.shift_id = s.id AND ap.is_placeholder = false " +
        ") + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count " +
      "FROM shifts s " +
      "JOIN jobs j ON s.job_id = j.id " +
      "JOIN clients c ON j.client_id = c.id " +
      "LEFT JOIN users cc ON s.crew_chief_id = cc.id " +
      "LEFT JOIN timesheets t ON s.id = t.shift_id " +
      "LEFT JOIN shift_personnel sp ON s.id = sp.shift_id " +
      "WHERE s.date = CURRENT_DATE " +
      "ORDER BY s.start_time",
      [], 'todays_shifts', 5 * 60 * 1000
    );

    return result.rows.map(mapShiftRow);
  } catch (error) {
    console.error("Error getting today's shifts:", error);
    return [];
  }
}

export async function getAllShifts(options: ShiftQueryOptions = {}): Promise<{
  shifts: Shift[];
  total: number;
  pages: number;
}> {
  try {
    const {
      page = 1,
      pageSize = SHIFTS_PER_PAGE,
      status,
      startDate,
      endDate,
      jobId,
      clientId
    } = options;

    const offset = (page - 1) * pageSize;
    const params: any[] = [pageSize, offset];
    let paramIndex = 3;

    // Build WHERE clause
    const conditions: string[] = [];
    if (status?.length) {
      conditions.push("s.status = ANY($" + paramIndex++ + ")");
      params.push(status);
    }
    if (startDate) {
      conditions.push("s.date >= $" + paramIndex++);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("s.date <= $" + paramIndex++);
      params.push(endDate);
    }
    if (jobId) {
      conditions.push("s.job_id = $" + paramIndex++);
      params.push(jobId);
    }
    if (clientId) {
      conditions.push("j.client_id = $" + paramIndex++);
      params.push(clientId);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    // Get total count
    const countResult = await query(
      "SELECT COUNT(*) FROM shifts s " + whereClause,
      params.slice(2)
    );
    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / pageSize);

    // Get paginated results with optimized query
    const result = await query(
      SHIFT_PERSONNEL_CTE +
      " SELECT " +
        "s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, " +
        "s.requested_workers, " +
        "j.id as job_id, j.name as job_name, j.client_id, " +
        "c.company_name as client_name, " +
        "c.logo_url as client_logo_url, " +
        "cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar, " +
        "t.id as timesheet_id, t.status as timesheet_status, " +
        "sp.assigned_personnel, " +
        "( " +
          "SELECT COUNT(*) " +
          "FROM assigned_personnel ap " +
          "WHERE ap.shift_id = s.id AND ap.is_placeholder = false " +
        ") + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count " +
      "FROM shifts s " +
      "JOIN jobs j ON s.job_id = j.id " +
      "JOIN clients c ON j.client_id = c.id " +
      "LEFT JOIN users cc ON s.crew_chief_id = cc.id " +
      "LEFT JOIN timesheets t ON s.id = t.shift_id " +
      "LEFT JOIN shift_personnel sp ON s.id = sp.shift_id " +
      whereClause +
      " ORDER BY s.date DESC, s.start_time " +
      "LIMIT $1 OFFSET $2",
      params
    );

    return {
      shifts: result.rows.map(mapShiftRow),
      total,
      pages
    };
  } catch (error) {
    console.error("Error getting all shifts:", error);
    return { shifts: [], total: 0, pages: 0 };
  }
}

export async function getShiftById(id: string): Promise<Shift | null> {
  try {
    console.log("getShiftById called with ID:", id);
    // Use simpler query similar to getAllShifts that we know works
    const result = await query(
      "SELECT " +
        "s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, " +
        "s.requested_workers, " +
        "j.id as job_id, j.name as job_name, j.client_id, " +
        "c.company_name as client_name, " +
        "c.logo_url as client_logo_url, " +
        "cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar, " +
        "t.id as timesheet_id, t.status as timesheet_status " +
      "FROM shifts s " +
      "JOIN jobs j ON s.job_id = j.id " +
      "JOIN clients c ON j.client_id = c.id " +
      "LEFT JOIN users cc ON s.crew_chief_id = cc.id " +
      "LEFT JOIN timesheets t ON s.id = t.shift_id " +
      "WHERE s.id = $1",
      [id]
    );

    console.log("getShiftById query result:", result.rows.length, "rows found");
    if (result.rows.length === 0) {
      console.log("No shift found with ID:", id);
      return null;
    }

    // Get assigned personnel separately for the simplified query
    const assignedResult = await query(
      "SELECT " +
        "json_agg( " +
          "json_build_object( " +
            "'employee', json_build_object( " +
              "'id', u.id, " +
              "'name', u.name, " +
              "'certifications', u.certifications, " +
              "'performance', u.performance, " +
              "'location', u.location, " +
              "'avatar', u.avatar " +
            "), " +
            "'roleOnShift', ap.role_on_shift, " +
            "'roleCode', ap.role_code, " +
            "'status', ap.status, " +
            "'isPlaceholder', ap.is_placeholder " +
          ") " +
        ") as assigned_personnel " +
      "FROM assigned_personnel ap " +
      "LEFT JOIN users u ON ap.employee_id = u.id " +
      "WHERE ap.shift_id = $1",
      [id]
    );

    const row = result.rows[0];
    row.assigned_personnel = assignedResult.rows[0]?.assigned_personnel || [];

    // Get worker requirements for this shift
    const workerRequirements = await getWorkerRequirements(id);
    row.worker_requirements = workerRequirements;

    return mapShiftRow(row);
  } catch (error) {
    console.error("Error getting shift by ID:", error);
    return null;
  }
}

export async function getShiftsByCrewChief(crewChiefId: string): Promise<Shift[]> {
  try {
    const result = await query(
      SHIFT_PERSONNEL_CTE +
      " SELECT " +
        "s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes, " +
        "s.requested_workers, " +
        "j.id as job_id, j.name as job_name, j.client_id, " +
        "c.company_name as client_name, " +
        "c.logo_url as client_logo_url, " +
        "cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar, " +
        "t.id as timesheet_id, t.status as timesheet_status, " +
        "sp.assigned_personnel, " +
        "( " +
          "SELECT COUNT(*) " +
          "FROM assigned_personnel ap " +
          "WHERE ap.shift_id = s.id AND ap.is_placeholder = false " +
        ") + (CASE WHEN s.crew_chief_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_count " +
      "FROM shifts s " +
      "JOIN jobs j ON s.job_id = j.id " +
      "JOIN clients c ON j.client_id = c.id " +
      "LEFT JOIN users cc ON s.crew_chief_id = cc.id " +
      "LEFT JOIN timesheets t ON s.id = t.shift_id " +
      "LEFT JOIN shift_personnel sp ON s.id = sp.shift_id " +
      "WHERE s.crew_chief_id = $1 " +
      "ORDER BY s.date DESC, s.start_time",
      [crewChiefId]
    );

    return result.rows.map(mapShiftRow);
  } catch (error) {
    console.error("Error getting shifts by crew chief:", error);
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
    const result = await query(
      "INSERT INTO shifts (job_id, date, start_time, end_time, location, crew_chief_id, requested_workers, notes, status) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Upcoming') " +
      "RETURNING id",
      [
        shiftData.jobId,
        shiftData.date,
        shiftData.startTime,
        shiftData.endTime,
        shiftData.location || '',
        shiftData.crewChiefId || null,
        shiftData.requestedWorkers,
        shiftData.notes || ''
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const shiftId = result.rows[0].id;

    // If a crew chief is assigned, add them to assigned_personnel table
    if (shiftData.crewChiefId) {
      try {
        await query(
          "INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status) " +
          "VALUES ($1, $2, 'Crew Chief', 'CC', 'Clocked Out') " +
          "ON CONFLICT (shift_id, employee_id) DO NOTHING",
          [shiftId, shiftData.crewChiefId]
        );
      } catch (error) {
        console.error("Error adding crew chief to assigned personnel:", error);
        // Continue without failing the shift creation
      }
    }

    return await getShiftById(shiftId);
  } catch (error) {
    console.error("Error creating shift:", error);
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
      updates.push("date = $" + paramCount++);
      values.push(shiftData.date);
    }
    if (shiftData.startTime !== undefined) {
      updates.push("start_time = $" + paramCount++);
      values.push(shiftData.startTime);
    }
    if (shiftData.endTime !== undefined) {
      updates.push("end_time = $" + paramCount++);
      values.push(shiftData.endTime);
    }
    if (shiftData.location !== undefined) {
      updates.push("location = $" + paramCount++);
      values.push(shiftData.location);
    }
    if (shiftData.crewChiefId !== undefined) {
      updates.push("crew_chief_id = $" + paramCount++);
      values.push(shiftData.crewChiefId === "" ? null : shiftData.crewChiefId);
    }
    if (shiftData.requestedWorkers !== undefined) {
      updates.push("requested_workers = $" + paramCount++);
      values.push(shiftData.requestedWorkers);
    }
    if (shiftData.notes !== undefined) {
      updates.push("notes = $" + paramCount++);
      values.push(shiftData.notes);
    }

    if (updates.length === 0) {
      return await getShiftById(shiftId);
    }

    updates.push("updated_at = NOW()");
    values.push(shiftId);

    await query(
      "UPDATE shifts SET " + updates.join(", ") + " WHERE id = $" + paramCount,
      values
    );

    // Handle crew chief assignment changes
    if (shiftData.crewChiefId !== undefined) {
      try {
        if (shiftData.crewChiefId) {
          await query(
            "INSERT INTO assigned_personnel (shift_id, employee_id, role_on_shift, role_code, status) " +
            "VALUES ($1, $2, 'Crew Chief', 'CC', 'Clocked Out') " +
            "ON CONFLICT (shift_id, employee_id) DO NOTHING",
            [shiftId, shiftData.crewChiefId]
          );
        } else {
          await query(
            "DELETE FROM assigned_personnel WHERE shift_id = $1 AND role_code = 'CC'",
            [shiftId]
          );
        }
      } catch (error) {
        console.error("Error updating crew chief assignment:", error);
      }
    }

    return await getShiftById(shiftId);
  } catch (error) {
    console.error("Error updating shift:", error);
    return null;
  }
}

export async function deleteShift(shiftId: string): Promise<boolean> {
  try {
    // Delete assigned personnel and their time entries
    await query(
      "DELETE FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = $1)",
      [shiftId]
    );

    await query(
      "DELETE FROM assigned_personnel WHERE shift_id = $1",
      [shiftId]
    );

    // Delete the shift
    const result = await query(
      "DELETE FROM shifts WHERE id = $1",
      [shiftId]
    );

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error("Error deleting shift:", error);
    return false;
  }
}
