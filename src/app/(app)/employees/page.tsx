"use client"

import React, { useState } from "react"
import { Card, Table, Button, Badge, Checkbox, Select, Avatar, TextInput, Textarea, Modal, Group, Text, Stack, Title, ActionIcon, NumberInput } from "@mantine/core"
import { Users, UserCheck, Settings, Save, X, Edit, Plus, UserPlus, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import type { User, UserRole } from "@/lib/types"

//*******************************************************************\\
//=======  Employees Page - Main Component  ========================\\
//*******************************************************************\\

function EmployeesPage() {
  //***************************\\
  //=======  State Management  =\\
  //***************************\\
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')

  // Form state for editing existing users
  const [editForm, setEditForm] = useState<Partial<User>>({})
  // Form state for creating new users
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee' as UserRole,
    location: '',
    performance: 0,
    crewChiefEligible: false,
    forkOperatorEligible: false,
    certifications: [] as string[],
    companyName: '',
    companyAddress: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: ''
  })

  //***************************\\
  //=======  Hooks  ===========\\
  //***************************\\
  const { toast } = useToast()
  // Fetch users data from the API
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useApi<{ users: User[] }>('/api/users')
  const users = usersData?.users || []

  //*********************************\\
  //=======  Editing Functions  =======\\
  //*********************************\\
  // Initiates the editing mode for a selected user
  const startEditing = (user: User) => {
    setEditingUser(user.id)
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      crewChiefEligible: user.crewChiefEligible || false,
      forkOperatorEligible: user.forkOperatorEligible || false,
      location: user.location || '',
      certifications: user.certifications || [],
      performance: user.performance || 0,
      companyName: user.companyName || '',
      contactPerson: user.contactPerson || '',
      contactEmail: user.contactEmail || '',
      contactPhone: user.contactPhone || ''
    })
  }

  // Cancels the editing mode and resets the edit form
  const cancelEditing = () => {
    setEditingUser(null)
    setEditForm({})
  }

  // Saves the updated user information to the backend
  const saveUser = async () => {
    if (!editForm.id) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/users/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast({
        title: "User Updated",
        description: `${editForm.name}'s information has been updated successfully`,
      })

      setEditingUser(null)
      setEditForm({})
      refetchUsers() // Refresh user data after successful update
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  //*********************************\\
  //=======  Creation Functions  =======\\
  //*********************************\\
  // Generates a random password for new user creation
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setGeneratedPassword(password)
    setNewUserForm({ ...newUserForm, password })
    return password
  }

  // Resets the new user form to its initial empty state
  const resetNewUserForm = () => {
    setNewUserForm({
      name: '',
      email: '',
      password: '',
      role: 'Employee' as UserRole,
      location: '',
      performance: 0,
      crewChiefEligible: false,
      forkOperatorEligible: false,
      certifications: [],
      companyName: '',
      companyAddress: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: ''
    })
    setGeneratedPassword('')
    setShowPassword(false)
  }

  // Opens the create new user dialog and generates a new password
  const openCreateDialog = () => {
    resetNewUserForm()
    generatePassword()
    setShowCreateDialog(true)
  }

  // Creates a new user in the backend
  const createUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast({
        title: "Validation Error",
        description: "Name, email, and password are required",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      toast({
        title: "User Created",
        description: `${newUserForm.name} has been created successfully`,
      })

      setShowCreateDialog(false)
      resetNewUserForm()
      refetchUsers() // Refresh user data after successful creation
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  //*********************************\\
  //=======  Helper Functions  =======\\
  //*********************************\\
  // Determines the badge color for user roles
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Manager/Admin': return 'purple'
      case 'Crew Chief': return 'blue'
      case 'Employee': return 'green'
      case 'Client': return 'orange'
      default: return 'gray'
    }
  }

  // Displays eligibility status for crew chief and fork operator roles
  const getEligibilityDisplay = (user: User) => {
    const eligibilities = []
    if (user.crewChiefEligible) eligibilities.push('CC')
    if (user.forkOperatorEligible) eligibilities.push('FO')
    return eligibilities.length > 0 ? eligibilities.join(', ') : 'None'
  }

  //*********************************\\
  //=======  Loading State  =========\\
  //*********************************\\
  // Displays a loading message while user data is being fetched
  if (usersLoading) {
    return (
      <Group justify="center" style={{ height: '64vh' }}>
        <Text size="lg">Loading employees...</Text>
      </Group>
    )
  }

  //***************************\\
  //=======  Render UI  =========\\
  //***************************\\
  return (
      <Stack gap="lg">
        {/* Header Section */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Employee Management</Title>
            <Text c="dimmed">
              Manage user roles, permissions, and employee eligibility settings
            </Text>
          </div>
          <Group>
            {/* Display total number of users */}
            <Badge variant="light" leftSection={<Users size={14} />}>
              {users.length} Total Users
            </Badge>
            {/* Button to add a new user */}
            <Button onClick={openCreateDialog} leftSection={<UserPlus size={16} />}>
              Add User
            </Button>
          </Group>
        </Group>

        {/* Employee Statistics Cards */}
        <Group>
          {/* Total Employees Card */}
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Users size={24} />
              <Text>Employees</Text>
            </Group>
            <Text size="xl" fw={700}>{users.filter(u => u.role === 'Employee').length}</Text>
          </Card>
          {/* Total Crew Chiefs Card */}
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <UserCheck size={24} />
              <Text>Crew Chiefs</Text>
            </Group>
            <Text size="xl" fw={700}>{users.filter(u => u.role === 'Crew Chief').length}</Text>
          </Card>
          {/* Crew Chief Eligible Card */}
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Settings size={24} />
              <Text>CC Eligible</Text>
            </Group>
            <Text size="xl" fw={700}>{users.filter(u => u.crewChiefEligible).length}</Text>
          </Card>
          {/* Fork Operator Eligible Card */}
          <Card withBorder p="md" radius="md" style={{ flex: 1 }}>
            <Group>
              <Settings size={24} />
              <Text>FO Eligible</Text>
            </Group>
            <Text size="xl" fw={700}>{users.filter(u => u.forkOperatorEligible).length}</Text>
          </Card>
        </Group>

        {/* All Users Table Card */}
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <Users size={20} />
              <Title order={4}>All Users</Title>
            </Group>
            <Text size="sm" c="dimmed">
              Manage user roles and permissions. Click the edit button to modify user settings.
            </Text>
          </Card.Section>
          <Card.Section>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Eligibility</Table.Th>
                  <Table.Th>Location</Table.Th>
                  <Table.Th>Performance</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Map through users to render table rows */}
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group>
                        {/* User Avatar and Name */}
                        <Avatar src={user.avatar} radius="xl">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <div>
                          <Text fw={500}>{user.name}</Text>
                          <Text size="sm" c="dimmed">{user.email}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {/* Role selection in editing mode, otherwise display badge */}
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.role}
                          onChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                          data={['Employee', 'Crew Chief', 'Manager/Admin', 'Client']}
                        />
                      ) : (
                        <Badge color={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* Eligibility checkboxes in editing mode, otherwise display text */}
                      {editingUser === user.id ? (
                        <Stack>
                          <Checkbox
                            label="Crew Chief"
                            checked={editForm.crewChiefEligible}
                            onChange={(event) => 
                              setEditForm({ ...editForm, crewChiefEligible: event.currentTarget.checked })
                            }
                          />
                          <Checkbox
                            label="Fork Operator"
                            checked={editForm.forkOperatorEligible}
                            onChange={(event) => 
                              setEditForm({ ...editForm, forkOperatorEligible: event.currentTarget.checked })
                            }
                          />
                        </Stack>
                      ) : (
                        <Text size="sm">{getEligibilityDisplay(user)}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* Location input in editing mode, otherwise display text */}
                      {editingUser === user.id ? (
                        <TextInput
                          value={editForm.location || ''}
                          onChange={(event) => setEditForm({ ...editForm, location: event.currentTarget.value })}
                          placeholder="Location"
                        />
                      ) : (
                        <Text size="sm">{user.location || '-'}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* Performance input in editing mode, otherwise display text */}
                      {editingUser === user.id ? (
                        <NumberInput
                          min={0}
                          max={5}
                          step={0.1}
                          value={editForm.performance || 0}
                          onChange={(value) => setEditForm({ ...editForm, performance: Number(value) || 0 })}
                        />
                      ) : (
                        <Text size="sm">
                          {user.performance ? `${user.performance}/5` : '-'}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* Action buttons for editing or saving/canceling */}
                      {editingUser === user.id ? (
                        <Group>
                          <ActionIcon onClick={saveUser} loading={isUpdating} variant="filled" color="blue"><Save size={16} /></ActionIcon>
                          <ActionIcon onClick={cancelEditing} disabled={isUpdating} variant="outline"><X size={16} /></ActionIcon>
                        </Group>
                      ) : (
                        <ActionIcon onClick={() => startEditing(user)} variant="outline"><Edit size={16} /></ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card.Section>
        </Card>

        {/* Create New User Modal */}
        <Modal opened={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="Create New User" size="lg">
          <Stack>
            <Title order={4}>Basic Information</Title>
            <TextInput
              label="Full Name"
              value={newUserForm.name}
              onChange={(event) => setNewUserForm({ ...newUserForm, name: event.currentTarget.value })}
              placeholder="Enter full name"
              required
            />
            <TextInput
              label="Email Address"
              type="email"
              value={newUserForm.email}
              onChange={(event) => setNewUserForm({ ...newUserForm, email: event.currentTarget.value })}
              placeholder="Enter email address"
              required
            />
            <Group>
              <TextInput
                label="Password"
                type={showPassword ? "text" : "password"}
                value={newUserForm.password}
                onChange={(event) => setNewUserForm({ ...newUserForm, password: event.currentTarget.value })}
                placeholder="Enter password"
                required
                style={{ flex: 1 }}
              />
              <Button onClick={() => setShowPassword(!showPassword)} variant="subtle" size="xs" style={{ alignSelf: 'flex-end' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
              <Button onClick={generatePassword} variant="outline" style={{ alignSelf: 'flex-end' }}>
                Generate
              </Button>
            </Group>
            {generatedPassword && (
              <Text size="sm" c="dimmed">
                Generated password: <code>{generatedPassword}</code>
              </Text>
            )}
            <Select
              label="Role"
              value={newUserForm.role}
              onChange={(value) => setNewUserForm({ ...newUserForm, role: value as UserRole })}
              data={['Employee', 'Crew Chief', 'Manager/Admin', 'Client']}
              required
            />

            {(newUserForm.role === 'Employee' || newUserForm.role === 'Crew Chief' || newUserForm.role === 'Manager/Admin') && (
              <>
                <Title order={4}>Employee Information</Title>
                <TextInput
                  label="Location"
                  value={newUserForm.location}
                  onChange={(event) => setNewUserForm({ ...newUserForm, location: event.currentTarget.value })}
                  placeholder="Work location"
                />
                <NumberInput
                  label="Performance Rating (0-5)"
                  min={0}
                  max={5}
                  step={0.1}
                  value={newUserForm.performance}
                  onChange={(value) => setNewUserForm({ ...newUserForm, performance: Number(value) || 0 })}
                />
                <Checkbox
                  label="Crew Chief Eligible"
                  checked={newUserForm.crewChiefEligible}
                  onChange={(event) =>
                    setNewUserForm({ ...newUserForm, crewChiefEligible: event.currentTarget.checked })
                  }
                />
                <Checkbox
                  label="Fork Operator Eligible"
                  checked={newUserForm.forkOperatorEligible}
                  onChange={(event) =>
                    setNewUserForm({ ...newUserForm, forkOperatorEligible: event.currentTarget.checked })
                  }
                />
              </>
            )}

            {newUserForm.role === 'Client' && (
              <>
                <Title order={4}>Company Information</Title>
                <TextInput
                  label="Company Name"
                  value={newUserForm.companyName}
                  onChange={(event) => setNewUserForm({ ...newUserForm, companyName: event.currentTarget.value })}
                  placeholder="Company name"
                />
                <Textarea
                  label="Company Address"
                  value={newUserForm.companyAddress}
                  onChange={(event) => setNewUserForm({ ...newUserForm, companyAddress: event.currentTarget.value })}
                  placeholder="Company address"
                />
                <TextInput
                  label="Contact Person"
                  value={newUserForm.contactPerson}
                  onChange={(event) => setNewUserForm({ ...newUserForm, contactPerson: event.currentTarget.value })}
                  placeholder="Primary contact person"
                />
                <TextInput
                  label="Contact Email"
                  type="email"
                  value={newUserForm.contactEmail}
                  onChange={(event) => setNewUserForm({ ...newUserForm, contactEmail: event.currentTarget.value })}
                  placeholder="Contact email"
                />
                <TextInput
                  label="Contact Phone"
                  value={newUserForm.contactPhone}
                  onChange={(event) => setNewUserForm({ ...newUserForm, contactPhone: event.currentTarget.value })}
                  placeholder="Contact phone number"
                />
              </>
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                onClick={createUser}
                loading={isCreating}
                disabled={!newUserForm.name || !newUserForm.email || !newUserForm.password}
              >
                Create User
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
  )
}

export default EmployeesPage;
