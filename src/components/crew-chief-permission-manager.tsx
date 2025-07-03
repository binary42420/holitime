'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, Crown, Building, Briefcase, ShieldCheck } from 'lucide-react';
import type { CrewChiefPermission, CrewChiefPermissionType, User } from '@/lib/types';

interface CrewChiefPermissionManagerProps {
  targetId: string;
  targetType: CrewChiefPermissionType;
  targetName: string;
  className?: string;
}

interface PermissionWithUser extends CrewChiefPermission {
  userName?: string;
  userRole?: string;
}

export function CrewChiefPermissionManager({ 
  targetId, 
  targetType, 
  targetName, 
  className 
}: CrewChiefPermissionManagerProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [permissions, setPermissions] = useState<PermissionWithUser[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);

  // Only show for admins/managers
  if (session?.user?.role !== 'Manager/Admin') {
    return null;
  }

  useEffect(() => {
    fetchData();
  }, [targetId, targetType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch existing permissions for this target
      const permissionsRes = await fetch(
        `/api/crew-chief-permissions?permissionType=${targetType}&targetId=${targetId}`
      );
      
      // Fetch eligible users (Employee and Crew Chief roles)
      const usersRes = await fetch('/api/users');
      
      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData.permissions || []);
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = usersData.users || [];
        const eligible = users.filter((u: User) =>
          ['Employee', 'Crew Chief'].includes(u.role)
        );
        setEligibleUsers(eligible);
      }
    } catch (error) {
      console.error('Error fetching permission data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      const response = await fetch('/api/crew-chief-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          permissionType: targetType,
          targetId: targetId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission granted successfully',
        });
        setSelectedUserId('');
        fetchData(); // Refresh data
      } else {
        throw new Error('Failed to grant permission');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to grant permission',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokePermission = async (permission: PermissionWithUser) => {
    try {
      const response = await fetch(
        `/api/crew-chief-permissions?userId=${permission.userId}&permissionType=${permission.permissionType}&targetId=${permission.targetId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permission revoked successfully',
        });
        fetchData(); // Refresh data
      } else {
        throw new Error('Failed to revoke permission');
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke permission',
        variant: 'destructive',
      });
    }
  };

  const getTargetIcon = () => {
    switch (targetType) {
      case 'client':
        return <Building className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
      case 'shift':
        return <ShieldCheck className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'client':
        return 'Client Company';
      case 'job':
        return 'Job';
      case 'shift':
        return 'Shift';
      default:
        return 'Target';
    }
  };

  // Filter out users who already have permissions
  const availableUsers = eligibleUsers.filter(user => 
    !permissions.some(p => p.userId === user.id)
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTargetIcon()}
          Crew Chief Permissions
        </CardTitle>
        <CardDescription>
          Manage crew chief permissions for this {getTargetTypeLabel().toLowerCase()}: {targetName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Permissions */}
        <div>
          <h4 className="text-sm font-medium mb-2">Current Permissions ({permissions.length})</h4>
          {permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No crew chief permissions granted for this {getTargetTypeLabel().toLowerCase()}.</p>
          ) : (
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">{permission.userName}</span>
                    <Badge variant="outline" className="text-xs">
                      {permission.userRole}
                    </Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Permission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to revoke crew chief permission for {permission.userName} on this {getTargetTypeLabel().toLowerCase()}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRevokePermission(permission)}>
                          Revoke Permission
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant New Permission */}
        <div>
          <h4 className="text-sm font-medium mb-2">Grant New Permission</h4>
          {availableUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All eligible users already have permissions for this {getTargetTypeLabel().toLowerCase()}.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select user to grant permission" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{user.name} ({user.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGrantPermission} 
                disabled={isGranting || !selectedUserId}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                {isGranting ? 'Granting...' : 'Grant'}
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <p><strong>Note:</strong> Users with crew chief permissions for this {getTargetTypeLabel().toLowerCase()} can manage time entries and shift operations for all related shifts.</p>
        </div>
      </CardContent>
    </Card>
  );
}
