"use client"

import React, { useState, use } from "react"
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
  params: Promise<{ id: string }>
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = use(params)
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { toast } = useToast()
  
  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: any }>(`/api/clients/${id}`)
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useClientJobs(id)

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
      case 'On Hold':
        return <Badge variant="outline">On Hold</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">{client.name}</h1>
          <p className="text-muted-foreground">{client.address}</p>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(`/admin/clients/${client.id}/edit`)}>
            Edit Client
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                <div className="mt-1">{client.contactPerson}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="mt-1">{client.contactEmail}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="mt-1">{client.contactPhone}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <div className="mt-1">{client.address}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.mostRecentCompletedShift && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Completed Shift</label>
                  <div className="mt-1">
                    <Link 
                      href={`/shifts/${client.mostRecentCompletedShift.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.mostRecentCompletedShift.jobName}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(client.mostRecentCompletedShift.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}
              
              {client.mostRecentUpcomingShift && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Upcoming Shift</label>
                  <div className="mt-1">
                    <Link 
                      href={`/shifts/${client.mostRecentUpcomingShift.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {client.mostRecentUpcomingShift.jobName}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(client.mostRecentUpcomingShift.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              )}

              {!client.mostRecentCompletedShift && !client.mostRecentUpcomingShift && (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Jobs
                </CardTitle>
                {canEdit && (
                  <Button size="sm" onClick={() => router.push(`/admin/jobs/new?clientId=${client.id}`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Job
                  </Button>
                )}
              </div>
              <CardDescription>
                {jobs.length} active job{jobs.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Recent Shifts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="font-medium">{job.name}</div>
                          {job.description && (
                            <div className="text-sm text-muted-foreground">{job.description}</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          {job.startDate ? format(new Date(job.startDate), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{job.recentShiftCount || 0} shifts</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/jobs/${job.id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Jobs Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This client doesn't have any jobs assigned yet.
                  </p>
                  {canEdit && (
                    <Button onClick={() => router.push(`/admin/jobs/new?clientId=${client.id}`)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Job
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
