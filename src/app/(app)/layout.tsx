"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Hand,
  LayoutDashboard,
  Settings,
  Upload,
  Users,
} from 'lucide-react';
import { AppShell, Burger, Group, NavLink, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import BottomNav from '@/components/bottom-nav';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/hooks/use-user';
import { AuthGuard } from '@/components/auth-guard';

function NavContent() {
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path;
    return pathname.startsWith(path);
  };

  const isClient = user?.role === 'Client';
  const isLimitedUser = user?.role === 'User';

  return (
    <>
      <NavLink
        href="/dashboard"
        label="Dashboard"
        leftSection={<LayoutDashboard size="1rem" />}
        active={isActive('/dashboard')}
        component={Link}
      />
      {!isLimitedUser && (
        <NavLink
          href="/shifts"
          label="Today's Shifts"
          leftSection={<CalendarClock size="1rem" />}
          active={isActive('/shifts')}
          component={Link}
        />
      )}
      {(user?.role === 'Manager/Admin' || user?.role === 'Crew Chief') && (
        <NavLink
          href="/timesheets"
          label="Timesheets"
          leftSection={<ClipboardCheck size="1rem" />}
          active={isActive('/timesheets')}
          component={Link}
        />
      )}
      {!isClient && !isLimitedUser && (
        <NavLink
          href="/clients"
          label="Clients"
          leftSection={<Building2 size="1rem" />}
          active={isActive('/clients')}
          component={Link}
        />
      )}
      {user?.role === 'Manager/Admin' && (
        <NavLink
          href="/employees"
          label="Employees"
          leftSection={<Users size="1rem" />}
          active={isActive('/employees')}
          component={Link}
        />
      )}
      <NavLink
        href="/documents"
        label="Documents"
        leftSection={<FileText size="1rem" />}
        active={isActive('/documents')}
        component={Link}
      />
      {!isClient && !isLimitedUser && (
        <NavLink
          href="/import"
          label="Data Import"
          leftSection={<Upload size="1rem" />}
          active={isActive('/import')}
          component={Link}
        />
      )}
      {user?.role === 'Manager/Admin' && (
        <NavLink
          href="/admin"
          label="Admin"
          leftSection={<Settings size="1rem" />}
          active={isActive('/admin')}
          component={Link}
        />
      )}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AuthGuard>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'md', collapsed: { mobile: !opened, desktop: false } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group>
                <Hand className="text-primary" size={24} />
                <Title order={4} >Hands On Labor</Title>
              </Group>
            </Link>
            <div style={{ flex: 1 }} />
            <UserNav />
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <NavContent />
        </AppShell.Navbar>
        <AppShell.Main>
          {children}
        </AppShell.Main>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
           <BottomNav />
        </div>
      </AppShell>
    </AuthGuard>
  );
}
