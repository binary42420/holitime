'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { useApi } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'

interface Job {
  id: string
  name: string
  client: {
    name: string
  }
}

interface User {
  id: string
  name: string
  role: string
}

export default function NewShiftPage() {
  const { user } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const { data: jobsData } = useApi<{ jobs: Job[] }>('/api/jobs')
  const { data: usersData } = useApi<{ users: User[] }>('/api/users')
  
  const [formData, setFormData] = useState({
    jobId: searchParams.get('jobId') || '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    crewChiefId: '',
    requestedWorkers: '1',
    notes: ''
  })

  // Only managers can create shifts
  if (user?.role !== 'Manager/Admin') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to create shifts.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          requestedWorkers: parseInt(formData.requestedWorkers)
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create shift')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Shift created successfully",
      })

      router.push(`/shifts/${result.shift.id}`)
    } catch (error) {
      console.error('Error creating shift:', error)
      toast({
        title: "Error",
        description: "Failed to create shift. Please try again.",
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

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Filter crew chiefs
  const crewChiefs = usersData?.users?.filter(u => u.role === 'Crew Chief') || []

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
        <h1 className="text-3xl font-bold font-headline">New Shift</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Information</CardTitle>
          <CardDescription>
            Enter the details for the new shift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jobId">Job *</Label>
                <Select value={formData.jobId} onValueChange={handleSelectChange('jobId')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobsData?.jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.client.name} - {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crewChiefId">Crew Chief *</Label>
                <Select value={formData.crewChiefId} onValueChange={handleSelectChange('crewChiefId')} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew chief" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewChiefs.map((chief) => (
                      <SelectItem key={chief.id} value={chief.id}>
                        {chief.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedWorkers">Requested Workers *</Label>
                <Input
                  id="requestedWorkers"
                  name="requestedWorkers"
                  type="number"
                  min="1"
                  value={formData.requestedWorkers}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter shift location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter any additional notes"
                rows={3}
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
                disabled={loading || !formData.jobId || !formData.crewChiefId || !formData.date || !formData.startTime || !formData.endTime}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Shift'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
