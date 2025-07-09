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

      // New: Gather data and call Google Apps Script
      try {
        // 1. Gather all necessary data
        const shiftDetailsResult = await query(`
          SELECT
            s.date,
            s.start_time,
            s.end_time,
            j.name as job_name,
            j.po_number as client_po,
            c.company_name as client_name
          FROM shifts s
          JOIN jobs j ON s.job_id = j.id
          JOIN clients c ON j.client_id = c.id
          WHERE s.id = $1
        `, [timesheet.shift_id]);

        const timeEntriesResult = await query(`
          SELECT
            u.name as employee_name,
            te.clock_in,
            te.clock_out,
            te.role_on_shift
          FROM time_entries te
          JOIN users u ON te.user_id = u.id
          WHERE te.shift_id = $1
          ORDER BY u.name, te.clock_in
        `, [timesheet.shift_id]);

        if (shiftDetailsResult.rows.length === 0) {
          throw new Error('Shift details not found');
        }

        const shiftDetails = shiftDetailsResult.rows[0];
        const employeeTimes = timeEntriesResult.rows.map(entry => ({
          name: entry.employee_name,
          clockIn: entry.clock_in,
          clockOut: entry.clock_out,
          role: entry.role_on_shift,
        }));

        // 2. Construct payload
        const payload = {
          apiKey: process.env.GOOGLE_APPS_SCRIPT_API_KEY,
          clientName: shiftDetails.client_name,
          clientPO: shiftDetails.client_po,
          jobNo: shiftDetails.job_name, // Assuming job_name is the job number
          date: shiftDetails.date,
          shiftStartTime: shiftDetails.start_time,
          shiftEndTime: shiftDetails.end_time,
          employeeTimes: employeeTimes,
          clientSignatureBase64: timesheet.client_signature,
          managerSignatureBase64: signature, // The new manager signature
        };

        // 3. Call Google Apps Script
        const scriptResponse = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        // 4. Handle response
        if (scriptResponse.ok) {
          const result = await scriptResponse.json();
          if (result.status === 'success' && result.pdfUrl) {
            // 5. Save PDF URL to the database
            await query(`
              UPDATE timesheets
              SET pdf_url = $1
              WHERE id = $2
            `, [result.pdfUrl, id]);
            console.log(`Successfully generated and saved PDF URL for timesheet ${id}`);
          } else {
            throw new Error(result.message || 'Failed to get PDF URL from Apps Script');
          }
        } else {
          const errorText = await scriptResponse.text();
          throw new Error(`Google Apps Script request failed: ${scriptResponse.status} ${errorText}`);
        }
      } catch (error) {
        console.error(`Error generating PDF for timesheet ${id} via Apps Script:`, error);
        // Continue without failing the entire approval process
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
