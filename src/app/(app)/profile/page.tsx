'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings, 
  Bell,
  Camera,
  Save,
  Edit,
  Plus,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { UserProfile, SHIFT_TYPES, TRANSPORTATION_METHODS, WORK_AUTHORIZATION_STATUSES, RELATIONSHIP_TYPES, US_STATES, COMMON_SKILLS, SAFETY_CERTIFICATIONS } from '@/types/profiles'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [newSkill, setNewSkill] = useState('')
  const [newCertification, setNewCertification] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profiles')
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const data = await response.json()
      setProfile(data.profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!profile) return

    try {
      setSaving(true)
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      })

      if (!response.ok) throw new Error('Failed to save profile')

      const data = await response.json()
      setProfile(data.profile)
      setEditing(false)
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (field: string, value: any) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  const updateNotificationPreferences = (field: string, value: any) => {
    if (!profile) return
    setProfile({
      ...profile,
      notification_preferences: {
        ...profile.notification_preferences,
        [field]: value
      }
    })
  }

  const addSkill = () => {
    if (!profile || !newSkill.trim()) return
    const skills = [...profile.skills, newSkill.trim()]
    updateProfile('skills', skills)
    setNewSkill('')
  }

  const removeSkill = (skillToRemove: string) => {
    if (!profile) return
    const skills = profile.skills.filter(skill => skill !== skillToRemove)
    updateProfile('skills', skills)
  }

  const addCertification = () => {
    if (!profile || !newCertification.trim()) return
    const certifications = [...profile.safety_certifications, newCertification.trim()]
    updateProfile('safety_certifications', certifications)
    setNewCertification('')
  }

  const removeCertification = (certToRemove: string) => {
    if (!profile) return
    const certifications = profile.safety_certifications.filter(cert => cert !== certToRemove)
    updateProfile('safety_certifications', certifications)
  }

  const calculateCompletionRate = (): number => {
    if (!profile) return 0
    
    const fields = [
      profile.phone,
      profile.address,
      profile.emergency_contact_name,
      profile.emergency_contact_phone,
      profile.date_of_birth,
      profile.work_authorization_status,
      profile.skills.length > 0,
      profile.transportation_method
    ]
    
    const completed = fields.filter(Boolean).length
    return Math.round((completed / fields.length) * 100)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground">
              Unable to load your profile. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const completionRate = calculateCompletionRate()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">My Profile 👤</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your information
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {editing ? (
              <>
                <Button size="mobile" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="mobile" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button size="mobile" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-First Profile Completion */}
      <Card className="card-mobile">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Profile Completion
          </CardTitle>
          <CardDescription className="text-sm">
            Complete your profile for better job matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 md:gap-4">
            <Progress value={completionRate} className="flex-1 h-3" />
            <span className="text-sm md:text-base font-medium">{completionRate}%</span>
          </div>
          {completionRate < 100 && (
            <p className="text-sm text-muted-foreground mt-2">
              Complete missing fields to reach 100% profile completion
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
          <TabsTrigger value="work">Work Information</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Picture */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profile_picture_url || session?.user?.image || ''} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {editing && (
                  <Button variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={session?.user?.name || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact admin to change your name
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact admin to change your email
                  </p>
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profile.date_of_birth || ''}
                    onChange={(e) => updateProfile('date_of_birth', e.target.value)}
                    disabled={!editing}
                  />
                </div>

                <div>
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={profile.hire_date || ''}
                    onChange={(e) => updateProfile('hire_date', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio || ''}
                  onChange={(e) => updateProfile('bio', e.target.value)}
                  disabled={!editing}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => updateProfile('phone', e.target.value)}
                    disabled={!editing}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="transportation">Transportation</Label>
                  <Select
                    value={profile.transportation_method || ''}
                    onValueChange={(value) => updateProfile('transportation_method', value)}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transportation method" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSPORTATION_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={profile.address || ''}
                  onChange={(e) => updateProfile('address', e.target.value)}
                  disabled={!editing}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city || ''}
                    onChange={(e) => updateProfile('city', e.target.value)}
                    disabled={!editing}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={profile.state || ''}
                    onValueChange={(value) => updateProfile('state', value)}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={profile.zip_code || ''}
                    onChange={(e) => updateProfile('zip_code', e.target.value)}
                    disabled={!editing}
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_name"
                    value={profile.emergency_contact_name || ''}
                    onChange={(e) => updateProfile('emergency_contact_name', e.target.value)}
                    disabled={!editing}
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    value={profile.emergency_contact_phone || ''}
                    onChange={(e) => updateProfile('emergency_contact_phone', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergency_relationship">Relationship</Label>
                <Select
                  value={profile.emergency_contact_relationship || ''}
                  onValueChange={(value) => updateProfile('emergency_contact_relationship', value)}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Authorization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="work_auth">Work Authorization Status</Label>
                <Select
                  value={profile.work_authorization_status || ''}
                  onValueChange={(value) => updateProfile('work_authorization_status', value)}
                  disabled={!editing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select work authorization status" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_AUTHORIZATION_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_tools"
                  checked={profile.has_own_tools}
                  onCheckedChange={(checked) => updateProfile('has_own_tools', !!checked)}
                  disabled={!editing}
                />
                <Label htmlFor="has_tools">I have my own tools</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Certifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      {editing && (
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeSkill(skill)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2 mt-2">
                    <Select value={newSkill} onValueChange={setNewSkill}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_SKILLS.filter(skill => !profile.skills.includes(skill)).map(skill => (
                          <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addSkill} disabled={!newSkill}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Safety Certifications</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.safety_certifications.map((cert, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {cert}
                      {editing && (
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCertification(cert)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2 mt-2">
                    <Select value={newCertification} onValueChange={setNewCertification}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a certification" />
                      </SelectTrigger>
                      <SelectContent>
                        {SAFETY_CERTIFICATIONS.filter(cert => !profile.safety_certifications.includes(cert)).map(cert => (
                          <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addCertification} disabled={!newCertification}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Checkbox
                    checked={profile.notification_preferences.email_notifications}
                    onCheckedChange={(checked) => updateNotificationPreferences('email_notifications', !!checked)}
                    disabled={!editing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Shift Assignments</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new shift assignments</p>
                  </div>
                  <Checkbox
                    checked={profile.notification_preferences.shift_assignments}
                    onCheckedChange={(checked) => updateNotificationPreferences('shift_assignments', !!checked)}
                    disabled={!editing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Shift Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming shifts</p>
                  </div>
                  <Checkbox
                    checked={profile.notification_preferences.shift_reminders}
                    onCheckedChange={(checked) => updateNotificationPreferences('shift_reminders', !!checked)}
                    disabled={!editing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Document Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about pending documents</p>
                  </div>
                  <Checkbox
                    checked={profile.notification_preferences.document_reminders}
                    onCheckedChange={(checked) => updateNotificationPreferences('document_reminders', !!checked)}
                    disabled={!editing}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Messages</Label>
                    <p className="text-sm text-muted-foreground">Receive important system announcements</p>
                  </div>
                  <Checkbox
                    checked={profile.notification_preferences.system_messages}
                    onCheckedChange={(checked) => updateNotificationPreferences('system_messages', !!checked)}
                    disabled={!editing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
