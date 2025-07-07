"use client"

import Link from "next/link"
import { useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Table, Card, Tabs, Button, Badge, Group, Text, Title, Stack } from "@mantine/core"
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { format } from "date-fns"
import type { Timesheet, TimesheetStatus } from "@/lib/types"
import { ArrowRight, Check, FileSignature, VenetianMask, Download } from "lucide-react"
import { notifications } from "@mantine/notifications"

export default function TimesheetsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { data: timesheetsData, loading, error, refetch } = useTimesheets();

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve timesheet')
      }

      notifications.show({
        title: "Timesheet Approved",
        message: "The timesheet has been approved successfully.",
        color: 'green'
      })

      refetch()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to approve timesheet. Please try again.",
        color: 'red'
      })
    }
  };

  useEffect(() => {
    if (user?.role === 'Employee') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  const timesheetsToDisplay = useMemo(() => {
    if (!timesheetsData?.timesheets) return [];
    return timesheetsData.timesheets;
  }, [timesheetsData]);

  if (user?.role === 'Employee') {
    return null;
  }

  if (loading) {
    return <Text>Loading timesheets...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading timesheets: {error}</Text>;
  }

  const getTimesheetStatusVariant = (status: TimesheetStatus) => {
    switch (status) {
      case 'Approved': return 'green';
      case 'Awaiting Client Approval': return 'red';
      case 'Awaiting Manager Approval': return 'yellow';
      case 'Pending Finalization': return 'blue';
      default: return 'gray'
    }
  }

  const handleDownloadPDF = async (timesheetId: string, clientName: string, shiftDate: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `timesheet-${clientName.replace(/\s+/g, '-')}-${shiftDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to download PDF",
          color: 'red'
        })
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      notifications.show({
        title: "Error",
        message: "Failed to download PDF",
        color: 'red'
      })
    }
  }

  const renderAction = (timesheet: any) => {
    if (!timesheet.shift) return null;

    if (timesheet.status === 'completed' || timesheet.status === 'Approved') {
      return (
        <Group>
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleDownloadPDF(timesheet.id, timesheet.shift.clientName, timesheet.shift.date)}
            leftSection={<Download size={14} />}
          >
            PDF
          </Button>
          <Button size="xs" variant="outline" component={Link} href={`/timesheets/${timesheet.id}`}>View</Button>
        </Group>
      )
    }

    if (user?.role === 'Manager/Admin') {
      if (timesheet.status === 'pending_final_approval' || timesheet.status === 'Awaiting Manager Approval') {
        return <Button size="xs" component={Link} href={`/timesheets/${timesheet.id}/manager-approval`} leftSection={<Check size={14} />}>Final Approval</Button>
      }
      if (timesheet.status === 'pending_client_approval' || timesheet.status === 'Awaiting Client Approval') {
        return <Button size="xs" component={Link} href={`/timesheets/${timesheet.id}/approve`} leftSection={<FileSignature size={14} />}>Client Approval</Button>
      }
    }

    if (user?.role === 'Crew Chief' && (timesheet.status === 'pending_client_approval' || timesheet.status === 'Awaiting Client Approval')) {
       return <Button size="xs" component={Link} href={`/timesheets/${timesheet.id}/approve`} leftSection={<FileSignature size={14} />}>Client Approval</Button>
    }

    if (user?.role === 'Manager/Admin' && timesheet.status === 'Approved') {
        return <Button size="xs" variant="outline" component={Link} href={`/timesheets/${timesheet.id}/approve`} leftSection={<VenetianMask size={14} />}>View as Client</Button>
    }

    return (
        <Button size="xs" variant="outline" component={Link} href={`/shifts/${timesheet.shift.id}`} rightSection={<ArrowRight size={14} />}>View Shift</Button>
    )
  }

  const tabs = [
    { value: 'pending_client_approval', label: 'Client Approval' },
    { value: 'pending_final_approval', label: 'Manager Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'draft', label: 'Draft' }
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={1}>Timesheets</Title>
      </Group>
      <Tabs defaultValue="pending_client_approval">
        <Tabs.List>
          {tabs.map(tab => <Tabs.Tab key={tab.value} value={tab.value}>{tab.label}</Tabs.Tab>)}
        </Tabs.List>
        {tabs.map(tab => (
            <Tabs.Panel key={tab.value} value={tab.value} pt="xs">
                <Card withBorder radius="md">
                    <Card.Section withBorder inheritPadding py="xs">
                        <Title order={4}>{tab.label}</Title>
                        <Text size="sm" c="dimmed">
                            Shifts with timesheets currently in this state.
                        </Text>
                    </Card.Section>
                    <Card.Section p="md">
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {timesheetsToDisplay.filter(t => t.status === tab.value).map(timesheet => (
                                <Card key={timesheet.id} withBorder radius="md" p="md">
                                    <Title order={5}>{timesheet.shift.clientName}</Title>
                                    <Text size="sm" c="dimmed">
                                        {format(new Date(timesheet.shift.date), 'EEE, MMM d, yyyy')}
                                    </Text>
                                    <Group justify="space-between" mt="md">
                                        <div>
                                            <Text size="xs" c="dimmed">Crew Chief</Text>
                                            <Text fw={500}>{timesheet.shift.crewChiefName}</Text>
                                        </div>
                                        {renderAction(timesheet)}
                                    </Group>
                                </Card>
                            ))}
                        </div>
                    </Card.Section>
                </Card>
            </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  )
}
