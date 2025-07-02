import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  grantCrewChiefPermission, 
  revokeCrewChiefPermission, 
  getUserCrewChiefPermissions,
  getPermissionsForTarget 
} from '@/lib/services/crew-chief-permissions';
import type { CrewChiefPermissionType } from '@/lib/types';

// GET /api/crew-chief-permissions - Get permissions for a user or target
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can view permissions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const permissionType = searchParams.get('permissionType') as CrewChiefPermissionType;
    const targetId = searchParams.get('targetId');

    if (userId) {
      // Get permissions for a specific user
      const permissions = await getUserCrewChiefPermissions(userId);
      return NextResponse.json({ permissions });
    } else if (permissionType && targetId) {
      // Get permissions for a specific target
      const permissions = await getPermissionsForTarget(permissionType, targetId);
      return NextResponse.json({ permissions });
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error getting crew chief permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/crew-chief-permissions - Grant a crew chief permission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can grant permissions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissionType, targetId } = body;

    if (!userId || !permissionType || !targetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate permission type
    if (!['client', 'job', 'shift'].includes(permissionType)) {
      return NextResponse.json({ error: 'Invalid permission type' }, { status: 400 });
    }

    const permission = await grantCrewChiefPermission(
      userId,
      permissionType,
      targetId,
      session.user.id
    );

    if (!permission) {
      return NextResponse.json({ error: 'Failed to grant permission' }, { status: 500 });
    }

    return NextResponse.json({ permission }, { status: 201 });
  } catch (error) {
    console.error('Error granting crew chief permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/crew-chief-permissions - Revoke a crew chief permission
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers/admins can revoke permissions
    if (session.user.role !== 'Manager/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const permissionType = searchParams.get('permissionType') as CrewChiefPermissionType;
    const targetId = searchParams.get('targetId');

    if (!userId || !permissionType || !targetId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const success = await revokeCrewChiefPermission(userId, permissionType, targetId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to revoke permission' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking crew chief permission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
