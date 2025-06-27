"use client"

import React, { useState, useEffect } from "react"
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
  AlertCircle
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

export default function WorkerAssignmentManager({ shiftId, shift, onUpdate }: WorkerAssignmentManagerProps) {
  const { toast } = useToast()
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [assignedWorkers, setAssignedWorkers] = useState<AssignedWorker[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  
  const { data: employeesData } = useApi<{ users: any[] }>('/api/users')
  const { data: assignedData, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(`/api/shifts/${shiftId}/assigned`)

  useEffect(() => {
    if (employeesData?.users) {
      setAvailableEmployees(employeesData.users.filter(user => user.role !== 'Client'))
    }
  }, [employeesData])

  useEffect(() => {
    if (assignedData?.assignedPersonnel) {
      // Convert assigned personnel to our format
      const assigned = assignedData.assignedPersonnel.map(person => ({
        id: person.id,
        employeeId: person.employee?.id,
        employeeName: person.employee?.name,
        employeeAvatar: person.employee?.avatar,
        roleCode: person.roleCode,
        roleName: ROLE_DEFINITIONS[person.roleCode]?.name || person.roleCode,
        status: person.status === 'Clocked In' ? 'clocked_in' : 
                person.status === 'Clocked Out' ? 'clocked_out' : 
                person.status === 'Shift Ended' ? 'shift_ended' : 'assigned',
        isPlaceholder: person.isPlaceholder || false,
        timeEntries: person.timeEntries || []
      }))
      setAssignedWorkers(assigned)
    }
  }, [assignedData])

  // Initialize default worker requirements based on shift data
  useEffect(() => {
    if (shift && workerRequirements.length === 0) {
      // For now, create a default structure. Later this could come from shift requirements
      const defaultRequirements: WorkerRequirement[] = [
        { roleCode: 'CC', roleName: 'Crew Chief', count: 1, color: ROLE_DEFINITIONS.CC.color },
        { roleCode: 'SH', roleName: 'Stage Hand', count: Math.max(0, (shift.requestedWorkers || 1) - 1), color: ROLE_DEFINITIONS.SH.color },
      ]
      setWorkerRequirements(defaultRequirements)
      
      // Create placeholder workers for each requirement
      const placeholders: AssignedWorker[] = []
      defaultRequirements.forEach(req => {
        for (let i = 0; i < req.count; i++) {
          placeholders.push({
            roleCode: req.roleCode,
            roleName: req.roleName,
            status: 'not_assigned',
            isPlaceholder: true
          })
        }
      })
      setAssignedWorkers(prev => [...prev, ...placeholders])
    }
  }, [shift, workerRequirements.length])

  const updateWorkerRequirement = (roleCode: RoleCode, newCount: number) => {
    setWorkerRequirements(prev => {
      const updated = prev.map(req => 
        req.roleCode === roleCode ? { ...req, count: Math.max(0, newCount) } : req
      )
      
      // Add new role if it doesn't exist and count > 0
      if (newCount > 0 && !prev.find(req => req.roleCode === roleCode)) {
        updated.push({
          roleCode,
          roleName: ROLE_DEFINITIONS[roleCode].name,
          count: newCount,
          color: ROLE_DEFINITIONS[roleCode].color
        })
      }
      
      return updated.filter(req => req.count > 0)
    })

    // Update assigned workers to match requirements
    setAssignedWorkers(prev => {
      const currentRoleWorkers = prev.filter(w => w.roleCode === roleCode)
      const currentCount = currentRoleWorkers.length
      
      if (newCount > currentCount) {
        // Add placeholder workers
        const newWorkers: AssignedWorker[] = []
        for (let i = 0; i < newCount - currentCount; i++) {
          newWorkers.push({
            roleCode,
            roleName: ROLE_DEFINITIONS[roleCode].name,
            status: 'not_assigned',
            isPlaceholder: true
          })
        }
        return [...prev, ...newWorkers]
      } else if (newCount < currentCount) {
        // Remove excess workers (prioritize removing unassigned placeholders)
        const toRemove = currentCount - newCount
        const unassignedPlaceholders = currentRoleWorkers.filter(w => w.isPlaceholder && w.status === 'not_assigned')
        const assignedWorkers = currentRoleWorkers.filter(w => !w.isPlaceholder || w.status !== 'not_assigned')
        
        let workersToKeep = [...assignedWorkers]
        if (workersToKeep.length < newCount) {
          workersToKeep = [...workersToKeep, ...unassignedPlaceholders.slice(0, newCount - workersToKeep.length)]
        } else {
          workersToKeep = workersToKeep.slice(0, newCount)
        }
        
        return prev.filter(w => w.roleCode !== roleCode).concat(workersToKeep)
      }
      
      return prev
    })
  }

  const assignEmployee = async (workerIndex: number, employeeId: string) => {
    const worker = assignedWorkers[workerIndex]
    const employee = availableEmployees.find(emp => emp.id === employeeId)
    
    if (!employee) return

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
        throw new Error('Failed to assign worker')
      }

      toast({
        title: "Worker Assigned",
        description: `${employee.name} has been assigned as ${worker.roleName}`,
      })

      refetchAssigned()
      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign worker. Please try again.",
        variant: "destructive",
      })
    }
  }

  const unassignEmployee = async (assignmentId: string) => {
    try {
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

      refetchAssigned()
      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign worker. Please try again.",
        variant: "destructive",
      })
    }
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
              {assignedWorkers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Configure worker requirements above to create assignment slots
                  </TableCell>
                </TableRow>
              ) : (
                assignedWorkers.map((worker, index) => {
                  const roleDef = ROLE_DEFINITIONS[worker.roleCode]
                  return (
                    <TableRow key={`${worker.roleCode}-${index}`} className={roleDef.bgColor}>
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
                              {availableEmployees.map((employee) => (
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
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={worker.employeeAvatar} />
                              <AvatarFallback>{worker.employeeName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{worker.employeeName}</span>
                          </div>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unassignEmployee(worker.id!)}
                          >
                            Unassign
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
