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

  // Unwrap params - fix the "Shift Not Found" issue
  useEffect(() => {
    if (params.id) {
      setShiftId(params.id as string)
    }
  }, [params.id])

  // Only call useShift when we have a valid shiftId
  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useShift(shiftId || '')
  
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
  const canManage = user?.role === 'Manager/Admin' ||
    (user?.role === 'Crew Chief' && shift?.crewChiefId === user?.id)
  const canEdit = user?.role === 'Manager/Admin'

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
    <div className="min-h-screen bg-background">
      <div className="space-y-4 md:space-y-6 pb-6">
        {/* Mobile-First Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 sm:px-6 md:px-0 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/shifts')}
            className="mb-3 -ml-2 h-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shifts
          </Button>

          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-headline leading-tight">
                {shift.jobName} 🏗️
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
              </p>
            </div>
            
            {/* Mobile Badge Stack */}
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(shift.status)}
              {getStaffingStatus()}
              <Badge
                variant={getManagementStatus().variant}
                className={`text-xs ${getManagementStatus().clickable ? "cursor-pointer hover:bg-primary/80 active:scale-95 transition-transform" : ""}`}
                onClick={getManagementStatus().clickable ? handleManagementStatusClick : undefined}
              >
                {getManagementStatus().label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Mobile-First Shift Details */}
        <div className="px-4 sm:px-6 md:px-0">
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Shift Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile-optimized info grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block">Client</span>
                        <span className="text-sm text-foreground break-words">{shift.clientName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block">Location</span>
                        <span className="text-sm text-foreground break-words">{shift.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block">Date</span>
                        <span className="text-sm text-foreground">{new Date(shift.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-sm block">Time</span>
                        <span className="text-sm text-foreground">{shift.startTime} - {shift.endTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Staffing info - full width on mobile */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-sm block text-blue-900 dark:text-blue-100">Needed</span>
                      <span className="text-lg font-bold text-blue-600">{shift.requestedWorkers}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <Users className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-sm block text-green-900 dark:text-green-100">Assigned</span>
                      <span className="text-lg font-bold text-green-600">{assignedPersonnel.length}</span>
                    </div>
                  </div>
                </div>
                
                {shift.description && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <span className="font-medium text-sm block mb-2">Description</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{shift.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TIME TRACKING FUNCTIONALITY - CORE FEATURE */}
        {canManage && (
          <div className="px-4 sm:px-6 md:px-0">
            <ShiftTimeManagement
              shiftId={shiftId}
              assignedPersonnel={assignedPersonnel}
              canManage={canManage}
              onUpdate={handleRefresh}
            />
          </div>
        )}

        {/* Shift Notes */}
        {canEdit && (
          <div className="px-4 sm:px-6 md:px-0">
            <Card className="shadow-sm">
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
                    className="min-h-[120px] text-base resize-none"
                  />
                  <Button
                    onClick={handleNotesSubmit}
                    disabled={isSubmittingNotes}
                    className="w-full sm:w-auto h-11"
                  >
                    {isSubmittingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Timesheet Management */}
        {timesheetId && (
          <div className="px-4 sm:px-6 md:px-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                  Timesheet Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" className="h-11 justify-start" asChild>
                    <Link href={`/timesheets/${timesheetId}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Timesheet
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button variant="outline" className="h-11 justify-start" asChild>
                      <Link href={generateShiftEditUrl(shiftId)}>
                        <Briefcase className="mr-2 h-4 w-4" />
                        Edit Shift
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Crew Chief Permissions */}
        {canEdit && (
          <div className="px-4 sm:px-6 md:px-0">
            <CrewChiefPermissionManager 
              targetId={shiftId}
              targetType="shift"
              targetName={shift.jobName}
            />
          </div>
        )}

        {/* Admin Danger Zone */}
        {canEdit && (
          <div className="px-4 sm:px-6 md:px-0">
            <DangerZone
              entityType="shift"
              entityId={shiftId}
              entityName={shift.jobName}
              onSuccess={() => router.push('/shifts')}
              redirectTo="/shifts"
            />
          </div>
        )}
      </div>
    </div>
  )
}
