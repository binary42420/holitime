"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { parseClientUrl, generateClientUrl } from "@/lib/url-utils"

const clientSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

interface EditClientPageProps {
  params: Promise<{ company: string }>
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ company: string } | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Resolve params first
  useEffect(() => {
    params.then(setResolvedParams)
  }, [params])

  // Decode URL parameters
  const companySlug = resolvedParams?.company ? decodeURIComponent(resolvedParams.company) : null
  
  // Parse the client URL to get readable names
  const urlData = companySlug ? parseClientUrl(companySlug) : null

  // Fetch client data using the slug parameters
  const { data: clientData, loading, error } = useApi<{ client: any }>(
    resolvedParams ? `/api/clients/by-slug?company=${encodeURIComponent(companySlug!)}` : ''
  )
  
  const client = clientData?.client

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  })

  // Populate form when client data loads
  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || "",
        contactPerson: client.contactPerson || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        notes: client.notes || "",
      })
    }
  }, [client, form])

  const onSubmit = async (data: ClientFormData) => {
    if (!client?.id) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update client')
      }

      toast({
        title: "Client Updated",
        description: "The client information has been updated successfully.",
      })

      // Navigate back to client detail page using the new name if it changed
      const newCompanyName = data.name !== client.name ? data.name : urlData?.companyName
      if (newCompanyName) {
        router.push(generateClientUrl(newCompanyName))
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!resolvedParams || !urlData) {
    return <div>Loading...</div>
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading client details...</div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you're looking for doesn't exist or you don't have permission to edit it.
              </p>
              <Button onClick={() => router.push('/clients')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(generateClientUrl(urlData.companyName))}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Client</h1>
          <p className="text-muted-foreground">Update client information and contact details</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Client Information
            </CardTitle>
            <CardDescription>
              Update the basic information for this client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter company name"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person *</Label>
                <Input
                  id="contactPerson"
                  placeholder="Enter contact person name"
                  {...form.register("contactPerson")}
                />
                {form.formState.errors.contactPerson && (
                  <p className="text-sm text-destructive">{form.formState.errors.contactPerson.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  {...form.register("phone")}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                placeholder="Enter complete address"
                {...form.register("address")}
                rows={3}
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this client"
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
            onClick={() => router.push(generateClientUrl(urlData.companyName))}
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
