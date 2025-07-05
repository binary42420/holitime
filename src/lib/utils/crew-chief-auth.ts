import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"
import { checkCrewChiefPermission } from "@/lib/services/crew-chief-permissions"
import type { CrewChiefPermissionCheck } from "@/lib/types"

/**
 * Check if the current user has crew chief permissions for a specific shift
 * This includes:
 * 1. Being designated as crew chief for the shift
 * 2. Having admin-granted permissions (shift-level, job-level, or client-level)
 * 3. Being a manager/admin (always has access)
 */
export async function requireCrewChiefPermission(shiftId: string): Promise<{
  hasPermission: boolean;
  permissionCheck: CrewChiefPermissionCheck;
  session: any;
}> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return {
      hasPermission: false,
      permissionCheck: {
        hasPermission: false,
        permissionSource: "none",
        permissions: [],
      },
      session: null,
    }
  }

  // Managers/Admins always have access
  if (session.user.role === "Manager/Admin") {
    return {
      hasPermission: true,
      permissionCheck: {
        hasPermission: true,
        permissionSource: "none", // Admin access doesn't need specific permissions
        permissions: [],
      },
      session,
    }
  }

  // Check crew chief permissions for employees and crew chiefs
  if (session.user.role === "Employee" || session.user.role === "Crew Chief") {
    const permissionCheck = await checkCrewChiefPermission(session.user.id, shiftId)
    return {
      hasPermission: permissionCheck.hasPermission,
      permissionCheck,
      session,
    }
  }

  // Client users don't have crew chief permissions
  return {
    hasPermission: false,
    permissionCheck: {
      hasPermission: false,
      permissionSource: "none",
      permissions: [],
    },
    session,
  }
}

/**
 * Middleware function to check crew chief permissions for API routes
 */
export async function withCrewChiefPermission(
  shiftId: string,
  handler: (session: any, permissionCheck: CrewChiefPermissionCheck) => Promise<Response>
): Promise<Response> {
  const { hasPermission, permissionCheck, session } = await requireCrewChiefPermission(shiftId)

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!hasPermission) {
    return new Response(JSON.stringify({ 
      error: "Insufficient permissions",
      details: "You need crew chief permissions for this shift"
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return handler(session, permissionCheck)
}

/**
 * Check if user can manage time entries for a shift
 * This is the core crew chief functionality
 */
export async function canManageTimeEntries(userId: string, shiftId: string): Promise<boolean> {
  const permissionCheck = await checkCrewChiefPermission(userId, shiftId)
  return permissionCheck.hasPermission
}

/**
 * Check if user can view shift details (less restrictive than managing)
 */
export async function canViewShiftDetails(userId: string, userRole: string, shiftId: string): Promise<boolean> {
  // Managers/Admins can always view
  if (userRole === "Manager/Admin") {
    return true
  }

  // Employees and crew chiefs can view if they have any permission
  if (userRole === "Employee" || userRole === "Crew Chief") {
    const permissionCheck = await checkCrewChiefPermission(userId, shiftId)
    return permissionCheck.hasPermission
  }

  // Clients can view shifts for their company's jobs
  // This would require additional logic to check if the shift belongs to their company
  // For now, we'll return false and implement this separately if needed
  return false
}

/**
 * Get permission summary for display in UI
 */
export function getPermissionSummary(permissionCheck: CrewChiefPermissionCheck): string {
  if (!permissionCheck.hasPermission) {
    return "No permissions"
  }

  switch (permissionCheck.permissionSource) {
  case "designated":
    return "Designated crew chief for this shift"
  case "shift":
    return "Admin-granted permission for this shift"
  case "job":
    return "Admin-granted permission for this job"
  case "client":
    return "Admin-granted permission for this client"
  default:
    return "Has permissions"
  }
}
