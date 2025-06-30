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

    let whereClause = '';
    let params: any[] = [];

    // Filter based on user role
    if (user.role === 'Client') {
      // Clients only see timesheets for their projects that need their approval
      whereClause = `
        WHERE t.status = 'pending_client_approval' 
        AND EXISTS (
          SELECT 1 FROM client_user_links cul 
          WHERE cul.client_id = c.id AND cul.user_id = $1
        )
      `;
      params = [user.id];
    } else if (user.role === 'Manager/Admin') {
      // Managers see all pending timesheets
      whereClause = `WHERE t.status IN ('pending_client_approval', 'pending_manager_approval')`;
    } else {
      // Other roles see timesheets they submitted
      whereClause = `WHERE t.submitted_by = $1`;
      params = [user.id];
    }

    const result = await query(`
      SELECT 
        t.id,
        t.status,
        t.submitted_at,
        t.client_approved_at,
        t.manager_approved_at,
        s.id as shift_id,
        s.date as shift_date,
        s.location,
        j.name as job_name,
        c.name as client_name,
        cc.name as crew_chief_name,
        COUNT(ap.id) as worker_count
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      JOIN users cc ON s.crew_chief_id = cc.id
      LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
      ${whereClause}
      GROUP BY t.id, t.status, t.submitted_at, t.client_approved_at, t.manager_approved_at,
               s.id, s.date, s.location, j.name, c.name, cc.name
      ORDER BY t.submitted_at DESC
    `, params);

    const timesheets = result.rows.map(row => ({
      id: row.id,
      status: row.status,
      submittedAt: row.submitted_at,
      clientApprovedAt: row.client_approved_at,
      managerApprovedAt: row.manager_approved_at,
      shiftId: row.shift_id,
      shiftDate: row.shift_date,
      location: row.location,
      jobName: row.job_name,
      clientName: row.client_name,
      crewChiefName: row.crew_chief_name,
      workerCount: parseInt(row.worker_count) || 0,
    }));

    return NextResponse.json({
      success: true,
      timesheets,
    });
  } catch (error) {
    console.error('Error getting pending timesheets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
