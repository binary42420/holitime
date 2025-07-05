"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface RealtimeEvent {
  type: string
  data: any
  timestamp: number
  id: string
}

interface RealtimeOptions {
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  onReconnect?: (attempt: number) => void
}

class RealtimeManager {
  private ws: WebSocket | null = null
  private url: string
  public options: RealtimeOptions
  private reconnectAttempts = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private listeners = new Map<string, Set<(data: any) => void>>()
  private isConnecting = false
  private isManuallyDisconnected = false

  constructor(url: string, options: RealtimeOptions = {}) {
    this.url = url
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true
    this.isManuallyDisconnected = false

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log("WebSocket connected")
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.options.onConnect?.()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: RealtimeEvent = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason)
        this.isConnecting = false
        this.stopHeartbeat()
        this.options.onDisconnect?.()

        if (!this.isManuallyDisconnected && this.reconnectAttempts < (this.options.maxReconnectAttempts || 10)) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        this.isConnecting = false
        const wsError = new Error("WebSocket connection error")
        this.options.onError?.(wsError)
      }
    } catch (error) {
      this.isConnecting = false
      this.options.onError?.(error as Error)
    }
  }

  disconnect(): void {
    this.isManuallyDisconnected = true
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect")
      this.ws = null
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  send(eventType: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: RealtimeEvent = {
        type: eventType,
        data,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("WebSocket not connected, cannot send message")
    }
  }

  getConnectionState(): "connecting" | "connected" | "disconnected" | "error" {
    if (this.isConnecting) return "connecting"
    if (this.ws?.readyState === WebSocket.OPEN) return "connected"
    if (this.ws?.readyState === WebSocket.CLOSED) return "disconnected"
    return "error"
  }

  private handleMessage(message: RealtimeEvent): void {
    const callbacks = this.listeners.get(message.type)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.data)
        } catch (error) {
          console.error("Error in realtime callback:", error)
        }
      })
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    if (this.options.heartbeatInterval) {
      this.heartbeatTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send("ping", { timestamp: Date.now() })
        }
      }, this.options.heartbeatInterval)
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()
    
    this.reconnectAttempts++
    const delay = Math.min(
      this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.options.onReconnect?.(this.reconnectAttempts)
      this.connect()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

// Global realtime manager instance
let realtimeManager: RealtimeManager | null = null

export function getRealtimeManager(): RealtimeManager {
  if (!realtimeManager) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
                  (typeof window !== "undefined" ? 
                    `ws${window.location.protocol === "https:" ? "s" : ""}://${window.location.host}/api/ws` : 
                    "ws://localhost:3000/api/ws")
    
    realtimeManager = new RealtimeManager(wsUrl, {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000
    })
  }
  
  return realtimeManager
}

// React hook for realtime functionality
export function useRealtime(options: RealtimeOptions = {}) {
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected")
  const { toast } = useToast()
  const managerRef = useRef<RealtimeManager | null>(null)

  useEffect(() => {
    managerRef.current = getRealtimeManager()
    
    const manager = managerRef.current
    
    const handleConnect = () => {
      setConnectionState("connected")
      options.onConnect?.()
    }

    const handleDisconnect = () => {
      setConnectionState("disconnected")
      options.onDisconnect?.()
    }

    const handleError = (error: Error) => {
      setConnectionState("error")
      console.error("Realtime connection error:", error)
      toast({
        title: "Connection Error",
        description: "Lost connection to server. Attempting to reconnect...",
        variant: "destructive",
      })
      options.onError?.(error)
    }

    const handleReconnect = (attempt: number) => {
      setConnectionState("connecting")
      if (attempt <= 3) {
        toast({
          title: "Reconnecting",
          description: `Attempting to reconnect... (${attempt}/10)`,
        })
      }
      options.onReconnect?.(attempt)
    }

    // Override manager options
    manager.options = {
      ...manager.options,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
      onReconnect: handleReconnect
    }

    // Connect if not already connected
    if (manager.getConnectionState() === "disconnected") {
      manager.connect()
    }

    return () => {
      // Don't disconnect on unmount as other components might be using it
      // manager.disconnect()
    }
  }, [options.onConnect, options.onDisconnect, options.onError, options.onReconnect, toast])

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    return managerRef.current?.subscribe(eventType, callback) || (() => {})
  }, [])

  const send = useCallback((eventType: string, data: any) => {
    managerRef.current?.send(eventType, data)
  }, [])

  const disconnect = useCallback(() => {
    managerRef.current?.disconnect()
    setConnectionState("disconnected")
  }, [])

  const reconnect = useCallback(() => {
    managerRef.current?.connect()
    setConnectionState("connecting")
  }, [])

  return {
    connectionState,
    subscribe,
    send,
    disconnect,
    reconnect,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting"
  }
}

// Specific hooks for common realtime events
export function useShiftUpdates(shiftId?: string) {
  const { subscribe, isConnected } = useRealtime()
  const [lastUpdate, setLastUpdate] = useState<any>(null)

  useEffect(() => {
    if (!shiftId) return

    const unsubscribe = subscribe("shift_updated", (data) => {
      if (data.shiftId === shiftId) {
        setLastUpdate(data)
      }
    })

    return unsubscribe
  }, [shiftId, subscribe])

  return {
    lastUpdate,
    isConnected
  }
}

export function useTimesheetUpdates() {
  const { subscribe, isConnected } = useRealtime()
  const [lastUpdate, setLastUpdate] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = subscribe("timesheet_updated", (data) => {
      setLastUpdate(data)
    })

    return unsubscribe
  }, [subscribe])

  return {
    lastUpdate,
    isConnected
  }
}

export function useNotifications() {
  const { subscribe, isConnected } = useRealtime()
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = subscribe("notification", (data) => {
      toast({
        title: data.title || "Notification",
        description: data.message,
        variant: data.type === "error" ? "destructive" : "default",
      })
    })

    return unsubscribe
  }, [subscribe, toast])

  return {
    isConnected
  }
}