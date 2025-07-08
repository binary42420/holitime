"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useApi, useShiftsByDate } from "@/hooks/use-api"
import { Card, Table, Button, Badge, Skeleton, Select, Tabs, Menu, ActionIcon, Group, Text, Title, Stack, TextInput } from "@mantine/core"
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
import { generateShiftEditUrl } from "@/lib/url-utils"
import { notifications } from "@mantine/notifications"

export default function ShiftsPage() {
  const { user } = useUser()
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const canManage = user?.role === 'Manager/Admin' || user?.role === 'Crew Chief'

  const { data, loading, error, refetch } = useShiftsByDate(dateFilter, statusFilter, clientFilter, searchTerm)

  const shifts = data?.shifts || []

  useEffect(() => {
    refetch()
  }, [dateFilter])

  const handleRowClick = (shiftId: string) => {
    router.push(`/shifts/${shiftId}`)
  }

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

      notifications.show({
        title: "Shift Deleted",
        message: "The shift has been deleted successfully.",
        color: 'green'
      })
      refetch()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete shift. Please try again.",
        color: 'red'
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

      notifications.show({
        title: "Shift Duplicated",
        message: "The shift has been duplicated successfully.",
        color: 'green'
      })

      router.push(generateShiftEditUrl(result.shift.id))
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to duplicate shift. Please try again.",
        color: 'red'
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

  const filteredShifts = shifts.filter((shift: any) => {
    if (dateFilter !== 'all') {
      const shiftCategory = getDateCategory(shift.date)
      if (shiftCategory !== dateFilter) {
        return false
      }
    }
    if (statusFilter !== 'all' && shift.status !== statusFilter) {
      return false
    }
    if (clientFilter !== 'all' && shift.clientName !== clientFilter) {
      return false
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        shift.jobName?.toLowerCase().includes(searchLower) ||
        shift.clientName?.toLowerCase().includes(searchLower) ||
        shift.location?.toLowerCase().includes(searchLower) ||
        shift.crewChief?.name?.toLowerCase().includes(searchLower)
      if (!matchesSearch) {
        return false
      }
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'Completed': 'teal',
      'In Progress': 'orange',
      'Upcoming': 'cyan',
      'Pending Approval': 'pink',
      'Cancelled': 'gray',
    };
    const icon = status === 'Completed' ? <CheckCircle size={14} /> : null;
    return <Badge color={statusColors[status] || 'gray'} leftSection={icon}>{status}</Badge>;
  }

  const getStaffingBadge = (assigned: number, requested: number) => {
    const percentage = requested > 0 ? (assigned / requested) * 100 : 100;
    const label = `${assigned}/${requested} Assigned`;

    if (percentage >= 100) {
      return <Badge color="green" leftSection={<UserCheck size={14} />}>Fully Staffed ({label})</Badge>;
    } else if (percentage > 0) {
      return <Badge color="yellow" leftSection={<Users size={14} />}>Partially Staffed ({label})</Badge>;
    } else {
      return <Badge color="red" leftSection={<UserX size={14} />}>Unstaffed ({label})</Badge>;
    }
  }

  const getDateBadge = (date: string) => {
    const shiftDate = new Date(date);
    if (isToday(shiftDate)) return <Badge color="indigo">Today</Badge>;
    if (isTomorrow(shiftDate)) return <Badge color="violet">Tomorrow</Badge>;
    if (isYesterday(shiftDate)) return <Badge color="light-gray">Yesterday</Badge>;
    return null;
  }

  const getPageTitle = () => {
    switch (dateFilter) {
      case "today": return "Today's Shifts"
      case "tomorrow": return "Tomorrow's Shifts"
      case "yesterday": return "Yesterday's Shifts"
      case "this_week": return "This Week's Shifts"
      case "all": return "All Shifts"
      default: return "All Shifts"
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

  const uniqueClients = [...new Set(shifts.map(s => s.clientName))].filter(Boolean)

  if (loading) {
    return (
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={1}>{getPageTitle()}</Title>
            <Text c="dimmed">{getPageDescription()}</Text>
          </div>
        </Group>
        <Skeleton height={400} />
      </Stack>
    )
  }

  if (error) {
    return (
      <Group justify="center" style={{ height: '64vh' }}>
        <Text color="red">Error loading shifts: {error}</Text>
      </Group>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={1}>{getPageTitle()}</Title>
          <Text c="dimmed">{getPageDescription()}</Text>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/admin/shifts/new')} leftSection={<Plus size={16} />}>
            Create New Shift
          </Button>
        )}
      </Group>

      <Group>
        <Button.Group>
          <Button variant={dateFilter === "today" ? "filled" : "default"} onClick={() => setDateFilter("today")}>Today</Button>
          <Button variant={dateFilter === "tomorrow" ? "filled" : "default"} onClick={() => setDateFilter("tomorrow")}>Tomorrow</Button>
          <Button variant={dateFilter === "this_week" ? "filled" : "default"} onClick={() => setDateFilter("this_week")}>This Week</Button>
          <Button variant={dateFilter === "all" ? "filled" : "default"} onClick={() => setDateFilter("all")}>All Shifts</Button>
        </Button.Group>
        <Button variant="subtle" onClick={() => {
          setSearchTerm("")
          setStatusFilter("all")
          setDateFilter("all")
          setClientFilter("all")
        }}>
          Clear Filters
        </Button>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} leftSection={<Filter size={16} />} style={{ marginLeft: 'auto' }}>
          {showFilters ? "Hide Filters" : "More Filters"}
        </Button>
      </Group>

      {showFilters && (
        <Card withBorder p="md" radius="md">
          <Group>
            <TextInput
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              leftSection={<Search size={16} />}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Statuses' },
                { value: 'Upcoming', label: 'Upcoming' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Pending Approval', label: 'Pending Approval' },
                { value: 'Cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              value={clientFilter}
              onChange={(value) => setClientFilter(value || 'all')}
              data={[
                { value: 'all', label: 'All Clients' },
                ...uniqueClients.map(client => ({ value: client, label: client }))
              ]}
            />
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
              setDateFilter("all")
              setClientFilter("all")
            }}>
              Reset Filters
            </Button>
          </Group>
        </Card>
      )}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {filteredShifts.length === 0 ? (
          <Stack align="center" justify="center" style={{ gridColumn: '1 / -1', minHeight: '300px' }}>
            <Title order={3}>No shifts found</Title>
            <Text c="dimmed">Try adjusting your search or filter criteria.</Text>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setStatusFilter("all")
              setDateFilter("all")
              setClientFilter("all")
            }}>
              Clear Filters
            </Button>
          </Stack>
        ) : (
          filteredShifts.map((shift: any) => (
            <Card
              key={shift.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => handleRowClick(shift.id)}
            >
              <Group justify="space-between" mb="xs">
                <div>
                  <Title order={4}>{shift.jobName}</Title>
                  <Text size="sm" c="dimmed">{shift.clientName}</Text>
                </div>
                {getDateBadge(shift.date)}
              </Group>
              <Stack gap="xs">
                <Group gap="xs">
                  <CalendarIcon size={16} />
                  <Text size="sm">{format(new Date(shift.date), 'MMM d, yyyy')}</Text>
                </Group>
                <Group gap="xs">
                  <Clock size={16} />
                  <Text size="sm">{shift.startTime} - {shift.endTime}</Text>
                </Group>
                <Group gap="xs">
                  <MapPin size={16} />
                  <Text size="sm">{shift.location}</Text>
                </Group>
              </Stack>
              <Group justify="space-between" mt="md">
                {getStaffingBadge(shift.assignedCount || 0, shift.requestedWorkers || 1)}
                {getStatusBadge(shift.status)}
              </Group>
            </Card>
          ))
        )}
      </div>
    </Stack>
  )
}
