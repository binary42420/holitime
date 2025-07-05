'use client';

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Clock, Users, Calendar, MapPin, AlertTriangle } from "lucide-react"

// Generic loading spinner
export function LoadingSpinner({ size = "default", className = "" }: { 
  size?: "sm" | "default" | "lg"
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

// Loading overlay for buttons
export function ButtonLoading({ children, loading, ...props }: { 
  children: React.ReactNode
  loading: boolean
  [key: string]: any 
}) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  )
}

// Shift card skeleton
export function ShiftCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Multiple shift cards skeleton
export function ShiftsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShiftCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Employee assignment skeleton
export function EmployeeAssignmentSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              <Skeleton className="h-10 w-10 rounded-full" />
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

// Timesheet table skeleton
export function TimesheetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              <TableHead><Skeleton className="h-4 w-16" /></TableHead>
              <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </AvatarFallback>
                    </Avatar>
                    <Skeleton className="h-4 w-24" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Progress indicator for multi-step operations
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
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of {steps.length}</span>
        <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              index < currentStep 
                ? "bg-green-100 text-green-800" 
                : index === currentStep 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-gray-100 text-gray-500"
            }`}>
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span className={`text-sm ${
              index <= currentStep ? "text-gray-900" : "text-gray-500"
            }`}>
              {step}
            </span>
            {index === currentStep && (
              <LoadingSpinner size="sm" className="text-blue-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Inline loading state for data updates
export function InlineLoading({ 
  message = "Loading...", 
  size = "default" 
}: { 
  message?: string
  size?: "sm" | "default" | "lg" 
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size={size} />
      <span className="text-sm">{message}</span>
    </div>
  )
}

// Full page loading state
export function PageLoading({ 
  title = "Loading...", 
  description = "Please wait while we load your data." 
}: { 
  title?: string
  description?: string 
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto text-blue-600" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

// Skeleton for worker requirements section
export function WorkerRequirementsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-8 w-8" />
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Skeleton className="h-6 w-8" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Loading state with retry option
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
      <div className="text-center space-y-4 p-8">
        <div className="text-red-600">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Failed to load data</p>
        </div>
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-4 p-8">
      <LoadingSpinner size="lg" className="mx-auto text-blue-600" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
