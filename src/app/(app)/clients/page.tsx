"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { mockClients, mockJobs, mockShifts } from "@/lib/mock-data"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ClientsPage() {
  const { user } = useUser();
  const router = useRouter();
  const canEdit = user.role === 'Manager/Admin';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Clients</h1>
        {canEdit && (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                New Client
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Client</SheetTitle>
                <SheetDescription>
                  Add a new client company to the system. Click save when you're done.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Company Name</Label>
                  <Input id="name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">Address</Label>
                  <Input id="address" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact-person" className="text-right">Contact Person</Label>
                  <Input id="contact-person" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact-email" className="text-right">Contact Email</Label>
                  <Input id="contact-email" type="email" className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact-phone" className="text-right">Contact Phone</Label>
                  <Input id="contact-phone" type="tel" className="col-span-3" />
                </div>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="submit">Save Client</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>Manage your client companies.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead className="hidden md:table-cell">Contact Email</TableHead>
                <TableHead>Recent Shift</TableHead>
                {canEdit && <TableHead><span className="sr-only">Actions</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockClients.map(client => {
                  const clientJobs = mockJobs.filter(j => j.clientId === client.id);
                  const clientJobIds = clientJobs.map(j => j.id);
                  const clientShifts = mockShifts
                    .filter(s => clientJobIds.includes(s.jobId))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const mostRecentShift = clientShifts[0];

                  return (
                    <TableRow 
                      key={client.id}
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.contactPerson}</TableCell>
                      <TableCell className="hidden md:table-cell">{client.contactEmail}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {mostRecentShift ? (
                          <Button variant="link" asChild className="p-0 h-auto font-normal">
                            <Link href={`/shifts/${mostRecentShift.id}`}>
                              {format(new Date(mostRecentShift.date), 'MMM d, yyyy')}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">No shifts</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                                Edit / View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
