import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE n.user_id = $1';
    const params = [user.id];

    if (unreadOnly) {
      whereClause += ' AND n.is_read = false';
    }

    const result = await query(`
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.related_timesheet_id,
        n.related_shift_id,
        n.is_read,
        n.created_at,
        t.status as timesheet_status,
        s.date as shift_date,
        j.name as job_name,
        c.company_name as client_name
      FROM notifications n
      LEFT JOIN timesheets t ON n.related_timesheet_id = t.id
      LEFT JOIN shifts s ON n.related_shift_id = s.id
      LEFT JOIN jobs j ON s.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    // Get unread count
    const unreadCountResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `, [user.id]);

    return NextResponse.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].unread_count),
      total: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      type, 
      title, 
      message, 
      relatedTimesheetId, 
      relatedShiftId 
    } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        related_timesheet_id, 
        related_shift_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [userId, type, title, message, relatedTimesheetId || null, relatedShiftId || null]);

    return NextResponse.json({
      success: true,
      notification: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
