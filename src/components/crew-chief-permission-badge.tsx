'use client';

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Shield, ShieldCheck, ShieldX, Crown, Building, Briefcase } from "lucide-react"
import { useCrewChiefPermissions, getPermissionDescription, getPermissionLevel } from "@/hooks/useCrewChiefPermissions"
import type { CrewChiefPermissionCheck } from "@/lib/types"

interface CrewChiefPermissionBadgeProps {
  shiftId: string;
  showTooltip?: boolean;
  size?: "sm" | "default" | "lg";
}

export function CrewChiefPermissionBadge({ 
  shiftId, 
  showTooltip = true, 
  size = "default" 
}: CrewChiefPermissionBadgeProps) {
  const { hasPermission, permissionCheck, isLoading } = useCrewChiefPermissions(shiftId)

  if (isLoading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Shield className="w-3 h-3 mr-1" />
        Checking...
      </Badge>
    )
  }

  const permissionLevel = getPermissionLevel(permissionCheck)
  const description = getPermissionDescription(permissionCheck)

  const getBadgeVariant = () => {
    if (!hasPermission) return "destructive"
    
    switch (permissionLevel) {
    case "designated":
      return "default"
    case "client":
      return "secondary"
    case "job":
      return "secondary"
    case "shift":
      return "outline"
    default:
      return "outline"
    }
  }

  const getIcon = () => {
    if (!hasPermission) return <ShieldX className="w-3 h-3 mr-1" />
    
    switch (permissionLevel) {
    case "designated":
      return <Crown className="w-3 h-3 mr-1" />
    case "client":
      return <Building className="w-3 h-3 mr-1" />
    case "job":
      return <Briefcase className="w-3 h-3 mr-1" />
    case "shift":
      return <ShieldCheck className="w-3 h-3 mr-1" />
    default:
      return <Shield className="w-3 h-3 mr-1" />
    }
  }

  const getShortText = () => {
    if (!hasPermission) return "No Access"
    
    switch (permissionLevel) {
    case "designated":
      return "Crew Chief"
    case "client":
      return "Client Access"
    case "job":
      return "Job Access"
    case "shift":
      return "Shift Access"
    default:
      return "Access"
    }
  }

  const badge = (
    <Badge variant={getBadgeVariant()} className={size === "sm" ? "text-xs" : ""}>
      {getIcon()}
      {getShortText()}
    </Badge>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
          {permissionCheck?.permissions && permissionCheck.permissions.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {permissionCheck.permissions.length} permission(s) granted
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface PermissionGuardProps {
  shiftId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requirePermission?: boolean;
}

/**
 * Component that conditionally renders children based on crew chief permissions
 */
export function PermissionGuard({ 
  shiftId, 
  children, 
  fallback = null, 
  requirePermission = true 
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useCrewChiefPermissions(shiftId)

  if (isLoading) {
    return <div className="animate-pulse">Loading permissions...</div>
  }

  if (requirePermission && !hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface PermissionStatusProps {
  permissionCheck: CrewChiefPermissionCheck | null;
  isLoading?: boolean;
}

/**
 * Component for displaying detailed permission status
 */
export function PermissionStatus({ permissionCheck, isLoading }: PermissionStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4 animate-pulse" />
        <span>Checking permissions...</span>
      </div>
    )
  }

  if (!permissionCheck || !permissionCheck.hasPermission) {
    return (
      <div className="flex items-center space-x-2 text-sm text-destructive">
        <ShieldX className="w-4 h-4" />
        <span>No crew chief permissions</span>
      </div>
    )
  }

  const description = getPermissionDescription(permissionCheck)
  const level = getPermissionLevel(permissionCheck)

  return (
    <div className="flex items-center space-x-2 text-sm text-green-600">
      {level === "designated" && <Crown className="w-4 h-4" />}
      {level === "client" && <Building className="w-4 h-4" />}
      {level === "job" && <Briefcase className="w-4 h-4" />}
      {level === "shift" && <ShieldCheck className="w-4 h-4" />}
      {level === "none" && <Shield className="w-4 h-4" />}
      <span>{description}</span>
    </div>
  )
}
