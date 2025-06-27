"use client"

import React, { useState, use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ShiftTimeManagement from "@/components/shift-time-management"

interface ShiftDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const { id } = use(params)
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useApi<{ shift: any }>(`/api/shifts/${id}`)
  const { data: assignedData, loading: assignedLoading, refetch: refetchAssigned } = useApi<{ assignedPersonnel: any[] }>(`/api/shifts/${id}/assigned`)

  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

  const shift = shiftData?.shift
  const assignedPersonnel = assignedData?.assignedPersonnel || []

  const handleRefresh = () => {
    refetch()
    refetchAssigned()
  }

  const handleNotesSubmit = async () => {
    if (!notes.trim()) return

    setIsSubmittingNotes(true)
    try {
      const response = await fetch(`/api/shifts/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to add notes')
      }

      toast({
        title: "Notes Added",
        description: "Your notes have been added to the shift.",
      })

      setNotes("")
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add notes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingNotes(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Scheduled': 'outline',
      'In Progress': 'default',
      'Completed': 'secondary',
      'Cancelled': 'destructive'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const getStaffingStatus = () => {
    const assigned = assignedPersonnel.length
    const requested = shift?.requestedWorkers || 0
    
    if (assigned >= requested) {
      return <Badge variant="secondary" className="text-green-700 bg-green-100">Fully Staffed</Badge>
    } else if (assigned > 0) {
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-100">Partially Staffed</Badge>
    } else {
      return <Badge variant="destructive">Unstaffed</Badge>
    }
  }

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading shift...</div>
      </div>
    )
  }

  if (shiftError || !shift) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading shift: {shiftError}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">
            Shift Details
          </h1>
          <div className="text-muted-foreground">
            {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')} • {getStatusBadge(shift.status)}
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{shift.jobName}</div>
                <div className="text-sm text-muted-foreground">{shift.clientName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{shift.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{shift.startTime} - {shift.endTime}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staffing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Status:</span>
              {getStaffingStatus()}
            </div>
            <div className="flex justify-between items-center">
              <span>Assigned Workers:</span>
              <span className="font-medium">{assignedPersonnel.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Requested Workers:</span>
              <span className="font-medium">{shift.requestedWorkers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Crew Chief:</span>
              <span className="font-medium">{shift.crewChiefName || 'Unassigned'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {shift.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{shift.description}</p>
          </CardContent>
        </Card>
      )}

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

      <ShiftTimeManagement 
        shiftId={id} 
        shift={shift} 
        assignedPersonnel={assignedPersonnel}
        onUpdate={handleRefresh}
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Notes</CardTitle>
          <CardDescription>
            Add notes or updates about this shift
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={handleNotesSubmit}
            disabled={!notes.trim() || isSubmittingNotes}
          >
            {isSubmittingNotes ? 'Adding...' : 'Add Notes'}
          </Button>
        </CardContent>
      </Card>

      {shift.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{shift.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        {(user?.role === 'Manager/Admin' || user?.role === 'Crew Chief') && (
          <Button asChild>
            <Link href={`/shifts/${id}/edit`}>
              Edit Shift
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/shifts">
            Back to Shifts
          </Link>
        </Button>
      </div>
    </div>
  )
}
