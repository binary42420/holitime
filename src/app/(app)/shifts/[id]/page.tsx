"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi, useShift } from "@/hooks/use-api"
import { Card, Button, Badge, Textarea, Group, Text, Title, Stack, ActionIcon, Alert, Accordion } from "@mantine/core"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase, Download, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import UnifiedShiftManager from "@/components/unified-shift-manager"
import WorkerAssignmentDisplay from "@/components/worker-assignment-display"
import { generateShiftEditUrl } from "@/lib/url-utils"
import { LoadingSpinner } from "@/components/loading-states"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"
import { notifications } from "@mantine/notifications"
import { useAccordionState } from "@/hooks/use-accordion-state"
import { formatTimeTo12Hour } from "@/lib/time-utils"

export default function ShiftDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const shiftId = params.id as string

  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useShift(shiftId)
  
  const shift = shiftData
  
  const { data: assignedData, loading: assignedLoading, error: assignedError, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(
    shiftId ? `/api/shifts/${shiftId}/assigned` : ''
  )

  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

  const assignedPersonnel = assignedData?.assignedPersonnel || []

  const [requirementsAccordion, setRequirementsAccordion] = useAccordionState('shift-requirements', ['requirements']);
  const [assignmentsAccordion, setAssignmentsAccordion] = useAccordionState('shift-assignments', ['assignments']);
  const [notesAccordion, setNotesAccordion] = useAccordionState('shift-notes', []);
  const [permissionsAccordion, setPermissionsAccordion] = useAccordionState('shift-permissions', []);
  const [dangerZoneAccordion, setDangerZoneAccordion] = useAccordionState('shift-danger-zone', []);

  const handleRefresh = useCallback(() => {
    if (refetch) refetch()
    if (refetchAssigned) refetchAssigned()
  }, [refetch, refetchAssigned])

  useEffect(() => {
    if (shift?.notes) {
      setNotes(shift.notes)
    }
    if (shift?.status === 'Completed') {
      setRequirementsAccordion([]);
    }
  }, [shift?.notes, shift?.status, setRequirementsAccordion])

  const handleNotesSubmit = async () => {
    if (!shiftId) return
    
    setIsSubmittingNotes(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to update notes')
      }

      notifications.show({
        title: "Notes Updated",
        message: "Shift notes have been saved successfully.",
        color: 'green'
      })

      handleRefresh()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update notes. Please try again.",
        color: 'red'
      })
    } finally {
      setIsSubmittingNotes(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'Upcoming': 'blue',
      'In Progress': 'yellow',
      'Completed': 'green',
      'Cancelled': 'red',
      'Pending Approval': 'orange'
    }
    return <Badge color={variants[status] || 'gray'}>{status}</Badge>
  }

  const getStaffingStatus = () => {
    const assignedCount = assignedPersonnel.length
    const requested = shift?.requestedWorkers || 0

    if (assignedCount >= requested) {
      return <Badge color="green">Fully Staffed</Badge>
    } else if (assignedCount > 0) {
      return <Badge color="yellow">Partially Staffed</Badge>
    } else {
      return <Badge color="red">Unstaffed</Badge>
    }
  }

  if (shiftLoading || assignedLoading) {
    return (
      <Group justify="center" style={{ height: '100vh' }}>
        <LoadingSpinner />
      </Group>
    )
  }

  if (shiftError || !shift) {
    return (
      <Stack align="center" justify="center" style={{ height: '100vh' }}>
        <Card withBorder p="xl" radius="md">
          <Stack align="center">
            <Title order={3}>Shift Not Found</Title>
            <Text c="dimmed">
              The shift you're looking for doesn't exist or you don't have permission to view it.
            </Text>
            <Button onClick={() => router.push('/shifts')} leftSection={<ArrowLeft size={16} />}>
              Back to Shifts
            </Button>
          </Stack>
        </Card>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Group>
          <ActionIcon variant="subtle" onClick={() => router.push('/shifts')}>
            <ArrowLeft />
          </ActionIcon>
          <div>
            <Title order={2}>{shift.jobName}</Title>
            <Text c="dimmed">
              {shift.clientName} • {new Date(shift.date).toLocaleDateString()} • {formatTimeTo12Hour(shift.startTime)}
            </Text>
          </div>
        </Group>
        <Group>
          {getStatusBadge(shift.status)}
          {(shift.status === 'Completed' || shift.status === 'Pending Client Approval') && (
            <Button
              variant="outline"
              size="xs"
              onClick={async () => {
                try {
                  const timesheetResponse = await fetch(`/api/timesheets?shiftId=${shiftId}`)
                  if (timesheetResponse.ok) {
                    const timesheetData = await timesheetResponse.json()
                    if (timesheetData.timesheets && timesheetData.timesheets.length > 0) {
                      const timesheetId = timesheetData.timesheets[0].id
                      const pdfResponse = await fetch(`/api/timesheets/${timesheetId}/pdf`)
                      if (pdfResponse.ok) {
                        const blob = await pdfResponse.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `timesheet-${shift.jobName.replace(/\s+/g, '-')}-${shift.date}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        window.URL.revokeObjectURL(url)
                        document.body.removeChild(a)
                      }
                    }
                  }
                } catch (error) {
                  console.error('Error downloading PDF:', error)
                }
              }}
              leftSection={<Download size={14} />}
            >
              Download PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={() => router.push(generateShiftEditUrl(shiftId))}
          >
            Edit Shift
          </Button>
        </Group>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <Calendar size={20} />
              <Title order={4}>Shift Information</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <Group justify="space-between">
                <Text>Date:</Text>
                <Text fw={500}>{new Date(shift.date).toLocaleDateString()}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Time:</Text>
                <Text fw={500}>{formatTimeTo12Hour(shift.startTime)} - {formatTimeTo12Hour(shift.endTime)}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Location:</Text>
                <Text fw={500}>{shift.location}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Status:</Text>
                {getStatusBadge(shift.status)}
              </Group>
            </Stack>
          </Card.Section>
        </Card>

        <Card withBorder radius="md">
          <Card.Section withBorder inheritPadding py="xs">
            <Group>
              <Users size={20} />
              <Title order={4}>Staffing Overview</Title>
            </Group>
          </Card.Section>
          <Card.Section p="md">
            <Stack>
              <Group justify="space-between">
                <Text>Status:</Text>
                {getStaffingStatus()}
              </Group>
              <Group justify="space-between">
                <Text>Assigned Workers:</Text>
                <Text fw={500}>
                  {assignedPersonnel.length}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text>Requested Workers:</Text>
                <Text fw={500}>{shift.requestedWorkers}</Text>
              </Group>
              <Group justify="space-between">
                <Text>Crew Chief:</Text>
                <Text fw={500}>
                  {(() => {
                    const crewChief = assignedPersonnel.find((person: any) => person.roleCode === 'CC' || person.isCrewChief);
                    return crewChief ? crewChief.employeeName : 'Unassigned';
                  })()}
                </Text>
              </Group>
            </Stack>
          </Card.Section>
        </Card>
        <div style={{ gridColumn: '1 / -1' }}>
          <Accordion multiple value={requirementsAccordion} onChange={setRequirementsAccordion} variant="separated">
            <Accordion.Item value="requirements">
              <Accordion.Control>
                <Title order={4}>Worker Requirements</Title>
              </Accordion.Control>
              <Accordion.Panel>
                {shiftId && (
                  <UnifiedShiftManager
                    shiftId={shiftId}
                    assignedPersonnel={assignedPersonnel}
                    onUpdate={handleRefresh}
                  />
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Accordion multiple value={assignmentsAccordion} onChange={setAssignmentsAccordion} variant="separated">
            <Accordion.Item value="assignments">
              <Accordion.Control>
                <Title order={4}>Worker Assignments</Title>
              </Accordion.Control>
              <Accordion.Panel>
                {shiftId && (
                  <WorkerAssignmentDisplay
                    shiftId={shiftId}
                    assignedPersonnel={assignedPersonnel}
                    onUpdate={handleRefresh}
                  />
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </div>

      <Accordion multiple value={notesAccordion} onChange={setNotesAccordion} variant="separated">
        <Accordion.Item value="notes">
          <Accordion.Control>
            <Title order={4}>Notes</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              <Textarea
                placeholder="Enter shift notes..."
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                rows={4}
              />
              <Button
                onClick={handleNotesSubmit}
                loading={isSubmittingNotes}
              >
                Save Notes
              </Button>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion multiple value={permissionsAccordion} onChange={setPermissionsAccordion} variant="separated">
        <Accordion.Item value="permissions">
          <Accordion.Control>
            <Title order={4}>Crew Chief Permissions</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <CrewChiefPermissionManager
              targetId={shiftId}
              targetType="shift"
              targetName={`${shift.jobName} - ${new Date(shift.date).toLocaleDateString()} ${formatTimeTo12Hour(shift.startTime)}`}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion multiple value={dangerZoneAccordion} onChange={setDangerZoneAccordion} variant="separated">
        <Accordion.Item value="danger-zone">
          <Accordion.Control>
            <Title order={4} style={{ color: '#B91C1C' }}>Danger Zone</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <DangerZone
              entityType="shift"
              entityId={shiftId}
              entityName={`${shift.jobName} - ${new Date(shift.date).toLocaleDateString()} ${formatTimeTo12Hour(shift.startTime)}`}
              redirectTo="/shifts"
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
