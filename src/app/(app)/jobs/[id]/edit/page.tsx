'use client';

import React, { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useJob, useApi } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobEditPageProps {
  params: Promise<{ id: string }>
}

export default function JobEditPage({ params }: JobEditPageProps) {
  const { id } = use(params)
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  // Only managers can edit jobs
  if (user?.role !== "Manager/Admin") {
    router.push("/jobs")
    return null
  }

  const { data: jobData, loading: jobLoading, error: jobError } = useJob(id)
  const { data: clientsData, loading: clientsLoading } = useApi<{ clients: any[] }>("/api/clients")
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when job loads
  React.useEffect(() => {
    if (jobData?.job) {
      setFormData({
        name: jobData.job.name || "",
        description: jobData.job.description || "",
        clientId: jobData.job.clientId || ""
      })
    }
  }, [jobData])

  if (jobLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading job details...</div>
      </div>
    )
  }

  if (jobError || !jobData?.job) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading job details</div>
      </div>
    )
  }

  const job = jobData.job
  const clients = clientsData?.clients || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update job")
      }

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Job updated successfully",
        })
        router.push(`/jobs/${id}`)
      } else {
        throw new Error(result.error || "Failed to update job")
      }
    } catch (error) {
      console.error("Error updating job:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update job",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Job</h1>
          <p className="text-muted-foreground">Update job details and settings</p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Details
          </CardTitle>
          <CardDescription>
            Update the job information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Job Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter job name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter job description (optional)"
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Job"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/jobs/${id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
