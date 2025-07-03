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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Plus, Building2, Calendar, ExternalLink, MoreHorizontal, Eye, Briefcase, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateClientUrl } from "@/lib/url-utils"

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function ClientsPage() {
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
              {clientsData?.clients && clientsData.clients.length > 0 ? (
                clientsData.clients.map(client => (
                  <TableRow
                    key={client.id}
                    onClick={() => router.push(generateClientUrl(client.clientCompanyId || client.id))}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{client.companyName || client.name}</TableCell>
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
                              {format(new Date(client.mostRecentUpcomingShift.date), 'MMM d, yyyy')} at {client.mostRecentUpcomingShift.startTime}
                            </Link>
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {client.mostRecentUpcomingShift.jobName}
                          </span>
                          <div className="flex items-center gap-1 text-xs">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              client.mostRecentUpcomingShift.assignedCount >= client.mostRecentUpcomingShift.requestedWorkers
                                ? 'bg-green-100 text-green-800'
                                : client.mostRecentUpcomingShift.assignedCount > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {client.mostRecentUpcomingShift.assignedCount}/{client.mostRecentUpcomingShift.requestedWorkers} workers
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No upcoming shifts</span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(generateClientUrl(client.clientCompanyId || client.id))}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Client Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/admin/jobs/new?clientId=${client.clientCompanyId || client.id}`)}>
                              <Briefcase className="mr-2 h-4 w-4" />
                              Create Job for {client.companyName || client.name}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/shifts/new?clientId=${client.clientCompanyId || client.id}`)}>
                              <Clock className="mr-2 h-4 w-4" />
                              Create Shift for {client.companyName || client.name}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">
                    <h3 className="text-lg font-semibold">No clients found</h3>
                    <p className="text-muted-foreground">
                      Get started by adding your first client.
                    </p>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => router.push('/clients/new')}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Client
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(ClientsPage, hasAdminAccess);
