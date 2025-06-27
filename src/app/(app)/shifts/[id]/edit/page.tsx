'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { useApi } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface EditShiftPageProps {
  params: Promise<{
    id: string
  }>
}

interface User {
  id: string
  name: string
  role: string
}

export default function EditShiftPage({ params }: EditShiftPageProps) {
  const { id } = use(params)
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  
  const { data: shiftData, error } = useApi<{ shift: any }>(`/api/shifts/${id}`)
  const { data: usersData } = useApi<{ users: User[] }>('/api/users')
  
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    crewChiefId: '',
    requestedWorkers: '1',
    notes: ''
  })

  // Only managers can edit shifts
  if (user?.role !== 'Manager/Admin') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to edit shifts.</p>
        </div>
      </div>
    )
  }

  // Populate form when shift data loads
  useEffect(() => {
    if (shiftData?.shift) {
      const shift = shiftData.shift
      setFormData({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        location: shift.location || '',
        crewChiefId: shift.crewChief.id,
        requestedWorkers: shift.requestedWorkers?.toString() || '1',
        notes: shift.notes || ''
      })
    }
  }, [shiftData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          requestedWorkers: parseInt(formData.requestedWorkers)
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update shift')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Shift updated successfully",
      })

      router.push(`/shifts/${id}`)
    } catch (error) {
      console.error('Error updating shift:', error)
      toast({
        title: "Error",
        description: "Failed to update shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/shifts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete shift')
      }

      toast({
        title: "Success",
        description: "Shift deleted successfully",
      })

      router.push('/shifts')
    } catch (error) {
      console.error('Error deleting shift:', error)
      toast({
        title: "Error",
        description: "Failed to delete shift. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(false)
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Shift Not Found</h2>
          <p className="text-muted-foreground">The shift you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  if (!shiftData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Filter crew chiefs
  const crewChiefs = usersData?.users?.filter(u => u.role === 'Crew Chief') || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/shifts/${id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shift
          </Button>
          <h1 className="text-3xl font-bold font-headline">Edit Shift</h1>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleteLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Shift
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this shift? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Information</CardTitle>
          <CardDescription>
            Update the details for this shift.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                onClick={() => router.push(`/shifts/${id}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.crewChiefId || !formData.date || !formData.startTime || !formData.endTime}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Updating...' : 'Update Shift'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
