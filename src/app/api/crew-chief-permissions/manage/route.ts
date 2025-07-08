import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (user?.role !== 'Manager/Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const permissionType = searchParams.get('permissionType');
  const targetId = searchParams.get('targetId');

  if (!permissionType || !targetId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const permissionsQuery = `
      SELECT p.*, u.name as user_name, u.role as user_role
      FROM crew_chief_permissions p
      JOIN users u ON p.user_id = u.id
      WHERE p.permission_type = $1 AND p.target_id = $2
    `;
    const permissionsResult = await query(permissionsQuery, [permissionType, targetId]);

    const usersQuery = `
      SELECT id, name, role, crew_chief_eligible, fork_operator_eligible
      FROM users
      WHERE role = 'Employee' OR role = 'Crew Chief'
    `;
    const usersResult = await query(usersQuery);

    return NextResponse.json({
      permissions: permissionsResult.rows,
      eligibleUsers: usersResult.rows,
    });
  } catch (error) {
    console.error('Error fetching permission data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}