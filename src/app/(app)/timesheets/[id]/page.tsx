"use client"

import React from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Download,
  Shield,
  ArrowLeft,
  AlertCircle
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { format, isValid, parseISO } from "date-fns"
import { formatTo12Hour, getTimeEntryDisplay, calculateTotalRoundedHours } from "@/lib/time-utils"
import { MobileTimeEntryDisplay } from "@/components/mobile-timesheet-card"

interface TimesheetData {
  id: string
  status: string
  clientSignature?: string
  clientApprovedAt?: string
  managerApprovedAt?: string
  rejectionReason?: string
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    jobName: string
    clientName: string
    crewChiefName: string
  }
  assignedPersonnel: Array<{
    id: string
    employeeName: string
    employeeAvatar: string
    roleOnShift: string
    roleCode: string
    timeEntries: Array<{
      id: string
      entryNumber: number
      clockIn?: string
      clockOut?: string
    }>
  }>
}

export default function TimesheetViewPage() {
  const params = useParams()
  const router = useRouter()
  const timesheetId = params.id as string

  // Fetch timesheet data with transformation
  const { data: rawData, loading } = useApi<{success: boolean, timesheet: any}>(`/api/timesheets/${timesheetId}`)

  // Transform the API response to match the expected structure
  const timesheetData: TimesheetData | null = rawData?.success && rawData.timesheet ? {
    id: rawData.timesheet.id,
    status: rawData.timesheet.status,
    clientSignature: rawData.timesheet.clientSignature,
    clientApprovedAt: rawData.timesheet.clientApprovedAt,
    managerApprovedAt: rawData.timesheet.managerApprovedAt,
    rejectionReason: rawData.timesheet.rejectionReason,
    shift: {
      id: rawData.timesheet.shift.id,
      date: rawData.timesheet.shift.date,
      startTime: rawData.timesheet.shift.startTime,
      endTime: rawData.timesheet.shift.endTime,
      location: rawData.timesheet.shift.location,
      jobName: rawData.timesheet.shift.job.name,
      clientName: rawData.timesheet.shift.client.name,
      crewChiefName: rawData.timesheet.shift.crewChief.name,
    },
    assignedPersonnel: rawData.timesheet.assignedPersonnel?.map((p: any) => ({
      id: p.id,
      employeeName: p.employeeName,
      employeeAvatar: p.employeeAvatar,
      roleOnShift: p.roleOnShift,
      roleCode: p.roleCode,
      timeEntries: (p.timeEntries || []).map((te: any) => ({
        id: te.id,
        entryNumber: te.entryNumber,
        clockIn: te.clockIn,
        clockOut: te.clockOut,
      })),
    })) || [],
  } : null

  // Robust date formatting function with mobile optimization
  const formatApprovalDate = (dateString?: string) => {
    if (!dateString) return "Not yet approved"

    try {
      // Handle various date formats
      let date: Date

      // Try parsing as ISO string first
      if (typeof dateString === "string" && (dateString.includes("T") || dateString.includes("Z"))) {
        date = parseISO(dateString)
      } else {
        date = new Date(dateString)
      }

      // Validate the date
      if (!isValid(date)) {
        console.warn("Invalid date received:", dateString)
        return "Invalid date"
      }

      // Mobile: shorter format, Desktop: full format
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        return format(date, "MMM d, yyyy h:mm a")
      }
      return format(date, "MMMM d, yyyy 'at' h:mm a")
    } catch (error) {
      console.error("Error formatting approval date:", dateString, error)
      return "Invalid date"
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "-"
    return formatTo12Hour(timeString)
  }

  const calculateHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  const formatTotalHours = (totalHours: number) => {
    if (totalHours === 0) return "0h 0m"
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    return `${hours}h ${minutes}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
    case "rejected":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    case "pending_client_approval":
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Client Approval</Badge>
    case "pending_manager_approval":
      return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Pending Manager Approval</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
    }
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/pdf`)
      if (!response.ok) throw new Error("Failed to generate PDF")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `timesheet-${timesheetData?.shift.jobName}-${timesheetData?.shift.date}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading timesheet...</div>
        </div>
      </div>
    )
  }

  if (!timesheetData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Timesheet not found</div>
        </div>
      </div>
    )
  }

  const { shift, assignedPersonnel } = timesheetData

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="mobile"
          onClick={() => router.push("/timesheets")}
          className="self-start -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Timesheets
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Timesheet Details 📋</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {shift.jobName} • {format(new Date(shift.date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {getStatusBadge(timesheetData.status)}
            <Button
              variant="outline"
              size="mobile"
              onClick={downloadPDF}
              className="w-full md:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Rejection Notice */}
      {timesheetData.status === "rejected" && timesheetData.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Timesheet Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{timesheetData.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

      {/* Approval Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Client Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timesheetData.clientApprovedAt ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatApprovalDate(timesheetData.clientApprovedAt)}
                </p>
                {timesheetData.clientSignature && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Client Signature:</p>
                    <img 
                      src={timesheetData.clientSignature} 
                      alt="Client Signature" 
                      className="h-12 border rounded"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700">Pending</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manager Approval */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manager Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timesheetData.managerApprovedAt ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatApprovalDate(timesheetData.managerApprovedAt)}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700">Pending</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shift Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job</Label>
              <p className="font-medium">{shift.jobName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Client</Label>
              <p className="font-medium">{shift.clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(shift.date), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Crew Chief</Label>
              <p className="font-medium">{shift.crewChiefName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Time</Label>
              <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <p className="font-medium">{shift.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Worker Time Entries
          </CardTitle>
          <CardDescription>
            Complete record of all worker time entries for this shift
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>JT</TableHead>
                  <TableHead>IN 1</TableHead>
                  <TableHead>OUT 1</TableHead>
                  <TableHead>IN 2</TableHead>
                  <TableHead>OUT 2</TableHead>
                  <TableHead>IN 3</TableHead>
                  <TableHead>OUT 3</TableHead>
                  <TableHead>Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedPersonnel.length > 0 ? assignedPersonnel.map((worker) => {
                  // Calculate total hours using the proper time utilities
                  const totalHours = calculateTotalRoundedHours(worker.timeEntries.map(entry => ({
                    clockIn: entry.clockIn,
                    clockOut: entry.clockOut
                  })))

                  return (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={worker.employeeAvatar} />
                            <AvatarFallback>
                              {worker.employeeName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{worker.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{worker.roleCode}</Badge>
                      </TableCell>
                      {[1, 2, 3].map((entryNum) => {
                        const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
                        const display = getTimeEntryDisplay(entry?.clockIn, entry?.clockOut)
                        return (
                          <React.Fragment key={entryNum}>
                            <TableCell className="text-sm">
                              {display.displayClockIn}
                            </TableCell>
                            <TableCell className="text-sm">
                              {display.displayClockOut}
                            </TableCell>
                          </React.Fragment>
                        )
                      })}
                      <TableCell className="font-medium">
                        {totalHours}
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No time entries found for this timesheet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            <MobileTimeEntryDisplay assignedPersonnel={assignedPersonnel} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
