"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button, Card, Alert, Group, Text, Title, Stack, Accordion } from "@mantine/core"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { logError, type AppError, type ErrorContext } from '@/lib/error-handler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  context?: ErrorContext
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError: AppError = {
      ...error,
      code: 'COMPONENT_ERROR',
      statusCode: 500,
      retryable: false,
      context: {
        ...this.props.context,
        component: 'ErrorBoundary',
        action: 'componentDidCatch',
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        }
      }
    }

    logError(appError)
    this.props.onError?.(error, errorInfo)
    this.setState({
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: this.props.context
    }

    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please share this with support.')
      })
      .catch(() => {
        console.error('Error Report:', errorReport)
        alert('Error details logged to console. Please check browser console and share with support.')
      })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Stack align="center" justify="center" style={{ minHeight: '100vh', padding: '1rem' }}>
          <Card withBorder p="xl" radius="md" style={{ maxWidth: '600px' }}>
            <Stack align="center">
              <AlertTriangle size={48} color="red" />
              <Title order={3}>Something went wrong</Title>
              <Text c="dimmed">An unexpected error occurred. We apologize for the inconvenience.</Text>
            </Stack>
            <Alert color="red" title="Error Details" icon={<AlertTriangle />} mt="lg">
              <Text component="pre" ff="monospace" fz="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error?.message || 'Unknown error occurred'}
              </Text>
              {this.state.errorId && (
                <Text size="xs" c="dimmed" mt="xs">
                  Error ID: {this.state.errorId}
                </Text>
              )}
            </Alert>

            <Stack mt="lg">
              <Button onClick={this.handleRetry} leftSection={<RefreshCw size={16} />}>
                Try Again
              </Button>
              <Button variant="default" onClick={() => window.location.href = '/'} leftSection={<Home size={16} />}>
                Go to Home
              </Button>
              <Button variant="subtle" onClick={this.handleReportError} leftSection={<Bug size={16} />}>
                Report Error
              </Button>
            </Stack>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Accordion mt="lg">
                <Accordion.Item value="dev-details">
                  <Accordion.Control>Developer Details</Accordion.Control>
                  <Accordion.Panel>
                    <Stack>
                      <Text fw={500}>Error:</Text>
                      <Text component="pre" ff="monospace" fz="xs" style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</Text>
                      <Text fw={500}>Component Stack:</Text>
                      <Text component="pre" ff="monospace" fz="xs" style={{ whiteSpace: 'pre-wrap' }}>{this.state.errorInfo.componentStack}</Text>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </Card>
        </Stack>
      )
    }

    return this.props.children
  }
}

export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export function AsyncErrorBoundary({ children, onError }: { children: ReactNode; onError?: (error: Error) => void }) {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      setError(error)
      onError?.(error)
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message)
      setError(error)
      onError?.(error)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [onError])

  if (error) {
    throw error
  }

  return <>{children}</>
}
