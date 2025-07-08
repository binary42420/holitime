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
  Home,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AppShell, Burger, Group, NavLink, Title, Paper, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { UserNav } from '@/components/user-nav';
import { useScrollDirection } from '@/hooks/use-scroll-direction';
import { useUser } from '@/hooks/use-user';
import { AuthGuard } from '@/components/auth-guard';
import { colors } from '@/lib/color-scheme';
import { useTheme } from '@/components/providers/theme-provider';

function NavContent() {
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === path;
    return pathname.startsWith(path);
  };

  const isClient = user?.role === 'Client';
  const isLimitedUser = user?.role === 'User';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Manager/Admin', 'Client', 'Employee', 'Crew Chief', 'User'] },
    { href: '/shifts', label: "Today's Shifts", icon: CalendarClock, roles: ['Manager/Admin', 'Crew Chief', 'Employee', 'Client'] },
    { href: '/timesheets', label: 'Timesheets', icon: ClipboardCheck, roles: ['Manager/Admin', 'Crew Chief', 'Client'] },
    { href: '/clients', label: 'Clients', icon: Building2, roles: ['Manager/Admin'] },
    { href: '/employees', label: 'Employees', icon: Users, roles: ['Manager/Admin'] },
    { href: '/documents', label: 'Documents', icon: FileText, roles: ['Manager/Admin', 'Client', 'Employee', 'Crew Chief'] },
    { href: '/import', label: 'Data Import', icon: Upload, roles: ['Manager/Admin'] },
    { href: '/admin', label: 'Admin', icon: Settings, roles: ['Manager/Admin'] },
  ];

  const filteredNavLinks = navLinks.filter(link => user?.role && link.roles.includes(user.role));

  return (
    <>
      {filteredNavLinks.map(link => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          leftSection={<link.icon size="1.1rem" />}
          active={isActive(link.href)}
          component={Link}
        />
      ))}
    </>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const scrollDirection = useScrollDirection();
  const [manualHidden, setManualHidden] = React.useState(false);
  const { theme } = useTheme();
  const activeColors = theme === 'dark' ? colors.dark : colors.light;

  const isVisible = !manualHidden && scrollDirection !== 'down';

  const navLinks = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard, roles: ['Manager/Admin', 'Client', 'Employee', 'Crew Chief', 'User'] },
    { href: '/shifts', label: 'Shifts', icon: CalendarClock, roles: ['Manager/Admin', 'Crew Chief', 'Employee'] },
    { href: '/timesheets', label: 'Timesheets', icon: ClipboardCheck, roles: ['Manager/Admin', 'Crew Chief'] },
    { href: '/documents', label: 'Docs', icon: FileText, roles: ['Manager/Admin', 'Client', 'Employee', 'Crew Chief'] },
  ];
  
  const filteredNavLinks = navLinks.filter(link => user?.role && link.roles.includes(user.role));

  return (
    <Paper
      component="nav"
      withBorder
      p={0}
      m={0}
      radius={0}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: activeColors.surface,
        transform: `translateY(${isVisible ? 0 : '110%'})`,
        transition: 'transform 200ms ease',
      }}
      className="md:hidden"
    >
      <Group justify="space-around" gap={0} py="xs">
        {filteredNavLinks.map(link => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            leftSection={<link.icon size="1.2rem" />}
            active={pathname.startsWith(link.href)}
            component={Link}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '0.5rem',
            }}
            styles={{
              label: {
                fontSize: '0.75rem',
                marginTop: '0.25rem',
              }
            }}
          />
        ))}
        <ActionIcon onClick={() => setManualHidden(prev => !prev)} variant="transparent" color="gray">
          {manualHidden ? <ChevronUp size="1.2rem" /> : <ChevronDown size="1.2rem" />}
        </ActionIcon>
      </Group>
    </Paper>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { theme } = useTheme();
  const activeColors = theme === 'dark' ? colors.dark : colors.light;

  return (
    <AuthGuard>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 250, breakpoint: 'md', collapsed: { mobile: !opened, desktop: false } }}
        padding="md"
        styles={{
          main: {
            backgroundColor: activeColors.background,
          },
        }}
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group>
                <Hand color={colors.light.primary.DEFAULT} size={24} />
                <Title order={4}>Hands On Labor</Title>
              </Group>
            </Link>
            <div style={{ flex: 1 }} />
            <UserNav />
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md">
          <NavContent />
        </AppShell.Navbar>
        <AppShell.Main
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 60px)',
          }}
          className="md:hidden"
        >
          {children}
        </AppShell.Main>
        <AppShell.Main className="hidden md:block">
          {children}
        </AppShell.Main>
        <BottomNav />
      </AppShell>
    </AuthGuard>
  );}
