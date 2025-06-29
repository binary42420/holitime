"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { parseShiftUrl, generateShiftUrl } from "@/lib/url-utils"
import WorkerTypeSelector from "@/components/worker-type-selector"

const shiftSchema = z.object({
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

interface EditShiftPageProps {
  params: Promise<{ company: string; job: string; date: string; shiftId: string }>
}

export default function EditShiftPage({ params }: EditShiftPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ company: string; job: string; date: string; shiftId: string } | null>(null)
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  // Resolve params first
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Decode URL parameters
  const companySlug = resolvedParams?.company ? decodeURIComponent(resolvedParams.company) : null
  const jobSlug = resolvedParams?.job ? decodeURIComponent(resolvedParams.job) : null
  const dateSlug = resolvedParams?.date ? decodeURIComponent(resolvedParams.date) : null
  const shiftIdSlug = resolvedParams?.shiftId ? decodeURIComponent(resolvedParams.shiftId) : null

  // Parse the shift URL to get readable names and shift details
  const urlData = companySlug && jobSlug && dateSlug && shiftIdSlug 
    ? parseShiftUrl(companySlug, jobSlug, dateSlug, shiftIdSlug)
    : null

  // Fetch shift data using the slug parameters
  const { data: shiftData, loading: shiftLoading, error: shiftError } = useApi<{ shift: any }>(
    resolvedParams ? `/api/shifts/by-slug?company=${encodeURIComponent(companySlug!)}&job=${encodeURIComponent(jobSlug!)}&date=${encodeURIComponent(dateSlug!)}&startTime=${encodeURIComponent(urlData?.startTime || '')}&sequence=${urlData?.sequence || 1}` : ''
  )
  
  const shift = shiftData?.shift
  const shiftId = shift?.id

  // Fetch users for crew chief selection
  const { data: usersData } = useApi<{ users: any[] }>('/api/users')
  const users = usersData?.users || []

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      requestedWorkers: 1,
      workerRequirements: [],
    },
  })

  const [workerRequirements, setWorkerRequirements] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleWorkerRequirementsChange = (requirements: any[], totalCount: number) => {
    setWorkerRequirements(requirements)
    form.setValue('requestedWorkers', totalCount)
    form.setValue('workerRequirements', requirements)
  }

  // Populate form when shift data loads
  useEffect(() => {
    if (shift) {
      form.reset({
        date: shift.date ? new Date(shift.date).toISOString().split('T')[0] : '',
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        requestedWorkers: shift.requestedWorkers || 1,
        crewChiefId: shift.crewChiefId || '',
        location: shift.location || '',
        description: shift.description || '',
        requirements: shift.requirements || '',
        notes: shift.notes || '',
      })
    }
  }, [shift, form])

  const onSubmit = async (data: ShiftFormData) => {
    if (!shiftId) return

    setIsSubmitting(true)
    try {
      // Handle "none" value for crew chief
      const submitData = {
        ...data,
        crewChiefId: data.crewChiefId === 'none' ? '' : data.crewChiefId
      }

      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        throw new Error('Failed to update shift')
      }

      toast({
        title: "Shift Updated",
        description: "The shift has been updated successfully.",
      })

      // Navigate back to shift detail page
      if (urlData) {
        router.push(generateShiftUrl(urlData.companyName, urlData.jobName, urlData.date, urlData.startTime, urlData.sequence))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!resolvedParams || !urlData) {
    return <div>Loading...</div>
  }

  if (shiftLoading) {
    return <div>Loading shift details...</div>
  }

  if (shiftError || !shift) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Shift Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The shift you're looking for doesn't exist or you don't have permission to edit it.
              </p>
              <Button onClick={() => router.push('/shifts')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Shifts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push(generateShiftUrl(urlData.companyName, urlData.jobName, urlData.date, urlData.startTime, urlData.sequence))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shift
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Shift</h1>
            <p className="text-muted-foreground">
              {shift.clientName} • {shift.jobName} • {new Date(shift.date).toLocaleDateString()}
              {urlData.sequence > 1 && <span className="ml-1">(#{urlData.sequence})</span>}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
            <CardDescription>
              Update the basic information for this shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="Enter shift location"
                  {...form.register("location")}
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="crewChiefId">Crew Chief</Label>
                <Select onValueChange={(value) => form.setValue("crewChiefId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crew chief" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No crew chief assigned</SelectItem>
                    {users
                      .filter(user => user.id && user.id.trim() !== '')
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worker Requirements */}
        <WorkerTypeSelector
          value={workerRequirements}
          onChange={handleWorkerRequirementsChange}
        />

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work to be performed"
                {...form.register("description")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="Special requirements, certifications, or equipment needed"
                {...form.register("requirements")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments"
                {...form.register("notes")}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(generateShiftUrl(urlData.companyName, urlData.jobName, urlData.date, urlData.startTime, urlData.sequence))}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
