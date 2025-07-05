"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { Hand,PanelLeft} from "lucide-react"

import {Sidebar, SidebarProvider, SidebarTrigger, SidebarHeader, 
  SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,}
  from "@/app/(app)/components/ui/sidebar"

import { UserNav } from "@/app/(app)/components/user-nav"
import { useUser } from "@/hooks/use-user"
import { AuthGuard } from "@/app/(app)/components/auth-guard"
import { MobileBottomNav, MobilePageWrapper, useMobileNav } from "@/app/(app)/components/mobile-bottom-nav"
import Link from "next/link"
import { navItems } from "@/lib/nav-items"
import { Breadcrumbs } from "@/app/(app)/components/breadcrumbs"

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { shouldShowBottomNav } = useMobileNav()

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === path
    return pathname.startsWith(path)
  }

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role))

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-muted/40">
          <Sidebar className="hidden md:flex md:flex-col md:border-r">
            <SidebarHeader>
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Hand className="h-6 w-6 text-primary" />
                <span>Hands On Labor</span>
              </Link>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {filteredNavItems.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton href={item.href} tooltip={item.label} isActive={isActive(item.href)}>
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
              <SidebarTrigger className="md:hidden">
                <PanelLeft className="h-6 w-6" />
              </SidebarTrigger>
              <div className="flex-1">
                <Breadcrumbs />
              </div>
              <UserNav />
            </header>

            <main className="flex-1 overflow-auto">
              <MobilePageWrapper hasBottomNav={shouldShowBottomNav}>
                <div className="p-4 sm:p-6">{children}</div>
              </MobilePageWrapper>
            </main>

            {shouldShowBottomNav && <MobileBottomNav navItems={filteredNavItems} />}
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  )
}

export default AppShell
