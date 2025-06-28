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
      SELECT DISTINCT
        j.id,
        j.name,
        j.description,
        j.client_id,
        j.created_at,
        j.updated_at,
        COALESCE(c.name, c.company_name) as client_name,
        -- Get shift count
        COALESCE(shift_counts.shift_count, 0) as shift_count,
        -- Get most recent shift date
        COALESCE(recent_shifts.most_recent_shift, j.created_at) as last_activity,
        -- Get upcoming shift count
        COALESCE(upcoming_shifts.upcoming_count, 0) as upcoming_shifts,
        -- Get active shift count (today)
        COALESCE(active_shifts.active_count, 0) as active_shifts,
        -- Check if there's a recent shift to determine activity type
        recent_shifts.most_recent_shift
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN (
        SELECT
          job_id,
          COUNT(*) as shift_count
        FROM shifts
        GROUP BY job_id
      ) shift_counts ON j.id = shift_counts.job_id
      LEFT JOIN (
        SELECT
          job_id,
          MAX(date) as most_recent_shift
        FROM shifts
        GROUP BY job_id
      ) recent_shifts ON j.id = recent_shifts.job_id
      LEFT JOIN (
        SELECT
          job_id,
          COUNT(*) as upcoming_count
        FROM shifts
        WHERE date >= CURRENT_DATE
        GROUP BY job_id
      ) upcoming_shifts ON j.id = upcoming_shifts.job_id
      LEFT JOIN (
        SELECT
          job_id,
          COUNT(*) as active_count
        FROM shifts
        WHERE date = CURRENT_DATE
        GROUP BY job_id
      ) active_shifts ON j.id = active_shifts.job_id
      ORDER BY last_activity DESC, j.created_at DESC
      LIMIT 50
    `);

    const jobs = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientName: row.client_name || row.company_name,
      status: row.status || 'Active',
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      shiftCount: parseInt(row.shift_count) || 0,
      lastActivity: row.last_activity,
      upcomingShifts: parseInt(row.upcoming_count) || 0,
      activeShifts: parseInt(row.active_count) || 0,
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
