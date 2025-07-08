"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, Avatar, Group, Text, Title, Stack, ActionIcon, Tooltip, Modal, Progress, Loader } from "@mantine/core"
import {
  Clock,
  Play,
  Square,
  StopCircle,
  Users,
  CheckCircle2,
  AlertCircle,
  Timer,
  Coffee,
  UserCheck,
  FileText,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi, useMutation } from "@/hooks/use-api"
import { format, differenceInMinutes } from "date-fns"
import { useCrewChiefPermissions } from "@/hooks/useCrewChiefPermissions"
import { CrewChiefPermissionBadge, PermissionGuard } from "@/components/crew-chief-permission-badge"
import { LoadingSpinner, InlineLoading } from "@/components/loading-states"
import { useErrorHandler, type ErrorContext } from "@/lib/error-handler"
import { ErrorBoundary } from "@/components/error-boundary"
import { notifications } from '@mantine/notifications'
import { ROLE_DEFINITIONS } from "@/lib/color-utils"

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
  status: 'Clocked Out' | 'Clocked In' | 'On Break' | 'Shift Ended' | 'shift_ended' | 'not_started';
  timeEntries: TimeEntry[];
}

interface UnifiedShiftManagerProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
  isOnline?: boolean;
}

interface ActionState {
  isProcessing: boolean;
  lastAction?: string;
  retryCount: number;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'not_started':
      return {
        label: 'Not Started',
        color: 'gray',
        icon: Clock,
        description: 'Ready to clock in'
      }
    case 'Clocked In':
      return {
        label: 'Working',
        color: 'green',
        icon: Play,
        description: 'Currently working'
      }
    case 'Clocked Out':
      return {
        label: 'On Break',
        color: 'yellow',
        icon: Coffee,
        description: 'On break'
      }
    case 'Shift Ended':
    case 'shift_ended':
      return {
        label: 'Completed',
        color: 'blue',
        icon: CheckCircle2,
        description: 'Shift completed'
      }
    default:
      return {
        label: status,
        color: 'gray',
        icon: AlertCircle,
        description: 'Unknown status'
      }
  }
}

const calculateTotalHours = (timeEntries: TimeEntry[] = []) => {
  let totalMinutes = 0

  timeEntries.forEach(entry => {
    if (entry.clockIn && entry.clockOut) {
      const clockInTime = new Date(entry.clockIn)
      const clockOutTime = new Date(entry.clockOut)
      totalMinutes += differenceInMinutes(clockOutTime, clockInTime)
    }
  })

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export default function UnifiedShiftManager({
  shiftId,
  assignedPersonnel,
  onUpdate,
  isOnline = true
}: UnifiedShiftManagerProps) {
  const { hasPermission, permissionCheck, isLoading: permissionLoading } = useCrewChiefPermissions(shiftId);
  const [actionState, setActionState] = useState<ActionState>({
    isProcessing: false,
    retryCount: 0
  })
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [timesheetStatus, setTimesheetStatus] = useState<string | null>(null)
  const [timesheetId, setTimesheetId] = useState<string | null>(null)
  const [showEndAllShiftsModal, setShowEndAllShiftsModal] = useState(false);
  const [showFinalizeTimesheetModal, setShowFinalizeTimesheetModal] = useState(false);
  const [workerToEnd, setWorkerToEnd] = useState<AssignedWorker | null>(null);

  const totalWorkers = assignedPersonnel.length
  const workingCount = assignedPersonnel.filter(w => w.status === 'Clocked In').length
  const completedCount = assignedPersonnel.filter(w => ['Shift Ended', 'shift_ended'].includes(w.status)).length
  const notStartedCount = assignedPersonnel.filter(w => w.status === 'not_started').length
  const onBreakCount = assignedPersonnel.filter(w => w.status === 'Clocked Out').length

  const completionPercentage = totalWorkers > 0 ? (completedCount / totalWorkers) * 100 : 0

  const fetchTimesheetStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/timesheets?shiftId=${shiftId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.timesheets && data.timesheets.length > 0) {
          const timesheet = data.timesheets[0]
          setTimesheetStatus(timesheet.status)
          setTimesheetId(timesheet.id)
        } else {
          setTimesheetStatus(null)
          setTimesheetId(null)
        }
      }
    } catch (error) {
      console.warn('Failed to fetch timesheet status:', error)
    }
  }, [shiftId])

  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      if (!actionState.isProcessing && isOnline) {
        onUpdate()
        setLastUpdateTime(new Date())
        fetchTimesheetStatus()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, actionState.isProcessing, isOnline, onUpdate, fetchTimesheetStatus])

  useEffect(() => {
    fetchTimesheetStatus()
  }, [fetchTimesheetStatus, assignedPersonnel])

  const executeWithRetry = useCallback(async (
    operation: () => Promise<Response>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await operation()
        if (response.ok) {
          return response
        }
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Request failed with status ${response.status}`)
        }
        throw new Error(`Server error: ${response.status}`)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
          continue
        }
      }
    }
    throw lastError || new Error('Operation failed after retries')
  }, [])

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    if (!isOnline) {
      notifications.show({
        title: "Offline",
        message: "Cannot perform clock actions while offline. Please check your connection.",
        color: 'red'
      })
      return
    }

    const worker = assignedPersonnel.find(w => w.id === assignmentId)
    if (!worker) {
      notifications.show({
        title: "Error",
        message: "Worker not found",
        color: 'red'
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: `${action}_${assignmentId}`
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
      })

      notifications.show({
        title: action === 'clock_in' ? "Clocked In" : "Clocked Out",
        message: `${worker.employeeName} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
        color: 'green'
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error(`Error ${action}:`, error)
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : `Failed to ${action.replace('_', ' ')}`,
        color: 'red'
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleEndShift = async (assignmentId: string, workerName: string) => {
    if (!isOnline) {
      notifications.show({
        title: "Offline",
        message: "Cannot end shifts while offline. Please check your connection.",
        color: 'red'
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: `end_shift_${assignmentId}`
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
          method: 'POST'
        })
      })

      notifications.show({
        title: "Shift Ended",
        message: `${workerName}'s shift has been ended`,
        color: 'blue'
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error ending shift:', error)
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to end shift",
        color: 'red'
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleEndAllShifts = async () => {
    if (!isOnline) {
      notifications.show({
        title: "Offline",
        message: "Cannot end all shifts while offline. Please check your connection.",
        color: 'red'
      })
      return
    }

    const activeWorkers = assignedPersonnel.filter(w =>
      !['Shift Ended', 'shift_ended'].includes(w.status)
    )

    if (activeWorkers.length === 0) {
      notifications.show({
        title: "No Active Workers",
        message: "All workers have already ended their shifts",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: 'end_all_shifts'
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
          method: 'POST'
        })
      })

      notifications.show({
        title: "All Shifts Ended",
        message: `Successfully ended shifts for ${activeWorkers.length} workers`,
        color: 'blue'
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error ending all shifts:', error)
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to end all shifts",
        color: 'red'
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
      setShowEndAllShiftsModal(false)
    }
  }

  const handleFinalizeTimesheet = async () => {
    if (!isOnline) {
      notifications.show({
        title: "Offline",
        message: "Cannot finalize timesheet while offline. Please check your connection.",
        color: 'red'
      })
      return
    }

    const incompleteWorkers = assignedPersonnel.filter(w =>
      !['Shift Ended', 'shift_ended'].includes(w.status)
    )

    if (incompleteWorkers.length > 0) {
      notifications.show({
        title: "Cannot Finalize",
        message: `${incompleteWorkers.length} workers have not completed their shifts yet`,
        color: 'red'
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: 'finalize_timesheet'
    }))

    try {
      const response = await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/finalize-timesheet-simple`, {
          method: 'POST'
        })
      })

      const result = await response.json()
      notifications.show({
        title: "Timesheet Finalized",
        message: "Timesheet has been finalized and is pending client approval",
        color: 'green'
      })

      if (result.timesheetId) {
        try {
          window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
        } catch (popupError) {
          console.warn('Popup blocked, showing link instead')
          notifications.show({
            title: "Timesheet Ready",
            message: "Click here to view the timesheet approval page",
            color: 'blue',
            onClick: () => window.location.href = `/timesheets/${result.timesheetId}/approve`
          })
        }
      }

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to finalize timesheet",
        color: 'red'
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
      setShowFinalizeTimesheetModal(false)
    }
  }

  const handleManualRefresh = useCallback(() => {
    if (!actionState.isProcessing) {
      onUpdate()
      setLastUpdateTime(new Date())
      notifications.show({
        title: "Refreshed",
        message: "Shift data has been updated",
        color: 'blue'
      })
    }
  }, [actionState.isProcessing, onUpdate])

  return (
    <Stack gap="lg">
      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Group>
              <Users size={20} />
              <Title order={4}>Shift Progress</Title>
              {!isOnline && <WifiOff size={16} color="red" />}
              {isOnline && <Wifi size={16} color="green" />}
            </Group>
            <Group>
              <ActionIcon variant="default" onClick={handleManualRefresh} loading={actionState.isProcessing}>
                <RefreshCw size={16} />
              </ActionIcon>
              <Tooltip label={autoRefreshEnabled ? "Disable auto-refresh" : "Enable auto-refresh"}>
                <ActionIcon variant="default" onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)} color={autoRefreshEnabled ? 'green' : 'gray'}>
                  <Timer size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          <Text size="xs" c="dimmed">
            Last updated: {format(lastUpdateTime, 'HH:mm:ss')}
            {autoRefreshEnabled && ' • Auto-refresh enabled'}
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <Stack>
            <Group justify="space-between">
              <Text size="sm">Shift Completion</Text>
              <Text size="sm">{Math.round(completionPercentage)}%</Text>
            </Group>
            <Progress value={completionPercentage} />
            <Group grow>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700}>{totalWorkers}</Text>
                <Text size="xs" c="dimmed">Total Workers</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="green">{workingCount}</Text>
                <Text size="xs" c="dimmed">Working</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="yellow">{onBreakCount}</Text>
                <Text size="xs" c="dimmed">On Break</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="blue">{completedCount}</Text>
                <Text size="xs" c="dimmed">Completed</Text>
              </Stack>
              <Stack align="center" gap={0}>
                <Text size="xl" fw={700} c="gray">{notStartedCount}</Text>
                <Text size="xs" c="dimmed">Not Started</Text>
              </Stack>
            </Group>
          </Stack>
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <UserCheck size={20} />
            <Title order={4}>Employee Time Management</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Manage individual employee clock in/out times and shift status
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <Stack>
            {assignedPersonnel.map((worker) => {
              const statusConfig = getStatusConfig(worker.status)
              const roleConfig = ROLE_DEFINITIONS[worker.roleCode as keyof typeof ROLE_DEFINITIONS] || ROLE_DEFINITIONS.GL
              const StatusIcon = statusConfig.icon
              const totalHours = calculateTotalHours(worker.timeEntries)
              const currentEntry = worker.timeEntries.find(entry => entry.isActive || (!entry.clockOut && entry.clockIn))

              return (
                <Card key={worker.id} withBorder p="sm" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <Avatar src={worker.employeeAvatar} alt={worker.employeeName} radius="xl" />
                        <div>
                          <Group>
                            <Text fw={500}>{worker.employeeName}</Text>
                            <Badge color={roleConfig.color} variant="light">
                              {roleConfig.name}
                            </Badge>
                          </Group>
                          <Group>
                            <Badge color={statusConfig.color} variant="light" leftSection={<StatusIcon size={14} />}>
                              {statusConfig.label}
                            </Badge>
                            {totalHours !== '0h 0m' && (
                              <Group gap="xs">
                                <Timer size={14} />
                                <Text size="xs">{totalHours}</Text>
                              </Group>
                            )}
                            {currentEntry && currentEntry.clockIn && !currentEntry.clockOut && (
                              <Group gap="xs" c="green">
                                <Clock size={14} />
                                <Text size="xs">Started at {format(new Date(currentEntry.clockIn), 'HH:mm')}</Text>
                              </Group>
                            )}
                          </Group>
                        </div>
                      </Group>
                      <PermissionGuard
                        shiftId={shiftId}
                        fallback={
                          <div>
                            <CrewChiefPermissionBadge shiftId={shiftId} size="sm" />
                          </div>
                        }
                      >
                        <Group>
                          {worker.status === 'not_started' && (
                            <Button
                              size="xs"
                              onClick={() => handleClockAction(worker.id, 'clock_in')}
                              disabled={actionState.isProcessing || !isOnline || !hasPermission}
                              color="green"
                              leftSection={actionState.lastAction === `clock_in_${worker.id}` ? <Loader size={14} /> : <Play size={14} />}
                            >
                              Clock In
                            </Button>
                          )}
                          {worker.status === 'Clocked In' && (
                            <>
                              <Tooltip label="Clock out for a break.">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleClockAction(worker.id, 'clock_out')}
                                  disabled={actionState.isProcessing || !isOnline || !hasPermission}
                                  leftSection={actionState.lastAction === `clock_out_${worker.id}` ? <Loader size={14} /> : <Square size={14} />}
                                >
                                  Clock Out
                                </Button>
                              </Tooltip>
                              <Tooltip label="End the shift for this worker.">
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={() => setWorkerToEnd(worker)}
                                  disabled={actionState.isProcessing || !isOnline || !hasPermission}
                                  leftSection={actionState.lastAction === `end_shift_${worker.id}` ? <Loader size={14} /> : <StopCircle size={14} />}
                                >
                                  End Shift
                                </Button>
                              </Tooltip>
                            </>
                          )}
                          {worker.status === 'Clocked Out' && (
                            <Tooltip label="Clock back in from break.">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleClockAction(worker.id, 'clock_in')}
                                disabled={actionState.isProcessing || !isOnline}
                                leftSection={actionState.lastAction === `clock_in_${worker.id}` ? <Loader size={14} /> : <Play size={14} />}
                              >
                                Clock In
                              </Button>
                            </Tooltip>
                          )}
                        </Group>
                      </PermissionGuard>
                    </Group>
                    <Group gap="md" mt="sm" grow>
                      {[
                        { label: 'START TIME', time: worker.timeEntries[0]?.clockIn },
                        { label: 'OUT 1', time: worker.timeEntries[0]?.clockOut },
                        { label: 'IN 2', time: worker.timeEntries[1]?.clockIn },
                        { label: 'OUT 2', time: worker.timeEntries[1]?.clockOut },
                        { label: 'IN 3', time: worker.timeEntries[2]?.clockIn },
                        { label: 'END TIME', time: worker.timeEntries[2]?.clockOut },
                      ].map(({ label, time }) => (
                        <Stack key={label} gap={0}>
                          <Text size="xs" c="dimmed">{label}</Text>
                          <Text size="lg" fw={500}>{time ? format(new Date(time), 'HH:mm') : '--:--'}</Text>
                        </Stack>
                      ))}
                    </Group>
                  </Stack>
                </Card>
              )
            })}
          </Stack>
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <FileText size={20} />
            <Title order={4}>Shift Management</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Bulk operations and timesheet finalization
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <Group>
            <PermissionGuard
              shiftId={shiftId}
              fallback={
                <Group>
                  <Shield size={16} />
                  <Text size="sm">Crew chief permissions required for bulk operations</Text>
                  <CrewChiefPermissionBadge shiftId={shiftId} size="sm" />
                </Group>
              }
            >
              <Button
                variant="outline"
                onClick={() => setShowEndAllShiftsModal(true)}
                disabled={actionState.isProcessing || completedCount === totalWorkers || !hasPermission}
                leftSection={<StopCircle size={16} />}
              >
                End All Shifts
              </Button>
              {!timesheetStatus ? (
                <Button
                  onClick={() => setShowFinalizeTimesheetModal(true)}
                  disabled={actionState.isProcessing || completedCount < totalWorkers || !hasPermission}
                  color="blue"
                  leftSection={<FileText size={16} />}
                >
                  Finalize Timesheet
                </Button>
              ) : timesheetStatus === 'pending_client_approval' ? (
                <Button
                  onClick={() => window.open(`/timesheets/${timesheetId}/approve`, '_blank')}
                  color="orange"
                  leftSection={<FileText size={16} />}
                >
                  View Client Approval
                </Button>
              ) : timesheetStatus === 'pending_final_approval' ? (
                <Button
                  onClick={() => window.open(`/timesheets/${timesheetId}/manager-approval`, '_blank')}
                  color="grape"
                  leftSection={<FileText size={16} />}
                >
                  Manager Approval Required
                </Button>
              ) : timesheetStatus === 'completed' ? (
                <Button
                  onClick={() => window.open(`/timesheets/${timesheetId}`, '_blank')}
                  color="green"
                  leftSection={<FileText size={16} />}
                >
                  View Completed Timesheet
                </Button>
              ) : (
                <Button
                  onClick={() => window.open(`/timesheets/${timesheetId}`, '_blank')}
                  variant="outline"
                  leftSection={<FileText size={16} />}
                >
                  View Timesheet
                </Button>
              )}
            </PermissionGuard>
            {completedCount === totalWorkers && (
              <Badge color="green" variant="light" leftSection={<CheckCircle2 size={14} />}>
                All workers completed
              </Badge>
            )}
          </Group>
        </Card.Section>
      </Card>

      <Modal opened={showEndAllShiftsModal} onClose={() => setShowEndAllShiftsModal(false)} title="End All Shifts">
        <Text>This will end the shift for all workers who have not yet completed their shift. This action cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowEndAllShiftsModal(false)}>Cancel</Button>
          <Button color="red" onClick={handleEndAllShifts}>End All Shifts</Button>
        </Group>
      </Modal>

      <Modal opened={showFinalizeTimesheetModal} onClose={() => setShowFinalizeTimesheetModal(false)} title="Finalize Timesheet">
        <Text>This will finalize the timesheet and send it for client approval. This action cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowFinalizeTimesheetModal(false)}>Cancel</Button>
          <Button color="blue" onClick={handleFinalizeTimesheet}>Finalize Timesheet</Button>
        </Group>
      </Modal>

      <Modal opened={!!workerToEnd} onClose={() => setWorkerToEnd(null)} title={`End shift for ${workerToEnd?.employeeName}?`}>
        <Text>
          This will finalize the current shift for this employee. This can not be undone without manager intervention. Are you sure?
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setWorkerToEnd(null)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              if (workerToEnd) {
                handleEndShift(workerToEnd.id, workerToEnd.employeeName);
              }
              setWorkerToEnd(null);
            }}
          >
            End Shift
          </Button>
        </Group>
      </Modal>
    </Stack>
  )
}
