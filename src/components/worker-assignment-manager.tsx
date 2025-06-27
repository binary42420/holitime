"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Plus,
  Minus,
  Clock,
  Play,
  Square,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut,
  StopCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { RoleCode } from "@/lib/types"

interface WorkerRequirement {
  roleCode: RoleCode
  roleName: string
  count: number
  color: string
}

interface AssignedWorker {
  id?: string
  employeeId?: string
  employeeName?: string
  employeeAvatar?: string
  roleCode: RoleCode
  roleName: string
  status: 'not_assigned' | 'assigned' | 'clocked_in' | 'clocked_out' | 'shift_ended'
  isPlaceholder: boolean
  timeEntries?: any[]
}

interface WorkerAssignmentManagerProps {
  shiftId: string
  shift: any
  assignedPersonnel: any[]
  onUpdate: () => void
}

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string; bgColor: string }> = {
  'CC': { name: 'Crew Chief', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'SH': { name: 'Stage Hand', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'FO': { name: 'Fork Operator', color: 'text-green-700', bgColor: 'bg-green-100' },
  'RFO': { name: 'Reach Fork Operator', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'RG': { name: 'Rigger', color: 'text-red-700', bgColor: 'bg-red-100' },
  'GL': { name: 'General Labor', color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

export default function WorkerAssignmentManager({ shiftId, shift, assignedPersonnel, onUpdate }: WorkerAssignmentManagerProps) {
  const { toast } = useToast()
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [assignedWorkers, setAssignedWorkers] = useState<AssignedWorker[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])

  const { data: employeesData } = useApi<{ users: any[] }>('/api/users')

  // Debounce timer for API updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced function to update shift requested workers
  const debouncedUpdateShift = useCallback((newTotal: number) => {
    // Clear any existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current)
    }

    // Set a new timer
    updateTimerRef.current = setTimeout(async () => {
      try {
        console.log(`Debounced update: Updating shift ${shiftId} with new total workers: ${newTotal}`)

        const response = await fetch(`/api/shifts/${shiftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requestedWorkers: newTotal }),
        })

        if (!response.ok) {
          throw new Error('Failed to update requested workers')
        }

        console.log('Successfully updated shift requested workers')

        // Don't trigger refresh immediately to avoid race conditions
        // The local state is already updated, so no need to refetch
      } catch (error) {
        console.error('Error updating requested workers:', error)
        toast({
          title: "Warning",
          description: "Worker count updated locally but failed to save to database.",
          variant: "destructive",
        })
      }
    }, 500) // 500ms debounce delay
  }, [shiftId, onUpdate, toast])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (employeesData?.users) {
      // Filter out clients and employees already assigned to this shift
      const filteredEmployees = employeesData.users.filter(user => {
        // Exclude clients
        if (user.role === 'Client') return false

        // Exclude employees already assigned to this shift
        const isAlreadyAssigned = assignedWorkers.some(worker =>
          worker.employeeId === user.id || worker.userId === user.id && !worker.isPlaceholder
        )

        return !isAlreadyAssigned
      })

      setAvailableEmployees(filteredEmployees)
    }
  }, [employeesData, assignedWorkers])

  useEffect(() => {
    if (assignedPersonnel && assignedPersonnel.length > 0) {
      // Convert assigned personnel to our format
      const assigned = assignedPersonnel.map(person => ({
        id: person.id,
        employeeId: person.employeeId,
        employeeName: person.employeeName,
        employeeAvatar: person.employeeAvatar,
        roleCode: person.roleCode,
        roleName: ROLE_DEFINITIONS[person.roleCode]?.name || person.roleOnShift || person.roleCode,
        status: person.status === 'clocked_in' ? 'clocked_in' :
                person.status === 'clocked_out' ? 'clocked_out' :
                person.status === 'shift_ended' ? 'shift_ended' : 'assigned',
        isPlaceholder: false, // Assigned workers are never placeholders
        timeEntries: person.timeEntries || []
      }))

      setAssignedWorkers(assigned)

      // Auto-generate worker requirements based on assigned personnel
      const roleGroups = assigned.reduce((acc, worker) => {
        if (!acc[worker.roleCode]) {
          acc[worker.roleCode] = {
            roleCode: worker.roleCode,
            roleName: worker.roleName,
            count: 0,
            color: ROLE_DEFINITIONS[worker.roleCode]?.color || 'bg-gray-100'
          }
        }
        acc[worker.roleCode].count++
        return acc
      }, {} as Record<string, WorkerRequirement>)

      const requirements = Object.values(roleGroups)
      if (requirements.length > 0) {
        setWorkerRequirements(requirements)
      }
    } else {
      // Clear assigned workers if no personnel data
      setAssignedWorkers([])
    }
  }, [assignedPersonnel])

  // Initialize default worker requirements based on shift data
  useEffect(() => {
    console.log(`DEBUG: Worker requirements effect triggered`, {
      shift: !!shift,
      requestedWorkers: shift?.requestedWorkers,
      currentRequirements: workerRequirements,
      currentTotal: workerRequirements.reduce((sum, req) => sum + req.count, 0)
    })

    if (shift) {
      // Always regenerate requirements when shift.requestedWorkers changes
      const requestedWorkers = shift.requestedWorkers || 1

      // Check if we need to update requirements
      const currentTotal = workerRequirements.reduce((sum, req) => sum + req.count, 0)

      if (workerRequirements.length === 0 || currentTotal !== requestedWorkers) {
        console.log(`DEBUG: Updating worker requirements - requested: ${requestedWorkers}, current total: ${currentTotal}`)

        // Create default structure based on requested workers
        const defaultRequirements: WorkerRequirement[] = [
          { roleCode: 'CC', roleName: 'Crew Chief', count: 1, color: ROLE_DEFINITIONS.CC.color },
          { roleCode: 'SH', roleName: 'Stage Hand', count: Math.max(0, requestedWorkers - 1), color: ROLE_DEFINITIONS.SH.color },
        ]
        console.log(`DEBUG: Setting new requirements:`, defaultRequirements)
        setWorkerRequirements(defaultRequirements)
      } else {
        console.log(`DEBUG: No update needed - totals match`)
      }
    }
  }, [shift, shift?.requestedWorkers, workerRequirements])

  // Generate complete worker list combining assigned workers and placeholders
  const generateCompleteWorkerList = () => {
    const completeList: AssignedWorker[] = []

    // If we have worker requirements, use them to organize the list
    if (workerRequirements.length > 0) {
      workerRequirements.forEach(requirement => {
        // Get existing assigned workers for this role
        const existingWorkers = assignedWorkers.filter(w =>
          w.roleCode === requirement.roleCode && !w.isPlaceholder
        )

        // Add existing assigned workers
        completeList.push(...existingWorkers)

        // Calculate how many placeholder slots we need
        const placeholdersNeeded = Math.max(0, requirement.count - existingWorkers.length)

        // Add placeholder slots
        for (let i = 0; i < placeholdersNeeded; i++) {
          completeList.push({
            roleCode: requirement.roleCode,
            roleName: requirement.roleName,
            status: 'not_assigned',
            isPlaceholder: true
          })
        }
      })
    } else if (assignedWorkers.length > 0) {
      // If no worker requirements but we have assigned workers, show them
      completeList.push(...assignedWorkers.filter(w => !w.isPlaceholder))
    }

    return completeList
  }

  const updateWorkerRequirement = (roleCode: RoleCode, newCount: number) => {
    console.log(`DEBUG: updateWorkerRequirement called: ${roleCode} to ${newCount}`)

    // Calculate the updated requirements first
    const updated = workerRequirements.map(req =>
      req.roleCode === roleCode ? { ...req, count: Math.max(0, newCount) } : req
    )

    // Add new role if it doesn't exist and count > 0
    if (newCount > 0 && !workerRequirements.find(req => req.roleCode === roleCode)) {
      updated.push({
        roleCode,
        roleName: ROLE_DEFINITIONS[roleCode].name,
        count: newCount,
        color: ROLE_DEFINITIONS[roleCode].color
      })
    }

    const filteredUpdated = updated.filter(req => req.count > 0)

    // Calculate new total requested workers
    const newTotal = filteredUpdated.reduce((sum, req) => sum + req.count, 0)

    console.log(`DEBUG: New worker requirements:`, filteredUpdated)
    console.log(`DEBUG: New total workers: ${newTotal}`)

    // Update local state immediately
    setWorkerRequirements(filteredUpdated)

    // Use debounced function to update the database
    console.log(`DEBUG: About to call debouncedUpdateShift with ${newTotal}`)
    debouncedUpdateShift(newTotal)
    console.log(`DEBUG: Called debouncedUpdateShift`)

    // If reducing count, we might need to unassign some workers
    if (newCount >= 0) {
      const currentAssignedWorkers = assignedWorkers.filter(w =>
        w.roleCode === roleCode && !w.isPlaceholder
      )

      // If we have more assigned workers than the new count allows, we should warn the user
      if (currentAssignedWorkers.length > newCount) {
        // For now, we'll allow this but the UI will show the excess workers
        // In a production app, you might want to show a confirmation dialog
        console.warn(`Reducing ${roleCode} count to ${newCount} but ${currentAssignedWorkers.length} workers are already assigned`)
      }
    }
  }



  const assignEmployee = async (workerIndex: number, employeeId: string) => {
    const completeWorkerList = generateCompleteWorkerList()
    const worker = completeWorkerList[workerIndex]
    const employee = availableEmployees.find(emp => emp.id === employeeId)

    if (!employee || !worker) {
      console.error('Missing employee or worker:', { employee, worker, employeeId, workerIndex })
      return
    }

    console.log('Assigning employee:', {
      employeeId,
      roleCode: worker.roleCode,
      roleOnShift: worker.roleName,
      shiftId
    })

    try {
      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          roleCode: worker.roleCode,
          roleOnShift: worker.roleName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Assignment failed:', errorData)

        // Handle specific error cases
        if (errorData.error?.includes('already assigned')) {
          throw new Error(`${employee.name} is already assigned to this shift`)
        } else if (errorData.error?.includes('not found')) {
          throw new Error(`Employee record not found for ${employee.name}`)
        } else {
          throw new Error(errorData.error || 'Failed to assign worker')
        }
      }

      const result = await response.json()
      console.log('Assignment successful:', result)

      toast({
        title: "Worker Assigned",
        description: `${employee.name} has been assigned as ${worker.roleName}`,
      })

      onUpdate()
    } catch (error) {
      console.error('Assignment error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign worker. Please try again.",
        variant: "destructive",
      })
    }
  }

  const unassignEmployee = async (assignmentId: string) => {
    try {
      // Check if this is a crew chief assignment (special ID format)
      if (assignmentId.startsWith('crew-chief-')) {
        // For crew chief, update the shift to remove crew chief
        const response = await fetch(`/api/shifts/${shiftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ crewChiefId: '' }),
        })

        if (!response.ok) {
          throw new Error('Failed to unassign crew chief')
        }

        toast({
          title: "Crew Chief Unassigned",
          description: "The crew chief has been unassigned from this shift",
        })
      } else {
        // For regular workers, delete from assigned_personnel
        const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to unassign worker')
        }

        toast({
          title: "Worker Unassigned",
          description: "Worker has been unassigned from this shift",
        })
      }

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign worker. Please try again.",
        variant: "destructive",
      })
    }
  }

  const clockInOut = async (assignmentId: string, employeeName: string, isClockingIn: boolean) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isClockingIn ? 'clock_in' : 'clock_out'
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${isClockingIn ? 'clock in' : 'clock out'} worker`)
      }

      toast({
        title: `${isClockingIn ? 'Clocked In' : 'Clocked Out'}`,
        description: `${employeeName} has been ${isClockingIn ? 'clocked in' : 'clocked out'}`,
      })

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isClockingIn ? 'clock in' : 'clock out'} worker. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const endShiftForWorker = async (assignmentId: string, employeeName: string) => {
    if (!confirm(`Are you sure you want to end the shift for ${employeeName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to end shift for worker')
      }

      toast({
        title: "Shift Ended",
        description: `Shift has been ended for ${employeeName}`,
      })

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end shift for worker. Please try again.",
        variant: "destructive",
      })
    }
  }

  const endShiftForAllWorkers = async () => {
    const activeWorkers = assignedWorkers.filter(worker =>
      !worker.isPlaceholder && (worker.status === 'clocked_in' || worker.status === 'assigned')
    )

    if (activeWorkers.length === 0) {
      toast({
        title: "No Active Workers",
        description: "There are no workers currently clocked in or assigned to end shifts for.",
        variant: "destructive",
      })
      return
    }

    const workerNames = activeWorkers.map(w => w.employeeName).join(', ')
    if (!confirm(`Are you sure you want to end the shift for all workers? This will clock out: ${workerNames}`)) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to end shifts for all workers')
      }

      toast({
        title: "All Shifts Ended",
        description: "Shifts have been ended for all workers",
      })

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end shifts for all workers. Please try again.",
        variant: "destructive",
      })
    }
  }

  const finalizeTimesheet = async () => {
    if (!confirm('Are you sure you want to finalize the timesheet? This will change the status to pending client approval.')) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to finalize timesheet')
      }

      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize timesheet. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Helper function to determine if worker is currently clocked in
  const isWorkerClockedIn = (worker: AssignedWorker) => {
    if (!worker.timeEntries || worker.timeEntries.length === 0) return false

    // Check if there's an active time entry (clocked in but not clocked out)
    // Since the database might not have is_active column, we check for entries with clockIn but no clockOut
    return worker.timeEntries.some((entry: any) => entry.clockIn && !entry.clockOut)
  }

  // Helper function to determine if worker can clock in
  const canWorkerClockIn = (worker: AssignedWorker) => {
    return !worker.isPlaceholder && worker.status !== 'shift_ended' && !isWorkerClockedIn(worker)
  }

  // Helper function to determine if worker can clock out
  const canWorkerClockOut = (worker: AssignedWorker) => {
    return !worker.isPlaceholder && isWorkerClockedIn(worker)
  }

  // Helper function to check if all workers have ended their shifts
  const allWorkersShiftEnded = () => {
    const realWorkers = assignedWorkers.filter(worker => !worker.isPlaceholder)
    return realWorkers.length > 0 && realWorkers.every(worker => worker.status === 'shift_ended')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      'not_assigned': { variant: 'outline', icon: AlertCircle },
      'assigned': { variant: 'secondary', icon: CheckCircle },
      'clocked_in': { variant: 'default', icon: Play },
      'clocked_out': { variant: 'outline', icon: Square },
      'shift_ended': { variant: 'secondary', icon: CheckCircle }
    }
    
    const config = variants[status] || variants['not_assigned']
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Worker Assignments
        </CardTitle>
        <CardDescription>
          Configure worker requirements and assign employees to this shift
        </CardDescription>
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          Debug: Raw assigned personnel: {assignedPersonnel?.length || 0} |
          Processed assigned workers: {assignedWorkers.length} |
          Worker requirements: {workerRequirements.length}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Worker Requirements Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Worker Requirements</h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_DEFINITIONS).map(([roleCode, roleDef]) => {
              const requirement = workerRequirements.find(req => req.roleCode === roleCode)
              const currentCount = requirement?.count || 0
              
              return (
                <div key={roleCode} className={`p-3 rounded-lg border ${roleDef.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${roleDef.color}`}>{roleDef.name}</span>
                    <Badge variant="outline">{roleCode}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateWorkerRequirement(roleCode as RoleCode, currentCount - 1)}
                      disabled={currentCount === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{currentCount}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateWorkerRequirement(roleCode as RoleCode, currentCount + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Assigned Workers Table */}
        <div className="space-y-4">
          <h4 className="font-medium">Assigned Workers</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time Entries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const completeWorkerList = generateCompleteWorkerList()
                console.log('Table rendering - completeWorkerList:', completeWorkerList)
                console.log('Table rendering - assignedWorkers state:', assignedWorkers)
                console.log('Table rendering - workerRequirements state:', workerRequirements)

                if (completeWorkerList.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Configure worker requirements above to create assignment slots
                      </TableCell>
                    </TableRow>
                  )
                }

                return completeWorkerList.map((worker, index) => {
                  const roleDef = ROLE_DEFINITIONS[worker.roleCode]
                  return (
                    <TableRow key={`${worker.roleCode}-${index}-${worker.id || 'placeholder'}`} className={roleDef.bgColor}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={roleDef.color}>
                            {worker.roleCode}
                          </Badge>
                          <span className="font-medium">{worker.roleName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {worker.isPlaceholder && worker.status === 'not_assigned' ? (
                          <Select onValueChange={(value) => assignEmployee(index, value)}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select employee..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableEmployees
                                .filter(employee => employee.id && employee.id.trim() !== '')
                                .map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={employee.avatar} />
                                      <AvatarFallback>{employee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{employee.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : worker.employeeName ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={worker.employeeAvatar} />
                              <AvatarFallback>{worker.employeeName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{worker.employeeName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No employee assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(worker.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {worker.timeEntries?.length || 0} entries
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {worker.id && !worker.isPlaceholder ? (
                          <div className="flex items-center gap-2 justify-end">
                            {/* Clock In/Out Button */}
                            {canWorkerClockIn(worker) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => clockInOut(worker.id!, worker.employeeName!, true)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <LogIn className="h-4 w-4 mr-1" />
                                Clock In
                              </Button>
                            ) : canWorkerClockOut(worker) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => clockInOut(worker.id!, worker.employeeName!, false)}
                                className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              >
                                <LogOut className="h-4 w-4 mr-1" />
                                Clock Out
                              </Button>
                            ) : null}

                            {/* End Shift Button */}
                            {worker.status !== 'shift_ended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => endShiftForWorker(worker.id!, worker.employeeName!)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <StopCircle className="h-4 w-4 mr-1" />
                                End Shift
                              </Button>
                            )}

                            {/* Unassign Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unassignEmployee(worker.id!)}
                            >
                              Unassign
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              })()}
            </TableBody>
          </Table>

          {/* Bulk Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={endShiftForAllWorkers}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              End Shift for All Workers
            </Button>

            {allWorkersShiftEnded() && (
              <Button
                onClick={finalizeTimesheet}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Finalize Timesheet
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
