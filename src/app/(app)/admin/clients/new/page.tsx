"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, Button, TextInput, Textarea, Group, Text, Title, Stack } from "@mantine/core"
import { ArrowLeft, Building2, Save } from "lucide-react"
import { notifications } from "@mantine/notifications"

function NewClientPage() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
  })

  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await response.json()
        notifications.show({
          title: "Client Created",
          message: `${formData.name} has been successfully added.`,
          color: 'green'
        })
        router.push('/admin/clients')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create client')
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create client",
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack gap="lg">
      <Group>
        <Button variant="subtle" onClick={() => router.push('/admin/clients')} leftSection={<ArrowLeft size={16} />}>
          Back to Clients
        </Button>
        <div>
          <Title order={1}>Add New Client</Title>
          <Text c="dimmed">Create a new client company record</Text>
        </div>
      </Group>

      <Card withBorder radius="md" style={{ maxWidth: '800px' }}>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <Building2 size={20} />
            <Title order={4}>Client Information</Title>
          </Group>
          <Text size="sm" c="dimmed">
            Enter the details for the new client company
          </Text>
        </Card.Section>
        <Card.Section p="md">
          <form onSubmit={handleSubmit}>
            <Stack>
              <Group grow>
                <TextInput
                  label="Company Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  required
                />
                <TextInput
                  label="Contact Person"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Enter contact person name"
                  required
                />
              </Group>

              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter company address"
                rows={3}
              />

              <Group grow>
                <TextInput
                  label="Contact Email"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  placeholder="Enter contact email"
                  required
                />
                <TextInput
                  label="Contact Phone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="Enter contact phone"
                />
              </Group>

              <Group mt="md">
                <Button type="submit" loading={loading} leftSection={<Save size={16} />}>
                  Create Client
                </Button>
                <Button 
                  type="button" 
                  variant="default" 
                  onClick={() => router.push('/admin/clients')}
                >
                  Cancel
                </Button>
              </Group>
            </Stack>
          </form>
        </Card.Section>
      </Card>
    </Stack>
  )
}

export default NewClientPage;
