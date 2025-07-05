'use client';

import React, { useRef, useState, useEffect, use } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInMinutes } from "date-fns"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import SignaturePad, { type SignaturePadRef } from "@/components/signature-pad"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Building2, Calendar, CheckCircle, Clock, FileSignature, MapPin, User, Pencil, Save, RefreshCw } from "lucide-react"
import { formatTo12Hour, calculateTotalRoundedHours, formatDate, getTimeEntryDisplay } from "@/lib/time-utils"
import { MobileSignatureModal } from "@/components/mobile-signature-modal"

export default function ApproveTimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignaturePadRef>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { id } = use(params)

  const { data: timesheetData, error } = useApi<{ timesheet: any }>(`/api/timesheets/${id}`)

  const timesheet = timesheetData?.timesheet
  const shift = timesheet?.shift
  const job = shift?.job
  const client = shift?.client

  useEffect(() => {
    // Redirect if user is not authorized
    if (!shift) return // Guard for initial render

    if (user?.role === "Employee") {
      router.push("/dashboard")
    } else if (user?.role === "Crew Chief" && shift.crewChief.id !== user.id) {
      router.push("/timesheets")
    }
  }, [user, shift, router])

  if (error) {
    notFound()
  }

  if (!timesheetData || !timesheet || !shift || !client) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Prevent rendering for unauthorized users while redirecting.
  if (user?.role === "Employee" || (user?.role === "Crew Chief" && shift.crewChief.id !== user.id)) {
    return null // Render nothing while redirecting
  }

  const calculateTotalHours = (timeEntries: { clockIn?: string; clockOut?: string }[]) => {
    return calculateTotalRoundedHours(timeEntries)
  }

  const handleApproval = async (approvalType: "client" | "manager") => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({
        title: "Error",
        description: "Please provide a signature.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const signatureDataUrl = signatureRef.current.getTrimmedCanvas().toDataURL("image/png")

      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature: signatureDataUrl,
          approvalType,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to approve timesheet")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.message,
      })

      // Close dialog
      setIsDialogOpen(false)

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/timesheets")
      }, 1000)

    } catch (error) {
      console.error("Error approving timesheet:", error)
      toast({
        title: "Error",
        description: "Failed to approve timesheet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    // TODO: Add rejection dialog with reason
    setLoading(true)
    try {
      const response = await fetch(`/api/timesheets/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Rejected by manager",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject timesheet")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.message,
      })

      // Data will be refreshed on page reload

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/timesheets")
      }, 1000)

    } catch (error) {
      console.error("Error rejecting timesheet:", error)
      toast({
        title: "Error",
        description: "Failed to reject timesheet. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isClientApproved = timesheet.status === "pending_manager_approval" || timesheet.status === "completed"
  const isManagerApproved = timesheet.status === "completed"
  const canClientApprove = timesheet.status === "pending_client_approval" && (user?.role === "Manager/Admin" || user?.role === "Client")
  const canManagerApprove = timesheet.status === "pending_manager_approval" && user?.role === "Manager/Admin"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/timesheets"><ArrowLeft className="mr-2 h-4 w-4" />Back to Timesheets</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Timesheet Approval</CardTitle>
              <CardDescription>
                Review and approve the hours for the shift on {format(new Date(shift.date), "EEEE, MMMM d, yyyy")}.
              </CardDescription>
            </div>
            <div className="flex gap-4">
              {isClientApproved && timesheet.clientSignature && (
                <div className="text-right">
                  <p className="text-sm font-medium">Client Approved</p>
                  <img src={timesheet.clientSignature} alt="Client Signature" className="h-16 w-32 bg-slate-100 rounded-md mt-1 p-2 border" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {timesheet.clientApprovedAt && format(new Date(timesheet.clientApprovedAt), "MMM d, yyyy")}
                  </p>
                </div>
              )}
              {isManagerApproved && timesheet.managerSignature && (
                <div className="text-right">
                  <p className="text-sm font-medium">Manager Approved</p>
                  <img src={timesheet.managerSignature} alt="Manager Signature" className="h-16 w-32 bg-slate-100 rounded-md mt-1 p-2 border" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {timesheet.managerApprovedAt && format(new Date(timesheet.managerApprovedAt), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-6">
            <div className="space-y-1">
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{client?.name || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{shift?.location || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Shift Date</p>
              <p className="font-medium">{formatDate(shift?.date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Start Time</p>
              <p className="font-medium">{formatTo12Hour(shift?.startTime)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-6">
            <div className="space-y-1">
              <p className="text-muted-foreground">Crew Chief</p>
              <p className="font-medium">{shift?.crewChief?.name || "Not Assigned"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Job</p>
              <p className="font-medium">{job?.name || shift?.jobName || "N/A"}</p>
            </div>
          </div>
          <Separator className="my-4" />
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
              {shift.assignedPersonnel.filter((p: any) => p.timeEntries.length > 0).map((person: any) => (
                <TableRow key={person.employee.id}>
                  <TableCell className="font-medium">{person.employee.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{person.roleCode}</Badge>
                  </TableCell>
                  {[1, 2, 3].map((entryNum) => {
                    const entry = person.timeEntries.find((e: any) => e.entryNumber === entryNum)
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
                  <TableCell className="font-medium">{calculateTotalHours(person.timeEntries)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold bg-muted/50">
                <TableCell colSpan={8} className="text-right">Total Hours:</TableCell>
                <TableCell className="text-right font-mono">
                  {(() => {
                    const allTimeEntries = shift.assignedPersonnel
                      .filter((p: any) => p.timeEntries.length > 0)
                      .flatMap((p: any) => p.timeEntries)
                    return calculateTotalHours(allTimeEntries)
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-end">
          <div className="flex gap-4 w-full">
            {canClientApprove && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={loading}>
                    <FileSignature className="mr-2 h-4 w-4" />
                      Client Approval
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Client Signature</DialogTitle>
                    <DialogDescription>
                        Please sign below to confirm the hours are correct.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <SignaturePad ref={signatureRef} />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => signatureRef.current?.clear()}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Clear
                    </Button>
                    <Button onClick={() => handleApproval("client")} disabled={loading}>
                      <Save className="mr-2 h-4 w-4" />
                      {loading ? "Signing..." : "Sign and Submit"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {canManagerApprove && (
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={loading}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                        Manager Approval
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Manager Signature</DialogTitle>
                      <DialogDescription>
                          Please sign below to provide final approval for this timesheet.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <SignaturePad ref={signatureRef} />
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => signatureRef.current?.clear()}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Clear
                      </Button>
                      <Button onClick={() => handleApproval("manager")} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Approving..." : "Final Approval"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" onClick={handleReject} disabled={loading}>
                    Reject
                </Button>
              </div>
            )}

            {isManagerApproved && (
              <Alert variant="default" className="border-green-600 bg-green-50 text-green-800 flex-1">
                <CheckCircle className="h-4 w-4 !text-green-600" />
                <AlertTitle>Timesheet Completed</AlertTitle>
                <AlertDescription>
                    This timesheet has been fully approved and completed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}