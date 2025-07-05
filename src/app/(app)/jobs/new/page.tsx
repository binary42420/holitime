'use client';

import { useState, useEffect } from "react"

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = "force-dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"

interface Client {
  id: string
  name: string
}

export default function NewJobPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const { data: clientsData } = useApi<{ clients: Client[] }>("/api/clients")
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: searchParams.get("clientId") || ""
  })

  // Only managers can create jobs
  if (user?.role !== "Manager/Admin") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to create jobs.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create job")
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Job created successfully",
      })

      router.push(`/jobs/${result.job.id}`)
    } catch (error) {
      console.error("Error creating job:", error)
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleClientChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      clientId: value
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold font-headline">New Job</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
          <CardDescription>
            Enter the details for the new job.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Job Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter job name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select value={formData.clientId} onValueChange={handleClientChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.clients?.map((client) => (
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
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter job description"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.clientId}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
