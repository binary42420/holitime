"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import {
  Card,
  Table,
  Button,
  Badge,
  Select,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
} from "@mantine/core"
import {
  ArrowLeft,
  Download,
  Clock,
  BarChart3
} from "lucide-react"
import { subDays, startOfMonth, endOfMonth } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { User, Shift } from "@/lib/types"; // Import User and Shift types

//*******************************************************************\\
//=======  Employee Reports Page - Main Component  =================\\
//*******************************************************************\\

function EmployeeReportsPage() {
  //***************************\\
  //=======  Hooks  ===========\\
  //***************************\\
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  //*********************************\\
  //=======  State Management  =======\\
  //*********************************\\
  const [reportType, setReportType] = useState("performance")
  const [dateRange, setDateRange] = useState("thisMonth")
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  // Fetch users and shifts data from the API
  const { data: usersData } = useApi<{ users: User[] }>('/api/users')
  const { data: shiftsData } = useApi<{ shifts: Shift[] }>('/api/shifts')

  //*********************************\\
  //=======  Access Control  =========\\
  //*********************************\\
  // Redirect if the current user does not have 'Manager/Admin' role
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  //*********************************\\
  //=======  Data Processing  =======\\
  //*********************************\\
  // Filter out client users from the users data
  const employees = usersData?.users?.filter(u => u.role !== 'Client') || []
  const shifts = shiftsData?.shifts || []

  // Calculate date range based on selected filter
  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
      case 'lastWeek':
        return { start: subDays(now, 7), end: now }
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }
      case 'last3Months':
        return { start: subDays(now, 90), end: now }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // Generate performance report data for employees
  const generatePerformanceReport = () => {
    const { start, end } = getDateRange()
    
    return employees.map(employee => {
      // Filter shifts relevant to the current employee and date range
      const employeeShifts = shifts.filter(shift => 
        shift.assignedPersonnel.some(p => p.employee.id === employee.id) && // Check assignedPersonnel
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const completedShifts = employeeShifts.filter(shift => shift.status === 'Completed')
      const totalHours = completedShifts.reduce((sum, shift) => {
        const start = new Date(`2000-01-01 ${shift.startTime}`)
        const end = new Date(`2000-01-01 ${shift.endTime}`)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      }, 0)

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        shiftsAssigned: employeeShifts.length,
        shiftsCompleted: completedShifts.length,
        completionRate: employeeShifts.length > 0 ? (completedShifts.length / employeeShifts.length * 100) : 0,
        totalHours: totalHours,
        avgHoursPerShift: completedShifts.length > 0 ? totalHours / completedShifts.length : 0,
      }
    }).filter(emp => selectedEmployee === 'all' || emp.id === selectedEmployee)
  }

  // Generate attendance report data for employees
  const generateAttendanceReport = () => {
    const { start, end } = getDateRange()
    
    return employees.map(employee => {
      // Filter shifts relevant to the current employee and date range
      const employeeShifts = shifts.filter(shift => 
        shift.assignedPersonnel.some(p => p.employee.id === employee.id) && // Check assignedPersonnel
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const attendedShifts = employeeShifts.filter(shift => 
        shift.status === 'Completed' || shift.status === 'In Progress'
      )
      const noShowShifts = employeeShifts.filter(shift => shift.status === 'Cancelled')

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        scheduledShifts: employeeShifts.length,
        attendedShifts: attendedShifts.length,
        noShows: noShowShifts.length,
        attendanceRate: employeeShifts.length > 0 ? (attendedShifts.length / employeeShifts.length * 100) : 0,
      }
    }).filter(emp => selectedEmployee === 'all' || emp.id === selectedEmployee)
  }

  //*********************************\\
  //=======  Event Handlers  =========\\
  //*********************************\\
  // Handler for exporting reports
  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being prepared for download.",
    })
    // In a real application, this would trigger a CSV/PDF export process
  }

  // Generate report data based on selected report type
  const performanceData = generatePerformanceReport()
  const attendanceData = generateAttendanceReport()

  //***************************\\
  //=======  Render UI  =========\\
  //***************************\\
  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header Section */}
        <Group justify="space-between">
          <Stack gap={0}>
            {/* Back button to Employee Management */}
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin/employees')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Employees
            </Button>
            {/* Page Title and Description */}
            <Title order={1}>Employee Reports</Title>
            <Text c="dimmed">Analyze employee performance and attendance</Text>
          </Stack>
          {/* Button to export the current report */}
          <Button
            leftSection={<Download size={16} />}
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        </Group>

        {/* Report Filters Card */}
        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Title order={4}>Report Filters</Title>
            <Text size="sm" c="dimmed">Configure your report parameters</Text>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            <Grid>
              {/* Report Type Selection */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Report Type"
                  value={reportType}
                  onChange={(value) => setReportType(value || "performance")}
                  data={[
                    { value: 'performance', label: 'Performance Report' },
                    { value: 'attendance', label: 'Attendance Report' },
                  ]}
                />
              </Grid.Col>
              {/* Date Range Selection */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Date Range"
                  value={dateRange}
                  onChange={(value) => setDateRange(value || "thisMonth")}
                  data={[
                    { value: 'lastWeek', label: 'Last Week' },
                    { value: 'thisMonth', label: 'This Month' },
                    { value: 'lastMonth', label: 'Last Month' },
                    { value: 'last3Months', label: 'Last 3 Months' },
                  ]}
                />
              </Grid.Col>
              {/* Employee Selection */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Select
                  label="Employee"
                  value={selectedEmployee}
                  onChange={(value) => setSelectedEmployee(value || "all")}
                  data={[
                    { value: 'all', label: 'All Employees' },
                    // Map employee data to select options
                    ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                  ]}
                />
              </Grid.Col>
            </Grid>
          </Card.Section>
        </Card>

        {/* Performance Report Section (conditionally rendered) */}
        {reportType === 'performance' && (
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <Group>
                <BarChart3 size={20} />
                <Title order={4}>Performance Report</Title>
              </Group>
              <Text size="sm" c="dimmed">Employee performance metrics for the selected period</Text>
            </Card.Section>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Shifts Assigned</Table.Th>
                  <Table.Th>Shifts Completed</Table.Th>
                  <Table.Th>Completion Rate</Table.Th>
                  <Table.Th>Total Hours</Table.Th>
                  <Table.Th>Avg Hours/Shift</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Map through performance data to render table rows */}
                {performanceData.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td><Text fw={500}>{employee.name}</Text></Table.Td>
                    <Table.Td><Badge variant="light">{employee.role}</Badge></Table.Td>
                    <Table.Td>{employee.shiftsAssigned}</Table.Td>
                    <Table.Td>{employee.shiftsCompleted}</Table.Td>
                    <Table.Td>
                      <Badge color={employee.completionRate >= 90 ? 'green' : employee.completionRate >= 70 ? 'yellow' : 'red'}>
                        {employee.completionRate.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                    <Table.Td>{employee.totalHours.toFixed(1)}h</Table.Td>
                    <Table.Td>{employee.avgHoursPerShift.toFixed(1)}h</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}

        {/* Attendance Report Section (conditionally rendered) */}
        {reportType === 'attendance' && (
          <Card withBorder>
            <Card.Section withBorder inheritPadding py="sm">
              <Group>
                <Clock size={20} />
                <Title order={4}>Attendance Report</Title>
              </Group>
              <Text size="sm" c="dimmed">Employee attendance metrics for the selected period</Text>
            </Card.Section>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Employee</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Scheduled Shifts</Table.Th>
                  <Table.Th>Attended Shifts</Table.Th>
                  <Table.Th>No Shows</Table.Th>
                  <Table.Th>Attendance Rate</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Map through attendance data to render table rows */}
                {attendanceData.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td><Text fw={500}>{employee.name}</Text></Table.Td>
                    <Table.Td><Badge variant="light">{employee.role}</Badge></Table.Td>
                    <Table.Td>{employee.scheduledShifts}</Table.Td>
                    <Table.Td>{employee.attendedShifts}</Table.Td>
                    <Table.Td>
                      <Badge color={employee.noShows > 0 ? 'red' : 'gray'}>
                        {employee.noShows}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={employee.attendanceRate >= 95 ? 'green' : employee.attendanceRate >= 80 ? 'yellow' : 'red'}>
                        {employee.attendanceRate.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>
    </Container>
  )
}

export default EmployeeReportsPage;
