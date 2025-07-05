"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  AlertCircle,
  Shield,
  ClipboardCheck,
  UserCheck,
  Settings
} from "lucide-react"
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
  assignedWorkers: number;
  requestedWorkers: number;
  isCrewChief: boolean;
}

interface PendingApproval {
  id: string;
  type: "timesheet" | "shift_change" | "worker_request";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export default function CrewChiefDashboard() {
  const { user } = useUser()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch crew chief's shifts
        const shiftsResponse = await fetch(`/api/shifts?crewChiefId=${user?.id}`)
        if (shiftsResponse.ok) {
          const shiftsData = await shiftsResponse.json()
          setShifts(shiftsData.shifts || [])
        }

        // Fetch pending approvals
        const approvalsResponse = await fetch(`/api/approvals?crewChiefId=${user?.id}`)
        if (approvalsResponse.ok) {
          const approvalsData = await approvalsResponse.json()
          setPendingApprovals(approvalsData.approvals || [])
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-32 bg-gray-200 rounded"></div>
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

  const activeShifts = shifts.filter(shift => shift.status === "In Progress")
  const highPriorityApprovals = pendingApprovals.filter(approval => approval.priority === "high")

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

  const getStaffingStatus = (assigned: number, requested: number) => {
    if (assigned >= requested) {
      return <Badge variant="default" className="bg-green-600">Fully Staffed</Badge>
    } else if (assigned >= requested * 0.8) {
      return <Badge variant="secondary" className="bg-yellow-600">Nearly Staffed</Badge>
    } else {
      return <Badge variant="destructive">Understaffed</Badge>
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl md:text-3xl font-bold font-headline">
            Chief {user?.name?.split(" ")[0]} 👷‍♂️
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </p>
      </div>

      {/* High Priority Alerts */}
      {highPriorityApprovals.length > 0 && (
        <Card className="card-mobile border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Urgent Actions Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {highPriorityApprovals.slice(0, 2).map((approval) => (
              <div key={approval.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{approval.title}</p>
                  <p className="text-xs text-muted-foreground">{approval.description}</p>
                </div>
                <Button size="sm" variant="destructive">
                  Review
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's Active Shifts */}
      {activeShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Active Shifts
          </h2>
          <div className="space-y-3">
            {activeShifts.map((shift) => (
              <Card key={shift.id} className="card-mobile border-l-4 border-l-green-600">
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
                    {getStaffingStatus(shift.assignedWorkers, shift.requestedWorkers)}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-medium">{shift.assignedWorkers}/{shift.requestedWorkers}</span> workers
                    </div>
                    <Button size="mobile" asChild>
                      <Link href={`/shifts/${shift.id}`}>
                        Manage
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {activeShifts.length > 0 && (
              <Button size="mobile" variant="outline" className="w-full" asChild>
                <Link href="/shifts?status=in_progress">
                  View All Active Shifts
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {activeShifts.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Active</p>
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
              {pendingApprovals.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              {shifts.filter(s => s.status === "Completed").length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Upcoming Shifts
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
                    {getStaffingStatus(shift.assignedWorkers, shift.requestedWorkers)}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <Button size="mobile" variant="outline" asChild>
                      <Link href={`/shifts/${shift.id}`}>
                        Plan
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
                <Link href="/shifts?status=upcoming">
                  View All Upcoming Shifts
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Crew Chief Actions */}
      <div className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          Crew Chief Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button size="mobile-lg" className="w-full" asChild>
            <Link href="/shifts">
              <Calendar className="mr-2 h-5 w-5" />
              Manage Shifts
            </Link>
          </Button>
          <Button size="mobile-lg" variant="outline" className="w-full" asChild>
            <Link href="/timesheets">
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Review Timesheets
            </Link>
          </Button>
          <Button size="mobile-lg" variant="outline" className="w-full" asChild>
            <Link href="/users">
              <UserCheck className="mr-2 h-5 w-5" />
              Manage Workers
            </Link>
          </Button>
          <Button size="mobile-lg" variant="outline" className="w-full" asChild>
            <Link href="/profile">
              <Shield className="mr-2 h-5 w-5" />
              My Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* No shifts message */}
      {shifts.length === 0 && (
        <Card className="card-mobile">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Shifts Assigned</h3>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any shifts to manage yet. Check back later or contact your manager.
            </p>
            <Button size="mobile" variant="outline" asChild>
              <Link href="/shifts">
                View All Shifts
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}