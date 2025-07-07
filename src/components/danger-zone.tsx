'use client';

import { useSession } from 'next-auth/react';
import { Card, Group, Text, Title } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { CascadeDeleteDialog } from './cascade-delete-dialog';

interface DangerZoneProps {
  entityType: 'client' | 'job' | 'shift';
  entityId: string;
  entityName: string;
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export function DangerZone({
  entityType,
  entityId,
  entityName,
  onSuccess,
  redirectTo,
  className
}: DangerZoneProps) {
  const { data: session } = useSession();

  if (session?.user?.role !== 'Manager/Admin') {
    return null;
  }

  const getEntityTypeLabel = () => {
    switch (entityType) {
      case 'client':
        return 'Client Company';
      case 'job':
        return 'Job';
      case 'shift':
        return 'Shift';
      default:
        return 'Entity';
    }
  };

  const getDescription = () => {
    switch (entityType) {
      case 'client':
        return 'Permanently delete this client company and all associated jobs, shifts, and data. This action affects the most data and cannot be undone.';
      case 'job':
        return 'Permanently delete this job and all associated shifts and data. This action cannot be undone.';
      case 'shift':
        return 'Permanently delete this shift and all associated data. This action cannot be undone.';
      default:
        return 'Permanently delete this entity and all associated data.';
    }
  };

  return (
    <Card withBorder radius="md" className={className} style={{ borderColor: 'var(--mantine-color-red-4)' }}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <AlertTriangle color="var(--mantine-color-red-6)" />
          <Title order={4} c="red">Danger Zone</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {getDescription()}
        </Text>
      </Card.Section>
      <Card.Section p="md">
        <Group justify="space-between">
          <div>
            <Text fw={500}>Delete {getEntityTypeLabel()}</Text>
            <Text size="sm" c="dimmed">
              Once you delete this {getEntityTypeLabel().toLowerCase()}, there is no going back.
            </Text>
          </div>
          <CascadeDeleteDialog
            entityType={entityType}
            entityId={entityId}
            entityName={entityName}
            onSuccess={onSuccess}
            redirectTo={redirectTo}
          />
        </Group>
      </Card.Section>
    </Card>
  );
}
