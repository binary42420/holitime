"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function AdminEmployeesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: employeesData, loading, error } = useApi<{ users: any[] }>('/api/employees')
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
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete employee. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Manager/Admin':
        return 'destructive'
      case 'Crew Chief':
        return 'default'
      case 'Employee':
        return 'secondary'
      case 'Client':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading employees...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading employees: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Employee Management</h1>
          <p className="text-muted-foreground">Manage workforce and employee records</p>
        </div>
        <Button onClick={() => router.push('/admin/employees/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Employees
              </CardTitle>
              <CardDescription>
                {filteredEmployees.length} of {employees.length} employees
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recent Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>
                          {employee.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {employee.id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(employee.role)}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      <UserCheck className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      Last shift: 2 days ago
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/employees/${employee.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(AdminEmployeesPage, hasAdminAccess);
