import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { deleteShiftCascade, getDeletionImpact } from '@/lib/services/cascade-deletion';
import { query } from '@/lib/db';

// GET /api/cascade-delete/shift/[id] - Get deletion impact preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can perform cascade deletions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: shiftId } = await params;
    
    const impact = await getDeletionImpact('shift', shiftId);
    
    return NextResponse.json({ impact });
  } catch (error) {
    console.error('Error getting shift deletion impact:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/cascade-delete/shift/[id] - Perform cascade deletion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can perform cascade deletions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: shiftId } = await params;
    
    // Get confirmation from request body
    const body = await request.json();
    const { confirmed, confirmationText } = body;

    // Fetch the shift's name to confirm deletion
    const shiftResult = await query(`
      SELECT j.name as job_name, s.date
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.id = $1
    `, [shiftId]);

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const shiftName = `${shiftResult.rows[0].job_name} on ${shiftResult.rows[0].date}`;

    if (!confirmed || confirmationText !== shiftName) {
      return NextResponse.json({ 
        error: `Deletion not confirmed. Please type "${shiftName}" to confirm.` 
      }, { status: 400 });
    }
    
    const result = await deleteShiftCascade(shiftId, session.user.id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        deletedCounts: result.deletedCounts
      });
    } else {
      return NextResponse.json({
        error: result.message,
        details: result.error
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in shift cascade deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
