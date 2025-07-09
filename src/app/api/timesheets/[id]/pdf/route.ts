import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { query } from '@/lib/db'

// GET /api/timesheets/[id]/pdf - Download PDF from database
export async function GET(
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

    // Get timesheet with pdf_url and access control info
    const timesheetResult = await query(`
      SELECT
        t.id,
        t.pdf_url,
        s.crew_chief_id,
        j.client_id
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

    const row = timesheetResult.rows[0];

    // Check permissions
    const hasAccess =
      user.role === 'Manager/Admin' ||
      user.id === row.crew_chief_id ||
      (user.role === 'Client' && user.clientCompanyId === row.client_id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if PDF URL exists
    if (!row.pdf_url) {
      return NextResponse.json(
        { error: 'PDF not available for this timesheet.' },
        { status: 404 }
      );
    }

    // Redirect to the Google Drive URL
    return NextResponse.redirect(row.pdf_url, 307);
  } catch (error) {
    console.error('Error generating timesheet PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
