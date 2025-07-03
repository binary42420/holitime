'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'
import { useApi } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { LogoUpload } from '@/components/ui/logo-upload'
import { CompanyLogo } from '@/components/ui/company-logo'

interface ClientEditPageProps {
  params: Promise<{ id: string }>
}

export default function ClientEditPage({ params }: ClientEditPageProps) {
  const [clientId, setClientId] = useState<string>('')

  useEffect(() => {
    params.then(({ id }) => setClientId(id))
  }, [params])
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Only managers can edit clients
  if (user?.role !== 'Manager/Admin') {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to edit clients.</p>
        </div>
      </div>
    )
  }

  const { data: clientData, loading: clientLoading, error: clientError } = useApi<{ client: any }>(
    clientId ? `/api/clients/${clientId}` : null
  )

  const client = clientData?.client

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    notes: ''
  })
  
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Update form data when client data loads
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.companyName || client.name || '',
        address: client.companyAddress || client.address || '',
        contactPerson: client.contactPerson || '',
        contactEmail: client.contactEmail || client.email || '',
        contactPhone: client.contactPhone || client.phone || '',
        notes: client.notes || ''
      })
      setLogoUrl(client.clientCompany?.logoUrl || client.logoUrl || null)
    }
  }, [client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload logo if a new one was selected
      let finalLogoUrl = logoUrl
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append('logo', logoFile)
        logoFormData.append('clientId', clientId)

        const logoResponse = await fetch('/api/upload/logo', {
          method: 'POST',
          body: logoFormData,
        })

        if (logoResponse.ok) {
          const logoResult = await logoResponse.json()
          finalLogoUrl = logoResult.logoUrl
        }
      }

      // Update client data
      const updateData = {
        ...formData,
        logoUrl: finalLogoUrl
      }

      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('Failed to update client')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Client updated successfully",
      })

      router.push(`/clients/${clientId}`)
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
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

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Client Not Found</h2>
          <p className="text-muted-foreground">The requested client could not be found.</p>
          <Button onClick={() => router.push('/clients')} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/clients/${clientId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">Edit Client</h1>
          <p className="text-muted-foreground">Update client company information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CompanyLogo
              companyName={formData.name || 'Client Company'}
              logoUrl={logoUrl}
              size="md"
            />
            Client Information
          </CardTitle>
          <CardDescription>
            Update the details for this client company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter company address"
                rows={3}
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

            {/* Company Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <LogoUpload
                companyName={formData.name || 'Client Company'}
                currentLogoUrl={logoUrl}
                onLogoChange={setLogoFile}
                onLogoRemove={() => {
                  setLogoFile(null)
                  setLogoUrl(null)
                }}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/clients/${clientId}`)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Updating...' : 'Update Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
