'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { Home, Briefcase, Calendar, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {routes.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn(
            "flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors",
            pathname === href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}>
            <Icon className="h-6 w-6 mb-1" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
