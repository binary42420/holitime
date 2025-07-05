"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  UserCheck, 
  Settings, 
  Save, 
  X, 
  Edit, 
  Plus, 
  UserPlus, 
  Eye, 
  EyeOff, 
  MoreHorizontal,
  Mail,
  Shield,
  Building2,
  User
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import type { User as UserType, UserRole } from "@/lib/types"

type UserFilter = "all" | "employees" | "clients" | "admins" | "crew-chiefs"

interface UsersPageProps {}

function UsersPage({}: UsersPageProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState("")

  // Fetch all users
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useApi<{ users: UserType[] }>("/api/users")
  const users = usersData?.users || []

  // Filter users based on active filter
  const filteredUsers = users.filter(user => {
    switch (activeFilter) {
    case "employees":
      return user.role === "Employee" || user.role === "Crew Chief"
    case "clients":
      return user.role === "Client"
    case "admins":
      return user.role === "Manager/Admin"
    case "crew-chiefs":
      return user.role === "Crew Chief"
    default:
      return true
    }
  })

  // Get counts for each filter
  const getCounts = () => {
    return {
      all: users.length,
      employees: users.filter(u => u.role === "Employee" || u.role === "Crew Chief").length,
      clients: users.filter(u => u.role === "Client").length,
      admins: users.filter(u => u.role === "Manager/Admin").length,
      crewChiefs: users.filter(u => u.role === "Crew Chief").length
    }
  }

  const counts = getCounts()

  const handleSendPasswordReset = async (userId: string, userEmail: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })

      if (response.ok) {
        toast({
          title: "Password Reset Sent",
          description: `Password reset email sent to ${userEmail}`,
        })
      } else {
        throw new Error("Failed to send password reset")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      })
    }
  }

  const handleUserClick = (userId: string) => {
    router.push(`/users/${userId}`)
  }

  const openCreateDialog = () => {
    setShowCreateDialog(true)
    // Generate a random password
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    setGeneratedPassword(password)
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
    case "Manager/Admin":
      return <Shield className="h-4 w-4" />
    case "Client":
      return <Building2 className="h-4 w-4" />
    case "Crew Chief":
      return <UserCheck className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
    case "Manager/Admin":
      return "destructive"
    case "Client":
      return "secondary"
    case "Crew Chief":
      return "default"
    default:
      return "outline"
    }
  }

  if (usersLoading) {
    return <div className="flex justify-center items-center h-64">Loading users...</div>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">User Management 👥</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage workers and permissions
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <Badge variant="outline" className="flex items-center justify-center gap-1 h-10">
              <Users className="h-3 w-3" />
              {users.length} Total Users
            </Badge>
            <Button size="mobile" onClick={openCreateDialog} className="flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-First Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as UserFilter)}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 h-auto p-1">
          <TabsTrigger value="all" className="flex items-center gap-1 md:gap-2 h-10 text-xs md:text-sm">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">All Users</span>
            <span className="md:hidden">All</span>
            <span className="text-xs">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-1 md:gap-2 h-10 text-xs md:text-sm">
            <User className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">Employees</span>
            <span className="md:hidden">Workers</span>
            <span className="text-xs">({counts.employees})</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-1 md:gap-2 h-10 text-xs md:text-sm">
            <Building2 className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">Clients</span>
            <span className="md:hidden">Clients</span>
            <span className="text-xs">({counts.clients})</span>
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-1 md:gap-2 h-10 text-xs md:text-sm">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">Admins</span>
            <span className="md:hidden">Admin</span>
            <span className="text-xs">({counts.admins})</span>
          </TabsTrigger>
          <TabsTrigger value="crew-chiefs" className="flex items-center gap-1 md:gap-2 h-10 text-xs md:text-sm">
            <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden md:inline">Crew Chiefs</span>
            <span className="md:hidden">Chiefs</span>
            <span className="text-xs">({counts.crewChiefs})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-4">
          {/* Mobile-First Users Grid */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="card-mobile cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleUserClick(user.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{user.name}</CardTitle>
                        <CardDescription className="text-sm">{user.email}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(user.id)
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleSendPasswordReset(user.id, user.email)
                        }}>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          setEditingUser(user.id)
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role}
                    </Badge>
                    {user.location && (
                      <span className="text-sm text-muted-foreground">{user.location}</span>
                    )}
                  </div>
                  {(user.role === "Employee" || user.role === "Crew Chief") && (
                    <div className="mt-2 flex gap-2 items-center">
                      {user.crewChiefEligible && (
                        <Badge variant="outline" className="text-xs">Crew Chief</Badge>
                      )}
                      {user.forkOperatorEligible && (
                        <Badge variant="outline" className="text-xs">Forklift</Badge>
                      )}
                      {user.oshaCompliant && (
                        <div className="flex items-center" title="OSHA Compliant">
                          <img
                            src="/images/osha-compliant.svg"
                            alt="OSHA Compliant"
                            className="w-4 h-4"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                No users match the current filter criteria.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system and send them an invitation email.
            </DialogDescription>
          </DialogHeader>
          <CreateUserForm
            onSuccess={() => {
              setShowCreateDialog(false)
              refetchUsers()
            }}
            generatedPassword={generatedPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Create User Form Component
function CreateUserForm({
  onSuccess,
  generatedPassword,
  showPassword,
  setShowPassword
}: {
  onSuccess: () => void
  generatedPassword: string
  showPassword: boolean
  setShowPassword: (show: boolean) => void
}) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Employee" as UserRole,
    location: "",
    companyName: "",
    contactPhone: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          password: generatedPassword
        })
      })

      if (response.ok) {
        toast({
          title: "User Created",
          description: `User ${formData.name} has been created and invited.`,
        })
        onSuccess()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to create user")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employee">Employee</SelectItem>
              <SelectItem value="Crew Chief">Crew Chief</SelectItem>
              <SelectItem value="Manager/Admin">Manager/Admin</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      {formData.role === "Client" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="contactPhone">Phone</Label>
            <Input
              id="contactPhone"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="password">Generated Password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={generatedPassword}
            readOnly
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Creating..." : "Create User & Send Invite"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default UsersPage
