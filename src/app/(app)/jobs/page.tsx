"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"

import { useUser } from "@/hooks/use-user"
import { useRecentJobs } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@mantine/core'
import { Input } from '@mantine/core'
import { Badge } from '@mantine/core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Users,
  Activity,
  TrendingUp
} from "lucide-react"
export default function JobsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { data: jobsData, loading, error } = useRecentJobs()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")

  const jobs = jobsData?.jobs || []
  const canManage = user?.role === 'Manager/Admin' || user?.role === 'Crew Chief'

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    const matchesClient = clientFilter === "all" || job.clientName === clientFilter

    return matchesSearch && matchesStatus && matchesClient
  })

  // Get unique clients for filter
  const uniqueClients = Array.from(new Set(jobs.map(job => job.clientName).filter(Boolean)))

  const getActivityBadge = (job: any) => {
    if (job.activeShifts > 0) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active Today</Badge>
    }
    if (job.upcomingShifts > 0) {
      return <Badge variant="outline" className="border-blue-200 text-blue-700">Upcoming</Badge>
    }
    if (job.shiftCount > 0) {
      return <Badge variant="secondary">Scheduled</Badge>
    }
    return <Badge variant="outline">Planning</Badge>
  }

  const getLastActivityText = (job: any) => {
    const activityDate = new Date(job.lastActivity)
    
    if (job.lastActivityType === 'shift') {
      if (isToday(activityDate)) return "Today"
      if (isYesterday(activityDate)) return "Yesterday"
      if (isTomorrow(activityDate)) return "Tomorrow"
      return format(activityDate, 'MMM d')
    }
    
    return `Created ${format(activityDate, 'MMM d')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading jobs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading jobs: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Jobs</h1>
          <p className="text-muted-foreground">
            Recent jobs sorted by activity and scheduled shifts
          </p>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/admin/jobs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search jobs, clients, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Recent Jobs
            <Badge variant="secondary">{filteredJobs.length}</Badge>
          </CardTitle>
          <CardDescription>
            Jobs sorted by most recent activity and scheduled shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || clientFilter !== "all" 
                  ? "No jobs match your current filters."
                  : "Get started by creating your first job."
                }
              </p>
              {canManage && (
                <Button onClick={() => router.push('/admin/jobs/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{job.name}</div>
                          {job.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {job.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {job.clientName || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActivityBadge(job)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{job.shiftCount}</span>
                        {job.upcomingShifts > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {job.upcomingShifts} upcoming
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.status === 'Active' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getLastActivityText(job)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/jobs/${job.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/jobs/${job.id}/edit`)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
