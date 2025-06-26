"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useApi, useClientJobs } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, Briefcase, Calendar, Users, Plus, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ClientDetailPageProps {
  params: { id: string }
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { toast } = useToast()
  
  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: any }>(`/api/clients/${params.id}`)
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useClientJobs(params.id)

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading client details...</div>
      </div>
    )
  }

  if (clientError || !clientData?.client) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading client: {clientError}</div>
      </div>
    )
  }

  const client = clientData.client
  const jobs = jobsData?.jobs || []

  const getStatusBadge = (status: string) => {
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
          <h1 className="text-3xl font-bold font-headline">{client.name}</h1>
          <p className="text-muted-foreground">Client Details & Job Management</p>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/clients/${params.id}/edit`)}>
            Edit Client
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
              <p className="text-lg font-semibold">{client.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p>{client.address || 'No address provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
              <p>{client.contactPerson}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p>{client.contactEmail}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p>{client.contactPhone || 'No phone provided'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Most Recent Completed Shift</label>
              {client.mostRecentCompletedShift ? (
                <div className="mt-1">
                  <Button variant="link" asChild className="p-0 h-auto font-normal">
                    <Link href={`/shifts/${client.mostRecentCompletedShift.id}`}>
                      {format(new Date(client.mostRecentCompletedShift.date), 'EEEE, MMMM d, yyyy')}
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">{client.mostRecentCompletedShift.jobName}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No completed shifts</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Next Upcoming Shift</label>
              {client.mostRecentUpcomingShift ? (
                <div className="mt-1">
                  <Button variant="link" asChild className="p-0 h-auto font-normal">
                    <Link href={`/shifts/${client.mostRecentUpcomingShift.id}`}>
                      {format(new Date(client.mostRecentUpcomingShift.date), 'EEEE, MMMM d, yyyy')}
                    </Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">{client.mostRecentUpcomingShift.jobName}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No upcoming shifts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Jobs & Projects
              </CardTitle>
              <CardDescription>
                All jobs and their associated shifts for this client
              </CardDescription>
            </div>
            {canEdit && (
              <Button onClick={() => router.push(`/clients/${params.id}/jobs/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
          ) : jobsError ? (
            <div className="text-center py-8 text-destructive">Error loading jobs: {jobsError}</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs found for this client
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job: any) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{job.name}</p>
                        {job.description && (
                          <p className="text-sm text-muted-foreground">{job.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{job.shiftCount || 0} shifts</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.startDate && job.endDate ? (
                        <div className="text-sm">
                          <div>{format(new Date(job.startDate), 'MMM d, yyyy')}</div>
                          <div className="text-muted-foreground">
                            to {format(new Date(job.endDate), 'MMM d, yyyy')}
                          </div>
                        </div>
                      ) : job.startDate ? (
                        <div className="text-sm">
                          {format(new Date(job.startDate), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No shifts scheduled</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/jobs/${job.id}`}>
                          <ExternalLink className="h-4 w-4" />
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
