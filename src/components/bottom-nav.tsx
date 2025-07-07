'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Home, Briefcase, Calendar, Users, FileText } from 'lucide-react';
import { AppShell, NavLink, Group } from '@mantine/core';

const commonRoutes = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/shifts', label: 'Shifts', icon: Calendar },
];

const managerRoutes = [
  ...commonRoutes,
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/timesheets', label: 'Timesheets', icon: FileText },
];

const clientRoutes = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/client/jobs', label: 'My Jobs', icon: Briefcase },
  { href: '/client/timesheets', label: 'Timesheets', icon: FileText },
];

const employeeRoutes = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/employee/my-shifts', label: 'My Shifts', icon: Calendar },
  { href: '/employee/my-timesheets', label: 'My Timesheets', icon: FileText },
];

const crewChiefRoutes = [
  ...employeeRoutes,
  { href: '/crew-chief/assigned-shifts', label: 'Assigned', icon: Briefcase },
];

export default function BottomNav() {
  const { user } = useUser();
  const pathname = usePathname();

  if (!user) return null;

  let routes;
  switch (user.role) {
    case 'Manager/Admin':
      routes = managerRoutes;
      break;
    case 'Client':
      routes = clientRoutes;
      break;
    case 'Employee':
      routes = employeeRoutes;
      break;
    case 'Crew Chief':
      routes = crewChiefRoutes;
      break;
    default:
      routes = commonRoutes;
  }

  return (
    <AppShell.Navbar p="md" hiddenFrom="md">
      <Group justify="space-around">
        {routes.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            leftSection={<Icon size="1rem" />}
            active={pathname === href}
            component={Link}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              height: '100%',
            }}
          />
        ))}
      </Group>
    </AppShell.Navbar>
  );
}
