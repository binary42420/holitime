"use client"

import React, { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock, 
  User, 
  Building2, 
  Calendar,
  Signature,
  Download,
  Shield,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { format } from "date-fns"

interface TimesheetData {
  id: string
  status: string
  clientSignature?: string
  clientApprovedAt?: string
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    jobName: string
    clientName: string
    crewChiefName: string
  }
  assignedPersonnel: Array<{
    id: string
    employeeName: string
    employeeAvatar: string
    roleOnShift: string
    roleCode: string
    timeEntries: Array<{
      id: string
      entryNumber: number
      clockIn?: string
      clockOut?: string
    }>
  }>
}

export default function ManagerReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [timesheetId, setTimesheetId] = useState<string>("")

  // Unwrap params
  useEffect(() => {
    if (params.id) {
      setTimesheetId(params.id as string)
    }
  }, [params.id])
  
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [signature, setSignature] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Fetch timesheet data with transformation
  const { data: rawData, loading, refetch } = useApi<{success: boolean, timesheet: any}>(`/api/timesheets/${timesheetId}`)

  // Transform the API response to match the expected structure
  const timesheetData: TimesheetData | null = rawData?.success && rawData.timesheet ? {
    id: rawData.timesheet.id,
    status: rawData.timesheet.status,
    clientSignature: rawData.timesheet.clientSignature,
    clientApprovedAt: rawData.timesheet.clientApprovedAt,
    shift: {
      id: rawData.timesheet.shift.id,
      date: rawData.timesheet.shift.date,
      startTime: rawData.timesheet.shift.startTime,
      endTime: rawData.timesheet.shift.endTime,
      location: rawData.timesheet.shift.location,
      jobName: rawData.timesheet.shift.job.name,
      clientName: rawData.timesheet.shift.client.name,
      crewChiefName: rawData.timesheet.shift.crewChief.name,
    },
    assignedPersonnel: rawData.timesheet.shift.assignedPersonnel.map((p: any) => ({
      id: p.id,
      employeeName: p.employee.name,
      employeeAvatar: p.employee.avatar,
      roleOnShift: p.roleOnShift,
      roleCode: p.roleCode,
      timeEntries: p.timeEntries.map((te: any) => ({
        id: te.id,
        entryNumber: te.entry_number,
        clockIn: te.clock_in,
        clockOut: te.clock_out,
      })),
    })),
  } : null

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Convert canvas to base64
    const signatureData = canvas.toDataURL()
    setSignature(signatureData)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignature("")
  }

  const approveTimesheet = async () => {
    if (!signature) {
      toast({
        title: "Signature Required",
        description: "Please provide your digital signature before approving",
        variant: "destructive",
      })
      return
    }

    setIsApproving(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalType: "manager",
          signature
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve timesheet")
      }

      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved and marked as completed",
      })

      router.push("/timesheets")
    } catch (error) {
      console.error("Error approving timesheet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve timesheet",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  const rejectTimesheet = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting the timesheet",
        variant: "destructive",
      })
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectionReason
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to reject timesheet")
      }

      toast({
        title: "Timesheet Rejected",
        description: "The timesheet has been rejected and returned for corrections",
      })

      router.push("/timesheets")
    } catch (error) {
      console.error("Error rejecting timesheet:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject timesheet",
        variant: "destructive",
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "-"
    return format(new Date(timeString), "h:mm a")
  }

  const calculateHours = (clockIn?: string, clockOut?: string) => {
    if (!clockIn || !clockOut) return 0
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading timesheet...</div>
        </div>
      </div>
    )
  }

  if (!timesheetData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Timesheet not found</div>
        </div>
      </div>
    )
  }

  const { shift, assignedPersonnel } = timesheetData

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manager Review</h1>
          <p className="text-muted-foreground">
            Final review and approval of the timesheet
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Shield className="h-3 w-3 mr-1" />
          {timesheetData.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Client Approval Status */}
      {timesheetData.clientApprovedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Client Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Approved by {shift.clientName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(timesheetData.clientApprovedAt), "MMMM d, yyyy at h:mm a")}
                </p>
              </div>
              {timesheetData.clientSignature && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-2">Client Signature:</p>
                  <img 
                    src={timesheetData.clientSignature} 
                    alt="Client Signature" 
                    className="h-16 border rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Shift Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Job</Label>
              <p className="font-medium">{shift.jobName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Client</Label>
              <p className="font-medium">{shift.clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Date</Label>
              <p className="font-medium">{format(new Date(shift.date), "MMMM d, yyyy")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Crew Chief</Label>
              <p className="font-medium">{shift.crewChiefName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>JT</TableHead>
                <TableHead>IN 1</TableHead>
                <TableHead>OUT 1</TableHead>
                <TableHead>IN 2</TableHead>
                <TableHead>OUT 2</TableHead>
                <TableHead>IN 3</TableHead>
                <TableHead>OUT 3</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(shift?.assignedPersonnel || [])
                .filter((p: any) => p && p.timeEntries && Array.isArray(p.timeEntries) && p.timeEntries.length > 0)
                .map((person: any) => (
                  <TableRow key={person.employee?.id || person.id}>
                    <TableCell className="font-medium">{person.employee?.name || "Unknown Employee"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{person.roleCode || person.role_on_shift || "Worker"}</Badge>
                    </TableCell>
                    {[1, 2, 3].map((entryNum) => {
                      const entry = person.timeEntries?.find((e: any) => e && e.entryNumber === entryNum)
                      const display = getTimeEntryDisplay(entry?.clockIn, entry?.clockOut)
                      return (
                        <React.Fragment key={entryNum}>
                          <TableCell className="text-sm">
                            {display.displayClockIn}
                          </TableCell>
                          <TableCell className="text-sm">
                            {display.displayClockOut}
                          </TableCell>
                        </React.Fragment>
                      )
                    })}
                    <TableCell className="font-medium">{calculateTotalHours(person.timeEntries || [])}</TableCell>
                  </TableRow>
                ))}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell colSpan={8} className="text-right">Total Hours:</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const allTimeEntries = (shift?.assignedPersonnel || [])
                      .filter((p: any) => p && p.timeEntries && Array.isArray(p.timeEntries) && p.timeEntries.length > 0)
                      .flatMap((p: any) => p.timeEntries || [])
                    return calculateTotalHours(allTimeEntries)
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manager Approval Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manager Final Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As a manager, you are providing the final approval for this timesheet. 
              Please review all information above and provide your digital signature to complete the approval process.
            </p>
            
            <div className="flex justify-center">
              <Button 
                onClick={() => setShowSignatureModal(true)}
                disabled={submitting}
                size="lg"
                className="px-8"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                {submitting ? "Processing..." : "Provide Final Approval"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Modal */}
      <SignatureCaptureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSignatureSubmit={handleManagerApproval}
        title="Manager Final Approval"
        description="Please provide your digital signature to complete the final approval of this timesheet."
        loading={submitting}
      />
    </div>
  )
}