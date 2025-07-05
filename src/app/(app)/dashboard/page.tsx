"use client"

import { useUser } from "@/hooks/use-user"
import ClientDashboard from "../(dashboards)/client/page"
import EmployeeDashboard from "../(dashboards)/employee/page"
import CrewChiefDashboard from "../(dashboards)/crew-chief/page"
import ManagerDashboard from "../(dashboards)/manager/page"

export default function DashboardPage() {
  const { user } = useUser()

  if (!user) {
    return <div>Loading...</div>
  }

  switch (user.role) {
  case "Client":
    return <ClientDashboard />
  case "Employee":
    return <EmployeeDashboard />
  case "Crew Chief":
    return <CrewChiefDashboard />
  case "Manager/Admin":
    return <ManagerDashboard />
  default:
    return <div>Welcome!</div>
  }
}