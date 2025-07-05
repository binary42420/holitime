"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Briefcase,
  ArrowLeft,
  Download,
  ExternalLink,
  Edit
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Shift {
  id: string
  jobName: string
  clientName: string
  date: string
  startTime: string
  endTime?: string
  location: string
  crewChief?: {
    name: string
  }
  status: string
}

interface MobileShiftDetailsProps {
  shift: Shift
  timesheetStatus?: string
  timesheetId?: string
  onDownloadPDF?: () => void
  className?: string
}

export const MobileShiftDetails: React.FC<MobileShiftDetailsProps> = ({
  shift,
  timesheetStatus,
  timesheetId,
  onDownloadPDF,
  className = ""
}) => {
  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
    case "scheduled":
      return { 
        label: "Scheduled", 
        color: "bg-blue-100 text-blue-800",
        description: "Ready to start"
      }
    case "in_progress":
      return { 
        label: "In Progress", 
        color: "bg-green-100 text-green-800",
        description: "Workers are active"
      }
    case "completed":
      return { 
        label: "Completed", 
        color: "bg-gray-100 text-gray-800",
        description: "Shift finished"
      }
    default:
      return { 
        label: status, 
        color: "bg-gray-100 text-gray-800",
        description: ""
      }
    }
  }

  const getTimesheetButtonInfo = () => {
    if (!timesheetStatus) {
      return {
        text: "Finalize Timesheet",
        href: `/shifts/${shift.id}`,
        variant: "default" as const,
        color: "bg-blue-600 hover:bg-blue-700"
      }
    }

    switch (timesheetStatus) {
    case "pending_client_approval":
      return {
        text: "View Client Approval",
        href: `/timesheets/${timesheetId}/review`,
        variant: "outline" as const,
        color: "border-orange-500 text-orange-600 hover:bg-orange-50"
      }
    case "pending_final_approval":
      return {
        text: "Manager Approval Required",
        href: `/timesheets/${timesheetId}/manager-approval`,
        variant: "outline" as const,
        color: "border-purple-500 text-purple-600 hover:bg-purple-50"
      }
    case "completed":
      return {
        text: "View Completed Timesheet",
        href: `/timesheets/${timesheetId}`,
        variant: "outline" as const,
        color: "border-green-500 text-green-600 hover:bg-green-50"
      }
    default:
      return {
        text: "View Timesheet",
        href: `/timesheets/${timesheetId}`,
        variant: "outline" as const,
        color: ""
      }
    }
  }

  const statusInfo = getStatusInfo(shift.status)
  const timesheetButton = getTimesheetButtonInfo()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{shift.jobName}</CardTitle>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">{shift.clientName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {new Date(shift.date).toLocaleDateString("en-US", { 
                      weekday: "long", 
                      year: "numeric", 
                      month: "long", 
                      day: "numeric" 
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {shift.startTime}
                    {shift.endTime && ` - ${shift.endTime}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{shift.location}</span>
                </div>
                {shift.crewChief && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="text-sm">{shift.crewChief.name}</span>
                  </div>
                )}
              </div>
            </div>
            <Badge className={cn("text-xs font-medium", statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Primary Action - Timesheet */}
            <Button
              asChild
              className={cn(
                "w-full h-12 text-base font-medium",
                timesheetButton.color
              )}
              variant={timesheetButton.variant}
            >
              <Link href={timesheetButton.href}>
                <Briefcase className="h-5 w-5 mr-2" />
                {timesheetButton.text}
                <ExternalLink className="h-4 w-4 ml-auto" />
              </Link>
            </Button>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                asChild
                variant="outline"
                className="h-12"
              >
                <Link href={`/shifts/${shift.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Shift
                </Link>
              </Button>

              {onDownloadPDF && timesheetStatus === "completed" && (
                <Button
                  onClick={onDownloadPDF}
                  variant="outline"
                  className="h-12"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              )}
            </div>

            {/* Back Button */}
            <Button
              asChild
              variant="ghost"
              className="w-full h-12"
            >
              <Link href="/shifts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Shifts
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Information */}
      {statusInfo.description && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MobileShiftDetails
