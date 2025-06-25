"use client"

import React from 'react'
import Link from 'next/link'
import {
  Briefcase,
  BrainCircuit,
  Building2,
  CalendarClock,
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
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar'
import { UserNav } from '@/components/user-nav'
import { Button } from '@/components/ui/button'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarInset>
          <SidebarHeader>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="shrink-0" asChild>
                <Link href="/dashboard"><Hand className="text-primary" /></Link>
              </Button>
              <h1 className="text-xl font-semibold text-primary font-headline">Hands On Labor</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton href="/dashboard" tooltip="Dashboard">
                  <LayoutDashboard />
                  Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/shifts" tooltip="Shifts">
                  <CalendarClock />
                  Shifts
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/clients" tooltip="Clients">
                  <Building2 />
                  Clients
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton href="/documents" tooltip="Documents">
                  <FileText />
                  Documents
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton href="/staffing" tooltip="AI Staffing">
                  <BrainCircuit />
                  Smart Staffing
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </SidebarInset>
        
        <div className="flex flex-1 flex-col">
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
            <SidebarTrigger className="md:hidden">
              <PanelLeft />
            </SidebarTrigger>
            <div className="flex-1">
              {/* Maybe a search bar or page title here later */}
            </div>
            <UserNav />
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </Sidebar>
    </SidebarProvider>
  )
}
