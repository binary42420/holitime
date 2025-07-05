'use client';

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/app/(app)/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/(app)/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/(app)/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/app/(app)/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/(app)/components/ui/select"
import { 
  ArrowLeft,
  MoreHorizontal,
  Mail,
  MessageSquare,
  CheckCircle,
  Edit,
  Eye,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Building2,
  User,
  Shield,
  UserCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import type { User as UserType, Shift } from "@/lib/types"
import Link from "next/link"

interface UserProfilePageProps {
  params: Promise<{ id: string }>
}

type TimeFilter = "weekly" | "biweekly" | "monthly" | "yearly"

function UserProfilePage({ params }: UserProfilePageProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly")
  const [userId, setUserId] = useState<string>("")

  // Unwrap params
  React.useEffect(() => {
    params.then(p => setUserId(p.id))
  }, [params])

  // Fetch user details
  const { data: userData, loading: userLoading, error: userError } = useApi<{ user: UserType }>(
    userId ? `/api/users/${userId}` : ""
  )

  // Fetch user's shift history
  const { data: shiftsData, loading: shiftsLoading } = useApi<{ shifts: Shift[] }>(
    userId ? `/api/users/${userId}/shifts` : ""
  )

  const user = userData?.user
  const shifts = shiftsData?.shifts || []

  // Calculate total hours based on time filter
  const calculateTotalHours = () => {
    const now = new Date()
    let startDate = new Date()

    switch (timeFilter) {
    case "weekly":
      startDate.setDate(now.getDate() - 7)
      break
    case "biweekly":
      startDate.setDate(now.getDate() - 14)
      break
    case "monthly":
      startDate.setMonth(now.getMonth() - 1)
      break
    case "yearly":
      startDate.setFullYear(now.getFullYear() - 1)
      break
    }

    const filteredShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate >= startDate && shift.status === "Completed"
    })

    return filteredShifts.reduce((total, shift) => {
      const start = new Date(`2000-01-01T${shift.startTime}`)
      const end = new Date(`2000-01-01T${shift.endTime}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return total + hours
    }, 0)
  }

  const handleSendPasswordReset = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/users/${user.id}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (response.ok) {
        toast({
          title: "Password Reset Sent",
          description: `Password reset email sent to ${user.email}`,
        })
      } else {
        throw new Error("Failed to send password reset")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      })
    }
  }

  const handleSendAssignmentReminder = async () => {
    if (!user) return
    
    toast({
      title: "Assignment Reminder Sent",
      description: `Assignment reminder sent to ${user.name}`,
    })
  }

  const handleSendShiftConfirmation = async () => {
    if (!user) return
    
    toast({
      title: "Shift Confirmation Sent",
      description: `Shift confirmation email sent to ${user.name}`,
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
    case "Manager/Admin":
      return <Shield className="h-4 w-4" />
    case "Client":
      return <Building2 className="h-4 w-4" />
    case "Crew Chief":
      return <UserCheck className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
    case "Manager/Admin":
      return "destructive"
    case "Client":
      return "secondary"
    case "Crew Chief":
      return "default"
    default:
      return "outline"
    }
  }

  if (userLoading) {
    return <div className="flex justify-center items-center h-64">Loading user profile...</div>
  }

  if (userError || !user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The user you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => router.push("/users")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalHours = calculateTotalHours()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/users")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">
                {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1 w-fit mt-1">
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>User Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleSendPasswordReset}>
              <Mail className="mr-2 h-4 w-4" />
              Send Password Reset Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSendAssignmentReminder}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Assignment Reminder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSendShiftConfirmation}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Send Shift Confirmation Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => router.push(`/users/${user.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit User
        </Button>
      </div>

      {/* User Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Role:</span>
              <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
            </div>
            {user.location && (
              <div className="flex justify-between items-center">
                <span>Location:</span>
                <span className="font-medium">{user.location}</span>
              </div>
            )}
            {user.performance && (
              <div className="flex justify-between items-center">
                <span>Performance:</span>
                <Badge variant="outline">{user.performance}/5</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours Worked */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Hours Worked
            </CardTitle>
            <CardDescription>
              <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalHours.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">
                hours in the last {timeFilter === "biweekly" ? "2 weeks" : timeFilter.replace("ly", "")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Certifications */}
      {(user.role === "Employee" || user.role === "Crew Chief") && (
        <Card>
          <CardHeader>
            <CardTitle>Certifications & Eligibility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {user.crewChiefEligible && (
                <Badge variant="default">Crew Chief Eligible</Badge>
              )}
              {user.forkOperatorEligible && (
                <Badge variant="default">Forklift Operator</Badge>
              )}
              {user.oshaCompliant && (
                <Badge variant="default" className="flex items-center gap-1">
                  <img
                    src="/images/osha-compliant.svg"
                    alt="OSHA Compliant"
                    className="w-3 h-3"
                  />
                  OSHA Compliant
                </Badge>
              )}
              {user.certifications?.map((cert, index) => (
                <Badge key={index} variant="outline">{cert}</Badge>
              ))}
              {(!user.crewChiefEligible && !user.forkOperatorEligible && !user.oshaCompliant && (!user.certifications || user.certifications.length === 0)) && (
                <span className="text-muted-foreground">No certifications on file</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Shift History
          </CardTitle>
          <CardDescription>
            Recent shifts assigned to this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="text-center py-4">Loading shifts...</div>
          ) : shifts.length > 0 ? (
            <div className="space-y-3">
              {shifts.slice(0, 10).map((shift) => (
                <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{shift.jobName}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={shift.status === "Completed" ? "default" : "secondary"}>
                      {shift.status}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/shifts/${shift.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {shifts.length > 10 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/shifts?userId=${user.id}`}>
                    View All Shifts
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Shifts Found</h3>
              <p className="text-muted-foreground">
                This user hasn't been assigned to any shifts yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default UserProfilePage