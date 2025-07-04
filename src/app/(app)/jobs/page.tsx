"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"

import { useUser } from "@/hooks/use-user"
import { useRecentJobs } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Jobs 💼</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your construction projects
            </p>
          </div>
          {canManage && (
            <Button size="mobile" className="w-full md:w-auto" onClick={() => router.push('/admin/jobs/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          )}
        </div>
      </div>

      {/* Mobile-First Filters */}
      <Card className="card-mobile">
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jobs, clients, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12">
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
                <SelectTrigger className="h-12">
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
          </div>
        </CardContent>
      </Card>

      {/* Jobs List - Mobile First */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Jobs
            <Badge variant="secondary" className="text-xs">{filteredJobs.length}</Badge>
          </h2>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="card-mobile">
            <CardContent className="pt-6 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Jobs Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || clientFilter !== "all"
                  ? "No jobs match your current filters."
                  : "Get started by creating your first job."
                }
              </p>
              {canManage && (
                <Button size="mobile" onClick={() => router.push('/admin/jobs/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Mobile: Card Layout */}
            <div className="md:hidden space-y-3">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="card-mobile">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="space-y-1">
                        <h3 className="font-medium text-base">{job.name}</h3>
                        <p className="text-sm text-muted-foreground">{job.clientName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          {getActivityText(job.lastActivity)}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge
                          variant={job.status === 'Active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {job.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {job.upcomingShifts} shifts
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="mobile" variant="outline" className="flex-1" asChild>
                        <a href={`/jobs/${job.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </a>
                      </Button>
                      {canManage && (
                        <Button size="mobile" variant="outline" className="flex-1" asChild>
                          <a href={`/admin/jobs/${job.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="pt-6">
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
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
