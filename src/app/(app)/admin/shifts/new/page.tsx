"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import {
  Card,
  Button,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
} from "@mantine/core"
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

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function NewShiftPage() {
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
    <Container size="md" py="lg">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin/shifts')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Shifts
            </Button>
            <Title order={1}>Schedule New Shift</Title>
            <Text c="dimmed">Create a new work shift</Text>
          </Stack>
        </Group>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Stack gap="lg">
            <Card withBorder>
              <Card.Section withBorder inheritPadding py="sm">
                <Title order={4}>Shift Information</Title>
                <Text size="sm" c="dimmed">Enter the basic details for the new shift</Text>
              </Card.Section>
              <Card.Section inheritPadding py="md">
                <Stack>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Job"
                        placeholder="Select a job"
                        required
                        data={jobs.map(job => ({
                          value: job.id,
                          label: `${job.name} (${job.clientName})`
                        }))}
                        {...form.register("jobId")}
                        error={form.formState.errors.jobId?.message}
                        searchable
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <Select
                        label="Crew Chief"
                        placeholder="Select crew chief (optional)"
                        data={crewChiefs.map(chief => ({ value: chief.id, label: chief.name }))}
                        {...form.register("crewChiefId")}
                        clearable
                        searchable
                      />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="Date"
                        type="date"
                        required
                        {...form.register("date")}
                        error={form.formState.errors.date?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="Start Time"
                        type="time"
                        required
                        {...form.register("startTime")}
                        error={form.formState.errors.startTime?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <TextInput
                        label="End Time"
                        type="time"
                        required
                        {...form.register("endTime")}
                        error={form.formState.errors.endTime?.message}
                      />
                    </Grid.Col>
                  </Grid>
                  <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                       <NumberInput
                        label="Requested Workers"
                        placeholder="Enter number of workers"
                        required
                        min={1}
                        {...form.register("requestedWorkers", { valueAsNumber: true })}
                        onChange={(value) => form.setValue("requestedWorkers", Number(value))}
                        error={form.formState.errors.requestedWorkers?.message}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                      <TextInput
                        label="Location"
                        placeholder="Enter shift location"
                        required
                        {...form.register("location")}
                        error={form.formState.errors.location?.message}
                      />
                    </Grid.Col>
                  </Grid>
                  <Textarea
                    label="Description"
                    placeholder="Describe the work to be performed"
                    {...form.register("description")}
                    rows={3}
                  />
                  <Textarea
                    label="Requirements"
                    placeholder="Special skills, certifications, or equipment needed"
                    {...form.register("requirements")}
                    rows={3}
                  />
                  <Textarea
                    label="Notes"
                    placeholder="Additional notes or instructions"
                    {...form.register("notes")}
                    rows={3}
                  />
                </Stack>
              </Card.Section>
            </Card>

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => router.push('/admin/shifts')}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} leftSection={<Save size={16} />}>
                Schedule Shift
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  )
}

export default withAuth(NewShiftPage, hasAdminAccess);
