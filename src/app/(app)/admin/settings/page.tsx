"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Settings,
  Users,
  Database,
  Shield,
  Bell,
  Palette,
  Globe,
  HardDrive,
  Download,
  Upload,
  RefreshCw
} from "lucide-react"

export default function AdminSettingsPage() {
  const { user } = useUser()
  const router = useRouter()

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const settingsSections = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions",
      icon: Users,
      href: "/admin/settings/users",
      actions: [
        { label: "View All Users", href: "/admin/settings/users" },
        { label: "Role Management", href: "/admin/settings/users/roles" },
        { label: "Permission Settings", href: "/admin/settings/users/permissions" }
      ]
    },
    {
      title: "System Configuration",
      description: "Configure system-wide settings and preferences",
      icon: Settings,
      href: "/admin/settings/system",
      actions: [
        { label: "General Settings", href: "/admin/settings/system" },
        { label: "Email Configuration", href: "/admin/settings/system/email" },
        { label: "Notification Settings", href: "/admin/settings/system/notifications" }
      ]
    },
    {
      title: "Security Settings",
      description: "Manage security policies and authentication",
      icon: Shield,
      href: "/admin/settings/security",
      actions: [
        { label: "Password Policies", href: "/admin/settings/security/passwords" },
        { label: "Session Management", href: "/admin/settings/security/sessions" },
        { label: "Audit Logs", href: "/admin/settings/security/audit" }
      ]
    },
    {
      title: "Backup & Export",
      description: "Data backup, export, and recovery options",
      icon: HardDrive,
      href: "/admin/settings/backup",
      actions: [
        { label: "Create Backup", href: "/admin/settings/backup/create" },
        { label: "Export Data", href: "/admin/settings/backup/export" },
        { label: "Import Data", href: "/admin/settings/backup/import" }
      ]
    },
    {
      title: "Notifications",
      description: "Configure system notifications and alerts",
      icon: Bell,
      href: "/admin/settings/notifications",
      actions: [
        { label: "Email Notifications", href: "/admin/settings/notifications/email" },
        { label: "SMS Settings", href: "/admin/settings/notifications/sms" },
        { label: "Alert Preferences", href: "/admin/settings/notifications/alerts" }
      ]
    },
    {
      title: "Appearance",
      description: "Customize the application's look and feel",
      icon: Palette,
      href: "/admin/settings/appearance",
      actions: [
        { label: "Theme Settings", href: "/admin/settings/appearance/theme" },
        { label: "Branding", href: "/admin/settings/appearance/branding" },
        { label: "Layout Options", href: "/admin/settings/appearance/layout" }
      ]
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold font-headline">System Settings</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Administrator Access
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => router.push(action.href)}
                  >
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database Status</span>
              <Badge variant="default">Connected</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Last Backup</span>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Active Users</span>
              <span className="text-sm text-muted-foreground">12 online</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">System Version</span>
              <span className="text-sm text-muted-foreground">v1.0.0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Download System Backup
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh System Cache
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Globe className="mr-2 h-4 w-4" />
              Check for Updates
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
