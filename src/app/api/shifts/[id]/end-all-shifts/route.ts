import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params

    await withTransaction(async (client) => {
      const now = new Date();
      
      // Get all assigned personnel for this shift who are not already ended
      const assignedPersonnelResult = await client.query(`
        SELECT id FROM assigned_personnel 
        WHERE shift_id = $1 AND status != 'Shift Ended'
      `, [shiftId]);

      if (assignedPersonnelResult.rows.length === 0) {
        return; // No active workers to end shifts for
      }

      const personnelIds = assignedPersonnelResult.rows.map(r => r.id);
      console.log(`Found ${personnelIds.length} active workers to end shifts for.`);

      // Clock out any active time entries for these workers
      const clockOutResult = await client.query(`
        UPDATE time_entries 
        SET clock_out = $1, is_active = false, updated_at = $1
        WHERE assigned_personnel_id = ANY($2::uuid[]) AND is_active = true
      `, [now, personnelIds]);
      console.log(`Clocked out ${clockOutResult.rowCount} active time entries.`);

      // Update status for all these workers to Shift Ended
      const updateStatusResult = await client.query(`
        UPDATE assigned_personnel 
        SET status = 'Shift Ended', updated_at = $1
        WHERE id = ANY($2::uuid[])
      `, [now, personnelIds]);
      console.log(`Updated status for ${updateStatusResult.rowCount} workers.`);
    });

    return NextResponse.json({
      success: true,
      message: `Ended all active shifts successfully.`
    });

  } catch (error) {
    console.error('Error ending all shifts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
