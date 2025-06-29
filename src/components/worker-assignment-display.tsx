"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Plus, Minus, UserPlus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RoleCode } from "@/lib/types"
import { useApi } from "@/hooks/use-api"

interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

interface AssignedWorker {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  roleOnShift: string;
  roleCode: string;
  status: string;
}

interface WorkerAssignmentDisplayProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
}

type WorkerSlot =
  | { type: 'assigned'; worker: AssignedWorker }
  | { type: 'empty'; roleCode: RoleCode }

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

export default function WorkerAssignmentDisplay({ 
  shiftId, 
  assignedPersonnel, 
  onUpdate 
}: WorkerAssignmentDisplayProps) {
  const { toast } = useToast()
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch worker requirements
  const { data: requirementsData, loading: requirementsLoading, refetch: refetchRequirements } = useApi<{ workerRequirements: WorkerRequirement[] }>(
    `/api/shifts/${shiftId}/worker-requirements`
  )

  // Fetch available employees for assignment
  const { data: usersData } = useApi<{ users: any[] }>('/api/users')
  const availableEmployees = usersData?.users?.filter(user =>
    user.role === 'Employee' || user.role === 'Crew Chief' || user.role === 'Manager/Admin'
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

      console.log('Sending worker requirements:', updatedRequirements)

      const response = await fetch(`/api/shifts/${shiftId}/worker-requirements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerRequirements: updatedRequirements })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
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

  const checkTimeConflicts = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/check-conflicts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId })
      })

      if (!response.ok) {
        return { hasConflicts: false, conflicts: [] }
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return { hasConflicts: false, conflicts: [] }
    }
  }

  const assignWorker = async (employeeId: string, roleCode: RoleCode) => {
    try {
      const employee = availableEmployees.find(emp => emp.id === employeeId)
      if (!employee) return

      // Check for time conflicts for all users
      const conflictCheck = await checkTimeConflicts(employeeId)
      if (conflictCheck.hasConflicts && conflictCheck.conflicts.length > 0) {
        const conflict = conflictCheck.conflicts[0]
        toast({
          title: "Time Conflict",
          description: `${employee.name} is already assigned to ${conflict.clientName} - ${conflict.jobName} from ${conflict.startTime} to ${conflict.endTime} on the same day`,
          variant: "destructive",
        })
        return
      }

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

  const getRequiredCount = (roleCode: RoleCode): number => {
    return workerRequirements.find(req => req.roleCode === roleCode)?.requiredCount || 0
  }

  const getAssignedWorkers = (roleCode: RoleCode): AssignedWorker[] => {
    return assignedPersonnel.filter(worker => worker.roleCode === roleCode)
  }

  const generateWorkerSlots = (roleCode: RoleCode): WorkerSlot[] => {
    const requiredCount = getRequiredCount(roleCode)
    const assignedWorkers = getAssignedWorkers(roleCode)
    const slots: WorkerSlot[] = []

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

      {/* Worker Assignment Table Section */}
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
                                  {slot.worker.employeeName.split(' ').map((n: string) => n[0]).join('')}
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
                                    <div className="flex items-center justify-between w-full">
                                      <span>{employee.name}</span>
                                      {employee.role === 'Manager/Admin' && (
                                        <Badge variant="secondary" className="text-xs">Manager</Badge>
                                      )}
                                    </div>
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
    </div>
  )
}
