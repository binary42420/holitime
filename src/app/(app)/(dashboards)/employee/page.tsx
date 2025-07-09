'use client';

import { useUser } from '@/hooks/use-user';
import QuickStats from '@/components/quick-stats';
import { Button, Card, Text, Title, Stack } from '@mantine/core';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useUser();

  return (
    <Stack gap="lg">
      <Title order={1}>Welcome, {user?.name}!</Title>
      
      <QuickStats />

      <Card withBorder radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Title order={4}>My Shifts</Title>
        </Card.Section>
        <Card.Section p="md">
          <Text mb="md">View your upcoming and past shifts.</Text>
          <Button component={Link} href="/shifts" rightSection={<ArrowRight size={16} />}>
            View My Shifts
          </Button>
        </Card.Section>
      </Card>
    </Stack>
  );
}
