import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Simplified, fast query - get basic shift info only
    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      WHERE s.date = $1
      ORDER BY s.start_time ASC
    `, [today]);

    // Get assigned personnel counts in a separate, simple query
    const assignedCountsMap = new Map();

    if (result.rows.length > 0) {
      const assignedCountsResult = await query(`
        SELECT
          shift_id,
          COUNT(*) as assigned_count
        FROM assigned_personnel
        WHERE shift_id IN (${result.rows.map((_, i) => `$${i + 1}`).join(',')})
          AND is_placeholder = false
        GROUP BY shift_id
      `, result.rows.map(row => row.id));

      // Create a map of assigned counts for quick lookup
      if (assignedCountsResult.rows) {
        assignedCountsResult.rows.forEach(row => {
          assignedCountsMap.set(row.shift_id, parseInt(row.assigned_count) || 0);
        });
      }
    }

    // Transform the data to match the expected format (simplified for performance)
    const shifts = result.rows.map(row => ({
      id: row.id,
      timesheetId: '', // Load on demand for performance
      jobId: row.job_id,
      jobName: row.job_name,
      clientName: row.client_name,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      requestedWorkers: parseInt(row.requested_workers) || 1,
      assignedCount: assignedCountsMap.get(row.id) || 0,
      crewChiefId: row.crew_chief_id,
      crewChiefName: row.crew_chief_name,
      crewChiefAvatar: '', // Simplified for performance
      assignedPersonnel: [], // Load on demand for performance
      status: row.status,
      timesheetStatus: 'Pending Finalization', // Default status
      notes: row.notes,
    }));

    // Filter based on user role (simplified for performance)
    let filteredShifts = shifts;

    if (user.role === 'Crew Chief') {
      filteredShifts = shifts.filter(shift => shift.crewChiefId === user.id);
    } else if (user.role === 'Employee') {
      // For employees, we need to check assigned_personnel table
      if (shifts.length > 0) {
        const employeeShiftsResult = await query(`
          SELECT DISTINCT shift_id
          FROM assigned_personnel
          WHERE employee_id = $1
            AND shift_id IN (${shifts.map((_, i) => `$${i + 2}`).join(',')})
        `, [user.id, ...shifts.map(s => s.id)]);

        const employeeShiftIds = new Set(employeeShiftsResult.rows.map(row => row.shift_id));
        filteredShifts = shifts.filter(shift => employeeShiftIds.has(shift.id));
      } else {
        filteredShifts = [];
      }
    }
    // Manager/Admin and Client users see all shifts

    return NextResponse.json({
      success: true,
      shifts: filteredShifts,
    });

  } catch (error) {
    console.error('Error getting today\'s shifts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
