'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Award
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface PendingEmployee {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  created_by: string
  created_by_name: string
  approval_notes?: string
  assigned_shifts_count: number
}

export default function PendingEmployeesPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedEmployee, setSelectedEmployee] = useState<PendingEmployee | null>(null)
  const [approvalForm, setApprovalForm] = useState({
    email: '',
    phone: '',
    certifications: '',
    location: '',
    notes: ''
  })
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Only managers can access this page
  if (user?.role !== 'Manager/Admin') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage pending employees.</p>
        </div>
      </div>
    )
  }

  const { data: pendingData, loading, error, refetch } = useApi<{ pendingEmployees: PendingEmployee[] }>(
    '/api/admin/pending-employees'
  )

  const pendingEmployees = pendingData?.pendingEmployees || []

  const handleApprove = async () => {
    if (!selectedEmployee) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/pending-employees/${selectedEmployee.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve employee')
      }

      toast({
        title: "Employee Approved",
        description: `${selectedEmployee.name} has been approved and activated.`,
      })

      setSelectedEmployee(null)
      setApprovalForm({ email: '', phone: '', certifications: '', location: '', notes: '' })
      refetch()
    } catch (error) {
      console.error('Error approving employee:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve employee",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedEmployee || !rejectionReason.trim()) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/admin/pending-employees/${selectedEmployee.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject employee')
      }

      toast({
        title: "Employee Rejected",
        description: `${selectedEmployee.name} has been rejected and removed.`,
      })

      setSelectedEmployee(null)
      setRejectionReason('')
      refetch()
    } catch (error) {
      console.error('Error rejecting employee:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject employee",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pending employees...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground">Failed to load pending employees.</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-headline">Pending Employee Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve pending employee accounts created by crew chiefs and managers
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingEmployees.reduce((sum, emp) => sum + emp.assigned_shifts_count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Shift Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingEmployees.filter(emp => emp.assigned_shifts_count > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">With Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Pending Employee Accounts
          </CardTitle>
          <CardDescription>
            {pendingEmployees.length === 0 
              ? "No pending employee accounts require approval"
              : `${pendingEmployees.length} employee account${pendingEmployees.length === 1 ? '' : 's'} awaiting approval`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingEmployees.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Approvals</h3>
              <p className="text-muted-foreground">
                All employee accounts have been processed. New pending accounts will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Assigned Shifts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{employee.created_by_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(employee.created_at), 'MMM d, yyyy')}
                        <div className="text-muted-foreground">
                          {format(new Date(employee.created_at), 'h:mm a')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.assigned_shifts_count > 0 ? "default" : "secondary"}>
                        {employee.assigned_shifts_count} shift{employee.assigned_shifts_count === 1 ? '' : 's'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Pending Approval
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedEmployee(employee)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Approve Employee</DialogTitle>
                              <DialogDescription>
                                Complete the employee profile for {employee.name} and activate their account.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={approvalForm.email}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="employee@company.com"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  value={approvalForm.phone}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, phone: e.target.value }))}
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                  id="location"
                                  value={approvalForm.location}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, location: e.target.value }))}
                                  placeholder="City, State"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="certifications">Certifications</Label>
                                <Input
                                  id="certifications"
                                  value={approvalForm.certifications}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, certifications: e.target.value }))}
                                  placeholder="Comma-separated list"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="notes">Approval Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={approvalForm.notes}
                                  onChange={(e) => setApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Optional notes about this approval"
                                  rows={3}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleApprove}
                                disabled={!approvalForm.email.trim() || isProcessing}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isProcessing ? 'Approving...' : 'Approve & Activate'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedEmployee(employee)}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Reject Employee</DialogTitle>
                              <DialogDescription>
                                Reject and remove the pending account for {employee.name}. This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
                                <Textarea
                                  id="rejectionReason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Explain why this account is being rejected"
                                  rows={3}
                                  required
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || isProcessing}
                              >
                                {isProcessing ? 'Rejecting...' : 'Reject Account'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
