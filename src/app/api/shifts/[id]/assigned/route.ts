import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get assigned personnel with their time entries
    const result = await query(`
      SELECT 
        ap.id,
        ap.employee_id,
        ap.role_on_shift,
        ap.role_code,
        ap.status,
        u.name as employee_name,
        u.avatar as employee_avatar,
        COALESCE(
          json_agg(
            json_build_object(
              'id', te.id,
              'entryNumber', te.entry_number,
              'clockIn', te.clock_in,
              'clockOut', te.clock_out,
              'isActive', te.is_active
            ) ORDER BY te.entry_number
          ) FILTER (WHERE te.id IS NOT NULL),
          '[]'::json
        ) as time_entries
      FROM assigned_personnel ap
      JOIN users u ON ap.employee_id = u.id
      LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
      WHERE ap.shift_id = $1
      GROUP BY ap.id, ap.employee_id, ap.role_on_shift, ap.role_code, ap.status, u.name, u.avatar
      ORDER BY u.name ASC
    `, [params.id]);

    const assignedPersonnel = result.rows.map(row => {
      // Determine status based on time entries
      const timeEntries = row.time_entries || [];
      let status = 'not_started';
      
      // Check if any entry is currently active (clocked in)
      const hasActiveEntry = timeEntries.some((entry: any) => entry.isActive);
      if (hasActiveEntry) {
        status = 'clocked_in';
      } else if (timeEntries.length > 0) {
        // Check if shift has been ended
        if (row.status === 'Shift Ended') {
          status = 'shift_ended';
        } else {
          status = 'clocked_out';
        }
      }

      return {
        id: row.id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeAvatar: row.employee_avatar,
        roleOnShift: row.role_on_shift,
        roleCode: row.role_code,
        status,
        timeEntries: timeEntries.map((entry: any) => ({
          id: entry.id,
          entryNumber: entry.entryNumber,
          clockIn: entry.clockIn,
          clockOut: entry.clockOut,
          isActive: entry.isActive,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      assignedPersonnel,
    });
  } catch (error) {
    console.error('Error getting assigned personnel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
