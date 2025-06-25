
"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { mockClients, mockShifts, mockJobs, mockEmployees } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import type { Shift, Client } from "@/lib/types"
import { ArrowLeft, Building2, Mail, Phone, User, Pencil, X } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { useToast } from "@/hooks/use-toast"

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const canEdit = user.role === 'Manager/Admin';
  const { toast } = useToast();

  const initialClient = mockClients.find((c) => c.id === params.id)
  
  const [client, setClient] = useState<Client | undefined>(initialClient);
  const [isEditing, setIsEditing] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const clientJobs = mockJobs.filter(j => j.clientId === params.id)
  const clientJobIds = clientJobs.map(j => j.id)
  const clientShifts = mockShifts.filter((s) => clientJobIds.includes(s.jobId))

  if (!client) {
    notFound()
  }

  const getStatusVariant = (status: Shift['status']) => {
    switch (status) {
      case 'Completed':
        return 'default'
      case 'In Progress':
        return 'destructive'
      case 'Cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const handleSaveChanges = () => {
    if (editingClient) {
      setClient(editingClient);
      // In a real app, you'd also call an API to save the changes
      toast({
        title: "Client Updated",
        description: `${editingClient.name} has been successfully updated.`,
      });
      setIsEditing(false);
      setEditingClient(null);
    }
  };

  const handleAddContact = (employeeId: string) => {
    if (editingClient && !editingClient.contactUserIds?.includes(employeeId)) {
      setEditingClient({
        ...editingClient,
        contactUserIds: [...(editingClient.contactUserIds || []), employeeId],
      });
    }
  };

  const handleRemoveContact = (employeeId: string) => {
    if (editingClient) {
      setEditingClient({
        ...editingClient,
        contactUserIds: editingClient.contactUserIds?.filter(id => id !== employeeId),
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/clients"><ArrowLeft className="mr-2 h-4 w-4" />Back to Clients</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{client.name}</CardTitle>
                <CardDescription>Client Details</CardDescription>
              </div>
              {canEdit && (
                 <Sheet open={isEditing} onOpenChange={setIsEditing}>
                  <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingClient(JSON.parse(JSON.stringify(client)))}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Client</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Edit Client</SheetTitle>
                      <SheetDescription>
                        Make changes to the client's details. Click save when you're done.
                      </SheetDescription>
                    </SheetHeader>
                    {editingClient && (
                      <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">Company Name</Label>
                          <Input id="name" value={editingClient.name} onChange={(e) => setEditingClient({...editingClient, name: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="address" className="text-right">Address</Label>
                          <Input id="address" value={editingClient.address} onChange={(e) => setEditingClient({...editingClient, address: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact-person" className="text-right">Contact Person</Label>
                          <Input id="contact-person" value={editingClient.contactPerson} onChange={(e) => setEditingClient({...editingClient, contactPerson: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact-email" className="text-right">Contact Email</Label>
                          <Input id="contact-email" type="email" value={editingClient.contactEmail} onChange={(e) => setEditingClient({...editingClient, contactEmail: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact-phone" className="text-right">Contact Phone</Label>
                          <Input id="contact-phone" type="tel" value={editingClient.contactPhone} onChange={(e) => setEditingClient({...editingClient, contactPhone: e.target.value})} className="col-span-3" />
                        </div>
                        
                        <Separator />

                        <div className="col-span-4 space-y-2">
                            <Label>Client Contacts</Label>
                            <div className="space-y-2">
                                {(editingClient.contactUserIds || []).map(userId => {
                                    const contactUser = mockEmployees.find(e => e.id === userId);
                                    return (
                                        <div key={userId} className="flex items-center justify-between p-2 border rounded-md">
                                            <span>{contactUser?.name || 'Unknown User'}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveContact(userId)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
                                 {(editingClient.contactUserIds || []).length === 0 && (
                                    <p className="text-sm text-muted-foreground px-2">No contacts assigned.</p>
                                )}
                            </div>
                            <Select onValueChange={handleAddContact} value="">
                                <SelectTrigger>
                                    <SelectValue placeholder="Add a user as a contact..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {mockEmployees
                                        .filter(emp => !(editingClient.contactUserIds || []).includes(emp.id))
                                        .map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                      </div>
                    )}
                    <SheetFooter>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <span>{client.contactPerson} (Primary)</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={`mailto:${client.contactEmail}`} className="hover:underline text-primary">{client.contactEmail}</a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={`tel:${client.contactPhone}`} className="hover:underline">{client.contactPhone}</a>
              </div>
              
              <Separator />

              <div>
                <h4 className="font-medium mb-2">Assigned Contacts</h4>
                <div className="space-y-2">
                    {(client.contactUserIds || []).map(userId => {
                        const contactUser = mockEmployees.find(e => e.id === userId);
                        if (!contactUser) return null;
                        return (
                            <div key={userId} className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{contactUser.name}</span>
                            </div>
                        )
                    })}
                    {(client.contactUserIds || []).length === 0 && (
                        <p className="text-muted-foreground">No additional contacts assigned.</p>
                    )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shift History</CardTitle>
              <CardDescription>All shifts associated with {client.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="hidden md:table-cell">Crew Chief</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Details</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientShifts.map(shift => (
                    <TableRow key={shift.id}>
                      <TableCell>{format(new Date(shift.date), 'EEE, MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{shift.location}</TableCell>
                      <TableCell className="hidden md:table-cell">{shift.crewChief.name}</TableCell>
                      <TableCell><Badge variant={getStatusVariant(shift.status)}>{shift.status}</Badge></TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/shifts/${shift.id}`}>View Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                   {clientShifts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No shift history for this client.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
