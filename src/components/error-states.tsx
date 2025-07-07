'use client'

import { Card, Button, Alert, Group, Text, Title, Stack } from '@mantine/core'
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  FileX,
  WifiOff,
  Shield,
  Clock
} from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "An unexpected error occurred. Please try again.",
  action,
  type = 'error',
  className = ''
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return AlertTriangle
      case 'info':
        return Clock
      default:
        return XCircle
    }
  }

  const getColors = () => {
    switch (type) {
      case 'warning':
        return 'yellow'
      case 'info':
        return 'blue'
      default:
        return 'red'
    }
  }

  const Icon = getIcon()

  return (
    <div className={className}>
      <Card withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <Icon size={48} color={`var(--mantine-color-${getColors()}-6)`} />
          <Stack align="center" gap={0}>
            <Title order={3}>{title}</Title>
            <Text c="dimmed">{description}</Text>
          </Stack>
          {action && (
            <Button onClick={action.onClick} leftSection={<RefreshCw size={16} />}>
              {action.label}
            </Button>
          )}
        </Stack>
      </Card>
    </div>
  )
}

interface NotFoundStateProps {
  title?: string
  description?: string
  backUrl?: string
  backLabel?: string
  className?: string
}

export function NotFoundState({ 
  title = "Not Found", 
  description = "The item you're looking for doesn't exist or has been removed.",
  backUrl = "/",
  backLabel = "Go Back",
  className = ''
}: NotFoundStateProps) {
  return (
    <div className={className}>
      <Card withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <FileX size={48} color="var(--mantine-color-gray-5)" />
          <Stack align="center" gap={0}>
            <Title order={3}>{title}</Title>
            <Text c="dimmed">{description}</Text>
          </Stack>
          <Button component="a" href={backUrl} leftSection={<ArrowLeft size={16} />}>
            {backLabel}
          </Button>
        </Stack>
      </Card>
    </div>
  )
}

interface PermissionDeniedStateProps {
  title?: string
  description?: string
  className?: string
}

export function PermissionDeniedState({ 
  title = "Access Denied", 
  description = "You don't have permission to view this content.",
  className = ''
}: PermissionDeniedStateProps) {
  return (
    <div className={className}>
      <Card withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <Shield size={48} color="var(--mantine-color-red-6)" />
          <Stack align="center" gap={0}>
            <Title order={3}>{title}</Title>
            <Text c="dimmed">{description}</Text>
          </Stack>
          <Button component="a" href="/dashboard" leftSection={<ArrowLeft size={16} />}>
            Back to Dashboard
          </Button>
        </Stack>
      </Card>
    </div>
  )
}

interface NetworkErrorStateProps {
  onRetry?: () => void
  className?: string
}

export function NetworkErrorState({ onRetry, className = '' }: NetworkErrorStateProps) {
  return (
    <div className={className}>
      <Card withBorder p="xl" radius="md">
        <Stack align="center" gap="md">
          <WifiOff size={48} color="var(--mantine-color-gray-5)" />
          <Stack align="center" gap={0}>
            <Title order={3}>Connection Error</Title>
            <Text c="dimmed">
              Unable to connect to the server. Please check your internet connection and try again.
            </Text>
          </Stack>
          {onRetry && (
            <Button onClick={onRetry} leftSection={<RefreshCw size={16} />}>
              Try Again
            </Button>
          )}
        </Stack>
      </Card>
    </div>
  )
}

interface InlineErrorProps {
  message: string
  onDismiss?: () => void
  type?: 'error' | 'warning' | 'info'
  className?: string
}

export function InlineError({ 
  message, 
  onDismiss, 
  type = 'error',
  className = ''
}: InlineErrorProps) {
  const getVariant = () => {
    switch (type) {
      case 'warning':
        return 'yellow'
      case 'info':
        return 'blue'
      default:
        return 'red'
    }
  }

  return (
    <Alert color={getVariant()} title={type.charAt(0).toUpperCase() + type.slice(1)} icon={<AlertTriangle />} withCloseButton={!!onDismiss} onClose={onDismiss} className={className}>
      {message}
    </Alert>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  action,
  icon: Icon = FileX,
  className = ''
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" py="xl" className={className}>
      <Icon className="h-12 w-12 text-gray-400" />
      <Title order={3}>{title}</Title>
      <Text c="dimmed">{description}</Text>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Stack>
  )
}

export default ErrorState
