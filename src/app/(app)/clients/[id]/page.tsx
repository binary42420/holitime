
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
import { mockClients, mockShifts, mockJobs } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import type { Shift, Client } from "@/lib/types"
import { ArrowLeft, Building2, Mail, Phone, User, Pencil } from "lucide-react"
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
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingClient(client)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Client</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Edit Client</SheetTitle>
                      <SheetDescription>
                        Make changes to the client's details. Click save when you're done.
                      </SheetDescription>
                    </SheetHeader>
                    {editingClient && (
                      <div className="grid gap-4 py-4">
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
                <span>{client.contactPerson}</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={`mailto:${client.contactEmail}`} className="hover:underline text-primary">{client.contactEmail}</a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <a href={`tel:${client.contactPhone}`} className="hover:underline">{client.contactPhone}</a>
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
