import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function POST(
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

    // Only crew chiefs and managers can manage time
    if (!['Crew Chief', 'Manager/Admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Find the active time entry
    const activeEntryResult = await query(`
      SELECT id, entry_number FROM time_entries 
      WHERE assigned_personnel_id = $1 AND is_active = true
    `, [workerId]);

    if (activeEntryResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No active clock-in found for this employee' },
        { status: 400 }
      );
    }

    const activeEntry = activeEntryResult.rows[0];
    const now = new Date().toISOString();

    // Update the time entry with clock out time
    await query(`
      UPDATE time_entries 
      SET clock_out = $1, is_active = false, updated_at = NOW()
      WHERE id = $2
    `, [now, activeEntry.id]);

    return NextResponse.json({
      success: true,
      message: 'Employee clocked out successfully',
    });
  } catch (error) {
    console.error('Error clocking out employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
