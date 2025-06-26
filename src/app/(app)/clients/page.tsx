"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { useUser } from "@/hooks/use-user"
import { useClients } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, Calendar, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const canEdit = user?.role === 'Manager/Admin'
  const { toast } = useToast()
  const { data: clientsData, loading, error } = useClients()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading clients: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Clients</h1>
          <p className="text-muted-foreground">
            Manage client companies and view their job history
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => router.push('/clients/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Client Companies
          </CardTitle>
          <CardDescription>
            Overview of all client companies with recent shift activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Recent Completed</TableHead>
                <TableHead>Upcoming Shift</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clientsData?.clients || []).map(client => (
                <TableRow
                  key={client.id}
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contactPerson}</TableCell>
                  <TableCell className="hidden md:table-cell">{client.contactEmail}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {client.mostRecentCompletedShift ? (
                      <div className="flex flex-col gap-1">
                        <Button variant="link" asChild className="p-0 h-auto font-normal justify-start">
                          <Link href={`/shifts/${client.mostRecentCompletedShift.id}`}>
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(client.mostRecentCompletedShift.date), 'MMM d, yyyy')}
                          </Link>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {client.mostRecentCompletedShift.jobName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No completed shifts</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {client.mostRecentUpcomingShift ? (
                      <div className="flex flex-col gap-1">
                        <Button variant="link" asChild className="p-0 h-auto font-normal justify-start">
                          <Link href={`/shifts/${client.mostRecentUpcomingShift.id}`}>
                            <Calendar className="mr-1 h-3 w-3" />
                            {format(new Date(client.mostRecentUpcomingShift.date), 'MMM d, yyyy')}
                          </Link>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {client.mostRecentUpcomingShift.jobName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No upcoming shifts</span>
                    )}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
