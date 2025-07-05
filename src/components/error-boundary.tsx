'use client';

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react"
import { logError, type AppError, type ErrorContext } from "@/lib/error-handler"

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
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    const appError: AppError = {
      ...error,
      code: "COMPONENT_ERROR",
      statusCode: 500,
      retryable: false,
      context: {
        ...this.props.context,
        component: "ErrorBoundary",
        action: "componentDidCatch",
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        }
      }
    }

    logError(appError)

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Update state with error info
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
    
    // Create error report
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

    // Copy to clipboard for easy reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert("Error details copied to clipboard. Please share this with support.")
      })
      .catch(() => {
        console.error("Error Report:", errorReport)
        alert("Error details logged to console. Please check browser console and share with support.")
      })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                An unexpected error occurred. We apologize for the inconvenience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="text-sm font-mono bg-red-50 p-2 rounded border">
                    {this.state.error?.message || "Unknown error occurred"}
                  </div>
                  {this.state.errorId && (
                    <div className="text-xs text-gray-600 mt-2">
                      Error ID: {this.state.errorId}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={this.handleReportError}
                  className="w-full text-sm"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Report Error
                </Button>
              </div>

              {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Developer Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                    </div>
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
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

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Async error boundary for handling async errors
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

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [onError])

  if (error) {
    throw error
  }

  return <>{children}</>
}
