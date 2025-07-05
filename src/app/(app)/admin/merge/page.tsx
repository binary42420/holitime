'use client';

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Building2,
  Briefcase,
  Search,
  ArrowLeft,
  Merge,
  AlertTriangle,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function AdminMergePage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const { data: usersData, loading: usersLoading, refetch: refetchUsers } = useApi<{ users: any[] }>("/api/users")
  const { data: clientsData, loading: clientsLoading, refetch: refetchClients } = useApi<{ clients: any[] }>("/api/clients")
  const { data: jobsData, loading: jobsLoading, refetch: refetchJobs } = useApi<{ jobs: any[] }>("/api/jobs")

  const [activeTab, setActiveTab] = useState("employees")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [mergeDialog, setMergeDialog] = useState({ open: false, type: "", items: [] as any[] })
  const [mergeData, setMergeData] = useState<any>({})
  const [isMerging, setIsMerging] = useState(false)

  // Redirect if not admin
  if (user?.role !== "Manager/Admin") {
    router.push("/dashboard")
    return null
  }

  const employees = usersData?.users?.filter(u => u.role === "Employee" || u.role === "Crew Chief") || []
  const clients = clientsData?.clients || []
  const jobs = jobsData?.jobs || []

  const getFilteredData = () => {
    let data = []
    switch (activeTab) {
    case "employees":
      data = employees
      break
    case "clients":
      data = clients
      break
    case "jobs":
      data = jobs
      break
    }
    
    return data.filter(item => {
      const searchFields = [
        item.name,
        item.email,
        item.company_name,
        item.contactPerson,
        item.contactEmail,
        item.clientName,
        item.description
      ].filter(Boolean).join(" ").toLowerCase()
      
      return searchFields.includes(searchTerm.toLowerCase())
    })
  }

  const handleItemSelect = (item: any) => {
    if (selectedItems.find(selected => selected.id === item.id)) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id))
    } else if (selectedItems.length < 2) {
      setSelectedItems([...selectedItems, item])
    } else {
      toast({
        title: "Selection Limit",
        description: "You can only select 2 items to merge.",
        variant: "destructive",
      })
    }
  }

  const initiateMerge = () => {
    if (selectedItems.length !== 2) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly 2 items to merge.",
        variant: "destructive",
      })
      return
    }

    // Initialize merge data with the first item's data as default
    const primaryItem = selectedItems[0]
    setMergeData({ ...primaryItem })
    setMergeDialog({ open: true, type: activeTab, items: selectedItems })
  }

  const handleMerge = async () => {
    setIsMerging(true)
    
    try {
      const response = await fetch("/api/admin/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activeTab,
          primaryId: selectedItems[0].id,
          secondaryId: selectedItems[1].id,
          mergedData: mergeData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to merge items")
      }

      const result = await response.json()

      toast({
        title: "Merge Successful",
        description: `Successfully merged ${activeTab}. All data has been consolidated.`,
      })

      // Refresh data and reset state
      if (activeTab === "employees") refetchUsers()
      if (activeTab === "clients") refetchClients()
      if (activeTab === "jobs") refetchJobs()
      
      setSelectedItems([])
      setMergeDialog({ open: false, type: "", items: [] })
      setMergeData({})
    } catch (error) {
      toast({
        title: "Merge Failed",
        description: "Failed to merge items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsMerging(false)
    }
  }

  const renderItemCard = (item: any) => {
    const isSelected = selectedItems.find(selected => selected.id === item.id)
    
    return (
      <Card 
        key={item.id} 
        className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"}`}
        onClick={() => handleItemSelect(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {activeTab === "employees" && (
              <Avatar className="h-10 w-10">
                <AvatarImage src={item.avatar} alt={item.name} />
                <AvatarFallback>{item.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{item.name}</h3>
                {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
              </div>
              
              {activeTab === "employees" && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{item.email}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.role}
                  </Badge>
                </div>
              )}
              
              {activeTab === "clients" && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">{item.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{item.contactEmail}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.jobCount || 0} jobs
                  </Badge>
                </div>
              )}
              
              {activeTab === "jobs" && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{item.clientName}</span>
                  </div>
                  <p className="text-xs truncate">{item.description}</p>
                  <Badge variant="outline" className="text-xs">
                    {item.shiftCount || 0} shifts
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderMergeForm = () => {
    if (!mergeDialog.open) return null

    return (
      <Dialog open={mergeDialog.open} onOpenChange={(open) => {
        if (!open) {
          setMergeDialog({ open: false, type: "", items: [] })
          setMergeData({})
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merge {activeTab}</DialogTitle>
            <DialogDescription>
              Choose which data to keep for the merged record. The secondary record will be deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Show items being merged */}
            <div className="grid grid-cols-2 gap-4">
              {selectedItems.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {index === 0 ? "Primary Record" : "Secondary Record"}
                    {index === 1 && <span className="text-destructive ml-1">(will be deleted)</span>}
                  </Label>
                  <Card className="p-3">
                    <div className="text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">{item.email || item.contactEmail}</div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Merge form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merge-name">Name</Label>
                <Input
                  id="merge-name"
                  value={mergeData.name || ""}
                  onChange={(e) => setMergeData({ ...mergeData, name: e.target.value })}
                />
              </div>

              {activeTab === "employees" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="merge-email">Email</Label>
                    <Input
                      id="merge-email"
                      type="email"
                      value={mergeData.email || ""}
                      onChange={(e) => setMergeData({ ...mergeData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merge-role">Role</Label>
                    <Select value={mergeData.role || ""} onValueChange={(value) => setMergeData({ ...mergeData, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employee">Employee</SelectItem>
                        <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                        <SelectItem value="Manager/Admin">Manager/Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {activeTab === "clients" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="merge-contact-person">Contact Person</Label>
                    <Input
                      id="merge-contact-person"
                      value={mergeData.contactPerson || ""}
                      onChange={(e) => setMergeData({ ...mergeData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merge-contact-email">Contact Email</Label>
                    <Input
                      id="merge-contact-email"
                      type="email"
                      value={mergeData.contactEmail || ""}
                      onChange={(e) => setMergeData({ ...mergeData, contactEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="merge-contact-phone">Contact Phone</Label>
                    <Input
                      id="merge-contact-phone"
                      value={mergeData.contactPhone || ""}
                      onChange={(e) => setMergeData({ ...mergeData, contactPhone: e.target.value })}
                    />
                  </div>
                </>
              )}

              {activeTab === "jobs" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="merge-description">Description</Label>
                    <Textarea
                      id="merge-description"
                      value={mergeData.description || ""}
                      onChange={(e) => setMergeData({ ...mergeData, description: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Warning</div>
                  <div className="text-yellow-700">
                    This action cannot be undone. All shifts, assignments, and related data from the secondary record will be transferred to the primary record, and the secondary record will be permanently deleted.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeDialog({ open: false, type: "", items: [] })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isMerging || !mergeData.name}
            >
              {isMerging ? "Merging..." : "Merge Records"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Merge Duplicates</h1>
          <p className="text-muted-foreground">
            Combine duplicate employees, clients, or jobs to clean up your data
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        setSelectedItems([])
        setSearchTerm("")
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Select 2 {activeTab} to merge</span>
                <Badge variant="outline">
                  {selectedItems.length}/2 selected
                </Badge>
              </CardTitle>
              <CardDescription>
                Click on items to select them. You can merge exactly 2 items at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={initiateMerge}
                  disabled={selectedItems.length !== 2}
                  className="flex items-center gap-2"
                >
                  <Merge className="h-4 w-4" />
                  Merge Selected
                </Button>
              </div>

              {selectedItems.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  {selectedItems.map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getFilteredData().map(renderItemCard)}
          </div>

          {getFilteredData().length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  No {activeTab} found matching your search.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Merge Dialog */}
      {renderMergeForm()}
    </div>
  )
}

export default withAuth(AdminMergePage, hasAdminAccess)
