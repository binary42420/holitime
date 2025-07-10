import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, getClient } from '@/lib/db';
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

      await withTransaction(async (client) => {
        const now = new Date();

        // If there's an active entry, clock them out first
        await client.query(`
          UPDATE time_entries 
          SET clock_out = $1, is_active = false, updated_at = $1
          WHERE assigned_personnel_id = $2 AND is_active = true
        `, [now, workerId]);

        // Update the assigned personnel status to indicate shift ended
        await client.query(`
          UPDATE assigned_personnel 
          SET status = 'shift_ended', updated_at = $1
          WHERE id = $2
        `, [now, workerId]);
      });

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
