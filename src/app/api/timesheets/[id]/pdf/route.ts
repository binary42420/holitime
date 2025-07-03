import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'
import { generateTimesheetPDF } from '@/lib/pdf-generator'
import { format } from 'date-fns'

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

    const { id } = await params;

    // Get timesheet with all related data
    const timesheetResult = await query(`
      SELECT
        t.*,
        s.id as shift_id, s.date, s.start_time, s.end_time, s.location, s.status as shift_status,
        j.id as job_id, j.name as job_name,
        c.id as client_company_id, c.company_name as client_name, c.contact_phone, c.contact_email,
        cc.id as crew_chief_id, cc.name as crew_chief_name, cc.avatar as crew_chief_avatar
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      JOIN users cc ON s.crew_chief_id = cc.id
      WHERE t.id = $1
    `, [id]);

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    const row = timesheetResult.rows[0];

    // Check permissions
    const hasAccess =
      user.role === 'Manager/Admin' ||
      (user.role === 'Crew Chief' && row.crew_chief_id === user.id) ||
      (user.role === 'Client' && row.client_id === user.clientId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get assigned personnel and their time entries
    const personnelResult = await query(`
      SELECT 
        ap.id, ap.role_on_shift, ap.role_code, ap.status,
        u.id as employee_id, u.name as employee_name, u.avatar as employee_avatar,
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
      GROUP BY ap.id, ap.role_on_shift, ap.role_code, ap.status, u.id, u.name, u.avatar
      ORDER BY u.name ASC
    `, [row.shift_id]);

    // Format data for PDF generation
    const timesheetData = {
      id: row.id,
      shift: {
        id: row.shift_id,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        job: {
          name: row.job_name,
          client: {
            name: row.client_name,
            contactPerson: row.contact_person,
            contactEmail: row.contact_email
          }
        },
        crewChief: {
          name: row.crew_chief_name
        }
      },
      assignedPersonnel: personnelResult.rows.map(person => ({
        id: person.id,
        employeeName: person.employee_name,
        roleOnShift: person.role_on_shift,
        roleCode: person.role_code,
        status: person.status,
        timeEntries: person.time_entries
      })),
      status: row.status,
      createdAt: row.created_at
    };

    // Generate PDF
    const doc = generateTimesheetPDF(timesheetData);
    const pdfBuffer = doc.output('arraybuffer');

    // Create filename
    const filename = `timesheet-${row.client_name.replace(/\s+/g, '-')}-${format(new Date(row.date), 'yyyy-MM-dd')}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating timesheet PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
