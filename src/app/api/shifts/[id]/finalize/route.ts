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

    // Only crew chiefs and managers can finalize shifts
    if (!['Crew Chief', 'Manager/Admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id: shiftId } = await params;

    const { id } = await params;

    // Check if shift exists
    const shiftResult = await query(`
      SELECT id, status FROM shifts WHERE id = $1
    `, [id]);

    if (shiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      );
    }

    const shift = shiftResult.rows[0];

    // Check if timesheet already exists
    const existingTimesheetResult = await query(`
      SELECT id FROM timesheets WHERE shift_id = $1
    `, [shiftId]);

    let timesheetId;

    if (existingTimesheetResult.rows.length > 0) {
      // Update existing timesheet
      timesheetId = existingTimesheetResult.rows[0].id;
      await query(`
        UPDATE timesheets 
        SET status = 'pending_client_approval', 
            submitted_by = $1, 
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
      `, [user.id, timesheetId]);
    } else {
      // Create new timesheet
      const newTimesheetResult = await query(`
        INSERT INTO timesheets (shift_id, status, submitted_by, submitted_at)
        VALUES ($1, 'pending_client_approval', $2, NOW())
        RETURNING id
      `, [shiftId, user.id]);
      
      timesheetId = newTimesheetResult.rows[0].id;
    }

    // Update shift status
    await query(`
      UPDATE shifts
      SET status = 'Pending Approval', updated_at = NOW()
      WHERE id = $1
    `, [shiftId]);

    return NextResponse.json({
      success: true,
      message: 'Shift finalized and sent for client approval',
      timesheetId,
    });
  } catch (error) {
    console.error('Error finalizing shift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
