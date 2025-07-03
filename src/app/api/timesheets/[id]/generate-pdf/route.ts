import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import jsPDF from 'jspdf';
import { formatTo12Hour, formatDate, getTimeEntryDisplay } from '@/lib/time-utils';

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
        t.*,
        s.date as shift_date,
        s.start_time,
        s.end_time,
        s.location,
        j.name as job_name,
        j.po_number,
        c.company_name as client_name,
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

    // Get employee time entries
    const timeEntriesResult = await query(`
      SELECT
        u.name as employee_name,
        ap.role_on_shift,
        te.clock_in,
        te.clock_out,
        te.entry_number
      FROM time_entries te
      JOIN assigned_personnel ap ON te.assigned_personnel_id = ap.id
      JOIN users u ON ap.employee_id = u.id
      WHERE ap.shift_id = $1
      ORDER BY u.name, te.entry_number
    `, [timesheet.shift_id]);

    // Group time entries by employee
    const employeeEntries = timeEntriesResult.rows.reduce((acc, entry) => {
      if (!acc[entry.employee_name]) {
        acc[entry.employee_name] = {
          name: entry.employee_name,
          role: entry.role_on_shift,
          timeEntries: []
        };
      }
      acc[entry.employee_name].timeEntries.push({
        clockIn: entry.clock_in,
        clockOut: entry.clock_out
      });
      return acc;
    }, {} as Record<string, any>);

    // Create PDF using jsPDF with Hands On Labor template
    const pdf = new jsPDF('portrait', 'pt', 'letter');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Set up fonts and colors
    pdf.setFont('helvetica');

    // Header - HOLI TIMESHEET
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HOLI TIMESHEET', pageWidth / 2, 60, { align: 'center' });

    // Company info section
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');

    // Left side - Client info
    let yPos = 100;
    pdf.text('PO#:', 50, yPos);
    pdf.text(timesheet.po_number || 'N/A', 100, yPos);

    yPos += 20;
    pdf.text('Job#:', 50, yPos);
    pdf.text(timesheet.job_name || 'N/A', 100, yPos);

    yPos += 20;
    pdf.text('Client:', 50, yPos);
    pdf.text(timesheet.client_name || 'N/A', 100, yPos);

    yPos += 20;
    pdf.text('Location:', 50, yPos);
    pdf.text(timesheet.location || 'N/A', 100, yPos);

    // Right side - Date/Time info
    yPos = 100;
    pdf.text('Date:', 350, yPos);
    pdf.text(formatDate(timesheet.shift_date), 400, yPos);

    yPos += 20;
    pdf.text('Start Time:', 350, yPos);
    pdf.text(formatTo12Hour(timesheet.start_time), 420, yPos);

    yPos += 20;
    pdf.text('End Time:', 350, yPos);
    pdf.text(formatTo12Hour(timesheet.end_time), 420, yPos);

    // Employee table header
    yPos = 220;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');

    // Draw table header
    pdf.rect(50, yPos - 15, pageWidth - 100, 25);
    pdf.text('Employee Name', 60, yPos);
    pdf.text('Job Title', 200, yPos);
    pdf.text('Initials', 300, yPos);
    pdf.text('IN', 350, yPos);
    pdf.text('OUT', 420, yPos);
    pdf.text('Regular', 470, yPos);
    pdf.text('OT', 520, yPos);

    // Employee rows
    yPos += 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    let totalRegularHours = 0;
    let totalOTHours = 0;

    Object.values(employeeEntries).forEach((employee: any) => {
      // Calculate total hours for this employee
      let employeeTotalHours = 0;
      employee.timeEntries.forEach((entry: any) => {
        const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
        employeeTotalHours += display.totalHours;
      });

      // Determine regular vs overtime (assuming 8 hours regular, rest overtime)
      const regularHours = Math.min(employeeTotalHours, 8);
      const otHours = Math.max(employeeTotalHours - 8, 0);

      totalRegularHours += regularHours;
      totalOTHours += otHours;

      // Draw employee row
      pdf.rect(50, yPos - 15, pageWidth - 100, 25);

      pdf.text(employee.name, 60, yPos);
      pdf.text(employee.role, 200, yPos);
      pdf.text(employee.name.split(' ').map((n: string) => n[0]).join(''), 300, yPos); // Initials

      // Time entries (show first entry, or combine if multiple)
      if (employee.timeEntries.length > 0) {
        const firstEntry = employee.timeEntries[0];
        const display = getTimeEntryDisplay(firstEntry.clockIn, firstEntry.clockOut);
        pdf.text(display.displayClockIn, 350, yPos);
        pdf.text(display.displayClockOut, 420, yPos);
      }

      pdf.text(regularHours.toFixed(2), 470, yPos);
      pdf.text(otHours.toFixed(2), 520, yPos);

      yPos += 25;
    });

    // Total row
    pdf.setFont('helvetica', 'bold');
    pdf.rect(50, yPos - 15, pageWidth - 100, 25);
    pdf.text('TOTAL HOURS:', 300, yPos);
    pdf.text(totalRegularHours.toFixed(2), 470, yPos);
    pdf.text(totalOTHours.toFixed(2), 520, yPos);

    // Client signature section
    yPos += 60;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);

    pdf.text('Client Name: ________________________________', 50, yPos);

    yPos += 40;
    pdf.text('Client Signature:', 50, yPos);

    // Add client signature if available
    if (timesheet.client_signature) {
      try {
        pdf.addImage(timesheet.client_signature, 'PNG', 150, yPos - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add client signature to PDF:', error);
      }
    }

    yPos += 60;
    pdf.text('Date: ________________', 50, yPos);

    // Manager signature section (if available)
    if (timesheet.manager_signature) {
      yPos += 40;
      pdf.text('Manager Signature:', 50, yPos);

      try {
        pdf.addImage(timesheet.manager_signature, 'PNG', 150, yPos - 20, 200, 40);
      } catch (error) {
        console.warn('Failed to add manager signature to PDF:', error);
      }
    }

    // Footer
    yPos = pageHeight - 80;
    pdf.setFontSize(8);
    pdf.text('HANDS ON LABOR INTERNATIONAL', pageWidth / 2, yPos, { align: 'center' });
    pdf.text('Phone: (555) 123-4567 • Fax: (555) 123-4568', pageWidth / 2, yPos + 15, { align: 'center' });
    pdf.text('123 Labor Street, Work City, ST 12345', pageWidth / 2, yPos + 30, { align: 'center' });

    yPos += 45;
    pdf.text('White Copy - HANDS ON, Yellow Copy - Client', pageWidth / 2, yPos, { align: 'center' });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Store PDF in database
    const filename = `timesheet-${timesheet.client_name.replace(/\s+/g, '-')}-${formatDate(timesheet.shift_date).replace(/\//g, '-')}.pdf`;

    await query(`
      UPDATE timesheets
      SET pdf_data = $1,
          pdf_filename = $2,
          pdf_content_type = 'application/pdf',
          pdf_generated_at = NOW()
      WHERE id = $3
    `, [pdfBuffer, filename, timesheetId]);

    return NextResponse.json({
      success: true,
      message: 'PDF generated and stored successfully',
      filename: filename
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
