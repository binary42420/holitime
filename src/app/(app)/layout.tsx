"use client"

import React from 'react'

// Force dynamic rendering to avoid build-time URL issues
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
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
import { MobileBottomNav, MobilePageWrapper, useMobileNav } from '@/components/mobile-bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { shouldShowBottomNav } = useMobileNav()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  const isClient = user?.role === 'Client';
  const isLimitedUser = user?.role === 'User';

  return (
    <AuthGuard>
      <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/dashboard"><Hand className="text-primary size-6" /></Link>
            </Button>
            <Link
              href="https://handsonlabor-website-369017734615.us-central1.run.app"
              target="_blank"
              rel="noopener noreferrer"
              className="group-data-[collapsible=icon]:hidden hover:opacity-80 transition-opacity"
              aria-label="Visit Hands On Labor marketing website"
            >
              <Image
                src="/images/handson-labor-logo.svg"
                alt="Hands On Labor"
                width={132}
                height={44}
                className="h-9 w-auto"
                priority
              />
            </Link>
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
            {!isLimitedUser && (
              <SidebarMenuItem>
              <SidebarMenuButton href="/shifts" tooltip="Shifts" isActive={isActive('/shifts')}>
                <CalendarClock />
                Shifts
              </SidebarMenuButton>

              </SidebarMenuItem>
            )}
            {(user?.role === 'Manager/Admin' || user?.role === 'Crew Chief') && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/timesheets" tooltip="Timesheets" isActive={isActive('/timesheets')}>
                  <ClipboardCheck />
                  Timesheets
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isClient && !isLimitedUser && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/clients" tooltip="Clients" isActive={isActive('/clients')}>
                  <Building2 />
                  Clients
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {user?.role === 'Manager/Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton href="/users" tooltip="Users" isActive={isActive('/users')}>
                  <Users />
                  Users
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton href="/documents" tooltip="Documents" isActive={isActive('/documents')}>
                <FileText />
                Documents
              </SidebarMenuButton>
            </SidebarMenuItem>
            {!isClient && !isLimitedUser && (
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
         {/* Mobile-First Header */}
         <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-3 md:px-6">
          <SidebarTrigger className="md:hidden p-2 -ml-2">
            <PanelLeft className="h-5 w-5" />
          </SidebarTrigger>
          <div className="flex-1 min-w-0">
            {/* Mobile: Show current page title */}
            <h1 className="text-sm md:text-base font-medium truncate md:hidden">
              {pathname === '/dashboard' && 'Dashboard'}
              {pathname.startsWith('/shifts') && 'Shifts'}
              {pathname.startsWith('/timesheets') && 'Timesheets'}
              {pathname.startsWith('/users') && 'Users'}
              {pathname.startsWith('/clients') && 'Clients'}
              {pathname.startsWith('/jobs') && 'Jobs'}
            </h1>
          </div>
          <UserNav />
        </header>

        {/* Mobile-First Main Content */}
        <main className="flex-1 overflow-auto bg-muted/40">
          <MobilePageWrapper hasBottomNav={shouldShowBottomNav}>
            <div className="p-3 md:p-6 lg:p-8">
              {children}
            </div>
          </MobilePageWrapper>
        </main>

        {/* Mobile Bottom Navigation */}
        {shouldShowBottomNav && <MobileBottomNav />}
      </div>
    </SidebarProvider>
    </AuthGuard>
  )
}
