"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  FileX,
  WifiOff,
  Shield,
  Clock
} from "lucide-react"

interface ErrorStateProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  type?: "error" | "warning" | "info"
  className?: string
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "An unexpected error occurred. Please try again.",
  action,
  type = "error",
  className = ""
}: ErrorStateProps) {
  const getIcon = () => {
    switch (type) {
    case "warning":
      return AlertTriangle
    case "info":
      return Clock
    default:
      return XCircle
    }
  }

  const getColors = () => {
    switch (type) {
    case "warning":
      return "text-yellow-600"
    case "info":
      return "text-blue-600"
    default:
      return "text-red-600"
    }
  }

  const Icon = getIcon()

  return (
    <div className={`container mx-auto py-6 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Icon className={`h-12 w-12 ${getColors()}`} />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground max-w-md">{description}</p>
            </div>
            {action && (
              <Button onClick={action.onClick} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            )}
          </div>
        </CardContent>
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
  className = ""
}: NotFoundStateProps) {
  return (
    <div className={`container mx-auto py-6 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <FileX className="h-12 w-12 text-gray-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground max-w-md">{description}</p>
            </div>
            <Button asChild className="mt-4">
              <a href={backUrl}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backLabel}
              </a>
            </Button>
          </div>
        </CardContent>
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
  className = ""
}: PermissionDeniedStateProps) {
  return (
    <div className={`container mx-auto py-6 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Shield className="h-12 w-12 text-red-500" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground max-w-md">{description}</p>
            </div>
            <Button asChild className="mt-4">
              <a href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface NetworkErrorStateProps {
  onRetry?: () => void
  className?: string
}

export function NetworkErrorState({ onRetry, className = "" }: NetworkErrorStateProps) {
  return (
    <div className={`container mx-auto py-6 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <WifiOff className="h-12 w-12 text-gray-400" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Connection Error</h3>
              <p className="text-muted-foreground max-w-md">
                Unable to connect to the server. Please check your internet connection and try again.
              </p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface InlineErrorProps {
  message: string
  onDismiss?: () => void
  type?: "error" | "warning" | "info"
  className?: string
}

export function InlineError({ 
  message, 
  onDismiss, 
  type = "error",
  className = ""
}: InlineErrorProps) {
  const getVariant = () => {
    switch (type) {
    case "warning":
      return "default"
    case "info":
      return "default"
    default:
      return "destructive"
    }
  }

  return (
    <Alert variant={getVariant()} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {type === "error" ? "Error" : type === "warning" ? "Warning" : "Information"}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
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
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default ErrorState
