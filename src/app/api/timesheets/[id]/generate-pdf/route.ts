import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';
import { generateTimesheetPDF } from '@/lib/pdf-generator';
import { format } from 'date-fns';

// POST /api/timesheets/[id]/generate-pdf - Generate and store PDF in database
export async function POST(
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

    const { id: timesheetId } = await params;

    // Get timesheet data for PDF generation
    const timesheetResult = await query(`
      SELECT 
        t.id,
        t.status,
        t.client_signature,
        t.manager_signature,
        t.client_approved_at,
        t.manager_approved_at,
        t.submitted_by,
        t.submitted_at,
        s.id as shift_id,
        s.date,
        s.start_time,
        s.end_time,
        s.location,
        s.crew_chief_id,
        j.id as job_id,
        j.name as job_name,
        c.id as client_id,
        c.company_name as client_name,
        c.contact_person as client_contact,
        cc.name as crew_chief_name
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      LEFT JOIN users cc ON s.crew_chief_id = cc.id
      WHERE t.id = $1
    `, [timesheetId]);

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    const timesheet = timesheetResult.rows[0];

    // Check permissions
    const hasAccess = 
      user.role === 'Manager/Admin' ||
      user.id === timesheet.crew_chief_id ||
      (user.role === 'Client' && user.client_company_id === timesheet.client_id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get assigned personnel with time entries
    const personnelResult = await query(`
      SELECT 
        ap.id as assignment_id,
        ap.role_on_shift,
        ap.role_code,
        u.id as employee_id,
        u.name as employee_name,
        u.avatar as employee_avatar,
        te.id as time_entry_id,
        te.entry_number,
        te.clock_in,
        te.clock_out
      FROM assigned_personnel ap
      JOIN users u ON ap.employee_id = u.id
      LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
      WHERE ap.shift_id = $1
      ORDER BY u.name, te.entry_number
    `, [timesheet.shift_id]);

    // Group time entries by employee
    const employeeMap = new Map();
    
    personnelResult.rows.forEach(row => {
      if (!employeeMap.has(row.employee_id)) {
        employeeMap.set(row.employee_id, {
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          employeeAvatar: row.employee_avatar,
          roleOnShift: row.role_on_shift,
          roleCode: row.role_code,
          timeEntries: []
        });
      }
      
      if (row.time_entry_id) {
        employeeMap.get(row.employee_id).timeEntries.push({
          id: row.time_entry_id,
          entryNumber: row.entry_number,
          clockIn: row.clock_in,
          clockOut: row.clock_out
        });
      }
    });

    const assignedPersonnel = Array.from(employeeMap.values());

    // Calculate total hours for each employee
    assignedPersonnel.forEach(employee => {
      let totalMinutes = 0;
      
      employee.timeEntries.forEach(entry => {
        if (entry.clockIn && entry.clockOut) {
          const clockIn = new Date(entry.clockIn);
          const clockOut = new Date(entry.clockOut);
          const diffMs = clockOut.getTime() - clockIn.getTime();
          totalMinutes += Math.floor(diffMs / (1000 * 60));
        }
      });
      
      employee.totalHours = (totalMinutes / 60).toFixed(2);
      employee.totalMinutes = totalMinutes;
    });

    // Calculate grand total hours
    const grandTotalMinutes = assignedPersonnel.reduce((sum, emp) => sum + (emp.totalMinutes || 0), 0);
    const grandTotalHours = (grandTotalMinutes / 60).toFixed(2);

    // Prepare data for PDF generation
    const pdfData = {
      timesheet: {
        id: timesheet.id,
        status: timesheet.status,
        clientSignature: timesheet.client_signature,
        managerSignature: timesheet.manager_signature,
        clientApprovedAt: timesheet.client_approved_at,
        managerApprovedAt: timesheet.manager_approved_at,
        submittedBy: timesheet.submitted_by,
        submittedAt: timesheet.submitted_at
      },
      shift: {
        id: timesheet.shift_id,
        date: timesheet.date,
        startTime: timesheet.start_time,
        endTime: timesheet.end_time,
        location: timesheet.location,
        crewChiefName: timesheet.crew_chief_name
      },
      job: {
        id: timesheet.job_id,
        name: timesheet.job_name,
        client: {
          id: timesheet.client_id,
          name: timesheet.client_name,
          contactPerson: timesheet.client_contact
        }
      },
      assignedPersonnel,
      totals: {
        grandTotalHours,
        grandTotalMinutes,
        employeeCount: assignedPersonnel.length
      }
    };

    // Generate PDF
    const doc = generateTimesheetPDF(pdfData);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Create filename
    const filename = `timesheet-${timesheet.client_name.replace(/\s+/g, '-')}-${format(new Date(timesheet.date), 'yyyy-MM-dd')}.pdf`;

    // Store PDF in database
    await query(`
      UPDATE timesheets
      SET 
        pdf_data = $1,
        pdf_filename = $2,
        pdf_content_type = 'application/pdf',
        pdf_generated_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `, [pdfBuffer, filename, timesheetId]);

    console.log(`PDF generated and stored for timesheet ${timesheetId}, size: ${pdfBuffer.length} bytes`);

    return NextResponse.json({
      success: true,
      message: 'PDF generated and stored successfully',
      filename,
      size: pdfBuffer.length
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
