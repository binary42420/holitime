import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const shiftId = await params.then(p => p.id);



    // First get the regular assigned personnel
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
              'isActive', (te.clock_in IS NOT NULL AND te.clock_out IS NULL)
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
    `, [shiftId]);

    // Get the crew chief from the shifts table
    const crewChiefResult = await query(`
      SELECT
        s.crew_chief_id,
        u.name as crew_chief_name,
        u.avatar as crew_chief_avatar
      FROM shifts s
      LEFT JOIN users u ON s.crew_chief_id = u.id
      WHERE s.id = $1 AND s.crew_chief_id IS NOT NULL
    `, [shiftId]);



    const assignedPersonnel = result.rows.map(row => {
      // Determine status based on time entries
      const timeEntries = row.time_entries || [];
      let status = 'not_started';

      // Check if any entry is currently active (clocked in)
      const hasActiveEntry = timeEntries.some((entry: any) => entry.isActive);
      if (hasActiveEntry) {
        status = 'Clocked In';
      } else if (timeEntries.length > 0) {
        // Check if shift has been ended
        if (row.status === 'Shift Ended' || row.status === 'shift_ended') {
          status = 'Shift Ended';
        } else {
          status = 'Clocked Out';
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

    // Add crew chief as a special assignment if one exists and not already in assigned personnel
    if (crewChiefResult.rows.length > 0) {
      const crewChief = crewChiefResult.rows[0];

      // Check if crew chief is already in assigned personnel
      const existingCrewChief = assignedPersonnel.find(ap => ap.employeeId === crewChief.crew_chief_id);

      if (!existingCrewChief) {
        // Get crew chief's time entries
        const crewChiefTimeEntries = await query(`
          SELECT
            te.id,
            te.entry_number,
            te.clock_in,
            te.clock_out,
            (te.clock_in IS NOT NULL AND te.clock_out IS NULL) as is_active
          FROM time_entries te
          JOIN assigned_personnel ap ON te.assigned_personnel_id = ap.id
          WHERE ap.shift_id = $1 AND ap.employee_id = $2
          ORDER BY te.entry_number
        `, [shiftId, crewChief.crew_chief_id]);

        const timeEntries = crewChiefTimeEntries.rows.map(entry => ({
          id: entry.id,
          entryNumber: entry.entry_number,
          clockIn: entry.clock_in,
          clockOut: entry.clock_out,
          isActive: entry.is_active,
        }));

        // Determine status based on time entries
        let status = 'Clocked Out';
        const hasActiveEntry = timeEntries.some(entry => entry.isActive);
        if (hasActiveEntry) {
          status = 'Clocked In';
        } else if (timeEntries.length > 0) {
          status = 'Clocked Out';
        } else {
          status = 'Clocked Out';
        }

        assignedPersonnel.unshift({
          id: `crew-chief-${crewChief.crew_chief_id}`, // Special ID to identify crew chief
          employeeId: crewChief.crew_chief_id,
          employeeName: crewChief.crew_chief_name,
          employeeAvatar: crewChief.crew_chief_avatar,
          roleOnShift: 'Crew Chief',
          roleCode: 'CC',
          status,
          timeEntries
        });
      }
    }

    console.log('Final assigned personnel response:', assignedPersonnel);

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
