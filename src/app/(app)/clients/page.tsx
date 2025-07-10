"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useClients } from "@/hooks/use-api"
import { Button, Card, Text, Group, Badge, Stack, Title } from '@mantine/core'
import { Plus, Mail, User } from "lucide-react"

const safeFormatDate = (date: string | null | undefined) => {
  if (!date || isNaN(new Date(date).getTime())) {
    return 'Invalid date';
  }
  return format(new Date(date), 'MMM d, yyyy');
};

function ClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { data: clientsData, loading, error } = useClients()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading clients: {error.toString()}</div>
      </div>
    )
  }

  const clients = clientsData?.clients || []

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1}>Clients</Title>
          <Text c="dimmed">
            Manage client companies and view their job history
          </Text>
        </div>
        {canEdit && (
          <Button onClick={() => router.push('/clients/new')} leftSection={<Plus size={16} />}>
            Add Client
          </Button>
        )}
      </Group>

      {clients.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {clients.map(client => (
            <Card 
              key={client.id} 
              shadow="sm" 
              padding="lg" 
              radius="md" 
              withBorder 
              className="cursor-pointer"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <Group justify="space-between" mb="md">
                <Title order={3}>{client.companyName || client.name}</Title>
              </Group>
              
              <Stack gap="xs" mb="md">
                {client.contactPerson && <Group gap="xs"><User size={16} /><Text size="sm">{client.contactPerson}</Text></Group>}
                {client.contactEmail && <Group gap="xs"><Mail size={16} /><Text size="sm">{client.contactEmail}</Text></Group>}
              </Stack>

              <div>
                <Text size="sm" fw={500} mb="xs">Recent Completed</Text>
                {client.mostRecentCompletedShifts && client.mostRecentCompletedShifts.length > 0 ? (
                  client.mostRecentCompletedShifts.filter(Boolean).map(shift => (
                    <Card key={shift.id} withBorder p="sm" radius="sm" mb="xs">
                      <Group justify="space-between">
                        <Text size="sm" component={Link} href={`/shifts/${shift.id}`}>
                          {shift.jobName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {safeFormatDate(shift.date)}
                        </Text>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No completed shifts</Text>
                )}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Text size="sm" fw={500} mb="xs">Upcoming Shifts</Text>
                {client.mostRecentUpcomingShifts && client.mostRecentUpcomingShifts.length > 0 ? (
                  client.mostRecentUpcomingShifts.filter(Boolean).map(shift => (
                    <Card key={shift.id} withBorder p="sm" radius="sm" mb="xs">
                      <Group justify="space-between">
                          <Text size="sm" component={Link} href={`/shifts/${shift.id}`}>
                            {shift.jobName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {safeFormatDate(shift.date)}
                          </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {shift.startTime}
                      </Text>
                      <Badge
                        mt="xs"
                        color={
                          shift.assignedCount >= shift.requestedWorkers
                            ? 'green'
                            : shift.assignedCount > 0
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {shift.assignedCount}/{shift.requestedWorkers} workers
                      </Badge>
                    </Card>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">No upcoming shifts</Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="lg" radius="md" withBorder>
          <Stack align="center" justify="center" style={{ minHeight: '300px' }}>
            <Title order={3}>No clients found</Title>
            <Text c="dimmed">
              Get started by adding your first client.
            </Text>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/clients/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}

export default ClientsPage;
