'use client'

import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Building2,
  FileText
} from 'lucide-react'

interface StatsData {
  totalShifts: number
  activeShifts: number
  completedShifts: number
  pendingTimesheets: number
  totalEmployees: number
  activeEmployees: number
  totalClients: number
  understaffedShifts: number
  upcomingShifts: number
  overdueTimesheets: number
}

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
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'destructive':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'destructive':
        return 'text-red-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className={getVariantStyles()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${getIconColor()}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center pt-1">
            <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            <span className="text-xs text-green-600">
              {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const shifts = shiftsData?.shifts || []
  const timesheets = timesheetsData?.timesheets || []
  const clients = clientsData?.clients || []
  const users = usersData?.users || []

  // Calculate stats
  const totalShifts = shifts.length
  const activeShifts = shifts.filter(s => s.status === 'In Progress').length
  const completedShifts = shifts.filter(s => s.status === 'Completed').length
  const scheduledShifts = shifts.filter(s => s.status === 'Scheduled').length
  
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
  
  // Calculate understaffed shifts (shifts with assigned < requested workers)
  const understaffedShifts = shifts.filter(s => {
    const assignedCount = s.assignedPersonnel?.length || 0
    const requestedCount = s.requestedWorkers || 0
    return assignedCount < requestedCount && s.status === 'Scheduled'
  }).length

  // Calculate upcoming shifts (next 7 days)
  const upcomingShifts = shifts.filter(s => {
    const shiftDate = new Date(s.date)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    return shiftDate >= today && shiftDate <= nextWeek && s.status === 'Scheduled'
  }).length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Shifts"
        value={totalShifts}
        description="All shifts in system"
        icon={Calendar}
        trend={{ value: 12, label: "from last month" }}
      />
      
      <StatCard
        title="Active Shifts"
        value={activeShifts}
        description="Currently in progress"
        icon={Clock}
        variant={activeShifts > 0 ? 'success' : 'default'}
      />
      
      <StatCard
        title="Upcoming Shifts"
        value={upcomingShifts}
        description="Next 7 days"
        icon={Calendar}
        variant={upcomingShifts > 10 ? 'warning' : 'default'}
      />
      
      <StatCard
        title="Understaffed"
        value={understaffedShifts}
        description="Shifts needing workers"
        icon={AlertTriangle}
        variant={understaffedShifts > 0 ? 'destructive' : 'success'}
      />
      
      <StatCard
        title="Total Employees"
        value={totalEmployees}
        description={`${activeEmployees} active`}
        icon={Users}
      />
      
      <StatCard
        title="Clients"
        value={totalClients}
        description="Active client companies"
        icon={Building2}
      />
      
      <StatCard
        title="Pending Timesheets"
        value={pendingTimesheets}
        description="Awaiting approval"
        icon={FileText}
        variant={pendingTimesheets > 5 ? 'warning' : 'default'}
      />
      
      <StatCard
        title="Overdue Timesheets"
        value={overdueTimesheets}
        description="More than 3 days old"
        icon={AlertTriangle}
        variant={overdueTimesheets > 0 ? 'destructive' : 'success'}
      />
    </div>
  )
}
