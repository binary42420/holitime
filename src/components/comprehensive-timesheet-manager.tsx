"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Users, Plus, Minus, UserPlus, X, Clock, ClockIcon, FileText, Download, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleCode } from "@/lib/types"
import { useApi } from "@/hooks/use-api"
import { format } from "date-fns"

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface TimeEntry {
  id: string;
  entryNumber: number;
  clockIn?: string;
  clockOut?: string;
  isActive: boolean;
}

interface AssignedWorker {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  roleOnShift: string;
  roleCode: string;
  status: 'Clocked Out' | 'Clocked In' | 'On Break' | 'Shift Ended';
  timeEntries: TimeEntry[];
}

interface ComprehensiveTimesheetManagerProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string; bgColor: string; borderColor: string }> = {
  'CC': { 
    name: 'Crew Chief', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-200' 
  },
  'SH': { 
    name: 'Stage Hand', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200' 
  },
  'FO': { 
    name: 'Fork Operator', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200' 
  },
  'RFO': { 
    name: 'Reach Fork Operator', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50', 
    borderColor: 'border-yellow-200' 
  },
  'RG': { 
    name: 'Rigger', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200' 
  },
  'GL': { 
    name: 'General Labor', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200' 
  },
} as const

export default function ComprehensiveTimesheetManager({ 
  shiftId, 
  assignedPersonnel, 
  onUpdate 
}: ComprehensiveTimesheetManagerProps) {
  const { toast } = useToast()
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Fetch worker requirements
  const { data: requirementsData, loading: requirementsLoading, refetch: refetchRequirements } = useApi<{ workerRequirements: WorkerRequirement[] }>(
    `/api/shifts/${shiftId}/worker-requirements`
  )

  // Fetch available employees for assignment
  const { data: usersData } = useApi<{ users: any[] }>('/api/users')
  const availableEmployees = usersData?.users?.filter(user => 
    user.role === 'Employee' || user.role === 'Crew Chief'
  ) || []

  useEffect(() => {
    if (requirementsData?.workerRequirements) {
      setWorkerRequirements(requirementsData.workerRequirements)
    } else if (requirementsData && requirementsData.workerRequirements?.length === 0) {
      // Initialize with default requirements if none exist
      const defaultRequirements: WorkerRequirement[] = [
        { roleCode: 'CC', requiredCount: 1 },
        { roleCode: 'SH', requiredCount: 0 },
        { roleCode: 'FO', requiredCount: 0 },
        { roleCode: 'RFO', requiredCount: 0 },
        { roleCode: 'RG', requiredCount: 0 },
        { roleCode: 'GL', requiredCount: 0 },
      ]
      setWorkerRequirements(defaultRequirements)
    }
  }, [requirementsData])

  const updateWorkerRequirement = async (roleCode: RoleCode, newCount: number) => {
    if (isUpdating || newCount < 0) return
    setIsUpdating(true)

    try {
      // Create a complete requirements array with all role types
      const allRoleTypes: RoleCode[] = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']
      const updatedRequirements: WorkerRequirement[] = allRoleTypes.map(role => {
        if (role === roleCode) {
          return { roleCode: role, requiredCount: newCount }
        }
        const existing = workerRequirements.find(req => req.roleCode === role)
        return existing || { roleCode: role, requiredCount: 0 }
      })

      const response = await fetch(`/api/shifts/${shiftId}/worker-requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerRequirements: updatedRequirements })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update worker requirements')
      }

      setWorkerRequirements(updatedRequirements)
      toast({
        title: "Requirements Updated",
        description: `${ROLE_DEFINITIONS[roleCode].name} requirement set to ${newCount}`,
      })
    } catch (error) {
      console.error('Error updating worker requirement:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update worker requirements",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const assignWorker = async (employeeId: string, roleCode: RoleCode) => {
    try {
      const employee = availableEmployees.find(emp => emp.id === employeeId)
      if (!employee) return

      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          roleCode,
          roleOnShift: ROLE_DEFINITIONS[roleCode].name
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign worker')
      }

      toast({
        title: "Worker Assigned",
        description: `${employee.name} assigned as ${ROLE_DEFINITIONS[roleCode].name}`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error assigning worker:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign worker",
        variant: "destructive",
      })
    }
  }

  const unassignWorker = async (assignmentId: string, workerName: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unassign worker')
      }

      toast({
        title: "Worker Unassigned",
        description: `${workerName} has been unassigned from this shift`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error unassigning worker:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unassign worker",
        variant: "destructive",
      })
    }
  }

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action.replace('_', ' ')}`)
      }

      const worker = assignedPersonnel.find(w => w.id === assignmentId)
      toast({
        title: action === 'clock_in' ? "Clocked In" : "Clocked Out",
        description: `${worker?.employeeName} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
      })
      onUpdate()
    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace('_', ' ')}`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const endWorkerShift = async (assignmentId: string, workerName: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end shift')
      }

      toast({
        title: "Shift Ended",
        description: `${workerName}'s shift has been ended`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending shift:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end shift",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const endAllShifts = async () => {
    const activeWorkers = assignedPersonnel.filter(w => w.status !== 'Shift Ended')
    if (activeWorkers.length === 0) {
      toast({
        title: "No Active Workers",
        description: "All workers have already ended their shifts",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end all shifts')
      }

      toast({
        title: "All Shifts Ended",
        description: `Ended shifts for ${activeWorkers.length} workers`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending all shifts:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end all shifts",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const finalizeTimesheet = async () => {
    const activeWorkers = assignedPersonnel.filter(w => w.status !== 'Shift Ended')
    if (activeWorkers.length > 0) {
      toast({
        title: "Cannot Finalize",
        description: `${activeWorkers.length} workers have not ended their shifts yet`,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finalize timesheet')
      }

      const result = await response.json()
      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      // Optionally redirect to timesheet approval page
      if (result.timesheetId) {
        window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
      }

      onUpdate()
    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize timesheet",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadTimesheet = async () => {
    try {
      // First check if there's a timesheet for this shift
      const timesheetResponse = await fetch(`/api/timesheets?shiftId=${shiftId}`)
      if (!timesheetResponse.ok) {
        throw new Error('No timesheet found for this shift')
      }

      const timesheetData = await timesheetResponse.json()
      if (!timesheetData.timesheets || timesheetData.timesheets.length === 0) {
        toast({
          title: "No Timesheet",
          description: "Please finalize the timesheet first before downloading",
          variant: "destructive",
        })
        return
      }

      const timesheetId = timesheetData.timesheets[0].id

      // Download the PDF
      const pdfResponse = await fetch(`/api/timesheets/${timesheetId}/pdf`)
      if (!pdfResponse.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await pdfResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${shiftId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "PDF Downloaded",
        description: "Timesheet PDF has been downloaded successfully",
      })
    } catch (error) {
      console.error('Error downloading timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download timesheet",
        variant: "destructive",
      })
    }
  }

  const getRequiredCount = (roleCode: RoleCode): number => {
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  const getAssignedWorkers = (roleCode: RoleCode): AssignedWorker[] => {
    return assignedPersonnel.filter(worker => worker.roleCode === roleCode)
  }

  const generateWorkerSlots = (roleCode: RoleCode) => {
    const requiredCount = getRequiredCount(roleCode)
    const assignedWorkers = getAssignedWorkers(roleCode)
    const slots = []

    // Add assigned workers
    assignedWorkers.forEach(worker => {
      slots.push({ type: 'assigned', worker })
    })

    // Add empty slots for remaining requirements
    const emptySlots = Math.max(0, requiredCount - assignedWorkers.length)
    for (let i = 0; i < emptySlots; i++) {
      slots.push({ type: 'empty', roleCode })
    }

    return slots
  }

  const getClockButtonText = (worker: AssignedWorker): string => {
    if (worker.status === 'Shift Ended') return 'Shift Ended'
    if (worker.status === 'Clocked In') return 'Clock Out'
    return 'Clock In'
  }

  const getClockButtonAction = (worker: AssignedWorker): 'clock_in' | 'clock_out' | null => {
    if (worker.status === 'Shift Ended') return null
    if (worker.status === 'Clocked In') return 'clock_out'
    return 'clock_in'
  }

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '-'
    return format(new Date(timestamp), 'HH:mm')
  }

  if (requirementsLoading) {
    return <div>Loading worker requirements...</div>
  }

  return (
    <div className="space-y-6">
      {/* Worker Requirements Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Worker Requirements
          </CardTitle>
          <CardDescription>
            Configure how many workers of each type are needed for this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const currentCount = getRequiredCount(roleCode)
              
              return (
                <div key={roleCode} className={`p-3 rounded-lg border ${roleDef.bgColor} ${roleDef.borderColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${roleDef.color}`}>{roleDef.name}</span>
                    <Badge variant="outline">{roleCode}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateWorkerRequirement(roleCode, currentCount - 1)}
                      disabled={currentCount === 0 || isUpdating}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{currentCount}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateWorkerRequirement(roleCode, currentCount + 1)}
                      disabled={isUpdating}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Worker Assignment Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Worker Assignments
          </CardTitle>
          <CardDescription>
            Assign specific workers to each required position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const slots = generateWorkerSlots(roleCode)
              
              if (slots.length === 0) return null

              return (
                <div key={roleCode} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${roleDef.color} ${roleDef.bgColor}`}>
                      {roleCode}
                    </Badge>
                    <span className={`font-medium ${roleDef.color}`}>{roleDef.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({getAssignedWorkers(roleCode).length}/{getRequiredCount(roleCode)} assigned)
                    </span>
                  </div>
                  
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {slots.map((slot, index) => (
                      <div 
                        key={`${roleCode}-${index}`} 
                        className={`p-3 rounded-lg border ${roleDef.bgColor} ${roleDef.borderColor}`}
                      >
                        {slot.type === 'assigned' ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={slot.worker.employeeAvatar} />
                                <AvatarFallback>
                                  {slot.worker.employeeName.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{slot.worker.employeeName}</div>
                                <div className={`text-xs ${roleDef.color}`}>{slot.worker.roleOnShift}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => unassignWorker(slot.worker.id, slot.worker.employeeName)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Select onValueChange={(employeeId) => assignWorker(employeeId, roleCode)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select worker..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEmployees
                                .filter(emp => !assignedPersonnel.some(assigned => assigned.employeeId === emp.id))
                                .map(employee => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timesheet Management Table */}
      {assignedPersonnel.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              Timesheet Management
            </CardTitle>
            <CardDescription>
              Manage clock in/out times and track worker hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Clock In 1</TableHead>
                    <TableHead>Clock Out 1</TableHead>
                    <TableHead>Clock In 2</TableHead>
                    <TableHead>Clock Out 2</TableHead>
                    <TableHead>Clock In 3</TableHead>
                    <TableHead>Clock Out 3</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedPersonnel.map((worker) => {
                    const roleDef = ROLE_DEFINITIONS[worker.roleCode as RoleCode]
                    const clockAction = getClockButtonAction(worker)

                    return (
                      <TableRow key={worker.id} className={`${roleDef?.bgColor || 'bg-gray-50'}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={worker.employeeAvatar} />
                              <AvatarFallback>
                                {worker.employeeName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{worker.employeeName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${roleDef?.color || 'text-gray-700'}`}>
                            {worker.roleCode}
                          </Badge>
                          <div className="text-sm text-muted-foreground">{worker.roleOnShift}</div>
                        </TableCell>

                        {/* Time entry columns for 3 pairs */}
                        {[1, 2, 3].map((entryNum) => {
                          const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
                          return (
                            <React.Fragment key={entryNum}>
                              <TableCell className="text-center">
                                {formatTime(entry?.clockIn)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatTime(entry?.clockOut)}
                              </TableCell>
                            </React.Fragment>
                          )
                        })}

                        <TableCell>
                          <Badge
                            variant={worker.status === 'Shift Ended' ? 'secondary' :
                                   worker.status === 'Clocked In' ? 'default' : 'outline'}
                            className={
                              worker.status === 'Clocked In' ? 'bg-green-100 text-green-800' :
                              worker.status === 'Shift Ended' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {worker.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {clockAction && (
                              <Button
                                size="sm"
                                variant={clockAction === 'clock_in' ? 'default' : 'outline'}
                                onClick={() => handleClockAction(worker.id, clockAction)}
                                disabled={isProcessing}
                                className="min-w-[80px]"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {getClockButtonText(worker)}
                              </Button>
                            )}

                            {worker.status !== 'Shift Ended' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isProcessing}
                                  >
                                    End Shift
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>End Shift</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to end {worker.employeeName}'s shift?
                                      This will clock them out if they're currently clocked in and mark their status as 'Shift Ended'.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => endWorkerShift(worker.id, worker.employeeName)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      End Shift
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Bulk Operations */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isProcessing || assignedPersonnel.filter(w => w.status !== 'Shift Ended').length === 0}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      End All Shifts
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End All Shifts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to end shifts for all active workers? This will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Clock out all currently clocked-in workers</li>
                          <li>Mark all worker statuses as 'Shift Ended'</li>
                        </ul>
                        <div className="mt-3 p-3 bg-muted rounded">
                          <strong>Affected workers:</strong>
                          <ul className="mt-1">
                            {assignedPersonnel
                              .filter(w => w.status !== 'Shift Ended')
                              .map(w => (
                                <li key={w.id} className="text-sm">• {w.employeeName} ({w.roleOnShift})</li>
                              ))}
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={endAllShifts}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        End All Shifts
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={downloadTimesheet}
                  variant="outline"
                  disabled={isProcessing}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={finalizeTimesheet}
                  disabled={isProcessing || assignedPersonnel.some(w => w.status !== 'Shift Ended')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalize Timesheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

            {/* Bulk Operations */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center gap-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isProcessing || assignedPersonnel.filter(w => w.status !== 'Shift Ended').length === 0}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      End All Shifts
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End All Shifts</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to end shifts for all active workers? This will:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Clock out all currently clocked-in workers</li>
                          <li>Mark all worker statuses as 'Shift Ended'</li>
                        </ul>
                        <div className="mt-3 p-3 bg-muted rounded">
                          <strong>Affected workers:</strong>
                          <ul className="mt-1">
                            {assignedPersonnel
                              .filter(w => w.status !== 'Shift Ended')
                              .map(w => (
                                <li key={w.id} className="text-sm">• {w.employeeName} ({w.roleOnShift})</li>
                              ))}
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={endAllShifts}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        End All Shifts
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={finalizeTimesheet}
                  disabled={isProcessing || assignedPersonnel.some(w => w.status !== 'Shift Ended')}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalize Timesheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
