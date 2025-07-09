"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import {
  Card,
  Button,
  Badge,
  TextInput,
  Group,
  Stack,
  Title,
  Text,
  Container,
  Grid,
  ActionIcon,
  Center,
} from "@mantine/core"
import { 
  ArrowLeft, 
  Plus, 
  Search,
  Copy,
  Edit,
  Trash2,
  FileText,
  MapPin,
  Users
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface JobTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredWorkers: number;
  duration: string;
  skills: string[];
  location: string;
  usageCount: number;
}

const mockTemplates: JobTemplate[] = [
  {
    id: "1",
    name: "Warehouse Loading",
    description: "Standard warehouse loading and unloading operations",
    category: "Warehouse",
    requiredWorkers: 4,
    duration: "8 hours",
    skills: ["Forklift Operation", "Heavy Lifting"],
    location: "Warehouse District",
    usageCount: 15,
  },
  {
    id: "2", 
    name: "Construction Site Cleanup",
    description: "Post-construction cleanup and debris removal",
    category: "Construction",
    requiredWorkers: 6,
    duration: "10 hours",
    skills: ["Construction Experience", "Safety Certification"],
    location: "Various Construction Sites",
    usageCount: 8,
  },
  {
    id: "3",
    name: "Event Setup",
    description: "Event venue setup and breakdown",
    category: "Events",
    requiredWorkers: 3,
    duration: "6 hours", 
    skills: ["Event Experience", "Customer Service"],
    location: "Event Venues",
    usageCount: 22,
  },
]

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function JobTemplatesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const filteredTemplates = mockTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUseTemplate = (template: JobTemplate) => {
    // Navigate to new job page with template data pre-filled
    const queryParams = new URLSearchParams({
      template: template.id,
      name: template.name,
      description: template.description,
      location: template.location,
    })
    router.push(`/admin/jobs/new?${queryParams.toString()}`)
  }

  const handleEditTemplate = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Template editing will be available in a future update.",
    })
  }

  const handleDeleteTemplate = () => {
    toast({
      title: "Feature Coming Soon", 
      description: "Template deletion will be available in a future update.",
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Warehouse': 'blue',
      'Construction': 'orange',
      'Events': 'grape',
    }
    return colors[category] || 'gray'
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Button
              variant="subtle"
              leftSection={<ArrowLeft size={16} />}
              onClick={() => router.push('/admin/jobs')}
              size="sm"
              styles={{ inner: { justifyContent: 'left' }, root: { paddingLeft: 0 } }}
            >
              Back to Jobs
            </Button>
            <Title order={1}>Job Templates</Title>
            <Text c="dimmed">Pre-configured job templates for quick job creation</Text>
          </Stack>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => toast({ title: "Feature Coming Soon", description: "Custom template creation will be available soon." })}
          >
            Create Template
          </Button>
        </Group>

        <Card withBorder>
          <Card.Section withBorder inheritPadding py="sm">
            <Group justify="space-between">
              <Stack gap={0}>
                <Title order={4}>Available Templates</Title>
                <Text size="sm" c="dimmed">Choose from pre-configured job templates to quickly create new jobs</Text>
              </Stack>
              <TextInput
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftSection={<Search size={16} />}
                style={{ width: 300 }}
              />
            </Group>
          </Card.Section>
          <Card.Section inheritPadding py="md">
            {filteredTemplates.length === 0 ? (
              <Center style={{ height: 200, flexDirection: 'column' }}>
                <FileText size={48} style={{ marginBottom: 16 }} />
                <Title order={3}>No Templates Found</Title>
                <Text c="dimmed">
                  {searchTerm ? 'No templates match your search criteria.' : 'No job templates available.'}
                </Text>
              </Center>
            ) : (
              <Grid>
                {filteredTemplates.map((template) => (
                  <Grid.Col key={template.id} span={{ base: 12, md: 6, lg: 4 }}>
                    <Card withBorder style={{ height: '100%' }}>
                      <Stack justify="space-between" style={{ height: '100%' }}>
                        <Stack>
                          <Group justify="space-between">
                            <Stack gap={0}>
                              <Title order={5}>{template.name}</Title>
                              <Badge color={getCategoryColor(template.category)} size="sm">
                                {template.category}
                              </Badge>
                            </Stack>
                            <Text size="xs" c="dimmed">
                              Used {template.usageCount} times
                            </Text>
                          </Group>
                          <Text size="sm" c="dimmed">
                            {template.description}
                          </Text>
                          <Stack gap="xs" mt="md">
                            <Group gap="xs">
                              <Users size={16} />
                              <Text size="sm">{template.requiredWorkers} workers • {template.duration}</Text>
                            </Group>
                            <Group gap="xs">
                              <MapPin size={16} />
                              <Text size="sm">{template.location}</Text>
                            </Group>
                          </Stack>
                          <Stack gap="xs" mt="md">
                            <Text size="sm" fw={500}>Required Skills:</Text>
                            <Group gap="xs">
                              {template.skills.map((skill, index) => (
                                <Badge key={index} variant="outline" size="sm">
                                  {skill}
                                </Badge>
                              ))}
                            </Group>
                          </Stack>
                        </Stack>
                        <Group grow mt="md">
                          <Button
                            leftSection={<Copy size={16} />}
                            onClick={() => handleUseTemplate(template)}
                          >
                            Use Template
                          </Button>
                          <ActionIcon variant="default" onClick={() => handleEditTemplate(template.id)}>
                            <Edit size={16} />
                          </ActionIcon>
                          <ActionIcon variant="default" color="red" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Card.Section>
        </Card>
      </Stack>
    </Container>
  )
}

export default withAuth(JobTemplatesPage, hasAdminAccess);
