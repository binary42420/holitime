"use client"

import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, Button, Badge, Group, Text, Title, Stack, ActionIcon } from "@mantine/core"
import { ArrowLeft, Building2, Phone, Mail, MapPin, Briefcase, Plus, Calendar, Users } from "lucide-react"
import { generateClientEditUrl } from "@/lib/url-utils"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"
import { Client, Job, Shift } from "@/lib/types";

function ClientDetailPage({ params }: { params: { id: string } }) {
  const { id: clientId } = params
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'

  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: Client }>(
    clientId ? `/api/clients/${clientId}` : ''
  );
  const { data: jobsData, loading: jobsLoading } = useApi<{ jobs: Job[] }>(
    clientId ? `/api/clients/${clientId}/jobs` : ''
  );
  const { data: shiftsData, loading: shiftsLoading } = useApi<{ shifts: Shift[] }>(
    clientId ? `/api/shifts?clientId=${clientId}` : ''
  );

  const client = clientData?.client;
  const jobs = jobsData?.jobs || [];
  const shifts = shiftsData?.shifts || [];

  if (clientLoading || jobsLoading || shiftsLoading) {
    return <Text>Loading...</Text>;
  }

  if (clientError || !client) {
    return (
      <Stack align="center" justify="center" style={{ height: '100vh' }}>
        <Card withBorder p="xl" radius="md">
          <Stack align="center">
            <Title order={3}>Client Not Found</Title>
            <Text c="dimmed">
              The client you're looking for doesn't exist or you don't have permission to view it.
            </Text>
            <Button onClick={() => router.push('/clients')} leftSection={<ArrowLeft size={16} />}>
              Back to Clients
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <ActionIcon variant="subtle" onClick={() => router.push('/clients')}>
            <ArrowLeft />
          </ActionIcon>
          <div>
            <Title order={1}>{client.companyName || client.name}</Title>
            <Text c="dimmed">{client.address}</Text>
          </div>
        </Group>
        {canEdit && (
          <Button onClick={() => router.push(generateClientEditUrl(client.id))}>
            Edit Client
          </Button>
        )}
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <Building2 size={20} />
              <Title order={4}>Contact Information</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <Group>
                <Users size={16} />
                <Text fw={500}>{client.contactPerson}</Text>
              </Group>
              <Group>
                <Mail size={16} />
                <Text fw={500}>{client.email}</Text>
              </Group>
              <Group>
                <Phone size={16} />
                <Text fw={500}>{client.phone}</Text>
              </Group>
              <Group>
                <MapPin size={16} />
                <Text fw={500}>{client.address}</Text>
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Title order={4}>Quick Stats</Title>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <Group justify="space-between">
                <Text size="sm">Total Jobs</Text>
                <Badge>{jobs.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Active Jobs</Text>
                <Badge color="blue">
                  {jobs.filter((job) => job.status === 'Active').length}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm">Completed Jobs</Text>
                <Badge color="gray">
                  {jobs.filter((job) => job.status === 'Completed').length}
                </Badge>
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        {client.notes && (
          <Card withBorder radius="md">
            <Card.Section withBorder inheritPadding py="xs">
              <Title order={4}>Notes</Title>
            </Card.Section>
            <Card.Section p="md">
              <Text size="sm">{client.notes}</Text>
            </Card.Section>
          </Card>
        )}
      </div>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Group>
              <Briefcase size={20} />
              <Title order={4}>Jobs</Title>
            </Group>
            {canEdit && (
              <Button size="xs" onClick={() => router.push(`/admin/jobs/new?clientId=${client.id}`)} leftSection={<Plus size={14} />}>
                New Job
              </Button>
            )}
          </Group>
        </Card.Section>
        <Card.Section p="md">
          {jobs && jobs.length > 0 ? (
            <Stack>
              {jobs.map((job) => (
                <Card key={job.id} withBorder p="md" radius="sm" style={{ cursor: 'pointer' }} onClick={() => router.push(`/jobs/${job.id}`)}>
                  <Group justify="space-between">
                    <div>
                      <Title order={5}>{job.name}</Title>
                      <Text size="sm" c="dimmed">{job.description}</Text>
                      <Group>
                        <Group gap="xs">
                          <Calendar size={14} />
                          <Text size="xs">{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'No start date'}</Text>
                        </Group>
                        <Group gap="xs">
                          <Users size={14} />
                          <Text size="xs">{job.shiftCount || 0} shifts</Text>
                        </Group>
                      </Group>
                    </div>
                    <Group>
                      <Badge color={job.status === 'Active' ? 'blue' : 'gray'}>
                        {job.status}
                      </Badge>
                      <Button variant="outline" size="xs">View</Button>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Stack align="center" justify="center" py="xl">
              <Briefcase size={48} />
              <Title order={3}>No Jobs Yet</Title>
              <Text c="dimmed">This client doesn't have any jobs assigned yet.</Text>
              {canEdit && (
                <Button onClick={() => router.push(`/admin/jobs/new?clientId=${client.id}`)} leftSection={<Plus size={16} />}>
                  Create First Job
                </Button>
              )}
            </Stack>
          )}
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Calendar size={20} />
            <Title order={4}>Recent Shifts</Title>
          </Group>
        </Card.Section>
        <Card.Section p="md">
          {shifts && shifts.length > 0 ? (
            <Stack>
              {shifts.map((shift) => (
                <Card key={shift.id} withBorder p="md" radius="sm" style={{ cursor: 'pointer' }} onClick={() => router.push(`/shifts/${shift.id}`)}>
                  <Group justify="space-between">
                    <div>
                      <Title order={5}>{shift.jobName || 'No Job Assigned'}</Title>
                      <Text size="sm" c="dimmed">{new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleString()}</Text>
                    </div>
                    <Group>
                      <Badge color={shift.status === 'Completed' ? 'green' : 'blue'}>
                        {shift.status}
                      </Badge>
                      <Button variant="outline" size="xs">View</Button>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Stack align="center" justify="center" py="xl">
              <Calendar size={48} />
              <Title order={3}>No Recent Shifts</Title>
              <Text c="dimmed">This client doesn't have any recent shifts.</Text>
            </Stack>
          )}
        </Card.Section>
      </Card>

      <CrewChiefPermissionManager
        targetId={client.clientCompanyId || client.id}
        targetType="client"
        targetName={client.companyName || client.name}
      />

      <DangerZone
        entityType="client"
        entityId={client.id}
        entityName={client.companyName || client.name}
        redirectTo="/clients"
      />
    </Stack>
  )
}

export default ClientDetailPage;
