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
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { MobileSidebar } from '@/components/ui/mobile-sidebar'
import BottomNav from '@/components/bottom-nav'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { AuthGuard } from '@/components/auth-guard'

function NavContent() {
  const pathname = usePathname()
  const { user } = useUser()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  const isClient = user?.role === 'Client';
  const isLimitedUser = user?.role === 'User';

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/dashboard"><Hand className="text-primary size-6" /></Link>
          </Button>
          <h1 className="text-xl font-semibold text-sidebar-foreground font-headline">Hands On Labor</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton href="/dashboard" isActive={isActive('/dashboard')}>
              <LayoutDashboard />
              Dashboard
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isLimitedUser && (
            <SidebarMenuItem>
              <SidebarMenuButton href="/shifts" isActive={isActive('/shifts')}>
                <CalendarClock />
                Today's Shifts
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {(user?.role === 'Manager/Admin' || user?.role === 'Crew Chief') && (
            <SidebarMenuItem>
              <SidebarMenuButton href="/timesheets" isActive={isActive('/timesheets')}>
                <ClipboardCheck />
                Timesheets
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {!isClient && !isLimitedUser && (
            <SidebarMenuItem>
              <SidebarMenuButton href="/clients" isActive={isActive('/clients')}>
                <Building2 />
                Clients
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {user?.role === 'Manager/Admin' && (
            <SidebarMenuItem>
              <SidebarMenuButton href="/employees" isActive={isActive('/employees')}>
                <Users />
                Employees
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton href="/documents" isActive={isActive('/documents')}>
              <FileText />
              Documents
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isClient && !isLimitedUser && (
             <SidebarMenuItem>
              <SidebarMenuButton href="/import" isActive={isActive('/import')}>
                <Upload />
                Data Import
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {user?.role === 'Manager/Admin' && (
            <SidebarMenuItem>
              <SidebarMenuButton href="/admin" isActive={isActive('/admin')}>
                <Settings />
                Admin
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <div className="hidden md:block">
            <Sidebar>
              <NavContent />
            </Sidebar>
          </div>
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6">
              <MobileSidebar>
                <NavContent />
              </MobileSidebar>
              <div className="flex-1">
                {/* Maybe a search bar or page title here later */}
              </div>
              <UserNav />
            </header>
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-muted/40 pb-20 md:pb-8">
              {children}
            </main>
            <BottomNav />
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}
