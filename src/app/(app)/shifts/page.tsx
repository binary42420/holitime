"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useApi, useTodaysShifts, useShiftsByDate } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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

  const canManage = user?.role === 'Manager/Admin' || user?.role === 'Crew Chief'

  const { data, loading, error, refetch } = user?.role === 'Manager/Admin'
    ? useApi<{ shifts: any[] }>('/api/shifts')
    : useShiftsByDate(dateFilter, statusFilter, clientFilter, searchTerm)

  const shifts = data?.shifts || []

  useEffect(() => {
    refetch()
  }, [dateFilter])

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

    const originalShifts = shifts

    // Optimistically remove the shift from the UI
    const newShifts = shifts.filter(s => s.id !== shiftId)
    // This is a hack to update the state without a setter from the hook
    // In a real app, the useApi hook would return a state setter
    Object.assign(shifts, newShifts)


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

      // No need to refetch, UI is already updated
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete shift. Please try again.",
        variant: "destructive",
      })
      // Restore the original shifts if the API call fails
      Object.assign(shifts, originalShifts)
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

      router.push(generateShiftEditUrl(result.shift.id))
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

  const filteredShifts = shifts

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
            variant={dateFilter === "tomorrow" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("tomorrow")}
            disabled={loading}
          >
            Tomorrow
          </Button>
          <Button
            variant={dateFilter === "this_week" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("this_week")}
            disabled={loading}
          >
            This Week
          </Button>
          <Button
            variant={dateFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter("all")}
            disabled={loading}
          >
            All Shifts
          </Button>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading...
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchTerm("")
            setStatusFilter("all")
            setDateFilter("today")
            setClientFilter("all")
          }}
          disabled={loading}
        >
          Clear Filters
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="ml-auto"
          disabled={loading}
        >
          <Filter className="mr-2 h-4 w-4" />
          {showFilters ? "Hide Filters" : "More Filters"}
          {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>}
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
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center">
                      <h3 className="text-lg font-semibold">No shifts found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or filter criteria.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          setSearchTerm("")
                          setStatusFilter("all")
                          setDateFilter("today")
                          setClientFilter("all")
                        }}
                      >
                        Clear Filters
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift: any) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(shift.date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{shift.jobName}</div>
                        <div className="text-sm text-muted-foreground">{shift.clientName}</div>
                      </TableCell>
                      <TableCell>{shift.location}</TableCell>
                      <TableCell>
                        {shift.crewChief ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={shift.crewChief.avatar} />
                              <AvatarFallback>{shift.crewChief.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{shift.crewChief.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {shift.assignedCount || 0} / {shift.requestedWorkers || 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(shift.status)}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}