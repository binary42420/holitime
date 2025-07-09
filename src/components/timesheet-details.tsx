"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
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
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import type { TimesheetDetails as TimesheetDetailsType } from "@/lib/types"
import { formatTimeTo12Hour } from "@/lib/time-utils"

interface TimesheetDetailsProps {
  timesheet: TimesheetDetailsType;
}

export function TimesheetDetails({ timesheet }: TimesheetDetailsProps) {

  const calculateHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'pending_client_approval':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending Client Approval</Badge>
      case 'pending_manager_approval':
        return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Pending Manager Approval</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch(`/api/timesheets/${timesheet.id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${timesheet.shift.clientName}-${timesheet.shift.date}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const maxEntries = Math.max(
    ...timesheet.assignedPersonnel.map(p => p.timeEntries.length),
    1
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Timesheet Details</h1>
          <p className="text-muted-foreground">
            View timesheet information and approval status
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          {getStatusBadge(timesheet.status)}
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Rejection Notice */}
      {timesheet.status === 'Rejected' && timesheet.rejectionReason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Timesheet Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{timesheet.rejectionReason}</p>
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
            {timesheet.approvedByClientAt ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheet.approvedByClientAt), 'MMMM d, yyyy at h:mm a')}
                </p>
                {timesheet.clientSignature && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Client Signature:</p>
                    <img 
                      src={timesheet.clientSignature} 
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
            {timesheet.approvedByManagerAt ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">Approved</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheet.approvedByManagerAt), 'MMMM d, yyyy at h:mm a')}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job</Label>
              <p className="font-medium">{timesheet.shift.jobName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Client</Label>
              <p className="font-medium">{timesheet.shift.clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(timesheet.shift.date), 'MMMM d, yyyy')}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Crew Chief</Label>
              <p className="font-medium">{timesheet.shift.crewChiefName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Time</Label>
              <p className="font-medium">{formatTimeTo12Hour(timesheet.shift.startTime)} - {formatTimeTo12Hour(timesheet.shift.endTime)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Location</Label>
              <p className="font-medium">{timesheet.shift.location}</p>
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white">Worker</TableHead>
                <TableHead>Role</TableHead>
                {Array.from({ length: maxEntries }, (_, i) => (
                  <React.Fragment key={i}>
                    <TableHead>Time In {i + 1}</TableHead>
                    <TableHead>Time Out {i + 1}</TableHead>
                  </React.Fragment>
                ))}
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timesheet.assignedPersonnel.map((worker) => {
                const totalHours = worker.timeEntries.reduce((sum, entry) =>
                  sum + calculateHours(entry.clockIn, entry.clockOut), 0
                );
                
                return (
                  <TableRow key={worker.id}>
                    <TableCell className="sticky left-0 bg-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={worker.employee.avatar} />
                          <AvatarFallback>
                            {worker.employee.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">{worker.employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{worker.roleCode}</Badge>
                    </TableCell>
                    {Array.from({ length: maxEntries }, (_, i) => {
                      const entry = worker.timeEntries.find(e => e.entryNumber === i + 1);
                      return (
                        <React.Fragment key={i}>
                          <TableCell>{entry?.clockIn ? formatTimeTo12Hour(entry.clockIn) : '-'}</TableCell>
                          <TableCell>{entry?.clockOut ? formatTimeTo12Hour(entry.clockOut) : '-'}</TableCell>
                        </React.Fragment>
                      )
                    })}
                    <TableCell className="font-medium">
                      {totalHours.toFixed(2)} hrs
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}