"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BrainCircuit,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Hand,
  LayoutDashboard,
  PanelLeft,
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  return (
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
            <SidebarMenuItem>
              <SidebarMenuButton href="/timesheets" tooltip="Timesheets" isActive={isActive('/timesheets')}>
                <ClipboardCheck />
                Timesheets
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/clients" tooltip="Clients" isActive={isActive('/clients')}>
                <Building2 />
                Clients
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="/documents" tooltip="Documents" isActive={isActive('/documents')}>
                <FileText />
                Documents
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton href="/staffing" tooltip="AI Staffing" isActive={isActive('/staffing')}>
                <BrainCircuit />
                Smart Staffing
              </SidebarMenuButton>
            </SidebarMenuItem>
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
  )
}
