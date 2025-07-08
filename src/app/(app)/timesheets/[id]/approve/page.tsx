"use client"

import { useRef, useState, useEffect, use } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { format } from 'date-fns'
import { useDisclosure } from '@mantine/hooks';

import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Alert, 
  Avatar, 
  Divider, 
  Container, 
  Stack, 
  Group, 
  Title, 
  Text, 
  Loader, 
  Center,
  Image,
  Grid
} from "@mantine/core"
import SignaturePad, { type SignaturePadRef } from "@/components/signature-pad"
import { ArrowLeft, CheckCircle, FileSignature, Save, RefreshCw } from "lucide-react"
import { formatTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils"

export default function ApproveTimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUser()
  const router = useRouter();
  const { toast } = useToast();
  const signatureRef = useRef<SignaturePadRef>(null);
  const [loading, setLoading] = useState(false);
  const [approvalType, setApprovalType] = useState<'client' | 'manager' | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const { id } = use(params);

  const { data: timesheetData, error } = useApi<{ timesheet: any }>(`/api/timesheets/${id}`);

  const timesheet = timesheetData?.timesheet;
  const shift = timesheet?.shift;
  const job = shift?.job;
  const client = shift?.client;

  useEffect(() => {
    // Redirect if user is not authorized
    if (!shift) return; // Guard for initial render

    if (user?.role === 'Employee') {
      router.push('/dashboard');
    } else if ((user?.role === 'Crew Chief' && shift.crewChief.id !== user.id) | user?.role === ) {
      router.push('/timesheets');
    }
  }, [user, shift, router]);

  if (error) {
    notFound()
  }

  if (!timesheetData || !timesheet || !shift || !client) {
    return (
      <Container>
        <Center style={{ height: '80vh' }}>
          <Loader />
          <Text ml="md">Loading...</Text>
        </Center>
      </Container>
    )
  }

  // Prevent rendering for unauthorized users while redirecting.
  if (user?.role === 'Employee' || (user?.role === 'Crew Chief' && shift.crewChief.id !== user.id)) {
    return null; // Render nothing while redirecting
  }

  const calculateTotalHours = (timeEntries: { clockIn?: string; clockOut?: string }[]) => {
    return calculateTotalRoundedHours(timeEntries);
  }

  const handleApproval = async () => {
    if (!approvalType) return;

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({
        title: "Error",
        description: "Please provide a signature.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const signatureDataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');

      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureDataUrl,
          approvalType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve timesheet');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message,
      });

      // Close dialog
      close();

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/timesheets/${id}`);
      }, 1000);

    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to approve timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    // TODO: Add rejection dialog with reason
    setLoading(true);
    try {
      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Rejected by manager',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject timesheet');
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message,
      });

      // Data will be refreshed on page reload

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/timesheets');
      }, 1000);

    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to reject timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isClientApproved = timesheet.status === 'pending_manager_approval' || timesheet.status === 'completed';
  const isManagerApproved = timesheet.status === 'completed';
  const canClientApprove = timesheet.status === 'pending_client_approval' && (user?.role === 'Manager/Admin' || user?.role === 'Client');
  const canManagerApprove = timesheet.status === 'pending_manager_approval' && user?.role === 'Manager/Admin';

  const openModal = (type: 'client' | 'manager') => {
    setApprovalType(type);
    open();
  };

  return (
    <Container>
      <Stack gap="lg">
        <Button
          component={Link}
          href="/timesheets"
          variant="subtle"
          leftSection={<ArrowLeft size={16} />}
          styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
        >
          Back to Timesheets
        </Button>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Stack gap={0}>
                <Title order={2}>Timesheet Approval</Title>
                <Text c="dimmed">
                  Review and approve the hours for the shift on {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}.
                </Text>
              </Stack>
              <Group>
                {isClientApproved && timesheet.clientSignature && (
                  <Stack align="flex-end" gap="xs">
                    <Text size="sm" fw={500}>Client Approved</Text>
                    <Image src={timesheet.clientSignature} alt="Client Signature" h={40} w="auto" fit="contain" style={{ border: '1px solid #ccc', borderRadius: '4px' }} />
                    <Text size="xs" c="dimmed">
                      {timesheet.clientApprovedAt && format(new Date(timesheet.clientApprovedAt), 'MMM d, yyyy')}
                    </Text>
                  </Stack>
                )}
                {isManagerApproved && timesheet.managerSignature && (
                  <Stack align="flex-end" gap="xs">
                    <Text size="sm" fw={500}>Manager Approved</Text>
                    <Image src={timesheet.managerSignature} alt="Manager Signature" h={40} w="auto" fit="contain" style={{ border: '1px solid #ccc', borderRadius: '4px' }} />
                    <Text size="xs" c="dimmed">
                      {timesheet.managerApprovedAt && format(new Date(timesheet.managerApprovedAt), 'MMM d, yyyy')}
                    </Text>
                  </Stack>
                )}
              </Group>
            </Group>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Stack>
              <Grid>
                <Grid.Col span={{ base: 12, md: 3 }}><Text c="dimmed" size="sm">Client</Text><Text>{client?.name || 'N/A'}</Text></Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}><Text c="dimmed" size="sm">Location</Text><Text>{shift?.location || 'N/A'}</Text></Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}><Text c="dimmed" size="sm">Shift Date</Text><Text>{formatDate(shift?.date)}</Text></Grid.Col>
                <Grid.Col span={{ base: 12, md: 3 }}><Text c="dimmed" size="sm">Start Time</Text><Text>{formatTo12Hour(shift?.startTime)}</Text></Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}><Text c="dimmed" size="sm">Crew Chief</Text><Text>{shift?.crewChief?.name || 'Not Assigned'}</Text></Grid.Col>
                <Grid.Col span={{ base: 12, md: 6 }}><Text c="dimmed" size="sm">Job</Text><Text>{job?.name || shift?.jobName || 'N/A'}</Text></Grid.Col>
              </Grid>
              <Divider my="md" />
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Time In</Table.Th>
                    <Table.Th>Time Out</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Total Hours</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {shift.assignedPersonnel.filter((p: any) => p.timeEntries.length > 0).map((person: any) => (
                    <Table.Tr key={person.employee.id}>
                      <Table.Td>{person.employee.name}</Table.Td>
                      <Table.Td>{person.roleOnShift}</Table.Td>
                      <Table.Td>
                        {person.timeEntries.map((entry: any, index: number) => (
                          <div key={index}>{getTimeEntryDisplay(entry.clockIn, entry.clockOut).displayClockIn}</div>
                        ))}
                      </Table.Td>
                      <Table.Td>
                        {person.timeEntries.map((entry: any, index: number) => (
                          <div key={index}>{getTimeEntryDisplay(entry.clockIn, entry.clockOut).displayClockOut}</div>
                        ))}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{calculateTotalHours(person.timeEntries)}</Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr>
                    <Table.Td colSpan={4} style={{ textAlign: 'right' }}><Text fw={700}>Total Hours:</Text></Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}><Text fw={700}>
                      {calculateTotalHours(shift.assignedPersonnel.flatMap((p: any) => p.timeEntries))}
                    </Text></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Card.Section>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="flex-end">
              {canClientApprove && (
                <Button onClick={() => openModal('client')} disabled={loading} leftSection={<FileSignature size={16} />}>
                  Client Approval
                </Button>
              )}
              {canManagerApprove && (
                <Group>
                  <Button onClick={() => openModal('manager')} disabled={loading} color="green" leftSection={<CheckCircle size={16} />}>
                    Manager Approval
                  </Button>
                  <Button variant="filled" color="red" onClick={handleReject} disabled={loading}>
                    Reject
                  </Button>
                </Group>
              )}
              {isManagerApproved && (
                <Alert color="green" title="Timesheet Completed" icon={<CheckCircle />} style={{ flex: 1 }}>
                  This timesheet has been fully approved and completed.
                </Alert>
              )}
            </Group>
          </Card.Section>
        </Card>

        <Modal opened={opened} onClose={close} title={`${approvalType === 'client' ? 'Client' : 'Manager'} Signature`}>
          <Stack>
            <Text size="sm">Please sign below to confirm the hours are correct.</Text>
            <SignaturePad ref={signatureRef} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => signatureRef.current?.clear()} leftSection={<RefreshCw size={16} />}>
                Clear
              </Button>
              <Button onClick={handleApproval} loading={loading} leftSection={<Save size={16} />}>
                {loading ? 'Submitting...' : 'Sign and Submit'}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}
