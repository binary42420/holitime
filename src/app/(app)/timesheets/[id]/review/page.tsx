'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, User, MapPin, Calendar, Building, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import SignatureCaptureModal from '@/components/signature-capture-modal'
import { useToast } from '@/hooks/use-toast'
import { formatTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils"

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
}

interface AssignedPersonnel {
  employeeId: string
  employeeName: string
  employeeAvatar?: string
  roleOnShift: string
  roleCode: string
  timeEntries: TimeEntry[]
  totalHours: string
  totalMinutes: number
}

interface TimesheetReviewData {
  timesheet: {
    id: string
    status: string
    clientSignature?: string
    managerSignature?: string
    clientApprovedAt?: string
    managerApprovedAt?: string
    submittedBy: string
    submittedAt: string
    pdfFilePath?: string
    pdfGeneratedAt?: string
  }
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    crewChiefId: string
    crewChiefName: string
  }
  job: {
    id: string
    name: string
  }
  client: {
    id: string
    companyName: string
    contactPerson: string
  }
  assignedPersonnel: AssignedPersonnel[]
  totals: {
    grandTotalHours: string
    grandTotalMinutes: number
    employeeCount: number
  }
  permissions: {
    canApprove: boolean
    canFinalApprove: boolean
    isClientUser: boolean
    isManager: boolean
    isCrewChief: boolean
  }
}

export default function TimesheetReviewPage() {
  const params = useParams()
  const router = useRouter()
  const timesheetId = params.id as string

  const [data, setData] = useState<TimesheetReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalType, setApprovalType] = useState<'client' | 'manager'>('client')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchTimesheetData()
  }, [timesheetId])

  const fetchTimesheetData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/timesheets/${timesheetId}/review`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch timesheet')
      }
      
      const timesheetData = await response.json()
      setData(timesheetData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'default'
      case 'pending_final_approval':
        return 'secondary'
      case 'completed':
        return 'default'
      case 'rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return 'Pending Client Approval'
      case 'pending_final_approval':
        return 'Pending Final Approval'
      case 'completed':
        return 'Completed'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A'
    try {
      return format(new Date(timeString), 'h:mm a')
    } catch {
      return timeString
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy')
    } catch {
      return dateString
    }
  }

  const handleApprove = () => {
    setApprovalType('client')
    setShowSignatureModal(true)
  }

  const handleFinalApprove = () => {
    setApprovalType('manager')
    setShowSignatureModal(true)
  }

  const handleSignatureSubmit = async (signatureData: string) => {
    try {
      setSubmitting(true)

      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signatureData,
          approvalType: approvalType
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

  const handleDownloadPDF = async () => {
    try {
      setSubmitting(true)

      // First generate the PDF if it doesn't exist
      if (!data?.timesheet.pdfFilePath) {
        const generateResponse = await fetch(`/api/timesheets/${timesheetId}/generate-pdf`, {
          method: 'POST',
        })

        if (!generateResponse.ok) {
          throw new Error('Failed to generate PDF')
        }
      }

      // Download the PDF
      const response = await fetch(`/api/timesheets/${timesheetId}/pdf`)

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet-${data?.job.name.replace(/\s+/g, '-')}-${data?.shift.date}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      })

    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to download PDF',
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timesheet Review</h1>
          <p className="text-muted-foreground">
            Review and approve timesheet for {data.job.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(data.timesheet.status)}>
            {getStatusLabel(data.timesheet.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={submitting}
          >
            <Download className="h-4 w-4 mr-2" />
            {submitting ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Date</label>
            <p className="font-medium">{formatDate(data.shift.date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Time</label>
            <p className="font-medium">
              {formatTime(data.shift.startTime)} - {formatTime(data.shift.endTime)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Location</label>
            <p className="font-medium flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {data.shift.location || 'Not specified'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Crew Chief</label>
            <p className="font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              {data.shift.crewChiefName}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Company</label>
            <p className="font-medium">{data.client.companyName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
            <p className="font-medium">{data.client.contactPerson || 'Not specified'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Employee Name</th>
                  <th className="text-left p-3 font-medium">Role/Worker Type</th>
                  <th className="text-left p-3 font-medium">Clock In Time</th>
                  <th className="text-left p-3 font-medium">Clock Out Time</th>
                  <th className="text-right p-3 font-medium">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.assignedPersonnel.map((employee) => (
                  <tr key={employee.employeeId} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {employee.employeeAvatar && (
                          <img 
                            src={employee.employeeAvatar} 
                            alt={employee.employeeName}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="font-medium">{employee.employeeName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {employee.roleOnShift} ({employee.roleCode})
                      </Badge>
                    </td>
                    <td className="p-3">
                      {employee.timeEntries.length > 0 && employee.timeEntries[0].clockIn
                        ? formatTime(employee.timeEntries[0].clockIn)
                        : 'N/A'}
                    </td>
                    <td className="p-3">
                      {employee.timeEntries.length > 0 && employee.timeEntries[0].clockOut
                        ? formatTime(employee.timeEntries[0].clockOut)
                        : 'N/A'}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {employee.totalHours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={4} className="p-3 font-semibold text-right">
                    Grand Total:
                  </td>
                  <td className="p-3 text-right font-bold text-lg">
                    {data.totals.grandTotalHours} hrs
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(data.permissions.canApprove || data.permissions.canFinalApprove) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end gap-4">
              {data.permissions.canApprove && data.timesheet.status === 'pending_client_approval' && (
                <Button onClick={handleApprove} size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Approve Timesheet
                </Button>
              )}
              {data.permissions.canFinalApprove && data.timesheet.status === 'pending_final_approval' && (
                <Button onClick={handleFinalApprove} size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Final Approval
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signature Capture Modal */}
      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleSignatureSubmit}
        title={approvalType === 'client' ? 'Client Approval Signature' : 'Manager Final Approval Signature'}
        description={
          approvalType === 'client'
            ? 'Please sign below to approve this timesheet for your review'
            : 'Please sign below to provide final approval for this timesheet'
        }
        loading={submitting}
      />
    </div>
  )
}
