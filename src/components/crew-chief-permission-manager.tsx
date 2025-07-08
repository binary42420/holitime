'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Button, Badge, Select, Modal, Group, Text, Title, Stack, ActionIcon, Loader, Alert, ComboboxItem } from '@mantine/core';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, Crown, Building, Briefcase, ShieldCheck, User as UserIcon, Truck } from 'lucide-react';
import type { CrewChiefPermission, CrewChiefPermissionType, User } from '@/lib/types';
import { notifications } from '@mantine/notifications';

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

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Manager/Admin':
      return <Crown size={16} className="text-yellow-500" />;
    case 'Crew Chief':
      return <Shield size={16} className="text-purple-500" />;
    default:
      return <UserIcon size={16} className="text-blue-500" />;
  }
}

export function CrewChiefPermissionManager({
  targetId, 
  targetType, 
  targetName, 
  className 
}: CrewChiefPermissionManagerProps) {
  const { data: session } = useSession();
  
  const [permissions, setPermissions] = useState<PermissionWithUser[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState<PermissionWithUser | null>(null);

  if (session?.user?.role !== 'Manager/Admin') {
    return null;
  }

  useEffect(() => {
    fetchData();
  }, [targetId, targetType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const permissionsRes = await fetch(
        `/api/crew-chief-permissions?permissionType=${targetType}&targetId=${targetId}`
      );
      
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
      notifications.show({
        title: 'Error',
        message: 'Failed to load permission data',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedUserId) {
      notifications.show({
        title: 'Error',
        message: 'Please select a user',
        color: 'red',
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
        notifications.show({
          title: 'Success',
          message: 'Permission granted successfully',
          color: 'green',
        });
        setSelectedUserId(null);
        fetchData();
      } else {
        throw new Error('Failed to grant permission');
      }
    } catch (error) {
      console.error('Error granting permission:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to grant permission',
        color: 'red',
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
        notifications.show({
          title: 'Success',
          message: 'Permission revoked successfully',
          color: 'blue',
        });
        fetchData();
      } else {
        throw new Error('Failed to revoke permission');
      }
    } catch (error) {
      console.error('Error revoking permission:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to revoke permission',
        color: 'red',
      });
    } finally {
      setShowRevokeModal(null);
    }
  };

  const getTargetIcon = () => {
    switch (targetType) {
      case 'client':
        return <Building size={16} />;
      case 'job':
        return <Briefcase size={16} />;
      case 'shift':
        return <ShieldCheck size={16} />;
      default:
        return <Shield size={16} />;
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

  const availableUsers = eligibleUsers.filter(user => 
    !permissions.some(p => p.userId === user.id)
  );

  if (isLoading) {
    return (
      <Card withBorder radius="md" className={className}>
        <Card.Section p="md">
          <Group>
            <Loader size="sm" />
            <Text>Loading permissions...</Text>
          </Group>
        </Card.Section>
      </Card>
    );
  }

  return (
    <>
      <Card withBorder radius="md" className={className}>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            {getTargetIcon()}
            <Title order={4}>Crew Chief Permissions</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Manage crew chief permissions for this {getTargetTypeLabel().toLowerCase()}: {targetName}
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <Stack>
            <div>
              <Title order={5} mb="xs">Current Permissions ({permissions.length})</Title>
              {permissions.length === 0 ? (
                <Text size="sm" c="dimmed">No crew chief permissions granted for this {getTargetTypeLabel().toLowerCase()}.</Text>
              ) : (
                <Stack>
                  {permissions.map((permission) => (
                    <Card key={permission.id} withBorder p="xs" radius="sm">
                      <Group justify="space-between">
                        <Group>
                          <Crown size={16} color="var(--mantine-color-yellow-6)" />
                          <Text fw={500}>{permission.userName}</Text>
                          <Badge variant="light">
                            {permission.userRole}
                          </Badge>
                        </Group>
                        <Button variant="outline" size="xs" color="red" onClick={() => setShowRevokeModal(permission)} leftSection={<Trash2 size={14} />}>
                          Revoke
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              )}
            </div>

            <div>
              <Title order={5} mb="xs">Grant New Permission</Title>
              {availableUsers.length === 0 ? (
                <Text size="sm" c="dimmed">
                  All eligible users already have permissions for this {getTargetTypeLabel().toLowerCase()}.
                </Text>
              ) : (
                <Group>
                  <Select
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    placeholder="Select user to grant permission"
                    data={availableUsers.map(user => ({
                      value: user.id,
                      label: user.name,
                      role: user.role,
                      isCrewChiefEligible: user.crewChiefEligible,
                      isForkliftCertified: user.forkOperatorEligible,
                    }))}
                    style={{ flex: 1 }}
                    renderOption={(item) => {
                      const optionWithRole = item.option as ComboboxItem & { role: string, isCrewChiefEligible?: boolean, isForkliftCertified?: boolean };
                      return (
                        <Group justify="space-between">
                          <Group gap="xs">
                            {getRoleIcon(optionWithRole.role)}
                            <Text>{optionWithRole.label}</Text>
                          </Group>
                          <Group gap="xs">
                            {optionWithRole.isCrewChiefEligible && <ShieldCheck size={16} className="text-green-500" />}
                            {optionWithRole.isForkliftCertified && <Truck size={16} className="text-orange-500" />}
                          </Group>
                        </Group>
                      );
                    }}
                  />
                  <Button 
                    onClick={handleGrantPermission} 
                    loading={isGranting}
                    disabled={!selectedUserId}
                    leftSection={<Plus size={16} />}
                  >
                    Grant
                  </Button>
                </Group>
              )}
            </div>

            <Alert color="blue" icon={<Shield size={16} />}>
              <Text size="xs"><strong>Note:</strong> Users with crew chief permissions for this {getTargetTypeLabel().toLowerCase()} can manage time entries and shift operations for all related shifts.</Text>
            </Alert>
          </Stack>
        </Card.Section>
      </Card>

      <Modal opened={!!showRevokeModal} onClose={() => setShowRevokeModal(null)} title="Revoke Permission">
        <Text>Are you sure you want to revoke crew chief permission for {showRevokeModal?.userName} on this {getTargetTypeLabel().toLowerCase()}?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowRevokeModal(null)}>Cancel</Button>
          <Button color="red" onClick={() => handleRevokePermission(showRevokeModal!)}>Revoke Permission</Button>
        </Group>
      </Modal>
    </>
  );
}
