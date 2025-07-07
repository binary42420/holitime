"use client"

import React, { useState, useEffect } from "react"
import { Button, Card, Badge, Select, Avatar, Group, Text, ActionIcon, Grid, Stack, Title } from "@mantine/core"
import { Users, Plus, Minus, UserPlus, X } from "lucide-react"
import { notifications } from "@mantine/notifications"
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

const ROLE_DEFINITIONS: Record<RoleCode, { name: string; color: string }> = {
  'CC': { name: 'Crew Chief', color: 'purple' },
  'SH': { name: 'Stage Hand', color: 'blue' },
  'FO': { name: 'Fork Operator', color: 'green' },
  'RFO': { name: 'Reach Fork Operator', color: 'yellow' },
  'RG': { name: 'Rigger', color: 'red' },
  'GL': { name: 'General Labor', color: 'gray' },
} as const

export default function WorkerAssignmentDisplay({ 
  shiftId, 
  assignedPersonnel, 
  onUpdate 
}: WorkerAssignmentDisplayProps) {
  const [workerRequirements, setWorkerRequirements] = useState<WorkerRequirement[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  const { data: requirementsData, loading: requirementsLoading, refetch: refetchRequirements } = useApi<{ workerRequirements: WorkerRequirement[] }>(
    `/api/shifts/${shiftId}/worker-requirements`
  )

  const { data: usersData } = useApi<{ users: any[] }>('/api/users')
  const availableEmployees = usersData?.users?.filter(user =>
    user.role === 'Employee' || user.role === 'Crew Chief' || user.role === 'Manager/Admin'
  ) || []

  useEffect(() => {
    if (requirementsData?.workerRequirements) {
      setWorkerRequirements(requirementsData.workerRequirements)
    } else if (requirementsData && requirementsData.workerRequirements?.length === 0) {
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
      notifications.show({
        title: "Requirements Updated",
        message: `${ROLE_DEFINITIONS[roleCode].name} requirement set to ${newCount}`,
        color: 'green'
      })
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update worker requirements",
        color: 'red'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const assignWorker = async (employeeId: string | null, roleCode: RoleCode) => {
    if (!employeeId) return;
    try {
      const employee = availableEmployees.find(emp => emp.id === employeeId)
      if (!employee) return

      const response = await fetch(`/api/shifts/${shiftId}/assign-worker`, {
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

      notifications.show({
        title: "Worker Assigned",
        message: `${employee.name} assigned as ${ROLE_DEFINITIONS[roleCode].name}`,
        color: 'green'
      })
      onUpdate()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to assign worker",
        color: 'red'
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

      notifications.show({
        title: "Worker Unassigned",
        message: `${workerName} has been unassigned from this shift`,
        color: 'blue'
      })
      onUpdate()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to unassign worker",
        color: 'red'
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

    assignedWorkers.forEach(worker => {
      slots.push({ type: 'assigned', worker })
    })

    const emptySlots = Math.max(0, requiredCount - assignedWorkers.length)
    for (let i = 0; i < emptySlots; i++) {
      slots.push({ type: 'empty', roleCode })
    }

    return slots
  }

  if (requirementsLoading) {
    return <Text>Loading worker requirements...</Text>
  }

  return (
    <Stack gap="lg">
      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Users size={20} />
            <Title order={4}>Worker Requirements</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Configure how many workers of each type are needed for this shift
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Grid>
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const currentCount = getRequiredCount(roleCode)
              return (
                <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={roleCode}>
                  <Card withBorder radius="md" p="sm">
                    <Group justify="space-between" mb="sm">
                      <Group>
                        <Badge color={roleDef.color} variant="light">{roleCode}</Badge>
                        <Text fw={500}>{roleDef.name}</Text>
                      </Group>
                    </Group>
                    <Group justify="flex-end">
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount - 5)} disabled={currentCount < 5 || isUpdating}>-5</ActionIcon>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount - 1)} disabled={currentCount === 0 || isUpdating}><Minus size={16} /></ActionIcon>
                      <Text w={40} ta="center" fw={700} size="xl">{currentCount}</Text>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount + 1)} disabled={isUpdating}><Plus size={16} /></ActionIcon>
                      <ActionIcon variant="default" onClick={() => updateWorkerRequirement(roleCode, currentCount + 5)} disabled={isUpdating}>+5</ActionIcon>
                    </Group>
                  </Card>
                </Grid.Col>
              )
            })}
          </Grid>
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <UserPlus size={20} />
            <Title order={4}>Worker Assignments</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Assign specific workers to each required position
          </Text>
        </Card.Section>
        <Card.Section inheritPadding py="md">
          <Stack gap="md">
            {(Object.entries(ROLE_DEFINITIONS) as [RoleCode, typeof ROLE_DEFINITIONS[RoleCode]][]).map(([roleCode, roleDef]) => {
              const slots = generateWorkerSlots(roleCode)
              if (slots.length === 0) return null
              return (
                <div key={roleCode}>
                  <Group mb="xs">
                    <Badge color={roleDef.color} variant="filled">{roleCode}</Badge>
                    <Text fw={500}>{roleDef.name}</Text>
                    <Text size="sm" c="dimmed">
                      ({getAssignedWorkers(roleCode).length}/{getRequiredCount(roleCode)} assigned)
                    </Text>
                  </Group>
                  <Grid>
                    {slots.map((slot, index) => (
                      <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={`${roleCode}-${index}`}>
                        <Card withBorder radius="md" p="xs">
                          {slot.type === 'assigned' ? (
                            <Group justify="space-between">
                              <Group>
                                <Avatar src={slot.worker.employeeAvatar} radius="xl">
                                  {slot.worker.employeeName.split(' ').map((n: string) => n[0]).join('')}
                                </Avatar>
                                <div>
                                  <Text size="sm" fw={500}>{slot.worker.employeeName}</Text>
                                  <Text size="xs" c={roleDef.color}>{slot.worker.roleOnShift}</Text>
                                </div>
                              </Group>
                              <ActionIcon variant="subtle" color="red" onClick={() => unassignWorker(slot.worker.id, slot.worker.employeeName)}>
                                <X size={16} />
                              </ActionIcon>
                            </Group>
                          ) : (
                            <Select
                              placeholder="Select worker..."
                              onChange={(value) => assignWorker(value, roleCode)}
                              data={availableEmployees
                                .filter(emp => !assignedPersonnel.some(assigned => assigned.employeeId === emp.id))
                                .map(employee => ({
                                  value: employee.id,
                                  label: employee.name,
                                  group: employee.role === 'Manager/Admin' ? 'Manager' : undefined
                                }))
                              }
                            />
                          )}
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                </div>
              )
            })}
          </Stack>
        </Card.Section>
      </Card>
    </Stack>
  )
}
