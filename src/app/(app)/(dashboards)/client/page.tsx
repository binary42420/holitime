'use client';

import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import type { Job, Shift, ClientCompany } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Users,
  Briefcase,
  MapPin,
  Settings,
  ClipboardCheck,
  User,
  Building2
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ClientDashboard() {
  const { user } = useUser()
  const router = useRouter()

  const { data: shiftsData, loading: shiftsLoading } = useApi<{ shifts: Shift[] }>(
    `/api/shifts?clientId=${user?.clientCompanyId || ""}`
  )

  const { data: jobsData, loading: jobsLoading } = useApi<{ jobs: Job[] }>(
    `/api/clients/${user?.clientCompanyId || ""}/jobs`
  )

  if (shiftsLoading || jobsLoading) {
    return <div>Loading...</div>
  }

  const shifts: Shift[] = shiftsData?.shifts || []
  const jobs: Job[] = jobsData?.jobs || []
  const upcomingShifts = shifts.filter((shift: Shift) => shift.status === "Upcoming")
  const completedShifts = shifts.filter((shift: Shift) => shift.status === "Completed")

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">
          Welcome, {user?.name?.split(" ")[0]}! 🏢
        </h1>
        <p className="text-sm md:text-base text-muted-foreground font-medium">
          {user?.companyName || ""}
        </p>
        <p className="text-xs md:text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          })}
        </p>
      </div>

      {/* Quick Stats - Mobile First */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="card-mobile">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {jobs.filter((job: Job) => job.status === "Active").length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Active Jobs</p>
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
        <Card className="card-mobile col-span-2 md:col-span-1">
          <CardContent className="pt-4 text-center">
            <div className="text-2xl md:text-3xl font-bold text-orange-600">
              {completedShifts.length}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Jobs - Mobile First */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Your Jobs
          </h2>
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job: Job) => (
              <Card key={job.id} className="card-mobile">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-base">{job.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </div>
                    </div>
                    <Badge
                      variant={job.status === "Active" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <Button size="mobile" variant="outline" className="w-full" asChild>
                    <Link href={`/jobs/${job.id}`}>
                      View Job Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {jobs.length > 5 && (
              <Button size="mobile" variant="outline" className="w-full" asChild>
                <Link href="/jobs">
                  View All Jobs
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Shifts - Mobile First */}
      {upcomingShifts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Upcoming Shifts
          </h2>
          <div className="space-y-3">
            {upcomingShifts.slice(0, 5).map((shift: Shift) => (
              <Card key={shift.id} className="card-mobile">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-base">{shift.jobName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(shift.date).toLocaleDateString()} at {shift.startTime}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {shift.location}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {shift.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {shift.assignedCount || 0}/{shift.requestedWorkers} workers
                      </p>
                    </div>
                  </div>
                  <Button size="mobile" variant="outline" className="w-full" asChild>
                    <Link href={`/shifts/${shift.id}`}>
                      View Shift Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
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
            <Link href="/jobs">
              <Briefcase className="mr-2 h-5 w-5" />
              Manage Jobs
            </Link>
          </Button>
          <Button size="mobile-lg" variant="outline" className="w-full" asChild>
            <Link href="/timesheets">
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Review Timesheets
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

      {/* Empty States */}
      {upcomingShifts.length === 0 && jobs.length === 0 && (
        <Card className="card-mobile">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Welcome to HoliTime</h3>
            <p className="text-muted-foreground mb-4">
              Your shifts and jobs will appear here once they're scheduled.
            </p>
            <Button size="mobile" variant="outline" asChild>
              <Link href="/profile">
                Complete Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
