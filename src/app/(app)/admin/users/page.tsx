"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Users,
  Search,
  MoreHorizontal,
  Key,
  UserCog,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function AdminUsersPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const { data: usersData, loading, error, refetch } = useApi<{ users: any[] }>("/api/users")

  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; user: any | null }>({
    open: false,
    user: null
  })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Redirect if not admin
  if (user?.role !== "Manager/Admin") {
    router.push("/dashboard")
    return null
  }

  const users = usersData?.users || []

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.user) return

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return
    }

    setIsResetting(true)

    try {
      const response = await fetch(`/api/users/${resetPasswordDialog.user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reset password")
      }

      toast({
        title: "Password Reset",
        description: `Password has been reset for ${resetPasswordDialog.user.name}.`,
      })

      setResetPasswordDialog({ open: false, user: null })
      setNewPassword("")
      setConfirmPassword("")
      setShowPassword(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
    setConfirmPassword(password)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
    case "Manager/Admin":
      return <Badge variant="destructive"><ShieldCheck className="mr-1 h-3 w-3" />Admin</Badge>
    case "Crew Chief":
      return <Badge variant="default"><Shield className="mr-1 h-3 w-3" />Crew Chief</Badge>
    case "Employee":
      return <Badge variant="secondary"><Users className="mr-1 h-3 w-3" />Employee</Badge>
    case "Client":
      return <Badge variant="outline"><UserCog className="mr-1 h-3 w-3" />Client</Badge>
    default:
      return <Badge variant="outline">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-destructive">Error loading users. Please try again.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and reset passwords
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Search and filter users, reset passwords, and manage accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Manager/Admin">Admin</SelectItem>
                <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
                <SelectItem value="Client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar} alt={u.name} />
                          <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {u.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell>{u.company_name || u.name}</TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </Badge>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setResetPasswordDialog({ open: true, user: u })}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                No users match your current search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetPasswordDialog.open} 
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordDialog({ open: false, user: null })
            setNewPassword("")
            setConfirmPassword("")
            setShowPassword(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for <strong>{resetPasswordDialog.user?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={generateRandomPassword}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Random Password
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetPasswordDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResetting || !newPassword || !confirmPassword}
            >
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default withAuth(AdminUsersPage, hasAdminAccess)
