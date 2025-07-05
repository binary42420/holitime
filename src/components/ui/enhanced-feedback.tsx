"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/loading-states"
import { useRealtime } from "@/lib/realtime"
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  AlertCircle,
  Info
} from "lucide-react"

interface FeedbackProps {
  title?: string
  description?: string
  status?: "idle" | "loading" | "success" | "error" | "warning"
  progress?: number
  isOnline?: boolean
  showRefresh?: boolean
  onRefresh?: () => void
  className?: string
  children?: React.ReactNode
}

export function EnhancedFeedback({
  title,
  description,
  status = "idle",
  progress,
  isOnline = true,
  showRefresh = false,
  onRefresh,
  className = "",
  children
}: FeedbackProps) {
  const { connectionState } = useRealtime()
  const isConnected = connectionState === "connected"

  const statusConfig = {
    idle: {
      icon: Info,
      color: "text-gray-500",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-200"
    },
    loading: {
      icon: LoadingSpinner,
      color: "text-blue-500",
      bgColor: "bg-blue-100",
      borderColor: "border-blue-200"
    },
    success: {
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-100",
      borderColor: "border-green-200"
    },
    error: {
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-100",
      borderColor: "border-red-200"
    },
    warning: {
      icon: AlertCircle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100",
      borderColor: "border-yellow-200"
    }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Connection Status Indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-2">
        {isOnline ? (
          <Badge variant="outline" className="gap-1">
            <Wifi className="h-3 w-3" />
            {isConnected ? "Connected" : "Connecting..."}
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        )}
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <StatusIcon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {title || status.charAt(0).toUpperCase() + status.slice(1)}
              </CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
          </div>

          {showRefresh && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onRefresh}
              disabled={status === "loading"}
              className="mt-1"
            >
              <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Progress Indicator */}
        {typeof progress === "number" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-right">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Status Alert */}
        {(status === "error" || status === "warning") && description && (
          <Alert variant={status === "error" ? "destructive" : "default"}>
            <StatusIcon className="h-4 w-4" />
            <AlertTitle>
              {status === "error" ? "Error" : "Warning"}
            </AlertTitle>
            <AlertDescription>{description}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {children && (
          <div className={`mt-4 ${status === "loading" ? "opacity-50" : ""}`}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface AsyncContentProps<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  children: (data: T) => React.ReactNode
}

export function AsyncContent<T>({
  data,
  isLoading,
  error,
  onRetry,
  loadingComponent,
  errorComponent,
  children
}: AsyncContentProps<T>) {
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>
    }

    return (
      <EnhancedFeedback
        status="loading"
        title="Loading..."
        description="Please wait while we fetch the data"
      />
    )
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>
    }

    return (
      <EnhancedFeedback
        status="error"
        title="Error"
        description={error}
        showRefresh={!!onRetry}
        onRefresh={onRetry}
      />
    )
  }

  if (!data) {
    return (
      <EnhancedFeedback
        status="warning"
        title="No Data"
        description="No data available to display"
        showRefresh={!!onRetry}
        onRefresh={onRetry}
      />
    )
  }

  return <>{children(data)}</>
}

interface OptimisticUpdateProps<T> {
  originalData: T
  updatedData: T
  isUpdating: boolean
  error: string | null
  onRetry?: () => void
  children: (data: T) => React.ReactNode
}

export function OptimisticUpdate<T>({
  originalData,
  updatedData,
  isUpdating,
  error,
  onRetry,
  children
}: OptimisticUpdateProps<T>) {
  const data = isUpdating ? updatedData : originalData

  return (
    <div className="relative">
      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
          <LoadingSpinner className="text-primary" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center gap-4">
            {error}
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {children(data)}
    </div>
  )
}

interface StatusIndicatorProps {
  status: string
  showDot?: boolean
  className?: string
}

export function StatusIndicator({ 
  status, 
  showDot = true,
  className = "" 
}: StatusIndicatorProps) {
  const statusConfig = {
    active: {
      color: "text-green-700",
      bgColor: "bg-green-100",
      dotColor: "bg-green-500",
      icon: CheckCircle2
    },
    pending: {
      color: "text-yellow-700",
      bgColor: "bg-yellow-100",
      dotColor: "bg-yellow-500",
      icon: Clock
    },
    error: {
      color: "text-red-700",
      bgColor: "bg-red-100",
      dotColor: "bg-red-500",
      icon: AlertTriangle
    },
    warning: {
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      dotColor: "bg-orange-500",
      icon: AlertCircle
    },
    info: {
      color: "text-blue-700",
      bgColor: "bg-blue-100",
      dotColor: "bg-blue-500",
      icon: Info
    }
  }

  const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.info
  const StatusIcon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${config.bgColor} ${config.color} ${className}`}>
      {showDot && (
        <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
      )}
      <StatusIcon className="h-4 w-4" />
      <span className="text-sm font-medium">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  )
}

interface ConnectionStatusProps {
  isOnline?: boolean
  connectionState?: "connecting" | "connected" | "disconnected" | "error"
  className?: string
}

export function ConnectionStatus({
  isOnline = true,
  connectionState = "connected",
  className = ""
}: ConnectionStatusProps) {
  const statusConfig = {
    connecting: {
      icon: RefreshCw,
      text: "Connecting...",
      color: "text-yellow-700",
      bgColor: "bg-yellow-100"
    },
    connected: {
      icon: Wifi,
      text: "Connected",
      color: "text-green-700",
      bgColor: "bg-green-100"
    },
    disconnected: {
      icon: WifiOff,
      text: "Disconnected",
      color: "text-red-700",
      bgColor: "bg-red-100"
    },
    error: {
      icon: AlertTriangle,
      text: "Connection Error",
      color: "text-red-700",
      bgColor: "bg-red-100"
    }
  }

  const config = statusConfig[connectionState]
  const StatusIcon = config.icon

  if (!isOnline) {
    return (
      <Badge variant="destructive" className={`gap-1 ${className}`}>
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    )
  }

  return (
    <Badge 
      variant="outline" 
      className={`gap-1 ${config.color} ${config.bgColor} border-0 ${className}`}
    >
      <StatusIcon className={`h-3 w-3 ${connectionState === "connecting" ? "animate-spin" : ""}`} />
      {config.text}
    </Badge>
  )
}
