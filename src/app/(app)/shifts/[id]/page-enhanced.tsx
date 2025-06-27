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

  const shift = shiftData?.shift
  const assignedPersonnel = assignedData?.assignedPersonnel || []

  const canManage = user?.role === 'Crew Chief' || user?.role === 'Manager/Admin' || 
    (shift && shift.crewChiefId === user?.id)

  const handleRefresh = () => {
    refetch()
    refetchAssigned()
  }

  const handleSaveNotes = async () => {
    try {
      const response = await fetch(`/api/shifts/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        toast({
          title: "Notes Saved",
          description: "Shift notes have been updated successfully.",
        })
        refetch()
      } else {
        throw new Error('Failed to save notes')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default">Completed</Badge>
      case 'In Progress':
        return <Badge variant="destructive">In Progress</Badge>
      case 'Upcoming':
        return <Badge variant="secondary">Upcoming</Badge>
      case 'Pending Approval':
        return <Badge variant="outline">Pending Approval</Badge>
      case 'Cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (shiftLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading shift details...</div>
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
          <p className="text-muted-foreground">
            {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')} • {getStatusBadge(shift.status)}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
              <p className="text-lg font-semibold">
                {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {shift.startTime} - {shift.endTime}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <p className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {shift.location}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">{getStatusBadge(shift.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Job & Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job</label>
              <Button variant="link" asChild className="p-0 h-auto font-normal">
                <Link href={`/jobs/${shift.jobId}`}>
                  <Briefcase className="mr-1 h-4 w-4" />
                  {shift.jobName}
                </Link>
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <Button variant="link" asChild className="p-0 h-auto font-normal">
                <Link href={`/clients/${shift.clientId}`}>
                  <Building2 className="mr-1 h-4 w-4" />
                  {shift.clientName}
                </Link>
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Crew Chief</label>
              <p>{shift.crewChiefName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Assigned Personnel</label>
              <p className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                {assignedPersonnel.length} workers assigned
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Management Component */}
      <ShiftTimeManagement
        shiftId={id}
        assignedPersonnel={assignedPersonnel.map(person => ({
          id: person.id,
          employeeId: person.employeeId,
          employeeName: person.employeeName,
          employeeAvatar: person.employeeAvatar || '',
          roleOnShift: person.roleOnShift,
          roleCode: person.roleCode,
          status: person.status || 'not_started',
          timeEntries: person.timeEntries || []
        }))}
        canManage={canManage}
        onUpdate={handleRefresh}
      />

      {/* Shift Notes */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Shift Notes</CardTitle>
            <CardDescription>
              Add or update notes for this shift. Visible to crew chiefs and managers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes || shift.notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any important notes for the shift..."
              rows={4}
            />
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Read-only notes for non-managers */}
      {!canManage && shift.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Shift Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{shift.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
