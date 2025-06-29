"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Calendar, Users, Building2, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShiftUrl } from "@/lib/url-utils"
import WorkerTypeSelector from "@/components/worker-type-selector"

const shiftSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  requestedWorkers: z.number().min(1, "At least 1 worker is required"),
  crewChiefId: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  description: z.string().optional(),
  requirements: z.string().optional(),
  notes: z.string().optional(),
  workerRequirements: z.array(z.object({
    roleCode: z.string(),
    roleName: z.string(),
    count: z.number(),
    color: z.string()
  })).optional(),
})

type ShiftFormData = z.infer<typeof shiftSchema>

export default function NewShiftPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { data: jobsData } = useApi<{ jobs: any[] }>('/api/jobs')
  const { data: usersData } = useApi<{ users: any[] }>('/api/users')

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      requestedWorkers: 1,
      workerRequirements: [],
    },
  })

  const [workerRequirements, setWorkerRequirements] = useState<any[]>([])

  const handleWorkerRequirementsChange = (requirements: any[], totalCount: number) => {
    setWorkerRequirements(requirements)
    form.setValue('requestedWorkers', totalCount)
    form.setValue('workerRequirements', requirements)
  }

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create shift')
      }

      const result = await response.json()
      
      toast({
        title: "Shift Scheduled",
        description: "The shift has been scheduled successfully.",
      })

      router.push(generateShiftUrl(result.shift.clientName, result.shift.jobName, result.shift.date, result.shift.startTime))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const jobs = jobsData?.jobs || []
  const crewChiefs = usersData?.users?.filter(user => 
    user.role === 'Crew Chief' || user.role === 'Manager/Admin'
  ) || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/shifts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shifts
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Schedule New Shift</h1>
          <p className="text-muted-foreground">Create a new work shift</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Shift Information</CardTitle>
            <CardDescription>
              Enter the basic details for the new shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job">Job *</Label>
                <Select onValueChange={(value) => form.setValue("jobId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs
                      .filter(job => job.id && job.id.trim() !== '')
                      .map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{job.name}</div>
                            <div className="text-sm text-muted-foreground">{job.clientName}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.jobId && (
                  <p className="text-sm text-destructive">{form.formState.errors.jobId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="crewChief">Crew Chief</Label>
                <Select onValueChange={(value) => form.setValue("crewChiefId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew chief (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {crewChiefs
                      .filter(chief => chief.id && chief.id.trim() !== '')
                      .map((chief) => (
                      <SelectItem key={chief.id} value={chief.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {chief.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register("date")}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register("startTime")}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.startTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...form.register("endTime")}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="requestedWorkers">Requested Workers *</Label>
                <Input
                  id="requestedWorkers"
                  type="number"
                  min="1"
                  {...form.register("requestedWorkers", { valueAsNumber: true })}
                />
                {form.formState.errors.requestedWorkers && (
                  <p className="text-sm text-destructive">{form.formState.errors.requestedWorkers.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  {...form.register("location")}
                  placeholder="Enter shift location"
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe the work to be performed"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                {...form.register("requirements")}
                placeholder="Special skills, certifications, or equipment needed"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes or instructions"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/shifts')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Scheduling...' : 'Schedule Shift'}
          </Button>
        </div>
      </form>
    </div>
  )
}
