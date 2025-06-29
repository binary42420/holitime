"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ComprehensiveTimesheetManager from "@/components/comprehensive-timesheet-manager"
import { parseShiftUrl, generateShiftEditUrl } from "@/lib/url-utils"

interface ShiftDetailPageProps {
  params: Promise<{ company: string; job: string; date: string; shiftId: string }>
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ company: string; job: string; date: string; shiftId: string } | null>(null)
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  // Resolve params first
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Decode URL parameters
  const companySlug = resolvedParams?.company ? decodeURIComponent(resolvedParams.company) : null
  const jobSlug = resolvedParams?.job ? decodeURIComponent(resolvedParams.job) : null
  const dateSlug = resolvedParams?.date ? decodeURIComponent(resolvedParams.date) : null
  const shiftIdSlug = resolvedParams?.shiftId ? decodeURIComponent(resolvedParams.shiftId) : null

  // Parse the shift URL to get readable names and shift details
  const urlData = companySlug && jobSlug && dateSlug && shiftIdSlug 
    ? parseShiftUrl(companySlug, jobSlug, dateSlug, shiftIdSlug)
    : null

  // Fetch shift data using the slug parameters
  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useApi<{ shift: any }>(
    resolvedParams ? `/api/shifts/by-slug?company=${encodeURIComponent(companySlug!)}&job=${encodeURIComponent(jobSlug!)}&date=${encodeURIComponent(dateSlug!)}&startTime=${encodeURIComponent(urlData?.startTime || '')}&sequence=${urlData?.sequence || 1}` : ''
  )
  
  const shift = shiftData?.shift
  const shiftId = shift?.id

  const { data: assignedData, loading: assignedLoading, error: assignedError, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(
    shiftId ? `/api/shifts/${shiftId}/assigned` : ''
  )

  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

  const assignedPersonnel = assignedData?.assignedPersonnel || []

  // Debug logging
  console.log('DEBUG: Shift detail page data:', {
    shiftId,
    assignedData,
    assignedPersonnel,
    assignedLoading,
    assignedError,
    assignedDataKeys: assignedData ? Object.keys(assignedData) : 'no data',
    apiUrl: shiftId ? `/api/shifts/${shiftId}/assigned` : 'no url'
  })

  const handleRefresh = () => {
    if (refetch) refetch()
    if (refetchAssigned) refetchAssigned()
  }

  useEffect(() => {
    if (shift?.notes) {
      setNotes(shift.notes)
    }
  }, [shift?.notes])

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

  if (!resolvedParams || !urlData) {
    return <div>Loading...</div>
  }

  if (shiftLoading) {
    return <div>Loading shift details...</div>
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
              {urlData.sequence > 1 && <span className="ml-1">(#{urlData.sequence})</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(shift.status)}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(generateShiftEditUrl(urlData.companyName, urlData.jobName, urlData.date, urlData.startTime, urlData.sequence))}
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
              <span>Status:</span>
              {getStatusBadge(shift.status)}
            </div>
            {urlData.sequence > 1 && (
              <div className="flex justify-between items-center">
                <span>Shift Number:</span>
                <Badge variant="outline">#{urlData.sequence}</Badge>
              </div>
            )}
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
                {(() => {
                  const crewChief = assignedPersonnel.find((person: any) => person.roleCode === 'CC' || person.isCrewChief);
                  return (
                    <span className="font-medium">
                      {crewChief ? crewChief.employeeName : 'Unassigned'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Details */}
      {shift.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{shift.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {shift.requirements && (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{shift.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Comprehensive Timesheet Manager */}
      {shiftId && (
        <ComprehensiveTimesheetManager
          shiftId={shiftId}
          assignedPersonnel={assignedPersonnel}
          onUpdate={handleRefresh}
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
    </div>
  )
}
