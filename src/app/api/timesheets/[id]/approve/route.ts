import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

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

    const { id } = await params;
    const body = await request.json();
    const { signature, approvalType } = body;

    // Get the timesheet
    const timesheetResult = await query(`
      SELECT t.*, s.crew_chief_id, j.client_id
      FROM timesheets t
      JOIN shifts s ON t.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      WHERE t.id = $1
    `, [id]);

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    const timesheet = timesheetResult.rows[0];

    if (approvalType === 'client') {
      // Client approval
      if (timesheet.status !== 'pending_client_approval') {
        return NextResponse.json(
          { error: 'Timesheet is not pending client approval' },
          { status: 400 }
        );
      }

      // Check if user has permission (manager, crew chief, or client user)
      const hasPermission = 
        user.role === 'Manager/Admin' ||
        (user.role === 'Crew Chief' && timesheet.crew_chief_id === user.id) ||
        user.role === 'Client';

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Update timesheet with client approval
      await query(`
        UPDATE timesheets
        SET status = 'pending_final_approval',
            client_approved_by = $1,
            client_approved_at = NOW(),
            client_signature = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [user.id, signature, id]);

      // Create notifications for managers for final approval
      const managersResult = await query(`
        SELECT id, name
        FROM users
        WHERE role = 'Manager/Admin'
      `);

      for (const manager of managersResult.rows) {
        await query(`
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            related_timesheet_id,
            related_shift_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          manager.id,
          'timesheet_ready_for_approval',
          'Timesheet Ready for Final Approval',
          `Timesheet has been approved by client and is ready for final approval.`,
          id,
          timesheet.shift_id
        ]);
      }

      return NextResponse.json({
        success: true,
        message: 'Timesheet approved by client',
      });

    } else if (approvalType === 'manager') {
      // Manager approval
      if (timesheet.status !== 'pending_final_approval') {
        return NextResponse.json(
          { error: 'Timesheet is not pending final approval' },
          { status: 400 }
        );
      }

      // Only managers can do final approval
      if (user.role !== 'Manager/Admin') {
        return NextResponse.json(
          { error: 'Only managers can provide final approval' },
          { status: 403 }
        );
      }

      // Update timesheet with manager approval
      await query(`
        UPDATE timesheets
        SET status = 'completed',
            manager_approved_by = $1,
            manager_approved_at = NOW(),
            manager_signature = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [user.id, signature, id]);

      // Generate PDF after final approval
      try {
        // Import the PDF generation logic directly instead of making HTTP call
        const { generateTimesheetPDF } = await import('@/lib/pdf-generator');

        // Get timesheet data for PDF generation
        const pdfDataResult = await query(`
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
        `, [id]);

        if (pdfDataResult.rows.length > 0) {
          const timesheetData = pdfDataResult.rows[0];

          // Get assigned personnel and time entries
          const personnelResult = await query(`
            SELECT
              ap.id, ap.role_on_shift, ap.role_code,
              u.name as employee_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'entryNumber', te.entry_number,
                    'clockIn', te.clock_in,
                    'clockOut', te.clock_out
                  ) ORDER BY te.entry_number
                ) FILTER (WHERE te.id IS NOT NULL),
                '[]'::json
              ) as time_entries
            FROM assigned_personnel ap
            JOIN users u ON ap.employee_id = u.id
            LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
            WHERE ap.shift_id = $1
            GROUP BY ap.id, ap.role_on_shift, ap.role_code, u.name
            ORDER BY u.name ASC
          `, [timesheet.shift_id]);

          // Generate PDF
          const pdfData = {
            timesheet: timesheetData,
            assignedPersonnel: personnelResult.rows
          };

          const pdf = generateTimesheetPDF(pdfData);
          const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

          // Store PDF in database
          const filename = `timesheet-${timesheetData.client_name.replace(/\s+/g, '-')}-${timesheetData.shift_date}.pdf`;

          await query(`
            UPDATE timesheets
            SET pdf_data = $1,
                pdf_filename = $2,
                pdf_content_type = 'application/pdf',
                pdf_generated_at = NOW()
            WHERE id = $3
          `, [pdfBuffer, filename, id]);

          console.log(`PDF generated and stored for completed timesheet ${id}`);
        }
      } catch (error) {
        console.error(`Error generating PDF for timesheet ${id}:`, error);
        // Don't fail the approval if PDF generation fails
      }

      // Update shift status to completed
      await query(`
        UPDATE shifts 
        SET status = 'Completed',
            updated_at = NOW()
        WHERE id = $1
      `, [timesheet.shift_id]);

      return NextResponse.json({
        success: true,
        message: 'Timesheet approved by manager',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid approval type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error approving timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();
    const { reason } = body;

    // Only managers can reject timesheets
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Only managers can reject timesheets' },
        { status: 403 }
      );
    }

    // Get the timesheet
    const timesheetResult = await query(`
      SELECT * FROM timesheets WHERE id = $1
    `, [id]);

    if (timesheetResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Timesheet not found' },
        { status: 404 }
      );
    }

    const timesheet = timesheetResult.rows[0];

    if (!['pending_client_approval', 'pending_manager_approval'].includes(timesheet.status)) {
      return NextResponse.json(
        { error: 'Timesheet cannot be rejected in current status' },
        { status: 400 }
      );
    }

    // Update timesheet with rejection
    await query(`
      UPDATE timesheets 
      SET status = 'rejected',
          rejection_reason = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [reason, id]);

    // Update shift status back to in progress
    await query(`
      UPDATE shifts 
      SET status = 'In Progress',
          updated_at = NOW()
      WHERE id = $1
    `, [timesheet.shift_id]);

    return NextResponse.json({
      success: true,
      message: 'Timesheet rejected',
    });

  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
