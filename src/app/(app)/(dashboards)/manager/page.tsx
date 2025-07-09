'use client';

import { useUser } from '@/hooks/use-user';
import { useApi } from '@/hooks/use-api';
import { Card, Badge, Button, Group, Text, Title, Stack } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, Building2 } from 'lucide-react';
import type { Client, Job, Shift } from '@/lib/types';

export default function ManagerDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const { data: clientsData, loading: clientsLoading, error: clientsError } = useApi<{ count: number }>('/api/clients/count');
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useApi<{ count: number }>('/api/jobs/count');
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError } = useApi<{ count: number }>('/api/shifts/count');
  const { data: recentShiftsData, loading: recentShiftsLoading, error: recentShiftsError } = useApi<{ shifts: Shift[] }>('/api/shifts/recent');
  const { data: recentClientsData, loading: recentClientsLoading, error: recentClientsError } = useApi<{ clients: Client[] }>('/api/clients/recent');

  const loading = clientsLoading || jobsLoading || shiftsLoading || recentShiftsLoading || recentClientsLoading;
  const error = clientsError || jobsError || shiftsError || recentShiftsError || recentClientsError;

  if (loading) {
    return <Text>Loading dashboard data...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading dashboard data.</Text>;
  }

  const clientsCount = clientsData?.count || 0;
  const jobsCount = jobsData?.count || 0;
  const shiftsCount = shiftsData?.count || 0;
  const recentShifts = recentShiftsData?.shifts || [];
  const recentClients = recentClientsData?.clients || [];

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
          <Text size="xl" fw={700}>{clientsCount}</Text>
        </Card>

        <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
          <Group>
            <Briefcase size={24} />
            <Text>Total Jobs</Text>
          </Group>
          <Text size="xl" fw={700}>{jobsCount}</Text>
        </Card>

        <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
          <Group>
            <Calendar size={24} />
            <Text>Total Shifts</Text>
          </Group>
          <Text size="xl" fw={700}>{shiftsCount}</Text>
        </Card>
      </Group>

      <section>
        <Title order={2} mb="md">Recent Shifts</Title>
        {recentShifts.length > 0 ? (
          <Stack>
            {recentShifts.map((shift) => (
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
        {recentClients.length > 0 ? (
          <Stack>
            {recentClients.map((client) => (
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
