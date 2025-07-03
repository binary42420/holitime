import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
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

    // Verify the notification belongs to the current user
    const notificationResult = await query(`
      SELECT id, user_id, is_read
      FROM notifications
      WHERE id = $1
    `, [id]);

    if (notificationResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = notificationResult.rows[0];

    if (notification.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (notification.is_read) {
      return NextResponse.json({
        success: true,
        message: 'Notification already marked as read'
      });
    }

    // Mark as read
    await query(`
      UPDATE notifications
      SET is_read = true, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications/mark-all-read - Mark all notifications as read for current user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await query(`
      UPDATE notifications
      SET is_read = true, updated_at = NOW()
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `, [user.id]);

    return NextResponse.json({
      success: true,
      message: `Marked ${result.rows.length} notifications as read`
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
