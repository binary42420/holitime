'use client';

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/app/(app)/components/ui/button"
import { Input } from "@/app/(app)/components/ui/input"
import { Label } from "@/app/(app)/components/ui/label"
import { Textarea } from "@/app/(app)/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import { LogoUpload } from "@/app/(app)/components/ui/logo-upload"

import { withAuth } from "@/lib/with-auth"
import { hasAdminAccess } from "@/lib/auth"

function NewClientPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: ""
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Only managers can create clients
  if (user?.role !== "Manager/Admin") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to create clients.</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // First create the client
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create client")
      }

      const result = await response.json()
      const clientId = result.client.id

      // Upload logo if provided
      let finalLogoUrl = null
      if (logoFile) {
        const logoFormData = new FormData()
        logoFormData.append("logo", logoFile)
        logoFormData.append("clientId", clientId)

        const logoResponse = await fetch("/api/upload/logo", {
          method: "POST",
          body: logoFormData,
        })

        if (logoResponse.ok) {
          const logoResult = await logoResponse.json()
          finalLogoUrl = logoResult.logoUrl

          // Update client with logo URL
          await fetch(`/api/clients/${clientId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ logoUrl: finalLogoUrl }),
          })
        }
      }

      toast({
        title: "Success",
        description: "Client created successfully",
      })

      router.push(`/clients/${clientId}`)
    } catch (error) {
      console.error("Error creating client:", error)
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="mobile"
          onClick={() => router.back()}
          className="self-start -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold font-headline">New Client 🏢</h1>
      </div>

      {/* Mobile-First Form */}
      <Card className="card-mobile">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Client Information</CardTitle>
          <CardDescription className="text-sm">
            Enter the details for the new client company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Mobile-First Form Grid */}
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium">Company Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className="h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson" className="text-base font-medium">Contact Person</Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-base font-medium">Contact Email</Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="Enter contact email"
                  className="h-12 text-base"
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

            {/* Company Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <LogoUpload
                companyName={formData.name || "New Company"}
                currentLogoUrl={logoUrl}
                onLogoChange={setLogoFile}
                onLogoRemove={() => {
                  setLogoFile(null)
                  setLogoUrl(null)
                }}
                disabled={loading}
              />
            </div>

            {/* Mobile-First Action Buttons */}
            <div className="flex flex-col md:flex-row md:justify-end gap-3 md:gap-4">
              <Button
                type="button"
                variant="outline"
                size="mobile"
                onClick={() => router.back()}
                disabled={loading}
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="mobile"
                disabled={loading || !formData.name.trim()}
                className="w-full md:w-auto flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(NewClientPage, hasAdminAccess)
