import { query } from '../db';
import type { CrewChiefPermission, CrewChiefPermissionCheck, CrewChiefPermissionType } from '../types';

// Grant crew chief permission
export async function grantCrewChiefPermission(
  userId: string,
  permissionType: CrewChiefPermissionType,
  targetId: string,
  grantedByUserId: string
): Promise<CrewChiefPermission | null> {
  try {
    // First revoke any existing permission of the same type for the same target
    await revokeCrewChiefPermission(userId, permissionType, targetId);
    
    const result = await query(`
      INSERT INTO crew_chief_permissions (user_id, permission_type, target_id, granted_by_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, permission_type, target_id, granted_by_user_id, granted_at, revoked_at
    `, [userId, permissionType, targetId, grantedByUserId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      permissionType: row.permission_type,
      targetId: row.target_id,
      grantedByUserId: row.granted_by_user_id,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
    };
  } catch (error) {
    console.error('Error granting crew chief permission:', error);
    return null;
  }
}

// Revoke crew chief permission
export async function revokeCrewChiefPermission(
  userId: string,
  permissionType: CrewChiefPermissionType,
  targetId: string
): Promise<boolean> {
  try {
    const result = await query(`
      UPDATE crew_chief_permissions 
      SET revoked_at = NOW()
      WHERE user_id = $1 AND permission_type = $2 AND target_id = $3 AND revoked_at IS NULL
    `, [userId, permissionType, targetId]);

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error revoking crew chief permission:', error);
    return false;
  }
}

// Get all active permissions for a user
export async function getUserCrewChiefPermissions(userId: string): Promise<CrewChiefPermission[]> {
  try {
    const result = await query(`
      SELECT id, user_id, permission_type, target_id, granted_by_user_id, granted_at, revoked_at
      FROM crew_chief_permissions
      WHERE user_id = $1 AND revoked_at IS NULL
      ORDER BY granted_at DESC
    `, [userId]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      permissionType: row.permission_type,
      targetId: row.target_id,
      grantedByUserId: row.granted_by_user_id,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
    }));
  } catch (error) {
    console.error('Error getting user crew chief permissions:', error);
    return [];
  }
}

// Check if user has crew chief permission for a specific shift
export async function checkCrewChiefPermission(
  userId: string,
  shiftId: string
): Promise<CrewChiefPermissionCheck> {
  try {
    // First check if user is the designated crew chief for this shift
    const designatedResult = await query(`
      SELECT crew_chief_id FROM shifts WHERE id = $1
    `, [shiftId]);

    if (designatedResult.rows.length > 0 && designatedResult.rows[0].crew_chief_id === userId) {
      return {
        hasPermission: true,
        permissionSource: 'designated',
        permissions: [],
      };
    }

    // Get shift details to check job and client permissions
    const shiftResult = await query(`
      SELECT s.job_id, j.client_id
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.id = $1
    `, [shiftId]);

    if (shiftResult.rows.length === 0) {
      return {
        hasPermission: false,
        permissionSource: 'none',
        permissions: [],
      };
    }

    const { job_id: jobId, client_id: clientId } = shiftResult.rows[0];

    // Check for admin-granted permissions (shift-level, job-level, client-level)
    const permissionsResult = await query(`
      SELECT id, user_id, permission_type, target_id, granted_by_user_id, granted_at, revoked_at
      FROM crew_chief_permissions
      WHERE user_id = $1 AND revoked_at IS NULL
        AND (
          (permission_type = 'shift' AND target_id = $2) OR
          (permission_type = 'job' AND target_id = $3) OR
          (permission_type = 'client' AND target_id = $4)
        )
      ORDER BY 
        CASE permission_type 
          WHEN 'shift' THEN 1 
          WHEN 'job' THEN 2 
          WHEN 'client' THEN 3 
        END
    `, [userId, shiftId, jobId, clientId]);

    const permissions = permissionsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      permissionType: row.permission_type,
      targetId: row.target_id,
      grantedByUserId: row.granted_by_user_id,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
    }));

    if (permissions.length > 0) {
      // Return the most specific permission type
      const permissionSource = permissions[0].permissionType as CrewChiefPermissionCheck['permissionSource'];
      return {
        hasPermission: true,
        permissionSource,
        permissions,
      };
    }

    return {
      hasPermission: false,
      permissionSource: 'none',
      permissions: [],
    };
  } catch (error) {
    console.error('Error checking crew chief permission:', error);
    return {
      hasPermission: false,
      permissionSource: 'none',
      permissions: [],
    };
  }
}

// Get all permissions for a specific target (for admin interface)
export async function getPermissionsForTarget(
  permissionType: CrewChiefPermissionType,
  targetId: string
): Promise<CrewChiefPermission[]> {
  try {
    const result = await query(`
      SELECT
        p.id, p.user_id, p.permission_type, p.target_id, p.granted_by_user_id, p.granted_at, p.revoked_at,
        u.name as user_name, u.role as user_role,
        gb.name as granted_by_name
      FROM crew_chief_permissions p
      JOIN users u ON p.user_id = u.id
      JOIN users gb ON p.granted_by_user_id = gb.id
      WHERE p.permission_type = $1 AND p.target_id = $2 AND p.revoked_at IS NULL
      ORDER BY p.granted_at DESC
    `, [permissionType, targetId]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      permissionType: row.permission_type,
      targetId: row.target_id,
      grantedByUserId: row.granted_by_user_id,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      // Additional fields for admin interface
      userName: row.user_name,
      userRole: row.user_role,
      grantedByName: row.granted_by_name,
    }));
  } catch (error) {
    console.error('Error getting permissions for target:', error);
    return [];
  }
}

// Get all crew chief permissions (for admin interface)
export async function getAllCrewChiefPermissions(): Promise<CrewChiefPermission[]> {
  try {
    const result = await query(`
      SELECT
        p.id, p.user_id, p.permission_type, p.target_id, p.granted_by_user_id, p.granted_at, p.revoked_at,
        u.name as user_name,
        gb.name as granted_by_name,
        CASE
          WHEN p.permission_type = 'client' THEN c.company_name
          WHEN p.permission_type = 'job' THEN j.name
          WHEN p.permission_type = 'shift' THEN CONCAT(sj.name, ' - ', s.date, ' ', s.start_time)
        END as target_name
      FROM crew_chief_permissions p
      JOIN users u ON p.user_id = u.id
      JOIN users gb ON p.granted_by_user_id = gb.id
      LEFT JOIN clients c ON p.permission_type = 'client' AND p.target_id = c.id
      LEFT JOIN jobs j ON p.permission_type = 'job' AND p.target_id = j.id
      LEFT JOIN shifts s ON p.permission_type = 'shift' AND p.target_id = s.id
      LEFT JOIN jobs sj ON s.job_id = sj.id
      WHERE p.revoked_at IS NULL
      ORDER BY p.granted_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      permissionType: row.permission_type,
      targetId: row.target_id,
      grantedByUserId: row.granted_by_user_id,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      // Additional fields for admin interface
      userName: row.user_name,
      grantedByName: row.granted_by_name,
      targetName: row.target_name,
    }));
  } catch (error) {
    console.error('Error getting all crew chief permissions:', error);
    return [];
  }
}
