'use client'

import { useState, useEffect } from 'react'

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { useApi } from '@/hooks/use-api'
import { Button } from '@mantine/core'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { Client } from '@/lib/types'; // Import Client type

//*******************************************************************\\
//=======  New Job Page - Main Component  ==========================\\
//*******************************************************************\\

export default function NewJobPage() {
  //***************************\\
  //=======  Hooks  ===========\\
  //***************************\\
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // Fetch clients data from the API
  const { data: clientsData } = useApi<{ clients: Client[] }>('/api/clients')
  
  //*********************************\\
  //=======  State Management  =======\\
  //*********************************\\
  const [loading, setLoading] = useState(false)
  // Form data for new job creation
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: searchParams.get('clientId') || '' // Pre-fill clientId if available from URL
  })

  //*********************************\\
  //=======  Access Control  =========\\
  //*********************************\\
  // Only users with 'Manager/Admin' role can create jobs
  if (user?.role !== 'Manager/Admin') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to create jobs.</p>
        </div>
      </div>
    )
  }

  //*********************************\\
  //=======  Event Handlers  =========\\
  //*********************************\\
  // Handles form submission for creating a new job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true) // Set loading state to true during submission

    try {
      // Send POST request to the API to create a new job
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        // Throw an error if the API call failed
        throw new Error('Failed to create job')
      }

      const result = await response.json()
      
      // Display success toast notification
      toast({
        title: "Success",
        description: "Job created successfully",
      })

      // Redirect to the newly created job's detail page
      router.push(`/jobs/${result.job.id}`)
    } catch (error) {
      // Catch and handle any errors during the creation process
      console.error('Error creating job:', error)
      toast({
        title: "Error",
        description: "Failed to create job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false) // Reset loading state
    }
  }

  // Handles changes in input and textarea fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handles changes in the client selection dropdown
  const handleClientChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      clientId: value
    }))
  }

  //***************************\\
  //=======  Render UI  =========\\
  //***************************\\
  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {/* Page Title */}
        <h1 className="text-3xl font-bold font-headline">New Job</h1>
      </div>

      {/* Job Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Job Information</CardTitle>
          <CardDescription>
            Enter the details for the new job.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* New Job Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Name Input */}
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

              {/* Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select value={formData.clientId} onValueChange={handleClientChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Map through clients data to populate select options */}
                    {clientsData?.clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description Textarea */}
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              {/* Create Job Button */}
              <Button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.clientId}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Job'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
