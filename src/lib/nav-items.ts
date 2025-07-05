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
} from "lucide-react"

export const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    roles: ["Manager/Admin", "Crew Chief", "Client", "User"],
  },
  {
    href: "/shifts",
    icon: CalendarClock,
    label: "Shifts",
    roles: ["Manager/Admin", "Crew Chief"],
  },
  {
    href: "/timesheets",
    icon: ClipboardCheck,
    label: "Timesheets",
    roles: ["Manager/Admin", "Crew Chief"],
  },
  {
    href: "/clients",
    icon: Building2,
    label: "Clients",
    roles: ["Manager/Admin", "Crew Chief"],
  },
  {
    href: "/users",
    icon: Users,
    label: "Users",
    roles: ["Manager/Admin"],
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
    roles: ["Manager/Admin", "Crew Chief", "Client", "User"],
  },
  {
    href: "/import",
    icon: Upload,
    label: "Data Import",
    roles: ["Manager/Admin", "Crew Chief"],
  },
  {
    href: "/admin",
    icon: Settings,
    label: "Admin",
    roles: ["Manager/Admin"],
  },
]
