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

    // Get jobs with their most recent activity (shifts)
    const result = await query(`
      SELECT
        j.id,
        j.name,
        j.description,
        j.client_id,
        j.created_at,
        j.updated_at,
        COALESCE(c.name, c.company_name) as client_name,
        COUNT(s.id) as shift_count,
        COALESCE(MAX(s.date), j.created_at) as last_activity,
        COUNT(CASE WHEN s.date >= CURRENT_DATE THEN 1 END) as upcoming_shifts,
        COUNT(CASE WHEN s.date = CURRENT_DATE THEN 1 END) as active_shifts,
        MAX(s.date) as most_recent_shift,
        CASE
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      GROUP BY j.id, j.name, j.description, j.client_id, j.created_at, j.updated_at, c.name, c.company_name
      ORDER BY last_activity DESC, j.created_at DESC
      LIMIT 50
    `);

    const jobs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientName: row.client_name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      shiftCount: parseInt(row.shift_count) || 0,
      lastActivity: row.last_activity,
      upcomingShifts: parseInt(row.upcoming_shifts) || 0,
      activeShifts: parseInt(row.active_shifts) || 0,
      lastActivityType: row.most_recent_shift ? 'shift' : 'created'
    }));

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error) {
    console.error('Error getting recent jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
