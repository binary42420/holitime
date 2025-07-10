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
    const dateFilter = searchParams.get('filter') || 'all';
    const statusFilter = searchParams.get('status') || 'all';
    const clientFilter = searchParams.get('client') || 'all';
    const searchTerm = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const today = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (dateFilter === 'today') {
      startDate = endDate = today.toISOString().split('T')[0];
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = addDays(today, 1);
      startDate = endDate = tomorrow.toISOString().split('T')[0];
    } else if (dateFilter === 'yesterday') {
      const yesterday = subDays(today, 1);
      startDate = endDate = yesterday.toISOString().split('T')[0];
    } else if (dateFilter === 'this_week') {
      startDate = startOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
      endDate = endOfWeek(today, { weekStartsOn: 1 }).toISOString().split('T')[0];
    }

    const queryParams: any[] = [];
    const whereClauses: string[] = [];

    if (startDate && endDate) {
      queryParams.push(startDate, endDate);
      whereClauses.push(`s.date BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`);
    }

    if (statusFilter !== 'all') {
      queryParams.push(statusFilter);
      whereClauses.push(`s.status = $${queryParams.length}`);
    }

    if (clientFilter !== 'all') {
      queryParams.push(clientFilter);
      whereClauses.push(`c.company_name = $${queryParams.length}`);
    }

    if (searchTerm) {
      queryParams.push(`%${searchTerm}%`);
      const searchParamIndex = `$${queryParams.length}`;
      whereClauses.push(`(j.name ILIKE ${searchParamIndex} OR c.company_name ILIKE ${searchParamIndex} OR s.location ILIKE ${searchParamIndex} OR cc.name ILIKE ${searchParamIndex})`);
    }

    // Role-based filtering
    if (user.role === 'Crew Chief') {
      queryParams.push(user.id);
      whereClauses.push(`s.crew_chief_id = $${queryParams.length}`);
    } else if (user.role === 'Employee') {
      queryParams.push(user.id);
      whereClauses.push(`s.id IN (SELECT shift_id FROM assigned_personnel WHERE employee_id = $${queryParams.length})`);
    } else if (user.role === 'Client' && user.clientCompanyId) {
      queryParams.push(user.clientCompanyId);
      whereClauses.push(`j.client_id = $${queryParams.length}`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const offset = (page - 1) * pageSize;
    queryParams.push(pageSize, offset);

    const result = await query(`
      SELECT
        s.id, s.date, s.start_time, s.end_time, s.location, s.status, s.notes,
        COALESCE(s.requested_workers, 1) as requested_workers,
        j.id as job_id, j.name as job_name, j.client_id,
        c.company_name as client_name,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar,
        t.id as timesheet_id, t.status as timesheet_status,
        COUNT(ap.id) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN timesheets t ON s.id = t.shift_id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      ${whereClause}
      GROUP BY s.id, j.id, c.id, cc.id, t.id
      ORDER BY s.date DESC, s.start_time ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    const shifts = result.rows.map(row => ({
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
      assignedPersonnel: [],
      status: row.status,
      timesheetStatus: row.timesheet_status || 'Pending Finalization',
      notes: row.notes,
    }));

    return NextResponse.json({
      success: true,
      shifts: shifts,
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
