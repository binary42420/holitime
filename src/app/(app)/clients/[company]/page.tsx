"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, Phone, Mail, MapPin, Briefcase, Plus, Calendar, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { parseClientUrl, generateClientEditUrl } from "@/lib/url-utils"

interface ClientDetailPageProps {
  params: Promise<{ company: string }>
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ company: string } | null>(null)
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { toast } = useToast()
  
  // Resolve params first
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Decode URL parameters
  const companySlug = resolvedParams?.company ? decodeURIComponent(resolvedParams.company) : null
  
  // Parse the client URL to get readable names
  const urlData = companySlug ? parseClientUrl(companySlug) : null

  // Fetch client data using the slug parameters
  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: any }>(
    resolvedParams ? `/api/clients/by-slug?company=${encodeURIComponent(companySlug!)}` : ''
  )
  
  const client = clientData?.client
  const clientId = client?.id

  // Fetch jobs for this client
  const { data: jobsData, loading: jobsLoading, error: jobsError } = useApi<{ jobs: any[] }>(
    clientId ? `/api/clients/${clientId}/jobs` : ''
  )

  const jobs = jobsData?.jobs || []

  if (!resolvedParams || !urlData) {
    return <div>Loading...</div>
  }

  if (clientLoading) {
    return <div>Loading client details...</div>
  }

  if (clientError || !client) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => router.push('/clients')}>
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
        <Button variant="ghost" size="sm" onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">{client.companyName || client.name}</h1>
          <p className="text-muted-foreground">{client.address}</p>
        </div>
        {canEdit && (
          <Button onClick={() => router.push(generateClientEditUrl(client.companyName || client.name))}>
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
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{client.contactPerson}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{client.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{client.address}</p>
              </div>
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
                {jobs.filter(job => job.status === 'Active').length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed Jobs</span>
              <Badge variant="outline">
                {jobs.filter(job => job.status === 'Completed').length}
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
          {jobsLoading ? (
            <div className="text-center py-8">Loading jobs...</div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
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
                        {job.startDate ? new Date(job.startDate).toLocaleDateString() : 'No start date'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.shiftsCount || 0} shifts
                      </span>
                    </div>
                  </div>
                  <Badge variant={job.status === 'Active' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
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
  )
}
