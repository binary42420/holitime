"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi, useShift } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase, Download, ExternalLink, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-states"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import ShiftTimeManagement from "@/components/shift-time-management"
import { generateShiftEditUrl } from "@/lib/url-utils"
import { CrewChiefPermissionManager } from "@/components/crew-chief-permission-manager"
import { DangerZone } from "@/components/danger-zone"

export default function ShiftDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const [shiftId, setShiftId] = useState<string>('')
  const [timesheetStatus, setTimesheetStatus] = useState<string | null>(null)
  const [timesheetId, setTimesheetId] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

  // Unwrap params
  useEffect(() => {
    if (params.id) {
      setShiftId(params.id as string)
    }
  }, [params.id])

  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useShift(shiftId)
  
  const shift = shiftData
  
  const { data: assignedData, loading: assignedLoading, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(
    shiftId ? `/api/shifts/${shiftId}/assigned` : ''
  )

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

  // Determine user permissions
  const canManage = user?.role === 'admin' || user?.role === 'manager' ||
    (user?.role === 'crew_chief' && shift?.crewChiefId === user?.id)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'

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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="mobile"
          onClick={() => router.push('/shifts')}
          className="self-start -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shifts
        </Button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">
              {shift.jobName} 🏗️
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {getStatusBadge(shift.status)}
            {getStaffingStatus()}
            <Badge
              variant={getManagementStatus().variant}
              className={getManagementStatus().clickable ? "cursor-pointer hover:bg-primary/80" : ""}
              onClick={getManagementStatus().clickable ? handleManagementStatusClick : undefined}
            >
              {getManagementStatus().label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Mobile-First Shift Details */}
      <Card className="card-mobile">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Shift Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <span>{shift.clientName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <span>{shift.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{new Date(shift.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>{shift.startTime} - {shift.endTime}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Workers Needed:</span>
                <span>{shift.requestedWorkers}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Assigned:</span>
                <span>{assignedPersonnel.length}</span>
              </div>
              {shift.description && (
                <div className="space-y-1">
                  <span className="font-medium text-sm">Description:</span>
                  <p className="text-sm text-muted-foreground">{shift.description}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TIME TRACKING FUNCTIONALITY - CORE FEATURE */}
      {canManage && (
        <ShiftTimeManagement
          shiftId={shiftId}
          assignedPersonnel={assignedPersonnel}
          canManage={canManage}
          onUpdate={handleRefresh}
        />
      )}

      {/* Shift Notes */}
      {canEdit && (
        <Card className="card-mobile">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-orange-600" />
              Shift Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Add notes about this shift..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <Button
                onClick={handleNotesSubmit}
                disabled={isSubmittingNotes}
                size="mobile"
                className="w-full md:w-auto"
              >
                {isSubmittingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timesheet Management */}
      {timesheetId && (
        <Card className="card-mobile">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-green-600" />
              Timesheet Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              <Button size="mobile" variant="outline" className="flex-1" asChild>
                <Link href={`/timesheets/${timesheetId}`}>
                  View Timesheet
                </Link>
              </Button>
              {canEdit && (
                <Button size="mobile" variant="outline" className="flex-1" asChild>
                  <Link href={generateShiftEditUrl(shiftId)}>
                    Edit Shift
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew Chief Permissions */}
      {canEdit && (
        <CrewChiefPermissionManager shiftId={shiftId} />
      )}

      {/* Admin Danger Zone */}
      {canEdit && (
        <DangerZone
          shiftId={shiftId}
          onShiftDeleted={() => router.push('/shifts')}
        />
      )}

    </div>
  )
}
