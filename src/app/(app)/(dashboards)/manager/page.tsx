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

  const { data: clientsData, loading: clientsLoading, error: clientsError } = useApi<{ clients: Client[] }>('/api/clients');
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useApi<{ jobs: Job[] }>('/api/jobs');
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError } = useApi<{ shifts: Shift[] }>('/api/shifts');

  const loading = clientsLoading || jobsLoading || shiftsLoading;
  const error = clientsError || jobsError || shiftsError;

  if (loading) {
    return <Text>Loading dashboard data...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading dashboard data.</Text>;
  }

  const clientsCount = clientsData?.clients?.length || 0;
  const jobsCount = jobsData?.jobs?.length || 0;
  const shiftsCount = shiftsData?.shifts?.length || 0;
  
  const recentShifts = shiftsData?.shifts?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) || [];
  const recentClients = clientsData?.clients?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) || [];

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
