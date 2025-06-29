"use client"

import React, { use } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { generateShiftUrl } from "@/lib/url-utils"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useJob, useApi } from "@/hooks/use-api"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Briefcase, Calendar, Users, Clock, MapPin, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params)
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { toast } = useToast()
  
  const { data: jobData, loading: jobLoading, error: jobError } = useJob(id)
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError } = useApi<{ shifts: any[] }>(`/api/jobs/${id}/shifts`)

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading job details...</div>
      </div>
    )
  }

  if (jobError || !jobData?.job) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading job: {jobError}</div>
      </div>
    )
  }

  const job = jobData.job
  const shifts = shiftsData?.shifts || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default">Completed</Badge>
      case 'In Progress':
        return <Badge variant="destructive">In Progress</Badge>
      case 'Upcoming':
        return <Badge variant="secondary">Upcoming</Badge>
      case 'Cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default">Active</Badge>
      case 'Completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'Planning':
        return <Badge variant="outline">Planning</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">{job.name}</h1>
          <div className="text-muted-foreground flex items-center gap-2">
            <span>Job for {job.clientName}</span>
            <span>•</span>
            {getJobStatusBadge(job.status)}
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/jobs/${id}/edit`)}>
            Edit Job
          </Button>
        )}
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
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Name</label>
              <p className="text-lg font-semibold">{job.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <Button variant="link" asChild className="p-0 h-auto font-normal">
                <Link href={`/clients/${job.clientId}`}>{job.clientName}</Link>
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p>{job.description || 'No description provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">{getJobStatusBadge(job.status)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Shifts</label>
              <p className="text-lg font-semibold">{job.shiftCount || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <p>{job.startDate ? format(new Date(job.startDate), 'EEEE, MMMM d, yyyy') : 'Not scheduled'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">End Date</label>
              <p>{job.endDate ? format(new Date(job.endDate), 'EEEE, MMMM d, yyyy') : 'Not scheduled'}</p>
            </div>
            {job.startDate && job.endDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <p>{Math.ceil((new Date(job.endDate).getTime() - new Date(job.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Shifts for this Job
              </CardTitle>
              <CardDescription>
                All shifts scheduled for {job.name}
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => router.push(`/jobs/${id}/shifts/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Shift
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading shifts...</div>
          ) : shiftsError ? (
            <div className="text-center py-8 text-destructive">Error loading shifts: {shiftsError}</div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shifts scheduled for this job yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Crew Chief</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Personnel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift: any) => (
                  <TableRow 
                    key={shift.id}
                    onClick={() => {
                      if (!shift.startTime) {
                        console.error('Missing startTime for shift:', shift)
                        return
                      }
                      router.push(generateShiftUrl(job.clientName, job.name, shift.date, shift.startTime))
                    }}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(shift.date), 'EEE, MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{shift.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>{shift.crewChief?.name}</TableCell>
                    <TableCell>{getStatusBadge(shift.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {shift.assignedPersonnel?.length || 0} assigned
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={shift.startTime ? generateShiftUrl(job.clientName, job.name, shift.date, shift.startTime) : '#'}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
