'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@mantine/core'
import { Badge } from '@mantine/core'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Building2, Calendar, CheckCircle, Clock, FileSignature, MapPin, User, Shield } from 'lucide-react'
import { formatTimeTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils"
import SignatureCaptureModal from '@/components/signature-capture-modal'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
}

interface AssignedPersonnel {
  employee: {
    id: string
    name: string
  }
  roleOnShift: string
  timeEntries: TimeEntry[]
}

interface TimesheetData {
  timesheet: {
    id: string
    status: string
    clientApprovedAt: string
    clientSignature?: string
    managerApprovedAt?: string
    managerSignature?: string
  }
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    jobName: string
    clientName: string
    crewChief?: {
      name: string
    }
    assignedPersonnel: AssignedPersonnel[]
  }
  client: {
    name: string
  }
  job: {
    name: string
  }
}

export default function ManagerApprovalPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const timesheetId = params.id as string

  const [data, setData] = useState<TimesheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Check if user is manager
  const isManager = session?.user?.role === 'Manager/Admin'

  const fetchTimesheetData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/timesheets/${timesheetId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch timesheet data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimesheetData()
  }, [timesheetId])

  const calculateTotalHours = (timeEntries: { clockIn?: string; clockOut?: string }[]) => {
    return calculateTotalRoundedHours(timeEntries);
  }

  const handleManagerApproval = async (signatureData: string) => {
    try {
      setSubmitting(true)

      const response = await fetch(`/api/timesheets/${timesheetId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve timesheet')
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.message,
      })

      // Refresh the data
      await fetchTimesheetData()
      setShowSignatureModal(false)

      // Redirect to completed timesheet view after a short delay
      setTimeout(() => {
        router.push(`/timesheets/${timesheetId}`)
      }, 2000)

    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to approve timesheet',
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Timesheet not found</div>
      </div>
    )
  }

  const { timesheet, shift, client, job } = data

  // Check if user has permission
  if (!isManager) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">Only managers can access the final approval page.</p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check timesheet status
  if (timesheet.status !== 'pending_final_approval') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Timesheet Not Pending Final Approval</h3>
              <p className="text-muted-foreground">
                This timesheet is currently in "{timesheet.status}" status and does not require final approval.
              </p>
              <Button onClick={() => router.push('/timesheets')}>View All Timesheets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manager Final Approval</h1>
            <p className="text-muted-foreground">Review and provide final approval for this timesheet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            Manager Only
          </Badge>
        </div>
      </div>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Timesheet Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-6">
            <div className="space-y-1">
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{client?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{shift?.location || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Shift Date</p>
              <p className="font-medium">{formatDate(shift?.date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Start Time</p>
              <p className="font-medium">{formatTimeTo12Hour(shift?.startTime)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Crew Chief</p>
              <p className="font-medium">{shift?.crewChief?.name || 'Not Assigned'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Job</p>
              <p className="font-medium">{job?.name || shift?.jobName || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Client Approved</p>
              <p className="font-medium text-green-600">
                {timesheet.clientApprovedAt ? formatDate(timesheet.clientApprovedAt) : 'Not yet approved'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Signature Display */}
      {timesheet.clientSignature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Client Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <img 
                src={timesheet.clientSignature} 
                alt="Client Signature" 
                className="max-h-32 mx-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Approved on {formatDate(timesheet.clientApprovedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead className="text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shift?.assignedPersonnel?.filter((p: any) => p.timeEntries.length > 0).map((person: any) => (
                <TableRow key={person.employee.id}>
                  <TableCell className="font-medium">{person.employee.name}</TableCell>
                  <TableCell>{person.roleOnShift}</TableCell>
                  <TableCell>
                    {person.timeEntries.map((entry: any, index: number) => {
                      const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
                      return (
                        <div key={index} className="text-sm">
                          {display.displayClockIn}
                          {index < person.timeEntries.length - 1 && <br />}
                        </div>
                      );
                    })}
                  </TableCell>
                  <TableCell>
                    {person.timeEntries.map((entry: any, index: number) => {
                      const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut);
                      return (
                        <div key={index} className="text-sm">
                          {display.displayClockOut}
                          {index < person.timeEntries.length - 1 && <br />}
                        </div>
                      );
                    })}
                  </TableCell>
                  <TableCell className="text-right font-mono">{calculateTotalHours(person.timeEntries)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell colSpan={4} className="text-right">Total Hours:</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const allTimeEntries = shift?.assignedPersonnel
                      ?.filter((p: any) => p.timeEntries.length > 0)
                      .flatMap((p: any) => p.timeEntries) || [];
                    return calculateTotalHours(allTimeEntries);
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manager Approval Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manager Final Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As a manager, you are providing the final approval for this timesheet. 
              Please review all information above and provide your digital signature to complete the approval process.
            </p>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => setShowSignatureModal(true)}
                disabled={submitting}
                size="lg"
                className="px-8"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                {submitting ? 'Processing...' : 'Provide Final Approval'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Modal */}
      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleManagerApproval}
        title="Manager Final Approval"
        description="Please provide your digital signature to complete the final approval of this timesheet."
        loading={submitting}
      />
    </div>
  )
}
