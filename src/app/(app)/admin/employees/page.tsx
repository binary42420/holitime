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
import { User } from "@/lib/types"; // Import User type

//*******************************************************************\\
//=======  Admin Employees Page - Main Component  =================\\
//*******************************************************************\\

function AdminEmployeesPage() {
  //***************************\\
  //=======  Hooks  ===========\\
  //***************************\\
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  // Fetch employee data from the API, specifying the expected type
  const { data: employeesData, loading, error } = useApi<{ users: User[] }>('/api/employees')
  
  //*********************************\\
  //=======  State Management  =======\\
  //*********************************\\
  const [searchTerm, setSearchTerm] = useState("")

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
  // Ensure employeesData.users is an array, default to empty array if null/undefined
  const employees = employeesData?.users || []
  // Filter employees based on the search term across name, email, and role
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  //*********************************\\
  //=======  Event Handlers  =========\\
  //*********************************\\
  // Handler for deleting an employee
  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    // Confirm deletion with the user
    if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
      try {
        // Send DELETE request to the API
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: 'DELETE',
        })
        
        // Check if the response was successful
        if (response.ok) {
          // Display success toast notification
          toast({
            title: "Employee Deleted",
            description: `${employeeName} has been successfully deleted.`,
          })
          // Reload the page to reflect the changes
          window.location.reload()
        } else {
          // Throw an error if the API call failed
          throw new Error('Failed to delete employee')
        }
      } catch {
        // Catch and handle any errors during the deletion process
        toast({
          title: "Error",
          description: "Failed to delete employee. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  //*********************************\\
  //=======  Helper Functions  =======\\
  //*********************************\\
  // Determines the badge color based on the employee's role
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

  //*********************************\\
  //=======  Loading & Error States  =========\\
  //*********************************\\
  // Display a loading spinner while data is being fetched
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

  // Display an error message if data fetching failed
  if (error) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Text color="red">Error loading Employees: {error.toString()}</Text>
        </Center>
      </Container>
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
            <Title order={1}>Employee Management</Title>
            <Text c="dimmed">Manage workforce and employee records</Text>
          </Stack>
          {/* Button to add a new employee */}
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => router.push('/admin/employees/new')}
          >
            Add Employee
          </Button>
        </Group>

        {/* All Employees Card */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Group>
                {/* Icon and Title for the section */}
                <Users size={20} />
                <Title order={4}>All Employees</Title>
                {/* Display count of filtered employees */}
                <Text c="dimmed" size="sm">
                  {filteredEmployees.length} of {employees.length} employees
                </Text>
              </Group>
              {/* Search input for filtering employees */}
              <TextInput
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftSection={<Search size={16} />}
              />
            </Group>
          </Card.Section>
          {/* Employees Table */}
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
              {/* Map through filtered employees to render each row */}
              {filteredEmployees.map((employee) => (
                <Table.Tr key={employee.id}>
                  <Table.Td>
                    <Group>
                      {/* Employee Avatar and Name */}
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
                    {/* Employee Role Badge */}
                    <Badge color={getRoleBadgeColor(employee.role)}>
                      {employee.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {/* Employee Status Badge */}
                    <Badge color="green" leftSection={<UserCheck size={12} />}>
                      Active
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {/* Recent Activity Placeholder */}
                    <Text size="sm" c="dimmed">Last shift: 2 days ago</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {/* Dropdown Menu for Actions */}
                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <ActionIcon variant="subtle">
                          <MoreHorizontal size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Actions</Menu.Label>
                        {/* View Profile Link */}
                        <Menu.Item
                          leftSection={<Eye size={14} />}
                          onClick={() => router.push(`/admin/employees/${employee.id}`)}
                        >
                          View Profile
                        </Menu.Item>
                        {/* Edit Employee Link */}
                        <Menu.Item
                          leftSection={<Edit size={14} />}
                          onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
                        >
                          Edit Employee
                        </Menu.Item>
                        <Menu.Divider />
                        {/* Delete Employee Button */}
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
