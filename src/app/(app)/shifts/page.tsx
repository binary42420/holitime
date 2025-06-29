"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useTodaysShifts, useShiftsByDate } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Building2,
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShiftUrl, generateShiftEditUrl } from "@/lib/url-utils"

export default function ShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("today") // Default to today
  const [clientFilter, setClientFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false) // Collapsible filters

  // Use optimized hooks - always use today's shifts for better performance
  const { data: todaysShiftsData, loading: todaysLoading, error: todaysError, refetch: refetchTodays } = useTodaysShifts()

  // For now, always use today's data for optimal performance
  // TODO: Implement lazy loading for other date ranges
  const shiftsData = todaysShiftsData
  const loading = todaysLoading
  const error = todaysError
  const refetch = refetchTodays

  const shifts = shiftsData?.shifts || []

  const canManage = user?.role === 'Manager/Admin' || user?.role === 'Crew Chief'

  // Handle date filter changes - for now just refetch today's data
  useEffect(() => {
    // For now, always refetch today's data when filter changes
    // TODO: Implement proper date range filtering
    refetch()
  }, [dateFilter, refetch])

  const ShiftsTableSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date & Time</TableHead>
          <TableHead>Job & Client</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Crew Chief</TableHead>
          <TableHead>Staffing</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
            {canManage && <TableCell><Skeleton className="h-8 w-16" /></TableCell>}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const handleDeleteShift = async (shiftId: string, shiftName: string) => {
    if (!confirm(`Are you sure you want to delete the shift "${shiftName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete shift')
      }

      toast({
        title: "Shift Deleted",
        description: "The shift has been deleted successfully.",
      })

      // Refresh the shifts data
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete shift. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDuplicateShift = async (shift: any) => {
    try {
      const duplicateData = {
        jobId: shift.jobId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        requestedWorkers: shift.requestedWorkers,
        crewChiefId: shift.crewChiefId,
        location: shift.location,
        description: shift.description,
        requirements: shift.requirements,
        notes: `Duplicate of shift from ${shift.date}`,
      }

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      })

      if (!response.ok) {
        throw new Error('Failed to duplicate shift')
      }

      const result = await response.json()

      toast({
        title: "Shift Duplicated",
        description: "The shift has been duplicated successfully.",
      })

      router.push(generateShiftEditUrl(result.shift.clientName, result.shift.jobName, result.shift.date, result.shift.startTime))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate shift. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getDateCategory = (date: string) => {
    const shiftDate = new Date(date)
    if (isToday(shiftDate)) return 'today'
    if (isTomorrow(shiftDate)) return 'tomorrow'
    if (isYesterday(shiftDate)) return 'yesterday'
    if (isWithinInterval(shiftDate, { start: startOfWeek(new Date()), end: endOfWeek(new Date()) })) return 'this_week'
    return 'other'
  }

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch =
      shift.jobName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shift.crewChiefName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || shift.status === statusFilter
    const matchesDate = dateFilter === 'all' || getDateCategory(shift.date) === dateFilter
    const matchesClient = clientFilter === 'all' || shift.clientName === clientFilter

    return matchesSearch && matchesStatus && matchesDate && matchesClient
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
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

  const getStaffingBadge = (assigned: number, requested: number) => {
    const percentage = requested > 0 ? (assigned / requested) * 100 : 100

    if (percentage >= 100) {
      return <Badge variant="default" className="bg-green-600"><UserCheck className="mr-1 h-3 w-3" />Fully Staffed</Badge>
    } else if (percentage >= 75) {
      return <Badge variant="secondary"><Users className="mr-1 h-3 w-3" />Nearly Full</Badge>
    } else if (percentage >= 50) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700"><AlertTriangle className="mr-1 h-3 w-3" />Needs Staff</Badge>
    } else {
      return <Badge variant="destructive"><UserX className="mr-1 h-3 w-3" />Understaffed</Badge>
    }
  }

  const getDateBadge = (date: string) => {
    const shiftDate = new Date(date)
    if (isToday(shiftDate)) return <Badge variant="destructive">Today</Badge>
    if (isTomorrow(shiftDate)) return <Badge variant="default">Tomorrow</Badge>
    if (isYesterday(shiftDate)) return <Badge variant="outline">Yesterday</Badge>
    return null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Today's Shifts</h1>
            <p className="text-muted-foreground">
              Manage and track your shifts
            </p>
          </div>
        </div>
        <ShiftsTableSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading shifts: {error}</div>
      </div>
    )
  }

  const uniqueClients = [...new Set(shifts.map(s => s.clientName))].filter(Boolean)

  const getPageTitle = () => {
    switch (dateFilter) {
      case "today": return "Today's Shifts"
      case "tomorrow": return "Tomorrow's Shifts"
      case "yesterday": return "Yesterday's Shifts"
      case "this_week": return "This Week's Shifts"
      case "all": return "All Shifts"
      default: return "Shifts"
    }
  }

  const getPageDescription = () => {
    switch (dateFilter) {
      case "today": return "Today's scheduled shifts and assignments"
      case "tomorrow": return "Tomorrow's scheduled shifts and assignments"
      case "yesterday": return "Yesterday's shifts and assignments"
      case "this_week": return "This week's scheduled shifts and assignments"
      case "all": return "All shifts and assignments"
      default: return "Manage work shifts and assignments"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">{getPageTitle()}</h1>
          <p className="text-muted-foreground">
            {getPageDescription()}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/admin/shifts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Shift
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={dateFilter === "today" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("today")}
            disabled={loading}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={true}
            title="Coming soon - optimized loading for other date ranges"
          >
            Tomorrow (Soon)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={true}
            title="Coming soon - optimized loading for other date ranges"
          >
            This Week (Soon)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={true}
            title="Coming soon - optimized loading for other date ranges"
          >
            All Shifts (Soon)
          </Button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading...
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="ml-auto"
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? "Hide Filters" : "More Filters"}
        </Button>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {uniqueClients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setDateFilter("today")
                  setClientFilter("all")
                }}
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {dateFilter === "today" ? "Today's Shifts" :
             dateFilter === "tomorrow" ? "Tomorrow's Shifts" :
             dateFilter === "this_week" ? "This Week's Shifts" :
             dateFilter === "yesterday" ? "Yesterday's Shifts" : "All Shifts"}
          </CardTitle>
          <CardDescription>
            {filteredShifts.length} {dateFilter === "today" ? "shifts today" :
             dateFilter === "tomorrow" ? "shifts tomorrow" :
             dateFilter === "this_week" ? "shifts this week" :
             `of ${shifts.length} shifts`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ShiftsTableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Job & Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Crew Chief</TableHead>
                  <TableHead>Staffing</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredShifts.map((shift) => (
                <TableRow
                  key={shift.id}
                  onClick={() => router.push(generateShiftUrl(shift.clientName, shift.jobName, shift.date, shift.startTime, 1))}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium flex items-center gap-2">
                        {format(new Date(shift.date), 'EEE, MMM d')}
                        {getDateBadge(shift.date)}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-medium flex items-center gap-1">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {shift.jobName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {shift.clientName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{shift.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={shift.crewChiefAvatar} />
                        <AvatarFallback className="text-xs">
                          {shift.crewChiefName?.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{shift.crewChiefName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">
                        {shift.assignedCount || 0} / {shift.requestedWorkers || 0} workers
                      </div>
                      {getStaffingBadge(shift.assignedCount || 0, shift.requestedWorkers || 0)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(shift.status)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(generateShiftUrl(shift.clientName, shift.jobName, shift.date, shift.startTime, 1))}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(generateShiftEditUrl(shift.clientName, shift.jobName, shift.date, shift.startTime, 1))}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Shift
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateShift(shift)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate Shift
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteShift(shift.id, shift.jobName)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Shift
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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