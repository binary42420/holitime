"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import {
  Card,
  Table,
  Button,
  TextInput,
  Badge,
  Avatar,
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
  Users,
  Eye,
  UserCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"


function AdminEmployeesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: employeesData, loading, error } = useApi<{ users: Record<string, any>[] }>('/api/employees')
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const employees = employeesData?.users || []
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          toast({
            title: "Employee Deleted",
            description: `${employeeName} has been successfully deleted.`,
          })
          window.location.reload()
        } else {
          throw new Error('Failed to delete employee')
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to delete employee. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Manager/Admin':
        return 'red'
      case 'Crew Chief':
        return 'blue'
      case 'Employee':
        return 'gray'
      case 'Client':
        return 'teal'
      default:
        return 'gray'
    }
  }

  if (loading) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Loader />
          <Text ml="md">Loading Employees...</Text>
        </Center>
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Text color="red">Error loading Employees: {error.toString()}</Text>
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
            <Title order={1}>Employee Management</Title>
            <Text c="dimmed">Manage workforce and employee records</Text>
          </Stack>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => router.push('/admin/employees/new')}
          >
            Add Employee
          </Button>
        </Group>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Group>
                <Users size={20} />
                <Title order={4}>All Employees</Title>
                <Text c="dimmed" size="sm">
                  {filteredEmployees.length} of {employees.length} employees
                </Text>
              </Group>
              <TextInput
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftSection={<Search size={16} />}
              />
            </Group>
          </Card.Section>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Employee</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Recent Activity</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredEmployees.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td>
                    <Group>
                      <Avatar src={employee.avatar} radius="xl">
                        {employee.name.split(' ').map((n: string) => n[0]).join('')}
                      </Avatar>
                      <Stack gap={0}>
                        <Text fw={500}>{employee.name}</Text>
                        <Text size="xs" c="dimmed">ID: {employee.id.slice(0, 8)}</Text>
                      </Stack>
                    </Group>
                  </Table.Td>
                  <Table.Td>{employee.email}</Table.Td>
                  <Table.Td>
                    <Badge color={getRoleBadgeColor(employee.role)}>
                      {employee.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" leftSection={<UserCheck size={12} />}>
                      Active
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">Last shift: 2 days ago</Text>
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
                          onClick={() => router.push(`/admin/employees/${employee.id}`)}
                        >
                          View Profile
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<Edit size={14} />}
                          onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
                        >
                          Edit Employee
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          color="red"
                          leftSection={<Trash2 size={14} />}
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                        >
                          Delete Employee
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

export default AdminEmployeesPage;
