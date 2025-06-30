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
        SET status = 'pending_manager_approval',
            client_approved_by = $1,
            client_approved_at = NOW(),
            client_signature = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [user.id, signature, id]);

      return NextResponse.json({
        success: true,
        message: 'Timesheet approved by client',
      });

    } else if (approvalType === 'manager') {
      // Manager approval
      if (timesheet.status !== 'pending_manager_approval') {
        return NextResponse.json(
          { error: 'Timesheet is not pending manager approval' },
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
