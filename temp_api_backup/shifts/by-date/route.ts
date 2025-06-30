import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';
import { startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('filter') || 'today';

    let startDate: string;
    let endDate: string;
    const today = new Date();

    switch (dateFilter) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        startDate = endDate = tomorrow.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        startDate = startOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
        endDate = endOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
        break;
      case 'all':
        // For 'all', we'll get shifts from 30 days ago to 30 days in the future
        startDate = subDays(today, 30).toISOString().split('T')[0];
        endDate = addDays(today, 30).toISOString().split('T')[0];
        break;
      default:
        startDate = endDate = today.toISOString().split('T')[0];
    }

    // Optimized query that gets shifts with all needed data in one query
    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        COUNT(CASE WHEN ap.is_placeholder = false THEN ap.id END) as assigned_count,
        ARRAY_AGG(
          CASE WHEN ap.id IS NOT NULL THEN
            json_build_object(
              'id', ap.id,
              'employee_id', ap.employee_id,
              'employee_name', u.name,
              'employee_avatar', u.avatar,
              'worker_type', ap.role_code,
              'is_placeholder', ap.is_placeholder,
              'status', ap.status
            )
          END
        ) FILTER (WHERE ap.id IS NOT NULL) as assigned_personnel_data
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      LEFT JOIN users u ON ap.employee_id = u.id
      WHERE s.date BETWEEN $1 AND $2
      GROUP BY s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
               s.requested_workers, j.id, j.name, j.client_id, c.company_name, c.name,
               cc.id, cc.name, cc.avatar, t.id, t.status
      ORDER BY s.date DESC, s.start_time ASC
    `, [startDate, endDate]);

    const shifts = result.rows.map(row => {
      const assignedPersonnel = (row.assigned_personnel_data || [])
        .filter(Boolean)
        .map((person: any) => ({
          id: person.id,
          employee: {
            id: person.employee_id,
            name: person.employee_name,
            avatar: person.employee_avatar || '',
          },
          workerType: person.worker_type,
          isPlaceholder: person.is_placeholder,
          status: person.status,
        }));

      return {
        id: row.id,
        timesheetId: row.timesheet_id || '',
        jobId: row.job_id,
        jobName: row.job_name,
        clientName: row.client_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        requestedWorkers: parseInt(row.requested_workers) || 1,
        assignedCount: parseInt(row.assigned_count) || 0,
        crewChiefId: row.crew_chief_id,
        crewChiefName: row.crew_chief_name,
        crewChiefAvatar: row.crew_chief_avatar || '',
        assignedPersonnel,
        status: row.status,
        timesheetStatus: row.timesheet_status || 'Pending Finalization',
        notes: row.notes,
      };
    });

    // Filter based on user role
    let filteredShifts = shifts;
    
    if (user.role === 'Crew Chief') {
      filteredShifts = shifts.filter(shift => shift.crewChiefId === user.id);
    } else if (user.role === 'Employee') {
      filteredShifts = shifts.filter(shift => 
        shift.assignedPersonnel.some((person: any) => person.employee.id === user.id)
      );
    }
    // Manager/Admin and Client users see all shifts (clients will be filtered by their jobs in future)

    return NextResponse.json({
      success: true,
      shifts: filteredShifts,
      dateRange: { startDate, endDate, filter: dateFilter }
    });

  } catch (error) {
    console.error('Error getting shifts by date:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
