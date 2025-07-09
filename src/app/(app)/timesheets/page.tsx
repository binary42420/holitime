"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Grid, Card, Tabs, Text, Title, Stack, ScrollArea, Center, Loader } from "@mantine/core"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { format } from "date-fns"
import type { TimesheetDetails } from "@/lib/types"
import { formatTimeTo12Hour } from "@/lib/time-utils"
import { TimesheetDetails as TimesheetDetailsComponent } from "@/components/timesheet-details"
import { FileText } from "lucide-react"

export default function TimesheetsPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTimesheetId = searchParams.get('id');

  const { data: timesheetsData, loading, error } = useApi<{ timesheets: TimesheetDetails[] }>('/api/timesheets');

  const [activeTab, setActiveTab] = useState<string | null>('pending_client_approval');

  const filteredTimesheets = useMemo(() => {
    if (!timesheetsData?.timesheets) return [];
    return timesheetsData.timesheets.filter(t => t.status === activeTab);
  }, [timesheetsData, activeTab]);

  const selectedTimesheet = useMemo(() => {
    if (!selectedTimesheetId || !timesheetsData?.timesheets) return null;
    return timesheetsData.timesheets.find(t => t.id === selectedTimesheetId) || null;
  }, [selectedTimesheetId, timesheetsData]);

  const handleSelectTimesheet = (id: string) => {
    router.push(`/timesheets?id=${id}`);
  };

  const tabs = [
    { value: 'pending_client_approval', label: 'Client Approval' },
    { value: 'pending_manager_approval', label: 'Manager Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  if (loading) {
    return <Center style={{ height: '100%' }}><Loader /></Center>;
  }

  if (error) {
    return <Center style={{ height: '100%' }}><Text color="red">Error loading timesheets.</Text></Center>;
  }

  return (
    <Grid gutter="md" style={{ height: '100%' }}>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack style={{ height: '100%' }}>
          <Title order={2}>Timesheets</Title>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List grow>
              {tabs.map(tab => <Tabs.Tab key={tab.value} value={tab.value}>{tab.label}</Tabs.Tab>)}
            </Tabs.List>
          </Tabs>
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="sm">
              {filteredTimesheets.map(timesheet => (
                <Card
                  key={timesheet.id}
                  shadow="sm"
                  padding="md"
                  radius="md"
                  withBorder
                  onClick={() => handleSelectTimesheet(timesheet.id)}
                  style={{ cursor: 'pointer', borderLeft: selectedTimesheetId === timesheet.id ? '4px solid var(--mantine-color-primary-filled)' : undefined }}
                >
                  <Text fw={500}>{timesheet.shift.jobName}</Text>
                  <Text size="sm" c="dimmed">{timesheet.shift.clientName}</Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    {format(new Date(timesheet.shift.date), 'EEE, MMM d, yyyy')} • {formatTimeTo12Hour(timesheet.shift.startTime)} - {formatTimeTo12Hour(timesheet.shift.endTime)}
                  </Text>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Card style={{ height: '100%' }} withBorder>
          <ScrollArea style={{ height: 'calc(100vh - 160px)' }}>
            {selectedTimesheet ? (
              <TimesheetDetailsComponent timesheet={selectedTimesheet} />
            ) : (
              <Center style={{ height: '100%' }}>
                <Stack align="center" gap="md">
                  <FileText size={48} strokeWidth={1} />
                  <Title order={3}>No timesheet selected</Title>
                  <Text c="dimmed">Please select a timesheet from the list to view its details.</Text>
                </Stack>
              </Center>
            )}
          </ScrollArea>
        </Card>
      </Grid.Col>
    </Grid>
  )
}
