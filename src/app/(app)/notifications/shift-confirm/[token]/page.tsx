'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  MapPin,
  User,
  Building,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ShiftDetails {
  notification_id: number
  shift_id: number
  user_id: string
  title: string
  data: {
    shift_details: {
      jobName: string
      clientName: string
      date: string
      startTime: string
      endTime: string
      location: string
      role: string
      workerName: string
    }
  }
  user_name: string
  user_email: string
}

export default function ShiftConfirmPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [shiftDetails, setShiftDetails] = useState<ShiftDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [hasResponded, setHasResponded] = useState(false)

  const token = params.token as string

  useEffect(() => {
    fetchShiftDetails()
  }, [token])

  const fetchShiftDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications/shift-details?token=${token}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/notifications/expired')
          return
        }
        throw new Error('Failed to fetch shift details')
      }
      
      const data = await response.json()
      setShiftDetails(data.shift)
      setHasResponded(data.has_responded)
    } catch (error) {
      console.error('Error fetching shift details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shift details',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const respondToShift = async (response: 'accept' | 'decline') => {
    try {
      setResponding(true)
      
      const apiResponse = await fetch('/api/notifications/shift-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          response,
          message: responseMessage.trim() || undefined
        })
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || 'Failed to submit response')
      }

      toast({
        title: 'Success',
        description: `Shift ${response}ed successfully`,
        variant: response === 'accept' ? 'default' : 'destructive'
      })

      setHasResponded(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/notifications')
      }, 3000)
    } catch (error) {
      console.error('Error responding to shift:', error)
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to submit response',
        variant: 'destructive'
      })
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading shift details...</p>
        </div>
      </div>
    )
  }

  if (!shiftDetails) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Shift Not Found</h2>
            <p className="text-muted-foreground">
              The shift assignment could not be found or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasResponded) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Response Recorded</h2>
            <p className="text-muted-foreground">
              You have already responded to this shift assignment.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/notifications')}
            >
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const shift = shiftDetails.data.shift_details

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Shift Assignment Confirmation</h1>
          <p className="text-muted-foreground mt-2">
            Please confirm your availability for this shift
          </p>
        </div>

        {/* Shift Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {shift.jobName}
            </CardTitle>
            <CardDescription>
              Assigned to: {shift.workerName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Client</p>
                  <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-sm text-muted-foreground">{shift.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(shift.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{shift.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Response</CardTitle>
            <CardDescription>
              Please confirm whether you can work this shift
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="message">Additional Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add any comments or questions about this shift..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => respondToShift('accept')}
                disabled={responding}
                className="flex-1"
                size="lg"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {responding ? 'Submitting...' : 'Accept Shift'}
              </Button>

              <Button
                onClick={() => respondToShift('decline')}
                disabled={responding}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {responding ? 'Submitting...' : 'Decline Shift'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Your response will be recorded and your manager will be notified.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
