"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { mockShifts, mockTimesheets } from "@/lib/mock-data"
import { format, differenceInMinutes } from 'date-fns'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import SignaturePad, { type SignaturePadRef } from "@/components/signature-pad"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Building2, Calendar, CheckCircle, Clock, FileSignature, MapPin, User, Pencil, Save, RefreshCw } from "lucide-react"

export default function ApproveTimesheetPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const router = useRouter();
  const signatureRef = useRef<SignaturePadRef>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const timesheet = mockTimesheets.find(t => t.id === params.id)
  const shift = mockShifts.find(s => s.id === timesheet?.shiftId)

  useEffect(() => {
    // Redirect if user is not authorized
    if (!shift) return; // Guard for initial render

    if (user.role === 'Employee') {
      router.push('/dashboard');
    } else if (user.role === 'Crew Chief' && shift.crewChief.id !== user.id) {
      router.push('/timesheets');
    }
  }, [user, shift, router]);
  
  if (!timesheet || !shift) {
    notFound()
  }

  // Prevent rendering for unauthorized users while redirecting.
  if (user.role === 'Employee' || (user.role === 'Crew Chief' && shift.crewChief.id !== user.id)) {
    return null; // Render nothing while redirecting
  }

  const calculateTotalHours = (timeEntries: { clockIn?: string; clockOut?: string }[]) => {
    const totalMinutes = timeEntries.reduce((acc, entry) => {
      if (entry.clockIn && entry.clockOut) {
        const [inHours, inMinutes] = entry.clockIn.split(':').map(Number);
        const [outHours, outMinutes] = entry.clockOut.split(':').map(Number);
        const startDate = new Date(0, 0, 0, inHours, inMinutes);
        const endDate = new Date(0, 0, 0, outHours, outMinutes);
        return acc + differenceInMinutes(endDate, startDate);
      }
      return acc;
    }, 0);
    return (totalMinutes / 60).toFixed(2);
  }

  const handleSaveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureDataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
      // In a real app, you would save this `signatureDataUrl` to your backend
      // and update the timesheet status.
      console.log("Signature saved:", signatureDataUrl);
      timesheet.status = 'Awaiting Manager Approval'; // Mock update
      timesheet.clientSignature = signatureDataUrl;
      timesheet.approvedByClientAt = new Date().toISOString();
      setIsDialogOpen(false);
      router.push('/timesheets'); // a different page could be a confirmation page
    } else {
      alert("Please provide a signature.");
    }
  }

  const isApproved = timesheet.status === 'Approved' || timesheet.status === 'Awaiting Manager Approval';

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
                Review and approve the hours for the shift on {format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}.
                </CardDescription>
            </div>
            {isApproved && timesheet.clientSignature && (
                 <div className="text-right">
                    <p className="text-sm font-medium">Client Approved</p>
                    <img src={timesheet.clientSignature} alt="Client Signature" className="h-16 w-32 bg-slate-100 rounded-md mt-1 p-2 border" />
                </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-3 gap-6 text-sm mb-6">
                <div className="space-y-1">
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">{shift.client.name}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{shift.location}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-muted-foreground">Crew Chief</p>
                    <p className="font-medium">{shift.crewChief.name}</p>
                </div>
            </div>
            <Separator className="my-4" />
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {shift.assignedPersonnel.filter(p => p.timeEntries.length > 0).map(person => (
                    <TableRow key={person.employee.id}>
                        <TableCell className="font-medium">{person.employee.name}</TableCell>
                        <TableCell>{person.roleOnShift}</TableCell>
                        <TableCell>{person.timeEntries.map(t => t.clockIn).join(', ')}</TableCell>
                        <TableCell>{person.timeEntries.map(t => t.clockOut).join(', ')}</TableCell>
                        <TableCell className="text-right font-mono">{calculateTotalHours(person.timeEntries)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter className="justify-end">
            {!isApproved && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><FileSignature className="mr-2 h-4 w-4" /> Review & Approve</Button>
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
                            <Button variant="ghost" onClick={() => signatureRef.current?.clear()}><RefreshCw className="mr-2 h-4 w-4" /> Clear</Button>
                            <Button onClick={handleSaveSignature}><Save className="mr-2 h-4 w-4" />Sign and Submit</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
            {isApproved && (
                <Alert variant="default" className="border-green-600 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4 !text-green-600" />
                    <AlertTitle>Timesheet Approved by Client</AlertTitle>
                    <AlertDescription>
                        This timesheet was signed and approved on {format(new Date(timesheet.approvedByClientAt!), 'PPpp')}.
                    </AlertDescription>
                </Alert>
            )}
        </CardFooter>
      </Card>
    </div>
  )
}
