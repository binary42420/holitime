import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withCrewChiefPermission } from '@/lib/utils/crew-chief-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shiftId } = await params;

  return withCrewChiefPermission(shiftId, async (session, permissionCheck) => {
    try {

    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // If there's an active entry, clock them out first
    const activeEntryResult = await query(`
      SELECT id FROM time_entries 
      WHERE assigned_personnel_id = $1 AND is_active = true
    `, [workerId]);

    if (activeEntryResult.rows.length > 0) {
      await query(`
        UPDATE time_entries 
        SET clock_out = $1, is_active = false, updated_at = NOW()
        WHERE assigned_personnel_id = $2 AND is_active = true
      `, [now, workerId]);
    }

    // Update the assigned personnel status to indicate shift ended
    await query(`
      UPDATE assigned_personnel 
      SET status = 'Shift Ended', updated_at = NOW()
      WHERE id = $1
    `, [workerId]);

    return NextResponse.json({
      success: true,
      message: 'Employee shift ended successfully',
      });
    } catch (error) {
      console.error('Error ending employee shift:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
