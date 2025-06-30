"use client"

import React from "react"

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Building2, 
  Calendar,
  Users,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function AdminJobsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { data: jobsData, loading, error } = useApi<{ jobs: any[] }>('/api/jobs')

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const jobs = jobsData?.jobs || []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Active': 'default',
      'Completed': 'secondary',
      'On Hold': 'outline',
      'Cancelled': 'destructive'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Job Management</h1>
          <p className="text-muted-foreground">Create and manage jobs and projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/admin/jobs/templates')}>
            Job Templates
          </Button>
          <Button onClick={() => router.push('/admin/jobs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter(job => job.status === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.reduce((total, job) => total + (job.shiftsCount || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            All Jobs
          </CardTitle>
          <CardDescription>
            Manage all jobs and projects in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading jobs...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error loading jobs: {error}</div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first job.
              </p>
              <Button onClick={() => router.push('/admin/jobs/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {job.clientName}
                      </div>
                    </TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>{job.shiftsCount || 0}</TableCell>
                    <TableCell>
                      {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/jobs/${job.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate Job
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

export default withAuth(AdminJobsPage, hasAdminAccess);
