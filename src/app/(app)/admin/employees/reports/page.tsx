'use client';

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  Download,
  FileText,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3
} from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { useToast } from "@/hooks/use-toast"

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function EmployeeReportsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [reportType, setReportType] = useState("performance")
  const [dateRange, setDateRange] = useState("thisMonth")
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  const { data: usersData } = useApi<{ users: any[] }>("/api/users")
  const { data: shiftsData } = useApi<{ shifts: any[] }>("/api/shifts")

  // Redirect if not admin
  if (user?.role !== "Manager/Admin") {
    router.push("/dashboard")
    return null
  }

  const employees = usersData?.users?.filter(u => u.role !== "Client") || []
  const shifts = shiftsData?.shifts || []

  // Calculate date range
  const getDateRange = () => {
    const now = new Date()
    switch (dateRange) {
    case "lastWeek":
      return { start: subDays(now, 7), end: now }
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case "lastMonth":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case "last3Months":
      return { start: subDays(now, 90), end: now }
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // Generate performance report data
  const generatePerformanceReport = () => {
    const { start, end } = getDateRange()
    
    return employees.map(employee => {
      const employeeShifts = shifts.filter(shift => 
        shift.assignedWorkers?.includes(employee.id) &&
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const completedShifts = employeeShifts.filter(shift => shift.status === "Completed")
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
    }).filter(emp => selectedEmployee === "all" || emp.id === selectedEmployee)
  }

  // Generate attendance report data
  const generateAttendanceReport = () => {
    const { start, end } = getDateRange()
    
    return employees.map(employee => {
      const employeeShifts = shifts.filter(shift => 
        shift.assignedWorkers?.includes(employee.id) &&
        new Date(shift.date) >= start &&
        new Date(shift.date) <= end
      )

      const attendedShifts = employeeShifts.filter(shift => 
        shift.status === "Completed" || shift.status === "In Progress"
      )
      const noShowShifts = employeeShifts.filter(shift => shift.status === "Cancelled")

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        scheduledShifts: employeeShifts.length,
        attendedShifts: attendedShifts.length,
        noShows: noShowShifts.length,
        attendanceRate: employeeShifts.length > 0 ? (attendedShifts.length / employeeShifts.length * 100) : 0,
      }
    }).filter(emp => selectedEmployee === "all" || emp.id === selectedEmployee)
  }

  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being prepared for download.",
    })
    // In a real app, this would trigger a CSV/PDF export
  }

  const performanceData = generatePerformanceReport()
  const attendanceData = generateAttendanceReport()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/employees")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Employees
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Employee Reports</h1>
          <p className="text-muted-foreground">Analyze employee performance and attendance</p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Configure your report parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance Report</SelectItem>
                  <SelectItem value="attendance">Attendance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="last3Months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === "performance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Report
            </CardTitle>
            <CardDescription>
              Employee performance metrics for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shifts Assigned</TableHead>
                  <TableHead>Shifts Completed</TableHead>
                  <TableHead>Completion Rate</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Avg Hours/Shift</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.role}</Badge>
                    </TableCell>
                    <TableCell>{employee.shiftsAssigned}</TableCell>
                    <TableCell>{employee.shiftsCompleted}</TableCell>
                    <TableCell>
                      <Badge variant={employee.completionRate >= 90 ? "default" : employee.completionRate >= 70 ? "secondary" : "destructive"}>
                        {employee.completionRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.totalHours.toFixed(1)}h</TableCell>
                    <TableCell>{employee.avgHoursPerShift.toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Report
            </CardTitle>
            <CardDescription>
              Employee attendance metrics for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Scheduled Shifts</TableHead>
                  <TableHead>Attended Shifts</TableHead>
                  <TableHead>No Shows</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.role}</Badge>
                    </TableCell>
                    <TableCell>{employee.scheduledShifts}</TableCell>
                    <TableCell>{employee.attendedShifts}</TableCell>
                    <TableCell>
                      {employee.noShows > 0 && (
                        <Badge variant="destructive">{employee.noShows}</Badge>
                      )}
                      {employee.noShows === 0 && (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.attendanceRate >= 95 ? "default" : employee.attendanceRate >= 80 ? "secondary" : "destructive"}>
                        {employee.attendanceRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default withAuth(EmployeeReportsPage, hasAdminAccess)
