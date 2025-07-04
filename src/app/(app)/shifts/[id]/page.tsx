"use client"

import React, { useState, useEffect, useCallback } from "react"
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
    <div className="space-y-4 md:space-y-6">
      <div>Test</div>
    </div>
  )
}
