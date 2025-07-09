'use client';

import { useUser } from '@/hooks/use-user';
import { useApi } from '@/hooks/use-api';
import { Card, Badge, Button, Group, Text, Title, Stack } from '@mantine/core';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, Building2 } from 'lucide-react';
import type { Client, Job, Shift } from '@/lib/types';

export default function ManagerDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const { data: clientsData, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useApi<{ clients: Client[] }>('/api/clients');
  const { data: jobsData, loading: jobsLoading, error: jobsError, refetch: refetchJobs } = useApi<{ jobs: Job[] }>('/api/jobs');
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useApi<{ shifts: Shift[] }>('/api/shifts?filter=all');

  useEffect(() => {
    refetchClients();
    refetchJobs();
    refetchShifts();
  }, [refetchClients, refetchJobs, refetchShifts]);

  if (clientsLoading || jobsLoading || shiftsLoading) {
    return <Text>Loading dashboard data...</Text>;
  }

  if (clientsError || jobsError || shiftsError) {
    return <Text color="red">Error loading dashboard data.</Text>;
  }

  const clients = clientsData?.clients || [];
  const jobs = jobsData?.jobs || [];
  const shifts = shiftsData?.shifts || [];

  return (
    <Stack gap="lg">
      <header>
        <Title order={1}>Welcome, {user?.name}!</Title>
        <Text c="dimmed">Manager Dashboard Overview</Text>
      </header>

      <Group>
        <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
          <Group>
            <Building2 size={24} />
            <Text>Total Clients</Text>
          </Group>
          <Text size="xl" fw={700}>{clients.length}</Text>
        </Card>

        <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
          <Group>
            <Briefcase size={24} />
            <Text>Total Jobs</Text>
          </Group>
          <Text size="xl" fw={700}>{jobs.length}</Text>
        </Card>

        <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
          <Group>
            <Calendar size={24} />
            <Text>Total Shifts</Text>
          </Group>
          <Text size="xl" fw={700}>{shifts.length}</Text>
        </Card>
      </Group>

      <section>
        <Title order={2} mb="md">Recent Shifts</Title>
        {shifts.length > 0 ? (
          <Stack>
            {shifts.slice(0, 5).map((shift) => (
              <Card key={shift.id} withBorder p="md" radius="sm" style={{ cursor: 'pointer' }} onClick={() => router.push(`/shifts/${shift.id}`)}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{shift.jobName}</Text>
                    <Text size="sm" c="dimmed">{shift.clientName}</Text>
                    <Text size="sm" c="dimmed">{new Date(shift.date).toLocaleDateString()}</Text>
                  </div>
                  <Badge color={shift.status === 'Completed' ? 'green' : 'blue'}>
                    {shift.status}
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text>No recent shifts found.</Text>
        )}
      </section>

      <section>
        <Title order={2} mt="lg" mb="md">Recent Clients</Title>
        {clients.length > 0 ? (
          <Stack>
            {clients.slice(0, 5).map((client) => (
              <Card key={client.id} withBorder p="md" radius="sm" style={{ cursor: 'pointer' }} onClick={() => router.push(`/clients/${client.id}`)}>
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{client.companyName || client.name}</Text>
                    <Text size="sm" c="dimmed">{client.contactPerson}</Text>
                    <Text size="sm" c="dimmed">{client.contactEmail}</Text>
                  </div>
                  <Button size="xs" variant="outline">View</Button>
                </Group>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text>No recent clients found.</Text>
        )}
      </section>
    </Stack>
  );
}
