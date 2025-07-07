'use client';

import { Badge, Tooltip, Group } from '@mantine/core';
import { Shield, ShieldCheck, ShieldX, Crown, Building, Briefcase } from 'lucide-react';
import { useCrewChiefPermissions, getPermissionDescription, getPermissionLevel } from '@/hooks/useCrewChiefPermissions';
import type { CrewChiefPermissionCheck } from '@/lib/types';

interface CrewChiefPermissionBadgeProps {
  shiftId: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CrewChiefPermissionBadge({ 
  shiftId, 
  showTooltip = true, 
  size = 'md' 
}: CrewChiefPermissionBadgeProps) {
  const { hasPermission, permissionCheck, isLoading } = useCrewChiefPermissions(shiftId);

  if (isLoading) {
    return (
      <Badge variant="outline" leftSection={<Shield size={14} />}>
        Checking...
      </Badge>
    );
  }

  const permissionLevel = getPermissionLevel(permissionCheck);
  const description = getPermissionDescription(permissionCheck);

  const getBadgeColor = () => {
    if (!hasPermission) return 'red';
    
    switch (permissionLevel) {
      case 'designated':
        return 'grape';
      case 'client':
        return 'blue';
      case 'job':
        return 'cyan';
      case 'shift':
        return 'teal';
      default:
        return 'gray';
    }
  };

  const getIcon = () => {
    if (!hasPermission) return <ShieldX size={14} />;
    
    switch (permissionLevel) {
      case 'designated':
        return <Crown size={14} />;
      case 'client':
        return <Building size={14} />;
      case 'job':
        return <Briefcase size={14} />;
      case 'shift':
        return <ShieldCheck size={14} />;
      default:
        return <Shield size={14} />;
    }
  };

  const getShortText = () => {
    if (!hasPermission) return 'No Access';
    
    switch (permissionLevel) {
      case 'designated':
        return 'Crew Chief';
      case 'client':
        return 'Client Access';
      case 'job':
        return 'Job Access';
      case 'shift':
        return 'Shift Access';
      default:
        return 'Access';
    }
  };

  const badge = (
    <Badge color={getBadgeColor()} size={size} leftSection={getIcon()}>
      {getShortText()}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip label={description}>
      {badge}
    </Tooltip>
  );
}

interface PermissionGuardProps {
  shiftId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requirePermission?: boolean;
}

export function PermissionGuard({ 
  shiftId, 
  children, 
  fallback = null, 
  requirePermission = true 
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useCrewChiefPermissions(shiftId);

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  if (requirePermission && !hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface PermissionStatusProps {
  permissionCheck: CrewChiefPermissionCheck | null;
  isLoading?: boolean;
}

export function PermissionStatus({ permissionCheck, isLoading }: PermissionStatusProps) {
  if (isLoading) {
    return (
      <Group>
        <Shield size={16} />
        <span>Checking permissions...</span>
      </Group>
    );
  }

  if (!permissionCheck || !permissionCheck.hasPermission) {
    return (
      <Group c="red">
        <ShieldX size={16} />
        <span>No crew chief permissions</span>
      </Group>
    );
  }

  const description = getPermissionDescription(permissionCheck);
  const level = getPermissionLevel(permissionCheck);

  return (
    <Group c="green">
      {level === 'designated' && <Crown size={16} />}
      {level === 'client' && <Building size={16} />}
      {level === 'job' && <Briefcase size={16} />}
      {level === 'shift' && <ShieldCheck size={16} />}
      {level === 'none' && <Shield size={16} />}
      <span>{description}</span>
    </Group>
  );
}
