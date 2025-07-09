'use client';

import { useUser } from '@/hooks/use-user';
import { useApi } from '@/hooks/use-api';
import type { Job, Shift } from '@/lib/types';
import { Card, Badge, Group, Text, Title, Stack } from '@mantine/core';
import { Calendar, Users, Briefcase } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useUser();

  const { data: shiftsData, loading: shiftsLoading } = useApi<{ shifts: Shift[] }>(
    `/api/shifts?clientId=${user?.clientCompanyId || ''}`
  );

  const { data: jobsData, loading: jobsLoading } = useApi<{ jobs: Job[] }>(
    `/api/clients/${user?.clientCompanyId || ''}/jobs`
  );

  if (shiftsLoading || jobsLoading) {
    return <Text>Loading...</Text>;
  }

  const shifts: Shift[] = shiftsData?.shifts || [];
  const jobs: Job[] = jobsData?.jobs || [];
  const upcomingShifts = shifts.filter((shift: Shift) => shift.status === 'Upcoming');
  const completedShifts = shifts.filter((shift: Shift) => shift.status === 'Completed');

  return (
    <div>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>Welcome, {user?.name}!</Title>
            <Text c="dimmed">{user?.companyName || ''}</Text>
          </div>
        </Group>

        <Group>
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Briefcase size={24} />
              <Text>Active Jobs</Text>
            </Group>
            <Text size="xl" fw={700}>
              {jobs.filter((job: Job) => job.status === 'Active').length}
            </Text>
          </Card>
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Calendar size={24} />
              <Text>Upcoming Shifts</Text>
            </Group>
            <Text size="xl" fw={700}>{upcomingShifts.length}</Text>
          </Card>
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Users size={24} />
              <Text>Completed Shifts</Text>
            </Group>
            <Text size="xl" fw={700}>{completedShifts.length}</Text>
          </Card>
        </Group>

        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Recent Jobs</Title>
          </Card.Section>
          <Card.Section p="md">
            {jobs.length > 0 ? (
              <Stack>
                {jobs.slice(0, 5).map((job: Job) => (
                  <Card key={job.id} withBorder p="md" radius="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{job.name}</Text>
                        <Text size="sm" c="dimmed">{job.description}</Text>
                      </div>
                      <Badge color={job.status === 'Active' ? 'blue' : 'gray'}>
                        {job.status}
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="lg">No jobs found</Text>
            )}
          </Card.Section>
        </Card>

        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Upcoming Shifts</Title>
          </Card.Section>
          <Card.Section p="md">
            {upcomingShifts.length > 0 ? (
              <Stack>
                {upcomingShifts.slice(0, 5).map((shift: Shift) => (
                  <Card key={shift.id} withBorder p="md" radius="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={500}>{shift.jobName}</Text>
                        <Group gap="xs">
                          <Calendar size={16} />
                          <Text size="sm" c="dimmed">
                            {new Date(shift.date).toLocaleDateString()} {shift.startTime} - {shift.endTime}
                          </Text>
                        </Group>
                      </div>
                      <Badge>
                        {shift.assignedCount}/{shift.requestedWorkers} Workers
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="lg">No upcoming shifts</Text>
            )}
          </Card.Section>
        </Card>
      </Stack>
    </div>
  );
}
