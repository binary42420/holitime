"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { ArrowLeft, Building2, Phone, Mail, MapPin, Briefcase, Plus, Calendar, Users, FileText, Download, UserCheck, CheckCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateClientEditUrl } from "@/lib/url-utils"
import { CrewChiefPermissionManager } from "@/app/(app)/components/crew-chief-permission-manager"
import { DangerZone } from "@/app/(app)/components/danger-zone"
import { TimesheetStatusIndicator } from "@/app/(app)/components/timesheet-status-indicator"
import Link from "next/link"

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function ClientDetailPage({ params }: ClientDetailPageProps) {
  const [clientId, setClientId] = useState<string>("")

  // Unwrap params
  useEffect(() => {
    params.then(p => setClientId(p.id))
  }, [params])
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === "Manager/Admin"
  const { toast } = useToast()

  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: any }>(
    clientId ? `/api/clients/${clientId}` : null
  )
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useApi<{ jobs: any[] }>(
    clientId ? `/api/clients/${clientId}/jobs` : null
  )
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError } = useApi<{ shifts: any[] }>(
    clientId ? `/api/shifts?clientId=${clientId}` : null
  )

  // Helper function to get timesheet link and text based on status
  const getTimesheetAction = (shift: any) => {
    if (!shift.timesheetId) {
      return {
        text: "No Timesheet",
        href: `/shifts/${shift.id}`,
        variant: "outline" as const,
        icon: FileText
      }
    }

    switch (shift.timesheetStatus) {
    case "Pending Finalization":
      return {
        text: "Finalize",
        href: `/shifts/${shift.id}`,
        variant: "default" as const,
        icon: FileText
      }
    case "Awaiting Client Approval":
      return {
        text: "Client Approval",
        href: `/timesheets/${shift.timesheetId}/approve`,
        variant: "default" as const,
        icon: Clock
      }
    case "Awaiting Manager Approval":
      return {
        text: "Manager Approval",
        href: `/timesheets/${shift.timesheetId}/manager-approval`,
        variant: "secondary" as const,
        icon: UserCheck
      }
    case "Approved":
      return {
        text: "View PDF",
        href: `/timesheets/${shift.timesheetId}`,
        variant: "outline" as const,
        icon: Download
      }
    default:
      return {
        text: "View Timesheet",
        href: `/timesheets/${shift.timesheetId}`,
        variant: "outline" as const,
        icon: FileText
      }
    }
  }

  const client = clientData?.client
  const jobs = jobsData?.jobs || []
  const shifts = shiftsData?.shifts || []

  if (clientLoading || jobsLoading || shiftsLoading) {
    return <div>Loading...</div>
  }

  if (clientError || !client) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
              </p>
              <Button onClick={() => router.push("/clients")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">{client.companyName || client.name}</h1>
          <p className="text-muted-foreground">{client.address}</p>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(generateClientEditUrl(client.id))}>
            Edit Client
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{client.contactPerson}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{client.email}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">{client.phone}</p>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <p className="font-medium">{client.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Jobs</span>
              <Badge variant="secondary">{jobs.length}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Jobs</span>
              <Badge variant="default">
                {jobs.filter((job:any) => job.status === "Active").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed Jobs</span>
              <Badge variant="outline">
                {jobs.filter((job:any) => job.status === "Completed").length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{client.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Jobs Section */}
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
        </CardHeader>
        <CardContent>
          {jobs && jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job:any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <div className="space-y-1">
                    <h3 className="font-medium">{job.name}</h3>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {job.startDate ? new Date(job.startDate).toLocaleDateString() : "No start date"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.shiftsCount || 0} shifts
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "Active" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <Button variant="outline" size="sm">View</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Yet</h3>
              <p className="text-muted-foreground mb-4">
                This client doesn&apos;t have any jobs assigned yet.
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

      {/* Recent Shifts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shifts && shifts.length > 0 ? (
            <div className="space-y-4">
              {shifts.map((shift:any) => (
                <div
                  key={shift.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{shift.jobName || "No Job Assigned"}</h3>
                        <Badge variant={
                          shift.status === "Completed" ? "default" :
                            shift.status === "In Progress" ? "destructive" :
                              shift.status === "Cancelled" ? "outline" :
                                "secondary"
                        }>
                          {shift.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
                      </p>

                      {/* Workers Assigned and Timesheet Status Row */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          {/* Workers Assigned */}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{shift.assignedCount || 0} / {shift.requestedWorkers || 1} workers</span>
                          </div>

                          {/* Timesheet Status */}
                          <TimesheetStatusIndicator
                            status={shift.timesheetStatus || "Pending Finalization"}
                            size="sm"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {(() => {
                            const timesheetAction = getTimesheetAction(shift)
                            const Icon = timesheetAction.icon
                            return (
                              <Button
                                variant={timesheetAction.variant}
                                size="sm"
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href={timesheetAction.href}>
                                  <Icon className="h-4 w-4 mr-1" />
                                  {timesheetAction.text}
                                </Link>
                              </Button>
                            )
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/shifts/${shift.id}`)}
                          >
                            View Shift
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recent Shifts</h3>
              <p className="text-muted-foreground mb-4">
                This client doesn&apos;t have any recent shifts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crew Chief Permissions Section - Only visible to admins */}
      <CrewChiefPermissionManager
        targetId={client.clientCompanyId || client.id}
        targetType="client"
        targetName={client.companyName || client.name}
        className="mt-6"
      />

      {/* Danger Zone - Only visible to admins */}
      <DangerZone
        entityType="client"
        entityId={client.id}
        entityName={client.companyName || client.name}
        redirectTo="/clients"
        className="mt-6"
      />
    </div>
  )
}

export default withAuth(ClientDetailPage, hasAdminAccess)
