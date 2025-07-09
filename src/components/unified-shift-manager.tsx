"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { format, differenceInMinutes } from "date-fns"
import { useCrewChiefPermissions } from "@/hooks/useCrewChiefPermissions"
import { CrewChiefPermissionBadge, PermissionGuard } from "@/components/crew-chief-permission-badge"
import { notifications } from '@mantine/notifications'
import { ROLE_DEFINITIONS } from "@/lib/color-utils"
import { useShiftManagerStore } from '@/lib/stores/shift-manager-store'
import type { AssignedPersonnel, TimeEntry } from '@/lib/types'

interface UnifiedShiftManagerProps {
  shiftId: string;
  initialAssignedPersonnel: AssignedPersonnel[];
  onUpdate: () => void;
  isOnline?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'not_started':
      return { label: 'Not Started', color: 'gray', icon: Clock }
    case 'Clocked In':
      return { label: 'Working', color: 'green', icon: Play }
    case 'Clocked Out':
      return { label: 'On Break', color: 'yellow', icon: Coffee }
    case 'Shift Ended':
      return { label: 'Completed', color: 'blue', icon: CheckCircle2 }
    default:
      return { label: status, color: 'gray', icon: AlertCircle }
  }
}

const calculateTotalHours = (timeEntries: TimeEntry[] = []) => {
  const totalMinutes = timeEntries.reduce((acc, entry) => {
    if (entry.clockIn && entry.clockOut) {
      return acc + differenceInMinutes(new Date(entry.clockOut), new Date(entry.clockIn))
    }
    return acc
  }, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

const UnifiedShiftManager: React.FC<UnifiedShiftManagerProps> = ({
  shiftId,
  initialAssignedPersonnel,
  onUpdate,
  isOnline = true
}) => {
  const {
    assignedPersonnel,
    setAssignedPersonnel,
    isProcessing,
    lastAction,
    performAction,
    timesheetStatus,
    timesheetId,
    fetchTimesheetStatus,
  } = useShiftManagerStore();

  const { hasPermission, isLoading: permissionLoading } = useCrewChiefPermissions(shiftId);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [showEndAllShiftsModal, setShowEndAllShiftsModal] = useState(false);
  const [showFinalizeTimesheetModal, setShowFinalizeTimesheetModal] = useState(false);
  const [workerToEnd, setWorkerToEnd] = useState<AssignedPersonnel | null>(null);

  useEffect(() => {
    setAssignedPersonnel(initialAssignedPersonnel);
  }, [initialAssignedPersonnel, setAssignedPersonnel]);

  useEffect(() => {
    fetchTimesheetStatus(shiftId);
  }, [shiftId, fetchTimesheetStatus, assignedPersonnel]);

  useEffect(() => {
    if (!autoRefreshEnabled || !isOnline) return;
    const interval = setInterval(() => {
      if (!isProcessing) {
        onUpdate();
        setLastUpdateTime(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, isOnline, isProcessing, onUpdate]);

  const handleApiAction = async (
    actionFn: () => Promise<Response>,
    actionName: string,
    successTitle: string,
    successMessage: string,
    errorMessage: string
  ) => {
    if (!isOnline) {
      notifications.show({ title: "Offline", message: "Cannot perform actions while offline.", color: 'red' });
      return;
    }

    try {
      await performAction(actionFn, actionName);
      notifications.show({ title: successTitle, message: successMessage, color: 'green' });
      onUpdate();
      setLastUpdateTime(new Date());
    } catch (error) {
      notifications.show({ title: "Error", message: error instanceof Error ? error.message : errorMessage, color: 'red' });
    }
  };

  const handleClockAction = (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    const worker = assignedPersonnel.find((w: AssignedPersonnel) => w.id === assignmentId);
    if (!worker) return;
    handleApiAction(
      () => fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      }),
      `${action}_${assignmentId}`,
      action === 'clock_in' ? "Clocked In" : "Clocked Out",
      `${worker.employee.name} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully.`,
      `Failed to ${action.replace('_', ' ')}.`
    );
  };

  const handleEndShift = (assignmentId: string, workerName: string) => {
    handleApiAction(
      () => fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, { method: 'POST' }),
      `end_shift_${assignmentId}`,
      "Shift Ended",
      `${workerName}'s shift has been ended.`,
      "Failed to end shift."
    );
    setWorkerToEnd(null);
  };

  const handleEndAllShifts = () => {
    const activeWorkers = assignedPersonnel.filter((w: AssignedPersonnel) => w.status !== 'Shift Ended');
    if (activeWorkers.length === 0) {
      notifications.show({ title: "No Active Workers", message: "All workers have already ended their shifts." });
      return;
    }
    handleApiAction(
      () => fetch(`/api/shifts/${shiftId}/end-all-shifts`, { method: 'POST' }),
      'end_all_shifts',
      "All Shifts Ended",
      `Successfully ended shifts for ${activeWorkers.length} workers.`,
      "Failed to end all shifts."
    );
    setShowEndAllShiftsModal(false);
  };

  const handleFinalizeTimesheet = () => {
    const incompleteWorkers = assignedPersonnel.filter((w: AssignedPersonnel) => w.status !== 'Shift Ended');
    if (incompleteWorkers.length > 0) {
      notifications.show({ title: "Cannot Finalize", message: `${incompleteWorkers.length} workers have not completed their shifts.`, color: 'red' });
      return;
    }
    handleApiAction(
      async () => {
        const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet-simple`, { method: 'POST' });
        const result = await response.json();
        if (response.ok && result.timesheetId) {
          window.open(`/timesheets/${result.timesheetId}/approve`, '_blank');
        }
        return response;
      },
      'finalize_timesheet',
      "Timesheet Finalized",
      "Timesheet is now pending client approval.",
      "Failed to finalize timesheet."
    );
    setShowFinalizeTimesheetModal(false);
  };

  const handleManualRefresh = useCallback(() => {
    if (!isProcessing) {
      onUpdate();
      setLastUpdateTime(new Date());
      notifications.show({ title: "Refreshed", message: "Shift data has been updated.", color: 'blue' });
    }
  }, [isProcessing, onUpdate]);

  const { totalWorkers, workingCount, completedCount, notStartedCount, onBreakCount, completionPercentage } = useMemo(() => {
    const total = assignedPersonnel.length;
    return {
      totalWorkers: total,
      workingCount: assignedPersonnel.filter((w: AssignedPersonnel) => w.status === 'Clocked In').length,
      completedCount: assignedPersonnel.filter((w: AssignedPersonnel) => w.status === 'Shift Ended').length,
      notStartedCount: assignedPersonnel.filter((w: AssignedPersonnel) => w.status === 'not_started').length,
      onBreakCount: assignedPersonnel.filter((w: AssignedPersonnel) => w.status === 'Clocked Out').length,
      completionPercentage: total > 0 ? (assignedPersonnel.filter((w: AssignedPersonnel) => w.status === 'Shift Ended').length / total) * 100 : 0,
    };
  }, [assignedPersonnel]);

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
              <ActionIcon variant="default" onClick={handleManualRefresh} loading={isProcessing}>
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
              <Stack align="center" gap={0}><Text size="xl" fw={700}>{totalWorkers}</Text><Text size="xs" c="dimmed">Total</Text></Stack>
              <Stack align="center" gap={0}><Text size="xl" fw={700} c="green">{workingCount}</Text><Text size="xs" c="dimmed">Working</Text></Stack>
              <Stack align="center" gap={0}><Text size="xl" fw={700} c="yellow">{onBreakCount}</Text><Text size="xs" c="dimmed">On Break</Text></Stack>
              <Stack align="center" gap={0}><Text size="xl" fw={700} c="blue">{completedCount}</Text><Text size="xs" c="dimmed">Completed</Text></Stack>
              <Stack align="center" gap={0}><Text size="xl" fw={700} c="gray">{notStartedCount}</Text><Text size="xs" c="dimmed">Not Started</Text></Stack>
            </Group>
          </Stack>
        </Card.Section>
      </Card>

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group><UserCheck size={20} /><Title order={4}>Employee Time Management</Title></Group>
          <Text size="sm" c="dimmed">Manage individual employee clock in/out times and shift status</Text>
        </Card.Section>
        <Card.Section p="md">
          <Stack>
            {assignedPersonnel.map((worker: AssignedPersonnel) => {
              const statusConfig = getStatusConfig(worker.status)
              const roleConfig = ROLE_DEFINITIONS[worker.roleCode as keyof typeof ROLE_DEFINITIONS] || ROLE_DEFINITIONS.GL
              const StatusIcon = statusConfig.icon
              const totalHours = calculateTotalHours(worker.timeEntries)
              const currentEntry = worker.timeEntries.find((entry: TimeEntry) => entry.isActive || (!entry.clockOut && entry.clockIn))

              return (
                <Card key={worker.id} withBorder p="sm" radius="md">
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <Avatar src={worker.employee.avatar} alt={worker.employee.name} radius="xl" />
                        <div>
                          <Group>
                            <Text fw={500}>{worker.employee.name}</Text>
                            <Badge color={roleConfig.color} variant="light">{roleConfig.name}</Badge>
                          </Group>
                          <Group>
                            <Badge color={statusConfig.color} variant="light" leftSection={<StatusIcon size={14} />}>{statusConfig.label}</Badge>
                            {totalHours !== '0h 0m' && <Group gap="xs"><Timer size={14} /><Text size="xs">{totalHours}</Text></Group>}
                            {currentEntry && currentEntry.clockIn && !currentEntry.clockOut && <Group gap="xs" c="green"><Clock size={14} /><Text size="xs">Started at {format(new Date(currentEntry.clockIn), 'HH:mm')}</Text></Group>}
                          </Group>
                        </div>
                      </Group>
                      <PermissionGuard shiftId={shiftId} fallback={<div><CrewChiefPermissionBadge shiftId={shiftId} size="sm" /></div>}>
                        <Group>
                          {worker.status === 'not_started' && <Button size="xs" onClick={() => handleClockAction(worker.id, 'clock_in')} disabled={isProcessing || !isOnline || !hasPermission} color="green" leftSection={lastAction === `clock_in_${worker.id}` ? <Loader size={14} /> : <Play size={14} />}>Clock In</Button>}
                          {worker.status === 'Clocked In' && <>
                            <Tooltip label="Clock out for a break."><Button size="xs" variant="outline" onClick={() => handleClockAction(worker.id, 'clock_out')} disabled={isProcessing || !isOnline || !hasPermission} leftSection={lastAction === `clock_out_${worker.id}` ? <Loader size={14} /> : <Square size={14} />}>Clock Out</Button></Tooltip>
                            <Tooltip label="End the shift for this worker."><Button size="xs" color="red" onClick={() => setWorkerToEnd(worker)} disabled={isProcessing || !isOnline || !hasPermission} leftSection={lastAction === `end_shift_${worker.id}` ? <Loader size={14} /> : <StopCircle size={14} />}>End Shift</Button></Tooltip>
                          </>}
                          {worker.status === 'Clocked Out' && <Tooltip label="Clock back in from break."><Button size="xs" variant="outline" onClick={() => handleClockAction(worker.id, 'clock_in')} disabled={isProcessing || !isOnline} leftSection={lastAction === `clock_in_${worker.id}` ? <Loader size={14} /> : <Play size={14} />}>Clock In</Button></Tooltip>}
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
          <Group><FileText size={20} /><Title order={4}>Shift Management</Title></Group>
          <Text size="sm" c="dimmed">Bulk operations and timesheet finalization</Text>
        </Card.Section>
        <Card.Section p="md">
          <Group>
            <PermissionGuard shiftId={shiftId} fallback={<Group><Shield size={16} /><Text size="sm">Crew chief permissions required</Text></Group>}>
              <Button variant="outline" onClick={() => setShowEndAllShiftsModal(true)} disabled={isProcessing || completedCount === totalWorkers || !hasPermission} leftSection={<StopCircle size={16} />}>End All Shifts</Button>
              {!timesheetStatus ? (
                <Button onClick={() => setShowFinalizeTimesheetModal(true)} disabled={isProcessing || completedCount < totalWorkers || !hasPermission} color="blue" leftSection={<FileText size={16} />}>Finalize Timesheet</Button>
              ) : (
                <Button onClick={() => window.open(`/timesheets/${timesheetId}`, '_blank')} color="blue" variant="outline" leftSection={<FileText size={16} />}>View Timesheet</Button>
              )}
            </PermissionGuard>
            {completedCount === totalWorkers && <Badge color="green" variant="light" leftSection={<CheckCircle2 size={14} />}>All workers completed</Badge>}
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

      <Modal opened={!!workerToEnd} onClose={() => setWorkerToEnd(null)} title={`End shift for ${workerToEnd?.employee.name}?`}>
        <Text>This will finalize the current shift for this employee. This can not be undone without manager intervention. Are you sure?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setWorkerToEnd(null)}>Cancel</Button>
          <Button color="red" onClick={() => workerToEnd && handleEndShift(workerToEnd.id, workerToEnd.employee.name)}>End Shift</Button>
        </Group>
      </Modal>
    </Stack>
  )
}

export default UnifiedShiftManager;
