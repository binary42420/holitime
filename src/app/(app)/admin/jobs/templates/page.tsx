"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Input } from "@/app/(app)/components/ui/input"
import { 
  ArrowLeft, 
  Plus, 
  Search,
  Copy,
  Edit,
  Trash2,
  FileText,
  Building2,
  MapPin,
  Users
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock data for job templates
const mockTemplates = [
  {
    id: "1",
    name: "Warehouse Loading",
    description: "Standard warehouse loading and unloading operations",
    category: "Warehouse",
    requiredWorkers: 4,
    duration: "8 hours",
    skills: ["Forklift Operation", "Heavy Lifting"],
    location: "Warehouse District",
    usageCount: 15,
  },
  {
    id: "2", 
    name: "Construction Site Cleanup",
    description: "Post-construction cleanup and debris removal",
    category: "Construction",
    requiredWorkers: 6,
    duration: "10 hours",
    skills: ["Construction Experience", "Safety Certification"],
    location: "Various Construction Sites",
    usageCount: 8,
  },
  {
    id: "3",
    name: "Event Setup",
    description: "Event venue setup and breakdown",
    category: "Events",
    requiredWorkers: 3,
    duration: "6 hours", 
    skills: ["Event Experience", "Customer Service"],
    location: "Event Venues",
    usageCount: 22,
  },
]

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function JobTemplatesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== "Manager/Admin") {
    router.push("/dashboard")
    return null
  }

  const filteredTemplates = mockTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUseTemplate = (template: any) => {
    // Navigate to new job page with template data pre-filled
    const queryParams = new URLSearchParams({
      template: template.id,
      name: template.name,
      description: template.description,
      location: template.location,
    })
    router.push(`/admin/jobs/new?${queryParams.toString()}`)
  }

  const handleEditTemplate = (templateId: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Template editing will be available in a future update.",
    })
  }

  const handleDeleteTemplate = (templateId: string) => {
    toast({
      title: "Feature Coming Soon", 
      description: "Template deletion will be available in a future update.",
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      "Warehouse": "default",
      "Construction": "secondary",
      "Events": "outline",
    }
    return colors[category] || "default"
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/jobs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Job Templates</h1>
          <p className="text-muted-foreground">Pre-configured job templates for quick job creation</p>
        </div>
        <Button onClick={() => toast({ title: "Feature Coming Soon", description: "Custom template creation will be available soon." })}>
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Templates
          </CardTitle>
          <CardDescription>
            Choose from pre-configured job templates to quickly create new jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No templates match your search criteria." : "No job templates available."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={getCategoryColor(template.category)} className="mt-1">
                          {template.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used {template.usageCount} times
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{template.requiredWorkers} workers • {template.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{template.location}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Required Skills:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(JobTemplatesPage, hasAdminAccess)
