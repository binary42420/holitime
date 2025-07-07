"use client"

import React from 'react'
import { Card, Skeleton, Badge, Avatar, Table, Loader, Group, Text, Stack, Progress, Button, Title } from "@mantine/core"
import { Clock, Users, Calendar, MapPin, AlertTriangle } from "lucide-react"

export function LoadingSpinner({ size = "md", className = "" }: { 
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string 
}) {
  return (
    <Loader size={size} className={className} />
  )
}

export function ButtonLoading({ children, loading, ...props }: { 
  children: React.ReactNode
  loading: boolean
  [key: string]: any 
}) {
  return (
    <Button {...props} loading={loading}>
      {children}
    </Button>
  )
}

export function ShiftCardSkeleton() {
  return (
    <Card withBorder radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Stack>
          <Skeleton height={20} width="75%" />
          <Skeleton height={16} width="50%" />
        </Stack>
      </Card.Section>
      <Card.Section p="md">
        <Stack>
          <Group>
            <Clock size={16} />
            <Skeleton height={16} width="50%" />
          </Group>
          <Group>
            <MapPin size={16} />
            <Skeleton height={16} width="75%" />
          </Group>
          <Group>
            <Users size={16} />
            <Skeleton height={16} width="25%" />
            <Skeleton height={16} width="40%" />
          </Group>
          <Group>
            <Skeleton height={32} width="30%" />
            <Skeleton height={32} width="40%" />
          </Group>
        </Stack>
      </Card.Section>
    </Card>
  )
}

export function ShiftsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Stack>
      {Array.from({ length: count }).map((_, i) => (
        <ShiftCardSkeleton key={i} />
      ))}
    </Stack>
  )
}

export function EmployeeAssignmentSkeleton() {
  return (
    <Card withBorder p="md" radius="md">
      <Group justify="space-between">
        <Group>
          <Avatar radius="xl">
            <Skeleton height={40} circle />
          </Avatar>
          <Stack gap={0}>
            <Skeleton height={16} width={120} />
            <Group>
              <Skeleton height={20} width={60} />
              <Skeleton height={16} width={80} />
            </Group>
          </Stack>
        </Group>
        <Group>
          <Skeleton height={32} width={80} />
          <Skeleton height={32} width={100} />
        </Group>
      </Group>
    </Card>
  )
}

export function TimesheetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card withBorder radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Stack>
          <Skeleton height={24} width="40%" />
          <Skeleton height={16} width="60%" />
        </Stack>
      </Card.Section>
      <Card.Section p="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="60%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="60%" /></Table.Th>
              <Table.Th><Skeleton height={16} width="80%" /></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <Table.Tr key={i}>
                <Table.Td>
                  <Group>
                    <Avatar radius="xl">
                      <Skeleton height={32} circle />
                    </Avatar>
                    <Skeleton height={16} width={100} />
                  </Group>
                </Table.Td>
                <Table.Td><Skeleton height={20} width={50} /></Table.Td>
                <Table.Td><Skeleton height={16} width={70} /></Table.Td>
                <Table.Td><Skeleton height={16} width={70} /></Table.Td>
                <Table.Td><Skeleton height={16} width={70} /></Table.Td>
                <Table.Td><Skeleton height={16} width={70} /></Table.Td>
                <Table.Td><Skeleton height={20} width={80} /></Table.Td>
                <Table.Td>
                  <Group>
                    <Skeleton height={32} width={80} />
                    <Skeleton height={32} width={100} />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card.Section>
    </Card>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} withBorder p="md" radius="md">
          <Group justify="space-between">
            <Stack>
              <Skeleton height={16} width={100} />
              <Skeleton height={32} width={70} />
            </Stack>
            <Skeleton height={32} width={32} />
          </Group>
        </Card>
      ))}
    </div>
  )
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  className = "" 
}: { 
  steps: string[]
  currentStep: number
  className?: string 
}) {
  return (
    <Stack className={className}>
      <Group justify="space-between">
        <Text size="sm">Step {currentStep + 1} of {steps.length}</Text>
        <Text size="sm">{Math.round(((currentStep + 1) / steps.length) * 100)}%</Text>
      </Group>
      <Progress value={((currentStep + 1) / steps.length) * 100} />
      <Stack>
        {steps.map((step, index) => (
          <Group key={index}>
            <Badge
              color={index < currentStep ? 'green' : index === currentStep ? 'blue' : 'gray'}
              variant="filled"
              size="lg"
              circle
            >
              {index < currentStep ? '✓' : index + 1}
            </Badge>
            <Text size="sm" c={index <= currentStep ? 'dark' : 'dimmed'}>
              {step}
            </Text>
            {index === currentStep && (
              <Loader size="xs" color="blue" />
            )}
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}

export function InlineLoading({ 
  message = "Loading...", 
  size = "md" 
}: { 
  message?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}) {
  return (
    <Group>
      <Loader size={size} />
      <Text size="sm">{message}</Text>
    </Group>
  )
}

export function PageLoading({ 
  title = "Loading...", 
  description = "Please wait while we load your data." 
}: { 
  title?: string
  description?: string 
}) {
  return (
    <Stack align="center" justify="center" style={{ height: '100vh' }}>
      <Loader size="xl" />
      <Stack align="center" gap={0}>
        <Title order={3}>{title}</Title>
        <Text c="dimmed">{description}</Text>
      </Stack>
    </Stack>
  )
}

export function WorkerRequirementsSkeleton() {
  return (
    <Card withBorder radius="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Skeleton height={24} width="40%" />
        <Skeleton height={16} width="60%" />
      </Card.Section>
      <Card.Section p="md">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} withBorder p="sm" radius="md">
              <Group justify="space-between" mb="sm">
                <Skeleton height={16} width={100} />
                <Skeleton height={20} width={30} />
              </Group>
              <Group justify="center">
                <Skeleton height={32} circle />
                <Skeleton height={16} width={16} />
                <Skeleton height={32} circle />
              </Group>
            </Card>
          ))}
        </div>
      </Card.Section>
    </Card>
  )
}

export function LoadingWithRetry({ 
  onRetry, 
  message = "Loading...", 
  error = false 
}: { 
  onRetry?: () => void
  message?: string
  error?: boolean 
}) {
  if (error && onRetry) {
    return (
      <Stack align="center" p="xl">
        <AlertTriangle size={32} color="red" />
        <Text c="red">Failed to load data</Text>
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      </Stack>
    )
  }

  return (
    <Stack align="center" p="xl">
      <Loader size="lg" />
      <Text c="dimmed">{message}</Text>
    </Stack>
  )
}
