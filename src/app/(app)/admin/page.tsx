"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@mantine/core'
import { Badge } from '@mantine/core'
import {
  Building2,
  Users,
  Briefcase,
  Calendar,
  Settings,
  BarChart3,
  FileText,
  Clock,
  UserCog,
  Merge,
  Shield
} from "lucide-react"

import { withAuth } from '@/lib/with-auth';
import { hasAdminAccess } from '@/lib/auth';

function AdminPage() {
  const { user } = useUser()
  const router = useRouter()

  // Redirect if not admin
  if (user?.role !== 'Manager/Admin') {
    router.push('/dashboard')
    return null
  }

  const adminSections = [
    {
      title: "Client Management",
      description: "Manage client companies and contacts",
      icon: Building2,
      href: "/admin/clients",
      actions: [
        { label: "View All Clients", href: "/clients" },
        { label: "Add New Client", href: "/admin/clients/new" },
        { label: "Import Clients", href: "/admin/clients/import" }
      ]
    },
    {
      title: "Employee Management",
      description: "Manage workforce and employee records",
      icon: Users,
      href: "/admin/employees",
      actions: [
        { label: "View All Employees", href: "/admin/employees" },
        { label: "Add New Employee", href: "/admin/employees/new" },
        { label: "Employee Reports", href: "/admin/employees/reports" }
      ]
    },
    {
      title: "User Management",
      description: "Manage user accounts and reset passwords",
      icon: UserCog,
      href: "/admin/users",
      actions: [
        { label: "View All Users", href: "/admin/users" },
        { label: "Reset Passwords", href: "/admin/users" },
        { label: "User Roles", href: "/admin/users" }
      ]
    },
    {
      title: "Merge Duplicates",
      description: "Combine duplicate employees, clients, or jobs",
      icon: Merge,
      href: "/admin/merge",
      actions: [
        { label: "Merge Employees", href: "/admin/merge" },
        { label: "Merge Clients", href: "/admin/merge" },
        { label: "Merge Jobs", href: "/admin/merge" }
      ]
    },
    {
      title: "Job Management",
      description: "Create and manage jobs and projects", 
      icon: Briefcase,
      href: "/admin/jobs",
      actions: [
        { label: "View All Jobs", href: "/admin/jobs" },
        { label: "Create New Job", href: "/admin/jobs/new" },
        { label: "Job Templates", href: "/admin/jobs/templates" }
      ]
    },
    {
      title: "Shift Management",
      description: "Schedule and manage work shifts",
      icon: Calendar,
      href: "/admin/shifts", 
      actions: [
        { label: "View All Shifts", href: "/shifts" },
        { label: "Schedule New Shift", href: "/admin/shifts/new" },
        { label: "Shift Templates", href: "/admin/shifts/templates" }
      ]
    },
    {
      title: "Timesheet Management",
      description: "Review and approve timesheets",
      icon: Clock,
      href: "/admin/timesheets",
      actions: [
        { label: "Pending Approvals", href: "/admin/timesheets/pending" },
        { label: "All Timesheets", href: "/timesheets" },
        { label: "Timesheet Reports", href: "/admin/timesheets/reports" }
      ]
    },
    {
      title: "Crew Chief Permissions",
      description: "Manage crew chief permissions and access control",
      icon: Shield,
      href: "/admin/crew-chief-permissions",
      actions: [
        { label: "View All Permissions", href: "/admin/crew-chief-permissions" },
        { label: "Grant New Permission", href: "/admin/crew-chief-permissions?tab=grant" },
        { label: "User Overview", href: "/admin/crew-chief-permissions?tab=users" }
      ]
    },
    {
      title: "System Settings",
      description: "Configure system settings and preferences",
      icon: Settings,
      href: "/admin/settings",
      actions: [
        { label: "User Management", href: "/admin/settings/users" },
        { label: "System Config", href: "/admin/settings/system" },
        { label: "Backup & Export", href: "/admin/settings/backup" }
      ]
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage all aspects of the timecard system
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Administrator Access
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => {
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
              <BarChart3 className="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Shifts Today</span>
              <Badge variant="default">12</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Timesheets</span>
              <Badge variant="destructive">5</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Employees</span>
              <Badge variant="secondary">48</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Active Jobs</span>
              <Badge variant="default">8</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">New timesheet submitted</div>
              <div className="text-muted-foreground">Construction Site A - 2 hours ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Employee added</div>
              <div className="text-muted-foreground">John Smith - 4 hours ago</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Shift completed</div>
              <div className="text-muted-foreground">Office Building Project - 6 hours ago</div>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AdminPage, hasAdminAccess);
