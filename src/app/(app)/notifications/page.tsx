"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/(app)/components/ui/tabs"
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Calendar,
  FileText,
  Users,
  Settings,
  Trash2,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { Notification } from "@/lib/notification-service"
import { useToast } from "@/hooks/use-toast"

export default function NotificationsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState("all")

  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (activeTab === "unread") {
        params.append("unread_only", "true")
      } else if (activeTab !== "all") {
        params.append("type", activeTab)
      }

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) throw new Error("Failed to fetch notifications")
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [activeTab, setNotifications, setLoading, toast])

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count")
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }, [setUnreadCount])

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [activeTab, fetchNotifications, fetchUnreadCount])

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "POST"
      })

      if (!response.ok) throw new Error("Failed to mark as read")

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST"
      })

      if (!response.ok) throw new Error("Failed to mark all as read")

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      
      setUnreadCount(0)
      
      toast({
        title: "Success",
        description: "All notifications marked as read"
      })
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      })
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE"
      })

      if (!response.ok) throw new Error("Failed to delete notification")

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      toast({
        title: "Success",
        description: "Notification deleted"
      })
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
    case "shift_assignment":
    case "shift_reminder":
    case "shift_cancelled":
    case "shift_updated":
      return <Calendar className="h-5 w-5 text-blue-500" />
    case "document_reminder":
    case "document_approved":
    case "document_rejected":
      return <FileText className="h-5 w-5 text-green-500" />
    case "system_message":
      return <Settings className="h-5 w-5 text-gray-500" />
    case "welcome":
      return <Users className="h-5 w-5 text-purple-500" />
    default:
      return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800"
    case "high":
      return "bg-orange-100 text-orange-800"
    case "normal":
      return "bg-blue-100 text-blue-800"
    case "low":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !notification.is_read
    return notification.type === activeTab
  })

  return (
    <div>
      <h1>Notifications</h1>
    </div>
  )
}
