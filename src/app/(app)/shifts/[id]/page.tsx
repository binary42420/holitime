"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi, useShift } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase, Download, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import UnifiedShiftManager from "@/components/unified-shift-manager"
import { MobileShiftManager } from "@/components/mobile-shift-manager"
import { MobileShiftDetails } from "@/components/mobile-shift-details"
import WorkerAssignmentDisplay from "@/components/worker-assignment-display"
import { generateShiftEditUrl } from "@/lib/url-utils"
import { LoadingSpinner } from "@/components/loading-states"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"

export default function ShiftDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [shiftId, setShiftId] = useState<string>('')
  const [timesheetStatus, setTimesheetStatus] = useState<string | null>(null)
  const [timesheetId, setTimesheetId] = useState<string | null>(null)

  // Unwrap params
  useEffect(() => {
    if (params.id) {
      setShiftId(params.id as string)
    }
  }, [params.id])

  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useShift(shiftId)
  
  const shift = shiftData
  
  const { data: assignedData, loading: assignedLoading, error: assignedError, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(
    shiftId ? `/api/shifts/${shiftId}/assigned` : ''
  )

  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

  const assignedPersonnel = assignedData?.assignedPersonnel || []

  const handleRefresh = useCallback(() => {
    if (refetch) refetch()
    if (refetchAssigned) refetchAssigned()

    // Also refresh timesheet status
    const fetchTimesheetStatus = async () => {
      if (!shiftId) return

      try {
        const response = await fetch(`/api/timesheets?shiftId=${shiftId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.timesheets && data.timesheets.length > 0) {
            const timesheet = data.timesheets[0]
            setTimesheetStatus(timesheet.status)
            setTimesheetId(timesheet.id)
          } else {
            setTimesheetStatus(null)
            setTimesheetId(null)
          }
        }
      } catch (error) {
        console.error('Error fetching timesheet status:', error)
      }
    }

    fetchTimesheetStatus()
  }, [refetch, refetchAssigned, shiftId])

  useEffect(() => {
    if (shift?.notes) {
      setNotes(shift.notes)
    }
  }, [shift?.notes])

  // Fetch timesheet status
  useEffect(() => {
    const fetchTimesheetStatus = async () => {
      if (!shiftId) return

      try {
        const response = await fetch(`/api/timesheets?shiftId=${shiftId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.timesheets && data.timesheets.length > 0) {
            const timesheet = data.timesheets[0]
            setTimesheetStatus(timesheet.status)
            setTimesheetId(timesheet.id)
          } else {
            setTimesheetStatus(null)
            setTimesheetId(null)
          }
        }
      } catch (error) {
        console.error('Error fetching timesheet status:', error)
      }
    }

    fetchTimesheetStatus()
  }, [shiftId])

  // Get management status for header badge (matches shift management section)
  const getManagementStatus = () => {
    if (!timesheetStatus) {
      return {
        label: 'No Timesheet',
        variant: 'outline' as const,
        clickable: false
      }
    }

    switch (timesheetStatus) {
      case 'pending_client_approval':
        return {
          label: 'Pending Client Approval',
          variant: 'default' as const,
          clickable: true,
          url: `/timesheets/${timesheetId}/client-review`
        }
      case 'pending_final_approval':
        return {
          label: 'Manager Approval Required',
          variant: 'destructive' as const,
          clickable: true,
          url: `/timesheets/${timesheetId}/manager-approval`
        }
      case 'completed':
        return {
          label: 'Completed',
          variant: 'secondary' as const,
          clickable: true,
          url: `/timesheets/${timesheetId}/review`
        }
      default:
        return {
          label: timesheetStatus,
          variant: 'outline' as const,
          clickable: true,
          url: `/timesheets/${timesheetId}/review`
        }
    }
  }

  const handleManagementStatusClick = () => {
    const status = getManagementStatus()
    if (status.clickable && status.url) {
      window.open(status.url, '_blank')
    }
  }

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

      toast({
        title: "Notes Updated",
        description: "Shift notes have been saved successfully.",
      })

      handleRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingNotes(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Upcoming': 'outline',
      'In Progress': 'default',
      'Completed': 'secondary',
      'Cancelled': 'destructive',
      'Pending Approval': 'outline'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const getStaffingStatus = () => {
    const assignedCount = assignedPersonnel.length
    const requested = shift?.requestedWorkers || 0

    if (assignedCount >= requested) {
      return <Badge variant="secondary" className="text-green-700 bg-green-100">Fully Staffed</Badge>
    } else if (assignedCount > 0) {
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-100">Partially Staffed</Badge>
    } else {
      return <Badge variant="destructive">Unstaffed</Badge>
    }
  }

  if (shiftLoading || assignedLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (shiftError || !shift) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Shift Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The shift you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => router.push('/shifts')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shifts
              </Button>
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
          <Button variant="ghost" size="sm" onClick={() => router.push('/shifts')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shifts
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{shift.jobName}</h1>
            <p className="text-muted-foreground">
              {shift.clientName} • {new Date(shift.date).toLocaleDateString()} • {shift.startTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Management Status Badge - Clickable and matches shift management section */}
          {(() => {
            const managementStatus = getManagementStatus()
            return (
              <Badge
                variant={managementStatus.variant}
                className={managementStatus.clickable ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={managementStatus.clickable ? handleManagementStatusClick : undefined}
              >
                {managementStatus.label}
                {managementStatus.clickable && <ExternalLink className="ml-1 h-3 w-3" />}
              </Badge>
            )
          })()}
          {(shift.status === 'Completed' || shift.status === 'Pending Client Approval') && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  // Get timesheet for this shift
                  const timesheetResponse = await fetch(`/api/timesheets?shiftId=${shiftId}`)
                  if (timesheetResponse.ok) {
                    const timesheetData = await timesheetResponse.json()
                    if (timesheetData.timesheets && timesheetData.timesheets.length > 0) {
                      const timesheetId = timesheetData.timesheets[0].id
                      // Download PDF
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
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(generateShiftEditUrl(shiftId))}
          >
            Edit Shift
          </Button>
        </div>
      </div>

      {/* Shift Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Job Name:</span>
              <Link
                href={`/jobs/${shift.jobId}`}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {shift.jobName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex justify-between items-center">
              <span>Company:</span>
              <Link
                href={`/clients/${shift.clientId}`}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {shift.clientName}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex justify-between items-center">
              <span>Date:</span>
              <span className="font-medium">{new Date(shift.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Time:</span>
              <span className="font-medium">{shift.startTime} - {shift.endTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Location:</span>
              <span className="font-medium">{shift.location}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Shift Status:</span>
              {getStatusBadge(shift.status)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staffing Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getStaffingStatus()}
            </div>
            <div className="flex justify-between items-center">
              <span>Assigned Workers:</span>
              <span className="font-medium">
                {assignedPersonnel.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Requested Workers:</span>
              <span className="font-medium">{shift.requestedWorkers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Crew Chief:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {(() => {
                    const crewChief = assignedPersonnel.find((person: any) => person.roleCode === 'CC' || person.isCrewChief);
                    return crewChief ? crewChief.employeeName : 'Unassigned';
                  })()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Worker Assignment Display */}
      {shiftId && (
        <WorkerAssignmentDisplay
          shiftId={shiftId}
          assignedPersonnel={assignedPersonnel}
          onUpdate={handleRefresh}
          shift={shift}
        />
      )}

      {/* Unified Shift Manager */}
      {shiftId && (
        <UnifiedShiftManager
          shiftId={shiftId}
          assignedPersonnel={assignedPersonnel}
          onUpdate={handleRefresh}
          shift={shift}
        />
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Add any additional notes or comments about this shift
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter shift notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={handleNotesSubmit}
            disabled={isSubmittingNotes}
          >
            {isSubmittingNotes ? "Saving..." : "Save Notes"}
          </Button>
        </CardContent>
      </Card>

      {/* Crew Chief Permissions Section - Only visible to admins */}
      <CrewChiefPermissionManager
        targetId={shiftId}
        targetType="shift"
        targetName={`${shift.jobName} - ${new Date(shift.date).toLocaleDateString()} ${shift.startTime}`}
        className="mt-6"
      />

      {/* Danger Zone - Only visible to admins */}
      <DangerZone
        entityType="shift"
        entityId={shiftId}
        entityName={`${shift.jobName} - ${new Date(shift.date).toLocaleDateString()} ${shift.startTime}`}
        redirectTo="/shifts"
        className="mt-6"
      />
    </div>
  )
}
