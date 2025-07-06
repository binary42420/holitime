"use client"

import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Button } from "@/app/(app)/components/ui/button"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Briefcase, Building2 } from "lucide-react"

export default function ManagerDashboard() {
  const { user } = useUser()
  const router = useRouter()

  const { data: clientsData, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useApi<{ clients: any[] }>("/api/clients")
  const { data: jobsData, loading: jobsLoading, error: jobsError, refetch: refetchJobs } = useApi<{ jobs: any[] }>("/api/jobs")
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useApi<{ shifts: any[] }>("/api/shifts?filter=all")

  useEffect(() => {
    refetchClients()
    refetchJobs()
    refetchShifts()
  }, [refetchClients, refetchJobs, refetchShifts])

  if (clientsLoading || jobsLoading || shiftsLoading) {
    return <div className="p-6 text-center">Loading dashboard data...</div>
  }

  if (clientsError || jobsError || shiftsError) {
    return <div className="p-6 text-center text-red-600">Error loading dashboard data.</div>
  }

  const clients = clientsData?.clients || []
  const jobs = jobsData?.jobs || []
  const shifts = shiftsData?.shifts || []

  return (
    <div className="space-y-4 md:space-y-6 mobile-friendly">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-4xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manager Dashboard Overview</p>
      </header>

      <section className="grid grid-mobile-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <Card className="card-mobile">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm md:text-base font-medium">Clients</CardTitle>
            <Building2 className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card className="card-mobile">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm md:text-base font-medium">Jobs</CardTitle>
            <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card className="card-mobile col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm md:text-base font-medium">Shifts</CardTitle>
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Recent Shifts</h2>
        {shifts.length > 0 ? (
          <>
            {/* Mobile: Card Layout */}
            <div className="md:hidden space-y-3">
              {shifts.slice(0, 5).map((shift) => (
                <Card key={shift.id} className="card-mobile">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-base">{shift.jobName}</h3>
                        <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {shift.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {new Date(shift.date).toLocaleDateString()}
                      </p>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/shifts/${shift.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {shifts.length > 5 && (
                <Button size="mobile" variant="outline" className="w-full" asChild>
                  <Link href="/shifts">
                    View All Shifts
                  </Link>
                </Button>
              )}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-auto border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Job</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Client</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.slice(0, 10).map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="border border-gray-300 px-4 py-2">{new Date(shift.date).toLocaleDateString()}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Link href={`/jobs/${shift.jobId}`} className="text-blue-600 hover:underline">
                          {shift.jobName}
                        </Link>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Link href={`/clients/${shift.clientId}`} className="text-blue-600 hover:underline">
                          {shift.clientName}
                        </Link>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Badge variant={shift.status === "Completed" ? "default" : "secondary"}>
                          {shift.status}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/shifts/${shift.id}`)}>
                        View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Card className="card-mobile">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No recent shifts found.</p>
            </CardContent>
          </Card>
        )}
      </section>

    </div>
  )
}
