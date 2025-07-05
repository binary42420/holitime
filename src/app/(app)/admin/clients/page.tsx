"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useClients } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Building2,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function AdminClientsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: clientsData, loading, error } = useClients()
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== "Manager/Admin") {
    router.push("/dashboard")
    return null
  }

  const clients = clientsData?.clients || []
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          method: "DELETE",
        })
        
        if (response.ok) {
          toast({
            title: "Client Deleted",
            description: `${clientName} has been successfully deleted.`,
          })
          // Refresh the page or update the data
          window.location.reload()
        } else {
          throw new Error("Failed to delete client")
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete client. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Client Management</h1>
          <p className="text-muted-foreground">Manage client companies and contacts</p>
        </div>
        <Button onClick={() => router.push("/admin/clients/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                All Clients
              </CardTitle>
              <CardDescription>
                {filteredClients.length} of {clients.length} clients
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contactPerson}</TableCell>
                  <TableCell>{client.contactEmail}</TableCell>
                  <TableCell>{client.contactPhone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {client.jobCount || 0} jobs
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/clients/${client.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Client
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClient(client.id, client.name)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(AdminClientsPage, hasAdminAccess)
