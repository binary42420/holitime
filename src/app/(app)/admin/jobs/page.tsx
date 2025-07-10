"use client"

import React from "react"

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import {
  Card,
  Table,
  Button,
  Badge,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
  Menu,
  ActionIcon,
  Loader,
  Center,
} from "@mantine/core"
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Building2, 
  Calendar,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2
} from "lucide-react"
import { format } from "date-fns"

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';
import { Job } from "@/lib/types"; // Import Job type

//*******************************************************************\\
//=======  Admin Jobs Page - Main Component  =======================\\
//*******************************************************************\\

function AdminJobsPage() {
  //***************************\\
  //=======  Hooks  ===========\\
  //***************************\\
  const { user } = useUser()
  const router = useRouter()
  // Fetch jobs data from the API, specifying the expected type
  const { data: jobsData, loading, error } = useApi<{ jobs: Job[] }>('/api/jobs')

  //*********************************\\
  //=======  Access Control  =========\\
  //*********************************\\
  // Redirect if the current user does not have 'Manager/Admin' role
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  //*********************************\\
  //=======  Data Processing  =======\\
  //*********************************\\
  // Ensure jobsData.jobs is an array, default to empty array if null/undefined
  const jobs = jobsData?.jobs || []

  //*********************************\\
  //=======  Helper Functions  =======\\
  //*********************************\\
  // Determines the badge color based on the job's status
  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'blue',
      'Completed': 'green',
      'On Hold': 'yellow',
      'Cancelled': 'red'
    }
    return colors[status] || 'gray'
  }

  //*********************************\\
  //=======  Loading & Error States  =========\\
  //*********************************\\
  // Display a loading spinner while data is being fetched
  if (loading) {
    return (
      <Center style={{ height: 200 }}>
        <Loader />
      </Center>
    )
  }

  // Display an error message if data fetching failed
  if (error) {
    return (
      <Center style={{ height: 200 }}>
        <Text color="red">Error loading jobs: {error.toString()}</Text>
      </Center>
    )
  }

  //***************************\\
  //=======  Render UI  =========\\
  //***************************\\
  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header Section */}
        <Group justify="space-between">
          <Stack gap={0}>
            {/* Back button to Admin Dashboard */}
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Admin
            </Button>
            {/* Page Title and Description */}
            <Title order={1}>Job Management</Title>
            <Text c="dimmed">Create and manage jobs and projects</Text>
          </Stack>
          {/* Group of action buttons */}
          <Group>
            {/* Button to view job templates */}
            <Button
              variant="default"
              onClick={() => router.push('/admin/jobs/templates')}
            >
              Job Templates
            </Button>
            {/* Button to create a new job */}
            <Button
              leftSection={<Plus size={16} />}
              onClick={() => router.push('/admin/jobs/new')}
            >
              Create Job
            </Button>
          </Group>
        </Group>

        {/* Job Statistics Grid */}
        <Grid>
          {/* Total Jobs Card */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder>
              <Group justify="space-between">
                <Text size="sm" fw={500}>Total Jobs</Text>
                <Briefcase size={18} />
              </Group>
              <Text size="xl" fw={700}>{jobs.length}</Text>
            </Card>
          </Grid.Col>
          {/* Active Jobs Card */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder>
              <Group justify="space-between">
                <Text size="sm" fw={500}>Active Jobs</Text>
                <Calendar size={18} />
              </Group>
              <Text size="xl" fw={700}>
                {jobs.filter(job => job.status === 'Active').length}
              </Text>
            </Card>
          </Grid.Col>
          {/* Total Shifts Card */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder>
              <Group justify="space-between">
                <Text size="sm" fw={500}>Total Shifts</Text>
                <Users size={18} />
              </Group>
              <Text size="xl" fw={700}>
                {jobs.reduce((total, job) => total + (job.shiftCount || 0), 0)}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        {/* All Jobs Table Card */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group>
              <Briefcase size={20} />
              <Title order={4}>All Jobs</Title>
            </Group>
            <Text size="sm" c="dimmed">Manage all jobs and projects in the system</Text>
          </Card.Section>
          {/* Conditional rendering for loading, error, or empty states */}
          {loading ? (
            <Center style={{ height: 200 }}>
              <Loader />
            </Center>
          ) : error ? (
            <Center style={{ height: 200 }}>
              <Text color="red">Error loading jobs: {error.toString()}</Text>
            </Center>
          ) : jobs.length === 0 ? (
            <Center style={{ height: 200, flexDirection: 'column' }}>
              <Briefcase size={48} style={{ marginBottom: 16 }} />
              <Title order={3}>No Jobs Found</Title>
              <Text c="dimmed" style={{ marginBottom: 16 }}>
                Get started by creating your first job.
              </Text>
              <Button
                leftSection={<Plus size={16} />}
                onClick={() => router.push('/admin/jobs/new')}
              >
                Create Job
              </Button>
            </Center>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Job Name</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Shifts</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Map through jobs data to render table rows */}
                {jobs.map((job) => (
                  <Table.Tr
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td><Text fw={500}>{job.name}</Text></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Building2 size={16} />
                        <Text>{job.clientName}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>{job.location}</Table.Td>
                    <Table.Td>
                      <Badge color={getStatusBadgeColor(job.status)}>{job.status}</Badge>
                    </Table.Td>
                    <Table.Td>{job.shiftCount || 0}</Table.Td>
                    <Table.Td>
                      {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle">
                            <MoreHorizontal size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Label>Actions</Menu.Label>
                          {/* View Details Link */}
                          <Menu.Item
                            leftSection={<Eye size={14} />}
                            onClick={() => router.push(`/jobs/${job.id}`)}
                          >
                            View Details
                          </Menu.Item>
                          {/* Edit Job Link */}
                          <Menu.Item
                            leftSection={<Edit size={14} />}
                            onClick={() => router.push(`/jobs/${job.id}/edit`)}
                          >
                            Edit Job
                          </Menu.Item>
                          {/* Duplicate Job Link */}
                          <Menu.Item leftSection={<Copy size={14} />}>
                            Duplicate Job
                          </Menu.Item>
                          <Menu.Divider />
                          {/* Delete Job Button */}
                          <Menu.Item color="red" leftSection={<Trash2 size={14} />}>
                            Delete Job
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  )
}

export default withAuth(AdminJobsPage, hasAdminAccess);
