'use client'

import { useApi } from '@/hooks/use-api'
import { Card, Grid, Skeleton, Text, Group, ThemeIcon } from '@mantine/core'
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  FileText
} from 'lucide-react'

const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend, 
  variant = 'default' 
}: {
  title: string
  value: string | number
  description: string
  icon: any
  trend?: { value: number; label: string }
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return 'green'
      case 'warning':
        return 'yellow'
      case 'destructive':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          {title}
        </Text>
        <ThemeIcon color={getVariantColor()} variant="light" radius="md" size="lg">
          <Icon size={24} />
        </ThemeIcon>
      </Group>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {description}
      </Text>
      {trend && (
        <Group gap="xs" mt="xs">
          <TrendingUp size={14} color="green" />
          <Text size="xs" c="green">
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </Text>
        </Group>
      )}
    </Card>
  )
}

export default function QuickStats() {
  const { data: shiftsData } = useApi<{ shifts: any[] }>('/api/shifts')
  const { data: timesheetsData } = useApi<{ timesheets: any[] }>('/api/timesheets')
  const { data: clientsData } = useApi<{ clients: any[] }>('/api/clients')
  const { data: usersData } = useApi<{ users: any[] }>('/api/users')

  const isLoading = !shiftsData || !timesheetsData || !clientsData || !usersData

  if (isLoading) {
    return (
      <Grid>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid.Col key={i} span={{ base: 12, sm: 6, lg: 3 }}>
            <Skeleton height={150} />
          </Grid.Col>
        ))}
      </Grid>
    )
  }

  const shifts = shiftsData?.shifts || []
  const timesheets = timesheetsData?.timesheets || []
  const clients = clientsData?.clients || []
  const users = usersData?.users || []

  // Calculate stats
  const totalShifts = shifts.length
  const activeShifts = shifts.filter(s => s.status === 'In Progress').length
  
  const pendingTimesheets = timesheets.filter(t => 
    t.status === 'pending_client_approval' || t.status === 'pending_manager_approval'
  ).length
  
  const overdueTimesheets = timesheets.filter(t => {
    const submittedDate = new Date(t.submittedAt)
    const daysSinceSubmission = (Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSubmission > 3 && t.status !== 'completed'
  }).length

  const totalEmployees = users.filter(u => u.role !== 'Client').length
  const activeEmployees = users.filter(u => u.role !== 'Client' && u.status === 'active').length
  
  const totalClients = clients.length
  
  const understaffedShifts = shifts.filter(s => {
    const assignedCount = s.assignedPersonnel?.length || 0
    const requestedCount = s.requestedWorkers || 0
    return assignedCount < requestedCount && s.status === 'Scheduled'
  }).length

  const upcomingShifts = shifts.filter(s => {
    const shiftDate = new Date(s.date)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return shiftDate >= today && shiftDate <= nextWeek && s.status === 'Scheduled'
  }).length

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total Shifts"
          value={totalShifts}
          description="All shifts in system"
          icon={Calendar}
          trend={{ value: 12, label: "from last month" }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Active Shifts"
          value={activeShifts}
          description="Currently in progress"
          icon={Clock}
          variant={activeShifts > 0 ? 'success' : 'default'}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Upcoming Shifts"
          value={upcomingShifts}
          description="Next 7 days"
          icon={Calendar}
          variant={upcomingShifts > 10 ? 'warning' : 'default'}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Understaffed"
          value={understaffedShifts}
          description="Shifts needing workers"
          icon={AlertTriangle}
          variant={understaffedShifts > 0 ? 'destructive' : 'success'}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          description={`${activeEmployees} active`}
          icon={Users}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Clients"
          value={totalClients}
          description="Active client companies"
          icon={Building2}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Pending Timesheets"
          value={pendingTimesheets}
          description="Awaiting approval"
          icon={FileText}
          variant={pendingTimesheets > 5 ? 'warning' : 'default'}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Overdue Timesheets"
          value={overdueTimesheets}
          description="More than 3 days old"
          icon={AlertTriangle}
          variant={overdueTimesheets > 0 ? 'destructive' : 'success'}
        />
      </Grid.Col>
    </Grid>
  )
}
