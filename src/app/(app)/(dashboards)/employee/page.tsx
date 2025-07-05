'use client';

import { useEffect, useState } from "react"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Calendar, Clock, MapPin, User, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Shift {
  id: string;
  jobName: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  roleOnShift: string;
}

interface TimeEntry {
  id: string;
  shiftId: string;
  status: string;
  clockInTime?: string;
  clockOutTime?: string;
}

export default function EmployeeDashboard() {
  const { user } = useUser()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employee's shifts
        const shiftsResponse = await fetch(`/api/shifts?employeeId=${user?.id}`)
        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json()
          setShifts(shiftsData.shifts || [])
        }

        // Fetch time entries
        const timeResponse = await fetch(`/api/time-entries?employeeId=${user?.id}`)
        if (timeResponse.ok) {
          const timeData = await timeResponse.json()
          setTimeEntries(timeData.timeEntries || [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchData()
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const todayShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date).toDateString()
    const today = new Date().toDateString()
    return shiftDate === today
  })

  const upcomingShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date)
    const today = new Date()
    return shiftDate > today
  }).slice(0, 3)

  const getStatusBadge = (status: string) => {
    const statusMap = {
      "Upcoming": { variant: "secondary" as const, icon: Calendar },
      "In Progress": { variant: "default" as const, icon: Clock },
      "Completed": { variant: "outline" as const, icon: CheckCircle },
      "Cancelled": { variant: "destructive" as const, icon: AlertCircle },
    }

    const config = statusMap[status as keyof typeof statusMap] || { variant: "secondary" as const, icon: Calendar }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          Welcome, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </p>
      </div>

      {/* Today's Shifts - Priority for mobile */}
      {todayShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Today's Work
          </h2>
          <div className="space-y-3">
            {todayShifts.map((shift) => (
              <Card key={shift.id} className="card-mobile border-l-4 border-l-blue-600">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-base">{shift.jobName}</h3>
                      <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {shift.location}
                      </div>
                    </div>
                    {getStatusBadge(shift.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <Button size="mobile" asChild>
                      <Link href={`/shifts/${shift.id}`}>
                        View Shift
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {todayShifts.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {upcomingShifts.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-orange-600">
              {shifts.filter(s => s.status === "Completed").length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              {timeEntries.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Time Logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Upcoming Work
          </h2>
          <div className="space-y-3">
            {upcomingShifts.map((shift) => (
              <Card key={shift.id} className="card-mobile">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-base">{shift.jobName}</h3>
                      <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(shift.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {shift.roleOnShift}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <Button size="mobile" variant="outline" asChild>
                      <Link href={`/shifts/${shift.id}`}>
                        Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {shifts.filter(shift => {
              const shiftDate = new Date(shift.date)
              const today = new Date()
              return shiftDate > today
            }).length > 3 && (
              <Button size="mobile" variant="outline" className="w-full" asChild>
                <Link href="/shifts">
                  View All Upcoming Shifts
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button size="mobile-lg" className="w-full" asChild>
            <Link href="/shifts">
              <Calendar className="mr-2 h-5 w-5" />
              View All Shifts
            </Link>
          </Button>
          <Button size="mobile-lg" variant="outline" className="w-full" asChild>
            <Link href="/profile">
              <User className="mr-2 h-5 w-5" />
              My Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* No shifts message */}
      {shifts.length === 0 && (
        <Card className="card-mobile">
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Shifts Assigned</h3>
            <p className="text-muted-foreground mb-4">
              You don't have any shifts assigned yet. Check back later or contact your supervisor.
            </p>
            <Button size="mobile" variant="outline" asChild>
              <Link href="/profile">
                Update Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}