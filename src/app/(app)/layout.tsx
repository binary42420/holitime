"use client"

import React from 'react'

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Hand,
  LayoutDashboard,
  PanelLeft,
  Settings,
  Upload,
  Users,
} from 'lucide-react'

import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { AuthGuard } from '@/components/auth-guard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  const isClient = user?.role === 'Client';

  return (
    <AuthGuard>
      <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/dashboard"><Hand className="text-primary size-6" /></Link>
            </Button>
            <h1 className="text-xl font-semibold text-sidebar-foreground font-headline group-data-[collapsible=icon]:hidden">Hands On Labor</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard" tooltip="Dashboard" isActive={isActive('/dashboard')}>
                <LayoutDashboard />
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/shifts" tooltip="Shifts" isActive={isActive('/shifts')}>
                <CalendarClock />
                Shifts
              </SidebarMenuButton>
            </SidebarMenuItem>
            {(user?.role === 'Manager/Admin' || user?.role === 'Crew Chief') && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/timesheets" tooltip="Timesheets" isActive={isActive('/timesheets')}>
                  <ClipboardCheck />
                  Timesheets
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isClient && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/clients" tooltip="Clients" isActive={isActive('/clients')}>
                  <Building2 />
                  Clients
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {user?.role === 'Manager/Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/employees" tooltip="Employees" isActive={isActive('/employees')}>
                  <Users />
                  Employees
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton href="/documents" tooltip="Documents" isActive={isActive('/documents')}>
                <FileText />
                Documents
              </SidebarMenuButton>
            </SidebarMenuItem>
            {!isClient && (
               <SidebarMenuItem>
                <SidebarMenuButton href="/import" tooltip="Data Import" isActive={isActive('/import')}>
                  <Upload />
                  Data Import
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {user?.role === 'Manager/Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/admin" tooltip="Admin" isActive={isActive('/admin')}>
                  <Settings />
                  Admin
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      
      <div className="flex flex-1 flex-col">
         <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6">
          <SidebarTrigger className="md:hidden">
            <PanelLeft />
          </SidebarTrigger>
          <div className="flex-1">
            {/* Maybe a search bar or page title here later */}
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-muted/40">
          {children}
        </main>
      </div>
    </SidebarProvider>
    </AuthGuard>
  )
}
