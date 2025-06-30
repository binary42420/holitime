"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, Users, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import UnifiedShiftManager from "@/components/unified-shift-manager"
import { generateShiftEditUrl } from "@/lib/url-utils"

interface ShiftDetailPageProps {
  params: { id: string }
}

export default function ShiftDetailPage({ params }: ShiftDetailPageProps) {
  const { id: shiftId } = params
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const { data: shiftData, loading: shiftLoading, error: shiftError, refetch } = useApi<{ shift: any }>(
    shiftId ? `/api/shifts/${shiftId}` : null
  )

  const shift = shiftData?.shift
  const assignedPersonnel = shift?.assignedPersonnel || []

  const [notes, setNotes] = useState("")
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false)

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

      refetch()
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
    const assignedCount = assignedPersonnel.filter((p:any) => !p.isPlaceholder).length
    const requested = shift?.requestedWorkers || 0

    if (assignedCount >= requested) {
      return <Badge variant="secondary" className="text-green-700 bg-green-100">Fully Staffed</Badge>
    } else if (assignedCount > 0) {
      return <Badge variant="outline" className="text-yellow-700 bg-yellow-100">Partially Staffed</Badge>
    } else {
      return <Badge variant="destructive">Unstaffed</Badge>
    }
  }

  if (shiftLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-muted-foreground">Loading shift details...</div>
            </div>
          </CardContent>
        </Card>
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/shifts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
              <a onClick={() => router.push(`/jobs/${shift.jobId}`)} className="hover:underline cursor-pointer">
                {shift.jobName}
              </a>
              {getStatusBadge(shift.status)}
            </h1>
            <p className="text-muted-foreground">
              <a onClick={() => router.push(`/clients/${shift.clientId}`)} className="hover:underline cursor-pointer">
                {shift.clientName}
              </a>
              {' • '}
              {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(generateShiftEditUrl(shiftId))}
          >
            Edit Shift
          </Button>
        </div>
      </div>

      {/* Shift Details */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Shift Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
                <p className="text-sm text-muted-foreground">{shift.timezone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">{shift.location}</p>
                {shift.address && <p className="text-sm text-muted-foreground">{shift.address}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">{getStaffingStatus()}</p>
                <p className="text-sm text-muted-foreground">
                  {assignedPersonnel.filter((p:any) => !p.isPlaceholder).length} / {shift.requestedWorkers} workers assigned
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">Crew Chief</p>
                <p className="text-sm text-muted-foreground">{shift.crewChiefName || 'Unassigned'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staffing Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UnifiedShiftManager
              shiftId={shiftId}
              assignedPersonnel={assignedPersonnel}
              onUpdate={refetch}
            />
          </CardContent>
        </Card>
      </div>

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
