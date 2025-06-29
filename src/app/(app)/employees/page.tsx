"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Users, UserCheck, Settings, Save, X, Edit, Plus, UserPlus, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import type { User, UserRole } from "@/lib/types"

interface EmployeeManagementProps {}

export default function EmployeesPage({}: EmployeeManagementProps) {
  const { toast } = useToast()
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')

  // Fetch all users
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useApi<{ users: User[] }>('/api/users')
  const users = usersData?.users || []

  const [editForm, setEditForm] = useState<Partial<User>>({})
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

  const cancelEditing = () => {
    setEditingUser(null)
    setEditForm({})
  }

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

  const openCreateDialog = () => {
    resetNewUserForm()
    generatePassword()
    setShowCreateDialog(true)
  }

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
      refetchUsers()
    } catch (error) {
      console.error('Error updating user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

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

      const result = await response.json()

      toast({
        title: "User Created",
        description: `${newUserForm.name} has been created successfully`,
      })

      setShowCreateDialog(false)
      resetNewUserForm()
      refetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Manager/Admin': return 'bg-purple-100 text-purple-800'
      case 'Crew Chief': return 'bg-blue-100 text-blue-800'
      case 'Employee': return 'bg-green-100 text-green-800'
      case 'Client': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEligibilityDisplay = (user: User) => {
    const eligibilities = []
    if (user.crewChiefEligible) eligibilities.push('CC')
    if (user.forkOperatorEligible) eligibilities.push('FO')
    return eligibilities.length > 0 ? eligibilities.join(', ') : 'None'
  }

  if (usersLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading employees...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and employee eligibility settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {users.length} Total Users
          </Badge>
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'Employee').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crew Chiefs</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'Crew Chief').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CC Eligible</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.crewChiefEligible).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FO Eligible</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.forkOperatorEligible).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions. Click the edit button to modify user settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.role}
                          onValueChange={(value: UserRole) => setEditForm({ ...editForm, role: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Employee">Employee</SelectItem>
                            <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                            <SelectItem value="Manager/Admin">Manager/Admin</SelectItem>
                            <SelectItem value="Client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`cc-${user.id}`}
                              checked={editForm.crewChiefEligible}
                              onCheckedChange={(checked) => 
                                setEditForm({ ...editForm, crewChiefEligible: checked as boolean })
                              }
                            />
                            <Label htmlFor={`cc-${user.id}`} className="text-xs">Crew Chief</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`fo-${user.id}`}
                              checked={editForm.forkOperatorEligible}
                              onCheckedChange={(checked) => 
                                setEditForm({ ...editForm, forkOperatorEligible: checked as boolean })
                              }
                            />
                            <Label htmlFor={`fo-${user.id}`} className="text-xs">Fork Operator</Label>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm">{getEligibilityDisplay(user)}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingUser === user.id ? (
                        <Input
                          value={editForm.location || ''}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          placeholder="Location"
                          className="w-24"
                        />
                      ) : (
                        <span className="text-sm">{user.location || '-'}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingUser === user.id ? (
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={editForm.performance || 0}
                          onChange={(e) => setEditForm({ ...editForm, performance: parseFloat(e.target.value) || 0 })}
                          className="w-16"
                        />
                      ) : (
                        <span className="text-sm">
                          {user.performance ? `${user.performance}/5` : '-'}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingUser === user.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={saveUser}
                            disabled={isUpdating}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(user)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new user to the system. Fill in the required information and set appropriate permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Full Name *</Label>
                  <Input
                    id="new-name"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email Address *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                  >
                    Generate
                  </Button>
                </div>
                {generatedPassword && (
                  <p className="text-sm text-muted-foreground">
                    Generated password: <code className="bg-muted px-1 rounded">{generatedPassword}</code>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-role">Role *</Label>
                <Select
                  value={newUserForm.role}
                  onValueChange={(value: UserRole) => setNewUserForm({ ...newUserForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                    <SelectItem value="Manager/Admin">Manager/Admin</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee-specific fields */}
            {(newUserForm.role === 'Employee' || newUserForm.role === 'Crew Chief' || newUserForm.role === 'Manager/Admin') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Employee Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-location">Location</Label>
                    <Input
                      id="new-location"
                      value={newUserForm.location}
                      onChange={(e) => setNewUserForm({ ...newUserForm, location: e.target.value })}
                      placeholder="Work location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-performance">Performance Rating (0-5)</Label>
                    <Input
                      id="new-performance"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={newUserForm.performance}
                      onChange={(e) => setNewUserForm({ ...newUserForm, performance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-crew-chief"
                        checked={newUserForm.crewChiefEligible}
                        onCheckedChange={(checked) =>
                          setNewUserForm({ ...newUserForm, crewChiefEligible: checked as boolean })
                        }
                      />
                      <Label htmlFor="new-crew-chief">Crew Chief Eligible</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-fork-operator"
                        checked={newUserForm.forkOperatorEligible}
                        onCheckedChange={(checked) =>
                          setNewUserForm({ ...newUserForm, forkOperatorEligible: checked as boolean })
                        }
                      />
                      <Label htmlFor="new-fork-operator">Fork Operator Eligible</Label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client-specific fields */}
            {newUserForm.role === 'Client' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Information</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-company-name">Company Name</Label>
                    <Input
                      id="new-company-name"
                      value={newUserForm.companyName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, companyName: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-company-address">Company Address</Label>
                    <Textarea
                      id="new-company-address"
                      value={newUserForm.companyAddress}
                      onChange={(e) => setNewUserForm({ ...newUserForm, companyAddress: e.target.value })}
                      placeholder="Company address"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-contact-person">Contact Person</Label>
                      <Input
                        id="new-contact-person"
                        value={newUserForm.contactPerson}
                        onChange={(e) => setNewUserForm({ ...newUserForm, contactPerson: e.target.value })}
                        placeholder="Primary contact person"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-contact-email">Contact Email</Label>
                      <Input
                        id="new-contact-email"
                        type="email"
                        value={newUserForm.contactEmail}
                        onChange={(e) => setNewUserForm({ ...newUserForm, contactEmail: e.target.value })}
                        placeholder="Contact email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-contact-phone">Contact Phone</Label>
                    <Input
                      id="new-contact-phone"
                      value={newUserForm.contactPhone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, contactPhone: e.target.value })}
                      placeholder="Contact phone number"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={createUser}
              disabled={isCreating || !newUserForm.name || !newUserForm.email || !newUserForm.password}
            >
              {isCreating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
