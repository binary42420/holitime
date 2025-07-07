'use client';

import Link from 'next/link';
import { Button, Card, Text, Title, Container, Group, ThemeIcon, SimpleGrid } from '@mantine/core';
import { Hand, LogIn, Calendar, Users, FileText, Clock, Shield, Phone } from 'lucide-react';

const features = [
  { icon: Calendar, title: 'Schedule Shifts', description: 'Create and manage work shifts for your projects and events.' },
  { icon: Users, title: 'Manage Staff', description: 'Assign workers, track attendance, and manage your workforce.' },
  { icon: FileText, title: 'Approve Timesheets', description: 'Review and approve employee timesheets with digital signatures.' },
  { icon: Clock, title: 'Real-time Tracking', description: 'Monitor clock-ins, breaks, and shift progress in real-time.' },
  { icon: Shield, title: 'Secure Access', description: 'Enterprise-grade security with role-based access controls.' },
  { icon: Phone, title: '24/7 Support', description: 'Get help when you need it with our dedicated support team.' },
];

export function ClientPortalLanding() {
  return (
    <div style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', boxShadow: 'var(--mantine-shadow-sm)' }}>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group>
              <Hand size={32} color="var(--mantine-color-blue-6)" />
              <Title order={3}>Hands On Labor</Title>
            </Group>
            <Button component={Link} href="/login" leftSection={<LogIn size={16} />}>
              Sign In
            </Button>
          </Group>
        </Container>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 0' }}>
        <Container size="xl" style={{ textAlign: 'center' }}>
          <Title order={1} style={{ fontSize: 'clamp(2.5rem, 5vw, 3.75rem)', marginBottom: '1rem' }}>
            Welcome to Your
            <Text component="span" c="blue" inherit> Client Portal</Text>
          </Title>
          <Text size="xl" c="dimmed" style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
            Manage your workforce, schedule shifts, and track timecards all in one place. 
            Our client portal makes it easy to stay on top of your staffing needs.
          </Text>
          
          <Group justify="center" gap="md" mb="xl">
            <Button component={Link} href="/login" size="lg" leftSection={<LogIn size={20} />}>
              Access Your Portal
            </Button>
            <Button component="a" href="tel:619-299-5991" variant="outline" size="lg" leftSection={<Phone size={20} />}>
              Call (619) 299-5991
            </Button>
          </Group>

          <Card withBorder p="lg" radius="md" style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'var(--mantine-color-blue-0)' }}>
            <Text fw={500} c="blue.8">🔒 Secure Login Required</Text>
            <Text size="sm" c="blue.7">
              Contact us at (619) 299-5991 to set up your client portal access or if you need login assistance.
            </Text>
          </Card>
        </Container>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'white' }}>
        <Container size="xl">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <Title order={2} style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
              What You Can Do
            </Title>
            <Text size="xl" c="dimmed" style={{ maxWidth: '700px', margin: '0 auto' }}>
              Our client portal gives you complete control over your staffing operations.
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
            {features.map((feature, index) => (
              <Card key={index} shadow="sm" padding="lg" radius="md" withBorder style={{ textAlign: 'center' }}>
                <ThemeIcon variant="light" size={64} radius="xl" mx="auto" mb="md">
                  <feature.icon size={32} />
                </ThemeIcon>
                <Title order={4}>{feature.title}</Title>
                <Text c="dimmed">{feature.description}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 0', backgroundColor: 'var(--mantine-color-blue-6)', color: 'white' }}>
        <Container size="xl" style={{ textAlign: 'center' }}>
          <Title order={2} style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>
            Ready to Get Started?
          </Title>
          <Text size="xl" style={{ maxWidth: '700px', margin: '0 auto 2rem', color: 'var(--mantine-color-blue-1)' }}>
            Contact us today to set up your client portal access and start managing 
            your workforce more efficiently.
          </Text>
          
          <Group justify="center" gap="md">
            <Button component="a" href="tel:619-299-5991" size="lg" color="gray" variant="filled">
              Call (619) 299-5991
            </Button>
            <Button component={Link} href="/login" size="lg" variant="outline" color="white">
              Sign In to Portal
            </Button>
          </Group>
        </Container>
      </section>

      {/* Footer */}
      <footer style={{ padding: '48px 0', backgroundColor: 'var(--mantine-color-gray-9)', color: 'white' }}>
        <Container size="xl" style={{ textAlign: 'center' }}>
          <Group justify="center" mb="sm">
            <Hand size={24} />
            <Text size="lg" fw={500}>Hands On Labor</Text>
          </Group>
          <Text c="dimmed" mb="sm">
            Professional staffing solutions for your business needs.
          </Text>
          <Text c="dimmed" size="sm">
            © 2024 Hands On Labor. All rights reserved.
          </Text>
        </Container>
      </footer>
    </div>
  );
}
