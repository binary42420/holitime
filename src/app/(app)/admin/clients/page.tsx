"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useClients } from "@/hooks/use-api"
import {
  Card,
  Table,
  Button,
  TextInput,
  Badge,
  Menu,
  Group,
  Stack,
  Title,
  Text,
  ActionIcon,
  Loader,
  Center,
  Container,
} from "@mantine/core"
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Building2,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function AdminClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: clientsData, loading, error } = useClients()
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const clients = clientsData?.clients || []
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          toast({
            title: "Client Deleted",
            description: `${clientName} has been successfully deleted.`,
          })
          // Refresh the page or update the data
          window.location.reload()
        } else {
          throw new Error('Failed to delete client')
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete client. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Loader />
          <Text ml="md">Loading clients...</Text>
        </Center>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Text color="red">Error loading clients: {error.toString()}</Text>
        </Center>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Admin
            </Button>
            <Title order={1}>Client Management</Title>
            <Text c="dimmed">Manage client companies and contacts</Text>
          </Stack>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => router.push('/clients/new')}
          >
            Add Client
          </Button>
        </Group>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Group>
                <Building2 size={20} />
                <Title order={4}>All Clients</Title>
                <Text c="dimmed" size="sm">
                  {filteredClients.length} of {clients.length} clients
                </Text>
              </Group>
              <TextInput
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftSection={<Search size={16} />}
              />
            </Group>
          </Card.Section>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Company Name</Table.Th>
                <Table.Th>Contact Person</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Jobs</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredClients.map((client) => (
                <Table.Tr key={client.id}>
                  <Table.Td><Text fw={500}>{client.name}</Text></Table.Td>
                  <Table.Td>{client.contactPerson}</Table.Td>
                  <Table.Td>{client.contactEmail}</Table.Td>
                  <Table.Td>{client.contactPhone || 'N/A'}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">
                      {client.jobCount || 0} jobs
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green">Active</Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Actions</Menu.Label>
                        <Menu.Item
                          leftSection={<Eye size={14} />}
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          View Details
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<Edit size={14} />}
                          onClick={() => router.push(`/admin/clients/${client.id}/edit`)}
                        >
                          Edit Client
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={() => handleDeleteClient(client.id, client.name)}
                        >
                          Delete Client
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </Container>
  )
}

export default withAuth(AdminClientsPage, hasAdminAccess);
