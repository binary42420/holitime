'use client';

import { toast } from "@/hooks/use-toast"

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  shiftId?: string
  metadata?: Record<string, any>
}

export interface AppError extends Error {
  code?: string
  statusCode?: number
  context?: ErrorContext
  retryable?: boolean
}

export class NetworkError extends Error implements AppError {
  code = "NETWORK_ERROR"
  statusCode = 0
  retryable = true
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = "NetworkError"
  }
}

export class ValidationError extends Error implements AppError {
  code = "VALIDATION_ERROR"
  statusCode = 400
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends Error implements AppError {
  code = "AUTH_ERROR"
  statusCode = 401
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = "AuthenticationError"
  }
}

export class ConflictError extends Error implements AppError {
  code = "CONFLICT_ERROR"
  statusCode = 409
  retryable = false
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = "ConflictError"
  }
}

export class ServerError extends Error implements AppError {
  code = "SERVER_ERROR"
  statusCode = 500
  retryable = true
  
  constructor(message: string, public context?: ErrorContext) {
    super(message)
    this.name = "ServerError"
  }
}

// Error classification function
export function classifyError(error: any, context?: ErrorContext): AppError {
  // Check if error is already one of our custom error types
  if (error instanceof NetworkError || 
      error instanceof ValidationError || 
      error instanceof AuthenticationError || 
      error instanceof ConflictError || 
      error instanceof ServerError) {
    return error
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new NetworkError("Network connection failed. Please check your internet connection.", context)
  }

  if (error.name === "AbortError") {
    return new NetworkError("Request was cancelled or timed out.", context)
  }

  if (error.status || error.statusCode) {
    const statusCode = error.status || error.statusCode
    
    switch (statusCode) {
    case 400:
      return new ValidationError(error.message || "Invalid request data.", context)
    case 401:
      return new AuthenticationError(error.message || "Authentication required.", context)
    case 403:
      return new AuthenticationError(error.message || "Access denied.", context)
    case 409:
      return new ConflictError(error.message || "Data conflict detected.", context)
    case 429:
      return new NetworkError(error.message || "Too many requests. Please try again later.", context)
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(error.message || "Server error. Please try again.", context)
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return new ValidationError(error.message || "Client error occurred.", context)
      } else {
        return new ServerError(error.message || "Server error occurred.", context)
      }
    }
  }

  // Default to server error for unknown errors
  return new ServerError(error.message || "An unexpected error occurred.", context)
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryableErrors: string[]
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  backoffFactor: 1.5,
  retryableErrors: ["NETWORK_ERROR", "SERVER_ERROR"]
}

// Exponential backoff with jitter
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
    config.maxDelay
  )
  
  // Add jitter (±25% of delay)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1)
  return Math.max(0, delay + jitter)
}

// Retry wrapper function
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: AppError
  
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = classifyError(error, context)
      
      // Don't retry if error is not retryable
      if (!lastError.retryable || !retryConfig.retryableErrors.includes(lastError.code || "")) {
        throw lastError
      }
      
      // Don't retry on last attempt
      if (attempt === retryConfig.maxAttempts) {
        throw lastError
      }
      
      // Wait before retrying
      const delay = calculateDelay(attempt, retryConfig)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      console.warn(`Retry attempt ${attempt}/${retryConfig.maxAttempts} for ${lastError.code}:`, {
        error: lastError.message,
        context: lastError.context,
        nextDelay: delay
      })
    }
  }
  
  throw lastError!
}

// Error logging function
export function logError(error: AppError): void {
  const logData = {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    context: error.context,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
    url: typeof window !== "undefined" ? window.location.href : "server"
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Application Error:", logData)
  }
  
  // In production, you would send this to your error tracking service
  // Example: Sentry, LogRocket, Bugsnag, etc.
  if (process.env.NODE_ENV === "production") {
    // Send to error tracking service
    // Example: Sentry.captureException(error, { extra: logData })
  }
}

// User-friendly error handler
export function handleError(error: any, context?: ErrorContext): void {
  const appError = classifyError(error, context)
  
  // Log the error
  logError(appError)
  
  // Show user-friendly message
  const userMessage = getUserFriendlyMessage(appError)
  
  toast({
    title: "Error",
    description: userMessage,
    variant: "destructive",
  })
}

// Get user-friendly error messages
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.code) {
  case "NETWORK_ERROR":
    return "Connection problem. Please check your internet and try again."
  case "VALIDATION_ERROR":
    return error.message || "Please check your input and try again."
  case "AUTH_ERROR":
    return "Please log in again to continue."
  case "CONFLICT_ERROR":
    return error.message || "This action conflicts with existing data."
  case "SERVER_ERROR":
    return "Server is temporarily unavailable. Please try again in a moment."
  default:
    return error.message || "Something went wrong. Please try again."
  }
}

// Error boundary hook
export function useErrorHandler() {
  return {
    handleError: (error: any, context?: ErrorContext) => handleError(error, context),
    withRetry: (operation: () => Promise<any>, context?: ErrorContext, config?: Partial<RetryConfig>) => 
      withRetry(operation, context, config),
    classifyError: (error: any, context?: ErrorContext) => classifyError(error, context)
  }
}

// API error handler specifically for fetch requests
export async function handleApiResponse(response: Response, context?: ErrorContext): Promise<any> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // If response is not JSON, use status text
    }
    
    const error = new Error(errorMessage)
    ;(error as any).status = response.status
    
    throw classifyError(error, context)
  }
  
  try {
    return await response.json()
  } catch (error) {
    throw new ValidationError("Invalid response format from server.", context)
  }
}

// Enhanced fetch wrapper with error handling and retries
export async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  context?: ErrorContext,
  retryConfig?: Partial<RetryConfig>
): Promise<any> {
  const operation = async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
      
      clearTimeout(timeoutId)
      return await handleApiResponse(response, context)
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
  
  return withRetry(operation, context, retryConfig)
}
